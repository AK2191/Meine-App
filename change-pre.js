/* ═══════════════════════════════════════════════════════════
   CHANGE · change-pre.js
   Wird VOR dem Inline-Code in index.html geladen.
   Enthält (in Reihenfolge):
     1. change-final-fixes.js
     2. change-challenge-calendar-custom.js
     3. change-routing-week-points.js
     4. change-request-polish.js
═══════════════════════════════════════════════════════════ */

/* ── 1. change-final-fixes.js ──────────────────────────── */
(function(){
  'use strict';
  const YT={squat:'https://www.youtube.com/results?search_query=Kniebeuge+richtig+ausf%C3%BChren',pushup:'https://www.youtube.com/results?search_query=Liegest%C3%BCtz+richtig+ausf%C3%BChren',plank:'https://www.youtube.com/results?search_query=Unterarmst%C3%BCtz+Plank+richtig+ausf%C3%BChren',lunge:'https://www.youtube.com/results?search_query=Ausfallschritte+richtig+ausf%C3%BChren',wall:'https://www.youtube.com/results?search_query=Wandsitz+richtig+ausf%C3%BChren',calf:'https://www.youtube.com/results?search_query=Wadenheben+richtig+ausf%C3%BChren',jumping:'https://www.youtube.com/results?search_query=Hampelm%C3%A4nner+richtig+ausf%C3%BChren',glute:'https://www.youtube.com/results?search_query=Glute+Bridge+richtig+ausf%C3%BChren',mobility:'https://www.youtube.com/results?search_query=Schulterkreisen+Mobilisation+%C3%9Cbung',mountain:'https://www.youtube.com/results?search_query=Mountain+Climbers+richtig+ausf%C3%BChren'};
  const SPORT_ONLY_POOL=[
    {id:'sport_squats_12',title:'12 Kniebeugen',points:8,icon:'🏋️',desc:'12 saubere Kniebeugen in ruhigem Tempo. Leicht bis mittel.',url:YT.squat,type:'Sport',active:true,recurrence:'daily'},
    {id:'sport_wall_sit_30',title:'30 Sekunden Wandsitz',points:8,icon:'🦵',desc:'Rücken an die Wand, Knie ungefähr 90°. 30 Sekunden halten.',url:YT.wall,type:'Sport',active:true,recurrence:'daily'},
    {id:'sport_plank_25',title:'25 Sekunden Plank',points:9,icon:'💪',desc:'Unterarmstütz mit stabilem Rumpf. 25 Sekunden halten.',url:YT.plank,type:'Sport',active:true,recurrence:'daily'},
    {id:'sport_lunges_10',title:'10 Ausfallschritte',points:10,icon:'🚶',desc:'Je Seite 5 kontrollierte Ausfallschritte.',url:YT.lunge,type:'Sport',active:true,recurrence:'daily'},
    {id:'sport_calf_20',title:'20 Wadenheben',points:7,icon:'🦶',desc:'Langsam hochdrücken und kontrolliert absenken.',url:YT.calf,type:'Sport',active:true,recurrence:'daily'},
    {id:'sport_pushups_6',title:'6 leichte Liegestütze',points:10,icon:'💪',desc:'Normal oder auf Knien. Saubere Bewegung zählt.',url:YT.pushup,type:'Sport',active:true,recurrence:'daily'},
    {id:'sport_jumping_20',title:'20 Hampelmänner',points:8,icon:'🤸',desc:'Locker aufwärmen, 20 Wiederholungen.',url:YT.jumping,type:'Sport',active:true,recurrence:'daily'},
    {id:'sport_glute_12',title:'12 Glute Bridges',points:8,icon:'🧘',desc:'Rückenlage, Hüfte kontrolliert anheben und senken.',url:YT.glute,type:'Sport',active:true,recurrence:'daily'},
    {id:'sport_mobility_60',title:'60 Sekunden Schulter-Mobilität',points:6,icon:'🔄',desc:'Schulterkreisen und lockere Mobilisation.',url:YT.mobility,type:'Sport',active:true,recurrence:'daily'},
    {id:'sport_mountain_16',title:'16 Mountain Climbers',points:10,icon:'⛰️',desc:'Langsam und kontrolliert, je Seite 8 Wiederholungen.',url:YT.mountain,type:'Sport',active:true,recurrence:'daily'}
  ];
  const dk=()=>dateKey(new Date());
  const norm=x=>String(x||'').toLowerCase().trim();
  const pid=p=>norm(p && (p.email||p.id));
  const isDemo=p=>/demo|demo@example\.com/i.test(((p&&p.name)||'')+' '+((p&&p.email)||'')+' '+((p&&p.id)||''));
  const me=()=>norm(userInfo.email||'demo@example.com');
  function sanitize(){
    const today=dk(), ids=new Set(SPORT_ONLY_POOL.map(x=>x.id));
    challenges=(challenges||[]).filter(c=>(c&&c.auto&&String(c.date||'')===today)||(c&&ids.has(c.id)));
    SPORT_ONLY_POOL.forEach(sp=>{const i=challenges.findIndex(c=>c.id===sp.id); if(i>=0) challenges[i]={...challenges[i],...sp,active:true}; else challenges.push({...sp,createdAt:new Date().toISOString()});});
    if(!isDemoMode) challengePlayers=(challengePlayers||[]).filter(p=>!isDemo(p));
    ls('challenges',challenges); ls('challenge_players',challengePlayers);
  }
  window.buildDefaultChallenges=function(){return SPORT_ONLY_POOL.slice(0,5).map(x=>({...x,createdAt:new Date().toISOString()}));};
  window.ensureDailyAutoChallenges=function(day=dk()){
    if(ls('auto_challenges_enabled')===false) return [];
    sanitize();
    const seed=Math.abs(String(day).split('').reduce((a,c)=>a+c.charCodeAt(0),0));
    const daily=[0,1,2].map(i=>SPORT_ONLY_POOL[(seed+i*3)%SPORT_ONLY_POOL.length]).map((b,i)=>({...b,id:'auto_'+day+'_sport_'+i,date:day,recurrence:'once',auto:true,active:true,createdAt:day+'T00:00:00.000Z'}));
    let changed=false;
    challenges=(challenges||[]).filter(c=>!c.auto||String(c.id||'').startsWith('auto_'+day+'_sport_'));
    daily.forEach(ch=>{const i=challenges.findIndex(x=>x.id===ch.id); if(i>=0)challenges[i]={...challenges[i],...ch}; else{challenges.push(ch);changed=true;}});
    if(changed){ls('challenges',challenges); if(typeof publishChallengesToFirestore==='function')publishChallengesToFirestore();}
    return daily;
  };
  window.getPlayerPointSummary=function(playerId){
    const id=norm(playerId),today=dk(),out={totalPoints:0,totalCount:0,todayPoints:0,todayCount:0,todayItems:[]};
    (challengeCompletions||[]).forEach(c=>{if(norm(c.playerId||c.email||c.userEmail)!==id)return; const pts=parseInt(c.points)||0; out.totalPoints+=pts; out.totalCount++; if(c.date===today){const ch=(challenges||[]).find(x=>x.id===c.challengeId)||{}; out.todayPoints+=pts; out.todayCount++; out.todayItems.push({title:ch.title||c.challengeId||'Sportübung',icon:ch.icon||'✅',points:pts,url:ch.url||''});}});
    return out;
  };
  window.openContestUserDetails=function(playerId){
    sanitize(); const id=norm(playerId),p=(challengePlayers||[]).find(x=>pid(x)===id)||{id,name:id,email:id}; if(!isDemoMode&&isDemo(p))return;
    const sum=getPlayerPointSummary(id);
    const items=sum.todayItems.length?sum.todayItems.map(it=>'<div class="challenge-item"><div class="challenge-icon">'+esc(it.icon)+'</div><div class="challenge-body"><div class="challenge-name">'+esc(it.title)+'</div><div class="challenge-meta">Heute erledigt</div>'+(it.url?'<a class="exercise-link" href="'+esc(it.url)+'" target="_blank" rel="noopener">Anleitung auf YouTube öffnen</a>':'')+'</div><span class="points-pill">+'+it.points+'</span></div>').join(''):'<div class="dash-empty">Heute noch nichts erledigt.</div>';
    openPanel('Kontest · '+esc(p.name||p.email||'Mitspieler'),'<div class="stat-strip"><div class="stat-box"><div class="stat-num">'+sum.todayPoints+'</div><div class="stat-label">Punkte heute</div></div><div class="stat-box"><div class="stat-num">'+sum.totalPoints+'</div><div class="stat-label">Punkte gesamt</div></div></div><div class="push-status">Erledigt heute: <strong>'+sum.todayCount+'</strong> · Gesamt erledigt: <strong>'+sum.totalCount+'</strong></div><div class="divider"></div><div class="section-label">Heute erledigt</div><div class="contest-done-list">'+items+'</div>');
  };
  window.renderChallenges=function(){
    sanitize(); ensureDailyAutoChallenges(); const list=document.getElementById('challenges-list'),board=document.getElementById('leaderboard-list'); if(!list||!board)return;
    const today=dk(), active=(challenges||[]).filter(c=>c.active!==false&&(!c.date||c.date===today||c.recurrence==='daily'));
    list.innerHTML=active.length?active.map(ch=>{const done=isChallengeDoneToday(ch.id);return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc(ch.icon||'🏃')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title)+'</div><div class="challenge-meta">'+esc(ch.desc||'')+' · '+(ch.points||0)+' Punkte</div>'+(ch.url?'<a class="exercise-link" href="'+esc(ch.url)+'" target="_blank" rel="noopener">Anleitung auf YouTube öffnen</a>':'')+'</div><span class="points-pill">+'+(ch.points||0)+'</span><button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+ch.id+'\')">'+(done?'Erledigt':'Erledigen')+'</button></div>';}).join(''):'<div class="empty-state"><div class="empty-title">Keine Sportübungen</div><div class="empty-sub">Auto-Challenges aktivieren.</div></div>';
    const players=(challengePlayers||[]).filter(p=>isDemoMode||!isDemo(p)).filter(p=>pid(p)).sort((a,b)=>getPlayerPointSummary(pid(b)).totalPoints-getPlayerPointSummary(pid(a)).totalPoints);
    board.innerHTML=players.length?players.map((p,i)=>{const id=pid(p),st=getPlayerPointSummary(id),med=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1),live=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>';return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+id.replace(/'/g,'')+'\')"><div class="leader-rank">'+med+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+(id===me()?' · Du':'')+live+'</div><div class="leader-detail">Heute: '+st.todayPoints+' Punkte · Gesamt: '+st.totalPoints+' Punkte · '+st.totalCount+' erledigt</div></div><div class="leader-score">'+st.totalPoints+'</div></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler.</div>';
  };
  window.buildKPIs=function(){
    sanitize(); const today=dk(),my=me(),st=getPlayerPointSummary(my),due=(challenges||[]).filter(c=>c.active!==false&&(!c.date||c.date===today||c.recurrence==='daily')).length,done=(challengeCompletions||[]).filter(c=>norm(c.playerId||c.email||c.userEmail)===my&&c.date===today).length,grid=document.getElementById('kpi-grid'); if(!grid)return;
    grid.innerHTML='<div class="kpi-card good" onclick="setMainView(\'challenges\')"><div class="kpi-icon-wrap green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5"/></svg></div><div class="kpi-num good-color">'+done+'/'+due+'</div><div class="kpi-label">Heute erledigt</div></div><div class="kpi-card" onclick="setMainView(\'challenges\')"><div class="kpi-icon-wrap amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg></div><div class="kpi-num">'+st.todayPoints+'</div><div class="kpi-label">Challenge Punkte heute</div></div><div class="kpi-card" onclick="setMainView(\'challenges\')"><div class="kpi-icon-wrap purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/></svg></div><div class="kpi-num">'+st.totalPoints+'</div><div class="kpi-label">Challenge Punkte gesamt</div></div>';
  };
  window.buildDashCards=function(){
    const players=(challengePlayers||[]).filter(p=>isDemoMode||!isDemo(p)).filter(p=>pid(p)).sort((a,b)=>getPlayerPointSummary(pid(b)).totalPoints-getPlayerPointSummary(pid(a)).totalPoints).slice(0,8);
    const board=players.length?players.map((p,i)=>{const id=pid(p),st=getPlayerPointSummary(id);return '<div class="dash-row" onclick="setMainView(\'challenges\');setTimeout(()=>openContestUserDetails(\''+id.replace(/'/g,'')+'\'),150)"><div class="dash-row-icon" style="background:var(--amb-d)">'+(i+1)+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(p.name||p.email||'Mitspieler')+'</div><div class="dash-row-sub">Heute '+st.todayPoints+' P · Gesamt '+st.totalPoints+' P</div></div><span class="dash-row-badge badge-green">'+st.totalPoints+' P</span></div>';}).join(''):'<div class="dash-empty">Challenge-Kontest zeigt noch keine Mitspieler.</div>';
    const today=dk(), due=(challenges||[]).filter(c=>c.active!==false&&(!c.date||c.date===today||c.recurrence==='daily')).slice(0,5);
    const dueHtml=due.length?due.map(ch=>'<div class="dash-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--pur-d)">'+esc(ch.icon||'🏃')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(ch.title)+'</div><div class="dash-row-sub">'+(ch.points||0)+' Punkte</div></div></div>').join(''):'<div class="dash-empty">Heute keine Sportübungen.</div>';
    const dg=document.getElementById('dash-grid'); if(dg)dg.innerHTML='<div class="dash-card"><div class="dash-card-head"><div><div class="dash-card-title">🏃 Heutige Sport-Challenges</div><div class="dash-card-sub">Leicht bis mittelschwer</div></div><button class="btn btn-ghost btn-sm" onclick="setMainView(\'challenges\')">Öffnen →</button></div><div class="dash-card-body">'+dueHtml+'</div></div><div class="dash-card"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenge-Kontest</div><div class="dash-card-sub">Heute & Gesamtpunkte</div></div><button class="btn btn-ghost btn-sm" onclick="setMainView(\'challenges\')">Öffnen →</button></div><div class="dash-card-body">'+board+'</div></div>';
  };
  const oldBoot=window.bootMainApp;
  window.bootMainApp=function(){if(typeof oldBoot==='function')oldBoot.apply(this,arguments);setTimeout(()=>{try{ensureSports&&ensureSports();const view=document.getElementById('challenges-view'),layout=view&&view.querySelector('.challenge-layout');if(layout&&!document.getElementById('challenge-mini-calendar')){const card=document.createElement('div');card.className='leader-card challenge-mini-card';card.innerHTML='<div class="leader-card-head"><div><div class="challenge-title">Punkte-Kalender</div><div class="challenge-sub">Nur für Challenges</div></div></div><div id="challenge-mini-calendar"></div>';layout.appendChild(card);}if(currentMainView==='challenges')renderChallenges();}catch(e){}},250);};
  setTimeout(()=>{try{if(typeof renderChallenges==='function')renderChallenges();}catch(e){}},1000);
})();

