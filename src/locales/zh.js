// locales/zh.js
// Interface strings for Chinese (简体中文). Keys must stay in sync with
// locales/en.js, which t() falls back to for anything missing.
export default {
  appTitle: "标签页历史",

  // Toolbar
  uiLangLabel: "界面语言",
  searchPlaceholder: "搜索标题或网址…",
  searchClearLabel: "清除搜索",
  settingsLabel: "设置",
  themeToggleLabel: "切换主题",
  openSidebarLabel: "在侧边栏中打开",

  // Views and sort
  viewAll: "全部",
  viewNew: "新的",
  viewHistory: "历史",
  viewAllTitle: "所有标签页：新的和历史中的",
  viewNewTitle: "尚未加入历史的打开标签页",
  viewHistoryTitle: "历史中保存的标签页：打开 {0} 天以上，或用 + 添加",
  sortLabel: "排序",
  sortTitle: "标题",
  sortUrl: "网址",
  sortOpened: "打开时间",
  sortDuration: "时长",
  sortClosed: "关闭时间",
  sortAsc: "升序",
  sortDesc: "降序",

  // Empty states
  welcomeHistory: "打开 {0} 天以上的标签页会保存在这里，无论是否已关闭。可用 + 提前添加。",
  welcomeNew: "没有新的打开标签页。",
  noMatches: "没有匹配的结果。",

  // Rows
  rowSince: "自 {0}",
  rowOpenedAt: "打开：{0}",
  rowClosedAt: "关闭：{0}",
  rowInHistory: "在历史中",
  rowNotInHistory: "尚未加入历史",
  rowReopen: "点击重新打开",
  rowGoToTab: "点击转到此标签页",
  rowFilterByDomain: "按此域名筛选",
  actionAdd: "添加到历史",
  actionRemove: "从历史中移除（计时将从零开始）",

  // Settings panel
  settingsMinDays: "进入历史前需打开的天数",
  settingsExcludePrivate: "排除隐私窗口",
  settingsExcludePinned: "排除固定标签页",
  settingsExcludeList: "从不记录这些网站（每行一个）",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "备份 (NDJSON)",
  exportBtn: "导出",
  importBtn: "导入",

  // Import dialog
  importPrompt: "导入 {0}（{1} 条）？",
  importAppend: "追加",
  importReplace: "替换",
  importCancel: "取消",

  // Status messages
  statusAdded: "已添加到历史",
  statusExported: "已导出 {0} 条",
  statusImported: "已导入（{0}）：历史中共 {1} 条",
  statusRemovedOne: "已移除 1 条",
  statusRestored: "已恢复 {0} 条",
  statusUndo: "撤销",
  statusNoEntries: "文件中没有条目",
  statusCannotParse: "无法解析文件：{0}",
  statusInitFailed: "初始化失败：{0}",
  statusNoResponse: "后台无响应",

  // Duration units (compact)
  unitDay: "天",
  unitHour: "小时",
  unitMinute: "分",
  unitLessThanMinute: "<1分",
};
