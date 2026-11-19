// Guarda a ficha no aparelho para abrir rápido e funcionar sem internet.
const CACHE = "aion-v1";
const SHELL = ["./", "./index.html", "./db.js", "./firebase-config.js", "./manifest.webmanifest", "./seed.json",
  "./assets/aion-portrait.webp", "./assets/apple-touch-icon.png", "./assets/icon-192.png", "./assets/icon-512.png",
  "./assets/ritual-amaldicoar.webp", "./assets/ritual-cicatrizacao.webp", "./assets/ritual-decadencia.webp", "./assets/ritual-definhar.webp", "./assets/ritual-perturbacao.webp"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  const own = url.origin === location.origin;
  const lib = url.hostname === "www.gstatic.com" || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!own && !lib) return; // Firestore e login passam direto
  // Rede primeiro para os arquivos do app (pega atualizações), cache quando estiver offline.
  e.respondWith(fetch(req).then(res => { if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === "navigate" ? caches.match("./index.html") : undefined))));
});
