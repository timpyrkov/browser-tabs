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
  viewClosed: "닫힘",
  viewOpen: "열림",
  viewClosedTitle: "며칠 동안 열려 있다가 닫힌 탭",
  viewOpenTitle: "지금 열려 있는 탭",
  sortLabel: "정렬",
  sortName: "이름",
  sortOpened: "연 시간",
  sortDuration: "기간",
  sortClosed: "닫은 시간",
  sortAsc: "오름차순",
  sortDesc: "내림차순",

  // Empty states
  welcomeClosed: "{0}일 이상 열려 있던 탭은 닫히면 여기에 표시됩니다.",
  welcomeOpen: "추적 중인 열린 탭이 없습니다.",
  noMatches: "검색 결과가 없습니다.",

  // Rows
  rowOpenFor: "{0} 열림",
  rowClosedAgo: "{0} 전에 닫힘",
  rowReopen: "클릭하여 다시 열기",
  rowGoToTab: "클릭하여 이 탭으로 이동",
  rowFilterByDomain: "이 도메인으로 필터",
  actionRemove: "기록에서 제거",

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
