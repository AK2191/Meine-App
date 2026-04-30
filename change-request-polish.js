(function(){
  'use strict';
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const norm=s=>String(s||'').toLowerCase().trim();
  const todayKey=()=> typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10);
  const dkOf=d=> typeof dateKey==='function'?dateKey(d):d.toISOString().slice(0,10);
  const addDays=(d,n)=>{const x=new Date(d); x.setDate(x.getDate()+n); return x;};
  const weekStart=d=>{const x=new Date(d); x.setHours(12,0,0,0); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); return x;};
  const myId=()=>norm((window.userInfo&&userInfo.email)||'demo@example.com');
  let selectedChallengeDate=todayKey();
  let weekOffset=0;

  function getDb(){ try{ return window.firebase && firebase.firestore ? firebase.firestore() : null; }catch(e){ return null; } }
  function challengeById(id){ return (window.challenges||[]).find(c=>String(c.id)===String(id)); }
  function isDemoPlayer(p){ return /demo|demo@example\.com/i.test(((p&&p.name)||'')+' '+((p&&p.email)||'')+' '+((p&&p.id)||'')); }
  function playerKey(p){ return norm((p&&p.email)|| (p&&p.id) || p || ''); }
  function completionPlayer(c){ return norm(c.playerId||c.email||c.userEmail||''); }
  function completionDate(c){ return String(c.date||''); }
  function completionsFor(player,date){ return (window.challengeCompletions||[]).filter(c=>completionPlayer(c)===norm(player) && (!date || completionDate(c)===date)); }
  function pointsFor(player,date){ return completionsFor(player,date).reduce((a,c)=>a+(parseInt(c.points)||0),0); }
  function doneOn(chId,date=selectedChallengeDate,player=myId()){ return (window.challengeCompletions||[]).some(c=>String(c.challengeId)===String(chId)&&completionPlayer(c)===norm(player)&&completionDate(c)===date); }
  function sportList(){
    return (window.challenges||[]).filter(c=>c && c.active!==false && !c.custom && !String(c.id||'').startsWith('custom_') && (c.type==='Sport'||/^sport_/.test(c.id||'')||/^auto_.*_sport_/.test(c.id||'')));
  }
  function getVisiblePlayers(){
    const seen=new Set();
    return (window.challengePlayers||[]).filter(p=>p&&(p.email||p.id)).filter(p=>window.isDemoMode||!isDemoPlayer(p)).filter(p=>{const k=playerKey(p); if(!k||seen.has(k))return false; seen.add(k); return true;});
  }
  function monthLabel(days){
    const names=window.DE_MONTHS||['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    const short=window.DE_MONTHS_S||['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    const first=days[0], last=days[6];
    if(first.getFullYear()!==last.getFullYear()) return short[first.getMonth()]+' '+first.getFullYear()+' / '+short[last.getMonth()]+' '+last.getFullYear();
    if(first.getMonth()!==last.getMonth()) return short[first.getMonth()]+' / '+short[last.getMonth()]+' '+first.getFullYear();
    return names[first.getMonth()]+' '+first.getFullYear();
  }
  function ensureChallengeShell(){
    const view=qs('#challenges-view'); if(!view)return;
    const layout=qs('.challenge-layout',view); if(!layout)return;
    let card=qs('#challenge-week-points-card');
    if(!card){
      card=document.createElement('div');
      card.id='challenge-week-points-card';
      card.className='challenge-week-card';
      card.innerHTML='<div class="challenge-week-head"><div><div class="challenge-week-title">Punkte-Kalender</div><div class="challenge-week-sub">Aktuelle Woche · tippe einen Tag an</div></div><div class="challenge-week-actions"><button class="btn btn-ghost btn-sm" id="challenge-week-prev">← Letzte Woche</button><button class="btn btn-secondary btn-sm" id="challenge-week-today">Heute</button><button class="btn btn-ghost btn-sm" id="challenge-week-next">Nächste Woche →</button></div></div><div id="challenge-week-points-grid" class="challenge-week-grid"></div>';
      view.insertBefore(card,layout);
      qs('#challenge-week-prev',card).onclick=()=>{weekOffset=Math.max(-1,weekOffset-1); renderChallengeMiniCalendar();};
      qs('#challenge-week-today',card).onclick=()=>{weekOffset=0; selectedChallengeDate=todayKey(); renderChallenges();};
      qs('#challenge-week-next',card).onclick=()=>{weekOffset=Math.min(1,weekOffset+1); renderChallengeMiniCalendar();};
    }
    qsa('.challenge-mini-card',view).forEach(el=>el.remove());
    const header=qs('.list-header',view);
    const addBtn=header&&header.querySelector('.btn-primary'); if(addBtn) addBtn.remove();
  }
  window.selectChallengeDay=function(key){ selectedChallengeDate=key; renderChallenges(); };
  window.renderChallengeMiniCalendar=function(){
    ensureChallengeShell();
    const grid=qs('#challenge-week-points-grid'); if(!grid)return;
    const start=weekStart(addDays(new Date(),weekOffset*7));
    const days=Array.from({length:7},(_,i)=>addDays(start,i));
    const title=qs('#challenge-week-points-card .challenge-week-title');
    const sub=qs('#challenge-week-points-card .challenge-week-sub');
    if(title) title.textContent='Punkte-Kalender · '+monthLabel(days);
    if(sub) sub.textContent=(weekOffset===0?'Aktuelle Woche':weekOffset<0?'Letzte Woche':'Nächste Woche')+' · tippe einen Tag an';
    const wd=['Mo','Di','Mi','Do','Fr','Sa','So'];
    grid.innerHTML=days.map((d,i)=>{const key=dkOf(d); const pts=pointsFor(myId(),key); return '<button class="challenge-week-day '+(key===todayKey()?'is-today ':'')+(key===selectedChallengeDate?'is-selected ':'')+(pts?'has-points':'empty')+'" onclick="selectChallengeDay(\''+key+'\')"><span><span class="challenge-week-day-name">'+wd[i]+'</span><span class="challenge-week-day-date">'+String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.</span></span><strong class="challenge-week-day-points">'+pts+' P</strong></button>';}).join('');
  };
  function selectedLabel(){ const d=new Date(selectedChallengeDate+'T12:00:00'); return (window.DE_DAYS_F?.[d.getDay()]||'Tag')+', '+(typeof fmtDate==='function'?fmtDate(selectedChallengeDate):selectedChallengeDate); }
  window.renderChallenges=function(){
    if(typeof ensureDailyAutoChallenges==='function') ensureDailyAutoChallenges(todayKey());
    ensureChallengeShell();
    const list=qs('#challenges-list'), board=qs('#leaderboard-list'); if(!list||!board)return;
    const isToday=selectedChallengeDate===todayKey();
    const active=sportList().filter(c=>!c.date || c.date===selectedChallengeDate || c.recurrence==='daily' || (isToday && /^sport_/.test(String(c.id||''))));
    const doneIds=new Set(completionsFor(myId(),selectedChallengeDate).map(c=>String(c.challengeId)));
    const intro='<div class="challenge-day-info"><strong>'+esc(selectedLabel())+'</strong><span>'+pointsFor(myId(),selectedChallengeDate)+' Punkte erreicht</span></div>';
    list.innerHTML=intro+(active.length?active.map(ch=>{
      const done=doneIds.has(String(ch.id));
      const url=ch.url||('https://www.youtube.com/results?search_query='+encodeURIComponent((ch.title||'Sportübung')+' richtig ausführen'));
      const btn=isToday?'<button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+String(ch.id).replace(/'/g,'')+'\')">'+(done?'✓ Erledigt':'Erledigen')+'</button>':'<span class="status-pill '+(done?'status-on':'status-off')+'">'+(done?'ERLEDIGT':'OFFEN')+'</span>';
      return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc(ch.icon||'🏃')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title||'Sportübung')+(done?' <span class="done-inline">✓ erledigt</span>':'')+'</div><div class="challenge-meta">'+esc(ch.desc||'')+' · '+(parseInt(ch.points)||0)+' Punkte</div><a class="exercise-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Anleitung auf YouTube öffnen</a></div><span class="points-pill">+'+(parseInt(ch.points)||0)+'</span>'+btn+'</div>';
    }).join(''):'<div class="empty-state"><div class="empty-title">Keine Sportübungen</div><div class="empty-sub">Für diesen Tag gibt es keine geplanten Übungen.</div></div>');
    const players=getVisiblePlayers().sort((a,b)=>pointsFor(playerKey(b))-pointsFor(playerKey(a)));
    board.innerHTML=players.length?players.map((p,i)=>{const id=playerKey(p), today=pointsFor(id,todayKey()), total=pointsFor(id), count=completionsFor(id).length, med=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1), live=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>'; return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+id.replace(/'/g,'')+'\')"><div class="leader-rank">'+med+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+(id===myId()?' · Du':'')+live+'</div><div class="leader-detail">Heute: '+today+' Punkte · Gesamt: '+total+' Punkte · '+count+' erledigt</div></div><div class="leader-score">'+total+'</div></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler.</div>';
    renderChallengeMiniCalendar();
  };
  async function publishDeleteCompletion(id){
    try{ const db=getDb(); if(db&&id) await db.collection('change_completions').doc(id).delete(); }catch(e){ console.warn('Completion löschen:',e); }
  }
  window.deleteChallengeCompletion=function(id){
    const c=(window.challengeCompletions||[]).find(x=>String(x.id)===String(id));
    if(!c){ if(typeof toast==='function')toast('Eintrag wurde bereits entfernt.',''); return; }
    window.challengeCompletions=(window.challengeCompletions||[]).filter(x=>String(x.id)!==String(id));
    try{ls('challenge_completions',window.challengeCompletions);}catch(e){}
    publishDeleteCompletion(id);
    if(typeof toast==='function') toast('Erledigung entfernt. Die Punkte wurden abgezogen.','ok');
    if(window.currentMainView==='challenges') renderChallenges();
    if(window.currentMainView==='dashboard'&&typeof buildDashboard==='function') buildDashboard();
    openContestUserDetails(completionPlayer(c));
  };
  window.openContestUserDetails=function(playerId){
    const id=norm(playerId); const p=getVisiblePlayers().find(x=>playerKey(x)===id)||{id,name:id,email:id};
    const today=completionsFor(id,todayKey()); const all=completionsFor(id); const total=pointsFor(id); const todayPts=pointsFor(id,todayKey());
    const items=today.length?today.map(c=>{const ch=challengeById(c.challengeId)||{}; return '<div class="challenge-item contest-detail-item"><div class="challenge-icon">'+esc(ch.icon||'✅')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title||c.challengeId||'Sportübung')+'</div><div class="challenge-meta">Heute erledigt · '+(parseInt(c.points)||0)+' Punkte</div>'+(ch.url?'<a class="exercise-link" href="'+esc(ch.url)+'" target="_blank" rel="noopener noreferrer">Anleitung öffnen</a>':'')+'</div><span class="points-pill">+'+(parseInt(c.points)||0)+'</span><button class="delete-completion" title="Erledigung entfernen" onclick="deleteChallengeCompletion(\''+String(c.id||'').replace(/'/g,'')+'\')">×</button></div>';}).join(''):'<div class="dash-empty">Heute wurde noch keine Challenge erledigt.</div>';
    const html='<div class="stat-strip"><div class="stat-box"><div class="stat-num">'+todayPts+'</div><div class="stat-label">Punkte heute</div></div><div class="stat-box"><div class="stat-num">'+total+'</div><div class="stat-label">Punkte gesamt</div></div></div><div class="push-status">Heute erledigt: <strong>'+today.length+'</strong> · Gesamt erledigt: <strong>'+all.length+'</strong></div><div class="divider"></div><div class="section-label">Heute erledigt</div><div class="contest-done-list">'+items+'</div><div class="settings-hint">Mit dem roten × entfernst du eine Erledigung und ziehst die Punkte wieder ab.</div>';
    if(typeof openPanel==='function') openPanel('Kontest · '+esc(p.name||p.email||'Mitspieler'),html);
  };
  window.openPushSettingsPanel=function(){
    const supported=('Notification' in window);
    const perm=supported?Notification.permission:'nicht unterstützt';
    const token=(()=>{try{return ls('fcm_token')}catch(e){return ''}})();
    const pushEnabled=!!token && (()=>{try{return ls('push_enabled')!==false}catch(e){return true}})() && perm==='granted';
    const liveEnabled=(()=>{try{return ls('live_sync_enabled')!==false}catch(e){return true}})();
    const online=liveEnabled?(window.challengePlayers||[]).filter(p=>p.online&&!isDemoPlayer(p)).length:0;
    const autoEnabled=(()=>{try{return ls('auto_challenges_enabled')!==false}catch(e){return true}})();
    const denied=perm==='denied';
    const help=denied?'<div class="help-steps"><strong>Benachrichtigungen sind blockiert.</strong><ol><li>Öffne die Website-Einstellungen deines Browsers.</li><li>Stelle Benachrichtigungen auf „Erlauben“.</li><li>Lade Change neu und aktiviere den Regler erneut.</li></ol></div>':'';
    const html=help+'<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Echte Push-Benachrichtigungen <span class="status-pill '+(pushEnabled?'status-on':'status-off')+'">'+(pushEnabled?'AKTIV':'INAKTIV')+'</span></div><div class="toggle-sub">Aktiviere den Regler, um Push einzurichten oder zu erneuern. Gilt für Challenges und Kalender-Erinnerungen.</div><button class="inline-text-btn" onclick="testLocalPush()">Test-Benachrichtigung anzeigen</button></div><label class="switch"><input type="checkbox" '+(pushEnabled?'checked':'')+' onchange="setPushNotificationsEnabled(this.checked)"><span class="slider"></span></label></div><div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Live-Mitspieler <span class="status-pill '+(liveEnabled?'status-on':'status-off')+'">'+(liveEnabled?'VERBUNDEN':'DEAKTIVIERT')+'</span></div><div class="toggle-sub">Wenn aktiv, werden Mitspieler und Punkte automatisch synchronisiert. Aktuell online: '+online+'</div></div><label class="switch"><input type="checkbox" '+(liveEnabled?'checked':'')+' onchange="setLiveSyncEnabled(this.checked)"><span class="slider"></span></label></div><div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Tägliche Auto-Challenges <span class="status-pill '+(autoEnabled?'status-on':'status-off')+'">'+(autoEnabled?'AKTIV':'INAKTIV')+'</span></div><div class="toggle-sub">Erzeugt täglich kleine Sportübungen.</div></div><label class="switch"><input type="checkbox" '+(autoEnabled?'checked':'')+' onchange="setAutoChallengesEnabled(this.checked)"><span class="slider"></span></label></div><button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="installChangeApp()">Change als App installieren</button><div class="settings-hint">Android: Chrome empfohlen. iPhone/iPad: Push funktioniert nur als Home-Bildschirm-App.</div>';
    if(typeof openPanel==='function') openPanel('Push & Live-Sync',html);
  };
  const oldSetPush=window.setPushNotificationsEnabled;
  window.setPushNotificationsEnabled=function(enabled){
    if(enabled){ if(typeof enablePushNotifications==='function') return enablePushNotifications(); }
    else if(typeof disablePushNotifications==='function') return disablePushNotifications();
    if(oldSetPush) return oldSetPush(enabled);
  };
  const oldSetLive=window.setLiveSyncEnabled;
  window.setLiveSyncEnabled=async function(enabled){
    try{ if(typeof ls==='function') ls('live_sync_enabled',!!enabled); }catch(e){}
    if(enabled && typeof initFirebaseLive==='function') { await initFirebaseLive(); if(typeof toast==='function') toast('Live-Mitspieler verbunden ✓','ok'); }
    else if(oldSetLive) await oldSetLive(false);
    else if(typeof toast==='function') toast('Live-Mitspieler deaktiviert','ok');
    openPushSettingsPanel();
  };
  const oldComplete=window.completeChallenge;
  window.completeChallenge=function(id){
    const before=(window.challengeCompletions||[]).length;
    const result=oldComplete?oldComplete.apply(this,arguments):undefined;
    setTimeout(()=>{ selectedChallengeDate=todayKey(); if(window.currentMainView==='challenges') renderChallenges(); if((window.challengeCompletions||[]).length>before && typeof toast==='function') toast('Challenge erledigt ✓ Punkte wurden gutgeschrieben.','ok');},80);
    return result;
  };
  const oldRenderCalendar=window.renderCalendar;
  window.renderCalendar=function(){ const r=oldRenderCalendar?oldRenderCalendar.apply(this,arguments):undefined; qsa('#month-grid .challenge-day-dot, .workday-card > .challenge-day-dot, .year-mini-day .challenge-day-dot').forEach(el=>el.remove()); return r; };
  setTimeout(()=>{ try{ qsa('#month-grid .challenge-day-dot, .workday-card > .challenge-day-dot, .year-mini-day .challenge-day-dot').forEach(el=>el.remove()); if(window.currentMainView==='challenges') renderChallenges(); }catch(e){} },400);
})();
