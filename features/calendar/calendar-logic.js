/* Change App · Kalender · Rendering & Events
 * Aus index.html extrahiert — Code unverändert
 * NICHT direkt bearbeiten — stattdessen in die passende core/ oder features/ Datei
 */

/* ── beautiful-calendar-range-final ── */
/* BEAUTIFUL CLEAN CALENDAR FINAL: echte Zeitraum-Balken, Von/Bis-Dialog, dezente Google-Quelle */
(function(){
  const LS_OPTS='change_v1_calendar_view_options';
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));}
  function dkey(d){try{return (typeof dateKey==='function')?dateKey(d):d.toISOString().slice(0,10)}catch(e){return ''}}
  function addDaysSafe(d,n){return new Date(d.getTime()+n*86400000)}
  function parseDate(k){return new Date(String(k||'').slice(0,10)+'T12:00:00')}
  function fmt(k){return (typeof fmtDate==='function')?fmtDate(k):String(k||'')}
  function opt(){try{return Object.assign({showHolidays:true,showChallengeDots:true,showWeekNumbers:false},JSON.parse(localStorage.getItem(LS_OPTS)||'{}'))}catch(e){return {showHolidays:true,showChallengeDots:true,showWeekNumbers:false}}}
  function saveOpt(o){localStorage.setItem(LS_OPTS,JSON.stringify(o)); window.changeCalendarViewOptions=o; applyCleanCalendarStyle();}
  function startOf(ev){return String(ev?.startDate||ev?.date||ev?.dateKey||(ev?.start&&ev.start.date)||(ev?.start&&ev.start.dateTime?ev.start.dateTime.slice(0,10):'')).slice(0,10)}
  function endOf(ev){let e=ev?.endDate||ev?.toDate||ev?.untilDate||''; if(!e&&ev?.end?.date) e=dkey(addDaysSafe(parseDate(ev.end.date),-1)); if(!e&&ev?.end?.dateTime) e=String(ev.end.dateTime).slice(0,10); const s=startOf(ev); return (e&&e>=s)?String(e).slice(0,10):s}
  function titleOf(ev){return ev?.title||ev?.summary||ev?.name||'(Kein Titel)'}
  function timeOf(ev){if(ev?.time)return ev.time; if(ev?.start?.dateTime)return new Date(ev.start.dateTime).toTimeString().slice(0,5); return ''}
  function colorOf(ev){return ev?.color||'blue'}
  function isGoogle(ev){return ev?.source==='google'||String(ev?.id||'').startsWith('g_')}
  function isSynced(ev){return !!(ev?.googleEventId||ev?.syncedToGoogle)}
  function gIcon(ev){return isGoogle(ev)?'<span class="g-mini" title="Google">G</span>':(isSynced(ev)?'<span class="g-mini synced" title="An Google übertragen">✓</span>':'')}
  function allEvents(){
    const out=[];
    (window.events||[]).forEach(e=>{ if(e&&startOf(e)) out.push(Object.assign({},e,{startDate:startOf(e),endDate:endOf(e),time:e.time||'',endTime:e.endTime||''})); });
    const syncOn=(window.googleCalendarSyncEnabled!==false && localStorage.getItem('change_v1_google_calendar_sync')!=='false');
    if(syncOn){(window.gEvents||[]).forEach(ge=>{ const s=startOf(ge); if(!s)return; const _et=ge?.end?.dateTime?new Date(ge.end.dateTime).toTimeString().slice(0,5):''; out.push({id:'g_'+(ge.id||s+'_'+titleOf(ge)),title:titleOf(ge),startDate:s,endDate:endOf(ge),date:s,time:timeOf(ge),endTime:_et,color:'blue',type:'meeting',desc:ge.description||'',allDay:!!ge?.start?.date,source:'google',raw:ge}); });}
    return out;
  }
  window.getAllEvents=function(){return allEvents().map(e=>Object.assign({},e,{date:e.startDate}));};
  window.getEventById=function(id){return (window.events||[]).find(e=>e.id===id)||allEvents().find(e=>e.id===id)};

  function applyCleanCalendarStyle(){
    let st=$('beautiful-calendar-range-style'); if(!st){st=document.createElement('style');st.id='beautiful-calendar-range-style';document.head.appendChild(st)}
    const o=opt();
    st.textContent=`
      #month-grid{background:var(--bg)!important;gap:0!important;overflow:hidden!important}
      #month-grid .week-row{position:relative;display:grid!important;grid-template-columns:repeat(7,1fr)!important;min-height:136px;border-bottom:1px solid var(--b1);overflow:visible;background:var(--s1)}
      #month-grid .day-cell{min-height:136px;padding:10px 8px 6px!important;border-right:1px solid var(--b1);background:transparent;position:relative;overflow:hidden;transition:background .14s ease}
      #month-grid .day-cell:hover{background:rgba(45,106,79,.035)!important}
      #month-grid .day-cell.today{background:linear-gradient(180deg,rgba(45,106,79,.055),transparent)!important}
      #month-grid .day-cell.other{opacity:.45;background:rgba(0,0,0,.012)!important}
      .week-event-layer{position:absolute;left:0;right:0;top:42px;bottom:7px;display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:24px;row-gap:5px;pointer-events:none;z-index:4;padding:0 8px 0 8px}
      .range-bar{height:22px;border-radius:999px;background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.08);box-shadow:0 2px 7px rgba(18,38,31,.04);display:flex;align-items:center;gap:6px;padding:0 9px;font-size:11px;font-weight:700;color:var(--acc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:auto;cursor:pointer;backdrop-filter:blur(5px)}
      .range-bar.single{border-radius:8px;margin-right:6px}.range-bar.blue{background:rgba(66,133,244,.10);color:#3577f0;border-color:rgba(66,133,244,.13)}.range-bar.green{background:rgba(22,163,74,.10);color:var(--grn)}.range-bar.amber{background:rgba(245,158,11,.12);color:var(--amb)}.range-bar.red{background:rgba(239,68,68,.10);color:var(--red)}.range-bar.purple{background:rgba(139,92,246,.11);color:var(--pur)}
      .range-bar.continues-left{border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-8px}.range-bar.continues-right{border-top-right-radius:0;border-bottom-right-radius:0;margin-right:-8px}.range-bar:hover{transform:translateY(-1px);box-shadow:0 5px 12px rgba(18,38,31,.08)}
      .g-mini{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;border-radius:50%;font-size:9px;font-weight:900;line-height:1;background:rgba(66,133,244,.12);color:#4285F4;margin-left:auto;flex:0 0 auto}.g-mini.synced{background:rgba(22,163,74,.12);color:var(--grn)}
      .holiday-line{display:inline-flex!important;align-items:center;max-width:calc(100% - 16px);margin-top:4px;padding:2px 6px;border-radius:999px;background:rgba(245,158,11,.10);color:var(--amb);font-size:9.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative;z-index:6}
      .challenge-day-dot{${o.showChallengeDots?'':'display:none!important;'}}
      ${o.showHolidays?'':'.holiday-line,.holiday-card,.holiday-chip{display:none!important;}'}
      .source-pill{display:none!important}.range-pill{display:inline-flex;margin-left:7px;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:800;background:rgba(45,106,79,.09);color:var(--acc)}
      .fr.date-range-row{grid-template-columns:1fr 1fr!important}.date-help{font-size:12px;color:var(--t4);line-height:1.5;margin-top:-4px}.google-note-mini{display:inline-flex;align-items:center;gap:6px;margin-top:6px;font-size:11px;color:#4285F4;font-weight:700}.google-note-mini .g-mini{margin:0}
      @media(max-width:700px){#month-grid .week-row,#month-grid .day-cell{min-height:108px}.week-event-layer{top:34px;grid-auto-rows:21px;row-gap:3px;padding:0 4px}.range-bar{height:19px;font-size:9.5px;padding:0 6px}.g-mini{min-width:14px;height:14px;font-size:8px}}
    `;
  }

  function buildMonthCells(y,m){let first=new Date(y,m,1).getDay(); first=first===0?6:first-1; const dim=new Date(y,m+1,0).getDate(), prevDim=new Date(y,m,0).getDate(), cells=[]; for(let i=0;i<first;i++)cells.push({d:prevDim-first+1+i,m:m===0?11:m-1,y:m===0?y-1:y,other:true}); for(let i=1;i<=dim;i++)cells.push({d:i,m,y,other:false}); while(cells.length<42){const ld=cells.length-first-dim+1;cells.push({d:ld,m:m===11?0:m+1,y:m===11?y+1:y,other:true});} return cells;}
  function layoutWeekEvents(weekDates){
    const from=weekDates[0], to=weekDates[6];
    const candidates=allEvents().filter(ev=>startOf(ev)<=to && endOf(ev)>=from).sort((a,b)=>startOf(a).localeCompare(startOf(b))||endOf(b).localeCompare(endOf(a))||titleOf(a).localeCompare(titleOf(b)));
    const rows=[];
    return candidates.slice(0,12).map(ev=>{const s=startOf(ev), e=endOf(ev); const startIdx=Math.max(0,weekDates.indexOf(s)); const endIdx=weekDates.indexOf(e)===-1?(e>to?6:0):weekDates.indexOf(e); const span=Math.max(1,endIdx-startIdx+1); let lane=0; for(;lane<4;lane++){if(!rows[lane])rows[lane]=Array(7).fill(false); let ok=true; for(let i=startIdx;i<=endIdx;i++)if(rows[lane][i])ok=false; if(ok)break;} if(lane>=4)return null; for(let i=startIdx;i<=endIdx;i++)rows[lane][i]=true; return {ev,startIdx,endIdx,span,lane,continuesLeft:s<from,continuesRight:e>to};}).filter(Boolean);
  }
  

  const oldRenderCalendar=window.renderCalendar;
  window.renderCalendar=function(){
    const y=window.curDate?curDate.getFullYear():new Date().getFullYear(), m=window.curDate?curDate.getMonth():new Date().getMonth();
    const ml=$('month-label'); if(ml&&typeof DE_MONTHS!=='undefined')ml.textContent=DE_MONTHS[m]+' '+y;
    if(window.currentCalView==='agenda'){ if(typeof renderAgenda==='function')renderAgenda(); if($('month-grid'))$('month-grid').style.display='none'; if($('agenda-view'))$('agenda-view').style.display='block'; if($('wday-row'))$('wday-row').style.display='none'; return; }
    window.renderMonth(y,m); if($('month-grid'))$('month-grid').style.display='grid'; if($('agenda-view'))$('agenda-view').style.display='none'; if($('wday-row'))$('wday-row').style.display='grid';
  };

  window.openEventPanel=function(id,preDate){
    const ev=id?window.getEventById(id):null;
    if(ev&&isGoogle(ev)){
      const s=startOf(ev), e=endOf(ev), range=e&&e!==s?fmt(s)+' – '+fmt(e):fmt(s);
      openPanel(titleOf(ev),'<div style="background:linear-gradient(135deg,rgba(66,133,244,.10),rgba(66,133,244,.035));border:1px solid rgba(66,133,244,.16);border-radius:16px;padding:14px 15px;margin-bottom:14px"><div class="google-note-mini"><span class="g-mini">G</span><span>Aus Google Kalender</span></div><div style="font-size:17px;font-weight:850;color:var(--t1);margin-top:10px;margin-bottom:6px">'+esc(titleOf(ev))+'</div><div style="font-size:13px;color:var(--t3)">'+esc(range)+(timeOf(ev)?' · '+esc(timeOf(ev)):'')+'</div>'+(ev.desc?'<div style="font-size:13px;color:var(--t3);margin-top:10px;line-height:1.55">'+esc(ev.desc)+'</div>':'')+'</div><button class="btn btn-ghost btn-full" onclick="closePanel()">Schließen</button>'); return;
    }
    const baseDate=ev?startOf(ev):(preDate?dkey(preDate):dkey(new Date())); const baseEnd=ev?endOf(ev):baseDate;
    const types=[['meeting','📅 Termin'],['deadline','⚠️ Frist / Ablauf'],['reminder','🔔 Erinnerung'],['other','📌 Sonstiges']]; const colors=['blue','green','amber','red','purple']; const notifs=[['0','Am gleichen Tag'],['1','1 Tag vorher'],['3','3 Tage vorher'],['7','1 Woche vorher'],['14','2 Wochen vorher'],['30','1 Monat vorher']]; const curColor=ev?.color||'blue';
    const html=`${window.isDemoMode?'<div style="background:var(--amb-d);border:1px solid rgba(245,158,11,.2);border-radius:12px;padding:9px 12px;margin-bottom:12px;font-size:12px;color:var(--amb)">⚡ Demo-Modus: Lokal gespeichert</div>':''}
      <div class="fg"><label class="flabel">Titel *</label><input type="text" class="finput" id="ev-title" placeholder="Terminbezeichnung" value="${esc(ev?.title||'')}"></div>
      <div class="fr date-range-row"><div class="fg"><label class="flabel">Von-Datum *</label><input type="date" class="finput" id="ev-date" value="${esc(baseDate)}" style="color-scheme:dark"></div><div class="fg"><label class="flabel">Bis-Datum</label><input type="date" class="finput" id="ev-end-date" value="${esc(baseEnd)}" style="color-scheme:dark"></div></div>
      <div class="date-help">Für Urlaub oder mehrtägige Termine einfach ein Bis-Datum auswählen. Im Kalender erscheint daraus ein durchgehender Zeitraum.</div>
      <div class="fr"><div class="fg"><label class="flabel">Von Uhrzeit</label><input type="time" class="finput" id="ev-time" value="${esc(ev?.time||'')}"></div><div class="fg"><label class="flabel">Bis Uhrzeit</label><input type="time" class="finput" id="ev-end" value="${esc(ev?.endTime||'')}"></div></div>
      <div class="fr"><div class="fg"><label class="flabel">Art</label><select class="finput" id="ev-type">${types.map(([v,l])=>`<option value="${v}"${(ev?.type||'meeting')===v?' selected':''}>${l}</option>`).join('')}</select></div><div class="fg"><label class="flabel">Farbe</label><select class="finput" id="ev-color">${colors.map(c=>`<option value="${c}"${curColor===c?' selected':''}>${c[0].toUpperCase()+c.slice(1)}</option>`).join('')}</select></div></div>
      <div class="fg"><label class="flabel">Beschreibung</label><textarea class="finput" id="ev-desc" rows="4" placeholder="Notiz">${esc(ev?.desc||'')}</textarea></div>
      <div class="fg"><label class="flabel">Erinnerung</label><select class="finput" id="ev-notif">${notifs.map(([v,l])=>`<option value="${v}"${String(ev?.notifDaysBefore??1)===v?' selected':''}>${l}</option>`).join('')}</select></div>
      <div class="fa"><button class="btn btn-primary" style="flex:1" onclick="saveEventBeautiful('${esc(ev?.id||'')}')">Speichern</button>${ev?'<button class="btn btn-danger" onclick="deleteEvent(\''+esc(ev.id)+'\')">Löschen</button>':''}</div>`;
    openPanel(ev?'Termin bearbeiten':'Neuer Termin',html);
    const sd=$('ev-date'), ed=$('ev-end-date'); if(sd&&ed)sd.addEventListener('change',()=>{if(!ed.value||ed.value<sd.value)ed.value=sd.value;});
  };
  window.saveEventBeautiful=function(existingId){
    const title=$('ev-title')?.value.trim(); if(!title){ if(typeof toast==='function')toast('Bitte Titel eingeben','err'); return; }
    const s=$('ev-date')?.value||dkey(new Date()); let e=$('ev-end-date')?.value||s; if(e<s)e=s;
    const ev={id:existingId||('ev_'+Date.now()),title,startDate:s,endDate:e,date:s,time:$('ev-time')?.value||'',endTime:$('ev-end')?.value||'',type:$('ev-type')?.value||'meeting',color:$('ev-color')?.value||'blue',desc:$('ev-desc')?.value||'',notifDaysBefore:parseInt($('ev-notif')?.value||'1',10),createdAt:new Date().toISOString()};
    const arr=window.events||(window.events=[]); const old=existingId?arr.find(x=>x.id===existingId):null; if(old){Object.assign(old,ev,{googleEventId:old.googleEventId,syncedToGoogle:old.syncedToGoogle});} else arr.push(ev);
    if(typeof ls==='function')ls('events',arr); else localStorage.setItem('events',JSON.stringify(arr));
    /* no close */
renderCalendar(); if(typeof renderUpcoming==='function')renderUpcoming(); if(typeof buildDashboard==='function')buildDashboard(); if(typeof checkNotifications==='function')checkNotifications(); if(typeof saveToDrive==='function')try{saveToDrive()}catch(_){ } if(typeof toast==='function')toast(existingId?'Termin aktualisiert ✓':'Termin erstellt ✓','ok');
    try{ if(window.accessToken&&!window.isDemoMode&&typeof syncEventToGoogleReliable==='function')syncEventToGoogleReliable(old||ev); }catch(_){ }
  };

  const oldSettings=window.openCalendarSettings;
  window.openCalendarSettings=function(){
    const o=opt(); let extra='';
    try{ if(window.calendarSettings&&typeof STATE_OPTIONS!=='undefined'){const state=calendarSettings.state||'ALL'; const opts=Object.keys(STATE_OPTIONS).map(k=>'<option value="'+k+'" '+(state===k?'selected':'')+'>'+STATE_OPTIONS[k]+'</option>').join(''); extra='<div class="fg"><label class="flabel">Bundesland für Feiertage</label><select class="finput" id="holiday-state">'+opts+'</select></div>';}}
    catch(e){}
    openPanel('Kalender-Einstellungen',extra+'<div class="section-label">Ansicht</div><div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Feiertage anzeigen</div><div class="toggle-sub">Feiertage im Kalender anzeigen</div></div><label class="switch"><input type="checkbox" id="toggle-holidays" '+(o.showHolidays?'checked':'')+'><span class="slider"></span></label></div><div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Challenge-Dots</div><div class="toggle-sub">Punkte für Challenge-Tage ein-/ausblenden</div></div><label class="switch"><input type="checkbox" id="toggle-dots" '+(o.showChallengeDots?'checked':'')+'><span class="slider"></span></label></div><div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Wochennummern</div><div class="toggle-sub">KW-Anzeige im Monatskalender</div></div><label class="switch"><input type="checkbox" id="toggle-kw" '+(o.showWeekNumbers?'checked':'')+'><span class="slider"></span></label></div><button class="btn btn-primary btn-full" onclick="saveCalSettings()">Einstellungen speichern</button>');
  };
  window.saveCalSettings=function(){
    const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked}; saveOpt(o);
    try{ if($('holiday-state')&&window.calendarSettings){calendarSettings.state=$('holiday-state').value; if(typeof ls==='function')ls('holiday_state',calendarSettings.state); localStorage.setItem('change_v1_holiday_state',calendarSettings.state);}}
    catch(e){}
    /* no close */
renderCalendar(); if(typeof buildDashboard==='function')buildDashboard(); if(typeof toast==='function')toast('Kalender-Einstellungen gespeichert ✓','ok');
  };
  document.addEventListener('change',function(e){ if(e.target&&['toggle-holidays','toggle-dots','toggle-kw'].includes(e.target.id)){ const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked}; saveOpt(o); renderCalendar(); }});

  // Kein Dummy-„Du“ als eigener Mitspieler: Anzeigenamen nur noch bei aktuellem Konto ergänzen, nicht als extra Account.
  function accountId(){return String((window.userInfo&&(userInfo.email||userInfo.id))||localStorage.getItem('change_v1_user_email')||'').toLowerCase()}
  const oldGetPlayers=window.getVisibleContestPlayers||window.visiblePlayers;
  window.getVisibleContestPlayers=window.visiblePlayers=function(){const me=accountId(); let arr=[]; try{arr=oldGetPlayers?oldGetPlayers():(window.challengePlayers||[])}catch(e){arr=window.challengePlayers||[]} const seen=new Set(), out=[]; (arr||[]).forEach(p=>{let id=String(p?.email||p?.id||p?.userEmail||'').toLowerCase(); const name=String(p?.name||'').trim().toLowerCase(); if(!id&&(name==='du'||name==='ich'))id=me; if((name==='du'||name==='ich'||id==='du'||id==='demo@example.com')&&id!==me)return; if(!id)return; if(seen.has(id))return; seen.add(id); out.push(Object.assign({},p,{id,email:id,name:id===me?((window.userInfo&&(userInfo.name||userInfo.email))||p.name||p.email):p.name}));}); return out;};

  applyCleanCalendarStyle();
  setTimeout(()=>{try{if(window.currentMainView==='calendar')renderCalendar(); if(window.currentMainView==='dashboard'&&typeof buildDashboard==='function')buildDashboard();}catch(e){console.warn(e)}},300);
})();

