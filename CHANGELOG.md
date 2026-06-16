## Version 0.1.0256
- Challenges-Hero Mobil: Seitenraender der Card an Pollen angeglichen (.challenge-layout horizontal 26px -> 18px im @media max-width:700px).
- Nur Challenges geaendert, Desktop unberuehrt.

## Version 0.1.0255
- Challenges-Hero-Statzeilen exakt an Pollen angeglichen: Icon 22px, Label 12px/720, Wert 15px/820, padding-left 16px (Desktop).
- Icon-Glyph Emoji 🏅 durch monochrome Marke ★ ersetzt; Abzeichen-Icon mit Gold-Akzent, Heute/Offen gruen.
- Mobil: Icon-Spalte/Gap verkleinert, damit Werte (z. B. "0 von 37") nicht mehr abschneiden.
- Nur Challenges geaendert.

## Version 0.1.0254
- Vollstaendiges Repo-ZIP zur Wiederherstellung nach unvollstaendigem 0.1.0253-Deploy (der Worker loescht den kompletten Root ausser .git/.github/scripts/updates).
- Enthaelt den kompletten App-Baum + den Challenges-Hero-Fix aus 0.1.0253. Keine zusaetzlichen Code-Aenderungen, nur Versionssprung.

## Version 0.1.0253
- Challenges-HeroCard auf das Pollen-Raster vereinheitlicht (nur Challenges geaendert).
- Ursache: Die Statszeile war in appShell.css mehrfach definiert; ein spaeterer "Box-Block" hat die sauberen Zeilen zu gerundeten Boxen ueberschrieben (zusaetzlich global wirksam durch ein vorbestehendes verirrtes schliessendes }).
- Fix: Alle chv227-Selektoren aus dem Box-Block entfernt. Dadurch greifen wieder die korrekten Definitionen: Desktop = Trennlinien-Zeilen, Mobil = drei KPIs nebeneinander - wie Kalender/Einstellungen/Pollen.
- Kein Markup geaendert, keine neuen Override-Bloecke. Keine Aenderung an Dashboard, Kalender, Einstellungen, Pollen, Firebase, Sync oder Push.

## Version 0.1.0252
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
- Die sichtbare App-Version wurde auf `0.1.0232` erhöht.
- **HeroCard-Chaos bereinigt**: Der injizierte CSS-Block in `features/dashboard/dashboard-logic.js` setzte einen konkurrierenden Gradient und ein anderes Grid (3-spaltig horizontal mobil), der den `appShell.css`-Anweisungen entgegenwirkte. Dieser Block wurde direkt auf Pollen-Werte korrigiert.
- **`styles/appShell.css`**: Alle alten v0.1.0211–v0.1.0229 HeroCard-Blöcke bleiben erhalten, aber ein einziger sauberer Abschluss-Block (v0.1.0232) mit `@media(min-width:701px)` und `@media(max-width:700px)` überschreibt alle Konflikte final.
- Desktop: `grid-template-columns: minmax(0,1fr) 190px 232px`, `min-height:272px`, gleiches `radial-gradient`-Hintergrundmuster und `border:1px solid rgba(74,222,128,.18)` wie Pollen — für alle vier Karten.
- Mobil: Grid `"main art" / "stats stats"`, Illustration 100px oben rechts, Stats darunter als einzelne abgerundete Karten (`border-radius:18px`, `background:rgba(255,255,255,.045)`) — identisch zu Pollen-Mobil.
- Challenges mobil: Stats-Zeilen als vertikale Karten (nicht mehr horizontal 3-spaltig).
- Keine Änderung an Logik, Pollenberechnung, Kalender, Firebase, Sync, Login oder Push.

## Version 0.1.0231
- Die sichtbare App-Version wurde auf `0.1.0231` erhöht.
- Allergieprofil-Icons neu: klare, erkennbare Linien im App-Stil (stroke-only mit leichten Fill-Akzenten). Jeder Typ hat ein markantes Merkmal auf 34px: Gräser mit gebogenen Ähren, Birke mit Krone + Kätzchen-Andeutung, Ambrosia mit 3 Blütenköpfen, Beifuß mit symmetrischen Blattpaaren, Erle mit hängenden Kätzchen-Ellipsen, Olive mit Krone + Früchten.
- Kein Overload mehr auf kleiner Fläche — wenige, präzise Striche passend zum minimalistischen App-Design.
- Keine Änderung an Pollenberechnung, Sortierung, Hero-Illustration, Kalender, Firebase, Sync oder Push.

## Version 0.1.0230
- Die sichtbare App-Version wurde auf `0.1.0230` erhöht.
- Pollen-Hero: Illustration ist jetzt dynamisch — je nach dominantem Pollentyp erscheint eine andere große SVG-Pflanzengrafik (Gräser-Ähren, Birkenbaum mit Kätzchen, Ambrosia-Blüte, Beifuß, Erle mit hängenden Kätzchen, Olivenbaum mit Früchten).
- Pollen-Hero: Der dominante Typ wird aus dem höchsten Messwert (`relevantLoadItems`) ermittelt — immer das höchste oben.
- Allergieprofil: Einträge werden nach Belastungswert absteigend sortiert — höchste Belastung zuerst.
- Profil-Icons: Realistischere botanische SVGs mit mehr Detail (Kätzchen, Früchte, Blütenköpfe, Ähren, Gefieder) und levelabhängiger Farbe (rot/gelb/grün/grau).
- Umsetzung in `features/pollen/pollenView.js` und `features/pollen/pollenView.css`.
- Keine Änderung an Pollenberechnung, Kalender, Challenges, Firebase, Sync, Login oder Push.

