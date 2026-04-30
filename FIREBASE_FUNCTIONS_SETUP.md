# Change: Hintergrund-Push + tägliche Auto-Challenges

## Dateien auf GitHub Pages hochladen
Lade in dein Repo `ak2191/Meine-App` diese Dateien in den Hauptordner hoch:

- `index.html`
- `firebase-config.js`
- `firebase-messaging-sw.js`
- `manifest.json`
- `icon-192.png`
- `icon-512.png`

## Firebase Functions bereitstellen
Der Ordner `functions` wird NICHT zu GitHub Pages hochgeladen. Er wird lokal über Firebase deployed.

1. Node.js installieren
2. Firebase CLI installieren:
   `npm install -g firebase-tools`
3. Einloggen:
   `firebase login`
4. Projekt verbinden:
   `firebase use meine-app-4ea9e`
5. Im Projektordner ausführen:
   `firebase deploy --only functions`

Danach erstellt Firebase jeden Tag um 09:00 Uhr deutsche Zeit drei Mini-Challenges und sendet Push an alle Spieler mit aktivem Push-Token.

Hinweis iPhone/iPad: Hintergrund-Push für Web-Apps funktioniert nur, wenn die App zum Home-Bildschirm hinzugefügt wurde und iOS 16.4 oder neuer verwendet wird.
