/**
 * Change App · challenges.js
 * 40 Sport-Übungen · 7 täglich deterministisch · 2 feste Optionale
 */
(function(){
  'use strict';

  /* ─── Dark-Mode Fix für btn-undo ─── */
  (function(){
    var id = 'ch-style-fix';
    if(document.getElementById(id)) return;
    var s = document.createElement('style');
    s.id = id;
    s.textContent =
      '[data-theme="dark"] .challenge-done{background:rgba(22,163,74,.10)!important;border-left:3px solid rgba(74,222,128,.4)!important}' +
      '.btn-undo{background:rgba(220,38,38,.10)!important;border:1px solid rgba(220,38,38,.25)!important;color:#dc2626!important;min-width:36px!important;font-weight:800!important}' +
      '.btn-undo:hover{background:rgba(220,38,38,.20)!important}' +
      '[data-theme="dark"] .btn-undo{background:rgba(248,113,113,.12)!important;border-color:rgba(248,113,113,.28)!important;color:#f87171!important}' +
      '.ch-difficulty-badge{display:inline-flex;align-items:center;border-radius:999px;background:rgba(15,118,110,.08);color:#0f766e;border:1px solid rgba(15,118,110,.16);font-size:10px;font-weight:800;line-height:1;padding:3px 7px;margin-left:6px;white-space:nowrap}' +
      '[data-theme="dark"] .ch-difficulty-badge{background:rgba(45,212,191,.12);color:#5eead4;border-color:rgba(45,212,191,.20)}';
    document.head.appendChild(s);
  })();

  /* ─── Pool: 40 Übungen mit YouTube-Links ─── */
  var YT = 'https://www.youtube.com/results?search_query=';
  var POOL = [
    {id:'sp_squat_10',    icon:'🏋️', title:'10 Kniebeugen',           points:10, desc:'Füße schulterbreit, Rücken gerade, langsam runter und stabil hoch.',        url:YT+'kniebeugen+richtig+ausfuehren'},
    {id:'sp_squat_15',    icon:'🏋️', title:'15 Kniebeugen',           points:14, desc:'Etwas mehr: 15 saubere Kniebeugen, gleichmäßiges Tempo.',                   url:YT+'kniebeugen+15+wiederholungen'},
    {id:'sp_squat_20',    icon:'🏋️', title:'20 Kniebeugen',           points:18, desc:'Fortgeschritten: 20 Kniebeugen, Tempo kontrolliert halten.',                url:YT+'kniebeugen+20+anfaenger'},
    {id:'sp_pushwall',    icon:'💪', title:'10 Wand-Liegestütze',      points:10, desc:'Hände auf Schulterhöhe an der Wand, Körper gerade, Arme beugen und strecken.', url:YT+'wand+liegestuetze+richtig'},
    {id:'sp_push_5',      icon:'💪', title:'5 Liegestütze',            points:10, desc:'5 saubere Liegestütze – lieber wenige als schlechte Form.',                 url:YT+'liegestuetze+anfaenger+richtig'},
    {id:'sp_push_10',     icon:'💪', title:'10 Liegestütze',           points:15, desc:'Klassische Liegestütze, Körper gerade wie ein Brett.',                      url:YT+'liegestuetze+10+richtig+ausfuehren'},
    {id:'sp_plank_20',    icon:'⏱️', title:'20 Sek. Unterarmstütz',   points:12, desc:'Halte 20 Sekunden Plank. Leichtere Variante: Knie auf dem Boden.',          url:YT+'plank+unterarmstuetz+anfaenger'},
    {id:'sp_plank_30',    icon:'⏱️', title:'30 Sek. Unterarmstütz',   points:16, desc:'Halte 30 Sekunden Plank, Bauch angespannt, Hüfte gerade.',                  url:YT+'plank+30+sekunden+richtig'},
    {id:'sp_plank_45',    icon:'⏱️', title:'45 Sek. Unterarmstütz',   points:20, desc:'45 Sekunden halten – Körper wie ein Brett, gleichmäßig atmen.',             url:YT+'plank+45+sekunden+training'},
    {id:'sp_lunge_8',     icon:'🏃', title:'8 Ausfallschritte',        points:12, desc:'4 pro Bein, Oberkörper aufrecht, Knie kontrolliert beugen.',                url:YT+'ausfallschritte+richtig+anfaenger'},
    {id:'sp_lunge_12',    icon:'🏃', title:'12 Ausfallschritte',       points:16, desc:'6 pro Bein, langsam und stabil, Knie nicht über die Zehen.',                url:YT+'ausfallschritte+12+wiederholungen'},
    {id:'sp_crunch_10',   icon:'🤸', title:'10 Crunches',              points:10, desc:'Hände hinter dem Kopf, Schulterblätter heben, nicht den Nacken ziehen.',    url:YT+'crunches+richtig+ausfuehren+anfaenger'},
    {id:'sp_crunch_15',   icon:'🤸', title:'15 Crunches',              points:14, desc:'15 saubere Crunches, langsam und kontrolliert.',                            url:YT+'crunches+15+bauchmuskel'},
    {id:'sp_superman_12', icon:'🦸', title:'12 Superman',              points:10, desc:'Bauchlage, Arme und Beine leicht anheben, 2 Sek. halten, absenken.',        url:YT+'superman+uebung+ruecken+anfaenger'},
    {id:'sp_glute_12',    icon:'🍑', title:'12 Gesäßbrücken',          points:11, desc:'Rückenlage, Füße aufgestellt, Hüfte anheben und 2 Sek. halten.',            url:YT+'gesaessbruecken+richtig+ausfuehren'},
    {id:'sp_calf_15',     icon:'🦵', title:'15 Wadenheben',            points:8,  desc:'Fersen langsam anheben, kurz halten, kontrolliert absenken.',               url:YT+'wadenheben+stehend+anfaenger'},
    {id:'sp_calf_25',     icon:'🦵', title:'25 Wadenheben',            points:12, desc:'25 Wiederholungen, gleichmäßiges Tempo.',                                   url:YT+'wadenheben+25+wiederholungen'},
    {id:'sp_wallsit_30',  icon:'🪑', title:'30 Sek. Wandsitz',         points:14, desc:'Rücken an die Wand, Knie 90°, 30 Sekunden halten.',                        url:YT+'wandsitzen+30+sekunden+anfaenger'},
    {id:'sp_wallsit_45',  icon:'🪑', title:'45 Sek. Wandsitz',         points:18, desc:'45 Sekunden Wandsitz – Oberschenkel brennen, das ist gut!',                url:YT+'wandsitzen+45+sekunden+training'},
    {id:'sp_step_2min',   icon:'🪜', title:'2 Min. Treppensteigen',     points:12, desc:'Treppenhaus oder Stuhl: 2 Minuten rauf und runter, flottes Tempo.',         url:YT+'treppensteigen+training+zuhause'},
    {id:'sp_shoulder_30', icon:'🙆', title:'30 Sek. Schulterkreisen',  points:6,  desc:'Schultern langsam nach hinten und vorne kreisen, ohne Rucken.',             url:YT+'schulterkreisen+dehnen+uebung'},
    {id:'sp_neck_roll',   icon:'🧘', title:'Nacken lockern',            points:6,  desc:'Kopf langsam nach links und rechts neigen, 30 Sekunden.',                   url:YT+'nacken+lockern+dehnen+uebung'},
    {id:'sp_stretch_60',  icon:'🧘', title:'60 Sek. Dehnen',           points:8,  desc:'Schultern, Rücken oder Beine sanft dehnen, tief atmen.',                    url:YT+'dehnen+anfaenger+60+sekunden'},
    {id:'sp_hip_circle',  icon:'🌀', title:'Hüftkreisen 30 Sek.',      points:7,  desc:'Hände in die Hüften, Kreise mit der Hüfte, 15 Sek. je Richtung.',          url:YT+'hueftkreisen+mobilitaet+uebung'},
    {id:'sp_ankle_60',    icon:'🦶', title:'60 Sek. Fußgelenke',       points:6,  desc:'Fußgelenke kreisen und bewegen, je 30 Sek. pro Seite.',                     url:YT+'fussgelenke+mobilisieren+uebung'},
    {id:'sp_hamstring',   icon:'🦵', title:'Oberschenkel dehnen',       points:7,  desc:'Im Stehen Ferse zum Gesäß ziehen, 20 Sek. halten, Seite wechseln.',        url:YT+'oberschenkel+dehnen+stehend'},
    {id:'sp_balance_30',  icon:'⚖️', title:'30 Sek. Balance',          points:7,  desc:'15 Sek. auf jedem Bein stehen, bei Bedarf Wand zur Hilfe.',                url:YT+'einbeinstand+balance+uebung'},
    {id:'sp_balance_45',  icon:'⚖️', title:'45 Sek. Balance',          points:10, desc:'Einbeinstand je 22 Sek., Augen offen oder als Steigerung geschlossen.',    url:YT+'gleichgewicht+training+zuhause'},
    {id:'sp_jump_10',     icon:'🦘', title:'10 Hampelmänner',           points:10, desc:'Arme und Beine gleichzeitig spreizen und schließen, lockeres Tempo.',      url:YT+'hampelmann+uebung+aufwaermen'},
    {id:'sp_jump_20',     icon:'🦘', title:'20 Hampelmänner',           points:14, desc:'20 Hampelmänner zügig – gute Aufwärmübung.',                               url:YT+'hampelmann+20+aufwaermen+anfaenger'},
    {id:'sp_march_2',     icon:'🚶', title:'2 Min. Marschieren',        points:8,  desc:'Auf der Stelle marschieren, Knie locker anheben, Arme mitschwingen.',      url:YT+'marschieren+stelle+zuhause+training'},
    {id:'sp_march_3',     icon:'🚶', title:'3 Min. gehen',              points:8,  desc:'3 Minuten locker durch den Raum oder draußen gehen.',                      url:YT+'spazieren+locker+gehen+gesundheit'},
    {id:'sp_arm_circle',  icon:'🙋', title:'Armkreisen 30 Sek.',       points:6,  desc:'Arme ausstrecken, große Kreise vor und zurück je 15 Sek.',                 url:YT+'armkreisen+schulter+aufwaermen'},
    {id:'sp_tricep_dip',  icon:'💪', title:'8 Stuhl-Dips',             points:12, desc:'Hände auf Stuhlkante, Körper absenken und drücken, Rücken gerade.',        url:YT+'stuhl+dips+trizeps+zuhause'},
    {id:'sp_shoulder_tap',icon:'👊', title:'10 Shoulder Taps',         points:10, desc:'In Liegestütz-Position abwechselnd gegenüber liegende Schulter tippen.',   url:YT+'shoulder+tap+uebung+anfaenger'},
    {id:'sp_cat_cow',     icon:'🐱', title:'Cat-Cow 30 Sek.',          points:7,  desc:'Auf Händen und Knien: Rücken rund machen und durchstrecken, fließend.',    url:YT+'cat+cow+ruecken+uebung+yoga'},
    {id:'sp_bird_dog',    icon:'🐦', title:'8 Bird-Dog',               points:11, desc:'Auf Händen und Knien: gegenüberliegenden Arm und Bein strecken, halten.',  url:YT+'bird+dog+uebung+ruecken+anfaenger'},
    {id:'sp_back_ext',    icon:'🦸', title:'10 Rückenstrecker',        points:9,  desc:'Bauchlage, Arme anlegen, Oberkörper leicht anheben und absenken.',         url:YT+'rueckenstrecker+bauchlage+uebung'},
    {id:'sp_burpee_5',    icon:'🔥', title:'5 Burpees',                points:20, desc:'Aus dem Stand: Hände auf den Boden, Liegestütz-Position, zurück, hoch.',   url:YT+'burpee+anfaenger+anleitung+deutsch'},
    {id:'sp_mountain_20', icon:'🏔️', title:'20 Mountain Climbers',     points:15, desc:'Liegestütz-Position, Knie abwechselnd zur Brust ziehen, flott.',           url:YT+'mountain+climber+uebung+anfaenger'},
  ];

  var OPTIONAL = [
    {id:'opt_fitness_30', icon:'🏋️', title:'Fitness · mind. 30 Min.', points:30, desc:'Freie Fitness-Einheit für mindestens 30 Minuten.', optional:true},
    {id:'opt_walk_10',    icon:'🚶', title:'Spazieren',                points:10, desc:'Gehe bewusst eine Runde spazieren.', optional:true},
    {id:'opt_bike_12',    icon:'🚲', title:'Fahrrad fahren',            points:12, desc:'Fahre eine lockere Runde Fahrrad.', optional:true},
    {id:'opt_jog_12',     icon:'🏃', title:'Joggen',                    points:12, desc:'Gehe eine kurze Runde joggen.', optional:true}
  ];
  var OPTIONAL_ALIASES = {
    opt_fitness_30:'opt_fitness_30', sport_fitness_30_optional:'opt_fitness_30',
    opt_walk_10:'opt_walk_10', sport_walk_10_optional:'opt_walk_10',
    opt_bike_12:'opt_bike_12', sport_bike_12_optional:'opt_bike_12',
    opt_jog_12:'opt_jog_12', sport_jog_12_optional:'opt_jog_12'
  };
  function optionalKey(ch){
    if(!ch) return '';
    var id = String(ch.id || '').trim();
    if(OPTIONAL_ALIASES[id]) return OPTIONAL_ALIASES[id];
    var text = String((ch.title || ch.name || '') + ' ' + (ch.desc || '')).toLowerCase();
    if(/fitness/.test(text)) return 'opt_fitness_30';
    if(/spazier|walk/.test(text)) return 'opt_walk_10';
    if(/fahrrad|radfahren|bike|cycling/.test(text)) return 'opt_bike_12';
    if(/joggen|jogging|laufen/.test(text)) return 'opt_jog_12';
    return '';
  }

  function difficultyApi(){
    return window.ChangeChallengeDifficulty || null;
  }

  function findById(id){
    id = String(id||'');
    var D = difficultyApi();
    if(D && typeof D.findChallengeById === 'function'){
      var found = D.findChallengeById(id);
      if(found) return found;
    }
    for(var i=0;i<POOL.length;i++) if(String(POOL[i].id)===id) return POOL[i];
    for(var j=0;j<OPTIONAL.length;j++) if(String(OPTIONAL[j].id)===id) return OPTIONAL[j];
    return null;
  }

  function hydrateLegacyChallenge(ch){
    ch = ch || {};
    var base = findById(ch.id) || {};
    return {
      id: ch.id || base.id,
      title: ch.title || ch.name || base.title || 'Challenge',
      desc: ch.desc || base.desc || '',
      icon: ch.icon || base.icon || '🏆',
      points: parseInt(ch.points,10) || parseInt(base.points,10) || 0,
      url: ch.url || ch.video || ch.youtube || ch.youtubeUrl || ch.link || base.url || '',
      link: ch.link || ch.url || ch.youtubeUrl || base.url || '',
      youtubeUrl: ch.youtubeUrl || ch.url || ch.link || base.url || '',
      active: ch.active !== false,
      date: ch.date || ch.generatedFor || todayStr(),
      generatedFor: ch.generatedFor || ch.date || '',
      generationKey: ch.generationKey || '',
      autoVersion: ch.autoVersion || '',
      recurrence: ch.recurrence || 'daily',
      type: ch.type || 'Sport',
      source: ch.source || (ch.auto ? 'auto' : ''),
      auto: ch.auto === true,
      difficulty: ch.difficulty || base.difficulty || 'easy',
      difficultyLabel: ch.difficultyLabel || ch.level || base.difficultyLabel || base.level || 'Leicht',
      level: ch.level || ch.difficultyLabel || base.level || base.difficultyLabel || '',
      optional: !!(ch.optional || base.optional)
    };
  }

  /* ─── Hilfsfunktionen ─── */
  function pad(n){ return String(n).padStart(2,'0'); }
  function todayStr(){
    var d=new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  }
  function esc(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function safeUrl(u){
    if(!u) return '';
    try{ var x=new URL(u); return (x.protocol==='https:'||x.protocol==='http:') ? u : ''; }catch(e){ return ''; }
  }

  /* Dynamisch deterministisch per Datum, Schwierigkeit und eingestelltem Tagesumfang */
  function getDailyPool(dk){
    dk=dk||todayStr();
    var D = difficultyApi();
    if(D && typeof D.ensureDailyState === 'function'){
      return D.ensureDailyState(dk, null, {persist:true});
    }
    if(D && typeof D.buildDailyChallenges === 'function'){
      return D.buildDailyChallenges(dk);
    }
    var seed=dk.replace(/-/g,'').split('').reduce(function(a,c){return a*31+c.charCodeAt(0);},0);
    var arr=POOL.slice().sort(function(a,b){return String(a.id).localeCompare(String(b.id));});
    var off=((seed%arr.length)+arr.length)%arr.length;
    var count = (D && D.getDailyCount) ? D.getDailyCount() : 7;
    return arr.slice(off).concat(arr.slice(0,off)).slice(0,count).map(function(ch){
      return Object.assign({difficulty:'easy', difficultyLabel:'Leicht', level:'Leicht'}, ch);
    });
  }

  /* Spieler-ID – robust, alle Quellen */
  function myId(){
    // 1. Firebase Auth (sicherste Quelle)
    try{
      var fu=typeof firebase!=='undefined'&&firebase.auth&&firebase.auth().currentUser;
      if(fu&&fu.email) return fu.email.toLowerCase().trim();
    }catch(e){}
    // 2. window.userInfo (gesetzt von firebaseAuthBridge)
    try{ var wi=window.userInfo; if(wi&&wi.email) return String(wi.email).toLowerCase().trim(); }catch(e){}
    // 3. localStorage-Cache (gesetzt von saveUserProfileInfo)
    try{
      var cached=['change_v1_user_email','user_email'];
      for(var ci=0;ci<cached.length;ci++){
        var v=localStorage.getItem(cached[ci]);
        if(v&&v.includes('@')) return v.toLowerCase().trim();
      }
    }catch(e){}
    // 4. ls('user_info_safe')
    try{
      if(typeof ls==='function'){
        var safe=ls('user_info_safe')||ls('user_info');
        if(safe&&safe.email) return String(safe.email).toLowerCase().trim();
      }
    }catch(e){}
    // 5. Direkt aus localStorage JSON
    try{
      var raw=localStorage.getItem('user_info_safe')||localStorage.getItem('change_v1_user_info')||localStorage.getItem('user_info');
      if(raw){ var obj=JSON.parse(raw); if(obj&&obj.email) return String(obj.email).toLowerCase().trim(); }
    }catch(e){}
    return 'local-user';
  }

  /* ─── Spieler-Panel (Klick auf Ranglisten-Eintrag) ─── */
  window.openPlayerRecentPanel = function(playerId, playerName){
    var id = String(playerId||'').toLowerCase();
    var name = playerName || id || 'Mitspieler';
    var completions = (window.challengeCompletions||[]);

    // Statistik
    var todayKey = todayStr();
    var todayPts = 0, totalPts = 0, done = [];
    completions.forEach(function(c){
      var cid = String(c.playerId||c.userEmail||c.email||'').toLowerCase();
      if(cid!==id) return;
      var pts = parseInt(c.points,10)||0;
      totalPts += pts;
      if(String(c.date||'').slice(0,10)===todayKey) todayPts += pts;
      done.push(c);
    });
    done.sort(function(a,b){ return String(b.createdAt||b.date||'').localeCompare(String(a.createdAt||a.date||'')); });
    var last5 = done.slice(0,5);

    // Challenge-Name auflösen
    function chName(c){
      var pool = getDailyPool(todayStr()).concat(OPTIONAL);
      var found = pool.find(function(x){return x.id===String(c.challengeId||'');});
      return (found&&found.title)||c.challengeTitle||c.challengeId||'Aufgabe';
    }
    function chIcon(c){
      var pool = getDailyPool(todayStr()).concat(OPTIONAL);
      var found = pool.find(function(x){return x.id===String(c.challengeId||'');});
      return (found&&found.icon)||c.icon||'✅';
    }
    function fmtDate(c){
      var d = c.date||'';
      if(!d) return '';
      try{ var dt=new Date(d+'T12:00:00'); return dt.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}); }catch(e){ return d; }
    }

    function taskRows(items){
      return items.length
        ? items.map(function(c){
            var pts=parseInt(c.points,10)||0;
            return '<div class="change-player-row">'
              +'<div class="change-player-row-icon">'+esc(chIcon(c))+'</div>'
              +'<div class="change-player-row-main"><div class="change-player-row-title">'+esc(chName(c))+'</div>'
              +'<div class="change-player-row-meta">'+fmtDate(c)+(pts?' · +'+pts+' P':'')+'</div></div>'
              +'</div>';
          }).join('')
        : '<div class="change-player-empty">Noch keine erledigten Aufgaben</div>';
    }

    var highlight = last5[0]
      ? '<div class="change-player-highlight"><div class="change-player-highlight-icon">'+esc(chIcon(last5[0]))+'</div><div><strong>'+esc(chName(last5[0]))+'</strong><span>'+fmtDate(last5[0])+(parseInt(last5[0].points,10)?' · +'+parseInt(last5[0].points,10)+' P':'')+'</span></div></div>'
      : '';

    var html = '<div class="change-player-panel">'
      +'<div class="change-player-summary">'
        +'<div><strong>'+todayPts+'</strong><span>Pkt. heute</span></div>'
        +'<div><strong>'+totalPts+'</strong><span>Pkt. gesamt</span></div>'
        +'<div><strong>'+done.length+'</strong><span>Aufgaben</span></div>'
      +'</div>'
      +highlight
      +'<div class="change-player-section-title">Letzte Aufgaben</div>'
      +'<div class="change-player-list">'+taskRows(last5)+'</div>'
    +'</div>';

    if(typeof openPanel==='function') openPanel(name, html);
  };

  /* Erledigt heute? */
  function isDoneToday(chId){
    var td=todayStr(), me=myId();
    return (window.challengeCompletions||[]).some(function(c){
      return String(c.challengeId)===String(chId)&&
             String(c.date||'').slice(0,10)===td&&
             String(c.playerId||c.userEmail||c.email||'').toLowerCase()===me;
    });
  }

  /* Punkte für Datum */
  function pointsForDate(dk,pid){
    var td=String(dk||'').slice(0,10), me=(pid||myId()).toLowerCase();
    return (window.challengeCompletions||[]).reduce(function(s,c){
      if(String(c.date||'').slice(0,10)===td&&String(c.playerId||c.userEmail||c.email||'').toLowerCase()===me)
        s+=parseInt(c.points,10)||0;
      return s;
    },0);
  }

  /* ─── Erledigen ─── */
  window.completeChallenge=function(id){
    var all=getDailyPool(todayStr()).concat(OPTIONAL);
    var ch=all.find(function(c){return c.id===id;});
    if(!ch){if(typeof toast==='function')toast('Challenge nicht gefunden','err');return;}
    if(isDoneToday(id)){if(typeof toast==='function')toast('Bereits heute erledigt','');return;}
    var me=myId(), pts=parseInt(ch.points,10)||0;
    var rec={
      id:'cc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6),
      challengeId:String(id), playerId:me, userEmail:me, email:me,
      playerName:(window.userInfo&&window.userInfo.name)||me,
      date:todayStr(), points:pts,
      difficulty: ch.difficulty || ch.level || (window.ChangeChallengeDifficulty&&window.ChangeChallengeDifficulty.get?window.ChangeChallengeDifficulty.get():''),
      difficultyLabel: ch.difficultyLabel || ch.level || '',
      source: ch.source || (ch.auto===true?'auto':''),
      auto: ch.auto === true,
      createdAt:new Date().toISOString(), createdAtLocal:Date.now()
    };
    window.challengeCompletions=(window.challengeCompletions||[]).concat(rec);
    try{if(typeof ls==='function')ls('challenge_completions',window.challengeCompletions);}catch(e){}
    // Nur change_completions schreiben — nie change_challenges
    try{
      if(typeof window.publishCompletionToFirestore==='function'){
        window.publishCompletionToFirestore(rec);
      } else if(typeof firebase!=='undefined'&&firebase.firestore){
        firebase.firestore().collection('change_completions').doc(rec.id).set(rec,{merge:true});
      }
    }catch(e){}
    if(typeof toast==='function') toast('+'+pts+' Punkte ✓','ok');
    // Glocke nicht hochzählen: challenge-Notif als gelesen markieren
    try{
      var notifId='challenge:daily:'+todayStr();
      if(window.ChangeNotificationStore&&typeof window.ChangeNotificationStore.markRead==='function')
        window.ChangeNotificationStore.markRead(notifId);
      if(typeof window.updateBellIndicator==='function') window.updateBellIndicator();
    }catch(e){}
    renderChallenges();
    try{if(typeof buildDashboard==='function')buildDashboard();}catch(e){}
    try{if(typeof window.renderCalendar==='function')window.renderCalendar();}catch(e){}
    try{if(typeof window.renderWeekBar==='function')window.renderWeekBar();}catch(e){}
    // Achievements + Streak nach Erledigung prüfen
    setTimeout(function(){
      try{if(typeof checkNewBadges==='function')checkNewBadges();}catch(e){}
      try{if(typeof window.syncStreakToFirestore==='function')window.syncStreakToFirestore();}catch(e){}
      try{if(typeof injectStreakCard==='function')injectStreakCard();}catch(e){}
    }, 700);
  };

  /* ─── Rückgängig ─── */
  window.undoChallenge=function(id){
    var me=myId(), td=todayStr(), removed=[];
    window.challengeCompletions=(window.challengeCompletions||[]).filter(function(c){
      var hit=String(c.challengeId)===String(id)&&String(c.date||'').slice(0,10)===td&&
               String(c.playerId||c.email||c.userEmail||'').toLowerCase()===me;
      if(hit)removed.push(c); return !hit;
    });
    try{if(typeof ls==='function')ls('challenge_completions',window.challengeCompletions);}catch(e){}
    removed.forEach(function(c){
      try{if(c.id&&typeof firebase!=='undefined'&&firebase.firestore)
        firebase.firestore().collection('change_completions').doc(String(c.id)).delete();}catch(e){}
    });
    if(typeof toast==='function') toast(removed.length?'Zurückgesetzt':'Nichts zurückzusetzen','');
    renderChallenges();
    try{if(typeof buildDashboard==='function')buildDashboard();}catch(e){}
    try{if(typeof window.renderCalendar==='function')window.renderCalendar();}catch(e){}
    try{if(typeof window.renderWeekBar==='function')window.renderWeekBar();}catch(e){}
  };

  /* ─── Render ─── */
  function renderChallenges(){
    var list=document.getElementById('challenges-list');
    var board=document.getElementById('leaderboard-list');
    if(!list||!board) return;

    var dk=todayStr(), daily=getDailyPool(dk);

    function chItem(ch){
      var done = isDoneToday(ch.id), pts = parseInt(ch.points,10)||0;

      var linkHtml = (!ch.optional && ch.url)
        ? '<a class="ch-link" href="'+esc(safeUrl(ch.url))+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">Übung ansehen ↗</a>'
        : '';

      var btnHtml = done
        ? '<div class="ch-done-group">'
            +'<button class="btn btn-success btn-sm ch-do-btn" disabled>Erledigt ✓</button>'
            +'<button class="btn btn-undo btn-sm" onclick="event.stopPropagation();window.undoChallenge(\''+esc(ch.id)+'\')" title="Rückgängig">↶</button>'
          +'</div>'
        : '<button class="btn btn-primary btn-sm ch-do-btn" onclick="event.stopPropagation();window.completeChallenge(\''+esc(ch.id)+'\')">Erledigen</button>';

      // Struktur:
      // [Icon] [Body: Zeile1(Name + Pts) / Zeile2(Desc) / Zeile3(Link + Button)]
      return '<div class="challenge-item'+(done?' challenge-done':'')+'">'
        +'<div class="challenge-icon">'+esc(ch.icon||'🏆')+'</div>'
        +'<div class="challenge-body">'
          +'<div class="ch-top-row">'
            +'<span class="challenge-name">'+esc(ch.title||'Challenge')+(ch.difficultyLabel&&!ch.optional?' <span class="ch-difficulty-badge">'+esc(ch.difficultyLabel)+'</span>':'')+'</span>'
            +'<span class="points-pill">+'+pts+'</span>'
          +'</div>'
          +'<div class="challenge-meta">'+esc(ch.desc||'')+'</div>'
          +'<div class="ch-action-row">'+linkHtml+btnHtml+'</div>'
        +'</div>'
        +'</div>';
    }

    list.setAttribute('data-render-owner','change-challenges');

    var html=daily.map(chItem).join('');
    html+='<div class="ch-optional-section" style="margin:10px 0 4px;padding:8px 16px;font-size:10px;font-weight:800;color:var(--t4);text-transform:uppercase;letter-spacing:.07em;border-top:1px solid var(--b1)">Optionale Punkte</div>';
    html+=OPTIONAL.map(chItem).join('');
    list.innerHTML=html;

    // Leaderboard
    try{
      var seen=new Set();
      var players=(window.challengePlayers||[]).filter(function(p){
        var k=String(p.email||p.id||'').toLowerCase();
        if(!k||seen.has(k)) return false; seen.add(k); return true;
      }).sort(function(a,b){
        return pointsForDate(dk,String(b.email||b.id).toLowerCase())
              -pointsForDate(dk,String(a.email||a.id).toLowerCase());
      });
      var medals=['🥇','🥈','🥉'];
      var suggestions=[];
      try{ if(window.ChangePlayerActivity && window.ChangePlayerActivity.smartNudgeSuggestions) suggestions=window.ChangePlayerActivity.smartNudgeSuggestions(2)||[]; }catch(e){}
      var suggestionHtml = suggestions.length ? '<div class="smart-nudge-card"><div><div class="smart-nudge-title">Anfeuern vorgeschlagen</div><div class="smart-nudge-sub">'+esc(suggestions[0].playerName)+' · '+esc(suggestions[0].reason)+'</div></div><button class="nudge-btn" onclick="event.stopPropagation();window.sendNudge&&window.sendNudge(\''+esc(suggestions[0].playerId)+'\',\''+esc(suggestions[0].playerName)+'\')"><span class="nudge-btn-icon">💪</span><span class="nudge-btn-label">Anfeuern</span></button></div>' : '';
      board.innerHTML=players.length?suggestionHtml+players.map(function(p,i){
        var id=String(p.email||p.id||'').toLowerCase(), me=id===myId();
        var pts=pointsForDate(dk,id);
        var tot=(window.challengeCompletions||[]).reduce(function(s,c){
          return String(c.playerId||c.email||c.userEmail||'').toLowerCase()===id?s+(parseInt(c.points,10)||0):s;
        },0);
        var cnt=(window.challengeCompletions||[]).filter(function(c){
          return String(c.playerId||c.email||c.userEmail||'').toLowerCase()===id;
        }).length;
        var live=p.online?'<span class="live-dot"></span>':'';
        var smart=null; try{ if(window.ChangePlayerActivity && window.ChangePlayerActivity.smartNudgeFor) smart=window.ChangePlayerActivity.smartNudgeFor(id,p); }catch(e){}
        var smartTitle=smart&&smart.reason?('Anfeuern: '+smart.reason):'Anfeuern';
        var nudge=me?'':'<button class="nudge-btn" onclick="event.stopPropagation();window.sendNudge&&window.sendNudge(\''+esc(id)+'\',\''+esc(p.name||id)+'\')" title="'+esc(smartTitle)+'"><span class="nudge-btn-icon">💪</span><span class="nudge-btn-label">Anfeuern</span></button>';
        return '<div class="leader-row clickable'+(me?' leader-row-self':'')+'" style="pointer-events:auto;cursor:pointer" onclick="window.openPlayerRecentPanel&&window.openPlayerRecentPanel(\''+esc(id)+'\',\''+esc(p.name||p.email||'Mitspieler')+'\')">'
          +'<div class="leader-rank">'+(medals[i]||String(i+1))+'</div>'
          +'<div class="leader-main">'
            +'<div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+(me?'<span class="leader-self-tag">Du</span>':'')+live+'</div>'
            +'<div class="leader-detail">Heute: '+pts+' P · Gesamt: '+tot+' P · '+cnt+' erledigt</div>'
          +'</div>'
          +'<div class="leader-side">'+nudge+'<strong class="leader-score">'+tot+'</strong></div>'
        +'</div>';
      }).join(''):'<div class="dash-empty">Noch keine Mitspieler</div>';
    }catch(e){board.innerHTML='<div class="dash-empty">Rangliste wird geladen…</div>';}

    try{if(typeof window.renderGroupGoal==='function') window.renderGroupGoal();}catch(e){}
  }

  renderChallenges.__changeChallenges = true;

  /* ─── Exports ─── */
  // KEIN Object.defineProperty auf window.challenges — lässt anderen Code unberührt
  window.ChangeChallenges = {
    pool: (difficultyApi() && difficultyApi().allTemplates ? difficultyApi().allTemplates() : POOL),
    optional: OPTIONAL,
    findById: findById,
    hydrate: hydrateLegacyChallenge,
    resolveUrl: function(id){ var ch=findById(id); return ch && ch.url ? ch.url : ''; },
    render: renderChallenges
  };
  window.renderChallenges           = renderChallenges;
  window.challengeScheduleForDate   = function(dk){ return getDailyPool(dk||todayStr()); };
  window.ensureDailyAutoChallenges  = function(dk){
    var day = dk || todayStr();
    var D = difficultyApi();
    if(D && typeof D.ensureDailyState === 'function') return D.ensureDailyState(day, null, {persist:true, publish:true});
    return getDailyPool(day);
  };
  window.buildDefaultChallenges     = function(){ return getDailyPool(todayStr()).concat(OPTIONAL); };
  window.getChallengePointsForDate  = function(dk){ return pointsForDate(dk,myId()); };
  window.getChallengeDayStatus      = function(dk){
    var p=pointsForDate(dk,myId()); return p>0?{points:p,done:true,allDone:true}:null;
  };
  window.getOpenChallengesForDashboard = function(){
    // Dashboard zeigt bewusst alle offenen Tagesaufgaben – aber keine optionalen Bonuspunkte.
    return getDailyPool(todayStr()).filter(function(ch){
      return ch && ch.active !== false && ch.optional !== true && !isDoneToday(ch.id);
    });
  };

  /* ── Eigentümer der renderChallenges-Funktion bleiben ──
   * calendar-logic.js reassertet window.renderChallenges bei
   * 2000ms und 5600ms. Wir reasserten bei 6500ms > 5600ms.
   * window.challenges befüllen damit Legacy-Code korrekt liest. */
  var lastLegacyExportKey = '';

  function assertOwnership(){
    window.renderChallenges = renderChallenges;

    // Auto-Challenges sauber in den zentralen Store schreiben, ohne manuelle
    // Challenges zu überschreiben. Pro Tag gibt es genau einen generierten Satz.
    var today = todayStr();
    var daily = window.ensureDailyAutoChallenges ? window.ensureDailyAutoChallenges(today) : getDailyPool(today);
    var Dmeta = difficultyApi();
    var exportKey = today + ':' + (Dmeta && Dmeta.get ? Dmeta.get() : 'fallback') + ':' + (Dmeta && Dmeta.getDailyCount ? Dmeta.getDailyCount() : daily.length) + ':' + daily.map(function(ch){return ch.id;}).join(',');
    if(exportKey !== lastLegacyExportKey){
      var list = Array.isArray(window.challenges) ? window.challenges.slice() : [];
      var changed = false;
      var canonical = {};
      OPTIONAL.forEach(function(opt){ canonical[opt.id] = opt; });
      var seenOptional = new Set();
      list = list.filter(function(ch){
        var key = optionalKey(ch);
        if(!key) return true;
        if(seenOptional.has(key)){ changed = true; return false; }
        seenOptional.add(key);
        var row = Object.assign({active:true, type:'Sport', recurrence:'daily', optional:true, auto:false}, canonical[key] || ch);
        var before = JSON.stringify({id:ch.id,title:ch.title,points:ch.points,optional:ch.optional,active:ch.active});
        Object.assign(ch, row);
        if(JSON.stringify({id:ch.id,title:ch.title,points:ch.points,optional:ch.optional,active:ch.active}) !== before) changed = true;
        return true;
      });
      OPTIONAL.forEach(function(opt){
        var existing = list.find(function(ch){ return optionalKey(ch) === opt.id; });
        var row = Object.assign({active:true, type:'Sport', recurrence:'daily', optional:true, auto:false}, opt);
        if(existing) Object.assign(existing, row);
        else { list.push(row); changed = true; }
      });
      try{
        if(window.ChangeChallengeStore && typeof window.ChangeChallengeStore.replaceChallenges === 'function'){
          window.ChangeChallengeStore.replaceChallenges(list, {persist:true});
        }else if(changed){
          window.challenges = list;
          if(typeof ls==='function') ls('challenges', window.challenges);
        }
      }catch(e){}
      lastLegacyExportKey = exportKey;
    }

    // Nicht alle 10 Sekunden blind neu rendern: das setzt auf Mobile
    // den Scroll/Touch-Zustand zurück und wirkt unruhig.
    var list = document.getElementById('challenges-list');
    if((window.currentMainView||'')==='challenges' && (!list || list.getAttribute('data-render-owner')!=='change-challenges')){
      renderChallenges();
    }
  }

  // Sofort
  setTimeout(assertOwnership, 200);

  window.addEventListener('load', function(){
    // 6500ms > cal-logic letzter Override (5600ms)
    [800, 2500, 6500].forEach(function(ms){ setTimeout(assertOwnership, ms); });
    // Danach alle 10 Sek. dauerhaft sicherstellen
    setTimeout(function(){ setInterval(assertOwnership, 10000); }, 7000);
  });

  console.log('[Change] challenges.js ✓ — Schwierigkeitsgrade aktiv, 7/Tag');
})();
