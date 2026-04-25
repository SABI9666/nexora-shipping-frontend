// Nexora Shipping service worker
// Strategy:
//   - HTML / navigation: network-first so every page load fetches the latest deploy
//     (this is what enables auto-update — when a new version ships, the next load gets it).
//   - Static hashed assets (Next.js JS/CSS): cache-first since filenames are content-hashed.
//   - API: never intercepted (always live network).
// When a new service-worker file is deployed, the browser detects the byte change,
// installs it in the background, and the client (PWAInstaller.tsx) prompts the user to reload.

const CACHE_NAME = 'nexora-shell-v2';
const SHELL_URLS = ['/', '/dashboard'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept the API — always live network
  if (url.pathname.startsWith('/api/')) return;

  // HTML navigation: network-first → cache fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Static same-origin assets: cache-first
  if (
    url.origin === self.location.origin &&
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        });
      })
    );
  }
});
