<h1><p align="left">
  <img src="https://github.com/timpyrkov/browser-tabs/blob/master/src/icons/icon-128.png?raw=true" alt="Tab History logo" height="25" style="vertical-align: middle; margin-right: 10px;">
  <span style="font-size:2.5em; vertical-align: middle;"><b>Tab History for Long-Open Tabs</b></span>
</p></h1>

**Tab History** — a Firefox, Chrome and Opera extension that finds the tabs you kept open
for days and then closed, most recently closed first.

Browser history lists pages by when you *opened* them. A tab you opened a month ago, kept
for later reading, and closed by accident yesterday sits a month deep in that list,
among hundreds of pages you looked at for seconds. The browser's own "Recently closed"
menu keeps only the last couple of dozen closed tabs, short-lived ones included.

Tab History keeps a separate list of just the tabs that stayed open for at least *N* days
(default 7) — usually the ones that mattered — ordered by when they were **closed**. One
click reopens a tab.

## 🚀 Quick Start

### Build

```bash
npm run build:firefox    # -> dist/firefox/
npm run build:chrome     # -> dist/chrome/
npm run build:opera      # -> dist/opera/
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

### Opera

```
opera://extensions
```
Then enable **Developer mode**, click **Load unpacked** and select the `dist/opera/` folder

### Yandex Browser

```
browser://extensions
```
Then load `dist/chrome/` or `dist/opera/` the same way (toolbar popup only — Yandex has no
extension sidebar)

---

## ✨ Features

- **One list, three filters** — **History** (default): every URL kept in history, open
  or closed, most recently closed first; **New**: open tabs not in history yet; **All**:
  both. Each row shows its open and close date-time (`09/10, 14:30 → 10/05, 09:12`, or
  `since 09/20, 14:30` while open; hover for full dates) and how long it was open,
  coloured **gold** when the URL is in history and **green** when it is not yet. Click a
  row to switch to the open tab, or to reopen a closed one.
- **Add or remove by hand** — **+** puts a new tab into history right away; the **trash**
  button removes a URL from history (with **Undo**) and restarts its count from zero.
- **Sort** by title, URL, open time, duration or close time, with ↑ / ↓ for ascending /
  descending; each filter remembers its own order.
- **Recorded the moment it goes away** — closing a long-open tab, navigating it to
  another page, or losing it in a browser crash records it immediately; an hourly scan
  also records long-open tabs while they are still open, so a backup always has them.
- **Once in history, always in history** — reopening a URL from history continues its
  count, however long it was closed; only the trash button restarts it.
- **Search** across titles and URLs; click a row's domain to filter by it.
- **One URL, one entry** — the `#fragment` and tracking parameters (`utm_*`, `fbclid`, …)
  are ignored, and per-site rules fold the many URL shapes of one YouTube video,
  Pinterest pin, Instagram/Facebook/X post, Reddit thread, TikTok or Vimeo into one.
- **Stop list** — always-open apps (Gmail, Calendar, Translate, WhatsApp/Telegram web by
  default) are never tracked. Private windows are excluded by default; pinned tabs can be.
- **Backup** — export the whole history as NDJSON (one JSON object per line;
  `pd.read_json(path, lines=True)` in Python) and import it back (**Append** or
  **Replace**). **Delete all my history** (in settings, after a confirmation) wipes the
  extension's own history for good; it never touches the browser's history.
- **Sidebar in Firefox and Opera, side panel in Chrome.** Chrome and Opera builds also
  carry a toolbar popup with the same UI as a fallback for browsers without an extension
  sidebar, e.g. **Yandex Browser** installing from the Chrome or Opera store.
- **9 interface languages** (English, Spanish, Italian, French, German, Russian, Korean,
  Japanese, Chinese) and light / dark themes.
- **Nothing leaves your browser** — see [PRIVACY.md](PRIVACY.md).

---

## 🛠️ Development

