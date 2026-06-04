Change App · Challenges UI Feinschliff · Version 0.1.0043

Enthaltene Änderungen:
- features/challenges/challenges-mobile.css
- features/challenges/challenges.js
- features/pollen/pollenView.js
- features/settings/settingsPanel.js
- CLAUDE.md
- README.txt

Umsetzung:
- Challenges nutzt auf Desktop die gleiche seitliche auswählbare Navigation wie Pollen.
- Challenges nutzt auf Mobil die gleiche aktive Bottom-Navigation wie Pollen.
- Hellmodus für Challenges wieder hergestellt.
- Grün-Akzent im Challenge-Hintergrund reduziert, näher am ruhigen Pollen-Stil.
- Erledigen und Rückgängig zeigen keine Toast-/Banner-Meldung mehr.
- Anfeuern bleibt unverändert und zeigt weiterhin Banner über die bestehende Anfeuern-Logik.

Wichtig:
- Keine Änderung an Challenge-Datenmodell, Auto-Challenge-Generierung, Punkte-Logik, Firebase, Datenbank-Sync, Push, Login oder Kalenderlogik.
- Sichtbare App-Version auf 0.1.0043 erhöht und in CLAUDE.md dokumentiert.
