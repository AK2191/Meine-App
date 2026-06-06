/* Change App · Sonstiges · kleine Helfer
 * Aus index.html extrahiert — Code unverändert
 * NICHT direkt bearbeiten — stattdessen in die passende core/ oder features/ Datei
 */

// [FIX HIGH-3] Clickjacking-Schutz (sicher, kein SecurityError)
try {
  if(window.top !== window.self){
    document.body.style.display='none';
    try { window.top.location.replace(window.self.location.href); } catch(_e) {
      // Cross-origin iframe — Seite einfach ausblenden
      document.body.innerHTML = '<p style="font-family:sans-serif;padding:20px">Diese App kann nicht in einem iframe geladen werden.</p>';
    }
  }
} catch(_e) { /* Sicherheitscheck nicht möglich — ignorieren */ }
// [FIX MED-5] Konsolen-Logs in Produktion unterdrücken
if(window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'){
  const _noop=()=>{};
  console.log=_noop;console.debug=_noop;console.info=_noop;
}

/* ── change-v3-text-cleanup ── */
(function(){
  const bad=['Heute ist deutlich hervorgehoben','Maximal 7 offene Aufgaben pro Tag','Maximal 7 Pflichtaufgaben pro Tag · Optional immer sichtbar','Punkte & erledigte Challenges','Aktuelle Woche · Challenge-Punkte','maximal 7 Pflichtaufgaben pro Tag.','oder mache ein leichtes bis mittleres Workout.','Browser-Berechtigung:','Hinweis: Wenn der Browser blockiert ist','Echte Push-Benachrichtigung'];
  function clean(root=document){
    root.querySelectorAll('.challenge-sub,.dash-card-sub,.push-status,.settings-hint,.dash-empty,.toggle-title,.toggle-sub').forEach(el=>{const t=el.textContent||''; if(bad.some(b=>t.includes(b))) el.textContent='';});
    root.querySelectorAll('button,.inline-text-btn').forEach(b=>{const t=(b.textContent||'').trim(); const oc=b.getAttribute('onclick')||''; if((t==='Test-Benachrichtigung anzeigen'||t==='')&&(oc.includes('testLocalPush')||oc.includes('showTestNotification'))) b.remove();});
    root.querySelectorAll('.toggle-row').forEach(r=>{if((r.textContent||'').includes('Echte Push')) r.remove();});
  }
  const old=window.openPushSettingsPanel; window.openPushSettingsPanel=function(){ if(typeof old==='function') old.apply(this,arguments); setTimeout(()=>clean(document.getElementById('panel-body')||document),0); };
  document.addEventListener('DOMContentLoaded',()=>clean());
  if(document.body) new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1) clean(n);}))).observe(document.body,{childList:true,subtree:true});
})();

