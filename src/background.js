// background.js
// MV3 background for Tab History for Long-Open Tabs.
//
// Two layers (see README.md → Data model):
//  - Tracker: notes when each open tab was first seen (browsers do not expose
//    tab creation time). Internal working data, keyed by tabId.
//  - History: the curated user-facing log. A daily scan promotes tabs open
//    >= minDays into it, deduplicated by URL.

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

function ensureLoaded() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const stored = await brw.storage.local.get([
        'settings', 'openTabs', 'history', 'lastScanAt', 'labelColors', 'labelNames', 'prefsUpdatedAt']);
      cache = {
        settings: { ...DEFAULT_SETTINGS, ...(stored.settings || {}) },
        openTabs: stored.openTabs || {},
        history: stored.history || {},
        lastScanAt: stored.lastScanAt || 0,
        labelColors: stored.labelColors || {},
        labelNames: stored.labelNames || {},
        prefsUpdatedAt: stored.prefsUpdatedAt || 0,
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

// ---------------------------------------------------------------------------
// Cross-device sync (settings + stop list + label vocabulary; never history)
// ---------------------------------------------------------------------------

let syncTimer = null;
let applyingRemote = false;   // guard against echoing a pull straight back
let syncError = null;

async function pushSync() {
  if (!cache || !cache.settings.syncEnabled || applyingRemote) return;
  const payload = Logic.buildSyncPayload(
    cache.settings, cache.labelColors, cache.labelNames, cache.prefsUpdatedAt, LOCAL_ONLY_SETTINGS);
  if (JSON.stringify(payload).length > SYNC_ITEM_LIMIT) {
    // Refuse rather than let the browser reject it: a stop list this long is
    // the only realistic way to get here, and silently dropping it is worse.
    syncError = 'payload-too-large';
    return;
  }
  try {
    await brw.storage.sync.set({ [SYNC_KEY]: payload });
    syncError = null;
  } catch (error) {
    // Not signed in, quota exceeded, or sync disabled in the browser — none of
    // which should break the extension, so record and carry on locally.
    syncError = error && error.message ? error.message : 'sync-failed';
  }
}

function schedulePush() {
  if (!cache || !cache.settings.syncEnabled || applyingRemote) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    pushSync().catch((error) => console.error('pushSync:', error));
  }, SYNC_DEBOUNCE_MS);
}

async function pullSync() {
  await ensureLoaded();
  if (!cache.settings.syncEnabled) return;
  let remote;
  try {
    const got = await brw.storage.sync.get(SYNC_KEY);
    remote = got[SYNC_KEY];
  } catch (error) {
    syncError = error && error.message ? error.message : 'sync-failed';
    return;
  }
  if (!remote) return;

  const merged = Logic.mergeSyncedPrefs({
    settings: cache.settings,
    labelColors: cache.labelColors,
    labelNames: cache.labelNames,
    updatedAt: cache.prefsUpdatedAt,
  }, remote, LOCAL_ONLY_SETTINGS);
  if (!merged.changed) return;

  applyingRemote = true;
  try {
    const previousScanTime = cache.settings.scanTime;
    // syncEnabled is device-local, so it is never taken from the remote blob.
    cache.settings = { ...merged.settings, syncEnabled: cache.settings.syncEnabled };
    cache.labelColors = merged.labelColors;
    cache.labelNames = merged.labelNames;
    cache.prefsUpdatedAt = merged.updatedAt;
    await saveState(['settings', 'labelColors', 'labelNames', 'prefsUpdatedAt']);
    if (cache.settings.scanTime !== previousScanTime) await rescheduleDailyScan();
    await reconcile();   // a synced stop list can change what is trackable
    broadcast('state-changed');
  } finally {
    applyingRemote = false;
  }
}

// Single-level undo buffer for deletions, held in memory only — an undo offer
// that outlived a browser restart would be a lie.
let lastDeleted = null; // { entries: HistoryEntry[], at: number }

// Promote a URL into history right now, bypassing the day threshold. Shared by
// the explicit "add" button and by labelling an as-yet-unpromoted tab.
function promoteUrlNow(url, now) {
  const existing = cache.history[url];
  if (existing) return existing;
  const rec = Object.values(cache.openTabs).find((r) => r.url === url);
  if (!rec) return null;
  const entry = {
    url,
    title: Logic.truncateTitle(rec.title, cache.settings.maxTitleLength),
    favIconUrl: rec.favIconUrl || '',
    domain: Logic.domainOf(url),
    firstSeenAt: rec.firstSeenAt,
    addedAt: now,
    lastSeenOpenAt: now,
    updatedCount: 0,
    isOpen: true,
    labels: [],
    titleCustom: false,
    gapMs: 0,
  };
  cache.history[url] = entry;
  return entry;
}

