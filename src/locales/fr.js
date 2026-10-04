// locales/fr.js
// Interface strings for French (français). Keys must stay in sync with
// locales/en.js, which t() falls back to for anything missing.
export default {
  appTitle: "Historique des onglets",

  // Toolbar
  uiLangLabel: "Langue de l'interface",
  searchPlaceholder: "Rechercher un titre ou une URL…",
  searchClearLabel: "Effacer la recherche",
  settingsLabel: "Paramètres",
  themeToggleLabel: "Changer de thème",
  openSidebarLabel: "Ouvrir dans le panneau latéral",

  // Views and sort
  viewClosed: "Fermés",
  viewOpen: "Ouverts",
  viewClosedTitle: "Onglets restés ouverts plusieurs jours puis fermés",
  viewOpenTitle: "Onglets ouverts maintenant",
  sortLabel: "Trier",
  sortName: "Nom",
  sortOpened: "Ouverture",
  sortDuration: "Durée",
  sortClosed: "Fermeture",
  sortAsc: "Croissant",
  sortDesc: "Décroissant",

  // Empty states
  welcomeClosed: "Les onglets ouverts {0}+ jours apparaissent ici une fois fermés.",
  welcomeOpen: "Aucun onglet ouvert n’est suivi.",
  noMatches: "Aucun résultat pour cette recherche.",

  // Rows
  rowOpenFor: "ouvert {0}",
  rowClosedAgo: "fermé il y a {0}",
  rowReopen: "Cliquer pour rouvrir",
  rowGoToTab: "Cliquer pour aller à cet onglet",
  rowFilterByDomain: "Filtrer par ce domaine",
  actionRemove: "Retirer de l'historique",

  // Settings panel
  settingsMinDays: "Jours d'ouverture avant d'entrer dans l'historique",
  settingsExcludePrivate: "Exclure les fenêtres privées",
  settingsExcludePinned: "Exclure les onglets épinglés",
  settingsExcludeList: "Ne jamais suivre ces sites (un par ligne)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "Sauvegarde (NDJSON)",
  exportBtn: "Exporter",
  importBtn: "Importer",

  // Import dialog
  importPrompt: "Importer {0} ({1} entrées) ?",
  importAppend: "Ajouter",
  importReplace: "Remplacer",
  importCancel: "Annuler",

  // Status messages
  statusExported: "{0} entrées exportées",
  statusImported: "Importé ({0}) : {1} entrées dans l'historique",
  statusRemovedOne: "1 entrée supprimée",
  statusRestored: "{0} restaurées",
  statusUndo: "Annuler",
  statusNoEntries: "Le fichier ne contient aucune entrée",
  statusCannotParse: "Impossible de lire le fichier : {0}",
  statusInitFailed: "Échec de l'initialisation : {0}",
  statusNoResponse: "Aucune réponse du script d'arrière-plan",

  // Duration units (compact)
  unitDay: "j",
  unitHour: "h",
  unitMinute: "min",
  unitLessThanMinute: "<1min",
};