## Version 0.1.0229
- Die sichtbare App-Version wurde auf `0.1.0229` erhöht.
- Alle HeroCards (Dashboard, Kalender, Challenges, Einstellungen) pixelgenau auf das Pollen-HeroCard-Layout gebracht: gleiches `radial-gradient`-Hintergrundmuster, gleiche grüne Border, gleicher Box-Shadow, gleiche Grid-Struktur (`1fr / Illustration / Stats`), gleiche Stats-Zeilen-Geometrie.
- Desktop: 3-spaltig (`minmax(0,1fr) 190px 232px`), `min-height:272px`, Illustration mittig, Stats rechts mit `border-left` und untereinander durch `border-bottom` getrennt.
- Mobil: Grid `"main art" / "stats stats"`, Illustration 100px oben rechts, Stats darunter als einzelne abgerundete Karten (`border-radius:18px`, `background:rgba(255,255,255,.045)`) — exakt wie Pollen-Mobil.
- Kalender: `cal-premium-date-ring` ausgeblendet, `cal-hero-illustration` SVG positioniert.
- Challenges: Stats-Labels (`Abzeichen / Heute / Offen`) nie mehr abgeschnitten.
- Einstellungen: `strong`/`em` Aliases für bestehende HTML-Struktur ergänzt.
- Keine Änderung an Logik, Punkten, Kalenderdaten, Firebase, Sync, Login oder Push.

## Version 0.1.0228
- Die sichtbare App-Version wurde auf `0.1.0228` erhöht.
- Alle vier HeroCards erhalten echte SVG-Illustrationen analog zur Pollen-HeroCard.
- Dashboard: Bar-Chart-SVG mit Trendlinie (`dashHeroArtSvg()` in `features/dashboard/dashboard-logic.js`).
- Kalender: Uhr-SVG mit Zeigern und Kalenderblatt (`calHeroArtSvg()` in `features/calendar/calendarPanels.js`).
- Challenges: Pokal-SVG mit Stern und Glanzeffekt (`chv227-illustration` in `core/misc.js`).
- Einstellungen: Zahnrad-SVG (`settingsHeroArtSvg()` in `features/settings/settingsPanel.js`).
- Challenge-Stats mobil: Labels nie mehr abgeschnitten; Grid-Areas explizit gesetzt.
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
- Die GitHub-Update-Anzeige zeigt jetzt einen Live-Fortschritt mit ZIP-Upload, GitHub Action, Commit auf `main` und Live-Version.
- Der Button `Update laden` erscheint erst, wenn die Zielversion auch live über GitHub Pages erreichbar ist.
- Der Cloudflare-Worker-Status kann zusätzlich die aktuelle `main`-Version und den Commit-SHA zurückgeben.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Daten.

## Version 0.1.0204
- Die sichtbare App-Version wurde auf `0.1.0204` erhöht.
- Das ZIP-Update-Paket übernimmt den Kalender-/Einstellungen-HeroCard-Fix aus `0.1.0203` erneut sauber.
- Der GitHub-Update-Workflow liest die Zielversion aus `.change-update-version`, entfernt diese Datei vor dem Commit und bereinigt fehlerhafte ZIP-Übergaben.
- Die GitHub-Update-Anzeige unterscheidet nun klarer zwischen erfolgreicher ZIP-Übergabe und laufender GitHub-Action-Prüfung.
- Der Cloudflare-Worker-Code mit `/files`, `/status` und `/upload` liegt im Paket für den manuellen Worker-Deploy bereit.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Daten.

## Version 0.1.0203
- Die sichtbare App-Version wurde auf `0.1.0203` erhöht.
- Kalender-Topabstand korrigiert: Die alte `#cal-controls`-Reserve wird in der Premium-Ansicht nicht mehr angezeigt oder eingerechnet.
- Einstellungen-HeroCard lokal und mobil an Höhe, Breite, Innenabstand und Aufbau der Kalender-HeroCard angeglichen.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder GitHub Worker.

## Version 0.1.0202
- Die sichtbare App-Version wurde auf `0.1.0202` erhöht.
- Kalender-Wochenpfeile sitzen jetzt direkt in der Wochenkarte, passend zur Monatsansicht.
- Challenge-Wochenpfeile sitzen jetzt ebenfalls direkt in der Wochenkarte.
- Wochen-/Monatskarten bleiben optisch ruhiger, ohne zusätzliche externe Button-Zeile.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder GitHub Worker.

## 0.1.0199
- Version auf `0.1.0199` erhöht.
- Dashboard- und Kalender-HeroCard bleiben Zielstil; Pollen, Challenges und Einstellungen nutzen nun dieselbe grün-schwarze HeroCard-Fläche.
- Kleine Kartenflächen in Pollen, Challenges und Einstellungen wurden farblich ruhiger an die Kalender-Farbwelt angepasst.
- Mobile Einstellungen behalten den Scroll, aber die sichtbare Scrollbar wird ausgeblendet; linke und rechte Abstände wurden an Dashboard/Kalender angeglichen.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder Action-Logik.


## 0.1.0198
- Mobile Scroll-Sperre nach Einstellungen behoben.
- Einstellungen mobil mit eigenem Scrollbereich und dezenter vertikaler Scrollbar.
- Einstellungs-Kacheln mobil kompakter im Stil der Allergieprofil-Karten.
- Version, CLAUDE.md und CHANGELOG.md aktualisiert.

## 0.1.0197 - HeroCard-Flächen vereinheitlicht
- Version auf `0.1.0197` erhöht.
- Kalender-HeroCard als visuelles Zielbild für große HeroCards übernommen.
- Dashboard, Kalender, Pollen und Challenges verwenden eine einheitlichere grüne Verlauf-/Kontur- und Schattenlogik.
- Kleinere Kartenflächen in Kalender, Dashboard, Challenges, Pollen und Einstellungen wurden dezenter an die Kalender-Farbwelt angepasst.
- Keine Änderung an Login, Firebase, Sync, Google Kalender, Push, GitHub Worker oder GitHub Action.

