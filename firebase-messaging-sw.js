/* Change App · Firebase Messaging Service Worker
 * ─────────────────────────────────────────────
 * WICHTIG: importScripts darf den SW-Start nie blockieren.
 * Sofort skipWaiting + claim, Firebase wird danach asynchron geladen.
 */

// 1. Sofort installieren + aktivieren – unabhängig vom Firebase-Ladevorgang
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// 2. Klick auf Benachrichtigung → App öffnen
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

// 3. Firebase für Hintergrund-Push – optional, blockiert nie
(function initFirebaseMessaging() {
  // Mehrere CDN-Versionen als Fallback
  var versions = ['10.14.1', '10.13.2', '10.12.5'];
  var loaded = false;

  for (var i = 0; i < versions.length; i++) {
    try {
      var v = versions[i];
      importScripts(
        'https://www.gstatic.com/firebasejs/' + v + '/firebase-app-compat.js'
      );
      importScripts(
        'https://www.gstatic.com/firebasejs/' + v + '/firebase-messaging-compat.js'
      );
      loaded = true;
      break;
    } catch(e) {
      console.warn('[Change SW] Firebase ' + versions[i] + ' nicht geladen:', e.message);
    }
  }

  if (!loaded) {
    console.warn('[Change SW] Firebase Messaging nicht verfügbar – Push im Hintergrund deaktiviert.');
    return;
  }

  try {
    if (!self.firebase || !self.firebase.apps || !self.firebase.apps.length) {
      firebase.initializeApp({
        apiKey:            "AIzaSyC3lpaM1z2YwgaevCxE1bMM1hUnW96PwOo",
        authDomain:        "meine-app-4ea9e.firebaseapp.com",
        projectId:         "meine-app-4ea9e",
        storageBucket:     "meine-app-4ea9e.firebasestorage.app",
        messagingSenderId: "999970371988",
        appId:             "1:999970371988:web:a99a37aea79ea39fdd3781"
      });
    }

    const messaging = firebase.messaging();

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

    console.log('[Change SW] Firebase Messaging bereit.');
  } catch(e) {
    console.warn('[Change SW] Firebase Messaging init fehlgeschlagen:', e.message);
  }
})();
