// sidebar.js
// UI logic for the Tab History panel (sidebar, side panel and toolbar popup
// all load this same page). An ES module for the i18n imports;
// DEFAULT_SETTINGS and TabsLogic arrive as globals from the classic scripts
// the page loads first.
//
// The panel is only a view: the background owns history and the tracker, and
// every change is a command to it. The one thing kept here is the Undo of the
// last removal, because a Chrome worker is unloaded after ~30 s idle.
import { t as translate, detectBrowserLanguage, durationUnits, UI_STRINGS, UI_FLAGS } from './i18n.js';

(function () {
  const brw = typeof browser !== 'undefined' ? browser : chrome;
  const Logic = window.TabsLogic;
  // Three filters over one list: 'history' (URLs in history, open or closed),
  // 'new' (open tabs not yet in history) and 'all' (both).
  const VIEWS = ['history', 'new', 'all'];
  // Sort keys offered per view (a new tab is always open, so it has no close
  // time), and the starting order of each view.
  const VIEW_SORT_KEYS = {
    all: ['title', 'url', 'opened', 'duration', 'closed'],
    new: ['title', 'url', 'opened', 'duration'],
    history: ['title', 'url', 'opened', 'duration', 'closed'],
  };
  const DEFAULT_SORT = {
    all: { key: 'duration', dir: 'desc' },
    new: { key: 'duration', dir: 'desc' },
    history: { key: 'closed', dir: 'desc' },
  };
  // Views saved by the previous version, which had Open / Closed lists.
  const LEGACY_VIEWS = { open: 'new', closed: 'history' };
  // Rows are drawn a page at a time: the whole list is filtered and sorted
  // (cheap), but only the first PAGE_SIZE rows become DOM elements, and more
  // pages follow as you scroll to the end. Redrawing tens of thousands of rows
  // on every change and every minute would make a large history sluggish.
  const PAGE_SIZE = 200;

  const SORT_LABEL_KEYS = {
    title: 'sortTitle', url: 'sortUrl', opened: 'sortOpened', duration: 'sortDuration', closed: 'sortClosed',
  };

  // Row button icons, drawn with currentColor so they follow the theme.
  const ICON_PLUS = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">'
    + '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>';
  const ICON_TRASH = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">'
    + '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';

  // Bound to the active language so call sites stay short.
  function t(key, ...args) {
    return translate(state.settings.uiLang || 'en', key, ...args);
  }

  function fmt(ms) {
    return Logic.formatDuration(ms, durationUnits(state.settings.uiLang || 'en'));
  }

  // Compact local date-time for a row ("04.10 09:12"; the year is added when
  // it is not the current one) and a full one for the tooltip. Both follow
  // the interface language's date order; the compact one always uses a
  // 24-hour clock, since "AM/PM" alone overflows a narrow sidebar.
  function fmtDate(ts) {
    const date = new Date(ts);
    const options = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    if (date.getFullYear() !== new Date().getFullYear()) options.year = '2-digit';
    return date.toLocaleString(state.settings.uiLang || undefined, options);
  }

  function fmtNum(n) {
    return Number(n).toLocaleString(state.settings.uiLang || undefined);
  }

  function fmtBytes(bytes) {
    const lang = state.settings.uiLang || undefined;
    if (bytes < 1024) return `${bytes} ${t('unitByte')}`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString(lang)} ${t('unitKB')}`;
    return `${(bytes / (1024 * 1024)).toLocaleString(lang, { maximumFractionDigits: 1 })} ${t('unitMB')}`;
  }

  function fmtDateFull(ts) {
    return new Date(ts).toLocaleString(state.settings.uiLang || undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const state = {
    history: [],       // HistoryEntry[]
    openTabs: [],      // tracker records incl. tabId
    settings: { ...DEFAULT_SETTINGS },
    prefs: {
      query: '',
      view: 'history',    // all | new | history
      sort: Object.fromEntries(VIEWS.map((view) => [view, { ...DEFAULT_SORT[view] }])),
    },
    pendingImport: null,  // { fileName, entries }
    shownLimit: PAGE_SIZE,  // rows drawn so far (see renderList)
  };

  const els = {};
  ['searchInput', 'searchClear', 'settingsBtn', 'themeToggle', 'uiLangSelect',
   'viewAllBtn', 'viewNewBtn', 'viewHistoryBtn', 'viewAllLabel', 'viewNewLabel', 'viewHistoryLabel',
   'countAll', 'countNew', 'countHistory',
   'sortSelect', 'sortAscBtn', 'sortDescBtn', 'settingsPanel', 'minDays', 'minDaysLabel', 'excludePrivate', 'excludePrivateLabel',
   'excludePinned', 'excludePinnedLabel', 'excludeList', 'excludeListLabel', 'backupLabel',
   'exportBtn', 'importBtn', 'importFile', 'importModal', 'importPrompt',
   'importAppendBtn', 'importReplaceBtn', 'importCancelBtn',
   'maxHistory', 'maxHistoryLabel', 'capacityLine', 'capacityText', 'capacityHint',
   'deleteAllBtn', 'deleteModal', 'deletePrompt', 'deleteConfirmBtn', 'deleteCancelBtn', 'noticeLabel', 'noticeText',
   'list', 'showMoreBtn', 'welcomeText', 'statusLine',
  ].forEach((id) => { els[id] = document.getElementById(id); });

  function sendMessage(payload) {
    return Promise.resolve(brw.runtime.sendMessage(payload));
  }

  let statusTimer = null;
  function showStatus(text, isError, durationMs) {
    els.statusLine.textContent = text;
    els.statusLine.style.color = isError ? 'var(--color-error)' : '';
    clearTimeout(statusTimer);
    if (text) {
      statusTimer = setTimeout(() => { els.statusLine.textContent = ''; }, durationMs || 5000);
    }
  }

  // Removal is the one destructive action here, so it always comes with a way
  // back rather than a confirmation prompt people learn to click through.
  // (Undo brings the entry and its count back; a tab that stayed open keeps
  // counting from the restored start.)
  function showUndo(removed) {
    showStatus(t('statusRemovedOne'), false, 12000);
    const undo = document.createElement('button');
    undo.className = 'undo-link';
    undo.textContent = t('statusUndo');
    undo.addEventListener('click', async () => {
      const response = await sendMessage({ action: 'restoreEntries', entries: removed });
      await refresh();
      showStatus(t('statusRestored', (response && response.restored) || 0));
    });
    els.statusLine.appendChild(undo);
  }

  // ---------------------------------------------------------------------------
  // Prefs persistence (panel-owned view state)
  // ---------------------------------------------------------------------------

  let prefsSaveTimer = null;
  function savePrefs() {
    clearTimeout(prefsSaveTimer);
    prefsSaveTimer = setTimeout(() => {
      brw.storage.local.set({ sidebarPrefs: state.prefs });
    }, 250);
  }

  async function loadPrefs() {
    const stored = await brw.storage.local.get('sidebarPrefs');
    const saved = stored.sidebarPrefs || {};
    // Prefs from older versions (other sort keys, an "all" view) fall back
    // to the defaults rather than leaving a control blank.
    const sort = {};
    for (const view of VIEWS) {
      const s = (saved.sort && saved.sort[view]) || {};
      sort[view] = {
        key: VIEW_SORT_KEYS[view].includes(s.key) ? s.key : DEFAULT_SORT[view].key,
        dir: Logic.SORT_DIRS.includes(s.dir) ? s.dir : DEFAULT_SORT[view].dir,
      };
    }
    const view = LEGACY_VIEWS[saved.view] || saved.view;
    state.prefs = {
      query: typeof saved.query === 'string' ? saved.query : '',
      view: VIEWS.includes(view) ? view : 'history',
      sort,
    };
  }

  function currentSort() {
    return state.prefs.sort[state.prefs.view];
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  async function fetchState() {
    const response = await sendMessage({ action: 'getState' });
    if (!response || response.error) {
      showStatus(response ? response.error : t('statusNoResponse'), true);
      return;
    }
    state.history = response.history || [];
    state.openTabs = response.openTabs || [];
    // Measured here, once per data change, rather than on every render tick.
    state.historyBytes = Logic.historyBytes(state.history);
  }

  async function fetchSettings() {
    const response = await sendMessage({ action: 'getSettings' });
    if (response && response.settings) {
      state.settings = response.settings;
    }
  }

  // ---------------------------------------------------------------------------
  // Rows
  // ---------------------------------------------------------------------------

  // One list item per URL, shaped like a history entry so one sort applies:
  //  - every history entry ('history'), open or closed; while open, its
  //    count runs from the entry's start, which includes earlier breaks;
  //  - every open URL not in history ('new'); the oldest tab defines its age.
  // `rec` is the open tab to switch to, if any.
  function buildItems(now) {
    const openByUrl = Logic.oldestRecordByUrl(state.openTabs);
    const items = [];
    for (const entry of state.history) {
      const rec = entry.isOpen ? openByUrl[entry.url] || null : null;
      items.push({
        kind: 'history',
        rec,
        title: (rec && rec.title) || entry.title || '',
        url: entry.url,
        domain: entry.domain || Logic.domainOf(entry.url),
        firstSeenAt: entry.firstSeenAt,
        lastSeenOpenAt: entry.isOpen ? now : entry.lastSeenOpenAt,
        isOpen: Boolean(entry.isOpen),
      });
    }
    const inHistory = new Set(state.history.map((entry) => entry.url));
    for (const rec of Object.values(openByUrl)) {
      if (inHistory.has(rec.url)) continue;
      items.push({
        kind: 'new',
        rec,
        title: rec.title || '',
        url: rec.url,
        domain: Logic.domainOf(rec.url),
        firstSeenAt: rec.firstSeenAt,
        lastSeenOpenAt: now,
        isOpen: true,
      });
    }
    return items;
  }

  function visibleItems(items, now) {
    const view = state.prefs.view;
    const shown = items.filter((item) => (view === 'all' || item.kind === view)
      && Logic.matchesQuery(item, state.prefs.query));
    const { key, dir } = currentSort();
    return Logic.sortEntries(shown, key, dir, now);
  }

  // A different filter, search or order starts again from the first page.
  function resetPaging() {
    state.shownLimit = PAGE_SIZE;
    els.list.parentElement.scrollTop = 0;
  }

  function applyQuery(text) {
    state.prefs.query = text;
    resetPaging();
    els.searchInput.value = text;
    savePrefs();
    render();
  }

  function makeInfoBlock(item) {
    const info = document.createElement('div');
    info.className = 'log-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'log-title';
    titleEl.textContent = item.title || item.url;
    info.appendChild(titleEl);

    // Domain stays whole and clickable (filters by it); the rest of the URL
    // is muted and middle-truncated, so pages on one site stay distinguishable.
    const { domain, rest } = Logic.splitUrlForDisplay(item.url);
    const urlEl = document.createElement('div');
    urlEl.className = 'log-url';
    urlEl.title = item.url;

    const domainEl = document.createElement('span');
    domainEl.className = 'log-domain';
    domainEl.textContent = domain || item.url;
    domainEl.title = t('rowFilterByDomain');
    domainEl.addEventListener('click', (event) => {
      event.stopPropagation();
      applyQuery(domain);
    });
    urlEl.appendChild(domainEl);

    if (rest) {
      const pathEl = document.createElement('span');
      pathEl.className = 'log-path';
      pathEl.textContent = rest;
      urlEl.appendChild(pathEl);
    }
    info.appendChild(urlEl);

    // Open and close time as dates: "04.10 09:12 → 05.10 18:40" for a closed
    // tab, "since 04.10 09:12" for an open one. Full dates in the tooltip.
    const timing = document.createElement('div');
    timing.className = 'log-timing';
    if (item.isOpen) {
      timing.textContent = t('rowSince', fmtDate(item.firstSeenAt));
      timing.title = t('rowOpenedAt', fmtDateFull(item.firstSeenAt));
    } else {
      timing.textContent = `${fmtDate(item.firstSeenAt)} → ${fmtDate(item.lastSeenOpenAt)}`;
      timing.title = `${t('rowOpenedAt', fmtDateFull(item.firstSeenAt))}\n${t('rowClosedAt', fmtDateFull(item.lastSeenOpenAt))}`;
    }
    info.appendChild(timing);
    return info;
  }

  // Duration only (no "open" word, to save width), coloured by status:
  // gold = in history, green = not yet.
  function makeStatus(item, now) {
    const status = document.createElement('span');
    status.className = `log-status status-${item.kind}`;
    status.textContent = fmt(Logic.entryDurationMs(item, now));
    status.title = t(item.kind === 'history' ? 'rowInHistory' : 'rowNotInHistory');
    return status;
  }

  function makeRowButton(icon, title, onClick) {
    const button = document.createElement('button');
    button.className = 'row-btn';
    button.innerHTML = icon;
    button.title = title;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  async function addToHistory(item) {
    const response = await sendMessage({ action: 'addEntry', url: item.url });
    await refresh();
    if (response && response.error) showStatus(response.error, true);
    else if (response && response.full) showStatus(t('statusHistoryFull', fmtNum(response.max)), true, 8000);
    else showStatus(t('statusAdded'));
  }

  async function removeFromHistory(item) {
    const response = await sendMessage({ action: 'deleteEntries', urls: [item.url] });
    await refresh();
    if (response && response.removed && response.removed.length) showUndo(response.removed);
  }

  async function focusOrOpen(item) {
    const rec = item.rec;
    if (rec && rec.tabId != null) {
      try {
        await brw.tabs.update(rec.tabId, { active: true });
        if (rec.windowId != null) {
          await brw.windows.update(rec.windowId, { focused: true });
        }
        return;
      } catch (e) { /* stale tab id — fall through to opening a new tab */ }
    }
    await brw.tabs.create({ url: item.url });
  }

  function renderRow(item, now) {
    const row = document.createElement('div');
    row.className = 'log-row';
    row.title = t(item.isOpen ? 'rowGoToTab' : 'rowReopen');
    row.appendChild(makeInfoBlock(item));
    row.appendChild(makeStatus(item, now));
    row.appendChild(item.kind === 'history'
      ? makeRowButton(ICON_TRASH, t('actionRemove'), () => removeFromHistory(item))
      : makeRowButton(ICON_PLUS, t('actionAdd'), () => addToHistory(item)));
    row.addEventListener('click', () => focusOrOpen(item));
    return row;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Draws the first state.shownLimit rows of the (already filtered and
  // sorted) list in one DOM update, and offers the rest a page at a time.
  function renderList(shown, now) {
    const fragment = document.createDocumentFragment();
    shown.slice(0, state.shownLimit).forEach((item) => fragment.appendChild(renderRow(item, now)));
    els.list.replaceChildren(fragment);
    const remaining = shown.length - state.shownLimit;
    els.showMoreBtn.hidden = remaining <= 0;
    if (remaining > 0) els.showMoreBtn.textContent = t('showMore', fmtNum(remaining));
  }

  function showMore() {
    if (els.showMoreBtn.hidden) return;
    state.shownLimit += PAGE_SIZE;
    render();
  }

  function render() {
    const now = Date.now();
    const view = state.prefs.view;
    const items = buildItems(now);
    const historyCount = items.filter((item) => item.kind === 'history').length;

    els.countAll.textContent = fmtNum(items.length);
    els.countNew.textContent = fmtNum(items.length - historyCount);
    els.countHistory.textContent = fmtNum(historyCount);
    els.viewAllBtn.classList.toggle('active', view === 'all');
    els.viewNewBtn.classList.toggle('active', view === 'new');
    els.viewHistoryBtn.classList.toggle('active', view === 'history');
    populateSortOptions();
    const sort = currentSort();
    els.sortSelect.value = sort.key;
    els.sortAscBtn.classList.toggle('active', sort.dir === 'asc');
    els.sortDescBtn.classList.toggle('active', sort.dir === 'desc');
    els.searchClear.hidden = !state.prefs.query;
    els.deleteAllBtn.disabled = historyCount === 0;

    const shown = visibleItems(items, now);
    renderList(shown, now);

    let welcome = '';
    if (!shown.length) {
      if (state.prefs.query.trim()) welcome = t('noMatches');
      else if (view === 'new') welcome = t('welcomeNew');
      else welcome = t('welcomeHistory', state.settings.minDays);
    }
    els.welcomeText.textContent = welcome;
    els.welcomeText.hidden = !welcome;
    renderCapacity(historyCount);
  }

  // "History: 214 / 100,000 · 43 KB" at the very bottom; red from
  // HISTORY_WARN_RATIO of the maximum, with what to do about it. At the
  // maximum new tabs are simply not added, so the line says so.
  function renderCapacity(count) {
    const max = state.settings.maxHistory || DEFAULT_SETTINGS.maxHistory;
    els.capacityText.textContent = t('capacityLine', fmtNum(count), fmtNum(max), fmtBytes(state.historyBytes || 0));
    const warn = count >= max * HISTORY_WARN_RATIO;
    els.capacityLine.classList.toggle('capacity-warn', warn);
    els.capacityHint.textContent = !warn ? ''
      : t(count >= max ? 'capacityFull' : 'capacityNearFull', t('settingsMinDays'));
  }

  async function refresh() {
    await fetchState();
    render();
  }

  // ---------------------------------------------------------------------------
  // Static labels (everything not rebuilt on each render)
  // ---------------------------------------------------------------------------

  function populateLanguageSelect() {
    els.uiLangSelect.innerHTML = '';
    Object.keys(UI_STRINGS).forEach((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${UI_FLAGS[code] || ''} ${code.toUpperCase()}`.trim();
      els.uiLangSelect.appendChild(option);
    });
    els.uiLangSelect.value = state.settings.uiLang || 'en';
  }

  // The sort options depend on the view. Rebuilt only when the view or the
  // language changes, not on every render, so the minute tick never closes
  // an open dropdown.
  let sortOptionsFor = null;
  function populateSortOptions() {
    const view = state.prefs.view;
    if (sortOptionsFor === view) return;
    sortOptionsFor = view;
    els.sortSelect.innerHTML = '';
    for (const key of VIEW_SORT_KEYS[view]) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = t(SORT_LABEL_KEYS[key]);
      els.sortSelect.appendChild(option);
    }
  }

  function applyStaticLabels() {
    document.title = t('appTitle');
    // Firefox shows a fixed title in the sidebar's own header; Chrome's side
    // panel and the popup have no such API, so this is a no-op there.
    if (brw.sidebarAction && brw.sidebarAction.setTitle) {
      brw.sidebarAction.setTitle({ title: t('appTitle') });
    }
    els.uiLangSelect.title = t('uiLangLabel');
    els.searchInput.placeholder = t('searchPlaceholder');
    els.searchClear.title = t('searchClearLabel');
    els.settingsBtn.title = t('settingsLabel');
    els.themeToggle.title = t('themeToggleLabel');

    els.viewAllLabel.textContent = t('viewAll');
    els.viewNewLabel.textContent = t('viewNew');
    els.viewHistoryLabel.textContent = t('viewHistory');
    els.viewAllBtn.title = t('viewAllTitle');
    els.viewNewBtn.title = t('viewNewTitle');
    els.viewHistoryBtn.title = t('viewHistoryTitle', state.settings.minDays);
    els.sortSelect.title = t('sortLabel');
    els.sortAscBtn.title = t('sortAsc');
    els.sortDescBtn.title = t('sortDesc');
    sortOptionsFor = null;   // relabel the sort options in the new language

    els.minDaysLabel.textContent = t('settingsMinDays');
    els.maxHistoryLabel.textContent = t('settingsMaxHistory');
    els.excludePrivateLabel.textContent = t('settingsExcludePrivate');
    els.excludePinnedLabel.textContent = t('settingsExcludePinned');
    els.excludeListLabel.textContent = t('settingsExcludeList');
    els.excludeList.placeholder = t('settingsExcludeListPlaceholder');
    els.backupLabel.textContent = t('settingsBackup');
    els.exportBtn.textContent = t('exportBtn');
    els.importBtn.textContent = t('importBtn');
    els.deleteAllBtn.textContent = t('deleteAllBtn');
    els.deleteConfirmBtn.textContent = t('deleteAllConfirm');
    els.deleteCancelBtn.textContent = t('importCancel');
    els.noticeLabel.textContent = t('noticeLabel');
    els.noticeText.textContent = t('noticeText');
    els.importAppendBtn.textContent = t('importAppend');
    els.importReplaceBtn.textContent = t('importReplace');
    els.importCancelBtn.textContent = t('importCancel');
  }

  // ---------------------------------------------------------------------------
  // Settings panel
  // ---------------------------------------------------------------------------

  function populateSettingsForm() {
    els.minDays.value = state.settings.minDays;
    els.maxHistory.value = state.settings.maxHistory;
    els.excludePrivate.checked = state.settings.excludePrivate;
    els.excludePinned.checked = state.settings.excludePinned;
    els.excludeList.value = (state.settings.excludeList || []).join('\n');
  }

  async function saveSettingsFromForm() {
    const settings = {
      minDays: Math.max(0, Math.min(365, parseInt(els.minDays.value, 10) || 0)),
      maxHistory: Math.max(MAX_HISTORY_RANGE.min, Math.min(MAX_HISTORY_RANGE.max,
        parseInt(els.maxHistory.value, 10) || DEFAULT_SETTINGS.maxHistory)),
      excludePrivate: els.excludePrivate.checked,
      excludePinned: els.excludePinned.checked,
      excludeList: Logic.parseExcludeList(els.excludeList.value),
    };
    const response = await sendMessage({ action: 'saveSettings', settings });
    if (response && response.settings) {
      state.settings = response.settings;
    }
    populateSettingsForm();
    applyStaticLabels();   // the History tooltip names the day threshold
    refresh();
  }

  // ---------------------------------------------------------------------------
  // Export / import (NDJSON — the full history, as a backup)
  // ---------------------------------------------------------------------------

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function exportHistory() {
    const historyMap = {};
    state.history.forEach((entry) => { historyMap[entry.url] = entry; });
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(Logic.toNDJSON(historyMap, Date.now()), `tab-history-${date}.ndjson`, 'application/x-ndjson');
    showStatus(t('statusExported', state.history.length));
  }

  async function handleImportFile(file) {
    try {
      const entries = Logic.parseImport(await file.text());
      if (!entries.length) {
        showStatus(t('statusNoEntries'), true);
        return;
      }
      state.pendingImport = { fileName: file.name, entries };
      els.importPrompt.textContent = t('importPrompt', file.name, entries.length);
      els.importModal.hidden = false;
    } catch (error) {
      showStatus(t('statusCannotParse', error.message), true);
    }
  }

  async function runImport(mode) {
    const pending = state.pendingImport;
    els.importModal.hidden = true;
    state.pendingImport = null;
    if (!pending) return;
    const response = await sendMessage({ action: 'importHistory', entries: pending.entries, mode });
    if (response && response.error) {
      showStatus(response.error, true);
    } else if (response && response.tooLarge) {
      showStatus(t('statusImportTooLarge', fmtNum(response.total), fmtNum(response.max)), true, 10000);
    } else {
      showStatus(t('statusImported', t(mode === 'replace' ? 'importReplace' : 'importAppend'), response.total));
    }
    refresh();
  }

  // ---------------------------------------------------------------------------
  // Event wiring
  // ---------------------------------------------------------------------------

  function wireEvents() {
    els.searchInput.addEventListener('input', () => {
      state.prefs.query = els.searchInput.value;
      resetPaging();
      savePrefs();
      render();
    });

    els.searchClear.addEventListener('click', () => {
      applyQuery('');
      els.searchInput.focus();
    });

    // Escape clears the search from anywhere in the field.
    els.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.prefs.query) {
        event.preventDefault();
        applyQuery('');
      }
    });

    els.uiLangSelect.addEventListener('change', async () => {
      state.settings.uiLang = els.uiLangSelect.value;
      await sendMessage({ action: 'saveSettings', settings: { uiLang: state.settings.uiLang } });
      applyStaticLabels();
      render();   // durations and row text carry translated units too
    });

    [els.viewAllBtn, els.viewNewBtn, els.viewHistoryBtn].forEach((button) => {
      button.addEventListener('click', () => {
        state.prefs.view = button.dataset.view;
        resetPaging();
        savePrefs();
        render();
      });
    });

    els.sortSelect.addEventListener('change', () => {
      currentSort().key = els.sortSelect.value;
      resetPaging();
      savePrefs();
      render();
    });

    [els.sortAscBtn, els.sortDescBtn].forEach((button) => {
      button.addEventListener('click', () => {
        currentSort().dir = button.dataset.dir;
        resetPaging();
        savePrefs();
        render();
      });
    });

    els.settingsBtn.addEventListener('click', () => {
      const willShow = els.settingsPanel.hidden;
      els.settingsPanel.hidden = !willShow;
      if (willShow) populateSettingsForm();
    });

    [els.minDays, els.maxHistory, els.excludePrivate, els.excludePinned, els.excludeList]
      .forEach((input) => input.addEventListener('change', saveSettingsFromForm));

    els.exportBtn.addEventListener('click', exportHistory);
    els.importBtn.addEventListener('click', () => {
      els.importFile.value = '';
      els.importFile.click();
    });
    els.importFile.addEventListener('change', () => {
      if (els.importFile.files && els.importFile.files[0]) {
        handleImportFile(els.importFile.files[0]);
      }
    });
    els.importAppendBtn.addEventListener('click', () => runImport('append'));
    els.importReplaceBtn.addEventListener('click', () => runImport('replace'));
    els.importCancelBtn.addEventListener('click', () => {
      els.importModal.hidden = true;
      state.pendingImport = null;
    });

    // "Delete all my history" cannot be undone, so it always asks first.
    els.deleteAllBtn.addEventListener('click', () => {
      els.deletePrompt.textContent = t('deleteAllPrompt', state.history.length);
      els.deleteModal.hidden = false;
      els.deleteCancelBtn.focus();
    });
    els.deleteCancelBtn.addEventListener('click', () => { els.deleteModal.hidden = true; });
    els.deleteConfirmBtn.addEventListener('click', async () => {
      els.deleteModal.hidden = true;
      const response = await sendMessage({ action: 'clearHistory' });
      await refresh();
      if (response && response.error) showStatus(response.error, true);
      else showStatus(t('statusDeletedAll', (response && response.removed) || 0));
    });

    // Next page: by click, or automatically when the list is scrolled to
    // within 300px of its end (so rows are ready before you get there). The
    // check is a few numbers, and a new page pushes the end ~12,000px away,
    // so it cannot fire repeatedly.
    els.showMoreBtn.addEventListener('click', showMore);
    const scroller = els.list.parentElement;
    scroller.addEventListener('scroll', () => {
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 300) showMore();
    }, { passive: true });

    // Live updates pushed by the background script.
    brw.runtime.onMessage.addListener((message) => {
      if (message && message.type === 'state-changed') refresh();
    });

    // Keep the durations and "closed … ago" texts ticking.
    setInterval(render, 60 * 1000);
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  async function init() {
    await loadPrefs();
    els.searchInput.value = state.prefs.query;
    wireEvents();
    await fetchSettings();
    // First run has no stored language: follow the browser's own UI language.
    if (!state.settings.uiLang) {
      const detected = detectBrowserLanguage();
      state.settings.uiLang = UI_STRINGS[detected] ? detected : 'en';
    }
    populateLanguageSelect();
    applyStaticLabels();
    populateSettingsForm();
    await refresh();
  }

  init().catch((error) => {
    showStatus(t('statusInitFailed', error.message), true);
  });
})();
