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
    // Remove older full month mini calendar cards if present
    dqsa('.challenge-mini-card',view).forEach(el=>el.remove());
    const old=dqs('#challenge-mini-calendar'); if(old && !old.closest('#challenge-week-points-card')) old.remove();
  }
  window.renderChallengeMiniCalendar=function(){
    ensureChallengeShell();
    const grid=dqs('#challenge-week-points-grid'); if(!grid)return;
    const base=addDays2(new Date(),challengeWeekOffset*7);
    const start=weekStart(base);
    const days=Array.from({length:7},(_,i)=>addDays2(start,i));
    const title=dqs('#challenge-week-points-card .challenge-week-title');
    const sub=dqs('#challenge-week-points-card .challenge-week-sub');
    if(title) title.textContent='Punkte-Kalender · '+monthRangeLabel(days);
    if(sub) sub.textContent=(challengeWeekOffset===0?'Aktuelle Woche':challengeWeekOffset<0?'Letzte Woche':'Nächste Woche')+' · nur Challenge-Punkte';
    const weekday=['Mo','Di','Mi','Do','Fr','Sa','So'];
    grid.innerHTML=days.map((d,i)=>{const key=todayKey2.call? (typeof dateKey==='function'?dateKey(d):d.toISOString().slice(0,10)) : d.toISOString().slice(0,10); const pts=pointsForDate(key); return '<div class="challenge-week-day '+(key===todayKey2()?'is-today ':'')+(pts?'has-points':'empty')+'"><div><div class="challenge-week-day-name">'+weekday[i]+'</div><div class="challenge-week-day-date">'+String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.</div></div><div class="challenge-week-day-points">'+(pts?pts+' P':'0 P')+'</div></div>';}).join('');
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
    if(typeof openPanel==='function') openPanel('Challenges','<div class="push-box"><div class="challenge-title">Eigene Challenges sind deaktiviert</div><div class="push-status">Aktuell gibt es ausschließlich vorgegebene leichte bis mittelschwere Sportübungen. Dadurch bleibt der Kontest für alle vergleichbar.</div></div>');
    else if(typeof toast==='function') toast('Eigene Challenges sind deaktiviert.','');
  };
  const oldFab=window.fabAction;
  window.fabAction=function(){
    if(window.currentMainView==='challenges') return window.openChallengePanel();
    return typeof oldFab==='function'?oldFab.apply(this,arguments):undefined;
  };
  window.renderChallenges=function(){
    if(typeof ensureDailyAutoChallenges==='function') ensureDailyAutoChallenges();
    ensureChallengeShell();
    const list=dqs('#challenges-list'), board=dqs('#leaderboard-list'); if(!list||!board)return;
    const active=sportOnlyList();
    list.innerHTML=active.length?active.map(ch=>{const done=doneToday(ch.id); const url=ch.url||('https://www.youtube.com/results?search_query='+encodeURIComponent((ch.title||'Sportübung')+' richtig ausführen')); return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc2(ch.icon||'🏃')+'</div><div class="challenge-body"><div class="challenge-name">'+esc2(ch.title||'Sportübung')+'</div><div class="challenge-meta">'+esc2(ch.desc||'')+' · '+(parseInt(ch.points)||0)+' Punkte</div><a class="exercise-link" href="'+esc2(url)+'" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Anleitung auf YouTube öffnen</a></div><span class="points-pill">+'+(parseInt(ch.points)||0)+'</span><button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+String(ch.id).replace(/'/g,'')+'\')">'+(done?'Erledigt':'Erledigen')+'</button></div>';}).join(''):'<div class="empty-state"><div class="empty-title">Keine Sportübungen</div><div class="empty-sub">Aktiviere tägliche Auto-Challenges, damit Übungen angezeigt werden.</div></div>';
    const players=(window.challengePlayers||[]).filter(p=>p&&(p.email||p.id)).filter(p=>window.isDemoMode||!/demo|demo@example\.com/i.test(((p.name||'')+' '+(p.email||'')+' '+(p.id||''))));
    players.sort((a,b)=>playerStats(b.email||b.id).total-playerStats(a.email||a.id).total);
    board.innerHTML=players.length?players.map((p,i)=>{const id=norm(p.email||p.id),s=playerStats(id),med=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1),live=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>';return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+id.replace(/'/g,'')+'\')"><div class="leader-rank">'+med+'</div><div><div class="leader-name">'+esc2(p.name||p.email||'Mitspieler')+(id===myId2()?' · Du':'')+live+'</div><div class="leader-detail">Heute: '+s.today+' Punkte · Gesamt: '+s.total+' Punkte · '+s.count+' erledigt</div></div><div class="leader-score">'+s.total+'</div></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler.</div>';
    renderChallengeMiniCalendar();
  };
  function showOnlyView(v){
    ensureChallengeShell();
    const views=[['dashboard','#dashboard-view'],['calendar','#cal-body'],['challenges','#challenges-view']];
    views.forEach(([name,sel])=>{const el=dqs(sel); if(!el)return; el.classList.add('app-view'); if(name===v){el.style.display=name==='calendar'||name==='challenges'?'flex':'flex'; el.classList.remove('route-hidden'); el.classList.add('route-visible','route-fade-in'); setTimeout(()=>el.classList.remove('route-fade-in'),260);}else{el.classList.remove('route-visible','route-fade-in'); el.classList.add('route-hidden'); el.style.display='none';}});
    const cc=dqs('#cal-controls'); if(cc)cc.style.display=v==='calendar'?'flex':'none';
    dqsa('.h-tab').forEach(t=>t.classList.remove('active')); dqs('#htab-'+v)?.classList.add('active');
    dqsa('.bnav-item').forEach(t=>t.classList.remove('active')); dqs('#bnav-'+v)?.classList.add('active');
    const fab=dqs('#fab'); if(fab)fab.classList.toggle('challenge-disabled',v==='challenges');
  }
  window.setMainView=function(v,fromRoute){
    if(!['dashboard','calendar','challenges'].includes(v))v='dashboard';
    window.currentMainView=v; showOnlyView(v);
    if(v==='dashboard'&&typeof buildDashboard==='function') buildDashboard();
    if(v==='calendar'&&typeof renderCalendar==='function') renderCalendar();
    if(v==='challenges') renderChallenges();
    if(!fromRoute){try{history.pushState({view:v},'', '#/'+v);}catch(e){location.hash='/'+v;}}
  };
  window.addEventListener('popstate',e=>{const v=(e.state&&e.state.view)||(location.hash.replace('#/','')||'dashboard'); window.setMainView(v,true);});
  window.addEventListener('hashchange',()=>{const v=location.hash.replace('#/','')||'dashboard'; if(v!==window.currentMainView) window.setMainView(v,true);});
  const oldBoot=window.bootMainApp;
  window.bootMainApp=function(){ if(typeof oldBoot==='function') oldBoot.apply(this,arguments); setTimeout(()=>{ensureChallengeShell(); const route=location.hash.replace('#/','')||window.currentMainView||'dashboard'; window.setMainView(route,true);},150); };
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{ensureChallengeShell(); if(window.currentMainView==='challenges') renderChallenges();},800));
})();
