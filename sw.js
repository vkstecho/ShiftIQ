/**
 * ShiftIQ — Service Worker
 *
 * Handles:
 *   • App installation (PWA + Play Store TWA)
 *   • Offline fallback (cached shell)
 *   • Asset caching with cache-busting on version bump
 *
 * Strategy:
 *   • App shell (index.html, manifest, icons) → cache-first
 *   • Firebase API calls → network only (never cache auth/data)
 *   • External CDN assets → stale-while-revalidate
 */

const SW_VERSION   = 'shiftiq-v0.1.0';
const STATIC_CACHE = `${SW_VERSION}-static`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

// Files cached on install — minimum app shell
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon192.png',
  './icon512.png'
];

// Domains that must NEVER be cached (auth, real-time data)
const NEVER_CACHE_DOMAINS = [
  'firebaseio.com',
  'firebasedatabase.app',
  'googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'google.com/recaptcha'
];

// External CDN domains — stale-while-revalidate
const RUNTIME_DOMAINS = [
  'gstatic.com',
  'cdnjs.cloudflare.com'
];

// ─────────────────────────────────────────────
// INSTALL — pre-cache app shell
// ─────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing', SW_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL).catch(err => {
        // Don't fail install if some files missing (e.g. icons not yet uploaded)
        console.warn('[SW] Some shell files not cached:', err.message);
        return Promise.resolve();
      }))
      .then(() => self.skipWaiting())
  );
});

// ─────────────────────────────────────────────
// ACTIVATE — clean up old caches
// ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating', SW_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => !key.startsWith(SW_VERSION))
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────
// FETCH — routing strategy
// ─────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;

  // Skip non-GET requests
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. NEVER cache Firebase / auth — always go to network
  if(NEVER_CACHE_DOMAINS.some(d => url.hostname.includes(d))){
    return; // let browser handle normally
  }

  // 2. App shell (same origin) → cache-first with network fallback
  if(url.origin === self.location.origin){
    event.respondWith(
      caches.match(req).then(cached => {
        if(cached) return cached;
        return fetch(req).then(res => {
          // Only cache successful HTML/JS/CSS/images
          if(res.ok && res.status === 200){
            const copy = res.clone();
            caches.open(STATIC_CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => {
          // Network failed → serve cached shell as fallback
          if(req.mode === 'navigate'){
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // 3. CDN assets → stale-while-revalidate
  if(RUNTIME_DOMAINS.some(d => url.hostname.includes(d))){
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const fetchPromise = fetch(req).then(networkRes => {
            if(networkRes.ok) cache.put(req, networkRes.clone());
            return networkRes;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Default: network-first, fall back to cache if offline
});

// ─────────────────────────────────────────────
// MESSAGE — for in-app SW control
// ─────────────────────────────────────────────
self.addEventListener('message', event => {
  if(event.data === 'SKIP_WAITING') self.skipWaiting();
  if(event.data === 'CLEAR_CACHE'){
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
});
