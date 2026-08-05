<h1><p align="left">
  <img src="https://github.com/timpyrkov/browser-tabs/blob/master/src/icons/icon-128.png?raw=true" alt="Tab History logo" height="25" style="vertical-align: middle; margin-right: 10px;">
  <span style="font-size:2.5em; vertical-align: middle;"><b>Tab History for Long-Open Tabs</b></span>
</p></h1>

A sidebar browser extension (Firefox primary, Chrome secondary) that answers the question
ordinary browser history cannot: **how long did each tab stay open?**

Tabs you keep open are often the ones you postponed for later reading. This extension
tracks how long every tab has been open, and once a day promotes tabs that survived at
least *N* days (default 7, configurable) into a persistent, searchable history —
deduplicated by URL. If such a tab is later closed (accidentally or not), it stays in
history with its final open-duration and can be reopened with one click.

## 🚀 Quick Start

### Build

```bash
npm run build:firefox    # -> dist/firefox/
npm run build:chrome     # -> dist/chrome/
```

### Firefox

```
about:debugging#/runtime/this-firefox
```
Then click **Load Temporary Add-on…** and select `dist/firefox/manifest.json`

### Chrome

```
chrome://extensions/
```
Then click **Load unpacked** and select the `dist/chrome/` folder

---

## ✨ Features

- **Sidebar-first UI** — everything (history, search, sort, settings, export/import)
  lives in one panel: `sidebar_action` on Firefox, `side_panel` on Chrome.
- **Open-duration tracking** — an internal tracker notes when each tab was first seen
  (browsers do not expose tab creation time), with a heartbeat and startup
  reconciliation so ages survive browser restarts and crashes.
- **Daily promotion scan** — once a day (configurable time), tabs open ≥ `minDays`
  enter history; already-known URLs are updated in place, never duplicated. A
  **Scan now** button runs it on demand.
- **Labels** — tag any entry (or any open tab) with short GitHub-style labels like
  `Art`, `Español`, `Sci-fi`. The input autocompletes from labels you've used before,
  chips are colour-coded per label, and clicking one filters by it. Labels are
  searchable, sortable, and included in export/import. Tagging a tab that hasn't yet
  reached the day threshold adds it to history right away.
- **Search & sort** — live search across title, URL, domain, and labels (with an
  inline ✕ to clear); sort by Duration, Url, Name, or Tag, in both directions.
  All view state persists across sidebar reopens.
- **Editing** — rename an entry (renames stick; scans never overwrite them), remove
  it, or add an open tab to history immediately without waiting for the scan.
  Every removal offers an **Undo**. Bulk-delete everything matching the current
  search or domain, with confirmation.
- **Stop list** — sites you'd never forget (Gmail, Calendar, Google Translate,
  WhatsApp/Telegram web by default) are never tracked, keeping history to the pages
  that are actually easy to lose. Editable in settings, or press ⊘ on any row to
  exclude that site and purge what it already logged.
- **9 interface languages** — English, Spanish, Italian, French, German, Russian,
  Korean, Japanese, Chinese. Picked up from your browser on first run, switchable
  live from the toolbar; even duration units follow the language (`25d` / `25д`).
- **Readable URLs** — each row shows the domain plus as much of the path as fits,
  middle-truncated (`…`) so the distinctive tail of a link survives; the full URL is
  in the tooltip.
- **Gap-tolerant durations** — close a tab by accident and reopen it and the count
  continues rather than restarting, like a night of sleep with wake breaks still
  being one night. Only after a long absence (30 days by default) does it count as
  a new episode.
- **Sane URL identity** — the `#fragment` is ignored by default, so single-page apps
  like Gmail count as one long-lived page instead of restarting the clock on every
  item; tracking parameters (`utm_*`, `fbclid`, …) are stripped so the same page from
  two different links is one entry.
- **Per-site rules for media** — one YouTube video is one entry however you reached it
  (`?t=90`, `youtu.be/ID`, `/shorts/ID`, `m.`/`music.` hosts), and the same holds for
  Pinterest pins, Instagram posts, Facebook posts, X/Twitter posts, Reddit threads,
  TikTok and Vimeo. Without this a single video accumulates several short durations
  instead of one long one.
- **Cross-device sync** — settings, the stop list and your label vocabulary follow
  your signed-in browser account (Firefox Account / Google account), so a second
  machine starts configured and autocompletes the same labels. History stays local
  by design: it does not fit the sync quota, and export/import moves the full log.
- **Export / import** — export as NDJSON (one JSON object per line: `grep`-friendly,
  `pd.read_json(path, lines=True)` in Python) or CSV. Import asks **Replace** or
  **Append** (append merges, deduplicated by URL).

---

## 🚀 Build