/* ── change-option-b-calendar-final ── */
(function(){
  'use strict';
  const DAY = 86400000;
  const $ = (id) => document.getElementById(id);
  const escB = (s) => String(s ?? '').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: +backtick]
  const toKeyB = (d) => {
    if (typeof d === 'string') return d.slice(0,10);
    const x = new Date(d); x.setHours(12,0,0,0);
    return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0');
  };
  const parseB = (s) => { const d = new Date(String(s).slice(0,10) + 'T12:00:00'); return isNaN(d) ? new Date() : d; };
  const addB = (s,n) => toKeyB(new Date(parseB(s).getTime() + n*DAY));
  const daysB = (a,b) => Math.round((parseB(b)-parseB(a))/DAY);
  const monthsB = (window.DE_MONTHS || ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']);
  const fmtB = (s) => (typeof window.fmtDate === 'function') ? window.fmtDate(s) : String(s).slice(8,10)+'.'+String(s).slice(5,7)+'.'+String(s).slice(0,4);
  function optsB(){
    const base = {showHolidays:true, showChallengeDots:true, showWeekNumbers:true};
    ['change_v1_calendar_view_options','calendar_settings'].forEach(k => { try{ Object.assign(base, JSON.parse(localStorage.getItem(k)||'{}')); }catch(e){} });
    return base;
  }
  function rangeB(ev){
    let s = ev?.startDate || ev?.date || ev?.dateKey || ev?.start?.date || (ev?.start?.dateTime ? ev.start.dateTime.slice(0,10) : '');
    let e = ev?.endDate || ev?.date || ev?.dateKey || ev?.end?.date || (ev?.end?.dateTime ? ev.end.dateTime.slice(0,10) : '') || s;
    if (ev?.end?.date && e > s) e = addB(e, -1);
    if (!e || e < s) e = s;
    return {start:s, end:e};
  }
  function allEventsB(){
    const out = [];
    let local = [];
    try{ local = Array.isArray(window.events) ? window.events : (Array.isArray(events) ? events : []); }catch(e){}
    local.forEach(ev => { const r=rangeB(ev); if(r.start) out.push(Object.assign({}, ev, {date:r.start,startDate:r.start,endDate:r.end,source:ev.source||'local'})); });
    let gs = [];
    try{ gs = Array.isArray(window.gEvents) ? window.gEvents : (Array.isArray(gEvents) ? gEvents : []); }catch(e){}
    gs.forEach(ge => {
      const s = ge?.start?.date || (ge?.start?.dateTime ? ge.start.dateTime.slice(0,10) : '');
      if(!s) return;
      let e = ge?.end?.date || (ge?.end?.dateTime ? ge.end.dateTime.slice(0,10) : '') || s;
      if(ge?.end?.date && e > s) e = addB(e,-1);
      out.push({id:'g_'+ge.id, googleEventId:ge.id, title:ge.summary||'(Kein Titel)', date:s, startDate:s, endDate:e<s?s:e, time:ge?.start?.dateTime ? new Date(ge.start.dateTime).toTimeString().slice(0,5) : '', endTime:ge?.end?.dateTime ? new Date(ge.end.dateTime).toTimeString().slice(0,5) : '', color:'blue', type:'meeting', desc:ge.description||'', source:'google'});
    });
    return out.filter(e => e.date);
  }
  window.getAllEvents = allEventsB;
  window.getEventById = function(id){
    let local=[]; try{ local = Array.isArray(window.events) ? window.events : (Array.isArray(events) ? events : []); }catch(e){}
    return local.find(e => e.id === id) || allEventsB().find(e => e.id === id);
  };
  function eventsOnB(k){ return allEventsB().filter(e => { const r=rangeB(e); return r.start <= k && r.end >= k; }); }
  function holidaysB(k){ try{ return (typeof window.getHolidaysForDate === 'function' ? window.getHolidaysForDate(k) : getHolidaysForDate(k)) || []; }catch(e){ return []; } }
  function playerB(){ try{ if(typeof window.getCurrentPlayerId === 'function') return window.getCurrentPlayerId(); }catch(e){} try{ if(window.currentUser?.email) return window.currentUser.email; }catch(e){} return 'local'; }
  function challengeB(k){
    let list=[]; try{ list = Array.isArray(window.challenges) ? window.challenges : (Array.isArray(challenges) ? challenges : []); }catch(e){}
    list = list.filter(c => c && c.active !== false && (c.recurrence === 'daily' || c.repeat === 'daily' || (c.date||c.startDate||c.dateKey) === k));
    if(!list.length) return null;
    let comps=[]; try{ comps = Array.isArray(window.challengeCompletions) ? window.challengeCompletions : (Array.isArray(challengeCompletions) ? challengeCompletions : []); }catch(e){}
    const pid = playerB();
    const done = list.filter(ch => comps.some(c => c.challengeId === ch.id && (c.playerId === pid || c.userId === pid || c.email === pid) && String(c.date||c.dateKey).slice(0,10) === k)).length;
    const points = list.reduce((s,c) => s + (parseInt(c.points,10)||0), 0);
    return {points, done, total:list.length, allDone:done >= list.length};
  }
  function isoWeekB(dt){
    const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d-y0)/DAY)+1)/7);
  }
  function googleMarkB(ev){
    if(ev.source === 'google') return '<span class="cal-gmark" title="von Google">G</span>';
    if(ev.googleEventId || ev.syncedToGoogle || ev.googleSyncedAt) return '<span class="cal-gmark synced" title="an Google übertragen">✓</span>';
    return '';
  }
  function colorB(ev){ return ['blue','green','amber','red','purple'].includes(ev.color) ? ev.color : 'green'; }
  function isTodayB(dt){ try{ return typeof window.isToday === 'function' ? window.isToday(dt) : toKeyB(dt) === toKeyB(new Date()); }catch(e){ return toKeyB(dt) === toKeyB(new Date()); } }

  

  window.renderYear = function(y){
    const grid=$('month-grid'); if(!grid) return;
    grid.className = 'year-grid-option-b';
    grid.style.display = 'grid';
    grid.style.gridTemplateRows = 'none';
    grid.innerHTML = '';
    for(let m=0;m<12;m++){
      const card=document.createElement('div'); card.className='year-month-card-b';
      card.onclick=()=>{ curDate=new Date(y,m,1); currentCalView='month'; window.renderCalendar(); };
      let f=new Date(y,m,1).getDay(); f=f===0?6:f-1;
      const dim=new Date(y,m+1,0).getDate();
      let html='<div class="year-title-b">'+monthsB[m]+'</div><div class="year-mini-b">';
      ['M','D','M','D','F','S','S'].forEach(x=>html+='<span class="year-head-b">'+x+'</span>');
      for(let i=0;i<f;i++) html+='<span></span>';
      for(let d=1;d<=dim;d++){
        const dt=new Date(y,m,d), k=toKeyB(dt), hasE=eventsOnB(k).length>0, hasH=holidaysB(k).length>0;
        html+='<span class="year-day-b '+(isTodayB(dt)?'today ':'')+(hasE?'event ':'')+(hasH?'holiday ':'')+'">'+d+(hasE||hasH?'<i></i>':'')+'</span>';
      }
      card.innerHTML=html+'</div>'; grid.appendChild(card);
    }
  };

  window.renderCalendar = function(){
    const y=curDate.getFullYear(), m=curDate.getMonth();
    const label=$('month-label'); if(label) label.textContent = currentCalView === 'year' ? String(y) : (currentCalView === 'workweek' ? 'Arbeitswoche · '+monthsB[m]+' '+y : monthsB[m]+' '+y);
    ['year','month','workweek','today'].forEach(v => $('vbtn-'+v)?.classList.toggle('active', currentCalView===v));
    const grid=$('month-grid'), agenda=$('agenda-view'), wday=$('wday-row');
    if(agenda) agenda.style.display='none';
    if(currentCalView === 'year'){
      if(wday) wday.style.display='none';
      window.renderYear(y);
    } else if(currentCalView === 'workweek' && typeof window.renderWorkweek === 'function'){
      if(wday) wday.style.display='none';
      window.renderWorkweek();
    } else {
      if(wday) wday.style.display='grid';
      window.renderMonth(y,m);
    }
    if(grid) grid.style.display='grid';
    try{ if(typeof window.renderUpcoming === 'function') window.renderUpcoming(); }catch(e){}
  };
  window.setCalView = function(v){ currentCalView = v === 'today' ? 'month' : v; if(v === 'today') curDate = new Date(); window.renderCalendar(); };
  window.navigate = function(dir){
    if(currentCalView === 'year') curDate = new Date(curDate.getFullYear()+dir,0,1);
    else if(currentCalView === 'workweek') curDate = new Date(curDate.getTime()+dir*7*DAY);
    else curDate = new Date(curDate.getFullYear(), curDate.getMonth()+dir, 1);
    window.renderCalendar();
  };
  window.goToday = function(){ curDate = new Date(); currentCalView = 'month'; window.renderCalendar(); };

  window.openEventPanel = function(id,preDate){
    const ev = id ? window.getEventById(id) : null;
    if(ev && ev.source === 'google'){
      const r=rangeB(ev);
      window.openPanel(ev.title || 'Google Termin','<div class="google-detail-b"><span class="cal-gmark big">G</span><div><div class="challenge-title"></div><div class="settings-hint">'+escB(r.start===r.end?fmtB(r.start):fmtB(r.start)+' – '+fmtB(r.end))+(ev.time?' · '+escB(ev.time):'')+'</div></div></div><button class="btn btn-ghost btn-full" onclick="closePanel()">Schließen</button>');
      return;
    }
    const start = ev?.startDate || ev?.date || (preDate ? toKeyB(preDate) : toKeyB(new Date()));
    const end = ev?.endDate || ev?.date || start;
    const color = ev?.color || 'blue';
    const html = '<div class="fg"><label class="flabel">Titel *</label><input class="finput" id="ev-title" placeholder="Termin" value="'+escB(ev?.title||'')+'"></div>'+
      '<div class="fr"><div class="fg"><label class="flabel">Von-Datum *</label><input type="date" class="finput" id="ev-date" value="'+start+'"></div><div class="fg"><label class="flabel">Bis-Datum</label><input type="date" class="finput" id="ev-end-date" value="'+end+'"></div></div>'+
      '<div class="fr"><div class="fg"><label class="flabel">Von Uhrzeit</label><input type="time" class="finput" id="ev-time" value="'+escB(ev?.time||'')+'"></div><div class="fg"><label class="flabel">Bis Uhrzeit</label><input type="time" class="finput" id="ev-end" value="'+escB(ev?.endTime||'')+'"></div></div>'+
      '<div class="fr"><div class="fg"><label class="flabel">Art</label><select class="finput" id="ev-type"><option value="meeting">Termin</option><option value="deadline">Frist</option><option value="reminder">Erinnerung</option><option value="other">Sonstiges</option></select></div><div class="fg"><label class="flabel">Farbe</label><select class="finput" id="ev-color">'+[['blue','Blau','#3b82f6'],['green','Grün','#22c55e'],['amber','Gelb','#f59e0b'],['red','Rot','#ef4444'],['purple','Lila','#a855f7']].map(function(x){return '<option value="'+x[0]+'" style="background:'+x[2]+'20;font-weight:600" '+(color===x[0]?'selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></div></div>'+
      '<div class="fg"><label class="flabel">Beschreibung</label><textarea class="finput" id="ev-desc" rows="4" placeholder="Notiz">'+escB(ev?.desc||'')+'</textarea></div>'+
      '<div class="fa"><button class="btn btn-primary" style="flex:1" onclick="saveEvent(\''+(ev?.id||'')+'\')">Speichern</button>'+(ev?'<button class="btn btn-danger" onclick="deleteEvent(\''+ev.id+'\')">Löschen</button>':'')+'</div>';
    window.openPanel(ev ? 'Termin bearbeiten' : 'Neuer Termin', html);
    setTimeout(()=>{ const t=$('ev-type'); if(t && ev?.type) t.value=ev.type; },0);
  };

  window.saveEvent = function(id){
    const title=$('ev-title')?.value.trim();
    const start=$('ev-date')?.value;
    let end=$('ev-end-date')?.value || start;
    if(!title || !start){ if(typeof toast === 'function') toast('Titel und Von-Datum fehlen','err'); return; }
    if(end < start) end = start;
    let old={}; try{ old = id ? window.getEventById(id) || {} : {}; }catch(e){}
    const ev = Object.assign({}, old, {
      id: id || ('ev_' + (typeof uid === 'function' ? uid() : Math.random().toString(36).slice(2))),
      title, date:start, startDate:start, endDate:end,
      time:$('ev-time')?.value || '', endTime:$('ev-end')?.value || '',
      type:$('ev-type')?.value || old.type || 'meeting', color:$('ev-color')?.value || old.color || 'blue',
      desc:$('ev-desc')?.value.trim() || '', source:'local',
      createdAt: old.createdAt || new Date().toISOString(), updatedAt:new Date().toISOString()
    });
    let arr=[]; try{ arr = Array.isArray(window.events) ? window.events : (Array.isArray(events) ? events : []); }catch(e){}
    const idx=arr.findIndex(x=>x.id===ev.id); if(idx>=0) arr[idx]=ev; else arr.push(ev);
    try{ window.events=arr; events=arr; }catch(e){ window.events=arr; }
    try{ if(typeof ls === 'function') ls('events', arr); else localStorage.setItem('change_v1_events', JSON.stringify(arr)); }catch(e){}
    if(typeof closePanel === 'function') closePanel();
    window.renderCalendar(); try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
    if(typeof toast === 'function') toast('Termin gespeichert ✓','ok'); setTimeout(function(){if(typeof buildDashboard==='function')buildDashboard();},200);
  };

  window.openCalendarSettings = function(){
    const o=optsB();
    let state='ALL'; try{ state = window.calendarSettings?.state || JSON.parse(localStorage.getItem('change_v1_holiday_state')||'"ALL"') || 'ALL'; }catch(e){ state='ALL'; }
    const states = window.STATE_OPTIONS || (typeof STATE_OPTIONS !== 'undefined' ? STATE_OPTIONS : {'ALL':'Alle Bundesländer'});
    const options = Object.entries(states).map(([k,v]) => '<option value="'+k+'" '+(k===state?'selected':'')+'>'+escB(v)+'</option>').join('');
    window.openPanel('Kalender-Einstellungen','<div class="fg"><label class="flabel">Bundesland</label><select class="finput" id="holiday-state">'+options+'</select></div>'+[
      ['Feiertage anzeigen','toggle-holidays','showHolidays'],['Challenge-Punkte anzeigen','toggle-dots','showChallengeDots'],['Kalenderwochen anzeigen','toggle-kw','showWeekNumbers']
    ].map(([t,id,k])=>'<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">'+t+'</div></div><label class="switch"><input type="checkbox" id="'+id+'" '+(o[k]?'checked':'')+'><span class="slider"></span></label></div>').join('')+'<button class="btn btn-primary btn-full" onclick="saveCalSettings()">Speichern</button>');
  };
  window.saveCalSettings = function(){
    const o={showHolidays:!!$('toggle-holidays')?.checked, showChallengeDots:!!$('toggle-dots')?.checked, showWeekNumbers:!!$('toggle-kw')?.checked};
    localStorage.setItem('change_v1_calendar_view_options', JSON.stringify(o));
    localStorage.setItem('calendar_settings', JSON.stringify(o));
    try{ if(!window.calendarSettings) window.calendarSettings={}; window.calendarSettings.state=$('holiday-state')?.value||'ALL'; if(typeof ls === 'function') ls('holiday_state', window.calendarSettings.state); else localStorage.setItem('change_v1_holiday_state', JSON.stringify(window.calendarSettings.state)); }catch(e){}
    if(typeof closePanel === 'function') closePanel(); window.renderCalendar(); if(typeof toast === 'function') toast('Kalender-Einstellungen gespeichert ✓','ok');
  };

  const style = document.createElement('style');
  style.id = 'change-option-b-calendar-final-style';
  style.textContent = `
    #month-grid.month-grid-option-b{display:grid!important;gap:0!important;background:var(--b1)!important;border-top:1px solid var(--b1)!important;overflow:hidden!important;}
    #month-grid.month-grid-option-b .cal-week-b{position:relative!important;display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;min-height:118px!important;background:var(--s1)!important;border-bottom:1px solid var(--b1)!important;overflow:hidden!important;}
    #month-grid.month-grid-option-b .cal-day-b{position:relative!important;grid-row:1!important;min-width:0!important;min-height:118px!important;padding:8px 8px 28px!important;border-right:1px solid var(--b1)!important;background:var(--s1)!important;overflow:hidden!important;}
    #month-grid.month-grid-option-b .cal-day-b.weekend{background:rgba(0,0,0,.018)!important;}
    #month-grid.month-grid-option-b .cal-day-b.other{opacity:.46!important;background:rgba(0,0,0,.012)!important;}
    #month-grid.month-grid-option-b .cal-day-b.today{background:linear-gradient(180deg,rgba(45,106,79,.08),rgba(45,106,79,.015))!important;box-shadow:inset 0 0 0 1px rgba(45,106,79,.18)!important;}
    .cal-day-head{display:flex!important;align-items:center!important;gap:6px!important;min-height:22px!important;padding-right:48px!important;white-space:nowrap!important;overflow:hidden!important;}
    .cal-day-num{font-size:13px!important;font-weight:850!important;color:var(--t3)!important;line-height:1!important;}
    .cal-day-b.today .cal-day-num{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:25px!important;height:25px!important;border-radius:50%!important;background:var(--acc)!important;color:white!important;box-shadow:0 6px 16px rgba(45,106,79,.22)!important;}
    .cal-holiday-name{font-size:10px!important;font-weight:800!important;color:var(--amb)!important;background:rgba(245,158,11,.11)!important;border-radius:999px!important;padding:2px 6px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;max-width:calc(100% - 42px)!important;}
    .cal-points-badge,.challenge-points-badge{position:absolute!important;top:8px!important;right:7px!important;z-index:8!important;height:auto!important;min-width:0!important;width:auto!important;max-width:44px!important;border-radius:999px!important;padding:2px 6px!important;background:rgba(245,158,11,.12)!important;border:1px solid rgba(245,158,11,.18)!important;color:var(--amb)!important;font-size:10px!important;line-height:1.25!important;font-weight:950!important;box-shadow:none!important;writing-mode:horizontal-tb!important;transform:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;}
    .cal-points-badge.done,.challenge-points-badge.done{background:rgba(22,163,74,.12)!important;border-color:rgba(22,163,74,.18)!important;color:var(--grn)!important;}
    .challenge-day-dot{display:none!important;}
    .cal-kw-badge,.kw-badge-left{position:absolute!important;left:8px!important;bottom:7px!important;z-index:9!important;background:rgba(45,106,79,.11)!important;border:1px solid rgba(45,106,79,.18)!important;color:var(--acc)!important;border-radius:999px!important;padding:3px 7px!important;font-size:11px!important;line-height:1!important;font-weight:950!important;letter-spacing:.1px!important;}
    .cal-range-b{position:relative!important;grid-row:1!important;align-self:start!important;margin-top:calc(38px + var(--lane) * 24px)!important;height:21px!important;min-width:0!important;padding:0 7px!important;border-radius:0!important;border:1px solid rgba(45,106,79,.12)!important;display:flex!important;align-items:center!important;gap:5px!important;z-index:6!important;overflow:hidden!important;cursor:pointer!important;box-shadow:0 3px 9px rgba(16,24,40,.045)!important;}
    .cal-range-b.start{border-top-left-radius:10px!important;border-bottom-left-radius:10px!important;margin-left:6px!important;}
    .cal-range-b.end{border-top-right-radius:10px!important;border-bottom-right-radius:10px!important;margin-right:6px!important;}
    .cal-range-b.cont-left{border-left-color:transparent!important;}
    .cal-range-b.cont-right{border-right-color:transparent!important;}
    .cal-range-b.blue{background:rgba(66,133,244,.12)!important;color:#2f6fe8!important;border-color:rgba(66,133,244,.16)!important;}
    .cal-range-b.green{background:rgba(45,106,79,.12)!important;color:var(--acc)!important;border-color:rgba(45,106,79,.16)!important;}
    .cal-range-b.amber{background:rgba(245,158,11,.13)!important;color:var(--amb)!important;border-color:rgba(245,158,11,.18)!important;}
    .cal-range-b.red{background:rgba(239,68,68,.11)!important;color:var(--red)!important;border-color:rgba(239,68,68,.16)!important;}
    .cal-range-b.purple{background:rgba(139,92,246,.12)!important;color:var(--pur)!important;border-color:rgba(139,92,246,.16)!important;}
    .cal-range-title{font-size:11px!important;font-weight:850!important;line-height:1!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;}
    .cal-range-date{font-size:10px!important;font-weight:850!important;border-radius:999px!important;background:rgba(255,255,255,.45)!important;padding:1px 5px!important;white-space:nowrap!important;}
    .cal-gmark{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:14px!important;height:14px!important;border-radius:50%!important;flex:0 0 auto!important;background:rgba(66,133,244,.13)!important;color:#4285f4!important;font-size:9px!important;font-weight:950!important;margin-left:auto!important;}
    .cal-gmark.synced{background:rgba(22,163,74,.13)!important;color:var(--grn)!important;}
    .cal-gmark.big{width:30px!important;height:30px!important;font-size:14px!important;margin-left:0!important;}
    .google-detail-b{display:flex!important;align-items:center!important;gap:12px!important;border:1px solid var(--b1)!important;background:var(--s2)!important;border-radius:16px!important;padding:14px!important;margin-bottom:14px!important;}
    #month-grid.year-grid-option-b{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;padding:14px!important;background:var(--bg)!important;overflow:auto!important;}
    .year-month-card-b{background:var(--s1)!important;border:1px solid var(--b1)!important;border-radius:16px!important;padding:12px!important;cursor:pointer!important;box-shadow:0 4px 16px rgba(16,24,40,.04)!important;}
    .year-title-b{font-size:13px!important;font-weight:900!important;color:var(--t1)!important;margin-bottom:9px!important;}
    .year-mini-b{display:grid!important;grid-template-columns:repeat(7,1fr)!important;gap:3px!important;}
    .year-head-b{font-size:9px!important;font-weight:900!important;color:var(--t5)!important;text-align:center!important;}
    .year-day-b{position:relative!important;min-height:18px!important;border-radius:6px!important;font-size:10px!important;font-weight:750!important;color:var(--t4)!important;text-align:center!important;line-height:18px!important;}
    .year-day-b.today{background:var(--acc)!important;color:white!important;}
    .year-day-b i{position:absolute!important;left:50%!important;bottom:0!important;transform:translateX(-50%)!important;width:5px!important;height:5px!important;border-radius:50%!important;background:var(--acc)!important;}
    .year-day-b.holiday i{background:var(--amb)!important;}
    .year-day-b.event.holiday i{background:linear-gradient(90deg,var(--acc) 50%,var(--amb) 50%)!important;}
    @media(max-width:900px){#month-grid.year-grid-option-b{grid-template-columns:repeat(2,minmax(0,1fr))!important}.cal-range-date{display:none!important}}
    @media(max-width:640px){#month-grid.month-grid-option-b .cal-week-b,#month-grid.month-grid-option-b .cal-day-b{min-height:98px!important}.cal-range-b{height:19px!important;margin-top:calc(32px + var(--lane) * 21px)!important}.cal-holiday-name{display:none!important}.cal-kw-badge{font-size:9px!important;padding:2px 5px!important}}
  `;
  document.head.appendChild(style);
  setTimeout(() => { try{ window.renderCalendar(); }catch(e){ console.warn('Option-B calendar patch', e); } }, 80);
})();

/* ── user-final-calendar-fix ── */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const pad=n=>String(n).padStart(2,'0');
const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{ if(!s) return null; if(s instanceof Date) return new Date(s.getFullYear(),s.getMonth(),s.getDate()); const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); return m?new Date(+m[1],+m[2]-1,+m[3]):null; };
const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: inkl. backtick]
const monthNames=window.DE_MONTHS||['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function opts(){
  let def={showHolidays:true,showChallengeDots:true,showWeekNumbers:true};
  try{Object.assign(def,JSON.parse(localStorage.getItem('change_v1_calendar_view_options')||'{}')||{});}catch(e){}
  try{let x=JSON.parse(localStorage.getItem('calendar_settings')||'{}')||{}; ['showHolidays','showChallengeDots','showWeekNumbers'].forEach(k=>{ if(typeof x[k]==='boolean') def[k]=x[k]; });}catch(e){}
  return def;
}
function saveOpts(o){localStorage.setItem('change_v1_calendar_view_options',JSON.stringify(o));localStorage.setItem('calendar_settings',JSON.stringify(o));}
function weekNo(d){d=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const y=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-y)/86400000)+1)/7);}
function today(d){const n=new Date();return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate();}
function evRange(ev){let s=parse(ev.startDate||ev.date||ev.start?.date||ev.start?.dateTime);let e=parse(ev.endDate||ev.date||ev.end?.date||ev.end?.dateTime); if(ev.end&&ev.end.date&&e&&s&&key(e)>key(s)) e=add(e,-1); if(!s) s=new Date(); if(!e||e<s)e=s; return {s,e,sk:key(s),ek:key(e)};}
function allEvents(){
  let out=[];
  try{(window.events||events||[]).forEach(ev=>out.push(Object.assign({},ev,{source:ev.source||'local'})));}catch(e){}
  try{(window.gEvents||gEvents||[]).forEach(ge=>{const s=ge.start?.date||ge.start?.dateTime||ge.date; if(!s)return; let e=ge.end?.date||ge.end?.dateTime||s; out.push({id:'g_'+(ge.id||Math.random()),title:ge.summary||ge.title||'(Kein Titel)',startDate:String(s).slice(0,10),endDate:String(e).slice(0,10),date:String(s).slice(0,10),time:ge.start?.dateTime?String(new Date(ge.start.dateTime).toTimeString()).slice(0,5):'',color:'blue',type:'meeting',source:'google',googleEventId:ge.id});});}catch(e){}
  // dedupe by id/title/start/end
  const seen=new Set(); return out.filter(ev=>{const r=evRange(ev); const id=(ev.id||ev.googleEventId||ev.title)+'|'+r.sk+'|'+r.ek; if(seen.has(id))return false; seen.add(id); return true;});
}
function eventsOn(k){return allEvents().filter(ev=>{const r=evRange(ev);return r.sk<=k&&r.ek>=k;});}
function holidays(k){try{return (typeof getHolidaysForDate==='function'?getHolidaysForDate(k):[])||[]}catch(e){return[]}}
function points(k){let p=0;try{(window.challengeCompletions||challengeCompletions||[]).forEach(c=>{if(c&&c.date===k)p+=parseInt(c.points,10)||0;});}catch(e){} return p;}
function colorClass(ev){return ['blue','green','amber','red','purple'].includes(ev.color)?ev.color:'blue'}
function googleMark(ev){return ev.source==='google'||ev.googleEventId?'<span class="fx-g" title="Google Kalender">G</span>':(ev.syncedToGoogle?'<span class="fx-g ok" title="an Google übertragen">✓</span>':'')}
function cells(y,m){let first=new Date(y,m,1).getDay(); first=first===0?6:first-1; const dim=new Date(y,m+1,0).getDate(), pdim=new Date(y,m,0).getDate(), a=[]; for(let i=0;i<first;i++)a.push({d:pdim-first+1+i,m:m===0?11:m-1,y:m===0?y-1:y,other:true}); for(let d=1;d<=dim;d++)a.push({d,m,y,other:false}); while(a.length<42){const n=a.length-first-dim+1; a.push({d:n,m:m===11?0:m+1,y:m===11?y+1:y,other:true});} return a;}
function onDay(dt){try{ if(typeof onDayClick==='function') return onDayClick(dt,eventsOn(key(dt))); }catch(e){} }
function openEv(ev){try{ if(typeof openEventPanel==='function') return openEventPanel(ev.id); }catch(e){} }

