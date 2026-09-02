const CACHE_NAME = 'habitrack-cache-v3';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Network-first strategy with safe response fallback
self.addEventListener('fetch', event => {
    // Only handle GET requests and skip API calls
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone).catch(() => {});
                    });
                }
                return networkResponse;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                if (event.request.url.includes('favicon.ico')) {
                    return new Response(null, { status: 204 });
                }
                return new Response('Network error', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' }
                });
            })
    );
});
