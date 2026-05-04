/* ═══════════════════════════════════════════════════════════
   CHANGE · change-pre.js
   1. Sport-Pool mit YouTube-Links + 2 optionale Challenges
   2. Challenge-Wochenbalken (einmalig, kein Duplikat)
   3. Routing & View-Steuerung
   4. Kalender-Optionen
═══════════════════════════════════════════════════════════ */

/* ── 1. Sport-Pool ──────────────────────────────────────── */
(function(){
  'use strict';

  const YT = {
    squat:   'https://www.youtube.com/results?search_query=Kniebeuge+Anf%C3%A4nger+Anleitung',
    pushup:  'https://www.youtube.com/results?search_query=Liegest%C3%BCtz+richtig+ausf%C3%BChren',
    plank:   'https://www.youtube.com/results?search_query=Plank+Unterarmst%C3%BCtz+Anleitung',
    lunge:   'https://www.youtube.com/results?search_query=Ausfallschritte+richtig+ausf%C3%BChren',
    calf:    'https://www.youtube.com/results?search_query=Wadenheben+richtig+ausf%C3%BChren',
    shoulder:'https://www.youtube.com/results?search_query=Schulterkreisen+%C3%9Cbung+Anleitung',
    balance: 'https://www.youtube.com/results?search_query=Gleichgewicht+Training+%C3%9Cbung',
    walk:    'https://www.youtube.com/results?search_query=Spaziergang+Gesundheit+Tipps',
    stretch: 'https://www.youtube.com/results?search_query=Dehnen+R%C3%BCcken+Schulter+%C3%9Cbung'
  };

  const SPORT_POOL = [
    {id:'sport_squats_12',   title:'12 Kniebeugen',               points:8,  icon:'🏋️', desc:'12 saubere Kniebeugen in ruhigem Tempo.',                    url:YT.squat,    type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_wall_pushup', title:'10 Wand-Liegestütze',         points:10, icon:'💪', desc:'Hände auf Schulterhöhe an der Wand, Arme kontrolliert beugen.',url:YT.pushup,   type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_plank_25',    title:'25 Sekunden Plank',           points:9,  icon:'⏱️', desc:'Unterarmstütz mit stabilem Rumpf, 25 Sekunden halten.',        url:YT.plank,    type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_lunges_10',   title:'10 Ausfallschritte',          points:10, icon:'🚶', desc:'Je Seite 5 Ausfallschritte, Oberkörper aufrecht.',             url:YT.lunge,    type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_calf_20',     title:'20 Wadenheben',               points:7,  icon:'🦵', desc:'Langsam hochdrücken und kontrolliert absenken.',                url:YT.calf,     type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_pushups_6',   title:'6 leichte Liegestütze',       points:10, icon:'💪', desc:'Normal oder auf Knien, saubere Bewegung zählt.',               url:YT.pushup,   type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_shoulder_60', title:'60 Sekunden Schulterkreisen', points:6,  icon:'🙆', desc:'Beide Schultern langsam nach hinten und vorne kreisen.',        url:YT.shoulder, type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_balance_30',  title:'30 Sekunden Balance',         points:7,  icon:'⚖️', desc:'15 Sekunden je Bein stehen, an Wand halten erlaubt.',          url:YT.balance,  type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_walk_3',      title:'3 Minuten gehen',             points:8,  icon:'🚶', desc:'3 Minuten locker durch den Raum oder draußen gehen.',          url:YT.walk,     type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_stretch_60',  title:'60 Sekunden Dehnen',          points:8,  icon:'🧘', desc:'Schultern, Rücken oder Beine 60 Sekunden dehnen.',             url:YT.stretch,  type:'Sport', active:true, recurrence:'daily'}
  ];

  const OPTIONAL_POOL = [
    {id:'opt_walk_10',    title:'10 Minuten spazieren',          points:15, icon:'🚶', desc:'Gehe mindestens 10 Minuten locker spazieren.',              url:YT.walk,    type:'Sport', active:true, optional:true, recurrence:'daily'},
    {id:'opt_fitness_30', title:'Fitness · mind. 30 Minuten',   points:30, icon:'🏋️', desc:'Leichtes bis mittleres Training für mindestens 30 Minuten.',url:YT.squat,   type:'Sport', active:true, optional:true, recurrence:'daily'}
  ];

  const norm   = x => String(x||'').toLowerCase().trim();
  const dk     = () => { try{ return typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } };
  const isDemo = p => /demo|demo@example\.com/i.test(((p&&p.name)||'')+' '+((p&&p.email)||'')+' '+((p&&p.id)||''));
  const esc    = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function ensurePool(){
    const chs = window.challenges || [];
    // Feste Sport-Pool Einträge (URL immer aktualisieren)
    SPORT_POOL.forEach(sp => {
      const i = chs.findIndex(c => c.id === sp.id);
      if(i >= 0) chs[i] = {...chs[i], ...sp, active: true};
      else chs.push({...sp, createdAt: new Date().toISOString()});
    });
    // Optionale Challenges (nie löschen, immer sicherstellen)
    OPTIONAL_POOL.forEach(op => {
      const i = chs.findIndex(c => c.id === op.id);
      if(i >= 0) chs[i] = {...chs[i], ...op, active: true};
      else chs.push({...op, createdAt: new Date().toISOString()});
    });
    // Demo-Spieler entfernen
    if(!window.isDemoMode) window.challengePlayers = (window.challengePlayers||[]).filter(p=>!isDemo(p));
    window.challenges = chs;
    try{ if(typeof ls==='function') ls('challenges', chs); }catch(e){}
  }

  window.buildDefaultChallenges = function(){ return SPORT_POOL.slice(0,5).map(x=>({...x,createdAt:new Date().toISOString()})); };

  window.ensureDailyAutoChallenges = function(day=dk()){
    if(typeof ls==='function' && ls('auto_challenges_enabled')===false) return [];
    ensurePool();
    const seed = Math.abs(String(day).split('').reduce((a,c)=>a+c.charCodeAt(0),0));
    const daily = [0,1,2].map(i=>SPORT_POOL[(seed+i*3)%SPORT_POOL.length]).map((b,i)=>({
      ...b, id:'auto_'+day+'_sport_'+i, date:day, recurrence:'once', auto:true, active:true, createdAt:day+'T00:00:00.000Z'
    }));
    window.challenges = (window.challenges||[]).filter(c=>!c.auto||String(c.id||'').startsWith('auto_'+day+'_sport_'));
    let changed = false;
    daily.forEach(ch=>{
      const i = window.challenges.findIndex(x=>x.id===ch.id);
      if(i>=0) window.challenges[i] = {...window.challenges[i],...ch};
      else { window.challenges.push(ch); changed=true; }
    });
    ensurePool(); // ensure optionals survive
    if(changed){ try{ if(typeof ls==='function')ls('challenges',window.challenges); if(typeof publishChallengesToFirestore==='function')publishChallengesToFirestore(); }catch(e){} }
    return daily;
  };

  window.getPlayerPointSummary = function(playerId){
    const id=norm(playerId), today=dk(), out={totalPoints:0,totalCount:0,todayPoints:0,todayCount:0,todayItems:[]};
    (window.challengeCompletions||[]).forEach(c=>{
      if(norm(c.playerId||c.email||c.userEmail)!==id) return;
      const pts=parseInt(c.points)||0; out.totalPoints+=pts; out.totalCount++;
      if(c.date===today){
        const ch=(window.challenges||[]).find(x=>x.id===c.challengeId)||{};
        out.todayPoints+=pts; out.todayCount++;
        out.todayItems.push({title:ch.title||c.challengeId||'Sportübung',icon:ch.icon||'✅',points:pts,url:ch.url||''});
      }
    });
    return out;
  };

  window.openContestUserDetails = function(playerId){
    ensurePool();
    const id=norm(playerId), p=(window.challengePlayers||[]).find(x=>norm(x.email||x.id)===id)||{id,name:id,email:id};
    if(!window.isDemoMode && isDemo(p)) return;
    const sum = window.getPlayerPointSummary(id);
    const items = sum.todayItems.length
      ? sum.todayItems.map(it=>'<div class="challenge-item"><div class="challenge-icon">'+esc(it.icon)+'</div><div class="challenge-body"><div class="challenge-name">'+esc(it.title)+'</div><div class="challenge-meta">Heute erledigt</div>'+(it.url?'<a class="exercise-link" href="'+esc(it.url)+'" target="_blank" rel="noopener">Übung ansehen ↗</a>':'')+'</div><span class="points-pill">+'+it.points+'</span></div>').join('')
      : '<div class="dash-empty">Heute noch nichts erledigt.</div>';
    if(typeof openPanel==='function') openPanel('Kontest · '+esc(p.name||p.email||'Mitspieler'),
      '<div class="stat-strip"><div class="stat-box"><div class="stat-num">'+sum.todayPoints+'</div><div class="stat-label">Punkte heute</div></div><div class="stat-box"><div class="stat-num">'+sum.totalPoints+'</div><div class="stat-label">Punkte gesamt</div></div></div>'+
      '<div class="push-status" style="margin:12px 0">Heute: <strong>'+sum.todayCount+'</strong> erledigt · Gesamt: <strong>'+sum.totalCount+'</strong></div>'+
      '<div class="section-label">Heute erledigt</div><div class="contest-done-list">'+items+'</div>');
  };
})();


/* ── 2. Challenge-Wochenbalken ─────────────────────────── */
(function(){
  'use strict';

  const norm  = s => String(s||'').toLowerCase().trim();
  function myId(){
    // userInfo is a global 'let' — may not be on window
    const ui = window.userInfo || (typeof userInfo !== 'undefined' ? userInfo : {});
    if(ui && ui.email && !String(ui.email).includes('demo') && !String(ui.email).includes('example'))
      return norm(ui.email);
    // Fallback to localStorage
    const stored = localStorage.getItem('change_v1_user_info') || localStorage.getItem('user_info') || '{}';
    try{ const p = JSON.parse(stored); if(p.email) return norm(p.email); }catch(e){}
    return 'local-user';
  }
  const dk    = () => { try{ return typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } };
  const pad   = n => String(n).padStart(2,'0');
  const esc   = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  let weekOffset = 0;

  function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function weekStart(d){ const x=new Date(d); x.setHours(12,0,0,0); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x; }

  function pointsForDate(k, player){
    if(!player) player = myId();
    // If still 'local-user', try to find any completions for the date (fallback)
    if(player === 'local-user'){
      return (window.challengeCompletions||[])
        .filter(c => String(c.date)===k)
        .reduce((a,c) => a+(parseInt(c.points)||0), 0);
    }
    return (window.challengeCompletions||[])
      .filter(c => norm(c.playerId||c.email||c.userEmail)===norm(player) && String(c.date)===k)
      .reduce((a,c) => a+(parseInt(c.points)||0), 0);
  }

  function monthLabel(days){
    const names = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    const f=days[0], l=days[6];
    if(f.getFullYear()!==l.getFullYear()) return names[f.getMonth()]+' '+f.getFullYear()+' / '+names[l.getMonth()]+' '+l.getFullYear();
    if(f.getMonth()!==l.getMonth()) return names[f.getMonth()]+' / '+names[l.getMonth()]+' '+f.getFullYear();
    return names[f.getMonth()]+' '+f.getFullYear();
  }

  function ensureWeekBar(){
    const view = document.getElementById('challenges-view'); if(!view) return;
    const layout = view.querySelector('.challenge-layout'); if(!layout) return;
    // Alle alten/duplizierten Balken entfernen
    ['challenge-week-bar-clean','challenge-week-bar'].forEach(id => {
      const el = document.getElementById(id); if(el) el.remove();
    });
    view.querySelectorAll('.challenge-mini-card, #challenge-mini-calendar').forEach(el => {
      if(!el.closest('#challenge-week-points-card')) el.remove();
    });
    if(document.getElementById('challenge-week-points-card')) return;
    const bar = document.createElement('div');
    bar.id = 'challenge-week-points-card';
    bar.className = 'challenge-week-card';
    bar.innerHTML =
      '<div class="challenge-week-head"><div>'+
        '<div class="challenge-week-title">Punkte-Kalender</div>'+
        ''+
      '</div><div class="challenge-week-actions">'+
        '<button class="btn btn-ghost btn-sm" id="cwp-prev">← Letzte Woche</button>'+
        '<button class="btn btn-secondary btn-sm" id="cwp-today">Heute</button>'+
        '<button class="btn btn-ghost btn-sm" id="cwp-next">Nächste Woche →</button>'+
      '</div></div>'+
      '<div id="challenge-week-points-grid" class="challenge-week-grid"></div>';
    view.insertBefore(bar, layout);
    document.getElementById('cwp-prev').onclick  = () => { weekOffset = Math.max(-4, weekOffset-1); renderWeekBar(); };
    document.getElementById('cwp-today').onclick = () => { weekOffset = 0; renderWeekBar(); };
    document.getElementById('cwp-next').onclick  = () => { weekOffset = Math.min(4, weekOffset+1); renderWeekBar(); };
  }

  function renderWeekBar(){
    ensureWeekBar();
    const grid = document.getElementById('challenge-week-points-grid'); if(!grid) return;
    const days = Array.from({length:7}, (_,i) => addDays(weekStart(addDays(new Date(), weekOffset*7)), i));
    const today = dk(), weekday = ['Mo','Di','Mi','Do','Fr','Sa','So'];
    const title = document.querySelector('#challenge-week-points-card .challenge-week-title');
    const sub   = document.querySelector('#challenge-week-points-card .challenge-week-sub');
    if(title) title.textContent = 'Punkte-Kalender · ' + monthLabel(days);
    if(sub)   sub.textContent   = '';
    grid.innerHTML = days.map((d,i) => {
      const k   = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
      const pts = pointsForDate(k);
      return '<div class="challenge-week-day'+(k===today?' is-today':'')+(pts?' has-points':' empty')+'">' +
        '<div class="challenge-week-day-name">'+weekday[i]+'</div>'+
        '<div class="challenge-week-day-date">'+pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.</div>'+
        '<div class="challenge-week-day-points">'+(pts ? pts+' P' : '–')+'</div></div>';
    }).join('');
  }

  window.ensureWeekBar  = ensureWeekBar;
  window.renderWeekBar  = renderWeekBar;
  window.renderChallengeMiniCalendar = renderWeekBar;

  /* renderChallenges: zeigt alle Sport-Challenges inkl. Optionals */
  function isDoneToday(id){
    const me = myId(), td = dk();
    return (window.challengeCompletions||[]).some(c => {
      if(String(c.challengeId) !== String(id)) return false;
      if(String(c.date) !== td) return false;
      if(me === 'local-user') return true; // fallback: any completion counts
      return norm(c.playerId||c.email||c.userEmail) === norm(me);
    });
  }

  function allSportChallenges(){
    const today = dk();
    return (window.challenges||[]).filter(c =>
      c && c.active !== false &&
      (c.type==='Sport' || /^sport_/.test(c.id||'') || /^auto_.*_sport_/.test(c.id||'') || /^opt_/.test(c.id||'')) &&
      (!c.date || c.date===today || c.recurrence==='daily')
    );
  }

  function pStats(id){
    const today=dk(), out={today:0,total:0,count:0};
    (window.challengeCompletions||[]).forEach(c=>{
      if(norm(c.playerId||c.email||c.userEmail)!==norm(id)) return;
      const pts=parseInt(c.points)||0; out.total+=pts; out.count++;
      if(c.date===today) out.today+=pts;
    });
    return out;
  }

  function visiblePlayers(){
    const seen=new Set();
    return (window.challengePlayers||[])
      .filter(p=>p&&(p.email||p.id))
      .filter(p=>window.isDemoMode||!/demo|demo@example\.com/i.test(((p.name||'')+' '+(p.email||'')+' '+(p.id||''))))
      .filter(p=>{ const k=norm(p.email||p.id); if(!k||seen.has(k)) return false; seen.add(k); return true; });
  }

  window.renderChallenges = function(){
    if(typeof window.ensureDailyAutoChallenges==='function') window.ensureDailyAutoChallenges();
    ensureWeekBar();
    renderWeekBar();

    const list  = document.getElementById('challenges-list');
    const board = document.getElementById('leaderboard-list');
    if(!list || !board) return;

    const all      = allSportChallenges();
    const normal   = all.filter(c => !c.optional);
    const optional = all.filter(c => !!c.optional);

    function chItem(ch){
      const done = isDoneToday(ch.id);
      // YouTube-Link wenn vorhanden
      const link = ch.url
        ? '<a class="exercise-link" href="'+esc(ch.url)+'" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Übung ansehen ↗</a>'
        : '';
      return '<div class="challenge-item'+(done?' challenge-done':'')+(ch.optional?' challenge-optional':'')+'">'
        +'<div class="challenge-icon">'+esc(ch.icon||'🏃')+'</div>'
        +'<div class="challenge-body">'
          +'<div class="challenge-name">'+esc(ch.title||'Sportübung')+'</div>'
          // Beschreibung OHNE Punkte im Text
          +'<div class="challenge-meta">'+esc(ch.desc||'')+'</div>'
          +link
        +'</div>'
        +'<span class="points-pill">+'+(parseInt(ch.points)||0)+'</span>'
        +'<button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+String(ch.id).replace(/'/g,'')+'\')">'+
          (done?'Erledigt ✓':'Erledigen')+
        '</button></div>';
    }

    let html = normal.map(chItem).join('');
    if(optional.length){
      html += '<div class="ch-optional-section">Optionale Punkte</div>';
      html += optional.map(chItem).join('');
    }
    list.innerHTML = html || '<div class="dash-empty">Keine Challenges für heute</div>';

    const players = visiblePlayers().sort((a,b) => pStats(norm(b.email||b.id)).total - pStats(norm(a.email||a.id)).total);
    board.innerHTML = players.length
      ? players.map((p,i)=>{
          const id  = norm(p.email||p.id);
          const st  = pStats(id);
          const med = i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
          const dot = p.online ? '<span class="live-dot"></span>' : '<span class="live-dot off"></span>';
          return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+id.replace(/'/g,'')+'\')">'+
            '<div class="leader-rank">'+med+'</div>'+
            '<div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+(id===myId()?' · Du':'')+dot+'</div>'+
            '<div class="leader-detail">Heute: '+st.today+' P · Gesamt: '+st.total+' P · '+st.count+' erledigt</div></div>'+
            '<div class="leader-score">'+st.total+'</div></div>';
        }).join('')
      : '<div class="dash-empty">Noch keine Mitspieler</div>';

    // Punkte-Kalender nach kurzer Pause nochmal rendern (Firebase-Daten laden asynchron)
    setTimeout(renderWeekBar, 1200);
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      try{ ensureWeekBar(); if(window.currentMainView==='challenges') window.renderChallenges(); }catch(e){}
    }, 600);
  });

  // Hook: Punkte-Kalender aktualisieren wenn Firebase challengeCompletions lädt
  let _comps = window.challengeCompletions || [];
  try{
    Object.defineProperty(window, 'challengeCompletions', {
      get: () => _comps,
      set: v => {
        _comps = v;
        if(v && v.length > 0 && window.currentMainView==='challenges' && typeof renderWeekBar==='function')
          setTimeout(renderWeekBar, 50);
      },
      configurable: true
    });
  }catch(e){}
})();