window.renderYear=function(y){const grid=$('month-grid'),o=opts(); if(!grid)return; grid.className='fx-year'; grid.style.display='grid'; grid.innerHTML=''; for(let m=0;m<12;m++){const card=document.createElement('button'); card.type='button'; card.className='fx-year-card'; card.onclick=()=>{window.curDate=curDate=new Date(y,m,1); window.currentCalView=currentCalView='month'; window.renderCalendar();}; let html='<div class="fx-year-title">'+monthNames[m]+'</div><div class="fx-year-days">'; ['M','D','M','D','F','S','S'].forEach(x=>html+='<b>'+x+'</b>'); let first=new Date(y,m,1).getDay(); first=first===0?6:first-1; for(let i=0;i<first;i++)html+='<span></span>'; const dim=new Date(y,m+1,0).getDate(); for(let d=1;d<=dim;d++){const k=key(new Date(y,m,d)), hasE=eventsOn(k).length, hasH=holidays(k).length; html+='<span class="'+(today(new Date(y,m,d))?'today ':'')+(hasE?'ev ':'')+(hasH&&o.showHolidays?'hol ':'')+'">'+d+((hasE||(hasH&&o.showHolidays))?'<i></i>':'')+'</span>'; } card.innerHTML=html+'</div>'; grid.appendChild(card);} };
window.renderCalendar=function(){const y=curDate.getFullYear(),m=curDate.getMonth(); const ml=$('month-label'), grid=$('month-grid'), ag=$('agenda-view'), wd=$('wday-row'); if(ml)ml.textContent=(currentCalView==='year'?String(y):monthNames[m]+' '+y); ['year','month','workweek','today'].forEach(v=>$('vbtn-'+v)?.classList.toggle('active',currentCalView===v)); if(ag)ag.style.display='none'; if(wd)wd.style.display=currentCalView==='year'?'none':'grid'; if(currentCalView==='year')window.renderYear(y); else window.renderMonth(y,m); if(grid)grid.style.display='grid';};
window.setCalView=function(v){currentCalView=(v==='today')?'month':v; if(v==='today')curDate=new Date(); window.renderCalendar();};
window.goToday=function(){curDate=new Date(); currentCalView='month'; window.renderCalendar();};
window.navigate=function(dir){ if(currentCalView==='year')curDate=new Date(curDate.getFullYear()+dir,0,1); else curDate=new Date(curDate.getFullYear(),curDate.getMonth()+dir,1); window.renderCalendar();};
window.openCalendarSettings=function(){const o=opts(); const states=window.STATE_OPTIONS||(typeof STATE_OPTIONS!=='undefined'?STATE_OPTIONS:{ALL:'Alle Bundesländer',BW:'Baden-Württemberg',BY:'Bayern','BY-AUGSBURG':'Bayern · Augsburg',BE:'Berlin',BB:'Brandenburg',HB:'Bremen',HH:'Hamburg',HE:'Hessen',MV:'Mecklenburg-Vorpommern',NI:'Niedersachsen',NW:'Nordrhein-Westfalen',RP:'Rheinland-Pfalz',SL:'Saarland',SN:'Sachsen',ST:'Sachsen-Anhalt',SH:'Schleswig-Holstein',TH:'Thüringen'}); const st=(window.calendarSettings&&calendarSettings.state)||localStorage.getItem('holiday_state')||'ALL'; const options=Object.entries(states).map(([k,v])=>'<option value="'+k+'" '+(k===st?'selected':'')+'>'+esc(v)+'</option>').join(''); const sw=(title,id,on)=>'<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">'+title+'</div></div><label class="switch"><input type="checkbox" id="'+id+'" '+(on?'checked':'')+'><span class="slider"></span></label></div>'; const html='<div class="fg"><label class="flabel">Bundesland für Feiertage</label><select class="finput" id="holiday-state">'+options+'</select></div>'+sw('Feiertage anzeigen','toggle-holidays',o.showHolidays)+sw('Challenge-Punkte anzeigen','toggle-dots',o.showChallengeDots)+sw('Kalenderwochen anzeigen','toggle-kw',o.showWeekNumbers)+'<button class="btn btn-primary btn-full" onclick="saveCalSettings()">Speichern</button>'; if(typeof openPanel==='function')openPanel('Kalender-Einstellungen',html);};
window.saveCalSettings=function(){const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked}; saveOpts(o); try{if(!window.calendarSettings)window.calendarSettings={}; calendarSettings.state=$('holiday-state')?.value||'ALL'; if(typeof ls==='function'){ls('holiday_state',calendarSettings.state); localStorage.setItem('change_v1_holiday_state',calendarSettings.state);} else {localStorage.setItem('holiday_state',JSON.stringify(calendarSettings.state)); localStorage.setItem('change_v1_holiday_state',calendarSettings.state);}}catch(e){} if(typeof closePanel==='function')closePanel(); window.renderCalendar(); if(typeof toast==='function')toast('Kalender-Einstellungen gespeichert ✓','ok');};
const css=document.createElement('style'); css.id='user-final-calendar-fix-css'; css.textContent=`
#month-grid.fx-month{display:grid!important;grid-template-rows:repeat(6,minmax(112px,1fr))!important;background:var(--b1);gap:1px;overflow:hidden}
.fx-week{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr));position:relative;min-height:112px;background:var(--bg)}
.fx-day{position:relative;grid-row:1;min-width:0;background:var(--s0,#fff);padding:8px 8px 22px 8px;overflow:hidden;border:0!important;cursor:pointer}.fx-day.weekend{background:rgba(0,0,0,.015)}.fx-day.other{opacity:.45}.fx-day.is-today:after{content:'';position:absolute;inset:3px;border:1px solid rgba(45,106,79,.24);border-radius:12px;pointer-events:none}.fx-day-head{display:flex;align-items:center;gap:6px;height:20px;min-width:0;padding-right:46px}.fx-num{font-size:13px;font-weight:850;color:var(--t2)}.fx-day.is-today .fx-num{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--acc);color:#fff}.fx-holiday{font-size:10px;font-weight:800;color:var(--amb);background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.16);border-radius:999px;padding:1px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 32px)}
.fx-points{position:absolute!important;right:7px!important;bottom:6px!important;top:auto!important;left:auto!important;width:auto!important;height:auto!important;min-width:0!important;max-width:52px!important;z-index:8!important;font-size:10px!important;line-height:1!important;font-weight:900!important;color:var(--grn)!important;background:rgba(52,211,153,.13)!important;border:1px solid rgba(52,211,153,.22)!important;border-radius:999px!important;padding:3px 6px!important;box-shadow:none!important;writing-mode:horizontal-tb!important;transform:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;pointer-events:none!important}
.fx-kw{position:absolute;left:7px;bottom:6px;z-index:7;font-size:10px;font-weight:950;color:var(--acc);background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.20);border-radius:999px;padding:3px 7px;pointer-events:none}.fx-event{position:relative;grid-row:1;align-self:start;margin-top:calc(34px + var(--lane)*24px);height:20px;line-height:20px;z-index:5;border:1px solid rgba(59,130,246,.18);border-radius:0;background:rgba(59,130,246,.12);color:#2563eb;padding:0 7px;display:flex;align-items:center;gap:5px;overflow:hidden;min-width:0;cursor:pointer;box-shadow:none}.fx-event.start{border-top-left-radius:9px;border-bottom-left-radius:9px}.fx-event.end{border-top-right-radius:9px;border-bottom-right-radius:9px}.fx-event.green{background:rgba(52,211,153,.13);border-color:rgba(52,211,153,.22);color:var(--grn)}.fx-event.amber{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.20);color:var(--amb)}.fx-event.red{background:rgba(239,68,68,.10);border-color:rgba(239,68,68,.18);color:var(--red)}.fx-event.purple{background:rgba(124,58,237,.10);border-color:rgba(124,58,237,.18);color:var(--pur)}.fx-title{font-size:11px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fx-range{font-size:10px;font-weight:800;opacity:.75;white-space:nowrap}.fx-g{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;font-size:8px;font-weight:950;color:#4285f4;background:rgba(66,133,244,.12);flex:0 0 auto}.fx-g.ok{color:var(--grn);background:rgba(52,211,153,.14)}
#month-grid.fx-year{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:14px;background:var(--bg)}.fx-year-card{background:var(--s1);border:1px solid var(--b1);border-radius:16px;padding:12px;text-align:left;cursor:pointer}.fx-year-title{font-weight:900;margin-bottom:8px;color:var(--t2)}.fx-year-days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.fx-year-days b{font-size:9px;color:var(--t5);text-align:center}.fx-year-days span{position:relative;font-size:10px;color:var(--t4);text-align:center;height:18px;line-height:18px;border-radius:6px}.fx-year-days span.today{background:var(--acc);color:#fff}.fx-year-days span i{position:absolute;left:50%;transform:translateX(-50%);bottom:0;width:5px;height:5px;border-radius:50%;background:var(--acc)}.fx-year-days span.hol i{background:var(--amb)}.fx-year-days span.ev.hol i{background:linear-gradient(90deg,var(--acc) 50%,var(--amb) 50%)}
/* alten kaputten Challenge-Säulen/Badges sicher verstecken, wenn sie irgendwo noch übrig sind */
.month-grid-clean .challenge-points-badge,.clean-range-row .challenge-points-badge,.cal-points-badge{display:none!important}
`; document.head.appendChild(css);
setTimeout(()=>{try{window.renderCalendar()}catch(e){console.warn('final calendar fix',e)}},0);
})();

/* ── daypanel-range-final-fix ── */
/* ==== final fix: day detail includes multi-day range events ==== */
(function(){
  'use strict';
  const pad=n=>String(n).padStart(2,'0');
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: inkl. backtick]
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

/* ── range-google-final-fix ── */
/* RANGE DATES + GOOGLE SOURCE MARKERS */
(function(){
  function escX(s){return (typeof esc==='function')?esc(s):String(s||'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
  function dk(d){return (typeof dateKey==='function')?dateKey(d):d.toISOString().substring(0,10);}
  function addD(d,n){return (typeof addDays==='function')?addDays(d,n):new Date(d.getTime()+n*86400000);}
  function startOf(ev){return ev?.startDate||ev?.date||ev?.dateKey||(ev?.start?.date)||(ev?.start?.dateTime?String(ev.start.dateTime).substring(0,10):'');}
  function endOf(ev){if(ev?.endDate)return ev.endDate;if(ev?.toDate)return ev.toDate;if(ev?.untilDate)return ev.untilDate;if(ev?.end?.date)return dk(addD(new Date(ev.end.date+'T12:00:00'),-1));if(ev?.end?.dateTime)return String(ev.end.dateTime).substring(0,10);return startOf(ev);}
  function datesBetween(a,b){if(!a)return[];if(!b||b<a)b=a;const out=[];let cur=new Date(a+'T12:00:00'),end=new Date(b+'T12:00:00'),guard=0;while(cur<=end&&guard<370){out.push(dk(cur));cur=addD(cur,1);guard++;}return out;}
  function titleOf(ev){return ev?.title||ev?.summary||ev?.name||'(Kein Titel)';}
  function timeOf(ev){if(ev?.time)return ev.time;if(ev?.start?.dateTime)return new Date(ev.start.dateTime).toTimeString().substring(0,5);return '';}
  function endTimeOf(ev){if(ev?.endTime)return ev.endTime;if(ev?.end?.dateTime)return new Date(ev.end.dateTime).toTimeString().substring(0,5);return '';}
  function expandOne(ev,source){const s=startOf(ev),e=endOf(ev)||s,arr=[];datesBetween(s,e).forEach(day=>{arr.push(Object.assign({},ev,{id:source==='google'?(String(ev.id||'').startsWith('g_')?ev.id:'g_'+ev.id):ev.id,title:titleOf(ev),date:day,startDate:s,endDate:e,time:timeOf(ev),endTime:endTimeOf(ev),color:ev.color||(source==='google'?'blue':'blue'),type:ev.type||'meeting',desc:ev.desc||ev.description||'',allDay:ev.allDay!==undefined?ev.allDay:!timeOf(ev),source,isRange:e>s,isRangeStart:day===s,isRangeEnd:day===e}));});return arr;}
  window.getAllEvents=function(){const out=[];(window.events||[]).forEach(ev=>out.push(...expandOne(ev,ev.source==='google'?'google':'local')));(window.gEvents||[]).forEach(ge=>out.push(...expandOne(ge,'google')));return out.filter(e=>e.date);};
  window.getEventById=function(id){const plain=String(id||'').replace(/__\d{4}-\d{2}-\d{2}$/,'');return (window.events||[]).find(e=>e.id===plain||e.id===id)||getAllEvents().find(e=>e.id===id||e.id===plain);};
  const baseOpen=window.openEventPanel;
  window.openEventPanel=function(id,preDate){const ev=id?getEventById(id):null;if(ev?.source==='google'){const range=(ev.endDate&&ev.endDate!==ev.startDate)?(fmtDate(ev.startDate)+' – '+fmtDate(ev.endDate)):fmtDate(ev.date||ev.startDate);openPanel(ev.title,'<div style="background:var(--acc-d);border:1px solid rgba(79,125,255,.2);border-radius:var(--r);padding:12px 14px;margin-bottom:14px"><div style="font-size:11px;font-weight:800;color:var(--acc);margin-bottom:4px">📅 Von Google übertragen</div><div style="font-size:14px;font-weight:800;color:var(--t1);margin-bottom:4px">'+escX(ev.title)+'</div><div style="font-size:12px;color:var(--t4)">'+range+(ev.time?' · '+ev.time:'')+'</div>'+(ev.desc?'<div style="font-size:12px;color:var(--t3);margin-top:8px;line-height:1.5">'+escX(ev.desc)+'</div>':'')+'</div><button class="btn btn-ghost btn-full" onclick="closePanel()">Schließen</button>');return;}if(typeof baseOpen==='function')baseOpen(id,preDate);};
  function badge(ev){let p='';if(ev.isRange)p+='<span class="range-pill">'+escX(fmtDate(ev.startDate))+'–'+escX(fmtDate(ev.endDate))+'</span>';if(ev.source==='google')p+='<span class="source-pill">von Google</span>';else if(ev.googleEventId||ev.syncedToGoogle)p+='<span class="source-pill synced">Google ✓</span>';return p;}
  window.rangeSourceBadge=badge;
  const oldBuild=window.buildDashCards;
  window.buildDashCards=function(){if(typeof oldBuild==='function')oldBuild();setTimeout(()=>{document.querySelectorAll('.dash-row').forEach(row=>{const title=row.querySelector('.dash-row-title')?.textContent||'';const ev=getAllEvents().find(e=>e.title===title);if(ev){const t=row.querySelector('.dash-row-title'); if(t&&!t.querySelector('.source-pill,.range-pill'))t.insertAdjacentHTML('beforeend',badge(ev));}});},0);};
  const oldRenderCal=window.renderCalendar;
  window.renderCalendar=function(){if(typeof oldRenderCal==='function')oldRenderCal.apply(this,arguments);setTimeout(()=>{document.querySelectorAll('.ev-chip,.ag-card').forEach(el=>{const text=(el.textContent||'').trim();const ev=getAllEvents().find(e=>text.includes(e.title));if(ev){if(ev.source==='google')el.classList.add('google-source');if(ev.googleEventId||ev.syncedToGoogle)el.classList.add('synced-source');if(!el.querySelector('.source-pill,.range-pill'))el.insertAdjacentHTML('beforeend',badge(ev));}});},0);};
  const oldSave=window.saveEvent;
  window.saveEvent=function(existingId){if(typeof oldSave==='function')oldSave(existingId);try{const id=existingId||((window.events||[]).at(-1)||{}).id;const ev=(window.events||[]).find(e=>e.id===id);if(ev){ev.startDate=ev.date||ev.startDate;ev.endDate=(ev.endDate&&ev.endDate>=ev.startDate)?ev.endDate:ev.startDate;if(ev.googleEventId)ev.syncedToGoogle=true;ls('events',window.events);}}catch(e){}};

  // range syncLocalEventToGoogle override
  window.syncLocalEventToGoogle=async function(ev){
    if(!accessToken||isDemoMode||!ev||ev.source==='google')return;
    const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
    const start=ev.startDate||ev.date, endDate=(ev.endDate&&ev.endDate>=start)?ev.endDate:start;
    const body={summary:ev.title,description:ev.desc||'',start:ev.time?{dateTime:start+'T'+ev.time+':00',timeZone:tz}:{date:start},end:ev.time?{dateTime:endDate+'T'+(ev.endTime||ev.time)+':00',timeZone:tz}:{date:addDays(new Date(endDate+'T12:00:00'),1).toISOString().substring(0,10)}};
    try{const url=ev.googleEventId?'https://www.googleapis.com/calendar/v3/calendars/primary/events/'+encodeURIComponent(ev.googleEventId):'https://www.googleapis.com/calendar/v3/calendars/primary/events';const r=await fetch(url,{method:ev.googleEventId?'PATCH':'POST',headers:{'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('Google Kalender '+r.status);const saved=await r.json();const i=events.findIndex(e=>e.id===ev.id);if(i>=0){events[i].googleEventId=saved.id;events[i].syncedToGoogle=true;ls('events',events);try{persistChangeState();}catch(e){}}loadGoogleEvents();}catch(e){console.warn('Auto Google Sync:',e);toast('Google Kalender-Sync fehlgeschlagen','err');}
  };

  setTimeout(()=>{try{if(typeof buildDashboard==='function')buildDashboard();if(typeof renderCalendar==='function')renderCalendar();}catch(e){}},300);
})();

/* ── FINAL-STABLE-CALENDAR-STACKED-FIX ── */
(function(){
  const DAY=86400000;
  const $=id=>document.getElementById(id);
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: +backtick]
  const key=d=>{try{return typeof dateKey==='function'?dateKey(d):new Date(d).toISOString().slice(0,10)}catch(e){return ''}};
  const parse=k=>new Date(String(k).slice(0,10)+'T12:00:00');
  const add=(d,n)=>new Date(d.getTime()+n*DAY);
  const monthNames=window.DE_MONTHS||['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  function loadOpts(){let o={showHolidays:true,showChallengeDots:true,showWeekNumbers:true};['calendar_settings','change_v1_calendar_view_options'].forEach(k=>{try{Object.assign(o,JSON.parse(localStorage.getItem(k)||'{}')||{})}catch(e){}});return o;}
  function saveOpts(o){try{localStorage.setItem('calendar_settings',JSON.stringify(o));localStorage.setItem('change_v1_calendar_view_options',JSON.stringify(o));}catch(e){}}
  function holidays(k){try{return (typeof getHolidaysForDate==='function'?getHolidaysForDate(k):[])||[]}catch(e){return[]}}
  function weekNo(dt){let d=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate()));let day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);let y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-y0)/DAY)+1)/7)}
  function normEvent(ev){
    let start=ev.startDate||ev.date||ev.start?.date||ev.start?.dateTime?.slice(0,10)||'';
    let end=ev.endDate||ev.date||ev.end?.date||ev.end?.dateTime?.slice(0,10)||start;
    if(ev.end?.date && end>start) end=key(add(parse(end),-1));
    if(!end||end<start) end=start;
    return Object.assign({},ev,{date:start,startDate:start,endDate:end,title:ev.title||ev.summary||'(Kein Titel)',time:ev.time||(ev.start?.dateTime?new Date(ev.start.dateTime).toTimeString().slice(0,5):''),source:ev.source||''});
  }
  function allEvents(){
    const out=[];
    try{(window.events||[]).forEach(e=>{if(e) out.push(normEvent(e));});}catch(e){}
    try{(window.gEvents||[]).forEach(g=>{if(!g)return;const n=normEvent(g);out.push(Object.assign(n,{id:String(g.id||'').startsWith('g_')?g.id:'g_'+g.id,source:'google',color:g.color||'blue',title:g.summary||g.title||'(Kein Titel)',googleEventId:g.id}));});}catch(e){}
    return out.filter(e=>e.startDate);
  }
  window.getAllEvents=allEvents;
  function eventsOn(k){return allEvents().filter(e=>e.startDate<=k&&e.endDate>=k).sort((a,b)=>(a.startDate||'').localeCompare(b.startDate||'')||(a.time||'99:99').localeCompare(b.time||'99:99')||(a.title||'').localeCompare(b.title||''));}
  function pointsOn(k){let s=0;try{(window.challengeCompletions||[]).forEach(c=>{if(c&&c.date===k)s+=parseInt(c.points,10)||0;});}catch(e){}return s;}
  function googleMark(e){return e.source==='google'?'<span class="cal-g" title="von Google">G</span>':((e.googleEventId||e.syncedToGoogle)?'<span class="cal-g ok" title="an Google übertragen">✓</span>':'');}
  function rangeText(e,k){if(e.startDate!==e.endDate && k===e.startDate){return '<span class="cal-range-text">'+esc((typeof fmtDate==='function'?fmtDate(e.startDate):e.startDate).replace(/\.20\d\d$/,''))+'–'+esc((typeof fmtDate==='function'?fmtDate(e.endDate):e.endDate).replace(/\.20\d\d$/,''))+'</span>'}return '';}

  

  window.renderYear=function(y){const grid=$('month-grid'),o=loadOpts(); if(!grid)return; grid.className='year-grid-stacked'; grid.style.display='grid'; grid.style.gridTemplateRows='none'; grid.innerHTML=''; for(let m=0;m<12;m++){const card=document.createElement('button'); card.type='button'; card.className='year-card-stacked'; card.onclick=()=>{window.curDate=curDate=new Date(y,m,1); window.currentCalView=currentCalView='month'; window.renderCalendar();}; let first=new Date(y,m,1).getDay(); first=first===0?6:first-1; let html='<div class="year-title-stacked">'+monthNames[m]+'</div><div class="year-days-stacked">'; ['M','D','M','D','F','S','S'].forEach(x=>html+='<b>'+x+'</b>'); for(let i=0;i<first;i++)html+='<span></span>'; const dim=new Date(y,m+1,0).getDate(); for(let d=1;d<=dim;d++){const dt=new Date(y,m,d),k=key(dt),hasE=eventsOn(k).length>0,hasH=o.showHolidays&&holidays(k).length>0; html+='<span class="'+((typeof isToday==='function'&&isToday(dt))?'today ':'')+(hasE?'has-event ':'')+(hasH?'has-holiday ':'')+'">'+d+((hasE||hasH)?'<i></i>':'')+'</span>'; } card.innerHTML=html+'</div>'; grid.appendChild(card);}};

  window.renderCalendar=function(){const y=curDate.getFullYear(),m=curDate.getMonth(),ml=$('month-label'),grid=$('month-grid'),ag=$('agenda-view'),wd=$('wday-row'); if(ml)ml.textContent=currentCalView==='year'?String(y):monthNames[m]+' '+y; ['year','month','workweek','today'].forEach(v=>$('vbtn-'+v)?.classList.toggle('active',currentCalView===v)); if(ag)ag.style.display='none'; if(currentCalView==='year'){if(wd)wd.style.display='none'; renderYear(y);}else{if(wd)wd.style.display='grid'; renderMonth(y,m);} if(grid)grid.style.display='grid';};
  window.setCalView=function(v){window.currentCalView=currentCalView=v;renderCalendar();};
  window.navigate=function(dir){if(currentCalView==='year')window.curDate=curDate=new Date(curDate.getFullYear()+dir,0,1);else window.curDate=curDate=new Date(curDate.getFullYear(),curDate.getMonth()+dir,1);renderCalendar();};
  window.goToday=function(){window.curDate=curDate=new Date();window.currentCalView=currentCalView='month';renderCalendar();};

  window.openCalendarSettings=function(){const o=loadOpts(); const states=window.STATE_OPTIONS||(typeof STATE_OPTIONS!=='undefined'?STATE_OPTIONS:{ALL:'Alle Bundesländer'}); const st=(window.calendarSettings&&calendarSettings.state)||localStorage.getItem('holiday_state')||'ALL'; const opts=Object.entries(states).map(([k,v])=>'<option value="'+esc(k)+'" '+(k===st?'selected':'')+'>'+esc(v)+'</option>').join(''); const row=(title,id,on,sub)=>'<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">'+title+'</div>'+(sub?'<div class="toggle-sub">'+sub+'</div>':'')+'</div><label class="switch"><input type="checkbox" id="'+id+'" '+(on?'checked':'')+'><span class="slider"></span></label></div>'; const html='<div class="fg"><label class="flabel">Bundesland für Feiertage</label><select class="finput" id="holiday-state">'+opts+'</select></div>'+row('Feiertage anzeigen','toggle-holidays',o.showHolidays,'Neben der Tageszahl, ohne Terminüberlappung.')+row('Challenge-Punkte anzeigen','toggle-dots',o.showChallengeDots,'Nur klein rechts unten am jeweiligen Tag.')+row('Kalenderwochen anzeigen','toggle-kw',o.showWeekNumbers,'Deutlich links unten pro Woche.')+'<button class="btn btn-primary btn-full" onclick="saveCalSettings()">Speichern</button>'; if(typeof openPanel==='function')openPanel('Kalender-Einstellungen',html);};
  window.saveCalSettings=function(){const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked}; saveOpts(o); try{if(!window.calendarSettings)window.calendarSettings={}; calendarSettings.state=$('holiday-state')?.value||'ALL'; if(typeof ls==='function'){ls('holiday_state',calendarSettings.state); localStorage.setItem('change_v1_holiday_state',calendarSettings.state);} else {localStorage.setItem('holiday_state',JSON.stringify(calendarSettings.state)); localStorage.setItem('change_v1_holiday_state',calendarSettings.state);}}catch(e){} if(typeof closePanel==='function')/* no close */
renderCalendar(); if(typeof toast==='function')toast('Kalender-Einstellungen gespeichert ✓','ok');};

  const style=document.createElement('style'); style.id='final-stacked-calendar-style'; style.textContent=`
    .range-bar,.fx-range,.clean-range-row>.range-bar{display:none!important}.h-actions,.h-cal-controls{position:relative;z-index:50}.icon-btn[title*="Kalender"]{pointer-events:auto!important;position:relative;z-index:60}
    #month-grid.month-grid-stacked{overflow:hidden!important;background:#fff!important}.cal-week-stacked{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr));min-height:118px;border-bottom:1px solid var(--b1);position:relative}.cal-day-stacked{position:relative;min-width:0;padding:7px 8px 22px;background:#fff;border-right:1px solid var(--b1);overflow:hidden;cursor:pointer}.cal-day-stacked.weekend{background:#faf9f6}.cal-day-stacked.other{opacity:.45}.cal-day-stacked.today{box-shadow:inset 0 0 0 1px rgba(45,106,79,.28);background:#fbfffd}.cal-day-head{display:flex;align-items:center;gap:6px;min-height:23px;padding-right:42px;min-width:0}.cal-day-num{font-size:13px;font-weight:850;color:var(--t2);line-height:1}.cal-day-stacked.today .cal-day-num{display:inline-flex;align-items:center;justify-content:center;width:23px;height:23px;border-radius:50%;background:var(--acc);color:white}.cal-holiday-inline{font-size:10px;font-weight:800;color:#c76a00;background:rgba(245,158,11,.11);border:1px solid rgba(245,158,11,.18);border-radius:999px;padding:2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 34px)}.cal-event-stack{display:flex;flex-direction:column;gap:3px;margin-top:5px;padding-right:2px}.cal-event-chip{height:20px;border:1px solid rgba(59,130,246,.18);background:rgba(59,130,246,.10);color:#2563eb;border-radius:7px;padding:0 6px;display:flex;align-items:center;gap:4px;min-width:0;text-align:left;font-size:11px;font-weight:750;line-height:18px;cursor:pointer}.cal-event-chip.green{background:rgba(22,163,74,.10);border-color:rgba(22,163,74,.18);color:#15803d}.cal-event-chip.amber{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.20);color:#b45309}.cal-event-chip.red{background:rgba(239,68,68,.10);border-color:rgba(239,68,68,.18);color:#dc2626}.cal-event-chip.purple{background:rgba(124,58,237,.10);border-color:rgba(124,58,237,.18);color:#6d28d9}.cal-event-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.cal-range-text{font-size:9px;font-weight:850;opacity:.8;white-space:nowrap}.cal-g{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;font-size:8px;font-weight:900;color:#4285f4;background:rgba(66,133,244,.13);flex:0 0 auto}.cal-g.ok{color:var(--grn);background:var(--grn-d)}.cal-more{font-size:10px;font-weight:800;color:var(--t3);padding:1px 6px}.cal-points{position:absolute;right:7px;bottom:5px;z-index:8;font-size:10px;font-weight:900;color:var(--grn);background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.24);border-radius:999px;padding:2px 6px;line-height:1}.cal-kw{position:absolute;left:7px;bottom:5px;z-index:8;font-size:10.5px;font-weight:900;color:var(--acc);background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.20);border-radius:999px;padding:2px 7px}.year-grid-stacked{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;padding:14px!important;overflow:auto!important}.year-card-stacked{background:#fff;border:1px solid var(--b1);border-radius:14px;padding:10px;text-align:left;cursor:pointer}.year-title-stacked{font-weight:850;font-size:13px;margin-bottom:7px}.year-days-stacked{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.year-days-stacked b,.year-days-stacked span{height:18px;font-size:9px;color:var(--t4);display:flex;align-items:center;justify-content:center;position:relative}.year-days-stacked span.today{background:var(--acc);color:white;border-radius:50%}.year-days-stacked span i{position:absolute;bottom:0;width:5px;height:5px;border-radius:50%;background:var(--acc)}.year-days-stacked span.has-holiday i{background:#f59e0b}.year-days-stacked span.has-event.has-holiday i{background:linear-gradient(90deg,var(--acc) 50%,#f59e0b 50%)}@media(max-width:800px){.cal-week-stacked{min-height:105px}.year-grid-stacked{grid-template-columns:1fr!important}.cal-holiday-inline{max-width:58px}.cal-event-chip{font-size:10px;padding:0 4px}}
  `; document.head.appendChild(style);
  document.addEventListener('click',function(e){const btn=e.target.closest('[title="Kalender-Einstellungen"], .icon-btn'); if(btn && (btn.getAttribute('title')||'').includes('Kalender')){e.preventDefault();e.stopPropagation();openCalendarSettings();}},true);
  setTimeout(()=>{try{renderCalendar()}catch(e){console.warn('final stacked calendar render failed',e)}},80);
})();