/* ── change-user-fixes-4 ── */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const DAY=86400000;
  const pad=n=>String(n).padStart(2,'0');
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: +backtick]
  const key=d=>{try{if(typeof dateKey==='function')return dateKey(d)}catch(e){} const x=new Date(d);return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())};
  const parse=s=>new Date(String(s).slice(0,10)+'T12:00:00');
  const add=(d,n)=>new Date(new Date(d).getTime()+n*DAY);
  const monthNames=window.DE_MONTHS||['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  function fmt(s){try{if(typeof fmtDate==='function')return fmtDate(s)}catch(e){} const d=parse(s);return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear()}
  function opts(){let o={showHolidays:true,showChallengeDots:true,showWeekNumbers:true};try{Object.assign(o,JSON.parse(localStorage.getItem('change_v1_calendar_view_options')||'{}'))}catch(e){}return o}
  function r(ev){let s=ev?.startDate||ev?.date||ev?.dateKey||ev?.start?.date||(ev?.start?.dateTime?String(ev.start.dateTime).slice(0,10):'')||'';let e=ev?.endDate||ev?.date||ev?.dateKey||ev?.end?.date||(ev?.end?.dateTime?String(ev.end.dateTime).slice(0,10):'')||s;if(ev?.end?.date&&e>s)e=key(add(parse(e),-1));if(!e||e<s)e=s;return{start:s,end:e,isRange:s!==e}}
  function title(ev){return ev?.title||ev?.summary||ev?.name||'Termin'}
  function google(ev){if(ev?.source==='google'||String(ev?.id||'').startsWith('g_'))return '<span class="cal-g" title="von Google">G</span>';if(ev?.googleEventId||ev?.syncedToGoogle||ev?.googleSyncedAt)return '<span class="cal-g ok" title="an Google übertragen">✓</span>';return ''}
  function allEvents(){const out=[];try{(window.events||[]).forEach(ev=>{const x=r(ev);if(x.start)out.push(Object.assign({},ev,{date:x.start,startDate:x.start,endDate:x.end,source:ev.source||'local'}))})}catch(e){}try{if(window.googleCalendarSyncEnabled!==false&&localStorage.getItem('change_v1_google_calendar_sync')!=='false')(window.gEvents||[]).forEach(ge=>{let s=ge.start?.date||String(ge.start?.dateTime||'').slice(0,10);if(!s)return;let e=ge.end?.date||String(ge.end?.dateTime||'').slice(0,10)||s;if(ge.end?.date&&e>s)e=key(add(parse(e),-1));out.push({id:'g_'+ge.id,title:ge.summary||'(Kein Titel)',date:s,startDate:s,endDate:e<s?s:e,time:ge.start?.dateTime?new Date(ge.start.dateTime).toTimeString().slice(0,5):'',endTime:ge.end?.dateTime?new Date(ge.end.dateTime).toTimeString().slice(0,5):'',color:'blue',source:'google',googleEventId:ge.id,desc:ge.description||''})})}catch(e){}const seen=new Set();return out.filter(ev=>{const x=r(ev);const id=(ev.id||title(ev))+'|'+x.start+'|'+x.end;if(!x.start||seen.has(id))return false;seen.add(id);return true})}
  function evsOn(k){return allEvents().filter(e=>{const x=r(e);return x.start<=k&&x.end>=k}).sort((a,b)=>{const ar=r(a),br=r(b);if(ar.isRange!==br.isRange)return ar.isRange?-1:1;if(ar.isRange&&br.isRange)return ar.start.localeCompare(br.start)||ar.end.localeCompare(br.end)||title(a).localeCompare(title(b));return (a.time||'99:99').localeCompare(b.time||'99:99')||title(a).localeCompare(title(b))})}
  function hol(k){try{return getHolidaysForDate(k)||[]}catch(e){return[]}}
  function weekNo(dt){let d=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);let y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-y0)/DAY)+1)/7)}
  function currentIds(){const ids=new Set(['me','ich']);try{const p=typeof getCurrentPlayerId==='function'?getCurrentPlayerId():'';if(p)ids.add(String(p).toLowerCase())}catch(e){}try{if(window.userInfo?.email)ids.add(String(userInfo.email).toLowerCase());if(window.userInfo?.name)ids.add(String(userInfo.name).toLowerCase())}catch(e){}try{const u=firebase?.auth?.().currentUser;if(u?.email)ids.add(String(u.email).toLowerCase());if(u?.uid)ids.add(String(u.uid).toLowerCase())}catch(e){}return ids}
  function points(k){const ids=currentIds();let sum=0;(window.challengeCompletions||[]).forEach(c=>{const d=String(c.date||c.completedDate||'').slice(0,10);if(d!==k)return;const who=String(c.playerId||c.userEmail||c.email||'').toLowerCase();if(who&&ids.size&&![...ids].includes(who))return;const p=Number.parseInt(c.points,10);if(Number.isFinite(p)&&p>0)sum+=p});return sum>0?sum:0}
  function timeLabel(ev){if(!ev||!ev.time)return '';return ev.time+(ev.endTime&&ev.endTime!==ev.time?'–'+ev.endTime:'')+' ';}
  function rangeLabel(ev,k,dow){const x=r(ev);if(!x.isRange)return esc(timeLabel(ev)+title(ev));const show=k===x.start||dow===0;return show?esc(title(ev)):''}
  function rangeCls(ev,k,dow){const x=r(ev);if(!x.isRange)return '';const st=k===x.start||dow===0,en=k===x.end||dow===6;return ' is-range '+(st?'range-start ':'range-mid ')+(en?'range-end ':'')}
  window.getAllEvents=allEvents;
  window.getEventById=function(id){return (window.events||[]).find(e=>String(e.id)===String(id))||allEvents().find(e=>String(e.id)===String(id)||String(e.googleEventId)===String(id))||null};
  window.renderMonth=function(y,m){const grid=$('month-grid'),o=opts();if(!grid)return;grid.className='month-grid-stacked month-grid-polished change-month-final';grid.style.display='grid';grid.style.gridTemplateRows='repeat(6,1fr)';grid.innerHTML='';let first=new Date(y,m,1).getDay();first=first===0?6:first-1;const dim=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate(),cells=[];for(let i=0;i<first;i++)cells.push({d:prev-first+1+i,m:m?m-1:11,y:m?y:y-1,other:true});for(let i=1;i<=dim;i++)cells.push({d:i,m,y,other:false});while(cells.length<42){const n=cells.length-first-dim+1;cells.push({d:n,m:m===11?0:m+1,y:m===11?y+1:y,other:true})}for(let w=0;w<6;w++){const row=document.createElement('div');row.className='cal-week-stacked cal-week-polished';cells.slice(w*7,w*7+7).forEach((c,i)=>{const dt=new Date(c.y,c.m,c.d),k=key(dt),hs=hol(k),evs=evsOn(k),pts=points(k);const cell=document.createElement('div');cell.className='cal-day-stacked cal-day-polished'+(c.other?' other':'')+(i>4?' weekend':'')+((typeof isToday==='function'&&isToday(dt))?' today':'');cell.onclick=()=>{try{onDayClick(dt,evs)}catch(e){}};let html='<div class="cal-day-head"><span class="cal-day-num">'+c.d+'</span>'+(o.showHolidays&&hs.length?'<span class="cal-holiday-inline" title="'+esc(hs.map(h=>h.name).join(', '))+'">'+esc(hs[0].name)+'</span>':'')+'</div>';if(i===0&&o.showWeekNumbers)html+='<span class="cal-kw">KW '+weekNo(dt)+'</span>';html+='<div class="cal-event-stack">';evs.slice(0,4).forEach(e=>{html+='<button type="button" class="cal-event-chip '+esc(e.color||'blue')+rangeCls(e,k,i)+'" onclick="event.stopPropagation();openEventPanel(\''+esc(e.id||'')+'\')"><span class="cal-event-title">'+rangeLabel(e,k,i)+'</span>'+google(e)+'</button>'});if(evs.length>4)html+='<div class="cal-more">+'+(evs.length-4)+' weitere</div>';html+='</div>';if(o.showChallengeDots&&pts>0)html+='<span class="cal-points done">+'+pts+'P</span>';cell.innerHTML=html;row.appendChild(cell)});grid.appendChild(row)}};
  function getSafeCurDate(){
    let d=window.curDate;
    try{ if(typeof curDate!=='undefined'&&curDate instanceof Date&&!isNaN(curDate)) d=curDate; }catch(e){}
    if(!(d instanceof Date)||isNaN(d)) d=new Date();
    window.curDate=d;
    return d;
  }
  function setSafeCurDate(d){
    const next=(d instanceof Date&&!isNaN(d))?d:new Date();
    window.curDate=next;
    try{curDate=next;}catch(e){}
    return next;
  }
  function setSafeCalView(v){
    window.currentCalView=v;
    try{currentCalView=v;}catch(e){}
  }
  window.renderCalendar=function(){if(window.currentCalView==='year')window.currentCalView='month';const d=getSafeCurDate();const y=d.getFullYear(),m=d.getMonth();const ml=$('month-label'),ag=$('agenda-view'),wd=$('wday-row'),grid=$('month-grid');if(ml){ml.textContent=monthNames[m]+' '+y;ml.onclick=window.openMonthYearPicker;ml.setAttribute('role','button');ml.title='Monat wechseln'}$('vbtn-year')?.remove();['month','workweek','today'].forEach(v=>$('vbtn-'+v)?.classList.toggle('active',v==='month'));if(ag)ag.style.display='none';if(wd)wd.style.display='grid';if(grid)grid.style.display='grid';window.renderMonth(y,m);try{if(typeof renderUpcoming==='function')renderUpcoming()}catch(e){}};
  window.setCalView=function(v){if(v==='year'||v==='today'||v==='workweek')v='month';setSafeCalView(v);window.renderCalendar()};
  window.navigate=function(dir){const d=getSafeCurDate();setSafeCurDate(new Date(d.getFullYear(),d.getMonth()+dir,1));window.renderCalendar();try{if(typeof loadGoogleEvents==='function')loadGoogleEvents()}catch(e){}};
  window.goToday=function(){setSafeCurDate(new Date());setSafeCalView('month');window.renderCalendar()};
  window.openMonthYearPicker=function(){const d=getSafeCurDate();const y=d.getFullYear(),m=d.getMonth();let html='<div class="month-picker"><div class="mp-years"><button class="btn btn-secondary btn-sm" onclick="changePickerYear(-1)">‹</button><strong id="mp-year">'+y+'</strong><button class="btn btn-secondary btn-sm" onclick="changePickerYear(1)">›</button></div><div class="mp-grid">';monthNames.forEach((n,i)=>html+='<button class="mp-month '+(i===m?'active':'')+'" onclick="selectPickerMonth('+i+')">'+esc(n)+'</button>');html+='</div></div>';window.__pickerYear=y;if(typeof openPanel==='function')openPanel('Monat wählen',html)};
  window.changePickerYear=function(d){window.__pickerYear=(window.__pickerYear||getSafeCurDate().getFullYear())+d;const el=$('mp-year');if(el)el.textContent=window.__pickerYear};
  window.selectPickerMonth=function(m){const d=getSafeCurDate();setSafeCurDate(new Date(window.__pickerYear||d.getFullYear(),m,1));setSafeCalView('month');if(typeof closePanel==='function')closePanel();window.renderCalendar()};
  // Benachrichtigungen/Push werden zentral nach app.js geladen:
  // core/notifications/* + features/notifications/notificationBell.js
  let st=$('change-user-fixes-4-style');if(!st){st=document.createElement('style');st.id='change-user-fixes-4-style';document.head.appendChild(st)}
  st.textContent='#vbtn-year,#vbtn-workweek,#vbtn-today{display:none!important}.bell-push-box.visible{display:block!important}.cal-event-chip.is-range{order:-20;margin-left:-9px!important;margin-right:-9px!important;border-radius:0!important;background:rgba(45,106,79,.09)!important;border-color:rgba(45,106,79,.20)!important;color:var(--acc)!important}.cal-event-chip.is-range.range-start{margin-left:0!important;border-top-left-radius:8px!important;border-bottom-left-radius:8px!important}.cal-event-chip.is-range.range-end{margin-right:0!important;border-top-right-radius:8px!important;border-bottom-right-radius:8px!important}.cal-event-chip.is-range.range-mid .cal-event-title{color:transparent}.cal-points{position:absolute!important;right:7px!important;bottom:6px!important;top:auto!important;left:auto!important;max-width:56px!important;font-size:10px!important;line-height:1!important;font-weight:900!important;padding:3px 6px!important;border-radius:999px!important;color:var(--grn)!important;background:rgba(52,211,153,.13)!important;border:1px solid rgba(52,211,153,.22)!important;z-index:8!important;pointer-events:none!important}.month-picker{padding:4px 0}.mp-years{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:16px}.mp-years strong{font-size:18px}.mp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.mp-month{border:1px solid var(--b1);background:var(--s1);border-radius:12px;padding:12px 8px;font-weight:800;color:var(--t2);cursor:pointer}.mp-month.active,.mp-month:hover{background:var(--acc-d);color:var(--acc);border-color:rgba(45,106,79,.22)}';
  setTimeout(()=>{try{window.renderCalendar()}catch(e){console.warn('change-user-fixes-4',e)}},120);
})();

