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
  viewAll: "All",
  viewNew: "New",
  viewHistory: "History",
  viewAllTitle: "All tabs: new and in history",
  viewNewTitle: "Open tabs not yet in history",
  viewHistoryTitle: "Tabs kept in history: open {0}+ days, or added with +",
  sortLabel: "Sort",
  sortTitle: "Title",
  sortUrl: "URL",
  sortOpened: "Opened",
  sortDuration: "Duration",
  sortClosed: "Closed",
  sortAsc: "Ascending",
  sortDesc: "Descending",

  // Empty states
  welcomeHistory: "Tabs open for {0}+ days are kept here, open or closed. Add any tab sooner with +.",
  welcomeNew: "No new open tabs.",
  noMatches: "Nothing matches the search.",
  showMore: "Show more ({0} left)",

  // Rows
  rowSince: "since {0}",
  rowOpenedAt: "Opened: {0}",
  rowClosedAt: "Closed: {0}",
  rowInHistory: "In history",
  rowNotInHistory: "Not in history yet",
  rowReopen: "Click to reopen",
  rowGoToTab: "Click to go to this tab",
  rowFilterByDomain: "Filter by this domain",
  actionAdd: "Add to history",
  actionRemove: "Remove from history (its count restarts from zero)",

  // Settings panel
  settingsMinDays: "Days open before a tab enters history",
  settingsMaxHistory: "Maximum history entries",
  settingsExcludePrivate: "Exclude private windows",
  settingsExcludePinned: "Exclude pinned tabs",
  settingsExcludeList: "Never track these sites (one per line)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "Backup (NDJSON)",
  exportBtn: "Export",
  importBtn: "Import",
  deleteAllBtn: "Delete all my history",
  deleteAllPrompt: "Delete everything in history ({0})? This cannot be undone.",
  deleteAllConfirm: "Delete",
  noticeLabel: "IMPORTANT:",
  noticeText: "“Delete all my history” erases the history stored by this extension. The extension has no access to your browser’s own history, so it cannot rebuild what you delete — the entries are gone for good. Export a backup first if you may need them later.",

  // Capacity line (bottom of the panel)
  capacityLine: "History: {0} / {1} · {2}",
  capacityNearFull: "Almost full. Raise “{0}” or the maximum in settings, or remove entries you no longer need.",
  capacityFull: "Full: new tabs are no longer added. Raise “{0}” or the maximum in settings, or remove entries you no longer need.",

  // Import dialog
  importPrompt: "Import {0} ({1} entries)?",
  importAppend: "Append",
  importReplace: "Replace",
  importCancel: "Cancel",

  // Status messages
  statusAdded: "Added to history",
  statusExported: "Exported {0} entries",
  statusImported: "Imported ({0}): {1} entries in history",
  statusRemovedOne: "Removed 1 entry",
  statusDeletedAll: "History deleted ({0})",
  statusHistoryFull: "History is full ({0} entries). Raise the maximum in settings or remove entries.",
  statusImportTooLarge: "Not imported: history would have {0} entries, more than the maximum of {1}.",
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

  // Size units
  unitByte: "B",
  unitKB: "KB",
  unitMB: "MB",
};
