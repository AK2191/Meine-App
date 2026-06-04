# CLAUDE.md – Change App
> Die einzige Wahrheit. Jede Änderung an der App MUSS hier dokumentiert werden.
> Zuletzt aktualisiert: 2026-06-04 · Version 0.1.0010 und persönliche Pollen-Benachrichtigungen

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
- Die Tab-Leiste ist horizontal scrollbar und hat links/rechts kleine Scroll-Buttons, damit schmale Ansichten ruhig bleiben.
- Die sichtbare App-Version wird bei jeder Code-Anpassung erhöht und diese Änderung wird hier dokumentiert. Aktuelle Version: `0.1.0010`.
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

### Dashboard-Zeile
- Die Friseur-Logik bewertet Termine nach Start- und Enduhrzeit, nicht nur nach dem Tagesdatum.
- Wenn ein aktueller oder zukünftiger Friseur-Termin vorhanden ist, hat dieser Status Priorität vor der Rückschau auf den letzten Termin.
- Vor dem Termin erscheint z. B. `Heute geplant · Di., 02. Juni · 17:15 Uhr`.
- Während des Termins erscheint `Läuft gerade · bis 18:00 Uhr`.
- Nach der Enduhrzeit am selben Tag erscheint `Heute erledigt · 18:00 Uhr`.
- Ab dem Folgetag ohne neuen Termin erscheint `Neuer Termin offen · Letzter Termin gestern · 18:00 Uhr`; ab dem übernächsten Tag `Neuer Termin offen · Letzter Termin vor 2 Tagen`.
- `Friseurtermin überfällig` erscheint erst, wenn **kein** zukünftiger Friseur-Termin geplant ist und die eingestellte Erinnerungsgrenze erreicht wurde.

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

| 2026-06-04 | Version auf `0.1.0010` erhöht; persönliche Pollen-Benachrichtigungen ergänzt. Bei aktivem Pollenalarm nutzt Change gespeicherte Symptom-Muster und aktuelle/morgige Pollenwerte, um Hinweise wie erhöhte Gräserbelastung + frühere Nasensymptome über die bestehende Glocke/Push-Logik anzuzeigen. Kein neuer Push-Dialog, kein Firebase-Auto-Start. | ChatGPT |
| 2026-06-04 | Version auf `0.1.0009` erhöht; Pollen-Symptom-Auswertung ergänzt. Symptomtage speichern jetzt einen Pollen-Snapshot, damit Change Muster wie erhöhte Gräserbelastung + starke Nasensymptome lokal erkennt und bei aktivem Datenbank-Sync nach Firebase übernimmt. Keine Auto-Starts nach Login. | ChatGPT |
| 2026-06-04 | Version auf `0.1.0008` erhöht; Pollen-Symptom-Tracker für Niesen, Augen, Nase, Atmung und Notiz ergänzt. Speicherung lokal und bei aktivem Datenbank-Sync zusätzlich in `change_pollen_symptoms` in Firebase. | ChatGPT |
| 2026-06-02 | Version auf `0.1.0005` erhöht; Termin-Teilen aus dem Friseur-Panel entfernt und in das Kalender-Terminpanel für lokale, synchronisierte und von Google übertragene Termine eingebaut | ChatGPT |
| 2026-06-02 | Version auf `0.1.0004` erhöht; Termine können als `.ics` Kalenderdatei über native Teilen-Funktion, WhatsApp-Text, Kopieren und Download geteilt werden | ChatGPT |
| 2026-06-02 | Version auf `0.1.0003` erhöht; Friseur-Tracker nutzt Start-/Enduhrzeit: nach Terminende `Heute erledigt`, danach `Neuer Termin offen`, erst ab Erinnerungsgrenze `Überfällig` | ChatGPT |
| 2026-06-01 | Version auf `0.1.0002` erhöht; Einstellungen-Tabs in einen horizontal scrollbaren Tab-Bereich mit Links-/Rechts-Steuerung gelegt | ChatGPT |
| 2026-06-01 | Friseur-Dashboard: geplante zukünftige Termine werden in der Sub-Zeile grün als „in X Tagen“ angezeigt; Überfällig-/Warnstatus nur noch ohne geplanten Termin | ChatGPT |
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
- Dashboard-Settings enthalten zusätzlich **Benachrichtigung X Tage vorher** für Geburtstage. Wert `0` bedeutet nur am Geburtstag, Werte bis `365` zeigen Hinweise entsprechend früher. Speicherung: `change_v1_birthday_notification_days` / `birthday_notification_days`, Sync: `change_settings.dashboard.birthdayNotificationDays`.
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
- Die Interaktionsprüfung bewertet geöffnete, bewusst aktive Panels wie Einstellungen nicht als Fehler; rot ist nur für hängende/geschlossene klickblockierende Ebenen vorgesehen.
- Anfeuern ist kontextbewusst: Vorschläge können aus Wochenzielnähe, Streaks, heutiger Aktivität oder Rückstand entstehen.
- Anfeuern darf Firebase nur nutzen, wenn Firebase Auth bereits durch Datenbank-Sync bereit ist. Kein automatischer Firebase-Start nur für Anfeuern.
- Anfeuern wird in Firestore über `change_nudges` gespeichert. Diese Collection gehört zum Datenbank-Sync-Modell und darf nicht vom Fallback der Rules blockiert werden.
- `sendNudge()` darf keinen Erfolg melden, wenn Firestore blockiert ist oder Datenbank-Sync nicht verbunden ist. Lokale Fallbacks dürfen nicht als „gesendet" angezeigt werden.
- Echte Push-Zustellung für Anfeuern läuft serverseitig über `functions/index.js` → `pushWhenNudgeCreated`; Empfänger-Token kommen aus `change_players.fcmToken` mit `pushEnabled:true`.

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


