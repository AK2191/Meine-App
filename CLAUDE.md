# CLAUDE.md — Change App
> **Einzige Wahrheit** über Struktur, Regeln und Arbeitsweise.
> Vor jeder Änderung lesen. Nach jeder Änderung aktualisieren.
> Letzte Aktualisierung: Mai 2026 — Challenge-Links + Mobile-Stabilisierung

---

## 1. Vollständige Dateistruktur

```
change-app/
│
├── index.html                          ← Nur HTML + <link>/<script>. Kein Inline-CSS/JS.
│
├── CLAUDE.md                           ← Diese Datei — immer aktuell halten
│
├── styles/
│   ├── tokens.css                      ← EINZIGE Stelle für alle Design-Variablen
│   └── app.css                         ← Alle UI-Styles (Cards, Buttons, Layout...)
│
├── change.css                          ← Feature-Overrides (Challenge-Layout, Dashboard)
│
├── core/                               ← NUR Logik. Kein HTML. Kein document.querySelector.
│   ├── firestore-guard.js              ← MUSS ZULETZT LADEN — kritisch!
│   │                                       • publishChallengesToFirestore → No-Op
│   │                                       • listenLiveChallenges → deaktiviert
│   │                                       • reqNotifPermission → nur Browser-Dialog
│   │                                       • Settings-Button explizit rebinden
│   │
│   ├── bootstrap.js                    ← Kalender-Initialisierung
│   ├── misc.js                         ← Kleine Helfer
│   ├── calendar/
│   │   └── calendarModel.js            ← window.ChangeCalendarModel
│   ├── integrations/
│   │   ├── firebaseAuthBridge.js
│   │   └── googleSyncStatus.js
│   ├── activity/
│   │   └── playerActivity.js
│   ├── weather/
│   │   ├── weatherStore.js             ← window.ChangeWeatherStore
│   │   ├── weatherService.js           ← window.ChangeWeatherService
│   │   └── weatherRules.js            ← Regen/Pollen-Benachrichtigungen
│   ├── notifications/
│   │   ├── notificationStore.js        ← window.ChangeNotificationStore
│   │   ├── notificationCenter.js       ← checkNotifications(), updateBellIndicator()
│   │   ├── pushController.js           ← window.ChangePushController
│   │   └── notify-style.js
│   └── ui/
│       └── viewState.js                ← window.ChangeViewState
│
├── features/
│   ├── calendar/
│   │   ├── calendarPanels.js           ← Tages-Panel, Event-Panel
│   │   ├── calendarPanels.css
│   │   └── calendar-logic.js           ← Kalender-Rendering (FINAL-Version)
│   │                                       Darf Challenge-UI nur als Fallback rendern.
│   │                                       Wenn challenges.js geladen ist, muss an
│   │                                       window.renderChallenges delegiert werden.
│   │
│   ├── challenges/
│   │   ├── challenge-sync.js           ← Firebase-Sync: change_completions + change_players
│   │   ├── challenges.js               ← KOMPLETTER Challenge-Neubau
│   │   │                                   • Pool: 40 Übungen (hardcoded, kein Firestore)
│   │   │                                   • Täglich 7 deterministisch per Datum
│   │   │                                   • 2 feste Optionale (Fitness 30min, Spazieren 10min)
│   │   │                                   • Markiert renderChallenges mit __changeChallenges
│   │   │                                   • Befüllt window.challenges für Legacy-Code
│   │   │                                     inklusive url/link/youtubeUrl
│   │   │                                   • Kein blindes 10s-Neurendern auf Mobile
│   │   └── challenges-mobile.css       ← Kompaktes Mobile-Layout
│   │                                       Grid: Icon | Body+ActionRow | Punkte
│   │                                       "Übung ansehen ↗" + [Erledigen] auf einer Zeile
│   │
│   ├── dashboard/
│   │   └── dashboard-logic.js          ← Dashboard-Aufbau
│   ├── settings/
│   │   ├── settingsPanel.js            ← KANONISCHES Settings-Panel
│   │   │                                   Lädt VOR settings-logic.js
│   │   │                                   Enthält: Wetter, Pollen, Push, Google-Sync
│   │   └── settings-logic.js           ← Legacy-/Sync-Helfer
│   │                                       Darf openSettingsPanel nur an
│   │                                       ChangeSettingsPanel.open delegieren
│   ├── notifications/
│   │   ├── notificationBell.js         ← window.openNotifPanel
│   │   │                                   ⚠ Überschreibt window.reqNotifPermission!
│   │   │                                      firestore-guard.js setzt es zurück.
│   │   └── notificationBell.css
│   ├── weather/
│   │   ├── weatherCard.js
│   │   └── weatherCard.css
│   └── vacation/
│       ├── vacationPanel.js
│       └── vacationPanel.css
│
├── app.js                              ← Hauptlogik (aus index.html extrahiert)
│                                           Legacy-Code kann renderChallenges setzen;
│                                           challenges.js übernimmt danach kanonisch.
├── change-pre.js                       ← Sport-Pool (Legacy), Auto-Challenges, Routing
│                                           ⚠ Setzt window.challenges — wird von
│                                              challenges.js überschrieben
├── change-post.js                      ← App-Init, Firebase, Google-Sync
├── firebase-config.js                  ← Firebase-Credentials (NIE ändern)
├── firebase-messaging-sw.js            ← Service Worker (NIE ändern)
├── manifest.json                       ← PWA-Manifest (NIE ändern)
└── firestore.rules                     ← Firestore-Sicherheitsregeln
```

