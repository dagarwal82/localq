/* Enhanced service worker for SpaceVox PWA (update + message handling) */
const SW_VERSION = 'v2';
const CORE_CACHE = `core-${SW_VERSION}`;
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

// On install: pre-cache core assets but DO NOT skipWaiting; allow client to decide when to activate new version.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CORE_CACHE).then(cache => cache.addAll(CORE_ASSETS))
  );
});

// Activate old cache cleanup; claim only after explicit skipWaiting (to avoid surprise reloads)
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('core-') && k !== CORE_CACHE).map(k => caches.delete(k)));
      // Ensure the active service worker takes control immediately
      await self.clients.claim();
    })()
  );
});

// Listen for client message requesting immediate activation.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting().then(() => self.clients.claim());
  }
});

// Fetch handler: navigation network-first, asset cache-first, bypass analytics
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  // Bypass analytics and non-GET
  if (request.method !== 'GET' || /googletagmanager/.test(url.hostname)) return;
  // Network first for navigation requests (SPA shell fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // Cache-first for same-origin static assets
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(resp => {
        const copy = resp.clone();
        // Only cache successful basic responses
        if (resp.ok && resp.type === 'basic') {
          caches.open(CORE_CACHE).then(cache => cache.put(request, copy));
        }
        return resp;
      }).catch(() => cached))
    );
  }
});