## UI Card System · Friseur-Panel-Stil
- Kacheln in Einstellungen und App-Bereichen sollen dem ruhigen Friseur-Panel-Stil folgen.
- Feature-Karten nutzen große Radien, klare Icon-Kacheln, kurze Meta-Texte, ruhige Trennlinien und deutliche Highlight-/Statusbereiche.
- Keine zusammengeklebten Texte, keine doppelten Divider, keine unruhigen Emoji-Flächen als Layout-Ersatz.
- Styling-Änderungen dürfen keine Sync-, Login- oder Challenge-Logik verändern.

## Änderung 2026-05-27: Geburtstags-Panel und Panel-Scroll stabilisiert
- `openPanel()` setzt den Scrollzustand von Side-Panel und Panel-Body bei jedem Öffnen zurück. Dadurch bleiben oben stehende Einträge wie der nächste Geburtstag sichtbar und werden nicht durch einen alten Scrollstand verdeckt.
- Das Geburtstags-Panel zeigt den nächsten Geburtstag zusätzlich als eigene Highlight-Karte und darunter alle erkannten Geburtstage.
- Schreibweisen wie `Domi Bday`, `Bday Domi`, `Domi B-day`, `Birthday Domi`, `Geburtstag Domi` und `Geb. Domi` bleiben gültige Google-Kalender-Erkennungen. Sichtbar bleibt die normalisierte Anzeige `🎂 Name`.


## Änderung 2026-05-27: Friseur-Panel Tagesmetriken und Sortierung

- Im Friseur-Panel zeigen die oberen Summary-Kacheln für **Besuche**, **Letzter** und **Nächster** dieselbe ruhige Metrik-Darstellung: große Zahl oben, kurzer Labeltext darunter.
- **Letzter** wird als `20` / `Tage her` dargestellt; **Nächster** als `6` / `Tage bis`. `0` nutzt das Label `Heute`.
- Die Jahresliste und die Highlight-Karte behalten Datum und Uhrzeit, damit die exakten Termine weiterhin sichtbar bleiben.
- Die Jahresliste `Termine YYYY` ist chronologisch absteigend sortiert: neueste Termine oben, älteste unten.
- Die Berechnung erfolgt kalendertagsgenau über lokale Datumsschlüssel, nicht über Uhrzeit-Rundung.

