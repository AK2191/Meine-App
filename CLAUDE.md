# CLAUDE.md – Change App
> Die einzige Wahrheit. Jede Änderung an der App MUSS hier dokumentiert werden.
> Zuletzt aktualisiert: 2026-05-17

---

## 🎯 Ziel der App
Eine saubere, erweiterbare Web-App namens **Change** mit:
- Dashboard (Mitspieler, Punkte, Übersicht)
- Kalender (Monat, Jahr, Tagesdetail)
- Challenges (Aufgaben + Punkte)
- Push-Benachrichtigungen
- Live-Sync zwischen Nutzern
- Google Kalender Integration

---

## 🏗 Architektur

```
src/
├── core/          → Gesamte Logik (kein UI)
├── features/      → Feature-spezifisches UI
└── components/    → Wiederverwendbare UI-Komponenten

public/
├── icons/         → App Icons (SVG)
│   ├── change-icon-512.svg
│   └── change-icon-192.svg
└── manifest.json  → PWA Manifest
```

### Strikte Trennung
- Logik → `core/`
- UI → `features/`
- Wiederverwendbare Komponenten → `components/`
- Keine doppelte Logik (kein mehrfacher Sync, kein doppelter Kalender-Code)

---

## 📅 Kalender

### Tagesstruktur
Jeder Kalendertag enthält:
- Datum oben links
- Feiertag klein daneben
- Termine darunter (max. 2 sichtbar + „+X mehr")
- Challengepunkte klein unten rechts (Badge)

### Darstellung
- Zeiträume → durchgehender Balken, immer oberste Zeile, kein Text „Zeitraum"
- Einzeltermine → immer unterhalb der Zeitraum-Balken
- Keine überlappenden Elemente

---

## 🏆 Challenges

- Punkte zählen **nur** bei erledigten Aufgaben
- Anzeige im Kalender: kleines Badge unten rechts
- Keine großen visuellen Elemente

### Layout (Desktop)
- `.challenge-layout` → CSS Grid, 2 Spalten (`1.15fr / 0.85fr`), `align-items:stretch`
- **Gruppen-Ziel** (`#group-goal-card`): `grid-column: 1/-1`, wird als erstes Kind ins `.challenge-layout` eingefügt (via `insertBefore(card, firstChild)` in `core/misc.js`)
- **Punkte-Kalender** (`#challenge-week-points-card`): ebenfalls `grid-column: 1/-1`
- **Heutige Aufgaben** (`.challenge-card`) + **Rangliste** (`.leader-card`): gleich hoch via `align-items:stretch` + `flex:1` auf Listen
- **Mitspieler-Button** entfernt (war im `.leader-card-head`, Funktion `openParticipantPanel`)
- Titel der rechten Karte: „Rangliste" (vorher „Kontest")

---

## 🔔 Push & Sync

| Funktion       | Steuerung              |
|----------------|------------------------|
| Push           | Zentrale Glocke (1×)   |
| Live-Sync      | Eigener Schalter       |
| Google Sync    | Eigener Schalter       |

- Keine doppelten Buttons oder versteckten Funktionen
- Google Sync: bei Aktivierung → neu synchronisieren

---

## 🎨 Design

- Stil: **minimalistisch** (Apple / Notion)
- Klare Hierarchie, viel Weißraum
- Keine unnötigen Texte oder Buttons
- Keine visuellen Konflikte oder Flackern

---

## 🖼 App Icon

**Konzept:** Tiefe & Stille (Rothko trifft Bauhaus)

| Eigenschaft      | Wert                                      |
|------------------|-------------------------------------------|
| Form             | Organischer Blob (asymmetrisch)           |
| Stil             | Rothko Farbfelder + Bauhaus Spirale       |
| Hintergrund      | `#0F172A` (Tief-Dunkelblau)               |
| Spiralfarbe      | `#818CF8` (Indigo-Violett)                |
| Spirale Echo     | `#C7D2FE` (Helles Indigo, 30% opacity)    |
| Akzent Pink      | `#E879F9` (links)                         |
| Akzent Grün      | `#34D399` (rechts)                        |
| Akzent Rosa      | `#F472B6` (oben)                          |
| Kern             | `#ffffff` (Mittelpunkt)                   |

