// locales/ru.js
// Interface strings for Russian (русский). Keys must stay in sync with
// locales/en.js, which t() falls back to for anything missing.
export default {
  appTitle: "История вкладок",

  // Toolbar
  uiLangLabel: "Язык интерфейса",
  searchPlaceholder: "Поиск по названию или URL…",
  searchClearLabel: "Очистить поиск",
  settingsLabel: "Настройки",
  themeToggleLabel: "Сменить тему",
  openSidebarLabel: "Открыть в боковой панели",

  // Views and sort
  viewAll: "Все",
  viewNew: "Новые",
  viewHistory: "История",
  viewAllTitle: "Все вкладки: новые и в истории",
  viewNewTitle: "Открытые вкладки, которых ещё нет в истории",
  viewHistoryTitle: "Вкладки в истории: открытые {0}+ дн. или добавленные кнопкой +",
  sortLabel: "Сортировка",
  sortTitle: "Название",
  sortUrl: "URL",
  sortOpened: "Открыта",
  sortDuration: "Длительность",
  sortClosed: "Закрыта",
  sortAsc: "По возрастанию",
  sortDesc: "По убыванию",

  // Empty states
  welcomeHistory: "Вкладки, открытые {0}+ дн., хранятся здесь — открытые и закрытые. Добавить раньше можно кнопкой +.",
  welcomeNew: "Нет новых открытых вкладок.",
  noMatches: "Ничего не найдено.",

  // Rows
  rowSince: "с {0}",
  rowOpenedAt: "Открыта: {0}",
  rowClosedAt: "Закрыта: {0}",
  rowInHistory: "В истории",
  rowNotInHistory: "Ещё не в истории",
  rowReopen: "Нажмите, чтобы открыть снова",
  rowGoToTab: "Нажмите, чтобы перейти к вкладке",
  rowFilterByDomain: "Фильтровать по этому домену",
  actionAdd: "Добавить в историю",
  actionRemove: "Убрать из истории (счёт времени начнётся с нуля)",

  // Settings panel
  settingsMinDays: "Дней открыта, прежде чем попасть в историю",
  settingsExcludePrivate: "Исключить приватные окна",
  settingsExcludePinned: "Исключить закреплённые вкладки",
  settingsExcludeList: "Никогда не отслеживать эти сайты (по одному в строке)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "Резервная копия (NDJSON)",
  exportBtn: "Экспорт",
  importBtn: "Импорт",

  // Import dialog
  importPrompt: "Импортировать {0} ({1} записей)?",
  importAppend: "Добавить",
  importReplace: "Заменить",
  importCancel: "Отмена",

  // Status messages
  statusAdded: "Добавлено в историю",
  statusExported: "Экспортировано записей: {0}",
  statusImported: "Импорт ({0}): записей в истории — {1}",
  statusRemovedOne: "Удалена 1 запись",
  statusRestored: "Восстановлено: {0}",
  statusUndo: "Отменить",
  statusNoEntries: "В файле нет записей",
  statusCannotParse: "Не удалось прочитать файл: {0}",
  statusInitFailed: "Ошибка запуска: {0}",
  statusNoResponse: "Нет ответа от фонового скрипта",

  // Duration units (compact)
  unitDay: "д",
  unitHour: "ч",
  unitMinute: "м",
  unitLessThanMinute: "<1м",
};