No dependencies; the build copies `src/` plus the right manifest into `dist/`:

```bash
npm run build            # lint + both browsers
npm run build:firefox    # dist/firefox/
npm run build:chrome     # dist/chrome/
```

## 📦 Install (temporary / developer mode)

- **Firefox:** `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on…* →
  pick `dist/firefox/manifest.json`. Open the sidebar via the toolbar icon or
  View → Sidebar.
- **Chrome:** `chrome://extensions` → enable *Developer mode* → *Load unpacked* →
  pick `dist/chrome/`. Click the toolbar icon to open the side panel.

---

## 🛠️ Project Structure

```
browser-tabs/
├── package.json          # Build scripts (lint + per-browser builds)
├── build.cjs             # Dependency-free build: src/ + manifest → dist/[browser]/
├── manifests/
│   ├── firefox.json      # MV3, sidebar_action, background.scripts
│   └── chrome.json       # MV3, side_panel, service_worker
├── src/
│   ├── sidebar.html      # The single UI page
│   ├── sidebar.js        # Sidebar logic (search/sort/edit/export/import)
│   ├── background.js     # Tracker + daily scan + message API
│   ├── tabs-logic.js     # Pure helpers: durations, promotion/dedup, URL rules,
│   │                     #   NDJSON/CSV, sync merge
│   ├── defaults.js       # DEFAULT_SETTINGS + shared constants (incl. sync)
│   ├── theme.js          # Dark/light toggle, persisted (dark default)
│   ├── styles.css        # Shared design tokens + components
│   └── icons/
└── dist/                 # Build output (gitignored)
```

### Data model (short version)

Everything is stored in `storage.local`:

- `openTabs` (tracker): `tabId → { url, title, favIconUrl, windowId, firstSeenAt,
  lastSeenAt }` — internal working data. It exists only because browsers do not
  expose a tab's creation time.
- `history`: `url → { url, title, titleCustom, domain, labels, firstSeenAt,
  addedAt, lastSeenOpenAt, updatedCount, isOpen, gapMs }` — the curated log.
  Duration = `lastSeenOpenAt − firstSeenAt`, recomputed live while the entry is
  open and frozen once it closes.
- `labelColors` / `labelNames`: the label vocabulary — palette slot and display
  casing per label. Cosmetic, so kept out of the export to leave the NDJSON as
  pure data.

`storage.sync` holds a single `syncedPrefs` key: settings, stop list and label
vocabulary. History is deliberately excluded — it does not fit the 8 KB
per-item sync quota, and the NDJSON export exists for moving the full log.

### Key behaviours worth knowing

- **URL identity.** The `#fragment` is dropped by default and tracking params are
  stripped; per-site rules (`SITE_RULES` in `tabs-logic.js`) fold the many URL
  shapes of one YouTube video / Pinterest pin / X post into a single entry.
- **Gap tolerance.** Reopening a tab within `gapToleranceDays` (30) continues the
  original count with the break included and reported; beyond that it restarts.
- **Two tabs, one URL** = one entry, defined by the oldest tab.
- **Renames stick** — a renamed entry sets `titleCustom` so scans never overwrite it.

`tabs-logic.js` is pure (no browser APIs), which is what makes all of the above
unit-testable outside a browser.

### APIs used

- `tabs` — tab tracking and reopening
- `storage` — settings, tracker state, history (local) and cross-device prefs (sync)
- `alarms` — heartbeat (~5 min) and the daily scan
- `runtime` — messaging between sidebar and background

---

## 📋 TODO

- **Publish to AMO (addons.mozilla.org)** so Firefox installs it permanently
  instead of it disappearing on every restart as a temporary add-on. Unlisted
  ("On your own") self-distribution is enough — Mozilla signs the `.xpi` without
  listing it publicly:

  ```bash
  cd dist/firefox && web-ext sign --channel=unlisted --api-key=KEY --api-secret=SECRET
  ```

  The stable extension ID (`browser_specific_settings.gecko.id`) is already in
  place, which is a prerequisite. Optionally add an `update_url` afterwards for
  automatic updates instead of reinstalling by hand.
- **Publish to the Chrome Web Store**, the Chrome analogue. Unlisted/private
  distribution is available there too (one-time developer registration fee).
  Loading `dist/chrome/` unpacked already persists across restarts, so this is
  only needed for real distribution or to drop the developer-mode nag. Pin the
  extension ID with a `"key"` manifest field if it should stay constant.
- **Label manager** — one place to rename a label everywhere, merge two labels,
  recolour, or delete one globally.
- **More site rules** as they prove necessary — Twitch, Bluesky, Spotify, Amazon.
- **Track focused time** alongside open time, to tell "open 3 weeks, never read"
  from "read daily".

---

## 📝 License

MIT
