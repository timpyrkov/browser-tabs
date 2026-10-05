'use strict';
// Regression suite for the extension's logic. Run with: npm test
// Loads the real source files into a stubbed browser environment; no network.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');

let fails = 0, checks = 0;
function eq(label, actual, expected) {
  checks++;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) { fails++; console.log(`  FAIL ${label}\n       got      ${JSON.stringify(actual)}\n       expected ${JSON.stringify(expected)}`); }
}
const section = (name) => console.log(`\n${name}`);
const run = (s, file) => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), s, { filename: file });
const tick = () => new Promise((resolve) => setImmediate(resolve));

/* ----------------------------------------------------------------- logic */
function loadLogic() {
  const s = { console, URL, Math, Date, Set, Map, RegExp, Number, JSON };
  s.globalThis = s; vm.createContext(s);
  run(s, 'src/tabs-logic.js');
  return s.TabsLogic;
}

/* ------------------------------------------------------------ background */
// `kind`: 'firefox' (browser.sidebarAction), 'chrome' (chrome.sidePanel that
// works), 'chrome-fails' (side panel API that rejects), 'opera' (no side
// panel API), 'yandex' (Chrome API surface, YaBrowser user agent).
// `local` is the storage.local backing object; `tabs` what tabs.query reports.
function loadBackground({ kind = 'chrome', local = {}, tabs = [] } = {}) {
  const listeners = { message: null, clicked: [], startup: [], removed: [], updated: [], alarm: [] };
  const alarmsCleared = [];
  const panel = { behavior: [], popups: [], toggled: 0 };
  const copy = (v) => JSON.parse(JSON.stringify(v));
  const area = (backing) => ({
    get: (keys) => {
      const list = keys == null ? Object.keys(backing) : [].concat(keys);
      const out = {};
      for (const k of list) if (k in backing) out[k] = copy(backing[k]);
      return Promise.resolve(out);
    },
    set: (obj) => { for (const [k, v] of Object.entries(obj)) backing[k] = copy(v); return Promise.resolve(); },
    remove: (keys) => { for (const k of [].concat(keys)) delete backing[k]; return Promise.resolve(); },
  });
  const event = (sink) => ({ addListener: (f) => { if (sink) sink.push(f); } });
  const api = {
    runtime: {
      onInstalled: event(), onStartup: event(listeners.startup),
      onMessage: { addListener: (f) => { listeners.message = f; } },
      sendMessage: () => Promise.resolve(),
    },
    storage: { local: area(local), sync: area({}), onChanged: event() },
    tabs: { query: () => Promise.resolve(copy(tabs)), onCreated: event(),
      onUpdated: event(listeners.updated), onRemoved: event(listeners.removed) },
    alarms: { get: () => Promise.resolve(undefined), create() {},
      clear: (name) => { alarmsCleared.push(name); return Promise.resolve(true); }, onAlarm: event(listeners.alarm) },
    action: { onClicked: event(listeners.clicked), setPopup: (p) => { panel.popups.push(p); return Promise.resolve(); } },
  };
  if (kind === 'chrome' || kind === 'chrome-fails' || kind === 'yandex') {
    api.sidePanel = {
      open: () => Promise.resolve(),
      setPanelBehavior: (b) => {
        panel.behavior.push(b);
        return kind === 'chrome-fails' ? Promise.reject(new Error('no side panel')) : Promise.resolve();
      },
    };
  }
  const userAgent = kind === 'yandex'
    ? 'Mozilla/5.0 Chrome/138.0 YaBrowser/25.6.0 Safari/537.36'
    : 'Mozilla/5.0 Chrome/138.0 Safari/537.36';
  const s = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 0, clearTimeout() {},
    Math, Date, URL, Promise, Number, Set, Map, Error, JSON, Object, Array, String, Boolean,
    navigator: { userAgent },
    chrome: api,
  };
  if (kind === 'firefox') {
    s.browser = { ...api, sidebarAction: { toggle: () => { panel.toggled++; }, open() {} } };
  }
  s.globalThis = s; s.self = s; vm.createContext(s);
  run(s, 'src/defaults.js');
  run(s, 'src/tabs-logic.js');
  run(s, 'src/background.js');
  const ask = (message) => new Promise((resolve) => listeners.message(message, {}, resolve));
  // Fire a tab event and let the async handler (load, record, save) finish.
  const settle = async () => { for (let i = 0; i < 10; i++) await tick(); };
  const closeTab = async (tabId) => { listeners.removed.forEach((f) => f(tabId)); await settle(); };
  const navigate = async (tab) => { listeners.updated.forEach((f) => f(tab.id, { url: tab.url }, tab)); await settle(); };
  const heartbeat = async () => { listeners.alarm.forEach((f) => f({ name: 'heartbeat' })); await settle(); };
  return { s, panel, listeners, local, ask, closeTab, navigate, heartbeat, alarmsCleared };
}

