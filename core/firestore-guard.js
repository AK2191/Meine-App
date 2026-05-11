/**
 * Change App · firestore-guard.js — lädt ZULETZT
 *
 * Fix 1: Firestore-Schreibflut stoppen
 * Fix 2: Notif-Panel beim Start verhindern
 * Fix 3: Settings-Button — addEventListener statt onclick
 */
(function(){
  'use strict';

  /* ── FIX 1 + 2 ── */
  function installGuards(){
    window.publishChallengesToFirestore      = async function(){ return; };
    window.publishLocalChallengesToFirestore = async function(){ return; };
    window.listenLiveChallenges              = function(){ return; };

    if(typeof window._changeLiveChallengesListener === 'function'){
      try{ window._changeLiveChallengesListener(); }catch(e){}
      window._changeLiveChallengesListener = null;
    }

    window.reqNotifPermission = function(){
      if(typeof Notification === 'undefined') return;
      if(Notification.permission === 'default'){
        Notification.requestPermission().then(function(p){
          if(p === 'granted' && typeof toast === 'function')
            toast('Benachrichtigungen aktiviert ✓', 'ok');
        });
      }
    };
  }

  /* ── FIX 3: Settings — eigener Click-Handler via addEventListener ──
   * Wir hören auf JEDEN Klick im Dokument und prüfen ob das
   * Ziel der Settings-Button ist. So kann kein anderer Code
   * unsere Handhabung blockieren.
   */
  var settingsHandlerInstalled = false;

  function installSettingsHandler(){
    if(settingsHandlerInstalled) return;
    settingsHandlerInstalled = true;

    document.addEventListener('click', function(e){
      // Prüfe ob geklicktes Element (oder ein Elternteil) der Settings-Button ist
      var el = e.target;
      while(el && el !== document){
        if(el.id === 'settings-btn' ||
           (el.getAttribute && el.getAttribute('title') === 'Einstellungen' && el.tagName === 'BUTTON')){
          // Settings-Button geklickt
          if(typeof window.openSettingsPanel === 'function'){
            window.openSettingsPanel('calendar');
          }
          return; // kein stopPropagation/preventDefault — andere Handler bleiben
        }
        el = el.parentElement;
      }
    }, true); // true = Capturing-Phase — kommt VOR onclick und anderen Bubbling-Listenern
  }

  /* Init */
  installGuards();
  installSettingsHandler();

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', installGuards);
  }
  window.addEventListener('load', function(){
    installGuards();
    installSettingsHandler();
    setTimeout(installGuards, 500);
  });

  console.log('[Change] firestore-guard.js ✓');
})();