/* ── day-detail-panel-for-every-day-final ── */
<!-- patched-daypanel-range-merge-2026-05-01 -->
(function(){
  'use strict';
  const DAY=86400000;
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: inkl. backtick]
  const pad=n=>String(n).padStart(2,'0');
  function dkey(d){
    if(typeof d==='string') return d.slice(0,10);
    const x=new Date(d); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());
  }
  function parse(k){ return new Date(String(k).slice(0,10)+'T12:00:00'); }
  function fmt(k){ try{ if(typeof fmtDate==='function') return fmtDate(k); }catch(e){} const d=parse(k); return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear(); }
  function weekday(k){ const names=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']; return names[parse(k).getDay()]; }
  function rangeOf(ev){
    let s=ev?.startDate||ev?.date||ev?.dateKey||ev?.start?.date||(ev?.start?.dateTime?String(ev.start.dateTime).slice(0,10):'')||'';
    let e=ev?.endDate||ev?.date||ev?.dateKey||ev?.end?.date||(ev?.end?.dateTime?String(ev.end.dateTime).slice(0,10):'')||s;
    if(ev?.end?.date && e>s){ const x=parse(e); x.setDate(x.getDate()-1); e=dkey(x); }
    if(!e || e<s) e=s;
    return {start:s,end:e};
  }
  function titleOf(ev){ return ev?.title||ev?.summary||ev?.name||'Termin'; }
  function timeOf(ev){ return ev?.time||(ev?.start?.dateTime?new Date(ev.start.dateTime).toTimeString().slice(0,5):''); }
  function endTimeOf(ev){ return ev?.endTime||(ev?.end?.dateTime?new Date(ev.end.dateTime).toTimeString().slice(0,5):''); }
  function timeRangeOf(ev){ const a=timeOf(ev), b=endTimeOf(ev); return a?(a+(b&&b!==a?' – '+b:'')+' Uhr'):''; }
  function googleBadge(ev){
    if(ev?.source==='google' || String(ev?.id||'').startsWith('g_')) return '<span class="day-google-dot" title="von Google">G</span>';
    if(ev?.googleEventId || ev?.syncedToGoogle || ev?.googleSyncedAt) return '<span class="day-google-dot synced" title="an Google übertragen">✓</span>';
    return '';
  }
  function allEventsRaw(){
    let arr=[];
    try{ if(Array.isArray(window.events)) arr=arr.concat(window.events); }catch(e){}
    try{ if(Array.isArray(window.gEvents)) arr=arr.concat(window.gEvents.map(ge=>({id:String(ge.id||'').startsWith('g_')?ge.id:'g_'+ge.id,title:ge.summary||ge.title||'(Kein Titel)',date:ge.start?.date||String(ge.start?.dateTime||'').slice(0,10),startDate:ge.start?.date||String(ge.start?.dateTime||'').slice(0,10),endDate:ge.end?.date||String(ge.end?.dateTime||'').slice(0,10),time:ge.start?.dateTime?new Date(ge.start.dateTime).toTimeString().slice(0,5):'',endTime:ge.end?.dateTime?new Date(ge.end.dateTime).toTimeString().slice(0,5):'',desc:ge.description||'',source:'google',googleEventId:ge.id,color:'blue'}))); }catch(e){}
    try{ if(!arr.length && typeof window.getAllEvents==='function') arr=window.getAllEvents(); }catch(e){}
    const seen=new Set();
    return arr.filter(ev=>{ const r=rangeOf(ev); if(!r.start) return false; const id=(ev.id||titleOf(ev))+'|'+r.start+'|'+r.end; if(seen.has(id)) return false; seen.add(id); return true; });
  }
  function eventsForDate(k,pre){
    // Tagespanel immer aus allen Terminen + uebergebener Tagesliste bauen.
    // Sonst fehlen mehrtaegige Termine am letzten/inneren Tag, wenn die Klickliste unvollstaendig ist.
    const merged=[...allEventsRaw(), ...(Array.isArray(pre)?pre:[])];
    const list=merged.filter(ev=>{ const r=rangeOf(ev); return r.start<=k && r.end>=k; });
    const seen=new Set();
    return list.filter(ev=>{ const r=rangeOf(ev); const id=(ev.googleEventId?'g:'+ev.googleEventId:(ev.id||titleOf(ev)))+'|' + r.start + '|' + r.end; if(seen.has(id)) return false; seen.add(id); return true; })
      .sort((a,b)=>{ const ar=rangeOf(a), br=rangeOf(b); const aRange=ar.start!==ar.end, bRange=br.start!==br.end; return (bRange-aRange) || (timeOf(a)||'99:99').localeCompare(timeOf(b)||'99:99') || titleOf(a).localeCompare(titleOf(b)); });
  }
  function holidaysForDate(k){ try{ return (typeof window.getHolidaysForDate==='function'?window.getHolidaysForDate(k):getHolidaysForDate(k))||[]; }catch(e){ return []; } }
  function openNewFor(k){ if(typeof window.openEventPanel==='function') window.openEventPanel(null,parse(k)); }
  window.openDayPanel=function(dt,dayEvs){
    const k=dkey(dt);
    const evs=eventsForDate(k,dayEvs);
    const hols=holidaysForDate(k);
    const title = evs.length ? (evs.length+' '+(evs.length===1?'Termin':'Termine')) : (hols.length ? (hols.length===1?'Feiertag':'Feiertage') : 'Tag');
    let html='<div class="day-detail-date">'+esc(weekday(k)+', '+fmt(k))+'</div>';
    if(hols.length){
      html+='<div class="day-detail-holidays">'+hols.map(h=>'<div class="day-detail-holiday"><span>🎉</span><div><b>'+esc(h.name)+'</b><small>Feiertag</small></div></div>').join('')+'</div>';
    }
    if(evs.length){
      html+='<div class="day-detail-list">'+evs.map(ev=>{ const r=rangeOf(ev); const isRange=r.start!==r.end; const sub=isRange?(fmt(r.start)+' – '+fmt(r.end)):(fmt(k)); return '<div class="day-detail-event" onclick="openEventPanel(\''+esc(ev.id||'')+'\')"><div class="day-detail-time">'+(timeRangeOf(ev)||'Ganztägig')+'</div><div class="day-detail-main"><div class="day-detail-title">'+esc(titleOf(ev))+googleBadge(ev)+'</div><div class="day-detail-sub">'+esc(sub)+'</div></div></div>'; }).join('')+'</div>';
    }else{
      html+='<div class="day-detail-empty">Keine Termine für diesen Tag</div>';
    }
    html+='<button class="btn btn-primary btn-full day-detail-add" onclick="window.__openNewEventForDay&&window.__openNewEventForDay(\''+k+'\')">+ Neuer Termin für diesen Tag</button>';
    window.__openNewEventForDay=openNewFor;
    if(typeof window.openPanel==='function') window.openPanel(title,html);
  };
  window.onDayClick=function(dt,dayEvs){ window.openDayPanel(dt,dayEvs||[]); };
  const st=document.createElement('style'); st.id='day-detail-panel-for-every-day-style'; st.textContent=`
    .day-detail-date{font-size:12px;font-weight:850;color:var(--t4);margin:4px 0 14px;letter-spacing:.01em}
    .day-detail-holidays{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
    .day-detail-holiday{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.18);color:#b45309}
    .day-detail-holiday span{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(245,158,11,.13)}
    .day-detail-holiday b{display:block;font-size:13px;font-weight:900;color:#b45309}.day-detail-holiday small{display:block;font-size:11px;color:#c7812c;margin-top:2px}
    .day-detail-list{display:flex;flex-direction:column;gap:10px}.day-detail-event{display:grid;grid-template-columns:80px 1fr;gap:12px;align-items:center;padding:13px 14px;border:1px solid var(--b1);border-left:4px solid var(--acc);border-radius:14px;background:var(--s1);cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}.day-detail-event:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(16,24,40,.08);border-color:rgba(45,106,79,.22)}
    .day-detail-time{font-size:12px;font-weight:700;color:var(--t3)}.day-detail-title{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:900;color:var(--t1);line-height:1.25}.day-detail-sub{font-size:12px;color:var(--t4);margin-top:3px}.day-google-dot{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:rgba(66,133,244,.13);color:#4285f4;font-size:9px;font-weight:950;line-height:1}.day-google-dot.synced{background:rgba(22,163,74,.13);color:var(--grn)}.day-detail-empty{padding:18px 14px;border:1px dashed var(--b2);border-radius:14px;color:var(--t5);font-size:13px;text-align:center;background:var(--s2)}.day-detail-add{margin-top:16px}
  `; document.head.appendChild(st);
})();

/* ── calendar-range-connected-clean-final ── */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: +backtick]
  const DAY=86400000;
  const pad=n=>String(n).padStart(2,'0');
  const key=d=>{try{if(typeof dateKey==='function')return dateKey(d)}catch(e){} const x=new Date(d);return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())};
  const parse=s=>new Date(String(s).slice(0,10)+'T12:00:00');
  const add=(d,n)=>new Date(new Date(d).getTime()+n*DAY);
  const fmt=s=>{try{if(typeof fmtDate==='function')return fmtDate(s)}catch(e){} const d=parse(s);return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear()};
  function loadOpts(){let o={showHolidays:true,showChallengeDots:true,showWeekNumbers:true};try{Object.assign(o,JSON.parse(localStorage.getItem('change_v1_calendar_view_options')||'{}'))}catch(e){}return o}
  function rangeOf(ev){let s=ev?.startDate||ev?.date||ev?.dateKey||ev?.start?.date||(ev?.start?.dateTime?String(ev.start.dateTime).slice(0,10):'')||'';let e=ev?.endDate||ev?.date||ev?.dateKey||ev?.end?.date||(ev?.end?.dateTime?String(ev.end.dateTime).slice(0,10):'')||s;if(ev?.end?.date&&e>s)e=key(add(parse(e),-1));if(!e||e<s)e=s;return{start:s,end:e,isRange:s!==e}}
  function googleMark(ev){if(ev?.source==='google'||String(ev?.id||'').startsWith('g_'))return '<span class="cal-g" title="von Google">G</span>';if(ev?.googleEventId||ev?.syncedToGoogle||ev?.googleSyncedAt)return '<span class="cal-g ok" title="an Google übertragen">✓</span>';return ''}
  function titleOf(ev){return ev?.title||ev?.summary||ev?.name||'Termin'}
  function allEvents(){const out=[];try{(window.events||[]).forEach(ev=>{const r=rangeOf(ev);out.push(Object.assign({},ev,{date:r.start,startDate:r.start,endDate:r.end,source:ev.source||'local'}))})}catch(e){}try{if(window.googleCalendarSyncEnabled!==false && localStorage.getItem('change_v1_google_calendar_sync')!=='false')(window.gEvents||[]).forEach(ge=>{let s=ge.start?.date||String(ge.start?.dateTime||'').slice(0,10);if(!s)return;let e=ge.end?.date||String(ge.end?.dateTime||'').slice(0,10)||s;if(ge.end?.date&&e>s)e=key(add(parse(e),-1));out.push({id:'g_'+ge.id,title:ge.summary||'(Kein Titel)',date:s,startDate:s,endDate:e<s?s:e,time:ge.start?.dateTime?new Date(ge.start.dateTime).toTimeString().slice(0,5):'',endTime:ge.end?.dateTime?new Date(ge.end.dateTime).toTimeString().slice(0,5):'',color:'blue',source:'google',googleEventId:ge.id})})}catch(e){}const seen=new Set();return out.filter(ev=>{const r=rangeOf(ev);if(!r.start)return false;const id=(ev.id||titleOf(ev))+'|'+r.start+'|'+r.end;if(seen.has(id))return false;seen.add(id);return true})}
  function eventsOn(k){return allEvents().filter(e=>{const r=rangeOf(e);return r.start<=k&&r.end>=k}).sort((a,b)=>{const ar=rangeOf(a),br=rangeOf(b);if(ar.isRange!==br.isRange)return ar.isRange?-1:1;if(ar.isRange&&br.isRange)return ar.start.localeCompare(br.start)||ar.end.localeCompare(br.end)||titleOf(a).localeCompare(titleOf(b));return (a.time||'99:99').localeCompare(b.time||'99:99')||titleOf(a).localeCompare(titleOf(b))})}
  function holidays(k){try{return getHolidaysForDate(k)||[]}catch(e){return[]}}
  function weekNo(dt){let d=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);let y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-y0)/DAY)+1)/7)}
  function challengePoints(k){
    // Im Kalender werden nur wirklich erledigte Challenge-Punkte angezeigt.
    // Geplante/offene tägliche Challenges dürfen hier NICHT summiert werden,
    // sonst steht z.B. +118P an jedem Tag.
    try{
      const me=(typeof getCurrentPlayerId==='function'?String(getCurrentPlayerId()||'').toLowerCase():String((window.userInfo&&userInfo.email)||'').toLowerCase());
      const list=(window.challengeCompletions||[]).filter(c=>{
        const d=String(c.date||c.completedDate||c.createdAt||'').slice(0,10);
        if(d!==k) return false;
        const id=String(c.playerId||c.userEmail||c.email||'').toLowerCase();
        return !me || !id || id===me;
      });
      const pts=list.reduce((s,c)=>s+(parseInt(c.points,10)||0),0);
      if(!pts) return null;
      return {points:pts,done:true};
    }catch(e){return null}
  }
  function monthName(m){return (window.DE_MONTHS||window.monthNames||['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'])[m]}
  function rangeLabel(ev,k,dow){const r=rangeOf(ev);if(!r.isRange)return esc(titleOf(ev));const showTitle=(k===r.start||dow===0);return showTitle?(esc(titleOf(ev))+(k===r.start?' <span class="cal-range-text">'+esc(fmt(r.start).replace(/\.20\d\d$/,'')+'–'+fmt(r.end).replace(/\.20\d\d$/,''))+'</span>':'')):'&nbsp;'}
  function rangeClass(ev,k,dow){const r=rangeOf(ev);if(!r.isRange)return '';const start=(k===r.start||dow===0),end=(k===r.end||dow===6);return ' is-range '+(start?'range-start ':'range-mid ')+(end?'range-end ':'')}
  
  const oldOpenDay=window.openDayPanel;
  if(typeof oldOpenDay==='function'){
    window.openDayPanel=function(dt,dayEvs){oldOpenDay(dt,dayEvs);setTimeout(()=>{document.querySelectorAll('.day-detail-sub').forEach(el=>{el.textContent=el.textContent.replace(' · Zeitraum','')})},0)};
    window.onDayClick=function(dt,dayEvs){window.openDayPanel(dt,dayEvs||[])};
  }
  let st=document.getElementById('calendar-range-connected-clean-style');if(!st){st=document.createElement('style');st.id='calendar-range-connected-clean-style';document.head.appendChild(st)}
  st.textContent=`.cal-event-chip.is-range{order:-10;margin-left:-9px!important;margin-right:-9px!important;border-radius:0!important;background:rgba(45,106,79,.09)!important;border-color:rgba(45,106,79,.20)!important;color:var(--acc)!important;box-shadow:none!important}.cal-event-chip.is-range.range-start{margin-left:0!important;border-top-left-radius:8px!important;border-bottom-left-radius:8px!important}.cal-event-chip.is-range.range-end{margin-right:0!important;border-top-right-radius:8px!important;border-bottom-right-radius:8px!important}.cal-event-chip.is-range:not(.range-start) .cal-g{display:none}.cal-event-chip.is-range:not(.range-start) .cal-range-text{display:none}.cal-event-chip.is-range.range-mid .cal-event-title{color:transparent}.cal-event-chip.is-range.range-start .cal-event-title{color:var(--acc)}.cal-event-chip.is-range:before{content:none!important}.cal-range-text{font-size:9px;font-weight:850;opacity:.75;white-space:nowrap;margin-left:4px}`;
  setTimeout(()=>{try{if(typeof renderCalendar==='function')renderCalendar()}catch(e){console.warn('connected ranges failed',e)}},80);
})();

