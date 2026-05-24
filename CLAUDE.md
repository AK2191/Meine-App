# CLAUDE.md – Change App
> Die einzige Wahrheit. Jede Änderung an der App MUSS hier dokumentiert werden.
> Zuletzt aktualisiert: 2026-05-24 (3)

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

## ⚙️ Settings → Firebase Sync

### Architektur
- **UI-Owner:** `features/settings/settingsPanel.js` → erzeugt das Panel, bindet Events
- **Firebase-Sync:** `features/settings/settings-logic.js` → IIFE `change-settings-sync`
- **Trigger:** DOM `change`-Event (capturing) prüft `CONTROL_IDS` → `markSettingsChanged()` → `scheduleSettingsSave()` → `saveChangeSettings()` nach 650 ms Debounce

### Wichtige Regel
Bei neuen Eingabefeldern in `settingsPanel.js` immer `CONTROL_IDS` in `settings-logic.js` erweitern.

### Speicherung
- Firestore Collection: `change_settings`, Dokument-ID: E-Mail (normalisiert)
- Auth: `ensureChangeFirebaseAuth({ silent:true })`

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

| Datei                    | Verwendung                                      |
|--------------------------|-------------------------------------------------|
| `icon-change-192.png`    | PWA Manifest „any" (organische Blob-Form)       |
| `icon-change-512.png`    | PWA Manifest „any" (organische Blob-Form)       |
| `icon-maskable-192.png`  | PWA Manifest „maskable" (volles Rechteck, Safe-Zone ok) |
| `icon-maskable-512.png`  | PWA Manifest „maskable" (volles Rechteck, Safe-Zone ok) |
| `icon-change-192.svg`    | Nur Fallback (nicht für Push verwenden)         |
| `icon-change-512.svg`    | Desktop Browser-Favicon                         |

### Warum zwei Icon-Sets?
- **`any`**: Icon wird so angezeigt wie es ist (mit Transparenz/organischer Form)
- **`maskable`**: Android/ChromeOS schneidet das Icon kreisförmig zu → braucht volles Rechteck als Hintergrund, Inhalt muss innerhalb der „Safe Zone" (80% = 154px bei 192px) bleiben
- Früher: gleiche PNG für both → schwarzer Kreis auf Android ❌
- Jetzt: getrennte Dateien → Icon sieht korrekt aus ✅

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
| 2026-05-24 | settingsPanel.js: BY-AUX → BY-AUGSBURG in stateOptions (cleanState() erkannte BY-AUX nicht → fiel auf ALL zurück) | Claude |
| 2026-05-24 | settingsPanel.js: saveCal nutzt window.setHolidayState() statt direktem localStorage.setItem → schreibt beide Keys (change_v1_holiday_state + holiday_state) + löst Firebase-Sync aus | Claude |
| 2026-05-24 | settings-logic.js: CONTROL_IDS um settingsPanel.js-IDs erweitert (set-holiday-state, set-show-holidays, set-show-points, set-show-kw, set-friseur, set-friseur-weeks, set-urlaub, set-urlaub-days, set-live, set-auto, set-google) → DOM change-Events triggern jetzt Firebase-Save für alle Settings-Änderungen | Claude |
| 2026-05-24 | app.js confirmLogout(): Profil-Panel redesigned → Profilbild (72px) + Name/Email zentriert, Cache leeren-Row, Abmelden-Row; settingsPanel.js: Cache-Karte aus App-Tab entfernt (lebt jetzt im Profil-Panel) | Claude |
| 2026-05-24 | app.js: Firestore experimentalAutoDetectLongPolling:true → iOS PWA WebSocket-Absturz → HTTP-Polling Fallback; startLivePlayersListener: fetchPlayersOnce() nach 2s+8s als One-Shot-HTTP-Fallback für Spieler | Claude |
| 2026-05-24 | change-pre.js: renderWeekBar Retry [1200]ms → [1200,3000,6000,12000]ms; challengePlayers Object.defineProperty Watcher → Rangliste re-rendert wenn Firebase Spieler liefert | Claude |
| 2026-05-24 | challenge-sync.js: boot Timeouts [200,800,1800,3500,7000] → +[12000,20000]ms für iOS Slow-Auth | Claude |
| 2026-05-24 | settingsPanel.js: clearChangeAppCache() + Button im App-Tab (Cache leeren & neu laden) – löscht Daten-Cache, bewahrt Auth + Einstellungen, reload mit Cache-Bust-URL | Claude |
| 2026-05-24 | app.js getUrlaubRowHtml(): dash-row/dash-row-icon/dash-row-body Klassen wie Friseur, Progressbar inline in Sub-Zeile, Badge als dash-row-badge | Claude |
| 2026-05-24 | weatherService.js: LOCATION_MAX_AGE 7 Tage → 2 Stunden (stille Auto-Aktualisierung) | Claude |
| 2026-05-24 | weatherStore.js: GPS maximumAge 30 Min → 15 Min (Browser-Cache kürzer) | Claude |
| 2026-05-24 | weatherCard.js: LOCATION_MAX_AGE 6h → 2h (sync); silentLocationRefresh() + installAutoRefresh() → auto-refresh bei visibilitychange, window focus, alle 30 Min | Claude |
| 2026-05-24 | manifest.json: getrennte maskable-Icons (icon-maskable-192/512.png) → Android zeigt kein schwarzes Kreis-Icon mehr | Claude |
| 2026-05-24 | Friseur-Tracker Row: kompaktes Layout mit dash-row-Klassen, Text kein Umbruch mehr ("vor 17d · Do., 07. Mai"), Badge gekürzt ("→ Di., 02. Jun · 17:15") | Claude |
| 2026-05-23 | PNG-Icons erstellt (192px + 512px) aus SVG konvertiert            | Claude |
| 2026-05-23 | manifest.json: SVG → PNG Icons (Mobile PWA-Kompatibilität)        | Claude |
| 2026-05-23 | firebase-messaging-sw.js: icon/badge SVG → PNG                   | Claude |
| 2026-05-23 | pushController.js: test() → reg.showNotification() statt new Notification() | Claude |
| 2026-05-23 | app.js: fireNotification(), installForegroundPushHandler(), openLocalNotification() → reg.showNotification() + PNG | Claude |
| 2026-05-23 | functions/index.js: icon/badge URL SVG → PNG                     | Claude |
| 2026-05-23 | index.html: apple-touch-icon → PNG                               | Claude |
| 2026-05-23 | index.html: apple-touch-icon → PNG                               | Claude |
| 2026-05-23 | firestore-guard.js: Sync-Killer entfernt → publishChallengesToFirestore / listenLiveChallenges waren als leere No-Ops überschrieben; Guard auf Settings-Button + reqNotifPermission reduziert | Claude |
| 2026-05-23 | app.js: loadSettingsFromFirestore (existiert nicht) → initFirebaseLive() nach Auth-Bestätigung; zweiter onAuthStateChanged-Handler: initFirebaseLive + startChangeSettingsSync nach 400ms wenn fbUser gesetzt | Claude |
| 2026-05-23 | firebaseAuthBridge.js: sameUserOrNoEmail zu strikt in silent-Mode → bei silent=true jede gültige Firebase-Session akzeptieren; waitForAuthState Timeout 700ms → 1500ms | Claude |
| 2026-05-23 | firebase-messaging-sw.js: importScripts in try-catch → SW-Absturz bei Netzwerkfehler verhindert; Firebase-Init nur wenn SDK geladen | Claude |
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

