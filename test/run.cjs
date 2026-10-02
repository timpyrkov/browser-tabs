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
  const listeners = { message: null, clicked: [], startup: [] };
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
    tabs: { query: () => Promise.resolve(copy(tabs)), onCreated: event(), onUpdated: event(), onRemoved: event() },
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
  return { s, panel, listeners, local, ask };
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

  section('logic: reopen continues or restarts the count');
  let entry = { isOpen: false, firstSeenAt: 0, lastSeenOpenAt: 10 * DAY, gapMs: 0 };
  L.resumeStint(entry, 12 * DAY, 12 * DAY, { gapToleranceDays: 30 });
  eq('short break continues', [entry.firstSeenAt, entry.gapMs], [0, 2 * DAY]);
  entry = { isOpen: false, firstSeenAt: 0, lastSeenOpenAt: 10 * DAY, gapMs: 0 };
  L.resumeStint(entry, 50 * DAY, 50 * DAY, { gapToleranceDays: 30 });
  eq('long break restarts', [entry.firstSeenAt, entry.gapMs], [50 * DAY, 0]);

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

  console.log(`\n${checks - fails}/${checks} checks passed`);
  process.exit(fails ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