## Änderung 2026-05-27: Anfeuern-Benachrichtigungen repariert

- Firestore-Regeln auf v6 erweitert: `change_nudges` ist jetzt explizit erlaubt.
  - Create: nur eingeloggter Nutzer als eigener Absender.
  - Read: nur Absender oder Empfänger.
  - Update: nur Empfänger darf `seen`/`seenAt` setzen.
- `core/misc.js` meldet beim Anfeuern nur noch dann Erfolg, wenn der Firestore-Schreibvorgang wirklich erfolgreich war.
- Wenn Datenbank-Sync oder Firebase Auth nicht bereit sind, wird Anfeuern nicht mehr fälschlich als gesendet angezeigt.
- `functions/index.js` enthält `pushWhenNudgeCreated`, damit ein neues `change_nudges`-Dokument direkt eine FCM-Push-Benachrichtigung an den Empfänger auslösen kann.
- Push-Icons in Functions und Push-Test verwenden ausschließlich `icons/icon-change-192.png`; keine Root-Icon-Pfade.
- `firebase.json` referenziert `firebase/firestore.rules`, damit die neuen `change_nudges`-Regeln deploybar sind.
- Alte Browser-Push-Stellen in Notification-Center, Wetter/Pollen und Friseur nutzen jetzt `serviceWorker.ready.then(reg => reg.showNotification())` mit PNG-Icon statt `new Notification()`.
- Kein automatischer Firebase-Start nach Login: Anfeuern nutzt Firebase nur, wenn Datenbank-Sync bereits aktiv und Firebase Auth bereit ist.



## Änderung 2026-05-27: Geburtstags-Benachrichtigung in Tagen

- Einstellungen → Dashboard → Geburtstage enthält nun ein Zahlenfeld **Benachrichtigung** in Tagen.
- Der Wert wird lokal in `change_v1_birthday_notification_days` und `birthday_notification_days` gespeichert.
- Bei aktivem Datenbank-Sync wird der Wert über `change_settings.dashboard.birthdayNotificationDays` synchronisiert.
- Die Glocke zeigt Geburtstags-Hinweise ab `0..X` Tagen vor dem Geburtstag. `0` bedeutet nur am Geburtstag.
- Browser-Push für Geburtstage wird über die bestehende Notification-Zentrale ausgelöst, wenn `diff === birthdayNotificationDays`; keine eigene Push-Steuerung, kein automatischer Firebase-Start.
- Erkennung und Kalenderdarstellung bleiben unverändert: `Bday`, `B-day`, `Birthday`, `Geburtstag`, `Geb.` werden akzeptiert, sichtbar bleibt `🎂 Name`.

## Änderung 2026-05-27: Geburtstags-Panel im Friseur-Stil

- Das Geburtstags-Panel verwendet jetzt ein eigenes Feature-CSS unter `features/birthdays/birthdays.css`.
- Die Darstellung folgt dem ruhigen Friseur-Panel-Stil: Summary-Kacheln oben, Highlight-Karte für den nächsten Geburtstag, darunter klare Termin-/Personenkarten.
- Die Summary-Kacheln zeigen **Geburtstage**, **Tage bis** zum nächsten Geburtstag und **Dieser Monat**.
- Im Panel gibt es Filteransichten für **Heute**, **Morgen**, **Woche**, **Monat** und **Alle**. Die Filter ändern nur die Panel-Ansicht und starten keinen Sync/Login/Push.
- Geburtstags-Erkennung, Kalenderdarstellung und Benachrichtigungstage bleiben unverändert: `Bday`, `B-day`, `Birthday`, `Geburtstag`, `Geb.` werden akzeptiert; sichtbar bleibt `🎂 Name`.
- Keine DOM-Patcher, keine MutationObserver-Fixes, keine Änderungen an Login-, Sync-, Kalender- oder Challenge-Logik.

## Änderung 2026-05-27: Geburtstags-Panel Breiten-Fix

