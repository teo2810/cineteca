/* Guscio della PWA. Non mette in cache schede, immagini TMDB né lo Sheet. */
const CACHE = "cineteca-shell-v16";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./posters/notte.jpg", "./posters/stazione.jpg", "./posters/cena.jpg", "./posters/marea.jpg", "./posters/lanterne.jpg", "./posters/piano.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isShell(pathname) {
  return (
    pathname.endsWith("/") ||
    pathname.endsWith("/index.html") ||
    pathname.endsWith("/manifest.webmanifest") ||
    pathname.endsWith("/icon-192.png") ||
    pathname.endsWith("/icon-512.png") ||
    pathname.includes("/posters/")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !isShell(url.pathname)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      const fresh = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);
      if (cached) return cached;
      return (await fresh) || (await cache.match("./index.html")) || Response.error();
    })()
  );
});
