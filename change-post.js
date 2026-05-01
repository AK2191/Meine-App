/* ═══════════════════════════════════════════════════════════
   CHANGE · change-post.js
   Wird NACH dem Inline-Code in index.html geladen.
   Enthält (in Reihenfolge):
     1. change-critical-fixes.js
     2. change-google-calendar-final-fix.js
     3. change-complete-fix.js
     4. change-master-fix.js  ← ersetzt saveevent/calendar/undo fix
   
   NICHT mehr benötigt (gelöscht werden):
     change-saveevent-fix.js
     change-calendar-fix.js
     change-challenge-undo-fix.js
     change-final-override-v7.js
═══════════════════════════════════════════════════════════ */

/* ── 1. change-critical-fixes.js ───────────────────────── */
(function(){
  'use strict';
  function pad2(n){return String(n).padStart(2,'0');}
  function dk(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
  function esc2(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);const y=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil((((t-y)/86400000)+1)/7);}
  function monthStartMonday(y,m){const first=new Date(y,m,1);const day=(first.getDay()+6)%7;return addDays(first,-day);}

  function injectCriticalCss(){
    let st=document.getElementById('change-critical-fixes-style');
    if(!st){st=document.createElement('style');st.id='change-critical-fixes-style';document.head.appendChild(st);}
    st.textContent=`
      #month-grid .week-row{position:relative;overflow:visible;}
      #month-grid .kw-badge,#month-grid .kw-badge-left{position:absolute!important;left:4px!important;bottom:5px!important;top:auto!important;right:auto!important;z-index:5;font-size:9px;line-height:1;font-family:var(--mono);font-weight:700;color:#b8bec6;background:rgba(255,255,255,.82);border-radius:6px;padding:2px 4px;pointer-events:none;}
      #month-grid .day-cell{min-height:118px;padding:9px 8px 20px 10px;}
      #month-grid .ev-chip{margin-top:4px;max-width:calc(100% - 4px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .leader-row.clickable{cursor:pointer;}
      .leader-row.clickable:hover{background:var(--s2);}
      .challenge-history-list{display:flex;flex-direction:column;gap:8px;margin-top:10px;max-height:50vh;overflow:auto;}
      .challenge-history-item{display:flex;align-items:center;gap:10px;border:1px solid var(--b1);border-radius:12px;padding:10px;background:var(--s1);}
      .challenge-history-date{font-size:11px;color:var(--t4);font-family:var(--mono);white-space:nowrap;}
    `;
  }

  function addLeftWeekNumbers(){
    try{
      const grid=document.getElementById('month-grid');
      if(!grid||!grid.querySelector('.week-row'))return;
      document.querySelectorAll('#month-grid .kw-badge,#month-grid .kw-badge-left').forEach(x=>x.remove());
      const opts=window.changeCalendarViewOptions||{};
      if(opts.showWeekNumbers===false)return;
      const y=window.curDate instanceof Date?window.curDate.getFullYear():(new Date()).getFullYear();
      const m=window.curDate instanceof Date?window.curDate.getMonth():(new Date()).getMonth();
      const start=monthStartMonday(y,m);
      Array.from(grid.querySelectorAll('.week-row')).forEach((row,w)=>{
        const monday=addDays(start,w*7);
        const badge=document.createElement('div');
        badge.className='kw-badge-left';
        badge.textContent='KW '+isoWeek(monday);
        row.appendChild(badge);
      });
    }catch(e){console.warn('KW-Fix:',e);}
  }

  function refreshGoogleSoon(){
    if(typeof window.loadGoogleEvents==='function'&&window.accessToken&&!window.isDemoMode){
      setTimeout(()=>window.loadGoogleEvents(),60);
    }
  }

  function patchCalendarNavigation(){
    const oldRender=window.renderCalendar;
    if(typeof oldRender==='function'&&!oldRender.__criticalFixed){
      const fixed=function(){const res=oldRender.apply(this,arguments);injectCriticalCss();setTimeout(addLeftWeekNumbers,0);return res;};
      fixed.__criticalFixed=true;window.renderCalendar=fixed;
    }
    ['navigate','goToday','setCalView'].forEach(name=>{
      const old=window[name];
      if(typeof old==='function'&&!old.__criticalFixed){
        const fixed=function(){const res=old.apply(this,arguments);refreshGoogleSoon();injectCriticalCss();setTimeout(addLeftWeekNumbers,80);return res;};
        fixed.__criticalFixed=true;window[name]=fixed;
      }
    });
  }

  window.getPlayerPointSummary=function(playerId){
    const id=String(playerId||'').toLowerCase();const today=dk(new Date());
    const out={totalPoints:0,totalCount:0,todayPoints:0,todayCount:0,todayItems:[],allItems:[]};
    (window.challengeCompletions||[]).forEach(c=>{
      const cid=String(c.playerId||c.email||c.userEmail||'').toLowerCase();
      if(cid!==id)return;
      const ch=(window.challenges||[]).find(x=>String(x.id)===String(c.challengeId))||{};
      const pts=parseInt(c.points)||0;
      const item={title:ch.title||c.challengeTitle||c.challengeId||'Challenge',icon:ch.icon||'✅',points:pts,date:c.date||'',url:ch.url||''};
      out.totalPoints+=pts;out.totalCount+=1;out.allItems.push(item);
      if(c.date===today){out.todayPoints+=pts;out.todayCount+=1;out.todayItems.push(item);}
    });
    out.allItems.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return out;
  };

  window.openContestUserDetails=function(playerId){
    const id=String(playerId||'').toLowerCase();
    const p=(window.challengePlayers||[]).find(x=>String(x.email||x.id||'').toLowerCase()===id)||{id,name:id,email:id};
    const sum=window.getPlayerPointSummary(id);
    const all=sum.allItems.length?sum.allItems.slice(0,80).map(it=>
      '<div class="challenge-history-item"><div class="challenge-icon">'+esc2(it.icon)+'</div><div class="challenge-body"><div class="challenge-name">'+esc2(it.title)+'</div><div class="challenge-meta">Erledigt am '+esc2(it.date||'unbekannt')+(it.url?' · <a href="'+esc2(it.url)+'" target="_blank" rel="noopener">Übung ansehen</a>':'')+'</div></div><div class="challenge-history-date">+'+it.points+' P</div></div>'
    ).join(''):'<div class="dash-empty">Noch keine erledigten Challenges.</div>';
    window.openPanel&&openPanel('Kontest · '+esc2(p.name||p.email||'Mitspieler'),
      '<div class="stat-strip"><div class="stat-box"><div class="stat-num">'+sum.todayPoints+'</div><div class="stat-label">Punkte heute</div></div><div class="stat-box"><div class="stat-num">'+sum.totalPoints+'</div><div class="stat-label">Punkte gesamt</div></div></div>'+
      '<div class="push-status">Heute erledigt: <strong>'+sum.todayCount+'</strong> · Insgesamt: <strong>'+sum.totalCount+'</strong></div>'+
      '<div class="divider"></div><div class="section-label">Erledigte Challenges</div><div class="challenge-history-list">'+all+'</div>'
    );
  };

  function init(){
    injectCriticalCss();
    patchCalendarNavigation();
    refreshGoogleSoon();
    setTimeout(()=>{try{if(typeof window.renderCalendar==='function')window.renderCalendar();if(typeof window.renderChallenges==='function')window.renderChallenges();}catch(e){}},500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,200));
  else setTimeout(init,200);
  window.addEventListener('load',()=>setTimeout(init,900));
})();

