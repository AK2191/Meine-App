/* CHANGE · Dashboard/Calendar Refactor
   - compact dashboard calendar with visible holidays
   - combined challenges + players card
   - continuous multi-day bars in month calendar
   - no visible word "Zeitraum"
*/
(function(){
  'use strict';

  const DAY_MS=86400000;
  const pad=n=>String(n).padStart(2,'0');
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean=s=>String(s??'').replace(/\bZeitraum\b/gi,'').replace(/\s{2,}/g,' ').trim();

  function dateKey(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function todayKey(){return dateKey(new Date());}
  function parseDate(v){if(!v)return null;const d=v instanceof Date?new Date(v):new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(d)?null:d;}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
  function diffDays(a,b){const aa=new Date(a.getFullYear(),a.getMonth(),a.getDate());const bb=new Date(b.getFullYear(),b.getMonth(),b.getDate());return Math.round((bb-aa)/DAY_MS);}
  function deShort(v){const d=parseDate(v);return d?d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}):'';}
  function deRange(ev){const s=parseDate(ev.startDate||ev.fromDate||ev.date);const e=parseDate(ev.endDate||ev.toDate||ev.untilDate||ev.date);if(!s)return '';return e&&dateKey(s)!==dateKey(e)?deShort(s)+' – '+deShort(e):deShort(s);}
  function evStart(ev){return parseDate(ev.startDate||ev.fromDate||ev.date);}
  function evEnd(ev){return parseDate(ev.endDate||ev.toDate||ev.untilDate||ev.date);}
  function isMulti(ev){const s=evStart(ev),e=evEnd(ev);return !!(s&&e&&dateKey(s)!==dateKey(e));}
  function colorOf(ev){return ['blue','green','amber','red','purple'].includes(ev.color)?ev.color:'blue';}

  function getEvents(){try{if(typeof window.getAllEvents==='function')return window.getAllEvents()||[];}catch(e){}return Array.isArray(window.events)?window.events:[];}

  function getHolidayNameFor(v){
    const k=typeof v==='string'?v:dateKey(v);
    try{if(typeof window.getHolidayName==='function'){const h=window.getHolidayName(k);if(h)return h;}}catch(e){}
    try{if(typeof window.getHoliday==='function'){const h=window.getHoliday(k);if(typeof h==='string')return h;if(h&&h.name)return h.name;}}catch(e){}
    try{const list=[].concat(Array.isArray(window.holidays)?window.holidays:[],Array.isArray(window.feiertage)?window.feiertage:[]);const hit=list.find(h=>String(h.date||h.datum||h.key||'').slice(0,10)===k);if(hit)return hit.name||hit.title||hit.label||'';}catch(e){}
    return '';
  }

  function upcomingHolidays(limit){
    const start=parseDate(todayKey());const out=[];
    for(let i=0;i<370&&out.length<limit;i++){const d=addDays(start,i);const k=dateKey(d);const name=getHolidayNameFor(k);if(name)out.push({id:'holiday_'+k,title:name,date:k,isHoliday:true});}
    return out;
  }

  function injectCss(){
    let st=document.getElementById('change-dashboard-calendar-refactor-style');
    if(!st){st=document.createElement('style');st.id='change-dashboard-calendar-refactor-style';document.head.appendChild(st);}
    st.textContent=`
      #dash-grid{display:grid!important;grid-template-columns:minmax(300px,.85fr) minmax(360px,1.15fr)!important;gap:16px!important;align-items:start!important}
      @media(max-width:900px){#dash-grid{grid-template-columns:1fr!important}}
      .change-dash-list{display:flex;flex-direction:column}.change-dash-row{display:flex;align-items:center;gap:10px;min-height:42px;padding:9px 14px;border-bottom:1px solid var(--b1);cursor:pointer}.change-dash-row:last-child{border-bottom:none}.change-dash-row:hover{background:var(--bg)}
      .change-dash-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:var(--acc-d);font-size:14px}.change-dash-icon.holiday{background:var(--amb-d)}
      .change-dash-main{min-width:0;flex:1}.change-dash-title{font-size:13px;font-weight:750;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.change-dash-subtle{font-size:11px;font-weight:800;color:var(--amb);text-transform:uppercase;letter-spacing:.35px;margin-bottom:1px}
      .change-dash-badge{flex:0 0 auto;font-size:11px;font-weight:800;color:var(--grn);background:var(--grn-d);border:1px solid rgba(22,163,74,.14);padding:4px 8px;border-radius:999px;white-space:nowrap;font-family:var(--mono)}
      .change-combo-card .dash-card-body{display:grid;grid-template-columns:1fr 1fr;min-height:220px}@media(max-width:700px){.change-combo-card .dash-card-body{grid-template-columns:1fr}}
      .change-combo-section{min-width:0}.change-combo-section+.change-combo-section{border-left:1px solid var(--b1)}@media(max-width:700px){.change-combo-section+.change-combo-section{border-left:none;border-top:1px solid var(--b1)}}
      .change-combo-head{padding:10px 14px;font-size:11px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.45px;border-bottom:1px solid var(--b1);background:var(--bg)}
      .change-mini-row{display:flex;align-items:center;gap:10px;padding:10px 14px;min-height:44px;border-bottom:1px solid var(--b1)}.change-mini-row:last-child{border-bottom:none}.change-mini-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--pur-d);flex:0 0 auto}.change-mini-body{min-width:0;flex:1}.change-mini-title{font-size:13px;font-weight:750;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.change-mini-meta{font-size:11.5px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.change-mini-pill{font-size:11px;font-weight:800;border-radius:999px;padding:4px 8px;background:var(--acc-d);color:var(--acc);white-space:nowrap}.change-mini-pill.open{background:var(--amb-d);color:var(--amb)}
      #month-grid .week-row{position:relative!important;overflow:hidden!important}#month-grid .day-cell{position:relative;padding-top:34px!important}#month-grid .ev-chip[data-continuous-hidden="1"]{display:none!important}
      .change-range-bar{position:absolute;top:34px;height:19px;z-index:6;display:flex;align-items:center;padding:0 8px;font-size:10.5px;font-weight:700;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:auto;cursor:pointer;border-radius:0;border:1px solid rgba(45,106,79,.18);background:rgba(45,106,79,.10);color:var(--acc)}.change-range-bar.start{border-top-left-radius:8px;border-bottom-left-radius:8px}.change-range-bar.end{border-top-right-radius:8px;border-bottom-right-radius:8px}.change-range-bar.green{background:rgba(22,163,74,.10);border-color:rgba(22,163,74,.20);color:var(--grn)}.change-range-bar.amber{background:rgba(217,119,6,.10);border-color:rgba(217,119,6,.20);color:var(--amb)}.change-range-bar.red{background:rgba(220,38,38,.09);border-color:rgba(220,38,38,.18);color:var(--red)}.change-range-bar.purple{background:rgba(124,58,237,.09);border-color:rgba(124,58,237,.18);color:var(--pur)}
    `;
  }

  function visibleChallenges(){return (Array.isArray(window.challenges)?window.challenges:[]).filter(ch=>!ch.done&&!ch.completed).slice(0,4);}
  function visiblePlayers(){const seen=new Set();return (Array.isArray(window.challengePlayers)?window.challengePlayers:[]).filter(p=>p&&(p.email||p.id||p.name)).filter(p=>{const k=String(p.email||p.id||p.name||'').toLowerCase();if(seen.has(k))return false;seen.add(k);return true;}).slice(0,4);}
  function playerPoints(p){const id=String(p.email||p.id||'').toLowerCase();try{if(typeof window.getPlayerPointSummary==='function')return window.getPlayerPointSummary(id).todayPoints||0;}catch(e){}return (Array.isArray(window.challengeCompletions)?window.challengeCompletions:[]).filter(c=>String(c.playerId||c.email||c.userEmail||'').toLowerCase()===id).filter(c=>String(c.date||'')===todayKey()).reduce((s,c)=>s+(parseInt(c.points,10)||0),0);}

  function buildCalendarRows(){
    const now=todayKey();
    const events=getEvents().filter(ev=>ev&&(ev.date||ev.startDate||ev.fromDate)).map(ev=>({id:ev.id||ev.googleEventId||'',title:clean(ev.title||ev.summary||'Termin'),date:ev.date||ev.startDate||ev.fromDate||'',startDate:ev.startDate||ev.fromDate||ev.date||'',endDate:ev.endDate||ev.toDate||ev.untilDate||ev.date||'',badge:deRange(ev),isHoliday:false})).filter(ev=>String(ev.endDate||ev.date)>=now).sort((a,b)=>String(a.startDate||a.date).localeCompare(String(b.startDate||b.date))).slice(0,5);
    const combined=events.concat(upcomingHolidays(3)).sort((a,b)=>String(a.date||a.startDate).localeCompare(String(b.date||b.startDate))).slice(0,6);
    if(!combined.length)return '<div class="dash-empty">Keine kommenden Termine.</div>';
    return combined.map(item=>item.isHoliday?`<div class="change-dash-row"><div class="change-dash-icon holiday">🎌</div><div class="change-dash-main"><div class="change-dash-subtle">Feiertag</div><div class="change-dash-title">${esc(clean(item.title))}</div></div><span class="change-dash-badge">${esc(deShort(item.date))}</span></div>`:`<div class="change-dash-row" onclick="window.__changeOpenDashEvent&&window.__changeOpenDashEvent('${esc(item.id)}')"><div class="change-dash-icon">📅</div><div class="change-dash-main"><div class="change-dash-title">${esc(item.title)}</div></div><span class="change-dash-badge">${esc(item.badge)}</span></div>`).join('');
  }
  function buildChallengeRows(){const rows=visibleChallenges();return rows.length?rows.map(ch=>`<div class="change-mini-row"><div class="change-mini-icon">${esc(ch.icon||'🏆')}</div><div class="change-mini-body"><div class="change-mini-title">${esc(clean(ch.title||'Challenge'))}</div><div class="change-mini-meta">${esc(ch.points||0)} Punkte</div></div><span class="change-mini-pill open">offen</span></div>`).join(''):'<div class="dash-empty">Keine offenen Challenges.</div>';}
  function buildPlayerRows(){const rows=visiblePlayers();return rows.length?rows.map(p=>{const pts=playerPoints(p);return `<div class="change-mini-row"><div class="change-mini-icon">🏅</div><div class="change-mini-body"><div class="change-mini-title">${esc(p.name||p.email||'Mitspieler')}</div><div class="change-mini-meta">Heute: ${pts} P</div></div><span class="change-mini-pill">${pts} P</span></div>`;}).join(''):'<div class="dash-empty">Keine Mitspieler.</div>';}

  window.__changeOpenDashEvent=function(id){if(id&&typeof window.openEventPanel==='function')window.openEventPanel(id);};
  function renderDashboard(){injectCss();const grid=document.getElementById('dash-grid');if(!grid)return false;grid.innerHTML=`<div class="dash-card change-dash-calendar"><div class="dash-card-head"><div><div class="dash-card-title">📅 Kalender</div><div class="dash-card-sub">Nächste Termine und Feiertage</div></div></div><div class="dash-card-body change-dash-list">${buildCalendarRows()}</div></div><div class="dash-card change-combo-card"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenges & Mitspieler</div><div class="dash-card-sub">Offene Aufgaben und Punkte</div></div></div><div class="dash-card-body"><div class="change-combo-section"><div class="change-combo-head">Challenges</div>${buildChallengeRows()}</div><div class="change-combo-section"><div class="change-combo-head">Mitspieler</div>${buildPlayerRows()}</div></div></div>`;return true;}

  const oldBuild=window.buildDashCards;
  window.buildDashCards=function(){if(!renderDashboard()&&typeof oldBuild==='function')return oldBuild.apply(this,arguments);};

  function gridStart(){const cur=window.curDate instanceof Date?window.curDate:new Date();const first=new Date(cur.getFullYear(),cur.getMonth(),1);return addDays(first,-((first.getDay()+6)%7));}
  function removeBars(){document.querySelectorAll('.change-range-bar').forEach(x=>x.remove());}
  function hideDuplicateDayChips(events){const titles=new Set(events.map(ev=>clean(ev.title||'')).filter(Boolean));document.querySelectorAll('#month-grid .ev-chip').forEach(chip=>{const txt=clean(chip.textContent||'');for(const t of titles){if(txt.includes(t)){chip.dataset.continuousHidden='1';chip.style.display='none';break;}}});}
  function renderRangeBars(){injectCss();removeBars();const grid=document.getElementById('month-grid');if(!grid)return;const rows=Array.from(grid.querySelectorAll('.week-row'));if(!rows.length)return;const start=gridStart();const end=addDays(start,41);const events=getEvents().filter(isMulti).filter(ev=>{const s=evStart(ev),e=evEnd(ev);return s&&e&&e>=start&&s<=end;});hideDuplicateDayChips(events);rows.forEach((row,w)=>{const ws=addDays(start,w*7),we=addDays(ws,6);events.forEach(ev=>{const s=evStart(ev),e=evEnd(ev);if(!s||!e||e<ws||s>we)return;const ss=s>ws?s:ws,se=e<we?e:we;const sc=Math.max(0,diffDays(ws,ss)),ec=Math.min(6,diffDays(ws,se)),span=ec-sc+1;const bar=document.createElement('div');bar.className='change-range-bar '+colorOf(ev)+' '+(dateKey(ss)===dateKey(s)?'start ':'')+(dateKey(se)===dateKey(e)?'end':'');bar.style.left=`calc(${(sc/7)*100}% + 2px)`;bar.style.width=`calc(${(span/7)*100}% - 4px)`;bar.textContent=(dateKey(ss)===dateKey(s)||w===0)?clean(ev.title||''):'';bar.title=clean(ev.title||'');bar.addEventListener('click',evt=>{evt.stopPropagation();if(typeof window.openEventPanel==='function')window.openEventPanel(ev.id||ev.googleEventId);});row.appendChild(bar);});});}

  const oldRender=window.renderCalendar;
  if(typeof oldRender==='function'&&!oldRender.__changeDashboardCalendarRefactor){const fixed=function(){const res=oldRender.apply(this,arguments);setTimeout(renderRangeBars,0);setTimeout(renderRangeBars,80);return res;};fixed.__changeDashboardCalendarRefactor=true;window.renderCalendar=fixed;}

  window.addEventListener('load',()=>setTimeout(()=>{try{renderDashboard();renderRangeBars();}catch(e){}},500));
})();
