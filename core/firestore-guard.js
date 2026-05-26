/**
 * Change App · firestore-guard.js — lädt ZULETZT
 *
 * Aufgabe:
 *  1. Settings-Button via Capturing-Listener zuverlässig registrieren
 *  2. Notification-Permission-Request bereitstellen
 *
 * NICHT hier: Firestore-Funktionen überschreiben oder deaktivieren.
 * Der frühere "Anti-Schreibflut"-Workaround wurde entfernt – die
 * eigentliche Flut-Kontrolle liegt in publishChallengesToFirestore()
 * (Debounce + Auth-Check in app.js).
 */
(function(){
  'use strict';

  window.reqNotifPermission = function(){
    if(typeof Notification === 'undefined') return;
    if(Notification.permission === 'default'){
      Notification.requestPermission().then(function(p){
        if(p === 'granted' && typeof toast === 'function')
          toast('Benachrichtigungen aktiviert ✓', 'ok');
      });
    }
  };

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

  function repairBlockingOverlay(){
    try{
      var panel = document.getElementById('side-panel');
      var overlay = document.getElementById('panel-overlay');
      if(!panel || !overlay) return;
      if(!panel.classList.contains('open')) overlay.classList.remove('show');
    }catch(e){}
  }

  var handlerInstalled = false;
  function installSettingsHandler(){
    if(handlerInstalled) return;
    handlerInstalled = true;
    document.addEventListener('click', function(e){
      repairBlockingOverlay();
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

  installSettingsHandler();
  window.addEventListener('load', function(){ setTimeout(repairBlockingOverlay, 300); });
  setInterval(repairBlockingOverlay, 1500);

  console.log('[Change] firestore-guard.js ✓');
})();