---

## 🏆 Challenges – Firebase Sync Architektur

### Schichten (von alt nach neu, jede überschreibt/wrapat die vorherige)
1. `features/challenges/challenges.js` → `completeChallenge` Basis (durch Layer 2 ersetzt, toter Code)
2. `challenge-sync.js` IIFE `change-account-safe` → überschreibt `completeChallenge` (Email-Check, saveLocal + publishCompletionToFirestore)
3. `challenge-sync.js` IIFE `change-final-two-way` → wrapat Layer 2 (Upload + Download nach Completion)
4. `app.js` `initFirebaseLive` → eigener Listener auf `change_completions` (parallel zu Layer 3, limit 500)

### Collections
- `change_completions` – erledigte Aufgaben (Punkte)
- `change_challenges` – Challenge-Definitionen (shared, wird gemergt)
- `change_players` – Spieler-Profile + Online-Status

### Bekannte Non-Issues (funktionieren korrekt, NICHT anfassen)
- Zwei parallele Listener auf `change_completions` → kein Datenverlust, Upsert-Logik schützt
- `app.js`-Listener nutzt `snap.forEach` statt `snap.docChanges()` → O(n²), aber korrekt
- Mehrere `uploadLocalCompletions()`-Aufrufe pro Completion → idempotent durch `set({merge:true})`

### Invarianten (dürfen nie gebrochen werden)
- Punkte nur für Completions mit valider E-Mail (`isEmail()` Check)
- `isDoneToday()` verhindert Doppelerledigung am selben Tag
- `sanitizeLocalCompletions()` entfernt Ghost-Einträge periodisch
- Firestore Rules: alle Collections require `isAuth()`

---

## 🗑️ Cache leeren (clearChangeAppCache)

### Funktion: `window.clearChangeAppCache()`
Definiert in: `features/settings/settingsPanel.js`
Erreichbar: Einstellungen → App-Tab → „Cache leeren & neu laden"

### Was gelöscht wird
Alle localStorage-Einträge AUSSER Auth + Einstellungen:
- Daten: `events`, `challenge_completions`, `challengeCompletions`, `challenges`, `challenge_players`, `gEvents`-Cache, Wetter-Cache, Benachrichtigungs-Flags, etc.
- Service Worker Caches (Browser HTTP-Cache für App-Dateien)

### Was bewahrt wird (PRESERVE-Set)
- **Auth**: `user_info_safe`, `user_info`, `change_v1_user_info`, `was_logged_in`, `access_token`, `fcm_token`
- **Kalender**: `change_v1_calendar_view_options`, `calendar_settings`, `change_v1_holiday_state`, `holiday_state`
- **Dashboard**: `change_v1_friseur_*`, `urlaub_tracker_*`, `urlaub_half_days`
- **Wetter**: `change_v1_weather_settings`, `*_alert_hours`
- **Sync**: `live_sync_enabled`, `auto_challenges_enabled`, `change_v1_google_calendar_sync`, `push_enabled`
- **Design**: `change_v1_dark_mode`

### Reload-Strategie
`window.location.replace(url + '?v=' + Date.now())` → Cache-Bust-Parameter umgeht iOS Safari + Android Chrome HTTP-Cache

### Wichtige Regel
Das PRESERVE-Set bei neuen wichtigen localStorage-Keys erweitern.
