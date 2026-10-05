// background.js
// MV3 background for Tab History for Long-Open Tabs.
//
// Two layers (see README.md → Data model):
//  - Tracker: notes when each open tab was first seen (browsers do not expose
//    tab creation time). Internal working data, keyed by tabId.
//  - History: the user-facing log of tabs that stayed open >= minDays,
//    deduplicated by URL. A tab is recorded the moment it goes away (closed,
//    navigated elsewhere, or missing after a restart), and the daily scan
//    also records long-open tabs while they are still open.
//
// The background owns all state; the panel is only a view that asks for a
// snapshot and redraws on 'state-changed'.

// In Chrome service workers shared scripts must be loaded explicitly.
// In Firefox background pages the manifest loads them before this file.
if (typeof importScripts === 'function') {
  importScripts('defaults.js', 'tabs-logic.js');
}

const brw = typeof browser !== 'undefined' ? browser : chrome;
const Logic = globalThis.TabsLogic;

// ---------------------------------------------------------------------------
// State cache. The worker/event page can be torn down at any time, so all
// state lives in storage.local and is lazily reloaded on wake.
// ---------------------------------------------------------------------------

let cache = null; // { settings, openTabs, history, lastScanAt }
let loadPromise = null;
let reconciled = false;

// Only known settings survive a load, so keys from older versions (sync,
// labels, scan time, …) cannot linger and be read by accident.
function pickSettings(stored) {
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (stored && stored[key] !== undefined) settings[key] = stored[key];
  }
  return settings;
}

function ensureLoaded() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const stored = await brw.storage.local.get(['settings', 'openTabs', 'history', 'lastScanAt']);
      cache = {
        settings: pickSettings(stored.settings),
        openTabs: stored.openTabs || {},
        history: stored.history || {},
        lastScanAt: stored.lastScanAt || 0,
      };
      return cache;
    })();
  }
  return loadPromise;
}

async function saveState(keys) {
  const payload = {};
  for (const key of keys) payload[key] = cache[key];
  await brw.storage.local.set(payload);
}

// What the pure logic needs: the user's settings plus the fixed behaviour.
function logicSettings() {
  return { ...FIXED_SETTINGS, ...cache.settings };
}

// Tell the panel (if open) that state changed; ignore "no receiver" errors.
function broadcast(type) {
  try {
    Promise.resolve(brw.runtime.sendMessage({ type })).catch(() => {});
  } catch (e) { /* no listeners */ }
}

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

// The canonical URL a tab is tracked under (fragment/tracking params stripped).
function trackedUrl(tab) {
  return Logic.normalizeUrl(tab.url, true);
}

function shouldTrack(tab, settings) {
  if (!tab || !Logic.isTrackableUrl(tab.url)) return false;
  if (settings.excludePrivate && tab.incognito) return false;
  if (settings.excludePinned && tab.pinned) return false;
  if (Logic.isExcluded(trackedUrl(tab), settings.excludeList)) return false;
  return true;
}

function freshRecord(tab, now) {
  return {
    url: trackedUrl(tab),
    title: tab.title || '',
    favIconUrl: tab.favIconUrl || '',
    windowId: tab.windowId,
    firstSeenAt: now,
    lastSeenAt: now,
  };
}

// Stamp a history entry closed when its URL is no longer open in any tab.
function closeHistoryUrlIfGone(url, now) {
  const entry = cache.history[url];
  if (!entry || !entry.isOpen) return false;
  const stillOpen = Object.values(cache.openTabs).some((rec) => rec.url === url);
  if (stillOpen) return false;
  entry.isOpen = false;
  entry.lastSeenOpenAt = now;
  return true;
}

// A tracked page went away from its tab (closed, or navigated elsewhere).
// The tracker record must already be removed or replaced, so the "is this
// URL still open in another tab" check sees the new state.
function pageGone(rec, now) {
  const added = Logic.recordLongOpen(cache.history, rec, now, logicSettings(), true);
  return closeHistoryUrlIfGone(rec.url, now) || added;
}