/* ========================================================
   SETTINGS SYNC — Kompatibilität
   Die echte zentrale Logik liegt in CHANGE SETTINGS SYNC.
   Dieser Block erzeugt keine zweite Firestore-Verbindung mehr.
======================================================== */
(function(){
  window.saveSettingsToFirestore = async function(){
    if(typeof window.saveChangeSettings === 'function') return window.saveChangeSettings(true);
    return false;
  };
  window.loadSettingsFromFirestore = async function(){
    if(typeof window.forceLoadChangeSettings === 'function') return window.forceLoadChangeSettings(true);
    return false;
  };
  console.warn('[Settings Sync] Kompatibilitätsmodul geladen ✓');
})();

/* KONFETTI + GRUPPEN-ZIEL DER WOCHE */
(function(){

/* ====
   KONFETTI — wenn alle Tages-Challenges erledigt
==== */
let _konfettiDone = false;

function checkAllDone(){
  try{
    const td = (typeof dateKey==='function') ? dateKey(new Date()) : new Date().toISOString().slice(0,10);
    const me = (typeof userInfo!=='undefined' ? userInfo.email : '') || '';
    const done = new Set((window.challengeCompletions||[])
      .filter(c => String(c.date||'').slice(0,10)===td &&
        (!me || String(c.playerId||c.email||'').toLowerCase()===me.toLowerCase()))
      .map(c => c.challengeId));
    const active = (window.challenges||[]).filter(c =>
      c && c.active!==false && !c.optional &&
      (c.recurrence==='daily' || !c.date || String(c.date||'').slice(0,10)===td)
    );
    return active.length > 0 && active.every(c => done.has(c.id));
  } catch(e){ return false; }
}

function launchKonfetti(){
  if(!window.confetti) return;
  // Erstes Feuerwerk von links
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { x: 0.2, y: 0.7 },
    colors: ['#2D6A4F','#4ADE80','#FFD700','#FF6B6B','#6366F1']
  });
  // Zweites Feuerwerk von rechts
  setTimeout(() => confetti({
    particleCount: 80,
    spread: 60,
    origin: { x: 0.8, y: 0.7 },
    colors: ['#2D6A4F','#4ADE80','#FFD700','#FF6B6B','#6366F1']
  }), 200);
  // Kleiner Regen von oben
  setTimeout(() => confetti({
    particleCount: 50,
    angle: 90,
    spread: 120,
    origin: { x: 0.5, y: 0 },
    colors: ['#2D6A4F','#4ADE80','#FFD700']
  }), 400);
}

