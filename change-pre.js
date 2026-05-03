/* ═══════════════════════════════════════════════════════════
   CHANGE · change-pre.js  (sauber, kein Duplikat, kein YouTube)
   Lädt VOR dem Inline-Code in index.html.
   1. Sport-Pool mit TK/AOK-Links
   2. Challenge-Wochenbalken (einmalig, kein Duplikat)
   3. Routing & View-Steuerung
   4. Kalender-Optionen
═══════════════════════════════════════════════════════════ */

/* ── 1. Sport-Pool & Challenge-Logik ───────────────────── */
(function(){
  'use strict';

  const TK = {
    squat:   'https://www.tk.de/techniker/magazin/sport/fitness/kniebeugen-2008836',
    pushup:  'https://www.aok.de/pk/magazin/sport/fitness/liegestuetze-richtig-ausfuehren/',
    plank:   'https://www.aok.de/pk/magazin/sport/fitness/plank-richtig-ausfuehren/',
    lunge:   'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/',
    calf:    'https://www.tk.de/techniker/magazin/sport/fitness/krafttraining-zuhause-2008872',
    shoulder:'https://www.tk.de/techniker/magazin/sport/fitness/dehnen-2008902',
    balance: 'https://www.tk.de/techniker/magazin/sport/fitness/gleichgewicht-trainieren-2116034',
    walk:    'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/',
    stretch: 'https://www.tk.de/techniker/magazin/sport/fitness/dehnen-2008902'
  };

  const SPORT_POOL = [
    {id:'sport_squats_12',   title:'12 Kniebeugen',               points:8,  icon:'🏋️', desc:'12 saubere Kniebeugen in ruhigem Tempo.',                              url:TK.squat,    type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_wall_pushup', title:'10 Wand-Liegestütze',         points:10, icon:'💪', desc:'Hände auf Schulterhöhe an der Wand. Arme kontrolliert beugen.',         url:TK.pushup,   type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_plank_25',    title:'25 Sekunden Plank',           points:9,  icon:'⏱️', desc:'Unterarmstütz mit stabilem Rumpf. 25 Sekunden halten.',                 url:TK.plank,    type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_lunges_10',   title:'10 Ausfallschritte',          points:10, icon:'🚶', desc:'Je Seite 5 kontrollierte Ausfallschritte, Oberkörper aufrecht.',         url:TK.lunge,    type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_calf_20',     title:'20 Wadenheben',               points:7,  icon:'🦵', desc:'Langsam hochdrücken und kontrolliert absenken.',                         url:TK.calf,     type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_pushups_6',   title:'6 leichte Liegestütze',       points:10, icon:'💪', desc:'Normal oder auf Knien. Saubere Bewegung zaehlt.',                        url:TK.pushup,   type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_shoulder_60', title:'60 Sekunden Schulterkreisen', points:6,  icon:'🙆', desc:'Beide Schultern langsam nach hinten und vorne kreisen.',                 url:TK.shoulder, type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_balance_30',  title:'30 Sekunden Balance',         points:7,  icon:'⚖️', desc:'15 Sekunden auf einem Bein, dann wechseln.',                            url:TK.balance,  type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_walk_3',      title:'3 Minuten gehen',             points:8,  icon:'🚶', desc:'Gehe 3 Minuten locker durch den Raum oder draussen.',                   url:TK.walk,     type:'Sport', active:true, recurrence:'daily'},
    {id:'sport_stretch_60',  title:'60 Sekunden Dehnen',          points:8,  icon:'🧘', desc:'Dehne Schultern, Ruecken oder Beine fuer 60 Sekunden.',                  url:TK.stretch,  type:'Sport', active:true, recurrence:'daily'}
  ];

  const norm  = x => String(x||'').toLowerCase().trim();
  const me    = () => norm((window.userInfo&&window.userInfo.email)||'demo@example.com');
  const dk    = () => { try{ return typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } };
  const isDemo = p => /demo|demo@example\.com/i.test(((p&&p.name)||'')+' '+((p&&p.email)||'')+' '+((p&&p.id)||''));
  const esc   = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function sanitize(){
    const today=dk(), ids=new Set(SPORT_POOL.map(x=>x.id));
    window.challenges=(window.challenges||[]).filter(c=>(c&&c.auto&&String(c.date||'')===today)||(c&&ids.has(c.id)));
    SPORT_POOL.forEach(sp=>{
      const i=window.challenges.findIndex(c=>c.id===sp.id);
      if(i>=0) window.challenges[i]={...window.challenges[i],...sp,active:true};
      else window.challenges.push({...sp,createdAt:new Date().toISOString()});
    });
    if(!window.isDemoMode) window.challengePlayers=(window.challengePlayers||[]).filter(p=>!isDemo(p));
    try{ if(typeof ls==='function'){ls('challenges',window.challenges);ls('challenge_players',window.challengePlayers);} }catch(e){}
  }

  window.buildDefaultChallenges=function(){ return SPORT_POOL.slice(0,5).map(x=>({...x,createdAt:new Date().toISOString()})); };

  window.ensureDailyAutoChallenges=function(day=dk()){
    if(typeof ls==='function'&&ls('auto_challenges_enabled')===false) return [];
    sanitize();
    const seed=Math.abs(String(day).split('').reduce((a,c)=>a+c.charCodeAt(0),0));
    const daily=[0,1,2].map(i=>SPORT_POOL[(seed+i*3)%SPORT_POOL.length]).map((b,i)=>({
      ...b,id:'auto_'+day+'_sport_'+i,date:day,recurrence:'once',auto:true,active:true,createdAt:day+'T00:00:00.000Z'
    }));
    window.challenges=(window.challenges||[]).filter(c=>!c.auto||String(c.id||'').startsWith('auto_'+day+'_sport_'));
    let changed=false;
    daily.forEach(ch=>{
      const i=window.challenges.findIndex(x=>x.id===ch.id);
      if(i>=0) window.challenges[i]={...window.challenges[i],...ch};
      else{window.challenges.push(ch);changed=true;}
    });
    if(changed){try{if(typeof ls==='function')ls('challenges',window.challenges);if(typeof publishChallengesToFirestore==='function')publishChallengesToFirestore();}catch(e){}}
    return daily;
  };

  window.getPlayerPointSummary=function(playerId){
    const id=norm(playerId),today=dk(),out={totalPoints:0,totalCount:0,todayPoints:0,todayCount:0,todayItems:[]};
    (window.challengeCompletions||[]).forEach(c=>{
      if(norm(c.playerId||c.email||c.userEmail)!==id)return;
      const pts=parseInt(c.points)||0;out.totalPoints+=pts;out.totalCount++;
      if(c.date===today){
        const ch=(window.challenges||[]).find(x=>x.id===c.challengeId)||{};
        out.todayPoints+=pts;out.todayCount++;
        out.todayItems.push({title:ch.title||c.challengeId||'Sportuebung',icon:ch.icon||'✅',points:pts,url:ch.url||''});
      }
    });
    return out;
  };

  window.openContestUserDetails=function(playerId){
    sanitize();
    const id=norm(playerId),p=(window.challengePlayers||[]).find(x=>norm(x.email||x.id)===id)||{id,name:id,email:id};
    if(!window.isDemoMode&&isDemo(p))return;
    const sum=window.getPlayerPointSummary(id);
    const items=sum.todayItems.length
      ?sum.todayItems.map(it=>'<div class="challenge-item"><div class="challenge-icon">'+esc(it.icon)+'</div><div class="challenge-body"><div class="challenge-name">'+esc(it.title)+'</div><div class="challenge-meta">Heute erledigt</div>'+(it.url?'<a class="exercise-link" href="'+esc(it.url)+'" target="_blank" rel="noopener">Uebung ansehen</a>':'')+'</div><span class="points-pill">+'+it.points+'</span></div>').join('')
      :'<div class="dash-empty">Heute noch nichts erledigt.</div>';
    if(typeof openPanel==='function') openPanel('Kontest: '+esc(p.name||p.email||'Mitspieler'),
      '<div class="stat-strip"><div class="stat-box"><div class="stat-num">'+sum.todayPoints+'</div><div class="stat-label">Punkte heute</div></div><div class="stat-box"><div class="stat-num">'+sum.totalPoints+'</div><div class="stat-label">Punkte gesamt</div></div></div>'+
      '<div class="push-status">Heute erledigt: <strong>'+sum.todayCount+'</strong> · Gesamt: <strong>'+sum.totalCount+'</strong></div>'+
      '<div class="divider"></div><div class="section-label">Heute erledigt</div><div class="contest-done-list">'+items+'</div>');
  };

  setTimeout(()=>{try{if(typeof window.renderChallenges==='function')window.renderChallenges();}catch(e){}},1000);
})();