## 0.1.0196 - Mobile Content-Abstände vereinheitlicht
- Version auf `0.1.0196` erhöht.
- Mobile Hauptbereiche verwenden den Dashboard-Abstand als Standard.
- Kalender, Pollen, Challenges und Einstellungen bekommen einheitliche Seitenränder.
- Keine Änderung an Desktop-Sidebar, GitHub Worker, GitHub Action, Login, Firebase, Datenbank-Sync, Google Kalender oder Push.

## 0.1.0195 - Mobile Shell sauber getrennt
- Version auf `0.1.0195` erhöht.
- Mobile Ansichten erzwingen wieder den normalen Top-Header, scrollbaren Content und die Bottom-Navigation.
- Desktop-Sidebar-Regeln greifen auf Touch/Mobile nicht mehr durch.
- Linker Rand und wildes Einstellungen-Layout auf Mobile wurden durch einen Mobile-Shell-Reset entfernt.
- Keine Änderung an Firebase, Datenbank-Sync, Google Kalender, Push oder GitHub-Action.

## 0.1.0194 - Mobile Scroll Reset
- Version auf `0.1.0194` erhöht.
- Mobile Ansichten erhalten wieder normales Scroll-Verhalten.
- Desktop-Sidebar-100vh/Overflow-Regeln werden auf Mobile überschrieben.
- Bottom-Navigation bleibt fixiert ohne zusätzlichen unteren Rand.

## 0.1.0193 - Desktop Sidebar Content Inline-Fix
- Version auf `0.1.0193` erhöht.
- Lokale/Desktop-Inhalte waren leer, weil `#main-app` beim Start per Inline-Style als `flex` gesetzt wurde.
- Der Start erzwingt kein globales Flex-Layout mehr; die Desktop-Sidebar nutzt wieder das Grid-Layout mit sichtbarem Content rechts.
- Dashboard, Kalender, Challenges, Pollen und Einstellungen bleiben sichtbar und scrollbar.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Daten.

## 0.1.0192 - Mobile Einstellungen Bottom-Bar randlos
- Version auf `0.1.0192` erhöht.
- Mobile Einstellungen nutzen wieder dieselbe rahmenlose Bottom-Navigation wie Dashboard, Kalender, Challenges und Pollen.
- Die sichtbare Trennkante oberhalb der mobilen Bottom-Bar wurde für die Einstellungen entfernt.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder Challenge-Daten.

## 0.1.0191 - Stabilitätsstand und offene Prüfpunkte
- Version auf `0.1.0191` erhöht.
- Bekannte offene Prüfpunkte dokumentiert: Desktop-AppShell, Cloudflare Worker `/files` und `/status`, GitHub Action Commit/ZIP-Cleanup, alter `updates/` Inhalt sowie konsistente Versionseinträge.
- Keine neue Feature-Logik ergänzt; diese Version dient als sauber dokumentierter Zwischenstand für die nächste Prüfung.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Punkten.

## 0.1.0190 - Desktop Sidebar Content Guard
- Version auf `0.1.0190` erhöht.
- Desktop/lokale Sidebar bleibt links, während der Contentbereich rechts wieder explizit sichtbar geschaltet wird.
- `setMainView()` setzt die aktiven Inhalte zusätzlich per stabiler JS-Sicherung, damit lokale CSS-Overrides den Content nicht mehr leer schalten.
- Einstellungen nutzen dieselbe Sichtbarkeits-Sicherung.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push oder Challenge-Daten.

## 0.1.0189 - GitHub Action Commit stabilisiert
- Version auf `0.1.0189` erhöht.
- Commit-Schritt der GitHub Action repariert; die Zielversion wird über `.change-update-version` übergeben.
- Fehler `syntax error near unexpected token '('` im Workflow-Schritt „Änderungen committen“ vermieden.
- ZIP-Übergaben werden weiterhin verarbeitet und danach aus `updates/` entfernt.

## 0.1.0188 - Desktop Sidebar Routing repariert
- Version auf `0.1.0188` erhöht.
- `setMainView()` setzt Desktop-View-Klassen wieder korrekt.
- Contentbereiche neben der Sidebar werden lokal/Desktop wieder sichtbar.
- Mobile Bottom-Navigation bleibt unverändert.

## 0.1.0187 - Desktop-Sidebar Content stabilisiert
- Version auf `0.1.0187` erhöht.
- Desktop/lokale Sidebar erzwingt den Contentbereich rechts neben der Navigation wieder sichtbar.
- Einstellungen nutzen dieselbe Sidebar-Struktur; der Einstellungen-Button bleibt stabil.
- Mobile Bottom-Navigation unverändert.

## 0.1.0186 - Desktop-Sidebar Content repariert
- Version auf `0.1.0186` erhöht.
- Desktop/lokale Sidebar bleibt links, die Inhalte von Dashboard, Kalender, Challenges, Pollen und Einstellungen bleiben wieder sichtbar.
- Die aktive Einstellungen-Schaltfläche links unten behält Größe und Stil der Sidebar bei.
- Mobile Bottom-Navigation bleibt unverändert.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder ZIP-Action.

## 0.1.0185 - Desktop-Sidebar wiederhergestellt
- Version auf `0.1.0185` erhöht.
- Desktop und lokale installierte Ansicht nutzen wieder die linke App-Sidebar statt der oberen Header-Navigation.
- Mobile Bottom-Navigation bleibt unverändert.
- Keine Änderung an Login, Firebase, Datenbank-Sync, Google Kalender, Push, GitHub Worker oder Challenge-Logik.

## 0.1.0184 - GitHub Worker-Dateiliste und Action-Fix
- Version auf `0.1.0184` erhöht.
- Direkter Browser-Zugriff auf `api.github.com` im GitHub-Bereich entfernt.
- Cloudflare Worker um `/files` für Dateiliste und Dateianzahl ergänzt.
- ZIP-Action-Verarbeitung bleibt über `updates/` und bereinigt ZIP-Übergaben nach Anwendung.
- Hinweis für Bootstrap: Workflow, Apply-Script und Worker-Code müssen einmalig manuell aktualisiert werden.

