/* Change App · Firebase Messaging Service Worker */

// Firebase SDK MUSS im SW importiert werden – ohne das schlägt getToken() fehl
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

// Identische Config wie firebase-config.js
firebase.initializeApp({
  apiKey:            "AIzaSyC3lpaM1z2YwgaevCxE1bMM1hUnW96PwOo",
  authDomain:        "meine-app-4ea9e.firebaseapp.com",
  projectId:         "meine-app-4ea9e",
  storageBucket:     "meine-app-4ea9e.firebasestorage.app",
  messagingSenderId: "999970371988",
  appId:             "1:999970371988:web:a99a37aea79ea39fdd3781"
});

const messaging = firebase.messaging();

// Hintergrund-Nachrichten (App geschlossen oder im Hintergrund)
messaging.onBackgroundMessage((payload) => {
  const n     = payload.notification || {};
  const title = n.title || 'Change';
  const body  = n.body  || 'Neue Benachrichtigung';
  const url   = (payload.data && payload.data.url) || './';

  return self.registration.showNotification(title, {
    body,
    icon:     './icon-change-192.png',
    badge:    './icon-change-192.png',
    tag:      (payload.data && payload.data.tag) || 'change-push',
    renotify: true,
    vibrate:  [200, 100, 200],
    data:     { url }
  });
});

// Klick → App öffnen oder fokussieren
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    })
  );
});

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
