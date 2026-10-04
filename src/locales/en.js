// locales/en.js
// Interface strings for English -- the reference locale. Every other file in
// this folder must use the same keys; t() falls back here for anything missing.
export default {
  appTitle: "Tab History",

  // Toolbar
  uiLangLabel: "Interface language",
  searchPlaceholder: "Search title or URL…",
  searchClearLabel: "Clear search",
  settingsLabel: "Settings",
  themeToggleLabel: "Toggle theme",
  openSidebarLabel: "Open in side panel",

  // Views and sort
  viewClosed: "Closed",
  viewOpen: "Open",
  viewClosedTitle: "Tabs that stayed open for days and were closed",
  viewOpenTitle: "Tabs open right now",
  sortLabel: "Sort",
  sortName: "Name",
  sortOpened: "Opened",
  sortDuration: "Duration",
  sortClosed: "Closed",
  sortAsc: "Ascending",
  sortDesc: "Descending",

  // Empty states
  welcomeClosed: "Tabs that stay open for {0}+ days appear here once they are closed.",
  welcomeOpen: "No open tabs are being tracked.",
  noMatches: "Nothing matches the search.",

  // Rows
  rowOpenFor: "open {0}",
  rowClosedAgo: "closed {0} ago",
  rowReopen: "Click to reopen",
  rowGoToTab: "Click to go to this tab",
  rowFilterByDomain: "Filter by this domain",
  actionRemove: "Remove from history",

  // Settings panel
  settingsMinDays: "Days open before a tab enters history",
  settingsExcludePrivate: "Exclude private windows",
  settingsExcludePinned: "Exclude pinned tabs",
  settingsExcludeList: "Never track these sites (one per line)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "Backup (NDJSON)",
  exportBtn: "Export",
  importBtn: "Import",

  // Import dialog
  importPrompt: "Import {0} ({1} entries)?",
  importAppend: "Append",
  importReplace: "Replace",
  importCancel: "Cancel",

  // Status messages
  statusExported: "Exported {0} entries",
  statusImported: "Imported ({0}): {1} entries in history",
  statusRemovedOne: "Removed 1 entry",
  statusRestored: "Restored {0}",
  statusUndo: "Undo",
  statusNoEntries: "File contains no entries",
  statusCannotParse: "Cannot parse file: {0}",
  statusInitFailed: "Initialization failed: {0}",
  statusNoResponse: "No response from background",

  // Duration units (compact)
  unitDay: "d",
  unitHour: "h",
  unitMinute: "m",
  unitLessThanMinute: "<1m",
};
