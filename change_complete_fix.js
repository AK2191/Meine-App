/* CHANGE COMPLETE FIX
   Einbinden in index.html ganz am Ende, direkt vor </body>:
   <script src="./change-complete-fix.js"></script>
*/
(function(){
  'use strict';

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s||'').trim().toLowerCase();
  const pad=n=>String(n).padStart(2,'0');
  const todayKey=()=>{try{return typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10);}catch(e){return new Date().toISOString().slice(0,10);}};
  const dateKeySafe=d=>{try{return typeof dateKey==='function'?dateKey(d):d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}catch(e){return new Date(d).toISOString().slice(0,10);}};
  const deDate=v=>{if(!v)return'';const d=v instanceof Date?v:new Date(String(v).includes('T')?v:String(v)+'T12:00:00');return isNaN(d)?String(v):d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});};
  const deLongDate=v=>{if(!v)return'';const d=v instanceof Date?v:new Date(String(v).includes('T')?v:String(v)+'T12:00:00');return isNaN(d)?String(v):d.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});};
  const timeOnly=t=>{if(!t)return'';if(/^\d{2}:\d{2}/.test(String(t)))return String(t).slice(0,5);const d=new Date(t);return isNaN(d)?String(t).slice(0,5):d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});};
  const eventTime=ev=>{if(!ev)return'';if(ev.allDay||(!ev.time&&!ev.endTime))return'Ganztägig';const a=timeOnly(ev.time),b=timeOnly(ev.endTime);return a&&b?a+' – '+b:(a||'Ganztägig');};
  function toastX(msg,type){try{if(typeof toast==='function')toast(msg,type||'');}catch(e){}}
  function saveEvents(){window.events=Array.isArray(window.events)?window.events:[];try{if(typeof ls==='function')ls('events',window.events);}catch(e){}try{if(typeof persistChangeState==='function')persistChangeState();}catch(e){}try{if(typeof saveToDrive==='function')saveToDrive();}catch(e){}}
  function refreshViews(){try{renderCalendar&&renderCalendar();}catch(e){}try{renderUpcoming&&renderUpcoming();}catch(e){}try{checkNotifications&&checkNotifications();}catch(e){}try{buildDashboard&&buildDashboard();}catch(e){}}
  function myId(){try{return norm((window.userInfo&&userInfo.email)||'demo@example.com');}catch(e){return'demo@example.com';}}
  function playerKey(p){return norm((p&&p.email)||(p&&p.id)||p||'');}
  function isDemoPlayer(p){return /demo|demo@example\.com/i.test(((p&&p.name)||'')+' '+((p&&p.email)||'')+' '+((p&&p.id)||''));}
  function completionPlayer(c){return norm(c&&(c.playerId||c.email||c.userEmail));}
  function completionsFor(player,date){return(window.challengeCompletions||[]).filter(c=>completionPlayer(c)===norm(player)&&(!date||String(c.date||'')===date));}
  function pointsFor(player,date){return completionsFor(player,date).reduce((a,c)=>a+(parseInt(c.points,10)||0),0);}
  function challengeById(id){return(window.challenges||[]).find(c=>String(c.id)===String(id))||{};}
  function visiblePlayers(){const seen=new Set();return(window.challengePlayers||[]).filter(p=>p&&(p.email||p.id)).filter(p=>window.isDemoMode||!isDemoPlayer(p)).filter(p=>{const k=playerKey(p);if(!k||seen.has(k))return false;seen.add(k);return true;});}

  function injectCss(){
    if($('#change-complete-fix-style'))return;
    const st=document.createElement('style');st.id='change-complete-fix-style';
    st.textContent=`
      .delete-completion,.remove-completion-btn{width:30px;height:30px;border-radius:999px;border:1px solid rgba(220,38,38,.28);background:rgba(220,38,38,.08);color:var(--red);font-weight:900;font-size:17px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
      .delete-completion:hover,.remove-completion-btn:hover{background:rgba(220,38,38,.16)}
      .leader-row .delete-completion,.leader-row .remove-completion-btn,.leader-row button[title*="Entfern"],.leader-row button[title*="Entnehm"]{display:none!important}
      .dash-row-action{font-size:12px;font-weight:800;color:var(--acc);white-space:nowrap;margin-left:8px}
      .event-date-de{font-size:12px;color:var(--t3);margin-top:2px}
      .ag-time{font-variant-numeric:tabular-nums}`;
    document.head.appendChild(st);
  }

  function googleDate(ge){const s=ge&&ge.start;if(!s)return'';if(s.date)return s.date;if(s.dateTime)return dateKeySafe(new Date(s.dateTime));return'';}
  function normalizedGoogle(ge){return{id:'g_'+String(ge.id||''),googleEventId:ge.id||'',title:ge.summary||'(Kein Titel)',date:googleDate(ge),time:ge?.start?.dateTime?timeOnly(ge.start.dateTime):'',endTime:ge?.end?.dateTime?timeOnly(ge.end.dateTime):'',color:'blue',type:'meeting',desc:ge.description||'',allDay:!!(ge.start&&ge.start.date),source:'google',notifDaysBefore:1};}
  window.formatEventDateDE=deDate;window.formatEventTimeDE=eventTime;window.formatEventRangeDE=eventTime;

  window.getAllEvents=function(){
    const out=[];
    try{(Array.isArray(window.events)?window.events:[]).forEach(ev=>{if(ev&&ev.date)out.push(ev);});}catch(e){}
    try{(Array.isArray(window.gEvents)?window.gEvents:[]).forEach(ge=>{const ev=normalizedGoogle(ge);if(ev.date)out.push(ev);});}catch(e){}
    const seen=new Set();return out.filter(ev=>{const key=(ev.googleEventId?'g:'+ev.googleEventId:'l:'+ev.id);if(seen.has(key))return false;seen.add(key);return true;});
  };
  window.getEventById=id=>(window.getAllEvents()||[]).find(e=>String(e.id)===String(id)||String(e.googleEventId)===String(id))||null;

  window.saveEvent=function(existingId){
    const title=$('#ev-title')?.value.trim();const date=$('#ev-date')?.value;
    if(!title){toastX('Bitte einen Titel eingeben','err');return false;}if(!date){toastX('Bitte ein Datum wählen','err');return false;}
    window.events=Array.isArray(window.events)?window.events:[];
    const old=existingId?window.events.find(e=>String(e.id)===String(existingId)||String(e.googleEventId)===String(existingId).replace(/^g_/,'')):null;
    const ev={id:old?.id||(!existingId||String(existingId).startsWith('g_')?'ev_'+Date.now()+'_'+Math.random().toString(36).slice(2,7):String(existingId)),title,date,time:$('#ev-time')?.value||'',endTime:$('#ev-end')?.value||'',type:$('#ev-type')?.value||'meeting',color:$('#ev-color')?.value||'blue',desc:$('#ev-desc')?.value.trim()||'',notifDaysBefore:parseInt($('#ev-notif')?.value||'1',10),allDay:!($('#ev-time')?.value),source:'local',googleEventId:old?.googleEventId||(String(existingId||'').startsWith('g_')?String(existingId).slice(2):''),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const idx=window.events.findIndex(e=>String(e.id)===String(ev.id));if(idx>=0)window.events[idx]=ev;else window.events.push(ev);
    saveEvents();try{closePanel&&closePanel();}catch(e){}refreshViews();toastX(existingId?'Termin aktualisiert ✓':'Termin gespeichert ✓','ok');
    try{if(typeof syncEventToGoogleReliable==='function')syncEventToGoogleReliable(ev);else if(typeof syncLocalEventToGoogle==='function')syncLocalEventToGoogle(ev);}catch(e){}
    return true;
  };
  window.saveToGoogleCal=existingId=>window.saveEvent(existingId);

  window.openEventPanel=function(id,presetDate){
    const ev=id?window.getEventById(id):null;const date=ev?.date||(presetDate?dateKeySafe(presetDate instanceof Date?presetDate:new Date(presetDate)):todayKey());const existingId=ev?ev.id:'';
    const html='<div class="fl-group"><label class="fl-label">Titel</label><input id="ev-title" class="fl-input" value="'+esc(ev?.title||'')+'" placeholder="Termin"></div>'+ 
      '<div class="fl-group"><label class="fl-label">Datum</label><input id="ev-date" class="fl-input" type="date" value="'+esc(date)+'"><div class="event-date-de">'+esc(deLongDate(date))+'</div></div>'+ 
      '<div class="btn-row" style="margin-bottom:14px"><button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById(\'ev-date\').value=\''+todayKey()+'\';document.querySelector(\'.event-date-de\').textContent=\''+esc(deLongDate(todayKey()))+'\'">Heute</button></div>'+ 
      '<div class="btn-row"><div class="fl-group" style="flex:1"><label class="fl-label">Von</label><input id="ev-time" class="fl-input" type="time" value="'+esc(ev?.allDay?'':(ev?.time||''))+'"></div><div class="fl-group" style="flex:1"><label class="fl-label">Bis</label><input id="ev-end" class="fl-input" type="time" value="'+esc(ev?.allDay?'':(ev?.endTime||''))+'"></div></div>'+ 
      '<div class="settings-hint">Ohne Uhrzeit wird der Termin als „Ganztägig“ gespeichert.</div>'+ 
      '<div class="btn-row"><div class="fl-group" style="flex:1"><label class="fl-label">Art</label><select id="ev-type" class="fl-input"><option value="meeting">Termin</option><option value="deadline">Deadline</option><option value="task">Aufgabe</option></select></div><div class="fl-group" style="flex:1"><label class="fl-label">Farbe</label><select id="ev-color" class="fl-input"><option value="blue">Blau</option><option value="green">Grün</option><option value="amber">Gelb</option><option value="red">Rot</option><option value="purple">Lila</option></select></div></div>'+ 
      '<div class="fl-group"><label class="fl-label">Beschreibung</label><textarea id="ev-desc" class="fl-input" rows="4" placeholder="Notiz">'+esc(ev?.desc||'')+'</textarea></div>'+ 
      '<div class="fl-group"><label class="fl-label">Erinnerung Tage vorher</label><input id="ev-notif" class="fl-input" type="number" min="0" max="30" value="'+esc(ev?.notifDaysBefore??1)+'"></div>'+ 
      '<button type="button" class="btn btn-primary btn-full" id="event-save-button">Speichern</button>'+ 
      (ev?'<button type="button" class="btn btn-danger btn-full" style="margin-top:8px" onclick="deleteEvent(\''+esc(existingId)+'\')">Löschen</button>':'');
    if(typeof openPanel==='function')openPanel(ev?'Termin bearbeiten':'Neuer Termin',html);
    setTimeout(()=>{const t=$('#ev-type');if(t)t.value=ev?.type||'meeting';const c=$('#ev-color');if(c)c.value=ev?.color||'blue';const d=$('#ev-date');if(d)d.addEventListener('change',()=>{const x=$('.event-date-de');if(x)x.textContent=deLongDate(d.value);});const b=$('#event-save-button');if(b)b.onclick=()=>window.saveEvent(existingId||null);},0);
  };

  window.openDayPanel=function(dt,dayEvs){
    const date=dt instanceof Date?dt:new Date(dt);const key=dateKeySafe(date);const evs=Array.isArray(dayEvs)?dayEvs:(window.getAllEvents()||[]).filter(e=>e.date===key);
    let html='<div style="font-size:12px;color:var(--t4);margin-bottom:12px;font-weight:700">'+esc(deLongDate(date))+'</div>';
    html+=evs.length?evs.map(ev=>'<div class="ag-card '+esc(ev.color||'blue')+'" style="margin-bottom:8px" onclick="openEventPanel(\''+esc(ev.id)+'\')"><div class="ag-time">'+esc(eventTime(ev))+'</div><div class="ag-body"><div class="ag-title">'+esc(ev.title)+'</div><div class="ag-desc">'+esc(deDate(ev.date))+(ev.desc?' · '+esc(ev.desc):'')+'</div></div></div>').join(''):'<div class="dash-empty">Keine Termine an diesem Tag.</div>';
    html+='<button type="button" class="btn btn-primary btn-full" style="margin-top:10px" onclick="openEventPanel(null,new Date(\''+key+'T12:00:00\'))">+ Neuer Termin für diesen Tag</button>';
    if(typeof openPanel==='function')openPanel(evs.length+' Termine',html);
  };

  window.deleteChallengeCompletion=function(id){
    const c=(window.challengeCompletions||[]).find(x=>String(x.id)===String(id));if(!c){toastX('Eintrag wurde bereits entfernt.','');return;}
    window.challengeCompletions=(window.challengeCompletions||[]).filter(x=>String(x.id)!==String(id));try{if(typeof ls==='function')ls('challenge_completions',window.challengeCompletions);}catch(e){}
    try{const db=window.firebase?.firestore?.();if(db&&id)db.collection('change_completions').doc(id).delete();}catch(e){}
    toastX('Erledigung entfernt. Punkte wurden abgezogen.','ok');refreshViews();try{renderChallenges&&renderChallenges();}catch(e){}window.openContestUserDetails(completionPlayer(c));
  };

  window.openContestUserDetails=function(playerId){
    const id=norm(playerId);const p=visiblePlayers().find(x=>playerKey(x)===id)||{id,name:id,email:id};const today=todayKey();const todays=completionsFor(id,today);const all=completionsFor(id);const total=pointsFor(id);const todayPts=pointsFor(id,today);
    const items=todays.length?todays.map(c=>{const ch=challengeById(c.challengeId);const cid=String(c.id||'').replace(/'/g,'');return '<div class="challenge-item contest-detail-item"><div class="challenge-icon">'+esc(ch.icon||'✅')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title||c.challengeId||'Challenge')+'</div><div class="challenge-meta">'+esc(deDate(c.date||today))+' · '+(parseInt(c.points,10)||0)+' Punkte</div></div><span class="points-pill">+'+(parseInt(c.points,10)||0)+'</span><button type="button" class="delete-completion" title="Erledigung entnehmen" onclick="event.stopPropagation();deleteChallengeCompletion(\''+cid+'\')">×</button></div>';}).join(''):'<div class="dash-empty">Heute wurde noch keine Challenge erledigt.</div>';
    const html='<div class="stat-strip"><div class="stat-box"><div class="stat-num">'+todayPts+'</div><div class="stat-label">Punkte heute</div></div><div class="stat-box"><div class="stat-num">'+total+'</div><div class="stat-label">Punkte gesamt</div></div></div><div class="push-status">Heute erledigt: <strong>'+todays.length+'</strong> · Gesamt erledigt: <strong>'+all.length+'</strong></div><div class="divider"></div><div class="section-label">Heute erledigt</div><div class="contest-done-list">'+items+'</div><div class="settings-hint">Entnehmen ist nur hier in der Erledigt-Anzeige möglich.</div>';
    if(typeof openPanel==='function')openPanel('Kontest · '+esc(p.name||p.email||'Mitspieler'),html);
  };

  window.buildDashCards=function(){
    const grid=$('#dash-grid');if(!grid)return;const now=todayKey();
    const upcoming=(window.getAllEvents?window.getAllEvents():(window.events||[])).filter(e=>e&&e.date).sort((a,b)=>String(a.date+a.time).localeCompare(String(b.date+b.time))).filter(e=>String(e.date)>=now).slice(0,5);
    const calHtml=upcoming.length?upcoming.map(ev=>'<div class="dash-row" onclick="openEventPanel(\''+esc(ev.id)+'\')"><div class="dash-row-icon" style="background:var(--acc-d)">📅</div><div class="dash-row-body"><div class="dash-row-title">'+esc(ev.title)+'</div><div class="dash-row-sub">'+esc(deDate(ev.date))+' · '+esc(eventTime(ev))+'</div></div><span class="dash-row-action">Öffnen →</span></div>').join(''):'<div class="dash-empty">Keine kommenden Termine.</div>';
    const players=visiblePlayers().sort((a,b)=>pointsFor(playerKey(b))-pointsFor(playerKey(a))).slice(0,8);
    const playerHtml=players.length?players.map((p,i)=>{const id=playerKey(p);return '<div class="dash-row" onclick="setMainView(\'challenges\');setTimeout(()=>openContestUserDetails(\''+id.replace(/'/g,'')+'\'),100)"><div class="dash-row-icon" style="background:var(--amb-d)">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1)+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(p.name||p.email||'Mitspieler')+(id===myId()?' · Du':'')+'</div><div class="dash-row-sub">Heute '+pointsFor(id,now)+' P · Gesamt '+pointsFor(id)+' P</div></div><span class="dash-row-badge badge-green">'+pointsFor(id)+' P</span></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler.</div>';
    grid.innerHTML='<div class="dash-card"><div class="dash-card-head"><div><div class="dash-card-title">Kalender</div></div><button type="button" class="btn btn-ghost btn-sm" onclick="setMainView(\'calendar\')">Öffnen →</button></div><div class="dash-card-body">'+calHtml+'</div></div><div class="dash-card challenge-card-dashboard"><div class="dash-card-head"><div><div class="dash-card-title">Challenges</div></div><button type="button" class="btn btn-ghost btn-sm" onclick="setMainView(\'challenges\')">Öffnen →</button></div><div class="dash-card-body">'+playerHtml+'</div></div>';
  };

  function polishDom(){injectCss();$$('.dash-card-title').forEach(el=>{const t=(el.textContent||'').trim();if(/kalender/i.test(t))el.textContent='Kalender';if(/challenge|kontest|sport/i.test(t))el.textContent='Challenges';});$$('button,.btn').forEach(b=>{const t=(b.textContent||'').trim();if(t==='Öffnen'||t==='Anzeigen')b.textContent='Öffnen →';});$$('.leader-row .delete-completion,.leader-row .remove-completion-btn').forEach(b=>b.remove());$$('.ag-card').forEach(card=>{const time=$('.ag-time',card);if(time&&(!time.textContent||time.textContent.trim()===''))time.textContent='Ganztägig';});}
  const oldBuildDashboard=window.buildDashboard;window.buildDashboard=function(){if(typeof oldBuildDashboard==='function'){try{oldBuildDashboard.apply(this,arguments);}catch(e){}}try{if(typeof window.buildKPIs==='function')window.buildKPIs();}catch(e){}window.buildDashCards();setTimeout(polishDom,0);};
  const oldRenderCalendar=window.renderCalendar;window.renderCalendar=function(){if(typeof oldRenderCalendar==='function')oldRenderCalendar.apply(this,arguments);setTimeout(polishDom,0);};
  document.addEventListener('DOMContentLoaded',()=>{injectCss();setTimeout(()=>{try{refreshViews();polishDom();}catch(e){}},500);});
  window.addEventListener('load',()=>{injectCss();setTimeout(()=>{try{refreshViews();polishDom();}catch(e){}},900);});
  if(document.body)new MutationObserver(()=>polishDom()).observe(document.body,{childList:true,subtree:true});
})();