/* ── CHANGE-FINAL-MULTIDAY-BARS ── */
/* ====
   CHANGE · FINAL OVERRIDE
   Echte durchgehende Zeitraum-Balken im Monatskalender.
   Dashboard: Zeitraum-Events dedupliziert, übersichtlich.
   Dieses Script ist das LETZTE und überschreibt alle vorherigen renderMonth / buildDashCards.
==== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: inkl. backtick]
  const DAY = 86400000;

  function toKey(d) {
    if (typeof d === 'string') return d.slice(0, 10);
    const x = new Date(d); x.setHours(12, 0, 0, 0);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function parseDate(s) { return new Date(String(s || '').slice(0, 10) + 'T12:00:00'); }
  function addD(d, n) { return new Date(parseDate(d).getTime() + n * DAY); }
  function daysFrom(a, b) { return Math.round((parseDate(b) - parseDate(a)) / DAY); }
  function fmt(k) {
    try { if (typeof fmtDate === 'function') return fmtDate(k); } catch (e) {}
    const d = parseDate(k); return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.';
  }
  function opts() {
    const base = { showHolidays: true, showChallengeDots: true, showWeekNumbers: true };
    try { Object.assign(base, JSON.parse(localStorage.getItem('change_v1_calendar_view_options') || '{}')); } catch (e) {}
    return base;
  }
  function getRange(ev) {
    let s = String(ev?.startDate || ev?.date || ev?.dateKey || ev?.start?.date || (ev?.start?.dateTime ? ev.start.dateTime.slice(0, 10) : '') || '').slice(0, 10);
    let e = String(ev?.endDate || ev?.toDate || ev?.untilDate || '').slice(0, 10);
    if (!e && ev?.end?.date) e = toKey(addD(ev.end.date, -1));
    if (!e && ev?.end?.dateTime) e = String(ev.end.dateTime).slice(0, 10);
    if (!e || e < s) e = s;
    return { start: s, end: e, isRange: s !== e };
  }
  function getTitle(ev) { return ev?.title || ev?.summary || ev?.name || 'Termin'; }
  function getColor(ev) { return ['blue','green','amber','red','purple'].includes(ev?.color) ? ev.color : 'blue'; }
  function isGoog(ev) { return ev?.source === 'google' || String(ev?.id || '').startsWith('g_'); }
  function gMark(ev) {
    if (isGoog(ev)) return '<span class="cfx-gmark" title="von Google">G</span>';
    if (ev?.googleEventId || ev?.syncedToGoogle) return '<span class="cfx-gmark ok" title="an Google übertragen">✓</span>';
    return '';
  }

  /* ==== ALLE EVENTS (dedupliziert, mit startDate/endDate) ==== */
  function contentKey(ev, src, r) {
    const title = String(getTitle(ev)).trim().toLowerCase();
    const time = String(ev?.time || (ev?.start?.dateTime ? new Date(ev.start.dateTime).toTimeString().slice(0,5) : '') || '');
    const endTime = String(ev?.endTime || (ev?.end?.dateTime ? new Date(ev.end.dateTime).toTimeString().slice(0,5) : '') || '');
    const loc = String(ev?.location || '').trim().toLowerCase();
    return [src, title, r.start, r.end, time, endTime, loc].join('|');
  }
  function idKey(ev, src, r) {
    const gid = String(ev?.googleEventId || ev?.id || '').replace(/^g_/, '');
    if (src === 'google' && gid) return 'g:'+gid+':'+r.start+':'+r.end;
    if (src !== 'google' && ev?.id) return 'l:'+String(ev.id)+':'+r.start+':'+r.end;
    return '';
  }
  function normalizeEvent(ev, src) {
    const r = getRange(ev); if (!r.start) return null;
    const id = src === 'google'
      ? (String(ev.id || '').startsWith('g_') ? ev.id : 'g_' + (ev.id || ev.googleEventId || contentKey(ev, src, r)))
      : ev.id;
    return Object.assign({}, ev, {
      id,
      title: getTitle(ev),
      date: r.start,
      startDate: r.start,
      endDate: r.end,
      source: src,
      googleEventId: src === 'google' ? String(ev.googleEventId || ev.id || '').replace(/^g_/, '') : ev.googleEventId,
      time: ev.time || (ev.start?.dateTime ? new Date(ev.start.dateTime).toTimeString().slice(0,5) : ''),
      endTime: ev.endTime || (ev.end?.dateTime ? new Date(ev.end.dateTime).toTimeString().slice(0,5) : '')
    });
  }
  function allEvents() {
    const raw = [];
    try { (window.events || []).forEach(ev => raw.push({ ev, src: ev?.source === 'google' || String(ev?.id || '').startsWith('g_') ? 'google' : 'local' })); } catch (e) {}
    try {
      if (window.googleCalendarSyncEnabled !== false && localStorage.getItem('change_v1_google_calendar_sync') !== 'false') {
        (window.gEvents || []).forEach(ge => raw.push({ ev: ge, src: 'google' }));
      }
    } catch (e) {}
    const out = [], seenIds = new Set(), seenContent = new Set();
    raw.forEach(item => {
      var evForCalendar = item.ev;
      var srcForCalendar = item.src;
      try {
        if (window.ChangeBirthdays && window.ChangeBirthdays.enabled && window.ChangeBirthdays.enabled() && window.ChangeBirthdayParser) {
          var parsedBirthday = window.ChangeBirthdayParser.parseEvent(item.ev);
          if (parsedBirthday) {
            evForCalendar = window.ChangeBirthdayParser.toCalendarEvent(parsedBirthday, parsedBirthday.date);
            srcForCalendar = 'birthday';
          }
        }
      } catch (e) {}
      const normalized = normalizeEvent(evForCalendar, srcForCalendar);
      if (!normalized) return;
      const r = getRange(normalized);
      const ik = idKey(normalized, normalized.source, r) || (normalized.source+':'+normalized.id+':'+r.start+':'+r.end);
      const ck = contentKey(normalized, normalized.source, r);
      if (ik && seenIds.has(ik)) return;
      if (seenContent.has(ck)) return;
      if (ik) seenIds.add(ik);
      seenContent.add(ck);
      out.push(normalized);
    });
    return out.sort((a, b) => a.startDate.localeCompare(b.startDate) || daysFrom(b.startDate, b.endDate) - daysFrom(a.startDate, a.endDate) || getTitle(a).localeCompare(getTitle(b)));
  }
  window.getAllEvents = allEvents;
  window.getEventById = function (id) {
    const plain = String(id || '').replace(/__\d{4}-\d{2}-\d{2}$/, '');
    return (window.events || []).find(e => e.id === plain || e.id === id)
      || allEvents().find(e => e.id === id || e.id === plain || e.googleEventId === plain) || null;
  };

  function eventsOnDate(k) {
    return allEvents().filter(ev => { const r = getRange(ev); return r.start <= k && r.end >= k; })
      .sort((a, b) => { const ar = getRange(a), br = getRange(b); if (ar.isRange !== br.isRange) return ar.isRange ? -1 : 1; return ar.start.localeCompare(br.start) || (a.time||'99:99').localeCompare(b.time||'99:99'); });
  }

  /* ==== LAYOUT-ALGORITHMUS: Balken auf Wochen-Ebene ==== */
  function layoutWeek(weekDates) { // weekDates: 7 date-keys Mo–So
    const wStart = weekDates[0], wEnd = weekDates[6];
    const evs = allEvents().filter(ev => { const r = getRange(ev); return r.start <= wEnd && r.end >= wStart; })
      .sort((a, b) => { const ar = getRange(a), br = getRange(b); return daysFrom(br.start, br.end) - daysFrom(ar.start, ar.end) || ar.start.localeCompare(br.start); });
    const lanes = []; // lanes[i] = last-occupied endCol in lane i
    const result = [];
    for (const ev of evs) {
      const r = getRange(ev);
      const sIdx = r.start < wStart ? 0 : weekDates.indexOf(r.start);
      const rawEnd = r.end > wEnd ? wEnd : r.end;
      const eIdx = weekDates.indexOf(rawEnd) === -1 ? 6 : weekDates.indexOf(rawEnd);
      if (sIdx === -1) continue;
      let lane = 0;
      while (lanes[lane] !== undefined && lanes[lane] >= sIdx) lane++;
      if (lane > 1) continue; // max 2 Zeilen sichtbar (Charta) — Rest wird als „+X mehr" gezählt
      lanes[lane] = eIdx;
      result.push({ ev, sIdx, eIdx, span: eIdx - sIdx + 1, lane,
        contLeft: r.start < wStart, contRight: r.end > wEnd,
        showTitle: r.start >= wStart });
    }
    return result;
  }

  /* ==== MONATS-ZELLEN BAUEN ==== */
  function buildCells(y, m) {
    let first = new Date(y,m,1).getDay(); first = first===0?6:first-1;
    const dim = new Date(y,m+1,0).getDate(), prev = new Date(y,m,0).getDate(), cells = [];
    for (let i=0;i<first;i++) cells.push({d:prev-first+1+i, m:m?m-1:11, y:m?y:y-1, other:true});
    for (let i=1;i<=dim;i++) cells.push({d:i, m, y, other:false});
    while (cells.length<42) { const n=cells.length-first-dim+1; cells.push({d:n, m:m===11?0:m+1, y:m===11?y+1:y, other:true}); }
    return cells;
  }

  /* ==== RENDERMONTH (FINAL) ==== */
  window.renderMonth = function (y, m) {
    const grid = $('month-grid'); if (!grid) return;
    const o = opts();
    grid.innerHTML = '';
    grid.className = 'cfx-month-grid';
    grid.style.cssText = 'display:grid;grid-template-rows:repeat(6,minmax(118px,1fr));overflow:hidden;';
    injectStyle();

    const cells = buildCells(y, m);
    for (let w = 0; w < 6; w++) {
      const wCells = cells.slice(w*7, w*7+7);
      const wDates = wCells.map(c => toKey(new Date(c.y, c.m, c.d)));
      const row = document.createElement('div');
      row.className = 'cfx-week-row';
      const visibleSegments = layoutWeek(wDates);
      const visibleForDate = new Map();
      visibleSegments.forEach(seg => {
        for (let idx = seg.sIdx; idx <= seg.eIdx; idx++) {
          const list = visibleForDate.get(wDates[idx]) || [];
          list.push(seg.ev);
          visibleForDate.set(wDates[idx], list);
        }
      });
      function hiddenCountFor(k) {
        const all = eventsOnDate(k);
        const visible = visibleForDate.get(k) || [];
        const visibleKeys = new Set(visible.map(ev => contentKey(ev, ev.source || (isGoog(ev) ? 'google' : 'local'), getRange(ev))));
        return all.filter(ev => !visibleKeys.has(contentKey(ev, ev.source || (isGoog(ev) ? 'google' : 'local'), getRange(ev)))).length;
      }

      /* Tageszellen */
      wCells.forEach((c, i) => {
        const dt = new Date(c.y, c.m, c.d), k = wDates[i];
        const hs = o.showHolidays ? (typeof getHolidaysForDate==='function' ? getHolidaysForDate(k)||[] : []) : [];
        const ch = o.showChallengeDots ? (typeof getChallengeDayStatus==='function' ? getChallengeDayStatus(k) : null) : null;
        let isT = false; try { isT = typeof isToday==='function' ? isToday(dt) : toKey(dt)===toKey(new Date()); } catch(e){}
        const cell = document.createElement('div');
        cell.className = 'cfx-day' + (c.other?' other':'') + (i>=5?' weekend':'') + (isT?' today':'');
        cell.style.gridColumn = String(i+1);
        cell.onclick = () => { try { if(typeof onDayClick==='function') onDayClick(dt, eventsOnDate(k)); } catch(e){} };
        let html = '<div class="cfx-head"><span class="cfx-num">'+c.d+'</span>';
        if (hs.length) html += '<span class="cfx-hol" title="'+esc(hs[0].name)+'">'+esc(hs[0].name)+'</span>';
        html += '</div>';
        if (ch && Number(ch.points)>0) html += '<span class="cfx-points'+(ch.allDone?' done':'')+'">'+Number(ch.points)+'P</span>';
        if (o.showWeekNumbers && i===0) {
          try {
            const dd=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())), dy=dd.getUTCDay()||7;
            dd.setUTCDate(dd.getUTCDate()+4-dy);
            const y0=new Date(Date.UTC(dd.getUTCFullYear(),0,1));
            html += '<span class="cfx-kw">KW '+Math.ceil((((dd-y0)/DAY)+1)/7)+'</span>';
          } catch(e){}
        }
        const hidden = hiddenCountFor(k);
        if (hidden > 0) html += '<span class="cfx-more">+'+hidden+' mehr</span>';
        cell.innerHTML = html; row.appendChild(cell);
      });

      /* Balken (Week-Level Grid, überspannen mehrere Spalten) */
      visibleSegments.forEach(seg => {
        const ev = seg.ev, r = getRange(ev);
        const bar = document.createElement('button');
        bar.type = 'button';
        bar.className = 'cfx-bar ' + getColor(ev) + (seg.contLeft?' cl':'') + (seg.contRight?' cr':'');
        bar.style.gridColumn = (seg.sIdx+1) + ' / span ' + seg.span;
        bar.style.setProperty('--cfx-lane', String(seg.lane));
        bar.title = getTitle(ev) + (r.isRange ? ' · '+fmt(r.start)+' – '+fmt(r.end) : (ev.time?' · '+ev.time:''));
        bar.onclick = e => { e.stopPropagation(); try { if(ev.type === 'birthday' && typeof openBirthdayPanel === 'function') openBirthdayPanel(); else if(typeof openEventPanel==='function') openEventPanel(ev.id); } catch(ex){} };
        bar.innerHTML = '<span class="cfx-bt">'+(seg.showTitle?esc(getTitle(ev)):'')+'</span>'+gMark(ev);
        row.appendChild(bar);
      });

      grid.appendChild(row);
    }
  };

  /* ==== CSS INJECTION ==== */
  function injectStyle() {
    if ($('cfx-style')) return;
    const st = document.createElement('style'); st.id = 'cfx-style';
    st.textContent = `
.cfx-month-grid{background:var(--bg)!important;gap:0!important}
.cfx-week-row{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;position:relative!important;min-height:118px!important;border-bottom:1px solid var(--b1)!important;background:var(--s1)!important}
.cfx-day{grid-row:1!important;min-width:0!important;padding:7px 6px 22px!important;border-right:1px solid var(--b1)!important;background:transparent!important;cursor:pointer!important;position:relative!important;overflow:hidden!important;transition:background .12s!important}
.cfx-day:hover{background:rgba(45,106,79,.04)!important}
.cfx-day.weekend{background:rgba(0,0,0,.016)!important}
.cfx-day.other{opacity:.44!important}
.cfx-day.today{background:linear-gradient(180deg,rgba(45,106,79,.045),rgba(45,106,79,.008))!important;box-shadow:inset 0 0 0 1px rgba(45,106,79,.13)!important}
.cfx-head{display:flex!important;align-items:center!important;gap:5px!important;min-height:22px!important;white-space:nowrap!important;overflow:hidden!important;padding-right:4px!important;position:relative!important;z-index:2!important}
.cfx-num{font-size:12px!important;font-weight:850!important;color:var(--t2)!important;flex-shrink:0!important;line-height:1!important}
.cfx-day.today .cfx-num{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:20px!important;height:20px!important;border-radius:999px!important;background:rgba(45,106,79,.10)!important;color:var(--acc)!important;border:1px solid rgba(45,106,79,.20)!important;margin:0!important}
.cfx-hol{font-size:9.5px!important;font-weight:750!important;color:#b85f00!important;background:rgba(245,158,11,.10)!important;border:1px solid rgba(245,158,11,.18)!important;border-radius:999px!important;padding:1px 5px!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:calc(100% - 24px)!important;white-space:nowrap!important}
.cfx-points{position:absolute!important;right:6px!important;bottom:5px!important;min-width:18px!important;height:17px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:999px!important;padding:0 5px!important;background:rgba(52,211,153,.13)!important;border:1px solid rgba(52,211,153,.22)!important;color:var(--grn)!important;font-size:9.5px!important;line-height:1!important;font-weight:900!important;font-family:var(--mono)!important;pointer-events:none!important;z-index:8!important}
.cfx-points.done{opacity:1!important}
.cfx-kw{position:absolute!important;left:4px!important;bottom:4px!important;font-size:9px!important;font-weight:900!important;color:var(--acc)!important;background:rgba(45,106,79,.10)!important;border-radius:999px!important;padding:2px 5px!important;pointer-events:none!important;z-index:2!important}
.cfx-more{position:absolute!important;right:6px!important;bottom:25px!important;z-index:12!important;border-radius:999px!important;padding:2px 6px!important;background:var(--s2)!important;border:1px solid var(--b1)!important;color:var(--t3)!important;font-size:10px!important;font-weight:850!important;line-height:1!important;pointer-events:none!important}
/* ==== Balken ==== */
.cfx-bar{grid-row:1!important;align-self:start!important;height:20px!important;min-width:0!important;margin-top:calc(28px + var(--cfx-lane,0)*23px)!important;padding:0 7px!important;border:1px solid transparent!important;border-top-left-radius:10px!important;border-bottom-left-radius:10px!important;border-top-right-radius:10px!important;border-bottom-right-radius:10px!important;margin-left:4px!important;margin-right:4px!important;display:flex!important;align-items:center!important;gap:4px!important;z-index:20!important;overflow:hidden!important;cursor:pointer!important;font-size:11px!important;font-weight:700!important;white-space:nowrap!important;box-shadow:0 2px 7px rgba(0,0,0,.06)!important;transition:transform .1s,box-shadow .1s!important}
.cfx-bar:hover{transform:translateY(-1px)!important;box-shadow:0 5px 12px rgba(0,0,0,.10)!important}
.cfx-bar.cl{border-top-left-radius:0!important;border-bottom-left-radius:0!important;margin-left:0!important;border-left-color:transparent!important}
.cfx-bar.cr{border-top-right-radius:0!important;border-bottom-right-radius:0!important;margin-right:0!important;border-right-color:transparent!important}
.cfx-bar.blue{background:rgba(66,133,244,.12)!important;color:#2f6fe8!important;border-color:rgba(66,133,244,.18)!important}
.cfx-bar.green{background:rgba(45,106,79,.11)!important;color:var(--acc)!important;border-color:rgba(45,106,79,.18)!important}
.cfx-bar.amber{background:rgba(245,158,11,.12)!important;color:var(--amb)!important;border-color:rgba(245,158,11,.18)!important}
.cfx-bar.red{background:rgba(239,68,68,.11)!important;color:var(--red)!important;border-color:rgba(239,68,68,.18)!important}
.cfx-bar.purple{background:rgba(139,92,246,.11)!important;color:var(--pur)!important;border-color:rgba(139,92,246,.18)!important}
.cfx-bt{overflow:hidden!important;text-overflow:ellipsis!important;flex:1!important;min-width:0!important}
.cfx-gmark{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:14px!important;height:14px!important;border-radius:50%!important;font-size:8px!important;font-weight:900!important;background:rgba(66,133,244,.14)!important;color:#4285F4!important;flex-shrink:0!important;margin-left:auto!important}
.cfx-gmark.ok{background:rgba(22,163,74,.14)!important;color:var(--grn)!important}
@media(max-width:640px){.cfx-week-row,.cfx-day{min-height:98px!important}.cfx-bar{height:18px!important;font-size:9.5px!important;margin-top:calc(24px + var(--cfx-lane,0)*20px)!important}.cfx-hol{display:none!important}}
/* Dashboard */
.cfx-cal-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--b1);cursor:pointer}.cfx-cal-row.today{background:rgba(45,106,79,.035);margin:0 -8px;padding-left:8px;padding-right:8px;border-radius:12px}.cfx-cal-date{width:58px;flex:0 0 58px;text-align:left;font-size:11px;font-weight:850;color:var(--t2);line-height:1.15}.cfx-cal-date.today{color:var(--acc)}
.cfx-cal-row:last-child{border-bottom:none}
.cfx-cal-icon{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;background:var(--acc-d)}
.cfx-cal-body{flex:1;min-width:0}
.cfx-cal-title{font-size:13px;font-weight:750;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:5px;min-width:0}
.cfx-cal-sub{font-size:11px;color:var(--t4);margin-top:1px}
.cfx-rtag{display:inline-flex;padding:2px 6px;border-radius:999px;font-size:10px;font-weight:800;background:var(--grn-d);color:var(--grn);white-space:nowrap;flex-shrink:0}
.cfx-dbadge{flex-shrink:0;font-size:11px;font-weight:800;color:var(--t3);white-space:nowrap}
    `;
    document.head.appendChild(st);
  }

  /* ==== DASHBOARD ==== */
  function dashCalendarItems() {
    const td = toKey(new Date()), limit = toKey(addD(td, 30));
    const seen = new Set();
    const rows = [];
    allEvents().forEach(ev => {
      const r = getRange(ev), key = ev.googleEventId ? 'g:'+ev.googleEventId : ev.id;
      if (seen.has(key)) return; seen.add(key);
      if (r.end >= td && r.start <= limit) rows.push({kind:'event', sort:(r.start < td ? td : r.start), ev, range:r});
    });
    try {
      for (let i=0;i<=30;i++) {
        const d = toKey(addD(td, i));
        (typeof getHolidaysForDate==='function' ? getHolidaysForDate(d) : []).forEach(h => rows.push({kind:'holiday', sort:d, date:d, holiday:h}));
      }
    } catch(e) {}
    return rows.sort((a,b) => a.sort.localeCompare(b.sort) || (a.kind==='holiday'?-1:1)).slice(0,10);
  }

  window.buildDashCards = function () {
    const grid = $('dash-grid'); if (!grid) return;
    injectStyle();
    const td = toKey(new Date());

    /* Kalender-Zeilen: Datum links am Inhalt, Feiertage sichtbar */
    const calHtml = dashCalendarItems().map(item => {
      if (item.kind === 'holiday') {
        const diff = daysFrom(td, item.date);
        const dateLabel = diff===0 ? 'Heute' : fmt(item.date);
        return `<div class="cfx-cal-row ${diff===0?'today':''}" onclick="setMainView('calendar')">
          <div class="cfx-cal-date ${diff===0?'today':''}">${esc(dateLabel)}</div>
          <div class="cfx-cal-icon" style="background:var(--amb-d)">🎉</div>
          <div class="cfx-cal-body">
            <div class="cfx-cal-title"><span>${esc(item.holiday.name)}</span><span class="cfx-rtag">Feiertag</span></div>
            <div class="cfx-cal-sub">${esc(fmt(item.date))}</div>
          </div>
        </div>`;
      }
      const ev = item.ev, r = item.range;
      const activeTd = r.start <= td && r.end >= td;
      const showDate = activeTd ? td : r.start;
      const dateLabel = activeTd ? 'Heute' : fmt(showDate);
      const icon = isGoog(ev) ? '📅' : (ev.type==='deadline' ? '⚠️' : ev.type==='reminder' ? '🔔' : '📅');
      const rtag = r.isRange ? '<span class="cfx-rtag">'+esc(fmt(r.start))+'–'+esc(fmt(r.end))+'</span>' : '';
      return `<div class="cfx-cal-row ${activeTd?'today':''}" onclick="try{openEventPanel('${esc(ev.id)}')}catch(e){}">
        <div class="cfx-cal-date ${activeTd?'today':''}">${esc(dateLabel)}</div>
        <div class="cfx-cal-icon">${icon}</div>
        <div class="cfx-cal-body">
          <div class="cfx-cal-title"><span style="overflow:hidden;text-overflow:ellipsis;min-width:0">${esc(getTitle(ev))}</span>${rtag}</div>
          <div class="cfx-cal-sub">${r.isRange?fmt(r.start)+' – '+fmt(r.end):(ev.time?ev.time+' Uhr':'Ganztägig')}</div>
        </div>
      </div>`;
    }).join('') || '<div class="dash-empty">Keine Termine oder Feiertage in den nächsten 30 Tagen</div>';

    // Friseur-Zeile am Ende der Kalender-Kachel
    const friseurRow = (typeof window.getFriseurRowHtml==='function') ? window.getFriseurRowHtml() : '';
    const urlaubRow  = (typeof window.getUrlaubRowHtml==='function')  ? window.getUrlaubRowHtml()  : '';
    /* Challenges */
    let chHtml = '<div class="dash-empty">Keine aktiven Challenges</div>';
    try {
      const chs = (window.challenges||[]).filter(c=>c&&c.active!==false&&(c.recurrence==='daily'||!c.date||(c.date||c.startDate)===td));
      const myId = (() => { try { return String(window.userInfo?.email||'').toLowerCase(); } catch(e){return '';} })();
      const done = new Set((window.challengeCompletions||[]).filter(c=>c.date===td&&(!myId||String(c.playerId||c.userEmail||c.email||'').toLowerCase()===myId)).map(c=>c.challengeId));
      if (chs.length) chHtml = chs.slice(0,5).map(ch => {
        const isDone = done.has(ch.id);
        return `<div class="dash-row${isDone?' challenge-done':''}" onclick="setMainView('challenges')">
          <div class="dash-row-icon" style="background:var(--pur-d)">${esc(ch.icon||'🏆')}</div>
          <div class="dash-row-body"><div class="dash-row-title">${esc(ch.title||'Challenge')}</div><div class="dash-row-sub">${ch.points||0} Punkte</div></div>
          <span class="dash-row-badge ${isDone?'badge-green':'badge-amber'}">${isDone?'✓ Erledigt':'offen'}</span>
        </div>`;
      }).join('');
    } catch(e){}

    /* Mitspieler */
    let plHtml = '<div class="dash-empty">Noch keine Mitspieler</div>';
    try {
      const players = (typeof getVisibleContestPlayers==='function' ? getVisibleContestPlayers() : window.challengePlayers||[]).slice(0,5);
      const myId = (() => { try { return String(window.userInfo?.email||'').toLowerCase(); } catch(e){return '';} })();
      if (players.length) plHtml = players.map((p,i) => {
        const id = String(p.email||p.id||'').toLowerCase();
        const st = typeof getPlayerPointSummary==='function' ? getPlayerPointSummary(id) : {totalPoints:0,todayPoints:0,totalCount:0};
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
        return `<div class="dash-row" onclick="try{openContestUserDetails('${esc(id)}')}catch(e){}">
          <div class="dash-row-icon" style="background:var(--amb-d)">${medal}</div>
          <div class="dash-row-body"><div class="dash-row-title">${esc(p.name||p.email||'Mitspieler')}${id===myId?' · Du':''}</div><div class="dash-row-sub">Heute: ${st.todayPoints} P · Gesamt: ${st.totalPoints} P · ${st.totalCount} erledigt</div></div>
          <span class="dash-row-badge badge-green">${st.totalPoints} P</span>
        </div>`;
      }).join('');
    } catch(e){}

    grid.innerHTML = `
      <div class="dash-card calendar-card">
        <div class="dash-card-head"><div><div class="dash-card-title">📅 Kalender</div><div class="dash-card-sub">Heute + nächste 30 Tage</div></div>
          <button class="btn btn-ghost btn-sm" onclick="setMainView('calendar')">Öffnen →</button></div>
        <div class="dash-card-body">${calHtml}${friseurRow}${urlaubRow}</div>
      </div>
      <div class="dash-card challenge-card-dashboard">
        <div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenges</div><div class="dash-card-sub">Heute</div></div>
          <button class="btn btn-ghost btn-sm" onclick="setMainView('challenges')">Öffnen →</button></div>
        <div class="dash-card-body">${chHtml}</div>
      </div>
      <div class="dash-card players-card-dashboard">
        <div class="dash-card-head"><div><div class="dash-card-title">👥 Mitspieler</div><div class="dash-card-sub">Rangliste</div></div></div>
        <div class="dash-card-body">${plHtml}</div>
      </div>`;
  };

  window.buildDashboard = function () {
    try { if (typeof buildKPIs==='function') buildKPIs(); } catch(e){}
    try {
      const h = $('dash-greeting');
      if (h) { const hr=new Date().getHours(), name=(()=>{try{return(window.userInfo?.name||'').split(' ')[0]}catch(e){return''}})();
        h.textContent=(hr<12?'Guten Morgen':hr<17?'Guten Tag':'Guten Abend')+(name?', '+name:''); }
    } catch(e){}
    window.buildDashCards();
  };

  injectStyle();
  setTimeout(() => {
    try { if (window.currentMainView==='calendar') window.renderCalendar(); } catch(e){}
    try { if (window.currentMainView==='dashboard') window.buildDashboard(); } catch(e){}
  }, 200);
})();

/* ── daypanel-dedupe-google-exclusive-final ── */
(function(){
  'use strict';
  const pad=n=>String(n).padStart(2,'0');
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: +backtick]
  const parse=k=>new Date(String(k).slice(0,10)+'T12:00:00');
  const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const add=(k,n)=>{const d=parse(k);d.setDate(d.getDate()+n);return key(d);};
  const fmt=k=>{try{return parse(k).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return String(k||'');}};
  const weekday=k=>{try{return parse(k).toLocaleDateString('de-DE',{weekday:'long'});}catch(e){return '';}};
  const dkey=v=>v instanceof Date?key(v):String(v||'').slice(0,10);
  const titleOf=e=>String(e?.title||e?.summary||e?.name||'Termin').replace(/\bZeitraum\b\s*:?/gi,'').replace(/\s{2,}/g,' ').trim();
  const timeOf=e=>{ if(e?.time) return e.time; if(e?.start?.dateTime) return new Date(e.start.dateTime).toTimeString().slice(0,5); return ''; };
  const endTimeOf=e=>{ if(e?.endTime) return e.endTime; if(e?.end?.dateTime) return new Date(e.end.dateTime).toTimeString().slice(0,5); return ''; };
  const timeRangeOf=e=>{ const a=timeOf(e), b=endTimeOf(e); return a?(a+(b&&b!==a?' – '+b:'')+' Uhr'):''; };
  function rangeOf(e){
    if(!e) return {start:'',end:'',isRange:false};
    let s='', en='';
    if(e.start && (e.start.date || e.start.dateTime)){
      s=String(e.start.date || e.start.dateTime).slice(0,10);
      if(e.end?.date) en=add(String(e.end.date).slice(0,10),-1);
      else if(e.end?.dateTime) en=String(e.end.dateTime).slice(0,10);
    }else{
      s=String(e.startDate||e.date||e.fromDate||e.dateKey||'').slice(0,10);
      en=String(e.endDate||e.dateEnd||e.toDate||e.untilDate||e.date||e.startDate||'').slice(0,10);
    }
    if(!en || en<s) en=s;
    return {start:s,end:en,isRange:!!(s&&en&&s!==en)};
  }
  function normalizeGoogle(ge){
    const r=rangeOf(ge);
    return {id:String(ge.id||'').startsWith('g_')?String(ge.id):'g_'+String(ge.id||''), googleEventId:ge.id||'', title:ge.summary||ge.title||'(Kein Titel)', date:r.start, startDate:r.start, endDate:r.end, time:ge.start?.dateTime?new Date(ge.start.dateTime).toTimeString().slice(0,5):'', endTime:ge.end?.dateTime?new Date(ge.end.dateTime).toTimeString().slice(0,5):'', desc:ge.description||'', color:'blue', source:'google'};
  }
  function allPanelEvents(pre){
    const candidates=[];
    try{(window.events||[]).forEach(e=>candidates.push(e));}catch(e){}
    try{(window.gEvents||[]).forEach(g=>candidates.push(normalizeGoogle(g)));}catch(e){}
    try{if(Array.isArray(pre)) pre.forEach(e=>candidates.push(e));}catch(e){}
    try{if(!candidates.length && typeof window.getAllEvents==='function') (window.getAllEvents()||[]).forEach(e=>candidates.push(e));}catch(e){}
    const byG=new Map(), other=[];
    candidates.forEach(e=>{const r=rangeOf(e); if(!r.start) return; const gid=e.googleEventId||(String(e.id||'').startsWith('g_')?String(e.id).slice(2):''); if(gid){const k='g:'+gid, p=byG.get(k); if(!p || r.end<rangeOf(p).end) byG.set(k,e);} else other.push(e);});
    const semantic=new Map();
    [...byG.values(),...other].forEach(e=>{const r=rangeOf(e); if(!r.start) return; const sig=titleOf(e).toLowerCase()+'|'+r.start+'|'+(timeOf(e)||'')+'|'+(e.source==='google'||e.googleEventId?'google':'local'); const p=semantic.get(sig); if(!p || r.end<rangeOf(p).end) semantic.set(sig,e);});
    return [...semantic.values()];
  }
  function eventsForDay(k,pre){return allPanelEvents(pre).filter(e=>{const r=rangeOf(e);return r.start<=k&&r.end>=k;}).sort((a,b)=>{const ar=rangeOf(a),br=rangeOf(b);if(ar.isRange!==br.isRange)return ar.isRange?-1:1;return (timeOf(a)||'99:99').localeCompare(timeOf(b)||'99:99')||titleOf(a).localeCompare(titleOf(b));});}
  function holidaysForDate(k){try{return (typeof window.getHolidaysForDate==='function'?window.getHolidaysForDate(k):[])||[];}catch(e){return [];}}
  window.openDayPanel=function(dt,dayEvs){
    const k=dkey(dt), evs=eventsForDay(k,dayEvs), hols=holidaysForDate(k);
    const title=evs.length?(evs.length+' '+(evs.length===1?'Termin':'Termine')):(hols.length?(hols.length===1?'Feiertag':'Feiertage'):'Tag');
    let html='<div class="day-detail-date">'+esc(weekday(k)+', '+fmt(k))+'</div>';
    if(hols.length) html+='<div class="day-detail-holidays">'+hols.map(h=>'<div class="day-detail-holiday"><span>🎉</span><div><b>'+esc(h.name)+'</b><small>Feiertag</small></div></div>').join('')+'</div>';
    if(evs.length) html+='<div class="day-detail-list">'+evs.map(ev=>{const r=rangeOf(ev), sub=r.isRange?(fmt(r.start)+' – '+fmt(r.end)):fmt(k), id=esc(ev.id||ev.googleEventId||''), g=(ev.source==='google'||ev.googleEventId)?' <span class="cal-g" title="von Google">G</span>':''; return '<div class="day-detail-event" onclick="openEventPanel(\''+id+'\')"><div class="day-detail-time">'+(timeRangeOf(ev)||'Ganztägig')+'</div><div class="day-detail-main"><div class="day-detail-title">'+esc(titleOf(ev))+g+'</div><div class="day-detail-sub">'+esc(sub)+'</div></div></div>';}).join('')+'</div>'; else html+='<div class="day-detail-empty">Keine Termine für diesen Tag</div>';
    html+='<button class="btn btn-primary btn-full day-detail-add" onclick="window.__openNewEventForDay&&window.__openNewEventForDay(\''+k+'\')">+ Neuer Termin für diesen Tag</button>';
    window.__openNewEventForDay=function(day){if(typeof window.openEventPanel==='function')window.openEventPanel(null,parse(day));};
    if(typeof window.openPanel==='function')window.openPanel(title,html);
  };
  window.onDayClick=function(dt,dayEvs){window.openDayPanel(dt,dayEvs||[]);};
})();

