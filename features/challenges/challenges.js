/**
 * Change App · challenges.js
 * ════════════════════════════════════════════════════════
 * KOMPLETTER NEUBAU des Challenge-Systems.
 *
 * Regeln:
 * - 40 Sport-Übungen im Pool (hardcoded, kein Firestore)
 * - Täglich genau 7 Übungen (deterministisch per Datum)
 * - 2 feste Optionale immer am Ende
 * - Punkte → nur change_completions in Firestore
 * - KEIN Schreiben in change_challenges Collection
 * ════════════════════════════════════════════════════════
 */
(function(){
  'use strict';

  /* ══════════════════════════════════════════
     POOL — 40 Sport-Übungen
  ══════════════════════════════════════════ */
  var POOL = [
    // Kraft
    {id:'sp_squat_10',     icon:'🏋️', title:'10 Kniebeugen',            points:10, desc:'Füße schulterbreit, Rücken gerade, langsam runter und stabil hoch.',      url:'https://www.aok.de/pk/magazin/sport/fitness/kniebeugen-richtig-ausfuehren/'},
    {id:'sp_squat_15',     icon:'🏋️', title:'15 Kniebeugen',            points:14, desc:'Etwas mehr: 15 saubere Kniebeugen, gleichmäßiges Tempo.',                  url:'https://www.aok.de/pk/magazin/sport/fitness/kniebeugen-richtig-ausfuehren/'},
    {id:'sp_squat_20',     icon:'🏋️', title:'20 Kniebeugen',            points:18, desc:'Fortgeschritten: 20 Kniebeugen, Tempo kontrolliert halten.',               url:'https://www.aok.de/pk/magazin/sport/fitness/kniebeugen-richtig-ausfuehren/'},
    {id:'sp_pushwall',     icon:'💪', title:'10 Wand-Liegestütze',       points:10, desc:'Hände auf Schulterhöhe an der Wand, Körper gerade, Arme beugen und strecken.', url:'https://www.aok.de/pk/magazin/sport/fitness/liegestuetze-richtig-ausfuehren/'},
    {id:'sp_push_10',      icon:'💪', title:'10 Liegestütze',            points:15, desc:'Klassische Liegestütze, Körper gerade wie ein Brett.',                     url:'https://www.aok.de/pk/magazin/sport/fitness/liegestuetze-richtig-ausfuehren/'},
    {id:'sp_push_5',       icon:'💪', title:'5 Liegestütze',             points:10, desc:'5 saubere Liegestütze – lieber wenige als schlechte Form.',                url:'https://www.aok.de/pk/magazin/sport/fitness/liegestuetze-richtig-ausfuehren/'},
    {id:'sp_plank_20',     icon:'⏱️', title:'20 Sek. Unterarmstütz',    points:12, desc:'Halte 20 Sekunden Plank. Leichtere Variante: Knie auf dem Boden.',         url:'https://www.aok.de/pk/magazin/sport/fitness/plank-richtig-ausfuehren/'},
    {id:'sp_plank_30',     icon:'⏱️', title:'30 Sek. Unterarmstütz',    points:16, desc:'Halte 30 Sekunden Plank, Bauch angespannt, Hüfte gerade.',                 url:'https://www.aok.de/pk/magazin/sport/fitness/plank-richtig-ausfuehren/'},
    {id:'sp_plank_45',     icon:'⏱️', title:'45 Sek. Unterarmstütz',    points:20, desc:'45 Sekunden halten – Körper wie ein Brett, gleichmäßig atmen.',            url:'https://www.aok.de/pk/magazin/sport/fitness/plank-richtig-ausfuehren/'},
    {id:'sp_lunge_8',      icon:'🏃', title:'8 Ausfallschritte',         points:12, desc:'4 pro Bein, Oberkörper aufrecht, Knie kontrolliert beugen.',               url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    {id:'sp_lunge_12',     icon:'🏃', title:'12 Ausfallschritte',        points:16, desc:'6 pro Bein, langsam und stabil, Knie nicht über die Zehen.',               url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    // Bauch
    {id:'sp_crunch_10',    icon:'🤸', title:'10 Crunches',               points:10, desc:'Hände hinter dem Kopf, Schulterblätter heben, nicht den Nacken ziehen.',   url:'https://www.aok.de/pk/magazin/sport/fitness/crunches-richtig-ausfuehren/'},
    {id:'sp_crunch_15',    icon:'🤸', title:'15 Crunches',               points:14, desc:'15 saubere Crunches, langsam und kontrolliert.',                           url:'https://www.aok.de/pk/magazin/sport/fitness/crunches-richtig-ausfuehren/'},
    {id:'sp_superman_12',  icon:'🦸', title:'12 Superman',               points:10, desc:'Bauchlage, Arme und Beine leicht anheben, 2 Sek. halten, absenken.',       url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    {id:'sp_glute_12',     icon:'🍑', title:'12 Gesäßbrücken',           points:11, desc:'Rückenlage, Füße aufgestellt, Hüfte anheben und 2 Sek. halten.',           url:'https://www.tk.de/techniker/magazin/sport/fitness/krafttraining-zuhause-2008872'},
    // Beine
    {id:'sp_calf_15',      icon:'🦵', title:'15 Wadenheben',             points:8,  desc:'Fersen langsam anheben, kurz halten, kontrolliert absenken.',              url:'https://www.tk.de/techniker/magazin/sport/fitness/krafttraining-zuhause-2008872'},
    {id:'sp_calf_25',      icon:'🦵', title:'25 Wadenheben',             points:12, desc:'25 Wiederholungen, gleichmäßiges Tempo.',                                  url:'https://www.tk.de/techniker/magazin/sport/fitness/krafttraining-zuhause-2008872'},
    {id:'sp_wallsit_30',   icon:'🪑', title:'30 Sek. Wandsitz',          points:14, desc:'Rücken an die Wand, Knie 90°, 30 Sekunden halten.',                       url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    {id:'sp_wallsit_45',   icon:'🪑', title:'45 Sek. Wandsitz',          points:18, desc:'45 Sekunden Wandsitz, Oberschenkel brennen – das ist gut!',               url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    {id:'sp_step_2min',    icon:'🪜', title:'2 Min. Treppensteigen',      points:12, desc:'Treppenhaus oder Stuhl: 2 Minuten rauf und runter, flottes Tempo.',        url:'https://www.aok.de/pk/magazin/sport/fitness/treppe-als-fitnessstudio/'},
    // Mobilität & Dehnen
    {id:'sp_shoulder_30',  icon:'🙆', title:'30 Sek. Schulterkreisen',   points:6,  desc:'Schultern langsam nach hinten und vorne kreisen, ohne Rucken.',            url:'https://www.tk.de/techniker/magazin/sport/fitness/dehnen-2008902'},
    {id:'sp_neck_roll',    icon:'🧘', title:'Nacken lockern',             points:6,  desc:'Kopf langsam nach links und rechts neigen, 30 Sekunden.',                  url:'https://www.tk.de/techniker/magazin/sport/fitness/dehnen-2008902'},
    {id:'sp_stretch_60',   icon:'🧘', title:'60 Sek. Dehnen',            points:8,  desc:'Schultern, Rücken oder Beine sanft dehnen, tief atmen.',                   url:'https://www.tk.de/techniker/magazin/sport/fitness/dehnen-2008902'},
    {id:'sp_hip_circle',   icon:'🌀', title:'Hüftkreisen 30 Sek.',       points:7,  desc:'Hände in die Hüften, Kreise mit der Hüfte, 15 Sek. je Richtung.',         url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    {id:'sp_ankle_60',     icon:'🦶', title:'60 Sek. Fußgelenke',        points:6,  desc:'Fußgelenke kreisen und bewegen, je 30 Sek. pro Seite.',                    url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    {id:'sp_hamstring',    icon:'🦵', title:'Oberschenkel dehnen',        points:7,  desc:'Im Stehen Ferse zum Gesäß ziehen, 20 Sek. halten, Seite wechseln.',       url:'https://www.tk.de/techniker/magazin/sport/fitness/dehnen-2008902'},
    // Balance & Koordination
    {id:'sp_balance_30',   icon:'⚖️', title:'30 Sek. Balance',           points:7,  desc:'15 Sek. auf jedem Bein stehen, bei Bedarf Wand zur Hilfe.',               url:'https://www.tk.de/techniker/magazin/sport/fitness/gleichgewicht-trainieren-2116034'},
    {id:'sp_balance_45',   icon:'⚖️', title:'45 Sek. Balance',           points:10, desc:'Einbeinstand je 22 Sek., Augen offen oder als Steigerung geschlossen.',   url:'https://www.tk.de/techniker/magazin/sport/fitness/gleichgewicht-trainieren-2116034'},
    {id:'sp_jump_10',      icon:'🦘', title:'10 Hampelmänner',            points:10, desc:'Arme und Beine gleichzeitig spreizen und schließen, lockers Tempo.',       url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    {id:'sp_jump_20',      icon:'🦘', title:'20 Hampelmänner',            points:14, desc:'20 Hampelmänner zügig – gute Aufwärmübung.',                              url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    // Gehen & Kreislauf
    {id:'sp_march_2',      icon:'🚶', title:'2 Min. Marschieren',         points:8,  desc:'Auf der Stelle marschieren, Knie locker anheben, Arme mitschwingen.',     url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    {id:'sp_march_3',      icon:'🚶', title:'3 Min. gehen',               points:8,  desc:'3 Minuten locker durch den Raum oder draußen gehen.',                     url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    // Schultern & Arme
    {id:'sp_arm_circle',   icon:'🙋', title:'Armkreisen 30 Sek.',         points:6,  desc:'Arme ausstrecken, große Kreise vor und zurück je 15 Sek.',                url:'https://www.tk.de/techniker/magazin/sport/fitness/dehnen-2008902'},
    {id:'sp_tricep_dip',   icon:'💪', title:'8 Stuhl-Dips',               points:12, desc:'Hände auf Stuhlkante, Körper absenken und drücken, Rücken gerade.',       url:'https://www.aok.de/pk/magazin/sport/fitness/liegestuetze-richtig-ausfuehren/'},
    {id:'sp_shoulder_tap', icon:'👊', title:'10 Shoulder Taps',           points:10, desc:'In Liegestütz-Position abwechselnd gegenüber liegende Schulter tippen.',  url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    // Rücken
    {id:'sp_cat_cow',      icon:'🐱', title:'Cat-Cow 30 Sek.',            points:7,  desc:'Auf Händen und Knien: Rücken rund machen und durchstrecken, fließend.',   url:'https://www.aok.de/pk/magazin/sport/fitness/ruecken-uebungen/'},
    {id:'sp_bird_dog',     icon:'🐦', title:'8 Bird-Dog',                 points:11, desc:'Auf Händen und Knien: gegenüberliegenden Arm und Bein strecken, halten.', url:'https://www.aok.de/pk/magazin/sport/fitness/ruecken-uebungen/'},
    {id:'sp_back_ext',     icon:'🦸', title:'10 Rückenstrecker',          points:9,  desc:'Bauchlage, Arme anlegen, Oberkörper leicht anheben und absenken.',        url:'https://www.aok.de/pk/magazin/sport/fitness/ruecken-uebungen/'},
    // Ganzkörper
    {id:'sp_burpee_5',     icon:'🔥', title:'5 Burpees',                  points:20, desc:'Aus dem Stand: Hände auf den Boden, Liegestütz-Position, zurück, hoch.',  url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    {id:'sp_mountain_20',  icon:'🏔️', title:'20 Mountain Climbers',       points:15, desc:'Liegestütz-Position, Knie abwechselnd zur Brust ziehen, flott.',          url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
  ];

  /* Feste Optionale — immer zusätzlich zu den 7 */
  var OPTIONAL = [
    {id:'opt_fitness_30', icon:'🏋️', title:'Fitness · mind. 30 Min.',  points:30, desc:'Leichtes bis mittleres Training für mindestens 30 Minuten.', optional:true},
    {id:'opt_walk_10',    icon:'🚶', title:'Spazieren · mind. 10 Min.', points:15, desc:'Gehe mindestens 10 Minuten locker spazieren.',               optional:true}
  ];

  /* ══════════════════════════════════════════
     HILFSFUNKTIONEN
  ══════════════════════════════════════════ */
  function todayStr(){
    var d = new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  }
  function pad(n){ return String(n).padStart(2,'0'); }

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function safeUrl(u){
    if(!u) return '';
    try{ var x=new URL(u); return (x.protocol==='https:'||x.protocol==='http:') ? u : ''; }catch(e){ return ''; }
  }

  /* Deterministisch: 7 Übungen aus 40 per Datum */
  function getDailyPool(dk){
    dk = dk || todayStr();
    var seed = dk.replace(/-/g,'').split('').reduce(function(a,c){ return a*31+c.charCodeAt(0); }, 0);
    var arr = POOL.slice().sort(function(a,b){ return String(a.id).localeCompare(String(b.id)); });
    var offset = ((seed % arr.length) + arr.length) % arr.length;
    var rotated = arr.slice(offset).concat(arr.slice(0, offset));
    return rotated.slice(0, 7);
  }

  /* Mein Spieler-ID */
  function myId(){
    try{
      var fu = typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser;
      if(fu && fu.email) return String(fu.email).toLowerCase().trim();
      if(fu && fu.uid)   return String(fu.uid).toLowerCase().trim();
    }catch(e){}
    var info = window.userInfo || {};
    return String(info.email || info.uid || '').toLowerCase().trim() || 'local-user';
  }

  /* Ist Challenge heute erledigt? */
  function isDoneToday(chId){
    var td = todayStr(), me = myId();
    return (window.challengeCompletions || []).some(function(c){
      return String(c.challengeId) === String(chId) &&
             String(c.date || '').slice(0,10) === td &&
             String(c.playerId || c.userEmail || c.email || '').toLowerCase() === me;
    });
  }

  /* Punkte für Datum + Spieler */
  function pointsForDate(dk, playerId){
    var td = String(dk || '').slice(0,10), me = (playerId || myId()).toLowerCase();
    return (window.challengeCompletions || []).reduce(function(sum, c){
      if(String(c.date || '').slice(0,10) === td &&
         String(c.playerId || c.userEmail || c.email || '').toLowerCase() === me)
        sum += parseInt(c.points, 10) || 0;
      return sum;
    }, 0);
  }

  /* ══════════════════════════════════════════
     CHALLENGE ERLEDIGEN
  ══════════════════════════════════════════ */
  window.completeChallenge = function(id){
    var all = getDailyPool(todayStr()).concat(OPTIONAL);
    var ch  = all.find(function(c){ return c.id === id; });
    if(!ch){
      if(typeof toast === 'function') toast('Challenge nicht gefunden','err');
      return;
    }
    if(isDoneToday(id)){
      if(typeof toast === 'function') toast('Bereits heute erledigt','');
      return;
    }
    var me  = myId();
    var pts = parseInt(ch.points, 10) || 0;
    var rec = {
      id:          'cc_'+ Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6),
      challengeId: String(id),
      playerId:    me,
      userEmail:   me,
      email:       me,
      playerName:  (window.userInfo && window.userInfo.name) || me,
      date:        todayStr(),
      points:      pts,
      createdAt:   new Date().toISOString(),
      createdAtLocal: Date.now()
    };

    window.challengeCompletions = (window.challengeCompletions || []).concat(rec);
    try{ if(typeof ls === 'function') ls('challenge_completions', window.challengeCompletions); }catch(e){}

    // Sync zu Firestore (nur change_completions — nie change_challenges)
    try{
      if(typeof window.publishCompletionToFirestore === 'function'){
        window.publishCompletionToFirestore(rec);
      } else if(typeof firebase !== 'undefined' && firebase.firestore){
        firebase.firestore().collection('change_completions').doc(rec.id).set(rec, {merge:true});
      }
    }catch(e){ console.warn('[Challenges] Firestore sync:', e); }

    if(typeof toast === 'function') toast('+'+pts+' Punkte ✓','ok');
    renderChallenges();
    try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
    try{ if(typeof window.renderCalendar === 'function') window.renderCalendar(); }catch(e){}
    try{ if(typeof checkNotifications === 'function') checkNotifications(); }catch(e){}
  };

  /* ══════════════════════════════════════════
     RÜCKGÄNGIG
  ══════════════════════════════════════════ */
  window.undoChallenge = function(id){
    var me = myId(), td = todayStr();
    var removed = [];
    window.challengeCompletions = (window.challengeCompletions || []).filter(function(c){
      var hit = String(c.challengeId) === String(id) &&
                String(c.date || '').slice(0,10) === td &&
                String(c.playerId || c.email || c.userEmail || '').toLowerCase() === me;
      if(hit) removed.push(c);
      return !hit;
    });
    try{ if(typeof ls === 'function') ls('challenge_completions', window.challengeCompletions); }catch(e){}
    // Firestore löschen
    removed.forEach(function(c){
      try{
        if(c.id && typeof firebase !== 'undefined' && firebase.firestore){
          firebase.firestore().collection('change_completions').doc(String(c.id)).delete();
        }
      }catch(e){}
    });
    if(typeof toast === 'function') toast(removed.length ? 'Zurückgesetzt' : 'Nichts zurückzusetzen','');
    renderChallenges();
    try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
  };

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  function renderChallenges(){
    var list  = document.getElementById('challenges-list');
    var board = document.getElementById('leaderboard-list');
    if(!list || !board) return;

    var dk      = todayStr();
    var daily   = getDailyPool(dk);

    /* Challenge-Item HTML */
    function chItem(ch){
      var done = isDoneToday(ch.id);
      var pts  = parseInt(ch.points, 10) || 0;
      var link = (!ch.optional && ch.url)
        ? '<a class="challenge-meta" style="color:var(--acc);text-decoration:none;font-weight:600" href="'+esc(safeUrl(ch.url))+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">Übung ansehen ↗</a>'
        : '';
      var btn = done
        ? '<button class="btn btn-success btn-sm" style="pointer-events:auto" disabled>Erledigt ✓</button>'
          +'<button class="btn btn-undo btn-sm" style="pointer-events:auto;margin-left:4px" onclick="event.stopPropagation();window.undoChallenge(\''+esc(ch.id)+'\')" title="Rückgängig">↶</button>'
        : '<button class="btn btn-primary btn-sm" style="pointer-events:auto" onclick="event.stopPropagation();window.completeChallenge(\''+esc(ch.id)+'\')">Erledigen</button>';

      return '<div class="challenge-item'+(done?' challenge-done':'')+'" style="pointer-events:auto">'
        +'<div class="challenge-icon">'+esc(ch.icon||'🏆')+'</div>'
        +'<div class="challenge-body" style="pointer-events:auto">'
        +'<div class="challenge-name">'+esc(ch.title||ch.name||'Challenge')+'</div>'
        +'<div class="challenge-meta">'+esc(ch.desc||'')+'</div>'
        +link
        +'</div>'
        +'<span class="points-pill">+'+pts+'</span>'
        +btn
        +'</div>';
    }

    /* Pflicht-Challenges */
    var html = daily.map(chItem).join('');

    /* Optionale immer anhängen */
    html += '<div class="ch-optional-section" style="margin-top:10px;padding:6px 0;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Optionale Punkte</div>';
    html += OPTIONAL.map(chItem).join('');

    list.innerHTML = html || '<div class="dash-empty">Keine Challenges geladen</div>';

    /* Leaderboard */
    try{
      var players = (window.challengePlayers || []).filter(function(p){
        return p && (p.email || p.id) && !(window.isDemoMode && p.email === 'demo@example.com');
      });
      var seen = new Set();
      players = players.filter(function(p){
        var k = String(p.email || p.id || '').toLowerCase();
        if(!k || seen.has(k)) return false;
        seen.add(k); return true;
      });
      players.sort(function(a,b){
        return pointsForDate(dk, String(b.email||b.id).toLowerCase())
             - pointsForDate(dk, String(a.email||a.id).toLowerCase());
      });

      var medals = ['🥇','🥈','🥉'];
      board.innerHTML = players.length ? players.map(function(p, i){
        var id   = String(p.email || p.id || '').toLowerCase();
        var me   = id === myId();
        var pts  = pointsForDate(dk, id);
        var tot  = (window.challengeCompletions||[]).reduce(function(s,c){
          return String(c.playerId||c.email||c.userEmail||'').toLowerCase()===id
            ? s+(parseInt(c.points,10)||0) : s;
        },0);
        var cnt  = (window.challengeCompletions||[]).filter(function(c){
          return String(c.playerId||c.email||c.userEmail||'').toLowerCase()===id;
        }).length;
        var live = p.online ? '<span class="live-dot"></span>' : '';
        var nudge = me ? '' : '<button class="nudge-btn" onclick="event.stopPropagation();window.sendNudge&&window.sendNudge(\''+esc(id)+'\',\''+esc(p.name||id)+'\')" title="Anfeuern"><span class="nudge-btn-icon">💪</span><span class="nudge-btn-label">Anfeuern</span></button>';
        return '<div class="leader-row clickable" style="pointer-events:auto" onclick="window.openPlayerRecentPanel&&window.openPlayerRecentPanel(\''+esc(id)+'\',\''+esc(p.name||p.email||'Mitspieler')+'\')">'
          +'<div class="leader-rank">'+(medals[i]||String(i+1))+'</div>'
          +'<div style="flex:1;min-width:0"><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+live+'</div>'
          +'<div class="leader-detail">Heute: '+pts+' P · Gesamt: '+tot+' P · '+cnt+' erledigt</div></div>'
          +'<div style="display:flex;align-items:center;gap:8px">'+nudge+'<div class="leader-score">'+tot+'</div></div>'
          +'</div>';
      }).join('') : '<div class="dash-empty">Noch keine Mitspieler</div>';
    }catch(e){ board.innerHTML = '<div class="dash-empty">Rangliste wird geladen…</div>'; }

    /* Gruppen-Ziel aktualisieren */
    try{ if(typeof window.renderGroupGoal === 'function') window.renderGroupGoal(); }catch(e){}
  }

  /* ══════════════════════════════════════════
     KALENDER — Punkte pro Tag
  ══════════════════════════════════════════ */
  window.getChallengePointsForDate = function(dk){
    return pointsForDate(dk, myId());
  };
  window.getChallengeDayStatus = function(dk){
    var pts = pointsForDate(dk, myId());
    return pts > 0 ? {points: pts, done: true, allDone: true} : null;
  };

  /* ══════════════════════════════════════════
     PUSH — max. 7 offen melden
  ══════════════════════════════════════════ */
  window.challengeScheduleForDate = function(dk){
    return getDailyPool(dk || todayStr());
  };

  /* ══════════════════════════════════════════
     DASHBOARD — offene Challenges
  ══════════════════════════════════════════ */
  window.getOpenChallengesForDashboard = function(){
    var dk = todayStr();
    return getDailyPool(dk).filter(function(ch){ return !isDoneToday(ch.id); }).slice(0,4);
  };

  /* ══════════════════════════════════════════
     WINDOW-EXPORTS
  ══════════════════════════════════════════ */
  window.renderChallenges            = renderChallenges;
  window.ensureDailyAutoChallenges   = function(){ return getDailyPool(todayStr()); };
  window.buildDefaultChallenges      = function(){ return getDailyPool(todayStr()); };

  // challenges Array kompatibel halten (für Legacy-Code der darauf zugreift)
  Object.defineProperty(window, 'challenges', {
    get: function(){ return getDailyPool(todayStr()).concat(OPTIONAL); },
    set: function(){ /* ignorieren — challenges kommen aus Pool */ },
    configurable: true
  });

  /* Beim Wechsel zur Challenges-View */
  var _origSetView = window.setMainView;
  if(typeof _origSetView === 'function'){
    window.setMainView = function(v, fr){
      var r = _origSetView.apply(this, [v, fr]);
      if(v === 'challenges') setTimeout(renderChallenges, 50);
      return r;
    };
  }

  /* Initial rendern wenn View aktiv */
  setTimeout(function(){
    if((window.currentMainView || '') === 'challenges') renderChallenges();
  }, 800);

  window.addEventListener('load', function(){
    setTimeout(function(){
      window.renderChallenges = renderChallenges;
      if((window.currentMainView || '') === 'challenges') renderChallenges();
    }, 1200);
  });

  console.log('[Change] challenges.js ✓ — Pool: '+POOL.length+' Übungen, täglich 7');
})();
