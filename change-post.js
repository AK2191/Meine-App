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
  function addDaysKey(dateStr, offset){const d=new Date(String(dateStr).slice(0,10)+'T12:00:00');d.setDate(d.getDate()+offset);return dk(d);}
  function googleRange(ge){
    const start=googleDate(ge);
    if(!start)return {start:'',end:''};
    let end=start;
    if(ge&&ge.end&&ge.end.date){
      end=String(ge.end.date).slice(0,10);
      // Google speichert Ganztagstermine mit exklusivem Enddatum.
      // Für Change muss der Zeitraum inklusiv sein, damit Urlaub korrekt gezählt wird.
      if(end>start)end=addDaysKey(end,-1);
    }else if(ge&&ge.end&&ge.end.dateTime){
      end=dk(new Date(ge.end.dateTime));
    }
    if(!end||end<start)end=start;
    return {start:start,end:end};
  }
  function normalizedGoogle(ge){const range=googleRange(ge);const date=range.start;return {id:'g_'+String(ge.id||''),googleEventId:ge.id||'',title:ge.summary||'(Kein Titel)',date,startDate:range.start,endDate:range.end,time:googleTime(ge),endTime:ge.end&&ge.end.dateTime?googleTime({start:{dateTime:ge.end.dateTime}}):'',color:'blue',type:'meeting',desc:ge.description||'',allDay:!!(ge.start&&ge.start.date),source:'google',notifDaysBefore:1};}

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
      const baseYear=center.getFullYear();
      // Dashboard-Tracker brauchen beim ersten Laden auch vergangene Termine.
      // Deshalb nicht mehr vom sichtbaren Monat aus -2/+14 Monate laden,
      // sondern den kompletten relevanten Jahresbereich inkl. Vor-/Folgejahr.
      const start=new Date(baseYear-1,0,1,0,0,0).toISOString();
      const end=new Date(baseYear+1,11,31,23,59,59).toISOString();
      const items=[];
      let pageToken='';
      do{
        let url='https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+encodeURIComponent(start)+'&timeMax='+encodeURIComponent(end)+'&singleEvents=true&orderBy=startTime&maxResults=2500';
        if(pageToken)url+='&pageToken='+encodeURIComponent(pageToken);
        const r=await fetch(url,{headers:{Authorization:'Bearer '+accessToken}});
        if(r.status===401){try{lsDel('access_token');}catch(e){}accessToken='';toastX('Google-Anmeldung abgelaufen. Bitte neu anmelden.','err');return [];}
        if(!r.ok){const txt=await r.text().catch(()=>String(r.status));console.warn('Google Calendar load:',r.status,txt);toastX('Google-Termine konnten nicht geladen werden ('+r.status+').','err');return [];}
        const data=await r.json();
        if(Array.isArray(data.items))items.push.apply(items,data.items);
        pageToken=data.nextPageToken||'';
      }while(pageToken&&items.length<10000);
      gEvents=items;
      try{window.gEvents=gEvents;}catch(e){}
      try{window.events=Array.isArray(events)?events:[];}catch(e){}
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
    const syncToggle=document.getElementById('ev-google-sync');
    const syncWanted=!!(syncToggle&&syncToggle.checked);

    const ev={
      id:old?old.id:('ev_'+uid()), title, date,
      time:val('ev-time'), endTime:val('ev-end'),
      type:val('ev-type')||'meeting', color:val('ev-color')||'blue',
      desc:val('ev-desc'),
      notifDaysBefore:parseInt(val('ev-notif')||'1',10)||1,
      allDay:!val('ev-time'), source:'local',
      googleEventId:old?(old.googleEventId||''):'',
      googleSyncRequested:syncWanted,
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

    if(syncWanted&&window.accessToken&&window.accessToken!=='firebase-auth'&&!window.isDemoMode){
      setTimeout(()=>{try{if(typeof syncEventToGoogleReliable==='function')syncEventToGoogleReliable(ev);else if(typeof syncLocalEventToGoogle==='function')syncLocalEventToGoogle(ev);}catch(e){}},300);
    }
    return ev;
  };

  window.saveToGoogleCal=function(existingId){
    const cb=document.getElementById('ev-google-sync');
    if(cb) cb.checked=true;
    return window.saveEvent(existingId);
  };

  window.deleteEvent=function(id){
    window.events=Array.isArray(window.events)?window.events:[];
    const local=window.events.find(e=>String(e.id)===String(id));
    if(!local){try{toast('Nur selbst erstellte lokale Termine können hier gelöscht werden.','err');}catch(e){}return;}
    const msg=local.googleEventId?'Diesen selbst erstellten Termin lokal löschen? Die bereits synchronisierte Google-Kopie bleibt erhalten.':'Diesen selbst erstellten Termin löschen?';
    if(!confirm(msg))return;
    window.events=window.events.filter(e=>String(e.id)!==String(id));
    persist();
    try{closePanel();}catch(e){}
    refreshCalendar();
    try{toast('Termin gelöscht ✓','ok');}catch(e){}
  };

  function canSyncGoogle(){
    return !!(window.accessToken&&window.accessToken!=='firebase-auth'&&!window.isDemoMode);
  }

  function injectLocalEventOptions(existingId){
    setTimeout(()=>{
      const body=document.getElementById('panel-body');
      if(!body) return;
      const ev=existingId&&typeof window.getEventById==='function'?window.getEventById(existingId):null;
      const isGoogle=!!(ev&&(ev.source==='google'||String(ev.id||'').startsWith('g_')));
      const saveBtn=document.getElementById('event-save-button')||Array.from(body.querySelectorAll('button')).find(b=>/^(Speichern|Aktualisieren)$/.test((b.textContent||'').trim()));
      if(isGoogle){
        Array.from(body.querySelectorAll('button')).forEach(b=>{
          const txt=(b.textContent||'').trim();
          if(txt==='Löschen'||txt==='Speichern'||txt==='Aktualisieren') b.remove();
        });
        if(!document.getElementById('google-event-readonly-note')&&body.firstChild){
          const note=document.createElement('div');
          note.id='google-event-readonly-note';
          note.className='settings-hint';
          note.textContent='Dieser Termin kommt aus Google. Löschen ist hier nur für selbst erstellte lokale Termine möglich.';
          body.insertBefore(note,body.firstChild);
        }
        return;
      }
      if(canSyncGoogle()&&!document.getElementById('ev-google-sync')&&saveBtn){
        const oldSynced=!!(ev&&ev.googleEventId);
        const wrap=document.createElement('div');
        wrap.className='toggle-row';
        wrap.style.margin='8px 0 12px';
        wrap.innerHTML='<div class="toggle-copy"><div class="toggle-title">Mit Google Kalender synchronisieren</div><div class="toggle-sub">'+(oldSynced?'Änderungen werden im bestehenden Google-Termin aktualisiert.':'Beim Speichern zusätzlich in Google Kalender anlegen.')+'</div></div><label class="switch"><input type="checkbox" id="ev-google-sync" '+(oldSynced?'checked':'')+'><span class="slider"></span></label>';
        saveBtn.parentNode.insertBefore(wrap,saveBtn);
      }
    },25);
  }

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
    injectLocalEventOptions(id);
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

