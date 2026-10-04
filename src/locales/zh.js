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
  viewClosed: "已关闭",
  viewOpen: "已打开",
  viewClosedTitle: "打开多日后被关闭的标签页",
  viewOpenTitle: "当前打开的标签页",
  sortLabel: "排序",
  sortName: "名称",
  sortOpened: "打开时间",
  sortDuration: "时长",
  sortClosed: "关闭时间",
  sortAsc: "升序",
  sortDesc: "降序",

  // Empty states
  welcomeClosed: "打开 {0} 天以上的标签页关闭后会显示在这里。",
  welcomeOpen: "没有正在跟踪的打开标签页。",
  noMatches: "没有匹配的结果。",

  // Rows
  rowOpenFor: "已打开 {0}",
  rowClosedAgo: "{0}前关闭",
  rowReopen: "点击重新打开",
  rowGoToTab: "点击转到此标签页",
  rowFilterByDomain: "按此域名筛选",
  actionRemove: "从历史中移除",

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