/* ── CHANGE-CLEAN-STEP7-STABLE ── */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: inkl. backtick]
  const pad=n=>String(n).padStart(2,'0');
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  const norm=s=>String(s||'').trim().toLowerCase();
  const notify=(m,t)=>{try{if(typeof window.toast==='function')window.toast(m,t||'')}catch(e){}};
  function read(k,f){try{const v=localStorage.getItem(k);return v==null?f:JSON.parse(v)}catch(e){return f}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function raw(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
  function storedUser(){
    const keys=['user_info','change_user_info','change_v1_user','google_user','current_user'];
    for(const k of keys){const u=read(k,null); if(u&&typeof u==='object') return u;}
    return {};
  }
  function account(){
    let fu=null; try{fu=(window.firebase&&firebase.auth&&firebase.auth().currentUser)||null}catch(e){}
    const u=Object.assign({}, storedUser(), window.userInfo||{});
    const email=norm((fu&&fu.email)||u.email||u.mail||localStorage.getItem('change_v1_user_email')||localStorage.getItem('user_email')||'');
    const uid=(fu&&fu.uid)||u.uid||u.id||localStorage.getItem('change_v1_user_uid')||'';
    const rawName=String((fu&&fu.displayName)||u.name||u.displayName||'').trim();
    const name=rawName || (email ? email.split('@')[0] : '');
    const picture=(fu&&fu.photoURL)||u.picture||u.photoURL||'';
    return {id:email||uid,email,uid,name,picture};
  }
  function playerKey(p){return norm(p&&((p.email)||(p.userEmail)||(p.id)||(p.uid)))}
  function badPlayer(p){const t=norm([p&&p.name,p&&p.email,p&&p.id].join(' '));return !t||/demo|demo@example|local-user|google-user|local-authenticated-user|mitspieler|ich\s*·\s*du|^du$|^ich$/.test(t)}
  function completionKey(c){let k=norm(c&&((c.userEmail)||(c.email)||(c.playerEmail)||(c.playerId)||(c.userId))); if(!k||['du','ich','me','local-user','google-user','local-authenticated-user','mitspieler'].includes(k)) k=account().id; return k;}
  function canonicalPlayers(){
    const a=account(), map=new Map();
    if(a.id) map.set(a.id,{id:a.id,email:a.email||a.id,uid:a.uid,name:a.name||(a.email?a.email.split('@')[0]:a.id),picture:a.picture,online:true});
    [window.challengePlayers,read('challenge_players',[]),read('challengePlayers',[]),read('changePlayers',[]),read('players',[])].flat().forEach(p=>{if(!p||badPlayer(p))return;const k=playerKey(p);if(!k)return;map.set(k,Object.assign({},map.get(k)||{},p,{id:k,email:p.email||k,name:p.name||p.displayName||p.email||k}));});
    (window.challengeCompletions||read('challenge_completions',[])||read('challengeCompletions',[])||[]).forEach(c=>{const k=completionKey(c); if(!k||['du','ich','me','local-user','google-user'].includes(k))return; if(!map.has(k)) map.set(k,{id:k,email:k,name:c.playerName||c.userName||k});});
    const arr=[...map.values()].filter(p=>!badPlayer(p) && playerKey(p));
    window.challengePlayers=arr; try{challengePlayers=arr}catch(e){}; write('challenge_players',arr); write('challengePlayers',arr); return arr;
  }
  function completions(){
    const a=account(); let arr=window.challengeCompletions||read('challenge_completions',[])||read('challengeCompletions',[])||[];
    arr=arr.map(c=>{const k=completionKey(c); if(a.id&&(!k||['du','ich','me','local-user','google-user'].includes(k))) return Object.assign({},c,{playerId:a.id,userEmail:a.email||a.id,email:a.email||a.id,playerName:a.name}); return c;});
    window.challengeCompletions=arr; try{challengeCompletions=arr}catch(e){}; write('challenge_completions',arr); write('challengeCompletions',arr); return arr;
  }
  function persistCompletions(arr){window.challengeCompletions=arr;try{challengeCompletions=arr}catch(e){};write('challenge_completions',arr);write('challengeCompletions',arr);try{if(typeof window.persistChangeState==='function')window.persistChangeState()}catch(e){}}
  function stats(id){id=norm(id);const td=today();let totalPoints=0,todayPoints=0,totalCount=0,todayCount=0;completions().forEach(c=>{if(completionKey(c)!==id)return;const p=parseInt(c.points,10)||0;totalPoints+=p;totalCount++;if(String(c.date||'').slice(0,10)===td){todayPoints+=p;todayCount++;}});return{totalPoints,todayPoints,totalCount,todayCount};}
  function allChallenges(){let list=[];try{list=(typeof window.buildDefaultChallenges==='function'?window.buildDefaultChallenges():[])||[]}catch(e){}; if(!list.length) list=read('challenges',[])||[]; return list.filter(c=>c&&c.active!==false&&!/lesen|trinken|wasser|mail|haushalt|todo|meditation/i.test((c.title||c.name||'')+' '+(c.desc||''))).map(c=>Object.assign({},c,{category:'sport'}));}
  function ensureOptional(list){
    // Dedupliziere anhand von ID und Titel-Keywords — verhindert doppelte optionale Sportaufgaben
    const hasId=id=>list.some(c=>c.id===id);
    const hasKey=k=>list.some(c=>norm(c.title||c.name).includes(k));
    const out=list.slice();
    if(!hasId('opt_fitness_30')&&!hasId('sport_fitness_30_optional')&&!hasKey('fitness'))
      out.push({id:'opt_fitness_30',title:'Fitness · mind. 30 Minuten',points:30,icon:'🏋️',desc:'Freie Fitness-Einheit für mindestens 30 Minuten.',optional:true,active:true});
    if(!hasId('opt_walk_10')&&!hasId('sport_walk_10_optional')&&!hasKey('spazieren'))
      out.push({id:'opt_walk_10',title:'Spazieren',points:10,icon:'🚶',desc:'Gehe bewusst eine Runde spazieren.',optional:true,active:true});
    if(!hasId('opt_bike_12')&&!hasId('sport_bike_12_optional')&&!hasKey('fahrrad'))
      out.push({id:'opt_bike_12',title:'Fahrrad fahren',points:12,icon:'🚲',desc:'Fahre eine lockere Runde Fahrrad.',optional:true,active:true});
    if(!hasId('opt_jog_12')&&!hasId('sport_jog_12_optional')&&!hasKey('joggen'))
      out.push({id:'opt_jog_12',title:'Joggen',points:12,icon:'🏃',desc:'Gehe eine kurze Runde joggen.',optional:true,active:true});
    return out;
  }
  function dailyChallenges(){const all=ensureOptional(allChallenges()); const normal=all.filter(c=>!c.optional&&!/spazier|fitness|fahrrad|radfahren|bike|joggen|jogging|laufen/i.test(c.title||c.name||'')); const optional=all.filter(c=>c.optional||/spazier|fitness|fahrrad|radfahren|bike|joggen|jogging|laufen/i.test(c.title||c.name||'')); let saved=read('change_daily_sports',null); const td=today(); if(!saved||saved.date!==td){let seed=parseInt(td.replace(/-/g,''),10)||1; const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280}; const ids=normal.slice().sort(()=>rnd()-.5).slice(0,7).map(c=>c.id); saved={date:td,ids}; write('change_daily_sports',saved);} const map=new Map(all.map(c=>[String(c.id),c])); const seven=(saved.ids||[]).map(id=>map.get(String(id))).filter(Boolean); return seven.concat(optional.filter(o=>!seven.some(x=>x.id===o.id)));}
  function challengeById(id){return dailyChallenges().find(c=>String(c.id)===String(id))||allChallenges().find(c=>String(c.id)===String(id));}
  function done(id){const a=account(),td=today();return completions().some(c=>String(c.challengeId)===String(id)&&String(c.date||'').slice(0,10)===td&&completionKey(c)===a.id)}
  function weekDates(){const d=new Date();const day=(d.getDay()+6)%7;const mon=new Date(d);mon.setDate(d.getDate()-day);return Array.from({length:7},(_,i)=>{const x=new Date(mon);x.setDate(mon.getDate()+i);return x;});}
  function pointsForDate(k){const a=account();let s=0;completions().forEach(c=>{if(String(c.date||'').slice(0,10)===k&&completionKey(c)===a.id)s+=parseInt(c.points,10)||0});return s;}
  // renderWeekBar: change-pre.js übernimmt dies
  function ensureWeekBar(){
    // change-pre.js übernimmt dies - keine eigene Implementierung nötig
  }

  // ensureWeekBar/renderWeekBar: change-pre.js owns these, wir überschreiben sie NICHT
  window.getVisibleContestPlayers=canonicalPlayers;
  window.getCurrentPlayerId=()=>account().id;
  window.getPlayerPointSummary=id=>stats(id||account().id);
  window.getChallengePointsForDate=k=>pointsForDate(String(k).slice(0,10));
  window.getChallengeDayStatus=k=>{const p=pointsForDate(String(k).slice(0,10));return p?{points:p,done:true,allDone:true}:null};
  window.completeChallenge=function(id){
    const ch=challengeById(id),a=account(); if(!ch){notify('Challenge nicht gefunden','err');return;} if(done(id)){notify('Bereits erledigt','');return;}
    const c={id:'cc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),challengeId:String(id),playerId:a.id,userEmail:a.email||a.id,email:a.email||a.id,playerName:a.name,date:today(),points:parseInt(ch.points,10)||0,createdAt:new Date().toISOString()};
    const arr=completions().concat(c); persistCompletions(arr); canonicalPlayers();
    try{if(typeof window.publishCompletionToFirestore==='function')window.publishCompletionToFirestore(c)}catch(e){}
    try{window.renderChallenges()}catch(e){console.warn(e)}; try{window.renderCalendar&&window.renderCalendar()}catch(e){}; try{window.buildDashboard&&window.buildDashboard()}catch(e){};
    notify('+'+c.points+' Punkte ✓','ok');
  };
  window.undoChallenge=function(id){const a=account(),td=today();let removed=[];const arr=completions().filter(c=>{const hit=String(c.challengeId)===String(id)&&String(c.date||'').slice(0,10)===td&&completionKey(c)===a.id;if(hit)removed.push(c);return !hit});persistCompletions(arr);try{if(window.firebase&&firebase.firestore){const db=firebase.firestore();removed.forEach(c=>c.id&&db.collection('change_completions').doc(String(c.id)).delete().catch(()=>{}));}}catch(e){};try{window.renderChallenges()}catch(e){};try{window.renderCalendar&&window.renderCalendar()}catch(e){};try{window.buildDashboard&&window.buildDashboard()}catch(e){};notify(removed.length?'Challenge zurückgesetzt':'Nichts zurückzusetzen','')};
  window.resetTodayChallenges=function(){const a=account(),td=today();persistCompletions(completions().filter(c=>!(String(c.date||'').slice(0,10)===td&&completionKey(c)===a.id)));try{window.renderChallenges();window.renderCalendar&&window.renderCalendar();window.buildDashboard&&window.buildDashboard()}catch(e){};notify('Heute zurückgesetzt','')};
  function dateKeyOf(e){return String(e?.date||e?.dateKey||e?.startDate||e?.start?.date||e?.start?.dateTime||'').slice(0,10)}
  function titleOf(e){return String(e?.title||e?.summary||e?.name||'Termin').replace(/\bZeitraum\b\s*:?/gi,'').trim()}
  function eventRows(){let arr=[];try{arr=(typeof window.getAllEvents==='function'?window.getAllEvents():(window.events||[]).concat(window.gEvents||[]))||[]}catch(e){};return arr.filter(e=>dateKeyOf(e)).map(e=>({type:'event',date:dateKeyOf(e),title:titleOf(e)}));}
  function holidayRows(){const rows=[], base=new Date(today()+'T12:00:00'); for(let i=0;i<21;i++){const d=new Date(base);d.setDate(base.getDate()+i);const k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());try{(window.getHolidaysForDate?window.getHolidaysForDate(k):[]).forEach(h=>rows.push({type:'holiday',date:k,title:h.name||h.title||String(h)}));}catch(e){}}return rows;}
  function dashRows(){const seen=new Set(); return eventRows().concat(holidayRows()).sort((a,b)=>a.date.localeCompare(b.date)||(a.type==='holiday'?-1:1)).filter(r=>{const k=r.type+'|'+r.date+'|'+r.title;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,6)}
  window.buildDashboard=function(){const h=$('dash-greeting'),s=$('dash-sub'),grid=$('dash-grid');if(h){const a=account(),hr=new Date().getHours();h.textContent=(hr<12?'Guten Morgen':hr<17?'Guten Tag':'Guten Abend')+(a.name&&a.name!=='Mitspieler'?', '+a.name.split(' ')[0]:'')}if(s)s.textContent='Kalender, Challenges und Mitspieler auf einen Blick';if(!grid)return;const ev=dashRows().map(r=>{const isH=r.type==='holiday';return '<div class="dash-row compact-row" onclick="setMainView(\'calendar\')"><div class="dash-row-icon" style="background:'+(isH?'var(--amb-d)':'var(--acc-d)')+'">'+(isH?'🎉':'📅')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(r.title)+(isH?' <span class="dash-holiday-pill">Feiertag</span>':'')+'</div><div class="dash-row-sub">'+esc(r.date.split('-').reverse().join('.'))+'</div></div></div>'}).join('')||'<div class="dash-empty compact-empty">Keine Termine oder Feiertage</div>';const ch=dailyChallenges().filter(c=>!done(c.id)).slice(0,4).map(c=>'<div class="dash-row compact-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--amb-d)">'+esc(c.icon||'🏆')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(c.title||c.name)+'</div><div class="dash-row-sub">'+(parseInt(c.points,10)||0)+' Punkte</div></div><span class="dash-row-badge">offen</span></div>').join('')||'<div class="dash-empty compact-empty">Heute erledigt</div>';const pl=canonicalPlayers().sort((a,b)=>stats(playerKey(b)).totalPoints-stats(playerKey(a)).totalPoints).slice(0,4).map((p,i)=>{const id=playerKey(p),st=stats(id),med=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);return '<div class="dash-row compact-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--amb-d)">'+med+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(p.name||p.email||id)+'</div><div class="dash-row-sub">Heute '+st.todayPoints+' P · Gesamt '+st.totalPoints+' P</div></div></div>'}).join('')||'<div class="dash-empty compact-empty">Noch keine Mitspieler</div>';grid.innerHTML='<div class="dash-card calendar-card"><div class="dash-card-head"><div><div class="dash-card-title">📅 Kalender</div><div class="dash-card-sub">Heute · Feiertage · nächste Termine</div></div></div><div class="dash-card-body">'+ev+'</div></div><div class="dash-card dashboard-combined-card"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenges & 👥 Mitspieler</div><div class="dash-card-sub">Heute und Rangliste</div></div></div><div class="dash-card-body"><div class="dashboard-section"><div class="dashboard-section-head"><span>Challenges</span></div>'+ch+'</div><div class="dashboard-section"><div class="dashboard-section-head"><span>Mitspieler</span></div>'+pl+'</div></div></div>'};
  function installStyle(){let st=$('change-step7-style');if(!st){st=document.createElement('style');st.id='change-step7-style';document.head.appendChild(st)}st.textContent='.demo-btn,[onclick="startDemo()"],button[onclick="startDemo()"]{display:none!important}#punkte-kalender-top{display:none!important}.challenge-week-card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--rlg);box-shadow:var(--sh);overflow:hidden}.challenge-week-grid{display:grid!important;grid-template-columns:repeat(7,1fr);gap:0;border-top:1px solid var(--b1);padding:0}.challenge-week-day{padding:10px;text-align:center;border-right:1px solid var(--b1);background:var(--s1)}.challenge-week-day:last-child{border-right:0}.challenge-week-day.today{background:rgba(45,106,79,.06)}.cwd-name{font-size:11px;font-weight:800;color:var(--t3);text-transform:uppercase}.cwd-date{font-size:15px;font-weight:900;color:var(--t1);margin-top:3px}.cwd-points{font-size:11px;font-weight:900;color:var(--acc);margin-top:3px}.btn-undo{background:rgba(239,68,68,.08)!important;border:1px solid rgba(239,68,68,.22)!important;color:#dc2626!important;min-width:36px!important}.dash-holiday-pill{font-size:10px;font-weight:800;color:#b85f00;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.20);border-radius:999px;padding:2px 6px;margin-left:6px}.leader-row.clickable{cursor:pointer}.leader-row.clickable:hover{background:var(--s2)}'}
  const oldSet=window.setMainView;window.setMainView=function(v){if(typeof oldSet==='function')oldSet(v);document.body.classList.toggle('calendar-active',v==='calendar');const cc=$('cal-controls');if(cc)cc.style.display=v==='calendar'?'flex':'none';setTimeout(()=>{if(v==='challenges')window.renderChallenges();if(v==='dashboard')window.buildDashboard();},0)};
  function init(){installStyle();canonicalPlayers();completions();try{if((window.currentMainView||'dashboard')==='challenges')window.renderChallenges();if((window.currentMainView||'dashboard')==='dashboard')window.buildDashboard();if((window.currentMainView||'')==='calendar')window.renderCalendar&&window.renderCalendar()}catch(e){console.warn('step7 init',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,100));else setTimeout(init,100);
  window.addEventListener('load',()=>{[300,1200,2600,5200].forEach(ms=>setTimeout(init,ms));});
})();

