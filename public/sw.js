/**
 * Self-destroying service worker (kill switch).
 *
 * An earlier PWA build of this app installed a Workbox service worker that
 * intercepts fetches — including cross-origin backend API calls — and, now that
 * the caching config is gone, fails them with `no-response` network errors that
 * surface in the browser as CORS failures. The current app ships NO service
 * worker, so those stale workers would otherwise stay installed in returning
 * users' browsers forever.
 *
 * This file exists solely to evict that ghost. Because a registration for
 * `/sw.js` already exists in affected browsers, the browser re-fetches this
 * script on its normal update check, sees it changed, and installs it. On
 * activation it clears all caches, unregisters itself, and reloads open pages
 * so they run service-worker-free from then on. Once every client has updated,
 * this file is inert and can be removed in a future release.
 */
self.addEventListener('install', () => {
  // Activate immediately instead of waiting for existing clients to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Drop every cache the old worker may have populated.
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));

        // Remove this (and thus the previous) service worker registration.
        await self.registration.unregister();

        // Reload any open tabs so they detach from the controlling worker.
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.navigate(client.url);
        }
      } catch (err) {
        // Best-effort cleanup — nothing more we can do from here.
      }
    })()
  );
});
