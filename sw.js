// Service Worker для Illusionist OS
// Версия: 7.0 (OFFLINE + FIREBASE SDK CACHE)
// Назначение: Обеспечивает работу без интернета
const CACHE_NAME = 'illusionist-calc-v9-firebase-sdk';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Firebase SDK — кешируем отдельно, чтобы работали в PWA
const FIREBASE_SDK_URLS = [
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Установка и кеширование...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Кеширование файлов');
      // Кешируем основные файлы + Firebase SDK
      return cache.addAll([...ASSETS_TO_CACHE, ...FIREBASE_SDK_URLS]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Активация...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Удаление старого кеша', key);
          return caches.delete(key);
        }
      }));
    })
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Firebase API запросы (RTDB, Auth) — всегда через сеть
  if (event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('firebaseapp.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  // Firebase SDK (gstatic.com/firebasejs) — кешируем, стратегия Cache First
  if (event.request.url.includes('gstatic.com/firebasejs')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          const clone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return fetchResponse;
        });
      })
    );
    return;
  }

  // Стратегия: Cache First, falling back to Network
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((response) => {
        return response || fetch(event.request).catch(() => {
          return caches.match('./index.html');
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

console.log('✅ Service Worker (Offline + Firebase SDK) запущен');
