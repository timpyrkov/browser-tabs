// locales/es.js
// Interface strings for Spanish (español). Keys must stay in sync with
// locales/en.js, which t() falls back to for anything missing.
export default {
  appTitle: "Historial de pestañas",

  // Toolbar
  uiLangLabel: "Idioma de la interfaz",
  searchPlaceholder: "Buscar título o URL…",
  searchClearLabel: "Borrar búsqueda",
  settingsLabel: "Ajustes",
  themeToggleLabel: "Cambiar tema",
  openSidebarLabel: "Abrir en el panel lateral",

  // Views and sort
  viewClosed: "Cerradas",
  viewOpen: "Abiertas",
  viewClosedTitle: "Pestañas que estuvieron abiertas durante días y se cerraron",
  viewOpenTitle: "Pestañas abiertas ahora",
  sortLabel: "Ordenar",
  sortName: "Nombre",
  sortOpened: "Apertura",
  sortDuration: "Duración",
  sortClosed: "Cierre",
  sortAsc: "Ascendente",
  sortDesc: "Descendente",

  // Empty states
  welcomeClosed: "Las pestañas abiertas {0}+ días aparecen aquí cuando se cierran.",
  welcomeOpen: "No hay pestañas abiertas en seguimiento.",
  noMatches: "Nada coincide con la búsqueda.",

  // Rows
  rowOpenFor: "abierta {0}",
  rowClosedAgo: "cerrada hace {0}",
  rowReopen: "Clic para reabrir",
  rowGoToTab: "Clic para ir a esta pestaña",
  rowFilterByDomain: "Filtrar por este dominio",
  actionRemove: "Quitar del historial",

  // Settings panel
  settingsMinDays: "Días abierta antes de entrar en el historial",
  settingsExcludePrivate: "Excluir ventanas privadas",
  settingsExcludePinned: "Excluir pestañas fijadas",
  settingsExcludeList: "No registrar nunca estos sitios (uno por línea)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "Copia de seguridad (NDJSON)",
  exportBtn: "Exportar",
  importBtn: "Importar",

  // Import dialog
  importPrompt: "¿Importar {0} ({1} entradas)?",
  importAppend: "Añadir",
  importReplace: "Reemplazar",
  importCancel: "Cancelar",

  // Status messages
  statusExported: "Exportadas {0} entradas",
  statusImported: "Importado ({0}): {1} entradas en el historial",
  statusRemovedOne: "1 entrada eliminada",
  statusRestored: "Restauradas {0}",
  statusUndo: "Deshacer",
  statusNoEntries: "El archivo no contiene entradas",
  statusCannotParse: "No se puede leer el archivo: {0}",
  statusInitFailed: "Fallo al iniciar: {0}",
  statusNoResponse: "Sin respuesta del proceso en segundo plano",

  // Duration units (compact)
  unitDay: "d",
  unitHour: "h",
  unitMinute: "min",
  unitLessThanMinute: "<1min",
};
