// locales/it.js
// Interface strings for Italian (italiano). Keys must stay in sync with
// locales/en.js, which t() falls back to for anything missing.
export default {
  appTitle: "Cronologia schede",

  // Toolbar
  uiLangLabel: "Lingua dell'interfaccia",
  searchPlaceholder: "Cerca titolo o URL…",
  searchClearLabel: "Cancella ricerca",
  settingsLabel: "Impostazioni",
  themeToggleLabel: "Cambia tema",
  openSidebarLabel: "Apri nel pannello laterale",

  // Views and sort
  viewClosed: "Chiuse",
  viewOpen: "Aperte",
  viewClosedTitle: "Schede rimaste aperte per giorni e poi chiuse",
  viewOpenTitle: "Schede aperte ora",
  sortLabel: "Ordina",
  sortName: "Nome",
  sortOpened: "Apertura",
  sortDuration: "Durata",
  sortClosed: "Chiusura",
  sortAsc: "Crescente",
  sortDesc: "Decrescente",

  // Empty states
  welcomeClosed: "Le schede aperte da {0}+ giorni compaiono qui quando vengono chiuse.",
  welcomeOpen: "Nessuna scheda aperta monitorata.",
  noMatches: "Nessun risultato per la ricerca.",

  // Rows
  rowOpenFor: "aperta {0}",
  rowClosedAgo: "chiusa {0} fa",
  rowReopen: "Clic per riaprire",
  rowGoToTab: "Clic per andare a questa scheda",
  rowFilterByDomain: "Filtra per questo dominio",
  actionRemove: "Rimuovi dalla cronologia",

  // Settings panel
  settingsMinDays: "Giorni di apertura prima di entrare in cronologia",
  settingsExcludePrivate: "Escludi finestre private",
  settingsExcludePinned: "Escludi schede fissate",
  settingsExcludeList: "Non registrare mai questi siti (uno per riga)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "Backup (NDJSON)",
  exportBtn: "Esporta",
  importBtn: "Importa",

  // Import dialog
  importPrompt: "Importare {0} ({1} voci)?",
  importAppend: "Aggiungi",
  importReplace: "Sostituisci",
  importCancel: "Annulla",

  // Status messages
  statusExported: "Esportate {0} voci",
  statusImported: "Importato ({0}): {1} voci in cronologia",
  statusRemovedOne: "1 voce rimossa",
  statusRestored: "Ripristinate {0}",
  statusUndo: "Annulla",
  statusNoEntries: "Il file non contiene voci",
  statusCannotParse: "Impossibile leggere il file: {0}",
  statusInitFailed: "Inizializzazione fallita: {0}",
  statusNoResponse: "Nessuna risposta dal processo in background",

  // Duration units (compact)
  unitDay: "g",
  unitHour: "h",
  unitMinute: "min",
  unitLessThanMinute: "<1min",
};
