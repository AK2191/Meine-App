(function(){
  'use strict';
  const todayKey=()=> (typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10));
  const escHtml=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  const norm=x=>String(x||'').toLowerCase().trim();
  const myId=()=>norm((window.userInfo&&userInfo.email)||'demo@example.com');
  const yt=q=>'https://www.youtube.com/results?search_query='+encodeURIComponent(q);
  const defaultSports=[
    ['sport_squats_12','12 Kniebeugen',8,'🏋️','12 saubere Kniebeugen in ruhigem Tempo. Leicht bis mittel.','Kniebeuge richtig ausführen Anfänger'],
    ['sport_wall_sit_30','30 Sekunden Wandsitz',8,'🦵','Rücken an die Wand, Knie ungefähr 90°. 30 Sekunden halten.','Wandsitz richtig ausführen'],
    ['sport_plank_25','25 Sekunden Plank',9,'💪','Unterarmstütz mit stabilem Rumpf. 25 Sekunden halten.','Plank Unterarmstütz richtig ausführen'],
    ['sport_lunges_10','10 Ausfallschritte',10,'🚶','Je Seite 5 kontrollierte Ausfallschritte.','Ausfallschritte richtig ausführen Anfänger'],
    ['sport_calf_20','20 Wadenheben',7,'🦶','Langsam hochdrücken und kontrolliert absenken.','Wadenheben richtig ausführen'],
    ['sport_pushups_6','6 leichte Liegestütze',10,'💪','Normal oder auf Knien. Saubere Bewegung zählt.','Liegestütze richtig ausführen Anfänger'],
    ['sport_jumping_20','20 Hampelmänner',8,'🤸','Locker aufwärmen, 20 Wiederholungen.','Hampelmänner richtig ausführen'],
    ['sport_glute_12','12 Glute Bridges',8,'🧘','Rückenlage, Hüfte kontrolliert anheben und senken.','Glute Bridge richtig ausführen'],
    ['sport_fitness_30','30 Minuten Fitness gehen',40,'🏋️‍♀️','Gehe 30 Minuten ins Fitnessstudio','30 Minuten Fitnessstudio Ganzkörper Workout Anfänger']
  ].map(a=>({id:a[0],title:a[1],points:a[2],icon:a[3],desc:a[4],url:yt(a[5]),type:'Sport',active:true,recurrence:'daily'}));
  function ensureSports(){
    window.challenges=Array.isArray(window.challenges)?window.challenges:[];
    defaultSports.forEach(sp=>{const i=challenges.findIndex(c=>c.id===sp.id); if(i>=0)challenges[i]={...challenges[i],...sp,active:true}; else challenges.push({...sp,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});});
    try{ls('challenges',challenges)}catch(e){}
  }
  function isDone(id,player=myId(),date=todayKey()){return (challengeCompletions||[]).some(c=>String(c.challengeId)===String(id)&&norm(c.playerId||c.email||c.userEmail)===norm(player)&&String(c.date)===date);}
  function activeToday(){const t=todayKey();return (challenges||[]).filter(c=>c&&c.active!==false&&(!c.date||c.date===t||c.recurrence==='daily'));}
  function pointsByDay(player=myId(),year=(new Date()).getFullYear(),month=(new Date()).getMonth()){
    const out={};(challengeCompletions||[]).forEach(c=>{if(norm(c.playerId||c.email||c.userEmail)!==norm(player)||!c.date)return;const d=new Date(String(c.date)+'T12:00:00');if(d.getFullYear()!==year||d.getMonth()!==month)return;out[c.date]=(out[c.date]||0)+(parseInt(c.points)||0);});return out;
  }
  window.renderChallengeMiniCalendar=function(){
    const host=document.getElementById('challenge-mini-calendar'); if(!host)return;
    const now=new Date(),y=now.getFullYear(),m=now.getMonth(),map=pointsByDay(myId(),y,m),first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();
    let html='<div class="mini-cal-head"><span>'+DE_MONTHS[m]+' '+y+'</span><small>Punkte pro Tag</small></div><div class="mini-cal-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div class="mini-cal-grid">';
    for(let i=0;i<start;i++)html+='<div class="mini-cal-cell muted"></div>';
    for(let d=1;d<=days;d++){const key=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'),pts=map[key]||0;html+='<div class="mini-cal-cell '+(key===todayKey()?'today':'')+' '+(pts?'has-points':'')+'"><b>'+d+'</b>'+(pts?'<small>'+pts+' P</small>':'')+'</div>';}
    host.innerHTML=html+'</div>';
  };
  window.ensureDailyAutoChallenges=function(day=todayKey()){
    ensureSports(); if(typeof ls==='function'&&ls('auto_challenges_enabled')===false)return [];
    const seed=Math.abs(String(day).split('').reduce((a,c)=>a+c.charCodeAt(0),0));
    const daily=[0,1,2].map(i=>defaultSports[(seed+i*2)%defaultSports.length]).map((b,i)=>({...b,id:'auto_'+day+'_sport_'+i,date:day,recurrence:'once',auto:true,active:true,createdAt:day+'T00:00:00.000Z'}));
    let changed=false; window.challenges=(challenges||[]).filter(c=>!c.auto||String(c.id||'').startsWith('auto_'+day+'_sport_'));
    daily.forEach(ch=>{const idx=challenges.findIndex(x=>x.id===ch.id); if(idx>=0)challenges[idx]={...challenges[idx],...ch}; else{challenges.push(ch);changed=true;}});
    if(changed){try{ls('challenges',challenges); if(typeof publishChallengesToFirestore==='function')publishChallengesToFirestore();}catch(e){}}
    return daily;
  };
  window.renderChallenges=function(){
    ensureDailyAutoChallenges(); const list=document.getElementById('challenges-list'),board=document.getElementById('leaderboard-list'); if(!list||!board)return;
    list.innerHTML=activeToday().map(ch=>{const done=isDone(ch.id);return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+escHtml(ch.icon||'🏃')+'</div><div class="challenge-body"><div class="challenge-name">'+escHtml(ch.title||'Sportübung')+'</div><div class="challenge-meta">'+escHtml(ch.desc||'')+' · '+(parseInt(ch.points)||0)+' Punkte</div>'+(ch.url?'<a class="exercise-link" href="'+escHtml(ch.url)+'" target="_blank" rel="noopener noreferrer">Anleitung auf YouTube öffnen</a>':'<span class="exercise-link disabled">Keine Anleitung hinterlegt</span>')+'</div><span class="points-pill">+'+(parseInt(ch.points)||0)+'</span><button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+String(ch.id).replace(/'/g,'')+'\')">'+(done?'Erledigt':'Erledigen')+'</button>'+(String(ch.id).startsWith('custom_')?'<button class="btn btn-ghost btn-sm" onclick="openChallengePanel(\''+String(ch.id).replace(/'/g,'')+'\')">Bearbeiten</button>':'')+'</div>';}).join('')||'<div class="empty-state"><div class="empty-title">Keine Sportübungen</div><div class="empty-sub">Lege eine eigene Challenge an.</div></div>';
    const t=todayKey(),summary=id=>{const out={today:0,total:0,count:0};(challengeCompletions||[]).forEach(c=>{if(norm(c.playerId||c.email||c.userEmail)!==norm(id))return;const pts=parseInt(c.points)||0;out.total+=pts;out.count++;if(c.date===t)out.today+=pts;});return out;};
    const players=(challengePlayers||[]).filter(p=>window.isDemoMode||!/demo|demo@example\.com/i.test(((p&&p.name)||'')+' '+((p&&p.email)||'')+' '+((p&&p.id)||''))).filter(p=>p&&(p.email||p.id));
    players.sort((a,b)=>summary(b.email||b.id).total-summary(a.email||a.id).total);
    board.innerHTML=players.map((p,i)=>{const id=norm(p.email||p.id),s=summary(id),med=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1),live=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>';return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+id.replace(/'/g,'')+'\')"><div class="leader-rank">'+med+'</div><div><div class="leader-name">'+escHtml(p.name||p.email||'Mitspieler')+(id===myId()?' · Du':'')+live+'</div><div class="leader-detail">Heute: '+s.today+' Punkte · Gesamt: '+s.total+' Punkte · '+s.count+' erledigt</div></div><div class="leader-score">'+s.total+'</div></div>';}).join('')||'<div class="dash-empty">Noch keine Mitspieler.</div>';
    renderChallengeMiniCalendar();
  };
  window.openChallengePanel=function(id){
    const ch=id?(challenges||[]).find(c=>c.id===id):null;
    const html='<div class="fg"><label class="flabel">Sport-Challenge *</label><input class="finput" id="ch-title" value="'+escHtml(ch?.title||'')+'" placeholder="z.B. 15 Minuten Spaziergang"></div><div class="fr"><div class="fg"><label class="flabel">Punkte</label><input type="number" class="finput" id="ch-points" min="1" value="'+(ch?.points||10)+'"></div><div class="fg"><label class="flabel">Icon</label><input class="finput" id="ch-icon" value="'+escHtml(ch?.icon||'🏃')+'" placeholder="🏃"></div></div><div class="fr"><div class="fg"><label class="flabel">Challenge-Tag</label><input type="date" class="finput" id="ch-date" value="'+escHtml(ch?.date||todayKey())+'"></div><div class="fg"><label class="flabel">Wiederholung</label><select class="finput" id="ch-recurrence"><option value="once" '+((ch?.recurrence||'once')==='once'?'selected':'')+'>Einmalig</option><option value="daily" '+(ch?.recurrence==='daily'?'selected':'')+'>Täglich</option></select></div></div><div class="fg"><label class="flabel">YouTube-Anleitung / Link</label><input class="finput" id="ch-url" value="'+escHtml(ch?.url||'')+'" placeholder="https://www.youtube.com/results?search_query=..."><div class="settings-hint">Ohne Eingabe wird automatisch eine YouTube-Suche zur Übung gespeichert.</div></div><div class="fg"><label class="flabel">Beschreibung</label><textarea class="finput" id="ch-desc" rows="4" placeholder="Was soll gemacht werden?">'+escHtml(ch?.desc||'')+'</textarea></div><div class="fa"><button class="btn btn-primary" style="flex:1" onclick="saveChallenge(\''+(ch?.id||'')+'\')">'+(ch?'Aktualisieren':'Challenge speichern')+'</button>'+(ch&&String(ch.id).startsWith('custom_')?'<button class="btn btn-danger" onclick="deleteChallenge(\''+ch.id+'\')">Löschen</button>':'')+'</div>';
    openPanel(ch?'Challenge bearbeiten':'Eigene Sport-Challenge hinzufügen',html);
  };
  window.saveChallenge=function(existingId){
    const title=document.getElementById('ch-title')?.value.trim(); if(!title){toast('Bitte einen Titel eingeben.','err');return;}
    const old=existingId?(challenges||[]).find(c=>c.id===existingId):null,rawUrl=document.getElementById('ch-url')?.value.trim();
    const ch={id:existingId||'custom_'+(typeof uid==='function'?uid():Date.now()),title,points:parseInt(document.getElementById('ch-points')?.value)||10,icon:document.getElementById('ch-icon')?.value.trim()||'🏃',desc:document.getElementById('ch-desc')?.value.trim()||'Eigene Sportübung',url:rawUrl||yt(title+' Übung richtig ausführen'),date:document.getElementById('ch-date')?.value||todayKey(),recurrence:document.getElementById('ch-recurrence')?.value||'once',type:'Sport',custom:true,active:true,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const idx=(challenges||[]).findIndex(c=>c.id===ch.id); if(idx>=0)challenges[idx]=ch; else challenges.push(ch);
    try{ls('challenges',challenges); if(typeof publishChallengesToFirestore==='function')publishChallengesToFirestore();}catch(e){}
    closePanel(); renderChallenges(); if(typeof buildDashboard==='function')buildDashboard(); if(typeof renderCalendar==='function')renderCalendar(); toast('Eigene Challenge gespeichert ✓','ok');
  };
  window.deleteChallenge=function(id){
    if(!String(id).startsWith('custom_')){toast('Vordefinierte Sportübungen können nicht gelöscht werden.','err');return;}
    if(!confirm('Eigene Challenge wirklich löschen?'))return;
    window.challenges=(challenges||[]).filter(c=>c.id!==id); window.challengeCompletions=(challengeCompletions||[]).filter(c=>c.challengeId!==id);
    try{ls('challenges',challenges);ls('challenge_completions',challengeCompletions); if(typeof publishChallengesToFirestore==='function')publishChallengesToFirestore();}catch(e){}
    closePanel(); renderChallenges(); if(typeof buildDashboard==='function')buildDashboard(); toast('Eigene Challenge gelöscht.','ok');
  };
  const oldBoot=window.bootMainApp;
  window.bootMainApp=function(){if(typeof oldBoot==='function')oldBoot.apply(this,arguments);setTimeout(()=>{try{ensureSports();const view=document.getElementById('challenges-view'),layout=view&&view.querySelector('.challenge-layout');if(layout&&!document.getElementById('challenge-mini-calendar')){const card=document.createElement('div');card.className='leader-card challenge-mini-card';card.innerHTML='<div class="leader-card-head"><div><div class="challenge-title">Punkte-Kalender</div><div class="challenge-sub">Nur für Challenges, unabhängig vom normalen Kalender</div></div></div><div id="challenge-mini-calendar"></div>';layout.appendChild(card);}const header=view&&view.querySelector('.list-header');if(header){const b=header.querySelector('button');if(b)b.textContent='Eigene hinzufügen';}if(currentMainView==='challenges')renderChallenges();}catch(e){console.warn('Challenge patch:',e);}},250);};
  setTimeout(()=>{try{ensureSports(); if(typeof renderChallenges==='function')renderChallenges();}catch(e){}},1000);
})();