// Hook in completeChallenge
const _confOrig = window.completeChallenge;
window.completeChallenge = function(id){
  if(typeof _confOrig === 'function') _confOrig.call(this, id);
  setTimeout(() => {
    const allDone = checkAllDone();
    if(allDone && !_konfettiDone){
      _konfettiDone = true;
      launchKonfetti();
      if(typeof toast === 'function')
        toast('🎉 Alle Challenges erledigt! Fantastisch!', 'ok');
    }
  }, 600);
};

// Reset Konfetti-Flag täglich
const _today = new Date().toISOString().slice(0,10);
if(localStorage.getItem('change_konfetti_date') !== _today){
  localStorage.setItem('change_konfetti_date', _today);
  _konfettiDone = false;
}

/* ====
   GRUPPEN-ZIEL DER WOCHE
==== */
const GOAL_KEY = 'change_group_goal';
const DEFAULT_GOAL = 350; // Fallback, falls dynamische Berechnung nicht verfügbar ist

function getWeekStart(){
  const d = new Date();
  const day = d.getDay() || 7; // Mo=1
  d.setDate(d.getDate() - (day - 1));
  return d.toISOString().slice(0,10);
}

function getCurrentChallengePlan(){
  var difficulty = 'easy', count = 7;
  try{
    if(window.ChangeChallengeDifficulty){
      difficulty = window.ChangeChallengeDifficulty.get ? window.ChangeChallengeDifficulty.get() : difficulty;
      count = window.ChangeChallengeDifficulty.getDailyCount ? window.ChangeChallengeDifficulty.getDailyCount() : count;
    }
  }catch(e){}
  return { challengeDifficulty: difficulty, autoChallengeCount: count };
}

