const CACHE = 'potager-fontlaure-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/sync.js',
  './manifest.webmanifest',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Cache-first pour les fichiers de l'app ; réseau direct pour l'API GitHub.
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('api.github.com')) return;
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});