/* ── 2. Challenge-Wochenbalken (einmalig, kein Duplikat) ── */
(function(){
  'use strict';

  const norm=s=>String(s||'').toLowerCase().trim();
  const myId=()=>norm((window.userInfo&&window.userInfo.email)||'demo@example.com');
  const dk=()=>{try{return typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10);}catch(e){return new Date().toISOString().slice(0,10);}};
  const pad=n=>String(n).padStart(2,'0');
  const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  let weekOffset=0;

  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
  function weekStart(d){const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}

  function pointsForDate(k,player=myId()){
    return (window.challengeCompletions||[])
      .filter(c=>norm(c.playerId||c.email||c.userEmail)===norm(player)&&String(c.date)===k)
      .reduce((a,c)=>a+(parseInt(c.points)||0),0);
  }

  function monthLabel(days){
    const names=window.DE_MONTHS_S||['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    const f=days[0],l=days[6];
    if(f.getFullYear()!==l.getFullYear())return names[f.getMonth()]+' '+f.getFullYear()+' / '+names[l.getMonth()]+' '+l.getFullYear();
    if(f.getMonth()!==l.getMonth())return names[f.getMonth()]+' / '+names[l.getMonth()]+' '+f.getFullYear();
    return (window.DE_MONTHS?.[f.getMonth()]||names[f.getMonth()])+' '+f.getFullYear();
  }

  function ensureWeekBar(){
    const view=document.getElementById('challenges-view');if(!view)return;
    const layout=view.querySelector('.challenge-layout');if(!layout)return;
    /* Alten STEP7-Balken (Punkte-Woche) + veraltete Duplikate entfernen */
    const _oldBar=document.getElementById('challenge-week-bar-clean');
    if(_oldBar) _oldBar.remove();
    view.querySelectorAll('.challenge-mini-card,#challenge-mini-calendar').forEach(el=>{
      if(!el.closest('#challenge-week-points-card'))el.remove();
    });
    if(document.getElementById('challenge-week-points-card'))return;
    const bar=document.createElement('div');
    bar.id='challenge-week-points-card';
    bar.className='challenge-week-card';
    bar.innerHTML=
      '<div class="challenge-week-head"><div><div class="challenge-week-title">Punkte-Kalender</div>'+
      '<div class="challenge-week-sub">Aktuelle Woche</div></div>'+
      '<div class="challenge-week-actions">'+
        '<button class="btn btn-ghost btn-sm" id="cwp-prev">Letzte Woche</button>'+
        '<button class="btn btn-secondary btn-sm" id="cwp-today">Heute</button>'+
        '<button class="btn btn-ghost btn-sm" id="cwp-next">Naechste Woche</button>'+
      '</div></div>'+
      '<div id="challenge-week-points-grid" class="challenge-week-grid"></div>';
    view.insertBefore(bar,layout);
    document.getElementById('cwp-prev').onclick=()=>{weekOffset=Math.max(-1,weekOffset-1);renderWeekBar();};
    document.getElementById('cwp-today').onclick=()=>{weekOffset=0;renderWeekBar();};
    document.getElementById('cwp-next').onclick=()=>{weekOffset=Math.min(1,weekOffset+1);renderWeekBar();};
  }

  function renderWeekBar(){
    ensureWeekBar();
    const grid=document.getElementById('challenge-week-points-grid');if(!grid)return;
    const days=Array.from({length:7},(_,i)=>addDays(weekStart(addDays(new Date(),weekOffset*7)),i));
    const today=dk(),weekday=['Mo','Di','Mi','Do','Fr','Sa','So'];
    const title=document.querySelector('#challenge-week-points-card .challenge-week-title');
    const sub=document.querySelector('#challenge-week-points-card .challenge-week-sub');
    if(title)title.textContent='Punkte-Kalender - '+monthLabel(days);
    if(sub)sub.textContent=(weekOffset===0?'Aktuelle Woche':weekOffset<0?'Letzte Woche':'Naechste Woche')+' - Challenge-Punkte';
    grid.innerHTML=days.map((d,i)=>{
      const k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
      const pts=pointsForDate(k);
      return '<div class="challenge-week-day'+(k===today?' is-today':'')+(pts?' has-points':' empty')+'">'+
        '<div class="challenge-week-day-name">'+weekday[i]+'</div>'+
        '<div class="challenge-week-day-date">'+pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.</div>'+
        '<div class="challenge-week-day-points">'+(pts?pts+' P':'--')+'</div></div>';
    }).join('');
  }

  window.renderChallengeMiniCalendar=renderWeekBar;

  function isDoneToday(id,player=myId(),date=dk()){
    return (window.challengeCompletions||[]).some(c=>
      String(c.challengeId)===String(id)&&
      norm(c.playerId||c.email||c.userEmail)===norm(player)&&
      String(c.date)===date);
  }

  function sportList(){
    const today=dk();
    return (window.challenges||[]).filter(c=>
      c&&c.active!==false&&
      (c.type==='Sport'||/^sport_/.test(c.id||'')||/^auto_.*_sport_/.test(c.id||''))&&
      (!c.date||c.date===today||c.recurrence==='daily'));
  }

  function pStats(id){
    const today=dk(),out={today:0,total:0,count:0};
    (window.challengeCompletions||[]).forEach(c=>{
      if(norm(c.playerId||c.email||c.userEmail)!==norm(id))return;
      const pts=parseInt(c.points)||0;out.total+=pts;out.count++;
      if(c.date===today)out.today+=pts;
    });
    return out;
  }

  function visiblePlayers(){
    const seen=new Set();
    return (window.challengePlayers||[])
      .filter(p=>p&&(p.email||p.id))
      .filter(p=>window.isDemoMode||!/demo|demo@example\.com/i.test(((p.name||'')+' '+(p.email||'')+' '+(p.id||''))))
      .filter(p=>{const k=norm(p.email||p.id);if(!k||seen.has(k))return false;seen.add(k);return true;});
  }

  window.renderChallenges=function(){
    if(typeof window.ensureDailyAutoChallenges==='function')window.ensureDailyAutoChallenges();
    ensureWeekBar();
    renderWeekBar();
    const list=document.getElementById('challenges-list');
    const board=document.getElementById('leaderboard-list');
    if(!list||!board)return;

    const active=sportList();
    list.innerHTML=active.length
      ?active.map(ch=>{
          const done=isDoneToday(ch.id);
          /* Nur TK/AOK-Link - kein YouTube-Fallback */
          const link=ch.url?'<a class="exercise-link" href="'+esc(ch.url)+'" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Uebung ansehen</a>':'';
          return '<div class="challenge-item'+(done?' challenge-done':'')+'">'
            +'<div class="challenge-icon">'+esc(ch.icon||'🏃')+'</div>'
            +'<div class="challenge-body"><div class="challenge-name">'+esc(ch.title||'Sportuebung')+'</div>'
            +'<div class="challenge-meta">'+esc(ch.desc||'')+' - '+(parseInt(ch.points)||0)+' Punkte</div>'+link+'</div>'
            +'<span class="points-pill">+'+(parseInt(ch.points)||0)+'</span>'
            +'<button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+String(ch.id).replace(/'/g,'')+'\')">'+
            (done?'Erledigt':'Erledigen')+'</button></div>';
        }).join('')
      :'<div class="empty-state"><div class="empty-title">Keine Sportuebungen</div><div class="empty-sub">Aktiviere Auto-Challenges in den Einstellungen.</div></div>';

    const players=visiblePlayers().sort((a,b)=>pStats(norm(b.email||b.id)).total-pStats(norm(a.email||a.id)).total);
    board.innerHTML=players.length
      ?players.map((p,i)=>{
          const id=norm(p.email||p.id),st=pStats(id);
          const med=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
          const dot=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>';
          return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+id.replace(/'/g,'')+'\')">'+
            '<div class="leader-rank">'+med+'</div>'+
            '<div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+(id===myId()?' - Du':'')+dot+'</div>'+
            '<div class="leader-detail">Heute: '+st.today+' P - Gesamt: '+st.total+' P - '+st.count+' erledigt</div></div>'+
            '<div class="leader-score">'+st.total+'</div></div>';
        }).join('')
      :'<div class="dash-empty">Noch keine Mitspieler.</div>';
  };

  window.openChallengePanel=function(){
    if(typeof openPanel==='function')
      openPanel('Challenges','<div class="push-box"><div class="challenge-title">Eigene Challenges deaktiviert</div><div class="push-status">Es gibt ausschliesslich vorgegebene Sportuebungen.</div></div>');
  };

  const _oldFab=window.fabAction;
  window.fabAction=function(){
    if(window.currentMainView==='challenges')return window.openChallengePanel();
    return typeof _oldFab==='function'?_oldFab.apply(this,arguments):undefined;
  };

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{try{ensureWeekBar();if(window.currentMainView==='challenges')window.renderChallenges();}catch(e){}},800);
  });
})();


