// locales/de.js
// Interface strings for German (Deutsch). Keys must stay in sync with
// locales/en.js, which t() falls back to for anything missing.
export default {
  appTitle: "Tab-Verlauf",

  // Toolbar
  uiLangLabel: "Sprache der Oberfläche",
  searchPlaceholder: "Titel oder URL suchen…",
  searchClearLabel: "Suche löschen",
  settingsLabel: "Einstellungen",
  themeToggleLabel: "Design wechseln",
  openSidebarLabel: "In der Seitenleiste öffnen",

  // Views and sort
  viewClosed: "Geschlossen",
  viewOpen: "Offen",
  viewClosedTitle: "Tabs, die tagelang offen waren und geschlossen wurden",
  viewOpenTitle: "Jetzt offene Tabs",
  sortLabel: "Sortieren",
  sortName: "Name",
  sortOpened: "Geöffnet",
  sortDuration: "Dauer",
  sortClosed: "Geschlossen",
  sortAsc: "Aufsteigend",
  sortDesc: "Absteigend",

  // Empty states
  welcomeClosed: "Tabs, die {0}+ Tage offen sind, erscheinen hier, sobald sie geschlossen werden.",
  welcomeOpen: "Keine offenen Tabs werden verfolgt.",
  noMatches: "Keine Treffer für die Suche.",

  // Rows
  rowOpenFor: "offen {0}",
  rowClosedAgo: "vor {0} geschlossen",
  rowReopen: "Klicken zum erneuten Öffnen",
  rowGoToTab: "Klicken, um zu diesem Tab zu wechseln",
  rowFilterByDomain: "Nach dieser Domain filtern",
  actionRemove: "Aus dem Verlauf entfernen",

  // Settings panel
  settingsMinDays: "Tage offen, bevor ein Tab in den Verlauf kommt",
  settingsExcludePrivate: "Private Fenster ausschließen",
  settingsExcludePinned: "Angeheftete Tabs ausschließen",
  settingsExcludeList: "Diese Seiten nie erfassen (eine pro Zeile)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "Sicherung (NDJSON)",
  exportBtn: "Exportieren",
  importBtn: "Importieren",

  // Import dialog
  importPrompt: "{0} importieren ({1} Einträge)?",
  importAppend: "Anhängen",
  importReplace: "Ersetzen",
  importCancel: "Abbrechen",

  // Status messages
  statusExported: "{0} Einträge exportiert",
  statusImported: "Importiert ({0}): {1} Einträge im Verlauf",
  statusRemovedOne: "1 Eintrag entfernt",
  statusRestored: "{0} wiederhergestellt",
  statusUndo: "Rückgängig",
  statusNoEntries: "Die Datei enthält keine Einträge",
  statusCannotParse: "Datei nicht lesbar: {0}",
  statusInitFailed: "Initialisierung fehlgeschlagen: {0}",
  statusNoResponse: "Keine Antwort vom Hintergrundskript",

  // Duration units (compact)
  unitDay: "T",
  unitHour: "Std",
  unitMinute: "Min",
  unitLessThanMinute: "<1Min",
};