/* ── 2. change-google-calendar-final-fix.js ────────────── */
(function(){
  'use strict';
  const pad=n=>String(n).padStart(2,'0');
  function dk(d){try{return typeof dateKey==='function'?dateKey(d):d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}catch(e){return new Date(d).toISOString().slice(0,10);}}
  function escX(s){try{return typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}catch(e){return String(s??'');}}
  function toastX(msg,type){try{if(typeof toast==='function')toast(msg,type||'');}catch(e){}}
  function hasCalendarToken(){try{return !!accessToken&&accessToken!=='firebase-auth'&&!isDemoMode;}catch(e){return false;}}
  function googleDate(ge){const s=ge&&ge.start;if(!s)return '';if(s.date)return s.date;if(s.dateTime){try{return dk(new Date(s.dateTime));}catch(e){return String(s.dateTime).slice(0,10);}}return '';}
  function googleTime(ge){const dt=ge&&ge.start&&ge.start.dateTime;if(!dt)return '';try{return new Date(dt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});}catch(e){return String(dt).slice(11,16);}}
  function normalizedGoogle(ge){const date=googleDate(ge);return {id:'g_'+String(ge.id||''),googleEventId:ge.id||'',title:ge.summary||'(Kein Titel)',date,time:googleTime(ge),endTime:ge.end&&ge.end.dateTime?googleTime({start:{dateTime:ge.end.dateTime}}):'',color:'blue',type:'meeting',desc:ge.description||'',allDay:!!(ge.start&&ge.start.date),source:'google',notifDaysBefore:1};}

  window.getAllEvents=function(){
    const out=[];
    try{(Array.isArray(events)?events:[]).forEach(ev=>{if(ev&&ev.date)out.push(ev);});}catch(e){}
    try{(Array.isArray(gEvents)?gEvents:[]).forEach(ge=>{const ev=normalizedGoogle(ge);if(ev.date)out.push(ev);});}catch(e){}
    const seen=new Set();
    return out.filter(ev=>{const key=(ev.googleEventId?'g:'+ev.googleEventId:'l:'+ev.id);if(seen.has(key))return false;seen.add(key);return true;});
  };
  window.getEventById=function(id){const all=window.getAllEvents();return all.find(e=>e.id===id)||all.find(e=>e.googleEventId===id)||null;};

  window.loadGoogleEvents=async function(){
    if(!hasCalendarToken()){
      if((function(){try{return accessToken==='firebase-auth';}catch(e){return false;}})())toastX('Google Kalenderzugriff fehlt. Bitte abmelden und mit Google anmelden.','err');
      return [];
    }
    try{
      const center=(typeof curDate!=='undefined'&&curDate)?curDate:new Date();
      const start=new Date(center.getFullYear(),center.getMonth()-2,1,0,0,0).toISOString();
      const end=new Date(center.getFullYear(),center.getMonth()+14,0,23,59,59).toISOString();
      const url='https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+encodeURIComponent(start)+'&timeMax='+encodeURIComponent(end)+'&singleEvents=true&orderBy=startTime&maxResults=2500';
      const r=await fetch(url,{headers:{Authorization:'Bearer '+accessToken}});
      if(r.status===401){try{lsDel('access_token');}catch(e){}accessToken='';toastX('Google-Anmeldung abgelaufen. Bitte neu anmelden.','err');return [];}
      if(!r.ok){const txt=await r.text().catch(()=>String(r.status));console.warn('Google Calendar load:',r.status,txt);toastX('Google-Termine konnten nicht geladen werden ('+r.status+').','err');return [];}
      const data=await r.json();
      gEvents=data.items||[];
      try{window.gEvents=gEvents;}catch(e){}
      try{if(currentMainView==='calendar'){renderCalendar();renderUpcoming&&renderUpcoming();}}catch(e){}
      try{if(currentMainView==='dashboard'&&typeof buildDashboard==='function')buildDashboard();}catch(e){}
      return gEvents;
    }catch(e){console.warn('Google Calendar load failed:',e);toastX('Google-Termine konnten nicht geladen werden.','err');return [];}
  };

  window.loadGoogleData=async function(){await window.loadGoogleEvents();try{if(typeof initFirebaseLive==='function')initFirebaseLive();}catch(e){}};

  function addOneHour(time){if(!time)return '10:00';const parts=time.split(':').map(Number);const d=new Date(2000,0,1,parts[0]||9,parts[1]||0);d.setHours(d.getHours()+1);return pad(d.getHours())+':'+pad(d.getMinutes());}
  function nextDay(date){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+1);return dk(d);}
  function buildGoogleBody(ev){
    const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Berlin';
    const body={summary:ev.title||'Termin',description:ev.desc||''};
    if(ev.time){const end=ev.endTime||addOneHour(ev.time);body.start={dateTime:ev.date+'T'+ev.time+':00',timeZone:tz};body.end={dateTime:ev.date+'T'+end+':00',timeZone:tz};}
    else{body.start={date:ev.date};body.end={date:nextDay(ev.date)};}
    return body;
  }

  async function syncToGoogle(ev){
    if(!hasCalendarToken())return false;
    try{
      const url=ev.googleEventId?'https://www.googleapis.com/calendar/v3/calendars/primary/events/'+encodeURIComponent(ev.googleEventId):'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      const r=await fetch(url,{method:ev.googleEventId?'PATCH':'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(buildGoogleBody(ev))});
      if(r.status===401){try{lsDel('access_token');}catch(e){}accessToken='';toastX('Google-Anmeldung abgelaufen.','err');return false;}
      if(!r.ok){const txt=await r.text().catch(()=>String(r.status));console.warn('Google sync failed:',r.status,txt);toastX('Termin lokal gespeichert, Google-Sync fehlgeschlagen ('+r.status+').','err');return false;}
      const saved=await r.json();
      const list=Array.isArray(events)?events:[];const i=list.findIndex(x=>x.id===ev.id);
      if(i>=0){list[i].googleEventId=saved.id;list[i].googleSyncedAt=new Date().toISOString();try{ls('events',list);}catch(e){}}
      await window.loadGoogleEvents();
      toastX('Termin gespeichert und mit Google synchronisiert ✓','ok');
      return true;
    }catch(e){console.warn('Google sync exception:',e);toastX('Termin lokal gespeichert, Google-Sync fehlgeschlagen.','err');return false;}
  }
  window.syncEventToGoogleReliable=syncToGoogle;
  window.syncLocalEventToGoogle=syncToGoogle;

  function hideUnwantedControls(){
    const ww=document.getElementById('vbtn-workweek');if(ww)ww.style.display='none';
    const td=document.getElementById('vbtn-today');if(td)td.style.display='none';
    const cssId='change-calendar-control-final-style';
    if(!document.getElementById(cssId)){const st=document.createElement('style');st.id=cssId;st.textContent='#vbtn-workweek,#vbtn-today{display:none!important}.today-view-challenges,.challenge-today-in-calendar{display:none!important}.h-today-btn{display:inline-flex!important}';document.head.appendChild(st);}
  }

  const oldSetCalView=window.setCalView;
  window.setCalView=function(v){if(v==='workweek'||v==='today')v='month';currentCalView=v;['year','month'].forEach(x=>document.getElementById('vbtn-'+x)?.classList.toggle('active',x===v));try{if(typeof renderCalendar==='function')renderCalendar();}catch(e){if(oldSetCalView)oldSetCalView(v);}};
  window.goToday=function(){curDate=new Date();currentCalView='month';try{renderCalendar();}catch(e){}try{window.loadGoogleEvents();}catch(e){}};

  const prevNavigate=window.navigate;
  window.navigate=function(dir){if(currentCalView==='workweek'||currentCalView==='today')currentCalView='month';if(typeof prevNavigate==='function')prevNavigate(dir);else{curDate=new Date(curDate.getFullYear(),curDate.getMonth()+dir,1);renderCalendar();}try{window.loadGoogleEvents();}catch(e){}};

  const prevRender=window.renderCalendar;
  window.renderCalendar=function(){
    hideUnwantedControls();
    if(currentCalView==='workweek'||currentCalView==='today')currentCalView='month';
    if(typeof prevRender==='function')prevRender.apply(this,arguments);
    try{['year','month'].forEach(x=>document.getElementById('vbtn-'+x)?.classList.toggle('active',currentCalView===x));}catch(e){}
  };

  window.addEventListener('load',function(){hideUnwantedControls();try{if(hasCalendarToken())setTimeout(window.loadGoogleEvents,350);}catch(e){}});
  setTimeout(hideUnwantedControls,500);
})();

