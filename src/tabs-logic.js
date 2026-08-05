// tabs-logic.js
// Pure helpers shared by background.js and sidebar.js: age/duration math,
// the promotion scan with dedup, import merge rules, and NDJSON/CSV
// serialization. No browser APIs are used here, so everything is unit-testable
// and safe to load in any context (page, event page, service worker).

(function (global) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const HOUR_MS = 60 * 60 * 1000;
  const MINUTE_MS = 60 * 1000;

  function domainOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  }

  function isTrackableUrl(url) {
    return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
  }

  // Query keys that identify a campaign, not a page. Dropping them stops the
  // same article arriving from two links being logged as two entries.
  const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|dclid|yclid|igshid|mc_cid|mc_eid|_hsenc|_hsmi|vero_id|mkt_tok)$/i;

  // --- Per-site canonicalization -------------------------------------------
  // Media and aggregator sites reach the same item through many URL shapes:
  // share links, mobile hosts, playback offsets, country domains. Without
  // per-site rules the same video or post is logged several times and each
  // copy carries its own, shorter duration. Each rule reduces a URL to the
  // thing a human would call "the same page".

  function hostMatches(hostname, domains) {
    return domains.some((domain) => hostname === domain || hostname.endsWith('.' + domain));
  }

  // Reduce the query string to an allowlist, preserving the listed values.
  function keepOnlyParams(parsed, keep) {
    const kept = [];
    for (const key of keep) {
      const value = parsed.searchParams.get(key);
      if (value != null) kept.push([key, value]);
    }
    parsed.search = '';
    kept.forEach(([key, value]) => parsed.searchParams.append(key, value));
  }

  function stripTrailingSlash(parsed) {
    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    }
  }

  // Search result pages are identified by their query, so it must survive.
  // Covers /search (most sites) and /results (YouTube).
  function keptSearchQuery(parsed) {
    if (!/(^|\/)(search|results)/i.test(parsed.pathname)) return false;
    keepOnlyParams(parsed, ['q', 'query', 'search_query']);
    return true;
  }

  const PINTEREST_DOMAINS = ['pinterest.com', 'pinterest.co.uk', 'pinterest.ca', 'pinterest.de',
    'pinterest.fr', 'pinterest.es', 'pinterest.it', 'pinterest.jp', 'pinterest.com.au',
    'pinterest.com.mx', 'pinterest.ru', 'pinterest.ch', 'pinterest.se', 'pinterest.nz'];

  const SITE_RULES = [
    {
      name: 'youtube',
      domains: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
      apply(parsed) {
        const segments = parsed.pathname.split('/').filter(Boolean);
        let videoId = null;
        if (hostMatches(parsed.hostname, ['youtu.be'])) {
          videoId = segments[0] || null;                       // youtu.be/ID share link
        } else if (['shorts', 'embed', 'live', 'v'].includes(segments[0])) {
          videoId = segments[1] || null;                       // /shorts/ID, /embed/ID
        } else if (segments[0] === 'watch') {
          videoId = parsed.searchParams.get('v');
        }
        parsed.hostname = 'www.youtube.com';                   // also folds m./music.
        if (videoId) {
          // One video, one entry — regardless of &t=NNN, &list=, &pp=, &ab_channel=.
          parsed.pathname = '/watch';
          keepOnlyParams(parsed, []);
          parsed.searchParams.set('v', videoId);
          return;
        }
        if (segments[0] === 'playlist') {
          keepOnlyParams(parsed, ['list']);
        } else if (!keptSearchQuery(parsed)) {
          keepOnlyParams(parsed, []);
        }
        stripTrailingSlash(parsed);
      },
    },
    {
      name: 'pinterest',
      domains: PINTEREST_DOMAINS.concat(['pin.it']),
      apply(parsed) {
        const segments = parsed.pathname.split('/').filter(Boolean);
        const pinAt = segments.indexOf('pin');
        if (pinAt !== -1 && segments[pinAt + 1]) {
          // /pin/ID/sent/?invite_code=… and country domains all mean one pin.
          parsed.pathname = `/pin/${segments[pinAt + 1]}`;
          if (hostMatches(parsed.hostname, PINTEREST_DOMAINS)) {
            parsed.hostname = 'www.pinterest.com';
          }
        }
        if (!keptSearchQuery(parsed)) keepOnlyParams(parsed, []);
        stripTrailingSlash(parsed);
      },
    },
    {
      name: 'instagram',
      domains: ['instagram.com'],
      apply(parsed) {
        parsed.hostname = 'www.instagram.com';
        const segments = parsed.pathname.split('/').filter(Boolean);
        const kinds = ['p', 'reel', 'reels', 'tv'];
        const at = segments.findIndex((segment) => kinds.includes(segment));
        if (at !== -1 && segments[at + 1]) {
          // Drop any /{user}/ prefix and fold /reels/ into /reel/.
          const kind = segments[at] === 'reels' ? 'reel' : segments[at];
          parsed.pathname = `/${kind}/${segments[at + 1]}`;
        }
        keepOnlyParams(parsed, []);   // img_index, igsh, hl … all cosmetic
        stripTrailingSlash(parsed);
      },
    },
    {
      name: 'facebook',
      domains: ['facebook.com', 'fb.com', 'fb.watch'],
      apply(parsed) {
        if (hostMatches(parsed.hostname, ['facebook.com'])) {
          parsed.hostname = 'www.facebook.com';               // folds m./web./mbasic.
        }
        // Facebook's referrer junk (__cft__, __tn__, mibextid, rdid…) is endless,
        // so allowlist the few params that actually identify a post instead.
        keepOnlyParams(parsed, ['story_fbid', 'fbid', 'id', 'v', 'set']);
        stripTrailingSlash(parsed);
      },
    },
    {
      name: 'x',
      domains: ['x.com', 'twitter.com'],
      apply(parsed) {
        parsed.hostname = 'x.com';                            // folds twitter.com, mobile.
        if (!keptSearchQuery(parsed)) keepOnlyParams(parsed, []); // drops ?s=20&t=…
        stripTrailingSlash(parsed);
      },
    },
    {
      name: 'reddit',
      domains: ['reddit.com', 'redd.it'],
      apply(parsed) {
        if (hostMatches(parsed.hostname, ['reddit.com'])) {
          parsed.hostname = 'www.reddit.com';                 // folds old./np./m.
        }
        if (!keptSearchQuery(parsed)) keepOnlyParams(parsed, []);
        stripTrailingSlash(parsed);
      },
    },
    {
      name: 'tiktok',
      domains: ['tiktok.com'],
      apply(parsed) {
        if (!keptSearchQuery(parsed)) keepOnlyParams(parsed, []);
        stripTrailingSlash(parsed);
      },
    },
    {
      name: 'vimeo',
      domains: ['vimeo.com'],
      apply(parsed) {
        keepOnlyParams(parsed, []);
        stripTrailingSlash(parsed);
      },
    },
  ];

  function siteRuleFor(hostname) {
    return SITE_RULES.find((rule) => hostMatches(hostname, rule.domains)) || null;
  }

  /**
   * Canonical form of a URL, used as the history key.
   *
   * Single-page apps (Gmail, many dashboards) rewrite the fragment as you move
   * around inside one page. Treating each fragment as a new URL would restart
   * the timer constantly and flood the log, so by default the fragment is
   * dropped and the page counts as one long-lived URL. Sites that genuinely
   * route on the hash lose that distinction — hence the setting.
   *
   * Then generic tracking params go, and finally any per-site rule runs — the
   * site rule wins, since it knows what actually identifies a page there.
   */
  function normalizeUrl(url, ignoreFragment) {
    try {
      const parsed = new URL(url);
      if (ignoreFragment !== false) parsed.hash = '';
      const drop = [];
      parsed.searchParams.forEach((value, key) => {
        if (TRACKING_PARAM.test(key)) drop.push(key);
      });
      drop.forEach((key) => parsed.searchParams.delete(key));

      const rule = siteRuleFor(parsed.hostname);
      if (rule) {
        parsed.protocol = 'https:';   // fold http/https duplicates on these sites
        rule.apply(parsed);
      }

      const query = parsed.searchParams.toString();
      parsed.search = query ? `?${query}` : '';
      return parsed.toString();
    } catch (e) {
      return url;
    }
  }

  /**
   * Stop list. A pattern containing "/" matches anywhere in the URL; otherwise
   * it matches the domain and its subdomains ("google.com" also excludes
   * "mail.google.com"). Case- and scheme-insensitive.
   */
  function isExcluded(url, patterns) {
    if (!Array.isArray(patterns) || !patterns.length) return false;
    const full = String(url || '').toLowerCase().replace(/^https?:\/\//, '');
    const domain = domainOf(url).toLowerCase();
    for (const raw of patterns) {
      const pattern = String(raw == null ? '' : raw).trim().toLowerCase().replace(/^https?:\/\//, '');
      if (!pattern) continue;
      if (pattern.includes('/')) {
        if (full.includes(pattern)) return true;
      } else if (domain === pattern || domain.endsWith('.' + pattern)) {
        return true;
      }
    }
    return false;
  }

  // Free text (one pattern per line) <-> the stored array.
  function parseExcludeList(text) {
    return String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function truncateTitle(title, maxLength) {
    const text = title || '';
    if (maxLength > 0 && text.length > maxLength) {
      return text.substring(0, maxLength) + '…';
    }
    return text;
  }

  // Age of a tracked open tab (tracker record).
  function tabAgeMs(record, now) {
    return Math.max(0, now - record.firstSeenAt);
  }

  // Duration of a history entry: still growing while the tab is open,
  // frozen at the last-seen-open time once it closed.
  function entryDurationMs(entry, now) {
    const end = entry.isOpen ? now : entry.lastSeenOpenAt;
    return Math.max(0, end - entry.firstSeenAt);
  }

  /**
   * Resume a closed entry because its URL is open again.
   *
   * A tab closed on occasion and reopened is treated as ONE episode, the way a
   * night of sleep with wake breaks is still one night: the span runs from the
   * first open to the last time it was seen open, breaks included. Only after a
   * long absence (`gapToleranceDays`) does it count as a new interest and the
   * clock restart. The accumulated break is kept in `gapMs` so the UI can be
   * honest about what the span contains.
   *
   * Shared by every reopen path — live tab event, startup reconcile, and the
   * daily scan — so they cannot drift apart.
   */
  function resumeStint(entry, newStintStart, now, settings) {
    const toleranceDays = settings && settings.gapToleranceDays != null ? settings.gapToleranceDays : 30;
    const gapMs = Math.max(0, now - (entry.lastSeenOpenAt || now));
    if (gapMs <= toleranceDays * DAY_MS) {
      entry.gapMs = (entry.gapMs || 0) + gapMs;
    } else {
      entry.firstSeenAt = newStintStart;
      entry.gapMs = 0;
    }
    entry.isOpen = true;
    entry.lastSeenOpenAt = now;
    return entry;
  }

  // Unit suffixes are injected so the UI can localize them; the default keeps
  // exports and logs locale-independent.
  const DEFAULT_UNITS = { d: 'd', h: 'h', m: 'm', lt1m: '<1m' };

  function formatDuration(ms, units) {
    const u = units || DEFAULT_UNITS;
    if (ms < MINUTE_MS) return u.lt1m;
    const days = Math.floor(ms / DAY_MS);
    const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
    const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
    if (days >= 10) return `${days}${u.d}`;
    if (days >= 1) return hours > 0 ? `${days}${u.d} ${hours}${u.h}` : `${days}${u.d}`;
    if (hours >= 1) return minutes > 0 ? `${hours}${u.h} ${minutes}${u.m}` : `${hours}${u.h}`;
    return `${minutes}${u.m}`;
  }

  /**
   * Split a URL into the parts a row shows: the domain (kept whole — it is the
   * anchor you scan for) and the rest of the path/query. The scheme and "www."
   * are dropped as noise.
   *
   * The remainder is truncated in the MIDDLE rather than the end, because the
   * tail of a URL is usually the distinctive bit (a video id, a post slug);
   * cutting it off would make different pages look identical.
   */
  function splitUrlForDisplay(url, budget) {
    const domain = domainOf(url) || '';
    let rest = String(url || '').replace(/^https?:\/\//, '').replace(/^www\./, '');
    rest = rest.startsWith(domain) ? rest.slice(domain.length) : rest;
    if (rest === '/') rest = '';
    rest = rest.replace(/\/$/, '');
    const max = Math.max(12, (budget || 58) - domain.length);
    return { domain, rest: truncateMiddle(rest, max) };
  }

  function truncateMiddle(text, max) {
    if (!text || text.length <= max) return text;
    const head = Math.ceil((max - 1) * 0.62);
    const tail = Math.max(4, max - 1 - head);
    return `${text.slice(0, head)}…${text.slice(text.length - tail)}`;
  }

  /**
   * The daily promotion scan, as a pure function.
   *
   * Promotes open tabs aged >= minDays into history, deduplicated by URL:
   * a URL already in history is updated in place, never added twice. Open
   * history entries whose URL is no longer among the open tabs are stamped
   * closed. Returns a new history object plus added/updated/closed counts.
   *
   * @param {Object} history  url -> HistoryEntry
   * @param {Array}  openTabs tracker records [{url, title, favIconUrl, firstSeenAt, lastSeenAt}]
   * @param {Object} settings needs minDays, maxTitleLength
   * @param {number} now
   */
  function promoteOpenTabs(history, openTabs, settings, now) {
    const result = {};
    for (const url of Object.keys(history)) {
      result[url] = { ...history[url] };
    }
    let added = 0;
    let updated = 0;
    let closed = 0;

    // Several tabs may show the same URL; track the oldest firstSeenAt.
    const oldestByUrl = {};
    for (const rec of openTabs) {
      if (!isTrackableUrl(rec.url)) continue;
      const seen = oldestByUrl[rec.url];
      if (!seen || rec.firstSeenAt < seen.firstSeenAt) {
        oldestByUrl[rec.url] = rec;
      }
    }

    const minAgeMs = (settings.minDays || 0) * DAY_MS;
    for (const url of Object.keys(oldestByUrl)) {
      const rec = oldestByUrl[url];
      if (isExcluded(url, settings.excludeList)) continue;
      if (tabAgeMs(rec, now) < minAgeMs) continue;
      const title = truncateTitle(rec.title, settings.maxTitleLength);
      const existing = result[url];
      if (!existing) {
        result[url] = {
          url,
          title,
          favIconUrl: rec.favIconUrl || '',
          domain: domainOf(url),
          firstSeenAt: rec.firstSeenAt,
          addedAt: now,
          lastSeenOpenAt: now,
          updatedCount: 0,
          isOpen: true,
          labels: [],
          gapMs: 0,
        };
        added++;
      } else {
        // Reopened after being closed: continue the same episode unless the
        // break was long enough to count as a new one (see resumeStint).
        if (!existing.isOpen) {
          resumeStint(existing, rec.firstSeenAt, now, settings);
        }
        // A user-renamed entry keeps its title; only auto-titles refresh, or
        // every scan would silently undo the rename.
        if (!existing.titleCustom) {
          existing.title = title;
        }
        existing.favIconUrl = rec.favIconUrl || existing.favIconUrl || '';
        existing.lastSeenOpenAt = now;
        existing.updatedCount = (existing.updatedCount || 0) + 1;
        existing.isOpen = true;
        updated++;
      }
    }

    // Close detection: open entries no longer among the open tabs.
    for (const url of Object.keys(result)) {
      const entry = result[url];
      if (entry.isOpen && !oldestByUrl[url]) {
        entry.isOpen = false;
        closed++;
      }
    }

    return { history: result, added, updated, closed };
  }

  // Labels are short free-text tags ("Art", "Español", "Sci-fi"). Normalized to
  // trimmed, deduplicated, case-preserving strings; comparison is case-insensitive
  // so "art" and "Art" never coexist.
  function normalizeLabels(raw) {
    if (!Array.isArray(raw)) {
      // Tolerate a "a; b" / "a, b" string, as produced by the CSV export.
      if (typeof raw === 'string' && raw.trim()) {
        raw = raw.split(/[;,]/);
      } else {
        return [];
      }
    }
    const seen = new Set();
    const result = [];
    for (const item of raw) {
      const label = String(item == null ? '' : item).trim().replace(/\s+/g, ' ');
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(label);
    }
    return result.sort((a, b) => a.localeCompare(b));
  }

  // Validate/coerce a raw imported object into a HistoryEntry, or null.
  function normalizeEntry(raw) {
    if (!raw || typeof raw !== 'object' || !isTrackableUrl(raw.url)) return null;
    const num = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
    const firstSeenAt = num(raw.firstSeenAt, Date.now());
    return {
      url: raw.url,
      title: typeof raw.title === 'string' ? raw.title : '',
      favIconUrl: typeof raw.favIconUrl === 'string' ? raw.favIconUrl : '',
      domain: typeof raw.domain === 'string' && raw.domain ? raw.domain : domainOf(raw.url),
      firstSeenAt,
      addedAt: num(raw.addedAt, firstSeenAt),
      lastSeenOpenAt: num(raw.lastSeenOpenAt, firstSeenAt),
      updatedCount: Math.max(0, Math.floor(Number(raw.updatedCount) || 0)),
      isOpen: Boolean(raw.isOpen),
      labels: normalizeLabels(raw.labels),
      titleCustom: Boolean(raw.titleCustom),
      gapMs: Math.max(0, Number(raw.gapMs) || 0),
    };
  }

  // Label chips use the curated --category-1..7 swatches: bounded, on-brand, and
  // legible in both themes. A colour is claimed on a label's first use by taking
  // the least-used slot, so the first seven labels never collide (a plain hash
  // would collide almost immediately). Assignments persist, so a label keeps its
  // colour for good. Cosmetic only — deliberately NOT written into the export, so
  // the NDJSON stays pure data for Python/grep.
  const LABEL_COLOR_COUNT = 7;

  function labelColorIndex(labelColors, label) {
    const key = label.toLowerCase();
    if (Number.isInteger(labelColors[key])) return labelColors[key];
    const counts = new Array(LABEL_COLOR_COUNT).fill(0);
    for (const index of Object.values(labelColors)) {
      if (Number.isInteger(index) && index >= 0 && index < LABEL_COLOR_COUNT) counts[index]++;
    }
    let best = 0;
    for (let i = 1; i < LABEL_COLOR_COUNT; i++) {
      if (counts[i] < counts[best]) best = i;
    }
    labelColors[key] = best;
    return best;
  }

  // Claim colours for any labels not yet known, and remember each label's
  // display casing so a device that has never seen the label locally can still
  // suggest it properly. Mutates and reports whether anything changed, so the
  // caller can skip a redundant write.
  function syncLabelColors(labelColors, entries, labelNames) {
    let changed = false;
    for (const label of collectLabels(entries)) {
      const key = label.toLowerCase();
      if (!Number.isInteger(labelColors[key])) {
        labelColorIndex(labelColors, label);
        changed = true;
      }
      if (labelNames && labelNames[key] !== label) {
        labelNames[key] = label;
        changed = true;
      }
    }
    return changed;
  }

  // All labels ever used, most-used first — powers the autocomplete datalist.
  function collectLabels(entries) {
    const counts = new Map();
    for (const entry of entries) {
      for (const label of entry.labels || []) {
        const key = label.toLowerCase();
        const current = counts.get(key);
        if (current) current.count++;
        else counts.set(key, { label, count: 1 });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .map((item) => item.label);
  }

  /**
   * Merge imported entries into existing history.
   * mode 'replace': the file becomes the history.
   * mode 'append': merge, deduped by URL — keep the earlier firstSeenAt and
   * addedAt, the later lastSeenOpenAt, and the local isOpen flag (the running
   * browser knows better than the file whether a tab is open right now).
   */
  function mergeImport(existing, importedRaw, mode) {
    const imported = importedRaw.map(normalizeEntry).filter(Boolean);
    if (mode === 'replace') {
      const result = {};
      for (const entry of imported) result[entry.url] = entry;
      return result;
    }
    const result = {};
    for (const url of Object.keys(existing)) {
      result[url] = { ...existing[url] };
    }
    for (const entry of imported) {
      const current = result[entry.url];
      if (!current) {
        result[entry.url] = entry;
      } else {
        current.firstSeenAt = Math.min(current.firstSeenAt, entry.firstSeenAt);
        current.addedAt = Math.min(current.addedAt, entry.addedAt);
        current.lastSeenOpenAt = Math.max(current.lastSeenOpenAt, entry.lastSeenOpenAt);
        current.updatedCount = Math.max(current.updatedCount || 0, entry.updatedCount || 0);
        // A custom title is a deliberate edit, so it outranks the file's title.
        if (entry.titleCustom && !current.titleCustom) {
          current.title = entry.title;
          current.titleCustom = true;
        } else if (!current.title && entry.title) {
          current.title = entry.title;
        }
        if (!current.favIconUrl && entry.favIconUrl) current.favIconUrl = entry.favIconUrl;
        // Labels are additive: an append import never drops tags either side has.
        current.labels = normalizeLabels([...(current.labels || []), ...(entry.labels || [])]);
      }
    }
    return result;
  }

  // NDJSON: one JSON object per line — greppable on disk and loadable in
  // Python with pd.read_json(path, lines=True). durationMs is included as a
  // computed convenience column; import ignores it.
  function toNDJSON(history, now) {
    const entries = Object.values(history)
      .slice()
      .sort((a, b) => a.addedAt - b.addedAt);
    return entries
      .map((entry) => JSON.stringify({ ...entry, durationMs: entryDurationMs(entry, now) }))
      .join('\n') + (entries.length ? '\n' : '');
  }

  function csvEscape(value) {
    const text = String(value == null ? '' : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function toCSV(history, now) {
    const header = ['url', 'title', 'domain', 'labels', 'firstSeenAt', 'addedAt', 'lastSeenOpenAt', 'isOpen', 'durationMs', 'durationHuman'];
    const lines = [header.join(',')];
    const entries = Object.values(history)
      .slice()
      .sort((a, b) => a.addedAt - b.addedAt);
    for (const entry of entries) {
      const durationMs = entryDurationMs(entry, now);
      lines.push([
        csvEscape(entry.url),
        csvEscape(entry.title),
        csvEscape(entry.domain),
        csvEscape((entry.labels || []).join('; ')),
        new Date(entry.firstSeenAt).toISOString(),
        new Date(entry.addedAt).toISOString(),
        new Date(entry.lastSeenOpenAt).toISOString(),
        entry.isOpen,
        durationMs,
        csvEscape(formatDuration(durationMs)),
      ].join(','));
    }
    return lines.join('\n') + '\n';
  }

  // Accepts NDJSON (one object per line) or a plain JSON array.
  // Returns an array of raw objects; throws on unparseable input.
  function parseImport(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array');
      return parsed;
    }
    return trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  // --- Cross-device sync ----------------------------------------------------

  /**
   * What travels between devices: the settings object (minus device-local keys)
   * plus the label vocabulary. History is deliberately absent — a few hundred
   * entries blow past the 8 KB-per-item sync quota, and the NDJSON export exists
   * for moving the full log.
   */
  function buildSyncPayload(settings, labelColors, labelNames, updatedAt, localOnlyKeys) {
    const shared = {};
    for (const [key, value] of Object.entries(settings || {})) {
      if ((localOnlyKeys || []).includes(key)) continue;
      shared[key] = value;
    }
    return {
      settings: shared,
      labelColors: { ...(labelColors || {}) },
      labelNames: { ...(labelNames || {}) },
      updatedAt: updatedAt || 0,
    };
  }

  /**
   * Merge a remote sync blob into local state. Two different rules, on purpose:
   *
   * - **Settings are last-write-wins** by `updatedAt`. They are single-valued
   *   preferences, so the most recent deliberate edit should stand. This
   *   includes the stop list: unioning it would resurrect a domain you had just
   *   removed, which is worse than losing a stale edit.
   * - **Labels are unioned.** A label known on either device should be offered
   *   on both, and losing a tag because the other device wrote later would be
   *   surprising. On a colour clash the local assignment wins, so a label never
   *   changes colour under you.
   *
   * Returns the merged state plus whether anything actually changed, so the
   * caller can skip a redundant write and a redundant re-render.
   */
  function mergeSyncedPrefs(local, remote, localOnlyKeys) {
    const result = {
      settings: { ...(local.settings || {}) },
      labelColors: { ...(local.labelColors || {}) },
      labelNames: { ...(local.labelNames || {}) },
      updatedAt: Number(local.updatedAt) || 0,
      changed: false,
    };
    if (!remote || typeof remote !== 'object') return result;

    const remoteAt = Number(remote.updatedAt) || 0;
    if (remoteAt > result.updatedAt && remote.settings && typeof remote.settings === 'object') {
      for (const [key, value] of Object.entries(remote.settings)) {
        if ((localOnlyKeys || []).includes(key)) continue;
        if (JSON.stringify(result.settings[key]) !== JSON.stringify(value)) {
          result.settings[key] = value;
          result.changed = true;
        }
      }
      result.updatedAt = remoteAt;
    }

    for (const [key, index] of Object.entries(remote.labelColors || {})) {
      if (!Number.isInteger(result.labelColors[key]) && Number.isInteger(index)) {
        result.labelColors[key] = index;
        result.changed = true;
      }
    }
    for (const [key, name] of Object.entries(remote.labelNames || {})) {
      if (!result.labelNames[key] && typeof name === 'string' && name) {
        result.labelNames[key] = name;
        result.changed = true;
      }
    }
    return result;
  }

  const SORT_KEYS = ['duration', 'domain', 'title', 'label'];

  function sortEntries(entries, key, dir, now) {
    const sign = dir === 'asc' ? 1 : -1;
    return entries.slice().sort((a, b) => {
      // Untagged entries always sink to the bottom, in either direction —
      // flipping the sort should reorder the tags, not bury them.
      if (key === 'label') {
        const aLabel = (a.labels && a.labels[0]) || '';
        const bLabel = (b.labels && b.labels[0]) || '';
        if (!aLabel && !bLabel) return a.title.localeCompare(b.title);
        if (!aLabel) return 1;
        if (!bLabel) return -1;
        return sign * (aLabel.localeCompare(bLabel) || a.title.localeCompare(b.title));
      }
      let cmp;
      switch (key) {
        case 'domain':
          cmp = a.domain.localeCompare(b.domain) || a.title.localeCompare(b.title);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'duration':
        default:
          cmp = entryDurationMs(a, now) - entryDurationMs(b, now);
          break;
      }
      return sign * cmp;
    });
  }

  function matchesQuery(entry, query) {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (entry.title || '').toLowerCase().includes(q) ||
      (entry.url || '').toLowerCase().includes(q) ||
      (entry.domain || '').toLowerCase().includes(q) ||
      (entry.labels || []).some((label) => label.toLowerCase().includes(q))
    );
  }

  global.TabsLogic = {
    DAY_MS,
    domainOf,
    isTrackableUrl,
    normalizeUrl,
    SITE_RULES,
    siteRuleFor,
    isExcluded,
    parseExcludeList,
    truncateTitle,
    tabAgeMs,
    entryDurationMs,
    resumeStint,
    formatDuration,
    splitUrlForDisplay,
    truncateMiddle,
    promoteOpenTabs,
    normalizeEntry,
    normalizeLabels,
    collectLabels,
    LABEL_COLOR_COUNT,
    labelColorIndex,
    syncLabelColors,
    buildSyncPayload,
    mergeSyncedPrefs,
    mergeImport,
    toNDJSON,
    toCSV,
    parseImport,
    SORT_KEYS,
    sortEntries,
    matchesQuery,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