## 0.1.0183 - GitHub Live-Status und Update-Ladebutton
- Version auf `0.1.0183` erhöht.
- Nach der direkten GitHub-Übertragung fragt die App den Worker temporär nach dem GitHub-Action-Status ab.
- Die Statusabfrage stoppt automatisch bei Erfolg, Fehler oder spätestens nach zwei Minuten.
- Nach erfolgreicher Action erscheint einmalig der Button `Update auf Version ... laden`, der Cache und Service-Worker aktualisiert und die App mit Versionsparameter neu lädt.
- Die GitHub-Seite wird nach der Übertragung nicht mehr automatisch geöffnet.

## 0.1.0182 - GitHub Dateiübersicht verbessert
- Version auf `0.1.0182` erhöht.
- Die GitHub-ZIP-Prüfung liest die aktuelle Dateianzahl aus dem Repository und vergleicht sie mit der ausgewählten ZIP.
- Neue Dateien werden erkannt und in einer ausklappbaren Dateiübersicht angezeigt.
- Die frühere dauerhafte Dateivorschau wurde entfernt; die Übersicht öffnet sich nur noch über `Anzahl der Dateien`.
- Die Content-Security-Policy erlaubt dafür lesende Anfragen an `https://api.github.com`.

## 0.1.0181 - GitHub Action ZIP-Fallback und Cleanup
- Version auf `0.1.0181` erhöht.
- Die GitHub Action lädt ZIP-Dateien bei Bedarf über die GitHub API nach, wenn sie nach dem Checkout nicht im lokalen `updates/` Ordner gefunden werden.
- Fehlerhafte ZIP-Übergaben werden automatisch aus `updates/` entfernt, damit keine unentpackten ZIP-Dateien im Repository liegen bleiben.
- `CHANGELOG.md` wird serverseitig als Pflichtprüfung ergänzt.

## 0.1.0180 - GitHub Versionskacheln entfernt
- Version auf `0.1.0180` erhöht.
- GitHub Update entfernt die großen Kacheln `Von Version` und `Auf Version`, da diese Informationen bereits in der Prüfung sichtbar sind.

## 0.1.0179 - GitHub Update Ablauf vereinfacht
- Version auf `0.1.0179` erhöht.
- Freigabe-Code im GitHub-Bereich nach oben gesetzt.
- ZIP-Prüfung startet automatisch nach Datei-Auswahl oder Drag & Drop.
- Separaten Button „Änderungen prüfen“ entfernt.
- Hinweise „ZIP auswählen und Prüfung starten“ und „ZIP Update · Worker“ entfernt.

## 0.1.0178 - GitHub Icon
- Version auf `0.1.0178` erhöht.
- GitHub-Bereich in den Einstellungen nutzt nun das GitHub-Mark als Icon.
- Keine Änderung an Upload, Worker oder Prüf-Logik.

## 0.1.0177 - GitHub Übertragung und Prüfstruktur
- Version auf `0.1.0177` erhöht.
- Cloudflare Worker in der Content-Security-Policy für `connect-src` freigegeben.
- GitHub-ZIP-Prüfung verschlankt und sinnvoller strukturiert.
- `CHANGELOG.md aktualisiert` als Prüfpunkt ergänzt.
- `Dateiliste lesbar` in `Anzahl der Dateien` umbenannt.

## 0.1.0176 - GitHub Freigabecode und Texte bereinigt
- Version auf `0.1.0176` erhöht.
- Globale Tastaturkürzel ignorieren Eingaben in Formularfeldern, damit Zahlen im Freigabe-Code nicht mehr zur Ansichtsnavigation führen.
- Entfernt wurden die gewünschten erklärenden Texte im GitHub-Bereich und in der Einstellungen-Detailüberschrift.

## Version 0.1.0174

## 0.1.0175 - Einstellungen Header angeglichen
- Einstellungen-Header an die übrigen Masken angeglichen.
- Rechte Header-Reihenfolge vereinheitlicht: Glocke, Zahnrad, Profil.
- Profilrahmen mit Google-Status in den Einstellungen stabilisiert.
- Keine Änderungen an Sync, Firebase oder GitHub-Worker.

- Sichtbare App-Version auf `0.1.0174` erhöht.
- Scrollen in Challenges und Einstellungen lokal/Desktop und mobil stabilisiert.
- GitHub-ZIP-Upload als Drag-and-Drop-Fläche umgesetzt.
- Hinweis „Noch keine ZIP ausgewählt“ entfernt; Status erscheint nur bei echter Auswahl oder Prüfung.
- Freigabe-Code-Feld entschärft, damit keine Browser-Warnung zum Passwortfeld entsteht.

## Version 0.1.0173
- Sichtbare App-Version auf `0.1.0173` erhöht.
- Einstellungen-Header lokal/Desktop und mobil repariert.
- Rechte Symbol-Reihenfolge vereinheitlicht: Glocke, Zahnrad, Profil.
- Keine Änderung an Login, Sync, Firebase, Kalenderdaten oder GitHub-Worker-Logik.

## 0.1.0170 - Desktop-AppShell repariert

## Version 0.1.0172
- Sichtbare App-Version auf `0.1.0172` erhöht.
- Lokale/Desktop-AppShell stabilisiert, damit Header und Navigation nach hartem Reload nicht falsch vertikal dargestellt werden.
- GitHub-Bereich in den Einstellungen mit klaren Hinweisen zu Cloudflare Worker, `updates/`, GitHub Action, `main` und fehlendem Browser-Key ergänzt.
- ZIP Upload bleibt als Dropdown; Prüfung und Übertragung bleiben getrennt.

## Version 0.1.0171
- Sichtbare App-Version auf `0.1.0171` erhöht.
- GitHub als eigener Einstellungsbereich eingebaut.
- ZIP-Upload, Prüfung und Übertragung als Dropdown aufgebaut.
- GitHub-Worker-Anbindung bleibt erhalten.

