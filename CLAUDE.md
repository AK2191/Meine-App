# CLAUDE.md – Change App
> Die einzige Wahrheit. Jede Änderung an der App MUSS hier dokumentiert werden.
> Zuletzt aktualisiert: 2026-05-26 · Challenge-Abzeichen erweitert + dynamisches Gruppenziel

---

## 🎯 Ziel der App
Eine saubere, erweiterbare Web-App namens **Change** mit:
- Dashboard (Mitspieler, Punkte, Übersicht)
- Kalender (Monat, Jahr, Tagesdetail)
- Challenges (Aufgaben + Punkte)
- Push-Benachrichtigungen
- Datenbank-Sync zwischen Nutzern über Firebase
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
- Challenge-Schwierigkeitslogik gehört ausschließlich nach `core/challenges/challengeDifficulty.js`; UI-Dateien dürfen nur diese API nutzen.

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
- Auto-Challenges werden zentral über `core/challenges/challengeDifficulty.js` erzeugt.
- Schwierigkeitsgrade: `easy` (Leicht), `medium` (Mittel), `hard` (Schwer), `hardcore` (Hardcore).
- Die Steigerung muss spürbar sein: höhere Wiederholungen, längere Haltezeiten und deutlich höhere Punkte.
- Pro Tag gibt es genau einen generierten Auto-Challenge-Satz je aktiver Schwierigkeit und eingestelltem Tagesumfang.
- Auto-IDs folgen dem Schema `auto_YYYY-MM-DD_<difficulty>_<index>`.
- Jeder Auto-Eintrag enthält `source:"auto"`, `generatedFor`, `generationKey`, `difficulty`, `difficultyLabel` und `autoVersion`.
- Alte Auto-IDs/andere Schwierigkeitsgrade desselben Tages werden beim Generieren entfernt, damit keine doppelten `auto_YYYY-MM-DD...` Einträge entstehen.
- Manuell angelegte Challenges bleiben unabhängig vom Schwierigkeitsgrad und werden nicht überschrieben.
- Speicherung: `change_v1_challenge_difficulty`, `challenge_difficulty`, `change_v1_auto_challenge_count`, `auto_challenge_count` und die täglichen Aufgaben in `change_v1_challenges`/`challenges`.
- Firebase-Sync: `change_settings.sync.challengeDifficulty`, `change_settings.sync.autoChallengeCount` und die generierten Tagesaufgaben in `change_challenges` werden über Datenbank-Sync synchronisiert.
- Abzeichen sind langfristige Meilensteine für Streaks, Punkte, erledigte Challenges, schwere/Hardcore-Aufgaben, Auto-Challenges und Gruppenziel. Keine feste Grenze bei 10 Badges.
- Das Gruppen-Ziel ist dynamisch: Es wird aus Mitspieler-Anzahl, jeweiligem Schwierigkeitsgrad und Tagesumfang berechnet. Kein festes 350-Punkte-Ziel mehr.
- Spieler speichern für das Gruppenziel in `change_players`: `challengeDifficulty`, `autoChallengeCount`, `weeklyTargetContribution`, `weeklyPointPotential`.


### Layout (Desktop)
- `.challenge-layout` → CSS Grid, 2 Spalten (`1.15fr / 0.85fr`), `align-items:stretch`
- **Gruppen-Ziel** (`#group-goal-card`): `grid-column: 1/-1`, wird als erstes Kind ins `.challenge-layout` eingefügt (via `insertBefore(card, firstChild)` in `core/misc.js`); Ziel ist dynamisch statt fix.
- **Punkte-Kalender** (`#challenge-week-points-card`): ebenfalls `grid-column: 1/-1`
- **Heutige Aufgaben** (`.challenge-card`) + **Rangliste** (`.leader-card`): gleich hoch via `align-items:stretch` + `flex:1` auf Listen
- **Mitspieler-Button** entfernt (war im `.leader-card-head`, Funktion `openParticipantPanel`)
- Titel der rechten Karte: „Rangliste" (vorher „Kontest")


---

## ⚙️ Einstellungen

Tab-Reihenfolge im Settings-Panel:
- `▦ Dashboard`
- `📅 Kalender`
- `🏆 Challenges`
- `↻ Sync`
- `⚙︎ App`

Regeln:
- Keine Nummern in den Tab-Labels; Icons bleiben Teil des Labels.
- Challenge-spezifische Optionen gehören ausschließlich in den Tab `Challenges`.
- `Challenges` enthält Auto-Challenges, Tagesumfang und Schwierigkeit.
- `Sync` enthält nur Datenbank-Sync und Google Kalender; Push bleibt ausschließlich über die Glocke steuerbar.

---

## 🔔 Push & Sync

