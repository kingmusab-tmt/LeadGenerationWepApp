const STATIC_CACHE = "brixcot-static-v1";
const RUNTIME_CACHE = "brixcot-runtime-v1";

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/manifest-icon-192.maskable.png",
  "/manifest-icon-512.maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(async (cache) => {
        // Do not fail SW install when one asset is missing.
        const results = await Promise.allSettled(
          STATIC_ASSETS.map(async (assetUrl) => {
            const response = await fetch(assetUrl, { cache: "no-store" });
            if (!response.ok) {
              throw new Error(`Precache failed for ${assetUrl}`);
            }

            await cache.put(assetUrl, response.clone());
          }),
        );

        results.forEach((result) => {
          if (result.status === "rejected") {
            console.warn("[sw]", result.reason);
          }
        });
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          const isCacheable =
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic";

          if (isCacheable) {
            const copy = networkResponse.clone();
            caches
              .open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => {
                // Skip cache write failures to avoid breaking responses.
              });
          }

          return networkResponse;
        })
        .catch(() => caches.match(request));
    }),
  );
});

self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || "/icon.png",
      badge: "/badge.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: "2",
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  //("Notification click received.");
  event.notification.close();
  const targetUrl = self.location.origin;
  event.waitUntil(clients.openWindow(targetUrl));
});