/* ── 2. change-challenge-calendar-custom.js ────────────── */
(function(){
  'use strict';
  const todayKey=()=> (typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10));
  const escHtml=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  const norm=x=>String(x||'').toLowerCase().trim();
  const myId=()=>norm((window.userInfo&&userInfo.email)||'demo@example.com');
  const yt=q=>'https://www.youtube.com/results?search_query='+encodeURIComponent(q);
  const defaultSports=[
    ['sport_squats_12','12 Kniebeugen',8,'🏋️','12 saubere Kniebeugen in ruhigem Tempo.','Kniebeuge richtig ausführen Anfänger'],
    ['sport_wall_sit_30','30 Sekunden Wandsitz',8,'🦵','Rücken an die Wand, Knie 90°. 30 Sekunden.','Wandsitz richtig ausführen'],
    ['sport_plank_25','25 Sekunden Plank',9,'💪','Unterarmstütz. 25 Sekunden halten.','Plank Unterarmstütz richtig ausführen'],
    ['sport_lunges_10','10 Ausfallschritte',10,'🚶','Je Seite 5 Ausfallschritte.','Ausfallschritte richtig ausführen Anfänger'],
    ['sport_calf_20','20 Wadenheben',7,'🦶','Langsam hoch und kontrolliert absenken.','Wadenheben richtig ausführen'],
    ['sport_pushups_6','6 leichte Liegestütze',10,'💪','Normal oder auf Knien.','Liegestütze richtig ausführen Anfänger'],
    ['sport_jumping_20','20 Hampelmänner',8,'🤸','Locker aufwärmen.','Hampelmänner richtig ausführen'],
    ['sport_glute_12','12 Glute Bridges',8,'🧘','Hüfte kontrolliert anheben.','Glute Bridge richtig ausführen'],
    ['sport_fitness_30','30 Minuten Fitness',40,'🏋️‍♀️','Gehe 30 Minuten ins Fitnessstudio.','30 Minuten Fitnessstudio Workout Anfänger']
  ].map(a=>({id:a[0],title:a[1],points:a[2],icon:a[3],desc:a[4],url:yt(a[5]),type:'Sport',active:true,recurrence:'daily'}));

  function ensureSports(){
    window.challenges=Array.isArray(window.challenges)?window.challenges:[];
    defaultSports.forEach(sp=>{const i=challenges.findIndex(c=>c.id===sp.id); if(i>=0)challenges[i]={...challenges[i],...sp,active:true}; else challenges.push({...sp,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});});
    try{ls('challenges',challenges)}catch(e){}
  }
  window.ensureSports=ensureSports;

  function isDone(id,player=myId(),date=todayKey()){
    return (challengeCompletions||[]).some(c=>String(c.challengeId)===String(id)&&norm(c.playerId||c.email||c.userEmail)===norm(player)&&String(c.date)===date);
  }

  function pointsByDay(player=myId(),year=(new Date()).getFullYear(),month=(new Date()).getMonth()){
    const out={};
    (challengeCompletions||[]).forEach(c=>{
      if(norm(c.playerId||c.email||c.userEmail)!==norm(player)||!c.date)return;
      const d=new Date(String(c.date)+'T12:00:00');
      if(d.getFullYear()!==year||d.getMonth()!==month)return;
      out[c.date]=(out[c.date]||0)+(parseInt(c.points)||0);
    });
    return out;
  }

  window.renderChallengeMiniCalendar=function(){
    const host=document.getElementById('challenge-mini-calendar'); if(!host)return;
    const now=new Date(),y=now.getFullYear(),m=now.getMonth(),map=pointsByDay(myId(),y,m),
          first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();
    const DE_MONTHS_LOCAL=window.DE_MONTHS||['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    let html='<div class="mini-cal-head"><span>'+DE_MONTHS_LOCAL[m]+' '+y+'</span><small>Punkte pro Tag</small></div><div class="mini-cal-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div class="mini-cal-grid">';
    for(let i=0;i<start;i++)html+='<div class="mini-cal-cell muted"></div>';
    for(let d=1;d<=days;d++){
      const key=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'),pts=map[key]||0;
      html+='<div class="mini-cal-cell '+(key===todayKey()?'today':'')+' '+(pts?'has-points':'')+'"><b>'+d+'</b>'+(pts?'<small>'+pts+' P</small>':'')+'</div>';
    }
    host.innerHTML=html+'</div>';
  };

  window.ensureDailyAutoChallenges=function(day=todayKey()){
    ensureSports();
    if(typeof ls==='function'&&ls('auto_challenges_enabled')===false)return [];
    const seed=Math.abs(String(day).split('').reduce((a,c)=>a+c.charCodeAt(0),0));
    const daily=[0,1,2].map(i=>defaultSports[(seed+i*2)%defaultSports.length]).map((b,i)=>({...b,id:'auto_'+day+'_sport_'+i,date:day,recurrence:'once',auto:true,active:true,createdAt:day+'T00:00:00.000Z'}));
    let changed=false;
    window.challenges=(challenges||[]).filter(c=>!c.auto||String(c.id||'').startsWith('auto_'+day+'_sport_'));
    daily.forEach(ch=>{const idx=challenges.findIndex(x=>x.id===ch.id); if(idx>=0)challenges[idx]={...challenges[idx],...ch}; else{challenges.push(ch);changed=true;}});
    if(changed){try{ls('challenges',challenges); if(typeof publishChallengesToFirestore==='function')publishChallengesToFirestore();}catch(e){}}
    return daily;
  };

  const oldBoot2=window.bootMainApp;
  window.bootMainApp=function(){
    if(typeof oldBoot2==='function')oldBoot2.apply(this,arguments);
    setTimeout(()=>{
      try{
        ensureSports();
        const view=document.getElementById('challenges-view'),layout=view&&view.querySelector('.challenge-layout');
        if(layout&&!document.getElementById('challenge-mini-calendar')){
          const card=document.createElement('div');
          card.className='leader-card challenge-mini-card';
          card.innerHTML='<div class="leader-card-head"><div><div class="challenge-title">Punkte-Kalender</div><div class="challenge-sub">Nur für Challenges</div></div></div><div id="challenge-mini-calendar"></div>';
          layout.appendChild(card);
        }
        if(currentMainView==='challenges')renderChallenges();
      }catch(e){console.warn('Challenge patch:',e);}
    },250);
  };
  setTimeout(()=>{try{ensureSports(); if(typeof renderChallenges==='function')renderChallenges();}catch(e){}},1000);
})();

