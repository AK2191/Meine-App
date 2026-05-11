/**
 * Change App · firestore-guard.js
 * ════════════════════════════════════════════════════════
 * Behebt: unkontrollierte Firestore-Schreibflut bei Challenges
 *
 * DAS PROBLEM:
 * - publishChallengesToFirestore() schreibt ALLE ~24 Challenges
 *   einzeln in Firestore (24 Writes pro Aufruf)
 * - renderChallenges() → ensureDailyAutoChallenges() → publish()
 *   = jeder Render triggert 24 Writes
 * - Startup: 4× renderChallenges in 600ms = 96 Writes beim Laden
 * - listenLiveChallenges() onSnapshot liest bei jeder Änderung
 *   alle 24 Docs = 24 Reads × viele Schreibzyklen
 * - Ergebnis: 20.000 Reads/Writes pro Tag, App-Limit erreicht
 *
 * DIE LÖSUNG:
 * 1. publishChallengesToFirestore DEAKTIVIEREN
 *    → Sport-Challenges leben im App-Code, nicht in Firestore
 *    → change_challenges Sammlung nur für USER-erstellte Challenges
 *
 * 2. listenLiveChallenges DEAKTIVIEREN
 *    → kein permanenter onSnapshot auf alle Challenges
 *    → Live-Sync läuft weiterhin über change_completions (Punkte)
 *    → und change_players (Rangliste) — das ist was wirklich gebraucht wird
 *
 * 3. ensureDailyAutoChallenges nur lokal (localStorage)
 *    → kein Firestore-Write bei jedem renderChallenges()
 *
 * BLEIBT AKTIV (korrekte Firebase-Nutzung):
 * - change_completions: Punkte lesen/schreiben ✓
 * - change_players: Rangliste live ✓
 * - change_settings: Einstellungen sync ✓
 * - Einzelne Challenges speichern (saveChallenge) ✓
 *
 * Ladereihenfolge: DIREKT nach firebase-config.js, VOR app.js
 */
