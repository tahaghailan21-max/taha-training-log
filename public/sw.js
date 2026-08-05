const CACHE = "tl-v3";

// Only pre-cache truly static assets — NOT HTML pages (they're server-rendered and dynamic)
const STATIC_ASSETS = [
  "/manifest.json",
];

// ── Install: pre-cache static assets ─────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
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

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET and cross-origin requests
  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // API calls: network only, never cache
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Static assets (_next/static, icons, manifest): cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/favicon.ico"
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML pages (/, /new, /login, /session/*): network-first so they always
  // reflect the latest server-rendered content. Fall back to cache if offline.
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Cache a fresh copy for offline fallback
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline — serve the cached version if we have one
        return caches.match(e.request).then(
          (cached) => cached ?? caches.match("/") ?? new Response("Offline", { status: 503 })
        );
      })
  );
});
