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
  const VIEWS = ['open', 'closed'];
  // Sort keys offered per view (an open tab has no close time yet), and the
  // starting order of each view.
  const VIEW_SORT_KEYS = { open: ['name', 'opened', 'duration'], closed: ['name', 'opened', 'duration', 'closed'] };
  const DEFAULT_SORT = { open: { key: 'duration', dir: 'desc' }, closed: { key: 'closed', dir: 'desc' } };
  const SORT_LABEL_KEYS = { name: 'sortName', opened: 'sortOpened', duration: 'sortDuration', closed: 'sortClosed' };

  // Bound to the active language so call sites stay short.
  function t(key, ...args) {
    return translate(state.settings.uiLang || 'en', key, ...args);
  }

  function fmt(ms) {
    return Logic.formatDuration(ms, durationUnits(state.settings.uiLang || 'en'));
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
      view: 'closed',     // open | closed
      sort: { open: { ...DEFAULT_SORT.open }, closed: { ...DEFAULT_SORT.closed } },
    },
    pendingImport: null,  // { fileName, entries }
  };

  const els = {};
  ['searchInput', 'searchClear', 'settingsBtn', 'themeToggle', 'uiLangSelect',
   'viewClosedBtn', 'viewOpenBtn', 'viewClosedLabel', 'viewOpenLabel', 'countClosed', 'countOpen',
   'sortSelect', 'sortAscBtn', 'sortDescBtn', 'settingsPanel', 'minDays', 'minDaysLabel', 'excludePrivate', 'excludePrivateLabel',
   'excludePinned', 'excludePinnedLabel', 'excludeList', 'excludeListLabel', 'backupLabel',
   'exportBtn', 'importBtn', 'importFile', 'importModal', 'importPrompt',
   'importAppendBtn', 'importReplaceBtn', 'importCancelBtn',
   'list', 'welcomeText', 'statusLine',
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
    state.prefs = {
      query: typeof saved.query === 'string' ? saved.query : '',
      view: VIEWS.includes(saved.view) ? saved.view : 'closed',
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

  function closedEntries(now) {
    const entries = state.history.filter((entry) => !entry.isOpen && Logic.matchesQuery(entry, state.prefs.query));
    const { key, dir } = state.prefs.sort.closed;
    return Logic.sortEntries(entries, key, dir, now);
  }

  // One row per open URL (the oldest tab defines its age). A URL already in
  // history uses the history start, which includes a continued count after a
  // short close-and-reopen. Items are shaped like open history entries so
  // the same sort applies.
  function openItems(now) {
    const historyByUrl = new Map(state.history.map((entry) => [entry.url, entry]));
    const items = [];
    for (const rec of Object.values(Logic.oldestRecordByUrl(state.openTabs))) {
      const entry = historyByUrl.get(rec.url);
      const item = {
        rec,
        title: rec.title || (entry && entry.title) || '',
        url: rec.url,
        domain: Logic.domainOf(rec.url),
        favIconUrl: rec.favIconUrl || (entry && entry.favIconUrl) || '',
        firstSeenAt: entry ? entry.firstSeenAt : rec.firstSeenAt,
        lastSeenOpenAt: now,
        isOpen: true,
      };
      item.ageMs = Logic.entryDurationMs(item, now);
      if (Logic.matchesQuery(item, state.prefs.query)) items.push(item);
    }
    const { key, dir } = state.prefs.sort.open;
    return Logic.sortEntries(items, key, dir, now);
  }

  function uniqueOpenCount() {
    return Object.keys(Logic.oldestRecordByUrl(state.openTabs)).length;
  }

  // A src-less <img> draws a broken-image frame, so rows without a favicon get
  // an empty spacer of the same size instead — keeping titles aligned.
  function makeFaviconPlaceholder() {
    const span = document.createElement('span');
    span.className = 'log-fav log-fav-empty';
    return span;
  }

  function makeFavicon(favIconUrl) {
    if (!favIconUrl || !(favIconUrl.startsWith('http') || favIconUrl.startsWith('data:'))) {
      return makeFaviconPlaceholder();
    }
    const img = document.createElement('img');
    img.className = 'log-fav';
    img.src = favIconUrl;
    img.addEventListener('error', () => img.replaceWith(makeFaviconPlaceholder()));
    return img;
  }

  function applyQuery(text) {
    state.prefs.query = text;
    els.searchInput.value = text;
    savePrefs();
    render();
  }

  function makeInfoBlock(title, url, timingText, timingTitle) {
    const info = document.createElement('div');
    info.className = 'log-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'log-title';
    titleEl.textContent = title || url;
    info.appendChild(titleEl);

    // Domain stays whole and clickable (filters by it); the rest of the URL
    // is muted and middle-truncated, so pages on one site stay distinguishable.
    const { domain, rest } = Logic.splitUrlForDisplay(url);
    const urlEl = document.createElement('div');
    urlEl.className = 'log-url';
    urlEl.title = url;

    const domainEl = document.createElement('span');
    domainEl.className = 'log-domain';
    domainEl.textContent = domain || url;
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

    if (timingText) {
      const timing = document.createElement('div');
      timing.className = 'log-timing';
      timing.textContent = timingText;
      if (timingTitle) timing.title = timingTitle;
      info.appendChild(timing);
    }
    return info;
  }

  function makeStatus(text, young) {
    const status = document.createElement('span');
    status.className = 'log-status' + (young ? ' status-young' : '');
    status.textContent = text;
    return status;
  }

  async function focusOrOpen(rec) {
    if (rec.tabId != null) {
      try {
        await brw.tabs.update(rec.tabId, { active: true });
        if (rec.windowId != null) {
          await brw.windows.update(rec.windowId, { focused: true });
        }
        return;
      } catch (e) { /* stale tab id — fall through to opening a new tab */ }
    }
    await brw.tabs.create({ url: rec.url });
  }

  function renderClosedRow(entry, now) {
    const row = document.createElement('div');
    row.className = 'log-row';
    row.title = t('rowReopen');

    const lang = state.settings.uiLang || undefined;
    const closedAt = new Date(entry.lastSeenOpenAt);
    row.appendChild(makeFavicon(entry.favIconUrl));
    row.appendChild(makeInfoBlock(
      entry.title, entry.url,
      t('rowClosedAgo', fmt(Math.max(0, now - entry.lastSeenOpenAt))),
      closedAt.toLocaleString(lang)));
    row.appendChild(makeStatus(t('rowOpenFor', fmt(Logic.entryDurationMs(entry, now))), false));

    const remove = document.createElement('button');
    remove.className = 'row-btn';
    remove.textContent = '×';
    remove.title = t('actionRemove');
    remove.addEventListener('click', async (event) => {
      event.stopPropagation();
      const response = await sendMessage({ action: 'deleteEntries', urls: [entry.url] });
      await refresh();
      if (response && response.removed && response.removed.length) showUndo(response.removed);
    });
    row.appendChild(remove);

    row.addEventListener('click', () => brw.tabs.create({ url: entry.url }));
    return row;
  }

  function renderOpenRow(item) {
    const row = document.createElement('div');
    row.className = 'log-row';
    row.title = t('rowGoToTab');

    const young = item.ageMs < (state.settings.minDays || 0) * Logic.DAY_MS;
    row.appendChild(makeFavicon(item.favIconUrl));
    row.appendChild(makeInfoBlock(item.title, item.url, '', ''));
    row.appendChild(makeStatus(t('rowOpenFor', fmt(item.ageMs)), young));
    row.addEventListener('click', () => focusOrOpen(item.rec));
    return row;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  function render() {
    const now = Date.now();
    const view = state.prefs.view;

    els.countClosed.textContent = state.history.filter((entry) => !entry.isOpen).length;
    els.countOpen.textContent = uniqueOpenCount();
    els.viewClosedBtn.classList.toggle('active', view === 'closed');
    els.viewOpenBtn.classList.toggle('active', view === 'open');
    populateSortOptions();
    const sort = currentSort();
    els.sortSelect.value = sort.key;
    els.sortAscBtn.classList.toggle('active', sort.dir === 'asc');
    els.sortDescBtn.classList.toggle('active', sort.dir === 'desc');
    els.searchClear.hidden = !state.prefs.query;

    els.list.innerHTML = '';
    let shown = 0;
    if (view === 'closed') {
      for (const entry of closedEntries(now)) {
        els.list.appendChild(renderClosedRow(entry, now));
        shown++;
      }
    } else {
      for (const item of openItems(now)) {
        els.list.appendChild(renderOpenRow(item));
        shown++;
      }
    }

    let welcome = '';
    if (!shown) {
      if (state.prefs.query.trim()) welcome = t('noMatches');
      else welcome = view === 'closed' ? t('welcomeClosed', state.settings.minDays) : t('welcomeOpen');
    }
    els.welcomeText.textContent = welcome;
    els.welcomeText.hidden = !welcome;
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

    els.viewClosedLabel.textContent = t('viewClosed');
    els.viewOpenLabel.textContent = t('viewOpen');
    els.viewClosedBtn.title = t('viewClosedTitle');
    els.viewOpenBtn.title = t('viewOpenTitle');
    els.sortSelect.title = t('sortLabel');
    els.sortAscBtn.title = t('sortAsc');
    els.sortDescBtn.title = t('sortDesc');
    sortOptionsFor = null;   // relabel the sort options in the new language

    els.minDaysLabel.textContent = t('settingsMinDays');
    els.excludePrivateLabel.textContent = t('settingsExcludePrivate');
    els.excludePinnedLabel.textContent = t('settingsExcludePinned');
    els.excludeListLabel.textContent = t('settingsExcludeList');
    els.excludeList.placeholder = t('settingsExcludeListPlaceholder');
    els.backupLabel.textContent = t('settingsBackup');
    els.exportBtn.textContent = t('exportBtn');
    els.importBtn.textContent = t('importBtn');
    els.importAppendBtn.textContent = t('importAppend');
    els.importReplaceBtn.textContent = t('importReplace');
    els.importCancelBtn.textContent = t('importCancel');
  }

  // ---------------------------------------------------------------------------
  // Settings panel
  // ---------------------------------------------------------------------------

  function populateSettingsForm() {
    els.minDays.value = state.settings.minDays;
    els.excludePrivate.checked = state.settings.excludePrivate;
    els.excludePinned.checked = state.settings.excludePinned;
    els.excludeList.value = (state.settings.excludeList || []).join('\n');
  }

  async function saveSettingsFromForm() {
    const settings = {
      minDays: Math.max(0, Math.min(365, parseInt(els.minDays.value, 10) || 0)),
      excludePrivate: els.excludePrivate.checked,
      excludePinned: els.excludePinned.checked,
      excludeList: Logic.parseExcludeList(els.excludeList.value),
    };
    const response = await sendMessage({ action: 'saveSettings', settings });
    if (response && response.settings) {
      state.settings = response.settings;
    }
    populateSettingsForm();
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

    [els.viewClosedBtn, els.viewOpenBtn].forEach((button) => {
      button.addEventListener('click', () => {
        state.prefs.view = button.dataset.view;
        savePrefs();
        render();
      });
    });

    els.sortSelect.addEventListener('change', () => {
      currentSort().key = els.sortSelect.value;
      savePrefs();
      render();
    });

    [els.sortAscBtn, els.sortDescBtn].forEach((button) => {
      button.addEventListener('click', () => {
        currentSort().dir = button.dataset.dir;
        savePrefs();
        render();
      });
    });

    els.settingsBtn.addEventListener('click', () => {
      const willShow = els.settingsPanel.hidden;
      els.settingsPanel.hidden = !willShow;
      if (willShow) populateSettingsForm();
    });

    [els.minDays, els.excludePrivate, els.excludePinned, els.excludeList]
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
