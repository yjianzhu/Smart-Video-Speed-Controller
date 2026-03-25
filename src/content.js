const STORAGE_KEY = 'perPageRates';
const SETTINGS_KEY = 'globalSettings';
const HARDCODED_DEFAULT = 1.0;
const MIN_RATE = 0.25;
const MAX_RATE = 4.0;
const RATE_STEP = 0.05;
const MAX_STORED_PAGES = 500;

let currentUrl = location.href;
let currentPageKey = currentUrl;
let desiredRate = HARDCODED_DEFAULT;
let globalDefaultRate = HARDCODED_DEFAULT;
let syncTimer = null;
let urlPollTimer = null;
const observedVideos = new WeakSet();

function contextValid() {
  try { return !!chrome.runtime?.id; } catch { return false; }
}

// ─── Utility ─────────────────────────────────────────────────────────

function clampRate(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return HARDCODED_DEFAULT;
  const stepped = Math.round(n / RATE_STEP) * RATE_STEP;
  return Math.round(Math.min(MAX_RATE, Math.max(MIN_RATE, stepped)) * 100) / 100;
}

/**
 * Domain-aware URL normalization for stable page-key generation.
 * - Known video sites: only keep whitelisted meaningful params.
 * - Other sites: strip common tracking params (utm_*, spm_*, etc.).
 */
const VIDEO_DOMAIN_PARAMS = {
  'youtube.com':       ['v', 'list', 'index'],
  'youtu.be':          [],
  'bilibili.com':      ['p'],
  'vimeo.com':         [],
  'dailymotion.com':   [],
  'twitch.tv':         [],
  'youku.com':         [],
  'iqiyi.com':         [],
  'nicovideo.jp':      [],
  'tiktok.com':        [],
  'netflix.com':       [],
  'disneyplus.com':    [],
  'hulu.com':          [],
  'crunchyroll.com':   [],
  'ted.com':           [],
  'coursera.org':      [],
  'udemy.com':         [],
};

const TRACKING_PARAM_PREFIXES = ['utm_', 'spm_', 'from_spm', 'share_'];
const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'dclid', 'msclkid',
  'vd_source', 'share_source', 'share_medium', 'share_token',
  'bbid', 'seid', 'unique_k', 'refer_flag', 'refer_from',
  'rt', 'ts', 'tt_from', 'is_copy_url', 'is_from_webapp',
  'tracking_id',
]);

