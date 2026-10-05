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
  viewAll: "すべて",
  viewNew: "新規",
  viewHistory: "履歴",
  viewAllTitle: "すべてのタブ：新規と履歴",
  viewNewTitle: "まだ履歴にない開いているタブ",
  viewHistoryTitle: "履歴に保存されたタブ：{0}日以上開いていたか、+で追加したもの",
  sortLabel: "並べ替え",
  sortTitle: "タイトル",
  sortUrl: "URL",
  sortOpened: "開いた日時",
  sortDuration: "期間",
  sortClosed: "閉じた日時",
  sortAsc: "昇順",
  sortDesc: "降順",

  // Empty states
  welcomeHistory: "{0}日以上開いていたタブは、開いていても閉じても、ここに保存されます。+で早めに追加できます。",
  welcomeNew: "新しく開いたタブはありません。",
  noMatches: "検索に一致する項目はありません。",

  // Rows
  rowSince: "{0}から",
  rowOpenedAt: "開いた日時：{0}",
  rowClosedAt: "閉じた日時：{0}",
  rowInHistory: "履歴にあります",
  rowNotInHistory: "まだ履歴にありません",
  rowReopen: "クリックして再度開く",
  rowGoToTab: "クリックしてこのタブに移動",
  rowFilterByDomain: "このドメインで絞り込む",
  actionAdd: "履歴に追加",
  actionRemove: "履歴から削除（時間は0から数え直し）",

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
  statusAdded: "履歴に追加しました",
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
