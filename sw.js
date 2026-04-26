// DM Smart — Service Worker
// Cache-first pra assets estáticos, network-first pra HTML, fallback pra index.html offline
const CACHE = 'dmsmart-v04261703';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/dmsmart.css',
  '/css/alerts.css',
  '/css/auth.css',
  '/css/energy.css',
  '/css/floorplan.css',
  '/css/license.css',
  '/css/reports.css',
  '/css/scenes.css',
  '/css/white-label.css',
  '/css/wizard.css',
  '/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // addAll falha tudo se 1 asset 404 — usar add individual com catch
      Promise.all(ASSETS.map(url => c.add(url).catch(err => console.warn('[SW] skip', url, err.message))))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // DM Assistente (/dm.html e suas chamadas) — passa direto, sem cache.
  // Evita conflito entre SW do DM Smart e o app DM Assistente.
  const url = new URL(req.url);
  if (url.pathname === '/dm.html' || url.pathname.startsWith('/dm-')) {
    e.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // HTML: SEMPRE network-first com bypass de cache HTTP (-no-store).
  // Se a rede falhar, retorna o cache do MESMO req (sem fallback pra outra página).
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(r => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return r;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Assets (CSS/JS/img): cache-first com revalidação em background
  e.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req).then(r => {
        if (r.ok && new URL(req.url).origin === self.location.origin) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return r;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