/* ── 6. continuous multi-day calendar bars ───────────────── */
(function(){
  'use strict';

  const pad = n => String(n).padStart(2, '0');
  const dayMs = 86400000;

  function esc(s){
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[m]));
  }

  function key(d){
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseDate(v){
    if(!v) return null;
    const d = v instanceof Date ? new Date(v) : new Date(String(v).slice(0,10) + 'T12:00:00');
    return isNaN(d) ? null : d;
  }

  function addDays(d,n){
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function diffDays(a,b){
    const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((bb - aa) / dayMs);
  }

  function eventStart(ev){
    return parseDate(ev.startDate || ev.fromDate || ev.date);
  }

  function eventEnd(ev){
    return parseDate(ev.endDate || ev.toDate || ev.untilDate || ev.date);
  }

  function isMultiDay(ev){
    const s = eventStart(ev);
    const e = eventEnd(ev);
    return !!(s && e && key(s) !== key(e));
  }

  function colorOf(ev){
    return ['blue','green','amber','red','purple'].includes(ev.color) ? ev.color : 'blue';
  }

  function injectCss(){
    let st = document.getElementById('change-continuous-range-bars-style');
    if(!st){
      st = document.createElement('style');
      st.id = 'change-continuous-range-bars-style';
      document.head.appendChild(st);
    }

    st.textContent = `
      #month-grid .week-row{
        position:relative!important;
        overflow:hidden!important;
      }

      #month-grid .day-cell{
        position:relative;
        padding-top:34px!important;
      }

      #month-grid .ev-chip[data-range-event="1"],
      #month-grid .ev-chip.range-event,
      #month-grid .ev-chip.is-range,
      #month-grid .ev-chip.multi-day,
      #month-grid .ev-chip[title*="Urlaub"][data-continuous-hidden="1"]{
        display:none!important;
      }

      .change-range-bar{
        position:absolute;
        top:34px;
        height:19px;
        z-index:6;
        display:flex;
        align-items:center;
        padding:0 8px;
        font-size:10.5px;
        font-weight:700;
        line-height:1;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        pointer-events:auto;
        cursor:pointer;
        border-radius:0;
        border:1px solid rgba(45,106,79,.18);
        background:rgba(45,106,79,.10);
        color:var(--acc);
      }

      .change-range-bar.start{
        border-top-left-radius:8px;
        border-bottom-left-radius:8px;
      }

      .change-range-bar.end{
        border-top-right-radius:8px;
        border-bottom-right-radius:8px;
      }

      .change-range-bar.blue{
        background:rgba(45,106,79,.10);
        border-color:rgba(45,106,79,.20);
        color:var(--acc);
      }

      .change-range-bar.green{
        background:rgba(22,163,74,.10);
        border-color:rgba(22,163,74,.20);
        color:var(--grn);
      }

      .change-range-bar.amber{
        background:rgba(217,119,6,.10);
        border-color:rgba(217,119,6,.20);
        color:var(--amb);
      }

      .change-range-bar.red{
        background:rgba(220,38,38,.09);
        border-color:rgba(220,38,38,.18);
        color:var(--red);
      }

      .change-range-bar.purple{
        background:rgba(124,58,237,.09);
        border-color:rgba(124,58,237,.18);
        color:var(--pur);
      }

      .change-range-bar:hover{
        filter:brightness(.98);
      }
    `;
  }

  function getGridStart(){
    const cur = window.curDate instanceof Date ? window.curDate : new Date();
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    return addDays(first, -mondayOffset);
  }

  function getEvents(){
    try {
      if(typeof window.getAllEvents === 'function') return window.getAllEvents() || [];
    } catch(e){}
    return Array.isArray(window.events) ? window.events : [];
  }

  function removeOldBars(){
    document.querySelectorAll('.change-range-bar').forEach(x => x.remove());
  }

  function hideDuplicateDayChips(events){
    const titles = new Set(events.map(ev => String(ev.title || '').trim()).filter(Boolean));
    if(!titles.size) return;

    document.querySelectorAll('#month-grid .ev-chip').forEach(chip => {
      const txt = String(chip.textContent || '').replace(/\s+/g, ' ').trim();
      for(const title of titles){
        if(txt.includes(title)){
          chip.dataset.continuousHidden = '1';
          chip.style.display = 'none';
          break;
        }
      }
    });
  }

  function renderBars(){
    injectCss();
    removeOldBars();

    const grid = document.getElementById('month-grid');
    if(!grid) return;

    const rows = Array.from(grid.querySelectorAll('.week-row'));
    if(!rows.length) return;

    const gridStart = getGridStart();
    const gridEnd = addDays(gridStart, 41);

    const events = getEvents()
      .filter(isMultiDay)
      .filter(ev => {
        const s = eventStart(ev);
        const e = eventEnd(ev);
        return s && e && e >= gridStart && s <= gridEnd;
      });

    hideDuplicateDayChips(events);

    rows.forEach((row, weekIndex) => {
      const weekStart = addDays(gridStart, weekIndex * 7);
      const weekEnd = addDays(weekStart, 6);

      events.forEach(ev => {
        const s = eventStart(ev);
        const e = eventEnd(ev);
        if(!s || !e || e < weekStart || s > weekEnd) return;

        const segStart = s > weekStart ? s : weekStart;
        const segEnd = e < weekEnd ? e : weekEnd;

        const startCol = Math.max(0, diffDays(weekStart, segStart));
        const endCol = Math.min(6, diffDays(weekStart, segEnd));
        const span = endCol - startCol + 1;

        const left = `calc(${(startCol / 7) * 100}% + 2px)`;
        const width = `calc(${(span / 7) * 100}% - 4px)`;

        const bar = document.createElement('div');
        bar.className =
          'change-range-bar ' +
          colorOf(ev) + ' ' +
          (key(segStart) === key(s) ? 'start ' : '') +
          (key(segEnd) === key(e) ? 'end' : '');

        bar.style.left = left;
        bar.style.width = width;

        const isFirstVisibleSegment = key(segStart) === key(s) || weekIndex === 0;
        bar.textContent = isFirstVisibleSegment ? esc(ev.title || '') : '';

        bar.title = ev.title || '';

        bar.addEventListener('click', evt => {
          evt.stopPropagation();
          if(typeof window.openEventPanel === 'function') {
            window.openEventPanel(ev.id || ev.googleEventId);
          }
        });

        row.appendChild(bar);
      });
    });
  }

  const oldRender = window.renderCalendar;
  if(typeof oldRender === 'function' && !oldRender.__continuousRangeBars){
    const fixed = function(){
      const res = oldRender.apply(this, arguments);
      setTimeout(renderBars, 0);
      setTimeout(renderBars, 80);
      return res;
    };
    fixed.__continuousRangeBars = true;
    window.renderCalendar = fixed;
  }

  window.addEventListener('load', () => setTimeout(renderBars, 500));
})();
/* ── 7. compact dashboard layout ───────────────────────── */
(function(){
  'use strict';

  const pad = n => String(n).padStart(2, '0');

  function esc(s){
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[m]));
  }

  function todayKey(){
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseDate(v){
    if(!v) return null;
    const d = v instanceof Date ? new Date(v) : new Date(String(v).slice(0,10) + 'T12:00:00');
    return isNaN(d) ? null : d;
  }

  function dateKey(d){
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function deShort(v){
    const d = parseDate(v);
    return d ? d.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit' }) : '';
  }

  function deRange(ev){
    const s = parseDate(ev.startDate || ev.fromDate || ev.date);
    const e = parseDate(ev.endDate || ev.toDate || ev.untilDate || ev.date);
    if(!s) return '';
    if(e && dateKey(s) !== dateKey(e)) return deShort(s) + ' – ' + deShort(e);
    return deShort(s);
  }

  function getEvents(){
    try {
      if(typeof window.getAllEvents === 'function') return window.getAllEvents() || [];
    } catch(e){}
    return Array.isArray(window.events) ? window.events : [];
  }

  function getHolidayNameFor(date){
    const key = typeof date === 'string' ? date : dateKey(date);

    try {
      if(typeof window.getHolidayName === 'function'){
        const h = window.getHolidayName(key);
        if(h) return h;
      }
    } catch(e){}

    try {
      if(typeof window.getHoliday === 'function'){
        const h = window.getHoliday(key);
        if(typeof h === 'string') return h;
        if(h && h.name) return h.name;
      }
    } catch(e){}

    try {
      const list = []
        .concat(Array.isArray(window.holidays) ? window.holidays : [])
        .concat(Array.isArray(window.feiertage) ? window.feiertage : []);

      const hit = list.find(h => String(h.date || h.datum || h.key || '').slice(0,10) === key);
      if(hit) return hit.name || hit.title || hit.label || '';
    } catch(e){}

    return '';
  }

  function upcomingHolidays(limit){
    const start = parseDate(todayKey());
    const out = [];

    for(let i = 0; i < 370 && out.length < limit; i++){
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = dateKey(d);
      const name = getHolidayNameFor(k);
      if(name){
        out.push({
          id: 'holiday_' + k,
          title: name,
          date: k,
          isHoliday: true
        });
      }
    }

    return out;
  }

  function normalizeEvent(ev){
    return {
      id: ev.id || ev.googleEventId || '',
      title: String(ev.title || ev.summary || 'Termin').replace(/\bZeitraum\b/gi, '').replace(/\s{2,}/g, ' ').trim(),
      date: ev.date || ev.startDate || ev.fromDate || '',
      startDate: ev.startDate || ev.fromDate || ev.date || '',
      endDate: ev.endDate || ev.toDate || ev.untilDate || ev.date || '',
      badge: deRange(ev),
      isHoliday: false
    };
  }

  function openEvent(id){
    if(id && typeof window.openEventPanel === 'function') window.openEventPanel(id);
  }

  function injectCss(){
    let st = document.getElementById('change-compact-dashboard-style');
    if(!st){
      st = document.createElement('style');
      st.id = 'change-compact-dashboard-style';
      document.head.appendChild(st);
    }

    st.textContent = `
      #dash-grid{
        display:grid!important;
        grid-template-columns:minmax(320px,.9fr) minmax(360px,1.1fr)!important;
        gap:16px!important;
        align-items:start!important;
      }

      @media(max-width:900px){
        #dash-grid{
          grid-template-columns:1fr!important;
        }
      }

      .dash-card.change-dash-calendar{
        min-height:auto!important;
      }

      .change-dash-list{
        display:flex;
        flex-direction:column;
      }

      .change-dash-row{
        display:flex;
        align-items:center;
        gap:10px;
        min-height:42px;
        padding:9px 14px;
        border-bottom:1px solid var(--b1);
        cursor:pointer;
      }

      .change-dash-row:last-child{
        border-bottom:none;
      }

      .change-dash-row:hover{
        background:var(--bg);
      }

      .change-dash-icon{
        width:30px;
        height:30px;
        border-radius:8px;
        display:flex;
        align-items:center;
        justify-content:center;
        flex:0 0 auto;
        background:var(--acc-d);
        font-size:14px;
      }

      .change-dash-icon.holiday{
        background:var(--amb-d);
      }

      .change-dash-main{
        min-width:0;
        flex:1;
      }

      .change-dash-title{
        font-size:13px;
        font-weight:750;
        color:var(--t1);
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      .change-dash-subtle{
        font-size:11px;
        font-weight:700;
        color:var(--amb);
        text-transform:uppercase;
        letter-spacing:.35px;
        margin-bottom:1px;
      }

      .change-dash-badge{
        flex:0 0 auto;
        font-size:11px;
        font-weight:800;
        color:var(--grn);
        background:var(--grn-d);
        border:1px solid rgba(22,163,74,.14);
        padding:4px 8px;
        border-radius:999px;
        white-space:nowrap;
        font-family:var(--mono);
      }

      .change-combo-card .dash-card-body{
        display:grid;
        grid-template-columns:1fr 1fr;
        min-height:220px;
      }

      @media(max-width:700px){
        .change-combo-card .dash-card-body{
          grid-template-columns:1fr;
        }
      }

      .change-combo-section{
        min-width:0;
      }

      .change-combo-section + .change-combo-section{
        border-left:1px solid var(--b1);
      }

      @media(max-width:700px){
        .change-combo-section + .change-combo-section{
          border-left:none;
          border-top:1px solid var(--b1);
        }
      }

      .change-combo-head{
        padding:10px 14px;
        font-size:11px;
        font-weight:800;
        color:var(--t3);
        text-transform:uppercase;
        letter-spacing:.45px;
        border-bottom:1px solid var(--b1);
        background:var(--bg);
      }

      .change-mini-row{
        display:flex;
        align-items:center;
        gap:10px;
        padding:10px 14px;
        min-height:44px;
        border-bottom:1px solid var(--b1);
      }

      .change-mini-row:last-child{
        border-bottom:none;
      }

      .change-mini-icon{
        width:28px;
        height:28px;
        border-radius:8px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:var(--pur-d);
        flex:0 0 auto;
      }

      .change-mini-body{
        min-width:0;
        flex:1;
      }

      .change-mini-title{
        font-size:13px;
        font-weight:750;
        color:var(--t1);
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      .change-mini-meta{
        font-size:11.5px;
        color:var(--t3);
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      .change-mini-pill{
        font-size:11px;
        font-weight:800;
        border-radius:999px;
        padding:4px 8px;
        background:var(--acc-d);
        color:var(--acc);
        white-space:nowrap;
      }

      .change-mini-pill.open{
        background:var(--amb-d);
        color:var(--amb);
      }
    `;
  }

  function visibleChallenges(){
    const list = Array.isArray(window.challenges) ? window.challenges : [];
    return list
      .filter(ch => !ch.done && !ch.completed)
      .slice(0,4);
  }

  function visiblePlayers(){
    const list = Array.isArray(window.challengePlayers) ? window.challengePlayers : [];
    const seen = new Set();

    return list
      .filter(p => p && (p.email || p.id || p.name))
      .filter(p => {
        const k = String(p.email || p.id || p.name || '').toLowerCase();
        if(seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0,4);
  }

  function playerPoints(p){
    const id = String(p.email || p.id || '').toLowerCase();

    try {
      if(typeof window.getPlayerPointSummary === 'function'){
        return window.getPlayerPointSummary(id).todayPoints || 0;
      }
    } catch(e){}

    return (Array.isArray(window.challengeCompletions) ? window.challengeCompletions : [])
      .filter(c => String(c.playerId || c.email || c.userEmail || '').toLowerCase() === id)
      .filter(c => String(c.date || '') === todayKey())
      .reduce((sum,c) => sum + (parseInt(c.points,10) || 0), 0);
  }

  function buildCalendarRows(){
    const now = todayKey();

    const events = getEvents()
      .filter(ev => ev && (ev.date || ev.startDate || ev.fromDate))
      .map(normalizeEvent)
      .filter(ev => String(ev.endDate || ev.date) >= now)
      .sort((a,b) => String(a.startDate || a.date).localeCompare(String(b.startDate || b.date)))
      .slice(0,5);

    const holidays = upcomingHolidays(3);

    const combined = events
      .concat(holidays)
      .sort((a,b) => String(a.date || a.startDate).localeCompare(String(b.date || b.startDate)))
      .slice(0,6);

    if(!combined.length){
      return '<div class="dash-empty">Keine kommenden Termine.</div>';
    }

    return combined.map(item => {
      if(item.isHoliday){
        return `
          <div class="change-dash-row">
            <div class="change-dash-icon holiday">🎌</div>
            <div class="change-dash-main">
              <div class="change-dash-subtle">Feiertag</div>
              <div class="change-dash-title">${esc(item.title)}</div>
            </div>
            <span class="change-dash-badge">${esc(deShort(item.date))}</span>
          </div>
        `;
      }

      return `
        <div class="change-dash-row" onclick="window.__changeOpenDashEvent && window.__changeOpenDashEvent('${esc(item.id)}')">
          <div class="change-dash-icon">📅</div>
          <div class="change-dash-main">
            <div class="change-dash-title">${esc(item.title)}</div>
          </div>
          <span class="change-dash-badge">${esc(item.badge)}</span>
        </div>
      `;
    }).join('');
  }

  function buildChallengeRows(){
    const rows = visibleChallenges();

    if(!rows.length){
      return '<div class="dash-empty">Keine offenen Challenges.</div>';
    }

    return rows.map(ch => `
      <div class="change-mini-row">
        <div class="change-mini-icon">${esc(ch.icon || '🏆')}</div>
        <div class="change-mini-body">
          <div class="change-mini-title">${esc(ch.title || 'Challenge')}</div>
          <div class="change-mini-meta">${esc(ch.points || 0)} Punkte</div>
        </div>
        <span class="change-mini-pill open">offen</span>
      </div>
    `).join('');
  }

  function buildPlayerRows(){
    const rows = visiblePlayers();

    if(!rows.length){
      return '<div class="dash-empty">Keine Mitspieler.</div>';
    }

    return rows.map(p => {
      const pts = playerPoints(p);
      return `
        <div class="change-mini-row">
          <div class="change-mini-icon">🏅</div>
          <div class="change-mini-body">
            <div class="change-mini-title">${esc(p.name || p.email || 'Mitspieler')}</div>
            <div class="change-mini-meta">Heute: ${pts} P</div>
          </div>
          <span class="change-mini-pill">${pts} P</span>
        </div>
      `;
    }).join('');
  }

  window.__changeOpenDashEvent = openEvent;

  function renderDashboard(){
    injectCss();

    const grid = document.getElementById('dash-grid');
    if(!grid) return false;

    grid.innerHTML = `
      <div class="dash-card change-dash-calendar">
        <div class="dash-card-head">
          <div>
            <div class="dash-card-title">📅 Kalender</div>
            <div class="dash-card-sub">Nächste Termine und Feiertage</div>
          </div>
        </div>
        <div class="dash-card-body change-dash-list">
          ${buildCalendarRows()}
        </div>
      </div>

      <div class="dash-card change-combo-card">
        <div class="dash-card-head">
          <div>
            <div class="dash-card-title">🏆 Challenges & Mitspieler</div>
            <div class="dash-card-sub">Offene Aufgaben und Punkte</div>
          </div>
        </div>
        <div class="dash-card-body">
          <div class="change-combo-section">
            <div class="change-combo-head">Challenges</div>
            ${buildChallengeRows()}
          </div>
          <div class="change-combo-section">
            <div class="change-combo-head">Mitspieler</div>
            ${buildPlayerRows()}
          </div>
        </div>
      </div>
    `;

    return true;
  }

  const oldBuildDashCards = window.buildDashCards;
  window.buildDashCards = function(){
    const done = renderDashboard();
    if(!done && typeof oldBuildDashCards === 'function'){
      return oldBuildDashCards.apply(this, arguments);
    }
  };

  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        if(typeof window.buildDashCards === 'function') window.buildDashCards();
      } catch(e){}
    }, 400);
  });
})();


