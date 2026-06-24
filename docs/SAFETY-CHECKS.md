# Change Safety Checks

Diese Checks sind Pflicht, bevor und nachdem App-Code geaendert wird. Reine Dokumentationsaenderungen brauchen keine Browser-Sichtpruefung, duerfen aber keine Runtime-Dateien beruehren.

## Before Editing

- Betroffenes System klar benennen: zum Beispiel Dashboard, Kalender, Challenges, Pollen, Settings, Firebase, Push oder GitHub-Update.
- Vorhandene Implementierung lesen, nicht raten.
- Bei Layoutproblemen die aktuelle Cascade und die tatsaechlichen DOM-Klassen pruefen.
- Keine gleichzeitigen Aenderungen an Logik, CSS und Sync, wenn sie nicht direkt zusammengehoeren.

## Runtime Files

Diese Dateien gelten als Runtime-Dateien und duerfen bei reiner Doku-Arbeit nicht geaendert werden:

- `index.html`
- `app.js`
- `change-pre.js`
- `change-post.js`
- `change.css`
- `styles/*.css`
- `core/**`
- `features/**`
- `firebase/**`
- `icons/**`
- `public/**`

## Syntax Baseline

Nach JavaScript-Aenderungen mindestens die betroffenen Dateien pruefen. Fuer die aktuelle Baseline:

```powershell
node --check app.js
node --check change-pre.js
node --check change-post.js
node --check features/pollen/pollenView.js
node --check features/settings/settingsPanel.js
node --check features/calendar/calendar-logic.js
```

Wenn `node` nicht im `PATH` liegt, den gebuendelten Codex-Node verwenden:

```powershell
& 'C:\Users\ak219\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check .\app.js
```

## Browser Checks

- Layoutpruefungen immer ueber einen lokalen HTTP-Server ausfuehren.
- Nicht per `file://` testen, weil Stylesheet-/CSSOM-Pruefungen dort falsche Ergebnisse liefern koennen.
- Desktop und Mobile pruefen.
- Mindestens diese Views oeffnen: Dashboard, Kalender, Challenges, Pollen, Einstellungen.
- Pruefen: kein horizontaler Overflow, keine abgeschnittenen HeroCards, keine verdeckten Buttons, Bottom-Nav mobil stabil.

## Visual Regression

Bei UI-Aenderungen gegen die aktuelle v0.1.0292-Referenz vergleichen:

- Dashboard Desktop und Mobile.
- Challenges Desktop und Mobile.
- HeroCard-Geometrie, Farben, Illustration, Statistikbereich.
- Mobile Abstaende zum Header und zur Bottom-Nav.

## Release Checks

- `CLAUDE.md` enthaelt einen Eintrag fuer die Zielversion.
- `CHANGELOG.md` enthaelt denselben Zielversionseintrag.
- Sichtbare App-Versionen werden nur bei echten App-Versionen erhoeht.
- Update-ZIP enthaelt den kompletten App-Baum, nicht nur geaenderte Dateien.
