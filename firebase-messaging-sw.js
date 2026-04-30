importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC3lpaM1z2YwgaevCxE1bMM1hUnW96PwOo",
  authDomain: "meine-app-4ea9e.firebaseapp.com",
  projectId: "meine-app-4ea9e",
  messagingSenderId: "999970371988",
  appId: "1:999970371988:web:a99a37aea79ea39fdd3781"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icons/icon-192.png"
  });
});