/* CHANGE CLEAN DASHBOARD FIX v2026-05-01-ROBUST
   Last loaded dashboard renderer. No extra files required.
   Fixes: dashboard calendar shows holidays, dates are bound left to content, today is visible. */
(function(){
  'use strict';
  const $ = (id)=>document.getElementById(id);
  const pad = (n)=>String(n).padStart(2,'0');
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toDate = (v)=>{ const d = v instanceof Date ? new Date(v) : new Date(String(v||'').slice(0,10)+'T12:00:00'); return isNaN(d) ? null : d; };
  const key = (d)=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const today = ()=>key(new Date());
  const addDays = (k,n)=>{ const d=toDate(k); d.setDate(d.getDate()+n); return key(d); };
  const diffDays = (k)=>Math.round((toDate(k)-toDate(today()))/86400000);
  const fmt = (k)=>{ const d=toDate(k); return d ? d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+'.' : ''; };
  const fmtLong = (k)=>{ const d=toDate(k); return d ? d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'}).replace(',', '') : ''; };

  function easter(y){
    const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),kk=c%4,l=(32+2*e+2*i-h-kk)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
    return new Date(y,mo-1,da,12);
  }
  function fallbackHolidays(k){
    const d=toDate(k), y=d.getFullYear(), md=pad(d.getMonth()+1)+'-'+pad(d.getDate()), out=[];
    const fixed={'01-01':'Neujahr','05-01':'Tag der Arbeit','10-03':'Tag der Deutschen Einheit','12-25':'1. Weihnachtstag','12-26':'2. Weihnachtstag'};
    if(fixed[md]) out.push({name:fixed[md]});
    const es=easter(y);
    [[-2,'Karfreitag'],[1,'Ostermontag'],[39,'Christi Himmelfahrt'],[50,'Pfingstmontag']].forEach(([off,name])=>{ const x=new Date(es); x.setDate(x.getDate()+off); if(key(x)===k) out.push({name}); });
    return out;
  }
  function holidaysFor(k){
    const list=[];
    try{ if(typeof window.getHolidaysForDate==='function') list.push(...(window.getHolidaysForDate(k)||[])); }catch(e){}
    try{ if(typeof window.getHolidayName==='function'){ const n=window.getHolidayName(k); if(n) list.push({name:n}); } }catch(e){}
    try{ if(Array.isArray(window.holidays)) list.push(...window.holidays.filter(h=>String(h.date||h.datum||h.key||'').slice(0,10)===k)); }catch(e){}
    list.push(...fallbackHolidays(k));
    const seen=new Set();
    return list.map(h=>({name:h.name||h.title||h.label||String(h)})).filter(h=>h.name && !seen.has(h.name) && seen.add(h.name));
  }
  function allEvents(){
    try{ if(typeof window.getAllEvents==='function') return window.getAllEvents()||[]; }catch(e){}
    return Array.isArray(window.events) ? window.events : [];
  }
  function evStart(e){ return String(e.startDate||e.fromDate||e.date||e.start?.date||e.start?.dateTime||'').slice(0,10); }
  function evEnd(e){ return String(e.endDate||e.toDate||e.untilDate||e.date||e.end?.date||e.end?.dateTime||evStart(e)||'').slice(0,10); }
  function evTitle(e){ return e.title || e.summary || e.name || 'Termin'; }
  function evTime(e){ return e.time || (e.start?.dateTime ? new Date(e.start.dateTime).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) : ''); }

  function dashboardCalendarRows(){
    const td=today(), limit=addDays(td,30), rows=[], seen=new Set();
    for(let i=0;i<=30;i++){
      const k=addDays(td,i);
      holidaysFor(k).forEach(h=>rows.push({kind:'holiday',date:k,start:k,end:k,sort:k,title:h.name}));
    }
    allEvents().forEach(e=>{
      const s=evStart(e), en=evEnd(e)||s;
      if(!s || en<td || s>limit) return;
      const id=(e.googleEventId?'g:'+e.googleEventId:(e.id||evTitle(e)+s+en));
      if(seen.has(id)) return; seen.add(id);
      rows.push({kind:'event',date:s<td?td:s,start:s,end:en,sort:s<td?td:s,event:e,title:evTitle(e)});
    });
    return rows.sort((a,b)=>a.sort.localeCompare(b.sort)||(a.kind==='holiday'?-1:1)).slice(0,8);
  }
  function dateBlock(r){
    const td=today(), active=r.start<=td && r.end>=td, d=diffDays(r.date);
    const top=active?'Heute':(d===1?'Morgen':fmt(r.date));
    const sub=active?fmt(r.date):fmtLong(r.date);
    return '<div class="change-date-left '+(active?'is-today':'')+'"><strong>'+esc(top)+'</strong><span>'+esc(sub)+'</span></div>';
  }
  function calendarHtml(){
    const rows=dashboardCalendarRows();
    if(!rows.length) return '<div class="dash-empty">Keine Termine oder Feiertage in den nächsten 30 Tagen</div>';
    return rows.map(r=>{
      if(r.kind==='holiday'){
        return '<div class="dash-row change-dashboard-row change-holiday-row" onclick="setMainView(\'calendar\')">'+dateBlock(r)+'<div class="dash-row-icon change-icon-holiday">🎉</div><div class="dash-row-body"><div class="dash-row-title">'+esc(r.title)+' <span class="change-holiday-badge">Feiertag</span></div><div class="dash-row-sub">'+esc(fmtLong(r.date))+'</div></div></div>';
      }
      const range=r.end && r.end!==r.start;
      const sub=range ? fmt(r.start)+' – '+fmt(r.end) : (fmtLong(r.start)+(evTime(r.event)?' · '+esc(evTime(r.event)):''));
      return '<div class="dash-row change-dashboard-row '+((r.start<=today()&&r.end>=today())?'change-today-row':'')+'" onclick="setMainView(\'calendar\')">'+dateBlock(r)+'<div class="dash-row-icon change-icon-event">📅</div><div class="dash-row-body"><div class="dash-row-title">'+esc(r.title)+'</div><div class="dash-row-sub">'+sub+'</div></div></div>';
    }).join('');
  }
  function challengeHtml(){
    const td=today();
    try{
      const list=(window.challenges||[]).filter(c=>c && c.active!==false && (c.recurrence==='daily'||!c.date||String(c.date||c.startDate||'').slice(0,10)===td)).slice(0,4);
      if(!list.length) return '<div class="dash-empty">Heute keine Challenges</div>';
      return list.map(ch=>'<div class="dash-row change-dashboard-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--pur-d)">'+esc(ch.icon||'🏆')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(ch.title||ch.name||'Challenge')+'</div><div class="dash-row-sub">'+(parseInt(ch.points,10)||0)+' Punkte</div></div><span class="dash-row-badge badge-amber">offen</span></div>').join('');
    }catch(e){return '<div class="dash-empty">Heute keine Challenges</div>';}
  }
  function playersHtml(){
    try{
      const players=(typeof window.getVisibleContestPlayers==='function'?window.getVisibleContestPlayers():(window.challengePlayers||[])).slice(0,4);
      const me=String(window.userInfo?.email||'').toLowerCase();
      if(!players.length) return '<div class="dash-empty">Noch keine Mitspieler</div>';
      return players.map((p,i)=>{const id=String(p.email||p.id||'').toLowerCase(), st=typeof window.getPlayerPointSummary==='function'?window.getPlayerPointSummary(id):{todayPoints:0,totalPoints:0}, medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1); return '<div class="dash-row change-dashboard-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--amb-d)">'+medal+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(p.name||p.email||'Mitspieler')+(id===me?' · Du':'')+'</div><div class="dash-row-sub">Heute '+(st.todayPoints||0)+' P · Gesamt '+(st.totalPoints||0)+' P</div></div><span class="dash-row-badge badge-green">'+(st.totalPoints||0)+' P</span></div>';}).join('');
    }catch(e){return '<div class="dash-empty">Noch keine Mitspieler</div>';}
  }
  function injectStyle(){
    let st=$('change-clean-dashboard-style');
    if(!st){ st=document.createElement('style'); st.id='change-clean-dashboard-style'; document.head.appendChild(st); }
    st.textContent='#kpi-grid{display:none!important}#dash-grid,.dash-grid{display:grid!important;grid-template-columns:minmax(380px,.82fr) minmax(460px,1.18fr)!important;gap:16px!important;align-items:start!important}.dash-card{border-radius:18px!important}.dash-card-body{max-height:360px!important;overflow:auto!important}.dashboard-combined-card .dash-card-body{display:grid!important;grid-template-columns:1fr 1fr!important;padding:0!important}.dashboard-section{min-width:0!important}.dashboard-section+.dashboard-section{border-left:1px solid var(--b1)!important}.dashboard-section-head{padding:10px 14px 7px!important;font-size:12px!important;font-weight:850!important;color:var(--t2)!important}.change-dashboard-row{min-height:50px!important;padding:10px 14px!important;gap:10px!important;align-items:center!important}.change-dashboard-row .dash-row-icon{width:30px!important;height:30px!important;border-radius:9px!important;flex:0 0 30px!important}.change-date-left{width:58px!important;flex:0 0 58px!important;text-align:left!important;line-height:1.05!important;color:var(--t2)!important}.change-date-left strong{display:block!important;font-size:11px!important;font-weight:900!important}.change-date-left span{display:block!important;margin-top:3px!important;font-size:9.5px!important;font-weight:750!important;color:var(--t5)!important}.change-date-left.is-today strong,.change-date-left.is-today span{color:var(--acc)!important}.change-holiday-row{background:rgba(245,158,11,.075)!important;box-shadow:inset 3px 0 0 var(--amb)!important}.change-today-row{background:rgba(45,106,79,.055)!important;box-shadow:inset 3px 0 0 var(--acc)!important}.change-icon-holiday{background:var(--amb-d)!important}.change-icon-event{background:var(--acc-d)!important}.change-holiday-badge{display:inline-flex!important;margin-left:6px!important;padding:1px 6px!important;border-radius:999px!important;background:rgba(245,158,11,.14)!important;color:#b85f00!important;border:1px solid rgba(245,158,11,.22)!important;font-size:10px!important;font-weight:850!important}@media(max-width:900px){#dash-grid,.dash-grid{grid-template-columns:1fr!important}.dashboard-combined-card .dash-card-body{grid-template-columns:1fr!important}.dashboard-section+.dashboard-section{border-left:0!important;border-top:1px solid var(--b1)!important}.dash-card-body{max-height:none!important}}';
  }
  window.buildDashCards=function(){
    const grid=$('dash-grid'); if(!grid) return;
    injectStyle();
    grid.innerHTML='<div class="dash-card calendar-card"><div class="dash-card-head"><div><div class="dash-card-title">📅 Kalender</div><div class="dash-card-sub">Heute · Feiertage · nächste Termine</div></div></div><div class="dash-card-body">'+calendarHtml()+'</div></div><div class="dash-card dashboard-combined-card"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenges & 👥 Mitspieler</div><div class="dash-card-sub">Heute und Rangliste</div></div></div><div class="dash-card-body"><div class="dashboard-section"><div class="dashboard-section-head">Challenges</div>'+challengeHtml()+'</div><div class="dashboard-section"><div class="dashboard-section-head">Mitspieler</div>'+playersHtml()+'</div></div></div>';
  };
  window.buildDashboard=function(){
    try{const n=(window.userInfo&&window.userInfo.name)||'', h=$('dash-greeting'); if(h) h.textContent=(new Date().getHours()<12?'Guten Morgen':new Date().getHours()<17?'Guten Tag':'Guten Abend')+(n?', '+n.split(' ')[0]:''); const s=$('dash-sub'); if(s) s.textContent='Kalender, Challenges und Mitspieler auf einen Blick';}catch(e){}
    window.buildDashCards();
  };
  function run(){ try{ if(!$('change-clean-dashboard-style')) injectStyle(); window.buildDashboard(); }catch(e){ console.warn('clean dashboard fix failed', e); } }
  setTimeout(run,50); setTimeout(run,400); setTimeout(run,1200);
})();