function normalizePageKey(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.hash = '';

    // Strip "www." from the URL so that
    // www.youtube.com and youtube.com produce the same page key
    url.hostname = url.hostname.replace(/^www\./, '');
    const hostname = url.hostname;

    // Check if this is a known video domain
    const matchedDomain = Object.keys(VIDEO_DOMAIN_PARAMS).find(
      (d) => hostname === d || hostname.endsWith('.' + d)
    );

    if (matchedDomain) {
      // Normalize trailing slash on pathname
      url.pathname = url.pathname.replace(/\/+$/, '') || '/';
      // Whitelist: only keep allowed params
      const allowed = new Set(VIDEO_DOMAIN_PARAMS[matchedDomain]);
      const cleaned = new URLSearchParams();
      for (const [key, value] of url.searchParams) {
        if (allowed.has(key)) cleaned.set(key, value);
      }
      url.search = cleaned.toString();
    } else {
      // Blacklist: strip known tracking params
      const cleaned = new URLSearchParams();
      for (const [key, value] of url.searchParams) {
        const isTracking =
          TRACKING_PARAMS.has(key) ||
          TRACKING_PARAM_PREFIXES.some((p) => key.startsWith(p));
        if (!isTracking) cleaned.set(key, value);
      }
      url.search = cleaned.toString();
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

// ─── Storage ─────────────────────────────────────────────────────────

async function getGlobalSettings() {
  if (!contextValid()) return {};
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return data[SETTINGS_KEY] || {};
}

async function getGlobalDefaultRate() {
  const settings = await getGlobalSettings();
  const rate = settings.defaultRate;
  return (rate != null && Number.isFinite(Number(rate))) ? clampRate(rate) : HARDCODED_DEFAULT;
}

async function setGlobalDefaultRate(rate) {
  const safeRate = clampRate(rate);
  if (!contextValid()) return safeRate;
  const settings = await getGlobalSettings();
  settings.defaultRate = safeRate;
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  globalDefaultRate = safeRate;
  return safeRate;
}

async function getRatesMap() {
  if (!contextValid()) return {};
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || {};
}

async function getRateForCurrentPage() {
  const rates = await getRatesMap();
  const entry = rates[currentPageKey];
  if (entry != null) {
    return clampRate(entry?.rate ?? entry);
  }
  // No per-page entry — fall back to global default
  return await getGlobalDefaultRate();
}

/**
 * Persist rate for the current page.
 * - If rate equals the global default, delete the entry.
 * - Each entry stores { rate, ts } to support LRU eviction.
 */
async function setRateForCurrentPage(rate) {
  const safeRate = clampRate(rate);
  if (!contextValid()) return safeRate;
  const rates = await getRatesMap();

  if (Math.abs(safeRate - globalDefaultRate) < 0.001) {
    delete rates[currentPageKey];
  } else {
    rates[currentPageKey] = { rate: safeRate, ts: Date.now() };
  }

  pruneOldEntries(rates);
  await chrome.storage.local.set({ [STORAGE_KEY]: rates });
  desiredRate = safeRate;
  applyRateToAllVideos();
  updateBadge(safeRate);
  return safeRate;
}

async function resetRateForCurrentPage() {
  if (!contextValid()) return globalDefaultRate;
  const rates = await getRatesMap();
  delete rates[currentPageKey];
  await chrome.storage.local.set({ [STORAGE_KEY]: rates });
  desiredRate = globalDefaultRate;
  applyRateToAllVideos();
  updateBadge(desiredRate);
  return desiredRate;
}

function pruneOldEntries(rates) {
  const keys = Object.keys(rates);
  if (keys.length <= MAX_STORED_PAGES) return;

  const sorted = keys
    .map((k) => ({ key: k, ts: rates[k]?.ts ?? 0 }))
    .sort((a, b) => a.ts - b.ts);

  const toRemove = sorted.length - MAX_STORED_PAGES;
  for (let i = 0; i < toRemove; i++) {
    delete rates[sorted[i].key];
  }
}

// ─── Badge ───────────────────────────────────────────────────────────

function updateBadge(rate) {
  const text = Math.abs(rate - globalDefaultRate) < 0.001 && Math.abs(rate - HARDCODED_DEFAULT) < 0.001
    ? ''
    : rate.toFixed(2);
  try {
    chrome.runtime.sendMessage({ type: '__BADGE__', text });
  } catch {
    // content script context may have been invalidated
  }
}

// ─── OSD Toast ───────────────────────────────────────────────────────

let osdEl = null;
let osdTimer = null;

function showOSD(text) {
  if (!osdEl) {
    osdEl = document.createElement('div');
    osdEl.id = '__pvs_osd__';
    Object.assign(osdEl.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      padding: '8px 18px',
      borderRadius: '8px',
      background: 'rgba(0,0,0,0.75)',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '18px',
      fontWeight: '600',
      letterSpacing: '0.5px',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
    });
    document.documentElement.appendChild(osdEl);
  }
  osdEl.textContent = text;
  osdEl.style.opacity = '1';

  clearTimeout(osdTimer);
  osdTimer = setTimeout(() => {
    if (osdEl) osdEl.style.opacity = '0';
  }, 1200);
}

// ─── Video rate control ──────────────────────────────────────────────
// Extension is the sole authority on playback speed.
// No bidirectional sync with YouTube/site player — this avoids all
// race conditions where YouTube resets speed back to 1.0.
// A periodic enforcement loop re-applies our rate every 500ms.

function getAllVideos() {
  const videos = Array.from(document.querySelectorAll('video'));
  // Also search inside open Shadow DOMs
  walkShadowRoots(document.documentElement, videos);
  return videos;
}

function walkShadowRoots(root, out) {
  if (!root) return;
  const children = root.querySelectorAll('*');
  for (const el of children) {
    if (el.shadowRoot) {
      const shadowVideos = el.shadowRoot.querySelectorAll('video');
      for (const v of shadowVideos) out.push(v);
      walkShadowRoots(el.shadowRoot, out);
    }
  }
}

function applyRate(video) {
  if (!(video instanceof HTMLMediaElement)) return;
  const safeRate = clampRate(desiredRate);
  if (Math.abs(video.playbackRate - safeRate) < 0.001) return;
  video.playbackRate = safeRate;
}

function bindVideo(video) {
  if (observedVideos.has(video)) {
    applyRate(video);
    return;
  }

  observedVideos.add(video);

  // Re-apply our rate whenever the video reloads or starts playing
  const sync = () => applyRate(video);
  video.addEventListener('loadedmetadata', sync, { passive: true });
  video.addEventListener('play', sync, { passive: true });
  video.addEventListener('emptied', sync, { passive: true });
  video.addEventListener('ratechange', sync, { passive: true });

  applyRate(video);
}

function applyRateToAllVideos() {
  for (const video of getAllVideos()) {
    bindVideo(video);
  }
}

function scheduleApply() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(applyRateToAllVideos, 80);
}


