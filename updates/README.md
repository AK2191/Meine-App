# ZIP Updates

Hier kannst du eine geprüfte Change-App-ZIP hochladen.

Ablauf:
1. In der App ZIP prüfen.
2. ZIP hier in den Ordner `updates/` hochladen.
3. Commit auf `main` auslösen.
4. Die GitHub Action `Change ZIP Update anwenden` startet automatisch.
5. Die Action prüft Version und CLAUDE.md erneut und committet dann die entpackten Dateien.

GitHub-Token liegt nicht im Browser. Die Action nutzt den internen `GITHUB_TOKEN` mit `contents: write`.
