/* Change App · Firebase Messaging Service Worker · GitHub Pages Fix */
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

// WICHTIG: Hier NICHT firebase-config.js importieren.
// In einem ServiceWorker gibt es kein window-Objekt. Genau das hat den Fehler
// "ServiceWorker script evaluation failed" ausgelöst.
firebase.initializeApp({
  apiKey: "AIzaSyC3lpaM1z2YwgaevCxE1bMM1hUnW96PwOo",
  authDomain: "meine-app-4ea9e.firebaseapp.com",
  projectId: "meine-app-4ea9e",
  storageBucket: "meine-app-4ea9e.firebasestorage.app",
  messagingSenderId: "999970371988",
  appId: "1:999970371988:web:a99a37aea79ea39fdd3781",
  measurementId: "G-RQJ500HHN5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'Change';
  const options = {
    body: notification.body || data.body || 'Neue Benachrichtigung',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'change-push',
    renotify: true,
    data: { url: data.url || './' },
    actions: [{ action: 'open', title: 'Öffnen' }]
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
