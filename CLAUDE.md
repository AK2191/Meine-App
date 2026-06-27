## Start Here - Wartbarkeit
- Vor jeder Aenderung zuerst lesen: `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/STYLEGUIDE.md`, `docs/SAFETY-CHECKS.md`.
- Bestehende Funktionen und das aktuelle Bild von v0.1.0292 nicht ohne passende Syntax- und Screenshot-Pruefung veraendern.
- Runtime-Dateien bei reiner Doku-Arbeit nicht anfassen: `index.html`, `app.js`, `change-pre.js`, `change-post.js`, `styles/`, `core/`, `features/`, `firebase/`, `icons/`, `public/`.
- Versionseintraege in dieser Datei bleiben erhalten, weil der GitHub-Update-Workflow daraus Zielversionen erkennt.
- Neue Arbeit erfolgt klein und systembezogen: ein Feature oder eine Schicht pro Schritt.

## Projekt-Charta (VERBINDLICH — einzige Wahrheit)
„Change" ist eine stabile, skalierbare, wartbare Web-App. Diese Regeln haben Vorrang; bei Änderungen wird diese Datei mitgepflegt.

**Features:** Dashboard (Mitspieler, Punkte, Übersicht) · Kalender (Monat/Jahr/Tagesdetail) · Challenges (Aufgaben + Punkte) · Push-Benachrichtigungen · Live-Sync zwischen Nutzern · Google-Kalender-Integration. **Code anpassen statt patchen — keine Workarounds.**

**Architektur (strikt getrennt):** Logik → `core/` · UI → `features/` · wiederverwendbare Bausteine → `components/`. Modular bauen, neue Features leicht ergänzbar. **Keine doppelte Logik** (kein mehrfacher Sync, kein doppelter Kalender-Code).

**Kalender:** Jeder Tag: Datum oben links · Feiertag klein daneben · Termine darunter (max. 2 sichtbar + „+X mehr") · Challengepunkte klein unten rechts. Zeiträume als **durchgehender Balken** in der **obersten Zeile** (kein Text „Zeitraum"); Einzeltermine immer darunter. **Keine überlappenden Elemente.**

**Challenges:** Punkte nur bei erledigten Aufgaben. Im Kalender nur als kleines Badge unten rechts. Keine großen visuellen Elemente.

**Push / Sync:** Push nur über eine zentrale Steuerung (Glocke). Live-Sync eigener Schalter. Google-Sync eigener Schalter (bei Aktivierung → neu synchronisieren). **Keine doppelten Buttons oder versteckten Funktionen.**

**UI / Design:** minimalistisch (Apple/Notion), klare Hierarchie, viel Weißraum, keine unnötigen Texte/Buttons, keine visuellen Konflikte oder Flackern.

**Arbeitsweise:** kleine, kontrollierte Schritte · nie mehrere Systeme gleichzeitig ändern · nach jeder Änderung Kalender, Dashboard, Challenges prüfen · bei Unsicherheit erst erklären, dann ändern.

**Verboten:** bestehende Funktionen ohne Prüfung überschreiben · doppelte Komponenten · Workarounds statt sauberer Lösungen.

## Version 0.1.0331 - Kalender-Cleanup Schritt 1
- Erster echter Mini-Cleanup auf Basis des Snapshot-Audits: eine fruehe `window.goToday`-Zuweisung im alten `app.js`-Legacy-Block entfernt. Diese Zuweisung wurde spaeter in `app.js` und final von der Kalender-Schicht ueberschrieben.
- Keine Massenbereinigung: keine Renderfunktionen entfernt, keine Kalender-UI veraendert, keine Daten-/Sync-/Firebase-Aenderung.
- Nach Upload pruefen: Kalender oeffnen und `window.ChangeCalendarOwnerAudit.print()` ausfuehren. `goToday` muss weiterhin final aus der spaeten Kalender-Schicht kommen; bei Abweichung keine weitere Bereinigung.
- Cache-Busting ?v=0.1.0331.
- Geaendert: `app.js`, `index.html`, `core/calendar/calendarOwnerAudit.js`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`, `scripts/auditDataModel.mjs`, Asset-/Versionspruefung.

## Version 0.1.0330 - Kalender-Snapshot-Audit
- Kalender-Owner-Audit aus 0.1.0329 korrigiert: die Live-Konsole zeigte `blocked:true`/`pre-audit-current`, weil die Globals beim spaeten Laden schon nicht mehr per Setter beobachtbar waren.
- `core/calendar/calendarOwnerAudit.js` ist jetzt ein reiner Snapshot-Recorder. Er ueberschreibt keine Kalenderfunktion und installiert keine Setter mehr.
- `index.html` laedt das Audit frueher und setzt Messpunkte nach `core/misc.js`, `change-pre.js`, `change-post.js`, `app.js`, `features/calendar/calendarPanels.js` und `features/calendar/calendar-logic.js`.
- Nutzung: `window.ChangeCalendarOwnerAudit.print()` fuer den letzten Aenderungspunkt je Funktion, `window.ChangeCalendarOwnerAudit.printTimeline()` fuer alle Snapshots.
- Keine Kalender-Konsolidierung, keine Funktionsloeschung, keine Layout-Aenderung.
- Cache-Busting ?v=0.1.0330.
- Geaendert: `core/calendar/calendarOwnerAudit.js`, `index.html`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`, isolierter Runtime-Smoke fuer Snapshot-Audit, `scripts/auditDataModel.mjs`, Asset-/Versionspruefung.

## Version 0.1.0329 - Kalender-Owner-Audit
- Passives Kalender-Runtime-Audit ergaenzt: `core/calendar/calendarOwnerAudit.js` installiert nach `app.js` und vor den Kalender-Feature-Dateien einen Recorder fuer `window.renderCalendar`, `window.renderMonth`, `window.setCalView`, `window.navigate` und `window.goToday`.
- Zweck: vor jeder spaeteren Kalender-Bereinigung zuerst sichtbar machen, welche Datei zur Laufzeit den finalen Owner stellt. Keine Konsolidierung, keine Loeschung, keine Layout-Aenderung.
- Nutzung: `window.ChangeCalendarOwnerAudit.getReport()` oder `window.ChangeCalendarOwnerAudit.print()` in der Browser-Konsole. Automatisches `console.table` nur mit `?calendarAudit=1` oder `localStorage.change_calendar_owner_audit='true'`.
- Cache-Busting ?v=0.1.0329.
- Geaendert: `core/calendar/calendarOwnerAudit.js`, `index.html`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`, isolierter Runtime-Smoke fuer das Audit, `scripts/auditDataModel.mjs`, Asset-/Versionspruefung.

## Version 0.1.0328 - Freigabe-Code nur noch Sitzung
- GitHub-Freigabe-Code wird wieder sicherer behandelt: kein dauerhaftes Speichern/Lesen ueber localStorage.
- `readGithubUpdateSecret`/`writeGithubUpdateSecret` nutzen nur noch Memory + sessionStorage und entfernen vorhandene Legacy-Altlast `change_github_update_secret` aus localStorage.
- UI-Hinweis angepasst: gespeichert ist der Code nur fuer diese Sitzung.
- Cache-Busting ?v=0.1.0328.
- Geaendert: `features/settings/settingsPanel.js`, `index.html`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`, `scripts/auditDataModel.mjs`, Asset-/Versionspruefung.

