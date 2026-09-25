// Service worker minimal : met en cache l'app shell pour un chargement
// hors-ligne des pages déjà visitées. Les données (posts) restent gérées
// par le cache localStorage côté page (voir src/app/feed/page.tsx).
const CACHE_NAME = "edutech-benin-shell-v1";
const APP_SHELL = [
  "/",
  "/feed",
  "/login",
  "/signup/famille",
  "/signup/etablissement",
  "/signup/structure",
  "/ecosystem",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ---- Notifications push ----
self.addEventListener("push", (event) => {
  let data = { title: "Écho", body: "Nouveau message." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // payload non-JSON : on garde le message par défaut
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/feed" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/feed";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