/* ── 3. Routing & View-Steuerung ───────────────────────── */
(function(){
  'use strict';
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function showView(v){
    [['dashboard','#dashboard-view'],['calendar','#cal-body'],['challenges','#challenges-view']].forEach(([name,sel])=>{
      const el=$(sel); if(!el) return;
      if(name===v){ el.style.display='flex'; el.classList.remove('route-hidden'); }
      else { el.style.display='none'; el.classList.add('route-hidden'); }
    });
    const cc = $('#cal-controls'); if(cc) cc.style.display = v==='calendar'?'flex':'none';
    $$('.h-tab').forEach(t=>t.classList.remove('active')); $('#htab-'+v)?.classList.add('active');
    $$('.bnav-item').forEach(t=>t.classList.remove('active')); $('#bnav-'+v)?.classList.add('active');
    const fab = $('#fab'); if(fab) fab.classList.toggle('challenge-disabled', v==='challenges');
  }

  window.setMainView = function(v, fromRoute){
    if(!['dashboard','calendar','challenges'].includes(v)) v='dashboard';
    window.currentMainView = v; showView(v);
    var _fab=document.getElementById('fab');if(_fab)_fab.style.display=v==='calendar'?'flex':'none';
    if(v==='dashboard'  && typeof window.buildDashboard==='function')   window.buildDashboard();
    if(v==='calendar'   && typeof window.renderCalendar==='function')   window.renderCalendar();
    if(v==='challenges' && typeof window.renderChallenges==='function') window.renderChallenges();
    if(!fromRoute){ try{ history.pushState({view:v},'','#/'+v); }catch(e){ location.hash='/'+v; } }
  };

  window.addEventListener('popstate', e=>{
    const v = (e.state&&e.state.view)||(location.hash.replace('#/','')||'dashboard');
    window.setMainView(v, true);
  });
  window.addEventListener('hashchange', ()=>{
    const v = location.hash.replace('#/','')||'dashboard';
    if(v!==window.currentMainView) window.setMainView(v, true);
  });

  const _boot = window.bootMainApp;
  window.bootMainApp = function(){
    if(typeof _boot==='function') _boot.apply(this, arguments);
    setTimeout(()=>{
      const route = location.hash.replace('#/','')||window.currentMainView||'dashboard';
      window.setMainView(route, true);
    }, 150);
  };
})();


/* ── 4. Kalender-Optionen ──────────────────────────────── */
(function(){
  'use strict';
  const KEY = 'change_v1_calendar_view_options';

  function readOptions(){
    const def = {showHolidays:true, showChallengeDots:true, showWeekNumbers:true};
    try{ return Object.assign(def, JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){ return def; }
  }
  function applyCSS(o){
    o = o || readOptions();
    let st = document.getElementById('change-calendar-options-style');
    if(!st){ st=document.createElement('style'); st.id='change-calendar-options-style'; document.head.appendChild(st); }
    st.textContent =
      (o.showChallengeDots ? '' : '.challenge-day-dot{display:none!important}') +
      (o.showHolidays      ? '' : '.holiday-line,.holiday-badge{display:none!important}') +
      (o.showWeekNumbers   ? '' : '.kw-badge,.kw-badge-left,.cal-kw{display:none!important}');
  }

  window.changeCalendarViewOptions = readOptions();
  applyCSS();

  window.addEventListener('load', () => {
    setTimeout(() => {
      applyCSS();
      if(typeof renderCalendar==='function') renderCalendar();
    }, 800);
  });
})();
