const CACHE_NAME = 'eventz-v2';
const RUNTIME_CACHE = 'eventz-runtime-v2';

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

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // 1. Navigation Requests (HTML pages) - Network First, Fallback to Cache
  // This ensures users always get the latest version of the app shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          
          // Cache the latest version
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(event.request).then((response) => {
            return response || caches.match('/'); // Fallback to root if specific page fails
          });
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, Images) - Stale-While-Revalidate
  // Serve from cache immediately for speed, then update in background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response immediately
        // Update cache in background
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(event.request, response.clone());
              });
            }
          })
          .catch(() => {
            // Network failed, nothing to update
          });
          
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Network request failed
          if (event.request.headers.get('accept').includes('image')) {
            // Could return a placeholder image here
          }
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
