// Service worker : garde l'application et les modèles en cache pour un usage hors ligne.
// Pages : réseau d'abord (pour recevoir les mises à jour). Le reste : cache d'abord.
const CACHE = "anatomie-3d-v4";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "manifest.webmanifest", "icone.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("message", (e) => {
  if (e.data?.type !== "mettre-en-cache") return;
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        e.data.urls.map((u) =>
          c.match(u, { ignoreVary: true }).then((deja) => deja || fetch(u).then((r) => r.ok && c.put(u, r)).catch(() => {}))
        )
      )
    )
  );
});

self.addEventListener("fetch", (e) => {
  const requete = e.request;
  if (requete.method !== "GET" || new URL(requete.url).origin !== location.origin) return;
  const estPage = requete.mode === "navigate";
  const estDonnee = requete.url.includes("/donnees/");
  if (estPage || estDonnee) {
    e.respondWith(
      fetch(requete)
        .then((r) => {
          const copie = r.clone();
          caches.open(CACHE).then((c) => c.put(requete, copie));
          return r;
        })
        .catch(() => caches.match(requete, { ignoreVary: true }))
    );
    return;
  }
  e.respondWith(
    caches.match(requete, { ignoreVary: true }).then(
      (trouve) =>
        trouve ||
        fetch(requete).then((r) => {
          if (r.ok) {
            const copie = r.clone();
            caches.open(CACHE).then((c) => c.put(requete, copie));
          }
          return r;
        })
    )
  );
});