// ─── URL change detection (polling-based) ────────────────────────────
// Content scripts run in an isolated world, so monkey-patching
// history.pushState / replaceState does NOT intercept calls from
// the page's main world.  Use polling + popstate instead.

let lastKnownHref = location.href;

async function refreshForCurrentUrl() {
  if (!contextValid()) { clearInterval(urlPollTimer); return; }
  currentUrl = location.href;
  currentPageKey = normalizePageKey(currentUrl);
  desiredRate = await getRateForCurrentPage();
  applyRateToAllVideos();
  updateBadge(desiredRate);
}

function watchUrlChanges() {
  // popstate still fires in the isolated world for back/forward nav
  window.addEventListener('popstate', () => refreshForCurrentUrl());

  // Poll for SPA-style navigations (pushState / replaceState)
  urlPollTimer = setInterval(() => {
    if (location.href !== lastKnownHref) {
      lastKnownHref = location.href;
      refreshForCurrentUrl();
    }
  }, 300);
}

// ─── DOM Observer (only react to video-related mutations) ─────────────

function containsVideoElement(node) {
  if (!(node instanceof HTMLElement)) return false;
  if (node.nodeName === 'VIDEO') return true;
  return node.querySelector?.('video') !== null;
}

function startDomObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (containsVideoElement(node)) {
          scheduleApply();
          return;
        }
      }
    }
  });

  observer.observe(document.documentElement || document, {
    childList: true,
    subtree: true
  });
}

// ─── Messaging (popup <-> content / background -> content) ───────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || typeof message !== 'object') {
      sendResponse({ ok: false, error: 'Invalid message' });
      return;
    }

    if (message.type === 'GET_STATE') {
      sendResponse({
        ok: true,
        url: currentUrl,
        pageKey: currentPageKey,
        rate: desiredRate,
        videoCount: getAllVideos().length,
        supported: true
      });
      return;
    }

    if (message.type === 'SET_RATE') {
      const savedRate = await setRateForCurrentPage(message.rate);
      sendResponse({ ok: true, rate: savedRate, videoCount: getAllVideos().length });
      return;
    }

    if (message.type === 'RESET_RATE') {
      const savedRate = await resetRateForCurrentPage();
      sendResponse({ ok: true, rate: savedRate, videoCount: getAllVideos().length });
      return;
    }

    if (message.type === 'SPEED_UP') {
      const newRate = await setRateForCurrentPage(desiredRate + 0.1);
      showOSD(`${newRate.toFixed(2)}x`);
      sendResponse({ ok: true, rate: newRate, videoCount: getAllVideos().length });
      return;
    }

    if (message.type === 'SPEED_DOWN') {
      const newRate = await setRateForCurrentPage(desiredRate - 0.1);
      showOSD(`${newRate.toFixed(2)}x`);
      sendResponse({ ok: true, rate: newRate, videoCount: getAllVideos().length });
      return;
    }

    if (message.type === 'GET_SETTINGS') {
      sendResponse({ ok: true, defaultRate: globalDefaultRate });
      return;
    }

    if (message.type === 'SET_SETTINGS') {
      const newDefault = await setGlobalDefaultRate(message.defaultRate);
      sendResponse({ ok: true, defaultRate: newDefault });
      return;
    }

    sendResponse({ ok: false, error: 'Unknown action' });
  })().catch((error) => {
    sendResponse({ ok: false, error: error?.message || String(error) });
  });

  return true;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !contextValid()) return;

  if (changes[SETTINGS_KEY]) {
    const newSettings = changes[SETTINGS_KEY].newValue || {};
    globalDefaultRate = clampRate(newSettings.defaultRate ?? HARDCODED_DEFAULT);
    if (!changes[STORAGE_KEY]) {
      getRateForCurrentPage()
        .then((rate) => {
          desiredRate = rate;
          applyRateToAllVideos();
          updateBadge(desiredRate);
        })
        .catch(() => {});
    }
  }

  if (changes[STORAGE_KEY]) {
    const map = changes[STORAGE_KEY].newValue || {};
    const entry = map[currentPageKey];
    desiredRate = entry != null
      ? clampRate(entry?.rate ?? entry)
      : globalDefaultRate;
    applyRateToAllVideos();
    updateBadge(desiredRate);
  }
});

// ─── Init ────────────────────────────────────────────────────────────

(async function init() {
  currentPageKey = normalizePageKey(currentUrl);
  globalDefaultRate = await getGlobalDefaultRate();
  desiredRate = await getRateForCurrentPage();
  applyRateToAllVideos();
  startDomObserver();
  watchUrlChanges();
  updateBadge(desiredRate);
})();