async function handleTabUpsert(tab) {
  await ensureLoaded();
  const now = Date.now();
  const settings = cache.settings;
  const existing = cache.openTabs[tab.id];
  let historyChanged = false;

  if (!shouldTrack(tab, settings)) {
    if (existing) {
      delete cache.openTabs[tab.id];
      // Navigating away records the page; merely pinning it does not.
      historyChanged = Logic.isTrackableUrl(tab.url) && trackedUrl(tab) === existing.url
        ? closeHistoryUrlIfGone(existing.url, now)
        : pageGone(existing, now);
      await saveState(historyChanged ? ['openTabs', 'history'] : ['openTabs']);
      broadcast('state-changed');
    }
    return;
  }

  const url = trackedUrl(tab);

  if (!existing) {
    cache.openTabs[tab.id] = freshRecord(tab, now);
  } else if (existing.url !== url) {
    // Navigation: the age belongs to the page, not the tab frame.
    cache.openTabs[tab.id] = freshRecord(tab, now);
    historyChanged = pageGone(existing, now);
  } else {
    existing.title = tab.title || existing.title;
    existing.favIconUrl = tab.favIconUrl || existing.favIconUrl;
    existing.windowId = tab.windowId;
    existing.lastSeenAt = now;
  }

  // Reopening a URL history recorded as closed continues the same count —
  // see Logic.resumeStint.
  const entry = cache.history[url];
  if (entry && !entry.isOpen) {
    Logic.resumeStint(entry, now);
    historyChanged = true;
  }

  await saveState(historyChanged ? ['openTabs', 'history'] : ['openTabs']);
  broadcast('state-changed');
}

async function handleTabRemoved(tabId) {
  await ensureLoaded();
  const record = cache.openTabs[tabId];
  if (!record) return;
  const now = Date.now();
  delete cache.openTabs[tabId];
  const historyChanged = pageGone(record, now);
  await saveState(historyChanged ? ['openTabs', 'history'] : ['openTabs']);
  broadcast('state-changed');
}

// Rebuild the tracker from the actually-open tabs. Tab ids change across
// browser restarts, so previous records are re-matched by URL (oldest first)
// to preserve first-seen times through restarts and session restore.
async function reconcile() {
  await ensureLoaded();
  const now = Date.now();
  const tabs = await brw.tabs.query({});
  const settings = cache.settings;

  const poolByUrl = {};
  for (const rec of Object.values(cache.openTabs)) {
    (poolByUrl[rec.url] = poolByUrl[rec.url] || []).push(rec);
  }
  for (const url of Object.keys(poolByUrl)) {
    poolByUrl[url].sort((a, b) => a.firstSeenAt - b.firstSeenAt);
  }

  const rebuilt = {};
  for (const tab of tabs) {
    if (!shouldTrack(tab, settings)) continue;
    const url = trackedUrl(tab);
    const match = (poolByUrl[url] || []).shift();
    rebuilt[tab.id] = match
      ? { ...match, url, title: tab.title || match.title, favIconUrl: tab.favIconUrl || match.favIconUrl, windowId: tab.windowId, lastSeenAt: now }
      : freshRecord(tab, now);
  }
  cache.openTabs = rebuilt;
  const openByUrl = Logic.oldestRecordByUrl(Object.values(rebuilt));

  // Tabs that were open when we last ran but are gone now (closed while the
  // browser was down, or not restored after a crash). Their last heartbeat is
  // the best close time we have, so durations are not inflated by downtime.
  for (const rec of Object.values(poolByUrl).flat()) {
    if (openByUrl[rec.url]) continue;
    Logic.recordLongOpen(cache.history, rec, rec.lastSeenAt || rec.firstSeenAt, logicSettings(), false);
  }

  // Close history entries whose tabs disappeared while we were not running;
  // lastSeenOpenAt keeps its last heartbeat value for the same reason.
  for (const entry of Object.values(cache.history)) {
    const rec = openByUrl[entry.url];
    if (entry.isOpen && !rec) {
      entry.isOpen = false;
    } else if (!entry.isOpen && rec) {
      // Same rule as a live reopen.
      Logic.resumeStint(entry, now);
    }
  }

  await saveState(['openTabs', 'history']);
  broadcast('state-changed');
}

async function ensureReconciled() {
  if (reconciled) return;
  reconciled = true;
  try {
    await reconcile();
  } catch (error) {
    reconciled = false;
    console.error('Reconcile failed:', error);
  }
}

