// locales/en.js
// Interface strings for English -- the reference locale. Every other file in
// this folder must use the same keys; t() falls back here for anything missing.
export default {
  appTitle: "Tab History",

  // Toolbar
  uiLangLabel: "Interface language",
  searchPlaceholder: "Search title, URL, domain, label…",
  searchClearLabel: "Clear search",
  settingsLabel: "Settings",
  themeToggleLabel: "Toggle theme",

  // Sort row
  sortLabel: "Sort:",
  sortDuration: "Duration",
  sortUrl: "Url",
  sortName: "Name",
  sortTag: "Tag",
  sortDirectionLabel: "Sort direction",
  deleteShownBtn: "Delete {0} shown",
  deleteShownConfirm: "Confirm delete {0}?",

  // Summary strip
  summaryHistory: "History",
  summaryOpenNow: "Open now",
  summaryLastScan: "Last scan: {0} · next {1}",
  summaryNextScan: "Next scan {0}",
  timeAgo: "{0} ago",
  timeIn: "in {0}",
  timeSoon: "soon",
  timeNever: "never",

  // Filter chips
  filterAll: "All",
  filterOpen: "Still open",
  filterClosed: "Closed",

  // Sections
  sectionHistory: "History (long-open tabs)",
  sectionOpenTabs: "Open tabs (not yet in history)",
  welcomeText: "Keep tabs open and they will appear in history after the daily scan. Click Scan now to check immediately.",

  // Rows
  rowOpenFor: "open {0}",
  rowFirstSeen: "first seen {0}",
  rowWasOpen: "was open {0} · closed {1}",
  rowClosedInBetween: " · {0} closed in between",
  rowUntilHistory: "{0} until history",
  rowQualifiesNextScan: "qualifies at next scan",
  rowFilterByDomain: "Filter by this domain",
  rowFilterByLabel: "Filter by \"{0}\"",
  rowRemoveLabel: "Remove \"{0}\"",
  rowRenamedTitle: "Renamed by you — scans will not overwrite it",

  // Row actions
  actionRename: "Rename",
  actionAddLabel: "Add label",
  actionAddLabelPromotes: "Add label (adds to history)",
  actionOpenInNewTab: "Open in new tab",
  actionNeverTrack: "Never track {0}",
  actionRemove: "Remove from history",
  actionAddNow: "Add to history now",
  labelPlaceholder: "Add label…",
  renamePlaceholder: "Name (empty restores the page title)",

  // Settings panel
  settingsMinDays: "Days open before a tab enters history",
  settingsScanTime: "Daily scan time",
  settingsGapTolerance: "Reopened within N days continues the count",
  settingsGapToleranceTitle: "A tab closed and reopened within this window keeps its original count, breaks included",
  settingsExcludePrivate: "Exclude private windows",
  settingsExcludePinned: "Exclude pinned tabs",
  settingsIgnoreFragment: "Ignore #fragment in URLs",
  settingsIgnoreFragmentTitle: "Single-page apps rewrite the #fragment as you move around inside one page",
  settingsExcludeList: "Never track these sites (one per line)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsMaxTitleLength: "Max title length",
  settingsSync: "Sync settings and labels",
  settingsSyncTitle: "Sync settings, the stop list and your label vocabulary across devices via your signed-in browser account. History stays on this device.",
  settingsSyncNote: "Settings, stop list and labels only — history stays local.",
  statusSyncUnavailable: "Sync unavailable — check you are signed in to your browser account.",

  // Action bar
  scanNowBtn: "Scan now",
  importBtn: "Import",
  exportBtn: "Export",
  exportNdjson: "NDJSON",
  exportCsv: "CSV",

  // Import dialog
  importPrompt: "Import {0} ({1} entries)?",
  importAppend: "Append",
  importReplace: "Replace",
  importCancel: "Cancel",

  // Status messages
  statusScanResult: "Scan: {0} added, {1} updated, {2} closed",
  statusExported: "Exported {0} entries",
  statusImported: "Imported ({0}): {1} entries in history",
  statusRemovedOne: "Removed 1 entry",
  statusRemovedMany: "Removed {0} entries",
  statusRestored: "Restored {0}",
  statusNothingToRestore: "Nothing to restore",
  statusUndo: "Undo",
  statusAddedToHistory: "Added to history",
  statusExcludeConfirm: "Click again to never track {0}",
  statusExcluded: "Excluded {0}",
  statusExcludedRemoved: "Excluded {0} · removed {1}",
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