---

## 2. Script-Ladereihenfolge in index.html (KRITISCH)

```
Google GSI (async)
Firebase SDKs (extern, compat v10)
  → firebase-config.js
  → core/integrations/firebaseAuthBridge.js
  → core/bootstrap.js
  → canvas-confetti (extern, cdn.jsdelivr.net)
  → core/calendar/calendarModel.js
  → core/integrations/googleSyncStatus.js
  → core/activity/playerActivity.js
  → core/weather/weatherStore.js
  → core/weather/weatherService.js
  → core/weather/weatherRules.js
  → core/notifications/notificationStore.js
  → core/notifications/notificationCenter.js
  → core/notifications/pushController.js
  → core/notifications/notify-style.js
  → core/ui/viewState.js
  → core/misc.js
  → change-pre.js
  → change-post.js
  → app.js
  → features/notifications/notificationBell.js
  → features/calendar/calendarPanels.js
  → features/calendar/calendar-logic.js
  → features/weather/weatherCard.js
  → features/vacation/vacationPanel.js
  → features/settings/settingsPanel.js      ← kanonisches Settings-Panel zuerst
  → features/settings/settings-logic.js     ← Legacy-/Sync-Helfer danach; delegiert openSettingsPanel
  → features/dashboard/dashboard-logic.js
  → features/challenges/challenges.js       ← kanonische Challenge-UI, muss nach calendar-logic laden
  → core/firestore-guard.js                 ← IMMER ZULETZT
```

**CSS-Ladereihenfolge:**
```
styles/tokens.css
styles/app.css
change.css
features/notifications/notificationBell.css
features/calendar/calendarPanels.css
features/settings/settingsPanel.css
features/challenges/challenges-mobile.css
features/weather/weatherCard.css
features/vacation/vacationPanel.css
```

---

## 2.1 Settings-System (WICHTIG)

- `features/settings/settingsPanel.js` ist der einzige Besitzer der Settings-UI.
- `features/settings/settings-logic.js` bleibt für Legacy-Funktionen, Sync-Helfer und alte globale Aliase geladen.
- `settings-logic.js` darf kein zweites Settings-Panel mehr rendern. `window.openSettingsPanel(...)` muss an `window.ChangeSettingsPanel.open(...)` delegieren, sobald `settingsPanel.js` verfügbar ist.
- Push bleibt zentral über die Glocke (`features/notifications/notificationBell.js` + `core/notifications/*`). Keine zusätzlichen Push-Buttons in den Settings einbauen.
- Google-Sync bleibt ein eigener Schalter im Sync-Tab; bei Aktivierung wird neu synchronisiert.

---

## 3. Bekannte Timing-Konflikte (WICHTIG)

| Zeitpunkt | Was passiert | Gegenmaßnahme |
|-----------|-------------|---------------|
| 120ms | core/misc.js kann Kalender früh rendern | curDate/currentCalView nur über Safe-Helper initialisieren |
| 150–600ms | Legacy-Code kann renderChallenges setzen | challenges.js markiert kanonischen Renderer mit `__changeChallenges` |
| 2000ms / 5600ms | calendar-logic.js aktualisiert Kalender-/Punkte-Helper | Darf `window.renderChallenges` nur setzen, wenn kein `__changeChallenges` vorhanden ist |
| Mobile Scroll | Wiederholtes Blind-Rendern setzt Touch-/Scroll-Zustand zurück | challenges.js rendert nur neu, wenn der aktuelle DOM-Owner nicht `change-challenges` ist |

---

## 4. Firestore-Nutzung

| Collection | Lesen | Schreiben | Wer |
|---|---|---|---|
| `change_completions` | ✅ onSnapshot | ✅ bei Erledigen | challenge-sync.js + challenges.js |
| `change_players` | ✅ onSnapshot | ✅ bei Login | challenge-sync.js |
| `change_settings` | ✅ einmalig | ✅ bei Änderung | settingsPanel.js |
| `change_challenges` | ❌ | ❌ blockiert | firestore-guard.js → No-Op |

**REGEL:** Sport-Challenges leben NUR im App-Code (challenges.js Pool).
`change_challenges` Collection in Firebase kann/sollte gelöscht werden.

---

## 5. Design-System (tokens.css)

