// locales/ko.js
// Interface strings for Korean (한국어). Keys must stay in sync with
// locales/en.js, which t() falls back to for anything missing.
export default {
  appTitle: "탭 기록",

  // Toolbar
  uiLangLabel: "인터페이스 언어",
  searchPlaceholder: "제목 또는 URL 검색…",
  searchClearLabel: "검색 지우기",
  settingsLabel: "설정",
  themeToggleLabel: "테마 전환",
  openSidebarLabel: "사이드 패널에서 열기",

  // Views and sort
  viewAll: "전체",
  viewNew: "새 탭",
  viewHistory: "기록",
  viewAllTitle: "모든 탭: 새 탭과 기록",
  viewNewTitle: "아직 기록에 없는 열린 탭",
  viewHistoryTitle: "기록에 보관된 탭: {0}일 이상 열렸거나 +로 추가한 탭",
  sortLabel: "정렬",
  sortTitle: "제목",
  sortUrl: "URL",
  sortOpened: "연 시간",
  sortDuration: "기간",
  sortClosed: "닫은 시간",
  sortAsc: "오름차순",
  sortDesc: "내림차순",

  // Empty states
  welcomeHistory: "{0}일 이상 열린 탭은 열려 있든 닫혔든 여기에 보관됩니다. +로 더 일찍 추가할 수 있습니다.",
  welcomeNew: "새로 열린 탭이 없습니다.",
  noMatches: "검색 결과가 없습니다.",

  // Rows
  rowSince: "{0}부터",
  rowOpenedAt: "연 시간: {0}",
  rowClosedAt: "닫은 시간: {0}",
  rowInHistory: "기록에 있음",
  rowNotInHistory: "아직 기록에 없음",
  rowReopen: "클릭하여 다시 열기",
  rowGoToTab: "클릭하여 이 탭으로 이동",
  rowFilterByDomain: "이 도메인으로 필터",
  actionAdd: "기록에 추가",
  actionRemove: "기록에서 제거 (시간이 0부터 다시 계산됨)",

  // Settings panel
  settingsMinDays: "기록에 들어가기까지 열려 있어야 하는 일수",
  settingsExcludePrivate: "사생활 보호 창 제외",
  settingsExcludePinned: "고정된 탭 제외",
  settingsExcludeList: "기록하지 않을 사이트 (한 줄에 하나)",
  settingsExcludeListPlaceholder: "mail.google.com\nexample.com/inbox",
  settingsBackup: "백업 (NDJSON)",
  exportBtn: "내보내기",
  importBtn: "가져오기",

  // Import dialog
  importPrompt: "{0}({1}개 항목)을 가져올까요?",
  importAppend: "추가",
  importReplace: "교체",
  importCancel: "취소",

  // Status messages
  statusAdded: "기록에 추가됨",
  statusExported: "{0}개 항목을 내보냈습니다",
  statusImported: "가져오기({0}): 기록에 {1}개 항목",
  statusRemovedOne: "1개 항목을 제거했습니다",
  statusRestored: "{0}개를 복원했습니다",
  statusUndo: "실행 취소",
  statusNoEntries: "파일에 항목이 없습니다",
  statusCannotParse: "파일을 읽을 수 없습니다: {0}",
  statusInitFailed: "초기화 실패: {0}",
  statusNoResponse: "백그라운드에서 응답이 없습니다",

  // Duration units (compact)
  unitDay: "일",
  unitHour: "시간",
  unitMinute: "분",
  unitLessThanMinute: "1분 미만",
};