(async () => {
  const L = loadLogic();
  const DAY = L.DAY_MS;

  section('logic: URL identity');
  eq('youtube share link folds to watch?v=',
    L.normalizeUrl('https://youtu.be/abc123?t=90'), 'https://www.youtube.com/watch?v=abc123');
  eq('youtube shorts fold too',
    L.normalizeUrl('https://m.youtube.com/shorts/abc123'), 'https://www.youtube.com/watch?v=abc123');
  eq('tracking params stripped',
    L.normalizeUrl('https://example.com/a?utm_source=x&id=5'), 'https://example.com/a?id=5');
  eq('fragment dropped by default', L.normalizeUrl('https://example.com/a#top'), 'https://example.com/a');
  eq('fragment kept when asked', L.normalizeUrl('https://example.com/a#top', false), 'https://example.com/a#top');

  section('logic: stop list');
  eq('bare domain covers subdomains', L.isExcluded('https://mail.google.com/x', ['google.com']), true);
  eq('other domains untouched', L.isExcluded('https://example.com/', ['google.com']), false);

  section('logic: durations');
  eq('compact days+hours', L.formatDuration(2 * DAY + 3 * 3600 * 1000), '2d 3h');
  eq('sub-minute', L.formatDuration(5000), '<1m');
  const closed = { isOpen: false, firstSeenAt: 0, lastSeenOpenAt: 5 * DAY };
  eq('closed entry duration is frozen', L.entryDurationMs(closed, 99 * DAY), 5 * DAY);

  section('logic: promotion scan');
  const now = 100 * DAY;
  const openTabs = [
    { url: 'https://old.example/', title: 'Old', firstSeenAt: now - 8 * DAY },
    { url: 'https://new.example/', title: 'New', firstSeenAt: now - 1 * DAY },
  ];
  let result = L.promoteOpenTabs({}, openTabs, { minDays: 7, maxTitleLength: 100 }, now);
  eq('only tabs past minDays promoted', Object.keys(result.history), ['https://old.example/']);
  result = L.promoteOpenTabs(result.history, openTabs, { minDays: 7, maxTitleLength: 100 }, now + DAY);
  eq('same URL is updated, not duplicated', [result.added, result.updated], [0, 1]);
  result = L.promoteOpenTabs(result.history, [], { minDays: 7, maxTitleLength: 100 }, now + 2 * DAY);
  eq('gone tab is stamped closed', [result.closed, result.history['https://old.example/'].isOpen], [1, false]);

  section('logic: reopening a history entry always continues its count');
  let entry = { isOpen: false, firstSeenAt: 0, lastSeenOpenAt: 10 * DAY, gapMs: 0 };
  L.resumeStint(entry, 12 * DAY);
  eq('short break continues', [entry.firstSeenAt, entry.gapMs, entry.isOpen], [0, 2 * DAY, true]);
  entry = { isOpen: false, firstSeenAt: 0, lastSeenOpenAt: 10 * DAY, gapMs: 0 };
  L.resumeStint(entry, 400 * DAY);
  eq('a very long break continues too (no restart rule)', [entry.firstSeenAt, entry.gapMs], [0, 390 * DAY]);

  section('logic: record a long-open tab when it goes away');
  const settings = { minDays: 7, maxTitleLength: 100, excludeList: ['mail.google.com'] };
  let history = {};
  const longRec = { url: 'https://example.com/long', title: 'Long', firstSeenAt: now - 9 * DAY };
  eq('open >= minDays: recorded', L.recordLongOpen(history, longRec, now, settings, false), true);
  eq('recorded with its close time', [history[longRec.url].isOpen, history[longRec.url].lastSeenOpenAt], [false, now]);
  eq('already in history: left to the caller', L.recordLongOpen(history, longRec, now, settings, false), false);
  eq('younger than minDays: skipped',
    L.recordLongOpen(history, { url: 'https://example.com/short', firstSeenAt: now - DAY }, now, settings, false), false);
  eq('stop-listed site: skipped',
    L.recordLongOpen(history, { url: 'https://mail.google.com/x', firstSeenAt: 0 }, now, settings, false), false);

  section('logic: sort');
  const entries = [
    { title: 'a', url: 'https://www.zeta.org/', isOpen: false, firstSeenAt: 0, lastSeenOpenAt: 20 * DAY },        // open 20d, closed earlier
    { title: 'b', url: 'http://alpha.com/x', isOpen: false, firstSeenAt: 25 * DAY, lastSeenOpenAt: 33 * DAY },     // open 8d, closed last
  ];
  const order = (key, dir) => L.sortEntries(entries, key, dir, now).map((e) => e.title).join('');
  eq('close time: newest first / oldest first', [order('closed', 'desc'), order('closed', 'asc')], ['ba', 'ab']);
  eq('duration: longest first / shortest first', [order('duration', 'desc'), order('duration', 'asc')], ['ab', 'ba']);
  eq('open time: newest first / oldest first', [order('opened', 'desc'), order('opened', 'asc')], ['ba', 'ab']);
  eq('title: A-Z / Z-A', [order('title', 'asc'), order('title', 'desc')], ['ab', 'ba']);
  eq('url: A-Z ignoring scheme and www / Z-A', [order('url', 'asc'), order('url', 'desc')], ['ba', 'ab']);
  eq('close time: a still-open entry counts as closing now',
    L.sortEntries([...entries, { title: 'c', isOpen: true, firstSeenAt: 30 * DAY, lastSeenOpenAt: 31 * DAY }],
      'closed', 'desc', now).map((e) => e.title).join(''), 'cba');
  eq('open items sort by duration up to now',
    L.sortEntries([{ title: 'x', isOpen: true, firstSeenAt: now - DAY }, { title: 'y', isOpen: true, firstSeenAt: now - 3 * DAY }],
      'duration', 'desc', now).map((e) => e.title), ['y', 'x']);
  eq('search matches title or URL, not other fields',
    [L.matchesQuery({ title: 'Recipe', url: 'https://x/' }, 'reci'), L.matchesQuery({ title: 'x', url: 'https://x/', labels: ['art'] }, 'art')],
    [true, false]);

  section('logic: maximum history size');
  const capped = { ...settings, maxHistory: 2 };
  history = { 'https://a.example/': {}, 'https://b.example/': {} };
  eq('full history takes no new entry on close',
    L.recordLongOpen(history, { url: 'https://c.example/', firstSeenAt: 0 }, now, capped, false), false);
  const scanned = L.promoteOpenTabs({ 'https://a.example/': { url: 'https://a.example/', title: 'a', isOpen: false, firstSeenAt: 0, lastSeenOpenAt: 1 } },
    [{ url: 'https://a.example/', title: 'a2', firstSeenAt: 0 }, { url: 'https://b.example/', title: 'b', firstSeenAt: 0 },
     { url: 'https://c.example/', title: 'c', firstSeenAt: 0 }], capped, now);
  eq('scan stops adding at the maximum but still updates existing entries',
    [Object.keys(scanned.history).length, scanned.added, scanned.updated, scanned.history['https://a.example/'].title], [2, 1, 1, 'a2']);
  eq('size estimate counts UTF-8 bytes (Cyrillic = 2 bytes per letter)',
    L.historyBytes([{ url: 'https://x/', title: 'Ёж' }]) - L.historyBytes([{ url: 'https://x/', title: 'ab' }]), 2);

  section('toolbar icon: sidebar primary, popup fallback');
  let env = loadBackground({ kind: 'firefox' });
  await tick();
  env.listeners.clicked.forEach((f) => f());
  eq('Firefox: icon toggles the sidebar', env.panel.toggled, 1);
  eq('Firefox: popup never touched', env.panel.popups, []);

  env = loadBackground({ kind: 'chrome' });
  await tick();
  eq('Chrome: side panel takes the click', env.panel.behavior, [{ openPanelOnActionClick: true }]);
  eq('Chrome: popup removed once it did', env.panel.popups, [{ popup: '' }]);
  eq('Chrome: re-applied at browser start', env.listeners.startup.length >= 1, true);

  env = loadBackground({ kind: 'chrome-fails' });
  await tick();
  eq('Chrome, side panel rejects: popup kept', env.panel.popups, []);

  env = loadBackground({ kind: 'opera' });
  await tick();
  eq('Opera / no side panel API: popup kept', [env.panel.behavior, env.panel.popups], [[], []]);

  env = loadBackground({ kind: 'yandex' });
  await tick();
  eq('Yandex: side panel API ignored, popup kept', [env.panel.behavior, env.panel.popups], [[], []]);

  section('background: state survives a worker restart');
  const local = {};
  const tabs = [{ id: 1, url: 'https://example.com/read-later', title: 'Read later', windowId: 1 }];
  env = loadBackground({ kind: 'chrome', local, tabs });
  let state = await env.ask({ action: 'getState' });
  eq('open tab is tracked', state.openTabs.map((r) => r.url), ['https://example.com/read-later']);
  const firstSeen = state.openTabs[0].firstSeenAt;
  env = loadBackground({ kind: 'chrome', local, tabs: tabs.map((t) => ({ ...t, id: 99 })) });
  state = await env.ask({ action: 'getState' });
  eq('new tab id, same URL: first-seen time kept', state.openTabs[0].firstSeenAt, firstSeen);

  section('background: closing a long-open tab records it at once (no scan needed)');
  const realNow = Date.now();
  const tracker = (url, ageDays) => ({ url, title: url, favIconUrl: '', windowId: 1,
    firstSeenAt: realNow - ageDays * DAY, lastSeenAt: realNow });
  const seeded = (records) => ({
    settings: { minDays: 7 }, history: {}, lastScanAt: realNow,
    openTabs: Object.fromEntries(records.map((rec, i) => [i + 1, rec])),
  });
  let store = seeded([tracker('https://example.com/old', 9), tracker('https://example.com/new', 1)]);
  const both = [{ id: 1, url: 'https://example.com/old', title: 'x', windowId: 1 },
    { id: 2, url: 'https://example.com/new', title: 'x', windowId: 1 }];
  env = loadBackground({ kind: 'chrome', local: store, tabs: both });
  await env.ask({ action: 'getState' });
  await env.closeTab(1);
  await env.closeTab(2);
  state = await env.ask({ action: 'getState' });
  eq('9-day tab recorded as closed, 1-day tab not',
    state.history.map((e) => [e.url, e.isOpen]), [['https://example.com/old', false]]);
  eq('recorded duration covers the time it was open',
    Math.round(L.entryDurationMs(state.history[0], Date.now()) / DAY), 9);

  store = seeded([tracker('https://example.com/article', 8)]);
  const article = { id: 1, url: 'https://example.com/article', title: 'x', windowId: 1 };
  env = loadBackground({ kind: 'chrome', local: store, tabs: [article] });
  await env.ask({ action: 'getState' });
  await env.navigate({ ...article, url: 'https://example.com/next-page' });
  state = await env.ask({ action: 'getState' });
  eq('navigating away from a long-open page records it too',
    state.history.map((e) => [e.url, e.isOpen]), [['https://example.com/article', false]]);

  store = seeded([tracker('https://example.com/lost', 10)]);
  env = loadBackground({ kind: 'chrome', local: store, tabs: [] });
  state = await env.ask({ action: 'getState' });
  eq('tab missing after a browser restart is recorded with its last heartbeat',
    state.history.map((e) => [e.url, e.isOpen, e.lastSeenOpenAt]), [['https://example.com/lost', false, realNow]]);

  section('background: remove and undo');
  const removedReply = await env.ask({ action: 'deleteEntries', urls: ['https://example.com/lost'] });
  eq('removed entries are handed to the panel', removedReply.removed.map((e) => e.url), ['https://example.com/lost']);
  eq('and gone from history', (await env.ask({ action: 'getState' })).history, []);
  // A fresh worker (the old one was unloaded) still accepts the panel's undo.
  env = loadBackground({ kind: 'chrome', local: store, tabs: [] });
  const restoredReply = await env.ask({ action: 'restoreEntries', entries: removedReply.removed });
  state = await env.ask({ action: 'getState' });
  eq('undo after a worker restart restores it', [restoredReply.restored, state.history.length], [1, 1]);

  section('background: "+" adds a new tab, trash restarts its count');
  store = seeded([tracker('https://example.com/young', 2)]);
  env = loadBackground({ kind: 'chrome', local: store, tabs: [{ id: 1, url: 'https://example.com/young', title: 'x', windowId: 1 }] });
  eq('a 2-day tab is not in history yet', (await env.ask({ action: 'getState' })).history, []);
  eq('+ adds it', await env.ask({ action: 'addEntry', url: 'https://example.com/young' }), { added: true });
  state = await env.ask({ action: 'getState' });
  eq('kept its 2 days so far, and open',
    [Math.round(L.entryDurationMs(state.history[0], Date.now()) / DAY), state.history[0].isOpen], [2, true]);
  await env.ask({ action: 'deleteEntries', urls: ['https://example.com/young'] });
  state = await env.ask({ action: 'getState' });
  eq('trash: out of history, still-open tab counts from zero again',
    [state.history.length, Date.now() - state.openTabs[0].firstSeenAt < 60000], [0, true]);

  section('background: delete all history');
  store = seeded([tracker('https://example.com/a', 9), tracker('https://example.com/b', 12)]);
  env = loadBackground({ kind: 'chrome', local: store, tabs: [] });   // both closed -> recorded at startup
  eq('two closed long-open tabs in history', (await env.ask({ action: 'getState' })).history.length, 2);
  eq('delete all reports what it removed', await env.ask({ action: 'clearHistory' }), { removed: 2 });
  env = loadBackground({ kind: 'chrome', local: store, tabs: [] });
  eq('and nothing comes back after a worker restart', (await env.ask({ action: 'getState' })).history, []);

  section('background: lowering the threshold applies at once');
  store = seeded([tracker('https://example.com/four-days', 4)]);
  const fourDays = { id: 1, url: 'https://example.com/four-days', title: 'x', windowId: 1 };
  env = loadBackground({ kind: 'chrome', local: store, tabs: [fourDays] });
  eq('a 4-day tab is not in history at 7 days', (await env.ask({ action: 'getState' })).history, []);
  await env.ask({ action: 'saveSettings', settings: { minDays: 3 } });
  state = await env.ask({ action: 'getState' });
  eq('after lowering to 3 days it is in history, still open',
    state.history.map((e) => [e.url, e.isOpen]), [['https://example.com/four-days', true]]);
  await env.ask({ action: 'saveSettings', settings: { minDays: 10 } });
  eq('raising to 10 days removes nothing', (await env.ask({ action: 'getState' })).history.length, 1);

  section('background: the title is refreshed on close and on reopen');
  store = seeded([{ ...tracker('https://example.com/t', 9), title: 'New title' }]);
  store.history = { 'https://example.com/t': { url: 'https://example.com/t', title: 'Old title', domain: 'example.com',
    firstSeenAt: realNow - 9 * DAY, addedAt: realNow, lastSeenOpenAt: realNow, isOpen: true, gapMs: 0 } };
  env = loadBackground({ kind: 'chrome', local: store, tabs: [{ id: 1, url: 'https://example.com/t', title: 'New title', windowId: 1 }] });
  await env.ask({ action: 'getState' });
  await env.closeTab(1);
  state = await env.ask({ action: 'getState' });
  eq('closing stores the latest title', [state.history[0].title, state.history[0].isOpen], ['New title', false]);
  env = loadBackground({ kind: 'chrome', local: store, tabs: [{ id: 5, url: 'https://example.com/t', title: 'Newest title', windowId: 1 }] });
  state = await env.ask({ action: 'getState' });
  eq('reopening from history stores the reopened tab’s title', [state.history[0].title, state.history[0].isOpen], ['Newest title', true]);

  section('background: site icons are not kept');
  store = seeded([{ ...tracker('https://example.com/i', 1), favIconUrl: 'data:image/png;base64,' + 'A'.repeat(4000) }]);
  store.history = { 'https://example.com/h': { url: 'https://example.com/h', title: 'h', favIconUrl: 'https://example.com/favicon.ico',
    domain: 'example.com', firstSeenAt: 1, addedAt: 1, lastSeenOpenAt: 1, isOpen: false, gapMs: 0 } };
  env = loadBackground({ kind: 'chrome', local: store, tabs: [{ id: 1, url: 'https://example.com/i', title: 'i', windowId: 1, favIconUrl: 'x' }] });
  await env.ask({ action: 'getState' });
  eq('icons from an older version are removed from storage',
    [JSON.stringify(store.history).includes('favIconUrl'), JSON.stringify(store.openTabs).includes('favIconUrl')], [false, false]);

  section('background: hourly scan rides on the heartbeat');
  store = seeded([tracker('https://example.com/eight', 8)]);
  store.lastScanAt = realNow - 10 * 60 * 1000;
  const eight = { id: 1, url: 'https://example.com/eight', title: 'x', windowId: 1 };
  env = loadBackground({ kind: 'chrome', local: store, tabs: [eight] });
  await env.ask({ action: 'getState' });
  eq('the old daily-scan alarm is cleared', env.alarmsCleared.includes('dailyScan'), true);
  await env.heartbeat();
  eq('10 min after the last scan: heartbeat does not scan', (await env.ask({ action: 'getState' })).history, []);
  store.lastScanAt = realNow - 61 * 60 * 1000;
  env = loadBackground({ kind: 'chrome', local: store, tabs: [eight] });
  await env.ask({ action: 'getState' });
  await env.heartbeat();
  eq('an hour after the last scan: the long-open tab is recorded while open',
    (await env.ask({ action: 'getState' })).history.map((e) => [e.url, e.isOpen]), [['https://example.com/eight', true]]);

  section('background: maximum history size');
  const fullStore = (n) => {
    const st = seeded([tracker('https://example.com/new-one', 1)]);
    st.settings.maxHistory = 10000;
    for (let i = 0; i < n; i++) {
      const url = `https://example.com/${i}`;
      st.history[url] = { url, title: String(i), domain: 'example.com', firstSeenAt: 1, addedAt: 1, lastSeenOpenAt: 1, isOpen: false, gapMs: 0 };
    }
    return st;
  };
  store = fullStore(10000);
  env = loadBackground({ kind: 'chrome', local: store, tabs: [{ id: 1, url: 'https://example.com/new-one', title: 'n', windowId: 1 }] });
  eq('+ on a full history is refused, not silently dropped',
    await env.ask({ action: 'addEntry', url: 'https://example.com/new-one' }), { full: true, max: 10000 });
  store = fullStore(9999);
  env = loadBackground({ kind: 'chrome', local: store, tabs: [] });
  const imported = await env.ask({ action: 'importHistory', mode: 'append',
    entries: [{ url: 'https://example.com/x1', firstSeenAt: 1 }, { url: 'https://example.com/x2', firstSeenAt: 1 }] });
  eq('an import that would go over the maximum is refused as a whole',
    [imported, (await env.ask({ action: 'getState' })).history.length], [{ tooLarge: true, total: 10001, max: 10000 }, 9999]);
  env = loadBackground({ kind: 'chrome', local: {} });
  await env.ask({ action: 'saveSettings', settings: { maxHistory: 5 } });
  const low = (await env.ask({ action: 'getSettings' })).settings.maxHistory;
  await env.ask({ action: 'saveSettings', settings: { maxHistory: 5e9 } });
  const high = (await env.ask({ action: 'getSettings' })).settings.maxHistory;
  eq('the maximum is kept within 10,000 … 1,000,000 (default 100,000)',
    [low, high, (await loadBackground({ kind: 'chrome', local: {} }).ask({ action: 'getSettings' })).settings.maxHistory], [10000, 1000000, 100000]);

  section('background: settings from older versions are dropped');
  env = loadBackground({ kind: 'chrome', local: { settings: { minDays: 3, syncEnabled: true, scanTime: '09:00' } } });
  const { settings: loaded } = await env.ask({ action: 'getSettings' });
  eq('known keys kept, obsolete keys gone', [loaded.minDays, 'syncEnabled' in loaded, 'scanTime' in loaded], [3, false, false]);

  console.log(`\n${checks - fails}/${checks} checks passed`);
  process.exit(fails ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
