# Privacy Policy for Tab History for Long-Open Tabs

**Last updated:** 2026-10-05

## Summary

Tab History for Long-Open Tabs is a browser extension that keeps a list of the tabs you kept open for several days, so you can find and reopen them after they are closed. The extension does **not** collect, store, or transmit any personal information, browsing data, or user content to servers owned or operated by the developer. There are no such servers.

Everything stays inside your browser, in the extension's local storage on your device. **The extension makes no network requests at all**: it never connects to the internet, neither to the developer nor to any other server or website, and it does not load anything from the sites in its list.

## No access to your browser history

The extension has **no access to your browser's history** (the list of pages you visited). It does not request the browser's `history` permission, so the browser does not let it read, search, or change that history in any way.

The "history" you see in the extension is its own, separate list: the tabs it saw staying open for several days while it was running. It is built only from currently open tabs, as described below, and lives only in the extension's storage. That is also why deleting it cannot be undone: the extension has nothing to rebuild it from.

## When the extension does anything

Unlike a tool you start with a button, this extension has to work in the background: it can only tell how long a tab stayed open if it notices when the tab appears and when it goes away. So while the browser runs, it follows tab events (opened, changed address or title, closed) and checks the open tabs every few minutes and once a day. It reads nothing inside the pages themselves.

## Information the extension accesses

### Open tabs

For every open tab in a normal window the extension reads its address, title and window, and whether it is pinned or in a private window. Private windows are excluded by default, and so are the sites on the stop list (by default Gmail, Google Calendar, Google Translate, WhatsApp Web and Telegram Web). Pinned tabs can be excluded in the settings.

The extension does not read page content, the browser's own history database, bookmarks, cookies, passwords or form data.

### What is stored

The following is stored in the browser's local extension storage, on disk, and never transmitted anywhere:

- **Open-tab tracker** — for each open tab: its address, title, window, and when the extension first and last saw it open. This is needed because browsers do not record when a tab was opened.
- **History** — for each tab that stayed open at least the configured number of days (default 7): its address, title, site name, when it was first seen, when it was last seen open (for a closed tab, when it was closed), and whether it is open now.
- **Settings** — minimum number of days, maximum number of history entries, private/pinned exclusion, stop list, interface language and theme.
- **View preferences** — the search text, the selected filter (All / New / History) and the sort order.

## What is kept and what is erased

| | Settings | History | Open-tab tracker |
|---|---|---|---|
| Where it is stored | Extension storage, on disk | Extension storage, on disk | Extension storage, on disk |
| Closing and reopening the panel | kept | kept | kept |
| Restarting the browser | kept | kept | kept (matched to the restored tabs) |
| Pressing **+** on a new tab | kept | that tab **added** | kept |
| Pressing the trash button on an entry | kept | **that entry erased** (Undo available for a few seconds) | that URL's open tabs count from zero again |
| Closing a tab | kept | kept (the tab is recorded if it was open long enough) | **that tab erased** |
| Adding a site to the stop list | kept | kept (remove its entries with the trash button) | **that site's tabs erased** |
| Pressing **Delete all my history** (after confirming) | kept | **all erased**, no Undo | open tabs count from zero again |
| Import with **Replace** | kept | **replaced** by the file | kept |
| Uninstalling the extension | **erased** | **erased** | **erased** |

## Export and import

**Export** saves the whole history as a file (NDJSON) through the browser's normal download, to a place you choose. The file is yours; the extension does not send it anywhere. **Import** reads a file you pick and adds its entries to the history (**Append**) or replaces the history with it (**Replace**).

## Network requests

None. The extension contains no code that sends or receives anything over the network: no requests to the developer, to analytics or advertising services, or to the websites you visit. It does not even show site icons, so drawing the list never loads anything from the sites in it. Clicking an entry opens its address in a browser tab, exactly as clicking a link would; that page load is the browser's, not the extension's.

## Data the extension does **not** collect

- No analytics, telemetry, crash reporting, or advertising identifiers
- No page content, browser history database, bookmarks, passwords, or cookie values
- Nothing is synced to a browser account or sent to the developer. The browsers' own sync (Firefox Sync, Chrome Sync, Opera Sync) does not carry it either: at most it installs the extension on your other devices, where it starts with an empty history of its own, because an extension's local storage is never synced
- No data is sold, shared, or stored by the extension author

## Chrome Web Store Limited Use

The extension uses tab information (addresses, titles and times) only to provide its single user-facing purpose: a list of long-open tabs that the user can search and reopen after they are closed. It does not use or transfer this information for advertising, analytics, creditworthiness, lending, or any purpose unrelated to that feature, and it does not transfer it to anyone. The extension's use of information complies with the Chrome Web Store Limited Use requirements.

## Permissions explained

The extension asks only for the permissions below. In particular it does **not** request `history` (your browsing history), `bookmarks`, `cookies`, `webRequest`, `downloads`, or access to the content of any website.

- **`tabs`:** Read the address and title of open tabs to measure how long each stays open, and open or switch to a tab when you click an entry.
- **`storage`:** Keep the tracker, the history, your settings and view preferences in local extension storage.
- **`alarms`:** Refresh the open tabs every 5 minutes, and once an hour record tabs that have stayed open long enough, so durations stay accurate even when the browser is idle.
- **`unlimitedStorage`** (Chrome and Opera only): Let the history grow past Chrome's default 10 MB limit for extension storage (up to the maximum number of entries you set; 100,000 by default). It only lifts that size limit on this device; it grants no access to anything else. Firefox does not need it.
- **`sidePanel`** (Chrome) / **sidebar** (Firefox, Opera): Show the extension's interface in the browser's side panel.

## Changes to this policy

If the extension ever starts handling data differently, this file will be updated and the change will be noted in the release notes.

## Contact

For questions about this privacy policy, open an issue in the repository:
https://github.com/timpyrkov/browser-tabs/issues
