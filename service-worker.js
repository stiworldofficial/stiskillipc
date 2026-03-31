const APP_NAME = "stiskilli";
const CACHE_VERSION = "v3";
const STATIC_CACHE = `${APP_NAME}-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `${APP_NAME}-dynamic-${CACHE_VERSION}`;

// ✅ Pre-cache essential files
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/main.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// 🔥 INSTALL
self.addEventListener("install", event => {
  console.log("STISKILLI SW Installed v3");

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 🔥 ACTIVATE (delete old cache)
self.addEventListener("activate", event => {
  console.log("STISKILLI SW Activated");

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (!key.includes(CACHE_VERSION)) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  return self.clients.claim();
});

// 🔥 FETCH (SMART PRO STRATEGY)
self.addEventListener("fetch", event => {
  const req = event.request;

  // ❌ skip non-http requests
  if (!req.url.startsWith("http")) return;

  // ✅ HTML → Network First (latest content)
  if (req.headers.get("accept").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }

  // ✅ CSS & JS → Cache First (fast load)
  else if (
    req.destination === "style" ||
    req.destination === "script"
  ) {
    event.respondWith(
      caches.match(req).then(cacheRes => {
        return cacheRes || fetch(req).then(fetchRes => {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(req, fetchRes.clone());
            return fetchRes;
          });
        });
      })
    );
  }

  // ✅ Images → Cache + fallback
  else if (req.destination === "image") {
    event.respondWith(
      caches.match(req).then(cacheRes => {
        return cacheRes || fetch(req).then(fetchRes => {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(req, fetchRes.clone());
            return fetchRes;
          });
        }).catch(() => caches.match("/icon-192.png"));
      })
    );
  }

  // ✅ Default fallback
  else {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
  }
});
