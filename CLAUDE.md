# CLAUDE.md — Change App · Architekturregeln
> Diese Datei ist die einzige Wahrheit über Struktur, Stil und Arbeitsweise.
> Vor jeder Änderung lesen. Nach jeder Änderung Kalender + Dashboard + Challenges testen.

---

## 1. Aktuelle Dateistruktur

```
change-app/
│
├── index.html                  ← Nur HTML-Gerüst + <script>/<link> Tags. Kein CSS, keine Logik.
│
├── styles/
│   ├── tokens.css              ← EINZIGE Stelle für Farben, Abstände, Radii, Fonts
│   └── app.css                 ← Alle UI-Styles. Neue Styles hier anhängen.
│
├── change.css                  ← Feature-Overrides (Challenges, Dashboard-Layout, Mobile)
│
├── core/
│   ├── bootstrap.js            ← Kalender-Initialisierung (früher inline in index.html)
│   ├── misc.js                 ← Kleine Helfer (früher inline in index.html)
│   ├── calendar/
│   │   └── calendarModel.js    ← window.ChangeCalendarModel — Kalender-Datenlogik
│   ├── challenges/
│   │   └── challengeStore.js   ← window.ChangeChallengeStore — zentrale Challenge-Datenquelle
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
│   │   ├── notificationStore.js   ← window.ChangeNotificationStore
│   │   ├── notificationCenter.js
│   │   ├── pushController.js
│   │   └── notify-style.js
│   └── ui/
│       └── viewState.js           ← window.ChangeViewState — View-Routing
│
├── features/
│   ├── calendar/
│   │   ├── calendarPanels.js      ← Tages-Panel, Event-Panel
│   │   ├── calendarPanels.css
│   │   └── calendar-logic.js     ← Rendering-Logik (früher inline)
│   ├── challenges/
│   │   └── challenge-sync.js     ← Punkte-Sync (früher inline)
│   ├── dashboard/
│   │   └── dashboard-logic.js    ← Dashboard-Aufbau (früher inline)
│   ├── settings/
│   │   ├── settingsPanel.js
│   │   ├── settingsPanel.css
│   │   └── settings-logic.js     ← Einstellungen (früher inline)
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
├── app.js                        ← Hauptlogik (früher inline in index.html)
├── change-pre.js                 ← Sport-Pool, Challenge-Wochenbalken, Routing
├── change-post.js                ← App-Init, Firebase, Google-Sync
├── firebase-config.js            ← Firebase-Credentials (nie ändern)
└── firebase-messaging-sw.js      ← Service Worker (nie ändern)
```

---

## 2. Globale Objekte — was wo lebt

| Objekt | Datei | Zweck |
|--------|-------|-------|
| `window.ChangeCalendarModel` | `core/calendar/calendarModel.js` | Kalender-Daten, Datum-Logik, Events |
| `window.ChangeNotificationStore` | `core/notifications/notificationStore.js` | Benachrichtigungs-State |
| `window.ChangeViewState` | `core/ui/viewState.js` | View-Routing (dashboard/calendar/challenges) |
| `window.ChangeChallengeStore` | `core/challenges/challengeStore.js` | Zentrale Challenge-Datenquelle, hält `window.challenges`, `window.challengeCompletions`, `window.challengePlayers` synchron |
| `window.events` | `app.js` / `change-post.js` | Kalender-Events |
| `window.challengePlayers` | `core/challenges/challengeStore.js` | Mitspieler-Array über ChallengeStore |

**Regel:** Logik die `window.ChangeCalendarModel` braucht → immer prüfen ob M geladen ist:
```js
var M = window.ChangeCalendarModel;
if (!M) return; // sicher abbrechen
```

**Challenge-State:** Neue Challenge-Logik darf nicht mehr eigene Arrays als Wahrheit verwenden.
```js
var S = window.ChangeChallengeStore;
if (!S) return;
var challenges = S.getChallenges();
S.replaceChallenges(challenges, { persist: true });
```
`window.challenges` bleibt nur als Kompatibilitäts-Alias für ältere Renderer erhalten.

---

## 3. Design-System (PFLICHT)

### Farben — nur via CSS-Variablen
```css
/* ✓ Richtig */
color: var(--acc);
background: var(--s1);
border: 1px solid var(--b1);

/* ✗ Falsch — nie direkt */
color: #2D6A4F;
background: #FFFFFF;
```

### Tokens-Übersicht (tokens.css)
| Variable | Light | Dark | Bedeutung |
|----------|-------|------|-----------|
| `--acc` | `#2D6A4F` | `#4ADE80` | Primärfarbe (Forest Green → Hell-Grün) |
| `--bg` | `#F8F7F3` | `#0F0F0F` | Seitenhintergrund |
| `--s1` | `#FFFFFF` | `#1A1A1A` | Card-Hintergrund |
| `--b1` | `rgba(0,0,0,.07)` | `rgba(255,255,255,.07)` | Border leicht |
| `--t1` | `#18181B` | `#F4F4F5` | Text primär |
| `--t3` | `#71717A` | `#A1A1AA` | Text gedimmt |
| `--rsm` | `6px` | `6px` | Radius klein |
| `--r` | `10px` | `10px` | Radius normal |
| `--rlg` | `16px` | `16px` | Radius groß |