- Sichtbare App-Version auf 0.1.0170 erhöht.
- Desktop-Layout repariert, damit die Navigation nicht mehr vertikal/zentriert in die mobile Shell kippt.
- Header, Tabs, Profil, Einstellungen, Glocke und Content werden ab 701px wieder horizontal und vollständig nutzbar dargestellt.
- Mobile Bottom-Bar, GitHub Worker, Sync, Kalenderdaten und Challenge-Logik bleiben unverändert.

## 0.1.0169 - GitHub Update per Cloudflare Worker
- Sichtbare App-Version auf 0.1.0169 erhöht.
- GitHub Update überträgt geprüfte ZIPs direkt an den geschützten Cloudflare Worker.
- Der Worker-Code wurde unter scripts/changeGithubUpdateWorker.js ergänzt.
- Der Worker legt ZIPs über die GitHub App in updates/ ab, danach verarbeitet die bestehende GitHub Action das Update auf main.
- Kein GitHub Private Key oder Installation Token wird im Browser gespeichert.

## 0.1.0168 - GitHub Action Backend statt Firebase Functions
- Sichtbare App-Version auf 0.1.0168 erhöht.
- Firebase-Functions-Backend für GitHub Update entfernt.
- GitHub Update verweist nun auf den Upload nach updates/ und die GitHub Action übernimmt die serverseitige Prüfung und den Commit.
- Workflow .github/workflows/apply-zip-update.yml und Script scripts/applyZipUpdate.mjs ergänzt.
- Kein GitHub-Token im Browser, keine Änderung an Login, Sync, Kalenderdaten oder Push.

## 0.1.0166 - GitHub Update Backend verbunden
- Sichtbare App-Version auf 0.1.0166 erhöht.
- GitHub-Update-Kachel kann den Commit über eine geschützte Firebase Cloud Function starten.
- Backend prüft ZIP und Version serverseitig erneut.
- GitHub-Token bleibt als Firebase Secret im Backend.

## 0.1.0165 - HeroCard-Hintergründe an Kalender angeglichen
- Sichtbare App-Version auf 0.1.0165 erhöht.
- Dashboard-, Kalender-, Challenges- und Pollen-HeroCards nutzen dieselbe Kalender-Farbwelt.
- Gilt für Desktop und Mobile sowie Hell- und Dunkelmodus.
- Keine Änderung an Logik, Daten, Sync, Login oder Push.

## 0.1.0164 - GitHub-Update-Prüfung korrigiert
- Sichtbare App-Version auf 0.1.0164 erhöht.
- Zielversionen werden nur noch aus Change-App-Versionseinträgen erkannt.
- Bestehende Projektordner wie functions, public und components werden als erlaubte Struktur behandelt.
- Keine Änderung an Kalenderdaten, Sync, Firebase, Login oder Push.

## 0.1.0163 - Eigenständige Login-Maske
- Sichtbare App-Version auf 0.1.0163 erhöht.
- Login wieder als vollflächige, eigenständige Maske gesetzt.
- Haupt-App bleibt während Login ausgeblendet und nicht klickbar.
- Keine Änderung an Sync, Firebase, Kalenderdaten oder Push.

## 0.1.0162 - GitHub-Update-Kachel
- Sichtbare App-Version auf 0.1.0162 erhöht.
- Einstellungen → App & Sicherheit enthält nun eine GitHub-Update-Kachel für ZIP-Prüfung.
- Lokale ZIP-Prüfung erkennt Von-/Auf-Version, CLAUDE.md, doppelte Dateien und unerwünschte Root-Dateien.
- Commit-Funktion bleibt ohne geschütztes Backend gesperrt.

## 0.1.0161 - Kalender-Hero-Wochenanzahl fixiert und Punkt entfernt
- Sichtbare App-Version auf 0.1.0161 erhöht.
- Die Terminanzahl im Kalender-Hero zählt immer die echte aktuelle Woche.
- Beim Wechsel auf vorherige oder nächste Woche bleibt diese Hero-Anzeige unverändert.
- Der grüne Punkt links neben der Wochenanzahl wurde entfernt.
- Keine Änderung an Kalenderdaten, Sync, Firebase, Login oder Push.

## 0.1.0160 - Mobile Wochenkalender-Schriftgrößen korrigiert
- Sichtbare App-Version auf 0.1.0160 erhöht.
- Mobile Schriftgrößen der Wochenkacheln in Kalender und Challenges reduziert.
- Kalender- und Challenges-Wochenkalender nutzen nun dieselbe Schriftlogik wie Pollen.
- Zifferndarstellung vereinheitlicht, damit die 0 nicht mehr mit Punkt/Slashed-Zero erscheint.
- Keine Änderung an Logik, Daten, Sync, Login oder Push.

## 0.1.0159 - Pollen-Innenkacheln farblich an Kalender angeglichen
- Sichtbare App-Version auf 0.1.0159 erhöht.
- Die Innenkacheln im Pollen-Allergieprofil nutzen nun dieselbe Kartenfarbwelt wie die Kalender-Kacheln.
- Gilt lokal/desktop und mobil.
- Keine Änderung an Logik, Pollenwerten, Daten, Sync, Login oder Push.

## 0.1.0157 - Wochenkalender von Kalender und Challenges vereinheitlicht
- Sichtbare App-Version auf 0.1.0157 erhöht.
- Wochenkalender von Kalender und Challenges optisch und typografisch vereinheitlicht.
- Kalender-Wochenansicht um Vorherige-/Nächste-Woche-Navigation erweitert.
- Challenges-Wochenansicht auf dieselbe Pfeilnavigation reduziert und an den Kalender angepasst.
- Keine Änderung an Logik, Daten, Sync, Login oder Push.

## 0.1.0156 - Kalender-HeroCard-Farbwelt für Pollen und Challenges übernommen
- Sichtbare App-Version auf 0.1.0156 erhöht.
- Hintergrundfarbwelt der Kalender-HeroCard auf Pollen und Challenges übertragen.
- Gilt lokal/desktop und mobil.
- Keine Änderung an Logik, Daten, Sync, Login oder Push.

