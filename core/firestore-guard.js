/**
 * Change App · firestore-guard.js
 * Lädt ZULETZT — nach allen anderen Scripts.
 *
 * Fix 1: Firestore-Schreibflut stoppen
 * Fix 2: Notif-Panel beim Start verhindern
 * Fix 3: Settings-Button rebinden (falls blockiert)
 */
(function(){
  'use strict';

  function install(){

    /* ── FIX 1: Firestore ── */
    window.publishChallengesToFirestore      = async function(){ return; };
    window.publishLocalChallengesToFirestore = async function(){ return; };
    window.listenLiveChallenges              = function(){ return; };

    if(typeof window._changeLiveChallengesListener === 'function'){
      try{ window._changeLiveChallengesListener(); }catch(e){}
      window._changeLiveChallengesListener = null;
    }

    /* ── FIX 2: Notif-Panel beim Boot ── */
    window.reqNotifPermission = function(){
      if(typeof Notification === 'undefined') return;
      if(Notification.permission === 'default'){
        Notification.requestPermission().then(function(p){
          if(p === 'granted' && typeof toast === 'function')
            toast('Benachrichtigungen aktiviert ✓', 'ok');
        });
      }
    };

    /* ── FIX 3: Settings-Button sicherstellen ── */
    function bindSettings(){
      var btn = document.getElementById('settings-btn')
             || document.querySelector('[title="Einstellungen"]');
      if(!btn) return;
      btn.style.pointerEvents = 'auto';
      btn.style.position      = 'relative';
      btn.style.zIndex        = '200';
      btn.onclick = function(e){
        if(e){ e.preventDefault(); e.stopPropagation(); }
        if(typeof window.openSettingsPanel === 'function'){
          window.openSettingsPanel('calendar');
        }
        return false;
      };
    }

    // Mehrfach binden um sicher zu gehen
    bindSettings();
    setTimeout(bindSettings, 500);
    setTimeout(bindSettings, 1500);
    setTimeout(bindSettings, 3000);

    console.log('[Change] firestore-guard.js ✓');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(install, 300); });
  } else {
    setTimeout(install, 50);
  }
  window.addEventListener('load', function(){ setTimeout(install, 400); });
})();