### Dark Mode
```js
// Ein/Ausschalten — EINZIGE Stelle
document.documentElement.setAttribute('data-theme', 'dark');  // an
document.documentElement.removeAttribute('data-theme');        // aus
```

### Fonts
- **UI:** `var(--font)` → Plus Jakarta Sans
- **Zahlen/Code:** `var(--mono)` → JetBrains Mono

---

## 4. Kalender-Regeln (STRICT)

### Tages-Zelle — Pflicht-Struktur:
```
┌─────────────────────────────┐
│ 10  Muttertag               │  ← Datum + Feiertag (klein)
│ ████████████ Urlaub         │  ← Zeiträume: IMMER oben, volle Breite
│ 09:00 Meeting               │  ← Einzeltermine darunter (max. 2)
│ +1 mehr                     │  ← Bei >2: "+X mehr"
│                         +15 │  ← Punkte-Badge: unten rechts, nur bei > 0
└─────────────────────────────┘
```

**Regeln:**
- Zeiträume = `.ev-chip.multiday` → immer erste Zeile(n)
- Einzeltermine → unter Zeiträumen
- Max. 2 Einzeltermine → dann "+X mehr"
- Punkte-Badge = `.cal-points` → absolut unten rechts
- Kein Element überlappt ein anderes

### CalendarModel nutzen:
```js
var M = window.ChangeCalendarModel;
M.esc(value)          // XSS-sicher escapen
M.titleOf(event)      // Titel
M.rangeOf(event)      // { start, end }
M.timeLabel(event)    // "09:00" oder "Ganztag"
M.sourceOf(event)     // 'google' | 'local'
M.fmtDate(dateKey)    // "10. Mai 2026"
```

---

## 5. Challenges-Regeln

- Zentrale Datenquelle ist `core/challenges/challengeStore.js` / `window.ChangeChallengeStore`
- Keine neuen lokalen Challenge-Arrays als Source of Truth anlegen
- Punkte **nur** wenn `done === true` in Firestore
- `markChallengeDone(id, userId)` ist die EINZIGE Stelle die Punkte schreibt → `features/challenges/challenge-sync.js`
- Im Kalender: nur `.cal-points` Badge ("+15"), kein Icon, kein Label
- Tägliche Auto-Challenges: `window.ensureDailyAutoChallenges()` schreibt immer über `window.ChangeChallengeStore`; `window.challenges` ist nur Kompatibilitäts-Alias

---

## 6. Sync-Regeln

| Schalter | Datei | Was es macht |
|----------|-------|-------------|
| 🔔 Push | `core/notifications/pushController.js` | FCM Push |
| 🔄 Live-Sync | `change-post.js` | Firestore onSnapshot |
| 📅 Google Cal | `core/integrations/googleSyncStatus.js` | Google Calendar API |

**Regel:** Kein `onSnapshot` außerhalb von `change-post.js` starten. Google-Sync bei Toggle-Aktivierung automatisch einmal ausführen.

---

## 7. Neues Feature — Checkliste

```
[ ] 1. Datei: Gehört es in core/ (Logik) oder features/ (UI)?
[ ] 2. Logik in core/[bereich]/[name].js schreiben
[ ] 3. CSS in styles/app.css anhängen (nur Tokens verwenden)
[ ] 4. In index.html einbinden (<script src="...">)
[ ] 5. Testen: Kalender laden → Dashboard öffnen → Challenge abhaken
[ ] 6. Commit auf dev, erst dann merge auf main
```

---

## 8. Verboten

- ❌ Inline CSS oder JS in index.html schreiben
- ❌ Hex-Codes außerhalb von tokens.css
- ❌ Neue Patch-Dateien anlegen (change-fix-v5.js o.ä.)
- ❌ `window.ChangeCalendarModel` in features/ ohne `if (!M) return`
- ❌ Zwei Funktionen die dasselbe tun (Sync, Rendering, Punkte)
- ❌ Direkt auf `main` commiten wenn etwas geändert wurde

---

## 9. Script-Ladereihenfolge in index.html (nicht ändern!)

```
Firebase SDKs
  → firebase-config.js
  → core/integrations/firebaseAuthBridge.js
  → core/bootstrap.js
  → canvas-confetti (extern)
  → core/calendar/calendarModel.js        ← window.ChangeCalendarModel
  → core/integrations/googleSyncStatus.js
  → core/activity/playerActivity.js
  → core/weather/*
  → core/notifications/*                  ← window.ChangeNotificationStore
  → core/notifications/notify-style.js
  → core/ui/viewState.js                  ← window.ChangeViewState
  → core/misc.js
  → change-pre.js                         ← Sport-Pool, Auto-Challenges
  → change-post.js                        ← App-Init, Firebase, Google
  → app.js                                ← Hauptlogik
  → features/notifications/*
  → features/calendar/*
  → features/weather/*
  → features/vacation/*
  → features/settings/*
  → features/challenges/challenge-sync.js
  → features/dashboard/dashboard-logic.js
```

*Letzte Aktualisierung: Mai 2026 · Basiert auf ZIP-Stand des echten Repos*