/* ── 3. change-routing-week-points.js ──────────────────── */
(function(){
  'use strict';
  const dqs=(s,r=document)=>r.querySelector(s);
  const dqsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc2=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const norm=s=>String(s||'').toLowerCase().trim();
  const todayKey2=()=> typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10);
  const myId2=()=>norm((window.userInfo&&userInfo.email)||'demo@example.com');
  let challengeWeekOffset=0;

  function addDays2(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
  function weekStart(d){const x=new Date(d);x.setHours(12,0,0,0);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return x;}
  function monthRangeLabel(days){
    const names=window.DE_MONTHS_S||['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    const first=days[0],last=days[6];
    if(first.getFullYear()!==last.getFullYear())return names[first.getMonth()]+' '+first.getFullYear()+' / '+names[last.getMonth()]+' '+last.getFullYear();
    if(first.getMonth()!==last.getMonth())return names[first.getMonth()]+' / '+names[last.getMonth()]+' '+first.getFullYear();
    return (window.DE_MONTHS?.[first.getMonth()]||names[first.getMonth()])+' '+first.getFullYear();
  }
  function pointsForDate(key,player=myId2()){
    return (window.challengeCompletions||[]).filter(c=>norm(c.playerId||c.email||c.userEmail)===norm(player)&&String(c.date)===key).reduce((a,c)=>a+(parseInt(c.points)||0),0);
  }
  function ensureChallengeShell(){
    const view=dqs('#challenges-view'); if(!view)return;
    view.classList.add('app-view');
    const header=dqs('.list-header',view);
    const addBtn=header&&header.querySelector('.btn-primary'); if(addBtn)addBtn.remove();
    let week=dqs('#challenge-week-points-card');
    const layout=dqs('.challenge-layout',view);
    if(!week&&layout){
      week=document.createElement('div');
      week.id='challenge-week-points-card';
      week.className='challenge-week-card';
      week.innerHTML='<div class="challenge-week-head"><div><div class="challenge-week-title">Punkte-Kalender</div><div class="challenge-week-sub">Aktuelle Woche · nur Challenge-Punkte</div></div><div class="challenge-week-actions"><button class="btn btn-ghost btn-sm" id="challenge-week-prev">← Letzte Woche</button><button class="btn btn-secondary btn-sm" id="challenge-week-today">Heute</button><button class="btn btn-ghost btn-sm" id="challenge-week-next">Nächste Woche →</button></div></div><div id="challenge-week-points-grid" class="challenge-week-grid"></div>';
      view.insertBefore(week,layout);
      dqs('#challenge-week-prev',week).onclick=()=>{challengeWeekOffset=Math.max(-1,challengeWeekOffset-1); renderChallengeMiniCalendar();};
      dqs('#challenge-week-today',week).onclick=()=>{challengeWeekOffset=0; renderChallengeMiniCalendar();};
      dqs('#challenge-week-next',week).onclick=()=>{challengeWeekOffset=Math.min(1,challengeWeekOffset+1); renderChallengeMiniCalendar();};
    }
    dqsa('.challenge-mini-card',view).forEach(el=>el.remove());
    const old=dqs('#challenge-mini-calendar'); if(old&&!old.closest('#challenge-week-points-card'))old.remove();
  }

  window.renderChallengeMiniCalendar=function(){
    ensureChallengeShell();
    const grid=dqs('#challenge-week-points-grid'); if(!grid)return;
    const base=addDays2(new Date(),challengeWeekOffset*7);
    const start=weekStart(base);
    const days=Array.from({length:7},(_,i)=>addDays2(start,i));
    const title=dqs('#challenge-week-points-card .challenge-week-title');
    const sub=dqs('#challenge-week-points-card .challenge-week-sub');
    if(title)title.textContent='Punkte-Kalender · '+monthRangeLabel(days);
    if(sub)sub.textContent=(challengeWeekOffset===0?'Aktuelle Woche':challengeWeekOffset<0?'Letzte Woche':'Nächste Woche')+' · nur Challenge-Punkte';
    const weekday=['Mo','Di','Mi','Do','Fr','Sa','So'];
    grid.innerHTML=days.map((d,i)=>{
      const key=typeof dateKey==='function'?dateKey(d):d.toISOString().slice(0,10);
      const pts=pointsForDate(key);
      return '<div class="challenge-week-day '+(key===todayKey2()?'is-today ':'')+(pts?'has-points':'empty')+'"><div><div class="challenge-week-day-name">'+weekday[i]+'</div><div class="challenge-week-day-date">'+String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.</div></div><div class="challenge-week-day-points">'+(pts?pts+' P':'0 P')+'</div></div>';
    }).join('');
  };

  function sportOnlyList(){
    const t=todayKey2();
    return (window.challenges||[]).filter(c=>c&&c.active!==false&&!c.custom&&!String(c.id||'').startsWith('custom_')&&(c.type==='Sport'||/^sport_/.test(c.id||'')||/^auto_.*_sport_/.test(c.id||''))&&(!c.date||c.date===t||c.recurrence==='daily'));
  }
  function doneToday(id,player=myId2(),date=todayKey2()){
    return (window.challengeCompletions||[]).some(c=>String(c.challengeId)===String(id)&&norm(c.playerId||c.email||c.userEmail)===norm(player)&&String(c.date)===date);
  }
  function playerStats(id){
    const t=todayKey2(); const out={today:0,total:0,count:0};
    (window.challengeCompletions||[]).forEach(c=>{if(norm(c.playerId||c.email||c.userEmail)!==norm(id))return; const pts=parseInt(c.points)||0; out.total+=pts; out.count++; if(c.date===t)out.today+=pts;});
    return out;
  }

  window.openChallengePanel=function(){
    if(typeof openPanel==='function')openPanel('Challenges','<div class="push-box"><div class="challenge-title">Eigene Challenges sind deaktiviert</div><div class="push-status">Aktuell gibt es ausschließlich vorgegebene leichte bis mittelschwere Sportübungen.</div></div>');
    else if(typeof toast==='function')toast('Eigene Challenges sind deaktiviert.','');
  };

  const oldFab=window.fabAction;
  window.fabAction=function(){
    if(window.currentMainView==='challenges')return window.openChallengePanel();
    return typeof oldFab==='function'?oldFab.apply(this,arguments):undefined;
  };

  window.renderChallenges=function(){
    if(typeof ensureDailyAutoChallenges==='function')ensureDailyAutoChallenges();
    ensureChallengeShell();
    const list=dqs('#challenges-list'), board=dqs('#leaderboard-list'); if(!list||!board)return;
    const active=sportOnlyList();
    list.innerHTML=active.length?active.map(ch=>{const done=doneToday(ch.id); const url=ch.url||('https://www.youtube.com/results?search_query='+encodeURIComponent((ch.title||'Sportübung')+' richtig ausführen')); return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc2(ch.icon||'🏃')+'</div><div class="challenge-body"><div class="challenge-name">'+esc2(ch.title||'Sportübung')+'</div><div class="challenge-meta">'+esc2(ch.desc||'')+' · '+(parseInt(ch.points)||0)+' Punkte</div><a class="exercise-link" href="'+esc2(url)+'" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Anleitung auf YouTube öffnen</a></div><span class="points-pill">+'+(parseInt(ch.points)||0)+'</span><button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+String(ch.id).replace(/'/g,'')+'\')">'+(done?'Erledigt':'Erledigen')+'</button></div>';}).join(''):'<div class="empty-state"><div class="empty-title">Keine Sportübungen</div><div class="empty-sub">Aktiviere tägliche Auto-Challenges.</div></div>';
    const players=(window.challengePlayers||[]).filter(p=>p&&(p.email||p.id)).filter(p=>window.isDemoMode||!/demo|demo@example\.com/i.test(((p.name||'')+' '+(p.email||'')+' '+(p.id||''))));
    players.sort((a,b)=>playerStats(b.email||b.id).total-playerStats(a.email||a.id).total);
    board.innerHTML=players.length?players.map((p,i)=>{const id=norm(p.email||p.id),s=playerStats(id),med=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1),live=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>';return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+id.replace(/'/g,'')+'\')"><div class="leader-rank">'+med+'</div><div><div class="leader-name">'+esc2(p.name||p.email||'Mitspieler')+(id===myId2()?' · Du':'')+live+'</div><div class="leader-detail">Heute: '+s.today+' Punkte · Gesamt: '+s.total+' Punkte · '+s.count+' erledigt</div></div><div class="leader-score">'+s.total+'</div></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler.</div>';
    renderChallengeMiniCalendar();
  };

  function showOnlyView(v){
    ensureChallengeShell();
    const views=[['dashboard','#dashboard-view'],['calendar','#cal-body'],['challenges','#challenges-view']];
    views.forEach(([name,sel])=>{const el=dqs(sel); if(!el)return; el.classList.add('app-view'); if(name===v){el.style.display='flex'; el.classList.remove('route-hidden'); el.classList.add('route-visible','route-fade-in'); setTimeout(()=>el.classList.remove('route-fade-in'),260);}else{el.classList.remove('route-visible','route-fade-in'); el.classList.add('route-hidden'); el.style.display='none';}});
    const cc=dqs('#cal-controls'); if(cc)cc.style.display=v==='calendar'?'flex':'none';
    dqsa('.h-tab').forEach(t=>t.classList.remove('active')); dqs('#htab-'+v)?.classList.add('active');
    dqsa('.bnav-item').forEach(t=>t.classList.remove('active')); dqs('#bnav-'+v)?.classList.add('active');
    const fab=dqs('#fab'); if(fab)fab.classList.toggle('challenge-disabled',v==='challenges');
  }

  window.setMainView=function(v,fromRoute){
    if(!['dashboard','calendar','challenges'].includes(v))v='dashboard';
    window.currentMainView=v; showOnlyView(v);
    if(v==='dashboard'&&typeof buildDashboard==='function')buildDashboard();
    if(v==='calendar'&&typeof renderCalendar==='function')renderCalendar();
    if(v==='challenges')renderChallenges();
    if(!fromRoute){try{history.pushState({view:v},'','#/'+v);}catch(e){location.hash='/'+v;}}
  };

  window.addEventListener('popstate',e=>{const v=(e.state&&e.state.view)||(location.hash.replace('#/','')||'dashboard'); window.setMainView(v,true);});
  window.addEventListener('hashchange',()=>{const v=location.hash.replace('#/','')||'dashboard'; if(v!==window.currentMainView)window.setMainView(v,true);});

  const oldBoot3=window.bootMainApp;
  window.bootMainApp=function(){if(typeof oldBoot3==='function')oldBoot3.apply(this,arguments); setTimeout(()=>{ensureChallengeShell(); const route=location.hash.replace('#/','')||window.currentMainView||'dashboard'; window.setMainView(route,true);},150);};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{ensureChallengeShell(); if(window.currentMainView==='challenges')renderChallenges();},800));
})();

