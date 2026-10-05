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
  const listeners = { message: null, clicked: [], startup: [], removed: [], updated: [] };
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
    alarms: { get: () => Promise.resolve(undefined), create() {}, clear: () => Promise.resolve(true), onAlarm: event() },
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
  return { s, panel, listeners, local, ask, closeTab, navigate };
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

  section('background: settings from older versions are dropped');
  env = loadBackground({ kind: 'chrome', local: { settings: { minDays: 3, syncEnabled: true, scanTime: '09:00' } } });
  const { settings: loaded } = await env.ask({ action: 'getSettings' });
  eq('known keys kept, obsolete keys gone', [loaded.minDays, 'syncEnabled' in loaded, 'scanTime' in loaded], [3, false, false]);

  console.log(`\n${checks - fails}/${checks} checks passed`);
  process.exit(fails ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
