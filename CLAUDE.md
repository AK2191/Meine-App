# CLAUDE.md — Change App · Architekturregeln
> Diese Datei ist die einzige Wahrheit über Struktur, Stil und Arbeitsweise.
> Vor jeder Änderung lesen. Nach jeder Änderung Kalender + Dashboard + Challenges testen.

---

## 1. Aktuelle Dateistruktur

```
change-app/
│
├── index.html                        ← Nur HTML-Gerüst + <script>/<link> Tags
│
├── styles/
│   ├── tokens.css                    ← EINZIGE Stelle für Farben, Abstände, Radii
│   └── app.css                       ← Alle UI-Styles
│
├── change.css                        ← Feature-Overrides
│
├── core/
│   ├── firestore-guard.js            ← MUSS VOR ALLEM ANDEREN LADEN
│   │                                    Verhindert Firestore-Schreibflut
│   │                                    publishChallengesToFirestore = No-Op
│   │                                    listenLiveChallenges = deaktiviert
│   ├── bootstrap.js
│   ├── misc.js
│   ├── calendar/
│   │   └── calendarModel.js          ← window.ChangeCalendarModel
│   ├── integrations/
│   │   ├── firebaseAuthBridge.js
│   │   └── googleSyncStatus.js
│   ├── activity/
│   │   └── playerActivity.js
│   ├── weather/
│   │   ├── weatherStore.js
│   │   ├── weatherService.js
│   │   └── weatherRules.js
│   ├── notifications/
│   │   ├── notificationStore.js
│   │   ├── notificationCenter.js
│   │   ├── pushController.js
│   │   └── notify-style.js
│   └── ui/
│       └── viewState.js              ← window.ChangeViewState
│
├── features/
│   ├── calendar/
│   │   ├── calendarPanels.js
│   │   ├── calendarPanels.css
│   │   └── calendar-logic.js
│   ├── challenges/
│   │   ├── challenge-sync.js         ← Firebase-Sync für Completions/Players
│   │   └── challenge-fixes.js        ← MUSS ZULETZT LADEN
│   │                                    Push-Counter Fix (max 7, nicht 24)
│   │                                    Klick-Fix (Erledigen + Mitspieler)
│   │                                    Wetter/Pollen als Browser-Push
│   ├── dashboard/
│   │   └── dashboard-logic.js
│   ├── settings/
│   │   ├── settingsPanel.js          ← MUSS NACH settings-logic.js LADEN
│   │   └── settings-logic.js
│   ├── notifications/
│   │   ├── notificationBell.js
│   │   └── notificationBell.css
│   ├── weather/
│   │   ├── weatherCard.js
│   │   └── weatherCard.css
│   └── vacation/
│       ├── vacationPanel.js
│       └── vacationPanel.css
│
├── app.js                            ← Hauptlogik (aus index.html extrahiert)
├── change-pre.js                     ← Sport-Pool, Auto-Challenges, Routing
├── change-post.js                    ← App-Init, Firebase, Google-Sync
├── firebase-config.js                ← Credentials (nie ändern)
└── firebase-messaging-sw.js          ← Service Worker (nie ändern)
```

---

## 2. Script-Ladereihenfolge in index.html (KRITISCH — nicht ändern!)

```
Firebase SDKs (extern)
  → firebase-config.js
  → core/firestore-guard.js          ← ERSTES eigenes Script! Schreibschutz.
  → core/integrations/firebaseAuthBridge.js
  → core/bootstrap.js
  → canvas-confetti (extern)
  → core/calendar/calendarModel.js
  → core/integrations/googleSyncStatus.js
  → core/activity/playerActivity.js
  → core/weather/*
  → core/notifications/*
  → core/ui/viewState.js
  → core/misc.js
  → change-pre.js
  → change-post.js
  → app.js
  → features/notifications/*
  → features/calendar/*
  → features/weather/*
  → features/vacation/*
  → features/settings/settings-logic.js
  → features/settings/settingsPanel.js  ← NACH settings-logic!
  → features/challenges/challenge-sync.js
  → features/dashboard/dashboard-logic.js
  → features/challenges/challenge-fixes.js  ← LETZTES Script!
```

