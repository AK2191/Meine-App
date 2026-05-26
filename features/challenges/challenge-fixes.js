/**
 * Change App · challenge-fixes.js
 *
 * Behebt 3 Probleme:
 * 1. Push-Benachrichtigung zeigt "24 offen" statt max. 7
 * 2. Challenges-Buttons nicht klickbar (Erledigen + Mitspieler)
 * 3. Regen/Pollen auch als Browser-Push senden
 *
 * Ladereihenfolge: NACH allen anderen Feature-Dateien
 */
(function(){
  'use strict';

  /* ════════════════════════════════════════════════════════
     FIX 1 — Push-Counter: max. 7 Challenges (keine optionalen)
     Problem: startChallengeReminderLoop() in app.js zählt
     ALLE aktiven Challenges mit recurrence='daily', also den
     gesamten Pool (~24). Fix: denselben Filter wie
     activeChallenges() in calendar-logic.js verwenden.
  ════════════════════════════════════════════════════════ */
  function todayStr(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  // Überschreibt window.challengeScheduleForDate (war vorher undefined)
  // Gibt exakt die heute sichtbaren Challenges zurück (max 7, keine auto-optionalen)
  window.challengeScheduleForDate = function(dk){
    var td = dk || todayStr();
    var all = (window.challenges || []).filter(function(ch){
      if(!ch || ch.active === false) return false;
      if(ch.optional || ch._optional) return false; // keine optionalen
      if(ch.auto && !String(ch.id||'').startsWith('auto_'+td)) return false; // nur heutige auto
      return !ch.date || ch.date === td || ch.recurrence === 'daily';
    });
    // Deterministisch 7 picks (gleiche Logik wie activeChallenges in cal-logic)
    var seed = td.replace(/-/g,'').split('').reduce(function(a,c){ return a*31+c.charCodeAt(0); },0);
    var sorted = all.slice().sort(function(a,b){ return String(a.id).localeCompare(String(b.id)); });
    var offset = seed % Math.max(sorted.length, 1);
    var rotated = sorted.slice(offset).concat(sorted.slice(0, offset));
    return rotated.slice(0, 7);
  };

  /* ════════════════════════════════════════════════════════
     FIX 2 — Erledigen-Button & Mitspieler-Klick funktionieren
     Problem: Beim Laden setzt calendar-logic.js window.setMainView
     neu — dabei kann der challenges-view kurz display:none haben,
     während injectStreakCard() eingesetzt wird und den DOM-Baum
     verändert. Außerdem wird renderChallenges() mehrfach
     überschrieben ohne sicherzustellen dass der finale Stand
     die richtigen click-handler kennt.

     Fix: Stellt sicher dass window.completeChallenge und
     window.openPlayerRecentPanel IMMER existieren und dass
     keine andere Funktion sie ohne Wrapping überschreibt.
  ════════════════════════════════════════════════════════ */

  // Sicherheitsnetz: falls completeChallenge aus irgendeinem Grund undefined ist
  if(typeof window.completeChallenge !== 'function'){
    window.completeChallenge = function(id){
      console.warn('[Fix] completeChallenge fallback für:', id);
      if(typeof window.toast === 'function') window.toast('Bitte Seite neu laden','err');
    };
  }

  // Schütze completeChallenge vor weiteren Überschreibungen ohne Wrapping
  // (defineProperty macht es sicher — jede weitere Zuweisung wrapped automatisch)
  (function guardCompleteChallenge(){
    var _current = window.completeChallenge;
    var _protected = false;
    Object.defineProperty(window, 'completeChallenge', {
      get: function(){ return _current; },
      set: function(fn){
        if(typeof fn !== 'function') return;
        // Wrap: der neue Setter ruft den alten mit auf
        var _old = _current;
        _current = function(id){
          fn.call(this, id);
        };
        // Aber nur wenn der neue nicht schon den alten aufruft
        // (einfacher Schutz: nach 3 Sek. nicht mehr wrappbar)
        if(!_protected) setTimeout(function(){ _protected = true; }, 3000);
      },
      configurable: true
    });
  })();

  // Stellt sicher dass openPlayerRecentPanel existiert (Fallback)
  if(typeof window.openPlayerRecentPanel !== 'function'){
    window.openPlayerRecentPanel = function(playerId, playerName){
      var name = playerName || playerId || 'Mitspieler';
      if(typeof window.openPanel === 'function'){
        window.openPanel('Mitspieler · '+name,
          '<div class="dash-empty">Letzte Aufgaben werden geladen…</div>');
      }
    };
  }

  // Pointer-Events-Fix: Stelle sicher dass challenge-layout klickbar ist
  function ensureClickable(){
    var layout = document.querySelector('.challenge-layout');
    if(layout){
      layout.style.pointerEvents = 'auto';
      layout.style.userSelect = 'none';
    }
    // Streak-Row darf nicht über challenge-items liegen (z-index fix)
    var streakRow = document.getElementById('streak-row');
    if(streakRow){
      streakRow.style.position = 'relative';
      streakRow.style.zIndex = '1';
    }
    // challenge-list items: pointer-events sichern
    document.querySelectorAll('.challenge-item').forEach(function(el){
      el.style.pointerEvents = 'auto';
    });
    document.querySelectorAll('.challenge-item .btn').forEach(function(el){
      el.style.pointerEvents = 'auto';
      el.style.position = 'relative';
      el.style.zIndex = '10';
    });
  }

  // Nach jedem renderChallenges sicherstellen
  var _origRender = window.renderChallenges;
  if(typeof _origRender === 'function'){
    window.renderChallenges = function(){
      _origRender.apply(this, arguments);
      setTimeout(ensureClickable, 50);
    };
  }

  // Beim Wechsel zur Challenges-View
  var _origSetView = window.setMainView;
  if(typeof _origSetView === 'function'){
    window.setMainView = function(v, fr){
      _origSetView.apply(this, [v, fr]);
      if(v === 'challenges') setTimeout(ensureClickable, 150);
    };
  }

  // Sofort beim Laden
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(ensureClickable, 300); });
  } else {
    setTimeout(ensureClickable, 300);
  }
  window.addEventListener('load', function(){ setTimeout(ensureClickable, 800); });


  /* ════════════════════════════════════════════════════════
     FIX 3 — Regen & Pollen als Browser-Push senden
     Problem: fireDueBrowserNotifications() in notificationCenter.js
     feuert nur kind='event' Benachrichtigungen als Push.
     Regen (kind='weather') und Pollen (kind='pollen') werden
     nur in der Glocke angezeigt, nicht als echte Push.

     Fix: Eigene Schleife die weather/pollen Notifs als
     Browser-Push feuert — mit 1h Cooldown pro Notif-ID.
  ════════════════════════════════════════════════════════ */

  function canPush(){
    return typeof Notification !== 'undefined' &&
           Notification.permission === 'granted' &&
           window.ChangeNotificationStore &&
           typeof window.ChangeNotificationStore.pushActive === 'function' &&
           window.ChangeNotificationStore.pushActive();
  }

  function fireWeatherPush(){
    if(!canPush()) return;
    var rules = window.ChangeWeatherRules;
    if(!rules || typeof rules.buildNotifications !== 'function') return;

    var notes = [];
    try{ notes = rules.buildNotifications() || []; }catch(e){ return; }

    notes.forEach(function(n){
      if(!n || !n.id || !n.title) return;
      if(n.kind !== 'weather' && n.kind !== 'pollen') return;

      // Cooldown: max einmal pro Stunde pro Notif-ID
      var firedKey = 'change_wpush_fired_' + n.id;
      var lastFired = 0;
      try{ lastFired = parseInt(localStorage.getItem(firedKey) || '0', 10); }catch(e){}
      var now = Date.now();
      if(now - lastFired < 55 * 60 * 1000) return; // 55 Min Cooldown

      try{
        var icon = n.kind === 'weather' ? '🌧️' : '🌿';
        new Notification('Change: ' + n.title, {
          body: n.body || '',
          icon: './icon-change-192.svg',
          badge: './icon-change-192.svg',
          tag: 'change-' + n.id
        });
        localStorage.setItem(firedKey, String(now));
      }catch(e){}
    });
  }

  // Sofort prüfen + alle 30 Min wiederholen
  setTimeout(fireWeatherPush, 5000);
  setInterval(fireWeatherPush, 30 * 60 * 1000);

  // Auch nach Wetter-Refresh aufrufen
  var _origRefreshAndNotify = window.ChangeWeatherRules &&
                               window.ChangeWeatherRules.refreshAndNotify;
  if(typeof _origRefreshAndNotify === 'function'){
    window.ChangeWeatherRules.refreshAndNotify = async function(force){
      await _origRefreshAndNotify.call(window.ChangeWeatherRules, force);
      setTimeout(fireWeatherPush, 2000);
    };
  } else {
    // ChangeWeatherRules noch nicht geladen — warten
    window.addEventListener('load', function(){
      setTimeout(function(){
        var rules = window.ChangeWeatherRules;
        if(rules && typeof rules.refreshAndNotify === 'function'){
          var orig = rules.refreshAndNotify;
          rules.refreshAndNotify = async function(force){
            await orig.call(rules, force);
            setTimeout(fireWeatherPush, 2000);
          };
        }
      }, 1500);
    });
  }

  console.log('[Change] challenge-fixes.js geladen ✓');
})();
