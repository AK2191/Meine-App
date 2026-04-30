/* CHANGE GOOGLE/KALENDER FINAL FIX
   - Google-Termine werden wieder aus der echten gEvents-Variable gelesen
   - Speichern bleibt lokal sichtbar und synchronisiert danach zu Google
   - Arbeitswoche + zweites Heute werden ausgeblendet; Jahr/Monat bleiben
   - Der Heute-Button springt nur auf den heutigen Monat, keine Challenge-Ansicht
*/
(function(){
  'use strict';
  const MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const pad=n=>String(n).padStart(2,'0');
  function dk(d){ try{return typeof dateKey==='function'?dateKey(d):d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}catch(e){return new Date(d).toISOString().slice(0,10);} }
  function escX(s){ try{return typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}catch(e){return String(s??'');} }
  function toastX(msg,type){ try{ if(typeof toast==='function') toast(msg,type||''); }catch(e){} }
  function localEvents(){ try{ return Array.isArray(events)?events:[]; }catch(e){ return []; } }
  function googleEvents(){ try{ return Array.isArray(gEvents)?gEvents:[]; }catch(e){ return []; } }
  function saveLocal(){ try{ if(typeof ls==='function') ls('events', events); }catch(e){} try{ if(typeof persistChangeState==='function') persistChangeState(); }catch(e){} try{ if(typeof saveToDrive==='function') saveToDrive(); }catch(e){} }
  function hasCalendarToken(){ try{return !!accessToken && accessToken!=='firebase-auth' && !isDemoMode;}catch(e){return false;} }
  function googleDate(ge){
    const s=ge&&ge.start;
    if(!s) return '';
    if(s.date) return s.date;
    if(s.dateTime){ try{return dk(new Date(s.dateTime));}catch(e){return String(s.dateTime).slice(0,10);} }
    return '';
  }
  function googleTime(ge){
    const dt=ge&&ge.start&&ge.start.dateTime;
    if(!dt) return '';
    try{return new Date(dt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});}catch(e){return String(dt).slice(11,16);}
  }
  function normalizedGoogle(ge){
    const date=googleDate(ge);
    return {id:'g_'+String(ge.id||''), googleEventId:ge.id||'', title:ge.summary||'(Kein Titel)', date, time:googleTime(ge), endTime: ge.end&&ge.end.dateTime?googleTime({start:{dateTime:ge.end.dateTime}}):'', color:'blue', type:'meeting', desc:ge.description||'', allDay:!!(ge.start&&ge.start.date), source:'google', notifDaysBefore:1};
  }
  window.getAllEvents=function(){
    const out=[];
    localEvents().forEach(ev=>{ if(ev&&ev.date) out.push(ev); });
    googleEvents().forEach(ge=>{ const ev=normalizedGoogle(ge); if(ev.date) out.push(ev); });
    const seen=new Set();
    return out.filter(ev=>{ const key=(ev.googleEventId?'g:'+ev.googleEventId:'l:'+ev.id); if(seen.has(key))return false; seen.add(key); return true; });
  };
  window.getEventById=function(id){
    const all=window.getAllEvents();
    return all.find(e=>e.id===id)||all.find(e=>e.googleEventId===id)||null;
  };

  window.loadGoogleEvents=async function(){
    if(!hasCalendarToken()){
      if((function(){try{return accessToken==='firebase-auth';}catch(e){return false;}})()) toastX('Google Kalenderzugriff fehlt. Bitte abmelden und erneut mit Google anmelden.','err');
      return [];
    }
    try{
      const center=(typeof curDate!=='undefined'&&curDate)?curDate:new Date();
      const start=new Date(center.getFullYear(), center.getMonth()-2, 1, 0,0,0).toISOString();
      const end=new Date(center.getFullYear(), center.getMonth()+14, 0, 23,59,59).toISOString();
      const url='https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+encodeURIComponent(start)+'&timeMax='+encodeURIComponent(end)+'&singleEvents=true&orderBy=startTime&maxResults=2500';
      const r=await fetch(url,{headers:{Authorization:'Bearer '+accessToken}});
      if(r.status===401){ try{lsDel('access_token');}catch(e){} accessToken=''; toastX('Google-Anmeldung abgelaufen. Bitte neu anmelden.','err'); return []; }
      if(r.status===403){ const txt=await r.text().catch(()=>String(r.status)); console.warn('Google Calendar 403:',txt); toastX('Google Kalender API verweigert Zugriff. Bitte Calendar API/OAuth prüfen und neu anmelden.','err'); return []; }
      if(!r.ok){ const txt=await r.text().catch(()=>String(r.status)); console.warn('Google Calendar load:',r.status,txt); toastX('Google-Termine konnten nicht geladen werden ('+r.status+').','err'); return []; }
      const data=await r.json();
      gEvents=data.items||[];
      try{ window.gEvents=gEvents; }catch(e){}
      try{ if(currentMainView==='calendar'){ renderCalendar(); renderUpcoming&&renderUpcoming(); } }catch(e){}
      try{ if(currentMainView==='dashboard'&&typeof buildDashboard==='function') buildDashboard(); }catch(e){}
      return gEvents;
    }catch(e){ console.warn('Google Calendar load failed:',e); toastX('Google-Termine konnten nicht geladen werden.','err'); return []; }
  };

  window.loadGoogleData=async function(){
    await window.loadGoogleEvents();
    try{ if(typeof initFirebaseLive==='function') initFirebaseLive(); }catch(e){}
  };

  function addOneHour(time){
    if(!time) return '10:00';
    const parts=time.split(':').map(Number); const d=new Date(2000,0,1,parts[0]||9,parts[1]||0); d.setHours(d.getHours()+1); return pad(d.getHours())+':'+pad(d.getMinutes());
  }
  function nextDay(date){ const d=new Date(date+'T12:00:00'); d.setDate(d.getDate()+1); return dk(d); }
  function buildGoogleBody(ev){
    const tz=Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
    const body={summary:ev.title||'Termin', description:ev.desc||''};
    if(ev.time){
      const end=ev.endTime||addOneHour(ev.time);
      body.start={dateTime:ev.date+'T'+ev.time+':00', timeZone:tz};
      body.end={dateTime:ev.date+'T'+end+':00', timeZone:tz};
    }else{
      body.start={date:ev.date};
      body.end={date:nextDay(ev.date)};
    }
    return body;
  }
  async function syncToGoogle(ev){
    if(!hasCalendarToken()) return false;
    try{
      const url=ev.googleEventId?'https://www.googleapis.com/calendar/v3/calendars/primary/events/'+encodeURIComponent(ev.googleEventId):'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      const r=await fetch(url,{method:ev.googleEventId?'PATCH':'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(buildGoogleBody(ev))});
      if(r.status===401){ try{lsDel('access_token');}catch(e){} accessToken=''; toastX('Google-Anmeldung abgelaufen. Bitte neu anmelden.','err'); return false; }
      if(!r.ok){ const txt=await r.text().catch(()=>String(r.status)); console.warn('Google sync failed:',r.status,txt); toastX('Termin lokal gespeichert, aber Google-Sync fehlgeschlagen ('+r.status+').','err'); return false; }
      const saved=await r.json();
      const list=localEvents(); const i=list.findIndex(x=>x.id===ev.id);
      if(i>=0){ list[i].googleEventId=saved.id; list[i].googleSyncedAt=new Date().toISOString(); saveLocal(); }
      await window.loadGoogleEvents();
      toastX('Termin gespeichert und mit Google synchronisiert ✓','ok');
      return true;
    }catch(e){ console.warn('Google sync exception:',e); toastX('Termin lokal gespeichert, aber Google-Sync fehlgeschlagen.','err'); return false; }
  }
  window.syncEventToGoogleReliable=syncToGoogle;
  window.syncLocalEventToGoogle=syncToGoogle;

  window.saveEvent=function(existingId){
    const title=document.getElementById('ev-title')?.value.trim();
    const date=document.getElementById('ev-date')?.value;
    if(!title){toastX('Bitte einen Titel eingeben','err');return;}
    if(!date){toastX('Bitte ein Datum wählen','err');return;}
    const old=existingId?localEvents().find(e=>e.id===existingId || e.googleEventId===existingId):null;
    const ev={
      id:(old&&old.id&&!String(old.id).startsWith('g_'))?old.id:(existingId&&!String(existingId).startsWith('g_')?existingId:'ev_'+(typeof uid==='function'?uid():Date.now())),
      title,date,
      time:document.getElementById('ev-time')?.value||'',
      endTime:document.getElementById('ev-end')?.value||'',
      type:document.getElementById('ev-type')?.value||'meeting',
      color:document.getElementById('ev-color')?.value||'blue',
      desc:document.getElementById('ev-desc')?.value.trim()||'',
      notifDaysBefore:parseInt(document.getElementById('ev-notif')?.value||'1',10),
      allDay:!document.getElementById('ev-time')?.value,
      source:'local',
      googleEventId:(old&&old.googleEventId)||(!String(existingId||'').startsWith('g_')?'':String(existingId).slice(2)),
      createdAt:(old&&old.createdAt)||new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    const list=localEvents(); const i=list.findIndex(e=>e.id===ev.id);
    if(i>=0) list[i]=ev; else list.push(ev);
    saveLocal();
    try{ closePanel&&closePanel(); }catch(e){}
    try{ if(currentMainView==='calendar'){ renderCalendar(); renderUpcoming&&renderUpcoming(); } }catch(e){}
    try{ if(currentMainView==='dashboard'&&typeof buildDashboard==='function') buildDashboard(); }catch(e){}
    try{ checkNotifications&&checkNotifications(); }catch(e){}
    toastX(existingId?'Termin aktualisiert ✓':'Termin erstellt ✓','ok');
    if(hasCalendarToken()) syncToGoogle(ev);
  };
  window.saveToGoogleCal=function(existingId){ window.saveEvent(existingId); };

  function hideUnwantedControls(){
    const ww=document.getElementById('vbtn-workweek'); if(ww) ww.style.display='none';
    const td=document.getElementById('vbtn-today'); if(td) td.style.display='none';
    const ht=document.querySelector('.h-today-btn'); if(ht) ht.style.display='';
    const cssId='change-calendar-control-final-style';
    if(!document.getElementById(cssId)){ const st=document.createElement('style'); st.id=cssId; st.textContent='#vbtn-workweek,#vbtn-today{display:none!important}.today-view-challenges,.challenge-today-in-calendar{display:none!important}.h-today-btn{display:inline-flex!important}'; document.head.appendChild(st); }
  }
  const oldSetCalView=window.setCalView;
  window.setCalView=function(v){
    if(v==='workweek'||v==='today') v='month';
    currentCalView=v;
    ['year','month'].forEach(x=>document.getElementById('vbtn-'+x)?.classList.toggle('active',x===v));
    try{ if(typeof renderCalendar==='function') renderCalendar(); }catch(e){ if(oldSetCalView) oldSetCalView(v); }
  };
  window.goToday=function(){ curDate=new Date(); currentCalView='month'; try{renderCalendar();}catch(e){} try{window.loadGoogleEvents();}catch(e){} };
  const prevNavigate=window.navigate;
  window.navigate=function(dir){
    if(currentCalView==='workweek'||currentCalView==='today') currentCalView='month';
    if(typeof prevNavigate==='function') prevNavigate(dir); else { curDate=new Date(curDate.getFullYear(),curDate.getMonth()+dir,1); renderCalendar(); }
    try{ window.loadGoogleEvents(); }catch(e){}
  };
  const prevRender=window.renderCalendar;
  window.renderCalendar=function(){
    hideUnwantedControls();
    if(currentCalView==='workweek'||currentCalView==='today') currentCalView='month';
    if(typeof prevRender==='function') prevRender.apply(this,arguments);
    try{ ['year','month'].forEach(x=>document.getElementById('vbtn-'+x)?.classList.toggle('active',currentCalView===x)); }catch(e){}
  };

  window.addEventListener('load',function(){
    hideUnwantedControls();
    try{ if(hasCalendarToken()) setTimeout(window.loadGoogleEvents,350); }catch(e){}
  });
  setTimeout(hideUnwantedControls,500);
})();
