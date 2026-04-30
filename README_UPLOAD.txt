Change final fixes

Upload these files to the root of your GitHub Pages repository:
- index.html
- firebase-config.js
- firebase-messaging-sw.js
- manifest.json
- icon-192.png
- icon-512.png
- firestore.rules (not uploaded to Pages; copy into Firebase Firestore rules)
- change-final-fixes.css
- change-final-fixes.js

Fixes included:
- Mobile Firebase auth script added for Android redirect login.
- Demo user hidden outside demo mode.
- Challenge list only uses light to medium sport exercises.
- Every exercise has a working YouTube search link.
- Contest user click opens today completed exercises, today points and total points.
- Dashboard cleaned: no "Meine Punkte" and no "Alle Termine" tile.
- Today's challenge list is scrollable.
- Hover flicker reduced by removing transform-on-hover.
- Push text includes calendar reminders; test notification link is shown as small text.
- Local calendar notification loop added for upcoming calendar entries.

After upload: hard refresh on desktop and clear site data or reinstall PWA on mobile if old cache remains.
