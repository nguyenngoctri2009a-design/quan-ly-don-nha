// Service Worker cho PWA "Thống Kê Nhập Nhà" - Crew Lưới Búa
const CACHE_NAME = 'tknn-pwa-v20261031_03';
const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './css/style.css',
  './manifest.json',
  './favicon.svg',
  './og-image.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/login-bg.png',
  './icons/brand-logo.png',
  './js/highcharts.js',
  './js/worker-calc.js',
  './js/code-shield.js',
  './js/custom-modal.js',
  './js/machine-security.js',
  './js/app.bundle.js',
  './js/admin.bundle.js'
];

// 1. Cài đặt Service Worker và lưu cache các tài nguyên tĩnh
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
});

// 2. Kích hoạt và dọn dẹp cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Xử lý Fetch: Bỏ qua Firebase realtime & API ngoại bộ để luôn cập nhật tức thì
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Không cache API / Firebase realtime database / IP checking
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebasedatabase.app') ||
    url.pathname.startsWith('/api/') ||
    req.method !== 'GET'
  ) {
    return;
  }

  // Network First, Fallback to Cache
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