/* ── change-final-stable ── */
(function(){
  'use strict';

  const $  = id => document.getElementById(id);
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: inkl. backtick]
  const pad2 = n => String(n).padStart(2,'0');

  /* ==== INJECT FINAL CSS ==== */
  function injectFinalStyle(){
    const old=document.getElementById('change-clean-dashboard-style');
    if(old) old.textContent='#kpi-grid{display:none!important}';
    let st=document.getElementById('change-final-stable-style');
    if(!st){ st=document.createElement('style'); st.id='change-final-stable-style'; document.head.appendChild(st); }
    st.textContent=`
      /* Today-Header in Kalender-Karte */
      .dash-today-header{
        display:flex;align-items:center;justify-content:space-between;
        padding:12px 16px 8px;border-bottom:1px solid var(--b1);
      }
      .dash-today-date{
        font-size:12px;font-weight:700;color:var(--t3);
        text-transform:capitalize;
      }
      .dash-today-dot{
        width:8px;height:8px;border-radius:50%;
        background:var(--acc);flex-shrink:0;
        box-shadow:0 0 0 3px var(--acc-d);
      }
      .dash-today-free{
        display:flex;align-items:center;gap:7px;
        padding:11px 16px;
        font-size:13px;font-weight:600;color:var(--t4);
        border-bottom:1px solid var(--b1);
        background:var(--s2);
      }
      .dash-today-row{
        border-left:3px solid var(--acc)!important;
        background:linear-gradient(90deg,rgba(45,106,79,.04),transparent)!important;
      }
      .dash-section-divider{
        padding:7px 16px 5px;
        font-size:10px;font-weight:700;color:var(--t4);
        text-transform:uppercase;letter-spacing:.6px;
        border-top:1px solid var(--b1);border-bottom:1px solid var(--b1);
        background:var(--s2);
      }
      #dash-grid,.dash-grid{
        display:grid!important;grid-template-columns:1fr 1fr!important;gap:14px!important;
        margin-bottom:0!important;align-items:start!important;
      }
      @media(max-width:800px){#dash-grid,.dash-grid{grid-template-columns:1fr!important}}
      .dash-card-body{max-height:calc(100vh - 190px)!important;overflow-y:auto!important}
      .dashboard-combined-card .dash-card-body{display:block!important;grid-template-columns:unset!important;padding:0!important}
      .dash-section-label{padding:8px 16px 4px!important;font-size:10.5px!important;font-weight:700!important;
        color:var(--t4)!important;text-transform:uppercase!important;letter-spacing:.4px!important;border-bottom:1px solid var(--b1)!important}
      /* challenge-week-bar-clean: shown outside layout, hidden inside layout */
      .challenge-layout #challenge-week-bar-clean{display:none!important}
      .ch-optional-badge{display:inline-block;margin-left:7px;padding:1px 6px;border-radius:999px;
        font-size:9.5px;font-weight:700;color:var(--amb);background:rgba(245,158,11,.12);
        border:1px solid rgba(245,158,11,.22);vertical-align:middle}
      .ch-optional-section{padding:10px 16px 4px;font-size:11px;font-weight:700;color:var(--amb);
        text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid rgba(245,158,11,.15);
        background:rgba(245,158,11,.04)}
      /* Challenge view: cleaner structure on desktop + mobile */
      #challenges-view{overflow:hidden!important;display:flex;flex-direction:column;height:100%}
      .challenge-layout{display:grid!important;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr)!important;align-items:stretch!important;gap:16px!important;padding:16px 18px!important;overflow-y:auto!important;flex:1;min-height:0}
      .challenge-layout > #challenge-week-points-card{grid-column:1 / -1;order:0;margin:0}
      .challenge-layout > #group-goal-card{grid-column:1 / -1;order:-1;margin:0}
      .challenge-layout > .challenge-card{order:1;display:flex;flex-direction:column}
      .challenge-layout > .leader-card{order:2;display:flex;flex-direction:column}
      .challenge-layout > .challenge-card > #challenges-list{flex:1;overflow-y:auto}
      .challenge-layout > .leader-card > #leaderboard-list{flex:1;overflow-y:auto}
      .challenge-card,.leader-card,.challenge-week-card{border-radius:var(--rlg)!important;overflow:hidden!important;box-shadow:var(--sh)!important;background:var(--s1)!important;border:1px solid var(--b1)!important}
      .challenge-card-head,.leader-card-head,.challenge-week-head{padding:14px 16px!important}
      @media(max-width:800px){
        #challenges-view{overflow-y:auto!important}
        .challenge-layout{display:flex!important;flex-direction:column!important;gap:14px!important;padding:14px!important;overflow:visible!important;min-height:auto!important;flex:0 0 auto!important}
        .challenge-layout > #challenge-week-points-card,.challenge-layout > .leader-card,.challenge-layout > .challenge-card{width:100%!important;margin:0!important}
        .challenge-layout > #challenge-week-points-card{order:1!important}
        .challenge-layout > .leader-card{order:2!important}
        .challenge-layout > .challenge-card{order:3!important}
        .challenge-week-head{flex-direction:column!important;align-items:flex-start!important;gap:12px!important}
        .challenge-week-actions{width:100%!important;display:grid!important;grid-template-columns:1fr 1fr 1fr!important;gap:8px!important}
        .challenge-week-actions .btn{width:100%!important;justify-content:center!important}
        .challenge-week-grid{grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:6px!important;padding:10px!important;border-top:0!important}
        .challenge-week-day{min-height:68px!important;padding:8px 6px!important;border-radius:12px!important;border-right:0!important;text-align:left!important;justify-content:space-between!important}
        .challenge-week-day-name{font-size:9.5px!important}
        .challenge-week-day-date{font-size:12px!important}
        .challenge-week-day-points{font-size:11px!important}
        .leader-row{padding:12px 14px!important}
        .challenge-item{flex-wrap:wrap!important;align-items:flex-start!important;padding:12px 14px!important}
        .challenge-body{flex:1 1 calc(100% - 48px)!important;min-width:calc(100% - 48px)!important}
        .points-pill{margin-left:auto!important}
        .challenge-item > .btn{margin-left:auto!important}
      }
      @media(max-width:480px){
        .list-header{padding-left:12px!important;padding-right:12px!important}
        .challenge-layout{padding:12px!important;gap:12px!important}
        .challenge-card-head,.leader-card-head,.challenge-week-head{padding:12px 14px!important}
        .challenge-week-grid{gap:4px!important;padding:8px!important}
        .challenge-week-day{min-height:64px!important;padding:8px 5px!important}
        .challenge-week-day-name{font-size:9px!important}
        .challenge-week-day-date{font-size:11px!important}
        .challenge-week-day-points{font-size:10.5px!important}
      }
    `;
  }

  /* ==== DATE HELPERS ==== */
  function todayStr(){
    const d=new Date();
    return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
  }
  function dkOf(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
  function diffDays(dk){
    if(!dk)return 999;
    const d=new Date(dk+'T12:00:00'),t=new Date();
    t.setHours(0,0,0,0);d.setHours(0,0,0,0);
    return Math.round((d-t)/86400000);
  }
  function fmtShort(dk){
    if(!dk)return '';
    return new Date(dk+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
  }
  function fmtTimeRange(ev){
    if(!ev||!ev.time) return ev&&ev.allDay?'Ganztägig':'';
    return ev.time+(ev.endTime&&ev.endTime!==ev.time?' – '+ev.endTime:'')+' Uhr';
  }

  /* ==== ROBUST ACCOUNT ID ====
     Tries multiple sources in order of reliability.
     Never returns "local-user" if an email can be found. */
  function myId(){
    const LSK='change_v1';
    // 1. Firebase currentUser (freshest)
    try{
      const fu=typeof firebase!=='undefined'&&firebase.auth&&firebase.auth().currentUser;
      if(fu&&fu.email) return fu.email.toLowerCase();
    }catch(e){}
    // 2. window.userInfo (set from localStorage at boot)
    try{
      const info=window.userInfo||{};
      const e=(info.email||'').toLowerCase();
      if(e&&e.includes('@')) return e;
    }catch(e){}
    // 3. localStorage direct fallback
    try{
      const stored=JSON.parse(localStorage.getItem(LSK+'_user_info')||'{}');
      if(stored.email&&stored.email.includes('@')) return stored.email.toLowerCase();
    }catch(e){}
    return 'local-user';
  }

  /* ==== ALL EVENTS ==== */
  function allEvents(){
    try{ if(typeof window.getAllEvents==='function') return (window.getAllEvents()||[]).filter(e=>e&&e.date); }
    catch(e){}
    return (window.events||[]).filter(e=>e&&e.date);
  }

  /* ==== ACTIVE CHALLENGES: max 7 normal + optional ==== */
  const isOptional=c=>/spazier|fitness|fahrrad|radfahren|bike|joggen|jogging|laufen/i.test(c.title||c.name||'')||!!c.optional;

  // Remove these specific challenges from the list entirely
  const BLACKLIST=['spazieren gehen für 10'];
  const isBlacklisted=c=>BLACKLIST.some(b=>String(c.title||c.name||'').toLowerCase().includes(b));

  function hydrateChallengeMeta(c){
    c = c || {};
    const base = window.ChangeChallenges && typeof window.ChangeChallenges.findById === 'function'
      ? (window.ChangeChallenges.findById(c.id) || {})
      : {};
    const rawUrl = c.url || c.video || c.youtube || c.youtubeUrl || c.link || base.url || '';
    return {
      ...c,
      title: c.title || c.name || base.title || 'Challenge',
      desc: c.desc || base.desc || '',
      icon: c.icon || base.icon || '🏆',
      points: parseInt(c.points,10) || parseInt(base.points,10) || 0,
      url: rawUrl
    };
  }

  function activeChallenges(){
    const td=todayStr();
    const all=(window.challenges||[]).map(hydrateChallengeMeta).filter(c=>
      c&&c.active!==false&&(!c.date||c.date===td||c.recurrence==='daily')&&!isBlacklisted(c)
    );
    const normal=all.filter(c=>!isOptional(c));
    const optional=all.filter(isOptional);
    // Deduplicate optional by normalised title
    const seenOpt=new Set();
    const dedupOpt=optional.filter(c=>{
      const k=String(c.title||c.name||'').toLowerCase().replace(/\s+/g,' ').trim();
      if(seenOpt.has(k))return false; seenOpt.add(k); return true;
    });
    // Deterministic 7-pick based on date seed
    const seed=td.replace(/-/g,'').split('').reduce((a,c)=>a*31+c.charCodeAt(0),0);
    const sorted=[...normal].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    const offset=seed%Math.max(sorted.length,1);
    const rotated=[...sorted.slice(offset),...sorted.slice(0,offset)];
    const picked=rotated.slice(0,7);
    return [...picked.map(c=>({...c,_optional:false})),
            ...dedupOpt.map(c=>({...c,_optional:true}))];
  }

  /* ==== IS DONE TODAY ==== */
  function isDoneToday(chId,pid){
    pid=(pid||myId()).toLowerCase();
    const td=todayStr();
    return (window.challengeCompletions||[]).some(c=>
      String(c.challengeId)===String(chId)&&
      String(c.date||'').slice(0,10)===td&&
      String(c.playerId||c.userEmail||c.email||'').toLowerCase()===pid
    );
  }

  /* ==== COMPLETE / UNDO (own impl — uses myId() so IDs always match) ==== */
  function uid6(){return Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);}

  window.completeChallenge=function(id){
    const challenges=window.challenges||[];
    const ch=challenges.find(c=>String(c.id)===String(id));
    if(!ch){try{if(typeof toast==='function')toast('Challenge nicht gefunden','err');}catch(e){} return;}
    const me=myId(), td=todayStr();
    if(isDoneToday(id,me)){try{if(typeof toast==='function')toast('Bereits erledigt','');}catch(e){} return;}
    const pts=parseInt(ch.points,10)||0;
    const rec={
      id:'cc_'+uid6(),
      challengeId:String(id),
      playerId:me,
      userEmail:me,
      email:me,
      playerName:(window.userInfo&&window.userInfo.name)||me,
      date:td,
      points:pts,
      createdAt:new Date().toISOString()
    };
    window.challengeCompletions=(window.challengeCompletions||[]).concat(rec);
    try{if(window.ChangeChallengeStoreBridge&&typeof window.ChangeChallengeStoreBridge.replaceCompletions==='function')window.ChangeChallengeStoreBridge.replaceCompletions(window.challengeCompletions);else if(typeof ls==='function')ls('challenge_completions',window.challengeCompletions);}catch(e){}
    // Sync to Firestore if available
    try{if(typeof window.publishCompletionToFirestore==='function')window.publishCompletionToFirestore(rec);}catch(e){}
    // Refresh all views
    try{renderChallenges();}catch(e){}
    try{buildDashboard();}catch(e){}
    try{if(window.currentMainView==='calendar'&&typeof window.renderCalendar==='function')window.renderCalendar();}catch(e){}
    try{if(typeof toast==='function')toast('+'+pts+' Punkte ✓','ok');}catch(e){}
  };

  window.undoChallenge=function(id){
    const me=myId(), td=todayStr();
    const removed=[];
    window.challengeCompletions=(window.challengeCompletions||[]).filter(c=>{
      const hit=String(c.challengeId)===String(id)&&
        String(c.date||'').slice(0,10)===td&&
        String(c.playerId||c.email||c.userEmail||'').toLowerCase()===me;
      if(hit)removed.push(c);
      return !hit;
    });
    try{if(window.ChangeChallengeStoreBridge&&typeof window.ChangeChallengeStoreBridge.replaceCompletions==='function')window.ChangeChallengeStoreBridge.replaceCompletions(window.challengeCompletions);else if(typeof ls==='function')ls('challenge_completions',window.challengeCompletions);}catch(e){}
    // Delete from Firestore
    try{
      if(typeof firebase!=='undefined'&&firebase.firestore){
        const db=firebase.firestore();
        removed.forEach(c=>c.id&&db.collection('change_completions').doc(String(c.id)).delete().catch(()=>{}));
      }
    }catch(e){}
    try{renderChallenges();}catch(e){}
    try{buildDashboard();}catch(e){}
    try{if(window.currentMainView==='calendar'&&typeof window.renderCalendar==='function')window.renderCalendar();}catch(e){}
    try{if(typeof toast==='function')toast(removed.length?'Zurückgesetzt':'Nichts zurückzusetzen','');}catch(e){}
  };

  window._execResetToday=function(){
    try{
      const me2=myId(), td2=todayStr();
      window.challengeCompletions=(window.challengeCompletions||[]).filter(c=>
        !(String(c.date||'').slice(0,10)===td2&&String(c.playerId||c.email||c.userEmail||'').toLowerCase()===me2));
      if(window.ChangeChallengeStoreBridge&&typeof window.ChangeChallengeStoreBridge.replaceCompletions==='function') window.ChangeChallengeStoreBridge.replaceCompletions(window.challengeCompletions);
      else if(typeof ls==='function') ls('challenge_completions',window.challengeCompletions);
      if(typeof renderChallenges==='function') renderChallenges();
      if(typeof window.buildDashboard==='function') window.buildDashboard();
      if(typeof renderWeekBar==='function') renderWeekBar();
      if(typeof closePanel==='function') closePanel();
      if(typeof toast==='function') toast('Heute zurückgesetzt ✓','ok');
    }catch(err){console.warn('Reset:',err);}
  };
  window.resetTodayChallenges=function(){
    if(typeof openPanel==='function'){
      openPanel('Heute zurücksetzen',
        '<div class="push-box" style="margin-bottom:16px"><div class="push-status">Alle deine heutigen Erledigungen werden gelöscht und die Punkte abgezogen.</div></div>'+
        '<button class="btn btn-danger btn-full" onclick="window._execResetToday()">Zurücksetzen</button>'+
        '<button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="closePanel()">Abbrechen</button>');
    }
  };

  /* ==== PLAYER STATS ==== */
  function playerStats(){
    const td=todayStr(), me=myId();
    const by={};
    (window.challengePlayers||[]).forEach(p=>{
      const id=String(p.email||p.id||'').toLowerCase();
      if(!id||id==='local-user'||/^demo/.test(id)) return;
      by[id]={id,name:p.name||p.email||id,total:0,today:0,count:0,online:!!p.online};
    });
    (window.challengeCompletions||[]).forEach(c=>{
      const id=String(c.playerId||c.userEmail||c.email||'').toLowerCase();
      if(!id||id==='local-user'||/^demo/.test(id)) return;
      if(!by[id]) by[id]={id,name:c.playerName||id,total:0,today:0,count:0,online:id===me};
      const pts=parseInt(c.points,10)||0;
      by[id].total+=pts; by[id].count++;
      if(String(c.date||'').slice(0,10)===td) by[id].today+=pts;
    });
    // Always include current user with correct name
    if(me!=='local-user'){
      if(!by[me]){
        const info=window.userInfo||{};
        by[me]={id:me,name:info.name||me,total:0,today:0,count:0,online:true};
      }
      by[me].online=true;
      // Ensure name is the display name, not the email
      if(by[me].name===me&&window.userInfo&&window.userInfo.name){
        by[me].name=window.userInfo.name;
      }
    }
    return Object.values(by).sort((a,b)=>b.total-a.total);
  }

  /* ==== UPCOMING HOLIDAYS ==== */
  function upcomingHolidays(limit){
    const out=[];
    if(typeof window.getHolidaysForDate!=='function') return out;
    const today=new Date();
    for(let i=0;i<120&&out.length<(limit||4);i++){
      const d=new Date(today);d.setDate(today.getDate()+i);
      const dk=dkOf(d);
      try{(window.getHolidaysForDate(dk)||[]).forEach(h=>{
        if(out.length<(limit||4)) out.push({date:dk,name:h.name||h.title||'Feiertag'});
      });}catch(e){}
    }
    return out;
  }

  /* ====
     BUILD DASHBOARD
  ==== */
  function buildDashboard(){
    const g$=$('dash-greeting'), s$=$('dash-sub');
    if(g$){
      const h=new Date().getHours();
      const gr=h<12?'Guten Morgen':h<17?'Guten Tag':'Guten Abend';
      const name=(window.userInfo&&window.userInfo.name||'').split(' ')[0];
      g$.textContent=gr+(name?', '+name:'');
    }
    if(s$) s$.textContent=new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    const grid=$('dash-grid');
    if(!grid) return;
    const td=todayStr();

    /* ==== Calendar rows: merged + chronological + range support ==== */
    const holidays=upcomingHolidays(6);
    const eventsRaw=allEvents()
      .filter(e=>{
        // Show if startDate is upcoming OR event range overlaps with today–90d
        const start=e.startDate||e.date;
        const end=e.endDate||e.date;
        return diffDays(start)<=90&&diffDays(end)>=0;
      });

    // Deduplicate events (Google + local may overlap)
    const seen=new Set();
    const events=eventsRaw.filter(e=>{
      const k=(e.googleEventId?'g:'+e.googleEventId:'l:'+(e.id||e.title||''))+'|'+(e.startDate||e.date);
      if(seen.has(k))return false; seen.add(k); return true;
    });

    // Merge holidays + events into one list
    const combined=[];
    holidays.forEach(h=>combined.push({type:'holiday',date:h.date,name:h.name}));
    events.forEach(ev=>{
      const start=ev.startDate||ev.date;
      const end=ev.endDate||ev.date;
      combined.push({type:'event',date:start,endDate:end,ev});
    });
    combined.sort((a,b)=>a.date.localeCompare(b.date));

    // Deduplicate and cap
    const rowSeen=new Set();
    const rows=combined.filter(r=>{
      const k=r.type+'|'+r.date+'|'+(r.name||r.ev?.title||'');
      if(rowSeen.has(k))return false; rowSeen.add(k); return true;
    }).slice(0,9);

    let calRows='';
    rows.forEach(r=>{
      const diff=diffDays(r.date);
      const isToday=r.date===td;
      const rowStyle=isToday?'border-left:3px solid var(--acc);background:linear-gradient(90deg,rgba(45,106,79,.04),transparent);':'';
      const titleStyle=isToday?'font-weight:800;color:var(--acc)':'';

      if(r.type==='holiday'){
        const badge=diff===0?'Heute':diff===1?'Morgen':fmtShort(r.date);
        const bClass=isToday?'badge-green':diff<=1?'badge-amber':'badge-amber';
        calRows+=`<div class="dash-row" style="${rowStyle}" onclick="setMainView('calendar')">
          <div class="dash-row-icon" style="background:var(--amb-d)">🎉</div>
          <div class="dash-row-body">
            <div class="dash-row-title" style="${titleStyle}">${esc(r.name)}</div>
            <div class="dash-row-sub">Feiertag</div>
          </div>
          <span class="dash-row-badge ${bClass}">${esc(badge)}</span>
        </div>`;
      } else {
        const ev=r.ev;
        const start=r.date, end=r.endDate||r.date;
        const hasRange=end&&end!==start;
        let badge;
        if(hasRange){
          badge=fmtShort(start)+' – '+fmtShort(end);
        } else {
          badge=diff===0?'Heute':diff===1?'Morgen':fmtShort(start);
        }
        const bClass=isToday?'badge-green':diff===0?'badge-green':diff<=1?'badge-red':diff<=3?'badge-amber':'badge-blue';
        const colBg=ev.color==='red'?'var(--red-d)':ev.color==='green'?'var(--grn-d)':ev.color==='amber'?'var(--amb-d)':ev.color==='purple'?'var(--pur-d)':'var(--acc-d)';
        const title=esc(ev.title||ev.summary||'Termin').replace(/\bZeitraum\b\s*:?\s*/gi,'').trim();
        calRows+=`<div class="dash-row" style="${rowStyle}" onclick="setMainView('calendar')">
          <div class="dash-row-icon" style="background:${colBg}">📅</div>
          <div class="dash-row-body">
            <div class="dash-row-title" style="${titleStyle}">${title}</div>
            <div class="dash-row-sub">${fmtTimeRange(ev)||'Ganztägig'}</div>
          </div>
          <span class="dash-row-badge ${bClass}">${badge}</span>
        </div>`;
      }
    });

    /* ==== Heute-Streifen: immer sichtbar, egal ob Termine oder nicht ==== */
    /* Range-Events die heute noch aktiv sind (start<=today<=end) → Heute-Block */
    const todayEvents=rows.filter(r=>r.type==='holiday'?r.date===td:(r.date<=td&&(r.endDate||r.date)>=td));
    const todayDateFmt=new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
    const upcomingRows=rows.filter(r=>r.date>td);

    // Heute-Block
    let todayHtml='';
    if(todayEvents.length===0){
      todayHtml=`<div class="dash-today-free">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:15px;height:15px;stroke-width:2;opacity:.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Heute keine Termine vorhanden
      </div>`;
    } else {
      let todayItemsHtml='';
      todayEvents.forEach(r=>{
        if(r.type==='holiday'){
          todayItemsHtml+=`<div class="dash-row dash-today-row" onclick="setMainView('calendar')">
            <div class="dash-row-icon" style="background:var(--amb-d)">🎉</div>
            <div class="dash-row-body"><div class="dash-row-title">${esc(r.name)}</div><div class="dash-row-sub">Feiertag</div></div>
            <span class="dash-row-badge badge-green">Heute</span>
          </div>`;
        } else {
          const ev=r.ev, colBg=ev.color==='red'?'var(--red-d)':ev.color==='green'?'var(--grn-d)':ev.color==='amber'?'var(--amb-d)':ev.color==='purple'?'var(--pur-d)':'var(--acc-d)';
          todayItemsHtml+=`<div class="dash-row dash-today-row" onclick="setMainView('calendar')">
            <div class="dash-row-icon" style="background:${colBg}">📅</div>
            <div class="dash-row-body"><div class="dash-row-title" style="font-weight:800;color:var(--acc)">${esc(ev.title||'Termin')}</div><div class="dash-row-sub">${fmtTimeRange(ev)||'Ganztägig'}</div></div>
            <span class="dash-row-badge badge-green">Heute</span>
          </div>`;
        }
      });
      todayHtml=todayItemsHtml;
    }

    // Demnächst-Block (nur wenn noch Platz bleibt)
    let upcomingHtml='';
    if(upcomingRows.length>0){
      // Trennlinie + Label
      upcomingHtml=`<div class="dash-section-divider">Demnächst</div>`;
      // Zeige max 5 weitere
      upcomingRows.slice(0,5).forEach(r=>{
        const diff=diffDays(r.date);
        if(r.type==='holiday'){
          const badge=diff===1?'Morgen':fmtShort(r.date);
          upcomingHtml+=`<div class="dash-row" onclick="setMainView('calendar')">
            <div class="dash-row-icon" style="background:var(--amb-d)">🎉</div>
            <div class="dash-row-body"><div class="dash-row-title">${esc(r.name)}</div><div class="dash-row-sub">Feiertag</div></div>
            <span class="dash-row-badge badge-amber">${badge}</span>
          </div>`;
        } else {
          const ev=r.ev, start=r.date, end=r.endDate||r.date, hasRange=end&&end!==start;
          const badge=hasRange?fmtShort(start)+' – '+fmtShort(end):(diff===1?'Morgen':fmtShort(start));
          const bClass=diff<=1?'badge-red':diff<=3?'badge-amber':'badge-blue';
          const colBg=ev.color==='red'?'var(--red-d)':ev.color==='green'?'var(--grn-d)':ev.color==='amber'?'var(--amb-d)':ev.color==='purple'?'var(--pur-d)':'var(--acc-d)';
          upcomingHtml+=`<div class="dash-row" onclick="setMainView('calendar')">
            <div class="dash-row-icon" style="background:${colBg}">📅</div>
            <div class="dash-row-body"><div class="dash-row-title">${esc(ev.title||'Termin')}</div><div class="dash-row-sub">${fmtTimeRange(ev)||'Ganztägig'}</div></div>
            <span class="dash-row-badge ${bClass}">${badge}</span>
          </div>`;
        }
      });
    } else if(todayEvents.length===0){
      upcomingHtml='<div class="dash-empty">Keine Termine in den nächsten 90 Tagen</div>';
    }

    const calCardBody=`<div class="db-section">Heute &nbsp;·&nbsp; ${todayDateFmt}</div>${todayHtml}${upcomingHtml}`;
    setTimeout(()=>{const _s=document.getElementById('dash-today-sub');if(_s)_s.textContent=todayDateFmt;},0);

    if(!calRows) calRows='<div class="dash-empty">Keine Termine oder Feiertage</div>';

    /* ==== Challenge + leaderboard rows ==== */
    const active=activeChallenges();
    const pending=active.filter(c=>!isDoneToday(c.id)).slice(0,4);
    let chRows=pending.map(c=>`<div class="dash-row" onclick="setMainView('challenges')">
      <div class="dash-row-icon" style="background:${c._optional?'var(--amb-d)':'var(--acc-d)'}">${esc(c.icon||'🏆')}</div>
      <div class="dash-row-body">
        <div class="dash-row-title">${esc(c.title||c.name||'Challenge')}${c._optional?'<span class="ch-optional-badge">Optional</span>':''}</div>
        <div class="dash-row-sub">${parseInt(c.points,10)||0} Punkte</div>
      </div>
      <span class="dash-row-badge badge-amber">offen</span>
    </div>`).join('');
    if(!chRows) chRows='<div class="dash-empty">Alle Challenges heute erledigt ✓</div>';

    const players=playerStats().slice(0,4);
    const medals=['🥇','🥈','🥉'];
    let plRows=players.map((p,i)=>`<div class="dash-row" onclick="setMainView('challenges')">
      <div class="dash-row-icon" style="background:var(--s2);font-size:13px">${medals[i]||String(i+1)}</div>
      <div class="dash-row-body">
        <div class="dash-row-title">${esc(p.name||p.id)}</div>
        <div class="dash-row-sub">Heute ${p.today} P · Gesamt ${p.total} P</div>
      </div>
    </div>`).join('');
    if(!plRows) plRows='<div class="dash-empty">Noch keine Mitspieler</div>';

    grid.innerHTML=
      `<div class="dash-card">
        <div class="dash-card-head">
          <div><div class="dash-card-title">📅 Kalender</div><div id="dash-today-sub" style="font-size:11px;color:var(--acc);font-weight:600;margin-top:2px"></div></div>
        </div>
        <div class="dash-card-body">${calCardBody}</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-head">
          <div><div class="dash-card-title">🏆 Challenges</div></div>
        </div>
        <div class="dash-card-body">
          <div class="dash-section-label">Heute offen</div>${chRows}
          <div class="dash-section-label" style="border-top:1px solid var(--b1)">Rangliste</div>${plRows}
        </div>
      </div>`;
  }

  /* ====
     RENDER CHALLENGES
  ==== */
  function renderChallenges(){
    const list$=$('challenges-list'), board$=$('leaderboard-list');
    if(!list$||!board$) return;

    // Ensure today's auto challenges are generated
    try{ if(typeof window.ensureDailyAutoChallenges==='function') window.ensureDailyAutoChallenges(todayStr()); }catch(e){}

    // Punkte-Kalender aktualisieren (change-pre.js übernimmt Positionierung)
    try{
      if(typeof window.renderWeekBar==='function') window.renderWeekBar();
    }catch(e){}

    const active=activeChallenges();
    const me=myId();
    const normal=active.filter(c=>!c._optional);
    const optional=active.filter(c=>!!c._optional);

    function chItem(ch){
      const done=isDoneToday(ch.id);
      const pts=parseInt(ch.points,10)||0;
      // Optionale Sportaufgaben zeigen bewusst keinen Link
      const url=ch._optional?'':(ch.url||ch.video||ch.youtube||ch.youtubeUrl||ch.link||'');
      const linkHtml=url?`<a class="ch-link" href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Übung ansehen ↗</a>`:'';
      const btnHtml=done
        ?`<button class="btn btn-success btn-sm ch-do-btn" disabled>Erledigt ✓</button>
           <button class="btn btn-undo btn-sm" title="Rückgängig" onclick="event.stopPropagation();window.undoChallenge('${esc(ch.id)}')">↶</button>`
        :`<button class="btn btn-primary btn-sm ch-do-btn" onclick="event.stopPropagation();window.completeChallenge('${esc(ch.id)}')">Erledigen</button>`;
      return `<div class="challenge-item ${done?'challenge-done':''}">
        <div class="challenge-icon">${esc(ch.icon||'🏆')}</div>
        <div class="challenge-body">
          <div class="ch-top-row">
            <span class="challenge-name">${esc(ch.title||ch.name||'Challenge')}</span>
            <span class="points-pill">+${pts}</span>
          </div>
          <div class="challenge-meta">${esc(ch.desc||'')}</div>
          <div class="ch-action-row">${linkHtml}${btnHtml}</div>
        </div>
      </div>`;
    }

    list$.setAttribute('data-render-owner','calendar-fallback');

    let html=normal.map(chItem).join('');
    if(optional.length){
      html+=`<div class="ch-optional-section">Optionale Punkte</div>`;
      html+=optional.map(chItem).join('');
    }
    list$.innerHTML=html||'<div class="dash-empty">Keine Challenges für heute</div>';

    // Leaderboard
    const players=playerStats();
    const medals=['🥇','🥈','🥉'];
    board$.innerHTML=players.length?players.map((p,i)=>{
      const isMe = String(p.id||'').toLowerCase() === String(me||'').toLowerCase();
      const nudgeTo = encodeURIComponent(String(p.id||''));
      const nudgeName = encodeURIComponent(String(p.name||p.id||'Mitspieler'));
      const nudgeBtn = isMe ? '' : `<button class="nudge-btn" onclick="event.stopPropagation();window.sendNudge&&window.sendNudge(decodeURIComponent('${nudgeTo}'),decodeURIComponent('${nudgeName}'))" title="Anfeuern" aria-label="${esc(p.name||p.id)} anfeuern"><span class="nudge-btn-icon">💪</span><span class="nudge-btn-label">Anfeuern</span></button>`;
      return `
      <div class="leader-row clickable" onclick="window.openPlayerRecentPanel&&window.openPlayerRecentPanel('${esc(p.id)}','${esc(p.name||p.id)}')">
        <div class="leader-rank">${medals[i]||String(i+1)}</div>
        <div style="flex:1;min-width:0">
          <div class="leader-name">${esc(p.name||p.id)}${p.online?'<span class="live-dot"></span>':''}</div>
          <div class="leader-detail">Heute: ${p.today} P · Gesamt: ${p.total} P · ${p.count} erledigt</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">${nudgeBtn}<div class="leader-score">${p.total}</div></div>
      </div>`;
    }).join(''):'<div class="dash-empty">Noch keine Mitspieler</div>';

    // Gruppen-Ziel direkt nach jeder Punkte-Änderung/live Sync aktualisieren,
    // ohne dass der Nutzer die Ansicht wechseln muss.
    if(typeof window.renderGroupGoal === 'function'){
      requestAnimationFrame(()=>window.renderGroupGoal());
    }
  }

  /* ====
     SET MAIN VIEW
  ==== */
  function setMainView(v){
    if(!['dashboard','calendar','challenges','pollen'].includes(v)) v='dashboard';
    window.currentMainView=v;
    const views={'dashboard-view':v==='dashboard'?'block':'none','cal-body':v==='calendar'?'flex':'none','challenges-view':v==='challenges'?'flex':'none','pollen-view':v==='pollen'?'flex':'none','cal-controls':v==='calendar'?'flex':'none'};
    Object.entries(views).forEach(([id,disp])=>{const el=document.getElementById(id);if(el)el.style.display=disp;});
    document.querySelectorAll('.h-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.bnav-item').forEach(t=>t.classList.remove('active'));
    document.getElementById('htab-'+v)?.classList.add('active');
    document.getElementById('bnav-'+v)?.classList.add('active');
    if(v==='dashboard') buildDashboard();
    if(v==='calendar'){window.renderCalendar&&window.renderCalendar();window.renderUpcoming&&window.renderUpcoming();}
    if(v==='challenges'){
      if(typeof window.renderChallenges==='function') window.renderChallenges();
      else renderChallenges();
    }
    if(v==='pollen' && typeof window.renderPollenView === 'function') window.renderPollenView();
    try{history.pushState({view:v},'','#/'+v);}catch(e){}
  }

  /* ==== CALENDAR CHALLENGE DOTS: override to use myId() ====
     Ensures calendar dots and Punkte-Kalender use the same ID
     as completeChallenge. */
  function challengePointsForDate(dk){
    const me=myId(), td=String(dk||'').slice(0,10);
    if(!td||me==='local-user') return 0;
    return (window.challengeCompletions||[]).reduce((sum,c)=>{
      const pid=String(c.playerId||c.userEmail||c.email||'').toLowerCase();
      if(String(c.date||'').slice(0,10)===td&&pid===me) sum+=parseInt(c.points,10)||0;
      return sum;
    },0);
  }
  window.getChallengePointsForDate=challengePointsForDate;
  window.getChallengeDayStatus=function(dk){
    const pts=challengePointsForDate(dk);
    return pts>0?{points:pts,done:true,allDone:true}:null;
  };

  /* ==== EXPOSE ==== */
  renderChallenges.__calendarFallback=true;
  // buildDashboard NOT assigned to window — patch version wins
  window.buildKPIs=function(){if(window.buildDashboard&&window.buildDashboard.__eventFix)window.buildDashboard();else buildDashboard();};
  if(!window.renderChallenges || !window.renderChallenges.__changeChallenges){
    window.renderChallenges=renderChallenges;
  }
  // setMainView: always use window.buildDashboard (patch version)
  window.setMainView=function(v,fr){
    if(!['dashboard','calendar','challenges','pollen'].includes(v))v='dashboard';
    currentMainView=v;
    ['dashboard','calendar','challenges','pollen'].forEach(function(n){
      var el=document.getElementById(n==='calendar'?'cal-body':n+'-view');
      if(el){el.style.display=(n===v)?'flex':'none';el.classList.toggle('route-hidden',n!==v);}
    });
    var cc=document.getElementById('cal-controls');if(cc)cc.style.display=v==='calendar'?'flex':'none';
    document.querySelectorAll('.h-tab').forEach(function(t){t.classList.remove('active');});
    var ht=document.getElementById('htab-'+v);if(ht)ht.classList.add('active');
    document.querySelectorAll('.bnav-item').forEach(function(t){t.classList.remove('active');});
    var bn=document.getElementById('bnav-'+v);if(bn)bn.classList.add('active');
    var fab=document.getElementById('fab');if(fab)fab.style.display=v==='calendar'?'flex':'none';
    if(v==='dashboard'){var bd=window.buildDashboard&&window.buildDashboard.__eventFix?window.buildDashboard:buildDashboard;bd();}
    if(v==='calendar'&&typeof renderCalendar==='function')renderCalendar();
    if(v==='challenges'){
      if(typeof window.renderChallenges==='function') window.renderChallenges();
      else if(typeof renderChallenges==='function') renderChallenges();
    }
    if(v==='pollen' && typeof window.renderPollenView === 'function') window.renderPollenView();
    if(!fr){try{history.pushState({view:v},'','#/'+v);}catch(e){location.hash='/'+v;}}
  };

  window.addEventListener('popstate',e=>{
    const v=(e.state&&e.state.view)||(location.hash.replace('#/',''))||'dashboard';
    setMainView(v);
  });

  /* ==== INIT ==== */
  function init(){
    injectFinalStyle();
    const route=location.hash.replace('#/','').replace('#','')||'dashboard';
    setMainView(['dashboard','calendar','challenges','pollen'].includes(route)?route:'dashboard');
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(init,200));
  } else {
    setTimeout(init,200);
  }

  window.addEventListener('load',()=>{
    setTimeout(init,500);
    setTimeout(()=>{
      // Re-assert after firebase auth resolves (myId() will now return email)
      // buildDashboard NOT reassigned here — patch version (today-section) must win
      if(!window.renderChallenges || !window.renderChallenges.__changeChallenges){
        window.renderChallenges=renderChallenges;
      }
      // setMainView NOT reassigned — our patched version stays
      window.getChallengeDayStatus=function(dk){const p=challengePointsForDate(dk);return p>0?{points:p,done:true,allDone:true}:null;};
      window.getChallengePointsForDate=challengePointsForDate;
      injectFinalStyle();
      if(window.currentMainView==='challenges'){
        if(typeof window.renderChallenges==='function') window.renderChallenges();
        else renderChallenges();
      }
    },2000);
    // Final override after step7 last timer (5200ms)
    setTimeout(()=>{
      // buildDashboard NOT reassigned here — patch version (today-section) must win
      if(!window.renderChallenges || !window.renderChallenges.__changeChallenges){
        window.renderChallenges=renderChallenges;
      }
      // setMainView NOT reassigned — our patched version stays
      window.getChallengeDayStatus=function(dk){const p=challengePointsForDate(dk);return p>0?{points:p,done:true,allDone:true}:null;};
      window.getChallengePointsForDate=challengePointsForDate;
      injectFinalStyle();
      if(window.currentMainView==='challenges'){
        if(typeof window.renderChallenges==='function') window.renderChallenges();
        else renderChallenges();
      }
    },5600);
  });

})();

