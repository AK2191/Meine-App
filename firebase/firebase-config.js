// Change App · Firebase-Konfiguration
// Diese Datei muss im GitHub-Repo direkt neben index.html liegen.
self.FIREBASE_CONFIG = window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC3lpaM1z2YwgaevCxE1bMM1hUnW96PwOo",
  authDomain: "meine-app-4ea9e.firebaseapp.com",
  projectId: "meine-app-4ea9e",
  storageBucket: "meine-app-4ea9e.firebasestorage.app",
  messagingSenderId: "999970371988",
  appId: "1:999970371988:web:a99a37aea79ea39fdd3781",
  measurementId: "G-RQJ500HHN5"
};

// Firebase Console → Projekteinstellungen → Cloud Messaging → Web Push certificates
self.FIREBASE_VAPID_KEY = window.FIREBASE_VAPID_KEY = "BIQdYqHQAHiNzvmptyTCaYgHIjDV_LCnjdwApSV6T3jLF_SEQG66VkF-LD055p5eIBM9zdFh_tpLsIQzLmesA9Q";

// ── Firebase initialisieren ──────────────────────────────────────────────────
// Nur im Browser-Kontext (nicht im Service Worker, der hat kein `window`).
// Der Service Worker initialisiert Firebase selbst nach dem importScripts-Aufruf.
if (typeof window !== 'undefined' && typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(window.FIREBASE_CONFIG);
}
