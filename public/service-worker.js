// Service worker for caching critical resources
const CACHE_NAME = 'clever-dog-cache-v1';
const HERO_IMAGES = [
  '/assets/images/heroweb-small.webp',
  '/assets/images/heroweb-medium.webp', 
  '/assets/images/heroweb-large.webp'
];

// Install the service worker and cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service worker installed');
        return cache.addAll(HERO_IMAGES);
      })
  );
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (CACHE_NAME !== cacheName) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
});

// Network-first strategy for images
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // If the request is for a hero image, try to serve it from the cache first
  if (HERO_IMAGES.some(img => requestUrl.pathname.includes(img))) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request).then((fetchResponse) => {
            // Add the network response to the cache for future use
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, fetchResponse.clone());
            });
            return fetchResponse;
          });
        })
    );
  }
}); 