### Icon-Dateien
```
public/icons/change-icon-512.svg   → App Store, Splash Screen
public/icons/change-icon-192.svg   → PWA Manifest, Homescreen
```

### HTML-Integration (`index.html` → `<head>`)
```html
<link rel="icon" type="image/svg+xml" href="/icons/change-icon-512.svg">
<link rel="apple-touch-icon" href="/icons/change-icon-512.svg">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0F172A">
```

### PWA Manifest (`public/manifest.json`)
```json
{
  "name": "Change",
  "short_name": "Change",
  "background_color": "#0F172A",
  "theme_color": "#0F172A",
  "icons": [
    { "src": "/icons/change-icon-192.svg", "sizes": "192x192", "type": "image/svg+xml" },
    { "src": "/icons/change-icon-512.svg", "sizes": "512x512", "type": "image/svg+xml" }
  ]
}
```

---

## ⚙️ Arbeitsweise (STRICT)

1. Arbeite in **kleinen, kontrollierten Schritten**
2. Ändere **niemals** mehrere Systeme gleichzeitig
3. Prüfe nach jeder Änderung: Kalender · Dashboard · Challenges
4. Wenn unsicher: erst erklären, dann ändern

## ❌ Verboten

- Bestehende Funktionen überschreiben ohne Prüfung
- Doppelte Komponenten bauen
- Workarounds statt sauberer Lösungen
- Patches – immer den Code direkt anpassen

---

## 📦 Tech Stack

- Frontend: Web App (HTML/CSS/JS oder Framework)
- Backend: Firebase (Functions, Hosting, Firestore)
- Push: Firebase Cloud Messaging
- Sync: Firestore Realtime
- Kalender-Integration: Google Calendar API

---

## 🚀 Deploy

```bash
firebase deploy --only hosting
```

---

## ✂️ Friseur-Tracker

### Speicherung
- `change_v1_friseur_enabled` (localStorage) → boolean
- `change_v1_friseur_weeks` (localStorage) → Zahl (Wochen bis Erinnerung, z. B. 3)

### Logik (`features/settings/settings-logic.js`)
| Funktion                | Beschreibung                                                  |
|-------------------------|---------------------------------------------------------------|
| `findLastFriseur()`     | Letzter vergangener Termin mit „friseur" im Titel/Beschreibung |
| `findNextFriseurInfo()` | Nächster zukünftiger Termin                                   |
| `findAllFriseurThisYear()` | Alle Friseur-Termine des aktuellen Jahres                 |
| `openFriseurPanel()`    | Detail-Panel mit Jahresübersicht                             |
| `getFriseurRowHtml()`   | Dashboard-Zeile (kompakt)                                    |

### Panel-Aufbau (`openFriseurPanel`)
1. **Kacheln**: Besuche im Jahr / Ø Abstand / Erinnerungswochen
2. **Nächster Termin**: grüne Box (nur wenn Termin eingetragen)
3. **Empfohlenes Buchungsfenster** *(neu – 2026-05-19)*:
   - Sichtbar nur wenn **kein** nächster Termin eingetragen ist
   - Zeigt 3 Zeitfenster: Frühestens / Empfohlen / Dringend
   - Startpunkt: letzter Termin + (Erinnerungswochen + 1) Wochen
   - Jedes Fenster +1 Woche zum nächsten
   - Aktive Fenster (Datum bereits erreicht) → farbig hervorgehoben
4. **Besuchsliste**: vergangene Termine (neueste zuerst)

---

## 🖼 Icons (Push-relevant)

| Datei                  | Verwendung                              |
|------------------------|-----------------------------------------|
| `icon-change-192.png`  | PWA Manifest, Homescreen, Push-Badge    |
| `icon-change-512.png`  | PWA Manifest, Splash Screen             |
| `icon-change-192.svg`  | Nur Fallback (nicht für Push verwenden) |
| `icon-change-512.svg`  | Desktop Browser-Favicon                 |