/* ── final fix: day detail includes multi-day range events ── */
(function(){
  'use strict';
  const pad=n=>String(n).padStart(2,'0');
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const parse=v=>{ if(!v) return null; const d=v instanceof Date?new Date(v):new Date(String(v).slice(0,10)+'T12:00:00'); return isNaN(d)?null:d; };
  const addDays=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
  const dateKey=v=>{ const d=v instanceof Date?v:parse(v); return d?key(d):String(v||'').slice(0,10); };
  const deLong=v=>{ try{return parse(v).toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});}catch(e){return String(v||'');} };
  const deShort=v=>{ try{return parse(v).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return String(v||'');} };

  function startOf(ev){
    return String(ev?.date||ev?.startDate||ev?.fromDate||ev?.dateKey||ev?.start?.date||(ev?.start?.dateTime?ev.start.dateTime.slice(0,10):'')||'').slice(0,10);
  }
  function endOf(ev){
    let x=String(ev?.endDate||ev?.dateEnd||ev?.toDate||ev?.untilDate||'').slice(0,10);
    if(!x && ev?.end?.date){ const d=parse(ev.end.date); if(d){ d.setDate(d.getDate()-1); x=key(d); } }
    if(!x && ev?.end?.dateTime) x=String(ev.end.dateTime).slice(0,10);
    const s=startOf(ev);
    return (!x || (s && x<s)) ? s : x;
  }
  function titleOf(ev){ return String(ev?.title||ev?.summary||ev?.name||'Termin').replace(/\bZeitraum\b\s*:?/gi,'').replace(/\s{2,}/g,' ').trim(); }
  function timeOf(ev){
    const allDay=ev?.allDay||!!ev?.start?.date||(!ev?.time&&!ev?.endTime&&!ev?.start?.dateTime);
    if(allDay) return 'Ganztägig';
    const a=String(ev?.time||(ev?.start?.dateTime?new Date(ev.start.dateTime).toTimeString().slice(0,5):'')).slice(0,5);
    const b=String(ev?.endTime||(ev?.end?.dateTime?new Date(ev.end.dateTime).toTimeString().slice(0,5):'')).slice(0,5);
    return a&&b?a+' – '+b:(a||'Ganztägig');
  }
  function isRange(ev){ const s=startOf(ev), e=endOf(ev); return !!(s&&e&&s!==e); }
  function normalizedRawGoogle(ge){
    const s=String(ge?.start?.date||(ge?.start?.dateTime?ge.start.dateTime.slice(0,10):'')).slice(0,10);
    let e='';
    if(ge?.end?.date){ const d=parse(ge.end.date); if(d){ d.setDate(d.getDate()-1); e=key(d); } }
    else if(ge?.end?.dateTime) e=String(ge.end.dateTime).slice(0,10);
    return {id:'g_'+String(ge.id||''),googleEventId:ge.id||'',title:ge.summary||'(Kein Titel)',date:s,startDate:s,endDate:e||s,time:ge?.start?.dateTime?new Date(ge.start.dateTime).toTimeString().slice(0,5):'',endTime:ge?.end?.dateTime?new Date(ge.end.dateTime).toTimeString().slice(0,5):'',allDay:!!ge?.start?.date,color:'blue',source:'google',desc:ge.description||''};
  }
  function allEvents(){
    const out=[];
    try{ if(typeof window.getAllEvents==='function') out.push(...(window.getAllEvents()||[])); }catch(e){}
    try{ if(Array.isArray(window.gEvents)) window.gEvents.forEach(ge=>out.push(normalizedRawGoogle(ge))); }catch(e){}
    try{ if(!out.length && Array.isArray(window.events)) out.push(...window.events); }catch(e){}
    const seen=new Map();
    out.forEach(ev=>{
      const s=startOf(ev); if(!s) return;
      const id=ev.googleEventId?'g:'+ev.googleEventId:(ev.id?'l:'+ev.id:titleOf(ev)+'|'+s+'|'+endOf(ev));
      const prev=seen.get(id);
      if(!prev || (isRange(ev)&&!isRange(prev))) seen.set(id,ev);
    });
    return Array.from(seen.values());
  }
  function eventsForDay(k, extra){
    const list=allEvents();
    if(Array.isArray(extra)) list.push(...extra);
    const byId=new Map();
    list.filter(ev=>{const s=startOf(ev),e=endOf(ev);return s&&e&&s<=k&&e>=k;}).forEach(ev=>{
      const id=ev.googleEventId?'g:'+ev.googleEventId:(ev.id?'l:'+ev.id:titleOf(ev)+'|'+startOf(ev)+'|'+endOf(ev));
      if(!byId.has(id)) byId.set(id,ev);
    });
    return Array.from(byId.values()).sort((a,b)=>{
      const ar=isRange(a), br=isRange(b); if(ar!==br) return ar?-1:1;
      return (startOf(a)+(a.time||'')).localeCompare(startOf(b)+(b.time||''));
    });
  }
  window.openDayPanel=function(dt,dayEvs){
    const k=dateKey(dt instanceof Date?dt:new Date(dt));
    const evs=eventsForDay(k,dayEvs);
    let html='<div style="font-size:12px;color:var(--t4);margin-bottom:12px;font-weight:700">'+esc(deLong(k))+'</div>';
    html+=evs.length?evs.map(ev=>{
      const range=isRange(ev);
      const sub=range?deShort(startOf(ev))+' – '+deShort(endOf(ev)):(deShort(startOf(ev))+(ev.desc?' · '+esc(ev.desc):''));
      const id=esc(ev.id||ev.googleEventId||'');
      return '<div class="ag-card '+esc(ev.color||'blue')+'" style="margin-bottom:8px" onclick="openEventPanel(\''+id+'\')"><div class="ag-time">'+esc(range?'Ganztägig':timeOf(ev))+'</div><div class="ag-body"><div class="ag-title">'+esc(titleOf(ev))+'</div><div class="ag-desc">'+sub+'</div></div></div>';
    }).join(''):'<div class="dash-empty">Keine Termine an diesem Tag.</div>';
    html+='<button type="button" class="btn btn-primary btn-full" style="margin-top:10px" onclick="openEventPanel(null,new Date(\''+k+'T12:00:00\'))">+ Neuer Termin für diesen Tag</button>';
    if(typeof window.openPanel==='function') window.openPanel((evs.length===1?'1 Termin':evs.length+' Termine'),html);
  };
})();