// ---------------------------------------------------------------------------
// Heartbeat & daily scan
// ---------------------------------------------------------------------------

async function heartbeat() {
  await ensureLoaded();
  const now = Date.now();
  for (const rec of Object.values(cache.openTabs)) {
    rec.lastSeenAt = now;
  }
  for (const entry of Object.values(cache.history)) {
    if (entry.isOpen) entry.lastSeenOpenAt = now;
  }
  await saveState(['openTabs', 'history']);

  // Catch-up: if the daily alarm was missed (laptop asleep at scan time),
  // run the scan as soon as more than a day has passed.
  if (now - cache.lastScanAt > 25 * 60 * 60 * 1000) {
    await runScan();
  }
}

async function runScan() {
  await ensureLoaded();
  const now = Date.now();
  const result = Logic.promoteOpenTabs(cache.history, Object.values(cache.openTabs), logicSettings(), now);
  cache.history = result.history;
  cache.lastScanAt = now;
  await saveState(['history', 'lastScanAt']);
  broadcast('state-changed');
  return { added: result.added, updated: result.updated, closed: result.closed };
}

function nextScanTime() {
  const [hours, minutes] = DAILY_SCAN_TIME.split(':').map(Number);
  const next = new Date();
  next.setHours(hours || 0, minutes || 0, 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

async function ensureAlarms() {
  const existingHeartbeat = await brw.alarms.get(ALARM_HEARTBEAT);
  if (!existingHeartbeat) {
    brw.alarms.create(ALARM_HEARTBEAT, { periodInMinutes: HEARTBEAT_MINUTES });
  }
  const existingScan = await brw.alarms.get(ALARM_DAILY_SCAN);
  if (!existingScan) {
    brw.alarms.create(ALARM_DAILY_SCAN, { when: nextScanTime(), periodInMinutes: 24 * 60 });
  }
}

// ---------------------------------------------------------------------------
// Message API for the panel
// ---------------------------------------------------------------------------

function openUrls() {
  return new Set(Object.values(cache.openTabs).map((rec) => rec.url));
}

async function handleMessage(message) {
  await ensureLoaded();
  await ensureReconciled();

  switch (message.action) {
    case 'getState':
      return {
        history: Object.values(cache.history),
        openTabs: Object.entries(cache.openTabs).map(([tabId, rec]) => ({ tabId: Number(tabId), ...rec })),
      };
    case 'addEntry': {
      // "+" on a tab not yet in history: add it now, without waiting for it
      // to reach minDays. Its count so far is kept.
      if (cache.history[message.url]) return { added: false };
      const rec = Logic.oldestRecordByUrl(Object.values(cache.openTabs))[message.url];
      if (!rec) return { error: 'Tab is no longer open' };
      cache.history[message.url] = Logic.newEntry(rec, Date.now(), logicSettings(), true);
      await saveState(['history']);
      broadcast('state-changed');
      return { added: true };
    }
    case 'deleteEntries': {
      // Removing an entry also restarts the count of any tab still showing
      // that URL: it becomes a new tab counting from zero again.
      // The removed entries go back to the panel, which keeps them for Undo:
      // a Chrome worker is unloaded after ~30 s idle, so an undo buffer held
      // here would silently vanish while the Undo link is still showing.
      const now = Date.now();
      const removed = [];
      for (const url of message.urls || []) {
        if (cache.history[url]) {
          removed.push(cache.history[url]);
          delete cache.history[url];
        }
        for (const rec of Object.values(cache.openTabs)) {
          if (rec.url === url) {
            rec.firstSeenAt = now;
            rec.lastSeenAt = now;
          }
        }
      }
      await saveState(['history', 'openTabs']);
      broadcast('state-changed');
      return { removed };
    }
    case 'restoreEntries': {
      const open = openUrls();
      let restored = 0;
      for (const raw of message.entries || []) {
        const entry = Logic.normalizeEntry(raw);
        if (!entry || cache.history[entry.url]) continue;
        // Whether the tab is open may have changed while the undo was pending.
        cache.history[entry.url] = { ...entry, isOpen: open.has(entry.url) };
        restored++;
      }
      await saveState(['history']);
      broadcast('state-changed');
      return { restored };
    }
    case 'importHistory': {
      const merged = Logic.mergeImport(cache.history, message.entries || [], message.mode);
      // The running browser, not the file, knows what is open right now.
      const open = openUrls();
      for (const entry of Object.values(merged)) {
        entry.isOpen = open.has(entry.url);
      }
      cache.history = merged;
      await saveState(['history']);
      broadcast('state-changed');
      return { total: Object.keys(merged).length };
    }
    case 'getSettings':
      return { settings: cache.settings };
    case 'saveSettings': {
      cache.settings = pickSettings({ ...cache.settings, ...(message.settings || {}) });
      await saveState(['settings']);
      // Exclusion changes can alter what is trackable.
      await reconcile();
      return { settings: cache.settings };
    }
    default:
      return { error: `Unknown action: ${message.action}` };
  }
}

// ---------------------------------------------------------------------------
// Listener registration — synchronous, at the top level (MV3 requirement).
// ---------------------------------------------------------------------------

brw.runtime.onInstalled.addListener(async () => {
  await ensureLoaded();
  if (!cache.lastScanAt) {
    cache.lastScanAt = Date.now();
    await saveState(['lastScanAt']);
  }
  await ensureAlarms();
  await ensureReconciled();
});

brw.runtime.onStartup.addListener(async () => {
  await ensureLoaded();
  await ensureAlarms();
  await ensureReconciled();
});

brw.tabs.onCreated.addListener((tab) => {
  handleTabUpsert(tab).catch((error) => console.error('onCreated:', error));
});

brw.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // onUpdated is chatty; only URL, title, favicon, or pinned changes matter.
  if (!('url' in changeInfo) && !('title' in changeInfo) && !('favIconUrl' in changeInfo) && !('pinned' in changeInfo)) {
    return;
  }
  handleTabUpsert(tab).catch((error) => console.error('onUpdated:', error));
});