> ⚠️ Push-Benachrichtigungen auf iOS/Android benötigen **PNG**-Icons.
> SVG wird im PWA-Manifest und als Push-Icon von mobilen Browsern nicht akzeptiert.

## 🔔 Push – Mobile Regeln

- **`new Notification()`** ist auf iOS/Android **verboten** → immer `serviceWorker.ready.then(reg => reg.showNotification())` verwenden
- **Icons in Push** → immer `.png`, niemals `.svg`
- **iOS**: Push funktioniert **nur** wenn die App per Safari → „Zum Home-Bildschirm" installiert wurde (ab iOS 16.4)
- **Android**: Push funktioniert im Chrome-Browser, Erlaubnis muss vom Nutzer erteilt werden

---

## 📝 Änderungslog

| Datum      | Was                                                                | Von    |
|------------|--------------------------------------------------------------------|--------|
| 2026-05-23 | PNG-Icons erstellt (192px + 512px) aus SVG konvertiert            | Claude |
| 2026-05-23 | manifest.json: SVG → PNG Icons (Mobile PWA-Kompatibilität)        | Claude |
| 2026-05-23 | firebase-messaging-sw.js: icon/badge SVG → PNG                   | Claude |
| 2026-05-23 | pushController.js: test() → reg.showNotification() statt new Notification() | Claude |
| 2026-05-23 | app.js: fireNotification(), installForegroundPushHandler(), openLocalNotification() → reg.showNotification() + PNG | Claude |
| 2026-05-23 | functions/index.js: icon/badge URL SVG → PNG                     | Claude |
| 2026-05-23 | index.html: apple-touch-icon → PNG                               | Claude |
| 2026-05-23 | index.html: apple-touch-icon → PNG                               | Claude |
| 2026-05-19 | Friseur-Panel: Sektion „Empfohlenes Buchungsfenster" ergänzt (3 Fenster: Frühestens/Empfohlen/Dringend, je +1W ab Erinnerung+1W, nur wenn kein Termin eingetragen) | Claude |
| 2026-05-17 | Gruppen-Ziel: Prozent zentriert in Fortschrittsleiste (20px)      | Claude |
| 2026-05-17 | Text „Heute frei“ → „Heute keine Termine vorhanden“              | Claude |
| 2026-05-17 | Challenges-Layout: gleiche Kartenhöhe, Gruppen-Ziel volle Breite  | Claude |
| 2026-05-17 | Mitspieler-Button entfernt, Karte heißt jetzt „Rangliste“         | Claude |
| 2026-05-17 | App Icon „Tiefe & Stille“ hinzugefügt                              | Claude |
| 2026-05-17 | CLAUDE.md initial erstellt                                         | Claude |
| 2026-05-17 | firebase-messaging-sw.js: importScripts Firebase SDK hinzugefügt (Hauptfix Android Push) | Claude |
| 2026-05-17 | Alle icon-192.png → icon-change-192.svg (Datei existierte nicht) in app.js, challenge-fixes.js, pushController.js, functions/index.js, firebase-messaging-sw.js | Claude |
| 2026-05-17 | manifest.json: display_override + getrennte purpose-Einträge hinzugefügt | Claude |
| 2026-05-17 | enablePushNotifications: doppelte SW-Registrierung entfernt → navigator.serviceWorker.ready | Claude |
| 2026-05-17 | myId() robust: 5-stufiger Fallback (Firebase → userInfo → localStorage) | Claude |
| 2026-05-17 | openPlayerRecentPanel() definiert in challenges.js (war fehlend)   | Claude |
| 2026-05-17 | Player-Panel: Heute/Gesamt/Erledigt + letzte 5 Aufgaben            | Claude |
| 2026-05-17 | Mitspieler-Aktivität aus Rangliste-Karte entfernt → jetzt im Player-Panel | Claude |
| 2026-05-17 | Anfeuern-Button für eigenen Account korrekt versteckt (myId fix)   | Claude |
| 2026-05-17 | window.injectStreakCard + window.checkNewBadges exportiert (app.js) | Claude |
| 2026-05-17 | Settings: Wetter/Pollen getrennte Karten, Tracker umbenannt        | Claude |
