/* eslint-disable no-restricted-globals */
//
// Hand-written offline-shell service worker for the Treasury PWA.
//
// Why hand-written: Next.js builds with Turbopack, and @ducanh2912/next-pwa is a webpack plugin —
// it does not run under Turbopack, so the file this replaced was a STALE, one-off generated
// precache manifest from a past webpack build (hardcoded old chunk hashes, workbox bootstrap
// importScripts) that never got regenerated on subsequent Turbopack builds (next.config.ts now
// disables the plugin entirely; see comment there). This static file is served at /sw.js
// (public/ assets bypass app routing) and gives the app a real offline shell (a reload mid-outage
// still boots into the shared OfflineBar's "Offline mode" banner instead of a blank/broken page)
// — treasury has no offline mutation queue, so this is display-only, not a sync engine (contrast
// pos-ui's sw.js, which also bridges Background Sync for its offline order queue).
//
// Strategy:
//   - navigations (document): network-first, cached-document fallback so a reload while offline
//     still paints something instead of the browser's own offline error page.
//   - /_next/static + assets: cache-first (immutable, content-hashed).
//   - /api + cross-origin: network-only (never cache API responses — a stale cached response
//     right after a mutation would show wrong data).

const VERSION = 'tsy-sw-v1';
const DOC_CACHE = `${VERSION}-documents`;
const ASSET_CACHE = `${VERSION}-assets`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Lets the shared PwaUpdater activate a waiting worker immediately on the user's "Update now" tap.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(DOC_CACHE);
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.status === 200 && fresh.type === 'basic') cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await cache.match(request, { ignoreSearch: true });
          if (cached) return cached;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:system-ui;padding:2rem">Offline — reopen when connection returns.</body>',
            { headers: { 'Content-Type': 'text/html' }, status: 200 },
          );
        }
      })(),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.status === 200) cache.put(request, fresh.clone());
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
  }
});
