const CACHE_NAME = "rain-forecast-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-152x152.png",
  "/icons/icon-192x192.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png",
];

// Install service worker and cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache all URLs during install:', err);
      })
  );
});

// Activate service worker and clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return null; // Ensure all promises resolve
        }).filter(Boolean) // Remove null promises
      );
    })
  );
});

// Fetch resources from cache or network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can only be consumed once
        const fetchRequest = event.request.clone();

        // For API calls, try network first, then cache
        if (
          event.request.url.includes("api.tomorrow.io") ||
          event.request.url.includes("meteosource.com")
        ) {
          return fetch(fetchRequest)
            .then((response) => {
              // Check if we received a valid response
              if (
                !response ||
                response.status !== 200 ||
                response.type !== "basic"
              ) {
                return response;
              }

              // Clone the response because it's a stream and can only be consumed once
              const responseToCache = response.clone();

              caches.open(CACHE_NAME).then((cache) => {
                // Cache the response with a 5-minute expiration
                cache.put(event.request, responseToCache);
                //Extend cache expiration for 1 hour
                setTimeout(() => {
                  cache.delete(event.request);
                }, 60 * 60 * 1000); // 1 hour
              });

              return response;
            })
            .catch(() => {
              // If network fails, try to return cached response
              return caches.match(event.request);
            });
        }

        // For other resources, try network and cache the response
        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch(() => {
          return caches.match(event.request);
        });
      })
  );
});