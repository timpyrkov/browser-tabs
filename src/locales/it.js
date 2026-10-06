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
  viewAll: "Tutte",
  viewNew: "Nuove",
  viewHistory: "Cronologia",
  viewAllTitle: "Tutte le schede: nuove e in cronologia",
  viewNewTitle: "Schede aperte non ancora in cronologia",
  viewHistoryTitle: "Schede conservate in cronologia: aperte da {0}+ giorni o aggiunte con +",
  sortLabel: "Ordina",
  sortTitle: "Titolo",
  sortUrl: "URL",
  sortOpened: "Apertura",
  sortDuration: "Durata",
  sortClosed: "Chiusura",
  sortAsc: "Crescente",
  sortDesc: "Decrescente",

  // Empty states
  welcomeHistory: "Le schede aperte da {0}+ giorni restano qui, aperte o chiuse. Aggiungine una prima con +.",
  welcomeNew: "Nessuna nuova scheda aperta.",
  noMatches: "Nessun risultato per la ricerca.",
  showMore: "Mostra altro (ne restano {0})",

  // Rows
  rowSince: "dal {0}",
  rowOpenedAt: "Aperta: {0}",
  rowClosedAt: "Chiusa: {0}",
  rowInHistory: "In cronologia",
  rowNotInHistory: "Non ancora in cronologia",
  rowReopen: "Clic per riaprire",
  rowGoToTab: "Clic per andare a questa scheda",
  rowFilterByDomain: "Filtra per questo dominio",
  actionAdd: "Aggiungi alla cronologia",
  actionRemove: "Rimuovi dalla cronologia (il conteggio riparte da zero)",

  // Settings panel
  settingsMinDays: "Giorni di apertura prima di entrare in cronologia",
  settingsMaxHistory: "Numero massimo di voci della cronologia",
  settingsExcludePrivate: "Escludi finestre private",
  settingsExcludePinned: "Escludi schede fissate",
  settingsExcludeList: "Non registrare mai questi siti (uno per riga)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "Backup (NDJSON)",
  exportBtn: "Esporta",
  importBtn: "Importa",
  deleteAllBtn: "Elimina tutta la mia cronologia",
  deleteAllPrompt: "Eliminare tutta la cronologia ({0})? L’operazione non si può annullare.",
  deleteAllConfirm: "Elimina",
  noticeLabel: "IMPORTANTE:",
  noticeText: "«Elimina tutta la mia cronologia» cancella la cronologia salvata da questa estensione. Anche disinstallare l’estensione la cancella, mentre aggiornarla a una nuova versione la conserva. L’estensione non ha accesso alla cronologia del browser, quindi non può ricostruire ciò che viene cancellato: esporta prima un backup se potrebbe servirti.",

  // Capacity line (bottom of the panel)
  capacityLine: "Cronologia: {0} / {1} · {2}",
  capacityNearFull: "Quasi piena. Aumenta «{0}» o il massimo nelle impostazioni, oppure rimuovi le voci che non ti servono più.",
  capacityFull: "Piena: le nuove schede non vengono più aggiunte. Aumenta «{0}» o il massimo nelle impostazioni, oppure rimuovi le voci che non ti servono più.",

  // Import dialog
  importPrompt: "Importare {0} ({1} voci)?",
  importAppend: "Aggiungi",
  importReplace: "Sostituisci",
  importCancel: "Annulla",

  // Status messages
  statusAdded: "Aggiunta alla cronologia",
  statusExported: "Esportate {0} voci",
  statusImported: "Importato ({0}): {1} voci in cronologia",
  statusRemovedOne: "1 voce rimossa",
  statusDeletedAll: "Cronologia eliminata ({0})",
  statusHistoryFull: "La cronologia è piena ({0} voci). Aumenta il massimo nelle impostazioni o rimuovi delle voci.",
  statusImportTooLarge: "Non importato: la cronologia avrebbe {0} voci, oltre il massimo di {1}.",
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

  // Size units
  unitByte: "B",
  unitKB: "KB",
  unitMB: "MB",
};
