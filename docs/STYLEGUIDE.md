# Change Styleguide

Dieser Styleguide ist die verbindliche Referenz fuer das aktuelle Erscheinungsbild. Neue UI-Arbeit soll den Stand von v0.1.0292 bewahren, solange keine ausdrueckliche Designaenderung beauftragt ist.

## Visual Baseline

- Grundstimmung: dunkle App-Shell, ruhige Forest-Green-Akzente, klare Kartenhierarchie.
- Desktop: linke Sidebar, aktiver Inhalt rechts, Notification oben rechts, keine horizontalen Ueberlaeufe.
- Mobile: kompakter Header, Bottom-Nav, HeroCards und Karten ohne Clipping.
- HeroCards: dunkle gruene Flaeche, dezenter Rahmen, grosser Titel, Illustration, Statistikbereich.
- Challenges: Linien-SVGs statt Emoji-Icons, ruhige Pills, kompakte Rangliste, mobile Karten ohne Umbruchschaden.
- Schrift: `Plus Jakarta Sans`; Monospace nur fuer technische Werte und Versionen.

## Tokens First

- Neue Designwerte muessen zuerst als Token oder vorhandene CSS-Variable geloest werden.
- Direktfarben wie `#4ade80` oder neue `rgba(...)`-Werte sind nur erlaubt, wenn ein bestehender Legacy-Block exakt nachgezogen werden muss.
- Neue Abstaende, Radien, Schatten und Farben gehoeren nicht verteilt in viele Override-Bloecke.
- Wiederkehrende Werte sollen in `styles/tokens.css` oder in klar benannten `--change-*` Variablen landen.

## CSS Ownership

- `styles/tokens.css`: globale Designwerte.
- `styles/app.css`: Basis-App, generische Controls und alte Grundregeln.
- `styles/appShell.css`: gemeinsame Shell, Desktop-Sidebar, Mobile-Bottom-Nav und view-uebergreifende Layouts.
- `features/<feature>/*.css`: Feature-spezifische Karten, Panels, Listen und Detailansichten.
- `change.css`: Legacy-Bereich; neue Arbeit dort nur, wenn ein vorhandener Legacy-Mechanismus gezielt repariert wird.

## Important Usage

- `!important` ist in dieser App eine Legacy-Realitaet, aber kein Freibrief.
- Neue `!important`-Regeln brauchen einen engen Scope, zum Beispiel `body.change-view-challenges #challenges-view ...`.
- Neue Overrides muessen kurz kommentieren, welche alte Regel sie bewusst schlagen.
- Wenn eine Regel nur wegen Spezifitaet nicht greift, erst den Gewinner per Browser/CSSOM pruefen, dann gezielt und klein ueberschreiben.

## Responsive Rules

- Desktop und Mobile muessen zusammen gedacht werden.
- Keine View darf horizontal scrollen, ausser ein bewusstes Element wie eine Rangliste ist dafuer dokumentiert.
- Mobile Bottom-Nav darf Inhalte nicht verdecken; Safe-Area-Abstaende muessen erhalten bleiben.
- Texte duerfen nicht abgeschnitten werden, wenn Umbruch moeglich ist.
- HeroCards duerfen auf Mobile weder in den Header noch in die Bottom-Nav laufen.

## Visual References

Als aktuelle Referenz gelten v0.1.0292 und die vorhandenen Arbeits-Screenshots:

- `hero-redesign-desktop.png`
- `hero-redesign-mobile.png`
- `challenges-0292-desktop.png`
- `challenges-0292-mobile.png`

Diese Screenshots liegen im Arbeitsordner neben dem App-Ordner und dienen als Vergleich, wenn Runtime-Dateien veraendert werden.
