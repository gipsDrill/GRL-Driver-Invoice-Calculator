const CACHE_NAME = "grl-invoice-static-v2";
const SCOPE_URL = self.registration.scope;
const scopedUrl = (path = "") => new URL(path, SCOPE_URL).toString();
const APP_SHELL = [
  "",
  "manifest.webmanifest",
  "favicon.svg",
  "mobile-polish.css",
  "install-shortcut.js",
  "icons/grl-app-192.png",
  "icons/grl-app-512.png",
  "icons/apple-touch-icon.png",
  "PDF_baza.pdf",
].map(scopedUrl);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(SCOPE_URL, copy));
          return response;
        })
        .catch(() => caches.match(SCOPE_URL)),
    );
    return;
  }

  const cacheableDestination = ["style", "script", "worker", "font", "image"].includes(
    request.destination,
  );
  const cacheableFile =
    request.url === scopedUrl("PDF_baza.pdf") ||
    request.url === scopedUrl("manifest.webmanifest");
  if (!cacheableDestination && !cacheableFile) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
