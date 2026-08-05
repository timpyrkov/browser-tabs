// sidebar.js
// UI logic for the Tab History sidebar. An ES module for the i18n imports;
// DEFAULT_SETTINGS and TabsLogic still arrive as globals from the classic
// scripts the page loads first.
import { t as translate, detectBrowserLanguage, durationUnits, UI_STRINGS, UI_FLAGS } from './i18n.js';

(function () {
  const brw = typeof browser !== 'undefined' ? browser : chrome;
  const Logic = window.TabsLogic;

  // Bound to the active language so call sites stay short.
  function t(key, ...args) {
    return translate(state.settings.uiLang || 'en', key, ...args);
  }

  function units() {
    return durationUnits(state.settings.uiLang || 'en');
  }

  function fmt(ms) {
    return Logic.formatDuration(ms, units());
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const state = {
    history: [],       // HistoryEntry[]
    openTabs: [],      // tracker records incl. tabId
    lastScanAt: 0,
    nextScanAt: 0,
    settings: { ...DEFAULT_SETTINGS },
    prefs: {
      query: '',
      sortKey: 'duration',
      sortDir: 'desc',
      show: 'all', // all | open | closed
      collapsedHistory: false,
      collapsedOpen: false,
    },
    labelColors: {},
    labelNames: {},
    syncError: null,
    canUndo: false,
    pendingImport: null, // { fileName, entries }
    confirmDelete: false,
    editingLabelsFor: null, // url whose label editor is open
    renamingFor: null,      // url whose rename editor is open
  };

  const els = {};
  ['searchInput', 'searchClear', 'labelSuggestions',
   'settingsBtn', 'themeToggle', 'sortSelect', 'sortDirBtn', 'deleteMatchingBtn',
   'settingsPanel', 'minDays', 'scanTime', 'excludePrivate', 'excludePinned', 'maxTitleLength',
   'ignoreUrlFragment', 'excludeList', 'gapToleranceDays', 'syncEnabled', 'syncEnabledLabel', 'syncNote',
   'countHistory', 'countOpen', 'scanInfo', 'filterChips', 'historyHeader', 'historyList',
   'historyCount', 'openHeader', 'openList', 'openCount', 'welcomeText', 'statusLine',
   'scanNowBtn', 'exportBtn', 'importBtn', 'exportMenu', 'exportNdjsonBtn', 'exportCsvBtn',
   'importFile', 'importModal', 'importPrompt',
   'importAppendBtn', 'importReplaceBtn', 'importCancelBtn',
   'uiLangSelect', 'sortLabel', 'summaryHistoryLabel', 'summaryOpenLabel',
   'filterAllBtn', 'filterOpenBtn', 'filterClosedBtn',
   'historyHeaderLabel', 'openHeaderLabel',
   'minDaysLabel', 'scanTimeLabel', 'gapToleranceLabel', 'excludePrivateLabel',
   'excludePinnedLabel', 'ignoreUrlFragmentLabel', 'excludeListLabel', 'maxTitleLengthLabel',
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

  // Deletion is the one destructive action here, so it always comes with a way
  // back rather than a confirmation prompt people learn to click through.
  function showUndoableStatus(text) {
    showStatus(text, false, 12000); // longer window: undo must be reachable
    const undo = document.createElement('button');
    undo.className = 'undo-link';
    undo.textContent = t('statusUndo');
    undo.addEventListener('click', async () => {
      const response = await sendMessage({ action: 'undoDelete' });
      await refresh();
      showStatus(response && response.restored ? t('statusRestored', response.restored) : t('statusNothingToRestore'));
    });
    els.statusLine.appendChild(undo);
  }

  // ---------------------------------------------------------------------------
  // Prefs persistence (sidebar-owned UI state)
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
    if (stored.sidebarPrefs) {
      state.prefs = { ...state.prefs, ...stored.sidebarPrefs };
    }
    // A pref saved under a sort key that no longer exists would leave the
    // select blank; fall back to the default.
    if (!Logic.SORT_KEYS.includes(state.prefs.sortKey)) {
      state.prefs.sortKey = 'duration';
    }
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
    state.labelColors = response.labelColors || {};
    state.labelNames = response.labelNames || {};
    state.syncError = response.syncError || null;
    state.canUndo = Boolean(response.canUndo);
    state.lastScanAt = response.lastScanAt || 0;
    state.nextScanAt = response.nextScanAt || 0;
  }

  async function fetchSettings() {
    const response = await sendMessage({ action: 'getSettings' });
    if (response && response.settings) {
      state.settings = response.settings;
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function formatAgo(timestamp, now) {
    if (!timestamp) return t('timeNever');
    return t('timeAgo', fmt(Math.max(0, now - timestamp)));
  }

  function formatIn(timestamp, now) {
    if (!timestamp || timestamp <= now) return t('timeSoon');
    return t('timeIn', fmt(timestamp - now));
  }

  function visibleHistory(now) {
    let entries = state.history.filter((entry) => Logic.matchesQuery(entry, state.prefs.query));
    if (state.prefs.show === 'open') entries = entries.filter((entry) => entry.isOpen);
    if (state.prefs.show === 'closed') entries = entries.filter((entry) => !entry.isOpen);
    return Logic.sortEntries(entries, state.prefs.sortKey, state.prefs.sortDir, now);
  }

  function visibleOpenTabs(now) {
    const inHistory = new Set(state.history.map((entry) => entry.url));
    let records = state.openTabs.filter((rec) => !inHistory.has(rec.url));
    const query = state.prefs.query;
    if (query) {
      records = records.filter((rec) => Logic.matchesQuery(
        { title: rec.title, url: rec.url, domain: Logic.domainOf(rec.url), labels: [] }, query));
    }
    const sign = state.prefs.sortDir === 'asc' ? 1 : -1;
    records.sort((a, b) => sign * (Logic.tabAgeMs(a, now) - Logic.tabAgeMs(b, now)));
    return records;
  }

  // A crisp tag glyph — the 🏷 emoji renders inconsistently across platforms.
  const TAG_ICON_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">'
    + '<path d="M5.5,7A1.5,1.5 0 0,1 4,5.5A1.5,1.5 0 0,1 5.5,4A1.5,1.5 0 0,1 7,5.5A1.5,1.5 0 0,1 5.5,7M21.41,11.58L12.41,2.58C12.05,2.22 11.55,2 11,2H4C2.89,2 2,2.89 2,4V11C2,11.55 2.22,12.05 2.59,12.41L11.58,21.41C11.95,21.77 12.45,22 13,22C13.55,22 14.05,21.77 14.41,21.41L21.41,14.41C21.78,14.05 22,13.55 22,13C22,12.44 21.77,11.94 21.41,11.58Z" />'
    + '</svg>';

  function makeRowButton(symbol, title, extraClass, onClick) {
    const btn = document.createElement('button');
    btn.className = 'row-btn' + (extraClass ? ` ${extraClass}` : '');
    if (symbol === 'tag') {
      btn.innerHTML = TAG_ICON_SVG;
    } else {
      btn.textContent = symbol;
    }
    btn.title = title;
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return btn;
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
    img.addEventListener('error', () => {
      img.replaceWith(makeFaviconPlaceholder());
    });
    return img;
  }

  function applyQuery(text) {
    state.prefs.query = text;
    els.searchInput.value = text;
    state.confirmDelete = false;
    savePrefs();
    render();
  }

  // Colours are claimed per label by the background (least-used slot wins, then
  // persisted). The hash is only a fallback for a label not yet in the map.
  function labelColor(label) {
    const index = state.labelColors[label.toLowerCase()];
    if (Number.isInteger(index)) {
      return `var(--category-${index + 1})`;
    }
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
    }
    return `var(--category-${(hash % Logic.LABEL_COLOR_COUNT) + 1})`;
  }

  // Two-step, because it both edits settings and purges matching entries.
  let pendingExclude = null;
  async function excludeDomain(url) {
    const domain = Logic.domainOf(url);
    if (!domain) return;
    if (pendingExclude !== domain) {
      pendingExclude = domain;
      showStatus(t('statusExcludeConfirm', domain), false, 4000);
      setTimeout(() => { if (pendingExclude === domain) pendingExclude = null; }, 4000);
      return;
    }
    pendingExclude = null;
    const response = await sendMessage({ action: 'excludeDomain', pattern: domain });
    if (response && response.error) {
      showStatus(response.error, true);
      return;
    }
    await refresh();
    showUndoableStatus(response.removed
      ? t('statusExcludedRemoved', domain, response.removed)
      : t('statusExcluded', domain));
  }

  async function setLabels(url, labels) {
    const response = await sendMessage({ action: 'setLabels', url, labels });
    if (response && response.error) {
      showStatus(response.error, true);
      return;
    }
    await refresh();
  }

  function makeLabelChips(url, labels, editable) {
    const wrap = document.createElement('div');
    wrap.className = 'label-chips';
    for (const label of labels) {
      const chip = document.createElement('span');
      chip.className = 'label-chip';
      chip.style.color = labelColor(label);

      const text = document.createElement('span');
      text.textContent = label;
      text.title = t('rowFilterByLabel', label);
      text.addEventListener('click', (event) => {
        event.stopPropagation();
        applyQuery(label);
      });
      chip.appendChild(text);

      if (editable) {
        const remove = document.createElement('span');
        remove.className = 'chip-x';
        remove.textContent = '×';
        remove.title = t('rowRemoveLabel', label);
        remove.addEventListener('click', (event) => {
          event.stopPropagation();
          setLabels(url, labels.filter((item) => item !== label));
        });
        chip.appendChild(remove);
      }
      wrap.appendChild(chip);
    }
    return wrap;
  }

  function makeLabelEditor(url, labels) {
    const editor = document.createElement('div');
    editor.className = 'label-editor';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = t('labelPlaceholder');
    input.setAttribute('list', 'labelSuggestions');
    input.addEventListener('click', (event) => event.stopPropagation());
    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        const value = input.value.trim();
        if (value) {
          state.editingLabelsFor = null;
          setLabels(url, [...labels, value]);
        }
      } else if (event.key === 'Escape') {
        state.editingLabelsFor = null;
        render();
      }
    });

    editor.appendChild(input);
    // Focus once the row is in the DOM.
    setTimeout(() => input.focus(), 0);
    return editor;
  }

  function makeRenameEditor(url, currentTitle) {
    const editor = document.createElement('div');
    editor.className = 'rename-editor';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.placeholder = t('renamePlaceholder');
    input.addEventListener('click', (event) => event.stopPropagation());
    input.addEventListener('keydown', async (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        state.renamingFor = null;
        const response = await sendMessage({ action: 'renameEntry', url, title: input.value });
        if (response && response.error) showStatus(response.error, true);
        await refresh();
      } else if (event.key === 'Escape') {
        state.renamingFor = null;
        render();
      }
    });

    editor.appendChild(input);
    setTimeout(() => { input.focus(); input.select(); }, 0);
    return editor;
  }

  function makeInfoBlock(title, url, timingText, labels, showEditor, options) {
    const opts = options || {};
    const info = document.createElement('div');
    info.className = 'log-info';

    if (opts.renaming) {
      info.appendChild(makeRenameEditor(url, title || ''));
    } else {
      const titleEl = document.createElement('div');
      titleEl.className = 'log-title' + (opts.titleCustom ? ' title-custom' : '');
      titleEl.textContent = title || url;
      if (opts.titleCustom) titleEl.title = t('rowRenamedTitle');
      info.appendChild(titleEl);
    }

    // Domain stays whole and clickable; the rest of the URL is shown muted and
    // middle-truncated, so pages on one site remain distinguishable.
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
      info.appendChild(timing);
    }

    if (labels && labels.length) {
      info.appendChild(makeLabelChips(url, labels, true));
    }
    if (showEditor) {
      info.appendChild(makeLabelEditor(url, labels || []));
    }
    return info;
  }

  async function focusOrOpen(url) {
    const rec = state.openTabs.find((r) => r.url === url);
    if (rec && rec.tabId != null) {
      try {
        await brw.tabs.update(rec.tabId, { active: true });
        if (rec.windowId != null) {
          await brw.windows.update(rec.windowId, { focused: true });
        }
        return;
      } catch (e) { /* stale tab id — fall through to opening a new tab */ }
    }
    await brw.tabs.create({ url });
  }

  function renderHistoryRow(entry, now) {
    const row = document.createElement('div');
    row.className = 'log-row';
    row.title = entry.url;

    const durationMs = Logic.entryDurationMs(entry, now);
    // The span counts breaks in which the tab was closed, so name them.
    const gapNote = entry.gapMs > 0 ? t('rowClosedInBetween', fmt(entry.gapMs)) : '';
    const timing = (entry.isOpen
      ? t('rowFirstSeen', formatAgo(entry.firstSeenAt, now))
      : t('rowWasOpen', fmt(durationMs), formatAgo(entry.lastSeenOpenAt, now))) + gapNote;

    row.appendChild(makeFavicon(entry.favIconUrl));
    row.appendChild(makeInfoBlock(
      entry.title, entry.url, timing, entry.labels || [],
      state.editingLabelsFor === entry.url,
      { renaming: state.renamingFor === entry.url, titleCustom: entry.titleCustom }));

    const status = document.createElement('span');
    status.className = `log-status ${entry.isOpen ? 'status-open' : 'status-closed'}`;
    status.textContent = entry.isOpen ? t('rowOpenFor', fmt(durationMs)) : fmt(durationMs);
    row.appendChild(status);

    row.appendChild(makeRowButton('✎', t('actionRename'), '', () => {
      state.renamingFor = state.renamingFor === entry.url ? null : entry.url;
      state.editingLabelsFor = null;
      render();
    }));
    row.appendChild(makeRowButton('tag', t('actionAddLabel'), '', () => {
      state.editingLabelsFor = state.editingLabelsFor === entry.url ? null : entry.url;
      state.renamingFor = null;
      render();
    }));
    row.appendChild(makeRowButton('↗', t('actionOpenInNewTab'), '', () => {
      brw.tabs.create({ url: entry.url });
    }));
    row.appendChild(makeRowButton('⊘', t('actionNeverTrack', Logic.domainOf(entry.url)), '',
      () => excludeDomain(entry.url)));
    row.appendChild(makeRowButton('×', t('actionRemove'), 'row-btn-delete', async () => {
      const response = await sendMessage({ action: 'deleteEntries', urls: [entry.url] });
      await refresh();
      if (response && response.removed) showUndoableStatus(t('statusRemovedOne'));
    }));

    row.addEventListener('click', () => {
      if (entry.isOpen) {
        focusOrOpen(entry.url);
      } else {
        brw.tabs.create({ url: entry.url });
      }
    });
    return row;
  }

  function renderOpenRow(rec, now) {
    const row = document.createElement('div');
    row.className = 'log-row';
    row.title = rec.url;

    const ageMs = Logic.tabAgeMs(rec, now);
    const minAgeMs = (state.settings.minDays || 0) * Logic.DAY_MS;
    const remaining = minAgeMs > ageMs
      ? t('rowUntilHistory', fmt(minAgeMs - ageMs))
      : t('rowQualifiesNextScan');

    row.appendChild(makeFavicon(rec.favIconUrl));
    row.appendChild(makeInfoBlock(
      rec.title, rec.url, remaining, [],
      state.editingLabelsFor === rec.url));

    const status = document.createElement('span');
    status.className = 'log-status status-young';
    status.textContent = t('rowOpenFor', fmt(ageMs));
    row.appendChild(status);

    // Both buttons promote into history immediately, so the row moves up into
    // the History section without waiting for the scheduled scan.
    row.appendChild(makeRowButton('+', t('actionAddNow'), '', async () => {
      const response = await sendMessage({ action: 'addEntry', url: rec.url });
      if (response && response.error) showStatus(response.error, true);
      else showStatus(t('statusAddedToHistory'));
      await refresh();
    }));
    row.appendChild(makeRowButton('tag', t('actionAddLabelPromotes'), '', () => {
      state.editingLabelsFor = state.editingLabelsFor === rec.url ? null : rec.url;
      state.renamingFor = null;
      render();
    }));
    row.appendChild(makeRowButton('⊘', t('actionNeverTrack', Logic.domainOf(rec.url)), '',
      () => excludeDomain(rec.url)));

    row.addEventListener('click', () => focusOrOpen(rec.url));
    return row;
  }

  function render() {
    const now = Date.now();
    const historyEntries = visibleHistory(now);
    const openRecords = visibleOpenTabs(now);

    // Summary
    els.countHistory.textContent = state.history.length;
    els.countOpen.textContent = state.openTabs.length;
    els.scanInfo.innerHTML = '';
    const scanSpan = document.createElement('span');
    scanSpan.textContent = state.lastScanAt
      ? t('summaryLastScan', formatAgo(state.lastScanAt, now), formatIn(state.nextScanAt, now))
      : t('summaryNextScan', formatIn(state.nextScanAt, now));
    els.scanInfo.appendChild(scanSpan);

    // Chips
    els.filterChips.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.show === state.prefs.show);
    });

    // Sort controls
    els.sortSelect.value = state.prefs.sortKey;
    els.sortDirBtn.innerHTML = state.prefs.sortDir === 'asc' ? '&#8593;' : '&#8595;';
    els.searchClear.hidden = !state.prefs.query;

    // Autocomplete suggestions: labels used in local history first (most-used
    // first), then any known only from another synced device — so a fresh
    // install still offers your usual vocabulary.
    const known = Logic.collectLabels(state.history);
    const seen = new Set(known.map((label) => label.toLowerCase()));
    const fromSync = Object.entries(state.labelNames || {})
      .filter(([key]) => !seen.has(key))
      .map(([, name]) => name)
      .sort((a, b) => a.localeCompare(b));
    els.labelSuggestions.innerHTML = '';
    for (const label of known.concat(fromSync)) {
      const option = document.createElement('option');
      option.value = label;
      els.labelSuggestions.appendChild(option);
    }

    // Sections
    els.historyCount.textContent = `(${historyEntries.length})`;
    els.openCount.textContent = `(${openRecords.length})`;
    els.historyHeader.classList.toggle('section-collapsed', state.prefs.collapsedHistory);
    els.openHeader.classList.toggle('section-collapsed', state.prefs.collapsedOpen);

    els.historyList.innerHTML = '';
    historyEntries.forEach((entry) => els.historyList.appendChild(renderHistoryRow(entry, now)));

    els.openList.innerHTML = '';
    openRecords.forEach((rec) => els.openList.appendChild(renderOpenRow(rec, now)));

    els.welcomeText.hidden = state.history.length > 0 || state.openTabs.length > 0;

    // Bulk delete button: only when a search narrows the history list.
    const showBulk = state.prefs.query.trim() !== '' && historyEntries.length > 0;
    els.deleteMatchingBtn.hidden = !showBulk;
    if (showBulk && !state.confirmDelete) {
      els.deleteMatchingBtn.textContent = t('deleteShownBtn', historyEntries.length);
    }
  }

  async function refresh() {
    await fetchState();
    render();
  }

  // ---------------------------------------------------------------------------
  // Static labels (everything not rebuilt on each render)
  // ---------------------------------------------------------------------------

  function populateLanguageSelect() {
    const lang = state.settings.uiLang || 'en';
    els.uiLangSelect.innerHTML = '';
    Object.keys(UI_STRINGS).forEach((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${UI_FLAGS[code] || ''} ${code.toUpperCase()}`.trim();
      els.uiLangSelect.appendChild(option);
    });
    els.uiLangSelect.value = lang;
  }

  function applyStaticLabels() {
    document.title = t('appTitle');
    els.uiLangSelect.title = t('uiLangLabel');
    els.searchInput.placeholder = t('searchPlaceholder');
    els.searchClear.title = t('searchClearLabel');
    els.settingsBtn.title = t('settingsLabel');
    els.themeToggle.title = t('themeToggleLabel');

    els.sortLabel.textContent = t('sortLabel');
    els.sortDirBtn.title = t('sortDirectionLabel');
    const sortKeys = { duration: 'sortDuration', domain: 'sortUrl', title: 'sortName', label: 'sortTag' };
    Array.from(els.sortSelect.options).forEach((option) => {
      option.textContent = t(sortKeys[option.value] || option.value);
    });

    els.summaryHistoryLabel.textContent = t('summaryHistory');
    els.summaryOpenLabel.textContent = t('summaryOpenNow');
    els.filterAllBtn.textContent = t('filterAll');
    els.filterOpenBtn.textContent = t('filterOpen');
    els.filterClosedBtn.textContent = t('filterClosed');
    els.historyHeaderLabel.textContent = t('sectionHistory');
    els.openHeaderLabel.textContent = t('sectionOpenTabs');
    els.welcomeText.textContent = t('welcomeText');

    els.minDaysLabel.textContent = t('settingsMinDays');
    els.scanTimeLabel.textContent = t('settingsScanTime');
    els.gapToleranceLabel.textContent = t('settingsGapTolerance');
    els.gapToleranceLabel.title = t('settingsGapToleranceTitle');
    els.excludePrivateLabel.textContent = t('settingsExcludePrivate');
    els.excludePinnedLabel.textContent = t('settingsExcludePinned');
    els.ignoreUrlFragmentLabel.textContent = t('settingsIgnoreFragment');
    els.ignoreUrlFragmentLabel.title = t('settingsIgnoreFragmentTitle');
    els.syncEnabledLabel.textContent = t('settingsSync');
    els.syncEnabledLabel.title = t('settingsSyncTitle');
    els.excludeListLabel.textContent = t('settingsExcludeList');
    els.excludeList.placeholder = t('settingsExcludeListPlaceholder');
    els.maxTitleLengthLabel.textContent = t('settingsMaxTitleLength');

    els.scanNowBtn.textContent = t('scanNowBtn');
    els.importBtn.textContent = t('importBtn');
    els.exportBtn.textContent = t('exportBtn');
    els.exportNdjsonBtn.textContent = t('exportNdjson');
    els.exportCsvBtn.textContent = t('exportCsv');
    els.importAppendBtn.textContent = t('importAppend');
    els.importReplaceBtn.textContent = t('importReplace');
    els.importCancelBtn.textContent = t('importCancel');
  }

  // ---------------------------------------------------------------------------
  // Settings panel
  // ---------------------------------------------------------------------------

  function populateSettingsForm() {
    els.minDays.value = state.settings.minDays;
    els.scanTime.value = state.settings.scanTime;
    els.excludePrivate.checked = state.settings.excludePrivate;
    els.excludePinned.checked = state.settings.excludePinned;
    els.gapToleranceDays.value = state.settings.gapToleranceDays;
    els.syncEnabled.checked = state.settings.syncEnabled !== false;
    // Surface a sync failure (usually "not signed in") rather than pretending
    // it worked; otherwise the checkbox would silently lie.
    els.syncNote.textContent = state.settings.syncEnabled === false
      ? ''
      : (state.syncError ? t('statusSyncUnavailable') : t('settingsSyncNote'));
    els.ignoreUrlFragment.checked = state.settings.ignoreUrlFragment !== false;
    els.excludeList.value = (state.settings.excludeList || []).join('\n');
    els.maxTitleLength.value = state.settings.maxTitleLength;
  }

  async function saveSettingsFromForm() {
    const minDays = Math.max(0, Math.min(365, parseInt(els.minDays.value, 10) || 0));
    const maxTitleLength = Math.max(20, Math.min(300, parseInt(els.maxTitleLength.value, 10) || 100));
    const settings = {
      minDays,
      scanTime: els.scanTime.value || '05:00',
      excludePrivate: els.excludePrivate.checked,
      excludePinned: els.excludePinned.checked,
      gapToleranceDays: Math.max(0, Math.min(3650, parseInt(els.gapToleranceDays.value, 10) || 0)),
      syncEnabled: els.syncEnabled.checked,
      ignoreUrlFragment: els.ignoreUrlFragment.checked,
      excludeList: Logic.parseExcludeList(els.excludeList.value),
      maxTitleLength,
    };
    const response = await sendMessage({ action: 'saveSettings', settings });
    if (response && response.settings) {
      state.settings = response.settings;
    }
    populateSettingsForm();
    refresh();
  }

  // ---------------------------------------------------------------------------
  // Export / import
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

  function exportHistory(format) {
    els.exportMenu.hidden = true;
    const now = Date.now();
    const historyMap = {};
    state.history.forEach((entry) => { historyMap[entry.url] = entry; });
    const date = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      downloadFile(Logic.toCSV(historyMap, now), `tab-history-${date}.csv`, 'text/csv');
    } else {
      downloadFile(Logic.toNDJSON(historyMap, now), `tab-history-${date}.ndjson`, 'application/x-ndjson');
    }
    showStatus(t('statusExported', state.history.length));
  }

  async function handleImportFile(file) {
    try {
      const text = await file.text();
      const entries = Logic.parseImport(text);
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
      state.confirmDelete = false;
      savePrefs();
      render();
    });

    els.uiLangSelect.addEventListener('change', async () => {
      state.settings.uiLang = els.uiLangSelect.value;
      await sendMessage({ action: 'saveSettings', settings: { uiLang: state.settings.uiLang } });
      applyStaticLabels();
      render();   // durations and row text carry translated units too
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

    els.sortSelect.addEventListener('change', () => {
      state.prefs.sortKey = els.sortSelect.value;
      savePrefs();
      render();
    });

    els.sortDirBtn.addEventListener('click', () => {
      state.prefs.sortDir = state.prefs.sortDir === 'asc' ? 'desc' : 'asc';
      savePrefs();
      render();
    });

    els.filterChips.addEventListener('click', (event) => {
      const chip = event.target.closest('.chip');
      if (!chip) return;
      state.prefs.show = chip.dataset.show;
      savePrefs();
      render();
    });

    els.historyHeader.addEventListener('click', () => {
      state.prefs.collapsedHistory = !state.prefs.collapsedHistory;
      savePrefs();
      render();
    });

    els.openHeader.addEventListener('click', () => {
      state.prefs.collapsedOpen = !state.prefs.collapsedOpen;
      savePrefs();
      render();
    });

    els.settingsBtn.addEventListener('click', () => {
      const willShow = els.settingsPanel.hidden;
      els.settingsPanel.hidden = !willShow;
      if (willShow) populateSettingsForm();
    });

    [els.minDays, els.scanTime, els.excludePrivate, els.excludePinned,
     els.gapToleranceDays, els.ignoreUrlFragment, els.excludeList, els.maxTitleLength,
     els.syncEnabled]
      .forEach((input) => input.addEventListener('change', saveSettingsFromForm));

    els.scanNowBtn.addEventListener('click', async () => {
      els.scanNowBtn.disabled = true;
      try {
        const result = await sendMessage({ action: 'scanNow' });
        if (result && result.error) {
          showStatus(result.error, true);
        } else {
          showStatus(t('statusScanResult', result.added, result.updated, result.closed));
        }
        await refresh();
      } finally {
        els.scanNowBtn.disabled = false;
      }
    });

    // Two-step bulk delete: first click arms, second click within 4s executes.
    els.deleteMatchingBtn.addEventListener('click', async () => {
      const urls = visibleHistory(Date.now()).map((entry) => entry.url);
      if (!urls.length) return;
      if (!state.confirmDelete) {
        state.confirmDelete = true;
        els.deleteMatchingBtn.textContent = t('deleteShownConfirm', urls.length);
        setTimeout(() => {
          state.confirmDelete = false;
          render();
        }, 4000);
        return;
      }
      state.confirmDelete = false;
      const response = await sendMessage({ action: 'deleteEntries', urls });
      await refresh();
      showUndoableStatus(t('statusRemovedMany', response.removed));
    });

    els.exportBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      els.exportMenu.hidden = !els.exportMenu.hidden;
    });
    els.exportNdjsonBtn.addEventListener('click', () => exportHistory('ndjson'));
    els.exportCsvBtn.addEventListener('click', () => exportHistory('csv'));
    document.addEventListener('click', () => { els.exportMenu.hidden = true; });

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
      if (message && message.type === 'state-changed') {
        if (state.editingLabelsFor || state.renamingFor) {
          // A background tab event must not steal an open editor; pull fresh
          // data without redrawing over what is being typed.
          fetchState();
        } else {
          refresh();
        }
      }
    });

    // Keep the live duration badges ticking, but never redraw over an open
    // label editor — that would drop what the user is typing.
    setInterval(() => {
      if (!state.editingLabelsFor && !state.renamingFor) render();
    }, 60 * 1000);
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
