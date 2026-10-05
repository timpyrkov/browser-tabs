// defaults.js
// Central place for extension default settings and shared constants.
// Loaded as a classic script (window/globalThis) by sidebar.html and the
// Firefox background page; Chrome's service worker pulls it in via
// importScripts (see background.js).

const DEFAULT_SETTINGS = {
  // A tab must stay open at least this many days to be recorded in history.
  // 0 records every tab (useful for testing).
  minDays: 7,

  // Exclude tabs in private/incognito windows from tracking.
  excludePrivate: true,

  // Exclude pinned tabs from tracking.
  excludePinned: false,

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

  // Maximum number of history entries. When it is reached, new tabs are
  // simply not added (nothing already in history is ever deleted to make
  // room); the panel shows how full it is. See MAX_HISTORY_RANGE.
  maxHistory: 100000,

  // Interface language. Empty on first run so the sidebar can adopt the
  // browser's own UI language; set explicitly once the user picks one.
  uiLang: '',
};

// Allowed range for settings.maxHistory.
const MAX_HISTORY_RANGE = { min: 10000, max: 1000000 };

// Share of maxHistory at which the panel's capacity line turns red.
const HISTORY_WARN_RATIO = 0.9;

// Fixed behaviour that used to be user settings. Kept as named constants so
// the logic stays readable and testable; see tabs-logic.js for what each does.
const FIXED_SETTINGS = {
  // Titles longer than this are truncated with an ellipsis.
  maxTitleLength: 100,
};

// How often the heartbeat refreshes lastSeenAt on open tabs (minutes).
const HEARTBEAT_MINUTES = 5;

// How often the scan runs that records long-open tabs while they are still
// open (minutes). It piggybacks on the heartbeat: no alarm of its own.
const SCAN_INTERVAL_MINUTES = 60;

// Alarm names used by background.js. 'dailyScan' belonged to an earlier
// version (a 05:00 daily scan) and is cleared on existing installs.
const ALARM_HEARTBEAT = 'heartbeat';
const LEGACY_ALARMS = ['dailyScan'];