/* ── 4. change-request-polish.js (Kalender-Repair-Teil) ── */
(function(){
  const KEY = "change_calendar_options_v2";
  function readOptions(){
    try{return Object.assign({showHolidays:true,showChallengeDots:true,showWeekNumbers:false},JSON.parse(localStorage.getItem(KEY)||"{}"));}
    catch(e){return {showHolidays:true,showChallengeDots:true,showWeekNumbers:false};}
  }
  function saveOptions(o){localStorage.setItem(KEY,JSON.stringify(o)); window.changeCalendarViewOptions=o; applyCalendarOptions();}
  function applyCalendarOptions(){
    const o=window.changeCalendarViewOptions||readOptions();
    let st=document.getElementById("change-calendar-options-style");
    if(!st){st=document.createElement("style");st.id="change-calendar-options-style";document.head.appendChild(st);}
    st.textContent=(o.showChallengeDots?"":".challenge-day-dot{display:none!important;}")+(o.showHolidays?"":".holiday-line,.holiday-badge{display:none!important;}")+(o.showWeekNumbers?"":".kw-badge{display:none!important;}");
    ["toggle-holidays","toggle-dots","toggle-kw"].forEach(id=>{const el=document.getElementById(id); if(!el)return; if(id==="toggle-holidays")el.checked=!!o.showHolidays; if(id==="toggle-dots")el.checked=!!o.showChallengeDots; if(id==="toggle-kw")el.checked=!!o.showWeekNumbers;});
  }
  const oldRenderCalendar4=window.renderCalendar;
  window.renderCalendar=function(){
    if(typeof oldRenderCalendar4==="function")oldRenderCalendar4.apply(this,arguments);
    setTimeout(function(){
      applyCalendarOptions();
      if(typeof window.loadGoogleData==="function"&&window.accessToken&&window.accessToken!=="firebase-auth"){try{window.loadGoogleData();}catch(e){}}
    },0);
  };
  window.openCalendarSettings=function(){
    const o=readOptions();
    openPanel("Kalender-Einstellungen",
      '<div class="section-label">Ansicht</div>'+
      '<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Feiertage anzeigen</div><div class="toggle-sub">Feiertage im Kalender anzeigen</div></div><label class="switch"><input type="checkbox" id="toggle-holidays" '+(o.showHolidays?"checked":"")+"><span class=\"slider\"></span></label></div>"+
      '<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Challenge-Dots</div><div class="toggle-sub">Farbige Punkte für Challenge-Tage</div></div><label class="switch"><input type="checkbox" id="toggle-dots" '+(o.showChallengeDots?"checked":"")+"><span class=\"slider\"></span></label></div>"+
      '<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Wochennummern</div><div class="toggle-sub">KW-Anzeige im Monatskalender</div></div><label class="switch"><input type="checkbox" id="toggle-kw" '+(o.showWeekNumbers?"checked":"")+"><span class=\"slider\"></span></label></div>"
    );
    setTimeout(function(){
      ["toggle-holidays","toggle-dots","toggle-kw"].forEach(id=>{
        const el=document.getElementById(id); if(!el)return;
        el.addEventListener("change",function(){
          saveOptions({showHolidays:!!document.getElementById("toggle-holidays")?.checked,showChallengeDots:!!document.getElementById("toggle-dots")?.checked,showWeekNumbers:!!document.getElementById("toggle-kw")?.checked});
          if(typeof renderCalendar==="function")renderCalendar();
        });
      });
    },50);
  };
  window.changeCalendarViewOptions=readOptions();
  applyCalendarOptions();
  window.addEventListener("load",function(){
    setTimeout(function(){
      applyCalendarOptions();
      if(window.accessToken&&window.accessToken!=="firebase-auth"&&typeof window.loadGoogleData==="function"){try{window.loadGoogleData();}catch(e){}}
      if(typeof renderCalendar==="function")renderCalendar();
    },800);
  });
})();
