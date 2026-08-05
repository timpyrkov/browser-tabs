// defaults.js
// Central place for extension default settings and shared constants.
// Loaded as a classic script (window/globalThis) by sidebar.html and the
// Firefox background page; Chrome's service worker pulls it in via
// importScripts (see background.js).

const DEFAULT_SETTINGS = {
  // A tab must stay open at least this many days before the daily scan
  // promotes it into history. 0 promotes every open tab (useful for testing).
  minDays: 7,

  // Time of day (24h "HH:MM") for the daily promotion scan.
  scanTime: '05:00',

  // Exclude tabs in private/incognito windows from tracking.
  excludePrivate: true,

  // Exclude pinned tabs from tracking.
  excludePinned: false,

  // Titles longer than this are truncated with an ellipsis.
  maxTitleLength: 100,

  // Sites never tracked or added to history — the stop list. One pattern per
  // line: a bare domain also covers its subdomains ("google.com" covers
  // "mail.google.com"); a pattern containing "/" matches anywhere in the URL.
  // Seeded with the usual always-open apps you could never forget the URL of.
  excludeList: [
    'mail.google.com',
    'calendar.google.com',
    'translate.google.com',
    'web.whatsapp.com',
    'web.telegram.org',
  ],

  // Reopening a URL within this many days continues the SAME count rather than
  // starting over — a tab closed by accident and reopened is one episode, the
  // way a night with wake breaks is still one night. The break is included in
  // the duration (first-open → last-seen span) and reported separately. Beyond
  // this many days it is a new interest, so the clock restarts. 0 = always
  // restart; a very large value = always continue.
  gapToleranceDays: 30,

  // Treat "page#section" as the same page. Single-page apps rewrite the
  // fragment as you navigate inside them, which would otherwise restart the
  // duration constantly. Turn off only for sites that route on the hash.
  ignoreUrlFragment: true,

  // Theme: 'dark' or 'light'. Managed by theme.js via the theme toggle.
  theme: 'dark',

  // Interface language. Empty on first run so the sidebar can adopt the
  // browser's own UI language; set explicitly once the user picks one.
  uiLang: '',

  // Sync settings, the stop list and the label vocabulary across devices via
  // the signed-in browser account (Firefox Account / Google account). History
  // itself stays local — it does not fit in the sync quota, see below.
  syncEnabled: true,
};

// ---------------------------------------------------------------------------
// Cross-device sync
// ---------------------------------------------------------------------------

// One storage.sync key holds the whole synced blob. storage.sync allows ~100 KB
// total but only 8 KB per item, so this must stay small — which is exactly why
// history is excluded and only preferences plus the label vocabulary travel.
const SYNC_KEY = 'syncedPrefs';
const SYNC_ITEM_LIMIT = 8192;

// storage.sync is rate-limited (roughly 120 writes/minute), and settings inputs
// fire on every change, so pushes are debounced.
const SYNC_DEBOUNCE_MS = 3000;

// Settings that must NOT travel: whether this device syncs is a property of
// this device, so turning sync off here must not turn it off everywhere.
const LOCAL_ONLY_SETTINGS = ['syncEnabled'];

// Alarm names used by background.js.
const ALARM_HEARTBEAT = 'heartbeat';
const ALARM_DAILY_SCAN = 'dailyScan';

// How often the heartbeat refreshes lastSeenAt on open tabs (minutes).
const HEARTBEAT_MINUTES = 5;
