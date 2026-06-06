# CHANGELOG – Change App

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