- `features/birthdays/birthdays.css` begrenzt das Geburtstags-Panel jetzt konsequent auf die Breite des Side-Panels (`width/max-width/min-width`).
- Die Filteransichten **Heute**, **Morgen**, **Woche**, **Monat** und **Alle** umbrechen kontrolliert in ein 3-/2-Spaltenraster statt horizontal aus der Ansicht zu laufen.
- Summary-Kacheln, Highlight-Karte und Geburtstagszeilen bleiben im ruhigen Friseur-Stil und erzeugen keinen horizontalen Overflow.
- Keine Änderungen an Parser, Kalenderdaten, Benachrichtigungen, Login, Sync oder Challenge-Logik.


## Änderung 2026-05-27: Pollen-Panel im Friseur-Stil

- Das Pollen-Panel wird weiterhin über `features/weather/weatherCard.js` gesteuert und bleibt Teil von Wetter & Gesundheit; keine neue Sync- oder Login-Logik.
- Die Pollen-Ansicht nutzt jetzt denselben ruhigen Panel-Aufbau wie Friseur/Geburtstage: Summary-Kacheln oben, Highlight-Karte für die nächste relevante Belastung, Filterchips und klare Tageskarten.
- Filteransichten: **Heute**, **Morgen**, **Woche**, **Monat** und **Alle**. Die Filter arbeiten ausschließlich auf dem bereits geladenen Pollen-Forecast und starten keinen Neuabruf.
- Die Summary zeigt geladene Forecast-Tage, Tage mit starker Belastung und Tage mit mittlerer Belastung.
- Die vorhandene Wetter-Ansicht, Dashboard-Pillen, Wetter-/Pollen-Settings, Push-Regeln, Datenbank-Sync, Login, Kalender und Challenges bleiben unverändert.


## Änderung 2026-05-27: Rangliste im Friseur-Stil

- Die Rangliste im Challenges-Bereich nutzt jetzt denselben ruhigen Kartenstil wie das Friseur-Panel: einzelne Karten statt harter Tabellenzeilen.
- Jeder Mitspieler-Eintrag zeigt Rang/Medaille links, Name mit Online-Status, Detailzeile mit **Heute / Gesamt / erledigt**, rechts den Gesamtpunktestand und darunter weiterhin **Anfeuern**.
- Der eigene Eintrag wird dezent hervorgehoben und trägt ein kleines **Du**-Badge.
- Die Änderung betrifft nur die UI der Rangliste (`#leaderboard-list`) und die Renderer in `features/challenges/challenges.js` sowie `features/challenges/challenge-sync.js`.
- Keine Änderungen an Punktelogik, Datenmodell, Datenbank-Sync, Login, Kalender oder Challenge-Erledigungen.


## Änderung 2026-05-27: Pollen-Panel ohne Filter und Friseur-Breitenfix

- Das Pollen-Panel folgt jetzt wieder strikt dem Friseur-Aufbau: Summary-Kacheln, Highlight-Karte und darunter eine einfache Liste des geladenen Ausblicks.
- Die Filter **Heute**, **Morgen**, **Woche**, **Monat** und **Alle** wurden aus dem Pollen-Panel entfernt.
- `features/weather/weatherCard.js` zeigt im Pollen-Panel immer den geladenen Forecast ohne zusätzliche Panel-Filter; es wird kein Neuabruf und kein Sync gestartet.
- `features/weather/weatherCard.css` und `features/friseur/friseur.css` begrenzen Panel-Inhalte konsequent auf `width/max-width:100%`, nutzen `minmax(0,1fr)` für Summary-Kacheln und verhindern horizontalen Overflow.
- Die globale Side-Panel-Body-Fläche verhindert horizontales Überlaufen (`overflow-x:hidden`), ohne Login, Sync, Kalender, Challenges oder Datenmodell zu ändern.


## Änderung 2026-05-27: Spieler-Panel und Rangliste kompakt