```css
/* Primärfarbe */
--acc:   #2D6A4F   (Forest Green, Light Mode)
--acc:   #4ADE80   (Hell-Grün, Dark Mode via [data-theme="dark"])

/* Hintergrund */
--bg:    #F8F7F3   / #0F0F0F (dark)
--s1:    #FFFFFF   / #1A1A1A (Cards)
--b1:    rgba(0,0,0,.07) / rgba(255,255,255,.07) (Borders)

/* Text */
--t1:    #18181B   / #F4F4F5 (Primär)
--t3:    #71717A   / #A1A1AA (Gedimmt)

/* Fonts */
--font:  'Plus Jakarta Sans', system-ui
--mono:  'JetBrains Mono', monospace
```

**Dark Mode:** `document.documentElement.setAttribute('data-theme', 'dark')`

**Regel:** Nie Hex-Codes außerhalb von tokens.css. Immer `var(--acc)` statt `#2D6A4F`.

---

## 6. Challenge-System

### Pool & Auswahl
- **40 Übungen** hardcoded in `features/challenges/challenges.js`
- **7 pro Tag** deterministisch: `seed = Datum → offset in sortiertem Array`
- **2 feste Optionale** immer am Ende: `opt_fitness_30` (+30P) und `opt_walk_10` (+15P)
- IDs: `sp_squat_10`, `sp_plank_30`, `opt_fitness_30` etc. (nie `auto_*` oder `sport_*`)

### Punkte-Flow
```
completeChallenge(id)
  → Completion-Record erstellen (id, challengeId, playerId, date, points)
  → window.challengeCompletions.push(record)
  → ls('challenge_completions', ...) speichern
  → publishCompletionToFirestore(record) → change_completions
  → challenge:daily:DATUM als gelesen markieren (Glocke bleibt stabil)
  → updateBellIndicator() (NICHT checkNotifications — öffnet kein Panel)
  → renderChallenges()
```

### Was NICHT passiert
- ❌ Kein Schreiben in `change_challenges`
- ❌ Kein `checkNotifications()` nach Erledigen (würde Glocke hochzählen)
- ❌ Kein `Object.defineProperty` auf `window.challenges` (blockiert Legacy-Code)
- ❌ Kein dauerhaftes Neurendern im 10-Sekunden-Takt, wenn die Challenge-Liste bereits von `challenges.js` gerendert wurde
- ✅ YouTube-Links müssen im Pool und im Legacy-Export (`url`, `link`, `youtubeUrl`) erhalten bleiben

---

## 7. Kalender-Tages-Struktur

```
┌─────────────────────────────┐
│ 10  Muttertag               │  ← Datum + Feiertag (klein)
│ ████████████ Urlaub         │  ← Zeiträume: IMMER erste Zeile, volle Breite
│ 09:00 Meeting               │  ← Einzeltermine darunter (max. 2)
│ +1 mehr                     │
│                         +15 │  ← Punkte-Badge: nur bei > 0, unten rechts
└─────────────────────────────┘
```

---

## 8. Bekannte Bugs & Workarounds

| Problem | Ursache | Fix |
|---|---|---|
| Settings nicht klickbar | notificationBell.js überschreibt onclick | firestore-guard.js rebindet Button bei 0/500/1500/3000ms |
| Challenges verschwinden | calendar-logic.js Override bei 5600ms | challenges.js assertOwnership bei 6500ms + setInterval |
| Glocke zählt nach Erledigen hoch | checkNotifications() baut Notif neu auf | markRead('challenge:daily:DATE') + updateBellIndicator() statt checkNotifications() |
| Notif-Panel öffnet beim Start | notificationBell.js überschreibt reqNotifPermission | firestore-guard.js setzt reqNotifPermission zurück |
| Firestore-Schreibflut | publishChallengesToFirestore bei jedem render | firestore-guard.js → No-Op |

---

## 9. Neues Feature — Checkliste

```
[ ] 1. core/ (Logik) oder features/ (UI)?
[ ] 2. Schreibt es Firestore? → Welche Collection? Nötig?
[ ] 3. Timing-Konflikt möglich? → Reassert-Strategie planen
[ ] 4. CSS nur mit Tokens (var(--acc), keine Hex)
[ ] 5. In index.html einbinden (Reihenfolge beachten!)
[ ] 6. Testen: Kalender → Dashboard → Challenge erledigen → Settings öffnen
[ ] 7. CLAUDE.md aktualisieren
[ ] 8. Commit auf dev, dann merge auf main
```

---

## 10. Absolut Verboten

- ❌ Inline CSS oder JS in index.html
- ❌ publishChallengesToFirestore() aufrufen (No-Op, bleibt so)
- ❌ Neue Patch-Dateien anlegen (change-fix-v6.js etc.)
- ❌ Object.defineProperty auf window.challenges
- ❌ checkNotifications() nach Challenge-Erledigen
- ❌ !important in CSS (außer für gezielte Overrides mit Kommentar)
- ❌ Hex-Codes außerhalb von tokens.css

---

## 11. Dateien die NICHT geändert werden

| Datei | Grund |
|---|---|
| `firebase-config.js` | Firebase-Credentials |
| `firebase-messaging-sw.js` | Service Worker — Scope kritisch |
| `manifest.json` | PWA-Definition |
| `firestore.rules` | Sicherheitsregeln |
| `functions/` | Cloud Functions — separater Deploy |
