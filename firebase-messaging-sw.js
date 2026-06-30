/* Change App · Firebase Messaging Service Worker */

// Firebase SDK via importScripts – bei Netzwerkfehler wird der SW weiter registriert,
// Push-Benachrichtigungen im Hintergrund sind dann jedoch nicht verfügbar.
let messagingReady = false;
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');
  messagingReady = true;
} catch(e) {
  console.warn('[Change SW] Firebase SDK konnte nicht geladen werden:', e);
}

// Identische Config wie firebase-config.js
if(messagingReady) {
  firebase.initializeApp({
    apiKey:            "AIzaSyC3lpaM1z2YwgaevCxE1bMM1hUnW96PwOo",
    authDomain:        "meine-app-4ea9e.firebaseapp.com",
    projectId:         "meine-app-4ea9e",
    storageBucket:     "meine-app-4ea9e.firebasestorage.app",
    messagingSenderId: "999970371988",
    appId:             "1:999970371988:web:a99a37aea79ea39fdd3781"
  });

  const messaging = firebase.messaging();

  // Hinweis: Die Anzeige laeuft jetzt ueber den nativen 'push'-Handler weiter unten,
  // damit Benachrichtigungen auch dann erscheinen, wenn das Firebase-SDK im
  // Service Worker nicht laedt. onBackgroundMessage wird daher NICHT registriert
  // (sonst gaebe es Doppel-Anzeigen).
}

// Eigener Push-Handler: zeigt Benachrichtigungen unabhaengig vom Firebase-SDK an.
// Der Worker schickt ein reines data-Paket mit title/body/url/tag.
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try { payload = event.data.json(); }
    catch (e) {
      try { payload = { data: { body: event.data.text() } }; } catch (_) { payload = {}; }
    }
  }
  const d = payload.data || {};
  const n = payload.notification || {};
  const title = d.title || n.title || 'Change';
  const body  = d.body  || n.body  || 'Neue Benachrichtigung';
  const url   = d.url   || (payload.fcmOptions && payload.fcmOptions.link) || './';
  const tag   = d.tag   || 'change-push';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:     './icons/icon-change-192.png',
      badge:    './icons/icon-change-192.png',
      tag,
      renotify: true,
      vibrate:  [200, 100, 200],
      data:     { url }
    })
  );
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