/* ── 3. Routing & View-Steuerung ───────────────────────── */
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));

  function showView(v){
    [['dashboard','#dashboard-view'],['calendar','#cal-body'],['challenges','#challenges-view']].forEach(([name,sel])=>{
      const el=$(sel);if(!el)return;
      if(name===v){el.style.display='flex';el.classList.remove('route-hidden');}
      else{el.style.display='none';el.classList.add('route-hidden');}
    });
    const cc=$('#cal-controls');if(cc)cc.style.display=v==='calendar'?'flex':'none';
    $$('.h-tab').forEach(t=>t.classList.remove('active'));$('#htab-'+v)?.classList.add('active');
    $$('.bnav-item').forEach(t=>t.classList.remove('active'));$('#bnav-'+v)?.classList.add('active');
    const fab=$('#fab');if(fab)fab.classList.toggle('challenge-disabled',v==='challenges');
  }

  window.setMainView=function(v,fromRoute){
    if(!['dashboard','calendar','challenges'].includes(v))v='dashboard';
    window.currentMainView=v;showView(v);
    if(v==='dashboard'&&typeof buildDashboard==='function')buildDashboard();
    if(v==='calendar'&&typeof renderCalendar==='function')renderCalendar();
    if(v==='challenges'&&typeof renderChallenges==='function')renderChallenges();
    if(!fromRoute){try{history.pushState({view:v},'','#/'+v);}catch(e){location.hash='/'+v;}}
  };

  window.addEventListener('popstate',e=>{
    const v=(e.state&&e.state.view)||(location.hash.replace('#/','')||'dashboard');
    window.setMainView(v,true);
  });
  window.addEventListener('hashchange',()=>{
    const v=location.hash.replace('#/','')||'dashboard';
    if(v!==window.currentMainView)window.setMainView(v,true);
  });

  const _boot=window.bootMainApp;
  window.bootMainApp=function(){
    if(typeof _boot==='function')_boot.apply(this,arguments);
    setTimeout(()=>{
      const route=location.hash.replace('#/','')||window.currentMainView||'dashboard';
      window.setMainView(route,true);
    },150);
  };
})();


