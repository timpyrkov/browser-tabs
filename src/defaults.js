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

  // Interface language. Empty on first run so the sidebar can adopt the
  // browser's own UI language; set explicitly once the user picks one.
  uiLang: '',
};

// Fixed behaviour that used to be user settings. Kept as named constants so
// the logic stays readable and testable; see tabs-logic.js for what each does.
const FIXED_SETTINGS = {
  // Titles longer than this are truncated with an ellipsis.
  maxTitleLength: 100,
};

// Time of day (24h "HH:MM") for the daily scan that records long-open tabs
// while they are still open (so an export always has them).
const DAILY_SCAN_TIME = '05:00';

// Alarm names used by background.js.
const ALARM_HEARTBEAT = 'heartbeat';
const ALARM_DAILY_SCAN = 'dailyScan';

// How often the heartbeat refreshes lastSeenAt on open tabs (minutes).
const HEARTBEAT_MINUTES = 5;
