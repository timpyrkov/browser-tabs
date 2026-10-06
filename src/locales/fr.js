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
  viewAll: "Tous",
  viewNew: "Nouveaux",
  viewHistory: "Historique",
  viewAllTitle: "Tous les onglets : nouveaux et dans l’historique",
  viewNewTitle: "Onglets ouverts pas encore dans l’historique",
  viewHistoryTitle: "Onglets gardés dans l’historique : ouverts {0}+ jours ou ajoutés avec +",
  sortLabel: "Trier",
  sortTitle: "Titre",
  sortUrl: "URL",
  sortOpened: "Ouverture",
  sortDuration: "Durée",
  sortClosed: "Fermeture",
  sortAsc: "Croissant",
  sortDesc: "Décroissant",

  // Empty states
  welcomeHistory: "Les onglets ouverts {0}+ jours sont gardés ici, ouverts ou fermés. Ajoutez-en un plus tôt avec +.",
  welcomeNew: "Aucun nouvel onglet ouvert.",
  noMatches: "Aucun résultat pour cette recherche.",
  showMore: "Afficher plus ({0} restants)",

  // Rows
  rowSince: "depuis {0}",
  rowOpenedAt: "Ouvert : {0}",
  rowClosedAt: "Fermé : {0}",
  rowInHistory: "Dans l’historique",
  rowNotInHistory: "Pas encore dans l’historique",
  rowReopen: "Cliquer pour rouvrir",
  rowGoToTab: "Cliquer pour aller à cet onglet",
  rowFilterByDomain: "Filtrer par ce domaine",
  actionAdd: "Ajouter à l’historique",
  actionRemove: "Retirer de l’historique (son compteur repart de zéro)",

  // Settings panel
  settingsMinDays: "Jours d'ouverture avant d'entrer dans l'historique",
  settingsMaxHistory: "Nombre maximal d’entrées",
  settingsExcludePrivate: "Exclure les fenêtres privées",
  settingsExcludePinned: "Exclure les onglets épinglés",
  settingsExcludeList: "Ne jamais suivre ces sites (un par ligne)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "Sauvegarde (NDJSON)",
  exportBtn: "Exporter",
  importBtn: "Importer",
  deleteAllBtn: "Supprimer tout mon historique",
  deleteAllPrompt: "Supprimer tout l’historique ({0}) ? Cette action est irréversible.",
  deleteAllConfirm: "Supprimer",
  noticeLabel: "IMPORTANT :",
  noticeText: "« Supprimer tout mon historique » efface l’historique enregistré par cette extension. La désinstaller l’efface aussi, alors qu’une mise à jour vers une nouvelle version le conserve. L’extension n’a pas accès à l’historique du navigateur : elle ne peut donc pas reconstituer ce qui est effacé. Exportez d’abord une sauvegarde si vous pourriez en avoir besoin.",

  // Capacity line (bottom of the panel)
  capacityLine: "Historique : {0} / {1} · {2}",
  capacityNearFull: "Presque plein. Augmentez « {0} » ou le maximum dans les réglages, ou retirez les entrées inutiles.",
  capacityFull: "Plein : les nouveaux onglets ne sont plus ajoutés. Augmentez « {0} » ou le maximum dans les réglages, ou retirez les entrées inutiles.",

  // Import dialog
  importPrompt: "Importer {0} ({1} entrées) ?",
  importAppend: "Ajouter",
  importReplace: "Remplacer",
  importCancel: "Annuler",

  // Status messages
  statusAdded: "Ajouté à l’historique",
  statusExported: "{0} entrées exportées",
  statusImported: "Importé ({0}) : {1} entrées dans l'historique",
  statusRemovedOne: "1 entrée supprimée",
  statusDeletedAll: "Historique supprimé ({0})",
  statusHistoryFull: "L’historique est plein ({0} entrées). Augmentez le maximum dans les réglages ou retirez des entrées.",
  statusImportTooLarge: "Non importé : l’historique compterait {0} entrées, au-delà du maximum de {1}.",
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

  // Size units
  unitByte: "o",
  unitKB: "Ko",
  unitMB: "Mo",
};
