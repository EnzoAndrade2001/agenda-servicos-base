const CACHE_NAME = 'agenda-servicos-base-v4';
const STATIC_ASSETS = [
    '/',
    '/styles.css?v=19',
    '/servicos.js?v=27',
    '/app.js?v=22',
    '/custom-select.js?v=1',
    '/pwa-mode.js?v=3',
    '/manifest.webmanifest?v=6',
    '/manifest-admin.webmanifest?v=5',
    '/icon.svg?v=3',
    '/lookbook-1.svg?v=2',
    '/lookbook-2.svg?v=2',
    '/lookbook-3.svg?v=2'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api/')) return;
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('/'))
        );
        return;
    }
    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});