function getGroupPlayersForGoal(){
  var list = [];
  try{ if(Array.isArray(window.challengePlayers)) list = list.concat(window.challengePlayers); }catch(e){}
  try{ if(typeof challengePlayers !== 'undefined' && Array.isArray(challengePlayers)) list = list.concat(challengePlayers); }catch(e){}
  var meEmail = '';
  try{ meEmail = String((window.userInfo && window.userInfo.email) || (typeof userInfo !== 'undefined' && userInfo && userInfo.email) || '').toLowerCase(); }catch(e){}
  var meName = '';
  try{ meName = String((window.userInfo && window.userInfo.name) || (typeof userInfo !== 'undefined' && userInfo && userInfo.name) || 'Du'); }catch(e){ meName='Du'; }
  var current = getCurrentChallengePlan();
  list.push({ id: meEmail || 'local', email: meEmail, name: meName || 'Du', challengeDifficulty: current.challengeDifficulty, autoChallengeCount: current.autoChallengeCount });
  var seen = new Set();
  return list.filter(function(p){
    if(!p) return false;
    var key = String(p.email || p.id || p.uid || p.name || '').toLowerCase();
    if(!key) key = 'p' + seen.size;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getGroupGoal(){
  try{
    if(window.ChangeChallengeDifficulty && typeof window.ChangeChallengeDifficulty.computeGroupGoal === 'function'){
      var computed = window.ChangeChallengeDifficulty.computeGroupGoal(getGroupPlayersForGoal());
      return Object.assign({ week: getWeekStart(), dynamic: true }, computed);
    }
  }catch(e){ console.warn('Dynamisches Gruppenziel:', e); }
  try{
    const saved = JSON.parse(localStorage.getItem(GOAL_KEY) || 'null');
    if(saved && saved.week === getWeekStart()) return saved;
    return { week: getWeekStart(), target: DEFAULT_GOAL, dynamic:false, players:1, subtitle:'Fallback-Ziel' };
  }catch(e){ return { week: getWeekStart(), target: DEFAULT_GOAL, dynamic:false, players:1, subtitle:'Fallback-Ziel' }; }
}

function saveGroupGoal(target){
  const goal = { week: getWeekStart(), target: parseInt(target)||DEFAULT_GOAL };
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
  // Firebase sync
  try{
    const db = window.firebase && firebase.firestore ? firebase.firestore() : null;
    const email = (typeof userInfo!=='undefined'?userInfo.email:'') || '';
    if(db && email && email.includes('@')){
      db.collection('change_settings').doc(
        email.toLowerCase().replace(/[^a-z0-9._-]/g,'_')
      ).set({ groupGoalTarget: goal.target, groupGoalWeek: goal.week }, {merge:true});
    }
  }catch(e){}
  renderGroupGoal();
}

window.getGroupGoal = getGroupGoal;
window.getGroupPoints = getGroupPoints;

function getGroupPoints(){
  const weekStart = getWeekStart();
  const d = new Date(weekStart);
  const days = [];
  for(let i=0;i<7;i++){
    days.push(new Date(d.getTime()+i*86400000).toISOString().slice(0,10));
  }
  // ALLE Spieler zählen — nicht nur eigene
  return (window.challengeCompletions||[])
    .filter(c => days.includes(String(c.date||'').slice(0,10)))
    .reduce((s,c) => s + (parseInt(c.points)||0), 0);
}

window.renderGroupGoal = function(){
  const existing = document.getElementById('group-goal-card');
  if(existing) existing.remove();
  document.querySelectorAll('.challenge-hero-metric-card').forEach(function(el){ el.remove(); });

  const goal = getGroupGoal();
  const points = getGroupPoints();
  const pct = Math.min(100, Math.round((points / goal.target) * 100));
  const done = points >= goal.target;
  const today = (typeof window.todayKey === 'function') ? window.todayKey() : new Date().toISOString().slice(0,10);
  const currentId = (typeof window.getCurrentPlayerId === 'function') ? window.getCurrentPlayerId() : '';
  const myTodayPoints = (window.challengeCompletions||[])
    .filter(function(c){ return String(c.date||'').slice(0,10) === today && (!currentId || c.playerId === currentId); })
    .reduce(function(sum,c){ return sum + (parseInt(c.points,10)||0); }, 0);
  const myDoneCount = (window.challengeCompletions||[])
    .filter(function(c){ return String(c.date||'').slice(0,10) === today && (!currentId || c.playerId === currentId); }).length;
  var openTodayCount = 0;
  try{
    openTodayCount = typeof window.getOpenChallengesForDashboard === 'function'
      ? ((window.getOpenChallengesForDashboard() || []).length)
      : 0;
  }catch(e){ openTodayCount = 0; }

  // Ziel-Karte ins Dashboard einfügen
  const dashBoard = document.querySelector('.challenge-card-head')?.parentElement ||
                    document.querySelector('.dash-card-body');
  if(!dashBoard) return;

  const card = document.createElement('div');
  card.id = 'group-goal-card';
  card.style.cssText = 'background:var(--s1);border:1px solid var(--b1);border-radius:var(--rlg,12px);padding:14px 16px;box-shadow:var(--sh)';

  var subtitle = goal.subtitle || (goal.dynamic ? 'Dynamisch nach Schwierigkeit & Tagesumfang' : 'Wöchentliches Gruppenziel');
  var modeLabel = goal.dynamic ? 'Dynamisch' : 'Fix';
  var planLabel = goal.label ? ' · ' + goal.label : '';
  var earnedBadges = [];
  var totalBadgeCount = 0;
  try{ earnedBadges = (typeof window.getEarnedBadges === 'function' ? window.getEarnedBadges() : []) || []; }catch(e){ earnedBadges = []; }
  try{ totalBadgeCount = Array.isArray(BADGES) ? BADGES.length : Math.max(earnedBadges.length, 0); }catch(e){ totalBadgeCount = Math.max(earnedBadges.length, 0); }
  var badgeLabel = earnedBadges.length + ' von ' + (totalBadgeCount || earnedBadges.length || 0);
  var badgeSub = earnedBadges.length + ' aktiv von ' + (totalBadgeCount || earnedBadges.length || 0) + ' gesamt';

  card.innerHTML = `
    <div class="challenge-goal-hero-inner challenge-goal-hero-clean">
      <div class="challenge-goal-main">
        <div class="challenge-goal-kicker"><span>🎯</span><span>Gesamtüberblick</span></div>
        <div class="challenge-goal-title">Gruppenziel</div>
        <div class="challenge-goal-sub">Kalenderwoche ${getWeekNumber()}</div>
        <div class="challenge-goal-progress-wrap">
          <div class="challenge-goal-progress-meta"><span>${pct}% erreicht</span><span>${points} von ${goal.target} P</span></div>
          <div class="challenge-goal-progress">
            <div style="width:${pct}%;background:${done?'var(--grn)':'var(--acc)'}"></div>
          </div>
        </div>
        ${done ? '<div class="challenge-goal-done">🎉 Ziel erreicht! Ihr seid großartig!</div>' : ''}
      </div>
      <div class="challenge-goal-side challenge-goal-action-list">
        <button type="button" class="challenge-goal-side-link challenge-goal-side-link-clickable challenge-goal-badges-compact" onclick="event.stopPropagation();window.openBadgePanel&&window.openBadgePanel()" title="Abzeichen öffnen">
          <span class="challenge-goal-link-icon">🎯</span>
          <span><b>Abzeichen</b><small>${badgeSub}</small></span>
          <strong>${badgeLabel}</strong>
        </button>
        <div class="challenge-goal-side-link challenge-goal-side-static"><span class="challenge-goal-link-icon">📍</span><span><b>Heute</b><small>${myDoneCount ? myDoneCount+' erledigt' : 'noch nichts erledigt'}</small></span><strong>${myTodayPoints} P</strong></div>
        <div class="challenge-goal-side-link challenge-goal-side-static"><span class="challenge-goal-link-icon">🗂</span><span><b>Offen</b><small>${openTodayCount===0 ? 'heute alles erledigt' : 'heute noch offen'}</small></span><strong>${openTodayCount}</strong></div>
      </div>
    </div>
  `;

  // Innerhalb des Challenge-Layouts als erstes Element einfügen (grid-column: 1/-1 per CSS)
  const challengeLayout = document.querySelector('.challenge-layout');
  if(challengeLayout){
    challengeLayout.insertBefore(card, challengeLayout.firstChild);

  }
};

// openGoalSettings entfernt — Ziel ist fest bei 350

function getWeekNumber(){
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - (d.getDay()+6)%7);
  const week1 = new Date(d.getFullYear(),0,4);
  return 1 + Math.round(((d.getTime()-week1.getTime())/86400000 - 3 + (week1.getDay()+6)%7)/7);
}

// Nach Login und Challenge-Erledigungen rendern
const _origBoot3 = window.bootMainApp;
window.bootMainApp = function(){
  if(typeof _origBoot3 === 'function') _origBoot3.apply(this, arguments);
  setTimeout(window.renderGroupGoal, 800);
};

const _origComplete2 = window.completeChallenge;
const _prevComplete = _origComplete2;
window.completeChallenge = function(id){
  const result = (typeof _prevComplete === 'function') ? _prevComplete.apply(this, arguments) : undefined;
  Promise.resolve(result).finally(()=>{
    requestAnimationFrame(()=>window.renderGroupGoal&&window.renderGroupGoal());
    setTimeout(()=>window.renderGroupGoal&&window.renderGroupGoal(), 350);
  });
  return result;
};

const _origUndoChallenge2 = window.undoChallenge;
window.undoChallenge = function(id){
  const result = (typeof _origUndoChallenge2 === 'function') ? _origUndoChallenge2.apply(this, arguments) : undefined;
  Promise.resolve(result).finally(()=>{
    requestAnimationFrame(()=>window.renderGroupGoal&&window.renderGroupGoal());
    setTimeout(()=>window.renderGroupGoal&&window.renderGroupGoal(), 350);
  });
  return result;
};

const _origResetTodayChallenges2 = window.resetTodayChallenges;
window.resetTodayChallenges = function(){
  const result = (typeof _origResetTodayChallenges2 === 'function') ? _origResetTodayChallenges2.apply(this, arguments) : undefined;
  Promise.resolve(result).finally(()=>{
    requestAnimationFrame(()=>window.renderGroupGoal&&window.renderGroupGoal());
    setTimeout(()=>window.renderGroupGoal&&window.renderGroupGoal(), 450);
  });
  return result;
};

const _origSetView2 = window.setMainView;
window.setMainView = function(view){
  if(typeof _origSetView2 === 'function') _origSetView2.apply(this, arguments);
  if(view === 'challenges') requestAnimationFrame(()=>window.renderGroupGoal&&window.renderGroupGoal());
};

})();

