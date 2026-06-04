Change App · App-Shell Full-Bleed · Version 0.1.0050

Enthaltene Änderungen:
- styles/appShell.css
- features/pollen/pollenView.js
- features/settings/settingsPanel.js
- CLAUDE.md
- README.txt

Umsetzung:
- Desktop-Hintergrund liegt jetzt vollflächig auf der gesamten App-Shell statt getrennt nur im Inhaltsbereich.
- Die seitliche Navigation hat im Hellmodus keine harte rechte Border und keinen Schatten mehr.
- Der Content-Bereich ist transparent, damit keine getrennten Hintergrundflächen oder sichtbaren Kanten entstehen.
- Dashboard, Kalender, Challenges und Pollen nutzen dieselbe Shell-Regel.

Wichtig:
- Keine Änderung an Login, Firebase, Datenbank-Sync, Push, Kalenderdaten, Pollen-API oder Challenge-Logik.
- Sichtbare App-Version auf 0.1.0050 erhöht und in CLAUDE.md dokumentiert.