- Die vorherige Ranglisten-Kartenansicht wurde korrigiert: `#leaderboard-list` nutzt wieder kompakte, nicht streckende Kartenzeilen (`display:block`, `align-content:start`) und füllt bei wenigen Mitspielern nicht mehr die komplette Kartenhöhe.
- Die Rangliste links bleibt bewusst übersichtlich: Rang/Medaille, Name, Detailzeile, Gesamtpunkte und optional **Anfeuern** in einer kompakten Zeile.
- Das rechte Spieler-Detailpanel (`openPlayerRecentPanel`) ist jetzt im Friseur-/Geburtstage-Stil aufgebaut: drei Summary-Kacheln, Highlight-Karte für die letzte Aufgabe und ruhige Aufgabenliste darunter.
- Die Änderung betrifft nur UI-Markup in `features/challenges/challenges.js` und Styling in `styles/app.css`.
- Keine Änderungen an Punktelogik, Challenge-Erledigungen, Datenbank-Sync, Login, Kalender, Pollen oder Benachrichtigungen.


## Änderung 2026-05-27: Geburtstags-Filter einzeilig

- Im Geburtstags-Panel bleiben die Filter **Heute / Morgen / Woche / Monat / Alle** jetzt immer in **einer einzigen Zeile**.
- Die Filterchips verwenden dafür ein festes 5-Spalten-Raster mit kompakteren Abständen und kleineren Label-/Zahlengrößen.
- Auch auf schmalen Panelbreiten wird kein zweiter Filter-Umbruch mehr erzeugt.
- Keine Änderungen an Geburtstags-Parser, Benachrichtigungen, Kalender, Login, Sync oder Challenge-Logik.


## Änderung 2026-05-27: Geburtstags-Erinnerung als Auswahl

- Einstellungen → Dashboard → Geburtstage nutzt jetzt wie Wetter/Pollen/Friseur ein klares Feld **Erinnerung** statt eines nackten Zahlenfelds.
- Die Auswahl bleibt technisch in Tagen und speichert weiterhin `change_v1_birthday_notification_days` / `birthday_notification_days`.
- Optionen: **Am Geburtstag**, 1–30 Tage vorher sowie 45, 60, 90, 120, 180 und 365 Tage vorher; vorhandene Sonderwerte werden automatisch als Option ergänzt.
- Die Benachrichtigungslogik, Glocke und Datenbank-Sync verwenden unverändert denselben Tageswert.
- Keine Änderungen an Geburtstags-Parser, Kalender, Login, Push-Steuerung oder Challenge-Logik.


## Änderung 2026-05-27: App-Info und Gesundheitscheck

- Im Einstellungen-Tab **App** ist die Version jetzt als schlichte App-Info-Karte ohne doppelte Icon-/Logo-Ebene sichtbar.
- Die Versionskarte zeigt nur **Change**, die Versionsnummer und den Installationsstatus.
- Der **App-Gesundheitscheck** zeigt seine Detailprüfungen nicht mehr automatisch beim Öffnen des App-Tabs.
- Erst der Button **App-Gesundheitscheck prüfen** öffnet die Detailprüfung für Login, Cache, Sync, Service Worker und blockierende Overlays.
- Keine Änderungen an Login, Sync, Kalender, Challenges, Push oder Datenmodell.


## Änderung 2026-05-27: Dashboard-Trennlinien bereinigt

- In der Dashboard-Kalenderkarte erzeugen Friseur- und Urlaub-Zeilen keine eigene zusätzliche obere Linie und keinen Extra-Abstand mehr.
- Zwischen normalen Terminen, Friseur, Geburtstage und Urlaub bleibt dadurch nur noch eine einzelne ruhige Trennlinie sichtbar.
- Abschnittstrenner wie **Demnächst** verwenden ebenfalls keine doppelte obere Linie mehr.
- Änderung betrifft nur Dashboard-CSS und die Dashboard-Row-Markups von Friseur/Urlaub; keine Änderungen an Kalenderdaten, Parsern, Sync, Login oder Challenge-Logik.


## Änderung 2026-05-27: Challenge-Trennlinie vor optionalen Punkten

