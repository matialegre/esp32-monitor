self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('push', event => {
  const data = event.data.json();
  const title = data.title || 'Alerta ESP Monitor';
  const opts = {
    body: data.message,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
