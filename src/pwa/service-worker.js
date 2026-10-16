/* global self, caches, fetch, URL, Response */
const APP_PATH = new URL(self.registration.scope).pathname;
const CACHE_PREFIX = `ege-static-${encodeURIComponent(APP_PATH)}-`;
const CACHE_NAME = `${CACHE_PREFIX}__BUILD_ID__`;
const INDEX_PATH = new URL('index.html', self.registration.scope).pathname;
const STATIC_URLS = /*__PRECACHE__*/ [];
const ALLOWED_PATHS = new Set(STATIC_URLS);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_URLS)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name !== CACHE_NAME &&
              (name.startsWith(CACHE_PREFIX) ||
                (APP_PATH === '/' && /^ege-static-[a-f0-9]{16}$/.test(name))),
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !ALLOWED_PATHS.has(url.pathname)
  )
    return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const response = await fetch(event.request);
          if (response.ok) return response;
          return (await cache.match(INDEX_PATH)) || response;
        } catch {
          return (
            (await cache.match(INDEX_PATH)) ||
            new Response('Откройте трекер с сетью для первой загрузки.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })(),
    );
  } else {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(url.pathname);
        if (cached) return cached;
        // Cache only build-time static paths. IndexedDB remains the source of user data.
        return fetch(event.request);
      })(),
    );
  }
});