- Zwischen den normalen Tagesaufgaben und **Optionale Punkte** gibt es jetzt nur noch eine ruhige Trennlinie.
- Die Überschrift `.ch-optional-section` hat keine eigene obere Linie und keinen Extra-Abstand mehr; die bestehende untere Linie des letzten Aufgaben-Eintrags trennt den Bereich.
- Die Änderung betrifft nur das Styling/Markup der Challenges-Ansicht.
- Keine Änderungen an Challenge-Logik, optionalen Aufgaben, Punkten, Datenbank-Sync, Login oder Kalender.


## Änderung 2026-05-27: Wetter-Panel im Friseur-Stil

- Die Wetter-Detailansicht (`features/weather/weatherCard.js` + `features/weather/weatherCard.css`) nutzt jetzt denselben ruhigen Panel-Aufbau wie Friseur/Geburtstage.
- Oben stehen drei Summary-Kacheln: **Jetzt**, **Regen** und **Max / Min**.
- Darunter bleibt eine Highlight-Karte für das aktuelle Wetter mit Temperatur, Zusammenfassung, Regenhinweis, Tageswerten und Sonnenzeiten.
- Die Wetterlogik bleibt fachlich sinnvoll erhalten: Stundenansicht mit 12/24-h-Schalter, Regenmarkierungen und 7-Tage-Ausblick bleiben sichtbar.
- Die Änderung betrifft nur die Darstellung des Wetter-Panels; Wetter-Service, Standortlogik, Pollen, Benachrichtigungen, Login, Sync, Kalender und Challenges bleiben unverändert.


## Änderung 2026-06-01: App-Gesundheitscheck Interaktion

- Die Prüfung **Interaktion** im App-Gesundheitscheck ignoriert bewusst geöffnete Panels wie Einstellungen samt aktivem Panel-Overlay.
- Rot wird nur noch angezeigt, wenn eine geschlossene oder hängende Ebene Klicks blockiert.
- Keine Änderung an Login, Datenbank-Sync, Google Kalender, Push, Challenges oder Datenmodell.

## Änderung 2026-06-01: Version 0.1.0002 und scrollbare Einstellungen-Tabs

- Die sichtbare App-Version im Einstellungen-Tab **App** wurde von `0.1.0001` auf `0.1.0002` erhöht.
- Regel festgelegt: Bei jeder zukünftigen Code-Anpassung wird die App-Version mit hochgezogen und in `CLAUDE.md` dokumentiert.
- Die Einstellungen-Tabs sitzen jetzt in einem horizontal scrollbaren Bereich mit kleinen Links-/Rechts-Buttons.
- Auf schmalen Ansichten bleiben die Tab-Labels mit Icons unverändert; es werden keine nummerierten Tabs eingeführt.
- Änderung betrifft nur `features/settings/settingsPanel.js`, `features/settings/settingsPanel.css` und diese Dokumentation.
- Keine Änderung an Login, Datenbank-Sync, Google Kalender, Push, Challenges, Kalenderdaten oder Datenmodell.

## Änderung 2026-06-02: Version 0.1.0003 und Friseur-Endzeitlogik

- Die sichtbare App-Version im Einstellungen-Tab **App** wurde von `0.1.0002` auf `0.1.0003` erhöht.
- Der Friseur-Tracker bewertet Termine jetzt nach Start- und Enduhrzeit, nicht mehr nur nach dem Tagesdatum.
- Während eines Termins erscheint **Läuft gerade**, nach der Enduhrzeit am selben Tag **Heute erledigt · HH:MM Uhr**.
- Ab dem Folgetag ohne neuen Termin erscheint **Neuer Termin offen** mit Bezug auf den letzten Termin, z. B. **Letzter Termin gestern · HH:MM Uhr** oder **Letzter Termin vor 2 Tagen**.
- **Friseurtermin überfällig** wird erst angezeigt, wenn kein neuer Termin geplant ist und die eingestellte Erinnerungsgrenze erreicht wurde.
- Das Friseur-Panel nutzt dieselbe Zeitlogik, sodass ein Termin nach seiner Enduhrzeit direkt als **Vergangen** statt als **Nächster** markiert wird.
- Änderung betrifft `features/friseur/friseur.js`, den alten Fallback in `app.js`, `features/settings/settingsPanel.js` und diese Dokumentation.
- Keine Änderung an Login, Datenbank-Sync, Google Kalender, Push, Challenges, Kalenderdatenmodell oder Firebase-Struktur.



