// sw.js - Service Worker para o BoiUni (Suporte PWA Offline)

const CACHE_NAME = 'boiuni-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './db.js',
  './ui.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Instalação do Service Worker e Caching de Ativos Estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cache inicial aberto e populado.');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação e Limpeza de Caches Antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de Requisições (Estratégia Cache First com Fallback de Rede)
self.addEventListener('fetch', (event) => {
  // Ignora requisições de esquemas não suportados (ex: chrome-extension, file)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Retorna o item do cache
          return cachedResponse;
        }

        // Se não estiver no cache, busca na rede
        return fetch(event.request).then((networkResponse) => {
          // Verifica resposta válida
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Salva no cache dinamicamente para futuros acessos
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // Trata falha de rede (ex: offline e recurso não cacheado)
          const acceptHeader = event.request.headers.get('accept');
          if (acceptHeader && acceptHeader.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