/* ── change-holiday-state-persist-fix ── */
(function(){
  'use strict';
  const STATES={ALL:1,BW:1,BY:1,'BY-AUGSBURG':1,BE:1,BB:1,HB:1,HH:1,HE:1,MV:1,NI:1,NW:1,RP:1,SL:1,SN:1,ST:1,SH:1,TH:1};
  const LABEL_TO_STATE={
    'alle bundesländer':'ALL','alle bundeslaender':'ALL','baden-württemberg':'BW','baden-wuerttemberg':'BW','bayern':'BY','bayern · augsburg':'BY-AUGSBURG','bayern augsburg':'BY-AUGSBURG','augsburg':'BY-AUGSBURG','berlin':'BE','brandenburg':'BB','bremen':'HB','hamburg':'HH','hessen':'HE','mecklenburg-vorpommern':'MV','niedersachsen':'NI','nordrhein-westfalen':'NW','rheinland-pfalz':'RP','saarland':'SL','sachsen':'SN','sachsen-anhalt':'ST','schleswig-holstein':'SH','thüringen':'TH','thueringen':'TH'
  };
  function cleanState(v){
    if(v==null||v==='') return '';
    let s=String(v).trim();
    for(let i=0;i<3;i++){
      if((s[0]==='"'&&s[s.length-1]==='"')||(s[0]==="'"&&s[s.length-1]==="'")){
        try{s=JSON.parse(s);}catch(e){s=s.slice(1,-1);} s=String(s).trim();
      }
    }
    s=s.replace(/^BY_AUGSBURG$/i,'BY-AUGSBURG').toUpperCase();
    if(STATES[s]) return s;
    const low=String(v).trim().replace(/^"|"$/g,'').toLowerCase();
    return LABEL_TO_STATE[low]||'';
  }
  function readLegacyState(){
    const keys=['change_v1_holiday_state','holiday_state'];
    for(const k of keys){
      const raw=localStorage.getItem(k);
      let s=cleanState(raw); if(s) return s;
      try{s=cleanState(JSON.parse(raw||'null')); if(s) return s;}catch(e){}
    }
    return cleanState(window.calendarSettings&&window.calendarSettings.state)||'ALL';
  }
  function writeHolidayState(v){
    const s=cleanState(v)||'ALL';
    // Raw speichern: mehrere ältere Stellen lesen diesen Key ohne JSON.parse.
    localStorage.setItem('change_v1_holiday_state',s);
    localStorage.setItem('holiday_state',s);
    if(!window.calendarSettings) window.calendarSettings={};
    window.calendarSettings.state=s;
    return s;
  }
  window.getHolidayState=readLegacyState;
  window.setHolidayState=writeHolidayState;
  writeHolidayState(readLegacyState());

  if(typeof window.getGermanHolidays==='function'){
    window.getHolidaysForDate=function(dk){
      const y=parseInt(String(dk).slice(0,4),10), state=readLegacyState();
      return window.getGermanHolidays(y).filter(h=>h.date===dk&&(state==='ALL'||h.states.includes('ALL')||h.states.includes(state)));
    };
  }

  const _openSettings=window.openSettingsPanel;
  if(typeof _openSettings==='function'){
    window.openSettingsPanel=function(startTab){
      writeHolidayState(readLegacyState());
      const r=_openSettings.apply(this,arguments);
      setTimeout(function(){
        const el=document.getElementById('us-holiday-state')||document.getElementById('holiday-state');
        if(el){
          el.value=readLegacyState();
          if(!el._holidayPersistFix){
            el._holidayPersistFix=true;
            el.addEventListener('change',function(){
              writeHolidayState(el.value);
              if(typeof renderCalendar==='function') renderCalendar();
              if(typeof buildDashboard==='function') buildDashboard();
              // kein Toast bei Bundesland-Wechsel
            });
          }
        }
      },120);
      return r;
    };
  }

  window._saveCalSettings=function(){
    const o={showHolidays:true,showChallengeDots:true,showWeekNumbers:true};
    const h=document.getElementById('us-toggle-holidays')||document.getElementById('toggle-holidays'); if(h)o.showHolidays=h.checked;
    const d=document.getElementById('us-toggle-dots')||document.getElementById('toggle-dots'); if(d)o.showChallengeDots=d.checked;
    const k=document.getElementById('us-toggle-kw')||document.getElementById('toggle-kw'); if(k)o.showWeekNumbers=k.checked;
    try{localStorage.setItem('change_v1_calendar_view_options',JSON.stringify(o));localStorage.setItem('calendar_settings',JSON.stringify(o));}catch(e){}
    const se=document.getElementById('us-holiday-state')||document.getElementById('holiday-state');
    writeHolidayState(se?se.value:readLegacyState());
    if(typeof renderCalendar==='function') renderCalendar();
    if(typeof buildDashboard==='function') buildDashboard();
    // kein Toast bei Auto-Save
  };
  window.saveCalSettings=window._saveCalSettings;
  window.openCalendarSettings=function(){return window.openSettingsPanel?window.openSettingsPanel('calendar'):undefined;};
})();

/* ── change-final-local-event-delete-google-sync-visible ── */
(function(){
  'use strict';
  function $(id){return document.getElementById(id);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function todayKey(){var d=new Date();return d.toISOString().slice(0,10);}
  function dateKey(v){try{if(typeof D==='function')return D(v); if(v instanceof Date)return v.toISOString().slice(0,10); return String(v||'').slice(0,10)||todayKey();}catch(e){return todayKey();}}
  function addDays(k,n){var d=new Date(String(k)+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
  function uidSafe(){try{return typeof uid==='function'?uid():Math.random().toString(36).slice(2)+Date.now().toString(36);}catch(e){return Math.random().toString(36).slice(2)+Date.now().toString(36);}}
  function getToken(){try{if(typeof accessToken!=='undefined'&&accessToken)return accessToken;}catch(e){} return window.accessToken||'';}
  function demo(){try{return !!isDemoMode;}catch(e){return !!window.isDemoMode;}}
  function hasGoogle(){var t=getToken();return !!(t&&t!=='firebase-auth'&&!demo());}
  function eventStore(){return window.ChangeEventStore||null;}
  function allLocalEvents(){var store=eventStore();if(store&&typeof store.getEvents==='function')return store.getEvents();var arr=[];try{arr=Array.isArray(window.events)?window.events:(Array.isArray(events)?events:[]);}catch(e){arr=Array.isArray(window.events)?window.events:[]}return arr;}
  function persistEvents(arr){var store=eventStore();if(store&&typeof store.replaceEvents==='function'){store.replaceEvents(arr||[],{persist:true});arr=store.getEvents();}try{window.events=arr;events=arr;}catch(e){window.events=arr;}if(store)return;try{if(typeof ls==='function')ls('events',arr);else localStorage.setItem('change_v1_events',JSON.stringify(arr));}catch(e){try{localStorage.setItem('change_v1_events',JSON.stringify(arr));}catch(_){}}}
  function refresh(){try{if(typeof renderCalendar==='function')renderCalendar();}catch(e){}try{if(typeof renderUpcoming==='function')renderUpcoming();}catch(e){}try{if(typeof buildDashboard==='function')buildDashboard();}catch(e){}try{if(typeof checkNotifications==='function')checkNotifications();}catch(e){}try{if(typeof saveToDrive==='function')saveToDrive();}catch(e){}}
  function findEvent(id){try{if(typeof getEventById==='function')return getEventById(id);}catch(e){}return allLocalEvents().find(function(e){return String(e.id)===String(id);});}
  function range(ev){
    var s='',e='';
    if(ev){
      s=String(ev.startDate||ev.date||ev.dateKey||(ev.start&&ev.start.date)||(ev.start&&ev.start.dateTime?String(ev.start.dateTime).slice(0,10):'')||'').slice(0,10);
      e=String(ev.endDate||ev.dateEnd||ev.toDate||ev.untilDate||ev.date||ev.startDate||'').slice(0,10);
      if(!e&&ev.end&&ev.end.date){e=addDays(String(ev.end.date).slice(0,10),-1);}
      if(!e&&ev.end&&ev.end.dateTime){e=String(ev.end.dateTime).slice(0,10);}
    }
    if(!s)s=todayKey(); if(!e||e<s)e=s; return {start:s,end:e};
  }
  function addOneHour(time){var parts=String(time||'09:00').split(':');var h=(parseInt(parts[0],10)||9)+1,m=parseInt(parts[1],10)||0;if(h>23)h=23;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
  function eventTitle(ev){return String((ev&&(ev.title||ev.summary||ev.name))||'Termin').trim()||'Termin';}
  function eventTime(ev){if(ev&&ev.time)return String(ev.time).slice(0,5);if(ev&&ev.start&&ev.start.dateTime){try{return new Date(ev.start.dateTime).toTimeString().slice(0,5);}catch(e){}}return '';}
  function eventEndTime(ev){if(ev&&ev.endTime)return String(ev.endTime).slice(0,5);if(ev&&ev.end&&ev.end.dateTime){try{return new Date(ev.end.dateTime).toTimeString().slice(0,5);}catch(e){}}return '';}
  function eventTimeLabel(ev){var a=eventTime(ev),b=eventEndTime(ev);if(a&&b&&a!==b)return a+' – '+b;return a||'Ganztägig';}
  function fmtEventDate(k){try{if(typeof fmtDate==='function')return fmtDate(k);}catch(e){}try{return new Date(String(k)+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return String(k||'');}}
  function eventDateLabel(ev){var r=range(ev);return r.start===r.end?fmtEventDate(r.start):(fmtEventDate(r.start)+' – '+fmtEventDate(r.end));}
  function googleBadge(){return '<span class="cal-g" title="von Google">G</span>';}
  function shareActionsHtml(ev){try{return window.ChangeEventShare?window.ChangeEventShare.actionsHtml(ev):'';}catch(e){return '';}}
  function readonlyEventHtml(ev){return '<div class="day-detail-list"><div class="day-detail-event" style="margin-bottom:12px"><div class="day-detail-time">'+esc(eventTimeLabel(ev))+'</div><div class="day-detail-main"><div class="day-detail-title">'+esc(eventTitle(ev))+googleBadge()+'</div><div class="day-detail-sub">'+esc(eventDateLabel(ev))+'</div></div></div></div>'+shareActionsHtml(ev)+'<button class="btn btn-ghost btn-full" onclick="closePanel()">Schließen</button>';}

  window.syncEventToGoogleReliable = async function(ev){
    var token=getToken();
    if(!token||token==='firebase-auth'||demo()){try{toast('Google-Kalenderzugriff fehlt. Bitte mit Google-Kalenderzugriff anmelden.','err');}catch(e){}return false;}
    if(!ev||ev.source==='google')return false;
    var r=range(ev), tz=(Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Berlin');
    var timed=!!ev.time;
    var body={summary:ev.title||'Termin',description:ev.desc||''};
    if(timed){
      body.start={dateTime:r.start+'T'+ev.time+':00',timeZone:tz};
      body.end={dateTime:r.end+'T'+(ev.endTime||addOneHour(ev.time))+':00',timeZone:tz};
    }else{
      body.start={date:r.start};
      body.end={date:addDays(r.end,1)};
    }
    try{
      var url='https://www.googleapis.com/calendar/v3/calendars/primary/events'+(ev.googleEventId?'/'+encodeURIComponent(ev.googleEventId):'');
      var res=await fetch(url,{method:ev.googleEventId?'PATCH':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.status===401){try{if(typeof lsDel==='function')lsDel('access_token');}catch(e){}try{accessToken='';window.accessToken='';}catch(e){}try{toast('Google-Anmeldung abgelaufen. Bitte neu anmelden.','err');}catch(e){}return false;}
      if(!res.ok){var txt=await res.text().catch(function(){return String(res.status);});throw new Error('Google Kalender '+res.status+' '+txt.slice(0,120));}
      var saved=await res.json();
      var arr=allLocalEvents(), i=arr.findIndex(function(x){return String(x.id)===String(ev.id);});
      if(i>=0){arr[i].googleEventId=saved.id;arr[i].googleSyncedAt=new Date().toISOString();arr[i].googleSyncRequested=true;arr[i].syncedToGoogle=true;persistEvents(arr);}
      try{if(typeof loadGoogleEvents==='function')loadGoogleEvents();}catch(e){}
      refresh();
      try{toast('Mit Google Kalender synchronisiert ✓','ok');}catch(e){}
      return true;
    }catch(err){console.warn('Google Sync Termin:',err);try{toast('Google-Sync fehlgeschlagen: '+(err.message||err),'err');}catch(e){}return false;}
  };

  window.deleteEvent=function(id){
    var ev=allLocalEvents().find(function(e){return String(e.id)===String(id);});
    if(!ev||ev.source==='google'){try{toast('Nur selbst erstellte lokale Termine können gelöscht werden.','err');}catch(e){}return;}
    var msg=ev.googleEventId?'Diesen lokalen Termin löschen? Die Google-Kopie bleibt bestehen.':'Diesen lokalen Termin löschen?';
    if(!confirm(msg))return;
    persistEvents(allLocalEvents().filter(function(e){return String(e.id)!==String(id);}));
    try{if(typeof closePanel==='function')closePanel();}catch(e){}
    refresh();
    try{toast('Termin gelöscht ✓','ok');}catch(e){}
  };

  window.openEventPanel=function(id,pre){
    var ev=id?findEvent(id):null;
    if(ev&&ev.source==='google'){
      openPanel(eventTitle(ev),readonlyEventHtml(ev));
      return;
    }
    var dv=ev?(ev.startDate||ev.date):dateKey(pre||new Date()), ed=ev?(ev.endDate||ev.date||dv):dv;
    var syncOn=!!(ev&&(ev.googleSyncRequested||ev.googleEventId||ev.syncedToGoogle));
    var googleState=hasGoogle()?'':'<div class="settings-hint" style="margin-top:6px">Google-Kalenderzugriff ist aktuell nicht aktiv. Der Schalter wird beim Speichern geprüft.</div>';
    var html=''
      +'<div class="fg"><label class="flabel">Titel *</label><input class="finput" id="ev-title" value="'+esc(ev&&ev.title||'')+'"></div>'
      +'<div class="fr"><div class="fg"><label class="flabel">Von-Datum *</label><input type="date" class="finput" id="ev-date" value="'+esc(dv)+'"></div><div class="fg"><label class="flabel">Bis-Datum</label><input type="date" class="finput" id="ev-end-date" value="'+esc(ed)+'"></div></div>'
      +'<div class="fr"><div class="fg"><label class="flabel">Von Uhrzeit</label><input type="time" class="finput" id="ev-time" value="'+esc(ev&&ev.time||'')+'"></div><div class="fg"><label class="flabel">Bis Uhrzeit</label><input type="time" class="finput" id="ev-end" value="'+esc(ev&&ev.endTime||'')+'"></div></div>'
      +'<div class="fg"><label class="flabel">Farbe</label><select class="finput" id="ev-color">'+[['blue','Blau'],['green','Grün'],['amber','Gelb'],['red','Rot'],['purple','Lila']].map(function(x){return '<option value="'+x[0]+'" '+(((ev&&ev.color)||'blue')===x[0]?'selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></div>'
      +'<div class="fg"><label class="flabel">Beschreibung</label><textarea class="finput" id="ev-desc" rows="4">'+esc(ev&&ev.desc||'')+'</textarea></div>'
      +(ev?shareActionsHtml(ev):'')
      +'<div class="toggle-row" style="margin:8px 0 12px"><div class="toggle-copy"><div class="toggle-title">Mit Google Kalender synchronisieren</div><div class="settings-hint">Nur für diesen selbst erstellten Termin.</div></div><label class="switch"><input type="checkbox" id="ev-google-sync" '+(syncOn?'checked':'')+'><span class="slider"></span></label></div>'+googleState
      +'<div class="fa"><button class="btn btn-primary" style="flex:1" onclick="saveEvent(\''+esc(ev&&ev.id||'')+'\')">Speichern</button>'+(ev?'<button class="btn btn-danger" onclick="deleteEvent(\''+esc(ev.id)+'\')">Löschen</button>':'')+'</div>';
    openPanel(ev?'Termin bearbeiten':'Neuer Termin',html);
  };

  window.saveEvent=function(id){
    var title=($('ev-title')&&$('ev-title').value||'').trim(), date=$('ev-date')&&$('ev-date').value, end=($('ev-end-date')&&$('ev-end-date').value)||date;
    if(!title||!date){try{toast('Titel und Von-Datum fehlen','err');}catch(e){}return;}
    if(end<date)end=date;
    var arr=allLocalEvents(), old=id?arr.find(function(e){return String(e.id)===String(id);}):null, syncWanted=!!($('ev-google-sync')&&$('ev-google-sync').checked);
    var ev=Object.assign({},old||{}, {id:old?old.id:'ev_'+uidSafe(),title:title,date:date,startDate:date,endDate:end,time:($('ev-time')&&$('ev-time').value)||'',endTime:($('ev-end')&&$('ev-end').value)||'',color:($('ev-color')&&$('ev-color').value)||'blue',type:(old&&old.type)||'meeting',desc:(($('ev-desc')&&$('ev-desc').value)||'').trim(),source:'local',googleEventId:(old&&old.googleEventId)||'',googleSyncRequested:syncWanted,createdAt:(old&&old.createdAt)||new Date().toISOString(),updatedAt:new Date().toISOString()});
    var i=arr.findIndex(function(e){return String(e.id)===String(ev.id);}); if(i>=0)arr[i]=ev;else arr.push(ev); persistEvents(arr);
    try{if(typeof closePanel==='function')closePanel();}catch(e){}
    refresh();
    try{toast(old?'Termin aktualisiert ✓':'Termin gespeichert ✓','ok');}catch(e){}
    if(syncWanted){
      if(hasGoogle()) setTimeout(function(){window.syncEventToGoogleReliable(ev);},150);
      else try{toast('Google-Sync nicht möglich: Bitte mit Google-Kalenderzugriff anmelden.','err');}catch(e){}
    }
    return ev;
  };
})();
