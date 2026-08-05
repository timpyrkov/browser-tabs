# Changelog

## 2.0.0 — 2026-08-05

Complete refactor from "Backup Long-Open Tabs" (popup + dashboard + options pages,
Manifest V2) into a sidebar-first Manifest V3 extension.

### Added
- Single sidebar UI (Firefox `sidebar_action`, Chrome `side_panel`) with search,
  sort (date open / web domain / page title / label), filter chips,
  collapsible sections, and persistent view state.
- **Labels**: short GitHub-style tags on any history entry or open tab, with
  autocomplete over previously used labels, deterministic per-label chip colours,
  click-to-filter, and label-aware search and sorting. Labels are carried through
  export/import (append mode unions them). Labelling an open tab promotes it into
  history immediately, bypassing the day threshold.
- Inline ✕ clear button in the search field (also bound to Escape).
- Per-entry editing: **rename** (persistent — later scans no longer overwrite a
  user-set name), **remove**, and **add now** to promote an open tab into history
  without waiting for the scheduled scan.
- **Undo** for every removal, single or bulk, offered for ~12s after the action.
- Label colours are claimed from the curated 7-colour palette by least-used slot
  and persisted, so the first seven labels never share a colour.
- Two-layer data model: internal tab tracker (first-seen times, heartbeat,
  startup reconciliation) + curated history of long-open tabs.
- Daily promotion scan with URL dedup; manual **Scan now**.
- Close detection: closed long-open tabs stay in history with final duration.
- Export to NDJSON and CSV; import with **Replace** / **Append** (URL-deduped merge).
- Bulk delete by domain / search match, with confirmation.
- Per-browser Manifest V3 builds from one `src/` via `build.cjs`.
- Shared design system (palette, buttons, chips, theme toggle) ported from the
  companion browser-images / browser-translations projects; dark default with
  persisted light-theme toggle.

- **Stop list**: sites never tracked (seeded with Gmail, Calendar, WhatsApp/Telegram
  web), editable in settings, plus a per-row ⊘ "never track this site" that also
  purges what is already logged — undoable, and the undo lifts the exclusion too.
- URL normalization: `#fragment` ignored by default (so single-page apps like Gmail
  count as one long-lived page instead of restarting on every message) and tracking
  query params (`utm_*`, `fbclid`, …) stripped so one page is one entry.
- Per-site canonicalization rules for media/aggregator sites — YouTube (playback
  offsets, `youtu.be`, `/shorts`, `/embed`, `m.`/`music.` hosts all fold into one
  video), Pinterest, Instagram, Facebook, X/Twitter, Reddit, TikTok, Vimeo — so one
  item is one history entry carrying its full duration.
- **Interface i18n** in 9 languages (en, es, it, fr, de, ru, ko, ja, zh), following the
  sibling projects' `i18n.js` + `locales/` pattern: detected from the browser on first
  run, switchable live from a toolbar selector, with per-key fallback to English and
  localized duration units. Exports keep English units so data files stay
  locale-independent.
- Rows now show the domain plus the rest of the URL, middle-truncated so the
  distinctive tail of a link survives; full URL in the tooltip.
- **Cross-device sync** via `storage.sync`: settings, the stop list and the label
  vocabulary follow the signed-in browser account, pulled on startup and applied
  live when another device changes them. Settings are last-write-wins; labels are
  unioned so a tag is never lost. History stays local (it does not fit the 8 KB
  per-item quota). Toggleable per device, debounced, and degrades quietly to
  local-only when not signed in.
- Stable Firefox extension ID, a prerequisite for `storage.sync`.

- Reopening a closed tab **continues the same count** rather than starting over:
  a tab closed on occasion and reopened is one episode (breaks included in the
  span, and reported as "· Nd closed in between"). Only after `gapToleranceDays`
  (default 30, configurable) does a reopen start a fresh count.

### Fixed
- Reliance on non-existent `tab.createdAt` (tabs never aged).
- Double `initialize()` call and phantom `backupInterval` setting.
- Theme setting having no effect (`prefers-color-scheme` override removed).
- Chrome incompatibility (`browser.*`-only API usage).

### Removed
- Popup, full-page dashboard, and options page.
- Unused `downloads` and `sessions` permissions; weekly backup-day scheduling.
