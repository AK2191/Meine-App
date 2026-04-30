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
    daily.forEach(ch=>{const i=challenges.findIndex(x=>x.id===ch.id); if(i>=0) challenges[i]={...challenges[i],...ch}; else {challenges.push(ch); changed=true;}});
    if(changed){ls('challenges',challenges); if(typeof publishChallengesToFirestore==='function') publishChallengesToFirestore();}
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
    board.innerHTML=players.length?players.map((p,i)=>{const id=pid(p),st=getPlayerPointSummary(id),med=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1),live=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>';return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+id.replace(/'/g,'')+'\')"><div class="leader-rank">'+med+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+(id===me()?' · Du':'')+live+'</div><div class="leader-detail">Heute: '+st.todayPoints+' Punkte · Gesamt: '+st.totalPoints+' Punkte · '+st.totalCount+' erledigt</div></div><div class="leader-score">'+st.totalPoints+'</div></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler. Sobald sich jemand mit Google anmeldet, erscheint er hier automatisch.</div>';
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
  const oldOpenPush=window.openPushSettingsPanel; window.openPushSettingsPanel=function(){ if(typeof oldOpenPush==='function')oldOpenPush(); setTimeout(()=>{const body=document.getElementById('panel-body'); if(!body)return; body.innerHTML=body.innerHTML.replace('Benachrichtigt dich über offene Challenges.','Benachrichtigt dich über offene Challenges und Kalender-Termine.').replace('<button class="btn btn-ghost btn-full" style="margin-top:8px" onclick="testLocalPush()"></button>','<div class="settings-hint">Test: <span class="inline-test-link" onclick="testLocalPush()"></span></div>');},0); };
  function minsUntil(ev){if(!ev||!ev.date)return 999999; const t=new Date(ev.date+'T'+(ev.time||'09:00')+':00'); return Math.round((t-Date.now())/60000);}
  function startCalendarPushLoop(){if(window._changeCalendarPushLoop)return; window._changeCalendarPushLoop=setInterval(()=>{try{if(!('Notification'in window)||Notification.permission!=='granted'||ls('push_enabled')===false)return; (typeof getAllEvents==='function'?getAllEvents():(events||[])).forEach(ev=>{const m=minsUntil(ev),key='calpush_'+ev.id+'_'+ev.date+'_'+(ev.time||'all'); if(m>=0&&m<=10&&!ls(key)){ls(key,true); new Notification('Change Kalender',{body:(ev.time?ev.time+' · ':'')+(ev.title||'Termin steht an'),icon:'./icon-192.png',badge:'./icon-192.png'});}});}catch(e){}},60000);}
  const oldBoot=window.bootMainApp; window.bootMainApp=function(){oldBoot.apply(this,arguments); setTimeout(()=>{sanitize(); ensureDailyAutoChallenges(); startCalendarPushLoop(); if(currentMainView==='dashboard')buildDashboard();},300);};
  setTimeout(()=>{try{sanitize(); ensureDailyAutoChallenges(); startCalendarPushLoop(); if(typeof buildDashboard==='function'&&document.getElementById('main-app').style.display==='flex')buildDashboard();}catch(e){}},1500);
})();
