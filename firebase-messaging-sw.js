/* Change App · Push Service Worker · GitHub Pages safe */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) { payload = {}; }
  const data = payload.notification || payload.data || payload || {};
  event.waitUntil(self.registration.showNotification(data.title || 'Change', {
    body: data.body || 'Neue Benachrichtigung',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'change-push',
    renotify: true,
    data: { url: data.url || './' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
    }
    return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
  }));
});
