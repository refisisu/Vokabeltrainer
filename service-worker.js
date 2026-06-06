const CACHE_NAME = "vt-cache-v12";

// Nur wirklich statische Assets (Fonts, Icons) → Cache-First
const STATIC_ASSETS = [
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./assets/0b387a4a-be3f-40c0-8c7d-9666f9956723",
  "./assets/16fc9cff-c18a-457e-8bd4-8066bf3491fa",
  "./assets/5664187e-d766-461a-bacf-8e274a38971b",
  "./assets/6172289a-3ca5-41cc-9441-8572cea7fe1b",
  "./assets/8ea98a70-ee1c-49c8-b7e0-91fe06152229",
  "./assets/9120af98-5c2d-40fb-baaa-d4158ae8ab1b",
  "./assets/a5ade94d-13ea-4c26-9ff9-03a58056eeca",
  "./assets/bcf122b0-e4f4-46b7-a346-3d55c105ad72",
  "./assets/c4aa05dc-9dc9-40d0-aed7-48fcb7ad681c",
  "./assets/ff32f234-5c11-4968-a320-9c2ebfe0c251",
];

// HTML, JSX und versionierte Assets → Network-First (ändern sich bei Deploys)
function isNetworkFirst(url) {
  try {
    const { pathname, search } = new URL(url);
    if (pathname.endsWith("/") || pathname.endsWith(".html")) return true;
    if (pathname.endsWith(".jsx") || pathname.endsWith(".js")) return true;
    if (search.includes("v=")) return true;
    return false;
  } catch { return false; }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (isNetworkFirst(event.request.url)) {
    // Network-First: immer frisch vom Server, Cache als Fallback (offline)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-First: Fonts und Icons ändern sich nie
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