| Funktion       | Steuerung              |
|----------------|------------------------|
| Push           | Zentrale Glocke (1×)   |
| Datenbank-Sync | Zentraler Firebase-Schalter |
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

### Logik (`features/friseur/friseur.js`)
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


## Reparatur 2026-05-26 · Login-/Freeze-Stabilisierung

- Stabile Basis ist die 68929ac-Version, nicht der kaputte Claude-Stand.
- Google-Login läuft über Google Identity Services TokenClient; Firebase Redirect darf den Hauptlogin nicht übernehmen.
- Nach Login startet kein automatischer Firebase-/Firestore-/Datenbank-Sync. Datenbank-Sync startet ausschließlich über den eigenen Schalter.
- Push-Berechtigung wird nicht automatisch beim App-Start abgefragt; Push wird zentral über die Glocke gesteuert.
- `#loading`, `#panel-overlay` und `#side-panel` dürfen geschlossen keine Klicks blockieren.
- CSP-konform: `core/notifications/notificationCenter.js` darf kein `Function()`/`eval` verwenden.
- Icons und Firebase-Dateien liegen eindeutig in `icons/` und `firebase/`; keine zusätzlichen Root-Kopien erzeugen.


## Stand 2026-05-26 – Stable Plus Merge

Basis ist die funktionierende stabile Reparatur. Sichtbare Verbesserungen wurden kontrolliert zurückgeführt, ohne den Login erneut auf Firebase-Redirect umzustellen.

Beibehaltene Sicherheitsregeln:
- Hauptlogin bleibt Google Identity Services TokenClient; kein Firebase signInWithRedirect als Standard-Login.
- Datenbank-Sync startet nur über den Datenbank-Sync-Schalter, nicht automatisch nach Login.
- Push wird nur über die Glocke/Benachrichtigungssteuerung aktiviert.
- Overlay/Loading/Sidepanel dürfen nach Login keine Klicks blockieren.

Zurückgeführte Verbesserungen:
- Neues grünes App-Logo und saubere Icon-Pfade unter icons/.
- Wetter-/Pollen-Dashboard inkl. kompakter mobiler Darstellung, Sonnenzeiten und stiller Aktualisierung.
- Geburtstags-Wetter-Modul.
- Kompakter Friseur-Tracker und Urlaub-Tracker im Dashboard.
- Urlaub zählt bewusst Urlaubstage/Arbeitstage: Wochenenden und gesetzliche Feiertage zählen nicht; Zeitraum-Einträge dürfen zusätzlich Kalendertage anzeigen, um Missverständnisse zu vermeiden.
- Profilpanel mit Cache-leeren-Aktion und Abmelden.
- Settings-Panel mit besserer Sync-Struktur; Google verbinden nutzt TokenClient, keinen Firebase-Redirect.

Wichtig: keine doppelten Root-Dateien für Icons/Firebase-Konfiguration anlegen.


## 2026-05-26 Login-Freeze-Regel

- Google-Kalender-Sync darf niemals `initFirebaseLive()` starten.
- `initFirebaseLive()` darf nur durch den Datenbank-Sync-Schalter mit `{ manual:true }` laufen.
- Settings-Sync und Challenge-Firestore-Sync starten nicht beim App-Start, nicht nach Google-Login und nicht nach `loadGoogleData()`.
- `live_sync_enabled` hat Default `false`; alte LocalStorage-Werte dürfen die App beim Login nicht automatisch in Firebase/Firestore ziehen.
- Stiller Google-Token-Refresh ist deaktiviert; Google-Sync läuft über den eigenen Google-Kalender-Schalter/Sync-Button.
- Kein automatischer Firebase-Redirect-Fallback bei blockiertem Popup.


## 2026-05-26 · Login-Freeze Stabilisierung

- `features/birthday-weather.js` wurde wieder entfernt: Die MutationObserver-basierte Nachbearbeitung lief nach dem Login zu riskant und kann die Oberfläche blockieren. Geburtstags-/Wetter-Erweiterungen dürfen künftig nur direkt in Dashboard-/Kalender-Renderlogik integriert werden, nicht als DOM-Patcher.
- Automatischer Wetter-Refresh nutzt nur vorhandene Standortdaten. Nach Login/Fokus darf keine stille Geolocation-Abfrage starten. Standortabfrage nur durch bewusste Nutzeraktion.
- `core/ui/interactionGuard.js` ist die zentrale UI-Freigabe für Loading-/Panel-Overlay und Header-Navigation. Keine zweiten Overlay-/Freeze-Workarounds bauen.
- Datenbank-Sync, Settings-Sync und Challenge-Firestore-Sync bleiben nach Login deaktiviert und starten nur über den Datenbank-Sync-Schalter.

## 2026-05-26 · Firebase-Sync kontrolliert reaktiviert

