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