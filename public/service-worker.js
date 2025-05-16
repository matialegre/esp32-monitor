const CACHE_NAME = 'esp32-monitor-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Install event - cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, falling back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Push event - show notification
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('Error parsing push data:', e);
    data = { title: 'Nueva notificación', message: 'Tienes una nueva notificación' };
  }

  const title = data.title || 'Alerta ESP Monitor';
  const options = {
    body: data.message || 'Nueva actualización disponible',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: 'esp32-notification'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        // Check if there's already a window/tab open with the target URL
        const existingWindow = windowClients.find(
          client => client.url === urlToOpen && 'focus' in client
        );
        
        if (existingWindow) {
          // If window exists, focus it
          return existingWindow.focus();
        } else if (clients.openWindow) {
          // Open new window if none exists
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
