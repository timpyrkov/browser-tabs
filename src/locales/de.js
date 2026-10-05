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
  viewAll: "Alle",
  viewNew: "Neu",
  viewHistory: "Verlauf",
  viewAllTitle: "Alle Tabs: neu und im Verlauf",
  viewNewTitle: "Offene Tabs, die noch nicht im Verlauf sind",
  viewHistoryTitle: "Tabs im Verlauf: {0}+ Tage offen oder mit + hinzugefügt",
  sortLabel: "Sortieren",
  sortTitle: "Titel",
  sortUrl: "URL",
  sortOpened: "Geöffnet",
  sortDuration: "Dauer",
  sortClosed: "Geschlossen",
  sortAsc: "Aufsteigend",
  sortDesc: "Absteigend",

  // Empty states
  welcomeHistory: "Tabs, die {0}+ Tage offen sind, bleiben hier, offen oder geschlossen. Mit + früher hinzufügen.",
  welcomeNew: "Keine neuen offenen Tabs.",
  noMatches: "Keine Treffer für die Suche.",

  // Rows
  rowSince: "seit {0}",
  rowOpenedAt: "Geöffnet: {0}",
  rowClosedAt: "Geschlossen: {0}",
  rowInHistory: "Im Verlauf",
  rowNotInHistory: "Noch nicht im Verlauf",
  rowReopen: "Klicken zum erneuten Öffnen",
  rowGoToTab: "Klicken, um zu diesem Tab zu wechseln",
  rowFilterByDomain: "Nach dieser Domain filtern",
  actionAdd: "Zum Verlauf hinzufügen",
  actionRemove: "Aus dem Verlauf entfernen (Zählung beginnt bei null)",

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
  statusAdded: "Zum Verlauf hinzugefügt",
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