## 0.1.0155 - Mobile HeroCards farblich vereinheitlicht und Challenges repariert
- Sichtbare App-Version auf 0.1.0155 erhöht.
- Mobile HeroCards von Dashboard, Kalender, Challenges und Pollen auf die smoothere Kalender-Farbwelt vereinheitlicht.
- Mobile Challenges-HeroCard unten erneut am Kalender/Pollen-Raster ausgerichtet.
- Trenner, Icon-Positionen und Textblöcke in Challenges so korrigiert, dass nichts mehr überlappt.
- Keine Änderung an Logik, Daten, Sync, Login oder Push.

## 0.1.0154 - Dashboard-Nächsttermin entfernt und Kalenderanzeige geschärft
- Sichtbare App-Version auf 0.1.0154 erhöht.
- Dashboard-Hero zeigt die Zeile „Nächster Termin …“ nicht mehr an, lokal und mobil.
- Kalender-Hero zeigt statt der heutigen Terminanzahl nun die Terminanzahl dieser Woche.
- Tagesagenda korrigiert: Google-G/Icon rückt nach rechts, damit es nicht mehr mit „Ganztägig“ überlappt.
- Keine Änderung an Kalenderdaten, Sync, Firebase, Login oder Push.

## 0.1.0153 - Lokale HeroCards streng am Pollen-Layout ausgerichtet
- Sichtbare App-Version auf 0.1.0153 erhöht.
- Lokale HeroCards von Dashboard, Kalender und Challenges am Pollen-Layout vereinheitlicht.
- Trennlinien, Kennzahlenraster, Abstände und Textreihenfolge rechts identisch ausgerichtet.
- Challenges lokal wieder ohne ungewollte Strukturänderung der Kennzahlenanzeige.
- Keine Änderung an Logik, Daten, Sync, Login oder Push.

## 0.1.0152 - Challenges Hero mobil am Pollen-Raster nachgeschärft
- Sichtbare App-Version auf 0.1.0152 erhöht.
- Mobile Challenges-HeroCard bei den drei Kennzahlen exakt an Pollen angepasst.
- Vertikale Trenner, Höhe der Kennzahlenzeile, Text- und Icon-Ausrichtung vereinheitlicht.
- Keine Änderung an Challenge-Logik, Punkten, Kalenderdaten, Firebase, Sync, Login oder Push.

## 0.1.0151 - Lokale HeroCards im Pollen-Raster vereinheitlicht
- Sichtbare App-Version auf 0.1.0151 erhöht.
- Desktop/lokale HeroCards von Dashboard, Kalender und Challenges rechts auf dieselbe untereinander gesetzte Kennzahlen-Spalte wie Pollen ausgerichtet.
- Dashboard-HeroCard kompakter gesetzt, damit die vier Anzeigen ruhig untereinander stehen.
- Keine Änderung an Dashboard-, Kalender-, Challenge- oder Pollenlogik, Firebase, Sync, Login oder Push.

## 0.1.0150 - Challenge-Hero-Trennlinien mobil ausgerichtet
- Sichtbare App-Version auf 0.1.0150 erhöht.
- Untere Kennzahlen der mobilen Challenge-Gruppenziel-HeroCard wieder exakt am Pollen-Raster ausgerichtet.
- Vertikale Trennlinien, Icongröße und Zeilenhöhe vereinheitlicht, damit die Herocard nicht mehr leicht versetzt wirkt.
- Keine Änderung an Challenge-Logik, Punkten, Kalender, Firebase, Sync, Login oder Push.

## 0.1.0149 - Challenge-Hero-Metriken mobil stabilisiert
- Sichtbare App-Version auf 0.1.0149 erhöht.
- Untere Kennzahlen der mobilen Gruppenziel-HeroCard überlappen nicht mehr.
- Icon, Label und Wert sind nun in festen Spalten und Zeilen getrennt.
- Keine Änderung an Challenge-Logik, Punkten, Kalender, Firebase, Sync, Login oder Push.

## 0.1.0148 - Pollen-HeroCard Innenabstand mobil korrigiert
- Sichtbare App-Version auf 0.1.0148 erhöht.
- Pollen-HeroCard behält mobil die korrigierte Position unter der Überschrift.
- Der innere Abstand der Pollen-HeroCard wurde nach Challenge-Vorbild wiederhergestellt, damit Label, Hauptwert und Kennzahlen nicht zu weit oben kleben.
- Keine Änderung an Pollenberechnung, Kalenderlogik, Challenge-Logik, Login, Firebase, Sync oder Push.

## 0.1.0147 - Pollen-HeroCard mobil angeglichen
- Sichtbare App-Version auf 0.1.0147 erhöht.
- Verbliebenen mobilen Pollen-Sonderversatz zwischen Überschrift und HeroCard entfernt.
- Keine Änderung an Pollenberechnung, Kalender, Challenges, Dashboard-Logik, Firebase, Sync, Login oder Push.

## 0.1.0146 - Mobile HeroCards vereinheitlicht
- Sichtbare App-Version auf 0.1.0146 erhöht.
- Mobile HeroCards von Dashboard, Kalender, Challenges und Pollen auf gemeinsame Höhe, Innenabstand, Radius, Typografie und linksbündige Leserichtung normalisiert.
- Kalender-HeroCard mobil linksbündig ausgerichtet.
- Keine Änderung an Dashboard-, Kalender-, Challenge- oder Pollenlogik, Login, Firebase, Sync, Push oder Kalenderdaten.

## 0.1.0145 - Pollen 24h Skala feinjustiert
- Sichtbare App-Version auf 0.1.0145 erhöht.
- Prozentwerte der linken Skala im Pollen-24-Stunden-Ausblick weiter nach links gesetzt.
- Keine Änderung an Pollenberechnung, Tagesbereichen, Login, Firebase, Sync, Push oder Kalenderdaten.

