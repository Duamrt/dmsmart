// sw.js — Service Worker dmsmart
// Cache-first para o shell da aplicação
// Ao fazer deploy: incrementar CACHE_NAME para invalidar cache antigo

const CACHE_NAME = 'dmsmart-v04122300';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/config.json',
  '/manifest.json',
  '/css/dmsmart.css',
  '/css/zones.css',
  '/css/wizard.css',
  '/js/version.js',
  '/js/config-loader.js',
  '/js/installation-store.js',
  '/js/active-installation.js',
  '/js/zone-registry.js',
  '/js/state-store.js',
  '/js/ha-client.js',
  '/js/control-modal.js',
  '/js/ui-renderer.js',
  '/js/wizard.js',
  '/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: cacheia o shell inteiro
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: limpa caches antigos de versões anteriores
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: estratégia por tipo de recurso
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API do Home Assistant (porta 8123): NUNCA cachear — estado em tempo real
  if (url.port === '8123') return;

  // WebSocket: não interceptar
  if (e.request.url.startsWith('ws://') || e.request.url.startsWith('wss://')) return;

  // Supabase: network-first, fallback para cache
  if (url.hostname.includes('supabase')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Todos os outros assets (shell): cache-first
  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          // Só cacheia respostas válidas
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        });
      })
  );
});
