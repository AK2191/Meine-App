Change App – Icon Package
═════════════════════════

INHALT:
  CLAUDE.md                        → Wahrheitsdatei (ins Repo-Root)
  public/
    manifest.json                  → PWA Manifest (ins public/ Verzeichnis)
    icons/
      change-icon-512.svg          → Haupt-Icon
      change-icon-192.svg          → PWA / Homescreen Icon

INTEGRATION IN 4 SCHRITTEN:
  1. Ordner public/icons/ in dein Repo kopieren
  2. public/manifest.json in dein Repo kopieren
  3. CLAUDE.md ins Repo-Root kopieren (oder Inhalt einfügen)
  4. In index.html <head> einfügen:

     <link rel="icon" type="image/svg+xml" href="/icons/change-icon-512.svg">
     <link rel="apple-touch-icon" href="/icons/change-icon-512.svg">
     <link rel="manifest" href="/manifest.json">
     <meta name="theme-color" content="#0F172A">

  5. firebase deploy --only hosting