/* ==================================================
   ANFEUERN / ANSTUPSEN — Firestore + Push Nudge System
   Ablauf: Klick → Firestore change_nudges → Cloud Function/Empfänger
   Wichtig: Startet Firebase nicht selbst. Datenbank-Sync muss bereits aktiv sein.
================================================== */
(function(){

const NUDGE_MESSAGES = [
  'feuert dich an! 💪',
  'glaubt an dich! 🔥',
  'schickt dir Energie! ⚡',
  'sagt: Du schaffst das! 🎯',
  'ist stolz auf dich! 🌟',
  'schickt dir einen Schubs! 👊',
];

function normEmail(value){
  return String(value || '').trim().toLowerCase();
}

function isEmail(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function randomMessage(toEmail){
  try{
    if(window.ChangePlayerActivity && typeof window.ChangePlayerActivity.smartNudgeFor === 'function'){
      const smart = window.ChangePlayerActivity.smartNudgeFor(toEmail);
      if(smart && smart.message) return smart.message;
    }
  }catch(e){}
  return NUDGE_MESSAGES[Math.floor(Math.random()*NUDGE_MESSAGES.length)];
}

function getDb(){
  try{ return window.firebase && firebase.firestore ? firebase.firestore() : null; }
  catch(e){ return null; }
}

function readJson(key, fallback){
  try{ const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }catch(e){ return fallback; }
}

function readBool(key, fallback){
  const raw = readJson(key, undefined);
  if(raw === true || raw === false) return raw;
  try{
    const plain = localStorage.getItem(key);
    if(plain === 'true' || plain === '1') return true;
    if(plain === 'false' || plain === '0') return false;
  }catch(e){}
  return fallback;
}

function databaseSyncEnabled(){
  return readBool('database_sync_enabled', false) === true ||
         readBool('change_v1_database_sync_enabled', false) === true ||
         readBool('live_sync_enabled', false) === true ||
         readBool('change_v1_live_sync_enabled', false) === true;
}

function nudgeFirebaseReady(){
  try{
    if(!databaseSyncEnabled()) return false;
    if(window.isChangeFirebaseAuthReady) return !!window.isChangeFirebaseAuthReady();
    return !!(window.firebase && firebase.auth && firebase.auth().currentUser);
  }catch(e){ return false; }
}

function currentNudgeAccount(){
  let fu = null;
  try{ fu = window.firebase && firebase.auth && firebase.auth().currentUser; }catch(e){}
  const stored = Object.assign({}, readJson('change_v1_user_info', {}) || {}, readJson('user_info', {}) || {}, readJson('user_info_safe', {}) || {});
  const info = Object.assign({}, stored, window.userInfo || {});
  try{ if(typeof userInfo !== 'undefined') Object.assign(info, userInfo || {}); }catch(e){}
  const email = normEmail((fu && fu.email) || info.email || localStorage.getItem('change_v1_user_email') || localStorage.getItem('user_email') || '');
  const name = String((fu && fu.displayName) || info.name || info.displayName || (email ? email.split('@')[0] : 'Jemand')).trim();
  return { email, name };
}

function myEmail(){
  return currentNudgeAccount().email;
}

function myName(){
  return currentNudgeAccount().name || 'Jemand';
}

function toastSafe(message, type){
  try{ if(typeof toast === 'function') toast(message, type || ''); }catch(e){}
}

function setNudgeButtonState(toEmail, sent){
  try{
    const btns = Array.from(document.querySelectorAll('.nudge-btn'));
    const targetKey = encodeURIComponent(String(toEmail || ''));
    const targetBtns = btns.filter(b => {
      const oc = b.getAttribute('onclick') || '';
      return oc.includes(toEmail) || oc.includes(targetKey);
    });
    (targetBtns.length ? targetBtns : btns).forEach(b => {
      if(!(b.title||'').includes('Anfeuern')) return;
      if(sent) b.classList.add('sent');
      else b.classList.remove('sent');
    });
  }catch(e){}
}

function rememberFailedNudge(nudge, error){
  try{
    const arr = JSON.parse(localStorage.getItem('change_nudges_failed')||'[]');
    arr.push(Object.assign({}, nudge, { error:String((error && (error.code || error.message)) || error || ''), failedAt:new Date().toISOString() }));
    localStorage.setItem('change_nudges_failed', JSON.stringify(arr.slice(-20)));
  }catch(e){}
}

// ==== NUDGE SENDEN ====
window.sendNudge = async function(toEmail, toName){
  const from = myEmail();
  const to = normEmail(toEmail);
  const cleanName = String(toName || to || 'Mitspieler').trim();

  if(!isEmail(from)){
    toastSafe('Anfeuern braucht eine gültige Anmeldung.', 'err');
    return false;
  }
  if(!isEmail(to)){
    toastSafe('Dieser Mitspieler hat keine gültige E-Mail für Anfeuern.', 'err');
    return false;
  }
  if(from === to){
    toastSafe('Kannst du dir nicht selbst schicken 😄','');
    return false;
  }
  if(!databaseSyncEnabled()){
    toastSafe('Anfeuern braucht aktiven Datenbank-Sync, damit es beim anderen ankommt.', 'err');
    return false;
  }
  if(!nudgeFirebaseReady()){
    toastSafe('Datenbank-Sync ist noch nicht verbunden. Bitte Sync kurz aktivieren.', 'err');
    return false;
  }

  setNudgeButtonState(to, true);
  setTimeout(()=>setNudgeButtonState(to, false), 1800);

  const smart = (window.ChangePlayerActivity && typeof window.ChangePlayerActivity.smartNudgeFor === 'function') ? window.ChangePlayerActivity.smartNudgeFor(to) : null;
  const msg = randomMessage(to);
  const nudge = {
    from:      from,
    fromName:  myName(),
    to:        to,
    toName:    cleanName,
    message:   msg,
    reason:    smart && smart.reason ? String(smart.reason) : '',
    sentAt:    new Date().toISOString(),
    seen:      false
  };

  const db = getDb();
  if(!db){
    toastSafe('Datenbank-Sync ist nicht bereit. Anfeuern wurde nicht gesendet.', 'err');
    return false;
  }

  try{
    const payload = Object.assign({}, nudge);
    try{ payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); }catch(e){}
    await db.collection('change_nudges').add(payload);
    try{ if(window.ChangeAppStatus) window.ChangeAppStatus.markNudge(cleanName, nudge.reason); }catch(e){}
    toastSafe('💪 Anfeuern gesendet an '+cleanName+'!','ok');
    return true;
  }catch(e){
    console.warn('[Nudge send]', e);
    rememberFailedNudge(nudge, e);
    if(e && (e.code === 'permission-denied' || String(e.message||'').includes('Missing or insufficient permissions'))){
      toastSafe('Anfeuern wird noch von Firestore-Regeln blockiert. Bitte die neuen Rules deployen.', 'err');
    }else{
      toastSafe('Anfeuern konnte nicht gesendet werden.', 'err');
    }
    return false;
  }
};

// ==== NUDGES EMPFANGEN ====
window.checkIncomingNudges = async function(){
  const me = myEmail();
  if(!isEmail(me)) return;
  if(!nudgeFirebaseReady()) return;
  const db = getDb();
  if(!db) return;

  try{
    const snap = await db.collection('change_nudges')
      .where('to','==',me)
      .where('seen','==',false)
      .get();

    if(snap.empty) return;

    const nudges = snap.docs
      .map(d => Object.assign({id:d.id}, d.data() || {}))
      .sort((a,b) => String(b.sentAt || '').localeCompare(String(a.sentAt || '')));

    _storeNudgesForPanel(nudges);

    // Erst nach lokalem Speichern als gesehen markieren.
    const batch = db.batch();
    snap.docs.forEach(doc => {
      const update = {seen: true};
      try{ update.seenAt = firebase.firestore.FieldValue.serverTimestamp(); }catch(e){}
      batch.update(doc.ref, update);
    });
    await batch.commit();

    nudges.forEach((n, i) => {
      setTimeout(()=>{
        const sender = (typeof esc === 'function') ? esc(n.fromName || n.from || 'Jemand') : String(n.fromName || n.from || 'Jemand');
        toastSafe('💪 '+sender+' '+(n.message || 'feuert dich an!'), 'ok');
      }, i * 1200);
    });

    if(typeof updateBellIndicator === 'function') updateBellIndicator();
    if(window.ChangeNotifications && typeof window.ChangeNotifications.updateBellIndicator === 'function') window.ChangeNotifications.updateBellIndicator();

  }catch(e){
    if(!(e && (e.code === 'permission-denied' || String(e.message||'').includes('Missing or insufficient permissions')))) console.warn('[Nudge check]', e.message || e);
  }
};

function _storeNudgesForPanel(nudges){
  try{
    const arr = JSON.parse(sessionStorage.getItem('change_nudges_in')||'[]');
    const seen = new Set(arr.map(n => [n.from,n.sentAt,n.message].join('|')));
    nudges.forEach(n => {
      const item = Object.assign({}, n, { localSeen:false });
      const key = [item.from,item.sentAt,item.message].join('|');
      if(!seen.has(key)){ arr.unshift(item); seen.add(key); }
    });
    sessionStorage.setItem('change_nudges_in', JSON.stringify(arr.slice(0,10)));
  }catch(e){}
}

function markNudgesRead(){
  try{
    const arr = JSON.parse(sessionStorage.getItem('change_nudges_in')||'[]');
    sessionStorage.setItem('change_nudges_in', JSON.stringify(arr.map(n => Object.assign({}, n, {localSeen:true}))));
    if(typeof updateBellIndicator === 'function') updateBellIndicator();
    if(window.ChangeNotifications && typeof window.ChangeNotifications.updateBellIndicator === 'function') window.ChangeNotifications.updateBellIndicator();
  }catch(e){}
}

// ==== NUDGE-VERLAUF IM BENACHRICHTIGUNGS-PANEL ====
window.getNudgesPanelHtml = function(){
  try{
    const arr = JSON.parse(sessionStorage.getItem('change_nudges_in')||'[]');
    if(!arr.length) return '';

    const items = arr.slice(0,5).map(n=>{
      const when = n.sentAt ? new Date(n.sentAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) : '';
      const sender = (typeof esc === 'function') ? esc(n.fromName||n.from||'Jemand') : String(n.fromName||n.from||'Jemand');
      const message = (typeof esc === 'function') ? esc(n.message||'feuert dich an!') : String(n.message||'feuert dich an!');
      return `<div class="nudge-inbox-item">
        <div class="nudge-avatar">💪</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--t1)">${sender} ${message}</div>
          <div style="font-size:11px;color:var(--t4);margin-top:2px">${when}</div>
        </div>
      </div>`;
    }).join('');

    return `<div style="margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.06em;padding:0 16px 6px">Anfeuern</div>
      ${items}
    </div>`;
  }catch(e){ return ''; }
};

// ==== HOOKS ====
const _nudgeBoot = window.bootMainApp;
window.bootMainApp = function(){
  if(typeof _nudgeBoot === 'function') _nudgeBoot.apply(this, arguments);
  if(!window._changeNudgePollInstalled){
    window._changeNudgePollInstalled = true;
    setTimeout(window.checkIncomingNudges, 2000);
    setInterval(window.checkIncomingNudges, 5 * 60 * 1000);
  }
};

const _nudgeNotif = window.openNotifPanel;
window.openNotifPanel = function(){
  if(typeof _nudgeNotif === 'function') _nudgeNotif.apply(this, arguments);
  setTimeout(()=>{
    const panelBody = document.getElementById('panel-body');
    if(!panelBody) return;
    const nudgeHtml = window.getNudgesPanelHtml();
    if(nudgeHtml && !panelBody.querySelector('.nudge-inbox-item')){
      const div = document.createElement('div');
      div.innerHTML = nudgeHtml;
      panelBody.insertBefore(div, panelBody.firstChild);
      markNudgesRead();
    }else if(nudgeHtml){
      markNudgesRead();
    }
  }, 50);
};

console.warn('[Nudge] Anfeuern-System geladen ✓');
})();
