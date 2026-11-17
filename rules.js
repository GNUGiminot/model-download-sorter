// Model Download Sorter — choosing the folder for a download.
// Pure functions: used by the service worker, the options page and the node tests.
(function (root) {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    root: '3D Models',
    otherFolder: 'Other',
    perModelFolder: true,
    types: { stl: true, step: true, stp: true, '3mf': true, zip: true },
    sites: [
      { folder: 'MakerWorld', hosts: ['makerworld.com', 'bblmw.com'] },
      { folder: 'Printables', hosts: ['printables.com'] },
      { folder: 'Thingiverse', hosts: ['thingiverse.com'] },
    ],
  };

  // Types that are moved only when the download came from a site in the list.
  const SITE_ONLY_TYPES = ['zip'];

  // Endings of page titles, e.g. "Benchy - MakerWorld", "Benchy | Printables.com".
  const TITLE_SUFFIX = /\s*[-|–—:]\s*(MakerWorld[^-|–—]*|Printables(\.com)?|Thingiverse|Cults3D?|Cults)\s*$/i;

  function mergeSettings(stored) {
    const s = Object.assign({}, DEFAULT_SETTINGS, stored || {});
    s.types = Object.assign({}, DEFAULT_SETTINGS.types, (stored && stored.types) || {});
    if (!Array.isArray(s.sites)) s.sites = DEFAULT_SETTINGS.sites;
    return s;
  }

  function hostOf(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      if (u.protocol === 'blob:') return hostOf(u.pathname);
      return u.hostname.toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function hostMatches(host, pattern) {
    pattern = String(pattern || '').trim().toLowerCase().replace(/^\*?\.?/, '');
    return !!host && !!pattern && (host === pattern || host.endsWith('.' + pattern));
  }

  function siteForUrl(url, sites) {
    const host = hostOf(url);
    if (!host) return null;
    return sites.find((site) => (site.hosts || []).some((p) => hostMatches(host, p))) || null;
  }

  function extensionOf(filename) {
    const base = String(filename || '').split(/[\\/]/).pop();
    const m = /\.([^.]+)$/.exec(base);
    return m ? m[1].toLowerCase() : '';
  }

  // One path component that Windows, macOS and Linux all accept.
  function safeName(name, maxLength) {
    let s = String(name || '')
      .replace(/[\u0000-\u001f<>:"/\\|?*\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength || 80)
      .replace(/[. ]+$/, '')
      .replace(/^[. ]+/, '');
    if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(s)) s = '_' + s;
    return s;
  }

  const TRANSLIT = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k',
    л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };

  // Short Latin folder name: "Оригинальный 3D Benchy!" -> "originalnyy-3d-benchy".
  function shortName(text, maxLength) {
    const max = maxLength || 40;
    const words = String(text || '')
      .toLowerCase()
      .replace(/[а-яё]/g, (c) => TRANSLIT[c])
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
    let out = '';
    for (const w of words) {
      const next = out ? out + '-' + w : w;
      if (next.length > max) break;
      out = next;
    }
    return out || (words[0] || '').slice(0, max);
  }

  // Slug from a model page address: makerworld.com/ru/models/1123776-original-3d-benchy,
  // printables.com/model/12345-cable-clip, cults3d.com/en/3d-model/home/spiral-vase.
  function modelNameFromUrl(url) {
    let path;
    try {
      path = decodeURIComponent(new URL(url).pathname);
    } catch (e) {
      return '';
    }
    const m = /\/(?:models?|3d-model(?:\/[^/]+)?|design|thing)\/(?:\d+-)?([^/]*[a-zа-я][^/]*)\/?$/i.exec(path);
    return m ? shortName(m[1].replace(/^\d+-/, '')) : '';
  }

  function modelNameFromTitle(title) {
    let t = String(title || '');
    for (let i = 0; i < 3; i++) t = t.replace(TITLE_SUFFIX, '');
    t = t.split(/\s+[|—–]\s+/)[0]; // "Benchy — free 3D model ..." -> "Benchy"
    return shortName(t);
  }

  // Returns the new relative path, or null to leave the download as it is.
  // info: { filename, url, finalUrl, referrer, tabUrl, tabTitle }
  function chooseFolder(info, settings) {
    const s = mergeSettings(settings);
    if (!s.enabled) return null;

    const ext = extensionOf(info.filename);
    if (!ext || !s.types[ext]) return null;

    const candidates = [info.referrer, info.url, info.finalUrl, info.tabUrl];
    let site = null;
    for (const url of candidates) {
      site = siteForUrl(url, s.sites);
      if (site) break;
    }
    if (!site && SITE_ONLY_TYPES.includes(ext)) return null;

    const parts = [];
    const rootParts = String(s.root || '').split(/[\\/]+/).map((p) => safeName(p)).filter(Boolean);
    parts.push(...rootParts);
    const siteFolder = safeName(site ? site.folder : s.otherFolder);
    if (siteFolder) parts.push(siteFolder);

    const base = String(info.filename || '').split(/[\\/]/).pop();
    if (s.perModelFolder) {
      // The tab title is trusted only when the tab is on the same site as the download.
      const sameSite = site
        ? siteForUrl(info.tabUrl, s.sites) === site
        : !!hostOf(info.tabUrl) && hostOf(info.tabUrl) === hostOf(info.referrer || info.url);
      const referrerSite = site ? siteForUrl(info.referrer, s.sites) === site : !!hostOf(info.referrer);
      let model = (referrerSite && modelNameFromUrl(info.referrer)) ||
        (sameSite && (modelNameFromUrl(info.tabUrl) || modelNameFromTitle(info.tabTitle))) ||
        shortName(base.replace(/\.[^.]+$/, ''));
      if (model) parts.push(model);
    }
    parts.push(safeName(base, 150) || 'model.' + ext);
    return parts.join('/');
  }

  const api = {
    DEFAULT_SETTINGS,
    mergeSettings,
    hostOf,
    hostMatches,
    siteForUrl,
    extensionOf,
    safeName,
    shortName,
    modelNameFromUrl,
    modelNameFromTitle,
    chooseFolder,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MDS = api;
})(typeof self !== 'undefined' ? self : this);