// Tell the sidebar (if open) that state changed; ignore "no receiver" errors.
function broadcast(type) {
  try {
    Promise.resolve(brw.runtime.sendMessage({ type })).catch(() => {});
  } catch (e) { /* no listeners */ }
}

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

// The canonical URL a tab is tracked under (fragment/tracking params stripped).
function trackedUrl(tab, settings) {
  return Logic.normalizeUrl(tab.url, settings.ignoreUrlFragment);
}

function shouldTrack(tab, settings) {
  if (!tab || !Logic.isTrackableUrl(tab.url)) return false;
  if (settings.excludePrivate && tab.incognito) return false;
  if (settings.excludePinned && tab.pinned) return false;
  if (Logic.isExcluded(trackedUrl(tab, settings), settings.excludeList)) return false;
  return true;
}

function freshRecord(tab, now, settings) {
  return {
    url: trackedUrl(tab, settings),
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

async function handleTabUpsert(tab) {
  await ensureLoaded();
  const now = Date.now();
  const settings = cache.settings;
  const existing = cache.openTabs[tab.id];
  let historyChanged = false;

  if (!shouldTrack(tab, settings)) {
    if (existing) {
      delete cache.openTabs[tab.id];
      historyChanged = closeHistoryUrlIfGone(existing.url, now);
      await saveState(historyChanged ? ['openTabs', 'history'] : ['openTabs']);
      broadcast('state-changed');
    }
    return;
  }

  const url = trackedUrl(tab, settings);

  if (!existing) {
    cache.openTabs[tab.id] = freshRecord(tab, now, settings);
  } else if (existing.url !== url) {
    // Navigation: the age belongs to the page, not the tab frame.
    const oldUrl = existing.url;
    cache.openTabs[tab.id] = freshRecord(tab, now, settings);
    historyChanged = closeHistoryUrlIfGone(oldUrl, now);
  } else {
    existing.title = tab.title || existing.title;
    existing.favIconUrl = tab.favIconUrl || existing.favIconUrl;
    existing.windowId = tab.windowId;
    existing.lastSeenAt = now;
  }

  // Reopening a URL history recorded as closed continues the same episode
  // unless the break outlasted the tolerance — see Logic.resumeStint.
  const entry = cache.history[url];
  if (entry && !entry.isOpen) {
    Logic.resumeStint(entry, cache.openTabs[tab.id].firstSeenAt, now, settings);
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
  const historyChanged = closeHistoryUrlIfGone(record.url, now);
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
    const url = trackedUrl(tab, settings);
    const match = (poolByUrl[url] || []).shift();
    rebuilt[tab.id] = match
      ? { ...match, url, title: tab.title || match.title, favIconUrl: tab.favIconUrl || match.favIconUrl, windowId: tab.windowId, lastSeenAt: now }
      : freshRecord(tab, now, settings);
  }
  cache.openTabs = rebuilt;

  // Close history entries whose tabs disappeared while we were not running.
  // lastSeenOpenAt keeps its last heartbeat value, so the recorded duration
  // is not inflated by browser downtime.
  const openByUrl = new Map();
  for (const rec of Object.values(rebuilt)) {
    const seen = openByUrl.get(rec.url);
    if (!seen || rec.firstSeenAt < seen.firstSeenAt) openByUrl.set(rec.url, rec);
  }
  for (const entry of Object.values(cache.history)) {
    const rec = openByUrl.get(entry.url);
    if (entry.isOpen && !rec) {
      entry.isOpen = false;
    } else if (!entry.isOpen && rec) {
      // Same rule as a live reopen.
      Logic.resumeStint(entry, rec.firstSeenAt, now, settings);
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
  const result = Logic.promoteOpenTabs(cache.history, Object.values(cache.openTabs), cache.settings, now);
  cache.history = result.history;
  cache.lastScanAt = now;
  await saveState(['history', 'lastScanAt']);
  broadcast('state-changed');
  console.log(`Scan: +${result.added} added, ${result.updated} updated, ${result.closed} closed`);
  return { added: result.added, updated: result.updated, closed: result.closed };
}

function nextScanTime(scanTime) {
  const [hours, minutes] = (scanTime || '05:00').split(':').map(Number);
  const next = new Date();
  next.setHours(hours || 0, minutes || 0, 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

async function ensureAlarms() {
  await ensureLoaded();
  const existingHeartbeat = await brw.alarms.get(ALARM_HEARTBEAT);
  if (!existingHeartbeat) {
    brw.alarms.create(ALARM_HEARTBEAT, { periodInMinutes: HEARTBEAT_MINUTES });
  }
  const existingScan = await brw.alarms.get(ALARM_DAILY_SCAN);
  if (!existingScan) {
    brw.alarms.create(ALARM_DAILY_SCAN, {
      when: nextScanTime(cache.settings.scanTime),
      periodInMinutes: 24 * 60,
    });
  }
}

async function rescheduleDailyScan() {
  await brw.alarms.clear(ALARM_DAILY_SCAN);
  brw.alarms.create(ALARM_DAILY_SCAN, {
    when: nextScanTime(cache.settings.scanTime),
    periodInMinutes: 24 * 60,
  });
}

// ---------------------------------------------------------------------------
// Message API for the sidebar
// ---------------------------------------------------------------------------

async function handleMessage(message) {
  await ensureLoaded();
  await ensureReconciled();
  const now = Date.now();

  switch (message.action) {
    case 'getState': {
      const entries = Object.values(cache.history);
      // Newly seen labels join the vocabulary; that propagates without bumping
      // prefsUpdatedAt, because labels merge by union rather than by timestamp.
      if (Logic.syncLabelColors(cache.labelColors, entries, cache.labelNames)) {
        await saveState(['labelColors', 'labelNames']);
        schedulePush();
      }
      return {
        history: entries,
        openTabs: Object.entries(cache.openTabs).map(([tabId, rec]) => ({ tabId: Number(tabId), ...rec })),
        labelColors: cache.labelColors,
        labelNames: cache.labelNames,
        syncEnabled: cache.settings.syncEnabled,
        syncError,
        lastScanAt: cache.lastScanAt,
        nextScanAt: nextScanTime(cache.settings.scanTime),
        canUndo: Boolean(lastDeleted && lastDeleted.entries.length),
        now,
      };
    }
    case 'scanNow':
      return runScan();
    case 'setLabels': {
      const url = message.url;
      const labels = Logic.normalizeLabels(message.labels);
      // Labelling a tab that has not reached minDays yet is an explicit
      // "this one matters", so it joins history right away.
      const entry = promoteUrlNow(url, now);
      if (!entry) return { error: 'Tab is no longer open' };
      entry.labels = labels;
      Logic.syncLabelColors(cache.labelColors, [entry], cache.labelNames);
      await saveState(['history', 'labelColors', 'labelNames']);
      schedulePush();
      broadcast('state-changed');
      return { labels };
    }
    case 'addEntry': {
      if (cache.history[message.url]) return { added: false };
      const entry = promoteUrlNow(message.url, now);
      if (!entry) return { error: 'Tab is no longer open' };
      await saveState(['history']);
      broadcast('state-changed');
      return { added: true };
    }
    case 'renameEntry': {
      const entry = cache.history[message.url];
      if (!entry) return { error: 'Entry not found' };
      const title = Logic.truncateTitle(String(message.title || '').trim(), cache.settings.maxTitleLength);
      if (title) {
        entry.title = title;
        entry.titleCustom = true;
      } else {
        // Cleared: drop back to the live tab title, or the URL as a last resort.
        const rec = Object.values(cache.openTabs).find((r) => r.url === message.url);
        entry.title = Logic.truncateTitle(rec ? rec.title : '', cache.settings.maxTitleLength) || message.url;
        entry.titleCustom = false;
      }
      await saveState(['history']);
      broadcast('state-changed');
      return { title: entry.title, titleCustom: entry.titleCustom };
    }
    case 'deleteEntries': {
      const removedEntries = [];
      for (const url of message.urls || []) {
        if (cache.history[url]) {
          removedEntries.push(cache.history[url]);
          delete cache.history[url];
        }
      }
      lastDeleted = removedEntries.length ? { entries: removedEntries, at: now } : lastDeleted;
      await saveState(['history']);
      broadcast('state-changed');
      return { removed: removedEntries.length, canUndo: removedEntries.length > 0 };
    }
    case 'excludeDomain': {
      const pattern = String(message.pattern || '').trim().toLowerCase();
      if (!pattern) return { error: 'No domain given' };
      const list = (cache.settings.excludeList || []).slice();
      const alreadyListed = list.some((item) => String(item).trim().toLowerCase() === pattern);
      if (!alreadyListed) list.push(pattern);
      cache.settings.excludeList = list;

      // Purge what is already logged for it, and stop tracking open tabs on it.
      const removedEntries = [];
      for (const [url, entry] of Object.entries(cache.history)) {
        if (Logic.isExcluded(url, [pattern])) {
          removedEntries.push(entry);
          delete cache.history[url];
        }
      }
      for (const [tabId, rec] of Object.entries(cache.openTabs)) {
        if (Logic.isExcluded(rec.url, [pattern])) delete cache.openTabs[tabId];
      }
      // Undo must also lift the exclusion, or the entries would just vanish again.
      lastDeleted = { entries: removedEntries, at: now, addedPattern: alreadyListed ? null : pattern };
      cache.prefsUpdatedAt = now;   // the stop list is synced
      await saveState(['settings', 'history', 'openTabs', 'prefsUpdatedAt']);
      schedulePush();
      broadcast('state-changed');
      return { removed: removedEntries.length, pattern };
    }
    case 'undoDelete': {
      if (!lastDeleted) return { restored: 0 };
      if (lastDeleted.addedPattern) {
        cache.settings.excludeList = (cache.settings.excludeList || [])
          .filter((item) => String(item).trim().toLowerCase() !== lastDeleted.addedPattern);
      }
      const openUrls = new Set(Object.values(cache.openTabs).map((rec) => rec.url));
      for (const entry of lastDeleted.entries) {
        // Whether the tab is open may have changed while the undo was pending.
        cache.history[entry.url] = { ...entry, isOpen: openUrls.has(entry.url) };
      }
      const restored = lastDeleted.entries.length;
      const liftedPattern = lastDeleted.addedPattern;
      lastDeleted = null;
      if (liftedPattern) cache.prefsUpdatedAt = now;
      await saveState(['settings', 'history', 'prefsUpdatedAt']);
      if (liftedPattern) {
        schedulePush();
        await reconcile();   // re-adopt tabs that were dropped
      }
      broadcast('state-changed');
      return { restored, liftedPattern };
    }
    case 'importHistory': {
      const merged = Logic.mergeImport(cache.history, message.entries || [], message.mode);
      // The running browser, not the file, knows what is open right now.
      const openUrls = new Set(Object.values(cache.openTabs).map((rec) => rec.url));
      for (const entry of Object.values(merged)) {
        entry.isOpen = openUrls.has(entry.url);
      }
      cache.history = merged;
      Logic.syncLabelColors(cache.labelColors, Object.values(merged));
      await saveState(['history', 'labelColors']);
      broadcast('state-changed');
      return { total: Object.keys(merged).length };
    }
    case 'getSettings':
      return { settings: cache.settings };
    case 'saveSettings': {
      const before = cache.settings.scanTime;
      const wasSyncing = cache.settings.syncEnabled;
      cache.settings = { ...cache.settings, ...(message.settings || {}) };
      cache.prefsUpdatedAt = now;   // this device made the newest edit
      await saveState(['settings', 'prefsUpdatedAt']);
      if (cache.settings.scanTime !== before) {
        await rescheduleDailyScan();
      }
      // Turning sync on should adopt whatever is already out there before
      // pushing, so a second device does not clobber the first.
      if (cache.settings.syncEnabled && !wasSyncing) {
        await pullSync();
      }
      schedulePush();
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
  // On a fresh install this is what carries your settings over from another
  // device, so pull before pushing anything of our own.
  await pullSync();
});

brw.runtime.onStartup.addListener(async () => {
  await ensureLoaded();
  await ensureAlarms();
  await ensureReconciled();
  await pullSync();
});

// Another signed-in device changed the shared blob — adopt it live.
brw.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync' || !changes[SYNC_KEY]) return;
  pullSync().catch((error) => console.error('pullSync:', error));
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
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));
  return true; // keep the channel open for the async response
});

// Toolbar icon opens the sidebar/side panel.
if (brw.sidebarAction && brw.action) {
  brw.action.onClicked.addListener(() => {
    brw.sidebarAction.toggle();
  });
} else if (brw.sidePanel && brw.sidePanel.setPanelBehavior) {
  brw.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
}

// Warm start on worker wake: make sure alarms exist and the tracker is fresh.
ensureLoaded()
  .then(() => ensureAlarms())
  .then(() => ensureReconciled())
  .then(() => pullSync())
  .catch((error) => console.error('Initialization failed:', error));
