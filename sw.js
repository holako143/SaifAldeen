// =================================================================================================
//                                    SERVICE WORKER
// =================================================================================================
// This service worker enables offline functionality for the Shafresh application.
// It caches all the necessary application assets.

const CACHE_NAME = 'shafresh-cache-v2.2'; // Increment version to force update

// List of all local files that need to be cached for the app to work offline.
// CDN resources are cached dynamically by the fetch handler.
const urlsToCache = [
    'index.html',
    'manifest.json',

    // CSS
    'assets/css/app.css',

    // Fonts
    'assets/fonts/fa-solid-900.woff2',
    'assets/fonts/fa-regular-400.woff2',
    'assets/fonts/fa-brands-400.woff2',

    // Icons
    'assets/icons/icon-192x192.png',
    'assets/icons/icon-512x512.png',

    // JavaScript Libraries (local)
    'assets/js/libs/argon2-bundled.min.js',

    // JavaScript Application Modules
    'assets/js/state.js',
    'assets/js/storage.js',
    'assets/js/crypto.js',
    'assets/js/ui.js',
    'assets/js/history.js',
    'assets/js/char-management.js',
    'assets/js/qr.js',
    'assets/js/actions.js',
    'assets/js/app.js',
    'assets/js/crypto-worker.js'
];

// --- Installation Event ---
// This event is triggered when the service worker is first installed.
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing...');
    // waitUntil() ensures that the service worker will not install until the code inside has successfully completed.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell');
                // Add all the specified assets to the cache.
                // fetch() is called for each URL, and the response is added to the cache.
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('[Service Worker] Failed to cache app shell:', error);
            })
    );
});

// --- Activation Event ---
// This event is triggered when the service worker is activated.
// It's a good place to manage old caches.
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // If a cache's name is not the current CACHE_NAME, delete it.
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// --- Fetch Event ---
// This event is triggered for every network request made by the page.
self.addEventListener('fetch', event => {
    // We only want to intercept GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    // For requests to external resources (like CDNs), use a "stale-while-revalidate" strategy.
    if (event.request.url.startsWith('https://')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return fetch(event.request).then(networkResponse => {
                    // If we get a valid response, cache it.
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // If the network fails, try to serve from cache.
                    return cache.match(event.request);
                });
            })
        );
    } else {
        // For local assets, use a "cache-first" strategy.
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // If the request is in the cache, return the cached response.
                    // Otherwise, fetch it from the network (and it will be cached by the install event).
                    return response || fetch(event.request);
                })
        );
    }
});