## Version 0.1.0327 — Untertext-Bereinigung abgeschlossen
- Letzte erklärende Untertexte in den Einstellungen entfernt (Charta: keine Untertexte): Geburtstags-Dropdown-Beschreibung, Sync-Status-Karte, statischer Push-Fallback-Text. Dynamische Zustands-Infos (z. B. Push-`detail`, Sync-„verbindet…") bleiben erhalten — das sind Status, keine Untertexte.
- Damit ist die UI-Untertext-Bereinigung (begonnen 0.1.0324/0325) vollständig.
- Cache-Busting ?v=0.1.0327.
- Geaendert: `features/settings/settingsPanel.js`, `index.html`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`.

## Version 0.1.0326 — Freigabe-Code nur einmal eingeben
- **Freigabe-Code wird jetzt dauerhaft gemerkt** (localStorage statt nur Session). Effekt: einmal eingeben, danach nie wieder — auch nach App-Neustart.
- UI: Solange kein Code gespeichert ist, erscheint das Eingabefeld. Sobald gespeichert, zeigt das Panel „Freigabe-Code gespeichert ✓" + einen kleinen **„Ändern"**-Knopf (löscht den gespeicherten Code, Feld erscheint wieder). Beim „Auf GitHub übertragen" wird der gemerkte Code automatisch verwendet — keine erneute Eingabe.
- `readGithubUpdateSecret`/`writeGithubUpdateSecret` lesen/schreiben jetzt zusätzlich localStorage; `commitGithubZip` nutzt bei verstecktem Feld automatisch den gespeicherten Code (Fallback war schon vorhanden).
- Hinweis (bewusster Trade-off, vom Nutzer gewünscht): Der Code liegt damit lokal auf dem Gerät gespeichert.
- Enthält die Benachrichtigungs-Schalter aus 0.1.0325 (Friseur-/Geburtstags-Erinnerung).
- Cache-Busting ?v=0.1.0326.
- Geaendert: `features/settings/settingsPanel.js`, `index.html`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`.

## Version 0.1.0325 — Zwei fehlende Benachrichtigungs-Schalter ergänzt
- **Friseur-Erinnerung** und **Geburtstags-Erinnerung** im Benachrichtigungs-Bereich hatten keinen An/Aus-Schalter (anders als Pollen/Regen/Feiertage). Beide ergänzt — funktionsfähig, nicht nur sichtbar:
  - Je ein eigenes Benachrichtigungs-Flag (Standard: an), bewusst getrennt vom Friseur-*Tracker* (`friseurEnabled`), damit kein Doppel-Schalter entsteht: `change_v1_friseur_notifications`, `change_v1_birthday_notifications`.
  - Kopplung: `features/friseur/friseur.js` → `checkFriseurNotif()` respektiert `change_v1_friseur_notifications`. `core/notifications/notificationCenter.js` → `buildBirthdayNotifications()` respektiert `change_v1_birthday_notifications`.
  - UI: Schalter in den beiden Karten (`set-friseur-notif`, `set-birthday-notif`) + Change-Listener (speichern, Sync, `checkNotifications`, Glocke neu rendern) nach dem Muster des Feiertags-Schalters.
- Konsistenz: restliche Untertexte im Benachrichtigungs-Bereich (Pollen/Regen/Friseur) entfernt (Charta: keine Untertexte; ergänzt 0.1.0324).
- Cache-Busting ?v=0.1.0325.
- Geaendert: `features/settings/settingsPanel.js`, `features/friseur/friseur.js`, `core/notifications/notificationCenter.js`, `index.html`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check` (alle 3). Live-Verifikation: Schalter sichtbar + schalten Benachrichtigungen wirklich.

## Version 0.1.0324 — Untertexte entfernt + Kalender-Architektur dokumentiert
- **Charta-Bereinigung (UI):** Alle erklärenden Untertexte aus den Einstellungs-Schaltern entfernt (Profil, Feiertage, Challengepunkte, Kalenderwochen, Wetter, Urlaub, Auto-Challenges, Daten-Audit) — 8 Stück, je auf `''` gesetzt. Titel sind selbsterklärend (Charta: „keine Untertexte"). `settingsFeatureCard` rendert leeren Untertext sauber als nichts.
- **WICHTIG — Kalender-Architektur am Live-Code verifiziert (Wartbarkeit):** Eine Live-Inspektion (`window.renderMonth/renderCalendar.toString()` + DOM-Klassen) zeigt:
  - Die **angezeigte** Monats-/Wochenansicht nutzt die Klasse `cal-month-block` — eine **neuere Kalender-Schicht**.
  - `window.renderMonth` ist der **Legacy-cfx-Renderer** (~4054 Zeichen, erzeugt `cfx-month-grid`) — dessen Ausgabe ist NICHT die sichtbare Ansicht.
  - `window.renderCalendar` ist nur ein **~118-Zeichen-Brücken-Stub** (zur Laufzeit gesetzt), nicht der große 562-Zeilen-Block in calendar-logic.js.
  - **Erkenntnis zum 0.1.0318–0321-Crash:** Das Massen-Entfernen „toter" `window.renderMonth/renderCalendar/setCalView/navigate/goToday`-Zuweisungen hat die App lahmgelegt, weil einige davon **zur Laufzeit gesetzte Brücken** zur neuen Kalender-Schicht sind — keine harmlosen Lade-Duplikate. `node --check` erkennt das nicht.
  - **VERBINDLICHE REGEL:** Kalender-`window.X`-„Duplikate" NIEMALS im Block entfernen. Falls konsolidiert wird: **eine** Zuweisung pro Version, deployen, und **live im Browser verifizieren** (Renderer-Fingerprint + Kalender rendert + Konsole sauber), bevor die nächste kommt. Die Legacy-Schicht bleibt vorerst stehen (harmlos, aber tragend).
- Cache-Busting ?v=0.1.0324.
- Geaendert: `features/settings/settingsPanel.js`, `index.html`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`. Untertext-Entfernung live zu verifizieren.

## Version 0.1.0323 — Worker repariert + Doku
- **Cloudflare-Worker repariert (Kernursache gefunden):** Die HTTP-500 auf `/files` und `/upload` kamen NICHT vom GitHub-App-Token (frühere Fehlannahme), sondern von einer einzigen Zeile im Worker: `fetch(FIREBASE_JWKS_URL, {cache: 'reload'})`. Cloudflare Workers unterstützen `cache:'reload'` nicht → jede authentifizierte Anfrage stürzte schon beim Laden der Firebase-Schlüssel ab. Fix: `cache: 'no-store'`.
- **Verifiziert (Live):** Nach dem Worker-Deploy liefert `GET /files` jetzt `200 / ok:true / 88 Dateien`. Damit ist bewiesen, dass Token-Prüfung, GitHub-App-Token-Erzeugung und GitHub-Abfrage alle funktionieren. **Der In-App-Upload ist wieder nutzbar** — der updates/-Notweg wird nicht mehr gebraucht.
- Repo-Worker-Quelle `scripts/changeGithubUpdateWorker.js` enthält jetzt den Fix (Zeile 76, `no-store`), passt also zum Live-Worker. Hinweis: Der Worker läuft auf Cloudflare und wird dort separat deployed (nicht über die App/GitHub Pages).
- Lehre (Worker): In Cloudflare Workers sind nur `cache:'no-store'`/`'no-cache'`/default erlaubt — niemals `'reload'`.
- Keine Code-Änderungen an Kalender/App in dieser Version (nach der 0.1.0318–0321-Regression bewusst nur Sicheres). Re-Konsolidierung künftig nur einzeln + mit Live-Browser-Verifikation.
- Cache-Busting ?v=0.1.0323.
- Geaendert: `scripts/changeGithubUpdateWorker.js`, `index.html`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.

## Version 0.1.0322 — WIEDERHERSTELLUNG (Regression behoben)
- **Notfall-Rollback:** Die Kalender-Konsolidierung (0.1.0318/0320/0321) hatte die Live-App lahmgelegt („nichts mehr zu öffnen"). Ursache: Beim Entfernen toter Zuweisungen aus teils minifiziertem Code entstand an mindestens einer Stelle ein Laufzeit-Fehler durch fehlendes Semikolon (ASI) — beim Laden bricht dann das ganze Skript ab. `node --check` (nur Syntax) erkennt das nicht.
- **Maßnahme:** `app.js`, `features/calendar/calendar-logic.js`, `core/misc.js`, `features/calendar/calendarPanels.js`, `change-post.js` aus Backups auf den funktionierenden Vor-Konsolidierungs-Stand zurückgesetzt. Behalten: harmlose Kalender-Regel „max 2 + +X mehr" und der 0.1.0319-Cache-Fix in `settingsPanel.js`.
- **Folge:** Der doppelte renderMonth/renderCalendar/Nav-Code ist damit wieder vorhanden (toter, aber funktionierender Originalzustand). Re-Konsolidierung folgt — diesmal ASI-sicher (Statements durch `;` ersetzen statt ersatzlos löschen) und mit echtem Laufzeit-Test, nicht nur `node --check`.
- **Lehre:** Tote Zuweisungen aus minifiziertem Code NIE ersatzlos per AST-Splice entfernen ohne Laufzeit-Test; ASI-Lücken zwischen Nachbar-Statements prüfen. Kein Massen-Entfernen ohne Live-Verifikation.
- Cache-Busting ?v=0.1.0322.
- Geaendert: zurückgesetzt s. o. + `index.html`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.

## Version 0.1.0321
- **Kalender-Funktions-Konsolidierung KOMPLETT.** Per AST auch die toten `setCalView`/`navigate`/`goToday` entfernt (simple Vollersatz-Zuweisungen, keine Wrapper). Ergebnis: alle fünf Kalender-Kernfunktionen — `renderCalendar`, `renderMonth`, `setCalView`, `navigate`, `goToday` — existieren jetzt **genau einmal**, gebündelt im aktiven „FINAL"-IIFE in `features/calendar/calendar-logic.js`.
- Entfernt: je 2 aus calendar-logic.js (Vorläufer), je 4 aus app.js, je 1 aus calendarPanels.js/core/misc.js/change-post.js. Null Laufzeit-Effekt (alles überschrieben); `node --check` auf allen 5 Dateien grün.
- Damit ist der Charta-Hauptpunkt „kein doppelter Kalender-Code" für die Render-/Navigations-Funktionen erfüllt.
- Hinweis nächste (verhaltensändernde!) Schritte — brauchen Live-Test vorab: Kalender-Logik aus `app.js`/`change-post.js` nach `core/calendar/` ziehen; `components/`-Ordner anlegen.
- Cache-Busting ?v=0.1.0321. Kumulativ (enthält 0.1.0317–0.1.0320). Backups: /tmp/rcbak.
- Geaendert: `features/calendar/calendar-logic.js`, `app.js`, `features/calendar/calendarPanels.js`, `core/misc.js`, `change-post.js`, `index.html`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.

## Version 0.1.0320
- **Kalender-Konsolidierung Teil 2 (renderCalendar):** Mit AST alle toten `window.renderCalendar`-Zuweisungen entfernt — `calendar-logic.js` (4 von 5), `app.js` (4), `calendarPanels.js` (1), `core/misc.js` (1), `change-post.js` (5). **Es bleibt genau EIN `renderCalendar`** = der aktive Vollersatz in `calendar-logic.js` (Z. ~562), der je nach Ansicht `renderMonth`/`renderYear` aufruft. Von 16 auf 1.
- Nur Zuweisungen entfernt (Null Laufzeit-Effekt, da von 562 überschrieben); CSS-Injektionen/Setup der IIFEs (inkl. `setCalView`/`navigate`/`goToday`/`openCalendarSettings`, Style-Injektion, Initial-Render) unangetastet. `node --check` auf allen 5 Dateien grün; `renderMonth` FINAL (cfx) intakt.
- Hinweis: `setCalView`/`navigate`/`goToday` sind noch je 2× definiert (vorbestehend, nicht von renderCalendar) — Kandidaten für einen späteren Batch. Ebenso: Kalender-Logik aus `app.js`/`change-post.js` nach `core/calendar/` ziehen.
- Cache-Busting ?v=0.1.0320. Enthält 0.1.0317–0.1.0319.
- **Noch nicht live geprüft** — bei Auffälligkeiten am Kalender auf Vorversion zurückrollen (Backups in /tmp/rcbak vorhanden).
- Geaendert: `features/calendar/calendar-logic.js`, `app.js`, `features/calendar/calendarPanels.js`, `core/misc.js`, `change-post.js`, `index.html`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.

## Version 0.1.0319
- **Fehler „Unsupported cache mode: reload" behoben** (App-seitig). Zwei Ursachen entschärft:
  1. `githubAdminAuthHeaders`: erzwungener Token-Refresh `getIdToken(true)` fällt bei Fehler auf das zwischengespeicherte Token (`getIdToken()`) zurück — der Browser lehnte den Refresh-Fetch mit „reload" ab und blockierte so /files und /upload.
  2. `reloadChangeUpdateVersion`: das einzige App-seitige `cache:'reload'` auf `cache:'no-store'` umgestellt (kompatibel).
- Effekt: ZIP-Ablegen und Upload brechen nicht mehr mit dem Cache-Fehler ab; dadurch wird jetzt die **echte** Worker-Antwort sichtbar (die 500-Ursache des GitHub-App-Tokens).
- Hinweis: Die 500er auf /files,/upload kommen weiterhin vom Cloudflare-Worker (GitHub-App). Deploy bis dahin über updates/.
- Cache-Busting ?v=0.1.0319. Enthält 0.1.0317 (max 2 + „+X mehr") und 0.1.0318 (Kalender-Konsolidierung).
- Geaendert: `features/settings/settingsPanel.js`, `index.html`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`.

## Version 0.1.0318
- **Kalender-Konsolidierung abgeschlossen (renderMonth):** Mit echtem JS-Parser (acorn, AST) alle toten `window.renderMonth`-Zuweisungen exakt entfernt — `calendar-logic.js` (5 von 6), `app.js` (Rest), `core/misc.js` (1). **Es existiert jetzt nur noch EIN `window.renderMonth`** = der aktive „RENDERMONTH (FINAL)" in `calendar-logic.js` (Z. ~890). Damit ist „kein doppelter Kalender-Code" für den Monatsrenderer erfüllt.
- Entfernt wurde ausschließlich toter, ohnehin überschriebener Code (Null Laufzeit-Effekt); Hilfsfunktionen unangetastet; aktiver Renderer + max-2-Regel verifiziert (`node --check` + Marker-Grep). `calendar-logic.js` 2367 → 2252 Zeilen.
- Bewusst belassen: bare `function renderMonth`-Deklaration in `app.js` (wird via `renderMonth(...)` aufgerufen; global ohnehin = aktiver Renderer). Offen für nächste Batches: doppelte `layoutWeek`-Definition (2×), `renderCalendar`-Duplikate, Kalender-Logik aus `app.js` nach `core/calendar/`.
- Cache-Busting ?v=0.1.0318. Enthält auch 0.1.0317 (max 2 + „+X mehr").
- **Noch nicht live geprüft** (Nutzer unterwegs) — bei Auffälligkeiten am Kalender auf Vorversion zurückrollen.
- Geaendert: `features/calendar/calendar-logic.js`, `app.js`, `core/misc.js`, `index.html`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.

## Version 0.1.0317
- **Kalender-Konsolidierung, Schritt 1+2 (Start):** Aktiver Monats-Renderer zweifelsfrei bestimmt = `features/calendar/calendar-logic.js` Zeile ~1005 (im Code als „RENDERMONTH (FINAL)" markiert; setzt `grid.className='cfx-month-grid'`, nutzt `cfx-*`-Klassen). Beweis: Ladereihenfolge (app.js Pos. 28 → calendar-logic.js Pos. 31), letzte `window.renderMonth`-Zuweisung gewinnt, kein später geladenes Skript überschreibt.
- **Toter Code entfernt (Batch 1):** zwei eindeutig überschriebene `window.renderMonth`-Zuweisungen aus `app.js` (vormals Z. 3097, 3132) gelöscht — Null Laufzeit-Effekt, da ohnehin von 1005 überschrieben. Noch offen (nächste Batches): app.js Z. 2871 (mehrzeilig) + Deklaration Z. 1200; calendar-logic.js Z. 67, 227, 486, 670, 835; core/misc.js.
- **Charta-Regel im aktiven Renderer umgesetzt:** Termine pro Tag jetzt **max 2 sichtbar + „+X mehr"** (vorher max 3; `layoutWeek` Lane-Limit `lane>2` → `lane>1`).
- Cache-Busting ?v=0.1.0317.
- Geaendert: `app.js`, `features/calendar/calendar-logic.js`, `index.html`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check` (app.js, calendar-logic.js, settingsPanel.js, pollenView.js). Live-Prüfung Kalender durch Nutzer.

## Version 0.1.0316
- **Projekt-Charta verbindlich in CLAUDE.md verankert** (Features, strikte Architektur core/features/components, Kalender-/Challenges-/Push-/Sync-/UI-Regeln, Arbeitsweise, Verbote) — als oberste Wahrheit nach „Start Here". Enthält außerdem die GitHub-Diagnose aus 0.1.0315.
- Cache-Busting ?v=0.1.0316.
- Geaendert: `CLAUDE.md`, `index.html`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CHANGELOG.md`.

## Version 0.1.0315
- **GitHub-Diagnose:** `fetchGithubRepoFiles` verschluckt die Worker-Fehlermeldung nicht mehr — die echte Ursache (z. B. „GitHub API Fehler 401", „Not Found") wird in `githubUpdateState.filesError` gespeichert und in der Prüfzeile „Anzahl der Dateien" angezeigt, sobald eine ZIP abgelegt wird. So ist die 500-Ursache des Cloudflare-Workers ohne DevTools sichtbar.
- Worker-Architektur dokumentiert: GitHub **App** (nicht PAT) mit Secrets `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`, `CHANGE_UPDATE_SECRET`. 500 = Admin-Auth ok, aber App-Token-Erzeugung scheitert (privater Schlüssel rotiert, Installation entfernt oder Secret leer).
- Cache-Busting ?v=0.1.0315.
- Geaendert: `features/settings/settingsPanel.js`, `index.html`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`.

## Version 0.1.0314
- App-Gesundheitscheck-Icon = Design-EKG/Puls-SVG (statt Stethoskop-Emoji `🩺`), folgt dem Accent. Damit sind alle Karten-Icons der Einstellungen 1:1 Design-SVGs (kein Emoji-Icon mehr).
- Cache-Busting auf ?v=0.1.0314.
- Geaendert: `features/settings/settingsPanel.js`, `index.html`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`; vollständiger Emoji-Sweep (nur typografische Glyphen ↺ ↻ ✓ ♡ verbleiben, keine Icon-Emojis).

## Version 0.1.0313
- **Schalter-Knopf korrigiert:** Der globale `.slider:before{transform:translateX(20px)}` aus app.css addierte sich zu meinem `left:22px` — der weiße Knopf flog rechts raus. Jetzt `transform:none` in den scoped Switch-Regeln → Knopf sitzt sauber im Track.
- **Version oben rechts angeheftet:** Die Pille ist aus der Titel-Gruppe heraus in die Kopfzeile gewandert; `change-settings-page-head` ist jetzt `display:flex; justify-content:space-between` → Titel links, Version immer rechts oben.
- **Mobile-Fläche besser genutzt:** Kachel-Raster mit größeren Kacheln (min-height 104, mehr Padding/Icon, größerer Abstand).
- **Alle Karten-Icons = Design-SVGs statt Emojis:** Auto-Challenges/Challengepunkte (Trophäe), Datenbank-Sync (DB-Zylinder), Google Kalender (Google-„G", Markenfarben), Sync-Status (Live-Punkt), Sync-Protokoll (Dokument), Change als App (Handy), Feiertage/Kalenderwochen (Kalender-Varianten), GitHub-Karte (Octocat-SVG in Accent). Daten-Audit bleibt „DB" wie im Design.
- Offen/zu klären: Inhalt des Daten-Audit-Protokolls (Body) — bitte sagen, was genau anders soll als aktuell.
- Cache-Busting auf ?v=0.1.0313 neu gestempelt.
- Geaendert: `features/settings/settingsPanel.js`, `features/settings/settingsPanel.css`, `index.html`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`; Render Daten & Sync (Icons + Schalter korrekt).

## Version 0.1.0312
- **GitHub-Sektion UX repariert (App-seitig):**
  - „Dateien"-Inline-Kästchen in der Update-bereit-Zeile entfernt (das stray `change-github-check-inline-link` in `githubCheckSummary`).
  - **Kein Festhängen im Fehlermodus mehr:** Bei vergessenem Freigabe-Code wird kein `status='error'` mehr gesetzt — stattdessen Toast + Fokus aufs Code-Feld, Button bleibt aktiv. Bei einem echten Upload-Fehler werden die Action-Sperrfelder (`actionMessage/actionStartedAt/uploadCommitSha/actionConclusion/actionRunUrl/updateReady`) zurückgesetzt, sodass „Auf GitHub übertragen" sichtbar und aktiv bleibt. `commitGithubZip` erlaubt jetzt einen erneuten Versuch aus dem Fehlerzustand (`status==='error'`).
- **Hinweis:** Die `500`-Fehler auf `/files` und `/upload` stammen weiterhin vom Cloudflare-Worker (Server, vermutlich abgelaufenes GitHub-Token) — das ist ein separater Fix. Deploy bis dahin über den `updates/`-Notweg.
- Cache-Busting auf `?v=0.1.0312` neu gestempelt (Pflicht bei jedem Release, da sich `settingsPanel.js` geändert hat).
- Geaendert: `features/settings/settingsPanel.js`, `index.html`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check`; 57 lokale Assets mit `?v=0.1.0312`.

## Version 0.1.0311
- **Cache-Busting (Kernproblem gelöst):** Bisher hatten die lokalen CSS/JS-Einbindungen in `index.html` keine Versionsabfrage. Nach einem Deploy lud der Browser CSS/JS weiter aus dem Cache — die JS-Version aktualisierte (frisch), aber das CSS blieb alt (z. B. grüne Versions-Pille, alte Schalter). Jetzt tragen alle lokalen `./…css`/`./…js`-Links `?v=<APP_VERSION>`; jeder neue Build erzwingt frische Dateien. **Wichtig für künftige Releases:** Bei jeder Versionserhöhung müssen die `?v=`-Werte in `index.html` neu gestempelt werden (Skript: lokale `href/src` mit `?v=<version>` versehen, externe `https://`-Quellen auslassen).
- Versions-Pille mit `!important` abgesichert (#5E6A60), damit die graue Farbe unabhängig von der Laufzeit-Auflösung von `var(--st-faint)` sicher gewinnt.
- Inhaltlich identisch zu 0.1.0310 (Design-Schalter, Theme 3-spaltig, Dashboard-SVG-Icons) — diese Korrekturen werden mit 0.1.0311 durch das Cache-Busting endlich sichtbar.
- Geaendert: `index.html` (Cache-Busting), `features/settings/settingsPanel.css`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check` auf alle JS; 13 CSS + 44 JS lokale Assets mit `?v=0.1.0311` versioniert, externe Quellen unangetastet.

## Version 0.1.0310
- **Schalter wie im Design:** Die Toggles in den Einstellungen nutzen jetzt exakt die Design-`.sw`-Optik (Spur 46×27, Knopf 20, AUS-Knopf grau links, AN-Knopf weiß bei links 22 mit Accent-Verlauf) — scoped unter `#settings-view`, überschreibt den globalen App-Switch nur dort. Behebt die falsch sitzenden weißen Knöpfe.
- **Versions-Pille gedämpft grau (#5E6A60) wie im Design:** Eine Laufzeit-Auflösung färbte `var(--st-faint)` an der Pille grün; höher spezifische, explizite Regel `#settings-view .change-settings-page-head .change-settings-version{color:#5E6A60}` (live verifiziert).
- **Darstellung – Theme nebeneinander:** System/Hell/Dunkel stehen auf Mobil wieder 3-spaltig (kleiner) statt gestapelt; Akzent-Raster 3-spaltig. Kein „Rand rechts" mehr.
- **Dashboard-Modul-Icons sind jetzt Design-SVGs** (Wetter/Pollen/Friseur/Geburtstage/Urlaub) statt Emojis — `currentColor`, folgen dem Accent. Push-Pane war bereits SVG.
- Geaendert: `features/settings/settingsPanel.js`, `features/settings/settingsPanel.css`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check` auf alle JS; jsdom-Render + Chromium-Screenshots (Dashboard mit SVG-Icons + Schaltern, Darstellung 3-spaltig); Versions-Fix live im Browser bestätigt.
- Hinweis: Deploy weiterhin über `updates/`-Notweg, solange der Cloudflare-Worker (500 auf /files,/upload) nicht repariert ist.

## Version 0.1.0309
- **Mobile Drilldown-Navigation:** Auf Mobil sind die Einstellungen jetzt ein echtes Master/Detail-Muster. Erster Screen = das Kachel-Raster; beim Antippen einer Kachel öffnet der Bereich als **Vollbild-Screen** mit **„Zurück"-Button oben links** (Raster und Kopfzeile werden ausgeblendet). „Zurück" führt zum Raster.
- Status `settingsMobileDetail` steuert den Detail-Modus. Kachel-Klick öffnet Detail, „Zurück" schließt. Interne Refreshes (z. B. ein Schalter umlegen) bleiben im Detail; frisches Öffnen (`ChangeSettingsPanel.open`) startet auf dem Raster; Deep-Links (`openCalendarSettings`, `openPushSettingsPanel`) öffnen den Bereich direkt.
- Reiner Mobil-Effekt über `@media (max-width:760px)` + `.change-settings-detail`. **Desktop unverändert** (zweispaltig Rail + Panel, kein Zurück-Button — per Render geprüft: back `display:none`, Rail+Panel sichtbar).
- Geaendert: `features/settings/settingsPanel.js`, `features/settings/settingsPanel.css`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check` auf alle JS-Dateien; jsdom-Render + Chromium-Screenshots (390px) für Raster- und Detail-Screen, Desktop-Regressionscheck (1000px).

## Version 0.1.0308
- **Mobile Navigation neu (alltagstauglich):** Die Einstellungs-Rail ist auf Mobil kein horizontaler Scroll-Streifen mehr, sondern ein **Kachel-Raster** (3 Spalten): Icon-Tile oben, Label darunter, aktive Kachel in Akzentfarbe. Alle Bereiche sind ohne Scrollen sichtbar, große Tap-Flächen. Desktop unverändert (vertikale Liste). Nur in `features/settings/settingsPanel.css` (Mobile-`@media`).
- Akzent-Raster auf Mobil an das Design angeglichen (3 Spalten statt 5).
- Abgeglichen mit der vollständigen Design-Datei `Einstellungen_Komplett.html`: Rail-Icons und Pane-Aufbau sind 1:1 identisch (gleiche SVG-Pfade). Keine Änderung an Logik, anderen Views, Firebase, Sync oder Push.
- Geaendert: `features/settings/settingsPanel.js` (Versionsanzeige), `features/settings/settingsPanel.css`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check` auf alle JS-Dateien; jsdom-Render + Chromium-Screenshot der Mobil-Ansicht (390px) bestätigt das Kachel-Raster.

## Version 0.1.0307
- **Darstellung vollständig wie Referenz:** Theme-Auswahl jetzt als Vorschau-Karten mit Mini-Thumbnail + Radio-Punkt (System/Hell/Dunkel), darunter **Akzentfarbe** (Grün/Blau/Bernstein/Violett/Rot) und eine **Vorschau**-Karte (Beispiel-Termin).
- **Akzentfarbe ist funktional (app-weit):** Neues Modul `window.ChangeAccent` (in `app.js`) setzt `data-accent` auf `<html>` und persistiert `change_v1_accent`; Anwendung beim Start. In `styles/tokens.css` überschreiben `[data-accent="…"]`-Sets die `--acc`-Familie (+ `--acc-rgb`) für Light und Dark. Dadurch folgen alle 133 `var(--acc)`-Nutzungen der App automatisch der gewählten Farbe.
- **Einstellungs-Oberfläche folgt dem Accent:** `settingsPanel.css` nutzt jetzt `--st-accent:var(--acc)`, `--st-accent2:var(--acc-h)`, `--st-accent-rgb:var(--acc-rgb)` und `--st-accent-ink` (heller Accent-Ton). Alle bisher hart codierten Emerald-Werte (Schalter, Punkte, Ränder, weiche Tints, aktiver Rail-Eintrag, Icons via `currentColor`) folgen der Akzentfarbe.
- **Lesbarkeit in jedem Theme:** Karten-/Flächenhintergründe der Einstellungen sind jetzt opak (kein Auswaschen mehr, wenn das App-Theme auf Hell steht). Die Einstellungen bleiben bewusst die dunkle, in sich geschlossene Referenz-Oberfläche.
- Geaendert: `app.js`, `styles/tokens.css`, `features/settings/settingsPanel.js`, `features/settings/settingsPanel.css`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check` auf `app.js`, `settingsPanel.js`, `pollenView.js`; reale Markup-Ausgabe der Darstellung via jsdom + Chromium-Screenshots in Grün und Blau (Accent folgt korrekt); Live-Gegencheck im Browser (Rail/Panel, Versionsanzeige, Theme-Umschaltung).

## Version 0.1.0306
- **Einstellungen im Stil „Einstellungen Komplett" (DC):** Linke Navigations-Schiene (Rail) + Detail-Panel statt Karten-Grid. Dunkle Emerald-Oberflaeche, Plus Jakarta Sans / JetBrains Mono. Stil strikt auf `#settings-view` begrenzt, damit Dashboard, Kalender und Challenges unveraendert bleiben.
- **Drei neue Kategorien:** „Profil" (Name, Abmelden, Mitspieler-Liste), „Darstellung" (vorhandene Theme-Umschaltung System/Hell/Dunkel aus „App & Sicherheit" hierher verschoben) und „Benachrichtigungen" als zentrale Push-Steuerung.
- **Push zentralisiert (eine Steuerung):** Regen-/Pollenwarnung, Friseur- und Geburtstags-Erinnerung sowie Feiertags-Benachrichtigungen liegen jetzt ausschliesslich unter „Benachrichtigungen". Dashboard zeigt nur noch Modul an/aus + Urlaubs-Konfiguration. Keine doppelten Schalter oder doppelten Element-IDs.
- **GitHub vollstaendig gestylt:** Leerzustand, 4-Phasen-Fortschritt (queued/workflow_running/pages_building/live), Live-Zustand und Verlauf mit Rollback im neuen Stil.
- **Akzentfarbe bewusst nicht gebaut:** Es existiert keine funktionale Akzent-Logik im Code; weggelassen statt tote Buttons (moeglicher Folgeschritt, app-weit ueber `styles/tokens.css`).
- **Nur Einstellungen angefasst:** Reine Markup-Huelle + neues `settingsPanel.css`; bestehende Settings-Logik, Toggle-IDs und Bindings unveraendert. Wetter-/Pollen-/Friseur-/Geburtstags-Handler wurden nur verschoben, nicht neu geschrieben.
- Geaendert: `features/settings/settingsPanel.js`, `features/settings/settingsPanel.css`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: `node --check` auf beide JS-Dateien; reale Markup-Ausgabe aller Panes via jsdom + Chromium-Screenshots (Profil, Benachrichtigungen, Dashboard, Daten & Sync, App & Sicherheit, GitHub-Zustaende) gegen die Referenz.

## Version 0.1.0305
- **Settings-Audit erweitert:** `core/settings/settingsStore.js` kennt jetzt gruppierte lokale Settings-Keys fuer Kalender, Dashboard, Challenges, Sync, Wetter und Darstellung.
- **Read-only Anzeige in App & Sicherheit:** Der Daten-Audit zeigt zusaetzlich die Anzahl vorhandener bekannter Settings-Keys. Der Audit bleibt lesend; er loescht, migriert, synchronisiert und schreibt keine Remote-Daten.
- **Snapshot bleibt Wartungsschicht:** Einzelne Settings-Keys bleiben weiterhin aktive Laufzeit-Schreibwege. `change_v1_settings_snapshot` dient weiterhin als zusammenfassende Wartungs- und Audit-Ansicht.
- **Bewusst nicht geaendert:** Keine App-Logik ausser Audit-Zaehlung, keine Datenloeschung, keine Startmigration, kein automatischer Sync-Start, keine Firebase-Regel-, CSS-, Markup-, Icon-, Kalender-, Challenge-, Pollen- oder Push-Aenderung.
- Geaendert: `core/settings/settingsStore.js`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `docs/DATA-MODEL.md`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax, DataModel-Audit im Nur-Lesen-Modus, SettingsStore-Smoke-Test und statischer Check der read-only Audit-Anzeige.

## Version 0.1.0304
- **Challenge-Persistenz store-first:** `persistChallengeStateToStore()` persistiert den aktuellen `ChangeChallengeStore` und spiegelt danach `challenges`, `challengeCompletions` und `challengePlayers` zurueck. Dadurch koennen stale Legacy-Globals den Store nicht mehr ungewollt ueberschreiben.
- **Explizite lokale Store-Replace-Helfer:** `ChangeChallengeStoreBridge` kapselt `replaceChallenges`, `replaceCompletions`, `replacePlayers` und `replaceState`. App-interne Filter- und Bereinigungspfade nutzen diese Helfer, wenn Arrays per `filter()` neu zugewiesen werden.
- **Aeltere Completion-Pfade angebunden:** Kalender-Komfortpfade fuer Challenge-Erledigen/Zuruecksetzen und das Auto-Challenge-Ausschalten im Settings-Panel schreiben bei vorhandenem Store ueber die Bridge. Legacy-Keys bleiben Fallback.
- **Bewusst nicht geaendert:** Keine Datenloeschung, keine Startmigration, kein automatischer Sync-Start, keine Firebase-Regel-, CSS-, Markup-, Icon-, Kalender-, Pollen-, Push- oder Challenge-UI-Aenderung.
- Geaendert: `app.js`, `features/calendar/calendar-logic.js`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `docs/DATA-MODEL.md`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax, DataModel-Audit im Nur-Lesen-Modus, ChallengeStore-Smoke-Test und statischer Check der neuen Bridge-Pfade.

## Version 0.1.0303
- **Kalender-Events stabiler ueber Store:** `app.js` spiegelt lokale Termine beim Start aus `ChangeEventStore`, wenn der Store bereits Daten aus Canonical- und Legacy-Keys zusammengefuehrt hat.
- **Alte Speicherpfade abgesichert:** Lokales Speichern und Google-Sync-Erfolgsrueckschreibungen in aelteren `app.js`-Kalenderpfaden laufen zuerst ueber `persistEventStateToStore()`; `events` bleibt als Legacy-Fallback erhalten.
- **Google-Cache bleibt getrennt:** `gEvents`, `change_google_events_cache` und `change_v1_google_events_cache` wurden nicht veraendert, migriert oder geloescht.
- **Bewusst nicht geaendert:** Keine Datenloeschung, keine Startmigration, kein automatischer Sync-Start, keine Firebase-Regel-, CSS-, Markup-, Icon-, Challenge-, Pollen-, Push- oder Kalender-UI-Aenderung.
- Geaendert: `app.js`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `docs/DATA-MODEL.md`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax, DataModel-Audit im Nur-Lesen-Modus, EventStore-Smoke-Test und statischer Check der alten Event-Schreibpfade in `app.js`.

## Version 0.1.0302
- **Firebase-Eingang ueber Stores:** Die Live-Listener in `app.js` fuer `change_players`, `change_completions` und `change_challenges` schreiben eingehende Remote-Daten zuerst in `ChangeChallengeStore`.
- **Legacy bleibt gespiegelt:** `challenges`, `challengeCompletions` und `challengePlayers` werden danach aus dem Store gespiegelt, damit vorhandene UI-, Dashboard- und Kalenderpfade weiter unveraendert laufen.
- **Punkte-Updates robuster:** Remote-Completions mit gleicher ID duerfen lokale Store-Daten aktualisieren; alte Legacy-Keys bleiben weiterhin lesbar und als Fallback aktiv.
- **Bewusst nicht geaendert:** Kein automatischer Sync-Start, keine Datenloeschung, keine Startmigration, keine Firebase-Regel-, CSS-, Markup-, Icon-, Kalender-, Pollen-, Push-, Google-Kalender- oder Challenge-UI-Aenderung.
- Geaendert: `app.js`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `docs/DATA-MODEL.md`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax, DataModel-Audit im Nur-Lesen-Modus und statischer Listener-Check fuer die drei Store-basierten Firebase-Eingangspfade.

## Version 0.1.0301
- **Firebase-Sync nutzt Stores als Quelle:** Der manuell gestartete `core/integrations/firebaseSyncController.js` liest Challenges, Punkte und Mitspieler zuerst ueber `ChangeChallengeStore`, bevor er auf Legacy-Globals oder Storage-Keys zurueckfaellt.
- **Mitspieler lokal sauber zurueckgeschrieben:** Nach `ensurePlayer()` wird der lokale Spieler ueber `ChangeChallengeStore.replacePlayers(..., {persist:true})` persistiert, wenn der Store verfuegbar ist.
- **Settings-Fallback store-basiert:** Wenn `saveChangeSettings(true)` nicht greift, wird der Payload aus `ChangeSettingsStore.collectSnapshot()` bzw. `readSnapshot()` aufgebaut.
- **Bewusst nicht geaendert:** Kein automatischer Sync-Start, keine Datenloeschung, keine Startmigration, keine Firebase-Regel-, CSS-, Markup-, Icon-, Kalender-, Pollen-, Push-, Google-Kalender- oder Challenge-UI-Aenderung.
- Geaendert: `core/integrations/firebaseSyncController.js`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `docs/DATA-MODEL.md`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax, DataModel-Audit im Nur-Lesen-Modus und FirebaseSyncController-Smoke-Test mit Store-basierten Challenges/Punkten/Mitspielern.

## Version 0.1.0300
- **Pollen-Symptome auf Datenmodell umgestellt:** Neues `core/pollen/pollenStore.js` ist die lokale Datenquelle fuer Pollen-Symptomtage und wird in `index.html` nach `core/data/dataModel.js` geladen.
- **Legacy bleibt lesbar:** Der Store liest `change_v1_pollen_symptoms`, `pollen_symptoms` und `change_pollen_symptoms`, schreibt aber nur `change_v1_pollen_symptoms`. `core/data/dataModel.js` zaehlt und normalisiert diese Legacy-Maps jetzt ebenfalls.
- **Feature angebunden:** `features/weather/pollenSymptoms.js` verwendet den Store fuer `all()` und `saveLocal()`. Symptom-UI, Allergieprofil, Forecast-Snapshots, Notizen und manuell aktivierter Firebase-Publish bleiben unveraendert.
- **Bewusst nicht geaendert:** Keine Datenloeschung, keine Startmigration, kein automatischer Sync-Start, keine Firebase-Regel-, CSS-, Markup-, Icon-, Kalender-, Challenge-, Push- oder Google-Kalender-Aenderung.
- Geaendert: `index.html`, `core/data/dataModel.js`, `core/pollen/pollenStore.js`, `features/weather/pollenSymptoms.js`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax, DataModel-Audit im Nur-Lesen-Modus und PollenStore-Smoke-Test mit Legacy- und Canonical-Symptomtagen.

## Version 0.1.0299
- **Read-only Daten-Audit in Einstellungen:** App & Sicherheit zeigt jetzt bewusst ausklappbare lokale Zaehlwerte fuer Events, Challenges, Punkte, Mitspieler, Pollen-Tage sowie Canonical-/Legacy-/Cache-Key-Anzahlen.
- **Keine Datenveraenderung:** Der Audit liest `window.ChangeDataModel.auditStorage(localStorage)`, wenn verfuegbar, und zeigt nur Summen. Es wird nichts geloescht, migriert, synchronisiert oder remote geschrieben.
- **Bewusst nicht geaendert:** Keine Firebase-, Kalender-, Challenge-, Pollen-, CSS-, Markup-, Push-, Google-Kalender- oder automatischer Sync-Start-Aenderung.
- Geaendert: `features/settings/settingsPanel.js`, `core/data/dataModel.js`, `features/pollen/pollenView.js`, `docs/DATA-MODEL.md`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax und DataModel-Audit im Nur-Lesen-Modus.

## Version 0.1.0298
- **Settings-Snapshot auf Datenmodell umgestellt:** Neues `core/settings/settingsStore.js` sammelt bestehende Einstellungen ueber `window.ChangeDataModel` bzw. `window.getChangeSettings()` und schreibt `change_v1_settings_snapshot`.
- **Bestehende Settings-Keys bleiben aktiv:** Sync-Schalter, Push, Theme, Google-Kalender, Dashboard-Optionen und Legacy-Helfer behalten ihre bisherigen Einzel-Key-Schreibwege. Der Snapshot ist eine Wartungs- und Audit-Schicht, keine Loesch- oder Remote-Migration.
- **UI/Legacy angebunden:** `features/settings/settingsPanel.js` meldet Aenderungen im Settings-Panel an den Store; `features/settings/settings-logic.js` meldet Legacy-Helfer-Aenderungen ebenfalls an den Store.
- **Bewusst nicht geaendert:** Keine CSS-, Markup-, Firebase-Regel-, Push-, Google-Kalender-, Challenge-, Kalender-Event- oder automatischer Sync-Start-Aenderung.
- Geaendert: `index.html`, `core/data/dataModel.js`, `core/settings/settingsStore.js`, `features/settings/settingsPanel.js`, `features/settings/settings-logic.js`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax, DataModel-Audit im Nur-Lesen-Modus und SettingsStore-Smoke-Test mit Legacy-Settings.

## Version 0.1.0297
- **GitHub-ZIP-Pruefung korrigiert:** `docs/` ist jetzt in `features/settings/settingsPanel.js` als erlaubter Root-Ordner eingetragen.
- **Wartbarkeitsdoku bleibt Teil der App:** `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/SAFETY-CHECKS.md` und `docs/STYLEGUIDE.md` duerfen in Update-ZIPs enthalten sein und werden nicht mehr als unerwuenschte Root-Dateien gemeldet.
- **Bewusst nicht geaendert:** Keine Aenderung an App-Logik, Datenmodell, CSS, Markup, Firebase, Kalender, Challenges, Push, Google-Kalender oder Sync.
- Geaendert: `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax der geaenderten JS-Dateien und ZIP-Struktur.

## Version 0.1.0296
- **Lokale Kalender/Events auf Datenmodell umgestellt:** Neues `core/calendar/eventStore.js` liest `change_v1_events`, `events` und `change_v2_events` gemeinsam und normalisiert lokale Termine ueber `window.ChangeDataModel`.
- **Store vor Kalenderlogik geladen:** `index.html` laedt den EventStore direkt nach `core/data/dataModel.js`, bevor `calendarModel.js`, `app.js` und `features/calendar/*` laufen.
- **Aktive Speicherwege angebunden:** `core/calendar/calendarModel.js`, `app.js` und der finale Kalender-Speicherpfad in `features/calendar/calendar-logic.js` persistieren lokale Termine ueber den EventStore.
- **Bewusst nicht geaendert:** Keine Aenderung an Google-Kalender-Cache, `window.gEvents`, OAuth, Firebase-Regeln, Push, CSS, Markup, Kalender-Rendering oder automatischem Sync-Start. Settings bleiben ein eigener spaeterer Migrationsschritt.
- Geaendert: `index.html`, `core/data/dataModel.js`, `core/calendar/eventStore.js`, `core/calendar/calendarModel.js`, `app.js`, `features/calendar/calendar-logic.js`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax, DataModel-Audit im Nur-Lesen-Modus und EventStore-Smoke-Test mit Legacy-Event.

## Version 0.1.0295
- **Challenges/Punkte auf Datenmodell umgestellt:** `core/challenges/challengeStore.js` wird jetzt in `index.html` nach `core/data/dataModel.js` geladen und nutzt `window.ChangeDataModel` fuer Normalisierung sowie Canonical-/Legacy-Key-Listen.
- **Legacy-Daten bleiben erhalten:** Punkte werden weiterhin aus `change_v1_challenge_completions`, `challenge_completions` und `challengeCompletions` gelesen. Lokale Aenderungen schreiben Canonical-Key plus Legacy-Fallbacks, loeschen aber nichts.
- **Aktive Challenge-UI angebunden:** `features/challenges/challenges.js` persistiert `Erledigen` und `Rueckgaengig` ueber `ChangeChallengeStore.replaceCompletions(..., {persist:true})`, damit Punkte und globale Runtime-Liste synchron bleiben.
- **Bewusst nicht geaendert:** Keine CSS-, Markup-, Icon-, Firebase-Regel-, Login-, Google-Kalender-, Push- oder Auto-Sync-Aenderung. Kalender/Events und Settings bleiben eigene spaetere Migrationsschritte.
- Geaendert: `index.html`, `core/data/dataModel.js`, `core/challenges/challengeStore.js`, `features/challenges/challenges.js`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax der betroffenen JS-Dateien und DataModel-Audit im Nur-Lesen-Modus.

## Version 0.1.0294
- **Neue Datenschicht aufgebaut:** `core/data/dataModel.js` definiert Canonical-Keys, Normalisierung fuer Events, Challenges, Punkte, Mitspieler, Settings und Pollen-Symptome sowie einen passiven `window.ChangeDataModel`-Namespace.
- **Nicht-destruktive Migration vorbereitet:** `ChangeDataModel.auditStorage()` und `ChangeDataModel.migrateLocalStorage()` lesen alte und neue LocalStorage-Keys zusammen, schreiben bei ausdruecklichem Aufruf Canonical-Keys plus Backup und loeschen keine Alt-Daten.
- **Audit-Werkzeug ergaenzt:** `scripts/auditDataModel.mjs` listet Storage-Keys, Firestore-Collections und optional einen LocalStorage-Export, ohne Daten zu veraendern.
- **Datenmodell dokumentiert:** `docs/DATA-MODEL.md` beschreibt Zielmodell, Firestore-Collections, Legacy-Keys, Migrationsreihenfolge und Never-Delete-Regeln.
- **Bewusst nicht geaendert:** Keine automatische Migration, keine Loeschung, keine Aenderung an Firebase-Regeln, Login, Google Kalender, Push, Challenge-Berechnung, Pollen-Berechnung oder UI-Layout.
- Geaendert: `index.html`, `core/data/dataModel.js`, `scripts/auditDataModel.mjs`, `docs/DATA-MODEL.md`, `docs/ARCHITECTURE.md`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax der neuen Datenschicht und der zentralen bestehenden JS-Dateien; Audit-Script im Nur-Lesen-Modus.

## Version 0.1.0293
- **Wartbarkeitsfundament dokumentiert:** `CLAUDE.md` hat jetzt einen kurzen Einstieg fuer kuenftige Agenten; die verbindlichen Architektur-, Style- und Sicherheitsregeln liegen in `docs/ARCHITECTURE.md`, `docs/STYLEGUIDE.md` und `docs/SAFETY-CHECKS.md`.
- **Keine App-Verhaltensaenderung:** Markup, Runtime-JavaScript, CSS, Icons, Firebase, Login, Google Kalender, Push, Sync, Challenge-Speicherung, Punkteberechnung und Pollen-Berechnung bleiben unveraendert.
- **Arbeitsweise fixiert:** Kuenftige Aenderungen sollen zuerst die Systemgrenzen klaeren, Designwerte ueber Tokens/Variablen fuehren und Layouts per lokalem HTTP-Server statt `file://` pruefen.
- Geaendert: `CLAUDE.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`, `docs/STYLEGUIDE.md`, `docs/SAFETY-CHECKS.md`.
- Geprueft: Dokumentationsstruktur und Versionsfundstellen; JavaScript-Syntaxbaseline der zentralen bestehenden JS-Dateien bleibt gruen.

## Version 0.1.0292
- **Challenges nach `Challenges Icons.dc.html` ueberarbeitet:** Aufgabenzeilen nutzen jetzt ein durchgaengiges gruenes Linien-SVG-Set statt Emoji-Icons. Die Zeilen, Punkte-Pillen, Difficulty-Badges und Mobile-Abstaende sind an den dunklen Pollen-Stil angepasst.
- **HeroCard innen bereinigt:** Die Gruppenziel-Karte hat SVG-Statusicons fuer Abzeichen, Heute und Offen, eine Fortschrittsleiste mit integrierten Prozent-/Punkte-Labels und den Pokal ohne den alten Stern oben.
- **Rangliste neu ikonisiert:** Platz-Medaillen, offene/erledigte Tageswerte, Trophy-Punkte und Anfeuern nutzen SVG-Icons und ruhige Datenpillen. Mobile bleibt kompakt und vermeidet Umbrueche/Clipping.
- **Bewusst nicht geaendert:** Firebase, Login, Google Kalender, Push, Sync, Challenge-Speicherung, Punkteberechnung, Kalenderdaten und Pollen-Berechnung bleiben unveraendert.
- Geaendert: `features/challenges/challenges.js`, `core/misc.js`, `styles/appShell.css`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax und Browser-Screenshots fuer Challenges auf Desktop und Mobile werden fuer diese Version neu erstellt.

## Version 0.1.0291
- **Sicherheits-Haertung umgesetzt:** Change ist clientseitig und in Firestore auf die Konten `ak2191@gmx.de` und `svenja.streit@googlemail.com` begrenzt. Nicht freigegebene Google-/Firebase-Konten werden vor dem App-Start abgewiesen.
- **Firestore geschlossen:** `firebase/firestore.rules` erlaubt Reads/Writes nur noch fuer die Allowlist. Private Settings, Pollen-Symptome und Push-Tokens sind eigene Nutzerdaten; Challenge-Vorlagen sind Admin-only; Nudges funktionieren nur zwischen freigegebenen Nutzern.
- **Push-Tokens privatisiert:** FCM-Tokens werden in `change_push_tokens/{safeEmail}` geschrieben und alte `change_players.fcmToken`-Felder beim naechsten Push-Update geloescht.
- **GitHub-Update abgesichert:** Der Settings-GitHub-Bereich ist nur fuer Admin `ak2191@gmx.de` sichtbar. Der Worker akzeptiert Upload/Rollback/Status/Files/Commits nur noch mit Firebase-ID-Token dieses Admins plus Freigabe-Code; CORS ist nicht mehr `*`.
- Geaendert: `core/security/accessControl.js`, `index.html`, `app.js`, `core/integrations/firebaseAuthBridge.js`, `core/integrations/googleSyncStatus.js`, `features/settings/settingsPanel.js`, `firebase/firestore.rules`, `scripts/changeGithubUpdateWorker.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax von `app.js`, `core/security/accessControl.js`, `core/integrations/firebaseAuthBridge.js`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js` und Worker-Modul; Suche nach offenen Firestore-Regeln, persistiertem Freigabe-Code, oeffentlicher FCM-Token-Speicherung und Worker-CORS `*`.

## Version 0.1.0290
- **HeroCards nach den gelieferten Dark-Designs neu aufgebaut:** Dashboard, Kalender, Challenges und Einstellungen nutzen jetzt die dunkle Kartenflaeche mit 3-Spalten-Desktoplayout, eigener Illustration und rechter Statistikleiste. Mobile nutzt die kompakte `Text + Illustration / Stats`-Anordnung aus dem Mobil-Mockup.
- **Neue Illustrationen und bessere Lesbarkeit:** Dashboard, Kalender, Settings und Gruppenziel haben neue SVG-Illustrationen; die Challenge-Karte blendet die alte Trophy-Illustration aus. Light-Theme-Altregeln werden gezielt ueberstimmt, damit die dunklen HeroCards auch lokal sichtbar bleiben.
- **Bewusst nicht geaendert:** Pollen bleibt unveraendert. Firebase, Sync, Login, Google Kalender, Push, Pollen-Berechnung, Kalenderdaten, Challenge-Speicherung und Punkteberechnung bleiben unveraendert.
- Geaendert: `features/dashboard/dashboard-logic.js`, `features/calendar/calendarPanels.js`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `core/misc.js`, `styles/appShell.css`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax der geaenderten JS-Dateien, Headless-Chrome-Smoke-Test fuer Dashboard/Kalender/Challenges/Settings auf Desktop und Mobile, kein horizontaler Overflow, Versionsfundstellen auf 0.1.0290 und ZIP-Root-Struktur.

## Version 0.1.0288
- **Rangliste einzeilig neu aufgebaut:** `features/challenges/challenges.js` liefert fuer jede Spielerzeile jetzt Rang-Kreis, Medaille, Name mit Live-Punkt, Heute-offen-/Heute-erledigt-Werte und Gesamtpunkte als Trophy-Feld. Die bestehenden Punktedaten werden nur gelesen, nicht anders berechnet.
- **Mobile und lokale/Desktop-Darstellung im gleichen Stil:** Der finale v0.1.0288-Block in `styles/appShell.css` macht aus der Rangliste eine flache, dunkle Karte mit gruenem Akzent, einzeiligen Reihen und horizontalem Scroll auf sehr schmalen Displays.
- **Bewusst nicht geaendert:** Firebase, Sync, Login, Google Kalender, Push, Challenge-Speicherung, Punkteberechnung, Kalenderdaten und Datenlogik bleiben unveraendert. `AGENTS.md` bleibt entfernt.
- Geaendert: `features/challenges/challenges.js`, `styles/appShell.css`, `features/pollen/pollenView.js`, `features/settings/settingsPanel.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax von `features/challenges/challenges.js`, `features/pollen/pollenView.js` und `features/settings/settingsPanel.js`, neuer v0.1.0288-CSS-Block klammerbalanciert, Root-Dateiliste ohne `AGENTS.md`, Versionsfundstellen auf 0.1.0288 und ZIP-Struktur.
- Hinweis: Die bekannte Gesamt-Klammerzaehlung von `styles/appShell.css` hat weiterhin die aeltere Altlast (diff -1). Der neue v0.1.0288-Block selbst ist ausgeglichen.

## Version 0.1.0287
- **HeroCards nicht nur farblich, sondern geometrisch an PollenView angeglichen:** Der neue finale Block am Ende von `styles/appShell.css` setzt fuer Dashboard, Kalender, Challenges und Einstellungen die spaetere PollenView-Geometrie: Desktop 3-Spalten-Raster `Text / Illustration / Stats`, 238px Mindesthoehe, 28px Radius, Pollen-Padding, 45px Titel und Pollen-nahe Stats-Zeilen.
- **Mobile Pollen-Anordnung uebernommen:** Mobile HeroCards nutzen jetzt dieselbe sichtbare Struktur wie Pollen: oben `Text + Illustration`, darunter die dreigeteilte Stats-Leiste. Werte fuer 760px und 390px sind aus der PollenView-Cascade nachgezogen.
- **Root Cause des vorherigen kaum sichtbaren Fixes:** Einige alte Hero-Regeln zielten auf Wrapper wie `.dashp-hero-visual` oder `.cal-premium-hero-visual`, die im aktuellen Markup nicht die tatsaechlichen SVGs sind. v0.1.0287 setzt deshalb gezielt die echten Klassen `dashp-hero-illustration`, `cal-hero-illustration`, `settings-hero-illustration` und `chv227-illustration`.
- **Bewusst nicht geaendert:** Firebase, Sync, Login, Google Kalender, Push, Pollen-Berechnung, Kalenderdaten und Datenlogik bleiben unveraendert. `AGENTS.md` bleibt entfernt.
- Geaendert: `styles/appShell.css`, `features/pollen/pollenView.js`, `features/settings/settingsPanel.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax von `features/pollen/pollenView.js` und `features/settings/settingsPanel.js`, neuer v0.1.0287-CSS-Block klammerbalanciert, Root-Dateiliste ohne `AGENTS.md`, Versionsfundstellen auf 0.1.0287 und ZIP-Struktur.
- Hinweis: Die bekannte Gesamt-Klammerzaehlung von `styles/appShell.css` hat weiterhin die aeltere Altlast (diff -1). Der neue v0.1.0287-Block selbst ist ausgeglichen.

## Version 0.1.0286
- **Unerwuenschte Root-Datei entfernt:** `AGENTS.md` wurde aus dem App-Root geloescht, damit Release-ZIPs keine zusaetzliche Codex-/Arbeitsregel-Datei als App-Datei enthalten.
- **UI-Stand bleibt gleich:** Die HeroCard-Farbangleichung aus v0.1.0285 bleibt unveraendert. Keine Aenderung an `styles/appShell.css` in dieser Version.
- **Bewusst nicht geaendert:** Firebase, Sync, Login, Google Kalender, Push, Pollen-Berechnung, Kalenderdaten und Datenlogik bleiben unveraendert.
- Geaendert: `AGENTS.md` entfernt, `features/pollen/pollenView.js`, `features/settings/settingsPanel.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprueft: JavaScript-Syntax von `features/pollen/pollenView.js` und `features/settings/settingsPanel.js`, Root-Dateiliste ohne `AGENTS.md`, Versionsfundstellen auf 0.1.0286 und ZIP-Struktur ohne `AGENTS.md`.

## Version 0.1.0285
- **HeroCards an PollenView-Farbwelt angeglichen:** Dashboard, Kalender, Challenges und Einstellungen bekommen am Ende von `styles/appShell.css` eine gemeinsame finale Farbregel. Dunkle Ansicht: gleiche Pollen-nahe Kartenflaeche, Border, Shadow, Linien, Textfarben und Icon-Akzente. Mobile Ansicht: gleiche mobile Pollen-Hero-Flaeche (`--change-mobile-hero-bg`) statt eigener Sonderverlaeufe.
- **Heller/lokaler Modus mitgezogen:** Die grossen Startkarten nutzen im hellen Modus die PollenView-nahe helle Flaeche mit passender Text- und Stat-Farbe, damit Mobile und lokale Darstellung optisch konsistent bleiben.
- **Bewusst nicht geaendert:** PollenView selbst bleibt Referenz und behaelt die eigenen Belastungsfarben. Keine Aenderung an Firebase, Sync, Login, Google Kalender, Push, Pollen-Berechnung, Kalenderdaten oder Datenlogik.
- Geaendert: `styles/appShell.css`, `features/pollen/pollenView.js`, `features/settings/settingsPanel.js`, `CLAUDE.md`, `CHANGELOG.md`. Keine neuen Dateien, keine Patch-Dateien.
- Geprueft: JavaScript-Syntax von `features/pollen/pollenView.js` und `features/settings/settingsPanel.js`, neuer CSS-Block klammerbalanciert, Versionsfundstellen auf 0.1.0285 aktualisiert, Vergleich gegen v0.1.0284-ZIP zeigt nur die erwarteten 5 Dateien.
- Hinweis: Die Gesamt-Klammerzaehlung von `styles/appShell.css` hat weiterhin eine bereits vor diesem Block vorhandene Altlast (diff -1). Der neue v0.1.0285-Block selbst ist ausgeglichen und bewusst am Dateiende platziert.

## Version 0.1.0284
- **Codex-Arbeitsregeln als `AGENTS.md` ergaenzt:** Der App-Root enthaelt jetzt eine kurze feste Arbeitsanweisung fuer Codex: `CLAUDE.md` zuerst lesen, bestehende Architektur einhalten, keine Patch-/Workaround-Dateien, nur betroffene Systeme aendern, Version und Pruefungen bei echten Codeaenderungen beachten.
- **Keine App-Verhaltensaenderung:** Firebase, Sync, Login, Google Kalender, Push, Dashboard, Challenges, Pollen-Berechnung und UI-Verhalten bleiben unveraendert.
- Geaendert: `AGENTS.md`, `features/pollen/pollenView.js`, `features/settings/settingsPanel.js`, `CLAUDE.md`, `CHANGELOG.md`. Keine Patch-Dateien, keine Workaround-Dateien.
- Geprueft: JavaScript-Syntax, ZIP-Struktur und Versionsfundstellen.

## Version 0.1.0283
- **Pollen-Symptomkarte mobil am App-Rand ausgerichtet:** Der Bereich `Symptome heute` nutzt mobil jetzt die volle Breite innerhalb des bestehenden App-Shell-Rands, ohne eigene seitliche Einzuege oder asymmetrische Margins. Die Allergieprofil-Klickflaeche und die bestehende v0.1.0282-Groesse bleiben erhalten.
- Bestehende Icons, Pollen-Icons, Symptom-Icons, aktive Icon-Assets, Pollenwerte, Firebase-Logik, Sync, Login, Kalender, Push und Challenges bleiben unveraendert.
- Geaendert: `features/pollen/pollenView.css`, `features/pollen/pollenView.js`, `features/settings/settingsPanel.js`, `CLAUDE.md`, `CHANGELOG.md`. Keine neuen Dateien, keine Patch-Dateien, keine Root-Dateien.
- Geprueft: JavaScript-Syntax, CSS-Klammerbilanz und ZIP-Struktur.

## Version 0.1.0282
- **Pollen-Symptomkarte korrigiert:** Die Allergieprofil-Zeile ist jetzt als vollständige Klickfläche erkennbar, der Pfeil sitzt wieder rechts und die mobile Darstellung wird nicht mehr von älteren Kompaktregeln zu klein gezogen.
- Bestehende Icons, Pollen-Icons, Symptom-Icons, aktive Icon-Assets, Pollenwerte, Firebase-Logik, Sync, Login, Kalender und Challenges bleiben unverändert.
- Geändert: `features/weather/pollenSymptoms.js`, `features/pollen/pollenView.css`, `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`. Keine neuen Dateien, keine Patch-Dateien, keine Root-Dateien.
- Geprüft: JavaScript-Syntax, CSS-Klammerbilanz und ZIP-Struktur.

## Version 0.1.0281
- **Pollen-Symptomauswertung neu aufgebaut:** Die Auswertung bleibt in der bestehenden Symptom-/Statistik-Kachel und öffnet per Klick ein Detailpanel „Dein Allergieprofil“ mit Zusammenfassung, erkannten Mustern, beschwerdefreien Tagen trotz erhöhter Pollenbelastung und letzten vollständigen Tagen. Keine zusätzliche Pollen-Kachel.
- **„Keine“ ist jetzt eine bewusste Eingabe:** Symptomfelder starten unbeantwortet und werden erst nach Auswahl aktiv. „Keine“ wird als echter Wert gespeichert, aber bewusst gräulich statt grün dargestellt. Nur vollständig bewertete Tage werden für die Statistik verwendet.
- **Firebase-Datenmodell erweitert, ohne Auto-Start:** `change_pollen_symptoms` speichert zusätzlich `answered`, `complete` und `symptomScore`. Auswertungen werden weiterhin aus Rohdaten berechnet. Kein automatischer Firebase-Start, kein Login-Auto-Sync, kein Push-Dialog und keine Änderung an Kalender, Dashboard oder Challenges.
- Geändert: `features/weather/pollenSymptoms.js`, `features/pollen/pollenView.css`, `features/pollen/pollenView.js`, `features/settings/settingsPanel.js`, `CLAUDE.md`, `CHANGELOG.md`. Keine Icons geändert, keine neuen Dateien, keine Patch-Dateien, keine Root-Dateien.
- Geprüft: `node --check features/weather/pollenSymptoms.js`, `node --check features/pollen/pollenView.js`, `node --check features/settings/settingsPanel.js`, CSS-Klammerbilanz.

## Version 0.1.0280
- **Pollen-HeroCard-Illustrationen vollständig auf das neue Design-Set umgestellt.** Die großen Hero-Bilder für Gräser, Birke, Ambrosia, Beifuß, Erle und Olive wurden aus dem gelieferten grünen Designkonzept übernommen: gefüllte, geschichtete Silhouetten mit ruhiger Tiefe statt der älteren gelb-grünen Illustrationen.
- Kleine Pollenarten-Icons, Symptom-Icons und Statuspunkte bleiben aus v0.1.0279 erhalten. Keine Änderung an Pollenwerten, Auswahl, Forecast-Berechnung, 24-Stunden-Ausblick, Firebase, Sync, Login, Kalender oder Push.
- Geändert: `features/pollen/pollenView.js`, `features/settings/settingsPanel.js`, `CLAUDE.md`, `CHANGELOG.md`. Keine neuen Dateien, keine Patch-Dateien, keine Root-Dateien.
- `node --check features/pollen/pollenView.js`, `node --check features/settings/settingsPanel.js` und CSS-Klammerprüfung grün.


## Version 0.1.0279
- **Pollen-Icons und Statuspunkte auf das neue Design umgestellt.** Ausschließlich die bestehende Darstellung wurde ausgetauscht: botanische Allergieprofil-Icons (Gräser, Birke, Ambrosia, Beifuß, Erle, Olive), vier Symptom-Icons, die drei Hero-Statuszeichen (aktive Pollenart, Peak, ruhigster Tag) sowie die Punkte im 5-Tages-Ausblick.
- Große Hero-Illustrationen, Kartenlayout, Texte, Datenmodell, Pollenberechnung, Auswahlverhalten, Firebase-/Sync-Logik und Navigation bleiben unverändert.
- Die Statuspunkte verwenden nun das neue Ring-plus-Kern-Prinzip; Intensitätsfarben bleiben erhalten (Grün, Gelb, Rot), damit die Bedeutung der Belastungsstufen nicht verloren geht.
- Geändert: `features/pollen/pollenView.js`, `features/weather/pollenSymptoms.js`, `features/pollen/pollenView.css`, `features/pollen/pollenView.js`, `features/settings/settingsPanel.js`, `CLAUDE.md`, `CHANGELOG.md`.
- Geprüft: JavaScript-Syntax beider geänderter JS-Dateien, CSS-Klammerbilanz und vollständige Zuordnung aller sechs Pollenarten sowie aller vier Symptome. Keine neuen Dateien, keine Patches, keine Änderungen an Login, Firebase, Datenbank-Sync, Google Kalender, Dashboard oder Challenges.


## Version 0.1.0278
- **GitHub-Upload läuft jetzt wirklich passiv innerhalb der geöffneten App weiter.** Der bestehende Worker-Status-Polling-Job bleibt aktiv, wenn die GitHub-Einstellungen verlassen werden, und wechselt die Ansicht dabei nicht mehr zurück zu Einstellungen/GitHub.
- **Ursache behoben:** `pollGithubActionStatus()` hat bei jedem Statuswechsel `refreshSameTab('github')` aufgerufen. Nach einem Wechsel zu Pollen, Kalender, Dashboard oder Challenges wurde dadurch der Settings-Workspace wieder geöffnet. Neu aktualisiert `refreshGithubUpdatePanelIfVisible()` nur dann, wenn der GitHub-Tab bereits sichtbar geöffnet ist. In allen anderen Ansichten läuft der Timer ohne UI-Eingriff weiter.
- **Status bleibt genau dort, wo er hingehört:** Keine neue Header-Anzeige, keine Glockenmeldung, kein Toast, keine Push-Nachricht und kein automatischer Reload. Beim späteren Öffnen des GitHub-Tabs steht weiterhin der aktuelle bzw. fertige bestehende Status mit dem vorhandenen manuellen Reload-Button.
- **Wiederaufnahme abgesichert:** Der bewusst gestartete Job (Commit, Zielversion, Phase, Pages-/Workflow-Status) wird unter `change_github_update_background_v1` lokal gespeichert. Nach einem Seitenreload wird nur ein noch laufender, bewusst gestarteter Job wieder gepollt. Fehlerhafte Alt-Jobs werden nicht wiederhergestellt, damit sie keinen neuen Upload blockieren.
- **Firebase bewusst unverändert:** Firestore startet nicht automatisch, es gibt keinen zusätzlichen Firebase-Listener und keine Auth-/Sync-/Push-Aktivität nach Login. Firebase kann keinen geschlossenen Browser-Tab weiter ausführen; für die gewünschte Navigation innerhalb der geöffneten App ist der zentrale, lokale Polling-Job die stabilere und dokumentationskonforme Lösung.
- Geändert: `features/settings/settingsPanel.js`, `features/pollen/pollenView.js`, `CLAUDE.md`, `CHANGELOG.md`. Keine Änderung an Dashboard, Kalender, Challenges, Pollen-Funktion, Login, Firebase, Datenbank-Sync, Google Kalender oder Push.
- `node --check features/settings/settingsPanel.js` und `node --check features/pollen/pollenView.js` grün. Zusätzlich geprüft: Polling-Funktion enthält keine Navigation/Settings-Aktualisierung mehr, wenn der GitHub-Tab nicht sichtbar ist.


## Version 0.1.0277
- **Icon-Wechsel: "Neuer Tag" (Sonnenaufgang) → "Atem" (konzentrische Ringe).** Neues Icon aus eigenem Design-Konzept des Nutzers übernommen. Konzentrische Ringe in Forest Green — minimalistisch, ruhig, Fokus.
- SVG 1:1 aus Design-HTML extrahiert. Kleine Größen (36px Header) erhalten angepasste Strichstärken aus dem Design (3.4px statt 2.3px, 2 Ringe statt 3 für bessere Lesbarkeit bei kleiner Darstellung — so wie im Design vorgesehen).
- Alle Icon-Assets ersetzt: `icons/icon-change-192.png`, `icons/icon-change-512.png`, `icons/icon-maskable-192.png`, `icons/icon-maskable-512.png`, `icons/apple-touch-icon.png`, `icons/icon-change-512.svg`, `icons/icon-change-192.svg`.
- `index.html`: Atem-Icon an allen 3 Stellen ersetzt: Loading-Screen, Login-Screen, App-Header. Kein alter Icon-Code mehr vorhanden.
- Keine Änderung an App-Logik, CSS oder Features.


- **Neues App-Icon "Neuer Tag"**: Sonnenaufgang-Icon (aus eigenem Design-Konzept des Nutzers) ersetzt das bisherige Icon vollständig — in allen Varianten der PWA-Assets UND in der App selbst.
- Icon-Assets: `icons/icon-change-192.png`, `icons/icon-change-512.png` (any), `icons/icon-maskable-192.png`, `icons/icon-maskable-512.png` (maskable, 10% Safe Zone), `icons/apple-touch-icon.png` (180px iOS), `icons/icon-change-512.svg` (Browser-Favicon SVG).
- `index.html`: Altes galaktisches Spiral-SVG an **drei Stellen** durch "Neuer Tag" ersetzt: (1) Loading-Screen (`#loading .ld-icon`), (2) Login-Screen (`.login-logo`), (3) App-Header (`.h-logo-icon`). Alle drei SVGs direkt inline, keine externen Requests nötig.
- `manifest.json`: `background_color` und `theme_color` auf `#163A29` (Dunkelgrün) geändert.
- Keine Änderung an App-Logik, CSS, Dashboard, Kalender, Challenges, Pollen oder Settings.


- **Neues App-Icon "Neuer Tag"**: Sonnenaufgang-Icon (aus eigenem Design-Konzept des Nutzers) ersetzt das bisherige Icon vollständig in allen Varianten. SVG-Pfade 1:1 aus der Design-HTML-Datei extrahiert und per cairosvg in alle nötigen Größen gerendert.
- Neue Icon-Dateien: `icons/icon-change-192.png`, `icons/icon-change-512.png` (any/normal), `icons/icon-maskable-192.png`, `icons/icon-maskable-512.png` (maskable mit 10% Safe-Zone-Rand für Android), `icons/apple-touch-icon.png` (180×180 für iOS), `icons/icon-change-512.svg` (Favicon SVG), `favicon.ico` (16/32/48px multi-size, Root-Verzeichnis).
- `manifest.json`: `background_color` und `theme_color` von `#080c18` auf `#163A29` (Dunkelgrün, passend zum Icon-Hintergrund) geändert.
- `index.html`: `.ico`-Favicon-Referenz ergänzt (Best Practice: ICO zuerst als Fallback, dann SVG), Apple Touch Icon auf die neue 180px-Datei gezeigt.
- Keine Änderung an App-Logik, CSS, Dashboard, Kalender, Challenges, Pollen oder Settings.


- **Bug: In der Challenges-Rangliste gab es keinen sichtbaren Abstand zwischen den einzelnen Personen-Zeilen (Alex/Svenja stießen direkt aneinander), während zwischen den Einträgen unter "Heutige Aufgaben" ein klarer Abstand sichtbar war.**
- **Root Cause:** `features/challenges/challenges-mobile.css` setzt für `#challenges-list` UND `#leaderboard-list` gemeinsam `display:grid; gap:9px` (Zeile ~2792), damit der Zeilenabstand über den Grid-`gap` erzeugt wird (das `margin-bottom` der einzelnen Zeilen ist an anderer Stelle bewusst auf `0` gesetzt). Eine ÄLTERE, aber spezifischere Regel (Zeile ~1636: `body.change-view-challenges #challenges-view .leader-card #leaderboard-list{display:block!important}`, Spezifität `(2,2,1)` statt `(2,1,1)` der jüngeren grid-Regel) gewinnt unabhängig von ihrer früheren Position in der Datei und wirft `#leaderboard-list` zurück auf `display:block`. Bei `display:block` hat `gap` keine Wirkung mehr — daher kein Abstand zwischen den Personen-Zeilen. `#challenges-list` ist von der Block-Regel nicht betroffen, bleibt im Grid, `gap` wirkt dort korrekt.
- **Diagnose-Fallstrick dieser Session:** Die Browser-Verbindung ("Claude in Chrome") war in dieser Session nicht verfügbar. Ein erster CSSOM-Introspektions-Versuch über eine lokale `file://`-Testseite lieferte scheinbar leere/widersprüchliche Scan-Ergebnisse (`cssRules` auf `<link>`-Stylesheets ist unter `file://` in Chrome aus Sicherheitsgründen blockiert, der Fehler wurde durch ein zu großzügiges `try/catch` verschluckt). Nach Umstieg auf einen lokalen `python3 -m http.server` lieferte derselbe Scan-Code sofort korrekte, vollständige Ergebnisse. **Lehre für künftige Sessions: CSS-Cascade-Diagnose per JS-Introspektion (`document.styleSheets[i].cssRules`) niemals über `file://` durchführen, immer über einen lokalen HTTP-Server, sonst können Scans fälschlich leer zurückkommen und zu falschen Schlussfolgerungen führen.**
- Fix: `display:grid!important` erneut für `#leaderboard-list` gesetzt, mit einem Selector, der durch ein zusätzliches `html`-Element-Segment bei gleicher ID-/Klassenzahl höhere Spezifität als die blockierende `.leader-card`-Regel hat (`html body.change-view-challenges #challenges-view .leader-card #leaderboard-list`). Dadurch wirkt der bereits vorhandene `gap:9px` wieder. Kein Eingriff in `#challenges-list` nötig (dort bestand kein Problem). Live in einer mit allen echten CSS-Dateien als `<link>`-Stylesheets (über HTTP) nachgebauten Testseite verifiziert: Zeilen-Abstand vorher `0px`, nachher `8px` (identisch zum Referenz-Abstand zwischen zwei Aufgaben-Einträgen), zusätzlich per Screenshot visuell bestätigt.
- Geändert: `styles/appShell.css` (eine neue, klar kommentierte Override-Sektion am Dateiende, `@media(max-width:700px)`, nur `body.change-view-challenges`-Scope). Keine Änderung an Dashboard, Kalender, Pollen, Settings oder an bestehenden Regeln in `challenges-mobile.css` selbst.
- `node --check` für `features/pollen/pollenView.js` und `features/settings/settingsPanel.js` grün (Versionsnummer-Bump). CSS-Klammerbilanz des neuen Bereichs separat verifiziert (3 öffnende / 3 schließende, intern ausgeglichen).


- **Vier Bugfixes in Pollen- und Challenges-View, alle nach demselben wiederkehrenden Root-Cause-Muster: generische Scroll-End-Spacer (`::after`-Pseudo-Elemente mit `order:0`, gedacht für Safe-Area-Puffer unter der Bottom-Nav) werden in Flex-Column-Containern fälschlich VOR Inhaltsblöcken mit `order:1`/`order:2` einsortiert, statt wie beabsichtigt ganz am Ende.**
- **Fix 1 — Pollen-HeroCard hing zu weit unten:** `body.change-view-pollen #pollen-view .pollen-neo-shell::after` (42px Spacer) hatte `order:0`, während `.pollen-neo-top` (Hero-Section) `order:1` und `.pollen-neo-main-grid` `order:2` haben (gesetzt in `features/pollen/pollenView.css`). Da 0 < 1, rutschte der Spacer vor die Hero-Section und erzeugte einen 42px-Leerraum zwischen Überschrift und Karte. Live im Browser mit `getBoundingClientRect()`/`element.matches()` verifiziert (Gap 42px → 0px), Safe-Area-Verhalten am Seitenende nach dem Fix erneut geprüft (intakt). Fix: `order:3` auf den Spacer, nur für Pollen.
- **Fix 2 — Challenges: großer Leerraum zwischen HeroCard und Wochenleiste:** identisches Muster. `.challenge-layout::after` (42px Spacer, `order:0`) rutschte vor `.challenge-week-block` (`order:1`), da auch die HeroCard `.change-challenge-hero-v227` `order:0` hat. Gap sank nach dem Fix (`order:3` auf den Spacer) von 96px auf die regulären 36px (18px Container-Gap + 18px eigenes `margin-top` der Wochenleiste — beides normal, kein Bug). Live verifiziert und per Screenshot bestätigt.
- **Fix 3 — Challenges: Ranglisten-Kachel hatte riesigen Leerraum unter den Personen-Zeilen:** `.leader-card` erbte `min-height:420px!important` aus `features/challenges/challenges-mobile.css` (3 Stellen), ursprünglich für eine alte Zwei-Spalten-Architektur gedacht (`.leader-card` und `.challenge-card` sollten via `align-self:stretch` gleich hoch wirken). Im aktuellen gestapelten Mobile-Layout sinnlos: `.challenge-card` hat genug echten Inhalt (>1300px, fällt nicht auf), `.leader-card` bei wenigen Mitspielern (hier 2 Personen, ~222px Inhalt) erzeugte das bis zu ~200px Leerraum. Fix: `min-height:0` + `overflow:visible` nur für `.leader-card`, `.challenge-card` bewusst unverändert gelassen (kein Problem dort, nichts Funktionierendes anfassen). Live verifiziert: Kartenhöhe 420px → 224.75px, visuell bestätigt.
- **Fix 4 — Challenges: Wochenleiste-Kachel optisch nicht im Card-Stil der anderen Karten:** Vorher reiner grauer linearer Verlauf ohne grünen Marken-Akzent, weißer statt grüner Border-Ton. Per Nutzer-Rückfrage bestätigt gewünscht. Referenzwerte 1:1 von `.leader-card`/`.challenge-card` übernommen (per `getComputedStyle` ausgelesen) — nicht von der größeren Hero-Hauptkarte, da die Wochenleiste wie Rangliste/Aufgaben eine Sekundär-Karte ist (`22px` statt `26px` Radius, `0.1`-Alpha-Akzent statt `0.16` bei der Hero). In einer mit allen echten CSS-Dateien als `<link>`-Stylesheets (statt nachträglich injizierten `<style>`-Tags) nachgebauten Testseite verifiziert, da `background`-Overrides über live injizierte `<style>`-Tags im Chrome-Test-Tooling dieser Session aus ungeklärtem Grund nicht griffen, obwohl Spezifität und Cascade-Reihenfolge korrekt waren — im echten `<link>`-Kontext (so wie nach dem Deploy) funktioniert der Fix nachweislich.
- **Methodik:** Alle vier Fixes wurden über die "Claude in Chrome"-Browser-Verbindung direkt an der Live-App (`ak2191.github.io/Meine-App`) diagnostiziert — nicht durch isoliertes Nachbauen von Markup-Fragmenten, da ein erster Versuch ohne Live-Browser-Zugriff zu widersprüchlichen Ergebnissen führte (eine isolierte Testseite zeigte das Gegenteil des tatsächlichen Bugs, weil ein zur Laufzeit von JS eingefügtes `.pollen-neo-shell`/`.challenge-layout`-Wrapper-Element mit Pseudo-Element-Spacer in der isolierten Nachbildung fehlte). Lehre: bei Layout-Versatz-Bugs, die sich nicht durch reines `margin`/`padding`-Scannen erklären, IMMER auch auf `::before`/`::after`-Pseudo-Elemente der umgebenden Flex-Container und deren `order`-Wert prüfen, nicht nur auf die sichtbaren Inhaltselemente selbst.
- Geändert: `styles/appShell.css` (vier neue, klar kommentierte Override-Sektionen am Dateiende, alle in `@media(max-width:700px)`, alle View-spezifisch über `body.change-view-*`-Klassen eingegrenzt). Keine Änderung an Dashboard, Kalender, Settings, an Sync-/Firebase-/Push-Logik oder an bestehenden, funktionierenden Regeln (ausschließlich neue, später ladende Override-Regeln nach dem etablierten Append-Only-Muster).
- `node --check` für `features/pollen/pollenView.js` und `features/settings/settingsPanel.js` grün (Versionsnummer-Bump). CSS-Klammerbilanz meines neuen Bereichs separat verifiziert (8 öffnende / 8 schließende, intern ausgeglichen).


- **Mobile HeroCards aller fünf Views (Dashboard, Kalender, Challenges, Pollen, Einstellungen) auf exakt identische Höhe vereinheitlicht (216px, Referenz: Einstellungen-Profilkarte) — explizite Nutzeranforderung.**
- **Ausgangslage (gemessen mit script-freier Playwright-Testseite, echte Markup-Struktur aus den jeweiligen JS-Dateien nachgebaut):** Pollen 274px, Challenges 273px, Kalender 258px, Dashboard 193px, Einstellungen 216px. Nutzer bestätigte nach Rückfrage explizit, dass exakt gleiche Pixelhöhe gewünscht ist (nicht nur Annäherung) und dass der Pollen-CTA-Button dafür kompakter werden darf.
- **Zentrale Variable gefunden und korrigiert:** `--change-mobile-hero-card-height` (seit v0.1.0146 als gemeinsamer Mobile-Hero-Standard für Dashboard/Kalender/Challenges/Pollen gedacht, aber Einstellungen nie einbezogen) war auf `274px` gesetzt — auf `216px` geändert. Diese Variable wirkt aber nur als `min-height`; bei Karten, deren tatsächlicher Inhalt mehr Platz braucht, hat eine spätere, spezifischere Regel ohnehin `min-height:0` gesetzt und die Höhe wird vom Inhalt bestimmt. Die Variable allein reichte daher nicht aus — zusätzlich war für jede Karte eine gezielte Reduktion (Pollen, Challenges) bzw. Erhöhung (Dashboard) der internen Zeilenabstände nötig.
- **Pollen (274px → 216px):** Label-Margin-Bottom 10→6px, Titel-Margin-Bottom 10→4px, Subline-Margin-Top 6→2px, CTA-Button kompakter (Margin-Top 14→8px, Padding 8px 12px→6px 10px, Schrift 11.5→11px, mit expliziter Nutzererlaubnis), Stats-Zeile Padding-Top 12→8px, einzelne Insight-Item-Mindesthöhe 58→38px.
- **Challenges (273px → 216px):** Overline-Margin-Bottom 16→8px, Titelschrift 40→30px (mit reduziertem Margin-Top), Sub-Schrift 16→14px mit weniger Margin, Progress-Meta-Schrift/Abstände gestrafft, Progress-Bar-Höhe 9→7px, Stats-Margin-Top 18→12px, Stat-Item-Mindesthöhe 48→36px.
- **Kalender (258px → 216px):** Haupttreiber war ein Zeilenumbruch im `<h2>`-Titel ("Mittwoch, 17.06." brach bei 40px Schriftgröße auf 390px Breite zweizeilig um, macht allein 78px Höhe aus) — Schrift auf 26px reduziert, dadurch einzeilig. Zusätzlich Eyebrow/Zeilen-Abstände gestrafft, Seitenleiste (`.cal-premium-hero-side`) Padding/Margin feinjustiert.
- **Dashboard (193px → 216px, einziger Block der wachsen musste):** Insights-Zeile Margin-Top/Padding-Top erhöht, um die fehlenden 23px auszugleichen, ohne den Titel oder die Insight-Zeilen selbst zu verändern.
- **Wichtiger Nebenfund (Pollen-Überlappung):** Beim ersten Höhentest fiel auf, dass die Pollen-Karte mit der Seitenüberschrift "Pollen" überlappte (Titel-zu-Karte-Abstand war `-19px`, also echte Überlappung) — verursacht durch einen alten `#pollen-view-body{margin-top:-42px}`-Trick (kombiniert mit einer fixen `list-header`-Höhe von 42px), der unabhängig von der Kartenhöhe existierte und durch die neue kürzere Karte sichtbarer wurde. Dieser negative Margin wurde von `-42px` auf `-4px` reduziert, wodurch sich ein positiver Abstand von 19px ergibt (identisch zum Referenzwert der anderen Views). Diese Korrektur hatte keinen Einfluss auf die Kartenhöhe selbst.
- **Methodik / wiederkehrendes Muster:** Für jede einzelne CSS-Eigenschaftsänderung musste der tatsächliche Cascade-Gewinner unter 10–38 konkurrierenden historischen Regeln pro Eigenschaft per Playwright ermittelt werden (reines Code-Lesen reicht hier nicht). Auffälliges, wiederholt aufgetretenes Muster: viele Regeln existieren paarweise mit und ohne `#content`-Präfix in ihrem Selektor — die `#content`-Variante hat durch die zusätzliche ID höhere Spezifität und gewinnt unabhängig von der Position im Stylesheet. Eigene neue Override-Regeln mussten deshalb mehrfach nachträglich um `#content` ergänzt werden, nachdem eine erste Version ohne dieses Präfix wirkungslos blieb. Nach jeder Einzeländerung wurde sofort neu gemessen (kein Sammel-Edit ohne Zwischenkontrolle), abschließend alle vier Title-zu-Karte-Abstände gegen Null-Überlappung geprüft und Screenshots aller fünf Karten verglichen.
- **Neue CSS-Sektion:** Alle Änderungen außer der zentralen Variable und dem Pollen-Margin-Fix liegen gesammelt in einer neuen, klar kommentierten Sektion am Ende von `appShell.css` (`/* v0.1.0272 · Mobile HeroCards: einheitliche Höhe für alle Views */`), um sie von den historisch verteilten Alt-Regeln klar zu trennen und zukünftige Anpassungen an einer Stelle zu bündeln.
- Geändert: `styles/appShell.css` (eine Variable, ein bestehender Margin-Wert, eine neue ca. 15-zeilige Override-Sektion). Keine Änderung an Logik, Sync, Firebase, Push oder Kalenderdaten.
- `node --check` für beide JS-Dateien grün. CSS-Klammer-Bilanz: `1682/1683` (vorher `1668/1669` — die Differenz von -1 ist konsistent geblieben, beide Zahlen sind um 14 gestiegen durch die neuen Regelblöcke).


- **"DIESE WOCHE" wirkte auf Mobile falsch platziert — Ursache war ein Nebeneffekt einer früheren Korrektur, nicht ein neues Problem.**
- **Root Cause:** In v0.1.0268 wurde das Karten-Padding von `19px 18px 14px` auf `24px 18px 18px` erhöht, um die Gesamthöhe der Karte an Pollens Referenz anzugleichen ("Karte wirkt zu kompakt"). Das hat zwar die Gesamthöhe korrekt angepasst, aber als Nebeneffekt den Abstand zwischen Kartenoberkante und der Overline-Zeile ("DIESE WOCHE") von Pollens Referenzwert (`18px`/`19px` gemessener Gap) auf `24px`/`25px` erhöht — sichtbar als zu großer Leerraum über dem Text, während Pollens "DEINE POLLEN HEUTE" deutlich näher an der Kartenkante sitzt.
- **Fix:** `padding-top` zurück auf `18px` gesetzt (exakt Pollens Wert), `padding-bottom` bleibt bei `18px` (für die Gesamthöhe). Da in derselben früheren Session auch die Zeilenabstände zwischen Overline/Titel/Sub/Progress-Meta erhöht wurden, bleibt die Gesamthöhe der Karte trotz reduziertem oberem Padding nahezu unverändert (`273px` vs. vorher `279px`, Pollen-Referenz `274px`) — die Höhenkorrektur aus v0.1.0268 ist also weiterhin wirksam, nur die interne Verteilung des Abstands wurde balanciert.
- **Weitere Prüfung ("innere Striche"):** Nutzer konnte einen wahrgenommenen Unterschied nicht genau benennen. Systematisch verglichen: Trennlinienfarbe über der Stat-Zeile (`rgba(255,255,255,.08)` bei beiden identisch), vertikale Trennstriche zwischen den drei Stat-Werten (ebenfalls identisch, `.08` vs Pollens `.09` Alpha — minimal, nicht wahrnehmbar), Border-Anwendung auf allen drei Stat-Elementen inklusive des Button-Elements für "Abzeichen" (korrekt konsistent). Keine weitere Abweichung gefunden; vermutlich war der wahrgenommene Pixel-Unterschied eine Folge der oben beschriebenen Padding-Top-Differenz, die das gesamte Karten-Layout im Vergleich verschoben hat.
- **Verifikation:** Pixelmessung an den vier vom Nutzer gesendeten Screenshots (Desktop + Mobile, Pollen + Challenges) zur Lokalisierung des Effekts, anschließend Playwright-Messung des Card-zu-Label-Abstands vor/nach dem Fix sowie Kontrolle der Gesamthöhe, abschließend Screenshot-Vergleich.
- Geändert: `styles/appShell.css`, ein Padding-Wert in einer bestehenden Mobile-Regel. Keine Logikänderung.
- `node --check` für beide JS-Dateien grün. Klammer-Bilanz unverändert (`1668/1669`).


- **Tatsächliche Ursache gefunden, warum das Pokal-Icon trotz mehrfacher CSS-Positionskorrekturen (v0.1.0267–0.1.0269) im echten Rendering kaum sichtbar weiter rechts wanderte: nicht die CSS-Positionierung war das Problem, sondern die SVG-`viewBox` selbst.**
- **Root Cause:** Die Pokal-SVG nutzte `viewBox="0 0 220 220"`, aber der tatsächlich sichtbare Pokal-Pfad (Becher, Henkel, Stern, Glanzlicht) füllt davon nur den Bereich von etwa x=45 bis x=178 — das heißt, ca. 23% der SVG-Breite rechts (und ein ähnlicher Anteil oben/unten) waren unsichtbarer Leerraum *innerhalb* der SVG-Box selbst. CSS-Eigenschaften wie `right` positionieren die SVG-**Box**, nicht den sichtbaren Inhalt darin — jede CSS-Korrektur wurde dadurch faktisch um diesen toten Randanteil "aufgefressen", bevor sie beim sichtbaren Pokal ankam. Das erklärt, warum frühere Sessions trotz exakter, mehrfach verifizierter Playwright-Messungen der Box-Position (`illRight`, `illWidth` etc.) keine ausreichende visuelle Verschiebung im echten Screenshot erzeugten: die Messungen waren technisch korrekt, bezogen sich aber auf die falsche Referenzgröße (Box statt sichtbarer Inhalt).
- **Diagnoseweg:** Nutzer bestätigte explizit, dass v0.1.0269 tatsächlich deployed und neu geladen war (Versionsnummer in den Einstellungen verifiziert), wodurch ein Cache- oder Deployment-Problem ausgeschlossen werden konnte. Direkte Pixelanalyse des Nutzer-Screenshots (Goldfarben-Erkennung des Pokal-Umrisses, Helligkeitsgradient-Scan) zeigte einen Abstand zur Kartenkante von ca. 46px CSS-Pixel, weit über dem aus der CSS-Messung erwarteten Wert (~6px) — diese Diskrepanz von ~23px entspricht ziemlich genau dem rechnerisch ermittelten toten viewBox-Randanteil bei 100px Icon-Breite.
- **Fix:** `viewBox` von `"0 0 220 220"` auf `"40 18 142 164"` verengt — exakt auf die Bounding-Box des tatsächlich gezeichneten Pokal-Inhalts zugeschnitten. Dadurch füllt der sichtbare Pokal jetzt die gesamte SVG-Box aus, und die bestehende CSS-Positionierung (`right:-4px`, `width:100px`, vertikale Zentrierung via `transform:translateY(-50%)`) wirkt direkt auf den sichtbaren Inhalt statt auf eine größere unsichtbare Box.
- **Verifikation:** Visueller Screenshot-Vergleich nach dem viewBox-Fix bestätigt, dass der Pokal jetzt deutlich näher am rechten Kartenrand sitzt, ohne abgeschnitten zu werden (Karte hat `overflow:hidden` als zusätzliche Absicherung).
- Geändert: `core/misc.js` (eine viewBox-Zeichenkette). Keine CSS-Änderung in dieser Version, keine Logikänderung.
- `node --check` für `core/misc.js` und beide Settings/Pollen-JS-Dateien grün. CSS-Klammer-Bilanz unverändert (`1668/1669`), da kein CSS-File in dieser Version berührt wurde.


- **Zwei weitere Korrekturen an der Challenges-HeroCard auf Mobile: Abstand zur Seitenüberschrift verkleinert, Pokal-Icon weiter nach rechts verschoben.**
- **Abstand zur Überschrift war zu groß:** Per Pixelmessung an zwei Vergleichsscreenshots (Pollen vs. Challenges, identische Auflösung) wurde der Abstand zwischen Titel-Unterkante und Karten-Oberkante verglichen: Pollen `77px`, Challenges `107px` (Screenshot-Pixel bei 1280px Bildbreite), eine Differenz von `30px` Screenshot-Pixeln bzw. ca. `9px` echten CSS-Pixeln (Skalierungsfaktor 1280/390). Ursache: Pollen verwendet einen Pollen-spezifischen Mechanismus (`#pollen-view-body{margin-top:-42px}` kombiniert mit einer fixen `list-header`-Höhe von 42px), der für Challenges nicht 1:1 übertragbar ist, ohne die genaue Funktionsweise dieses Tricks an anderer Stelle zu riskieren. Stattdessen wurde gezielt nur `.challenge-layout`s oberes Padding reduziert (`10px → 1px`, die Differenz von 9px aus der Messung), eine deutlich risikoärmere und lokal begrenzte Korrektur.
- **Pokal-Icon sollte weiter rechts sitzen:** Nutzer-Feedback nach dem vorherigen Fix (v0.1.0268) war explizit, dass das Icon noch weiter nach rechts wandern sollte. Der `right`-Wert der Illustration wurde von `14px` auf `-4px` reduziert (das Icon reicht jetzt minimal in den Padding-Bereich der Karte hinein, was durch das vorhandene `overflow:hidden` der Karte unproblematisch ist), wodurch der freie Raum zwischen Icon und rechter Kartenkante von vorher `24px` auf `6px` sank.
- **Verifikation:** Da Pollens Negativ-Margin-Mechanismus in einem vereinfachten Test-Markup ohne die exakte Original-DOM-Struktur zu unrealistischen Absolutwerten führte, wurde für den Abstand-Fix die direkte Pixelmessung an den realen Nutzer-Screenshots als Referenz verwendet statt der Testseiten-Messung; die *relative* Veränderung nach dem Fix (Reduktion um exakt 9px) wurde zusätzlich in der Testseite bestätigt. Für die Icon-Position wurde wie gewohnt vor/nach Messung plus Screenshot-Vergleich mit echtem Pokal-SVG-Markup durchgeführt.
- Geändert: `styles/appShell.css`, zwei bestehende Mobile-Regeln (ein Padding-Wert, ein Right-Wert). Keine Logikänderung.
- `node --check` für beide JS-Dateien grün. Klammer-Bilanz unverändert (`1668/1669`).


- **Drei weitere Feinabstimmungen an der Challenges-HeroCard nach erneutem Nutzer-Feedback: Gesamtkachel großzügiger, Pokal-Icon nochmals nachgeschärft, Hintergrund-Glanzposition korrigiert.**
- **Hintergrund-Glanz saß an der falschen Stelle:** Die tatsächlich gewinnende Mobile-Regel (`@media(max-width:700px)`, gemeinsam mit Dashboard/Kalender/Settings) positionierte den radialen Glanzpunkt bei `circle at 16% 8%` — links oben, auf der Textseite der Karte. Pollens Referenz-Hero hat den Glanz dagegen bei `circle at 88% 24%` — rechts oben, exakt dort, wo die Illustration sitzt. Bei Challenges schimmerte der Glanz also auf der falschen (Text-)Seite, während der Pokal auf der unbeleuchteten Seite saß. Fix: eigene Challenges-exklusive Background-Regel mit `circle at 88% 24%` (identisch zu Pollens gemessenem Wert) ergänzt, mit ausreichender Selektor-Spezifität, um die gemeinsame Dashboard/Kalender/Settings-Regel zu überschreiben, ohne diese anderen Views zu berühren.
- **Gesamtkachel wirkte zu kompakt:** Bei gemessenen `259px` (Pollen: `274px`) war der Höhenunterschied klein, aber die Innenabstände zwischen Overline/Titel/Subzeile/Fortschrittszeile waren enger als bei Pollen, was insgesamt gedrängter wirkte. Fix: `chv227-overline` margin-bottom `12px→16px`, `chv227-sub` margin-top `10px→14px`, `chv227-progress-meta` margin-top `14px→18px`, Karten-Padding `19px 18px 14px → 24px 18px 18px`. Neue gemessene Höhe: `279px`, jetzt minimal über Pollens `274px`.
- **Pokal-Icon erneut zu klein/falsch positioniert:** Trotz der Korrektur aus v0.1.0267 wirkte der Pokal auf dem vom Nutzer gesendeten Screenshot noch zu weit unten und zu klein im Verhältnis zur Kartenhöhe. Statt eines festen `top`-Pixel-Werts (der bei Kartenhöhen-Änderungen — wie der in dieser Version vorgenommenen Vergrößerung — leicht wieder daneben liegt) wird die Illustration jetzt über `top:50%;transform:translateY(-50%)` vertikal zentriert, robust gegen zukünftige Höhenänderungen. Breite von `82px` auf `100px` erhöht, Opazität von `.55` auf `.6` für mehr Präsenz.
- **Verifikation:** Alle drei Werte (Hintergrund-Gradient, Kartenhöhe, Illustration-Position) wurden vor und nach dem Fix per Playwright exakt gemessen und mit Pollens entsprechenden Referenzwerten abgeglichen, abschließend Screenshot-Vergleich.
- Geändert: `styles/appShell.css`, eine bestehende Mobile-Regel um Background ergänzt, drei Margin-Werte und ein Padding-Wert angepasst, Illustration-Positionierung auf Transform-basierte Zentrierung umgestellt. Keine Logikänderung.
- `node --check` für beide JS-Dateien grün. Klammer-Bilanz unverändert (`1668/1669`).


- **Pokal-Icon in der Challenges-HeroCard weiter an die Pollen-Vorlage angeglichen (Größe, Proportion, Randabstand) — Nachschärfung nach v0.1.0266, da der erste Versuch laut Nutzer-Feedback noch zu klobig wirkte.**
- **Maßvergleich mit Pollens Illustration als Referenz:** Pollens Gras-Illustration ist `88×112px` (schmal-hochformatig), sitzt `75px` von oben, `19px` vom rechten Rand, fast vertikal zentriert in der `274px` hohen Karte. Der Pokal war zuvor `96×96px` (quadratisch-kompakt), `28px` von oben, `8px` vom rechten Rand — dadurch wirkte er im Vergleich breiter/wuchtiger und enger an die Kante gedrängt, trotz korrekter vertikaler Grundposition aus v0.1.0266.
- **Fix:** Breite von `96px` auf `82px` reduziert (schlankere Wirkung, näher an Pollens Seitenverhältnis), `top` von `28px` auf `52px` erhöht (jetzt `72px` effektiver Abstand von der Kartenoberkante, nahezu identisch zu Pollens `75px`), `right` von `8px` auf `16px` erhöht (mehr Luft zum Kartenrand, kein "Kleben an der Kante" mehr).
- **Verifikation:** Exakte Maße von Pollens Illustration und der Challenges-Illustration vor und nach dem Fix per Playwright gemessen (Abstand zu allen vier Kartenrändern), danach Screenshot-Vergleich mit echtem Pokal-SVG-Markup (nicht nur Platzhalter).
- Geändert: `styles/appShell.css`, eine bestehende Mobile-Regel (drei Werte angepasst). Keine Änderung an Logik.
- `node --check` für beide JS-Dateien grün. Klammer-Bilanz unverändert (`1668/1669`).


- **Drei kleine Korrekturen an der Challenges-HeroCard und dem Wochenstreifen, alle auf Basis konkreter Nutzer-Rückmeldung zu Screenshots.**
- **"DIESE WOCHE" hatte falsche Farbe (Regression):** Die Overline der HeroCard war bei der Migration von `chv225` auf `chv227` (frühere Session) versehentlich von Grün (`#4ade80`, wie bei Pollens "DEINE POLLEN HEUTE") auf die neutrale gedämpfte Variable `--change-hero227-muted` reduziert worden. Fix: `.chv227-overline` bekommt wieder direkt `color:#4ade80`. Die gemeinsame Variable selbst wurde nicht verändert, da `.chv227-sub` ("Kalenderwoche 25") und die Stat-Labels ("Abzeichen"/"Heute"/"Offen") bewusst gedämpft bleiben sollen.
- **Pokal-Icon wirkte verloren in der Ecke:** Das Icon saß bei `top:2px;right:0;width:64px;opacity:.45` direkt an der oberen Kartenkante auf Höhe der kleinen Overline-Zeile, während der riesige "Gruppenziel"-Titel darunter viel mehr Raum einnahm — dadurch wirkte der Pokal klein und unbalanciert. Fix: vergrößert auf `96px`, nach unten verschoben auf `top:28px` (jetzt auf Höhe des Titels statt der Overline), Opazität leicht erhöht auf `.55` für bessere Sichtbarkeit ohne zu dominant zu wirken.
- **Wochentag-Tick zu klein/unklar:** Der "–"-Strich (bzw. "X P" bei erledigten Tagen) unter jeder Datums-Kachel war auf Mobile nur `10.5px` groß — wirkte auf Fotos wie ein unklarer kleiner Fleck statt ein lesbares Zeichen. Zusätzlich hatte die leere Variante einen `background:rgba(255,255,255,.16)`, der ursprünglich für das `i`-Punkt-Icon im Kalender gedacht war (mit fester Breite/Höhe) und beim Challenges-Textelement (variable Breite) wie ein unregelmäßiger grauer Klecks aussah statt wie ein klarer Indikator. Fix: Schriftgröße auf `13px` erhöht (an allen drei konkurrierenden Fundstellen — `change.css`, `features/challenges/challenges-mobile.css`, `styles/appShell.css`, da `appShell.css` als zuletzt ladende Datei den Cascade gewinnt), den `background` aus der geteilten Kalender/Challenges-Regel entfernt und für Challenges in eine eigene Regel mit nur `color:rgba(244,247,244,.45)` (statt `.30`) aufgeteilt.
- **Methodik:** Wie in den vorherigen Sessions wurde jede der drei Eigenschaften per Playwright-Cascade-Walk (alle matchenden Regeln inkl. Quelldatei und Media-Query in Lade-Reihenfolge ausgelesen) verifiziert, bevor die jeweils tatsächlich gewinnende Stelle bearbeitet wurde — reines Code-Lesen hätte hier mehrfach zur falschen (verlierenden) Regel geführt, was während der Bearbeitung auch passierte und durch die Messung aufgedeckt wurde. Nach jedem Fix wurde der neue Wert erneut gemessen, um zu bestätigen, dass er tatsächlich ankommt, sowie abschließend ein Screenshot-Vergleich mit dem Original-Nutzerscreenshot.
- Geändert: `styles/appShell.css`, `change.css`, `features/challenges/challenges-mobile.css`. Keine Änderung an Sync-, Firebase-, Push- oder Datenlogik — reine Darstellungskorrekturen.
- `node --check` für beide JS-Dateien grün. Klammer-Bilanz: `appShell.css` jetzt `1668/1669` (vorher `1667/1668` — die Differenz von -1 ist gleich geblieben, beide Zahlen stiegen um 1 durch das bewusste Aufspalten einer geteilten Kalender/Challenges-Regel in zwei eigenständige Regeln). `change.css` und `challenges-mobile.css` jeweils ausgeglichen.


- **Challenges-HeroCard im mobilen Layout endgültig auf Pollen-Niveau angeglichen (Breite, Innenabstand, Eckenradius) sowie verirrter theme-color-Meta-Tag korrigiert.**
- **Ursache der verbleibenden Differenz:** Bei mobiler Breite hatte die Challenges-HeroCard effektiv zwei gestapelte Innenabstände — einmal vom umgebenden `.challenge-layout` (18px, wird für die Rangliste- und Aufgaben-Karten weiterhin gebraucht und blieb unverändert), einmal von der HeroCard selbst (14px) — während Pollen keinen Zwischen-Container mit eigenem Padding hat. Dadurch war die Challenges-Karte schmaler und wirkte stärker "eingerückt" als die Pollen-Karte, obwohl beide vom selben `#content`-Außenrand (16px) ausgehen.
- **Warum die Korrektur mehrere Versuche brauchte:** Für Breite, Innenabstand und Eckenradius der HeroCard existieren in `appShell.css` jeweils 25–47 konkurrierende Regeln (Altlasten aus den Vorgänger-Versionen `chv222`/`chv225`/`chv226`, die bei der Migration auf `v227` nie bereinigt wurden). Bei mehreren dieser Regeln entscheidet nicht die Position im Stylesheet, sondern die Selektor-Spezifität: Regeln mit zusätzlichem `#content`-Präfix (3 ID-Selektoren) schlagen Regeln ohne dieses Präfix (2 ID-Selektoren), unabhängig davon, welche später im Quelltext steht. Die zuerst ergänzte Korrektur-Regel aus einer früheren Session hatte diese dritte ID nicht und wurde deshalb von einer älteren, engeren `max-width:390px`/`max-width:700px`-Regel mit `#content`-Präfix weiterhin überschrieben — sichtbar nur bei genauer Pixel-Messung, nicht bei oberflächlicher Sichtprüfung.
- **Fix:** Die bestehende Mobile-Korrekturregel für `#group-goal-card.change-challenge-hero-v227` wurde auf dieselbe Selektor-Spezifität wie ihre stärksten Konkurrenten gehoben (`#content` ergänzt) und um `margin-left/-right:-18px` plus `width/max-width:calc(100% + 36px)` (kompensiert exakt das Eltern-Padding, damit die Karte wie bei Pollen bis zum `#content`-Rand reicht, ohne das Padding von `.challenge-layout` selbst anzufassen), `padding:19px 18px 14px` (deckungsgleich mit Pollens Innenabstand) und `border-radius:26px` (deckungsgleich mit Pollens Eckenradius, die bereits vorhandene `--change-hero227-radius`-Variable war korrekt, wurde aber von einer späteren, höher-spezifischen Regel überschrieben) ergänzt.
- **Theme-Color-Meta-Tag:** `<meta name="theme-color">` stand noch auf einem hellen Altwert (`#F8F7F3`), der nicht zum dunklen App-Design passt und auf echten Mobilgeräten (Browser-Statusleiste vor PWA-Installation) fälschlich hell erscheinen würde. Auf `#080c18` korrigiert — passend zum App-Header und zu `manifest.json`s bereits korrektem `theme_color`.
- **Klargestellt (kein Bug):** Die im Vergleichs-Screenshot sichtbare graue Fläche ganz oben ist die Browser-eigene Tab-/Lesezeichenleiste (Chrome-Desktop-UI, systemabhängiges Dunkelmodus-Grau) und keine App-Komponente — Pixel-Abgleich an mehreren x-Positionen zeigte exakt identische Werte zwischen Pollen- und Challenges-Screenshot an dieser Stelle.
- **Verifikationsmethode:** Eine script-freie, realistische Test-Seite (nur Head-CSS + handgebautes Markup-Gerüst, keine `<script>`-Tags, um Race Conditions mit der echten App-Boot-Sequenz zu vermeiden — frühere Versuche mit der vollständigen `index.html` scheiterten daran, dass `app.js`/Firebase-Boot das injizierte Test-Setup überschrieb) wurde über einen lokalen HTTP-Server geladen (notwendig, da `file://` den Zugriff auf `document.styleSheets[].cssRules` blockiert). Für jede der drei Eigenschaften (Breite, Padding, Radius) wurden alle matchenden CSS-Regeln in Lade-Reihenfolge ausgelesen, um den tatsächlichen Cascade-Gewinner zu identifizieren statt ihn zu erraten. Nach dem Fix stimmen `left`, `right`, `width`, `padding-left/-right` und `border-radius` zwischen Pollen- und Challenges-HeroCard bei 390px Viewportbreite exakt überein (Playwright-Messung), zusätzlich Screenshot-Vergleich.
- Geändert: `styles/appShell.css` (eine bestehende Mobile-Regel um fünf Properties erweitert, Selektor-Präfix ergänzt), `index.html` (theme-color-Meta-Tag). Keine Änderung an Dashboard-, Kalender-, Rangliste-, Aufgaben-, Sync-, Firebase-, Push- oder Google-Kalender-Logik.
- `node --check` für beide JS-Dateien grün. Klammer-Bilanz von `appShell.css` unverändert (`1667/1668`, bekannte vorbestehende Differenz aus 0.1.0253).


- **Mobiles Scroll-Problem in Einstellungen behoben: Inhalte aller Settings-Kacheln (Dashboard-Pane, Kalender-Pane, Challenges-Pane, Sync-Pane, App-Pane, GitHub-Pane) waren am unteren Rand nicht erreichbar, weil sie hinter der fixen Bottom-Navigation versteckt blieben — selbst nach vollständigem Scrollen.**
- **Echte Wurzelursache (nicht zu wenig Padding, sondern ein doppelter, widersprüchlicher Scroll-Container):** `#settings-view` hatte aus einer älteren Regel (`body.change-view-settings #settings-view{height:100%;overflow-y:auto;...}`, Zeile ~9562) eine **eigene, zweite Scrollbox** mit fixer Höhe — unabhängig vom äußeren `#content`. Spätere Regeln versuchten, `#settings-view` stattdessen auf `overflow:visible;height:auto` umzustellen (damit `#content` der alleinige Scroller wird, analog zu Dashboard/Kalender/Challenges/Pollen), haben dabei aber nur `overflow` neu gesetzt, nie `height`. Da bei gleicher Spezifität und `!important` pro Eigenschaft einzeln die letzte Regel gewinnt, blieb `height:100%` (von der alten Regel) bestehen, während `overflow` auf `visible` wechselte. Ergebnis: eine `height:100%`-Box mit `overflow:visible` — Inhalt, der über diese feste Höhe hinausragte, war zwar optisch sichtbar (kein hartes Clipping), zählte aber nicht zur `scrollHeight`-Berechnung des äußeren `#content`. Der überlaufende Teil (meist genau der letzte Button/die letzte Kachel) lag dadurch dauerhaft im Bereich der fixen Bottom-Nav, ganz egal wie weit gescrollt wurde.
- **Warum frühere Fixes (v0.1.0223, v0.1.0226) nicht griffen:** Beide haben das `padding-bottom` von `#content` schrittweise erhöht (76px → 150px → 260px → 280px), weil das Symptom wie "zu wenig Puffer am Seitenende" aussah. Tatsächlich hat dieses Padding nie gewirkt, weil `#content` gar nicht der tatsächliche Scroll-Container war, dessen `scrollHeight` durch den verborgenen `height:100%`-Klon (`#settings-view`) gedeckelt blieb — das Padding lag am falschen Element.
- **Fix:** In der letzten, tatsächlich gewinnenden `#settings-view`-Regel (`appShell.css`, `@media(max-width:700px), (hover:none) and (pointer:coarse)`, letzter Block im Selektor-Verlauf) wurde `height:auto!important;min-height:0!important;max-height:none!important` ergänzt, sodass `#settings-view` jetzt konsequent mit seinem Inhalt mitwächst statt eine zweite, abgeschnittene Box zu bilden. Zusätzlich wurde das zuvor schon erhöhte `#content`-Padding (aus dieser Session, an der separat tatsächlich gewinnenden Stelle, Zeile ~10377) von `76px` auf `calc(var(--change-mobile-nav-h,64px) + 36px + safe-area)` belassen — jetzt, wo `#settings-view` korrekt mitwächst, wirkt dieses Padding endlich wie beabsichtigt.
- **Verifikationsmethode:** Da reine Quelltext-Analyse bei über 20 konkurrierenden `#settings-view`/`#content`-Regeln nicht zuverlässig den tatsächlichen Cascade-Gewinner ermitteln konnte, wurde ein lokaler HTTP-Server (statt `file://`, das `document.styleSheets[].cssRules` aus Cross-Origin-Gründen blockiert) gestartet und mit Playwright jede einzelne matchende Regel inklusive Media-Query-Kontext in Lade-Reihenfolge ausgelesen — das deckte den Property-Mix aus mehreren Regeln auf, der bei reiner Lektüre nicht erkennbar war. Vor und nach dem Fix wurde derselbe deterministische Test (40 Zeilen Inhalt + Button, voller Scroll, Abstand Button↔Bottom-Nav gemessen) gefahren: vorher `gap:-47px` (Überlappung), nachher `gap:+53px` (Button vollständig sichtbar). Zusätzlich Screenshot-Vergleich und Bestätigung, dass die Korrektur ausschließlich in einem Mobile/Touch-Media-Query liegt und auf Desktop (`min-width:701px`) nicht greift.
- Geändert: nur `styles/appShell.css` (eine Property-Ergänzung in einer bestehenden Regel) + Versionsnummer in `features/settings/settingsPanel.js`/`features/pollen/pollenView.js`. Keine Änderung an Dashboard-, Kalender-, Challenges-, Pollen-, Sync-, Firebase-, Push- oder Google-Kalender-Logik — reine Layout-Korrektur für die mobile Einstellungsansicht.
- `node --check` für beide JS-Dateien grün. Klammer-Bilanz von `appShell.css` unverändert (`1667/1668`, bekannte vorbestehende Differenz aus 0.1.0253).


- **GitHub-Panel beruhigt: Tabs statt Stapel, eine durchgehende Fläche statt fünf einzelner Kästen, Commit-Zeilen auf eine klare Gewichtsebene reduziert.**
- **Ursache der Unruhe:** Freigabe-Code, ZIP-Dropzone, Status-Zeile, Check-Zusammenfassung und Commit-Verlauf waren fünf eigenständige Boxen (je eigener Rahmen/Hintergrund/Radius) direkt untereinander, ohne Tab-Trennung zwischen "ZIP hochladen" und "Verlauf ansehen" — beide Bereiche waren immer gleichzeitig sichtbar. Zusätzlich hatte jede Commit-Zeile drei unterschiedlich gewichtete Textebenen (grüne fette Version, grauer kleiner Hash, separates Datum in eigener Zeile) plus einen Pillen-Button ("Zurück"), der optisch fast so stark wirkte wie der grüne Haupt-Button "Auf GitHub übertragen".
- **Tabs ergänzt:** `githubTabBar()` (neu) rendert zwei Reiter "Update" und "Verlauf" über `githubUpdateState.panelTab`. Beim Öffnen des Panels ist immer "Update" aktiv (kein zustandsbehaftetes Merken des letzten Tabs, bewusste Entscheidung). Der Freigabe-Code-Eingabe bleibt oberhalb beider Tabs sichtbar, da er für Update **und** Rollback gebraucht wird. Der laufende Update-/Rollback-Fortschritt (`githubActionStatusPanel()`) liegt ebenfalls oberhalb der Tabs, damit er beim Tab-Wechsel nicht verschwindet.
- **Commit-Verlauf vereinfacht:** Version ist jetzt die einzige fette/farbige Information pro Zeile; Hash und Datum stehen zusammen in einer einzigen kleinen grauen Meta-Zeile darunter (vorher: Hash links in eigener Spalte, Datum separat). "Zurück" ist jetzt ein dezenter Text-Link (`.change-github-rollback-link`) statt eines umrahmten Pillen-Buttons — bewusst zweitrangig gegenüber dem grünen Upload-Button.
- **Pagination statt Vollliste:** Verlauf zeigt standardmäßig 5 Einträge (`githubCommitHistoryVisible`), darunter ein dezenter "+X weitere anzeigen"-Button, der die Sichtbarkeit um 5 erhöht (kein erneuter Server-Request, reines Client-seitiges Slicing der bereits geladenen Liste).
- **Leerer-Zustand im Verlauf-Tab:** Ist kein Freigabe-Code gesetzt, zeigt der Verlauf-Tab jetzt einen Hinweistext ("Freigabe-Code eintragen, um den Verlauf zu laden.") statt einer leeren Fläche.
- **Entfernt (totes/dupliziertes CSS):** alter `.change-github-history-head`-Block (Titel+Lade-Button als eigene Kopfzeile — ersetzt durch `.change-github-history-toolbar`, da der Tab-Titel jetzt "Verlauf" selbst übernimmt), `.change-github-commit-sha`/`.change-github-commit-msg`/`.change-github-commit-version` (ungenutzte Klassen, im neuen Markup nicht mehr erzeugt), eine zweite, später in der Cascade stehende Dopplung von `.change-github-commit-version-main` aus dem v0.1.0250-Block, die immer Grün gesetzt hätte und damit die neue is-current-Unterscheidung (aktuell=grün, älter=weiß) wieder aufgehoben hätte.
- **Verifikation:** Mit Playwright wurden die echten Render-Funktionen (`githubUpdateBody()`, `githubCommitHistoryPanel()`, `githubTabBar()`) aus einer Testkopie der Datei exportiert und in einer isolierten Seite mit echtem CSS-Ladepfad gerendert (inkl. `[data-theme="dark"]`, da Token-Variablen sonst auf Light-Mode-Werte auflösen). Geprüfte Zustände: Update-Tab leer, Update-Tab mit ausgewählter Datei, Verlauf-Tab mit 9 Commits (5 sichtbar + "+4 weitere anzeigen"), Verlauf-Tab vollständig aufgeklappt, Verlauf-Tab ohne Freigabe-Code, Verlauf-Tab mit nur einem Commit (kein Rollback-Ziel vorhanden).
- Geändert: `features/settings/settingsPanel.js` (Tab-State, `githubTabBar()`, `githubUpdateBody()` umgebaut, `githubCommitHistoryPanel()` vereinfacht, Event-Listener für Tabs/"Mehr laden" ergänzt, Rollback-Button-Selector an neue Klasse angepasst), `features/settings/settingsPanel.css` (Tab-Leiste, Flächen-Verschmelzung), `styles/appShell.css` (Commit-Verlauf-Block neu, alte Dopplungen entfernt). Keine Änderung an Sync-, Firebase-, Push-, Google-Kalender- oder Worker-Logik — nur Darstellung des bestehenden GitHub-Update-Mechanismus.
- `node --check` für beide geänderten JS-Dateien grün. Klammer-Bilanz von `appShell.css` und `settingsPanel.css` geprüft: `appShell.css` weiterhin mit der bekannten, vorbestehenden Differenz aus 0.1.0253 (unverändert, nicht Teil dieser Änderung), `settingsPanel.css` ausgeglichen.


- **Challenges-HeroCard und Pollen-HeroCard sind jetzt browserverifiziert stilgleich (echte Wurzelursache behoben, nicht nur erneuter Feinschliff).**
- **Wurzelursache:** Die `:root{--change-hero227-*}`-Basis in `appShell.css` (gedacht als "gemeinsame Pollen-Basis" für Dashboard/Kalender/Challenges/Einstellungen) hatte eigene, **erratene** Werte (`padding:28px 30px 26px`, `radius:28px`, `min-height:236px`, `grid-template-columns:minmax(0,1fr) 188px 232px`, `gap:16px`), die nie gegen den tatsächlich im Browser resolvierten Pollen-Wert geprüft wurden. Pollen selbst hat in `pollenView.css` **fünf konkurrierende, nicht per Media-Query getrennte** `.pollen-neo-hero`-Blöcke (Zeilen 23/156/442/654/915), die sich gegenseitig überschreiben — der letzte Block gewinnt und ergibt einen anderen Endwert als jede einzelne der fünf Teildefinitionen für sich. Frühere Session-Fixes (0.1.0253–0.1.0257) haben jeweils nur einzelne Werte händisch verglichen und angepasst, ohne den echten Cascade-Endwert zu messen — dadurch drifteten beide Karten nach jeder Pollen-Änderung wieder auseinander.
- **Methode dieses Fixes:** Mit Playwright wurde eine isolierte Testseite mit identischer CSS-Ladereihenfolge wie `index.html` gebaut und `getComputedStyle()` für beide Hero-Cards ausgelesen (nicht aus dem Quelltext geraten, sondern der tatsächliche Browser-Cascade-Endwert). Erst danach wurden die `--change-hero227-*`-Variablen und die direkten `chv227-*`-Werte in `appShell.css` exakt auf die gemessenen Pollen-Endwerte gesetzt und der Vergleich erneut verifiziert.
- **Korrigierte Werte (Challenges → jetzt identisch zu Pollen):** `--change-hero227-radius` 28→26px, `--change-hero227-pad-y` 28→24px, `--change-hero227-pad-x` 30→26px, `--change-hero227-min-h` 236→238px, Card-`padding-bottom` 26→22px, `.chv227-hero` `grid-template-columns` von festen `188px/232px`-Spalten auf Pollens `minmax(240px,1.08fr) minmax(132px,.58fr) minmax(196px,.86fr)`, `gap` 16→14px, `.chv227-overline` (Label) 12px/900/0.08em/margin-bottom 14px → 11px/780/0.07em/margin 0, `.chv227-title` 40px/950/-1.35px/margin-top 0 → 45px/850/-1.45px/margin-top 13px, `.chv227-illustration` feste 150px/Opacity .62 → responsive max-width 168px/Opacity .66, Stat-Label/-Wert `line-height` 1.15 (explizit) → 1.5 (entspricht dem bei Pollen geerbten, nicht explizit gesetzten Wert).
- Zusätzlich entfernt: ein dekoratives `::after`-Trennstrich-Pseudoelement auf der gemeinsamen Hero-Basis (`right:calc(232px + 88px)`), das es bei Pollen nie gab und das nach Umstellung auf `minmax()`-Spalten ohnehin an der falschen Position gestanden hätte.
- Challenges-Titel bleibt bewusst weiß (`#fff`) statt level-farbig wie bei Pollen (grün/amber/rot) — Challenges hat kein Ampel-System, das ist ein inhaltlicher, kein stilistischer Unterschied. Ebenso bleibt die Akzentfarbe (Grün bei Challenges vs. Pollen-Level-Farbe) unverändert; das war nie Teil der Beanstandung.
- Geändert wurde ausschließlich `styles/appShell.css` (nur die `chv227`/gemeinsame-Hero-Basis-Regeln) sowie die Versionsnummer in `features/settings/settingsPanel.js` und `features/pollen/pollenView.js`. **Pollen selbst wurde nicht verändert** (bewusst — Pollen ist die definierte Referenz; ein Eingriff in die fünf kollidierenden `.pollen-neo-hero`-Blöcke ist ein separates Aufräum-Vorhaben und nicht Teil dieser Änderung, da sonst zwei Systeme gleichzeitig angefasst würden).
- Kein Eingriff in Dashboard-, Kalender-, Einstellungs-, Sync-, Firebase-, Push- oder Google-Kalender-Logik. Die Dashboard/Kalender/Einstellungen-Variante der gemeinsamen Hero-Basis (`.dashp-main-hero-pollen`, `.cal-premium-hero-wide`, `.change-settings-profile-card`) profitiert von denselben Variablen-Korrekturen, wurde aber nicht einzeln nachgemessen — bei Abweichungen dort ggf. Folgeschritt.
- `node --check` für beide geänderten JS-Dateien grün. Klammer-Bilanz von `appShell.css` unverändert gegenüber der Vorversion (vorbestehende Differenz aus 0.1.0253, siehe dortiger Eintrag — nicht Teil dieser Änderung).


- **GitHub-Update-Erkennung auf echten Status statt Raten umgestellt.** Bisher wurde "fertig" nur daran erkannt, dass die Live-Datei `pollenView.js` per Polling die Zielversion zeigte — das ist abhängig vom CDN-Cache und kann falsch-negativ (noch nicht erkannt, obwohl live) oder falsch-positiv (Branch-Version weit, aber Pages-Build noch nicht durch) sein.
- Worker (`scripts/changeGithubUpdateWorker.js`): neuer Befehl `getPagesDeploymentStatus()` fragt `GET /repos/{repo}/pages/builds/latest` ab (echter GitHub Pages Build-Status: `built`/`building`/`errored`/`queued`) und vergleicht den Build-Commit mit dem Ziel-Commit. `/status` liefert dieses Feld jetzt als `pages` mit aus. Fallback: ist die Pages-API nicht erreichbar (z. B. fehlende Berechtigung der GitHub App), greift weiterhin die alte Live-Datei-Heuristik — keine Regression falls Pages-Zugriff fehlt.
- Frontend (`features/settings/settingsPanel.js`): neue zentrale Funktion `computeGithubPhase()` ersetzt die bisherige verschachtelte if-Kette aus drei Flags (`actionStatus`, `targetCommitted`, `liveReady`). Eine einzige State-Machine mit den Phasen `queued → workflow_running → pages_building → live` (oder `error`) ist jetzt die einzige Quelle der Wahrheit für Label/Ton/Fortschritt.
- **Rollback ist jetzt symmetrisch zum Update.** Bisher hatte der Rollback-Button eine eigene, isolierte Mini-Statusbox (`githubRollbackState`) und löste das Haupt-Status-Panel nicht aus — man wusste nicht, wann die Rückstufung wirklich live war. Jetzt durchläuft ein Rollback denselben Status-Flow wie ein Update (`direction:'rollback'`), inkl. Polling, Fortschrittsbalken und passender Beschriftung ("Rückstufung wird angewendet…" statt "Update wird angewendet…"). Der Worker liefert beim Rollback zusätzlich `targetVersion` (aus dem Ziel-Commit gelesen), damit das Frontend weiß, worauf es wartet.
- UI: neuer ruhiger 4-Punkte-Fortschrittsbalken (`.change-github-progress-track`) unter dem Statustext zeigt die aktuelle Phase optisch an (erledigt = grün/türkis gefüllt, aktiv = sanft pulsierend, offen = grau) — ersetzt das reine Punkt+Text-Warten durch sichtbaren Fortschritt. Kein neuer Button, keine neue Karte; bestehende Struktur/Farben (`--acc`, `--grn`, `--red`) wiederverwendet.
- Nur GitHub-Update-Mechanik (Worker + Settings-Panel-Logik/CSS) geändert. Kalender, Dashboard, Challenges, Login, Firebase, Datenbank-Sync, Google Kalender, Push unverändert.
- Hinweis: Die GitHub App benötigt für `getPagesDeploymentStatus()` die Berechtigung "Pages: Read-only". Ist sie nicht gesetzt, meldet der Worker das im `pages.error`-Feld und das Frontend fällt automatisch auf die alte Live-Datei-Heuristik zurück — keine Funktionseinbuße, nur keine verbesserte Erkennung.

- **ECHTE Wurzelursache der schmalen/abgeschnittenen Stats gefunden und behoben.** Nicht der Hero war das Problem, sondern die **Card selbst**: Der Shared-Mobile-Block (`@media max-width:700px`) setzt `#group-goal-card.change-challenge-hero-v227` auf `grid-template-columns:minmax(0,1fr) 82px` — also 2 Spalten mit einer **leeren 82px-Spalte 2** (Altlast aus der Zeit, als die Illustration ein direktes Card-Kind war). Der gesamte Hero saß dadurch in Spalte 1 (~65% Breite) → Stats schmal, „Abzeichen/0 von 37" abgeschnitten, Titel lief optisch in die leere Spalte über.
- Fix: Card für chv227 mobil auf `grid-template-columns:1fr` (eine Spalte) gezwungen (Regel liegt nach dem Shared-Block, gewinnt). Hero + Stats nutzen jetzt die **volle Card-Breite**.
- Zusammen mit dem Block-Layout (0259) + absoluter Illustration (0258) ist das mobile Challenges-Hero jetzt strukturell wie Pollen.
- Nur Challenges geändert.

## Version 0.1.0259
- **Challenges-Hero Mobil: Layout komplett auf robustes Block-Layout umgebaut** (kein `grid-template-areas` mehr). Das Grid-Area-System ("main visual"/"stats stats") hat die Stat-Leiste nur auf Spalte 1 gerendert (halbe Breite) → „Abzeichen / 0 von 37" abgeschnitten.
- Neu: `.chv227-hero{display:block}`, `.chv227-main` volle Breite mit `padding-right` für die Trophäe, `.chv227-illustration{position:absolute;top/right}` (aus dem Fluss → verzerrt die Breite nicht mehr), `.chv227-stats{display:grid;width:100%;repeat(3,1fr)}` = garantiert volle Breite, kein Abschneiden.
- Stat-Schrift mobil lesbarer (Label 11px, Wert 13px) da jetzt Platz da ist. Icon 18px.
- Da die Illustration jetzt absolut/aus dem Fluss ist, sollte sich damit auch der zu große Mobil-Außenrand erledigen (der überlaufende SVG hat die Breite verzerrt).
- Nur Challenges geändert.

## Version 0.1.0258
- **Challenges-Hero: echter Layout-Bug behoben.** Das CSS steuerte `.chv227-visual` / `.chv227-visual span`, im Markup heißt die Trophäe aber `.chv227-illustration` (ein SVG) — die Regeln griffen ins Leere. Dadurch war das SVG ungesteuert (Default ~300px), hat das Grid gesprengt (überlappende Trophäe, Stat-Leiste nicht über volle Breite → „Abzeichen/0 von 37" abgeschnitten).
- Fix: CSS auf `.chv227-illustration` umgestellt mit fester Größe (Desktop 150px, Mobil 72px) + Positionierung. Mobil zusätzlich `.chv227-stats` mit `grid-column:1/-1; width:100%` auf volle Breite gezwungen → kein Abschneiden mehr. Stat-Icon mobil 16→18px (wie Pollen).
- Dürfte auch die zu großen Mobil-Außenränder mit erledigen (der überlaufende SVG hat die Breite verzerrt).
- Nur Challenges geändert.

## Version 0.1.0257
- **Challenges-Hero Overline-Farbe an Pollen angeglichen.** `.chv227-overline` ("DIESE WOCHE") war `#4ade80` (kräftiges Grün); Pollen `.pollen-neo-label` ("DEINE POLLEN HEUTE") ist `rgba(244,247,244,.72)` (gedämpftes Grau). → auf `var(--change-hero227-muted)` (= rgba(244,247,244,.72)) gesetzt, jetzt identisch.
- Enthält außerdem den Mobil-Rand-Fix aus 0.1.0256 (`.challenge-layout` 26→18px), falls 0256 noch nicht live war.
- Offen/zur Klärung: Pollen-Subline ist heller (#e7ece7, 17px/900) als chv227-Sub "Kalenderwoche 25" (rgba(244,247,244,.72), 16px/800); Pollen-Titel ist level-farbig (grün/amber/rot) statt weiß. Diese sind aber inhaltlich unterschiedlich — erst Rückmeldung, dann ggf. angleichen.

## Version 0.1.0256
- **Challenges-Hero Mobil: Seitenränder an Pollen angeglichen.** `.challenge-layout` hatte im `@media(max-width:700px)` ein horizontales Padding von 26px; Pollen nutzt 18px (#pollen-view). → auf `10px 18px …` reduziert, damit die Card mobil gleich breit ist wie bei Pollen.
- Nur Challenges/`.challenge-layout` geändert; Desktop unberührt (Regel liegt in der Mobile-Media). Card-Innenpadding (chv227 mobil 18px horiz vs. Pollen ~14px) bewusst noch nicht angefasst — erst Bestätigung, dann ggf. Feinschliff.

## Version 0.1.0255
- **Challenges-Hero-Statzeilen exakt an Pollen angeglichen (Feinschliff, nur Challenges).** Farben/Striche waren bereits gleich (`--change-hero227-line`=rgba(255,255,255,.08), `--change-hero227-muted`=rgba(244,247,244,.72)); abweichend waren nur Größen/Gewichte und das Icon.
- Desktop (`appShell.css`, chv227-Block): Icon 24→22px, Label 13/800→12/720, Wert 17/900→15/820, `padding-left` 20→16px, Spalte 30→28px, Gap 0 12→0 10 — identisch zu den finalen Pollen-Werten.
- Icon-Glyph: Emoji `🏅` → monochrome Marke `★` (in `core/misc.js`), damit es wie Pollens CSS-Marken wirkt. Abzeichen-Icon erhält Gold-Akzent (#fbbf24, wie Pollens gelbe Marke / der Pokal), `•` und `＋` bleiben grün.
- Mobil (Block A): Icon-Spalte 20→18px, Gap 6→5px, Icon 18→16px — behebt das Abschneiden der Werte („0 von 37").
- Keine anderen Systeme berührt (Dashboard/Kalender/Einstellungen/Pollen/Firebase/Sync/Push unverändert).

## Version 0.1.0254
- **Vollständiges Repo-ZIP zur Wiederherstellung.** Der vorige 0.1.0253-Deploy lief mit einem ZIP, das nur die geänderten Dateien enthielt — der Worker löscht aber den kompletten Root (außer `.git`/`.github`/`scripts`/`updates`), wodurch `app.js`, `index.html`, `change.css`, `core/` usw. verloren gingen.
- Dieses ZIP enthält den **kompletten App-Baum** + den Challenges-Hero-Fix aus 0.1.0253. Versionssprung auf 0.1.0254 nötig, weil der unvollständige 0.1.0253-Deploy bereits live war (Worker verlangt höhere Zielversion).
- Inhaltlich identisch zum geplanten 0.1.0253-Stand; keine zusätzlichen Code-Änderungen.

## Version 0.1.0253
- **KRITISCHE DEPLOY-REGEL:** Der GitHub-Worker (`scripts/applyZipUpdate.mjs`, `removeOldAppFiles()`) **löscht beim Deploy den kompletten Repo-Root** außer `.git`, `.github`, `scripts`, `updates` und ersetzt ihn durch den ZIP-Inhalt. Ein ZIP mit nur geänderten Dateien löscht daher den Rest der App. → **Update-ZIPs müssen IMMER den vollständigen App-Baum enthalten** (app.js, index.html, change.css, core/, features/, styles/, firebase/, icons/, public/, manifest.json, CLAUDE.md, CHANGELOG.md …), nicht nur die geänderten Dateien.
- **Challenges-HeroCard auf Pollen-Raster vereinheitlicht (nur Challenges geändert).**
- Root-Ursache: In `styles/appShell.css` war die `chv227`-Statszeile **dreifach** definiert — Desktop-Zeilen (ab 12938, korrekt), Mobil-3er (ab 13162, korrekt) und ein konkurrierender „Box-Block" (ab 13300). Letzterer rendert die Stats als gerundete Boxen mit Hintergrund und gewann (spätere Regel + gleiche Spezifität).
- Zusätzlich verstärkt durch ein vorbestehendes verirrtes `}` bei Zeile ~13295, das `@media(max-width:700px)` zu früh schließt → der Box-Block liegt dadurch **global** (greift auch auf Desktop). Deshalb erschienen die Challenges-Stats auf Desktop UND Mobil als Boxen statt als Pollen-Zeilen.
- Fix: Alle `chv227`-Selektoren aus dem Box-Block entfernt (Container-, Stat-, Icon-, Label-, Wert-Regel + die chv227-eigene Button-Regel). Dadurch greifen für Challenges wieder ausschließlich die korrekten Definitionen: Desktop = Trennlinien-Zeilen, Mobil = 3 KPIs nebeneinander — identisch zu Kalender/Einstellungen und im Pollen-Raster.
- Keine Markup-Änderung in `core/misc.js`; Struktur passte bereits. Klammer-Bilanz von `appShell.css` unverändert (vorher wie nachher -1 durch das vorbestehende verirrte `}`).
- **Offen für Folgeschritte (nicht in dieser Version):** Das verirrte `}` bei ~13295 leakt den Box-Block weiterhin global für Dashboard/Kalender/Einstellungen — wird in den jeweiligen Hero-Schritten sauber geschlossen.
- Keine Änderung an Dashboard-, Kalender-, Einstellungen-, Pollen-Rendering, Firebase, Sync, Push oder Google Kalender.


- 'Erneut versuchen' Button entfernt. ZIP entfernen setzt jetzt den kompletten Action-State zurueck.
- ZIP Clear ✕ als kleiner Kreis-Button integriert oben rechts in der Dropzone.
- Alle grauen Flaechen (--s2/--b1) in GitHub-Kachel auf dunkle App-Farben geaendert: Dropzone, Action-Panel, Steps, Status, Freigabe-Code.
- Action-Steps mit Puls-Animation fuer laufende Schritte.

## Version 0.1.0251
- Commit-Verlauf: Nur noch ein Eintrag pro Version (Deduplizierung). Kein Doppel-Commit mehr (ZIP-Upload + Action-Commit).
- Worker /commits: Laedt 20 Commits, filtert auf 'ZIP Update bereitstellen', dedupliziert nach Version.
- Frontend: Zusaetzliche Deduplizierung nach Version als Fallback.

## Version 0.1.0250-fix
- APP_VERSION in settingsPanel.js und pollenView.js auf 0.1.0250 korrigiert. Die Versionsnummer war nach dem CSS-Restore auf 0.1.0246 steckengeblieben.

## Version 0.1.0250
- Commit-Verlauf: zeigt nur ZIP-Update Commits, Haupttext ist die Versionsnummer in Gruen, nur Datum daneben.
- ZIP entfernen Button: roter X-Button unter der Dropzone wenn ZIP gewaehlt.
- Rollback-Dialog: schoen gestalteter eigener Modal statt Browser-confirm.
- Rollback auch waehrend Upload-Prozess moeglich.
- Version-Card aus App & Sicherheit entfernt (steht in Herocard).
- GitHub Farben: Badges, Status-Texte in korrekten App-Farben.

## Version 0.1.0249
- GitHub Rollback: Commit-Verlauf der letzten 10 Commits mit SHA, Nachricht, Datum und App-Version. Jeder Commit hat einen 'Zurueck'-Button. Bestaetigung per confirm() vor dem Rollback.
- Cloudflare Worker: neue Endpoints /commits (GET) und /rollback (POST) in changeGithubUpdateWorker.js.
- Rollback setzt Branch per force-push auf den Ziel-Commit. GitHub Action startet automatisch.
- CSS fuer Commit-Verlauf in appShell.css ergaenzt.

## Version 0.1.0248
- GitHub Upload: Button-Bedingung verschaerft: ausgeblendet wenn actionStartedAt, actionMessage ODER uploadCommitSha gesetzt. Damit erscheint der Button nie waehrend eines laufenden Prozesses, unabhaengig von actionConclusion-State.
- Nach fehlgeschlagener Action erscheint 'Erneut versuchen' statt 'Auf GitHub uebertragen'.

## Version 0.1.0247
- CSS-Dateien auf Original-Stand zurueckgesetzt. HeroCard-Block als Anhang.
- Dashboard Event-Zeit: flex-direction:column (uebereinander). Kalender date-ring: display:none.
- dashp-quick-grid deaktiviert. Settings change-feature-note ausgeblendet.
- Keine Aenderung an Logik, Firebase, Sync oder Push.

## Version 0.1.0246
- Die sichtbare App-Version wurde auf `0.1.0246` erhöht.
- **Dashboard weiße Kacheln behoben**: Im injizierten CSS von dashboard-logic.js überschrieb `.dashp-hero{grid-template-columns:1fr!important}` unser 3-Spalten-Grid — entfernt. Außerdem `.dashp-quick-grid` (altes 6-Kacheln-Layout) entfernt das die weißen Mini-Cards erzeugte.
- **Kalender-Uhr riesig behoben**: `calendarPanels.css` setzte `.cal-premium-hero{padding:28px 260px 24px 28px}` — der 260px rechte Padding ließ die Uhr riesig erscheinen. Korrigiert auf `28px`.
- **Challenges-Pokal-Layout**: Das Layout-Problem (`chv227-hero` fehlte in challenges-mobile.css) wird durch v0240-Block in appShell.css korrekt gelöst.
- Keine Änderung an GitHub-Upload, Pollenberechnung, Firebase oder Push.

## Version 0.1.0245
- Die sichtbare App-Version wurde auf `0.1.0245` erhöht.
- GitHub Upload: "Auf GitHub übertragen" wird während des aktiven Upload/Action-Prozesses ausgeblendet (nicht nur disabled). Der Button erscheint erst wieder wenn `actionConclusion` gesetzt ist (Erfolg oder Fehler).
- GitHub Upload: "Auf GitHub übertragen" ist auch disabled wenn `updateReady` bereits true — verhindert Doppel-Uploads.
- "App vollständig neu laden": Guard prüft `state.liveReady && state.updateReady` bevor der Hard-Reload ausgeführt wird. Bei nicht-bereitem Update erscheint ein Toast.
- Keine Änderung an Upload-Logik, Firebase, Kalender oder Pollen.

## Version 0.1.0244
- Die sichtbare App-Version wurde auf `0.1.0244` erhöht.
- **Erklärende Subtexte entfernt**: Alle 18 `change-feature-note` Divs aus settingsPanel.js entfernt — nur selbsterklärende Toggle-Titel bleiben.
- **Dashboard Event-Zeilen**: `dashp-event-time` hat jetzt `flex-direction:column` — Zeitangabe und Datum stehen übereinander statt zusammengeschrieben.
- **Kalender-Hero Desktop**: `padding-left:0` auf `.cal-premium-hero-main` — nicht mehr zu weit links.
- **Settings Feature-Cards**: einheitlicher Stil wie GitHub-Karte (`border-radius:22px`, gleiche Border, gleicher Hintergrund).
- **Settings Felder**: `finput`, `select` mit `border-radius:14px`, transparentem Hintergrund, Focus-Ring.
- CSS-Bereinigung: `calendarPanels.css` 936→403, `challenges-mobile.css` 3330→816, `appShell.css` 13842→8442 Zeilen.

## Version 0.1.0243
- Die sichtbare App-Version wurde auf `0.1.0243` erhöht.
- **Vollständige Code-Bereinigung** nach Analyse aller CSS-Dateien auf konkurrierende Definitionen.
- `calendarPanels.css`: 936 → 403 Zeilen (-57%). Alle 16 Hero-Patch-Blöcke (v0.1.0053–v0.1.0207) entfernt. `cal-premium-hero-wide` war 29× definiert (grid-template-columns allein 24×). Hero-Layout kommt jetzt ausschließlich aus appShell.css v0240.
- `challenges-mobile.css`: 3330 → 2963 Zeilen (-11%). `challenge-week-day` war 47× definiert (color 14×, background 8×). Alle entfernt — appShell v0240 ist alleinige Quelle.
- Gesamt über alle CSS-Dateien: 25.905 → 22.379 Zeilen (-3.526 Zeilen, -14%).
- `settingsPanel.css` und `pollenView.css` sind autark und konfliktfrei — keine Änderungen nötig.
- Keine Änderung an Logik, Pollenberechnung, Kalender-Events, Firebase, Sync oder Push.

## Version 0.1.0242
- Die sichtbare App-Version wurde auf `0.1.0242` erhöht.
- **Code-Bereinigung**: 2.972 redundante Zeilen entfernt die sich gegenseitig überschrieben haben.
- `styles/appShell.css`: 13.842 → 11.216 Zeilen (-19%). 2.829 Zeilen der Hero-Patch-Blöcke v0.1.0211–v0.1.0239 entfernt, da alle durch den finalen v0.1.0240-Block mit höherer Spezifität überschrieben wurden. Nicht-Hero Regeln (challenge-goal-*, settings-page-title) wurden bewahrt.
- `features/dashboard/dashboard-logic.js`: Injiziertes CSS 187 → 74 Zeilen (-60%). Alle Hero-Definitionen entfernt die mit appShell.css v0240 konkurrierten.
- `features/challenges/challenges-mobile.css`: 3.330 → 3.096 Zeilen (-7%). Alle 11× leader-row und 40× leaderboard-list Definitionen entfernt die mit appShell.css v0240 konkurrierten.
- Ergebnis: Keine konkurrierenden CSS-Regeln mehr für HeroCards, Rangliste und Stats-Zeilen.
- Keine Änderung an Logik, Pollenberechnung, Firebase, Sync oder Push.

## Version 0.1.0241
- Die sichtbare App-Version wurde auf `0.1.0241` erhöht.
- GitHub-Sektion in Einstellungen: Freigabe-Code-Karte, Upload-Panel und Dropzone im einheitlichen App-Stil (gleiche Hintergrundfarbe, gleicher Border-Radius wie Einstellungs-Karten).
- Freigabe-Code: transparenter Input auf dunklem Hintergrund, FREIGABE-CODE als uppercase Label.
- Dropzone: dezent grüner gestrichelter Rahmen, hover-Effekt.
- "Auf GitHub übertragen" Button: voller grüner Primary-Button mit border-radius:999px.
- Settings: `padding-bottom` für Tab-Bar gesetzt damit bis zum Ende gescrollt werden kann.
- Keine Änderung an HeroCards, Pollenberechnung, Kalender, Firebase, Sync oder Push.

## Version 0.1.0240
- Die sichtbare App-Version wurde auf `0.1.0240` erhöht.
- **HeroCards komplett neu strukturiert**: Alle alten Hero-Blöcke (v0.1.0234–v0.1.0239) aus appShell.css entfernt. Ersetzt durch einen einzigen sauberen Block ohne Konflikte.
- Root-Ursache des Abschneidens bei Challenges behoben: Mehrfach-Definitionen von `.chv227-hero` erzeugten Konflikte. Jetzt ein Block, klare Reihenfolge.
- Desktop: `grid-template-columns:minmax(0,1fr) 178px 232px`, Illustration `align-self:end`.
- Mobil: `flex-direction:column; gap:20px`, Illustration `position:absolute; top:20px; right:20px; 108px`, Haupttext `padding-right:120px`, Titel 52px.
- Stats mobil: `34px minmax(0,1fr)`, `min-height:58px`, `border-radius:18px`, `background:rgba(255,255,255,.045)`.
- Injiziertes CSS in dashboard-logic.js ebenfalls bereinigt und auf identische Werte gebracht.

## Version 0.1.0239
- Die sichtbare App-Version wurde auf `0.1.0239` erhöht.
- HeroCards mobil: Challenges, Kalender, Einstellungen auf `display:flex; flex-direction:column; gap:20px` korrigiert — identisch zu Pollen.
- Challenges mobil: `.chv227-hero` jetzt explizit flex-column. Illustration absolut positioniert (top:18px, right:18px). Titel 52px. Stats als vertikale Karten mit `34px 1fr`, `min-height:58px`, `border-radius:18px`.
- Kalender mobil: Hero-Haupt-Bereich mit `padding-right:110px` für Illustration. Stats-Karten identisch zu Pollen-Mobil.
- Einstellungen mobil: gleicher Aufbau.
- Symptom-Icons Nase und Niesen nach Referenzbildern überarbeitet.
- Keine Änderung an Pollenberechnung, Firebase, Sync oder Push.

## Version 0.1.0238
- Die sichtbare App-Version wurde auf `0.1.0238` erhöht.
- Symptom-Icon Nase: Seitenansicht nach Referenzbild — schlanke Linie von oben, Nasenflügel unten als geschwungener Bogen.
- Symptom-Icon Niesen: Profil-Gesicht nach rechts mit Stirn/Nase/Kinn-Linie, drei horizontale Luftstrahlen nach rechts mit Punkten am Ende.
- Keine anderen Änderungen.

## Version 0.1.0237
- Die sichtbare App-Version wurde auf `0.1.0237` erhöht.
- Challenges Wochenkacheln: Punkte-Badge mit grünem Hintergrund und Border statt reiner Text. Kacheln sauberer (border-radius:16px, einheitliche Abstände).
- Rangliste: `display:flex; flex-direction:column; gap:10px` verhindert Überlappen. Jede `.leader-row` hat `overflow:hidden`, feste Abstände, kein Höhenproblem mehr. Mobil volle Breite mit `box-sizing:border-box`.
- Symptom-Icons: Niesen = Person von rechts niest nach links, Nase = Frontansicht mit Nasenflügeln.
- Keine Änderung an HeroCards, Pollenberechnung, Kalender, Firebase, Sync oder Push.

## Version 0.1.0236
- Die sichtbare App-Version wurde auf `0.1.0236` erhöht.
- **HeroCard-Root-Ursache behoben**: In `dashboard-logic.js` wurden drei alte CSS-Regeln entfernt die unsere korrekten Werte überschrieben: `.dashp-main-hero-pollen` mit 2-spaltigem Grid, mobiles `display:block`, und `.dashp-main-hero{min-height:174px}`. Außerdem `.dashp-eyebrow` Farbe von `#4ade80` auf `rgba(244,247,244,.72)` korrigiert.
- Symptom-Icon Niesen: Person von rechts, Niesstrahl fächert nach links mit 3 Tropfen.
- Symptom-Icon Nase: Frontansicht mit Nasenbrücke, zwei Nasenflügeln als Ellipsen, Tropfen unten.
- Keine Änderung an Pollenberechnung, Kalender, Challenges, Firebase, Sync oder Push.

## Version 0.1.0235
- Die sichtbare App-Version wurde auf `0.1.0235` erhöht.
- Symptom-Icon Nase: Seitenansicht der Nase mit Tropfen — deutlich erkennbarer als Frontalansicht.
- Symptom-Icon Niesen: Person die nach rechts niest — Kopf links, geschwungener Niesstrahl mit drei Tropfen rechts.
- ZIP neu gebaut nach GitHub-Action Fehler bei v0.1.0234.
- Keine Änderung an HeroCards, Pollenberechnung, Kalender, Firebase, Sync oder Push.

## Version 0.1.0234
- Die sichtbare App-Version wurde auf `0.1.0234` erhöht.
- HeroCards komplett neu kalibriert: Alle Werte direkt aus `pollenView.css` übernommen — kein Schätzen, kein Annähern.
- Desktop: `font-size:49px` (Titel), `font-size:18px` (Subline), Illustration `align-self:end` (unten ausgerichtet wie Pollen), `padding:28px 30px 26px`, `border:rgba(93,183,92,.14)`, `background:rgba(18,36,27,.78)`.
- Mobil: `display:flex; flex-direction:column; gap:20px` (wie Pollen, kein Grid!), Titel `52px`, Subline `19px`, Stats als Karten mit `grid-template-columns:34px 1fr`, `gap:0 10px`, `padding:12px 14px`, `border-radius:18px`.
- `features/dashboard/dashboard-logic.js`: injiziertes CSS auf exakt dieselben Werte aktualisiert.
- Keine Änderung an Logik, Pollenberechnung, Kalender, Challenges, Firebase, Sync oder Push.

## Version 0.1.0233
- Die sichtbare App-Version wurde auf `0.1.0233` erhöht.
- Symptom-Icons (Niesen, Augen, Nase, Atmung) komplett neu: klare, sofort erkennbare SVGs auf 22-25px. Niesen = Gesicht mit drei Tropfen-Strahlen, Augen = einzelnes großes Auge mit Tränenstrich, Nase = Nasensilhouette mit Tropfen, Atmung = zwei Lungenflügel.
- Pollen-Hero-Illustration: zeigt jetzt den **ausgewählten** Pollentyp (Nutzerauswahl hat Priorität). Erst wenn keine Auswahl vorhanden, wird der höchste Messwert verwendet. Damit wechselt die Illustration korrekt wenn Olive, Erle, Birke etc. ausgewählt wird.
- Umsetzung in `features/weather/pollenSymptoms.js` und `features/pollen/pollenView.js`.
- Keine Änderung an Pollenberechnung, HeroCards, Kalender, Challenges, Firebase, Sync oder Push.

## Version 0.1.0232
- Injiziertes CSS in `dashboard-logic.js` korrigiert: konkurrierender Gradient und horizontales Mobil-Grid entfernt.
- `appShell.css`: Einziger finaler v0232-Block überschreibt alle alten HeroCard-Konflikte.
- Desktop: einheitlicher Pollen-Gradient, `grid-template-columns: 1fr 190px 232px`, `min-height:272px`.
- Mobil: Stats als vertikale Karten wie Pollen-Mobil (`border-radius:18px`), nicht horizontal.
- CHANGELOG.md und CLAUDE.md korrekt gepflegt.

## Version 0.1.0231
- Allergieprofil-Icons überarbeitet: klare erkennbare Linien im App-Stil, wenige Striche.
- Kein Overload mehr auf kleiner Fläche — botanisch treffend und zum Design passend.

## Version 0.1.0230
- Pollen-Hero-Illustration dynamisch je nach höchstem Pollentyp (6 verschiedene botanische SVGs).
- Allergieprofil nach Belastungswert absteigend sortiert.
- Profil-Icons realistischer (Kätzchen, Früchte, Blütenköpfe) mit levelabhängiger Farbe.
- Umsetzung in `features/pollen/pollenView.js` und `features/pollen/pollenView.css`.

## Version 0.1.0229
- Alle HeroCards pixelgenau auf Pollen-Referenz gebracht: Hintergrund-Gradient, Border, Shadow, Grid, Illustration-Größe, Stats-Zeilen-Layout identisch.
- Desktop 3-spaltig: `minmax(0,1fr) 190px 232px`, `min-height:272px`.
- Mobil: `"main art" / "stats stats"`, Stats als abgerundete Karten wie Pollen-Mobil.
- Kalender: Date-Ring ausgeblendet, SVG-Illustration aktiv.
- Challenges: Stats-Labels nie abgeschnitten.
- Umsetzung ausschließlich in `styles/appShell.css` und Versionsanzeige.

## Version 0.1.0228
- Die sichtbare App-Version wurde auf `0.1.0228` erhöht.
- Alle vier HeroCards (Dashboard, Kalender, Challenges, Einstellungen) erhalten echte SVG-Illustrationen statt Emoji-Platzhaltern — analog zur Pollen-HeroCard mit ihrer Graswedel-SVG.
- Dashboard: Bar-Chart-SVG mit Linie und Datenpunkten (`dashHeroArtSvg()` in `features/dashboard/dashboard-logic.js`).
- Kalender: Uhr-SVG mit Zeigern + kleines Kalenderblatt oben rechts (`calHeroArtSvg()` in `features/calendar/calendarPanels.js`).
- Challenges: Pokal-SVG mit Stern und Glanzeffekt (`chv227-illustration` in `core/misc.js`).
- Einstellungen: Zahnrad-SVG (zwei ineinandergreifende Räder) (`settingsHeroArtSvg()` in `features/settings/settingsPanel.js`).
- CSS für alle SVG-Illustrationen in `styles/appShell.css` ergänzt: Größe, Opacity, Drop-Shadow, mobile Anpassung.
- Challenge-Stats-Labels mobil: `overflow:visible` damit `Abzeichen`, `Heute`, `Offen` nie abgeschnitten werden.
- Challenge-Hero mobil: `grid-template-areas:"main visual" "stats stats"` explizit gesetzt.
- Keine Änderung an Logik, Punkten, Kalenderdaten, Firebase, Sync, Login oder Push.

## Version 0.1.0227
- Die sichtbare App-Version wurde auf `0.1.0227` erhöht.
- Die großen HeroCards wurden in einem zentralen Hero-Layer auf die Pollen-Referenz vereinheitlicht: Kartenfläche, Radius, Verlauf, Trennlinien, Statuszeilen, Typografie und mobile KPI-Leiste.
- Dashboard, Kalender, Challenges und Einstellungen nutzen weiterhin ihre bestehenden Daten und Funktionen, werden aber am Ende von `styles/appShell.css` über eine gemeinsame v0.1.0227-Hero-Basis stabilisiert.
- Die Challenges-HeroCard wurde aus der `chv225`-Kette gelöst und nutzt nun `chv227-*` Klassen; sichtbare C-Kreise bleiben entfernt, das Visual ist nur ein flaches Hintergrundsymbol.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0226
- Die sichtbare App-Version wurde auf `0.1.0226` erhöht.
- Die GitHub-Update-Anzeige wurde mobil verdichtet: `Update bereit` und der laufende Status erscheinen nicht mehr als zwei getrennte Karten, sondern als ein aktueller Statusblock.
- Die GitHub-Update-Details zeigen weiterhin Zielversion und Dateianzahl, sparen aber vertikalen Platz in der mobilen Ansicht.
- Das mobile Scrollverhalten in den Einstellungen wurde erweitert, damit der untere GitHub-Button nicht mehr hinter der Bottom-Navigation hängen bleibt.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0225
- Die sichtbare App-Version wurde auf `0.1.0225` erhöht.
- Die Challenges-HeroCard wurde aus der alten `chv222`/`challenge-goal` Override-Kette gelöst und nutzt nun neue `chv225-*` Klassen, damit alte Mobile-Patches nicht mehr in die HeroCard greifen.
- Sichtbare `C`-Kreise wurden aus den Hero-Visuals entfernt; die Mitte ist nur noch ein dezentes flaches Hintergrundsymbol wie bei Pollen.
- Dashboard, Kalender, Challenges und Einstellungen behalten ihre Funktionen; geändert wurden nur HeroCard-Rendering und CSS-Bereinigung.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0224
- Die sichtbare App-Version wurde auf `0.1.0224` erhöht.
- Die Challenges-HeroCard wurde über einen finalen AppShell-Anker stabilisiert, damit ältere Challenge-Overrides die Pollen-Geometrie nicht mehr zerbrechen.
- Challenges nutzt mobil und desktop wieder sichtbar dieselbe Hero-Logik wie Pollen: Overline, großer Titel, Subline, Fortschritt, ruhiges C-Visual und drei Statuswerte.
- Die KPI-Zeile in Challenges bleibt einzeilig und bricht nicht mehr in leere/verschobene Fragmente um.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0223
- Die sichtbare App-Version wurde auf `0.1.0223` erhöht.
- Die rote GitHub-Toastmeldung `Bitte ZIP zuerst erfolgreich prüfen` wurde entfernt; ein Klick während Prüfung/Upload bleibt still blockiert, ohne störende Fehlermeldung.
- Das mobile Scrollverhalten in den Einstellungen wurde stabilisiert: `body`, `#main-app`, `#content` und `#settings-view` dürfen mobil wieder bis zum Ende scrollen, die Scrollbar bleibt unsichtbar.
- Zusätzlicher unterer Sicherheitsabstand schützt Inhalte vor der mobilen Bottom-Navigation.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker, GitHub Action oder Challenges-Logik.

## Version 0.1.0222
- Die sichtbare App-Version wurde auf `0.1.0222` erhöht.
- Die mobile Challenges-HeroCard wurde aus der kaputten `challenge-goal-*` Override-Kette herausgelöst und nutzt jetzt eigene stabile `chv222-*` Klassen.
- Die HeroCard zeigt wieder vollständig: `DIESE WOCHE`, `Gruppenziel`, Kalenderwoche, Fortschritt und die drei Statuswerte Abzeichen, Heute und Offen.
- Zielscheibe bleibt entfernt; das ruhige C-Visual bleibt klein und rein dekorativ.
- Änderung betrifft nur Challenges-Hero-Rendering/CSS. Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker und GitHub Action bleiben unverändert.

## Version 0.1.0221
- Die sichtbare App-Version wurde auf `0.1.0221` erhöht.
- Die Challenges-HeroCard wurde nach dem fehlerhaften Umbau erneut stabilisiert: keine übergroße Leerfläche, keine zerfallende KPI-Zeile und keine vertikal auseinanderbrechende Fortschrittsanzeige.
- Mobile Challenges nutzt jetzt wieder eine einfache Pollen-Geometrie: Hauptinhalt links, kleines ruhiges C-Visual rechts, Fortschritt sauber darunter und drei kompakte Statusspalten unten.
- Die Änderung betrifft nur CSS/Rendering der Challenges-Oberfläche. Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker und GitHub Action bleiben unverändert.

## Version 0.1.0220
- Die sichtbare App-Version wurde auf `0.1.0220` erhöht.
- Die Challenges-Gruppenziel-HeroCard wurde als stabiler Pollen-Reset neu gesetzt: keine Zielscheibe, keine kollabierenden KPI-Texte, keine kaputte Zwischenstruktur.
- Mobile Challenges nutzt wieder die Pollen-Logik: Hauptinhalt und kleines C-Visual oben, danach Trennlinie und drei sauber getrennte Statusspalten.
- Die Fortschrittszeile in der Challenges-HeroCard bleibt einzeilig und bricht nicht mehr in einzelne Wörter um.
- Challenge-Aufgaben, Rangliste und Wochenkarte behalten die bestehende Logik; geändert wurde nur CSS/Rendering der Challenge-Oberfläche.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0219
- Die sichtbare App-Version wurde auf `0.1.0219` erhöht.
- Die Challenges-Gruppenziel-HeroCard wurde nicht weiter nur überlagert, sondern in der Darstellung auf die mobile Pollen-Struktur beruhigt: Hauptinhalt links, ruhiges C-Visual rechts, Trennlinie und drei klare Statusspalten unten.
- Die KPI-Zeile in Challenges wurde repariert, damit Label und Werte nicht mehr übereinander liegen.
- Der Challenge-Kicker ist kein pillenförmiger Sonderstil mehr, sondern nutzt dieselbe ruhige Overline-Logik wie Pollen.
- Aufgabenkarten und Rangliste wurden zusätzlich ruhiger an den Pollen-Kartenstil angenähert.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0218
- Die sichtbare App-Version wurde auf `0.1.0218` erhöht.
- Challenges wurden weiter in Richtung Pollen-Stil gebracht: Die Zielscheibe wurde aus der HeroCard entfernt und durch ein ruhiges Change-Visual ersetzt.
- Die Hero-KPI-Zeilen nutzen jetzt neutralere Icons und weniger technische Zielscheiben-/Uhr-Symbole.
- Challenge-Aufgabenkarten, Rangliste und Wochenkarte wurden ruhiger an den Pollen-Kartenstil angepasst: weniger Rahmenwirkung, weichere Flächen, kleinere Chips und kompaktere mobile Karten.
- Die Challenge-Logik, Punkteberechnung, Ranglistenlogik, Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker und GitHub Action bleiben unverändert.

## Version 0.1.0217
- Die sichtbare App-Version wurde auf `0.1.0217` erhöht.
- Inhaltlich entspricht diese Version der Pollen-CSS-exakten HeroCard-Angleichung aus `0.1.0216`, wurde aber neu versioniert, damit die GitHub-Update-Funktion die ZIP korrekt als neuere Version akzeptiert.
- Keine weitere Änderung an HeroCard-Rendering, Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0216
- Die sichtbare App-Version wurde auf `0.1.0216` erhöht.
- Die HeroCards werden nun an den tatsächlich aktuellen Pollen-CSS-Werten ausgerichtet: Desktop nutzt dieselben Spaltenverhältnisse, Höhe, Innenabstände, Statuszeilen-Größen und Icon-Größen wie die Pollen-HeroCard.
- Die mobile HeroCard-Geometrie wurde auf das Pollen-Raster gelegt: Hauptinhalt plus Visual oben, danach eine Trennlinie und exakt drei Statusspalten mit denselben Abständen, Schriftgrößen und Icongrößen.
- Der Kalender-Workspace wird auf Desktop zusätzlich über `#cal-body` und `#calendar-premium-view` mittig begrenzt, damit die Kalenderansicht nicht mehr zu weit links startet.
- Dashboard, Kalender, Challenges und Einstellungen behalten ihre Funktionen; geändert wurden nur HeroCard-Rendering, Abstände und Styling.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0215
- Die sichtbare App-Version wurde auf `0.1.0215` erhöht.
- Die HeroCards wurden nochmals näher an die Pollen-Referenz gezogen: Desktop nutzt dieselbe Drei-Zonen-Geometrie, dieselbe Statuszeilen-Logik und dieselben Textgrößen für Label/Wert.
- Die Challenges-Statuszeilen wurden repariert, damit Label und Wert nicht mehr übereinander liegen und mobil wie bei Pollen sauber in drei Spalten stehen.
- Der lokale/Desktop-Kalender wird nun über `#cal-body` mittig auf dieselbe Breite wie Pollen begrenzt, damit die Ansicht nicht mehr zu weit links startet.
- Dashboard-, Kalender-, Challenges- und Einstellungen-HeroCards behalten ihre Funktionen; geändert wurden nur Rendering-Abstände und CSS-Styling.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0214
- Die sichtbare App-Version wurde auf `0.1.0214` erhöht.
- Dashboard, Kalender, Challenges und Einstellungen nutzen jetzt denselben HeroCard-Aufbau wie Pollen: linke Inhaltszone, mittlere Visual-Zone und rechter Drei-Zeilen-Statusblock auf Desktop.
- Mobile HeroCards wurden an die Pollen-Logik angeglichen: Hauptinhalt mit kleinem Visual oben, darunter eine Trennlinie und drei gleich breite Statusspalten.
- Kalender-Statuswerte wurden für die HeroCard gekürzt, damit die rechte Status-Zone ruhiger und weniger abgeschnitten wirkt.
- Die Einstellungen-HeroCard richtet Avatar, Name, C-Visual und Statuszeilen wieder sauber in der Pollen-Struktur aus.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0213
- Die sichtbare App-Version wurde auf `0.1.0213` erhöht.
- Die GitHub-Update-Anzeige wurde beruhigt: Im normalen Verlauf wird nur noch die Zielversion angezeigt, keine aktuelle Version, Live-Version, Main-Version, Commit-SHA oder letzte Prüfzeit.
- Technische Begriffe wie `ZIP wurde übertragen`, `GitHub Action wird gesucht/geprüft` und `Commit auf main` wurden in der normalen Anzeige durch einfache Statusmeldungen ersetzt: `Update bereit`, `Update wird hochgeladen`, `Update wird angewendet`, `Update wird veröffentlicht`, `Update ist bereit`.
- Der Reload-Button heißt jetzt `App vollständig neu laden`; wenn die Version bereits geladen ist, wird nur die geladene Version angezeigt.
- Die Datei wird nach der ZIP-Prüfung im Speicher gehalten, damit der spätere Upload die Browser-Dateireferenz seltener verliert.
- Dateilesefehler beim Upload werden verständlich als `Datei konnte nicht gelesen werden. Bitte ZIP neu auswählen und direkt erneut übertragen.` angezeigt.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0212
- Die sichtbare App-Version wurde auf `0.1.0212` erhöht.
- Inhaltlich entspricht diese Version der HeroCard-Vereinheitlichung aus `0.1.0211`, wurde aber neu versioniert, damit die GitHub-Update-Funktion die ZIP korrekt als neuere Version akzeptiert.
- Keine weitere Änderung an HeroCard-Rendering, Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0211
- Die sichtbare App-Version wurde auf `0.1.0211` erhöht.
- Die ersten großen HeroCards von Dashboard, Kalender, Challenges und Einstellungen wurden auf ein gemeinsames Pollen-HeroCard-System vereinheitlicht.
- Alle angepassten HeroCards nutzen nun dieselbe große Grundfläche, dieselbe ruhige grün-schwarze Verlaufssprache, dieselbe Border-/Schattenlogik, dieselbe Drei-Zonen-Struktur und dieselbe rechte Status-Zone mit drei Einträgen.
- Kalender und Challenges erhalten eine eigene mittlere Visual-Zone, damit Aufbau und Trennlinien wie bei Pollen wirken.
- Dashboard zeigt im Hero jetzt drei Statuszeilen statt einer uneinheitlichen 2x2-/4er-Aufteilung: Wetter, Pollen und nächster Termin.
- Mobile HeroCards nutzen ein einheitliches Raster mit Hauptinhalt, kompakter Visual-Zone und drei Statusspalten unter einer horizontalen Trennlinie.
- Die bestehenden Funktionsdaten bleiben erhalten; geändert wurden nur HeroCard-Rendering und UI-Styling.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0210
- Die sichtbare App-Version wurde auf `0.1.0210` erhöht.
- Der Button `Update vollständig neu laden` nutzt jetzt nicht mehr nur einen normalen Reload, sondern löscht Cache-API-Caches, meldet vorhandene Service Worker ab und lädt die App mit leerer URL plus frischem `v`, `t` und `hard` Parameter neu.
- Der Update-Button wird nur noch angezeigt, wenn die live erkannte Zielversion wirklich höher ist als die aktuell geladene App-Version.
- Wenn die erkannte Live-Version bereits der geladenen App-Version entspricht, zeigt die App nur noch `Aktuelle Version ist bereits geladen` statt erneut denselben Update-Button anzubieten.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, Kalenderlogik oder Challenge-Daten.

## Version 0.1.0209
- Die sichtbare App-Version wurde auf `0.1.0209` erhöht.
- Die Einstellungen-HeroCard nutzt jetzt lokal und mobil denselben Grundaufbau wie die Pollen-HeroCard: gleiche Höhe, gleiche Abstände, gleicher rechter Drei-Zeilen-Statusblock und eine eigene mittlere Visual-Zone.
- Die mobile HeroCard zeigt Google-Status, Gesundheitscheck und Version vollständig in einer kompakten Zeile aus drei Statuskarten.
- Der Settings-Workspace blendet Scrollbars wieder aus, bleibt aber weiter scrollbar; zusätzlich wurde unten mehr Platz ergänzt, damit mobil bis ganz nach unten gescrollt werden kann.
- Beim Verlassen der Einstellungen werden versteckte Kalender-/Dashboard-/Pollen-/Challenge-Container sowie `cal-controls` und `fab` sauber zurückgesetzt, damit andere Ansichten nicht mehr schief oder versetzt wirken.
- Der Desktop-Kalender wurde zusätzlich wieder etwas stärker mittig begrenzt, damit der Inhalt nicht zu weit links wirkt.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder GitHub Worker.

## Version 0.1.0206
- Die sichtbare App-Version wurde auf `0.1.0206` erhöht.
- Die Einstellungen-HeroCard übernimmt jetzt rechts denselben klaren Drei-Zeilen-Aufbau wie die Pollen-HeroCard: mit Innen-Trennlinie und drei Statuszeilen statt einer inneren Einzelkachel.
- Rechts in der HeroCard stehen jetzt Google-Status, Gesundheitscheck und Version sauber untereinander.
- Die HeroCard bleibt lokal und mobil ruhiger und konsistenter zum restlichen Pollen-/Kalender-Stil.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder Challenge-Daten.

## Version 0.1.0205
- Die sichtbare App-Version wurde auf `0.1.0205` erhöht.
- Die GitHub-Update-Anzeige zeigt jetzt einen klaren Live-Fortschritt: ZIP übertragen, GitHub Action, Commit auf `main`, Live-Version.
- `Update laden` wird erst aktiv, wenn die Zielversion nach erfolgreicher Action auch wirklich live über die App-Datei erreichbar ist.
- Der Cloudflare-Worker-Status unterstützt zusätzlich `targetVersion` und liefert die aktuelle `main`-Version inklusive Commit-SHA zurück.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Daten.

## Version 0.1.0204
- Die sichtbare App-Version wurde auf `0.1.0204` erhöht.
- Das ZIP-Update-Paket übernimmt den Kalender-/Einstellungen-HeroCard-Fix aus `0.1.0203` erneut sauber, falls `0.1.0203` durch den alten Workflow nicht committed wurde.
- Der GitHub-Update-Workflow liest die Zielversion nicht mehr per Bash/Inline-Regex, sondern aus `.change-update-version`.
- `.change-update-version` wird vor dem Commit entfernt, damit keine temporäre Root-Datei auf `main` bleibt.
- Fehlerhafte ZIP-Übergaben in `updates/` werden bei Action-Fehlern bereinigt.
- Die GitHub-Update-Anzeige meldet nach dem Upload nur noch die Übergabe und danach den echten GitHub-Action-Status.
- Der Cloudflare-Worker-Code mit `/files`, `/status` und `/upload` bleibt als manuell zu deployender Worker-Code in `scripts/changeGithubUpdateWorker.js` dokumentiert.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Daten.

## Version 0.1.0203
- Die sichtbare App-Version wurde auf `0.1.0203` erhöht.
- Der Kalender nutzt lokal/Desktop keinen reservierten Abstand mehr für die alte `#cal-controls`-Leiste; der Premium-Kalender startet dadurch auf derselben Workspace-Höhe wie die anderen Ansichten.
- Die Einstellungen-HeroCard wurde lokal und mobil in Breite, Höhe, Innenabstand und Grid-Aufbau an die Kalender-HeroCard angeglichen.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder GitHub Worker.

## Version 0.1.0202
- Die sichtbare App-Version wurde auf `0.1.0202` erhöht.
- Kalender-Wochenpfeile sitzen jetzt direkt in der Wochenkarte, passend zur Monatsansicht.
- Challenge-Wochenpfeile sitzen jetzt ebenfalls direkt in der Wochenkarte.
- Wochen-/Monatskarten bleiben optisch ruhiger, ohne zusätzliche externe Button-Zeile.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder GitHub Worker.

# CLAUDE.md – Change App
> Die einzige Wahrheit. Jede Änderung an der App MUSS hier dokumentiert werden.
> Zuletzt aktualisiert: 2026-06-14 · Version 0.1.0227 mit zentralisiertem Pollen-Hero-Layer

---



## Version 0.1.0199
- Die sichtbare App-Version wurde auf `0.1.0199` erhöht.
- Dashboard und Kalender bleiben die visuelle Referenz für die großen HeroCards.
- Pollen, Challenges und Einstellungen wurden lokal und mobil auf dieselbe grün-schwarze Kalender-HeroCard-Fläche vereinheitlicht.
- Kleine Kartenflächen in Pollen, Challenges und Einstellungen nutzen nun dieselbe ruhige Surface-Sprache, bleiben aber flacher als die HeroCards.
- In den mobilen Einstellungen wird die sichtbare Scrollbar ausgeblendet; Scrollen bleibt möglich.
- Die mobilen Einstellungen nutzen wieder denselben linken und rechten Content-Abstand wie Dashboard und Kalender.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## Version 0.1.0198
- Die sichtbare App-Version wurde auf `0.1.0198` erhöht.
- Ein mobiler Scroll-Bug nach dem Öffnen der Einstellungen wurde behoben: Desktop-Sidebar-/100vh-Inlinewerte werden auf Mobile nicht mehr dauerhaft übernommen.
- Die Einstellungen erhalten mobil einen eigenen vertikalen Scrollbereich bis zur Bottom-Bar inklusive sichtbarer, dezenter Scrollbar.
- Die Einstellungs-Kacheln wurden mobil kompakter im Stil der Allergieprofil-Karten aufgebaut: kleine ruhige Karten, weniger Text, klare Übersicht.
- Desktop-Sidebar, HeroCard-Farbwelt, Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker und GitHub Action bleiben unverändert.

## Version 0.1.0197
- Die sichtbare App-Version wurde auf `0.1.0197` erhöht.
- Die Kalender-HeroCard wurde als Zielbild für die großen HeroCards übernommen.
- Dashboard-, Kalender-, Pollen- und Challenges-HeroCards nutzen nun dieselbe ruhige grüne Verlauf-/Kontur- und Schattenlogik.
- Kleinere Kartenflächen in Kalender, Dashboard, Challenges, Pollen und Einstellungen wurden visuell angeglichen, ohne neue Komponenten oder doppelte Dateien einzuführen.
- Mobile Abstände, Desktop-Sidebar, Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker und GitHub Action bleiben unverändert.

## Version 0.1.0196
- Die sichtbare App-Version wurde auf `0.1.0196` erhöht.
- Mobile Hauptansichten nutzen jetzt denselben linken und rechten Content-Abstand wie das Dashboard.
- Kalender, Pollen, Challenges und Einstellungen wirken dadurch nicht mehr randnah oder gestreckt.
- Desktop-Sidebar, GitHub Worker, GitHub Action, Login, Firebase, Datenbank-Sync, Google Kalender und Push bleiben unverändert.

## Version 0.1.0195
- Die sichtbare App-Version wurde auf `0.1.0195` erhöht.
- Mobile Ansichten erzwingen wieder den normalen Top-Header, scrollbaren Content und die Bottom-Navigation.
- Desktop-Sidebar-Regeln werden für Touch/Mobile zusätzlich zurückgesetzt, damit links kein Sidebar-Rand mehr entsteht.
- Die Einstellungen nutzen mobil wieder die volle Breite und bleiben scrollbar.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub-Worker oder Challenge-Daten.







## Version 0.1.0194
- Die sichtbare App-Version wurde auf `0.1.0194` erhöht.
- Mobile Scroll-Regeln wurden nach den Desktop-Sidebar-Fixes zurückgesetzt, damit Dashboard, Kalender, Challenges, Pollen und Einstellungen wieder normal scrollbar bleiben.
- Desktop-100vh- und `overflow:hidden`-Regeln werden auf Mobile explizit neutralisiert.
- Die mobile Bottom-Navigation bleibt fixiert und ohne zusätzlichen Rand nutzbar.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder Challenge-Daten.

## Version 0.1.0193
- Die sichtbare App-Version wurde auf `0.1.0193` erhöht.
- Der lokale/Desktop-Content blieb leer, weil `#main-app` beim Start per Inline-Style als `flex` erzwungen wurde und damit die Desktop-Sidebar-Grid-Regeln aushebelte.
- `bootMainApp()` erzwingt kein globales Flex-Layout mehr; `setMainView()` stellt für Desktop explizit das Sidebar-Grid wieder her.
- Dashboard, Kalender, Challenges, Pollen und Einstellungen bleiben damit rechts neben der Sidebar sichtbar.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder Challenge-Daten.

## Version 0.1.0192
- Die sichtbare App-Version wurde auf `0.1.0192` erhöht.
- In der mobilen Einstellungen-Ansicht wurde die Bottom-Navigation an Dashboard, Kalender, Challenges und Pollen angeglichen.
- Die sichtbare Trennkante oberhalb der Bottom-Bar wurde entfernt, damit die Ansicht wieder randlos bis zur Navigation wirkt.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder Challenge-Daten.

## Version 0.1.0191
- Die sichtbare App-Version wurde auf `0.1.0191` erhöht.
- Diese Version dokumentiert bewusst die aktuell offenen Prüfpunkte vor weiteren technischen Änderungen.
- Offene Prüfpunkte:
  - Desktop/lokale AppShell nach `0.1.0190` erneut testen, bevor weitere Layout-Fixes erfolgen.
  - Cloudflare Worker muss mit dem aktuellen `scripts/changeGithubUpdateWorker.js` deployed sein, damit `/files` und `/status` nicht mehr `404` liefern.
  - GitHub Action nach dem Commit-Fix erneut testen, inklusive Entpacken, Commit auf `main` und Entfernen der Übergabe-ZIP aus `updates/`.
  - Alte ZIP-Dateien in `updates/` entfernen, damit das Repository nicht unnötig wächst.
  - `APP_VERSION`, `CLAUDE.md` und `CHANGELOG.md` müssen bei jeder Folgeversion gemeinsam erhöht werden.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Punkten.

## Version 0.1.0190
- Die sichtbare App-Version wurde auf `0.1.0190` erhöht.
- Für Desktop/lokal wurde ein finaler Content-Guard ergänzt: Sidebar links, aktiver Inhalt rechts sichtbar und scrollbar.
- `setMainView()` erzwingt die Sichtbarkeit des aktiven Views zusätzlich per JS, damit ältere AppShell-Overrides den Content nicht mehr schwarz/leer schalten.
- Die Einstellungen rufen dieselbe Sicherung beim Öffnen auf.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub-Worker oder Challenge-Daten.

## Version 0.1.0189
- Die sichtbare App-Version wurde auf `0.1.0189` erhöht.
- Der GitHub-Action-Commit-Schritt wurde stabilisiert: Die Zielversion wird nun aus einer temporären `.change-update-version` gelesen statt per komplexem Bash/Node-Einzeiler im Workflow ermittelt.
- `scripts/applyZipUpdate.mjs` schreibt die geprüfte Zielversion nach dem Entpacken in `.change-update-version`; der Workflow entfernt diese Datei vor dem Commit wieder.
- Dadurch wird der Fehler `syntax error near unexpected token '('` im Schritt „Änderungen committen“ vermieden.
- Die ZIP-Übergabe bleibt weiterhin temporär und wird nach erfolgreicher Verarbeitung aus `updates/` entfernt.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Daten.

## Version 0.1.0188
- Die sichtbare App-Version wurde auf `0.1.0188` erhöht.
- `setMainView()` setzt nun wieder zuverlässig die globalen View-Klassen `change-view-dashboard`, `change-view-calendar`, `change-view-challenges` und `change-view-pollen`.
- Dadurch greifen die Desktop-Sidebar-Regeln wieder korrekt und die Inhalte rechts neben der Sidebar bleiben lokal/Desktop sichtbar.
- Die Einstellungen entfernen die View-Klassen weiterhin sauber beim Öffnen und Zurückwechseln.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, Challenge-Logik oder GitHub-Worker-Backend.


## Version 0.1.0187
- Die sichtbare App-Version wurde auf `0.1.0187` erhöht.
- Die Desktop/lokale Sidebar wurde stabilisiert, damit Dashboard, Kalender, Challenges, Pollen und Einstellungen ihren Content rechts neben der Sidebar wieder sichtbar rendern.
- Der Einstellungen-Zustand nutzt dieselbe Sidebar-Struktur wie die anderen Reiter; der Einstellungen-Button unten links bleibt in Größe und Stil stabil.
- Mobile Bottom-Navigation bleibt unverändert.
- Keine Änderung an Firebase, Datenbank-Sync, Google Kalender, Push, Login oder Challenge-Daten.

## Version 0.1.0186
- Die sichtbare App-Version wurde auf `0.1.0186` erhöht.
- Die Desktop-/lokale Sidebar bleibt links aktiv, ohne die Inhaltsbereiche leer zu schalten.
- Dashboard, Kalender, Challenges, Pollen und Einstellungen werden rechts neben der Sidebar wieder sichtbar und scrollbar gehalten.
- Der Einstellungen-Button links unten behält Größe und Stil der Sidebar auch im aktiven Zustand.
- Mobile Bottom-Navigation bleibt unverändert.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker, ZIP-Action oder Challenge-Logik.

## Version 0.1.0185
- Die sichtbare App-Version wurde auf `0.1.0185` erhöht.
- Desktop und lokale installierte Ansicht verwenden wieder die linke Sidebar-Navigation.
- Die obere Header-Navigation wird ab Desktop-Breite wieder durch die Sidebar ersetzt.
- Mobile Bottom-Navigation bleibt unverändert.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker, ZIP-Action oder Challenge-Logik.

## Version 0.1.0184
- Die sichtbare App-Version wurde auf `0.1.0184` erhöht.
- Die GitHub-Dateiliste wird nicht mehr direkt über `api.github.com` im Browser gelesen, sondern über den geschützten Cloudflare Worker-Endpunkt `/files`.
- Dadurch verschwinden die CSP-Fehler im GitHub-Bereich; der Browser spricht weiterhin nur mit dem Worker.
- Der Cloudflare Worker-Code wurde um `/files` ergänzt und liefert Dateianzahl sowie Dateiliste aus dem Repository.
- Die ZIP-Action bleibt robust: ZIP-Übergaben werden aus `updates/` verarbeitet und nach erfolgreicher Anwendung entfernt.
- Wichtig für die erste Nutzung: `.github/workflows/apply-zip-update.yml`, `scripts/applyZipUpdate.mjs` und der Cloudflare Worker-Code müssen einmal manuell aktualisiert werden, bevor der automatische ZIP-Update-Kreis zuverlässig läuft.
- Keine Änderung an Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Logik.

## Version 0.1.0183
- Die sichtbare App-Version wurde auf `0.1.0183` erhöht.
- Nach der direkten GitHub-Übertragung fragt die App den Cloudflare Worker temporär nach dem GitHub-Action-Status ab.
- Die Statusabfrage stoppt automatisch bei Erfolg, Fehler oder spätestens nach zwei Minuten, damit kein Dauer-Polling entsteht.
- Nach erfolgreicher GitHub Action erscheint einmalig `Update auf Version ... laden`; der Button leert Browser-/Service-Worker-Caches soweit möglich und lädt die App mit Versionsparameter neu.
- Die GitHub-Seite wird nach der Übertragung nicht mehr automatisch geöffnet.
- Der Worker unterstützt zusätzlich `GET /status` für den Live-Status der GitHub Action.
- Keine Änderung an Kalenderdaten, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Logik.

## Version 0.1.0181
- Die sichtbare App-Version wurde auf `0.1.0181` erhöht.
- Die GitHub Action für ZIP Updates wurde robuster gemacht: Wenn die ZIP nach dem Checkout nicht lokal gefunden wird, wird sie über die GitHub API anhand des Push-Events nachgeladen.
- Fehlerhafte ZIP-Übergaben werden nach einem fehlgeschlagenen Lauf automatisch aus `updates/` entfernt, damit das Repository nicht durch unentpackte ZIP-Dateien anwächst.
- `CHANGELOG.md` wird serverseitig als Pflichtdokument geprüft.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Logik.

## Version 0.1.0180
- Die sichtbare App-Version wurde auf `0.1.0180` erhöht.
- Im GitHub Update wurden die großen Kacheln `Von Version` und `Auf Version` entfernt; die Versionsprüfung bleibt in der Prüfliste erhalten.

## Version 0.1.0179
- Die sichtbare App-Version wurde auf `0.1.0179` erhöht.
- Der GitHub-Bereich in den Einstellungen startet nun mit dem Freigabe-Code.
- ZIPs werden direkt nach Auswahl oder Drag & Drop geprüft; der separate Button „Änderungen prüfen“ wurde entfernt.
- Der Hinweistext „ZIP auswählen und Prüfung starten“ sowie der Untertitel „ZIP Update · Worker“ wurden entfernt.

## Version 0.1.0178
- Die sichtbare App-Version wurde auf `0.1.0178` erhöht.
- Der eigene Einstellungen-Bereich „GitHub“ nutzt nun das GitHub-Mark als Icon statt des bisherigen Platzhaltersymbols.
- Das Icon wird sowohl in der GitHub-Kachel als auch in der Detailkarte angezeigt.
- Keine Änderung an GitHub-Worker, ZIP-Prüfung, Upload-Logik, Login, Firebase, Sync, Kalender oder Challenges.

## Version 0.1.0182
- Die sichtbare App-Version wurde auf `0.1.0182` erhöht.
- Die GitHub-ZIP-Prüfung liest nun zusätzlich die aktuelle Dateianzahl aus dem Repository und vergleicht sie mit der ZIP-Dateiliste.
- Neue Dateien werden erkannt und in einer ausklappbaren Übersicht unter `Anzahl der Dateien` angezeigt.
- Die dauerhafte Dateivorschau wurde entfernt, damit der GitHub-Bereich ruhiger bleibt.
- Die Content-Security-Policy erlaubt lesende Anfragen an `https://api.github.com`; kein GitHub-Key liegt im Browser.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Logik.

## Version 0.1.0177
- Die sichtbare App-Version wurde auf `0.1.0177` erhöht.
- Die Content-Security-Policy erlaubt nun die Verbindung zum geschützten Cloudflare Worker `https://change-github-update.ak2191.workers.dev`, damit die GitHub-Übertragung nicht mehr durch `connect-src` blockiert wird.
- Die GitHub-ZIP-Prüfung wurde vereinfacht: `CLAUDE.md vorhanden` und `Zielversion erkannt` werden nicht mehr separat angezeigt.
- `Dateiliste lesbar` wurde zu `Anzahl der Dateien` umbenannt.
- `CHANGELOG.md aktualisiert` wurde als eigener Prüfpunkt ergänzt.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Logik.

## Version 0.1.0176
- Die sichtbare App-Version wurde auf `0.1.0176` erhöht.
- Der Freigabe-Code im GitHub-Bereich löst beim Tippen von Zahlen keine globalen Tastatur-Navigationen mehr aus.
- Technische Hinweistexte im GitHub-Bereich und in der Einstellungen-Detailüberschrift wurden entfernt.
- Keine Änderung an Login, Sync, Firebase, Google Kalender oder GitHub-Worker-Backend.

## Version 0.1.0175
- Die sichtbare App-Version wurde auf `0.1.0175` erhöht.
- Der Einstellungen-Header wurde an Dashboard, Kalender, Challenges und Pollen angeglichen.
- Die rechte Aktionsgruppe bleibt jetzt konsistent: Glocke, Zahnrad, Profil.
- Der Profilrahmen mit Login-Status wird auch in den Einstellungen wieder sichtbar.
- Keine Änderungen an Login, Sync, Firebase oder GitHub-Worker-Backend.

## Version 0.1.0174
- Die sichtbare App-Version wurde auf `0.1.0174` erhöht.
- Challenges und Einstellungen bleiben lokal/Desktop und mobil wieder zuverlässig scrollbar.
- Der GitHub-Bereich nutzt nun eine Drag-and-Drop-ZIP-Fläche statt einer Dropdown-Leiste.
- Der leere Hinweis „Noch keine ZIP ausgewählt“ wurde entfernt; der Auswahlzustand steht direkt in der Upload-Fläche.
- Die Freigabe-Code-Warnung durch ein Passwortfeld außerhalb eines Formulars wurde entschärft.
- Keine Änderung an Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Punkten.

## Version 0.1.0173
- Die sichtbare App-Version wurde auf `0.1.0173` erhöht.
- Die Einstellungen nutzen lokal/Desktop wieder dieselbe horizontale Header-Reihenfolge wie Dashboard, Kalender, Challenges und Pollen.
- Die rechte Aktionsgruppe bleibt überall konsistent: Glocke, Zahnrad, Profil.
- Mobile Einstellungen behalten ebenfalls diese Reihenfolge, ohne vertauschte Symbole.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Kalenderdaten, Pollenberechnung oder GitHub-Worker-Logik.

## Version 0.1.0172
- Die sichtbare App-Version wurde auf `0.1.0172` erhöht.
- Die lokale/Desktop-AppShell wurde stabilisiert, damit die Navigation nach hartem Reload nicht vertikal/zentriert kippt.
- Im eigenen GitHub-Einstellungsbereich wurden die Hinweise zu Cloudflare Worker, `updates/`, GitHub Action, `main` und Browser-Schlüssel klar sichtbar ergänzt.
- ZIP Update bleibt als ausklappbarer Bereich; Prüfung und Übertragung bleiben getrennt.
- Keine Änderung an Firebase, Datenbank-Sync, Google Kalender, Login oder Push.

## Version 0.1.0171
- Die sichtbare App-Version wurde auf `0.1.0171` erhöht.
- Der bisherige Punkt „GitHub Update“ wurde aus „App & Sicherheit“ herausgenommen.
- GitHub ist nun ein eigener Bereich in den Einstellungen.
- Der ZIP-Upload ist dort als ausklappbarer Dropdown-Bereich aufgebaut.
- Die Worker-Übertragung bleibt erhalten; kein GitHub-Key liegt im Browser.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender oder Push.

## Version 0.1.0170
- Die sichtbare App-Version wurde auf `0.1.0170` erhöht.
- Die Desktop-AppShell wurde repariert, damit Header, Tabs, Profil, Einstellungen und Content ab 701px wieder horizontal und korrekt angeordnet sind.
- Die mobile Bottom-Navigation bleibt unverändert.
- Der GitHub-Update-Worker und die ZIP-Übertragung bleiben erhalten.
- Keine Änderung an Kalenderdaten, Firebase, Datenbank-Sync, Google-Kalender, Push oder Challenge-Punkten.

## Version 0.1.0169
- Die sichtbare App-Version wurde auf `0.1.0169` erhöht.
- Die GitHub-Update-Kachel überträgt lokal geprüfte ZIPs nun direkt an den geschützten Cloudflare Worker `https://change-github-update.ak2191.workers.dev`.
- Der Cloudflare Worker nutzt die GitHub App serverseitig, legt ZIPs in `updates/` ab und startet dadurch die bestehende GitHub Action für Prüfung und Commit auf `main`.
- Ergänzt wurde `scripts/changeGithubUpdateWorker.js` als Worker-Code zum Kopieren in Cloudflare.
- Im Browser werden weder GitHub Private Key noch Installation Token gespeichert; der Freigabe-Code wird nur als manuelle Übergabe an den Worker genutzt.
- Keine Änderung an Kalenderdaten, Firebase, Datenbank-Sync, Google-Kalender, Push oder Challenge-Punkten.

## Version 0.1.0168
- Die sichtbare App-Version wurde auf `0.1.0168` erhöht.
- Das zuvor geplante Firebase-Functions-Backend für GitHub Updates wurde entfernt.
- ZIP Updates laufen nun über eine GitHub Action als geschütztes Backend: ZIP in `updates/` hochladen, Workflow prüft serverseitig Version und `CLAUDE.md`, entpackt und committet auf `main`.
- Ergänzt wurden `.github/workflows/apply-zip-update.yml`, `scripts/applyZipUpdate.mjs` und `updates/README.md`.
- Im Browser wird kein GitHub-Token gespeichert.
- Keine Änderung an Login, Kalenderdaten, Datenbank-Sync, Firebase-Sync oder Push.

## Version 0.1.0166
- Die sichtbare App-Version wurde auf `0.1.0166` erhöht.
- Die GitHub-Update-Kachel kann nach erfolgreicher ZIP-Prüfung den Commit über eine geschützte Firebase Cloud Function anstoßen.
- Der GitHub-Token wird ausschließlich als Firebase Secret `CHANGE_GITHUB_TOKEN` im Backend verwendet und nicht im Browser gespeichert.
- Das Backend prüft ZIP, Zielversion, CLAUDE.md, Root-Struktur und Dateiliste serverseitig erneut, bevor nach `AK2191/Meine-App` auf `main` geschrieben wird.
- Zusätzlich wurde `functions/package.json` um `jszip` erweitert.
- Keine Änderung an Kalenderdaten, Datenbank-Sync, Google-Kalender, Push, Login oder Challenge-Punkten.

## Version 0.1.0165
- Die sichtbare App-Version wurde auf `0.1.0165` erhöht.
- Dashboard-, Kalender-, Challenges- und Pollen-HeroCards nutzen nun dieselbe Kalender-Hintergrundfarbwelt.
- Die Vereinheitlichung gilt für Desktop und Mobile sowie Hell- und Dunkelmodus.
- Umsetzung zentral in `styles/appShell.css`, damit keine doppelten Komponenten oder Zusatzdateien entstehen.
- Keine Änderung an Kalenderdaten, Firebase, Datenbank-Sync, Google-Kalender, Push, Login oder Challenge-Punkten.

## Version 0.1.0164
- Die sichtbare App-Version wurde auf `0.1.0164` erhöht.
- Die GitHub-Update-ZIP-Prüfung erkennt Zielversionen nur noch aus Change-App-Versionseinträgen und nicht mehr aus beliebigen technischen Versionsnummern.
- Bestehende Projektordner wie `functions/`, `public/` und `components/` werden in der Root-Prüfung korrekt als erlaubte Struktur behandelt.
- Die CLAUDE.md-Prüfung bleibt bestehen und erwartet weiterhin einen passenden Eintrag zur Zielversion.
- Keine Änderung an Kalenderdaten, Firebase, Datenbank-Sync, Google-Kalender, Push oder Login.

## Version 0.1.0163
- Die sichtbare App-Version wurde auf `0.1.0163` erhöht.
- Die Login-Maske ist wieder als eigenständige, vollflächige Ansicht umgesetzt.
- Während die Login-Maske sichtbar ist, wird die Haupt-App ausgeblendet und nicht klickbar gehalten.
- Nach erfolgreichem Login wird die Sperre vollständig entfernt, damit keine Overlays oder Pointer-Blocker bleiben.
- Keine Änderung an Kalenderdaten, Firebase, Datenbank-Sync, Google-Kalender oder Push.

## Version 0.1.0162
- Die sichtbare App-Version wurde auf `0.1.0162` erhöht.
- In Einstellungen → App & Sicherheit wurde die Kachel „GitHub Update“ ergänzt.
- Die Kachel kann ZIP-Dateien lokal prüfen, Von-/Auf-Version anzeigen, CLAUDE.md erkennen, doppelte Dateien und unerwünschte Root-Dateien melden.
- Der echte GitHub-Commit bleibt bewusst gesperrt, bis ein geschütztes Backend oder eine GitHub Action verbunden ist.
- Kein GitHub-Token wird im Browser gespeichert. Keine Änderung an Kalenderdaten, Firebase, Sync, Login oder Push.

## Version 0.1.0161
- Die sichtbare App-Version wurde auf `0.1.0161` erhöht.
- Die Terminanzahl im Kalender-Hero bleibt nun immer auf der echten aktuellen Woche.
- Die Wochen-Navigation unten verändert diese Hero-Anzeige nicht mehr.
- Der grüne Punkt links neben der Wochenanzahl wurde entfernt.
- Keine Änderung an Kalenderdaten, Firebase, Sync, Login oder Push.

## Version 0.1.0160
- Die sichtbare App-Version wurde auf `0.1.0160` erhöht.
- Die mobilen Wochenkacheln in Kalender und Challenges wurden kleiner und ruhiger gesetzt.
- Die Ziffern-/Schriftlogik wurde an Pollen angeglichen, damit die 0 nicht mehr mit Punkt/Slashed-Zero erscheint.
- Keine Änderung an Logik, Daten, Firebase, Sync, Login oder Push.

## Version 0.1.0157
- Die sichtbare App-Version wurde auf `0.1.0157` erhöht.
- Die Wochenkalender von Kalender und Challenges wurden optisch und typografisch vereinheitlicht.
- Der Kalender erhielt eine Vorherige-/Nächste-Woche-Navigation.
- Die Challenges-Wochenansicht nutzt nun dieselbe reduzierte Pfeilnavigation wie der Kalender.
- Keine Änderung an Logik, Punkten, Kalenderdaten, Firebase, Sync, Login oder Push.

## Version 0.1.0156
- Die sichtbare App-Version wurde auf `0.1.0156` erhöht.
- Die Hintergrundfarbwelt der Kalender-HeroCard wurde auf Pollen und Challenges übertragen.
- Dies gilt lokal/desktop und mobil.
- Keine Änderung an Logik, Punkten, Kalenderdaten, Firebase, Sync, Login oder Push.

## Version 0.1.0155
- Die sichtbare App-Version wurde auf `0.1.0155` erhöht.
- Die mobile HeroCard-Farbwelt von Kalender wurde auf Dashboard, Challenges und Pollen übertragen.
- Die mobile Challenges-HeroCard wurde nochmals am Kalender/Pollen-Raster ausgerichtet.
- Die unteren Kennzahlen in Challenges überlappen nicht mehr und die Trenner sind vereinheitlicht.
- Keine Änderung an Logik, Punkten, Kalenderdaten, Firebase, Sync, Login oder Push.

## Version 0.1.0154
- Die sichtbare App-Version wurde auf `0.1.0154` erhöht.
- Im Dashboard-Hero wurde die Zeile „Nächster Termin …“ für lokale und mobile Ansicht entfernt.
- Im Kalender-Hero wird nun die Anzahl der Termine dieser Woche angezeigt statt der reinen heutigen Anzahl.
- In der Tagesagenda wurde der Abstand der Zeitspalte angepasst, damit das Google-G/Icon nicht mehr mit „Ganztägig“ überlappt.
- Keine Änderung an Kalenderdaten, Sync, Firebase, Login oder Push.

## Version 0.1.0153
- Die sichtbare App-Version wurde auf `0.1.0153` erhöht.
- Die lokalen HeroCards von Dashboard, Kalender und Challenges wurden strikt an das Pollen-Layout angeglichen.
- Die rechten Kennzahlenbereiche nutzen nun dieselbe Rasterlogik, Trennlinienposition und Textreihenfolge wie Pollen.
- Die lokale Challenges-HeroCard zeigt die Kennzahlen wieder strukturell korrekt untereinander an.
- Keine Änderung an Logik, Punkten, Kalender, Firebase, Sync, Login oder Push.

## Version 0.1.0152
- Die sichtbare App-Version wurde auf `0.1.0152` erhöht.
- Die mobile Challenges-HeroCard wurde anhand der Screenshots exakt an das Pollen-Raster angeglichen.
- Die drei Kennzahlen unten nutzen nun dieselbe Höhe, Separator-Logik, Text- und Icon-Ausrichtung wie Pollen.
- Keine Änderung an Challenge-Logik, Punkten, Kalender, Firebase, Sync, Login oder Push.

## Version 0.1.0151
- Die sichtbare App-Version wurde auf `0.1.0151` erhöht.
- Die lokale/Desktop-HeroCard-Struktur von Dashboard, Kalender und Challenges wurde rechts an die Pollen-HeroCard angepasst.
- Die Kennzahlen stehen nun untereinander in einer rechten Spalte mit gleicher Divider-Logik, gleicher Icon-/Text-Geometrie und gleichmäßigen Zeilen.
- Die Dashboard-HeroCard wurde für vier Anzeigen kompakter gesetzt.
- Umsetzung in `styles/appShell.css` und Versionsanzeige; keine Änderung an Dashboard-, Kalender-, Challenge- oder Pollenlogik, Firebase, Sync, Login oder Push.

## Version 0.1.0150
- Die sichtbare App-Version wurde auf `0.1.0150` erhöht.
- Die untere Kennzahlenzeile der mobilen Challenge-Gruppenziel-HeroCard wurde wieder exakt auf das Pollen-Raster gesetzt.
- Die drei Metriken nutzen nun dieselbe 3-Spalten-Geometrie, 58px Zeilenhöhe, 18px Icons und gleichmäßige vertikale Trennlinien wie die Pollen-HeroCard.
- Umsetzung in `styles/appShell.css` und Versionsanzeige; keine Änderung an Challenge-Logik, Punkten, Kalender, Firebase, Sync, Login oder Push.

## Version 0.1.0149
- Die sichtbare App-Version wurde auf `0.1.0149` erhöht.
- Die mobilen Kennzahlen in der Challenge-Gruppenziel-HeroCard wurden stabilisiert, damit Icon, Label und Wert nicht mehr überlappen.
- Die drei unteren Challenge-Hero-Metriken nutzen feste Spalten, feste Höhe, ausgeblendete Zusatztexte und getrennte Zeilen für Label und Wert.
- Umsetzung in `styles/appShell.css` und Versionsanzeige; keine Änderung an Challenge-Logik, Punkten, Kalender, Firebase, Sync, Login oder Push.

## Version 0.1.0148
- Die sichtbare App-Version wurde auf `0.1.0148` erhöht.
- Die Pollen-HeroCard behält mobil die korrigierte Position direkt unter der Überschrift.
- Der innere obere Abstand der Pollen-HeroCard wurde nach Challenge-Vorbild wiederhergestellt, weil `0.1.0147` den äußeren Pollen-Versatz entfernt, dabei aber den Hero-Innenabstand zu stark neutralisiert hatte.
- Umsetzung in `styles/appShell.css` und Versionsanzeige; keine Änderung an Pollenberechnung, Dashboard-, Kalender-, Challenge-Logik, Firebase, Sync, Login, Push oder Kalenderdaten.

## Version 0.1.0147
- Die sichtbare App-Version wurde auf `0.1.0147` erhöht.
- Der verbliebene mobile Pollen-Sonderversatz zwischen Überschrift und HeroCard wurde entfernt, damit die Pollen-HeroCard optisch auf derselben Höhe wie Kalender und Challenges startet.
- Umsetzung in `styles/appShell.css` und Versionsanzeige; keine Änderung an Pollenberechnung, Dashboard-, Kalender-, Challenge-Logik, Firebase, Sync, Login, Push oder Kalenderdaten.

## Version 0.1.0146
- Die sichtbare App-Version wurde auf `0.1.0146` erhöht.
- Mobile HeroCards von Dashboard, Kalender, Challenges und Pollen nutzen nun dieselbe Grundform: 274px Mindesthöhe, 24px Radius, 18px Innenabstand, linksbündige Leserichtung und einheitliche untere Kennzahlenzeile.
- Die Kalender-HeroCard wurde mobil linksbündig an Pollen und Challenges angepasst.
- Umsetzung in `styles/appShell.css` und Versionsanzeige; keine Änderung an Dashboard-, Kalender-, Challenge- oder Pollenlogik, Firebase, Sync, Login, Push oder Kalenderdaten.

## Version 0.1.0145
- Die sichtbare App-Version wurde auf `0.1.0145` erhöht.
- Im Pollen-24-Stunden-Ausblick wurden die Prozentwerte der linken Diagramm-Skala weiter nach links gesetzt.
- Die Kurve, Uhrzeiten, Pollenberechnung und Tagesbereiche bleiben unverändert.
- Umsetzung in `features/pollen/pollenView.js`, `features/pollen/pollenView.css` und Versionsanzeige; keine Änderung an Firebase, Sync, Login, Push oder Kalenderdaten.

## Version 0.1.0144
- Die sichtbare App-Version wurde auf `0.1.0144` erhöht.
- Dashboard, Kalender, Challenges und Pollen nutzen mobil denselben Titelblock: 42px Mindesthöhe und 14px Abstand zur HeroCard.
- Alte Pollen-Sonderabstände werden final neutralisiert, damit die Pollen-HeroCard auf gleicher Höhe wie Kalender und Challenges sitzt.
- Umsetzung in `styles/appShell.css` und Versionsanzeige; keine Änderung an Dashboard-, Kalender-, Challenge- oder Pollenlogik, Firebase, Sync, Login, Push oder Kalenderdaten.

## Version 0.1.0143
- Die sichtbare App-Version wurde auf `0.1.0143` erhöht.
- Der 24-Stunden-Ausblick im Pollenbereich zeigt im Diagramm links eine klare Prozent-Skala.
- Die Kurve wurde leicht nach rechts gesetzt, damit Uhrzeiten und Belastungswerte gleichzeitig lesbar sind.
- Umsetzung in `features/pollen/pollenView.js`, `features/pollen/pollenView.css` und Versionsanzeige; keine Änderung an Pollenberechnung, Firebase, Sync, Login, Push oder Kalenderdaten.

## Version 0.1.0142
- Die sichtbare App-Version wurde auf `0.1.0142` erhöht.
- Der mobile Abstand zwischen Pollen-Überschrift und Pollen-HeroCard wurde an Kalender und Challenges angeglichen.
- Alte AppShell-Abstandsregeln werden für Pollen mobil sauber überschrieben.
- Umsetzung in `styles/appShell.css` und `features/pollen/pollenView.css`; keine Änderung an Logik, Firebase, Sync, Login, Push oder Kalenderdaten.

## Version 0.1.0141
- Die sichtbare App-Version wurde auf `0.1.0141` erhöht.
- Dashboard-, Kalender- und Challenge-HeroCards wurden optisch an die Pollen-HeroCard angeglichen.
- Typografie, Akzentfarben, Hellmodus/Dunkelmodus und mobile HeroCard-Höhe sind nun konsistenter.
- Große Emoji-Icons in Hero-Metriken wurden durch ruhige Statusmarker ersetzt; Funktions-Icons außerhalb der HeroCards bleiben unverändert.
- Umsetzung in `change.css` und Versionsanzeige; keine Änderung an Logik, Firebase, Sync, Login, Push oder Kalenderdaten.

## Version 0.1.0140
- Die sichtbare App-Version wurde auf `0.1.0098` erhöht.
- Die Pollen-Maincard wurde oben überarbeitet.
- "Belastung heute" wurde aus dem rechten Bereich entfernt.
- Der rechte Bereich wird nun als vertikale Dashboard-ähnliche Insight-Liste angezeigt.

## Version 0.1.0097
- Die sichtbare App-Version wurde auf `0.1.0097` erhöht.
- Cleanup Build ohne Funktionsänderung.
- `features/pollen/pollenUiPolish.css` wurde in `features/pollen/pollenView.css` integriert.
- `features/challenges/challengesLayoutFix.css`, `styles/mobileShellFix.css`, `styles/pollenTypographyFix.css`, `styles/workspaceConsistencyFix.css`, `styles/pollenHeroConsolidationFix.css` und `styles/mobileScrollEndFix.css` wurden in `styles/appShell.css` integriert.
- Alte Einzel-README-Dateien wurden entfernt und in `CHANGELOG.md` zusammengeführt.
- Die CSS-Lade-Reihenfolge wurde bewusst erhalten, damit Dashboard, Kalender, Challenges und Pollen weiterhin funktionieren.

## Version 0.1.0096
- Die sichtbare App-Version wurde auf `0.1.0096` erhöht.
- Mobile Scroll-Endbereiche für Dashboard, Kalender, Challenges und Pollen wurden stabilisiert, damit letzte Karten nicht mehr von der Bottom-Bar abgeschnitten werden.

## Version 0.1.0095
- Die sichtbare App-Version wurde auf `0.1.0095` erhöht.
- Im Pollenbereich wurden die lokalen Sidecards entfernt und in die obere Maincard integriert.
- Die Maincard nutzt die gesamte obere Breite und zeigt Belastung heute, Peak und Ruhigster Tag direkt in den Hero-Stats.

## Version 0.1.0094
- Die sichtbare App-Version wurde auf `0.1.0094` erhöht.
- In der Challenge-Ansicht wurde die Hauptkachel als klare Maincard oben über die gesamte Breite gesetzt.
- Die Punkte-Kalender-Kachel wurde unter die Hauptkachel verschoben.

## Version 0.1.0093
- Die sichtbare App-Version wurde auf `0.1.0093` erhöht.
- Dashboard, Kalender, Challenges und Pollen nutzen dieselbe Workspace-Breite, dieselbe Titelhöhe und denselben linken Startpunkt wie Pollen.

## Version 0.1.0140
- Die sichtbare App-Version wurde auf `0.1.0116` erhöht.
- Der mobile Abstand zwischen Pollen-Überschrift und Pollen-Hauptkachel wurde reduziert.
- Dashboard wurde bei Titelhöhe, Seitenabständen und Workspace-Breite an die anderen Hauptansichten angeglichen.
- Umsetzung in `styles/appShell.css` und `features/dashboard/dashboard-logic.js`.

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
- Ab Version `0.1.0090`: `features/challenges/challengesLayoutFix.css` wird nach `styles/appShell.css` geladen und setzt für Challenges final Grid-Flächen, Reihenfolge, Overflow und Z-Index. Dadurch kann die Gruppen-Ziel-Hero-Karte lokal nicht mehr über Punkte-Kalender, Aufgaben oder Rangliste liegen. Keine Änderung an Challenge-Logik, Firebase, Sync, Login, Push oder Kalenderdaten.
- Ab Version `0.1.0091`: `styles/mobileShellFix.css` wird nach den App-Shell- und Challenge-Fix-Regeln geladen und stabilisiert mobil Dashboard, Kalender, Challenges und Pollen. Die Bottom-Bar ist fest unten, doppelte Unterabstände werden entfernt, mobile Scrollindikatoren werden ausgeblendet und geschlossene Side-Panels verschwinden vollständig aus dem sichtbaren Bereich. Keine Änderung an Logik, Firebase, Sync, Login, Push, Kalenderdaten, Pollen-API oder Challenge-Punkten.
- Ab Version `0.1.0092`: `styles/pollenTypographyFix.css` wird nach `styles/mobileShellFix.css` geladen und beruhigt die Typografie im Pollenbereich. Der 24-Stunden-Ausblick nutzt kompaktere Kennzahlen ohne Ellipsen/harte Prozentumbrüche, die Trendtexte wurden gekürzt und die Abschnittsüberschriften von Allergieprofil, Symptome heute und Ausblick sind einheitlich. Keine Änderung an Firebase, Sync, Login, Pollenberechnung oder gespeicherten Symptomen.


### Layout (Desktop)
- `.challenge-layout` → CSS Grid, 2 Spalten (`1.15fr / 0.85fr`), `align-items:stretch`
- **Gruppen-Ziel** (`#group-goal-card`): `grid-column: 1/-1`, wird als erstes Kind ins `.challenge-layout` eingefügt (via `insertBefore(card, firstChild)` in `core/misc.js`); Ziel ist dynamisch statt fix.
- **Punkte-Kalender** (`#challenge-week-points-card`): ebenfalls `grid-column: 1/-1`
- **Heutige Aufgaben** (`.challenge-card`) + **Rangliste** (`.leader-card`): gleich hoch via `align-items:stretch` + `flex:1` auf Listen
- **Mitspieler-Button** entfernt (war im `.leader-card-head`, Funktion `openParticipantPanel`)
- Titel der rechten Karte: „Rangliste" (vorher „Kontest")
- Ab Version `0.1.0041`: Challenge-Ansicht verwendet den ruhigen Pollen-Stil mit dunklem View-Hintergrund, radialen Akzenten, Premium-Karten, Gruppen-Ziel als Hero-Karte, Punkte-Kalender als volle Kartenzeile und mobilen Kartenabständen wie Pollen. Die Challenge-Logik, Auto-Challenges, Punkte, Sync, Rangliste, Anfeuern, Rückgängig und Heute-zurücksetzen bleiben unverändert.
- Ab Version `0.1.0043`: Challenge-Ansicht nutzt auf Desktop die gleiche seitliche auswählbare Navigation wie Pollen und auf Mobil die gleiche aktive Bottom-Navigation. Hellmodus ist wieder unterstützt. Der grüne Hintergrundakzent wurde reduziert. Erledigen und Rückgängig zeigen keine Toast-/Banner-Meldung mehr; Anfeuern zeigt weiterhin Banner über die bestehende Anfeuern-Logik.
- Ab Version `0.1.0045`: Die Navigation wird zentral über `styles/appShell.css` vereinheitlicht. Dashboard, Kalender, Challenges und Pollen nutzen auf Desktop dieselbe seitliche App-Bar und mobil dieselbe Bottom-Bar. Die Kalender-Steuerung bleibt als eigene Kopfleiste sichtbar. Challenges nutzt den Pollen-artigen Header; „Heute zurücksetzen“ bleibt eine Header-Aktion.
- Ab Version `0.1.0046`: Der Challenge-Kopf wird wie bei Pollen ohne breite Hintergrundleiste dargestellt. „Heute zurücksetzen“ bleibt rechts als kleine Aktion im Kopfbereich. Layout und Logik bleiben unverändert.
- Ab Version `0.1.0047`: Die mobile Bottom-Bar zeigt in Dashboard, Kalender, Challenges und Pollen keine sichtbare Abschlusskante/Borders mehr und verhält sich optisch wie das Dashboard. Navigation, Routing und Reiterlogik bleiben unverändert.
- Ab Version `0.1.0048`: Der Pollen-7-Tage-Ausblick zeigt im Titel nur noch „7-Tage-Ausblick“ ohne Profilzusatz. Einzel- und Mehrfachauswahl nutzen dieselbe ruhige Chip-Darstellung, damit Desktop nicht überladen wirkt und mobil alle ausgewählten Pollen sichtbar bleiben. Pollen-Datenlogik und API bleiben unverändert.
- Ab Version `0.1.0049`: Die mobile Bottom-Bar wurde stabilisiert, damit aktive Icons beim Tippen nicht mehr optisch hüpfen. Der Avatar zeigt den Online-/Offline-Status wieder mit Ring und Statuspunkt. Challenges nutzt eine ruhigere Header-Aktion für „Heute zurücksetzen“ und der Hintergrund schließt sauberer an die gemeinsame App-Bar an. Keine Änderung an Navigation, Challenge-Logik, Pollen-Datenlogik, Firebase, Sync, Push, Kalenderlogik oder Login.
- Ab Version `0.1.0050`: Desktop-App-Shell nutzt einen vollflächigen Hintergrund auf `#main-app` für Dashboard, Kalender, Challenges und Pollen. `#content` ist transparent, die seitliche Navigation hat keine harte rechte Border und keinen Schatten mehr, damit im Hellmodus keine getrennten Hintergrundflächen sichtbar sind. Keine Änderung an Navigation, Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik.
- Ab Version `0.1.0051`: Der mobile Pollen-7-Tage-Ausblick zeigt Datum, Werte-Chips und Mini-Balken wieder gemeinsam mit klareren Zeilentrennern. Die mobile Bottom-Bar hat keine sichtbare Abschlusskante mehr; Pollen-Content schließt ohne Karten-Bottom-Border an. Im Hellmodus wurde der obere App-Hintergrund beruhigt und die Desktop-Seitenleiste erhält eine subtile Trennlinie, damit die Auswahlbar erkennbar bleibt. Keine Änderung an Navigation, Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik.
- Ab Version `0.1.0052`: Die Desktop-Challenge-Ansicht orientiert sich am neuen Premium-Zielbild: Hero-Karte für Gruppen-Ziel, drei ruhige Statuskarten, Punkte-Kalender darunter und zwei große Spalten für Heutige Aufgaben und Team. Mobil bleibt die Ansicht gestapelt und übersichtlich. Keine Änderung an Challenge-Logik, Auto-Challenges, Sync, Firebase, Login oder Kalenderdaten.


- Ab Version `0.1.0054`: Dashboard nutzt einen Premium-Tages-Hub im gleichen Stil wie Kalender/Challenges/Pollen. Desktop zeigt Hero-Karte, Schnellinfos, heutige Termine, Aufgaben, Mitspieler und 7-Tage-Ausblick. Mobil wird die Ansicht gestapelt und nutzt horizontale Schnellinfo-Karten. Bestehende Kalender-, Challenge-, Wetter-/Pollen-, Firebase-, Sync-, Push- und Login-Logik bleibt unverändert; es wird nur die Dashboard-Darstellung neu aufgebaut.
- Ab Version `0.1.0055`: Einstellungen öffnen als Premium-Workspace im gleichen Kartenstil wie Dashboard, Kalender, Challenges und Pollen. Desktop zeigt Profil-/Statuskarte, Kategorie-Karten und rechts den Detailbereich. Mobil wird die Ansicht gestapelt, Kategorie-Karten werden horizontal scrollbar. Bestehende Schalter, Sync-Regeln, Push, Kalenderoptionen, Challengeoptionen und App-Gesundheitscheck bleiben funktional unverändert; es wird kein Auto-Start eingeführt.
- Ab Version `0.1.0060`: Pollen-Allergieprofil-Auswahl nutzt die vorhandenen Cache-Daten und lädt beim reinen Profilwechsel nicht erneut die API. Die Scrollposition bleibt bei Profil- und Symptom-Auswahl erhalten, damit die mobile Ansicht nicht an den Anfang springt. Zusätzlich wurden Dashboard, Kalender, Challenges und Pollen an eine gemeinsame Workspace-Metrik angepasst: gleiche linke/rechte Innenränder, gleiche maximale Inhaltsbreite und einheitliche Titelhöhe nach Pollen-Vorbild. Keine Änderung an Login, Firebase, Datenbank-Sync, Push, Kalenderdaten oder Challenge-Logik.
- Ab Version `0.1.0061`: Einstellungen nutzen dieselbe Workspace-Metrik wie Pollen, Dashboard, Kalender und Challenges: identische Titelhöhe, linke/rechte Innenränder, maximale Inhaltsbreite und mobile Außenabstände. Die Einstellungen bleiben weiterhin ein eigenständiger Workspace; Schalter, Sync-Regeln, Login, Firebase, Push, Kalenderdaten und Challenge-Logik bleiben unverändert.
- Ab Version `0.1.0063`: Die Kalenderansicht nutzt nur noch den Premium-Kalender-Workspace. Die alte obere Kalender-Steuerleiste, das native Monatsraster unterhalb der Premium-Karten, die Mini-Monatskarte und die Kategorien-&-Filter-Karte werden ausgeblendet. Tagesauswahl und Terminanzeige aktualisieren direkt innerhalb des Premium-Workspaces, ohne auf die alte Kalenderansicht umzuschalten. Kalenderdaten, Google-Termine, Öffnen, Speichern, Löschen und WhatsApp/ICS-Teilen bleiben unverändert.

- Ab Version `0.1.0065`: Kalender zeigt wieder den kleinen Monatskalender rechts neben der Tagesagenda, entfernt aber weiterhin das alte native Monatsraster, Kategorien-&-Filter und Plus-/FAB-Buttons. Beim Öffnen startet der Premium-Kalender wieder auf dem echten heutigen Tag; Tagesklicks aktualisieren nur den Premium-Workspace. Challenges nutzen auf Desktop wieder die volle Pollen-Workspace-Breite mit Hero, Punkte-Kalender, Aufgaben und Rangliste. Dashboard entfernt den rechten Begrüßungstext, bündelt Wetter/Pollen/Urlaub/Friseur/Termine/Challenges in ruhige Schnellinfo-Karten und behält Kalender-, Friseur-, Wetter- und Pollen-Aktionen bei. Keine Änderung an Login, Firebase, Sync, Push, Datenmodell oder Kalenderdatenlogik.
- Ab Version `0.1.0067`: Kalender-Premium zeigt den integrierten „Termin hinzufügen“-Button wieder direkt in der Tagesagenda, ohne den alten Floating-Plusbutton zu reaktivieren. Die rechte Mini-Monatskarte wird auf Desktop stabil eingeblendet; mobil bleibt sie bewusst ausgeblendet. Kalender startet weiterhin auf dem echten heutigen Tag und Tagesklicks ändern nur den Premium-Workspace. Keine Änderung an Login, Firebase, Sync, Push oder Kalenderdatenlogik.

- Ab Version `0.1.0068`: Die Challenge-Hero-Kachel ist nach Pollen-Vorbild bereinigt: Gruppen-Ziel und Fortschrittsbalken stehen links, die bisherigen Ziel-/Heute-Chips wurden entfernt, Abzeichen werden rechts in der Hero-Kachel klickbar angezeigt und nicht mehr als eigene Zeile in „Heutige Aufgaben“ eingeblendet. „Heute zurücksetzen“ sitzt jetzt in der Karte „Heutige Aufgaben“. Die separaten Hero-Metrik-/Motivationskarten bleiben entfernt. Challenge-Logik, Punkte, Auto-Challenges, Sync, Firebase, Login und Kalenderdaten bleiben unverändert.
- Ab Version `0.1.0072`: Kalender-Premium zeigt die Monatsübersicht mit Monats- und Jahresauswahl. Die Monatskarte bleibt auf Desktop rechts neben der Tagesagenda und ist mobil ebenfalls sichtbar. Die Tagesagenda lädt beim Öffnen stabil nach, Terminzeilen öffnen weiterhin per Klick auf die Zeile, zeigen aber keine separaten „Öffnen“- oder „WhatsApp teilen“-Buttons mehr. „Termin hinzufügen“ sitzt fest im Footer der Tagesagenda-Karte. Keine Änderung an Login, Firebase, Sync, Push oder Kalenderdatenlogik.
- Ab Version `0.1.0073`: Challenge-Hero bleibt nach Pollen/Dashboard-Logik aufgebaut: Gruppen-Ziel und Fortschritt links, kompakte klickbare Abzeichen-/Statuspunkte rechts. Die globale Kopf-Aktion „Heute zurücksetzen“ ist entfernt; Zurücksetzen bleibt nur in „Heutige Aufgaben“. Rangliste blendet „Anfeuern vorgeschlagen“ aus, individuelle Anfeuern-Buttons bleiben erhalten, Aufgaben/Rangliste bleiben scrollbar und höhengleich. Pollen zeigt statt 7-Tage-Ausblick nur noch einen 5-Tage-Ausblick und lässt fehlende API-Leerzeilen weg. Keine Änderung an Challenge-Punkten, Abzeichen-Logik, Firebase, Sync, Login oder Kalenderdaten.
- Ab Version `0.1.0071`: Kalender-Hero bleibt unabhängig von der ausgewählten Woche immer auf dem echten heutigen Tag. Die Wochen-/Monatsauswahl aktualisiert nur Tagesagenda und Mini-Monatskalender; der Mini-Monatskalender bleibt auf Desktop rechts sichtbar. Dashboard benennt „Termine & Tracker“ in „Termine“ um, entfernt die Termine-Zeile aus der Hero-Übersicht, zeigt eine feste Heute-Zeile („Heute keiner vorhanden“ oder heutiger Termin) plus nächste relevante Einträge und öffnet Urlaub wieder über die Urlaubsübersicht. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten oder Challenge-Logik.
- Ab Version `0.1.0070`: Challenge-Hero zeigt Abzeichen kompakt nur noch als „aktiv / gesamt“ ohne große Icon-Zeile. „Anfeuern vorgeschlagen“ wurde aus der Rangliste entfernt; individuelle Anfeuern-Buttons bleiben erhalten. Heutige Aufgaben und Rangliste werden auf Desktop in der gleichen Grid-Zeilenhöhe gestreckt. Keine Änderung an Challenge-Punkten, Abzeichen-Logik, Sync, Login, Firebase oder Kalenderdaten.
- Ab Version `0.1.0069`: Dashboard-Hero wurde nach Pollen-Vorbild bereinigt: die kleinen Status-Pills sitzen nicht mehr unter der Begrüßung, sondern als klickbare Übersicht rechts in der großen Hero-Kachel. Die separate Challenges-Schnellkarte wurde entfernt; offene Challenges werden in der Aufgabenkarte angezeigt. Der Wetter-7-Tage-Ausblick im Dashboard wurde entfernt. Die Termine-&-Tracker-Karte zeigt mindestens die nächsten relevanten Einträge inklusive Kalender, Friseur und Urlaub. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik.
- Ab Version `0.1.0066`: Horizontale und vertikale Scrollpositionen bleiben bei mobilen Auswahlaktionen stabil. Pollen-Allergieprofile, Symptom-Auswahl und Settings-Kategorien erfassen vor dem Rendern ihre Scrollposition und stellen sie danach wieder her; automatische `scrollIntoView`-Sprünge in den Einstellungen wurden entfernt. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik.

- Ab Version `0.1.0059`: Der Pollen-7-Tage-Ausblick unterscheidet echte 0 %-Werte von fehlenden API-Daten. Tage oder einzelne Pollenwerte ohne geladene API-Werte werden nicht mehr als 0 % dargestellt, sondern als „Keine API-Daten“ markiert; zusätzlich wird angezeigt, wenn weniger als 7 Tage belastbar geladen wurden. Keine Änderung an Login, Firebase, Sync, Push oder Kalenderlogik.
- Ab Version `0.1.0058`: Einstellungen nutzen nur noch den eigenständigen Workspace und werden beim Wechsel zu Dashboard, Kalender, Challenges oder Pollen hart ausgeblendet. Die Settings-Navigation enthält keine doppelten aktiven Kategorien mehr; der Detailbereich wird direkt über die linken Kategorie-Karten gesteuert. Allgemeine Side-Panels wurden optisch an den Settings-Kartenstil angepasst, ohne Einstellungen wieder als Overlay zu öffnen. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik.

- Ab Version `0.1.0074`: Pollen blendet sichtbare Scrollbars im eigenen Workspace aus. Challenges wurden visuell an die Pollen-/Dashboard-Hero-Logik angeglichen: die Hero-Kachel zeigt rechts kompakte klickbare Statuspunkte, Aufgaben/Rangliste bleiben auf Desktop sichtbar, mobile Ansicht stapelt Hero, Punkte-Kalender, Aufgaben und Rangliste sauber. Interne Challenge-Punkte, Abzeichen, Sync, Login, Firebase und Kalenderdaten bleiben unverändert.

- Ab Version `0.1.0075`: Einstellungen zeigen im Kopf keinen „Alles gespeichert“-Status mehr; der Gesundheitsstatus ist nicht klickbar und zeigt direkt wie viele App-Prüfungen korrekt laufen. Challenges entfernen die globale Kopf-Aktion „Heute zurücksetzen“ und den „Heute aktiv“-Badge, stabilisieren die Hero-Kachel gegen Überlagerungen und lassen Reset nur in „Heutige Aufgaben“. Pollen benennt den Bereich zu „5-Tages-Ausblick“ um. Dashboard-Termine sind bei „Heute keiner vorhanden“ optisch deaktiviert und nicht klickbar. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik.


- Ab Version `0.1.0081`: Challenge-Hero erhielt einen CSS-Hard-Reset, weil ältere Challenge-Layout-Regeln bei Browser-Zoom/Desktop-Skalierung weiter griffen. Die Hero-Kachel nutzt nun fest die Pollen-Struktur: links Gruppenziel und Fortschritt, rechts rahmenlose Statuszeilen; Punkte-Kalender, Aufgaben und Rangliste werden explizit als eigene Grid-/Flex-Blöcke darunter gesetzt, ohne Überlagerung. Keine Änderung an Challenge-Punkten, Sync, Firebase, Login oder Kalenderdaten.
- Ab Version `0.1.0078`: Challenge-Hero final nach Pollen-Struktur stabilisiert. Die rechte Hero-Spalte nutzt kompakte Statuszeilen; nur „Abzeichen“ ist klickbar und öffnet das Abzeichen-Panel, die übrigen Statuspunkte sind reine Anzeigen. Desktop-Überlagerungen zwischen Hero und Punkte-Kalender wurden durch klare Grid-Spalten und Layering entfernt; Rangliste bleibt sichtbar. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten oder Challenge-Logik.

- Ab Version `0.1.0083`: Pollen-Profilkarten wurden strukturell repariert (korrekt geschlossene Buttons) und Layout-Rettungsregeln setzen Allergieprofil, Symptome, 24h-Ausblick und 5-Tages-Ausblick wieder in stabile Karten. Challenges erhalten einen finalen Layout-Rescue für Desktop-Skalierung: Hero, Punkte-Kalender, Aufgaben und Rangliste liegen nicht mehr übereinander. Keine Änderung an Pollen-API, Challenge-Punkten, Sync, Firebase, Login oder Kalenderdaten.

- Ab Version `0.1.0084`: Der Pollen-24-Stunden-Ausblick nutzt eine kompakte Inline-Struktur: die drei Erkenntnisse oben und die vier Tagesbereiche unten stehen innerhalb einer Vollbreitenkarte nebeneinander statt als einzelne gestapelte Karten. Mobil bleibt die Karte über die volle Inhaltsbreite sichtbar und behält kompakte Spalten. Keine Änderung an Pollen-API, Symptom-Speicherung, Login, Firebase, Sync oder Kalenderlogik.

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
- Die sichtbare App-Version wird bei jeder Code-Anpassung erhöht und diese Änderung wird hier dokumentiert. Aktuelle Version: `0.1.0157`.
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

| 2026-06-06 | Version auf `0.1.0081` erhöht; Pollen-Symptomkarte an Allergieprofil/5-Tages-Ausblick angeglichen und Überschrift außerhalb der Karte platziert. Keine Änderung an Pollen-API, Symptom-Speicherung, Sync, Login, Firebase oder Kalenderlogik. | ChatGPT |
| 2026-06-06 | Version auf `0.1.0084` erhöht; Pollen-24h-Ausblick als kompakte Inline-Karte mit oberen Erkenntnissen und unteren Tagesbereichen nebeneinander stabilisiert. Keine Änderung an Pollen-API, Symptom-Speicherung, Sync, Login, Firebase oder Kalenderlogik. | ChatGPT |
| 2026-06-05 | Version auf `0.1.0072` erhöht; Kalender-Monatsübersicht erhält Monats-/Jahresauswahl, bleibt Desktop rechts und mobil sichtbar. Tagesagenda lädt stabil, Terminzeilen sind weiterhin klickbar, separate Öffnen-/WhatsApp-Buttons wurden entfernt und „Termin hinzufügen“ ist fest im Tagesagenda-Footer. Keine Änderung an Login, Firebase, Sync, Push oder Kalenderdatenlogik. | ChatGPT |
| 2026-06-05 | Version auf `0.1.0071` erhöht; Kalender-Hero auf echten heutigen Tag fixiert, Mini-Monatskalender rechts wieder sichtbar gehalten, Dashboard-Termine bereinigt und Urlaub-Klick wieder auf Urlaubsübersicht geführt. | ChatGPT |
| 2026-06-05 | Version auf `0.1.0070` erhöht; Challenge-Abzeichen im Hero kompakter als aktiv/gesamt dargestellt, „Anfeuern vorgeschlagen“ entfernt und Aufgaben/Rangliste-Höhe auf Desktop angeglichen. | ChatGPT |
| 2026-06-05 | Version auf `0.1.0069` erhöht; Dashboard-Hero nach Pollen-Vorbild bereinigt, klickbare Übersichtspunkte rechts in der Hero-Kachel, Challenges-Schnellkarte und Wetter-7-Tage-Ausblick entfernt, Aufgabenkarte zeigt offene Challenges und Termine-&-Tracker zeigt nächste relevante Einträge. | ChatGPT |
| 2026-06-05 | Version auf `0.1.0067` erhöht; Kalender-Premium-Bedienbarkeit korrigiert: integrierter Termin-hinzufügen-Button wieder sichtbar, rechter Mini-Monatskalender auf Desktop stabil eingeblendet, alter Floating-Plusbutton bleibt entfernt. Keine Änderung an Login, Firebase, Sync, Push oder Kalenderdatenlogik. | ChatGPT |
| 2026-06-05 | Version auf `0.1.0066` erhöht; mobile Scrollpositionen bei Pollen-Auswahl und Settings-Kategorien stabilisiert, automatische Auswahl-Sprünge entfernt. Keine Änderung an Login, Firebase, Sync, Push, Pollen-API oder Kalenderlogik. | ChatGPT |
| 2026-06-05 | Version auf `0.1.0065` erhöht; Kalender-Mini rechts wieder eingeblendet, altes Monatsraster/Kategorien/Plus entfernt, Kalender startet auf heutigem Tag, Challenges-Breite und Dashboard-Schnellkarten inklusive Friseur bereinigt. Keine Änderung an Login, Firebase, Sync, Push oder Datenmodell. | ChatGPT |
| 2026-06-05 | Version auf `0.1.0059` erhöht; Pollen-Ausblick zeigt fehlende API-Daten jetzt explizit statt falscher 0 %-Werte und markiert, wenn weniger als 7 Tage belastbar geladen wurden. Keine Änderung an Login, Firebase, Sync, Push oder Kalenderlogik. | ChatGPT |
| 2026-06-05 | Version auf `0.1.0058` erhöht; Einstellungen bleiben beim View-Wechsel nicht mehr im unteren Bereich sichtbar, die Settings-Kategorien wurden entdoppelt und allgemeine Side-Panels an den Settings-Kartenstil angepasst. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik. | ChatGPT |
| 2026-06-05 | Version auf `0.1.0057` erhöht; Einstellungen öffnen als eigenständiger Workspace im Hauptbereich statt als Side-Panel über dem Dashboard. Settings-Navigation, Detailbereich und mobile gestapelte Ansicht bleiben erhalten. Keine Änderung an Schaltern, Sync-Regeln, Push, Kalenderoptionen, Challengeoptionen, Login, Firebase oder Datenmodell. | ChatGPT |
| 2026-06-04 | Version auf `0.1.0052` erhöht; Challenge-Desktop-Ansicht im Premium-Stil aufgebaut: Gruppen-Ziel als Hero, drei Statuskarten, Punkte-Kalender darunter und Aufgaben/Team als zwei große Spalten. Mobile Ansicht bleibt gestapelt und übersichtlich. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik. | ChatGPT |
| 2026-06-04 | Version auf `0.1.0051` erhöht; mobilen Pollen-7-Tage-Ausblick verdichtet und lesbarer gemacht, Mini-Balken mobil wieder sichtbar, Zeilentrenner klarer. Mobile Bottom-Bar ohne untere Kartenkante, Hellmodus-Hintergrund beruhigt und Desktop-Seitenleiste mit subtiler Trennlinie versehen. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik. | ChatGPT |

| 2026-06-04 | Version auf `0.1.0050` erhöht; Desktop-App-Shell für Dashboard, Kalender, Challenges und Pollen vollflächig gemacht. Der Hintergrund liegt auf der gesamten App statt getrennt im Content, die seitliche Navigation hat keine harte rechte Border und keinen Schatten mehr. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik. | ChatGPT |

| 2026-06-04 | Version auf `0.1.0049` erhöht; mobile Bottom-Bar stabilisiert, damit aktive Reiter nicht mehr hüpfen. Avatar-Online-/Offline-Status wieder sichtbar. Challenge-Header und „Heute zurücksetzen“ ruhiger an den Pollen-Stil angepasst; Hintergrund schließt sauberer an die App-Bar an. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik. | ChatGPT |

| 2026-06-04 | Version auf `0.1.0048` erhöht; Pollen-7-Tage-Ausblick vereinfacht: Titel ohne Profilzusatz, einheitliche ruhige Chip-Darstellung für Einzel- und Mehrfachauswahl und mobile Sichtbarkeit der ausgewählten Profile korrigiert. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik. | ChatGPT |
| 2026-06-04 | Version auf `0.1.0047` erhöht; mobile Bottom-Bar für Dashboard, Kalender, Challenges und Pollen ohne sichtbare Abschlusskante/Borders vereinheitlicht. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API, Challenge-Logik oder Navigation. | ChatGPT |
| 2026-06-04 | Version auf `0.1.0046` erhöht; Pollen-Hero zeigt keine doppelte Gräser-Kachel mehr. Der 7-Tage-Ausblick zeigt bei Mehrfachauswahl die ausgewählten Pollen als klare Chips pro Tag. Challenge-Kopf wurde an die Pollen-Kopfzeile angeglichen; „Heute zurücksetzen“ bleibt rechts als kleine Aktion. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik. | ChatGPT |

| 2026-06-04 | Version auf `0.1.0045` erhöht; gemeinsame App-Navigation ergänzt. Dashboard, Kalender, Challenges und Pollen nutzen auf Desktop dieselbe seitliche App-Bar und mobil dieselbe Bottom-Bar. Challenge-Header und „Heute zurücksetzen“ wurden an Pollen angeglichen. Kalender-Steuerung bleibt sichtbar. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten oder Challenge-Logik. | ChatGPT |

| 2026-06-04 | Version auf `0.1.0044` erhöht; mobile Pollen-UI feinjustiert: relevante Werte in der großen Kachel werden ohne Zusatz-Kachel und ohne Label als kompakte Werte nebeneinander angezeigt, Werte werden erst über 1 % berücksichtigt und die untere mobile Leerfläche wurde reduziert. Keine Änderung an Pollen-Datenlogik, Wetter-API, Login, Firebase, Sync, Push oder Kalenderlogik. | ChatGPT |

| 2026-06-04 | Version auf `0.1.0043` erhöht; Challenge-UI feinjustiert: Pollen-artige auswählbare Navigation auf Desktop und Mobil, Hellmodus wiederhergestellt, grüner Hintergrundakzent beruhigt, keine Banner mehr beim Erledigen/Rückgängig. Anfeuern-Banner bleibt erhalten. Keine Änderung an Challenge-Datenmodell, Auto-Challenges, Punkte-Logik, Firebase, Sync, Push, Login oder Kalenderlogik. | ChatGPT |
| 2026-06-04 | Version auf `0.1.0041` erhöht; Challenge-Ansicht optisch an den Pollen-Stil angeglichen. Desktop und Mobile nutzen nun dunklen View-Hintergrund, ruhige Premium-Karten, Gruppen-Ziel als Hero-Karte, Pollen-artige Abstände und stabile mobile Reihenfolge. Funktionen und Challenge-Logik bleiben unverändert. | ChatGPT |
| 2026-06-04 | Version auf `0.1.0042` erhöht; Pollen-UI feinjustiert: mobile Scrollbar ausgeblendet, Allergieprofil-Auswahl im Hellmodus klarer sichtbar, relevante Pollenwerte ab 1 % direkt in der großen Kachel sichtbar und der schwarze untere Hellmodus-Bereich entfernt. Pollen-Datenlogik, Wetter-API, Login, Sync, Firebase und Push bleiben unverändert. | ChatGPT |

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


## Version 0.1.0013
- Die sichtbare App-Version wurde auf `0.1.0013` erhöht.
- Der Pollen-Reiter wurde optisch und strukturell deutlich näher an das Referenzbild gebracht: dunkler, ruhiger Apple-/Notion-Stil mit Hero-Karte, drei rechten Metrik-Karten, Allergieprofil, Symptome-heute-Karte und gefiltertem 7-Tage-Ausblick.
- Auf Desktop nutzt der Pollen-Reiter jetzt eine linke Seitenleiste statt der oberen Hauptleiste. Rechts oben bleibt nur der kontextuelle Button `Pollen-Settings`.
- Klicks auf Allergieprofil-Karten öffnen kein Panel mehr. Stattdessen filtern sie den 7-Tage-Ausblick und die obere Hauptkarte nach der gewählten Pollenart.
- Die Symptome-heute-Karte wurde auf ein ruhigeres Zwei-Spalten-Layout mit Notizkarte umgebaut. Speicherung bleibt lokal und optional via vorhandenen Firebase-Sync.
- Es wurden keine Auto-Starts nach Login ergänzt, kein zusätzlicher Push-Dialog eingeführt und keine Firebase-Initialisierung erzwungen.


## Version 0.1.0016
- Die sichtbare App-Version wurde auf `0.1.0016` erhöht.
- Pollen wurde weiter an die Referenz angenähert: Bearbeiten-Aktionen im Allergieprofil, in Symptome heute und die Auswahl-Aktion im 7-Tage-Ausblick wurden entfernt.
- Die Pollen-Ansicht wurde ruhiger gestaltet: reduzierte Glows, harmonischere Flächen, weniger visuelles Rauschen und dezentere High-/Medium-Farbflächen.
- Pollen- und Symptom-Icons wurden überarbeitet, um näher am gewünschten Symbolstil zu liegen.
- Keine Änderung an Login, Auto-Start, Firebase-Start oder Push-Dialogen.


## Version 0.1.0017
- Die sichtbare App-Version wurde auf `0.1.0017` erhöht.
- Die linke Desktop-Seitenleiste im Pollen-Reiter wurde oben bereinigt, damit das App-Icon ruhiger und korrekt positioniert wirkt.
- Der Pollen-Hintergrund und die Shell-Ausrichtung wurden beruhigt; harte Kanten und unruhige Übergänge wurden reduziert.
- Interaktionen in `Symptome heute` bleiben direkt klickbar, zeigen aber keine Speicher- oder Sync-Toast-Meldungen mehr.
- Keine Änderung an Login, Auto-Start, Firebase-Start oder Push-Dialogen.


## Version 0.1.0022
- Die sichtbare App-Version wurde auf `0.1.0022` erhöht.
- Für den Pollen-Reiter wurde ein eigener Icon-Pass umgesetzt. Pollen-Icons und Symptom-Icons wurden stilistisch vereinheitlicht und hochwertiger ausgearbeitet.
- Die Symbolsprache im Allergieprofil, in der Hero-Karte und bei `Symptome heute` ist jetzt ruhiger, größer und konsistenter.
- Keine Änderung an Login, Auto-Start, Firebase-Start, Kalenderlogik oder Push-Dialogen.


## Version 0.1.0023
- Die sichtbare App-Version wurde auf `0.1.0023` erhöht.
- Im Pollen-Hero bleibt die Unterzeile mit den aktiven Pollenarten auf Desktop wieder in einer Zeile.
- Der Footer-Text `Pollenindex` wurde aus der Belastung-heute-Karte entfernt, da die Prozentanzeige bereits selbsterklärend ist.
- Die aktiven Symptom-Farben wurden korrigiert: `Mittel` nutzt jetzt deutlich Gelb/Orange und `Stark` Rot statt blasser Gelbtöne.
- Keine Änderung an Login, Auto-Start, Firebase-Start, Kalenderlogik oder Push-Dialogen.


## Version 0.1.0024
- Die sichtbare App-Version wurde auf `0.1.0024` erhöht.
- Der Pollen-Reiter füllt den Desktop-Contentbereich jetzt vollständig mit dem eigenen dunklen Hintergrund, damit oben und links keine sichtbaren Abstandskanten mehr entstehen.
- Die Symptom-Labels `Niesen`, `Augen`, `Nase` und `Atmung` sind wieder klar lesbar und erhalten mehr feste Label-Breite.
- Keine Änderung an Login, Auto-Start, Firebase-Start, Kalenderlogik, Sync oder Push-Dialogen.


## Version 0.1.0025
- Die sichtbare App-Version wurde auf `0.1.0025` erhöht.
- Einstellungen → App enthält jetzt die Karte `Darstellung` mit den Optionen `System`, `Hell` und `Dunkel`.
- Die Darstellung wird lokal unter `change_v1_theme` gespeichert und bleibt kompatibel mit dem bestehenden `change_v1_dark_mode`.
- Die globale Theme-Logik setzt weiterhin `data-theme=light|dark`; bei `System` folgt Change der Geräte-/Browser-Einstellung.
- Der Pollen-Reiter unterstützt jetzt zusätzlich einen eigenen ruhigen Hellmodus. Der bestehende Darkmode bleibt erhalten.
- Keine Änderung an Login, Auto-Start, Firebase-Start, Datenbank-Sync, Kalenderlogik oder Push-Dialogen.


## Version 0.1.0028
- Die sichtbare App-Version wurde auf `0.1.0028` erhöht.
- Im Pollen-Allergieprofil werden Belastungswerte jetzt ohne Kommazahlen angezeigt und kaufmännisch auf ganze Werte gerundet, passend zur Belastungsanzeige.
- Die Änderung betrifft nur die Anzeige im Pollen-Reiter; Pollenberechnung, Forecast, Login, Sync, Firebase und Push bleiben unverändert.


## Version 0.1.0030
- Die sichtbare App-Version wurde auf `0.1.0030` erhöht.
- Der Fehler `readEditMode is not defined` im Pollen-Reiter wurde behoben.
- Die Glocke oben rechts im Pollen-Reiter öffnet jetzt wieder die normale globale Benachrichtigungsübersicht statt Pollen-Settings.
- Das Pollen-Settings-Icon nutzt dieselbe Gear-Formensprache wie die globale Einstellung unten links.
- Symptom-Klicks und Notizänderungen bleiben lokal und lösen keinen automatischen Firebase-Write pro Interaktion mehr aus. Damit werden Firestore-Quota-Probleme durch schnelle Symptomklicks vermieden.
- Kein automatischer Push-Dialog, kein Firebase-Auto-Start und keine Änderung an Kalenderlogik oder Login.


## Version 0.1.0032
- Die sichtbare App-Version wurde auf `0.1.0032` erhöht.
- Die Glocke im Pollen-Header zeigt jetzt die Anzahl der globalen Benachrichtigungen wie die normale App-Glocke.
- Glocke und kontextueller Button wurden im Pollen-Header auf eine einheitliche Höhe gebracht.
- Das Wording `Pollen-Settings` wurde zu `Allergieprofil` geändert.
- Die Glocke öffnet weiterhin die globale Benachrichtigungsübersicht. Es wird kein automatischer Push-Dialog ausgelöst.
- Keine Änderung an Login, Firebase-Auto-Start, Kalenderlogik oder Datenmodell.


## Version 0.1.0036
- Die sichtbare App-Version wurde auf `0.1.0036` erhöht.
- Der globale Hell-/Dunkelmodus-Button wurde aus der Kopfzeile entfernt, weil die Darstellung jetzt zentral unter `Einstellungen → App → Darstellung` gesteuert wird.
- Im Pollen-Desktop-Layout wurde der obere Button `Allergieprofil` entfernt; das Allergieprofil bleibt als Inhalt auf der Seite sichtbar.
- Die Pollen-Mobile- und Desktop-Versionen bleiben getrennt dokumentiert und werden weiterhin getrennt über responsive Regeln geführt.
- Keine Änderung an Login, Auto-Start, Firebase-Start, Kalenderlogik oder Push-Dialogen.


## Version 0.1.0040
- Die sichtbare App-Version wurde auf `0.1.0040` erhöht.
- Das mobile Pollen-Layout wurde nach dem App-orientierten Design stabilisiert: Hero-Reihenfolge korrigiert, Kartenhöhe reduziert, Allergieprofil kompakter und 7-Tage-Ausblick bündiger.
- Im Pollen-Hellmodus wurden Tabellenlinien und Forecast-Balken deutlicher gemacht.
- Keine Änderungen an Login, Firebase-Autostart, Sync-Start, Push-Permission-Dialog oder Kalenderlogik.


## Version 0.1.0041
- Die sichtbare App-Version wurde auf `0.1.0041` erhöht.
- Die Challenge-Ansicht wurde optisch an den Pollen-Stil angeglichen: dunkler View-Hintergrund, ruhige radiale Akzente, Premium-Karten, Gruppen-Ziel als Hero-Karte, Punkte-Kalender als volle Kartenzeile und mobile Abstände wie im Pollen-Reiter.
- Bestehende Challenge-Funktionen bleiben erhalten: Tagesaufgaben, optionale Punkte, Erledigen, Rückgängig, Heute zurücksetzen, Punkte-Kalender, Rangliste, Spieler-Panel, Anfeuern, Auto-Challenges und Sync-Logik.
- Keine Änderung an Challenge-Datenmodell, Auto-Challenge-Generierung, Firebase-Autostart, Datenbank-Sync-Start, Push-Permission-Dialog, Kalenderlogik oder Login.

## Version 0.1.0042
- Die sichtbare App-Version wurde auf `0.1.0042` erhöht.
- Im mobilen Pollen-Reiter wird keine rechte Scrollbar mehr angezeigt.
- Pollen-UI-Feinschliff ab Version `0.1.0042` liegt ergänzend in `features/pollen/pollenUiPolish.css`; bestehende Pollen-Datenlogik bleibt in `features/pollen/pollenView.js`.
- Das ausgewählte Allergieprofil ist im Hellmodus durch grüne Tönung, stärkeren Rahmen und dezenten Ring klar erkennbar.
- Die große Pollen-Kachel zeigt jetzt relevante heutige Werte ab 1 % als kompakte Chips direkt unter der Hauptaussage.
- Der Pollen-Hellmodus nutzt den unteren Bereich sauber weiter; der dunkle Balken unter dem Inhalt wird durch einen hellen App-Hintergrund und eine passende helle Bottom-Navigation ersetzt.
- Keine Änderung an Pollen-Datenlogik, Wetter-API, Firebase-Autostart, Datenbank-Sync-Start, Push-Permission-Dialog, Kalenderlogik oder Login.

## Version 0.1.0043
- Die sichtbare App-Version wurde auf `0.1.0043` erhöht.
- Challenge-Desktop nutzt nun die gleiche seitliche auswählbare Navigation wie Pollen.
- Challenge-Mobile nutzt nun die gleiche aktive Bottom-Navigation wie Pollen.
- Der Hellmodus für Challenges wurde wiederhergestellt.
- Der grüne Challenge-Hintergrundakzent wurde reduziert, damit er näher am ruhigen Pollen-Stil bleibt.
- Erledigen und Rückgängig zeigen keine Toast-/Banner-Meldung mehr.
- Anfeuern bleibt unverändert und zeigt weiterhin Banner über die bestehende Anfeuern-Logik.
- Keine Änderung an Challenge-Datenmodell, Auto-Challenge-Generierung, Punkte-Logik, Firebase-Autostart, Datenbank-Sync-Start, Push-Permission-Dialog, Kalenderlogik oder Login.

## Version 0.1.0044
- Die sichtbare App-Version wurde auf `0.1.0044` erhöht.
- Mobile Pollen-Ansicht: Die relevanten Werte in der großen Kachel werden nicht mehr als eigene Zusatz-Kachel dargestellt. Das Label „Aktuell ab 1 %“ wird mobil ausgeblendet; die Werte stehen kompakt nebeneinander.
- Relevante Pollenwerte werden für diese Anzeige erst bei Werten über 1 % berücksichtigt.
- Die untere mobile Leerfläche im Pollen-Reiter wurde reduziert, damit die Ansicht die verfügbare Fläche besser nutzt.
- Keine Änderung an Pollen-Datenmodell, Wetter-API, Login, Firebase-Autostart, Datenbank-Sync-Start, Push-Permission-Dialog, Kalenderlogik oder Challenge-Logik.


## Version 0.1.0045
- Die sichtbare App-Version wurde auf `0.1.0045` erhöht.
- Neue zentrale UI-Datei `styles/appShell.css` vereinheitlicht Desktop-Sidebar und mobile Bottom-Bar für Dashboard, Kalender, Challenges und Pollen.
- Challenges-Header wurde an Pollen angepasst; „Heute zurücksetzen“ sitzt als ruhige Header-Aktion statt als störender Balken.
- Die Kalender-Steuerung bleibt im Desktop-Sidebar-Modus als eigene Kopfleiste bedienbar.
- Keine Änderung an Challenge-Datenmodell, Auto-Challenges, Punkte-Logik, Firebase, Datenbank-Sync, Push-Permission-Dialog, Login oder Kalenderdaten.


## Version 0.1.0046
- Die sichtbare App-Version wurde auf `0.1.0046` erhöht.
- Pollen: Die doppelte Belastungs-Kachel unter dem Hauptschriftzug wurde entfernt; der Hauptschriftzug reicht als Status.
- Pollen: Der 7-Tage-Ausblick zeigt bei mehreren ausgewählten Allergieprofilen alle ausgewählten Pollen pro Tag als Chips mit Prozentwerten, damit nicht nur der höchste Wert sichtbar ist.
- Challenges: Die Kopfzeile wurde an Pollen angeglichen; keine breite Hintergrundleiste mehr, „Heute zurücksetzen“ bleibt als kleine Aktion rechts.
- Keine Änderung an Pollen-Datenlogik, Wetter-API, Challenge-Logik, Firebase, Sync, Push, Login oder Kalenderlogik.

## Version 0.1.0047
- Die sichtbare App-Version wurde auf `0.1.0047` erhöht.
- Die mobile Bottom-Bar wurde für Dashboard, Kalender, Challenges und Pollen ohne sichtbare Abschlusskante/Borders vereinheitlicht.
- Bestehende Navigation, Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API und Challenge-Logik bleiben unverändert.


## Version 0.1.0048
- Die sichtbare App-Version wurde auf `0.1.0048` erhöht.
- Der Pollen-7-Tage-Ausblick zeigt im Abschnittstitel nur noch `7-Tage-Ausblick`, ohne `Gräser`, `3 Profile` oder andere Zusatztexte.
- Einzel- und Mehrfachauswahl verwenden nun dieselbe ruhige Chip-Darstellung pro Tag. Dadurch wirkt Desktop weniger aufdringlich und auf Mobil bleiben die ausgewählten Pollenwerte sichtbar.
- Bestehende Pollen-Datenlogik, Wetter-API, Login, Firebase, Sync, Push, Kalenderdaten und Challenge-Logik bleiben unverändert.

## Version 0.1.0049
- Die sichtbare App-Version wurde auf `0.1.0049` erhöht.
- Die mobile Bottom-Bar nutzt einen stabilen aktiven Zustand ohne Margin-Wechsel, damit Icons und Labels beim Tippen nicht mehr hüpfen.
- Der Profilavatar zeigt Online-/Offline-Status wieder sichtbar über Ring und kleinen Statuspunkt.
- Der Challenge-Header wurde beruhigt; `Heute zurücksetzen` sitzt als kleine Header-Aktion innerhalb der Content-Breite.
- Der Challenge-Hintergrund wurde so angepasst, dass er sauberer an die gemeinsame App-Bar anschließt.
- Keine Änderung an Challenge-Datenmodell, Challenge-Logik, Pollen-Datenlogik, Firebase-Autostart, Sync-Start, Push-Permission-Dialog, Kalenderlogik oder Login.


## Version 0.1.0050
- Die sichtbare App-Version wurde auf `0.1.0050` erhöht.
- Die Desktop-App-Shell nutzt für Dashboard, Kalender, Challenges und Pollen einen vollflächigen Hintergrund auf der gesamten App-Fläche.
- `#content` ist transparent, damit keine getrennte Hintergrundfläche mit sichtbarer Kante entsteht.
- Die seitliche Navigation hat im Hellmodus keine harte rechte Border und keinen Schatten mehr.
- Keine Änderung an Login, Firebase-Autostart, Sync-Start, Push-Permission-Dialog, Kalenderdaten, Pollen-API oder Challenge-Logik.

## Version 0.1.0051
- Die sichtbare App-Version wurde auf `0.1.0051` erhöht.
- Der mobile Pollen-7-Tage-Ausblick zeigt Datum, Werte-Chips und Mini-Balken wieder gemeinsam und nutzt klarere Zeilentrenner.
- Die mobile Ansicht endet ohne sichtbare untere Karten-Border an der gemeinsamen Auswahlleiste.
- Der Hellmodus-Hintergrund im Desktop wurde ruhiger gesetzt; die seitliche Auswahlbar hat wieder eine subtile Erkennungslinie.
- Keine Änderung an Navigation, Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik.



## Version 0.1.0052
- Die sichtbare App-Version wurde auf `0.1.0052` erhöht.
- Die Challenge-Desktop-Ansicht wurde in Richtung Premium-Zielbild angepasst: Hero-Karte für das Gruppen-Ziel, drei Statuskarten, Punkte-Kalender darunter und zwei klare Spalten für Heutige Aufgaben und Team.
- Die mobile Challenge-Ansicht bleibt gestapelt und übersichtlich.
- Keine Änderung an Challenge-Logik, Auto-Challenges, Sync, Firebase, Login, Push, Kalenderdaten oder Pollen-API.

## Version 0.1.0053
- Die sichtbare App-Version wurde auf `0.1.0053` erhöht.
- Kalender wurde im Premium-Stil vorbereitet: Hero/Termin-Übersicht, ruhige Kartenflächen und mobile Stapelung.
- Öffnen, Erstellen, Speichern, Löschen, Google-Termine und Teilen bleiben funktional unverändert.
- Keine Änderung an Login, Firebase-Autostart, Sync-Start, Push-Permission-Dialog oder Challenge-Logik.

## Version 0.1.0054
- Die sichtbare App-Version wurde auf `0.1.0054` erhöht.
- Dashboard nutzt einen Premium-Tages-Hub im gleichen Stil wie Kalender, Challenges und Pollen.
- Desktop zeigt Hero-Karte, Schnellinfos, heutige Termine, Aufgaben, Mitspieler und 7-Tage-Ausblick; mobil wird die Ansicht gestapelt und nutzt horizontale Schnellinfo-Karten.
- Keine Änderung an Kalender-, Challenge-, Wetter-/Pollen-, Firebase-, Sync-, Push- oder Login-Logik.

## Version 0.1.0055
- Die sichtbare App-Version wurde auf `0.1.0055` erhöht.
- Einstellungen wurden als Premium-Workspace im gleichen Kartenstil aufgebaut.
- Desktop zeigt Profil-/Statuskarte, Kategorie-Karten und rechts den Detailbereich; mobil wird die Ansicht gestapelt und die Kategorien bleiben horizontal bedienbar.
- Bestehende Schalter, Sync-Regeln, Push, Kalenderoptionen, Challengeoptionen und App-Gesundheitscheck bleiben funktional unverändert; es wird kein Auto-Start eingeführt.


## Version 0.1.0057
- Die sichtbare App-Version wurde auf `0.1.0057` erhöht.
- Fix: `dashboardModuleCount()` wurde in `features/settings/settingsPanel.js` ergänzt, damit die Premium-Einstellungen ohne ReferenceError öffnen.
- Keine Änderung an Login, Firebase, Sync, Push, Kalenderoptionen, Challengeoptionen oder Datenmodell.


## Änderung 0.1.0057
- Einstellungen öffnen nicht mehr als Side-Panel über dem Dashboard, sondern als eigenständiger Workspace im Hauptbereich.
- Settings-Navigation, Tabs und Detailbereich bleiben erhalten; Mobile bleibt gestapelt und scrollfähig.
- Keine Änderung an Login, Firebase, Sync, Push oder Kalenderlogik.

## Version 0.1.0058
- Die sichtbare App-Version wurde auf `0.1.0058` erhöht.
- Einstellungen werden beim Wechsel auf andere Reiter zuverlässig ausgeblendet.
- Settings-Navigation und Side-Panels wurden optisch und strukturell bereinigt.

| 2026-06-05 | Version auf `0.1.0060` erhöht; Pollen-Profilwechsel lädt nicht mehr neu und behält die Scrollposition. Dashboard, Kalender, Challenges und Pollen nutzen eine einheitliche Workspace-Metrik nach Pollen-Vorbild. | ChatGPT |
| 2026-06-05 | Version auf `0.1.0061` erhöht; Einstellungen nutzen dieselbe Pollen-Workspace-Metrik für Titelhöhe, Ränder, Inhaltsbreite und mobile Abstände. | ChatGPT |

- 2026-06-05 · v0.1.0064: Challenge-Gruppenzielkarte an Pollen-Hero angeglichen, Heute-Punkte/Teamziel/erreichte Punkte integriert und separate Anfeuern-Statuskarte entfernt. Dashboard-Buttons „Zu den Challenges“ und „Anfeuern vorgeschlagen“ entfernt. Keine Änderung an Challenge-Logik, Anfeuern-Funktion selbst, Login, Firebase, Sync oder Kalenderdaten.
- 2026-06-05 · v0.1.0063: Dashboard Health-Pills rechts oben entfernt; Wetter/Pollen-Funktionen liegen in den Dashboard-Karten. Challenge-Ansicht beim Öffnen stabilisiert: Gruppen-Ziel, Metriken und Punkte-Kalender werden sofort gerendert, alte Hintergrund-/Überlagerungseffekte werden vermieden. Keine Änderung an Login, Firebase, Sync oder Kalenderdaten.

| 2026-06-05 | Version auf `0.1.0068` erhöht; Challenge-Hero nach Pollen-Struktur bereinigt: Fortschrittsbalken links, Abzeichen klickbar rechts, Chips entfernt, „Heute zurücksetzen“ in die Aufgabenkarte verschoben. Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten oder Challenge-Logik. | ChatGPT |

| 2026-06-05 | Version auf `0.1.0075` erhöht; Settings-Kopf bereinigt, Gesundheitsstatus als reine Statusanzeige, Challenge-Hero ohne Überlagerung und ohne globale Reset-Aktion, Pollen-Titel zu 5-Tages-Ausblick, Dashboard-Termine ohne Heute-Termin deaktiviert. | ChatGPT |

| 2026-06-05 | Version auf `0.1.0078` erhöht; Challenge-Hero nach Pollen-Struktur final stabilisiert, rechte Statuspunkte bereinigt und nur Abzeichen klickbar gemacht. | ChatGPT |

| 2026-06-05 | Version auf `0.1.0079` erhöht; Pollen-24-Stunden-Ausblick an das ausgewählte Allergieprofil gekoppelt und eigene Pollen-Auswahl entfernt. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0090` erhöht; Challenge-Layout-Fix als letzte CSS-Ebene ergänzt, damit Gruppen-Ziel, Punkte-Kalender, Aufgaben und Rangliste lokal nicht mehr überlappen. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0091` erhöht; Mobile-Shell-Fix ergänzt, damit Bottom-Bar, Unterabstand und geschlossene Panels mobil sauber abschließen. | ChatGPT |
| 2026-06-06 | Version auf `0.1.0092` erhöht; Pollen-Typografie-Fix ergänzt, damit 24-Stunden-Ausblick und Abschnittsüberschriften ruhiger und einheitlicher wirken. | ChatGPT |

## Version 0.1.0092

- Die sichtbare App-Version wurde auf `0.1.0092` erhöht.
- Neue Datei `styles/pollenTypographyFix.css` ergänzt und in `index.html` nach `styles/mobileShellFix.css` eingebunden.
- Pollen-24-Stunden-Ausblick typografisch beruhigt: kompaktere Kennzahlen, kleinere Untertexte und keine Ellipsen bei Trend/Prozentwerten.
- Trendtexte wurden gekürzt: `Stabil`, `Steigend`, `Ruhiger`.
- Prozentwerte im 24-Stunden-Ausblick werden kompakter ohne Leerzeichen vor dem Prozentzeichen ausgegeben.
- Abschnittsüberschriften im Pollenbereich wurden vereinheitlicht: Allergieprofil, Symptome heute, 24-Stunden-Ausblick und 5-Tages-Ausblick nutzen dieselbe Schriftfamilie, Größe, Laufweite und Zeilenhöhe.
- Keine Änderung an Login, Firebase, Sync, Push, Pollenberechnung oder gespeicherten Symptomen.

## Version 0.1.0091

- Die sichtbare App-Version wurde auf `0.1.0091` erhöht.
- Neue Datei `styles/mobileShellFix.css` ergänzt und in `index.html` nach `features/challenges/challengesLayoutFix.css` eingebunden.
- Mobile Bottom-Bar für Dashboard, Kalender, Challenges und Pollen als feste Leiste stabilisiert.
- Doppelte mobile Unterabstände entfernt, damit oberhalb der Bottom-Bar keine große leere Fläche mehr entsteht.
- Mobile Scrollbars und der sichtbare Rest geschlossener Side-Panels werden ausgeblendet, damit rechts unten kein grauer Balken oder Panel-Rand stehen bleibt.
- Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik.

## Version 0.1.0090

- Die sichtbare App-Version wurde auf `0.1.0090` erhöht.
- Neue Datei `features/challenges/challengesLayoutFix.css` ergänzt und in `index.html` nach `styles/appShell.css` eingebunden.
- Challenge-Layout stabilisiert: Gruppen-Ziel, Punkte-Kalender, Heutige Aufgaben und Rangliste haben nun feste Grid-/Flex-Reihenfolge ohne Überlagerung.
- Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik.

## Version 0.1.0087

- Hellmodus für Kalender-Monatsübersicht, Kalender-Wochenleiste und Challenge-Punktekalender korrigiert.
- Texte, Tageszahlen, Auswahlzustände, Punkte und Steuerbuttons sind im Hellmodus wieder klar lesbar.
- Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik.

## Version 0.1.0086

- Pollen: 24-Stunden-Ausblick im Hellmodus kontrastreicher und ruhiger gestaltet.
- Pollen: 5-Tages-Ausblick nutzt geladene Tage stabil, ohne technische API-Platzhalter anzuzeigen.
- Pollen mobil: Forecast-Karte behält abgerundete Ecken und saubere Abstände zur Bottom-Navigation.
- Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten oder Pollen-API.


| 2026-06-06 | Version auf `0.1.0093` erhöht; Workspace-Konsistenz-Fix ergänzt, damit alle vier Hauptansichten dieselbe Arbeitsfläche und Titelposition wie Pollen nutzen. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0094` erhöht; Challenge-Desktop-Layout angepasst, damit die Maincard oben vollbreit steht und der Punkte-Kalender darunter sitzt. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0095` erhöht; Pollen-Topbereich bereinigt, lokale Sidecards entfernt und in die Maincard integriert. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0096` erhöht; Mobile-Scroll-End-Fix ergänzt, damit untere Karten oberhalb der Bottom-Bar vollständig sichtbar bleiben. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0098` erhöht; CSS-Fixdateien konsolidiert, alte Einzel-Doku entfernt und `CHANGELOG.md` ergänzt. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0099` erhöht; Challenges-Desktop-Layout angepasst mit Rangliste vor Punkte-Kalender. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0100` erhöht; mobiler Bottom-Reach-Fix für alle vier Hauptansichten ergänzt. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0101` erhöht; Kalender-Hero überarbeitet und rechte Infozeilen für Nächster Termin, Friseur und Urlaub integriert. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0102` erhöht; mobile Abrundung am Ende des Pollen-5-Tages-Ausblicks wiederhergestellt. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0103` erhöht; Challenges-Desktop-Layout mit vollbreiter Maincard und vollbreitem Punkte-Kalender angepasst. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0104` erhöht; Kalender-Hero bereinigt, Datums-Kreis entfernt und rechter Bereich lesbarer gemacht. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0105` erhöht; sichtbare Scrollbalken in Dashboard, Kalender und Challenges entfernt. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0106` erhöht; Challenges-Hero rechts bereinigt, Team-Ziel und Erreicht entfernt und Offene Aufgaben heute ergänzt. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0107` erhöht; mobile Pollen-Hauptkachel angepasst, damit Gräser hoch, Peak und Ruhigster Tag wieder horizontal nebeneinander stehen. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0108` erhöht; Kalender mobil angepasst mit kompaktem Hero-Infobereich und vollständiger Wochenanzeige. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0109` erhöht; mobile Challenges-Hauptkachel mit nebeneinanderliegenden Statuspunkten ohne innere Kacheln. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0110` erhöht; Challenges-Hero visuell an Pollen angeglichen, innere Kacheln entfernt und Statuspunkte auf Überschrift plus aktuelle Anzeige reduziert. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0111` erhöht; Challenges-Hauptkachel textlich bereinigt, Desktop-/Mobil-Layout der Statuspunkte korrigiert und Punkte-Kalender unter der Hauptkachel abgesichert. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0112` erhöht; Kalender-Hero auf Desktop vollbreit gesetzt und mobile Infoanzeigen im Pollen-Stil ohne innere Kacheln gestaltet. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0113` erhöht; Challenges-Statuspunkte an den Pollen-Stil angeglichen und Abzeichen-Fortschritt auf `0 von 37` korrigiert. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0114` erhöht; Kalender-Hero-Daten und mobile Darstellung korrigiert sowie Challenges-Statuspunkte mobil gegen Überlappung abgesichert. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0115` erhöht; Kalender-Nächster-Termin auf relative Anzeige reduziert, Statusfarben an Pollen angepasst und Abzeichen-Zähler auf `x von 37` stabilisiert. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0116` erhöht; Pollen-Mobilabstand reduziert und Dashboard-Titelhöhe/Workspace-Breite angeglichen. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0117` erhöht; mobile Pollen-Hauptkachel vertikal an Challenges angeglichen und Abstand unter der Überschrift reduziert. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0118` erhöht; fehlenden mobilen Zwischenstrich zwischen Heute und Offen in der Challenges-Hauptkachel ergänzt. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0119` erhöht; Überschriften von Challenges und Kalender an den Pollen-Stil angepasst. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0120` erhöht; Dashboard-Abschnittsüberschriften an den Pollen-Stil angepasst. | ChatGPT |

| 2026-06-06 | Version auf `0.1.0121` erhöht; Abschnittsüberschriften in Challenges und Kalender außerhalb der Kacheln platziert. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0122` erhöht; Kalender im lokalen Desktop auf dieselbe Arbeitsbreite wie die anderen Ansichten gebracht. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0123` erhöht; störende Linie unter dem Urlaub-Eintrag in der Kalender-Hauptkachel entfernt. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0124` erhöht; mobile Statuspunkte in der Challenges-Hauptkachel an Pollen angepasst, vergrößert und Linienüberlagerung entfernt. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0125` erhöht; mobile Pollen-Hero-Kachel vertikal an die anderen Ansichten angepasst und oberen Abstand reduziert. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0126` erhöht; mobiler Pollen-24-Stunden-Ausblick linksbündig ausgerichtet und Diagramm-Beschriftungen vergrößert. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0127` erhöht; Farben der drei Hero-Statusblöcke in der lokalen Desktop-Ansicht von Pollen umgekehrt. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0128` erhöht; Kalender-Syntaxfehler behoben und Challenges-Hero-Failsafe ergänzt. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0129` erhöht; fehlende Challenges-HeroCard behoben, indem `renderGroupGoal()` direkt auf das Challenge-Layout rendert. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0130` erhöht; Pollen mobile HeroCard vertikal an Challenges angeglichen. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0131` erhöht; mobile Challenges-Trennstriche in der HeroCard an Pollen angeglichen. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0132` erhöht; mobile Challenges-Status-Texte gegen Überlappung korrigiert. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0133` erhöht; mobile Kalender-HeroCard bereinigt und untere Linie beim Urlaub-Eintrag entfernt. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0134` erhöht; mobilen Abstand beim Challenges-Statuspunkt Abzeichen korrigiert. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0135` erhöht; Pollen-HeroCard mobil nach unten gesetzt und Abstand zur Überschrift an Challenges angeglichen. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0136` erhöht; mobile HeroCards außer Dashboard auf Pollen-Höhe vereinheitlicht. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0137` erhöht; Pollen-HeroCard mobil weiter nach unten gesetzt und Abstand zur Überschrift an Challenges angeglichen. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0138` erhöht; mobile HeroCards außer Dashboard auf exakt dieselbe äußere Höhe gesetzt und zentrale HeroCard-Höhenvariable eingeführt. | ChatGPT |

| 2026-06-08 | Version auf `0.1.0157` erhöht; Wochenkalender von Kalender und Challenges optisch und typografisch vereinheitlicht sowie Kalender mit Vorherige-/Nächste-Woche-Navigation ausgestattet. Keine Änderung an Logik, Daten, Firebase, Sync, Login oder Push. | ChatGPT |
| 2026-06-08 | Version auf `0.1.0156` erhöht; Hintergrundfarbwelt der Kalender-HeroCard auf Pollen und Challenges übertragen, lokal/desktop und mobil. Keine Änderung an Logik, Daten, Firebase, Sync, Login oder Push. | ChatGPT |
| 2026-06-08 | Version auf `0.1.0155` erhöht; mobile HeroCards farblich an die Kalender-HeroCard angeglichen und mobile Challenges-HeroCard mit sauberen Trennern, Icon-Positionen und nicht überlappenden Texten repariert. Keine Änderung an Logik, Daten, Firebase, Sync, Login oder Push. | ChatGPT |
| 2026-06-08 | Version auf `0.1.0154` erhöht; Dashboard-Hero ohne „Nächster Termin“-Zeile, Kalender-Hero mit Terminanzahl dieser Woche und Tagesagenda-Abstand für Google-G/Icon korrigiert. Keine Änderung an Kalenderdaten, Firebase, Sync, Login oder Push. | ChatGPT |
| 2026-06-08 | Version auf `0.1.0153` erhöht; lokale HeroCards von Dashboard, Kalender und Challenges strikt am Pollen-Layout ausgerichtet, inklusive Trennlinien, Kennzahlenraster und korrekter Textreihenfolge in Challenges. Keine Änderung an Logik, Daten, Firebase, Sync, Login oder Push. | ChatGPT |
| 2026-06-08 | Version auf `0.1.0152` erhöht; mobile Challenges-HeroCard anhand der Screenshots exakt an das Pollen-Raster angeglichen, insbesondere Kennzahlenhöhe, Trenner, Icon- und Textausrichtung. Keine Änderung an Challenge-Logik, Punkten, Kalender, Firebase, Sync, Login oder Push. | ChatGPT |
| 2026-06-08 | Version auf `0.1.0151` erhöht; lokale HeroCards von Dashboard, Kalender und Challenges rechts am Pollen-Raster ausgerichtet, Dashboard mit vier untereinander stehenden Anzeigen kompakter gesetzt. Keine Änderung an Logik, Firebase, Sync, Login oder Push. | ChatGPT |
| 2026-06-08 | Version auf `0.1.0150` erhöht; mobile Challenge-Hero-Trennlinien, Icongröße und Kennzahlenhöhe am Pollen-Raster ausgerichtet. Keine Änderung an Challenge-Logik, Punkten, Kalender, Firebase, Sync, Login oder Push. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0139` erhöht; mobile Pollen-HeroCard mit finalem Override nach unten gesetzt. | ChatGPT |

| 2026-06-07 | Version auf `0.1.0140` erhöht; alte mobile Pollen-Override-Regel in `appShell.css` neutralisiert, die die HeroCard zu weit nach oben gezogen hatte. | ChatGPT |
| 2026-06-07 | Version auf `0.1.0142` erhöht; mobiler Pollen-HeroCard-Abstand an Kalender/Challenges angepasst. | ChatGPT |
| 2026-06-07 | Version auf `0.1.0146` erhöht; mobile HeroCards von Dashboard, Kalender, Challenges und Pollen vereinheitlicht. | ChatGPT |
| 2026-06-07 | Version auf `0.1.0149` erhöht; mobile Challenge-Hero-Metriken stabilisiert, damit Icon, Label und Wert nicht mehr überlappen. Keine Änderung an Challenge-Logik, Punkten, Kalender, Firebase, Sync, Login oder Push. | ChatGPT |
| 2026-06-07 | Version auf `0.1.0148` erhöht; Pollen-HeroCard mobil behält die korrekte Außenposition und nutzt wieder den Challenge-ähnlichen Innenabstand. | ChatGPT |
| 2026-06-07 | Version auf `0.1.0147` erhöht; Pollen-HeroCard mobil auf dieselbe sichtbare Höhe wie Kalender und Challenges gezogen. | ChatGPT |
| 2026-06-07 | Version auf `0.1.0145` erhöht; Prozentwerte im Pollen-24-Stunden-Diagramm weiter nach links gesetzt. | ChatGPT |
| 2026-06-07 | Version auf `0.1.0144` erhöht; mobiler Titelabstand zu HeroCards für Dashboard, Kalender, Challenges und Pollen vereinheitlicht. | ChatGPT |
| 2026-06-07 | Version auf `0.1.0143` erhöht; Prozent-Skala links im 24-Stunden-Pollen-Diagramm ergänzt. | ChatGPT |
| 2026-06-07 | Version auf `0.1.0141` erhöht; Dashboard-, Kalender- und Challenge-HeroCards an den Pollen-HeroCard-Stil angeglichen und große Hero-Emoji-Icons durch ruhige Statusmarker ersetzt. | ChatGPT |## Version 0.1.0160
- Die sichtbare App-Version wurde auf `0.1.0159` erhöht.
- Die Innenkacheln im Pollen-Allergieprofil wurden farblich an die Kalender-Kacheln angeglichen.
- Dies gilt lokal/desktop und mobil.
- Keine Änderung an Logik, Pollenwerten, Kalenderdaten, Firebase, Sync, Login oder Push.