## 0.1.0144 - Einheitlicher HeroCard-Abstand
- Sichtbare App-Version auf 0.1.0144 erhöht.
- Mobiler Titelblock für Dashboard, Kalender, Challenges und Pollen vereinheitlicht.
- Pollen-Sonderabstände final neutralisiert, damit die HeroCard auf gleicher Höhe wie die anderen Hauptansichten startet.
- Keine Änderung an Login, Firebase, Sync, Push, Kalenderdaten oder Feature-Logik.

# CHANGELOG – Change App

## 0.1.0143 - Pollen 24h Prozentskala
- Sichtbare App-Version auf 0.1.0143 erhöht.
- Im 24-Stunden-Ausblick wird links im Diagramm nun eine Prozent-Skala angezeigt.
- Keine Änderung an Pollenberechnung, Firebase, Sync, Login, Push oder Kalenderdaten.

## 0.1.0142 - Pollen Mobile HeroCard Abstand
- Sichtbare App-Version auf 0.1.0142 erhöht.
- Mobile Pollen-HeroCard näher unter die Pollen-Überschrift gesetzt.
- Keine Änderung an Logik, Firebase, Sync, Login, Push oder Kalenderdaten.

## Version 0.1.0098
- Pollen-Maincard oben überarbeitet.
- "Belastung heute" aus dem rechten Hero-Bereich entfernt.
- Rechter Hero-Bereich als vertikale Dashboard-ähnliche Insight-Liste umgesetzt.
- Keine Änderung an Pollenberechnung oder gespeicherten Symptomen.


## 0.1.0097 – Cleanup Build
- CSS-Fixdateien konsolidiert, ohne die Funktionslogik zu ändern.
- `features/pollen/pollenUiPolish.css` wurde in `features/pollen/pollenView.css` integriert.
- Spät geladene Fix-Dateien wurden in `styles/appShell.css` integriert und in exakt gleicher Reihenfolge erhalten:
  - `features/challenges/challengesLayoutFix.css`
  - `styles/mobileShellFix.css`
  - `styles/pollenTypographyFix.css`
  - `styles/workspaceConsistencyFix.css`
  - `styles/pollenHeroConsolidationFix.css`
  - `styles/mobileScrollEndFix.css`
- Alte Einzel-README-Dateien wurden entfernt und in diesem Changelog zusammengeführt.
- Keine Änderung an Firebase, Login, Sync, Kalenderdaten, Challenges, Dashboard-Logik oder Pollenberechnung.

## 0.1.0096 – Mobile Scroll-Ende
- Letzte Karten auf Mobile werden nicht mehr von der Bottom-Bar verdeckt.
- Sicherer Endabstand für Dashboard, Kalender, Challenges und Pollen.

## 0.1.0095 – Pollen Hero Consolidation
- Lokale Sidecards im Pollenbereich entfernt.
- Inhalte von Belastung heute, Peak und Ruhigster Tag in die Maincard integriert.

## 0.1.0094 – Challenge Top Card
- Gruppen-Ziel als vollbreite Maincard oben.
- Punkte-Kalender unter der Maincard.

## 0.1.0093 – Workspace Consistency
- Einheitliche Workspace-Breite und Titelposition für Dashboard, Kalender, Challenges und Pollen.

## 0.1.0092 – Pollen Typography
- 24-Stunden-Ausblick typografisch beruhigt.
- Abschnittsüberschriften im Pollenbereich vereinheitlicht.

## 0.1.0091 – Mobile Shell
- Mobile Bottom-Bar stabilisiert.
- Doppelten unteren Abstand reduziert.

## 0.1.0090 – Challenge Layout
- Challenge-Überlagerungen korrigiert.
- Hero, Punkte-Kalender, Aufgaben und Rangliste sauber sortiert.


## 0.1.0099
- Challenges Desktop neu gestapelt: Rangliste vor Punkte-Kalender in der rechten Spalte.
- Maincard bleibt oben vollbreit.


## 0.1.0100
- Mobile Bottom-Reach für Dashboard, Kalender, Challenges und Pollen repariert.
- Letzte Karten sind nun vollständig oberhalb der Bottom-Bar erreichbar.


## 0.1.0101
- Kalender-Hero überarbeitet: separate Nächster-Termin-Kachel entfernt.
- Rechts in der Hero-Kachel stehen nun Nächster Termin, Friseur und Urlaub.


## 0.1.0102
- Mobile Abrundung am Ende des Pollen-5-Tages-Ausblicks wiederhergestellt.


## 0.1.0103
- Challenges auf Desktop neu angeordnet: Maincard oben vollbreit, Punkte-Kalender darunter ebenfalls vollbreit.


## 0.1.0104
- Kalender-Hero bereinigt: Datums-Kreis entfernt und rechter Infobereich deutlich lesbarer gemacht.


## 0.1.0105
- Sichtbare Scrollbalken in Dashboard, Kalender und Challenges entfernt.
- Scroll-Funktion bleibt erhalten.


## 0.1.0106
- Challenges-Hero rechts reduziert: Team-Ziel und Erreicht entfernt, Offene Aufgaben heute ergänzt.


## 0.1.0107
- Pollen-Hauptkachel auf Mobil angepasst: Gräser hoch, Peak und Ruhigster Tag wieder horizontal nebeneinander.


## 0.1.0108
- Kalender mobil überarbeitet: kompakter Hero-Infobereich und vollständige Wochenanzeige ohne abgeschnittene Tage.


## 0.1.0109
- Challenges-Hauptkachel mobil bereinigt: Abzeichen, Heute und Offen stehen nebeneinander ohne innere Kacheln.


## 0.1.0110
- Challenges-Hero visuell an Pollen angeglichen: keine inneren Kacheln mehr, Statuspunkte nebeneinander mit Überschrift und aktueller Anzeige.
- Desktop und Mobil bereinigt.


