const STATIC_CACHE = 'eventz-static-v7';
const RUNTIME_CACHE = 'eventz-runtime-v7';
const IMAGE_CACHE = 'eventz-images-v7';
const IMAGE_CACHE_MAX = 200;
const CURRENT_CACHES = [STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE];

const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

const isCacheableResponse = (response) => {
  return !!response && (response.ok || response.type === 'opaque');
};

const isSameOriginRequest = (url) => url.origin === self.location.origin;
const isSupabaseStorageRequest = (url) => url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/');
const isWsrvRequest = (url) => url.hostname === 'wsrv.nl';
const isImageRequest = (request) => {
  const accept = request.headers.get('accept') || '';
  return request.destination === 'image' || accept.includes('image/');
};
const isBuildAssetRequest = (request, url) => {
  return request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'worker' ||
    request.destination === 'manifest' ||
    url.pathname.startsWith('/assets/') ||
    /\.(js|mjs|css)$/i.test(url.pathname);
};

const pruneImageCache = async () => {
  const cache = await caches.open(IMAGE_CACHE);
  const keys = await cache.keys();

  if (keys.length <= IMAGE_CACHE_MAX) return;

  await Promise.all(
    keys.slice(0, keys.length - IMAGE_CACHE_MAX).map((key) => cache.delete(key))
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_CACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('eventz-') && !CURRENT_CACHES.includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  const url = new URL(event.request.url);
  const isSameOrigin = isSameOriginRequest(url);
  const isRemoteImage = isSupabaseStorageRequest(url) || isWsrvRequest(url);
  const shouldHandleImage = isImageRequest(event.request) && (isSameOrigin || isRemoteImage);

  if (isSameOrigin && (url.pathname.includes('/api/') || url.pathname.includes('/functions/v1/'))) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (isCacheableResponse(response)) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((response) => response || caches.match('/')))
    );
    return;
  }

  if (shouldHandleImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;

        try {
          const response = await fetch(event.request);
          if (isCacheableResponse(response)) {
            cache.put(event.request, response.clone());
            void pruneImageCache();
          }
          return response;
        } catch {
          return new Response('', { status: 504, statusText: 'Image unavailable' });
        }
      })
    );
    return;
  }

  if (!isSameOrigin) return;

  if (isBuildAssetRequest(event.request, url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);

        try {
          const response = await fetch(event.request, { cache: 'no-store' });
          if (isCacheableResponse(response)) {
            cache.put(event.request, response.clone());
          }
          if (!response.ok && cachedResponse) return cachedResponse;
          return response;
        } catch {
          if (cachedResponse) return cachedResponse;
          return new Response('Offline - Please check your connection', { status: 503 });
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (isCacheableResponse(response)) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        });

      if (cachedResponse) {
        event.waitUntil(networkFetch.catch(() => undefined));
        return cachedResponse;
      }

      return networkFetch.catch(() => new Response('Offline - Please check your connection', { status: 503 }));
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-events') {
    event.waitUntil(
      fetch('/api/sync')
        .then((response) => response.json())
        .catch(() => undefined)
    );
  }
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'Eventz',
      body: event.data ? event.data.text() : 'You have a new update.',
    };
  }

  const title = payload.title || 'Eventz';
  const options = {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-96x96.png',
    data: {
      url: payload.url || '/',
      ...(payload.data || {}),
    },
    tag: payload.tag || undefined,
    renotify: Boolean(payload.renotify),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