---

## 3. Firestore-Nutzung — was darf schreiben/lesen

| Collection | Lesen | Schreiben | Wer |
|---|---|---|---|
| `change_completions` | ✅ onSnapshot | ✅ bei Erledigen | challenge-sync.js |
| `change_players` | ✅ onSnapshot | ✅ bei Login/Live | challenge-sync.js |
| `change_settings` | ✅ einmalig | ✅ bei Änderung | settingsPanel.js |
| `change_challenges` | ❌ deaktiviert | ❌ deaktiviert | firestore-guard.js blockiert |

**REGEL:** Sport-Challenges leben NUR im App-Code (change-pre.js / app.js).
Nicht in Firestore. Die `change_challenges` Collection kann gelöscht werden.

**WARUM:** Jedes `renderChallenges()` → `ensureDailyAutoChallenges()` → `publishToFirestore()`
hat 24 Writes erzeugt. Bei 4× Startup = 96 Writes/Start. → Limit erreicht.

---

## 4. Designsystem

| Variable | Light | Dark | Bedeutung |
|---|---|---|---|
| `--acc` | `#2D6A4F` | `#4ADE80` | Primärfarbe (Forest Green) |
| `--bg` | `#F8F7F3` | `#0F0F0F` | Seitenhintergrund |
| `--s1` | `#FFFFFF` | `#1A1A1A` | Card-Hintergrund |
| `--t1` | `#18181B` | `#F4F4F5` | Text primär |

Font: `var(--font)` → Plus Jakarta Sans
Mono: `var(--mono)` → JetBrains Mono

Dark Mode: `document.documentElement.setAttribute('data-theme', 'dark')`

---

## 5. Kalender-Tages-Struktur (STRICT)

```
┌─────────────────────────────┐
│ 10  Muttertag               │  ← Datum + Feiertag (klein)
│ ████████████ Urlaub         │  ← Zeiträume: IMMER oben, volle Breite
│ 09:00 Meeting               │  ← Einzeltermine darunter (max. 2)
│ +1 mehr                     │
│                         +15 │  ← Punkte-Badge: unten rechts, nur > 0
└─────────────────────────────┘
```

---

## 6. Challenges-Regeln

- Max. **7 Pflicht-Challenges** pro Tag (deterministisch aus Pool)
- Max. **2 optionale** (Spazieren, Fitness) — getrennt dargestellt
- Punkte nur bei `done === true` in Firestore (`change_completions`)
- `window.completeChallenge(id)` ist die EINZIGE Stelle die Punkte schreibt
- Push-Benachrichtigung: max. 7 offen (nie 24) — via `challengeScheduleForDate()`

---

## 7. Neues Feature — Checkliste

```
[ ] 1. Gehört es in core/ (Logik) oder features/ (UI)?
[ ] 2. Schreibt es in Firestore? → Welche Collection? Cooldown nötig?
[ ] 3. CSS mit Tokens (var(--acc) statt #2D6A4F)
[ ] 4. In index.html einbinden (Reihenfolge beachten!)
[ ] 5. Testen: Kalender → Dashboard → Challenge abhaken
[ ] 6. CLAUDE.md aktualisieren
```

---

## 8. Verboten

- ❌ Inline CSS oder JS in index.html
- ❌ `publishChallengesToFirestore()` aufrufen — ist No-Op, bleibt so
- ❌ `listenLiveChallenges()` aufrufen — deaktiviert
- ❌ Neue Patch-Dateien (change-fix-v5.js etc.)
- ❌ `!important` in CSS
- ❌ Hex-Codes außerhalb von tokens.css

---

*Letzte Aktualisierung: Mai 2026 · v3*