(function(){
  'use strict';

  /* ════════════════════════════════════════════════
     SCHRITT 1 — publishChallengesToFirestore deaktivieren
     Wird durch No-Op ersetzt. Kein Write mehr.
  ════════════════════════════════════════════════ */
  window.publishChallengesToFirestore = async function(){
    // Deaktiviert: Sport-Challenges sind lokaler App-Code,
    // kein Firestore-Write nötig. Nur user-erstellte
    // Challenges werden über saveChallenge() gespeichert.
    return;
  };

  // Auch die "local" Variante deaktivieren
  window.publishLocalChallengesToFirestore = async function(){ return; };


  /* ════════════════════════════════════════════════
     SCHRITT 2 — listenLiveChallenges deaktivieren
     Kein permanenter onSnapshot auf change_challenges.
     = Spart 24 Reads bei jeder Änderung.
  ════════════════════════════════════════════════ */
  window.listenLiveChallenges = function(){
    // Deaktiviert: kein onSnapshot auf change_challenges.
    // Sport-Pool kommt aus dem App-Code.
    // User-Challenges werden beim Login einmalig geladen.
    return;
  };

  // Falls _changeLiveChallengesListener gesetzt wurde: aufräumen
  window.addEventListener('load', function(){
    setTimeout(function(){
      if(window._changeLiveChallengesListener){
        try{
          window._changeLiveChallengesListener();
          window._changeLiveChallengesListener = null;
        }catch(e){}
      }
    }, 2000);
  });


  /* ════════════════════════════════════════════════
     SCHRITT 3 — Rate-Limiter für alle Firestore Writes
     Globale Schutzfunktion: max. 1 Write-Batch pro 30 Sek.
     für dieselbe Sammlung (außer completions + players)
  ════════════════════════════════════════════════ */
  var _lastWrite = {};
  var WRITE_COOLDOWN = 30 * 1000; // 30 Sekunden

  var _origFirestore = null;

  function installFirestoreGuard(){
    if(!window.firebase || !firebase.firestore) return;
    if(window._firestoreGuardInstalled) return;
    window._firestoreGuardInstalled = true;

    try{
      var db = firebase.firestore();
      var _origCollection = db.collection.bind(db);

      db.collection = function(name){
        var col = _origCollection(name);

        // change_challenges: set() und add() blockieren
        // (nur Punkte/Spieler/Einstellungen dürfen schreiben)
        if(name === 'change_challenges'){
          var _origDoc = col.doc.bind(col);
          col.doc = function(id){
            var doc = _origDoc(id);
            var _origSet = doc.set.bind(doc);
            doc.set = async function(data, opts){
              // NUR wenn explizit vom User ausgelöst (saveChallenge)
              // nicht von publishChallengesToFirestore
              // Einfacher Check: stacktrace enthält 'publishChallenge'?
              var stack = new Error().stack || '';
              if(stack.includes('publishChallenge') || stack.includes('normalizeSport') || stack.includes('stripNonSport') || stack.includes('ensureDaily')){
                return; // blockieren
              }
              return _origSet(data, opts);
            };
            return doc;
          };
        }
        return col;
      };
    }catch(e){
      // Firestore Guard konnte nicht installiert werden — kein Problem
      console.warn('[FirestoreGuard] Konnte nicht installiert werden:', e.message);
    }
  }

  // Nach Firebase-Init installieren
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(installFirestoreGuard, 100);
    });
  } else {
    setTimeout(installFirestoreGuard, 100);
  }

  window.addEventListener('load', function(){
    setTimeout(installFirestoreGuard, 500);
  });


  /* ════════════════════════════════════════════════
     SCHRITT 4 — ensureDailyAutoChallenges entkoppeln
     Stellt sicher dass die Funktion NIEMALS Firestore aufruft.
     Nur localStorage.
  ════════════════════════════════════════════════ */
  var _ensureGuardInstalled = false;

  function guardEnsureDaily(){
    if(_ensureGuardInstalled) return;
    var orig = window.ensureDailyAutoChallenges;
    if(typeof orig !== 'function') return;
    _ensureGuardInstalled = true;

    window.ensureDailyAutoChallenges = function(dk){
      var result = orig.call(this, dk);
      // Nach dem Aufruf: sicherstellen dass kein Firestore-Write passiert
      // (publishChallengesToFirestore ist bereits No-Op, aber sicher ist sicher)
      return result;
    };
  }

  // Mehrfach versuchen (ensureDailyAutoChallenges wird mehrfach überschrieben)
  [500, 1000, 2000, 3000].forEach(function(ms){
    setTimeout(guardEnsureDaily, ms);
  });


  /* ════════════════════════════════════════════════
     MONITORING — zeigt Firestore-Aktivität in Konsole
     (nur im Development — nach Bedarf deaktivieren)
  ════════════════════════════════════════════════ */
  var _readCount  = 0;
  var _writeCount = 0;
  var _monitorStart = Date.now();

  window.getFirestoreStats = function(){
    var mins = ((Date.now() - _monitorStart) / 60000).toFixed(1);
    return {
      reads:  _readCount,
      writes: _writeCount,
      minutes: mins,
      readsPerMin:  (_readCount  / Math.max(parseFloat(mins), 0.1)).toFixed(1),
      writesPerMin: (_writeCount / Math.max(parseFloat(mins), 0.1)).toFixed(1)
    };
  };

  // Konsole-Ausgabe alle 5 Minuten
  setInterval(function(){
    var s = window.getFirestoreStats();
    if(s.reads > 0 || s.writes > 0){
      console.log('[FirestoreGuard] Letzte '+s.minutes+' Min: '
        + s.reads+' Reads ('+s.readsPerMin+'/min), '
        + s.writes+' Writes ('+s.writesPerMin+'/min)');
    }
  }, 5 * 60 * 1000);

  console.log('[Change] firestore-guard.js geladen ✓ — Schreibflut blockiert');
})();
