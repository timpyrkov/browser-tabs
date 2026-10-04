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
  viewClosed: "Закрытые",
  viewOpen: "Открытые",
  viewClosedTitle: "Вкладки, которые были открыты много дней и закрыты",
  viewOpenTitle: "Вкладки, открытые сейчас",
  sortLabel: "Сортировка",
  sortName: "Название",
  sortOpened: "Открыта",
  sortDuration: "Длительность",
  sortClosed: "Закрыта",
  sortAsc: "По возрастанию",
  sortDesc: "По убыванию",

  // Empty states
  welcomeClosed: "Вкладки, открытые {0}+ дн., появятся здесь, когда их закроют.",
  welcomeOpen: "Нет отслеживаемых открытых вкладок.",
  noMatches: "Ничего не найдено.",

  // Rows
  rowOpenFor: "открыта {0}",
  rowClosedAgo: "закрыта {0} назад",
  rowReopen: "Нажмите, чтобы открыть снова",
  rowGoToTab: "Нажмите, чтобы перейти к вкладке",
  rowFilterByDomain: "Фильтровать по этому домену",
  actionRemove: "Убрать из истории",

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