## 0.1.0111
- Challenges-Hauptkachel textlich bereinigt und Layout korrigiert.
- Desktop: rechte Statuspunkte untereinander. Mobil: nebeneinander ohne Überlappung.
- Punkte-Kalender bleibt auf Desktop vollbreit unter der Hauptkachel.


## 0.1.0112
- Kalender-Hero auf Desktop vollbreit gesetzt.
- Mobile Kalender-Hero im Pollen-Stil ohne innere Kacheln gestaltet.
- Kalender-Hero übernimmt Friseur- und Urlaubswerte sauberer aus den bestehenden Dashboard-Zeilen.


## 0.1.0113
- Challenges-Statuspunkte in der Hauptkachel an den Pollen-Stil angeglichen.
- Desktop vertikal, Mobil horizontal; Aufbau mit Icon links, Überschrift und Anzeige darunter.
- Abzeichen-Fortschritt auf „0 von 37“ korrigiert.


## 0.1.0114
- Kalender-Hero auf Desktop/lokal auf volle Breite gesetzt.
- Kalender-Hero-Daten für Nächster Termin, Friseur und Urlaub kompakter und zuverlässiger übernommen.
- Mobile Kalender-Hero im Pollen-Stil ohne innere Kacheln bereinigt.
- Delayed Refresh ergänzt, damit Kalender-Anzeigen nach App-Start automatisch aktuell werden.
- Challenges mobile Statuspunkte gegen Überlappung abgesichert.


## 0.1.0115
- Kalender: Nächster Termin zeigt nur noch relative Angabe wie „in 3 Tagen“.
- Kalender/Challenges: Statusfarben an Pollen angepasst.
- Challenges: Abzeichen-Zähler auf stabil „x von 37“ korrigiert.


## 0.1.0116
- Pollen-Mobilabstand zwischen Titel und Hauptkachel reduziert.
- Dashboard-Titelhöhe und Workspace-Breite an die anderen Hauptansichten angeglichen.


## 0.1.0117
- Pollen mobil vertikal an Challenges angeglichen.
- Abstand zwischen Pollen-Überschrift und Hauptkachel reduziert.


## 0.1.0118
- Fehlenden mobilen Zwischenstrich in der Challenges-Hauptkachel zwischen Heute und Offen ergänzt.


## 0.1.0119
- Überschriften in Challenges und Kalender an den Pollen-Stil angepasst.


## 0.1.0120
- Dashboard-Abschnittsüberschriften an den Pollen-Stil angepasst.


## 0.1.0121
- Abschnittsüberschriften in Challenges und Kalender außerhalb der Kacheln platziert.


## 0.1.0122
- Kalender im lokalen Desktop auf dieselbe Arbeitsbreite wie die anderen Hauptbereiche begrenzt.


## 0.1.0123
- Kalender-Hauptkachel: störende Linie unter dem Urlaub-Eintrag in der rechten Hero-Spalte entfernt.


## 0.1.0124
- Challenges mobil: Statuspunkte in der Hero-Kachel an den Pollen-Stil angepasst, größer gemacht und doppelte/überlappende Linien entfernt.


## 0.1.0125
- Pollen mobil: Abstand zwischen Titel und Hero-Kachel reduziert und vertikale Leerfläche im oberen Bereich an die anderen Ansichten angeglichen.


## 0.1.0126
- Pollen mobil: untere 24-Stunden-Ausblick-Segmente linksbündig ausgerichtet.
- Pollen mobil: Achsenbeschriftungen im Diagramm vergrößert.


## 0.1.0127
- Pollen lokal: Farben der drei Hero-Statusblöcke in der Desktop-Ansicht umgekehrt.


## 0.1.0128
- Kritischer Hotfix: Kalender-Syntaxfehler in `features/calendar/calendarPanels.js` behoben.
- Challenges-Hero-Failsafe ergänzt, damit die Hauptkachel bei fehlendem Render automatisch nachgeladen wird.


## 0.1.0129
- Challenges-HeroCard wiederhergestellt: `renderGroupGoal()` bricht nicht mehr wegen fehlender `.challenge-card-head` ab.
- Zusätzlichen Hard-Render-Hook für View-Wechsel ergänzt.


## 0.1.0130
- Pollen mobil: Abstand zwischen Seitenüberschrift und HeroCard final an Challenges angeglichen.


## 0.1.0131
- Challenges mobil: Trennstriche der Hero-Statuspunkte an Pollen angeglichen und überlappende Kurzlinien entfernt.


## 0.1.0132
- Challenges mobil: Überlappung der Status-Texte in der HeroCard behoben.


## 0.1.0133
- Kalender mobil: unnötige untere Linie beim Urlaub-Eintrag in der HeroCard entfernt, linker Trennstrich bleibt erhalten.


## 0.1.0134
- Challenges mobil: Abstand beim Hero-Statuspunkt Abzeichen korrigiert.


## 0.1.0135
- Pollen mobil: HeroCard etwas nach unten gesetzt und Abstand zur Überschrift an Challenges angeglichen.


## 0.1.0136
- Mobile HeroCards von Pollen, Challenges und Kalender auf gleiche Höhe gebracht. Dashboard bleibt unverändert.


## 0.1.0137
- Pollen mobil: HeroCard weiter nach unten gesetzt, damit der Abstand zur Überschrift wie bei Challenges wirkt.


## 0.1.0138
- Mobile HeroCards von Pollen, Challenges und Kalender auf exakt dieselbe äußere Höhe gesetzt.
- Gemeinsame CSS-Variable `--change-mobile-feature-hero-height` als kopierbare Vorlage eingeführt.


## 0.1.0139
- Pollen mobil: HeroCard mit finaler Override-Regel nach unten gesetzt, damit der Abstand zur Überschrift wie bei Challenges wirkt.


## 0.1.0140
- Pollen mobil: alte `appShell.css`-Regel `margin-top:-82px` für `.pollen-neo-shell` neutralisiert, damit die HeroCard nicht mehr zu weit oben sitzt.