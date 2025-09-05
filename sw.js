const CACHE_NAME = 'emoji-cipher-pro-cache-v3';
const urlsToCache = [
  '/',
  'index.html',
  'manifest.json',
  'assets/css/app.css',
  'assets/js/bundle.js',
  'assets/fonts/fa-brands-400.woff2',
  'assets/fonts/fa-regular-400.woff2',
  'assets/fonts/fa-solid-900.woff2',
  'assets/icons/icon-128x128.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Use a network-first strategy for the main HTML file.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // For other requests, use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
