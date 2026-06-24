/* Change App · Benachrichtigungen · Stil
 * Zentrale Benachrichtigungslogik liegt in:
 * - core/notifications/notificationStore.js
 * - core/notifications/notificationCenter.js
 * - core/notifications/pushController.js
 * Die Glocken-UI liegt in features/notifications/notificationBell.js.
 * Diese Datei enthält ausschließlich ergänzende Styles und überschreibt keine Funktionen.
 */

(function(){
  'use strict';
  if(document.getElementById('change-notification-style-css')) return;
  var st = document.createElement('style');
  st.id = 'change-notification-style-css';
  st.textContent = `
    .change-notif-status{display:inline-flex;align-items:center;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:800;margin-left:6px;background:var(--s2);color:var(--t3)}
    .change-notif-status.on{background:rgba(34,197,94,.12);color:#15803d}
    .change-notif-status.off{background:rgba(148,163,184,.16);color:var(--t3)}
    .change-notif-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 12px}
    .change-notif-count{font-size:12px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.04em}
    .change-mark-all,.change-read-btn{border:1px solid var(--b1);background:var(--s1);color:var(--t2);border-radius:999px;cursor:pointer;font-weight:800}
    .change-mark-all{font-size:12px;padding:6px 10px}
    .change-read-btn{width:26px;height:26px;line-height:22px;text-align:center;padding:0}
    .change-mark-all:hover,.change-read-btn:hover{background:var(--s2);color:var(--t1)}
    .change-notif-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:26px 12px;color:var(--t3);text-align:center}
    .change-notif-empty strong{color:var(--t1);font-size:15px}
  `;
  document.head.appendChild(st);
})();