Requires [Node.js](https://nodejs.org/); no dependencies. The build copies `src/` plus the
right manifest into `dist/`. The Chrome and Opera builds also get a toolbar popup
generated from `sidebar.html` (plus `targets/popup/` and, for Chrome, `targets/chrome/`):

```bash
npm run build            # lint + tests + all three builds
npm run build:firefox    # dist/firefox/  (sidebar only)
npm run build:chrome     # dist/chrome/   (side panel; toolbar popup as fallback)
npm run build:opera      # dist/opera/    (sidebar + toolbar popup)
npm test                 # regression tests (node, no browser)
npm run package:firefox  # -> browser-tabs-firefox.zip (store upload)
npm run package:chrome   # -> browser-tabs-chrome.zip
npm run package:opera    # -> browser-tabs-opera.zip
```

After changing anything in `src/`, rebuild and press **Reload** on the extension.

### Panel per browser

| Browser | Toolbar icon opens |
|---|---|
| Firefox | the sidebar |
| Chrome | the side panel (the popup is removed at startup once the side panel accepts the click) |
| Opera | the popup; the sidebar opens from Opera's own sidebar icon (pin it to keep it open) |
| Yandex (Chrome or Opera build) | the popup — no extension sidebar there |

### Project layout

```
src/
  background.js        tracker, recording on close, hourly scan, message API
  tabs-logic.js        pure helpers: durations, recording/dedup, URL rules, NDJSON
  defaults.js          default settings + fixed behaviour constants
  sidebar.html/.js     the UI (also used as the Chrome/Opera toolbar popup)
  theme.js, styles.css shared look with the sibling extensions (dark default)
  i18n.js, locales/    interface translations
targets/
  popup/               popup sizing, added to the Chrome and Opera builds
  chrome/              Chrome-only popup extra ("open in side panel" button)
manifests/             per-browser manifest.json
test/run.cjs           regression tests (node vm, no browser)
```

### Data model

Everything is kept in `storage.local`, on this device only:

- `openTabs` (tracker): `tabId → { url, title, windowId, firstSeenAt,
  lastSeenAt }`. It exists only because browsers do not expose a tab's creation time;
  a 5-minute heartbeat keeps `lastSeenAt` fresh, and on startup records are re-matched
  to the restored tabs by URL so ages survive restarts.
- `history`: `url → { url, title, domain, firstSeenAt, addedAt,
  lastSeenOpenAt, isOpen, gapMs, updatedCount }`. For a closed entry `lastSeenOpenAt`
  is the close time; duration = `lastSeenOpenAt − firstSeenAt`.
- `settings` (minimum days, private/pinned exclusion, stop list, interface language),
  `sidebarPrefs` (search text, view, sort) and `theme`.

Site icons are deliberately not stored (or shown): some arrive as multi-KB embedded
images. Without them a history entry takes about 300–700 bytes (≈ 400 for a typical
article), so the default maximum of **100,000 entries** is about 40 MB. Chrome and Opera
cap extension storage at 10 MB unless the extension has `unlimitedStorage`, so their
manifests request it (Chrome shows no install warning for it); Firefox's limits are far
higher and it would show a warning, so its manifest does not.

The maximum (`settings.maxHistory`, 10,000 … 1,000,000) is a hard stop: at the limit new
tabs are simply not added, and nothing already in history is deleted to make room. The
panel's bottom line shows `History: 214 / 100,000 · 85 KB`, turning red at 90 % with a
hint to raise the day threshold or the maximum, or to remove entries. An import that
would go over the maximum is refused as a whole.

The list is drawn 200 rows at a time: the whole history is filtered and sorted (about
80 ms for 100,000 entries), but only the first page becomes DOM rows, and the next page
loads as you scroll near the end (or with **Show more**). Search always covers
everything.

The background owns all of this; every panel (sidebar, side panel, popup) is only a view
that asks for a snapshot and redraws on change, so closing and reopening a panel loses
nothing. The one exception is **Undo**: the panel keeps the removed entry, because
Chrome unloads an idle background worker after about 30 seconds.

---

## 📋 Roadmap

- Publish to Firefox Add-ons, the Chrome Web Store and Opera Add-ons.
- Check the Chrome build in Yandex Browser (the toolbar icon must open the popup).
- More per-site URL rules as they prove necessary — Twitch, Bluesky, Spotify, Amazon.

---

## 📝 License

MIT — see [LICENSE](LICENSE).
