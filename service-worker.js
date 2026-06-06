const CACHE_NAME = "vt-cache-v7";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./assets/0b387a4a-be3f-40c0-8c7d-9666f9956723",
  "./assets/16fc9cff-c18a-457e-8bd4-8066bf3491fa",
  "./assets/30532858-fb92-4b30-8014-b32b8d5ffa47",
  "./assets/3b6407df-8e42-4eb2-91a2-4bdad3b47644",
  "./assets/5664187e-d766-461a-bacf-8e274a38971b",
  "./assets/6172289a-3ca5-41cc-9441-8572cea7fe1b",
  "./assets/7413890e-94cb-4e7a-8761-7b335a6d6f57?v=7",
  "./assets/8ea98a70-ee1c-49c8-b7e0-91fe06152229",
  "./assets/9120af98-5c2d-40fb-baaa-d4158ae8ab1b",
  "./assets/a5ade94d-13ea-4c26-9ff9-03a58056eeca",
  "./assets/bcf122b0-e4f4-46b7-a346-3d55c105ad72",
  "./assets/c4aa05dc-9dc9-40d0-aed7-48fcb7ad681c",
  "./assets/e0b7baf2-1619-4805-ad9b-d1c34bfc3e20",
  "./assets/e27148f1-1cce-4d1c-96c3-ddb0157e0253",
  "./assets/ff32f234-5c11-4968-a320-9c2ebfe0c251"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
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
