// ============================================================
// SERVICE WORKER — Journal de Trading
// Cache le shell de l'app pour un chargement rapide et un usage
// hors-ligne partiel (la saisie reste possible, la synchro avec
// Firebase reprend automatiquement au retour du réseau).
// ============================================================
const CACHE_NAME = 'journal-trading-v5-firebase';
const SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ne jamais mettre en cache les appels Firebase (Auth, Firestore) :
  // toujours vouloir les données les plus fraîches (ou un vrai échec réseau explicite).
  if (
    request.url.includes('googleapis.com') ||
    request.url.includes('firebaseio.com') ||
    request.url.includes('firebaseapp.com') ||
    request.url.includes('gstatic.com/firebasejs')
  ) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