- Neuer zentraler Controller: `core/integrations/firebaseSyncController.js`.
- Firebase/Firestore startet weiterhin nicht automatisch nach Google-Login.
- Der Datenbank-Sync-Schalter ist der einzige Einstiegspunkt für Firebase/Firestore-Sync.
- Beim Aktivieren des Datenbank-Sync-Schalters wird Firebase Auth interaktiv hergestellt und danach werden gezielt angelegt/aktualisiert:
  - `change_players/{email}` für den aktuellen Mitspieler
  - `change_settings/{email}` für Einstellungen
  - `change_challenges/*` für Challenge-Vorlagen
  - `change_completions/*` erst, wenn erledigte Aufgaben existieren
- Settings-Sync und Challenge-Sync werden danach kontrolliert gestartet. Keine automatischen Startpfade über Google-Kalender, Dashboard oder Wetter.
- Keine doppelten Firebase- oder Icon-Dateien im Root anlegen.


## 2026-05-26 · Datenbank-Sync statt Live-Sync

- Sichtbar gibt es keinen separaten Live-Sync-Schalter mehr.
- Der Sync-Tab verwendet zentral den Schalter **Datenbank-Sync**.
- Dieser Schalter steuert Firebase/Firestore für `change_players`, `change_settings`, `change_challenges` und `change_completions`.
- Interne Legacy-Funktionen wie `setLiveSyncEnabled` bleiben nur als Kompatibilität erhalten und dürfen nicht als eigene UI-Funktion wieder auftauchen.
- Google Kalender bleibt ein eigener Schalter und darf den Datenbank-Sync nicht automatisch starten.

## 2026-05-26 · Settings UI Cleanup

- Settings-Tabs bleiben: Dashboard, Kalender, Challenges, Sync, App; Icons bleiben sichtbar, keine Nummerierung.
- Sync-Tab ist visuell getrennt:
  - **Datenbank-Sync** ist eine eigene Karte für Firebase (`change_players`, `change_settings`, `change_challenges`, `change_completions`).
  - **Google Kalender** ist eine eigene Karte und darf optisch sowie technisch nicht wie ein Teil des Datenbank-Sync wirken.
- App-Tab nutzt eine ruhige App-Info-Karte mit Versions-Badge statt eines großen leeren Versionsblocks.
- Diese Änderung ist reine UI-/Strukturpflege im Settings-Panel. Keine neue Sync-Logik, kein automatischer Firebase-Start nach Login.


## Änderung 2026-05-26: Google-Kalender bleibt nach F5 sichtbar

- Google OAuth Access Tokens bleiben weiterhin nur im RAM und werden nicht in localStorage gespeichert.
- Google-Kalendertermine werden nach erfolgreichem Sync als Cache gespeichert, damit Dashboard/Kalender nach F5 nicht leer sind.
- Der Google-Kalender-Sync ist weiterhin getrennt vom Datenbank-Sync/Firebase.
- Automatische stille OAuth-Refreshes bleiben deaktiviert, weil sie auf GitHub Pages Freeze-Risiken erzeugen können.
- Manuelles Aktualisieren erfolgt über Sync → Google Kalender. Wenn der Token nach F5 fehlt, öffnet der Button bewusst die Google-Verbindung.

## Änderung 2026-05-26: Geburtstage als echtes Kalender-/Dashboard-Feature

- Sichtbares Wording ist immer **Geburtstage**. Keine sichtbaren Labels wie Bday, B-Day oder Birthday.
- Kalender-Import erkennt trotzdem diese Schreibweisen: `Bday`, `B-day`, `B-Day`, `BDay`, `Birthday`, `Geburtstag`, `Geb.`.
- Erkannte Termine werden in der App normalisiert als `🎂 Name` dargestellt.
- Neue zentrale Logik liegt in `core/birthdays/birthdayParser.js`.
- UI/Panel liegt in `features/birthdays/birthdays.js`.
- Geburtstage dürfen nicht per MutationObserver oder DOM-Patcher nachträglich ins Dashboard geschrieben werden. Dashboard und Kalender fragen das Feature direkt ab.
- Dashboard-Settings enthalten einen eigenen Schalter **Geburtstage**. Dieser wird über `change_settings.dashboard.birthdaysEnabled` synchronisiert.
- Kalender-Geburtstage sind normale, kleine Kalendereinträge mit `type: "birthday"`, `source: "birthday"`, `color: "purple"` und dürfen keine großen visuellen Elemente erzeugen.
- Benachrichtigungen für Geburtstage laufen über die bestehende Glocke/Notification-Zentrale, kein eigener Push-Button.

## Änderung 2026-05-26 – Dashboard-Challenges & Firestore-Begrenzung

