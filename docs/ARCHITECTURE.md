# Change Architecture Guide

Diese Datei beschreibt die aktuelle Struktur der Change App und die Regeln fuer alle kuenftigen Aenderungen. Ziel ist Wartbarkeit, ohne das bestehende Bild oder bestehende Funktionen zu beschaedigen.

## Current Shape

- Change ist eine statische Web-App aus `index.html`, CSS und klassischen Browser-Scripts.
- `index.html` definiert das Grund-Markup, die CSS-Ladereihenfolge und die Script-Ladereihenfolge.
- `core/` enthaelt fachliche Logik und Integrationen ohne eigenes View-Markup, zum Beispiel Kalender-, Challenge-, Wetter-, Sync-, Security- und Notification-Logik.
- `features/` enthaelt feature-spezifische UI, Panels, Rendering und Feature-CSS.
- `styles/` enthaelt Design-Tokens, Basis-Styles und die gemeinsame App-Shell.
- `core/data/dataModel.js` ist die neue passive Datenschicht fuer Canonical-Keys, Normalisierung, Audit und nicht-destruktive Migration.
- `core/settings/settingsStore.js` schreibt den Canonical-Snapshot fuer Einstellungen; bestehende Einzel-Keys bleiben fuer die UI und Legacy-Module erhalten.
- `core/calendar/eventStore.js` ist die zentrale lokale Datenquelle fuer Kalendertermine; Feature-UI schreibt lokale Events ueber Store/CalendarModel, nicht direkt in einzelne Storage-Keys.
- `core/challenges/challengeStore.js` ist die zentrale lokale Datenquelle fuer Challenges, Punkte und Mitspieler; Feature-UI schreibt diese Daten ueber den Store.
- `change-pre.js`, `change-post.js` und `app.js` sind historische Legacy-Hotspots. Sie duerfen nicht als Muster fuer neue Arbeit dienen.

## Boundaries

- Neue fachliche Logik gehoert zuerst in `core/` oder in das passende Feature-Modul.
- Neue Datenlogik gehoert zuerst in `core/data/dataModel.js` oder in ein klar benanntes `core/data/`-Modul.
- Neue UI gehoert in `features/<feature>/`, wenn sie nur ein Feature betrifft.
- Gemeinsame Shell-Regeln gehoeren nach `styles/appShell.css`; Feature-spezifische Regeln gehoeren in die jeweilige Feature-CSS-Datei.
- Wiederverwendbare Browser-APIs sollen unter klar benannten Namespaces liegen, zum Beispiel `window.ChangeCalendarModel`, `window.ChangePollenView` oder `window.ChangeAppStatus`.
- Neue globale Funktionen ohne `Change*`-Namespace sind nur erlaubt, wenn bestehendes Inline-Markup sie zwingend braucht.

## Script Order

Die aktuelle Script-Reihenfolge ist Teil der App-Architektur. Aenderungen daran sind riskant und muessen separat geplant und getestet werden.

1. Externe Provider: Google, Firebase, Confetti.
2. Firebase-Konfiguration.
3. Passive Daten- und Core-Module.
4. Legacy-Bruecken: `change-pre.js`, `change-post.js`, `app.js`.
5. `features/`-Module.
6. Spaete Guards: Firebase-Sync, Firestore-Guard, Interaction-Guard.

## Change Rules

- Immer nur ein System pro Schritt aendern: zum Beispiel nur Challenges-CSS, nur Pollen-Rendering oder nur Firebase-Regeln.
- Bestehende Funktionen nicht ersetzen, bevor ihre Datenquellen, globalen Abhaengigkeiten und UI-Aufrufer bekannt sind.
- Keine neuen Patch-Dateien anlegen. Vorhandene Legacy-Patches werden schrittweise in passende `core/`- oder `features/`-Dateien ueberfuehrt.
- Keine parallele Neuentwicklung derselben Logik. Wenn eine Funktion bereits in `core/` existiert, muss die UI diese API verwenden.
- Datenmigrationen sind nie automatisch beim Start aktiv. Sie muessen explizit aufgerufen werden, ein Backup schreiben und duerfen in der ersten Phase keine Alt-Keys loeschen.
- Refactors muessen verhaltensgleich sein und zuerst durch Syntaxchecks und Screenshots abgesichert werden.

## Release Constraints

- Der GitHub-Update-Workflow ersetzt den App-Baum aus dem ZIP. Update-ZIPs muessen deshalb immer den vollstaendigen App-Baum enthalten.
- `CLAUDE.md` und `CHANGELOG.md` muessen bei echten Versionen gemeinsam erhoeht werden.
- Versionseintraege in `CLAUDE.md` duerfen nicht entfernt werden, weil der Update-Flow daraus Zielversionen erkennt.
