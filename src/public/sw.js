const CACHE_NAME = 'eventz-v1';
const RUNTIME_CACHE = 'eventz-runtime';

// Assets to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Bypass non-GET requests (e.g., POST to APIs/functions)
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Bypass API and Edge Functions calls to avoid caching/interference
  if (event.request.url.includes('/api/') || event.request.url.includes('/functions/v1/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response and update cache in background
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(event.request, response.clone());
              });
            }
          })
          .catch(() => {
            // Network failed, cached response is all we have
          });
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache if not a success response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the fetched response
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Network request failed, return offline page if available
          return caches.match('/').then((response) => {
            return response || new Response('Offline - Please check your connection');
          });
        });
    })
  );
});

// Background sync event (for offline functionality)
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync');
  if (event.tag === 'sync-events') {
    event.waitUntil(
      // Sync data when back online
      fetch('/api/sync')
        .then((response) => response.json())
        .then((data) => {
          console.log('[ServiceWorker] Synced:', data);
        })
        .catch((error) => {
          console.log('[ServiceWorker] Sync failed:', error);
        })
    );
  }
});
