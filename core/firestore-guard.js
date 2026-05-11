/**
 * Change App · firestore-guard.js
 * ════════════════════════════════════════════════════════
 * Behebt 3 Probleme — muss NACH app.js geladen werden:
 *
 * 1. FIRESTORE SCHREIBFLUT
 *    publishChallengesToFirestore() schreibt alle 24 Sport-
 *    Challenges einzeln. renderChallenges() ruft das mehrfach
 *    auf. Fix: No-Op nach dem Laden aller Scripts.
 *
 * 2. BENACHRICHTIGUNGS-PANEL ÖFFNET BEIM START
 *    notificationBell.js überschreibt window.reqNotifPermission
 *    mit togglePushFromBell(true) → openPanel().
 *    bootMainApp() ruft reqNotifPermission() auf → Panel öffnet.
 *    Fix: reqNotifPermission zurück auf Browser-Dialog setzen.
 *
 * 3. SETTINGS NICHT KLICKBAR
 *    Wurde durch Object.defineProperty in challenge-fixes.js
 *    verursacht. Diese Datei ersetzt den ganzen Fix sauber.
 * ════════════════════════════════════════════════════════
 */
(function(){
  'use strict';

  function install(){

    /* ── FIX 1: Firestore-Schreibflut stoppen ── */

    // publishChallengesToFirestore → No-Op
    // Sport-Challenges leben im App-Code, nicht in Firestore
    window.publishChallengesToFirestore       = async function(){ return; };
    window.publishLocalChallengesToFirestore  = async function(){ return; };

    // listenLiveChallenges → No-Op (kein onSnapshot auf change_challenges)
    window.listenLiveChallenges = function(){ return; };

    // Vorhandenen Listener aufräumen falls schon aktiv
    if(typeof window._changeLiveChallengesListener === 'function'){
      try{ window._changeLiveChallengesListener(); }catch(e){}
      window._changeLiveChallengesListener = null;
    }


    /* ── FIX 2: Benachrichtigungs-Panel nicht beim Start öffnen ── */

    // notificationBell.js hat reqNotifPermission mit togglePushFromBell(true)
    // überschrieben → öffnet Panel bei jedem Boot.
    // Fix: nur Browser-Permission anfragen, kein Panel öffnen.
    window.reqNotifPermission = function(){
      if(typeof Notification === 'undefined') return;
      if(Notification.permission === 'default'){
        Notification.requestPermission().then(function(p){
          if(p === 'granted' && typeof toast === 'function'){
            toast('Benachrichtigungen aktiviert ✓', 'ok');
          }
        });
      }
    };


    /* ── FIX 3: Klickbarkeit sichern (ohne Object.defineProperty) ── */

    // Sicherstellen dass completeChallenge existiert
    if(typeof window.completeChallenge !== 'function'){
      window.completeChallenge = function(id){
        if(typeof toast === 'function') toast('Bitte Seite neu laden','err');
      };
    }

    // CSS-Fix: Buttons in challenge-view klickbar machen
    function ensureClickable(){
      // challenge-layout und alle Kinder klickbar
      var layout = document.querySelector('.challenge-layout');
      if(layout) layout.style.pointerEvents = 'auto';

      // streak-row darf challenge-list nicht überlagern
      var streak = document.getElementById('streak-row');
      if(streak){
        streak.style.position  = 'relative';
        streak.style.zIndex    = '1';
        streak.style.pointerEvents = 'auto';
      }

      // Alle challenge-item Buttons klickbar
      document.querySelectorAll('#challenges-list .btn').forEach(function(btn){
        btn.style.pointerEvents = 'auto';
        btn.style.position = 'relative';
        btn.style.zIndex   = '10';
      });

      // Leader-rows klickbar
      document.querySelectorAll('.leader-row').forEach(function(row){
        row.style.pointerEvents = 'auto';
      });
    }

    // Nach jedem renderChallenges aufrufen
    var _origRender = window.renderChallenges;
    if(typeof _origRender === 'function'){
      window.renderChallenges = function(){
        var r = _origRender.apply(this, arguments);
        setTimeout(ensureClickable, 80);
        return r;
      };
    }

    // Nach jedem setMainView auf 'challenges'
    var _origSet = window.setMainView;
    if(typeof _origSet === 'function'){
      window.setMainView = function(v, fr){
        var r = _origSet.apply(this, [v, fr]);
        if(v === 'challenges') setTimeout(ensureClickable, 200);
        return r;
      };
    }

    // Beim Laden sofort
    setTimeout(ensureClickable, 500);
    window.addEventListener('load', function(){ setTimeout(ensureClickable, 1000); });

    console.log('[Change] firestore-guard.js ✓ — Schreibflut+Panel+Klick gefixt');
  }

  // NACH allen anderen Scripts ausführen
  // (weil app.js publishChallengesToFirestore nach uns überschreiben würde)
  if(document.readyState === 'loading'){
    // Wir sind noch im <head> oder frühem <body> — DOMContentLoaded abwarten
    document.addEventListener('DOMContentLoaded', function(){
      // Noch etwas warten damit alle inline + src Scripts gelaufen sind
      setTimeout(install, 200);
    });
  } else {
    // Dokument schon geparst — sofort aber nach Microtask-Queue
    setTimeout(install, 50);
  }

  // Sicherheitsnetz: nochmal nach load
  window.addEventListener('load', function(){
    setTimeout(install, 300);
  });

})();
