const CACHE = "tl-v2";

// App shell — all the pages and assets that make the app work offline
const APP_SHELL = [
  "/",
  "/new",
  "/login",
  "/manifest.json",
];

// ── Install: pre-cache the app shell ──────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for shell, network-first for API ───────────────────────
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET and cross-origin requests
  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // API calls: network first, no caching
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Everything else: cache first, fall back to network, then cache what we get
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // Cache successful responses for next time
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline and not in cache — return the home page as fallback
        return caches.match("/") ?? new Response("Offline", { status: 503 });
      });
    })
  );
});
