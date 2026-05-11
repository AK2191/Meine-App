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
      '[data-theme="dark"] .btn-undo{background:rgba(248,113,113,.12)!important;border-color:rgba(248,113,113,.28)!important;color:#f87171!important}';
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
    {id:'opt_fitness_30', icon:'🏋️', title:'Fitness · mind. 30 Min.',  points:30, desc:'Leichtes bis mittleres Training für mindestens 30 Minuten.', optional:true},
    {id:'opt_walk_10',    icon:'🚶', title:'Spazieren · mind. 10 Min.', points:15, desc:'Gehe mindestens 10 Minuten locker spazieren.',               optional:true}
  ];

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

  /* 7 deterministisch per Datum */
  function getDailyPool(dk){
    dk=dk||todayStr();
    var seed=dk.replace(/-/g,'').split('').reduce(function(a,c){return a*31+c.charCodeAt(0);},0);
    var arr=POOL.slice().sort(function(a,b){return String(a.id).localeCompare(String(b.id));});
    var off=((seed%arr.length)+arr.length)%arr.length;
    return arr.slice(off).concat(arr.slice(0,off)).slice(0,7);
  }

  /* Spieler-ID */
  function myId(){
    try{
      var fu=typeof firebase!=='undefined'&&firebase.auth&&firebase.auth().currentUser;
      if(fu&&fu.email) return fu.email.toLowerCase().trim();
      if(fu&&fu.uid) return fu.uid.toLowerCase().trim();
    }catch(e){}
    var i=window.userInfo||{};
    return String(i.email||i.uid||'').toLowerCase().trim()||'local-user';
  }

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
  };

  /* ─── Render ─── */
  function renderChallenges(){
    var list=document.getElementById('challenges-list');
    var board=document.getElementById('leaderboard-list');
    if(!list||!board) return;

    var dk=todayStr(), daily=getDailyPool(dk);

    function chItem(ch){
      var done=isDoneToday(ch.id), pts=parseInt(ch.points,10)||0;
      var link=(!ch.optional&&ch.url)
        ?'<a class="challenge-meta" style="color:var(--acc);text-decoration:none;font-weight:600;display:inline-block;margin-top:2px" href="'+esc(safeUrl(ch.url))+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">Übung ansehen ↗</a>'
        :'';
      var btn=done
        ?'<button class="btn btn-success btn-sm" disabled style="pointer-events:auto">Erledigt ✓</button>'
         +'<button class="btn btn-undo btn-sm" style="pointer-events:auto;margin-left:4px" onclick="event.stopPropagation();window.undoChallenge(\''+esc(ch.id)+'\')" title="Rückgängig">↶</button>'
        :'<button class="btn btn-primary btn-sm" style="pointer-events:auto" onclick="event.stopPropagation();window.completeChallenge(\''+esc(ch.id)+'\')">Erledigen</button>';
      return '<div class="challenge-item'+(done?' challenge-done':'')+'" style="pointer-events:auto">'
        +'<div class="challenge-icon">'+esc(ch.icon||'🏆')+'</div>'
        +'<div class="challenge-body" style="pointer-events:auto;min-width:0">'
        +'<div class="challenge-name">'+esc(ch.title||'Challenge')+'</div>'
        +'<div class="challenge-meta">'+esc(ch.desc||'')+'</div>'+link
        +'</div><span class="points-pill" style="flex-shrink:0">+'+pts+'</span>'+btn+'</div>';
    }

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
      board.innerHTML=players.length?players.map(function(p,i){
        var id=String(p.email||p.id||'').toLowerCase(), me=id===myId();
        var pts=pointsForDate(dk,id);
        var tot=(window.challengeCompletions||[]).reduce(function(s,c){
          return String(c.playerId||c.email||c.userEmail||'').toLowerCase()===id?s+(parseInt(c.points,10)||0):s;
        },0);
        var cnt=(window.challengeCompletions||[]).filter(function(c){
          return String(c.playerId||c.email||c.userEmail||'').toLowerCase()===id;
        }).length;
        var live=p.online?'<span class="live-dot"></span>':'';
        var nudge=me?'':'<button class="nudge-btn" onclick="event.stopPropagation();window.sendNudge&&window.sendNudge(\''+esc(id)+'\',\''+esc(p.name||id)+'\')" title="Anfeuern"><span class="nudge-btn-icon">💪</span><span class="nudge-btn-label">Anfeuern</span></button>';
        return '<div class="leader-row clickable" style="pointer-events:auto;cursor:pointer" onclick="window.openPlayerRecentPanel&&window.openPlayerRecentPanel(\''+esc(id)+'\',\''+esc(p.name||p.email||'Mitspieler')+'\')">'
          +'<div class="leader-rank">'+(medals[i]||String(i+1))+'</div>'
          +'<div style="flex:1;min-width:0"><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+live+'</div>'
          +'<div class="leader-detail">Heute: '+pts+' P · Gesamt: '+tot+' P · '+cnt+' erledigt</div></div>'
          +'<div style="display:flex;align-items:center;gap:8px">'+nudge+'<div class="leader-score">'+tot+'</div></div></div>';
      }).join(''):'<div class="dash-empty">Noch keine Mitspieler</div>';
    }catch(e){board.innerHTML='<div class="dash-empty">Rangliste wird geladen…</div>';}

    try{if(typeof window.renderGroupGoal==='function') window.renderGroupGoal();}catch(e){}
  }

  /* ─── Exports ─── */
  // KEIN Object.defineProperty auf window.challenges — lässt anderen Code unberührt
  window.renderChallenges           = renderChallenges;
  window.challengeScheduleForDate   = function(dk){ return getDailyPool(dk||todayStr()); };
  window.ensureDailyAutoChallenges  = function(){ return getDailyPool(todayStr()); };
  window.buildDefaultChallenges     = function(){ return getDailyPool(todayStr()); };
  window.getChallengePointsForDate  = function(dk){ return pointsForDate(dk,myId()); };
  window.getChallengeDayStatus      = function(dk){
    var p=pointsForDate(dk,myId()); return p>0?{points:p,done:true,allDone:true}:null;
  };
  window.getOpenChallengesForDashboard = function(){
    return getDailyPool(todayStr()).filter(function(ch){return !isDoneToday(ch.id);}).slice(0,4);
  };

  /* setMainView-Hook — OHNE window.challenges zu setzen */
  window.addEventListener('load', function(){
    setTimeout(function(){
      window.renderChallenges = renderChallenges;
      window.completeChallenge = window.completeChallenge; // keep our version
      if((window.currentMainView||'')==='challenges') renderChallenges();
    }, 800);
    // Nochmal nach Firebase-Auth
    setTimeout(function(){
      window.renderChallenges = renderChallenges;
      if((window.currentMainView||'')==='challenges') renderChallenges();
    }, 2500);
  });

  setTimeout(function(){
    window.renderChallenges = renderChallenges;
    if((window.currentMainView||'')==='challenges') renderChallenges();
  }, 600);

  console.log('[Change] challenges.js ✓ — '+POOL.length+' Übungen, 7/Tag');
})();