- Dashboard zeigt im Challenge-Bereich alle offenen Tages-Challenges, aber keine optionalen Bonusaufgaben.
- Optionale Challenges bleiben nur in der Challenge-Ansicht unter „Optionale Punkte“.
- Datenbank-Sync schreibt in `change_challenges` nur noch aktive manuelle Challenges sowie den aktuellen Auto-Challenge-Tagesplan.
- Alte Auto-Challenge-Dokumente vergangener Tage werden beim Datenbank-Sync aus `change_challenges` bereinigt; Punkte bleiben ausschließlich in `change_completions`.
- Keine Firebase-Flut: optionale Aufgaben und alte Auto-Pläne dürfen nicht erneut als aktive Challenge-Vorlagen veröffentlicht werden.

### Settings · Kalender-Layout
- Kalender-Einstellungen werden als eigene Feature-Karten dargestellt: Feiertage, Challengepunkte, Kalenderwochen.
- Keine doppelten Divider/Trennstriche in Kalender-Settings; klare Apple/Notion-Card-Hierarchie.
- Kalender-Logik bleibt unverändert: Feiertag klein neben Datum, Termine darunter, Challengepunkte nur als kleines Badge unten rechts.


## Änderung 2026-05-26 – Optionale Challenge-Aufgaben

- Optionale Aufgaben bleiben bewusst erhalten, werden aber nicht im Dashboard angezeigt und nicht als `change_challenges`-Vorlagen nach Firebase veröffentlicht.
- Der feste optionale Satz ist:
  - Fitness · mind. 30 Minuten = 30 Punkte
  - Spazieren = 10 Punkte
  - Fahrrad fahren = 12 Punkte
  - Joggen = 12 Punkte
- Optionale Aufgaben stehen nur in der Challenge-Ansicht unter „Optionale Punkte“ und zählen erst bei erledigter Aufgabe.
- Deduplizierung erfolgt über zentrale optionale IDs `opt_fitness_30`, `opt_walk_10`, `opt_bike_12`, `opt_jog_12`; alte Legacy-IDs wie `sport_fitness_30_optional` dürfen nicht erneut als zusätzliche Aufgabe daneben entstehen.


## Status, Diagnose & Anfeuern

- Einstellungen → Sync enthält einen klaren Sync-Status für Datenbank-Sync und Google Kalender.
- Einstellungen → Sync enthält ein lokales Sync-Protokoll. Es speichert nur lokale Statusereignisse wie Datenbank-Sync, Google-Kalender-Sync und Anfeuern-Aktionen.
- Einstellungen → App enthält einen App-Gesundheitscheck für Login, Datenbank-Sync, Firebase Auth, Google-Kalender-Cache, Service Worker und blockierende Overlays.
- Der Gesundheitscheck darf keine externen Dienste starten und keinen Login-/Sync-Fluss auslösen.
- Anfeuern ist kontextbewusst: Vorschläge können aus Wochenzielnähe, Streaks, heutiger Aktivität oder Rückstand entstehen.
- Anfeuern darf Firebase nur nutzen, wenn Firebase Auth bereits durch Datenbank-Sync bereit ist. Kein automatischer Firebase-Start nur für Anfeuern.

## Settings UI Konsistenz
- Alle Einstellungs-Tabs verwenden denselben Feature-Karten-Stil wie der Kalender-Tab.
- Dashboard-, Challenges-, Sync- und App-Kacheln dürfen keine alten Header-/Zeilenkarten mit doppelten Trennlinien mehr erzeugen.
- Jede Option ist als ruhige Feature-Karte aufgebaut: Icon, Titel, Status-Badge, Beschreibung, optionaler Toggle rechts und klar abgegrenzter Body.

## Friseur & Sync-Protokoll Stabilität

- Friseur ist ein eigenes Feature unter `features/friseur/friseur.js`.
- Friseur darf nicht mehr an `features/settings/settings-logic.js` gekoppelt sein, damit der Dashboard-Punkt auch bei temporären Settings-/Sync-Ladeproblemen sichtbar bleibt.
- Ohne gespeicherte Nutzerentscheidung ist Friseur standardmäßig sichtbar; ausgeblendet wird es nur über Einstellungen → Dashboard.
- Das lokale Sync-Protokoll dedupliziert gleiche direkt aufeinanderfolgende Einträge innerhalb von 10 Minuten und zeigt Wiederholungen als Zähler statt als lange Liste.


## Friseur-Panel UI
- Das Friseur-Panel verwendet eigene Klassen in `features/friseur/friseur.css`.
- Keine Wiederverwendung alter Urlaub-/Vacation-Klassen für Friseur, damit Layout und Abstände nicht brechen.
- Panel-Aufbau: ruhige Summary-Kacheln, optionaler nächster Termin, danach Jahresliste als klare Karten.