brw.tabs.onRemoved.addListener((tabId) => {
  handleTabRemoved(tabId).catch((error) => console.error('onRemoved:', error));
});

brw.alarms.onAlarm.addListener((alarm) => {
  const task = alarm.name === ALARM_DAILY_SCAN ? runScan() : alarm.name === ALARM_HEARTBEAT ? heartbeat() : null;
  if (task) task.catch((error) => console.error(`Alarm ${alarm.name}:`, error));
});

brw.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return false;
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));
  return true; // keep the channel open for the async response
});

// ---------------------------------------------------------------------------
// Toolbar icon: sidebar primary, toolbar popup as fallback
// ---------------------------------------------------------------------------
//
// Firefox: sidebar only (no popup in its manifest); the icon toggles it.
// Chrome: the manifest declares a popup as the safe default, and a declared
// popup always wins the icon click. So once the side panel has accepted the
// click, the popup is removed for this session — only then, so if the side
// panel fails the popup stays.
// Opera: no chrome.sidePanel; the popup stays and the sidebar is opened from
// Opera's own sidebar icon.
// Yandex: installs from the Chrome / Opera stores but shows no side panel for
// extensions, so the popup is the whole UI there and must never be removed.
function preferSidePanel() {
  const sidePanel = chrome.sidePanel;
  if (typeof sidePanel.setPanelBehavior !== 'function' || typeof sidePanel.open !== 'function') return;
  if (typeof navigator !== 'undefined' && /YaBrowser/.test(navigator.userAgent || '')) return;
  sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => chrome.action.setPopup({ popup: '' }))
    .catch((error) => console.error('Side panel unavailable; keeping the toolbar popup:', error));
}

if (typeof browser !== 'undefined' && browser.sidebarAction) {
  browser.action.onClicked.addListener(() => browser.sidebarAction.toggle());
} else if (typeof chrome !== 'undefined' && chrome.sidePanel) {
  preferSidePanel();
  // Runtime action settings do not outlast the browser session, and an icon
  // click that opens a popup does not wake an idle worker. onStartup wakes it
  // at browser start, so the first click already opens the side panel.
  chrome.runtime.onStartup.addListener(preferSidePanel);
}

// Warm start on worker wake: make sure alarms exist and the tracker is fresh.
ensureLoaded()
  .then(() => ensureAlarms())
  .then(() => ensureReconciled())
  .catch((error) => console.error('Initialization failed:', error));