## Änderung 2026-06-02: Version 0.1.0004 und Termin-Teilen

- Die sichtbare App-Version im Einstellungen-Tab **App** wurde von `0.1.0003` auf `0.1.0004` erhöht.
- Neue Datei `core/calendar/eventShare.js` ergänzt: Termine können als `.ics` Kalenderdatei erzeugt werden.
- Die Teilen-Funktion nutzt zuerst die native Gerätefreigabe. Dadurch können iOS und Android WhatsApp, Nachrichten, Mail, AirDrop oder andere Apps anbieten.
- Zusätzlich gibt es Fallbacks für Kalenderdatei laden, WhatsApp-Text öffnen und Text kopieren.
- Empfänger müssen den Termin aus Sicherheitsgründen selbst im eigenen Kalender bestätigen; automatisches Eintragen ohne Bestätigung wird nicht erzwungen.
- Kalender-Terminpanels zeigen bei bestehenden lokalen und Google-Terminen jetzt die neue Teilen-Karte an.
- Friseur-Termine im Friseur-Panel sind antippbar und öffnen direkt die Teilen-Ansicht für diesen Termin.
- Änderung betrifft `core/calendar/eventShare.js`, `index.html`, `features/calendar/calendarPanels.js`, `features/calendar/calendarPanels.css`, `features/friseur/friseur.js`, `features/friseur/friseur.css`, `features/settings/settingsPanel.js` und diese Dokumentation.
- Keine Änderung an Login, Datenbank-Sync, Push, Challenges, Wetter, Pollen oder Firebase-Struktur.

## Änderung 2026-06-02: Version 0.1.0005 und Kalender-Termin-Teilen

- Die sichtbare App-Version im Einstellungen-Tab **App** wurde von `0.1.0004` auf `0.1.0005` erhöht.
- Die Teilen-Funktion wurde aus der Friseur-Terminliste entfernt.
- Die Teilen-Funktion ist jetzt im Kalender-Terminpanel verfügbar.
- Lokale Termine, an Google übertragene Termine und direkt aus Google geladene Termine können dort als `.ics` Kalenderdatei geteilt, heruntergeladen, als WhatsApp-Text geöffnet oder als Text kopiert werden.
- Der Aufruf erfolgt über Kalender > Tag oder Termin anklicken > Bereich **Termin teilen**.


## Version 0.1.0006
- WhatsApp-Terminfreigabe öffnet bevorzugt direkt die WhatsApp-App per Deep-Link.
- Fallback auf wa.me nur wenn keine App verfügbar ist.
- ICS-Datei wird weiterhin automatisch erzeugt und bereitgestellt.


## Persönliche Pollen-Benachrichtigungen
- Die bestehende Benachrichtigungslogik in `core/weather/weatherRules.js` darf Hinweise aus `features/weather/pollenSymptoms.js` einbeziehen.
- Es wird kein neuer Push-Dialog gestartet und kein Firebase-Auto-Start ausgelöst.
- Hinweise erscheinen nur, wenn Pollenalarme aktiv sind und lokale Symptom-Muster ausreichend Daten haben.


## Version 0.1.0012
- Pollen ist ein eigener Hauptreiter nach Challenges.
- Dashboard bleibt als kompakte Zusammenfassung erhalten.
- Große Pollenbereiche wie Allergieprofil, Symptome, Auswertung, Peak, Trend und 7-Tage-Ausblick liegen im Pollen-Reiter.
- Unnötige erklärende Infotexte zur Datenquelle, zum Antippen des Allergieprofils und zum Firebase-Sync wurden aus der UI entfernt.
- FAB bleibt weiterhin nur im Kalender sichtbar.
