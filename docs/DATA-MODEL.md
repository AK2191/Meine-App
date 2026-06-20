# Change Data Model

Diese Datei beschreibt den neuen Zielzustand der Datenschicht. Wichtig: Der neue Datenkern loescht nichts und migriert nicht automatisch beim App-Start.

## Goal

- Alle bestehenden Daten bleiben erhalten.
- Alte LocalStorage-Keys werden eingelesen, normalisiert und in Canonical-Keys zusammengefuehrt.
- Alte Keys werden erst in einem spaeteren, manuell bestaetigten Cleanup geloescht.
- Firestore bleibt die Remote-Schicht, LocalStorage bleibt die lokale Offline-/Cache-Schicht.

## Canonical LocalStorage Keys

- `change_v1_events`: lokale Kalendertermine.
- `change_v1_challenges`: Challenge-Vorlagen und sichtbare Tagesaufgaben.
- `change_v1_challenge_completions`: erledigte Challenges und Punkte.
- `change_v1_challenge_players`: lokale Mitspieler-Sicht.
- `change_v1_settings_snapshot`: zusammengefuehrte Einstellungen als neue Uebersicht.
- `change_v1_pollen_symptoms`: lokale Pollen-Symptomtage.
- `change_v1_data_model_migration_meta`: letzte nicht-destruktive Migration.

## Legacy Keys

Diese Keys werden weiter gelesen, aber nicht mehr als Zielmodell betrachtet:

- Events: `events`, `change_v2_events`.
- Challenges: `challenges`.
- Completions: `challenge_completions`, `challengeCompletions`.
- Players: `challenge_players`, `challengePlayers`.

Die App darf diese Keys in der Uebergangsphase noch mitschreiben, damit alte Module nicht brechen. Neues Datenmodell und neue Werkzeuge sollen die Canonical-Keys bevorzugen.

## Firestore Collections

- `change_players`: freigegebene Mitspielerprofile ohne Push-Token.
- `change_completions`: erledigte Challenges und Punkte.
- `change_challenges`: geteilte Challenge-Vorlagen und aktuelle Auto-Challenges.
- `change_settings`: nutzerbezogene Einstellungen.
- `change_push_tokens`: private Push-Token pro Nutzer und Geraet.
- `change_nudges`: Anfeuern-Nachrichten.
- `change_pollen_symptoms`: Pollen-Symptomtage pro Nutzer.

## New Data Layer

`core/data/dataModel.js` stellt `window.ChangeDataModel` bereit:

- `auditStorage(localStorage)`: liest nur und meldet Canonical-, Legacy- und Cache-Keys.
- `readCanonicalData(localStorage)`: sammelt bestehende Daten aus Canonical- und Legacy-Keys.
- `migrateLocalStorage(localStorage, {dryRun:true})`: simuliert eine Migration.
- `migrateLocalStorage(localStorage, {dryRun:false})`: schreibt Canonical-Keys und ein Backup, loescht aber keine Alt-Keys.

Diese Funktionen duerfen nicht automatisch beim App-Start laufen. Sie sind fuer kontrollierte Wartung, Diagnose und spaetere UI-Schalter gedacht.

## Current Rollout

- v0.1.0294: `ChangeDataModel` wurde als passive, nicht-destruktive Grundlage eingefuehrt.
- v0.1.0295: Challenges/Punkte wurden als erstes Feature-System angebunden. `core/challenges/challengeStore.js` wird nach `core/data/dataModel.js` geladen, liest Canonical- und Legacy-Keys gemeinsam und schreibt Punkte ueber `change_v1_challenge_completions` plus Legacy-Fallbacks.
- v0.1.0296: Lokale Kalender/Events wurden als zweites Feature-System angebunden. `core/calendar/eventStore.js` wird nach `core/data/dataModel.js` geladen, liest `change_v1_events`, `events` und `change_v2_events` gemeinsam und schreibt lokale Termine ueber `change_v1_events` plus Legacy-Fallback `events`.
- Google-Kalender-Cache bleibt davon getrennt: `change_google_events_cache`, `change_v1_google_events_cache` und `window.gEvents` werden nicht migriert oder geloescht.
- v0.1.0298: Settings wurden als Snapshot-Schicht angebunden. `core/settings/settingsStore.js` schreibt `change_v1_settings_snapshot`, wenn Einstellungen im Panel oder ueber Legacy-Helfer geaendert werden.
- Einzelne Settings-Keys bleiben weiterhin aktiv und werden nicht geloescht. Sync-Schalter, Push, Theme, Google-Kalender und Dashboard-Optionen behalten ihre bisherigen Schreibwege; der Snapshot ist eine Wartungs- und Audit-Schicht.

## Migration Order

1. Audit ausfuehren und Bericht sichern.
2. Nicht-destruktive Migration mit `dryRun:true` pruefen.
3. Wenn die Zaehlwerte plausibel sind, mit `dryRun:false` Canonical-Keys und Backup schreiben.
4. App neu laden und Dashboard, Kalender, Challenges, Pollen und Einstellungen pruefen.
5. Erst in einer spaeteren Version Alt-Keys loeschen, wenn mehrere Starts stabil waren.

## Never Delete Without Explicit Backup

- `change_v1_user_info`, `user_info`, `user_info_safe`.
- `change_v1_user_email`, `user_email`.
- `change_v1_client_id`, `client_id`.
- `change_v1_fcm_token`, `fcm_token`.
- `change_push_enabled`, `change_v1_push_enabled`, `change_v2_push_enabled`.
- Alle `change_completions`-Daten, bevor Firestore und LocalStorage abgeglichen sind.

## Audit Script

`scripts/auditDataModel.mjs` prueft statisch, welche Storage-Keys und Firestore-Collections im Code referenziert werden.

```powershell
node scripts/auditDataModel.mjs
node scripts/auditDataModel.mjs --json
```

Optional kann ein JSON-Export von LocalStorage geprueft werden:

```powershell
node scripts/auditDataModel.mjs --storage-export localStorage-export.json
```

Das Script loescht nichts.
