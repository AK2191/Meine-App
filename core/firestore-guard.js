/**
 * Change App · firestore-guard.js — lädt ZULETZT
 * Fix 1: Firestore-Schreibflut
 * Fix 2: Notif-Panel beim Start
 * Fix 3: Settings-Button via Capturing-Listener
 */
(function(){
  'use strict';

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

  function openSettings(){
    try{
      if(typeof window.openSettingsPanel === 'function'){
        window.openSettingsPanel('calendar');
      } else if(window.ChangeSettingsPanel && typeof window.ChangeSettingsPanel.open === 'function'){
        window.ChangeSettingsPanel.open('calendar');
      } else {
        if(typeof openPanel === 'function')
          openPanel('Einstellungen', '<p style="padding:16px;color:var(--t3)">Einstellungen werden geladen…</p>');
      }
    }catch(err){
      if(typeof toast === 'function') toast('Einstellungen: ' + (err.message||err), 'err');
    }
  }

  var handlerInstalled = false;
  function installSettingsHandler(){
    if(handlerInstalled) return;
    handlerInstalled = true;
    document.addEventListener('click', function(e){
      var el = e.target;
      while(el && el !== document.body){
        if(el.id === 'settings-btn' ||
          (el.tagName === 'BUTTON' && el.getAttribute('title') === 'Einstellungen')){
          openSettings();
          return;
        }
        el = el.parentElement;
      }
    }, true);
  }

  installGuards();
  installSettingsHandler();

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', installGuards);
  }
  window.addEventListener('load', function(){
    installGuards();
    setTimeout(installGuards, 500);
  });

  console.log('[Change] firestore-guard.js ✓');
})();
