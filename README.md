<h1><p align="left">
  <img src="https://github.com/timpyrkov/firefox-tabs-bk/blob/master/icons/icon-48.png?raw=true" alt="logo" height="25" style="vertical-align: middle; margin-right: 10px;">
  <span style="font-size:2.5em; vertical-align: middle;"><b>Backup Long-Open Tabs</b></span>
</p></h1>


Chrome / Firefox extension for regular backup of long-open browser tabs.

Automatically and safely backup browser tabs that have been open for a long time (default: 7+ days, configurable). Prevent accidental loss of important tabs you want to revisit later.

---

## 🚀 Installation (Firefox)

### Development / Debugging Mode

1. **Clone or download** this repository to your computer.
2. Open **Firefox** and go to `about:debugging#/runtime/this-firefox`.
3. Click **"Load Temporary Add-on..."**.
4. Select the `manifest.json` file from the project folder.
5. The extension will appear in your toolbar for testing and development.

> **Note:** Temporary add-ons are removed when you restart Firefox. For permanent use, see below.

### Permanent Installation (Developer Mode)

1. Go to `about:addons` in Firefox.
2. Click the gear icon → **"Install Add-on From File..."**
3. Select the `manifest.json` file from your project folder.
4. Click **Add**.

> For distribution to other users, you can package and submit the extension to [addons.mozilla.org](https://addons.mozilla.org/).

### [Chrome instructions will be added soon!]

---

## ✨ Main Features

### 🔹 Popup Panel
- **Quick stats**: See how many tabs are tracked and if auto-backup is enabled.
- **Manual backup**: Click "Backup Now" to immediately back up all long-open tabs.
- **Navigation**: Open the Tab Log dashboard or Settings with one click.
- **Auto-backup info**: See last and next scheduled backup times when enabled.

### 🔹 Tab Log Dashboard
- **Review all tracked tabs**: See a sortable, filterable table of all tabs that have been logged (and all currently open tabs).
- **Status column**: Colored checkboxes indicate whether a tab is logged (green) or just open (yellow). You can select tabs to add/remove from the log.
- **Export**: Download your log as CSV or JSON for backup or analysis.
- **Bulk actions**: Add/remove checked tabs from the log, or clear all logs.
- **Search/filter**: Quickly find tabs by title or domain.

### 🔹 Settings (Options) Panel
- **Minimum days before backup**: Only tabs open for this many days are considered for backup (default: 7).
- **Maximum tabs to backup**: Prevents storage issues by limiting the number of tabs backed up at once.
- **Automatic backup**: Enable/disable, set the time of day, and choose which days of the week to run backups.
- **Tolerance (hours)**: Handles daylight saving time changes.
- **Advanced options**: Exclude private/incognito or pinned tabs, set maximum title length.
- **Theme**: Choose light, dark, or auto mode.
- **Reset to defaults**: Restore all settings to their original values.

---

## 📖 Usage

1. **Install the extension** (see above).
2. **Click the extension icon** to open the popup.
3. **Backup Now**: Instantly back up all long-open tabs.
4. **Tab Log**: Open the dashboard to review, export, or manage your tab log.
5. **Settings**: Configure backup schedule, thresholds, and appearance.
6. **Automatic backups**: If enabled, backups will run on your chosen schedule.

### Backup File Format
- Backups are saved as CSV or JSON files, containing tab titles, URLs, and the date they were opened.

---

## 🛠️ Development

### Project Structure

```
firefox-tabs-bk/
├── manifest.json       # Extension configuration
├── background.js       # Background script (tab tracking, backups)
├── popup.html          # Popup UI
├── popup.js            # Popup logic
├── tabs.html           # Tab Log dashboard
├── tabs.js             # Tab Log logic
├── options.html        # Settings page
├── options.js          # Settings logic
├── styles.css          # Shared styles
├── icons/              # Extension icons
└── README.md           # This file
```

### Key Components
- **Background Script**: Tracks tab age, schedules and performs backups, manages storage.
- **Popup**: Quick stats, manual backup, navigation.
- **Tab Log Dashboard**: Table of all logged/open tabs, status management, export, search/filter.
- **Settings (Options)**: All configuration for backup logic, appearance, and advanced options.

### APIs Used
- `browser.tabs` - Tab management
- `browser.storage` - Settings and tab log persistence
- `browser.alarms` - Scheduled backups
- `browser.downloads` - Exporting backups
- `browser.runtime` - Messaging between components

---

## 📝 License

This project is open source. Feel free to modify and distribute according to your needs.

---

## 📚 Resources
- [Firefox Extension Development](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [WebExtension APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API)