/* ── 4. Kalender-Optionen ──────────────────────────────── */
(function(){
  'use strict';
  const KEY='change_v1_calendar_view_options';

  function readOptions(){
    const def={showHolidays:true,showChallengeDots:true,showWeekNumbers:true};
    try{return Object.assign(def,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return def;}
  }
  function applyCSS(o){
    o=o||readOptions();
    let st=document.getElementById('change-calendar-options-style');
    if(!st){st=document.createElement('style');st.id='change-calendar-options-style';document.head.appendChild(st);}
    st.textContent=
      (o.showChallengeDots?'':'.challenge-day-dot{display:none!important}')+
      (o.showHolidays?'':'.holiday-line,.holiday-badge{display:none!important}')+
      (o.showWeekNumbers?'':'.kw-badge,.kw-badge-left,.cal-kw{display:none!important}');
  }

  const _render=window.renderCalendar;
  window.renderCalendar=function(){
    if(typeof _render==='function')_render.apply(this,arguments);
    setTimeout(()=>{
      applyCSS();
      if(window.accessToken&&window.accessToken!=='firebase-auth'&&typeof window.loadGoogleData==='function'){
        try{window.loadGoogleData();}catch(e){}
      }
    },0);
  };

  window.changeCalendarViewOptions=readOptions();
  applyCSS();

  window.addEventListener('load',()=>{
    setTimeout(()=>{
      applyCSS();
      if(window.accessToken&&window.accessToken!=='firebase-auth'&&typeof window.loadGoogleData==='function'){
        try{window.loadGoogleData();}catch(e){}
      }
      if(typeof renderCalendar==='function')renderCalendar();
    },800);
  });
})();
