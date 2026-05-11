/**
 * Change App · firestore-guard.js
 * ════════════════════════════════════════════════════════
 * Lädt ZULETZT — nach allen anderen Scripts.
 *
 * Fix 1: publishChallengesToFirestore → No-Op (kein Schreiben
 *         in change_challenges — läuft bei jedem renderChallenges)
 *
 * Fix 2: reqNotifPermission → nur Browser-Dialog, kein Panel
 *         (notificationBell.js hatte es mit togglePushFromBell
 *          überschrieben, was bei bootMainApp das Panel öffnete)
 * ════════════════════════════════════════════════════════
 */
(function(){
  'use strict';

  function install(){
    /* FIX 1 — Firestore-Schreibflut */
    window.publishChallengesToFirestore      = async function(){ return; };
    window.publishLocalChallengesToFirestore = async function(){ return; };
    window.listenLiveChallenges              = function(){ return; };

    if(typeof window._changeLiveChallengesListener === 'function'){
      try{ window._changeLiveChallengesListener(); }catch(e){}
      window._changeLiveChallengesListener = null;
    }

    /* FIX 2 — Notif-Panel beim Start */
    window.reqNotifPermission = function(){
      if(typeof Notification === 'undefined') return;
      if(Notification.permission === 'default'){
        Notification.requestPermission().then(function(p){
          if(p === 'granted' && typeof toast === 'function')
            toast('Benachrichtigungen aktiviert ✓','ok');
        });
      }
    };

    console.log('[Change] firestore-guard.js ✓');
  }

  // Nach allen Scripts
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(install, 300); });
  } else {
    setTimeout(install, 50);
  }
  window.addEventListener('load', function(){ setTimeout(install, 400); });
})();