/* ── 3. change-complete-fix.js ─────────────────────────── */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const escC=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s||'').trim().toLowerCase();
  const pad=n=>String(n).padStart(2,'0');
  const todayKey=()=>{try{return typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10);}catch(e){return new Date().toISOString().slice(0,10);}};
  const dateKeySafe=d=>{try{return typeof dateKey==='function'?dateKey(d):d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}catch(e){return new Date(d).toISOString().slice(0,10);}};
  const deDate=v=>{if(!v)return '';const d=v instanceof Date?v:new Date(String(v).includes('T')?v:String(v)+'T12:00:00');return isNaN(d)?String(v):d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});};
  const deLongDate=v=>{if(!v)return '';const d=v instanceof Date?v:new Date(String(v).includes('T')?v:String(v)+'T12:00:00');return isNaN(d)?String(v):d.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});};
  const timeOnly=t=>{if(!t)return '';if(/^\d{2}:\d{2}/.test(String(t)))return String(t).slice(0,5);const d=new Date(t);return isNaN(d)?String(t).slice(0,5):d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});};
  const eventTime=ev=>{if(!ev)return '';if(ev.allDay||(!ev.time&&!ev.endTime))return 'Ganztägig';const a=timeOnly(ev.time),b=timeOnly(ev.endTime);return a&&b?a+' – '+b:(a||'Ganztägig');};
  function toastX(msg,type){try{if(typeof toast==='function')toast(msg,type||'');}catch(e){}}
  function saveEvents(){window.events=Array.isArray(window.events)?window.events:[];try{if(typeof ls==='function')ls('events',window.events);}catch(e){}try{if(typeof persistChangeState==='function')persistChangeState();}catch(e){}try{if(typeof saveToDrive==='function')saveToDrive();}catch(e){}}
  function refreshViews(){try{renderCalendar&&renderCalendar();}catch(e){}try{renderUpcoming&&renderUpcoming();}catch(e){}try{checkNotifications&&checkNotifications();}catch(e){}try{buildDashboard&&buildDashboard();}catch(e){}}
  function myId(){try{return norm((window.userInfo&&userInfo.email)||'demo@example.com');}catch(e){return 'demo@example.com';}}
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
    st.textContent='.leader-row .delete-completion,.leader-row .remove-completion-btn,.leader-row button[title*="Entfern"],.leader-row button[title*="Entnehm"]{display:none!important}.event-date-de{font-size:12px;color:var(--t3);margin-top:2px}';
    document.head.appendChild(st);
  }

  function googleDate(ge){const s=ge&&ge.start;if(!s)return '';if(s.date)return s.date;if(s.dateTime)return dateKeySafe(new Date(s.dateTime));return '';}
  function normalizedGoogle(ge){return {id:'g_'+String(ge.id||''),googleEventId:ge.id||'',title:ge.summary||'(Kein Titel)',date:googleDate(ge),time:ge?.start?.dateTime?timeOnly(ge.start.dateTime):'',endTime:ge?.end?.dateTime?timeOnly(ge.end.dateTime):'',color:'blue',type:'meeting',desc:ge.description||'',allDay:!!(ge.start&&ge.start.date),source:'google',notifDaysBefore:1};}

  window.getAllEvents=function(){
    const out=[];
    try{(Array.isArray(window.events)?window.events:[]).forEach(ev=>{if(ev&&ev.date)out.push(ev);});}catch(e){}
    try{(Array.isArray(window.gEvents)?window.gEvents:[]).forEach(ge=>{const ev=normalizedGoogle(ge);if(ev.date)out.push(ev);});}catch(e){}
    const seen=new Set();return out.filter(ev=>{const key=(ev.googleEventId?'g:'+ev.googleEventId:'l:'+ev.id);if(seen.has(key))return false;seen.add(key);return true;});
  };
  window.getEventById=id=>(window.getAllEvents()||[]).find(e=>String(e.id)===String(id)||String(e.googleEventId)===String(id))||null;

  window.openEventPanel=function(id,presetDate){
    const ev=id?window.getEventById(id):null;const date=ev?.date||(presetDate?dateKeySafe(presetDate instanceof Date?presetDate:new Date(presetDate)):todayKey());const existingId=ev?ev.id:'';
    const html='<div class="fl-group"><label class="fl-label">Titel</label><input id="ev-title" class="fl-input" value="'+escC(ev?.title||'')+'" placeholder="Termin"></div>'+
      '<div class="fl-group"><label class="fl-label">Datum</label><input id="ev-date" class="fl-input" type="date" value="'+escC(date)+'"><div class="event-date-de">'+escC(deLongDate(date))+'</div></div>'+
      '<div class="btn-row" style="margin-bottom:14px"><button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById(\'ev-date\').value=\''+todayKey()+'\';document.querySelector(\'.event-date-de\').textContent=\''+escC(deLongDate(todayKey()))+'\'">Heute</button></div>'+
      '<div class="btn-row"><div class="fl-group" style="flex:1"><label class="fl-label">Von</label><input id="ev-time" class="fl-input" type="time" value="'+escC(ev?.allDay?'':(ev?.time||''))+'"></div><div class="fl-group" style="flex:1"><label class="fl-label">Bis</label><input id="ev-end" class="fl-input" type="time" value="'+escC(ev?.allDay?'':(ev?.endTime||''))+'"></div></div>'+
      '<div class="settings-hint">Ohne Uhrzeit wird der Termin als „Ganztägig" gespeichert.</div>'+
      '<div class="btn-row"><div class="fl-group" style="flex:1"><label class="fl-label">Art</label><select id="ev-type" class="fl-input"><option value="meeting">Termin</option><option value="deadline">Deadline</option><option value="task">Aufgabe</option></select></div><div class="fl-group" style="flex:1"><label class="fl-label">Farbe</label><select id="ev-color" class="fl-input"><option value="blue">Blau</option><option value="green">Grün</option><option value="amber">Gelb</option><option value="red">Rot</option><option value="purple">Lila</option></select></div></div>'+
      '<div class="fl-group"><label class="fl-label">Beschreibung</label><textarea id="ev-desc" class="fl-input" rows="4" placeholder="Notiz">'+escC(ev?.desc||'')+'</textarea></div>'+
      '<div class="fl-group"><label class="fl-label">Erinnerung Tage vorher</label><input id="ev-notif" class="fl-input" type="number" min="0" max="30" value="'+escC(ev?.notifDaysBefore??1)+'"></div>'+
      '<button type="button" class="btn btn-primary btn-full" id="event-save-button">Speichern</button>'+
      (ev?'<button type="button" class="btn btn-danger btn-full" style="margin-top:8px" onclick="deleteEvent(\''+escC(existingId)+'\')">Löschen</button>':'');
    if(typeof openPanel==='function')openPanel(ev?'Termin bearbeiten':'Neuer Termin',html);
    setTimeout(()=>{
      const t=$('#ev-type');if(t)t.value=ev?.type||'meeting';
      const c=$('#ev-color');if(c)c.value=ev?.color||'blue';
      const d=$('#ev-date');if(d)d.addEventListener('change',()=>{const x=$('.event-date-de');if(x)x.textContent=deLongDate(d.value);});
      const b=$('#event-save-button');
      if(b){
        const fresh=b.cloneNode(true);
        b.parentNode.replaceChild(fresh,b);
        fresh.addEventListener('click',()=>window.saveEvent(existingId||null),{once:true});
      }
    },0);
  };

  window.openDayPanel=function(dt,dayEvs){
    const date=dt instanceof Date?dt:new Date(dt);const key=dateKeySafe(date);const evs=Array.isArray(dayEvs)?dayEvs:(window.getAllEvents()||[]).filter(e=>e.date===key);
    let html='<div style="font-size:12px;color:var(--t4);margin-bottom:12px;font-weight:700">'+escC(deLongDate(date))+'</div>';
    html+=evs.length?evs.map(ev=>'<div class="ag-card '+escC(ev.color||'blue')+'" style="margin-bottom:8px" onclick="openEventPanel(\''+escC(ev.id)+'\')"><div class="ag-time">'+escC(eventTime(ev))+'</div><div class="ag-body"><div class="ag-title">'+escC(ev.title)+'</div><div class="ag-desc">'+escC(deDate(ev.date))+(ev.desc?' · '+escC(ev.desc):'')+'</div></div></div>').join(''):'<div class="dash-empty">Keine Termine an diesem Tag.</div>';
    html+='<button type="button" class="btn btn-primary btn-full" style="margin-top:10px" onclick="openEventPanel(null,new Date(\''+key+'T12:00:00\'))">+ Neuer Termin für diesen Tag</button>';
    if(typeof openPanel==='function')openPanel(evs.length+' Termine',html);
  };

  window.openContestUserDetails=function(playerId){
    const id=norm(playerId);const p=visiblePlayers().find(x=>playerKey(x)===id)||{id,name:id,email:id};const today=todayKey();const todays=completionsFor(id,today);const all=completionsFor(id);const total=pointsFor(id);const todayPts=pointsFor(id,today);
    const items=todays.length?todays.map(c=>{const ch=challengeById(c.challengeId);const cid=String(c.id||'').replace(/'/g,'');return '<div class="challenge-item contest-detail-item"><div class="challenge-icon">'+escC(ch.icon||'✅')+'</div><div class="challenge-body"><div class="challenge-name">'+escC(ch.title||c.challengeId||'Challenge')+'</div><div class="challenge-meta">'+escC(deDate(c.date||today))+' · '+(parseInt(c.points,10)||0)+' Punkte</div></div><span class="points-pill">+'+(parseInt(c.points,10)||0)+'</span></div>';}).join(''):'<div class="dash-empty">Heute noch keine Challenge erledigt.</div>';
    const html='<div class="stat-strip"><div class="stat-box"><div class="stat-num">'+todayPts+'</div><div class="stat-label">Punkte heute</div></div><div class="stat-box"><div class="stat-num">'+total+'</div><div class="stat-label">Punkte gesamt</div></div></div><div class="push-status">Heute erledigt: <strong>'+todays.length+'</strong> · Gesamt: <strong>'+all.length+'</strong></div><div class="divider"></div><div class="section-label">Heute erledigt</div><div class="contest-done-list">'+items+'</div>';
    if(typeof openPanel==='function')openPanel('Kontest · '+escC(p.name||p.email||'Mitspieler'),html);
  };

  window.buildDashCards=function(){
    const grid=$('#dash-grid');if(!grid)return;const now=todayKey();
    const upcoming=(window.getAllEvents?window.getAllEvents():(window.events||[])).filter(e=>e&&e.date).sort((a,b)=>String(a.date+a.time).localeCompare(String(b.date+b.time))).filter(e=>String(e.date)>=now).slice(0,5);
    const calHtml=upcoming.length?upcoming.map(ev=>'<div class="dash-row" onclick="openEventPanel(\''+escC(ev.id)+'\')"><div class="dash-row-icon" style="background:var(--acc-d)">📅</div><div class="dash-row-body"><div class="dash-row-title">'+escC(ev.title)+'</div><div class="dash-row-sub">'+escC(deDate(ev.date))+' · '+escC(eventTime(ev))+'</div></div><span class="dash-row-action">Öffnen →</span></div>').join(''):'<div class="dash-empty">Keine kommenden Termine.</div>';
    const players=visiblePlayers().sort((a,b)=>pointsFor(playerKey(b))-pointsFor(playerKey(a))).slice(0,8);
    const playerHtml=players.length?players.map((p,i)=>{const id=playerKey(p);return '<div class="dash-row" onclick="setMainView(\'challenges\');setTimeout(()=>openContestUserDetails(\''+id.replace(/'/g,'')+'\'),100)"><div class="dash-row-icon" style="background:var(--amb-d)">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1)+'</div><div class="dash-row-body"><div class="dash-row-title">'+escC(p.name||p.email||'Mitspieler')+(id===myId()?' · Du':'')+'</div><div class="dash-row-sub">Heute '+pointsFor(id,now)+' P · Gesamt '+pointsFor(id)+' P</div></div><span class="dash-row-badge badge-green">'+pointsFor(id)+' P</span></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler.</div>';
    grid.innerHTML='<div class="dash-card"><div class="dash-card-head"><div><div class="dash-card-title">Kalender</div></div><button type="button" class="btn btn-ghost btn-sm" onclick="setMainView(\'calendar\')">Öffnen →</button></div><div class="dash-card-body">'+calHtml+'</div></div><div class="dash-card challenge-card-dashboard"><div class="dash-card-head"><div><div class="dash-card-title">Challenges</div></div><button type="button" class="btn btn-ghost btn-sm" onclick="setMainView(\'challenges\')">Öffnen →</button></div><div class="dash-card-body">'+playerHtml+'</div></div>';
  };

  function polishDom(){injectCss();$$('.leader-row .delete-completion,.leader-row .remove-completion-btn').forEach(b=>b.remove());$$('.ag-card').forEach(card=>{const time=$('.ag-time',card);if(time&&(!time.textContent||time.textContent.trim()===''))time.textContent='Ganztägig';});}
  const oldBuildDashboard=window.buildDashboard;
  window.buildDashboard=function(){if(typeof oldBuildDashboard==='function'){try{oldBuildDashboard.apply(this,arguments);}catch(e){}}try{if(typeof window.buildKPIs==='function')window.buildKPIs();}catch(e){}window.buildDashCards();setTimeout(polishDom,0);};
  const oldRenderCalendarC=window.renderCalendar;
  window.renderCalendar=function(){if(typeof oldRenderCalendarC==='function')oldRenderCalendarC.apply(this,arguments);setTimeout(polishDom,0);};
  document.addEventListener('DOMContentLoaded',()=>{injectCss();setTimeout(()=>{try{refreshViews();polishDom();}catch(e){}},500);});
  window.addEventListener('load',()=>{injectCss();setTimeout(()=>{try{refreshViews();polishDom();}catch(e){}},900);});
  if(document.body)new MutationObserver(()=>polishDom()).observe(document.body,{childList:true,subtree:true});
})();

/* ── 4. change-master-fix.js ───────────────────────────── */
(function () {
  'use strict';

  function esc(s) { return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function uid() { return Math.random().toString(36).slice(2,9)+Date.now().toString(36); }
  function today() { try{return typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10);}catch(e){return new Date().toISOString().slice(0,10);} }

  function readDate(id) {
    const el=document.getElementById(id); if(!el) return '';
    const raw=el.value.trim(); if(!raw) return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const m=raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    try{const d=new Date(raw);if(!isNaN(d.getTime()))return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}catch(e){}
    return '';
  }

  function val(id) { const el=document.getElementById(id); return el?el.value.trim():''; }

  function persist() {
    try{if(typeof ls==='function')ls('events',window.events||[]);}catch(e){}
    try{['change_v1_events','change_v2_events'].forEach(k=>localStorage.setItem(k,JSON.stringify(window.events||[])));}catch(e){}
    try{if(typeof persistChangeState==='function')persistChangeState();}catch(e){}
    try{if(typeof saveToDrive==='function')saveToDrive();}catch(e){}
  }

  function refreshCalendar() {
    try{if(typeof renderCalendar==='function')renderCalendar();}catch(e){}
    try{if(typeof renderUpcoming==='function')renderUpcoming();}catch(e){}
    try{if(typeof checkNotifications==='function')checkNotifications();}catch(e){}
    try{if(typeof buildDashboard==='function')buildDashboard();}catch(e){}
  }

  /* ── SAVEEVENT: Panel schließt zuverlässig ── */
  window.saveEvent = function (existingId) {
    const title=val('ev-title');
    const date=readDate('ev-date');
    if(!title){try{toast('Bitte einen Titel eingeben','err');}catch(e){}return;}
    if(!date){try{toast('Bitte ein Datum wählen','err');}catch(e){}return;}

    window.events=Array.isArray(window.events)?window.events:[];
    const oldIndex=existingId?window.events.findIndex(e=>e.id===existingId||e.googleEventId===existingId):-1;
    const old=oldIndex>=0?window.events[oldIndex]:null;

    const ev={
      id:old?old.id:('ev_'+uid()), title, date,
      time:val('ev-time'), endTime:val('ev-end'),
      type:val('ev-type')||'meeting', color:val('ev-color')||'blue',
      desc:val('ev-desc'),
      notifDaysBefore:parseInt(val('ev-notif')||'1',10)||1,
      allDay:!val('ev-time'), source:'local',
      googleEventId:old?(old.googleEventId||''):'',
      createdAt:old?(old.createdAt||new Date().toISOString()):new Date().toISOString(),
      updatedAt:new Date().toISOString(),
    };

    if(oldIndex>=0) window.events[oldIndex]=ev;
    else            window.events.push(ev);
    persist();

    // Panel sofort schließen — kein setTimeout, kein Loop
    try{if(typeof closePanel==='function')closePanel();}catch(e){}

    refreshCalendar();
    try{if(typeof toast==='function')toast(existingId?'Termin aktualisiert ✓':'Termin gespeichert ✓','ok');}catch(e){}

    if(window.accessToken&&window.accessToken!=='firebase-auth'&&!window.isDemoMode){
      setTimeout(()=>{try{if(typeof syncEventToGoogleReliable==='function')syncEventToGoogleReliable(ev);else if(typeof syncLocalEventToGoogle==='function')syncLocalEventToGoogle(ev);}catch(e){}},300);
    }
    return ev;
  };

  window.saveToGoogleCal=existingId=>window.saveEvent(existingId);

  window.deleteEvent=function(id){
    if(!confirm('Termin wirklich löschen?'))return;
    window.events=(window.events||[]).filter(e=>e.id!==id);
    persist();
    try{closePanel();}catch(e){}
    refreshCalendar();
    try{toast('Termin gelöscht','');}catch(e){}
  };

  /* Speichern-Button korrekt verdrahten (einmal, ohne Doppel-Fire) */
  function patchSaveButton(existingId){
    setTimeout(()=>{
      const btn=document.getElementById('event-save-button');
      if(btn){
        const fresh=btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh,btn);
        fresh.addEventListener('click',()=>window.saveEvent(existingId||null),{once:true});
        return;
      }
      document.querySelectorAll('#panel-body button').forEach(b=>{
        if(/^(Speichern|Aktualisieren)$/.test((b.textContent||'').trim())&&!b.dataset._mf){
          b.dataset._mf='1';
          const clone=b.cloneNode(true);
          b.parentNode.replaceChild(clone,b);
          clone.addEventListener('click',()=>window.saveEvent(existingId||null),{once:true});
        }
      });
    },20);
  }

  const _openEventPanel=window.openEventPanel;
  window.openEventPanel=function(id,preDate){
    if(typeof _openEventPanel==='function')_openEventPanel.apply(this,arguments);
    patchSaveButton(id);
  };

  /* ── ALLEEVENTS: Lokal + Google ── */
  function gDate(ge){const s=ge&&ge.start;if(!s)return '';if(s.date)return String(s.date).slice(0,10);if(s.dateTime)return String(s.dateTime).slice(0,10);return '';}
  function gTime(ge){const dt=ge&&ge.start&&ge.start.dateTime;if(!dt)return '';try{return new Date(dt).toTimeString().slice(0,5);}catch(e){return '';}}

  window.getAllEvents=function(){
    const out=[],seen=new Set();
    function add(ev){if(!ev||!ev.date)return;const key=ev.googleEventId?'g:'+ev.googleEventId:'l:'+ev.id;if(seen.has(key))return;seen.add(key);out.push(ev);}
    (Array.isArray(window.events)?window.events:[]).forEach(add);
    (Array.isArray(window.gEvents)?window.gEvents:[]).forEach(ge=>{if(!ge)return;const date=gDate(ge);if(!date)return;const id=String(ge.id||'');add({id:id.startsWith('g_')?id:'g_'+id,googleEventId:id,title:ge.summary||'(Kein Titel)',date,time:gTime(ge),endTime:'',color:'blue',type:'meeting',desc:ge.description||'',allDay:!!(ge.start&&ge.start.date),source:'google',notifDaysBefore:1});});
    return out;
  };
  window.getEventById=id=>{const all=window.getAllEvents();return all.find(e=>e.id===id)||all.find(e=>e.googleEventId===id)||null;};

  /* ── KALENDER-EINSTELLUNGEN ── */
  const SKEY='change_cal_master_settings';
  function loadSettings(){const def={showWeekNumbers:false,showChallengeDots:true,showHolidays:true};for(const k of[SKEY,'change_calendar_options_v2','change_v2_calendar_settings']){try{const raw=localStorage.getItem(k);if(raw)return Object.assign({},def,JSON.parse(raw));}catch(e){}}return def;}
  function saveSettings(s){try{localStorage.setItem(SKEY,JSON.stringify(s));}catch(e){}window.changeCalendarViewOptions=s;}
  function applyCSS(s){s=s||loadSettings();let el=document.getElementById('_mf_cal_style');if(!el){el=document.createElement('style');el.id='_mf_cal_style';document.head.appendChild(el);}el.textContent=[!s.showWeekNumbers?'.kw-badge,.kw-badge-left{display:none!important}':'',!s.showChallengeDots?'.challenge-day-dot{display:none!important}':'',!s.showHolidays?'.holiday-line,.holiday-badge{display:none!important}':''].join('\n');}
  function onToggle(){const s=loadSettings();['toggle-kw,toggle-weeknumbers,setting-weeknumbers,showWeekNumbers','toggle-dots,toggle-challenge-dots,setting-dots,showChallengeDots','toggle-holidays,setting-holidays,showHolidays'].forEach(row=>{const parts=row.split(',');const key=parts.pop();const v=parts.map(id=>document.getElementById(id)).find(el=>el&&el.type==='checkbox');if(v)s[key]=v.checked;});saveSettings(s);applyCSS(s);try{if(typeof renderCalendar==='function')renderCalendar();}catch(e){}}
  function attachToggles(){['toggle-kw','toggle-weeknumbers','setting-weeknumbers','toggle-dots','toggle-challenge-dots','setting-dots','toggle-holidays','setting-holidays'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.dataset._mf){el.dataset._mf='1';el.addEventListener('change',onToggle);}});}
  function syncToggleDOM(s){[['toggle-kw','toggle-weeknumbers','setting-weeknumbers','showWeekNumbers'],['toggle-dots','toggle-challenge-dots','setting-dots','showChallengeDots'],['toggle-holidays','setting-holidays','showHolidays']].forEach(arr=>{const key=arr.pop();arr.forEach(id=>{const el=document.getElementById(id);if(el&&el.type==='checkbox')el.checked=!!s[key];});});}

  const _openCalSettings=window.openCalendarSettings;
  window.openCalendarSettings=function(){if(typeof _openCalSettings==='function')_openCalSettings.apply(this,arguments);setTimeout(()=>{syncToggleDOM(loadSettings());attachToggles();},60);};
  window.saveCalSettings=function(){onToggle();try{toast('Kalender-Einstellungen gespeichert ✓','ok');}catch(e){}try{closePanel();}catch(e){}};

  const _renderCalFinal=window.renderCalendar;
  window.renderCalendar=function(){if(typeof _renderCalFinal==='function')_renderCalFinal.apply(this,arguments);applyCSS();};

  /* ── CHALLENGE UNDO ── */
  function myId(){try{let fu=null;try{fu=firebase&&firebase.auth&&firebase.auth().currentUser;}catch(e){}const info=window.userInfo||{};const email=String((fu&&fu.email)||info.email||info.mail||'').trim().toLowerCase();const uid=(fu&&fu.uid)||info.uid||'';return email||uid||'local-user';}catch(e){return 'local-user';}}
  function completionPlayerId(c){const id=String(c&&(c.playerId||c.userEmail||c.email||c.userId||c.uid)||'').trim().toLowerCase();return(!id||id==='me'||id==='du'||id==='ich'||id==='local-user')?myId():id;}
  function saveCompletions(){try{if(typeof ls==='function')ls('challenge_completions',window.challengeCompletions||[]);}catch(e){}try{if(typeof persistChangeState==='function')persistChangeState();}catch(e){}}

  window.undoChallengeCompletion=function(challengeId){
    const me=myId(),td=today(),before=(window.challengeCompletions||[]).length;
    window.challengeCompletions=(window.challengeCompletions||[]).filter(c=>!(String(c.challengeId)===String(challengeId)&&String(c.date||'').slice(0,10)===td&&completionPlayerId(c)===me));
    if(before===(window.challengeCompletions||[]).length){try{toast('Kein Eintrag gefunden','');}catch(e){}return;}
    saveCompletions();
    try{if(typeof firebase!=='undefined'&&firebase.firestore){const db=firebase.firestore();['playerId','userEmail','email'].forEach(field=>{db.collection('change_completions').where(field,'==',me).where('challengeId','==',String(challengeId)).where('date','==',td).limit(10).get().then(s=>s.forEach(d=>d.ref.delete())).catch(()=>{});});}}catch(e){}
    try{toast('Erledigung rückgängig ✓','ok');}catch(e){}
    try{if(typeof renderChallenges==='function')renderChallenges();}catch(e){}
    try{if(typeof buildDashboard==='function')buildDashboard();}catch(e){}
  };

  const _renderChallengesFinal=window.renderChallenges;
  window.renderChallenges=function(){
    if(typeof _renderChallengesFinal==='function')_renderChallengesFinal.apply(this,arguments);
    setTimeout(()=>{
      const list=document.getElementById('challenges-list');if(!list)return;
      const me=myId(),td=today();
      const doneIds=new Set((window.challengeCompletions||[]).filter(c=>completionPlayerId(c)===me&&String(c.date||'').slice(0,10)===td).map(c=>String(c.challengeId)));
      list.querySelectorAll('.challenge-item.challenge-done').forEach(row=>{
        if(row.querySelector('.btn-undo'))return;
        const chId=row.dataset.challengeId||'';if(!chId||!doneIds.has(chId))return;
        const btn=document.createElement('button');btn.className='btn btn-undo btn-sm';btn.title='Rückgängig';btn.textContent='↩';
        btn.onclick=e=>{e.stopPropagation();window.undoChallengeCompletion(chId);};
        row.appendChild(btn);
      });
    },0);
  };

  const _openContestFinal=window.openContestUserDetails;
  window.openContestUserDetails=function(playerId){
    if(typeof _openContestFinal==='function')_openContestFinal.apply(this,arguments);
    setTimeout(()=>{document.getElementById('panel-body')?.querySelectorAll('.delete-completion,.remove-completion-btn,.last-remove-btn').forEach(btn=>btn.remove());},20);
  };

  /* Styles */
  if(!document.getElementById('_mf_style')){
    const st=document.createElement('style');st.id='_mf_style';
    st.textContent='.btn-undo{background:transparent;border:1px solid var(--b2);color:var(--t3);font-size:14px;padding:5px 9px;border-radius:var(--rsm);cursor:pointer;flex-shrink:0;transition:all .15s}.btn-undo:hover{background:var(--red-d);border-color:rgba(220,38,38,.35);color:var(--red)}.challenge-item.challenge-done{flex-wrap:wrap;gap:6px}';
    document.head.appendChild(st);
  }

  window.changeCalendarViewOptions=loadSettings();
  applyCSS();
  window.addEventListener('load',()=>{setTimeout(()=>{applyCSS();try{if(typeof renderCalendar==='function')renderCalendar();}catch(e){}try{if(window.accessToken&&typeof loadGoogleEvents==='function')loadGoogleEvents();}catch(e){}try{if(typeof renderChallenges==='function')renderChallenges();}catch(e){}},600);});
})();

/* CHANGE · Fix 5: Dashboard kompakt, kein Wort mit Z..., Google-Sync nur Kalendereinstellungen */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const pad=n=>String(n).padStart(2,'0');
  const dk=d=>{try{return typeof dateKey==='function'?dateKey(d):d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}catch(e){return new Date(d).toISOString().slice(0,10)}};
  const parse=v=>{const d=v instanceof Date?v:new Date(String(v||'').includes('T')?v:String(v||'')+'T12:00:00');return isNaN(d)?new Date():d};
  const fmt=v=>parse(v).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
  const today=()=>dk(new Date());
  const banned=/\bZ\s*e\s*i\s*t\s*r\s*a\s*u\s*m\b\s*:?/gi;
  const clean=s=>String(s??'').replace(banned,'').replace(/\s*[·-]\s*$/,'').replace(/\s{2,}/g,' ').trim();
  const startOf=ev=>String(ev?.date||ev?.startDate||ev?.start||'').slice(0,10);
  const endOf=ev=>String(ev?.endDate||ev?.dateEnd||ev?.until||ev?.end||ev?.date||'').slice(0,10);
  const titleOf=ev=>clean(ev?.title||ev?.name||ev?.summary||'Termin');
  const timeOf=ev=>{if(ev?.allDay||(!ev?.time&&!ev?.endTime))return 'Ganztag'; const a=String(ev.time||'').slice(0,5),b=String(ev.endTime||'').slice(0,5); return a&&b?a+' – '+b:(a||'Ganztag')};
  const rangeLabel=ev=>{const a=startOf(ev),b=endOf(ev);return a&&b&&a!==b?fmt(a)+' – '+fmt(b):timeOf(ev)};
  const diff=d=>Math.round((parse(d)-parse(today()))/86400000);
  const badgeFor=(ev,d)=>{const a=startOf(ev),b=endOf(ev); if(a&&b&&a!==b)return rangeLabel(ev); const x=diff(d||a); if(x===0)return 'Heute'; if(x===1)return 'Morgen'; return fmt(d||a)};
  function injectCss(){let st=$('change-fix5-style');if(!st){st=document.createElement('style');st.id='change-fix5-style';document.head.appendChild(st)}st.textContent='.dash-row-title-line{display:flex;align-items:center;gap:8px;min-width:0}.dash-row-title-line .dash-row-title{flex:1;min-width:0}.dash-row.compact .dash-row-sub{display:none!important}.dash-info-badge{font-size:10px;font-weight:800;border-radius:999px;padding:3px 8px;white-space:nowrap;background:var(--grn-d);color:var(--grn);border:1px solid rgba(22,163,74,.16)}.holiday-badge{background:var(--amb-d)!important;color:var(--amb)!important;border-color:rgba(217,119,6,.2)!important}#vbtn-year,[onclick*="setCalView(\'year\')"],[onclick*="setCalView(&quot;year&quot;)"]{display:none!important}.google-sync-duplicate,.google-sync-header,.dashboard-google-sync{display:none!important}'}
  function holidayRows(limit=3){const out=[];const hs=window.holidays||window.publicHolidays||[];if(Array.isArray(hs))hs.forEach(h=>{const d=String(h.date||h.day||'').slice(0,10);if(d>=today())out.push({date:d,name:h.name||h.title||'Feiertag'})});return out.sort((a,b)=>a.date.localeCompare(b.date)).slice(0,limit)}
  function compactDashboard(){const grid=$('dash-grid');if(!grid)return false;const card=grid.querySelector('.calendar-card .dash-card-body');if(!card)return false;const evs=(window.getAllEvents?window.getAllEvents():(window.events||[])).filter(e=>startOf(e)&&endOf(e)>=today()).sort((a,b)=>(startOf(a)+(a.time||'')).localeCompare(startOf(b)+(b.time||''))).slice(0,5);const rows=[];holidayRows(3).forEach(h=>rows.push('<div class="dash-row compact" onclick="setMainView&&setMainView(\'calendar\')"><div class="dash-row-icon" style="background:var(--amb-d)">🎉</div><div class="dash-row-body"><div class="dash-row-title-line"><div class="dash-row-title">Feiertag · '+esc(h.name)+'</div><span class="dash-info-badge holiday-badge">'+esc(fmt(h.date))+'</span></div></div></div>'));evs.forEach(ev=>{const d=startOf(ev);rows.push('<div class="dash-row compact" onclick="setMainView&&setMainView(\'calendar\')"><div class="dash-row-icon" style="background:var(--acc-d)">📅</div><div class="dash-row-body"><div class="dash-row-title-line"><div class="dash-row-title">'+esc(titleOf(ev))+'</div><span class="dash-info-badge">'+esc(badgeFor(ev,d))+'</span></div></div></div>')});card.innerHTML=rows.length?rows.join(''):'<div class="dash-empty">Keine Termine oder Feiertage gefunden</div>';return true}
  function scrubText(root=document.body){if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(w.nextNode())nodes.push(w.currentNode);nodes.forEach(n=>{if(banned.test(n.nodeValue)){banned.lastIndex=0;n.nodeValue=clean(n.nodeValue)}})}
  function patchDashboard(){['buildDashCards','buildDashboard'].forEach(name=>{const old=window[name];if(typeof old==='function'&&!old.__fix5){const wrapped=function(){const r=old.apply(this,arguments);setTimeout(()=>{injectCss();compactDashboard();scrubText()},0);return r};wrapped.__fix5=true;window[name]=wrapped}})}
  window.openCalendarSettings=function(){const has=!!(window.accessToken&&window.accessToken!=='firebase-auth'&&!window.isDemoMode);const html='<div class="settings-section"><div class="settings-row"><div><div class="settings-title">Google Kalender</div><div class="settings-hint">Termine zentral mit Google synchronisieren.</div></div><label class="switch"><input id="google-sync-toggle" type="checkbox" '+(has?'checked':'')+'><span></span></label></div><button class="btn btn-secondary btn-full" id="google-sync-now" style="margin-top:12px">Jetzt synchronisieren</button></div>';if(typeof openPanel==='function')openPanel('Kalendereinstellungen',html);setTimeout(()=>{const sync=()=>{if(typeof window.loadGoogleEvents==='function')window.loadGoogleEvents()};const b=$('google-sync-now');if(b)b.onclick=sync;const t=$('google-sync-toggle');if(t)t.onchange=()=>{if(t.checked)sync()}},0)};
  function centralizeGoogleSync(){document.querySelectorAll('button,a').forEach(el=>{const txt=(el.textContent||'').toLowerCase();if(txt.includes('google')&&txt.includes('sync')&&!el.closest('#side-panel'))el.classList.add('google-sync-duplicate')})}
  function init(){injectCss();patchDashboard();centralizeGoogleSync();compactDashboard();scrubText()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250));else setTimeout(init,250);window.addEventListener('load',()=>setTimeout(init,900));setInterval(()=>{centralizeGoogleSync();scrubText()},1200);
})();
