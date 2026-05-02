/* Change App · Push Service Worker · robust for GitHub Pages */
let messaging = null;
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');
  firebase.initializeApp({
    apiKey: "AIzaSyC3lpaM1z2YwgaevCxE1bMM1hUnW96PwOo",
    authDomain: "meine-app-4ea9e.firebaseapp.com",
    projectId: "meine-app-4ea9e",
    storageBucket: "meine-app-4ea9e.firebasestorage.app",
    messagingSenderId: "999970371988",
    appId: "1:999970371988:web:a99a37aea79ea39fdd3781",
    measurementId: "G-RQJ500HHN5"
  });
  messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const data = payload.data || {};
    self.registration.showNotification(notification.title || data.title || 'Change', {
      body: notification.body || data.body || 'Neue Benachrichtigung',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || 'change-push',
      renotify: true,
      data: { url: data.url || './' },
      actions: [{ action: 'open', title: 'Öffnen' }]
    });
  });
} catch (err) {
  console.warn('Firebase Messaging im Service Worker nicht verfügbar:', err);
}

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = {}; }
  const n = data.notification || data.data || data || {};
  event.waitUntil(self.registration.showNotification(n.title || 'Change', {
    body: n.body || 'Neue Benachrichtigung',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: n.tag || 'change-push',
    data: { url: n.url || './' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification && event.notification.data && event.notification.data.url || './';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
    }
    return clients.openWindow ? clients.openWindow(url) : undefined;
  }));
});
