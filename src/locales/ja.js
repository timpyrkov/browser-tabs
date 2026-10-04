// locales/ja.js
// Interface strings for Japanese (日本語). Keys must stay in sync with
// locales/en.js, which t() falls back to for anything missing.
export default {
  appTitle: "タブ履歴",

  // Toolbar
  uiLangLabel: "インターフェースの言語",
  searchPlaceholder: "タイトルまたはURLを検索…",
  searchClearLabel: "検索をクリア",
  settingsLabel: "設定",
  themeToggleLabel: "テーマを切り替え",
  openSidebarLabel: "サイドパネルで開く",

  // Views and sort
  viewClosed: "閉じたタブ",
  viewOpen: "開いているタブ",
  viewClosedTitle: "何日も開いたままで、その後閉じられたタブ",
  viewOpenTitle: "現在開いているタブ",
  sortLabel: "並べ替え",
  sortName: "名前",
  sortOpened: "開いた日時",
  sortDuration: "期間",
  sortClosed: "閉じた日時",
  sortAsc: "昇順",
  sortDesc: "降順",

  // Empty states
  welcomeClosed: "{0}日以上開いていたタブは、閉じるとここに表示されます。",
  welcomeOpen: "追跡中の開いているタブはありません。",
  noMatches: "検索に一致する項目はありません。",

  // Rows
  rowOpenFor: "{0} 開いている",
  rowClosedAgo: "{0}前に閉じました",
  rowReopen: "クリックして再度開く",
  rowGoToTab: "クリックしてこのタブに移動",
  rowFilterByDomain: "このドメインで絞り込む",
  actionRemove: "履歴から削除",

  // Settings panel
  settingsMinDays: "履歴に入るまでに開いている日数",
  settingsExcludePrivate: "プライベートウィンドウを除外",
  settingsExcludePinned: "ピン留めタブを除外",
  settingsExcludeList: "記録しないサイト（1 行に 1 件）",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "バックアップ (NDJSON)",
  exportBtn: "エクスポート",
  importBtn: "インポート",

  // Import dialog
  importPrompt: "{0}（{1} 件）をインポートしますか？",
  importAppend: "追加",
  importReplace: "置き換え",
  importCancel: "キャンセル",

  // Status messages
  statusExported: "{0} 件をエクスポートしました",
  statusImported: "インポート（{0}）: 履歴に {1} 件",
  statusRemovedOne: "1 件を削除しました",
  statusRestored: "{0} 件を復元しました",
  statusUndo: "元に戻す",
  statusNoEntries: "ファイルに項目がありません",
  statusCannotParse: "ファイルを読み取れません: {0}",
  statusInitFailed: "初期化に失敗しました: {0}",
  statusNoResponse: "バックグラウンドから応答がありません",

  // Duration units (compact)
  unitDay: "日",
  unitHour: "時間",
  unitMinute: "分",
  unitLessThanMinute: "1分未満",
};
