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
  viewAll: "Todas",
  viewNew: "Nuevas",
  viewHistory: "Historial",
  viewAllTitle: "Todas las pestañas: nuevas y en el historial",
  viewNewTitle: "Pestañas abiertas que aún no están en el historial",
  viewHistoryTitle: "Pestañas guardadas en el historial: abiertas {0}+ días o añadidas con +",
  sortLabel: "Ordenar",
  sortTitle: "Título",
  sortUrl: "URL",
  sortOpened: "Apertura",
  sortDuration: "Duración",
  sortClosed: "Cierre",
  sortAsc: "Ascendente",
  sortDesc: "Descendente",

  // Empty states
  welcomeHistory: "Las pestañas abiertas {0}+ días se guardan aquí, abiertas o cerradas. Añade cualquiera antes con +.",
  welcomeNew: "No hay pestañas nuevas abiertas.",
  noMatches: "Nada coincide con la búsqueda.",
  showMore: "Mostrar más (quedan {0})",

  // Rows
  rowSince: "desde {0}",
  rowOpenedAt: "Abierta: {0}",
  rowClosedAt: "Cerrada: {0}",
  rowInHistory: "En el historial",
  rowNotInHistory: "Aún no está en el historial",
  rowReopen: "Clic para reabrir",
  rowGoToTab: "Clic para ir a esta pestaña",
  rowFilterByDomain: "Filtrar por este dominio",
  actionAdd: "Añadir al historial",
  actionRemove: "Quitar del historial (su recuento vuelve a cero)",

  // Settings panel
  settingsMinDays: "Días abierta antes de entrar en el historial",
  settingsMaxHistory: "Máximo de entradas del historial",
  settingsExcludePrivate: "Excluir ventanas privadas",
  settingsExcludePinned: "Excluir pestañas fijadas",
  settingsExcludeList: "No registrar nunca estos sitios (uno por línea)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "Copia de seguridad (NDJSON)",
  exportBtn: "Exportar",
  importBtn: "Importar",
  deleteAllBtn: "Borrar todo mi historial",
  deleteAllPrompt: "¿Borrar todo el historial ({0})? No se puede deshacer.",
  deleteAllConfirm: "Borrar",
  noticeLabel: "IMPORTANTE:",
  noticeText: "«Borrar todo mi historial» elimina el historial guardado por esta extensión. La extensión no tiene acceso al historial del navegador, así que no puede reconstruir lo que borres: las entradas se pierden para siempre. Exporta antes una copia de seguridad si podrías necesitarlas.",

  // Capacity line (bottom of the panel)
  capacityLine: "Historial: {0} / {1} · {2}",
  capacityNearFull: "Casi lleno. Sube «{0}» o el máximo en los ajustes, o quita las entradas que ya no necesites.",
  capacityFull: "Lleno: ya no se añaden pestañas nuevas. Sube «{0}» o el máximo en los ajustes, o quita las entradas que ya no necesites.",

  // Import dialog
  importPrompt: "¿Importar {0} ({1} entradas)?",
  importAppend: "Añadir",
  importReplace: "Reemplazar",
  importCancel: "Cancelar",

  // Status messages
  statusAdded: "Añadida al historial",
  statusExported: "Exportadas {0} entradas",
  statusImported: "Importado ({0}): {1} entradas en el historial",
  statusRemovedOne: "1 entrada eliminada",
  statusDeletedAll: "Historial borrado ({0})",
  statusHistoryFull: "El historial está lleno ({0} entradas). Sube el máximo en los ajustes o quita entradas.",
  statusImportTooLarge: "No se importó: el historial tendría {0} entradas, más que el máximo de {1}.",
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

  // Size units
  unitByte: "B",
  unitKB: "KB",
  unitMB: "MB",
};
