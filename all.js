






'use strict';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   CONSTANTS & STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const VER = '2.0';
const LSK = 'change_v1';
const GCAL_SCOPE = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

const DE_MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DE_MONTHS_S = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const DE_DAYS_F = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

let CLIENT_ID = '';
const DEFAULT_GOOGLE_CLIENT_ID = '357338141580-5m8f668fiih2pkuu6umj3j5hc2dsi78q.apps.googleusercontent.com';
function cleanGoogleClientId(value){
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^\/+/, '')
    .split(/[/?#]/)[0];
}
function getGoogleClientId(){
  const stored = cleanGoogleClientId(typeof ls === 'function' ? ls('client_id') : '');
  const id = stored || DEFAULT_GOOGLE_CLIENT_ID;
  try{ if(stored !== id) ls('client_id', id); }catch(e){}
  return id;
}
let accessToken = '';
let userInfo = {};
let isDemoMode = false;
let currentMainView = 'dashboard';
let currentCalView = 'month';
let curDate = new Date();

// Data
let events = [];
let gEvents = [];
let challenges = [];
let challengeCompletions = [];
let challengePlayers = [];
let notifications = [];


// Filter state
let invFilter = 'alle';
let conFilter = 'alle';

/* ── LOCAL STORAGE ── */
const ls = (k,v) => {
  if(v===undefined){try{return JSON.parse(localStorage.getItem(LSK+'_'+k));}catch{return null;}}
  try{localStorage.setItem(LSK+'_'+k,JSON.stringify(v));}catch{}
};
const lsDel = k => {try{localStorage.removeItem(LSK+'_'+k);}catch{}};
async function persistChangeState(){
  try{
    ls('events', events);
    ls('challenges', challenges);
    ls('challenge_completions', challengeCompletions);
    ls('challenge_players', challengePlayers);
    if(typeof registerLivePlayer==='function') registerLivePlayer();
  }catch(e){console.warn('Persist local:',e);}
}

/* ── DATE HELPERS ── */
const pad = n => String(n).padStart(2,'0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const isToday = d => {const t=new Date();return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate();};
const daysUntil = dk => {if(!dk)return 999;const d=new Date(dk+'T12:00:00'),t=new Date();t.setHours(0,0,0,0);d.setHours(0,0,0,0);return Math.round((d-t)/86400000);};
const fmtDate = dk => {if(!dk)return'—';const d=new Date(dk+'T12:00:00');return`${d.getDate()}. ${DE_MONTHS_S[d.getMonth()]} ${d.getFullYear()}`;};
const fmtMoney = v => {if(!v&&v!==0)return'—';return Number(v).toLocaleString('de-DE',{style:'currency',currency:'EUR'});};
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const uid = () => Math.random().toString(36).substring(2,10)+Date.now().toString(36);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   INIT
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
window.addEventListener('load', async () => {
  await new Promise(r => setTimeout(r,700));

  CLIENT_ID = getGoogleClientId();
  accessToken = ls('access_token') || '';
  userInfo = ls('user_info') || {};
  events = ls('events') || [];
  challenges = ls('challenges') || [];
  challengeCompletions = ls('challenge_completions') || [];
  challengePlayers = ls('challenge_players') || [];

  await handleFirebaseRedirectLogin();
  if(document.getElementById('main-app').style.display==='flex') { initPWA(); scheduleNotifCheck(); return; }

  lsDel('demo_mode'); isDemoMode=false;
  if(accessToken && userInfo.email){
    bootMainApp();
    loadGoogleData();
  } else if(CLIENT_ID){
    showLogin();
  } else {
    hideLd();
    document.getElementById('setup-modal').classList.add('show');
  }
  initPWA();
  scheduleNotifCheck();
});

function hideLd(){
  const el=document.getElementById('loading');
  el.style.opacity='0';
  setTimeout(()=>el.style.display='none',400);
}

/* ── PWA ── */
function initPWA(){
  if(!('serviceWorker' in navigator))return;
  navigator.serviceWorker.register('./firebase-messaging-sw.js', {scope:'./'}).catch(err=>{
    console.warn('Service Worker Registrierung fehlgeschlagen:', err);
  });
}

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  ls('pwa_install_available', true);
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  ls('pwa_installed', true);
  toast('Change wurde installiert ✓','ok');
});
function isStandaloneApp(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOSDevice(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function installChangeApp(){
  if(isStandaloneApp()){ toast('Change ist bereits als App geöffnet ✓','ok'); return; }
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(choice=>{
      toast(choice.outcome==='accepted'?'Installation gestartet ✓':'Installation abgebrochen', choice.outcome==='accepted'?'ok':'');
      deferredInstallPrompt=null;
      if(typeof openPushSettingsPanel==='function') openPushSettingsPanel();
    });
    return;
  }
  const ios=isIOSDevice();
  const android=/Android/i.test(navigator.userAgent);
  let steps='';
  if(ios){
    steps='<ol><li>Öffne diese Seite in Safari.</li><li>Tippe unten auf Teilen.</li><li>Wähle „Zum Home-Bildschirm“.</li><li>Starte Change danach vom Home-Bildschirm. Erst dann funktionieren iPhone-Pushs.</li></ol>';
  }else if(android){
    steps='<ol><li>Öffne diese Seite in Chrome.</li><li>Tippe oben rechts auf ⋮.</li><li>Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.</li><li>Falls der Punkt fehlt: Seite neu laden und kurz warten.</li></ol>';
  }else{
    steps='<ol><li>Nutze Chrome oder Edge.</li><li>Klicke rechts in der Adressleiste auf das Installieren-Symbol.</li><li>Alternativ Menü ⋮ → „Installieren“.</li></ol>';
  }
  openPanel('Change installieren', '<div class="push-box"><div class="challenge-title">Installation manuell starten</div><div class="push-status">Der Browser hat keinen automatischen Installationsdialog bereitgestellt.</div><div class="help-steps">'+steps+'</div></div>');
}
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   SETUP & AUTH
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function saveClientId(){
  const v=cleanGoogleClientId(document.getElementById('client-id-input').value);
  if(!v||!v.includes('.apps.googleusercontent.com')){toast('Bitte eine gültige Client-ID eingeben','err');return;}
  CLIENT_ID=v; ls('client_id',v);
  document.getElementById('setup-modal').classList.remove('show');
  showLogin();
}

function startDemo(){
  lsDel('demo_mode'); isDemoMode=false;
  toast('Demo-Modus wurde entfernt. Bitte mit Google anmelden.','err');
  showLogin();
}

function showLogin(){
  hideLd();
  document.getElementById('login-screen').style.display='flex';
}

function handleGoogleLogin(){
  CLIENT_ID = getGoogleClientId();
  if(!CLIENT_ID){document.getElementById('setup-modal').classList.add('show');return;}
  if(!window.google){toast('Google-Bibliothek wird geladen…','');return;}
  try{
    const tc=google.accounts.oauth2.initTokenClient({
      client_id:cleanGoogleClientId(CLIENT_ID),
      scope:GCAL_SCOPE,
      callback: async resp => {
        if(resp.error){toast('Anmeldung fehlgeschlagen: '+resp.error,'err');return;}
        accessToken=resp.access_token;
        ls('access_token',accessToken);
        isDemoMode=false; lsDel('demo_mode');
        await fetchUserInfo();
        bootMainApp();
        loadGoogleData();
      }
    });
    tc.requestAccessToken({prompt:'consent'});
  }catch(e){toast('Google-Anmeldung konnte nicht gestartet werden','err');}
}



async function firebaseMobileLoginFallback(){
  try{
    if(!window.firebase || !window.FIREBASE_CONFIG){toast('Firebase-Konfiguration fehlt','err');return;}
    if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.addScope('https://www.googleapis.com/auth/calendar');
    await firebase.auth().signInWithRedirect(provider);
  }catch(e){console.warn('Mobile Firebase Login:',e);toast('Mobile Anmeldung konnte nicht gestartet werden: '+(e.message||e),'err');}
}

async function handleFirebaseRedirectLogin(){
  try{
    if(!window.firebase || !window.FIREBASE_CONFIG || !firebase.auth) return;
    if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    const result = await firebase.auth().getRedirectResult();
    if(result && result.user){
      const u=result.user;
      userInfo={name:u.displayName||u.email,email:u.email,picture:u.photoURL||''};
      ls('user_info',userInfo);
      let oauthToken='';
      try{
        const cred=firebase.auth.GoogleAuthProvider.credentialFromResult(result);
        oauthToken=cred && cred.accessToken ? cred.accessToken : '';
      }catch(_e){}
      accessToken=oauthToken || 'firebase-auth';
      ls('access_token',accessToken);
      isDemoMode=false; lsDel('demo_mode');
      bootMainApp();
      initFirebaseLive && initFirebaseLive();
      if(oauthToken) loadGoogleData();
      toast('Mobile Anmeldung erfolgreich ✓','ok');
    }
  }catch(e){console.warn('Redirect Ergebnis:',e);}
}

async function fetchUserInfo(){
  try{
    const r=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{'Authorization':'Bearer '+accessToken}});
    if(!r.ok)return;
    const u=await r.json();
    userInfo={name:u.name||u.email,email:u.email,picture:u.picture||''};
    ls('user_info',userInfo);
  }catch{}
}

/* ── DEMO ── */
function startDemoInternal(){
  lsDel('demo_mode'); isDemoMode=false;
  showLogin();
}

function buildDemoEvents(){
  const b=new Date(),y=b.getFullYear(),m=b.getMonth(),d=b.getDate();
  const mk=offset=>{const dd=new Date(y,m,d+offset);return dateKey(dd);};
  return[
    {id:'d1',title:'Termin: Müller GmbH',date:mk(3),color:'red',type:'deadline',desc:'Rücksprache vorbereiten',notifDaysBefore:7,allDay:true,source:'local',createdAt:new Date().toISOString()},
    {id:'d2',title:'Team-Meeting',date:mk(1),time:'10:00',color:'blue',type:'meeting',desc:'Wöchentliches Update',notifDaysBefore:1,allDay:false,source:'local',createdAt:new Date().toISOString()},
    {id:'d3',title:'Rückfrage Weber AG',date:mk(5),color:'amber',type:'reminder',desc:'Unterlage prüfen',notifDaysBefore:3,allDay:true,source:'local',createdAt:new Date().toISOString()},
    {id:'d4',title:'Kundengespräch Hoffmann',date:mk(12),time:'14:00',color:'purple',type:'meeting',desc:'Neukunde – Erstgespräch',notifDaysBefore:1,allDay:false,source:'local',createdAt:new Date().toISOString()},
  ];
}



/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   BOOT
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function bootMainApp(){
  hideLd();
  document.getElementById('login-screen').style.display='none';
  document.getElementById('main-app').style.display='flex';

  const initials=(userInfo.name||'?').split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase();
  const av=document.getElementById('user-avatar');
  if(userInfo.picture){
    av.innerHTML=`<img src="${esc(userInfo.picture)}" alt="" onerror="this.parentElement.innerHTML='<span id=avatar-initials>${initials}</span>'">`;
  }else{
    av.innerHTML=`<span id="avatar-initials">${initials}</span>`;
  }

  setMainView('dashboard');
  checkNotifications();
  reqNotifPermission();

  // Greeting
  const h=new Date().getHours();
  const gr=h<12?'Guten Morgen':h<18?'Guten Tag':'Guten Abend';
  const name=userInfo.name?userInfo.name.split(' ')[0]:'';
  document.getElementById('dash-greeting').textContent=`${gr}${name?', '+name:''}`;
  document.getElementById('dash-sub').textContent=`${new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})} · Ihr persönlicher Überblick`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN VIEW CONTROLLER
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function setMainView(v){
  currentMainView=v;
  const views=['dashboard','calendar'];
  views.forEach(vv=>{
    const el=document.getElementById(vv==='calendar'?'cal-body':vv+'-view');
    if(el) el.style.display='none';
  });
  if(v==='calendar'){
    document.getElementById('cal-body').style.display='flex';
    document.getElementById('cal-controls').style.display='flex';
    renderCalendar();
    renderUpcoming();
  } else {
    document.getElementById('cal-controls').style.display='none';
    if(v==='challenges'){
      document.getElementById('challenges-view')?.style.setProperty('display','flex');
      renderChallenges?.();
    } else {
      document.getElementById('dashboard-view').style.display='block';
      buildDashboard();
    }
  }
  document.querySelectorAll('.h-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('htab-'+v)?.classList.add('active');
  document.querySelectorAll('.bnav-item').forEach(t=>t.classList.remove('active'));
  document.getElementById('bnav-'+v)?.classList.add('active');
}

function fabAction(){
  if(currentMainView==='calendar') openEventPanel(null);
  else if(currentMainView==='challenges') openChallengePanel(null);
  else openEventPanel(null);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function buildDashboard(){
  buildKPIs();
  buildDashCards();
}

function buildKPIs(){
  const allEvs=getAllEvents();
  const upcoming7=allEvs.filter(e=>{const d=daysUntil(e.date);return d>=0&&d<=7;}).length;
  const today=dateKey(new Date());
  const me=userInfo.email||'demo@example.com';
  const doneToday=(typeof challengeCompletions!=='undefined'?challengeCompletions:[]).filter(c=>c.date===today&&c.userEmail===me).length;
  const myPoints=(typeof calcStats==='function'?calcStats()[me]?.points:0)||0;
  document.getElementById('kpi-grid').innerHTML=`
    <div class="kpi-card${upcoming7>0?' warn':''}" onclick="setMainView('calendar')">
      <div class="kpi-icon-wrap blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
      <div class="kpi-num${upcoming7>0?' warn-color':''}">${upcoming7}</div>
      <div class="kpi-label">Termine diese Woche</div>
    </div>
    <div class="kpi-card good" onclick="setMainView('challenges')">
      <div class="kpi-icon-wrap green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5"/></svg></div>
      <div class="kpi-num good-color">${doneToday}</div>
      <div class="kpi-label">Challenges heute</div>
    </div>
    <div class="kpi-card" onclick="setMainView('challenges')">
      <div class="kpi-icon-wrap amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg></div>
      <div class="kpi-num">${myPoints}</div>
      <div class="kpi-label">Meine Punkte</div>
    </div>
    <div class="kpi-card" onclick="setMainView('calendar')">
      <div class="kpi-icon-wrap purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg></div>
      <div class="kpi-num">${allEvs.length}</div>
      <div class="kpi-label">Alle Termine</div>
    </div>`;
}

function buildDashCards(){
  const allEvs=getAllEvents();
  const upcoming=allEvs.filter(e=>daysUntil(e.date)>=0&&daysUntil(e.date)<=14).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);
  const evIcons={deadline:'⚠️',meeting:'📅',reminder:'🔔',other:'📌'};
  let evHtml='';
  if(!upcoming.length){evHtml=`<div class="dash-empty">Keine Termine in den nächsten 14 Tagen</div>`;}
  else upcoming.forEach(ev=>{
    const diff=daysUntil(ev.date);
    const lbl=diff===0?'Heute':diff===1?'Morgen':`in ${diff}T`;
    const bc=diff===0?'badge-red':diff<=3?'badge-amber':'badge-blue';
    evHtml+=`<div class="dash-row" onclick="setMainView('calendar');setTimeout(()=>openEventPanel('${ev.id}'),200)">
      <div class="dash-row-icon" style="background:var(--${ev.color==='blue'?'acc':ev.color==='green'?'grn':ev.color==='amber'?'amb':ev.color==='red'?'red':'pur'}-d)">${evIcons[ev.type]||'📅'}</div>
      <div class="dash-row-body"><div class="dash-row-title">${esc(ev.title)}</div><div class="dash-row-sub">${fmtDate(ev.date)}${ev.time?' · '+ev.time:''}</div></div>
      <span class="dash-row-badge ${bc}">${lbl}</span>
    </div>`;
  });
  let chHtml='<div class="dash-empty">Noch keine Challenge-Punkte</div>';
  if(typeof renderLeaderboardMini==='function') chHtml=renderLeaderboardMini();
  document.getElementById('dash-grid').innerHTML=`
    <div class="dash-card"><div class="dash-card-head"><div><div class="dash-card-title">📅 Anstehende Termine</div><div class="dash-card-sub">Nächste 14 Tage</div></div><button class="btn btn-ghost btn-sm" onclick="setMainView('calendar')">Alle →</button></div><div class="dash-card-body">${evHtml}</div></div>
    <div class="dash-card"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenge-Kontest</div><div class="dash-card-sub">Punkte &amp; Rangliste</div></div><button class="btn btn-ghost btn-sm" onclick="setMainView('challenges')">Öffnen →</button></div><div class="dash-card-body">${chHtml}</div></div>`;
}

function renderLeaderboardMini(){
  if(typeof calcStats!=='function'||typeof getPlayers!=='function') return '<div class="dash-empty">Keine Kontest-Daten</div>';
  const stats=calcStats();
  return getPlayers().sort((a,b)=>(stats[b.email]?.points||0)-(stats[a.email]?.points||0)).slice(0,5).map((p,idx)=>`<div class="dash-row" onclick="setMainView('challenges')"><div class="dash-row-icon" style="background:var(--amb-d)">${idx+1}</div><div class="dash-row-body"><div class="dash-row-title">${esc(p.name||p.email)}</div><div class="dash-row-sub">${stats[p.email]?.count||0} Challenges erledigt</div></div><span class="dash-row-badge badge-green">${stats[p.email]?.points||0} P</span></div>`).join('')||'<div class="dash-empty">Noch keine Punkte</div>';
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   CALENDAR
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderCalendar(){
  const y=curDate.getFullYear(),m=curDate.getMonth();
  document.getElementById('month-label').textContent=`${DE_MONTHS[m]} ${y}`;

  if(currentCalView==='month'){
    renderMonth(y,m);
    document.getElementById('month-grid').style.display='grid';
    document.getElementById('agenda-view').style.display='none';
    document.getElementById('wday-row').style.display='grid';
  }else{
    renderAgenda();
    document.getElementById('month-grid').style.display='none';
    document.getElementById('agenda-view').style.display='block';
    document.getElementById('wday-row').style.display='none';
  }
}

function renderMonth(y,m){
  const grid=document.getElementById('month-grid');
  grid.innerHTML='';
  let firstDay=new Date(y,m,1).getDay();
  firstDay=firstDay===0?6:firstDay-1;
  const dim=new Date(y,m+1,0).getDate();
  const prevDim=new Date(y,m,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push({d:prevDim-firstDay+1+i,m:m===0?11:m-1,y:m===0?y-1:y,other:true});
  for(let i=1;i<=dim;i++) cells.push({d:i,m,y,other:false});
  while(cells.length<42){const ld=cells.length-firstDay-dim+1;cells.push({d:ld,m:m===11?0:m+1,y:m===11?y+1:y,other:true});}
  const allEvs=getAllEvents();
  for(let w=0;w<6;w++){
    const row=document.createElement('div');row.className='week-row';
    for(let d=0;d<7;d++){
      const c=cells[w*7+d];
      const dt=new Date(c.y,c.m,c.d);
      const dk=dateKey(dt);
      const isWknd=d>=5;
      const isTod=isToday(dt);
      const dayEvs=allEvs.filter(e=>e.date===dk);
      const cell=document.createElement('div');
      cell.className='day-cell'+(c.other?' other':'')+(isWknd?' weekend':'')+(isTod?' today':'');
      cell.onclick=()=>onDayClick(dt,dayEvs);
      let html=`<div class="day-num-wrap"><div class="day-num">${c.d}</div></div>`;
      const maxV=window.innerWidth<480?1:2;
      dayEvs.slice(0,maxV).forEach(ev=>{
        html+=`<div class="ev-chip ${ev.color}" onclick="event.stopPropagation();openEventPanel('${ev.id}')">${esc(ev.title)}</div>`;
      });
      if(dayEvs.length>maxV)html+=`<div class="more-chip">+${dayEvs.length-maxV}</div>`;
      cell.innerHTML=html;row.appendChild(cell);
    }
    grid.appendChild(row);
  }
}

function renderAgenda(){
  const ag=document.getElementById('agenda-view');
  const allEvs=getAllEvents();
  const grouped={};
  allEvs.forEach(ev=>{if(!grouped[ev.date])grouped[ev.date]=[];grouped[ev.date].push(ev);});
  const sorted=Object.keys(grouped).sort().filter(dk=>{const d=daysUntil(dk);return d>=-30&&d<=180;});
  if(!sorted.length){
    ag.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="empty-title">Keine Termine</div><div class="empty-sub">Erstellen Sie Ihren ersten Termin mit dem + Button</div></div>`;
    return;
  }
  let html='';
  sorted.forEach(dk=>{
    const dt=new Date(dk+'T12:00:00');
    const diff=daysUntil(dk);
    const isT=diff===0;
    const evs=grouped[dk].sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
    const relLabel=diff===0?' · Heute':diff===1?' · Morgen':diff===-1?' · Gestern':'';
    html+=`<div class="ag-group">
      <div class="ag-header">
        <div class="ag-day-num${isT?' today':''}">${pad(dt.getDate())}</div>
        <div class="ag-day-info">
          <div class="ag-weekday">${DE_DAYS_F[dt.getDay()]}${relLabel}</div>
          <div class="ag-month-yr">${DE_MONTHS[dt.getMonth()]} ${dt.getFullYear()}</div>
        </div>
      </div>
      <div class="ag-events">`;
    evs.forEach(ev=>{
      const badge=getUrgencyBadge(ev.type,diff);
      html+=`<div class="ag-card ${ev.color}" onclick="openEventPanel('${ev.id}')">
        <div class="ag-time">${ev.time||'Ganztägig'}</div>
        <div class="ag-body">
          <div class="ag-title">${esc(ev.title)}</div>
          ${ev.desc?`<div class="ag-desc">${esc(ev.desc)}</div>`:''}
        </div>${badge}
      </div>`;
    });
    html+=`</div></div>`;
  });
  ag.innerHTML=html;
  setTimeout(()=>{ag.querySelector('.ag-day-num.today')?.closest('.ag-group')?.scrollIntoView({block:'start'});},80);
}

function getUrgencyBadge(type,diff){
  if(type!=='deadline')return'';
  if(diff<0) return`<span class="urgency-badge ub-crit">Überfällig</span>`;
  if(diff===0)return`<span class="urgency-badge ub-crit">Heute</span>`;
  if(diff<=7) return`<span class="urgency-badge ub-crit">${diff}T</span>`;
  if(diff<=30)return`<span class="urgency-badge ub-warn">${diff}T</span>`;
  return`<span class="urgency-badge ub-ok">${diff}T</span>`;
}

function navigate(dir){
  if(currentCalView==='month'){curDate=new Date(curDate.getFullYear(),curDate.getMonth()+dir,1);}
  else{curDate=new Date(curDate.getTime()+dir*30*86400000);}
  renderCalendar();
}
function goToday(){curDate=new Date();renderCalendar();}
function setCalView(v){
  currentCalView=v;
  ['month','agenda'].forEach(vv=>{
    document.getElementById('vbtn-'+vv)?.classList.toggle('active',vv===v);
  });
  renderCalendar();
}

function getAllEvents(){
  const all=[...events];
  gEvents.forEach(ge=>{
    all.push({
      id:'g_'+ge.id,title:ge.summary||'(Kein Titel)',
      date:ge.start?.date||ge.start?.dateTime?.substring(0,10)||'',
      time:ge.start?.dateTime?new Date(ge.start.dateTime).toTimeString().substring(0,5):'',
      color:'blue',type:'meeting',desc:ge.description||'',allDay:!!ge.start?.date,source:'google',notifDaysBefore:1
    });
  });
  return all.filter(e=>e.date);
}

function getEventById(id){return events.find(e=>e.id===id)||getAllEvents().find(e=>e.id===id);}

function onDayClick(dt,dayEvs){
  if(dayEvs.length===1) openEventPanel(dayEvs[0].id);
  else if(dayEvs.length>1) openDayPanel(dt,dayEvs);
  else openEventPanel(null,dt);
}

function renderUpcoming(){
  const allEvs=getAllEvents();
  const soon=allEvs.filter(ev=>{const d=daysUntil(ev.date);return d>=0&&d<=30;}).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,10);
  const cont=document.getElementById('upcoming-items');
  if(!cont)return;
  if(!soon.length){cont.innerHTML=`<span style="font-size:12px;color:var(--t5)">Keine Termine in den nächsten 30 Tagen</span>`;return;}
  cont.innerHTML=soon.map(ev=>{
    const diff=daysUntil(ev.date);
    const lbl=diff===0?'Heute':diff===1?'Morgen':`${diff}T`;
    const chip=ev.type==='deadline'?(diff<=7?'red':'amber'):ev.color;
    const shortTitle=ev.title.length>22?ev.title.substring(0,22)+'…':ev.title;
    return`<div class="us-chip ${chip}" onclick="openEventPanel('${ev.id}')"><span>${lbl}</span><span>${esc(shortTitle)}</span></div>`;
  }).join('');
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   EVENT PANEL (CALENDAR)
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function openEventPanel(id,preDate){
  const ev=id?getEventById(id):null;

  if(ev?.source==='google'){
    openPanel(ev.title,`
      <div style="background:var(--acc-d);border:1px solid rgba(79,125,255,.2);border-radius:var(--r);padding:12px 14px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--acc);margin-bottom:4px">📅 Google Kalender</div>
        <div style="font-size:14px;font-weight:700;color:var(--t1);margin-bottom:4px">${esc(ev.title)}</div>
        <div style="font-size:12px;color:var(--t4)">${fmtDate(ev.date)} ${ev.time?'· '+ev.time:''}</div>
        ${ev.desc?`<div style="font-size:12px;color:var(--t3);margin-top:8px;line-height:1.5">${esc(ev.desc)}</div>`:''}
      </div>
      <button class="btn btn-ghost btn-full" onclick="closePanel()">Schließen</button>
    `);
    return;
  }

  const dateVal=ev?.date||(preDate?dateKey(preDate):dateKey(new Date()));
  const types=[
    ['meeting','📅 Termin / Meeting'],['deadline','⚠️ Frist / Ablauf'],
['reminder','🔔 Erinnerung'],['other','📌 Sonstiges']
  ];
  const notifs=[['0','Am gleichen Tag'],['1','1 Tag vorher'],['3','3 Tage vorher'],['7','1 Woche vorher'],['14','2 Wochen vorher'],['30','1 Monat vorher']];
  const colors=['blue','green','amber','red','purple'];
  const curColor=ev?.color||'blue';

  const html=`
    ${isDemoMode?`<div style="background:var(--amb-d);border:1px solid rgba(245,158,11,.2);border-radius:var(--rsm);padding:9px 12px;margin-bottom:12px;font-size:12px;color:var(--amb)">⚡ Demo-Modus: Lokal gespeichert</div>`:''}
    <div class="fg"><label class="flabel">Titel *</label>
      <input type="text" class="finput" id="ev-title" placeholder="Terminbezeichnung" value="${esc(ev?.title||'')}">
    </div>
    <div class="fr">
      <div class="fg"><label class="flabel">Von-Datum *</label>
        <input type="date" class="finput" id="ev-date" value="${ev?.startDate||ev?.date||dateVal}" style="color-scheme:dark">
      </div>
      <div class="fg"><label class="flabel">Bis-Datum</label>
        <input type="date" class="finput" id="ev-end-date" value="${ev?.endDate||ev?.date||''}" style="color-scheme:dark">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="flabel">Von</label>
        <input type="time" class="finput" id="ev-time" value="${ev?.time||''}">
      </div>
      <div class="fg"><label class="flabel">Bis</label>
        <input type="time" class="finput" id="ev-end" value="${ev?.endTime||''}">
      </div>
    </div>
    <div class="fg"><label class="flabel">Typ</label>
      <select class="finput" id="ev-type">
        ${types.map(([v,l])=>`<option value="${v}"${ev?.type===v?' selected':''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="fg"><label class="flabel">Benachrichtigung</label>
      <select class="finput" id="ev-notif">
        ${notifs.map(([v,l])=>`<option value="${v}"${String(ev?.notifDaysBefore??1)===v?' selected':''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="fg"><label class="flabel">Farbe</label>
      <div class="color-row">
        ${colors.map(c=>`<div class="col-dot${curColor===c?' sel':''}" 
          style="background:var(--${c==='blue'?'acc':c==='amber'?'amb':c==='green'?'grn':c==='purple'?'pur':'red'})"
          onclick="pickColor(this,'${c}')"></div>`).join('')}
      </div>
      <input type="hidden" id="ev-color" value="${curColor}">
    </div>
    <div class="fg"><label class="flabel">Beschreibung / Notiz</label>
      <textarea class="finput" id="ev-desc" rows="3" placeholder="Notizen, Hinweise…">${esc(ev?.desc||'')}</textarea>
    </div>
    <div class="fa">
      <button class="btn btn-primary" style="flex:1" onclick="saveEvent('${ev?.id||''}')">
        ${ev?'Aktualisieren':'Speichern'}
      </button>
      ${ev?`<button class="btn btn-danger" onclick="deleteEvent('${ev.id}')">Löschen</button>`:''}
    </div>
    ${accessToken&&!isDemoMode?`
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--b1)">
      <button class="btn btn-ghost btn-full" onclick="saveToGoogleCal('${ev?.id||''}')">
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/></svg>
        In Google Kalender speichern
      </button>
    </div>`:''}
  `;
  openPanel(ev?'Termin bearbeiten':'Neuer Termin',html);
}

function pickColor(el,color){
  document.querySelectorAll('.col-dot').forEach(d=>d.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById('ev-color').value=color;
}

function saveEvent(existingId){
  const title=document.getElementById('ev-title')?.value.trim();
  const date=document.getElementById('ev-date')?.value;
  if(!title){toast('Bitte einen Titel eingeben','err');return;}
  if(!date){toast('Bitte ein Datum wählen','err');return;}
  const endDateRaw=document.getElementById('ev-end-date')?.value||'';
  const ev={
    id:existingId||'ev_'+uid(),title,date,
    startDate:date,
    endDate:(endDateRaw&&endDateRaw>=date)?endDateRaw:date,
    time:document.getElementById('ev-time')?.value||'',
    endTime:document.getElementById('ev-end')?.value||'',
    type:document.getElementById('ev-type')?.value||'meeting',
    color:document.getElementById('ev-color')?.value||'blue',
    desc:document.getElementById('ev-desc')?.value.trim()||'',
    notifDaysBefore:parseInt(document.getElementById('ev-notif')?.value||'1'),
    allDay:!document.getElementById('ev-time')?.value,
    source:'local',
    createdAt:existingId?(getEventById(existingId)?.createdAt||new Date().toISOString()):new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  if(existingId){const i=events.findIndex(e=>e.id===existingId);if(i>=0)events[i]=ev;else events.push(ev);}
  else events.push(ev);
  ls('events',events);
  closePanel();
  if(currentMainView==='calendar'){renderCalendar();renderUpcoming();}
  checkNotifications();
  if(currentMainView==='dashboard')buildDashboard();
  toast(existingId?'Termin aktualisiert ✓':'Termin erstellt ✓','ok');
}

function deleteEvent(id){
  if(!confirm('Termin wirklich löschen?'))return;
  events=events.filter(e=>e.id!==id);
  ls('events',events);
  closePanel();
  if(currentMainView==='calendar'){renderCalendar();renderUpcoming();}
  checkNotifications();
  if(currentMainView==='dashboard')buildDashboard();
  toast('Termin gelöscht','');
}

function openDayPanel(dt,dayEvs){
  const ds=`${DE_DAYS_F[dt.getDay()]}, ${dt.getDate()}. ${DE_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  let html=`<div style="font-size:12px;color:var(--t4);margin-bottom:12px;font-weight:600">${ds}</div>`;
  dayEvs.forEach(ev=>{
    html+=`<div class="ag-card ${ev.color}" style="margin-bottom:8px" onclick="openEventPanel('${ev.id}')">
      <div class="ag-time">${ev.time||'Ganztägig'}</div>
      <div class="ag-body"><div class="ag-title">${esc(ev.title)}</div>${ev.desc?`<div class="ag-desc">${esc(ev.desc)}</div>`:''}</div>
    </div>`;
  });
  html+=`<button class="btn btn-primary btn-full" style="margin-top:10px" onclick="openEventPanel(null,new Date('${dateKey(dt)}'))">+ Neuer Termin für diesen Tag</button>`;
  openPanel(`${dayEvs.length} Termine`,html);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   GOOGLE APIs
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function loadGoogleData(){
  if(!accessToken)return;
  await loadGoogleEvents();
  if(typeof initFirebaseLive==='function') initFirebaseLive();
}

async function loadGoogleEvents(){
  if(!accessToken)return;
  try{
    const start=new Date(curDate.getFullYear(),curDate.getMonth()-1,1).toISOString();
    const end=new Date(curDate.getFullYear(),curDate.getMonth()+4,0).toISOString();
    const r=await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&singleEvents=true&orderBy=startTime&maxResults=500`,
      {headers:{'Authorization':'Bearer '+accessToken}}
    );
    if(r.status===401){lsDel('access_token');accessToken='';return;}
    if(!r.ok)return;
    const data=await r.json();
    gEvents=data.items||[];
    if(currentMainView==='calendar'){renderCalendar();renderUpcoming();}
    if(currentMainView==='dashboard')buildDashboard();
  }catch(e){console.warn('GCal:',e);}
}

async function saveToGoogleCal(existingId){
  if(!accessToken){toast('Bitte zuerst mit Google anmelden','err');return;}
  const title=document.getElementById('ev-title')?.value.trim();
  const date=document.getElementById('ev-date')?.value;
  const time=document.getElementById('ev-time')?.value;
  const end=document.getElementById('ev-end')?.value;
  const endDateRaw=document.getElementById('ev-end-date')?.value||date;
  const endDate=(endDateRaw&&endDateRaw>=date)?endDateRaw:date;
  const desc=document.getElementById('ev-desc')?.value.trim();
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
  if(!title||!date){toast('Bitte Titel und Datum eingeben','err');return;}
  const body={
    summary:title,description:desc,
    start:time?{dateTime:`${date}T${time}:00`,timeZone:tz}:{date},
    end:time?{dateTime:`${endDate}T${end||time}:00`,timeZone:tz}:{date:addDays(new Date(endDate+'T12:00:00'),1).toISOString().substring(0,10)}
  };
  try{
    const r=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',{
      method:'POST',headers:{'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    if(!r.ok)throw new Error('API-Fehler '+r.status);
    toast('In Google Kalender gespeichert ✓','ok');
    saveEvent(existingId);
    loadGoogleEvents();
  }catch(e){toast('Fehler: '+e.message,'err');}
}

/* ── FIREBASE / LOCAL STORAGE BRIDGE ── */
async function loadFromDrive(){
  // Daten werden lokal und – sobald Firebase verbunden ist – in Firestore synchronisiert.
  if(typeof initFirebaseLive==='function') await initFirebaseLive();
}

async function saveToDrive(){
  // Kompatibilitätsfunktion: alte Aufrufe bleiben gültig, speichern aber nicht mehr in Firebase.
  ls('events', events);
  ls('challenges', challenges);
  ls('challenge_completions', challengeCompletions);
  ls('challenge_players', challengePlayers);
  if(typeof registerLivePlayer==='function') registerLivePlayer();
}

function showDriveStatus(){ /* nicht mehr benötigt */ }

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   NOTIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function checkNotifications(){
  const allEvs=getAllEvents();
  notifications=[];
  allEvs.forEach(ev=>{
    if(!ev.date)return;
    const diff=daysUntil(ev.date);
    const threshold=ev.notifDaysBefore??1;
    if(diff>=-3&&diff<=60){
      notifications.push({
        id:ev.id,title:ev.title,date:ev.date,diff,type:ev.type,color:ev.color,
        urgency:diff<0?'crit':diff===0?'crit':diff<=7?'warn':'ok'
      });
    }
    if(diff===threshold&&Notification.permission==='granted') fireNotification(ev,diff);
  });
  notifications.sort((a,b)=>a.diff-b.diff);
  const hasCrit=notifications.some(n=>n.urgency!=='ok');
  const dot=document.getElementById('notif-dot');
  if(dot)dot.style.display=hasCrit?'block':'none';
}

function fireNotification(ev,daysLeft){
  if(Notification.permission!=='granted')return;
  const title=daysLeft===0?`Heute fällig: ${ev.title}`:`In ${daysLeft} Tag${daysLeft>1?'en':''}: ${ev.title}`;
  new Notification(title,{body:ev.desc||'Termin',tag:ev.id});
}

function scheduleNotifCheck(){setInterval(checkNotifications,3600000);}
function reqNotifPermission(){
  if('Notification' in window&&Notification.permission==='default'){
    Notification.requestPermission().then(p=>{if(p==='granted')toast('Benachrichtigungen aktiviert ✓','ok');});
  }
}

function openNotifPanel(){
  checkNotifications();
  if(!notifications.length){
    openPanel('Benachrichtigungen',`<div class="empty-state">
      <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
      <div class="empty-title">Alles im Griff</div>
      <div class="empty-sub">Keine dringenden Einträge</div>
    </div>`);
    return;
  }
  const crit=notifications.filter(n=>n.urgency==='crit');
  const warn=notifications.filter(n=>n.urgency==='warn');
  const ok=notifications.filter(n=>n.urgency==='ok');
  const icons={deadline:'⚠️',meeting:'📅',reminder:'🔔',other:'📌'};
  const bgs={crit:'var(--red-d)',warn:'var(--amb-d)',ok:'var(--s2)'};
  const mkItem=n=>{
    const label=n.diff<0?'Überfällig':n.diff===0?'Heute':n.diff===1?'Morgen':`In ${n.diff}T`;
    const bcls=n.urgency==='crit'?'ub-crit':n.urgency==='warn'?'ub-warn':'ub-ok';
    const action=`setMainView('calendar');setTimeout(()=>openEventPanel('${n.id}'),200)`;
    return`<div class="nitem" onclick="${action};closePanel()">
      <div class="nitem-icon" style="background:${bgs[n.urgency]}">${icons[n.type]||'📅'}</div>
      <div class="nitem-body">
        <div class="nitem-title">${esc(n.title)}</div>
        <div class="nitem-sub">${fmtDate(n.date)}</div>
      </div>
      <span class="nitem-badge urgency-badge ${bcls}">${label}</span>
    </div>`;
  };
  let html='';
  if(crit.length)html+=`<div class="panel-notif-section"><div class="pns-title" style="color:var(--red)">⚡ Dringend</div>${crit.map(mkItem).join('')}</div>`;
  if(warn.length)html+=`<div class="panel-notif-section"><div class="pns-title" style="color:var(--amb)">⚠ Diese Woche</div>${warn.map(mkItem).join('')}</div>`;
  if(ok.length)html+=`<div class="panel-notif-section"><div class="pns-title">Demnächst</div>${ok.map(mkItem).join('')}</div>`;
  if(Notification.permission!=='granted'){
    html+=`<div class="notif-pill"><div class="np-body"><div class="np-title">Push aktivieren</div><div class="np-sub">Automatische Erinnerungen für iPhone &amp; Android.</div></div><button class="btn btn-primary" style="font-size:12px;padding:8px 12px" onclick="reqNotifPermission()">Aktivieren</button></div>`;
  }
  openPanel(`${notifications.length} Hinweis${notifications.length!==1?'e':''}`,html);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   PANEL SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function openPanel(title,html){
  document.getElementById('panel-title').textContent=title;
  document.getElementById('panel-body').innerHTML=html;
  document.getElementById('side-panel').classList.add('open');
  document.getElementById('panel-overlay').classList.add('show');
}
function closePanel(){
  document.getElementById('side-panel').classList.remove('open');
  document.getElementById('panel-overlay').classList.remove('show');
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   TOAST
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function toast(msg,type){
  const w=document.getElementById('toast-wrap');
  const el=document.createElement('div');
  el.className='toast'+(type?' '+type:'');
  el.textContent=msg;
  w.appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .3s';setTimeout(()=>el.remove(),300);},3200);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   AUTH / LOGOUT
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function confirmLogout(){
  const name=userInfo.name||userInfo.email||'Nutzer';
  const mail=userInfo.email||'';
  const avatar=userInfo.picture
    ? `<img src="${esc(userInfo.picture)}" alt="">`
    : esc((name||'?').split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase()||'?');
  const html=`
    <div class="logout-profile">
      <div class="logout-avatar">${avatar}</div>
      <div style="min-width:0">
        <div class="logout-name">${esc(name)}</div>
        <div class="logout-mail">${esc(mail)}</div>
      </div>
    </div>
    <div class="logout-warning">Du meldest dich nur auf diesem Gerät ab. Deine Punkte, Challenges und Kontest-Daten bleiben in Firebase erhalten.</div>
    <button class="btn btn-danger btn-full" onclick="logout()">Jetzt abmelden</button>
    <button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="closePanel()">Angemeldet bleiben</button>`;
  openPanel('Abmelden',html);
}
async function logout(){
  try{
    if(typeof firebase!=='undefined' && typeof db!=='undefined' && db && userInfo.email){
      await db.collection('change_players').doc(String(userInfo.email).toLowerCase().replace(/[^a-z0-9._-]/g,'_')).set({online:false,lastSeen:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    }
  }catch(e){}
  try{ if(window.firebase && firebase.auth) await firebase.auth().signOut(); }catch(e){}
  accessToken='';userInfo={};isDemoMode=false;gEvents=[];notifications=[];
  lsDel('access_token');lsDel('user_info');lsDel('demo_mode');
  closePanel();
  document.getElementById('main-app').style.display='none';
  if(CLIENT_ID)showLogin();
  else document.getElementById('setup-modal').classList.add('show');
}

/* ── KEYBOARD ── */
document.addEventListener('keydown',e=>{
  if(document.getElementById('side-panel').classList.contains('open')){
    if(e.key==='Escape')closePanel();
    return;
  }
  if(e.key==='ArrowLeft'&&currentMainView==='calendar')navigate(-1);
  if(e.key==='ArrowRight'&&currentMainView==='calendar')navigate(1);
  if(e.key==='t'||e.key==='T')goToday();
  if(e.key==='1')setMainView('dashboard');
  if(e.key==='2')setMainView('calendar');
  if(e.key==='n'||e.key==='N')fabAction();
  if(e.key==='m'||e.key==='M')setCalView('month');
  if(e.key==='a'||e.key==='A')setCalView('agenda');
});

/* ── TOUCH SWIPE (calendar) ── */
let touchX0=0;
document.addEventListener('touchstart',e=>{touchX0=e.touches[0].clientX;},{passive:true});
document.addEventListener('touchend',e=>{
  if(document.getElementById('side-panel').classList.contains('open'))return;
  if(currentMainView!=='calendar')return;
  const dx=e.changedTouches[0].clientX-touchX0;
  if(Math.abs(dx)>60)navigate(dx<0?1:-1);
},{passive:true});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   CHANGE EXTENSIONS: Challenges + Contest + Auto Sync
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function(){
  const originalBoot = bootMainApp;
  const originalSetMainView = setMainView;
  const originalFabAction = fabAction;
  const originalBuildKPIs = buildKPIs;
  const originalSaveEvent = saveEvent;
  const originalDeleteEvent = deleteEvent;

  window.challenges = window.challenges || [];
  window.challengeCompletions = window.challengeCompletions || [];
  window.challengePlayers = window.challengePlayers || [];

  function readChallengeState(){
    challenges = ls('challenges') || challenges || [];
    challengeCompletions = ls('challenge_completions') || challengeCompletions || [];
    challengePlayers = ls('challenge_players') || challengePlayers || [];
    if(!challenges.length){challenges = buildDefaultChallenges(); ls('challenges',challenges);}
    ensureCurrentChallengePlayer();
  }


  async function persistChangeState(){
    ls('events',events);
    ls('challenges',challenges);
    ls('challenge_completions',challengeCompletions);
    ls('challenge_players',challengePlayers);
    if(typeof registerLivePlayer==='function') registerLivePlayer();
  }

  window.buildDefaultChallenges = function(){
    return [
      {id:'ch_focus',title:'30 Minuten Fokuszeit',points:10,icon:'🎯',desc:'Eine konzentrierte Aufgabe ohne Ablenkung erledigen.',active:true,createdAt:new Date().toISOString()},
      {id:'ch_calendar',title:'Kalender aufräumen',points:10,icon:'📅',desc:'Termine prüfen und Kalender aktuell halten.',active:true,createdAt:new Date().toISOString()}
    ];
  };
  window.getCurrentPlayerId = function(){return (userInfo.email||'demo@example.com').toLowerCase();};
  window.ensureCurrentChallengePlayer = function(){
    const id=getCurrentPlayerId();
    if(!challengePlayers.some(p=>p.id===id)){
      challengePlayers.push({id:id,name:userInfo.name||userInfo.email||'Ich',email:userInfo.email||'',createdAt:new Date().toISOString()});
      ls('challenge_players',challengePlayers);
    }
  };
  window.todayKey = function(){return dateKey(new Date());};
  window.isChallengeDoneToday = function(chId,playerId=getCurrentPlayerId()){
    return challengeCompletions.some(c=>c.challengeId===chId&&c.playerId===playerId&&c.date===todayKey());
  };
  window.getChallengeStats = function(){
    const stats={};
    challengePlayers.forEach(p=>stats[p.id]={points:0,count:0});
    challengeCompletions.forEach(c=>{
      if(!stats[c.playerId]) stats[c.playerId]={points:0,count:0};
      stats[c.playerId].points+=(parseInt(c.points)||0);
      stats[c.playerId].count+=1;
    });
    return stats;
  };

  function installChallengeView(){
    if(document.getElementById('challenges-view')) return;
    const content=document.getElementById('content');
    const div=document.createElement('div');
    div.id='challenges-view';
    div.innerHTML='<div class="list-header"><div class="list-title">Challenges</div><button class="btn btn-primary btn-sm" onclick="openChallengePanel(null)">+ Neu</button></div><div class="challenge-layout"><div class="challenge-card"><div class="challenge-card-head"><div><div class="challenge-title">Heute erledigen</div><div class="challenge-sub">Ein Klick erledigt eine Challenge und vergibt Punkte</div></div><button class="btn btn-ghost btn-sm" onclick="resetTodayChallenges()">Heute zurücksetzen</button></div><div id="challenges-list"></div></div><div class="leader-card"><div class="leader-card-head"><div><div class="challenge-title">Kontest</div><div class="challenge-sub"></div></div><button class="btn btn-secondary btn-sm" onclick="openParticipantPanel()">Mitspieler</button></div><div id="leaderboard-list"></div></div></div>';
    content.appendChild(div);
  }
  function installChallengeNav(){
    if(!document.getElementById('htab-challenges')){
      const tabs=document.querySelector('.h-tabs');
      const btn=document.createElement('button');
      btn.className='h-tab'; btn.id='htab-challenges'; btn.onclick=()=>setMainView('challenges');
      btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/></svg>Challenges';
      tabs && tabs.appendChild(btn);
    }
    if(!document.getElementById('bnav-challenges')){
      const nav=document.querySelector('.bnav-inner');
      const btn=document.createElement('button');
      btn.className='bnav-item'; btn.id='bnav-challenges'; btn.onclick=()=>setMainView('challenges');
      btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/></svg><span class="bnav-label">Contest</span>';
      nav && nav.appendChild(btn);
    }
  }

  window.bootMainApp = function(){
    originalBoot();
    readChallengeState();
    installChallengeView();
    installChallengeNav();
  };

  window.setMainView = function(v){
    if(v!=='challenges') return originalSetMainView(v);
    currentMainView=v;
    ['dashboard','calendar','challenges'].forEach(vv=>{
      const el=document.getElementById(vv==='calendar'?'cal-body':vv+'-view');
      if(el) el.style.display='none';
    });
    document.getElementById('cal-controls').style.display='none';
    installChallengeView();
    document.getElementById('challenges-view').style.display='flex';
    document.querySelectorAll('.h-tab').forEach(t=>t.classList.remove('active'));
    document.getElementById('htab-challenges')?.classList.add('active');
    document.querySelectorAll('.bnav-item').forEach(t=>t.classList.remove('active'));
    document.getElementById('bnav-challenges')?.classList.add('active');
    renderChallenges();
  };
  window.fabAction = function(){
    if(currentMainView==='challenges') openChallengePanel(null);
    else originalFabAction();
  };

  window.buildKPIs = function(){
    originalBuildKPIs();
    readChallengeState();
    const grid=document.getElementById('kpi-grid'); if(!grid||document.getElementById('kpi-challenges')) return;
    const stats=getChallengeStats()[getCurrentPlayerId()]||{points:0,count:0};
    const card=document.createElement('div'); card.id='kpi-challenges'; card.className='kpi-card good'; card.onclick=()=>setMainView('challenges');
    card.innerHTML='<div class="kpi-icon-wrap green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/></svg></div><div class="kpi-num good-color">'+stats.points+'</div><div class="kpi-label">Challenge Punkte</div>';
    grid.appendChild(card);
  };

  window.renderChallenges = function(){
    readChallengeState();
    const list=document.getElementById('challenges-list');
    const board=document.getElementById('leaderboard-list');
    if(!list||!board)return;
    const active=challenges.filter(c=>c.active!==false);
    list.innerHTML=active.length?active.map(ch=>{
      const done=isChallengeDoneToday(ch.id);
      return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc(ch.icon||'🏆')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title)+'</div><div class="challenge-meta">'+esc(ch.desc||'')+' · '+(ch.points||0)+' Punkte</div></div><span class="points-pill">+'+(ch.points||0)+'</span><button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+ch.id+'\')">'+(done?'Erledigt':'Erledigen')+'</button><button class="btn btn-ghost btn-sm" onclick="openChallengePanel(\''+ch.id+'\')">Bearbeiten</button></div>';
    }).join(''):'<div class="empty-state"><div class="empty-title">Keine Challenges</div><div class="empty-sub">Lege eine neue Challenge an.</div></div>';
    const stats=getChallengeStats();
    const players=[...challengePlayers].sort((a,b)=>(stats[b.id]?.points||0)-(stats[a.id]?.points||0));
    board.innerHTML=players.length?players.map((p,idx)=>{
      const st=stats[p.id]||{points:0,count:0}; const me=p.id===getCurrentPlayerId();
      const medal=idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':(idx+1);
      const live=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>';
      return '<div class="leader-row"><div class="leader-rank">'+medal+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+live+'</div><div class="leader-detail">'+st.count+' Challenges erledigt · Platz '+(idx+1)+(p.email?' · '+esc(p.email):'')+'</div></div><div class="leader-score">'+st.points+'</div></div>';
    }).join(''):'<div class="dash-empty">Noch keine Mitspieler</div>';
  };
  window.completeChallenge = function(id){
    const ch=challenges.find(c=>c.id===id); if(!ch)return;
    if(isChallengeDoneToday(id)){toast('Diese Challenge ist heute schon erledigt','');return;}
    challengeCompletions.push({id:'cc_'+uid(),challengeId:id,playerId:getCurrentPlayerId(),playerName:userInfo.name||userInfo.email||'Ich',date:todayKey(),points:parseInt(ch.points)||0,createdAt:new Date().toISOString()});
    ls('challenge_completions',challengeCompletions); persistChangeState(); renderChallenges(); buildDashboard(); toast('+'+(ch.points||0)+' Punkte ✓','ok');
  };
  window.resetTodayChallenges = function(){
    const me=getCurrentPlayerId(),td=todayKey(); if(!confirm('Deine heutigen Challenge-Erledigungen zurücksetzen?'))return;
    challengeCompletions=challengeCompletions.filter(c=>!(c.playerId===me&&c.date===td));
    ls('challenge_completions',challengeCompletions); persistChangeState(); renderChallenges(); buildDashboard(); toast('Heute zurückgesetzt','');
  };
  window.openChallengePanel = function(id){
    const ch=id?challenges.find(c=>c.id===id):null;
    const html='<div class="fg"><label class="flabel">Titel *</label><input class="finput" id="ch-title" value="'+esc(ch?.title||'')+'" placeholder="z.B. 10 Minuten Bewegung"></div><div class="fr"><div class="fg"><label class="flabel">Punkte</label><input type="number" class="finput" id="ch-points" min="1" value="'+(ch?.points||10)+'"></div><div class="fg"><label class="flabel">Icon</label><input class="finput" id="ch-icon" value="'+esc(ch?.icon||'🏆')+'" placeholder="🏆"></div></div><div class="fg"><label class="flabel">Beschreibung</label><textarea class="finput" id="ch-desc" rows="4" placeholder="Was muss erledigt werden?">'+esc(ch?.desc||'')+'</textarea></div><div class="fa"><button class="btn btn-primary" style="flex:1" onclick="saveChallenge(\''+(ch?.id||'')+'\')">'+(ch?'Aktualisieren':'Challenge speichern')+'</button>'+(ch?'<button class="btn btn-danger" onclick="deleteChallenge(\''+ch.id+'\')">Löschen</button>':'')+'</div>';
    openPanel(ch?'Challenge bearbeiten':'Neue Challenge',html);
  };
  window.saveChallenge = function(existingId){
    const title=document.getElementById('ch-title')?.value.trim(); if(!title){toast('Bitte Titel eingeben','err');return;}
    const ch={id:existingId||'ch_'+uid(),title:title,points:parseInt(document.getElementById('ch-points')?.value)||10,icon:document.getElementById('ch-icon')?.value.trim()||'🏆',desc:document.getElementById('ch-desc')?.value.trim()||'',active:true,createdAt:existingId?(challenges.find(c=>c.id===existingId)?.createdAt||new Date().toISOString()):new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(existingId){const i=challenges.findIndex(c=>c.id===existingId); if(i>=0)challenges[i]=ch; else challenges.push(ch);} else challenges.push(ch);
    ls('challenges',challenges); persistChangeState(); closePanel(); renderChallenges(); buildDashboard(); toast('Challenge gespeichert ✓','ok');
  };
  window.deleteChallenge = function(id){
    if(!confirm('Challenge wirklich löschen?'))return;
    challenges=challenges.filter(c=>c.id!==id); challengeCompletions=challengeCompletions.filter(c=>c.challengeId!==id);
    ls('challenges',challenges); ls('challenge_completions',challengeCompletions); persistChangeState(); closePanel(); renderChallenges(); buildDashboard(); toast('Challenge gelöscht','');
  };
  window.openParticipantPanel = function(){
    const html='<div class="fg"><label class="flabel">Name des Mitspielers</label><input class="finput" id="pl-name" placeholder="z.B. Anna"></div><div class="fg"><label class="flabel">E-Mail optional</label><input class="finput" id="pl-email" placeholder="anna@example.com"></div><button class="btn btn-primary btn-full" onclick="addParticipant()">Mitspieler hinzufügen</button><div class="divider"></div><div class="section-label">Bestehende Mitspieler</div>'+challengePlayers.map(p=>'<div class="leader-row"><div class="leader-rank">👤</div><div><div class="leader-name">'+esc(p.name)+'</div><div class="leader-detail">'+esc(p.email||p.id)+'</div></div></div>').join('');
    openPanel('Mitspieler',html);
  };
  window.addParticipant = function(){
    const name=document.getElementById('pl-name')?.value.trim(); const email=document.getElementById('pl-email')?.value.trim();
    if(!name){toast('Bitte Namen eingeben','err');return;}
    const id=(email||('player_'+uid())).toLowerCase();
    if(!challengePlayers.some(p=>p.id===id)) challengePlayers.push({id:id,name:name,email:email,createdAt:new Date().toISOString()});
    ls('challenge_players',challengePlayers); persistChangeState(); closePanel(); renderChallenges(); toast('Mitspieler hinzugefügt ✓','ok');
  };

  window.syncLocalEventToGoogle = async function(ev){
    if(!accessToken||isDemoMode||!ev||ev.source==='google')return;
    const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
    const body={summary:ev.title,description:ev.desc||'',start:ev.time?{dateTime:ev.date+'T'+ev.time+':00',timeZone:tz}:{date:ev.date},end:ev.endTime?{dateTime:ev.date+'T'+ev.endTime+':00',timeZone:tz}:(ev.time?{dateTime:ev.date+'T'+ev.time+':00',timeZone:tz}:{date:ev.date})};
    try{
      const url=ev.googleEventId?'https://www.googleapis.com/calendar/v3/calendars/primary/events/'+encodeURIComponent(ev.googleEventId):'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      const r=await fetch(url,{method:ev.googleEventId?'PATCH':'POST',headers:{'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(!r.ok)throw new Error('Google Kalender '+r.status);
      const saved=await r.json(); const i=events.findIndex(e=>e.id===ev.id);
      if(i>=0&&!events[i].googleEventId){events[i].googleEventId=saved.id; ls('events',events); persistChangeState();}
      loadGoogleEvents();
    }catch(e){console.warn('Auto Google Sync:',e);toast('Google Kalender-Sync fehlgeschlagen','err');}
  };
  window.saveEvent = function(existingId){
    originalSaveEvent(existingId);
    const ev=events[events.length-1];
    if(accessToken&&!isDemoMode&&ev) syncLocalEventToGoogle(ev);
    persistChangeState();
  };
  window.deleteEvent = function(id){originalDeleteEvent(id); persistChangeState();};

  document.addEventListener('keydown',e=>{if(e.key==='5'&&!document.getElementById('side-panel').classList.contains('open'))setMainView('challenges');});
})();



/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   CHANGE CALENDAR EXTENSIONS: VIEWS, HOLIDAYS, STATE SETTINGS, CHALLENGE DOTS
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function(){
  const STATE_OPTIONS={
    'ALL':'Alle Bundesländer anzeigen','BW':'Baden-Württemberg','BY':'Bayern','BY-AUGSBURG':'Bayern · Augsburg','BE':'Berlin','BB':'Brandenburg','HB':'Bremen','HH':'Hamburg','HE':'Hessen','MV':'Mecklenburg-Vorpommern','NI':'Niedersachsen','NW':'Nordrhein-Westfalen','RP':'Rheinland-Pfalz','SL':'Saarland','SN':'Sachsen','ST':'Sachsen-Anhalt','SH':'Schleswig-Holstein','TH':'Thüringen'
  };
  if(!window.calendarSettings){window.calendarSettings={state:(function(){try{return localStorage.getItem('change_v1_holiday_state')||JSON.parse(localStorage.getItem('holiday_state')||'null')||localStorage.getItem('holiday_state')||'ALL';}catch(e){return localStorage.getItem('change_v1_holiday_state')||localStorage.getItem('holiday_state')||'ALL';}})(),holidayNotifications:ls('holiday_notifications')!==false};}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
  function easterDate(year){
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
    return new Date(year,mo-1,day);
  }
  function H(date,name,states,local){return {date:dateKey(date),name,states:states||['ALL'],local:!!local};}
  window.getGermanHolidays=function(year){
    const e=easterDate(year), list=[];
    list.push(H(new Date(year,0,1),'Neujahr',['ALL']));
    list.push(H(new Date(year,0,6),'Heilige Drei Könige',['BW','BY','BY-AUGSBURG','ST']));
    list.push(H(new Date(year,2,8),'Internationaler Frauentag',['BE','MV']));
    list.push(H(addDays(e,-2),'Karfreitag',['ALL']));
    list.push(H(addDays(e,1),'Ostermontag',['ALL']));
    list.push(H(new Date(year,4,1),'Tag der Arbeit',['ALL']));
    list.push(H(addDays(e,39),'Christi Himmelfahrt',['ALL']));
    list.push(H(addDays(e,50),'Pfingstmontag',['ALL']));
    list.push(H(addDays(e,60),'Fronleichnam',['BW','BY','BY-AUGSBURG','HE','NW','RP','SL']));
    list.push(H(new Date(year,7,8),'Augsburger Friedensfest',['BY-AUGSBURG'],true));
    list.push(H(new Date(year,7,15),'Mariä Himmelfahrt',['SL','BY','BY-AUGSBURG']));
    list.push(H(new Date(year,8,20),'Weltkindertag',['TH']));
    list.push(H(new Date(year,9,3),'Tag der Deutschen Einheit',['ALL']));
    list.push(H(new Date(year,9,31),'Reformationstag',['BB','MV','SN','ST','TH','HB','HH','NI','SH']));
    list.push(H(new Date(year,10,1),'Allerheiligen',['BW','BY','BY-AUGSBURG','NW','RP','SL']));
    const nov23=new Date(year,10,23); const offset=(nov23.getDay()+4)%7; list.push(H(addDays(nov23,-offset),'Buß- und Bettag',['SN']));
    list.push(H(new Date(year,11,25),'1. Weihnachtstag',['ALL']));
    list.push(H(new Date(year,11,26),'2. Weihnachtstag',['ALL']));
    return list;
  };
  window.getHolidaysForDate=function(dk){
    const y=parseInt(dk.slice(0,4),10), state=(window.calendarSettings?.state)||ls('holiday_state')||'ALL';
    return getGermanHolidays(y).filter(h=>h.date===dk && (state==='ALL'||h.states.includes('ALL')||h.states.includes(state)));
  };
  function challengeScheduleForDate(dk){
    const active=(window.challenges||challenges||[]).filter(c=>c.active!==false);
    return active.filter(c=>{
      if(c.recurrence==='daily') return true;
      const sd=c.date||c.startDate;
      if(sd) return sd===dk;
      return dk===dateKey(new Date());
    });
  }
  window.getChallengeDayStatus=function(dk){
    const me=String((typeof getCurrentPlayerId==='function')?getCurrentPlayerId():((userInfo&&userInfo.email)||'local')).trim().toLowerCase();
    const completions=(window.challengeCompletions||challengeCompletions||[]).filter(c=>{
      const player=String(c.playerId||c.userEmail||c.email||'').trim().toLowerCase();
      return player===me && String(c.date||'')===dk;
    });
    const points=completions.reduce((sum,c)=>{
      const ch=(window.challenges||challenges||[]).find(x=>String(x.id)===String(c.challengeId))||{};
      return sum+(parseInt(c.points??ch.points??0,10)||0);
    },0);
    if(points<=0) return null;
    return {planned:completions.length,done:completions.length,points,allDone:true};
  };
  function eventRowsForDate(dk){
    return getAllEvents().filter(e=>e.date===dk).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
  }
  function renderHolidayAndChallengeDecorations(dk){
    const hs=getHolidaysForDate(dk), ch=getChallengeDayStatus(dk);
    let html='';
    if(ch) html+='<span class="challenge-day-dot '+(ch.allDone?'done':'')+'" title="Challenges: '+ch.done+'/'+ch.planned+' erledigt"></span>';
    if(hs.length) html+=hs.slice(0,2).map(h=>'<div class="holiday-line" title="'+esc(h.name+' · '+h.states.map(s=>STATE_OPTIONS[s]||s).join(', '))+'">'+esc(h.name)+'</div>').join('');
    return html;
  }
  const oldRenderMonth=window.renderMonth;
  window.renderMonth=function(y,m){
    const grid=document.getElementById('month-grid'); if(!grid)return;
    grid.className=''; grid.style.display='grid'; grid.style.gridTemplateRows='repeat(6,1fr)'; grid.innerHTML='';
    let firstDay=new Date(y,m,1).getDay(); firstDay=firstDay===0?6:firstDay-1;
    const dim=new Date(y,m+1,0).getDate(), prevDim=new Date(y,m,0).getDate(), cells=[];
    for(let i=0;i<firstDay;i++) cells.push({d:prevDim-firstDay+1+i,m:m===0?11:m-1,y:m===0?y-1:y,other:true});
    for(let i=1;i<=dim;i++) cells.push({d:i,m,y,other:false});
    while(cells.length<42){const ld=cells.length-firstDay-dim+1;cells.push({d:ld,m:m===11?0:m+1,y:m===11?y+1:y,other:true});}
    for(let w=0;w<6;w++){
      const row=document.createElement('div'); row.className='week-row';
      for(let d=0;d<7;d++){
        const c=cells[w*7+d], dt=new Date(c.y,c.m,c.d), dk=dateKey(dt), dayEvs=eventRowsForDate(dk);
        const cell=document.createElement('div'); cell.className='day-cell'+(c.other?' other':'')+(d>=5?' weekend':'')+(isToday(dt)?' today':''); cell.onclick=()=>onDayClick(dt,dayEvs);
        let html='<div class="day-num-wrap"><div class="day-num">'+c.d+'</div></div>'+renderHolidayAndChallengeDecorations(dk);
        const maxV=window.innerWidth<480?1:2;
        dayEvs.slice(0,maxV).forEach(ev=>{html+='<div class="ev-chip '+ev.color+'" onclick="event.stopPropagation();openEventPanel(\''+ev.id+'\')">'+esc(ev.title)+'</div>';});
        if(dayEvs.length>maxV) html+='<div class="more-chip">+'+(dayEvs.length-maxV)+'</div>';
        cell.innerHTML=html; row.appendChild(cell);
      }
      grid.appendChild(row);
    }
  };
  window.renderYear=function(y){
    const grid=document.getElementById('month-grid'); if(!grid)return;
    grid.style.display='grid'; grid.style.gridTemplateRows='none'; grid.className='year-grid'; grid.innerHTML='';
    for(let m=0;m<12;m++){
      const card=document.createElement('div'); card.className='year-month-card'; card.onclick=()=>{curDate=new Date(y,m,1);setCalView('month');};
      let first=new Date(y,m,1).getDay(); first=first===0?6:first-1; const dim=new Date(y,m+1,0).getDate();
      let html='<div class="year-month-title">'+DE_MONTHS[m]+'</div><div class="year-mini-grid">';
      ['M','D','M','D','F','S','S'].forEach(x=>html+='<div class="year-mini-day" style="font-weight:800;color:var(--t5)">'+x+'</div>');
      for(let i=0;i<first;i++)html+='<div></div>';
      for(let d=1;d<=dim;d++){const dt=new Date(y,m,d), dk=dateKey(dt), hs=getHolidaysForDate(dk), ch=getChallengeDayStatus(dk); html+='<div class="year-mini-day '+(isToday(dt)?'today ':'')+(hs.length?'holiday':'')+'">'+d+(ch?'<span class="challenge-day-dot '+(ch.allDone?'done':'')+'"></span>':'')+'</div>';}
      html+='</div>'; card.innerHTML=html; grid.appendChild(card);
    }
  };
  window.renderWorkweek=function(){
    const grid=document.getElementById('month-grid'); if(!grid)return;
    grid.style.display='grid'; grid.style.gridTemplateRows='none'; grid.className='workweek-grid'; grid.innerHTML='';
    const base=new Date(curDate); const day=(base.getDay()+6)%7; const monday=addDays(base,-day);
    for(let i=0;i<5;i++){
      const dt=addDays(monday,i), dk=dateKey(dt), hs=getHolidaysForDate(dk), ch=getChallengeDayStatus(dk), evs=eventRowsForDate(dk);
      const card=document.createElement('div'); card.className='workday-card'; card.onclick=()=>onDayClick(dt,evs);
      let html=(ch?'<span class="challenge-day-dot '+(ch.allDone?'done':'')+'"></span>':'')+'<div class="workday-head">'+DE_DAYS_F[dt.getDay()]+'</div><div class="workday-date">'+fmtDate(dk)+'</div>';
      if(hs.length) html+=hs.map(h=>'<div class="holiday-badge">'+esc(h.name)+'</div>').join('');
      evs.forEach(ev=>html+='<div class="ag-card '+ev.color+'" style="margin-bottom:7px" onclick="event.stopPropagation();openEventPanel(\''+ev.id+'\')"><div class="ag-time">'+(ev.time||'Ganztägig')+'</div><div class="ag-body"><div class="ag-title">'+esc(ev.title)+'</div></div></div>');
      if(!evs.length) html+='<div class="dash-empty">Keine Termine</div>';
      card.innerHTML=html; grid.appendChild(card);
    }
  };
  window.renderTodayView=function(){
    const ag=document.getElementById('agenda-view'), dk=dateKey(new Date()), hs=getHolidaysForDate(dk), chs=challengeScheduleForDate(dk), evs=eventRowsForDate(dk);
    let html='<div class="today-view"><div class="dash-hello"><h1>Heute</h1><p>'+fmtDate(dk)+'</p></div>';
    if(hs.length) html+='<div class="dash-card" style="margin-bottom:14px"><div class="dash-card-head"><div class="dash-card-title">Feiertage</div><div class="dash-card-sub">'+esc(STATE_OPTIONS[calendarSettings.state]||calendarSettings.state)+'</div></div><div class="dash-card-body">'+hs.map(h=>'<div class="dash-row"><div class="dash-row-icon" style="background:var(--amb-d)">🎉</div><div class="dash-row-body"><div class="dash-row-title">'+esc(h.name)+'</div><div class="dash-row-sub">'+esc(h.states.map(s=>STATE_OPTIONS[s]||s).join(', '))+'</div></div></div>').join('')+'</div></div>';
    html+='<div class="dash-card" style="margin-bottom:14px"><div class="dash-card-head"><div class="dash-card-title">Challenges</div><button class="btn btn-ghost btn-sm" onclick="setMainView(\'challenges\')">Öffnen</button></div><div class="dash-card-body">'+(chs.length?chs.map(ch=>'<div class="dash-row"><div class="dash-row-icon" style="background:var(--pur-d)">'+esc(ch.icon||'🏆')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(ch.title)+'</div><div class="dash-row-sub">'+(ch.points||0)+' Punkte</div></div><button class="btn btn-primary btn-sm" onclick="completeChallenge(\''+ch.id+'\')">Erledigen</button></div>').join(''):'<div class="dash-empty">Heute keine Challenge geplant</div>')+'</div></div>';
    html+='<div class="dash-card"><div class="dash-card-head"><div class="dash-card-title">Termine</div></div><div class="dash-card-body">'+(evs.length?evs.map(ev=>'<div class="dash-row" onclick="openEventPanel(\''+ev.id+'\')"><div class="dash-row-icon" style="background:var(--acc-d)">📅</div><div class="dash-row-body"><div class="dash-row-title">'+esc(ev.title)+'</div><div class="dash-row-sub">'+(ev.time||'Ganztägig')+'</div></div></div>').join(''):'<div class="dash-empty">Heute keine Termine</div>')+'</div></div></div>';
    ag.innerHTML=html;
  };
  window.renderCalendar=function(){
    const y=curDate.getFullYear(),m=curDate.getMonth();
    const label=currentCalView==='year'?String(y):(currentCalView==='workweek'?'Arbeitswoche · '+DE_MONTHS[m]+' '+y:(currentCalView==='today'?'Heute':DE_MONTHS[m]+' '+y));
    document.getElementById('month-label').textContent=label;
    ['year','month','workweek','today'].forEach(v=>document.getElementById('vbtn-'+v)?.classList.toggle('active',currentCalView===v));
    const grid=document.getElementById('month-grid'), ag=document.getElementById('agenda-view'), wday=document.getElementById('wday-row');
    if(currentCalView==='year'){ag.style.display='none';wday.style.display='none';renderYear(y);}
    else if(currentCalView==='month'){ag.style.display='none';wday.style.display='grid';renderMonth(y,m);}
    else if(currentCalView==='workweek'){ag.style.display='none';wday.style.display='none';renderWorkweek();}
    else {grid.style.display='none';wday.style.display='none';ag.style.display='block';renderTodayView();}
    if(currentCalView!=='today') grid.style.display='grid';
    renderUpcoming();
  };
  window.setCalView=function(v){currentCalView=v; renderCalendar();};
  window.navigate=function(dir){
    if(currentCalView==='year') curDate=new Date(curDate.getFullYear()+dir,0,1);
    else if(currentCalView==='workweek') curDate=addDays(curDate,dir*7);
    else if(currentCalView==='today') curDate=addDays(curDate,dir);
    else curDate=new Date(curDate.getFullYear(),curDate.getMonth()+dir,1);
    renderCalendar();
  };
  window.goToday=function(){curDate=new Date();currentCalView='today';renderCalendar();};
  window.openCalendarSettings=function(){
    const state=calendarSettings.state||'ALL';
    const opts=Object.entries(STATE_OPTIONS).map(([k,v])=>'<option value="'+k+'" '+(k===state?'selected':'')+'>'+v+'</option>').join('');
    openPanel('Kalender-Einstellungen','<div class="fg"><label class="flabel">Bundesland für Feiertage & Benachrichtigungen</label><select class="finput" id="holiday-state">'+opts+'</select><div class="settings-hint">Wähle „Bayern · Augsburg“, damit auch das Augsburger Friedensfest als lokaler Feiertag erscheint.</div></div><div class="fg"><label class="flabel">Feiertags-Benachrichtigungen</label><select class="finput" id="holiday-notifications"><option value="1" '+(calendarSettings.holidayNotifications?'selected':'')+'>Aktiv</option><option value="0" '+(!calendarSettings.holidayNotifications?'selected':'')+'>Aus</option></select></div><button class="btn btn-primary btn-full" onclick="saveCalendarSettings()">Einstellungen speichern</button>');
  };
  window.saveCalendarSettings=function(){
    calendarSettings.state=document.getElementById('holiday-state')?.value||'ALL';
    calendarSettings.holidayNotifications=document.getElementById('holiday-notifications')?.value==='1';
    ls('holiday_state',calendarSettings.state); localStorage.setItem('change_v1_holiday_state',calendarSettings.state); ls('holiday_notifications',calendarSettings.holidayNotifications); closePanel(); renderCalendar(); toast('Kalender-Einstellungen gespeichert ✓','ok');
  };
  const originalOpenChallengePanel=window.openChallengePanel;
  window.openChallengePanel=function(id){
    const ch=id?challenges.find(c=>c.id===id):null;
    const html='<div class="fg"><label class="flabel">Titel *</label><input class="finput" id="ch-title" value="'+esc(ch?.title||'')+'" placeholder="z.B. 10 Minuten Bewegung"></div><div class="fr"><div class="fg"><label class="flabel">Punkte</label><input type="number" class="finput" id="ch-points" min="1" value="'+(ch?.points||10)+'"></div><div class="fg"><label class="flabel">Icon</label><input class="finput" id="ch-icon" value="'+esc(ch?.icon||'🏆')+'" placeholder="🏆"></div></div><div class="fr"><div class="fg"><label class="flabel">Challenge-Tag</label><input type="date" class="finput" id="ch-date" value="'+esc(ch?.date||ch?.startDate||dateKey(new Date()))+'"></div><div class="fg"><label class="flabel">Wiederholung</label><select class="finput" id="ch-recurrence"><option value="once" '+((ch?.recurrence||'once')==='once'?'selected':'')+'>Einmalig</option><option value="daily" '+(ch?.recurrence==='daily'?'selected':'')+'>Täglich</option></select></div></div><div class="fg"><label class="flabel">Beschreibung</label><textarea class="finput" id="ch-desc" rows="4" placeholder="Was muss erledigt werden?">'+esc(ch?.desc||'')+'</textarea></div><div class="fa"><button class="btn btn-primary" style="flex:1" onclick="saveChallenge(\''+(ch?.id||'')+'\')">'+(ch?'Aktualisieren':'Challenge speichern')+'</button>'+(ch?'<button class="btn btn-danger" onclick="deleteChallenge(\''+ch.id+'\')">Löschen</button>':'')+'</div>';
    openPanel(ch?'Challenge bearbeiten':'Neue Challenge',html);
  };
  window.saveChallenge=function(existingId){
    const title=document.getElementById('ch-title')?.value.trim(); if(!title){toast('Bitte Titel eingeben','err');return;}
    const old=existingId?challenges.find(c=>c.id===existingId):null;
    const ch={id:existingId||'ch_'+uid(),title,points:parseInt(document.getElementById('ch-points')?.value)||10,icon:document.getElementById('ch-icon')?.value.trim()||'🏆',desc:document.getElementById('ch-desc')?.value.trim()||'',date:document.getElementById('ch-date')?.value||dateKey(new Date()),recurrence:document.getElementById('ch-recurrence')?.value||'once',active:true,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const i=challenges.findIndex(c=>c.id===ch.id); if(i>=0)challenges[i]=ch; else challenges.push(ch);
    ls('challenges',challenges); persistChangeState(); closePanel(); renderChallenges(); buildDashboard(); renderCalendar(); toast('Challenge gespeichert ✓','ok');
  };
  const originalCompleteChallenge=window.completeChallenge;
  window.completeChallenge=function(id){
    const ch=challenges.find(c=>c.id===id); if(!ch)return;
    const dk=dateKey(new Date()), me=getCurrentPlayerId();
    if((challengeCompletions||[]).some(c=>c.challengeId===id&&c.playerId===me&&c.date===dk)){toast('Diese Challenge ist heute schon erledigt','');return;}
    challengeCompletions.push({id:'cc_'+uid(),challengeId:id,playerId:me,playerName:userInfo.name||userInfo.email||'Ich',date:dk,points:parseInt(ch.points)||0,createdAt:new Date().toISOString()});
    ls('challenge_completions',challengeCompletions); persistChangeState(); renderChallenges(); buildDashboard(); renderCalendar(); toast('+'+(ch.points||0)+' Punkte ✓','ok');
  };
  const originalRenderUpcoming=window.renderUpcoming;
  window.renderUpcoming=function(){
    originalRenderUpcoming?.();
    if(!calendarSettings.holidayNotifications) return;
    const cont=document.getElementById('upcoming-items'); if(!cont)return;
    const today=new Date(); const upcoming=[];
    for(let i=0;i<=30;i++){const dk=dateKey(addDays(today,i)); getHolidaysForDate(dk).forEach(h=>upcoming.push({dk,h,d:i}));}
    if(upcoming.length){
      const extra=upcoming.slice(0,4).map(x=>'<div class="us-chip amber" title="'+esc(STATE_OPTIONS[calendarSettings.state]||calendarSettings.state)+'"><span>'+(x.d===0?'Heute':x.d+'T')+'</span><span>🎉 '+esc(x.h.name)+'</span></div>').join('');
      cont.innerHTML=extra+(cont.innerHTML||'');
    }
  };
  setTimeout(()=>{try{renderCalendar();}catch(e){console.warn(e)}},0);
})();



/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   AUTO-CHALLENGES: täglich kleine Rätsel & Trainingsübungen
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function(){
  const AUTO_KEY='auto_challenges_enabled';
  const AUTO_POOL=[
    {icon:'🧠',type:'Rätsel',title:'Zahlenrätsel',desc:'Welche Zahl fehlt? 2 · 4 · 8 · 16 · ?',answer:'32',points:8},
    {icon:'🔤',type:'Rätsel',title:'Wortblitz',desc:'Nenne in 60 Sekunden 5 Wörter, die mit S anfangen.',answer:'frei',points:6},
    {icon:'🧩',type:'Rätsel',title:'Logik-Mini',desc:'Wenn alle Blips Blops sind und alle Blops Blau sind: Sind alle Blips Blau?',answer:'Ja',points:8},
    {icon:'🏃',type:'Training',title:'2-Minuten-Bewegung',desc:'Mache 20 Kniebeugen oder 2 Minuten lockere Bewegung.',answer:'erledigt',points:10},
    {icon:'🧘',type:'Training',title:'Atem-Fokus',desc:'Atme 10-mal ruhig ein und aus. Danach Challenge abhaken.',answer:'erledigt',points:5},
    {icon:'👀',type:'Training',title:'Augenpause',desc:'20 Sekunden aus dem Fenster oder in die Ferne schauen.',answer:'erledigt',points:5},
    {icon:'💧',type:'Training',title:'Wasser-Check',desc:'Trinke ein Glas Wasser.',answer:'erledigt',points:5},
    {icon:'🎯',type:'Training',title:'Mini-Fokus',desc:'Räume eine kleine Sache auf deinem Tisch weg.',answer:'erledigt',points:7},
    {icon:'➕',type:'Rätsel',title:'Kopfrechnen',desc:'Rechne ohne Taschenrechner: 17 + 28 + 9 = ?',answer:'54',points:8},
    {icon:'🕵️',type:'Rätsel',title:'Muster finden',desc:'Was kommt als nächstes: A, C, F, J, O, ?',answer:'U',points:10}
  ];
  function seededIndex(dk,offset){
    let n=0; for(let i=0;i<dk.length;i++) n=(n*31+dk.charCodeAt(i)+offset*17)%100000;
    return n%AUTO_POOL.length;
  }
  function autoChallengesForDate(dk){
    const out=[];
    for(let i=0;i<3;i++){
      const base=AUTO_POOL[seededIndex(dk,i)];
      out.push({
        id:'auto_'+dk+'_'+i,
        title:base.title,
        desc:base.desc+(base.answer&&base.answer!=='erledigt'?'\nAntwort: '+base.answer:''),
        points:base.points,
        icon:base.icon,
        date:dk,
        recurrence:'once',
        active:true,
        auto:true,
        type:base.type,
        createdAt:dk+'T00:00:00.000Z'
      });
    }
    return out;
  }
  window.ensureDailyAutoChallenges=function(dk=dateKey(new Date())){
    if(ls(AUTO_KEY)===false) return [];
    window.challenges = window.challenges || challenges || [];
    const daily=autoChallengesForDate(dk);
    let changed=false;
    daily.forEach(ch=>{
      if(!challenges.some(x=>x.id===ch.id)){challenges.push(ch);changed=true;}
    });
    if(changed){ls('challenges',challenges); if(typeof publishLocalChallengesToFirestore==='function') publishLocalChallengesToFirestore();}
    return daily;
  };
  window.setAutoChallengesEnabled=function(enabled){
    ls(AUTO_KEY, !!enabled);
    if(enabled) ensureDailyAutoChallenges();
    if(typeof renderChallenges==='function') renderChallenges();
    if(typeof renderCalendar==='function') renderCalendar();
    if(typeof buildDashboard==='function') buildDashboard();
    toast('Auto-Challenges '+(enabled?'aktiviert':'deaktiviert'), enabled?'ok':'');
    if(typeof openPushSettingsPanel==='function') openPushSettingsPanel();
  };
  window.toggleAutoChallenges=function(){
    const enabled=ls(AUTO_KEY)!==false;
    setAutoChallengesEnabled(!enabled);
  };
  const oldBoot=window.bootMainApp;
  window.bootMainApp=function(){
    oldBoot.apply(this,arguments);
    setTimeout(()=>{ensureDailyAutoChallenges(); if(typeof renderCalendar==='function') renderCalendar(); if(typeof buildDashboard==='function') buildDashboard();},250);
  };
  const oldRenderChallenges=window.renderChallenges;
  window.renderChallenges=function(){ ensureDailyAutoChallenges(); return oldRenderChallenges.apply(this,arguments); };
})();

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   FIREBASE EXTENSION: echte Push Notifications + automatische Mitspieler-Erkennung
   Voraussetzung: firebase-config.js, firebase-messaging-sw.js und manifest.json liegen im Repo-Root.
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function(){
  let fbApp=null, db=null, messaging=null, unsubscribePlayers=null, unsubscribeCompletions=null;
  let lastChallengeNotifyKey='';
  const FIREBASE_READY_KEY='firebase_ready_v1';

  function hasFirebaseConfig(){
    const cfg=window.FIREBASE_CONFIG||{};
    return !!(cfg.apiKey && !String(cfg.apiKey).includes('HIER_') && cfg.projectId);
  }
  function getFirebaseConfig(){ return window.FIREBASE_CONFIG||{}; }
  function getVapidKey(){ return window.FIREBASE_VAPID_KEY||''; }
  function currentEmail(){ return (userInfo.email||'demo@example.com').toLowerCase(); }
  function safeDocId(id){ return String(id||'unknown').toLowerCase().replace(/[^a-z0-9._-]/g,'_'); }
  function publicPlayer(){
    return {
      id: currentEmail(),
      name: userInfo.name||userInfo.email||'Mitspieler',
      email: userInfo.email||'',
      picture: userInfo.picture||'',
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      online: true,
      app: 'Change'
    };
  }

  window.initFirebaseLive = async function(){
    if(!hasFirebaseConfig() || !window.firebase){
      console.info('Firebase ist noch nicht konfiguriert. firebase-config.js ausfüllen.');
      return false;
    }
    try{
      if(!firebase.apps.length) fbApp=firebase.initializeApp(getFirebaseConfig());
      else fbApp=firebase.app();
      db=firebase.firestore();
      if(firebase.messaging && 'serviceWorker' in navigator && 'Notification' in window){ messaging=firebase.messaging(); }
      ls(FIREBASE_READY_KEY,true);
      installForegroundPushHandler();
      startChallengeReminderLoop();
      if(ls('live_sync_enabled')===false){
        try{ if(userInfo.email) await db.collection('change_players').doc(safeDocId(currentEmail())).set({online:false,lastSeen:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); }catch(_e){}
        return true;
      }
      await registerLivePlayer();
      startLivePlayersListener();
      startLiveCompletionsListener();
      return true;
    }catch(e){ console.warn('Firebase init fehlgeschlagen:',e); return false; }
  };

  window.registerLivePlayer = async function(){
    if(ls('live_sync_enabled')===false) return;
    if(!db || !userInfo.email) return;
    try{
      await db.collection('change_players').doc(safeDocId(currentEmail())).set(publicPlayer(),{merge:true});
      if(typeof ensureCurrentChallengePlayer==='function') ensureCurrentChallengePlayer();
    }catch(e){ console.warn('Player sync:',e); }
  };

  function mergePlayer(p){
    if(!p || !p.id) return;
    const id=(p.email||p.id).toLowerCase();
    const entry={id:id,name:p.name||p.email||'Mitspieler',email:p.email||id,picture:p.picture||'',online:!!p.online,lastSeen:p.lastSeen||null,createdAt:p.createdAt||new Date().toISOString()};
    const i=challengePlayers.findIndex(x=>(x.id||x.email||'').toLowerCase()===id);
    if(i>=0) challengePlayers[i]={...challengePlayers[i],...entry}; else challengePlayers.push(entry);
  }

  function startLivePlayersListener(){
    if(ls('live_sync_enabled')===false) return;
    if(!db || unsubscribePlayers) return;
    unsubscribePlayers=db.collection('change_players').onSnapshot(snap=>{
      snap.forEach(doc=>mergePlayer({id:doc.id,...doc.data()}));
      ls('challenge_players',challengePlayers);
      if(currentMainView==='challenges') renderChallenges();
      if(currentMainView==='dashboard') buildDashboard();
    },err=>console.warn('Players listener:',err));
  }

  function startLiveCompletionsListener(){
    if(ls('live_sync_enabled')===false) return;
    if(!db || unsubscribeCompletions) return;
    unsubscribeCompletions=db.collection('change_completions').orderBy('createdAt','desc').limit(500).onSnapshot(snap=>{
      snap.forEach(doc=>{
        const d={id:doc.id,...doc.data()};
        if(!challengeCompletions.some(c=>c.id===d.id)){
          challengeCompletions.push({
            id:d.id, challengeId:d.challengeId, playerId:(d.playerId||d.email||'').toLowerCase(),
            playerName:d.playerName||d.email||'Mitspieler', date:d.date, points:parseInt(d.points)||0,
            createdAt:d.createdAtLocal||new Date().toISOString()
          });
        }
      });
      ls('challenge_completions',challengeCompletions);
      if(currentMainView==='challenges') renderChallenges();
      if(currentMainView==='dashboard') buildDashboard();
      if(currentMainView==='calendar') renderCalendar();
    },err=>console.warn('Completions listener:',err));
  }

  async function publishCompletionToFirestore(completion){
    if(!db || !completion) return;
    try{
      await db.collection('change_completions').doc(completion.id).set({
        ...completion,
        email: currentEmail(),
        playerId: currentEmail(),
        playerName: userInfo.name||userInfo.email||'Mitspieler',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAtLocal: completion.createdAt||new Date().toISOString()
      },{merge:true});
    }catch(e){ console.warn('Completion sync:',e); }
  }

  function notificationHelpHtml(perm){
    const ios=isIOSDevice();
    const android=/Android/i.test(navigator.userAgent);
    if(perm==='denied'){
      return '<div class="help-steps"><strong style="color:var(--amb)">Benachrichtigungen sind blockiert.</strong><ol>'+(ios?'<li>iPhone: Einstellungen → Mitteilungen → Change/Safari → Mitteilungen erlauben.</li><li>Falls Change noch nicht installiert ist: Safari → Teilen → Zum Home-Bildschirm.</li><li>Danach Change vom Home-Bildschirm öffnen und Push erneut aktivieren.</li>':android?'<li>Chrome öffnen → Schloss/Seiteneinstellungen neben der URL.</li><li>Benachrichtigungen auf „Erlauben“ stellen.</li><li>Seite neu laden und Push erneut aktivieren.</li>':'<li>Links neben der URL auf Schloss/Site-Info klicken.</li><li>Benachrichtigungen auf „Erlauben“ stellen.</li><li>Seite neu laden und Push erneut aktivieren.</li>')+'</ol></div>';
    }
    if(ios && !isStandaloneApp()){
      return '<div class="help-steps"><strong style="color:var(--amb)">iPhone-Hinweis:</strong><ol><li>Web-Push funktioniert auf iPhone/iPad nur aus der installierten Home-Bildschirm-App.</li><li>Safari → Teilen → Zum Home-Bildschirm.</li><li>Danach Change vom Home-Bildschirm öffnen und Push aktivieren.</li></ol></div>';
    }
    return '';
  }

  window.enablePushNotifications = async function(){
    if(!hasFirebaseConfig()){ toast('Firebase ist noch nicht eingerichtet: firebase-config.js ausfüllen','err'); return; }
    if(!('Notification' in window)){ toast('Dieser Browser unterstützt keine Push-Mitteilungen','err'); openPushSettingsPanel(); return; }
    if(Notification.permission==='denied'){
      toast('Benachrichtigungen sind im Browser blockiert','err');
      openPushSettingsPanel();
      return;
    }
    if(isIOSDevice() && !isStandaloneApp()){
      toast('iPhone: erst Change zum Home-Bildschirm hinzufügen','err');
      installChangeApp();
      return;
    }
    const ok=await initFirebaseLive(); if(!ok){ toast('Firebase konnte nicht gestartet werden','err'); return; }
    try{
      let perm=Notification.permission;
      if(perm==='default') perm=await Notification.requestPermission();
      if(perm!=='granted'){ toast('Benachrichtigungen wurden nicht erlaubt','err'); openPushSettingsPanel(); return; }
      const reg=await navigator.serviceWorker.register('./firebase-messaging-sw.js', {scope:'./'});
      await navigator.serviceWorker.ready;
      const vapid=getVapidKey();
      if(!vapid || vapid.includes('HIER_')){ toast('VAPID Key fehlt in firebase-config.js','err'); return; }
      if(!messaging) messaging=firebase.messaging();
      const token=await messaging.getToken({vapidKey:vapid,serviceWorkerRegistration:reg});
      if(!token) throw new Error('Kein Push-Token erhalten');
      ls('fcm_token',token);
      ls('push_enabled',true);
      await db.collection('change_players').doc(safeDocId(currentEmail())).set({
        ...publicPlayer(), fcmToken:token, pushEnabled:true, tokenUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});
      toast('Push-Benachrichtigungen aktiviert ✓','ok');
      openPushSettingsPanel();
    }catch(e){ console.warn('Push aktivieren:',e); toast('Push konnte nicht aktiviert werden: '+(e.message||e),'err'); openPushSettingsPanel(); }
  };

  function installForegroundPushHandler(){
    if(!messaging || messaging._changeHandlerInstalled) return;
    messaging.onMessage(payload=>{
      const n=payload.notification||{};
      if(Notification.permission==='granted') new Notification(n.title||'Change', {body:n.body||'', icon:'./icon-192.png', badge:'./icon-192.png'});
      toast(n.title||'Neue Change-Nachricht','ok');
    });
    messaging._changeHandlerInstalled=true;
  }

  function openLocalNotification(title,body){
    if('Notification' in window && Notification.permission==='granted'){
      try{ new Notification(title,{body,icon:'./icon-192.png',badge:'./icon-192.png'}); }catch{}
    }
  }
  function startChallengeReminderLoop(){
    if(window._changeReminderLoop) return;
    window._changeReminderLoop=setInterval(()=>{
      try{
        const today=dateKey(new Date());
        const due=(typeof challengeScheduleForDate==='function'?challengeScheduleForDate(today):(challenges||[])).filter(ch=>ch.active!==false);
        if(!due.length) return;
        const open=due.filter(ch=>!(challengeCompletions||[]).some(c=>c.challengeId===ch.id&&c.playerId===currentEmail()&&c.date===today));
        const key=today+'_'+open.map(x=>x.id).join(',');
        if(open.length && key!==lastChallengeNotifyKey){
          lastChallengeNotifyKey=key;
          openLocalNotification('Change: offene Challenges', open.length+' Challenge(s) warten heute auf dich.');
        }
      }catch(e){}
    }, 15*60*1000);
  }

  window.testLocalPush=function(){
    if(!('Notification' in window)){ toast('Benachrichtigungen nicht unterstützt','err'); return; }
    if(Notification.permission!=='granted'){ toast('Benachrichtigungen zuerst erlauben','err'); openPushSettingsPanel(); return; }
    openLocalNotification('Change Test','Push-Benachrichtigungen sind grundsätzlich erlaubt.');
    toast('Test gesendet ✓','ok');
  };

  window.disablePushNotifications = async function(){
    try{
      await initFirebaseLive();
      if(messaging){
        const token=ls('fcm_token');
        if(token){ try{ await messaging.deleteToken(token); }catch(_e){} }
      }
      lsDel('fcm_token');
      ls('push_enabled',false);
      if(db && userInfo.email){
        await db.collection('change_players').doc(safeDocId(currentEmail())).set({pushEnabled:false,fcmToken:'',tokenUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      }
      toast('Push-Benachrichtigungen deaktiviert','ok');
      openPushSettingsPanel();
    }catch(e){ console.warn('Push deaktivieren:',e); toast('Push konnte nicht deaktiviert werden','err'); }
  };

  window.setPushNotificationsEnabled = function(enabled){
    if(enabled) enablePushNotifications();
    else disablePushNotifications();
  };

  window.setLiveSyncEnabled = async function(enabled){
    ls('live_sync_enabled',!!enabled);
    try{
      if(!enabled){
        if(unsubscribePlayers){unsubscribePlayers(); unsubscribePlayers=null;}
        if(unsubscribeCompletions){unsubscribeCompletions(); unsubscribeCompletions=null;}
        if(db && userInfo.email){ await db.collection('change_players').doc(safeDocId(currentEmail())).set({online:false,lastSeen:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); }
        toast('Live-Mitspieler deaktiviert','ok');
      }else{
        await initFirebaseLive();
        toast('Live-Mitspieler verbunden ✓','ok');
      }
    }catch(e){ console.warn('Live-Sync Umschalten:',e); toast('Live-Sync konnte nicht geändert werden','err'); }
    openPushSettingsPanel();
  };

  window.openPushSettingsPanel = function(){
    const cfgOk=hasFirebaseConfig();
    const supported=('Notification' in window);
    const perm=supported?Notification.permission:'nicht unterstützt';
    const token=ls('fcm_token');
    const pushEnabled=!!token && ls('push_enabled')!==false && perm==='granted';
    const liveEnabled=ls('live_sync_enabled')!==false;
    const online=liveEnabled?(challengePlayers||[]).filter(p=>p.online).length:0;
    const autoEnabled=ls('auto_challenges_enabled')!==false;
    const installStatus=isStandaloneApp()?'installiert':(deferredInstallPrompt?'bereit':'manuell');
    const permClass=perm==='granted'?'push-ok':(perm==='denied'?'push-err':'push-warn');
    const html=`
      <div class="push-box">
        <div class="challenge-title">Push & Live-Sync</div>
        <div class="push-status ${cfgOk?'push-ok':'push-warn'}">${cfgOk?'Firebase-Konfiguration gefunden.':'Firebase ist noch nicht konfiguriert. Trage deine Werte in firebase-config.js ein.'}</div>
        <div class="push-status ${permClass}">Benachrichtigungsstatus: <strong>${esc(perm)}</strong></div>
        <div class="push-status">Push-Token: <strong>${token?'vorhanden':'noch nicht erstellt'}</strong></div>
        <div class="push-status">App-Installation: <strong>${esc(installStatus)}</strong></div>
        <div class="push-status">Live-Mitspieler: <strong>${liveEnabled?('verbunden · '+online+' online'):'deaktiviert'}</strong></div>
      </div>
      ${notificationHelpHtml(perm)}
      <div class="toggle-row">
        <div class="toggle-copy"><div class="toggle-title">Push-Benachrichtigungen <span class="status-pill ${pushEnabled?'status-on':'status-off'}">${pushEnabled?'AKTIV':'INAKTIV'}</span></div><div class="toggle-sub">Benachrichtigt dich über offene Challenges. Bei blockierten Browser-Berechtigungen bleibt der Regler aus.</div></div>
        <label class="switch"><input type="checkbox" ${pushEnabled?'checked':''} onchange="setPushNotificationsEnabled(this.checked)"><span class="slider"></span></label>
      </div>
      <div class="toggle-row">
        <div class="toggle-copy"><div class="toggle-title">Live-Mitspieler <span class="status-pill ${liveEnabled?'status-on':'status-off'}">${liveEnabled?'VERBUNDEN':'DEAKTIVIERT'}</span></div><div class="toggle-sub">Synchronisiert Kontest-Teilnehmer und erledigte Übungen live über Firebase.</div></div>
        <label class="switch"><input type="checkbox" ${liveEnabled?'checked':''} onchange="setLiveSyncEnabled(this.checked)"><span class="slider"></span></label>
      </div>
      <div class="toggle-row">
        <div class="toggle-copy"><div class="toggle-title">Tägliche Auto-Challenges <span class="status-pill ${autoEnabled?'status-on':'status-off'}">${autoEnabled?'AKTIV':'INAKTIV'}</span></div><div class="toggle-sub">Erzeugt jeden Tag kleine Sportübungen.</div></div>
        <label class="switch"><input type="checkbox" ${autoEnabled?'checked':''} onchange="setAutoChallengesEnabled(this.checked)"><span class="slider"></span></label>
      </div>
      <button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="installChangeApp()">Change als App installieren</button>
      <div class="settings-hint">Android: Push funktioniert in Chrome/als installierte PWA. iPhone/iPad: Push funktioniert nur, wenn Change zum Home-Bildschirm hinzugefügt und von dort gestartet wurde.</div>`;
    openPanel('Push & Live-Sync',html);
  };

  window.openParticipantPanel = function(){
    initFirebaseLive();
    const players=[...(challengePlayers||[])].sort((a,b)=>(b.online===true)-(a.online===true)||String(a.name||'').localeCompare(String(b.name||'')));
    const html='<div class="section-label">Automatisch erkannte Mitspieler</div>'+
      (players.length?players.map(p=>'<div class="leader-row"><div class="leader-rank">'+(p.picture?'<img src="'+esc(p.picture)+'" style="width:28px;height:28px;border-radius:50%;object-fit:cover">':'👤')+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+(p.email===userInfo.email?' · Du':'')+(p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>')+'</div><div class="leader-detail">'+esc(p.email||'')+'</div></div></div>').join(''):'<div class="dash-empty">Noch keine Mitspieler erkannt. Sobald sich jemand mit Google anmeldet, erscheint er hier automatisch.</div>')+
      '<div class="settings-hint">Manuelles Hinzufügen ist deaktiviert. Jeder Google-Login wird automatisch als Mitspieler registriert.</div>';
    openPanel('Mitspieler',html);
  };

  const _boot=window.bootMainApp;
  window.bootMainApp=function(){ _boot.apply(this,arguments); setTimeout(()=>initFirebaseLive(),300); };

  const _fetchUserInfo=window.fetchUserInfo;
  if(_fetchUserInfo){
    window.fetchUserInfo=async function(){ const r=await _fetchUserInfo.apply(this,arguments); setTimeout(()=>initFirebaseLive(),300); return r; };
  }

  const _complete=window.completeChallenge;
  window.completeChallenge=function(id){
    const before=(challengeCompletions||[]).length;
    _complete.apply(this,arguments);
    const latest=(challengeCompletions||[])[(challengeCompletions||[]).length-1];
    if((challengeCompletions||[]).length>before) publishCompletionToFirestore(latest);
  };

  window.addEventListener('beforeunload',()=>{
    try{ if(db && userInfo.email) db.collection('change_players').doc(safeDocId(currentEmail())).set({online:false,lastSeen:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); }catch(e){}
  });

  setTimeout(()=>{ if(userInfo && userInfo.email) initFirebaseLive(); },1200);
})();

/* ── FIREBASE EXTENSION 2: Challenges live veröffentlichen ── */
(function(){
  function hasCfg(){const c=window.FIREBASE_CONFIG||{};return !!(c.apiKey&&!String(c.apiKey).includes('HIER_')&&c.projectId&&window.firebase)}
  function getDb(){try{return firebase.firestore()}catch(e){return null}}
  function chDueData(ch){return {id:ch.id,title:ch.title||'Challenge',desc:ch.desc||'',points:parseInt(ch.points)||0,icon:ch.icon||'🏆',date:ch.date||ch.startDate||dateKey(new Date()),recurrence:ch.recurrence||'once',active:ch.active!==false,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}}
  window.publishChallengesToFirestore=async function(){
    if(!hasCfg()) return;
    const db=getDb(); if(!db) return;
    try{for(const ch of (challenges||[])){await db.collection('change_challenges').doc(ch.id).set(chDueData(ch),{merge:true});}}catch(e){console.warn('Challenge live publish:',e)}
  };
  window.listenLiveChallenges=function(){
    if(window._changeLiveChallengesListener || !hasCfg()) return;
    const db=getDb(); if(!db) return;
    window._changeLiveChallengesListener=db.collection('change_challenges').where('active','==',true).onSnapshot(snap=>{
      snap.forEach(doc=>{const ch={id:doc.id,...doc.data()}; const i=(challenges||[]).findIndex(x=>x.id===ch.id); if(i>=0) challenges[i]={...challenges[i],...ch}; else challenges.push(ch);});
      ls('challenges',challenges);
      if(currentMainView==='challenges') renderChallenges();
      if(currentMainView==='calendar') renderCalendar();
      if(currentMainView==='dashboard') buildDashboard();
    },e=>console.warn('Live challenges:',e));
  };
  const _init=window.initFirebaseLive;
  if(_init){window.initFirebaseLive=async function(){const ok=await _init.apply(this,arguments); if(ok){listenLiveChallenges(); publishChallengesToFirestore();} return ok;};}
  const _save=window.saveChallenge;
  if(_save){window.saveChallenge=function(){_save.apply(this,arguments); setTimeout(()=>publishChallengesToFirestore(),200);};}
})();


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   FINAL PATCH: Kalender-Sync, Sport-Challenges, Contest-Details
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function(){
  const DEMO_EMAIL='demo@example.com';
  const SPORT_POOL=[
    {id:'sport_squat',icon:'🏋️',title:'10 Kniebeugen',desc:'Mache 10 saubere Kniebeugen. Langsam runter, stabil hoch.',points:10},
    {id:'sport_pushwall',icon:'💪',title:'10 Wand-Liegestütze',desc:'Mache 10 leichte Liegestütze an der Wand oder am Tisch.',points:10},
    {id:'sport_stretch',icon:'🧘',title:'60 Sekunden Dehnen',desc:'Dehne Schultern, Rücken oder Beine für 60 Sekunden.',points:8},
    {id:'sport_walk',icon:'🚶',title:'3 Minuten gehen',desc:'Gehe 3 Minuten locker durch den Raum oder draußen.',points:8},
    {id:'sport_plank',icon:'⏱️',title:'20 Sekunden Plank',desc:'Halte 20 Sekunden Unterarmstütz. Alternative: Knie am Boden.',points:12},
    {id:'sport_neck',icon:'🙆',title:'Nacken lockern',desc:'Rolle Schultern 10-mal und neige den Kopf sanft nach links/rechts.',points:6}
  ];
  function dkToday(){return dateKey(new Date());}
  function playerKey(p){return String((p&& (p.email||p.id))||'').toLowerCase();}
  function isDemoPlayer(p){const k=playerKey(p); return k===DEMO_EMAIL || String(p?.name||'').toLowerCase().includes('demo nutzer');}
  window.getVisibleContestPlayers=function(){
    const list=(challengePlayers||[]).filter(p=>isDemoMode || !isDemoPlayer(p));
    const seen=new Set();
    return list.filter(p=>{const k=playerKey(p); if(!k||seen.has(k)) return false; seen.add(k); return true;});
  };
  function normalizeSportChallenges(){
    challengePlayers=(challengePlayers||[]).filter(p=>isDemoMode || !isDemoPlayer(p));
    const keep=(challenges||[]).filter(c=>{
      if(c.auto) return false;
      if(['ch_focus','ch_calendar'].includes(c.id)) return false;
      if((c.type||'').toLowerCase()==='rätsel') return false;
      if(/rätsel|kopfrechnen|wortblitz|logik|muster/i.test((c.title||'')+' '+(c.desc||''))) return false;
      return true;
    });
    SPORT_POOL.forEach(sp=>{ if(!keep.some(c=>c.id===sp.id)) keep.push({...sp,active:true,type:'Sport',createdAt:new Date().toISOString()}); });
    challenges=keep;
    ls('challenges',challenges); ls('challenge_players',challengePlayers);
  }
  const oldBoot=window.bootMainApp;
  window.bootMainApp=function(){ oldBoot.apply(this,arguments); setTimeout(()=>{normalizeSportChallenges(); if(typeof renderChallenges==='function')renderChallenges(); if(typeof buildDashboard==='function')buildDashboard(); if(typeof renderCalendar==='function')renderCalendar();},150); };
  window.buildDefaultChallenges=function(){ return SPORT_POOL.slice(0,4).map(x=>({...x,active:true,type:'Sport',createdAt:new Date().toISOString()})); };
  window.ensureDailyAutoChallenges=function(dk=dkToday()){
    if(ls('auto_challenges_enabled')===false) return [];
    const daily=SPORT_POOL.slice(0,3).map((base,i)=>({id:'auto_'+dk+'_sport_'+i,title:base.title,desc:base.desc,points:base.points,icon:base.icon,date:dk,recurrence:'once',active:true,auto:true,type:'Sport',createdAt:dk+'T00:00:00.000Z'}));
    let changed=false;
    challenges=(challenges||[]).filter(c=>!c.auto || String(c.id||'').startsWith('auto_'+dk+'_sport_'));
    daily.forEach(ch=>{ if(!challenges.some(x=>x.id===ch.id)){challenges.push(ch); changed=true;} });
    if(changed){ls('challenges',challenges); if(typeof publishChallengesToFirestore==='function') publishChallengesToFirestore();}
    return daily;
  };
  window.getPlayerPointSummary=function(playerId){
    const id=String(playerId||'').toLowerCase(); const td=dkToday();
    const out={totalPoints:0,totalCount:0,todayPoints:0,todayCount:0,todayItems:[]};
    (challengeCompletions||[]).forEach(c=>{
      if(String(c.playerId||'').toLowerCase()!==id) return;
      const pts=parseInt(c.points)||0; out.totalPoints+=pts; out.totalCount+=1;
      if(c.date===td){ const ch=(challenges||[]).find(x=>x.id===c.challengeId); out.todayPoints+=pts; out.todayCount+=1; out.todayItems.push({title:ch?.title||c.challengeId||'Challenge',icon:ch?.icon||'✅',points:pts}); }
    });
    return out;
  };
  window.openContestUserDetails=function(playerId){
    const id=String(playerId||'').toLowerCase(); const p=(challengePlayers||[]).find(x=>playerKey(x)===id)||{id,name:id,email:id}; if(!isDemoMode && isDemoPlayer(p))return;
    const sum=getPlayerPointSummary(id);
    const items=sum.todayItems.length?sum.todayItems.map(it=>'<div class="challenge-item"><div class="challenge-icon">'+esc(it.icon)+'</div><div class="challenge-body"><div class="challenge-name">'+esc(it.title)+'</div><div class="challenge-meta">Heute erledigt</div></div><span class="points-pill">+'+it.points+'</span></div>').join(''):'<div class="dash-empty">Heute noch nichts erledigt.</div>';
    openPanel('Kontest · '+esc(p.name||p.email||'Mitspieler'),'<div class="stat-strip"><div class="stat-box"><div class="stat-num">'+sum.todayPoints+'</div><div class="stat-label">Punkte heute</div></div><div class="stat-box"><div class="stat-num">'+sum.totalPoints+'</div><div class="stat-label">Punkte gesamt</div></div></div><div class="push-status">Erledigt heute: <strong>'+sum.todayCount+'</strong> · Gesamt erledigt: <strong>'+sum.totalCount+'</strong></div><div class="divider"></div><div class="section-label">Heute erledigt</div>'+items);
  };
  window.renderChallenges=function(){
    normalizeSportChallenges(); ensureDailyAutoChallenges();
    const list=document.getElementById('challenges-list'); const board=document.getElementById('leaderboard-list'); if(!list||!board)return;
    const active=(challenges||[]).filter(c=>c.active!==false);
    list.innerHTML=active.length?active.map(ch=>{const done=isChallengeDoneToday(ch.id); return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc(ch.icon||'🏃')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title)+'</div><div class="challenge-meta">'+esc(ch.desc||'')+' · '+(ch.points||0)+' Punkte</div></div><span class="points-pill">+'+(ch.points||0)+'</span><button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+ch.id+'\')">'+(done?'Erledigt':'Erledigen')+'</button></div>';}).join(''):'<div class="empty-state"><div class="empty-title">Keine Sportübungen</div><div class="empty-sub">Auto-Challenges aktivieren oder Sportübung anlegen.</div></div>';
    const players=getVisibleContestPlayers(); players.sort((a,b)=>getPlayerPointSummary(playerKey(b)).totalPoints-getPlayerPointSummary(playerKey(a)).totalPoints);
    board.innerHTML=players.length?players.map((p,idx)=>{const id=playerKey(p); const st=getPlayerPointSummary(id); const me=id===getCurrentPlayerId(); const medal=idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':(idx+1); const live=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>'; return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+esc(id)+'\')"><div class="leader-rank">'+medal+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+live+'</div><div class="leader-detail">Heute: '+st.todayPoints+' Punkte · Gesamt: '+st.totalPoints+' Punkte · '+st.totalCount+' erledigt</div></div><div class="leader-score">'+st.totalPoints+'</div></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler. Sobald sich jemand mit Google anmeldet, erscheint er hier automatisch.</div>';
  };
  function addOneHour(date,time){const d=new Date(date+'T'+(time||'09:00')+':00'); d.setHours(d.getHours()+1); return d.toTimeString().substring(0,5);}
  function nextDate(date){const d=new Date(date+'T12:00:00'); d.setDate(d.getDate()+1); return dateKey(d);}
  window.syncEventToGoogleReliable=async function(ev){
    if(!accessToken||isDemoMode||!ev||ev.source==='google')return false;
    const tz=Intl.DateTimeFormat().resolvedOptions().timeZone; const endTime=ev.endTime||addOneHour(ev.date,ev.time);
    const body={summary:ev.title,description:ev.desc||'',start:ev.time?{dateTime:ev.date+'T'+ev.time+':00',timeZone:tz}:{date:ev.date},end:ev.time?{dateTime:ev.date+'T'+endTime+':00',timeZone:tz}:{date:nextDate(ev.date)}};
    try{const url=ev.googleEventId?'https://www.googleapis.com/calendar/v3/calendars/primary/events/'+encodeURIComponent(ev.googleEventId):'https://www.googleapis.com/calendar/v3/calendars/primary/events'; const r=await fetch(url,{method:ev.googleEventId?'PATCH':'POST',headers:{'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)}); if(r.status===401){toast('Google-Anmeldung abgelaufen. Bitte neu anmelden.','err'); return false;} if(!r.ok){const txt=await r.text().catch(()=>String(r.status)); throw new Error('Google Kalender '+r.status+' '+txt.substring(0,80));} const saved=await r.json(); const i=events.findIndex(e=>e.id===ev.id); if(i>=0){events[i].googleEventId=saved.id; events[i].googleSyncedAt=new Date().toISOString(); ls('events',events);} loadGoogleEvents(); toast('Mit Google Kalender synchronisiert ✓','ok'); return true;}catch(e){console.warn('Google Calendar Sync:',e); toast('Kalender-Sync fehlgeschlagen: '+(e.message||e),'err'); return false;}
  };
  window.saveEvent=function(existingId){
    const old=existingId?events.find(e=>e.id===existingId):null; const title=document.getElementById('ev-title')?.value.trim(); const date=document.getElementById('ev-date')?.value; if(!title){toast('Bitte einen Titel eingeben','err');return;} if(!date){toast('Bitte ein Datum wählen','err');return;}
    const ev={id:existingId||'ev_'+uid(),title,date,time:document.getElementById('ev-time')?.value||'',endTime:document.getElementById('ev-end')?.value||'',type:document.getElementById('ev-type')?.value||'meeting',color:document.getElementById('ev-color')?.value||'blue',desc:document.getElementById('ev-desc')?.value.trim()||'',notifDaysBefore:parseInt(document.getElementById('ev-notif')?.value||'1'),allDay:!document.getElementById('ev-time')?.value,source:'local',googleEventId:old?.googleEventId||'',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const i=events.findIndex(e=>e.id===ev.id); if(i>=0)events[i]=ev; else events.push(ev); ls('events',events); closePanel(); if(currentMainView==='calendar'){renderCalendar();renderUpcoming();} checkNotifications(); if(currentMainView==='dashboard')buildDashboard(); if(typeof saveToDrive==='function') saveToDrive(); toast(existingId?'Termin aktualisiert ✓':'Termin erstellt ✓','ok'); if(accessToken&&!isDemoMode) syncEventToGoogleReliable(ev);
  };
  window.saveToGoogleCal=function(existingId){
    const title=document.getElementById('ev-title')?.value.trim(); const date=document.getElementById('ev-date')?.value; if(!title||!date){toast('Bitte Titel und Datum eingeben','err');return;}
    const old=existingId?events.find(e=>e.id===existingId):null; const ev={id:existingId||'ev_'+uid(),title,date,time:document.getElementById('ev-time')?.value||'',endTime:document.getElementById('ev-end')?.value||'',type:document.getElementById('ev-type')?.value||'meeting',color:document.getElementById('ev-color')?.value||'blue',desc:document.getElementById('ev-desc')?.value.trim()||'',notifDaysBefore:parseInt(document.getElementById('ev-notif')?.value||'1'),allDay:!document.getElementById('ev-time')?.value,source:'local',googleEventId:old?.googleEventId||'',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const i=events.findIndex(e=>e.id===ev.id); if(i>=0)events[i]=ev; else events.push(ev); ls('events',events); closePanel(); if(currentMainView==='calendar'){renderCalendar();renderUpcoming();} syncEventToGoogleReliable(ev);
  };
  setTimeout(()=>{normalizeSportChallenges(); if(typeof renderChallenges==='function') renderChallenges();},500);
})();



/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
   FINAL FIX 2: Demo-User aus echtem Contest, Sportlinks, Kalender-403-Hilfe
━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function(){
  const DEMO_IDS=['demo@example.com','demo nutzer','demo-nutzer','demo'];
  const SPORTS_ONLY_POOL=[
    {id:'sport_squat',icon:'🏋️',title:'10 Kniebeugen',desc:'Mache 10 saubere Kniebeugen. Füße etwa schulterbreit, Rücken gerade, langsam runter und stabil hoch.',points:10,level:'leicht bis mittel',url:'https://www.tk.de/techniker/magazin/sport/fitness/kniebeugen-2008836'},
    {id:'sport_wall_pushup',icon:'💪',title:'10 Wand-Liegestütze',desc:'Stelle dich vor eine Wand, Hände auf Schulterhöhe, Körper gerade. Beuge und strecke die Arme kontrolliert.',points:10,level:'leicht',url:'https://www.aok.de/pk/magazin/sport/fitness/liegestuetze-richtig-ausfuehren/'},
    {id:'sport_plank_easy',icon:'⏱️',title:'20 Sekunden Unterarmstütz',desc:'Halte 20 Sekunden Plank. Leichtere Variante: Knie auf den Boden setzen.',points:12,level:'mittel',url:'https://www.aok.de/pk/magazin/sport/fitness/plank-richtig-ausfuehren/'},
    {id:'sport_calf_raise',icon:'🦵',title:'15 Wadenheben',desc:'Stelle dich aufrecht hin, hebe die Fersen langsam an und senke sie kontrolliert wieder ab.',points:8,level:'leicht',url:'https://www.tk.de/techniker/magazin/sport/fitness/krafttraining-zuhause-2008872'},
    {id:'sport_march',icon:'🚶',title:'2 Minuten Marschieren',desc:'Marschieren auf der Stelle: Knie locker anheben, Arme mitschwingen, ruhig atmen.',points:8,level:'leicht',url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    {id:'sport_shoulder',icon:'🙆',title:'30 Sekunden Schulterkreisen',desc:'Kreise beide Schultern langsam nach hinten und vorne. Ohne ruckartige Bewegung.',points:6,level:'leicht',url:'https://www.tk.de/techniker/magazin/sport/fitness/dehnen-2008902'},
    {id:'sport_lunge_easy',icon:'🏃',title:'8 Ausfallschritte',desc:'Mache 4 Ausfallschritte pro Bein. Halte den Oberkörper aufrecht, Knie kontrolliert beugen.',points:12,level:'mittel',url:'https://www.aok.de/pk/magazin/sport/fitness/fitnessuebungen-fuer-zuhause/'},
    {id:'sport_balance',icon:'⚖️',title:'30 Sekunden Balance',desc:'Stehe 15 Sekunden auf einem Bein, dann wechseln. Bei Bedarf an Wand oder Stuhl festhalten.',points:7,level:'leicht',url:'https://www.tk.de/techniker/magazin/sport/fitness/gleichgewicht-trainieren-2116034'}
  ];
  function keyOfPlayer(p){return String((p && (p.email||p.id||p.name))||'').trim().toLowerCase();}
  function isDemo(p){const k=keyOfPlayer(p); return DEMO_IDS.some(x=>k===x || k.includes(x));}
  function clearDemoEverywhere(){
    if(!isDemoMode){
      challengePlayers=(challengePlayers||[]).filter(p=>!isDemo(p));
      challengeCompletions=(challengeCompletions||[]).filter(c=>!DEMO_IDS.some(x=>String(c.playerId||'').toLowerCase().includes(x) || String(c.playerName||'').toLowerCase().includes(x)));
      ls('challenge_players',challengePlayers); ls('challenge_completions',challengeCompletions);
      try{
        if(window.firebase && firebase.apps.length && firebase.firestore){
          const db=firebase.firestore();
          db.collection('change_players').doc('demo@example.com').delete().catch(()=>{});
          db.collection('change_players').doc('demo').delete().catch(()=>{});
        }
      }catch(_e){}
    }
  }
  function stripNonSport(){
    clearDemoEverywhere();
    const existing=(challenges||[]).filter(c=>{
      const text=((c.title||'')+' '+(c.desc||'')+' '+(c.type||'')).toLowerCase();
      if(c.auto) return false;
      if(['ch_focus','ch_calendar'].includes(c.id)) return false;
      if(/rätsel|raetsel|logik|wortblitz|zahlen|kopfrechnen|fokuszeit|kalender aufräumen/.test(text)) return false;
      return true;
    });
    SPORTS_ONLY_POOL.forEach(sp=>{
      const i=existing.findIndex(c=>c.id===sp.id);
      if(i>=0) existing[i]={...existing[i],...sp,active:true,type:'Sport'};
      else existing.push({...sp,active:true,type:'Sport',createdAt:new Date().toISOString()});
    });
    challenges=existing;
    ls('challenges',challenges);
  }
  window.buildDefaultChallenges=function(){return SPORTS_ONLY_POOL.slice(0,4).map(x=>({...x,active:true,type:'Sport',createdAt:new Date().toISOString()}));};
  window.ensureDailyAutoChallenges=function(dk=dateKey(new Date())){
    if(ls('auto_challenges_enabled')===false) return [];
    stripNonSport();
    const dayIndex=Math.floor(new Date(dk+'T12:00:00').getTime()/86400000);
    const picks=[0,1,2].map(i=>SPORTS_ONLY_POOL[(dayIndex+i)%SPORTS_ONLY_POOL.length]);
    const daily=picks.map((base,i)=>({id:'auto_'+dk+'_sport_'+i,title:base.title,desc:base.desc,points:base.points,icon:base.icon,url:base.url,level:base.level,date:dk,recurrence:'once',active:true,auto:true,type:'Sport',createdAt:dk+'T00:00:00.000Z'}));
    challenges=(challenges||[]).filter(c=>!c.auto || String(c.id||'').startsWith('auto_'+dk+'_sport_'));
    daily.forEach(ch=>{ if(!challenges.some(x=>x.id===ch.id)) challenges.push(ch); });
    ls('challenges',challenges);
    if(typeof publishChallengesToFirestore==='function') setTimeout(()=>publishChallengesToFirestore(),50);
    return daily;
  };
  window.getVisibleContestPlayers=function(){
    clearDemoEverywhere();
    const seen=new Set();
    return (challengePlayers||[]).filter(p=>isDemoMode || !isDemo(p)).filter(p=>{const k=String(p.email||p.id||'').toLowerCase(); if(!k||seen.has(k)) return false; seen.add(k); return true;});
  };
  window.getPlayerPointSummary=function(playerId){
    const id=String(playerId||'').toLowerCase(); const td=dateKey(new Date());
    const out={totalPoints:0,totalCount:0,todayPoints:0,todayCount:0,todayItems:[]};
    (challengeCompletions||[]).forEach(c=>{
      if(String(c.playerId||'').toLowerCase()!==id) return;
      const pts=parseInt(c.points)||0; out.totalPoints+=pts; out.totalCount+=1;
      if(c.date===td){ const ch=(challenges||[]).find(x=>x.id===c.challengeId); out.todayPoints+=pts; out.todayCount+=1; out.todayItems.push({title:ch?.title||c.challengeId||'Challenge',icon:ch?.icon||'✅',points:pts,url:ch?.url||''}); }
    });
    return out;
  };
  window.openContestUserDetails=function(playerId){
    const id=String(playerId||'').toLowerCase(); const p=(challengePlayers||[]).find(x=>String(x.email||x.id||'').toLowerCase()===id)||{id,name:id,email:id}; if(!isDemoMode&&isDemo(p))return;
    const sum=getPlayerPointSummary(id);
    const items=sum.todayItems.length?sum.todayItems.map(it=>'<div class="challenge-item"><div class="challenge-icon">'+esc(it.icon)+'</div><div class="challenge-body"><div class="challenge-name">'+esc(it.title)+'</div><div class="challenge-meta">Heute erledigt</div>'+(it.url?'<a href="'+esc(it.url)+'" target="_blank" rel="noopener" class="challenge-meta">Übung ansehen</a>':'')+'</div><span class="points-pill">+'+it.points+'</span></div>').join(''):'<div class="dash-empty">Heute noch nichts erledigt.</div>';
    openPanel('Kontest · '+esc(p.name||p.email||'Mitspieler'),'<div class="stat-strip"><div class="stat-box"><div class="stat-num">'+sum.todayPoints+'</div><div class="stat-label">Punkte heute</div></div><div class="stat-box"><div class="stat-num">'+sum.totalPoints+'</div><div class="stat-label">Punkte gesamt</div></div></div><div class="push-status">Erledigt heute: <strong>'+sum.todayCount+'</strong> · Gesamt erledigt: <strong>'+sum.totalCount+'</strong></div><div class="divider"></div><div class="section-label">Heute erledigt</div>'+items);
  };
  window.renderChallenges=function(){
    ensureDailyAutoChallenges(); clearDemoEverywhere();
    const list=document.getElementById('challenges-list'); const board=document.getElementById('leaderboard-list'); if(!list||!board)return;
    const active=(challenges||[]).filter(c=>c.active!==false && (c.type==='Sport' || /^sport_|^auto_.*_sport_/.test(c.id||'')));
    list.innerHTML=active.length?active.map(ch=>{const done=isChallengeDoneToday(ch.id); const link=ch.url?'<a href="'+esc(ch.url)+'" target="_blank" rel="noopener" class="challenge-meta" onclick="event.stopPropagation()">So geht die Übung</a>':''; return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc(ch.icon||'🏃')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title)+'</div><div class="challenge-meta">'+esc(ch.desc||'')+' · '+esc(ch.level||'leicht')+' · '+(ch.points||0)+' Punkte</div>'+link+'</div><span class="points-pill">+'+(ch.points||0)+'</span><button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+ch.id+'\')">'+(done?'Erledigt':'Erledigen')+'</button></div>';}).join(''):'<div class="empty-state"><div class="empty-title">Keine Sportübungen</div><div class="empty-sub">Aktiviere Auto-Challenges oder lege eine Sportübung an.</div></div>';
    const players=getVisibleContestPlayers(); players.sort((a,b)=>getPlayerPointSummary(String(b.email||b.id).toLowerCase()).totalPoints-getPlayerPointSummary(String(a.email||a.id).toLowerCase()).totalPoints);
    board.innerHTML=players.length?players.map((p,idx)=>{const id=String(p.email||p.id||'').toLowerCase(); const st=getPlayerPointSummary(id); const me=id===getCurrentPlayerId(); const medal=idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':(idx+1); const live=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>'; return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+esc(id)+'\')"><div class="leader-rank">'+medal+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+live+'</div><div class="leader-detail">Heute: '+st.todayPoints+' P · Gesamt: '+st.totalPoints+' P · '+st.totalCount+' erledigt</div></div><div class="leader-score">'+st.totalPoints+'</div></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler. Sobald sich jemand mit Google anmeldet, erscheint er hier automatisch.</div>';
  };
  const oldRegister=window.registerLivePlayer;
  if(oldRegister){
    window.registerLivePlayer=async function(){
      isDemoMode=!!ls('demo_mode');
      if(!isDemoMode && userInfo && userInfo.email && String(userInfo.email).toLowerCase()!== 'demo@example.com') clearDemoEverywhere();
      return oldRegister.apply(this,arguments);
    };
  }
  function calendar403Help(status, bodyText){
    if(status===403){
      return 'Google Kalender API 403: Bitte in Google Cloud die Calendar API aktivieren, deine OAuth-Client-ID für ak2191.github.io erlauben und dich danach neu anmelden. Auf Android wurde der Kalenderzugriff jetzt ebenfalls mit angefordert.';
    }
    return 'Google Kalender '+status+' '+String(bodyText||'').substring(0,100);
  }
  window.syncEventToGoogleReliable=async function(ev){
    if(!accessToken||isDemoMode||!ev||ev.source==='google')return false;
    if(accessToken==='firebase-auth'){toast('Kalender-Sync braucht Google-Kalenderzugriff. Bitte abmelden und erneut mit Google anmelden.','err'); return false;}
    const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
    const addHour=(date,time)=>{const d=new Date(date+'T'+(time||'09:00')+':00'); d.setHours(d.getHours()+1); return d.toTimeString().substring(0,5);};
    const nextDate=(date)=>{const d=new Date(date+'T12:00:00'); d.setDate(d.getDate()+1); return dateKey(d);};
    const endTime=ev.endTime||addHour(ev.date,ev.time);
    const body={summary:ev.title,description:ev.desc||'',start:ev.time?{dateTime:ev.date+'T'+ev.time+':00',timeZone:tz}:{date:ev.date},end:ev.time?{dateTime:ev.date+'T'+endTime+':00',timeZone:tz}:{date:nextDate(ev.date)}};
    try{
      const url=ev.googleEventId?'https://www.googleapis.com/calendar/v3/calendars/primary/events/'+encodeURIComponent(ev.googleEventId):'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      const r=await fetch(url,{method:ev.googleEventId?'PATCH':'POST',headers:{'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(r.status===401){lsDel('access_token'); accessToken=''; toast('Google-Anmeldung abgelaufen. Bitte neu anmelden.','err'); return false;}
      if(!r.ok){const txt=await r.text().catch(()=>String(r.status)); throw new Error(calendar403Help(r.status,txt));}
      const saved=await r.json(); const i=events.findIndex(e=>e.id===ev.id); if(i>=0){events[i].googleEventId=saved.id; events[i].googleSyncedAt=new Date().toISOString(); ls('events',events);} loadGoogleEvents(); toast('Mit Google Kalender synchronisiert ✓','ok'); return true;
    }catch(e){console.warn('Google Calendar Sync:',e); toast(e.message||'Kalender-Sync fehlgeschlagen','err'); return false;}
  };
  setTimeout(()=>{stripNonSport(); if(typeof renderChallenges==='function')renderChallenges(); if(typeof buildDashboard==='function')buildDashboard();},600);
})();





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


(function(){
  'use strict';
  const PATCH='CHANGE_V4_LAST_FIVE_COMPLETED';
  const $=id=>document.getElementById(id);
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function norm(v){return String(v||'').trim().toLowerCase();}
  function badId(v){const x=norm(v); return !x||x==='me'||x==='du'||x==='ich'||x==='local-user';}
  function account(){const fu=(typeof firebase!=='undefined'&&firebase.auth&&firebase.auth().currentUser)?firebase.auth().currentUser:null; const info=window.userInfo||{}; const email=norm((fu&&fu.email)||info.email||info.mail||''); const uid=(fu&&fu.uid)||info.uid||''; const id=email||uid||'local-user'; const name=(fu&&fu.displayName)||info.name||email||'Du'; return {id,email,uid,name};}
  function completionPlayerId(c){const a=account(); let id=norm(c&&(c.playerId||c.userEmail||c.email||c.userId||c.uid)); if(badId(id)) id=a.id; return id;}
  function completionTimeValue(c){const v=c&&(c.createdAtLocal||c.completedAtLocal||c.completedAt||c.createdAt||c.date); if(!v)return 0; if(typeof v==='string'){const t=Date.parse(v.length<=10?v+'T12:00:00':v); return Number.isFinite(t)?t:0;} if(typeof v==='number')return v; if(v.seconds)return v.seconds*1000; if(typeof v.toDate==='function')return v.toDate().getTime(); return 0;}
  function titleFor(c){const ch=(window.challenges||[]).find(x=>String(x.id)===String(c.challengeId)); return (ch&&(ch.title||ch.name))||c.title||c.challengeTitle||c.challengeId||'Aufgabe';}
  function iconFor(c){const ch=(window.challenges||[]).find(x=>String(x.id)===String(c.challengeId)); return (ch&&ch.icon)||c.icon||'✅';}
  function fmt(c){const t=completionTimeValue(c); const d=t?new Date(t):(c.date?new Date(String(c.date).slice(0,10)+'T12:00:00'):null); if(!d||isNaN(d.getTime()))return esc(c.date||''); return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}
  function localRecent(playerId,limit){const id=norm(playerId), a=account(); return (window.challengeCompletions||[]).filter(c=>{let pid=completionPlayerId(c); if(badId(pid))pid=a.id; return pid===id;}).slice().sort((x,y)=>completionTimeValue(y)-completionTimeValue(x)).slice(0,limit||5);}
  function renderRecentHtml(items,loading){if(!items.length)return '<div class="dash-empty">Noch keine erledigten Aufgaben gefunden.</div>'+(loading?'<div class="dash-empty">Firebase wird geprüft …</div>':''); return items.map(c=>{const pts=parseInt(c.points,10)||0; return '<div class="last-completed-row"><div class="last-completed-icon">'+esc(iconFor(c))+'</div><div class="last-completed-main"><div class="last-completed-title">'+esc(titleFor(c))+'</div><div class="last-completed-meta">'+esc(fmt(c))+(pts?' · '+pts+' Punkte':'')+'</div></div></div>';}).join('')+(loading?'<div class="dash-empty">Firebase wird geprüft …</div>':'');}
  async function fetchRecentFromFirebase(playerId){const out=[],seen=new Set(); try{if(typeof firebase==='undefined'||!firebase.firestore)return []; const db=firebase.firestore(), id=norm(playerId); for(const field of ['playerId','userEmail','email']){try{const snap=await db.collection('change_completions').where(field,'==',id).limit(100).get(); snap.forEach(doc=>{const d={id:doc.id,...doc.data()}; if(!seen.has(d.id)){seen.add(d.id); out.push(d);}});}catch(e){console.warn(PATCH,'firebase query',field,e);}}}catch(e){console.warn(PATCH,'firebase recent',e);} return out.sort((x,y)=>completionTimeValue(y)-completionTimeValue(x)).slice(0,5);}
  window.openPlayerRecentPanel=function(playerId,playerName){const id=norm(playerId)||account().id, name=playerName||id, initial=localRecent(id,5); const html='<div class="last-completed-panel"><div class="section-label">Letzte 5 erledigte Aufgaben</div><div class="last-completed-person">'+esc(name)+'</div><div id="last-completed-list">'+renderRecentHtml(initial,true)+'</div></div>'; if(typeof openPanel==='function')openPanel('Erledigte Aufgaben',html); fetchRecentFromFirebase(id).then(remote=>{const list=$('last-completed-list'); if(!list)return; const merged=[],seen=new Set(); remote.concat(initial).sort((x,y)=>completionTimeValue(y)-completionTimeValue(x)).forEach(c=>{if(c&&c.id&&!seen.has(c.id)){seen.add(c.id); merged.push(c);}}); list.innerHTML=renderRecentHtml(merged.slice(0,5),false);});};
  function playerStats(){const a=account(), td=(typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10)), by={}; (window.challengePlayers||[]).forEach(p=>{const id=norm(p&&(p.email||p.id)); if(!id||id.includes('demo')||badId(id))return; by[id]={id,name:p.name||p.email||id,email:id,total:0,today:0,count:0,online:!!p.online};}); (window.challengeCompletions||[]).forEach(c=>{let id=completionPlayerId(c); if(badId(id))id=a.id; if(!id||id.includes('demo'))return; if(!by[id])by[id]={id,name:c.playerName||id,email:id,total:0,today:0,count:0,online:id===a.id}; const p=parseInt(c.points,10)||0; by[id].total+=p; by[id].count++; if(String(c.date||'').slice(0,10)===td)by[id].today+=p;}); if(!by[a.id])by[a.id]={id:a.id,name:a.name,email:a.email||a.id,total:0,today:0,count:0,online:true}; return Object.values(by).sort((x,y)=>y.total-x.total);}
  function enhanceLeaderboard(){const board=$('leaderboard-list'); if(!board)return; const a=account(); const players=playerStats(); board.innerHTML=players.map((p,i)=>{const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1, me=p.id===a.id?' · Du':''; return '<div class="leader-row clickable" onclick="openPlayerRecentPanel(\''+esc(p.id)+'\',\''+esc(p.name||p.email||p.id)+'\')" title="Letzte erledigte Aufgaben anzeigen"><div class="leader-rank">'+medal+'</div><div><div class="leader-name">'+esc(p.name||p.email)+me+(p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>')+'</div><div class="leader-detail">Heute: '+p.today+' P · Gesamt: '+p.total+' P · '+p.count+' erledigt</div></div><div class="leader-score">'+p.total+'</div></div>';}).join('')||'<div class="dash-empty">Noch keine Kontest-Daten</div>';}
  const prevRender=window.renderChallenges; window.renderChallenges=function(){if(typeof prevRender==='function')prevRender.apply(this,arguments); try{enhanceLeaderboard();}catch(e){console.warn(PATCH,'enhance',e);}};
  if(!document.getElementById('change-v4-last-five-style')){const st=document.createElement('style');st.id='change-v4-last-five-style';st.textContent='.leader-row.clickable{cursor:pointer}.leader-row.clickable:hover{background:var(--s2)}.last-completed-person{font-size:18px;font-weight:800;color:var(--t1);margin:4px 0 14px}.last-completed-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--b1)}.last-completed-row:last-child{border-bottom:none}.last-completed-icon{width:36px;height:36px;border-radius:10px;background:var(--acc-d);display:flex;align-items:center;justify-content:center;flex-shrink:0}.last-completed-main{min-width:0}.last-completed-title{font-size:14px;font-weight:800;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.last-completed-meta{font-size:12px;color:var(--t3);margin-top:2px}';document.head.appendChild(st);}
  window.addEventListener('load',function(){setTimeout(function(){try{if((window.currentMainView||'')==='challenges')enhanceLeaderboard();}catch(e){}},900);});
})();


(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function norm(v){return String(v||'').trim().toLowerCase();}
  function account(){const fu=(typeof firebase!=='undefined'&&firebase.auth&&firebase.auth().currentUser)?firebase.auth().currentUser:null; const info=window.userInfo||{}; const email=norm((fu&&fu.email)||info.email||info.mail||''); const uid=(fu&&fu.uid)||info.uid||''; return {id:email||uid||'local-user',email,uid,name:(fu&&fu.displayName)||info.name||email||'Du'};}
  function badId(v){const x=norm(v);return !x||x==='me'||x==='du'||x==='ich'||x==='local-user';}
  function playerOf(c){const a=account();let id=norm(c&&(c.playerId||c.userEmail||c.email||c.userId||c.uid));if(badId(id))id=a.id;return id;}
  function timeVal(c){const v=c&&(c.createdAtLocal||c.completedAtLocal||c.completedAt||c.createdAt||c.date); if(!v)return 0; if(typeof v==='string'){const t=Date.parse(v.length<=10?v+'T12:00:00':v);return Number.isFinite(t)?t:0;} if(typeof v==='number')return v; if(v.seconds)return v.seconds*1000; if(typeof v.toDate==='function')return v.toDate().getTime(); return 0;}
  function titleFor(c){const ch=(window.challenges||[]).find(x=>String(x.id)===String(c.challengeId));return (ch&&(ch.title||ch.name))||c.title||c.challengeTitle||c.challengeId||'Aufgabe';}
  function iconFor(c){const ch=(window.challenges||[]).find(x=>String(x.id)===String(c.challengeId));return (ch&&ch.icon)||c.icon||'✅';}
  function fmt(c){const t=timeVal(c);const d=t?new Date(t):(c.date?new Date(String(c.date).slice(0,10)+'T12:00:00'):null); if(!d||isNaN(d.getTime()))return esc(c.date||''); return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}
  function localRecent(playerId,limit){const id=norm(playerId);return (window.challengeCompletions||[]).filter(c=>playerOf(c)===id).slice().sort((x,y)=>timeVal(y)-timeVal(x)).slice(0,limit||5);}
  async function fetchRemote(playerId){const out=[],seen=new Set(); try{if(typeof firebase==='undefined'||!firebase.firestore)return []; const db=firebase.firestore(), id=norm(playerId); for(const field of ['playerId','userEmail','email']){try{const snap=await db.collection('change_completions').where(field,'==',id).limit(100).get(); snap.forEach(doc=>{const d={id:doc.id,...doc.data()}; if(!seen.has(d.id)){seen.add(d.id);out.push(d);}});}catch(e){}}}catch(e){} return out.sort((x,y)=>timeVal(y)-timeVal(x)).slice(0,5);}
  function persist(){try{if(typeof lsSet==='function')lsSet('challenge_completions',window.challengeCompletions||[]);else localStorage.setItem('challenge_completions',JSON.stringify(window.challengeCompletions||[]));}catch(e){} try{if(typeof ls==='function')ls('challenge_completions',window.challengeCompletions||[]);}catch(e){} try{if(typeof persistChangeState==='function')persistChangeState();}catch(e){} try{if(typeof saveChallengeState==='function')saveChallengeState();}catch(e){}}
  function sameCompletion(a,b){if(!a||!b)return false; if(a.id&&b.id&&String(a.id)===String(b.id))return true; return String(a.challengeId||'')===String(b.challengeId||'') && String(a.date||'').slice(0,10)===String(b.date||'').slice(0,10) && playerOf(a)===playerOf(b);}
  function rowsHtml(items,own,loading){if(!items.length)return '<div class="dash-empty">Noch keine erledigten Aufgaben gefunden.</div>'+(loading?'<div class="dash-empty">Firebase wird geprüft …</div>':''); return items.map(c=>{const pts=parseInt(c.points,10)||0; const payload=encodeURIComponent(JSON.stringify({id:c.id||'',challengeId:c.challengeId||'',date:String(c.date||'').slice(0,10),playerId:playerOf(c)})); const remove=own?'<button class="btn btn-danger btn-sm last-remove-btn" onclick="event.stopPropagation();removeSingleCompletedChallenge(\''+payload+'\')">Entnehmen</button>':''; return '<div class="last-completed-row"><div class="last-completed-icon">'+esc(iconFor(c))+'</div><div class="last-completed-main"><div class="last-completed-title">'+esc(titleFor(c))+'</div><div class="last-completed-meta">'+esc(fmt(c))+(pts?' · '+pts+' Punkte':'')+'</div></div>'+remove+'</div>';}).join('')+(loading?'<div class="dash-empty">Firebase wird geprüft …</div>':'');}
  function refreshAll(){try{if(typeof renderChallenges==='function')renderChallenges();}catch(e){} try{if(typeof buildDashboard==='function')buildDashboard();}catch(e){} try{if(typeof renderCalendar==='function')renderCalendar();}catch(e){}}
  window.removeSingleCompletedChallenge=async function(encoded){let target={}; try{target=JSON.parse(decodeURIComponent(encoded||''));}catch(e){target={id:encoded||''};} const a=account(); target.playerId=norm(target.playerId)||a.id; window.challengeCompletions=(window.challengeCompletions||[]).filter(c=>!sameCompletion(c,target)); persist(); try{if(typeof firebase!=='undefined'&&firebase.firestore){const db=firebase.firestore(); if(target.id)await db.collection('change_completions').doc(String(target.id)).delete().catch(()=>{}); for(const f of ['playerId','userEmail','email']){try{let q=db.collection('change_completions').where(f,'==',target.playerId); if(target.challengeId)q=q.where('challengeId','==',target.challengeId); if(target.date)q=q.where('date','==',target.date); const snap=await q.limit(20).get(); snap.forEach(d=>d.ref.delete().catch(()=>{}));}catch(e){}}}}catch(e){} refreshAll(); try{window.openPlayerRecentPanel(target.playerId,target.playerId===a.id?a.name:target.playerId);}catch(e){} if(typeof toast==='function')toast('Aufgabe wieder entnommen','ok');};
  window.openPlayerRecentPanel=function(playerId,playerName){const a=account(); const id=norm(playerId)||a.id; const own=id===a.id||id===a.email||id===norm(a.uid); const initial=localRecent(id,5); const html='<div class="last-completed-panel"><div class="section-label">Letzte 5 erledigte Aufgaben</div><div class="last-completed-person">'+esc(playerName||id)+'</div><div id="last-completed-list">'+rowsHtml(initial,own,true)+'</div></div>'; if(typeof openPanel==='function')openPanel('Erledigte Aufgaben',html); fetchRemote(id).then(remote=>{const list=$('last-completed-list'); if(!list)return; const merged=[],seen=new Set(); remote.concat(initial).sort((x,y)=>timeVal(y)-timeVal(x)).forEach(c=>{const key=c.id||[c.challengeId,c.date,playerOf(c)].join('|'); if(c&&!seen.has(key)){seen.add(key);merged.push(c);}}); list.innerHTML=rowsHtml(merged.slice(0,5),own,false);});};
  if(!document.getElementById('change-v5-remove-style')){const st=document.createElement('style');st.id='change-v5-remove-style';st.textContent='.last-completed-main{flex:1}.last-remove-btn{margin-left:auto;white-space:nowrap}.last-completed-row{gap:10px}';document.head.appendChild(st);}
})();


(function(){
  'use strict';
  const STATE_LABELS={ALL:'Alle Bundesländer',BW:'Baden-Württemberg',BY:'Bayern','BY-AUGSBURG':'Bayern · Augsburg',BE:'Berlin',BB:'Brandenburg',HB:'Bremen',HH:'Hamburg',HE:'Hessen',MV:'Mecklenburg-Vorpommern',NI:'Niedersachsen',NW:'Nordrhein-Westfalen',RP:'Rheinland-Pfalz',SL:'Saarland',SN:'Sachsen',ST:'Sachsen-Anhalt',SH:'Schleswig-Holstein',TH:'Thüringen'};
  const $=id=>document.getElementById(id);
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function key(d){try{return typeof dateKey==='function'?dateKey(d):d.toISOString().slice(0,10);}catch(e){return '';}}
  function today(){return key(new Date());}
  function dateOf(e){return String((e&&(e.date||e.startDate||e.dateKey||(e.start&&e.start.date)||''))||'').slice(0,10);}
  function timeOf(e){return String((e&&(e.time||e.startTime||(e.start&&e.start.dateTime&&String(e.start.dateTime).slice(11,16))||''))||'');}
  function titleOf(e){return (e&&(e.title||e.summary||e.name))||'Termin';}
  function fmt(dk){try{return typeof fmtDate==='function'?fmtDate(dk):new Date(dk+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'});}catch(e){return dk;}}
  function days(dk){const a=new Date(today()+'T12:00:00'), b=new Date(String(dk).slice(0,10)+'T12:00:00'); return Math.round((b-a)/86400000);}
  function accountId(){const u=(window.userInfo||{}); return String(u.email||u.uid||'local-user').toLowerCase();}
  function holidayState(){return (window.calendarSettings&&calendarSettings.state)||localStorage.getItem('holiday_state')||'ALL';}
  function holidaysFor(dk){try{return (typeof getHolidaysForDate==='function'?getHolidaysForDate(dk):[])||[];}catch(e){return [];}}
  function eventRows(){const raw=(typeof getAllEvents==='function'?getAllEvents():(window.events||[])); return (raw||[]).map(e=>Object.assign({},e,{kind:'event',date:dateOf(e),time:timeOf(e),title:titleOf(e)})).filter(e=>e.date&&days(e.date)>=0&&days(e.date)<=14).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')).slice(0,10);}
  function holidayRows(){const out=[]; const base=new Date(today()+'T12:00:00'); for(let i=0;i<=14;i++){const d=new Date(base); d.setDate(base.getDate()+i); const dk=key(d); holidaysFor(dk).forEach(h=>out.push({kind:'holiday',date:dk,days:i,title:h.name,time:'',h}));} return out;}
  function calendarRows(){return eventRows().concat(holidayRows()).sort((a,b)=>a.date.localeCompare(b.date)||(a.kind==='holiday'?-1:1)||(a.time||'99:99').localeCompare(b.time||'99:99')).slice(0,12);}
  function challengeDue(){const td=today(), me=accountId(); const done=(window.challengeCompletions||[]).filter(c=>String(c.date||'').slice(0,10)===td && String(c.playerId||c.userEmail||c.email||me).toLowerCase()===me); const doneIds=new Set(done.map(c=>String(c.challengeId||''))); const active=(window.challenges||[]).filter(c=>c&&c.active!==false); const due=active.filter(c=>{const r=c.recurrence||''; const d=String(c.date||c.startDate||'').slice(0,10); return r==='daily'||!d||d===td;}); return {open:due.filter(c=>!doneIds.has(String(c.id))), done, points:done.reduce((s,c)=>s+(parseInt(c.points,10)||0),0)};}
  function playerId(p){try{if(typeof playerKey==='function')return playerKey(p);}catch(e){} return String(p.email||p.id||p.uid||p.name||'').toLowerCase();}
  function playerPoints(id,dk){try{if(typeof pointsFor==='function')return pointsFor(id,dk);}catch(e){} try{const st=typeof getPlayerPointSummary==='function'?getPlayerPointSummary(id):null; return st?(dk?st.todayPoints:st.totalPoints):0;}catch(e){return 0;}}
  function playersHtml(){let players=[]; try{players=typeof visiblePlayers==='function'?visiblePlayers():(typeof getVisibleContestPlayers==='function'?getVisibleContestPlayers():(window.contestPlayers||window.players||[]));}catch(e){players=[];} players=(players||[]).slice().sort((a,b)=>playerPoints(playerId(b))-playerPoints(playerId(a))).slice(0,5); return players.length?players.map((p,i)=>{const id=playerId(p), medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1); return '<div class="dash-row" onclick="setMainView(\'challenges\');setTimeout(()=>{try{openContestUserDetails(\''+esc(id)+'\')}catch(e){}},80)"><div class="dash-row-icon" style="background:var(--amb-d)">'+medal+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(p.name||p.email||'Mitspieler')+'</div><div class="dash-row-sub">Gesamt '+playerPoints(id)+' P</div></div><span class="dash-row-badge badge-green">'+playerPoints(id)+' P</span></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler.</div>';}
  function cleanDashboardButtons(){const grid=$('dash-grid'); if(!grid) return; grid.querySelectorAll('.dash-card-head button,.dash-row-action').forEach(x=>x.remove());}
  window.buildDashCards=function(){const grid=$('dash-grid'); if(!grid) return; const rows=calendarRows(); const calHtml=rows.length?rows.map(r=>{const n=days(r.date), isHol=r.kind==='holiday', icon=isHol?'🎉':(n===0?'⭐':'📅'), badge=n===0?'':(n===1?'Morgen':'in '+n+'T'); return '<div class="dash-row '+(n===0?'today-row-highlight':'')+'" onclick="setMainView(\'calendar\')"><div class="dash-row-icon" style="background:'+(isHol?'var(--amb-d)':'var(--acc-d)')+'">'+icon+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(r.title)+'</div><div class="dash-row-sub">'+esc(fmt(r.date))+(r.time?' · '+esc(r.time):'')+(isHol?' · '+esc(STATE_LABELS[holidayState()]||holidayState()):'')+'</div></div>'+(badge?'<span class="dash-row-badge '+(isHol?'badge-amber':'badge-blue')+'">'+badge+'</span>':'')+'</div>';}).join(''):'<div class="dash-empty">Keine Termine oder Feiertage gefunden</div>'; const ch=challengeDue(); const chHtml=ch.open.length?ch.open.slice(0,4).map(c=>'<div class="dash-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--pur-d)">'+esc(c.icon||'🏆')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(c.title||c.name||'Challenge')+'</div><div class="dash-row-sub">'+(parseInt(c.points,10)||0)+' Punkte</div></div><span class="dash-row-badge badge-amber">offen</span></div>').join(''):'<div class="dash-empty">Keine offenen Aufgaben</div>'; grid.innerHTML='<div class="dash-card calendar-card"><div class="dash-card-head"><div><div class="dash-card-title">📅 Kalender</div><div class="dash-card-sub"></div></div></div><div class="dash-card-body">'+calHtml+'</div></div><div class="dash-card challenge-card-dashboard"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenges</div><div class="dash-card-sub"></div></div></div><div class="dash-card-body">'+chHtml+'</div></div><div class="dash-card players-card-dashboard"><div class="dash-card-head"><div><div class="dash-card-title">👥 Mitspieler</div><div class="dash-card-sub"></div></div></div><div class="dash-card-body">'+playersHtml()+'</div></div>'; cleanDashboardButtons();};
  window.buildDashboard=function(){try{if(typeof buildKPIs==='function')buildKPIs();}catch(e){} try{const n=(window.userInfo&&userInfo.name)||''; const h=$('dash-greeting'); if(h) h.textContent=(new Date().getHours()<12?'Guten Morgen':new Date().getHours()<17?'Guten Tag':'Guten Abend')+(n?', '+n.split(' ')[0]:''); const s=$('dash-sub'); if(s) s.textContent='Kalender, Challenges und Mitspieler auf einen Blick';}catch(e){} buildDashCards();};
  if(!document.getElementById('dashboard-holiday-final-style')){const st=document.createElement('style');st.id='dashboard-holiday-final-style';st.textContent='.dash-row-action{display:none!important}.calendar-card{grid-column:1/-1}.players-card-dashboard .dash-row-icon{font-weight:800}';document.head.appendChild(st);}
  if(document.body)new MutationObserver(cleanDashboardButtons).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('load',()=>setTimeout(()=>{try{if(typeof buildDashboard==='function')buildDashboard();}catch(e){}},300));
})();


/* FINAL FIX: ruhiges Dashboard, Zeitraum-Darstellung, Challenge-Dots, kein Dummy-„Du“ */
(function(){
  function $(id){return document.getElementById(id)}
  function escS(s){return (typeof esc==='function')?esc(s):String(s||'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
  function dk(d){return (typeof dateKey==='function')?dateKey(d):d.toISOString().substring(0,10)}
  function addD(d,n){return (typeof addDays==='function')?addDays(d,n):new Date(d.getTime()+n*86400000)}
  function todayKey(){return dk(new Date())}
  function fmtS(d){return (typeof fmtDate==='function')?fmtDate(d):d}
  function daysS(d){return (typeof daysUntil==='function')?daysUntil(d):Math.round((new Date(d+'T12:00:00')-new Date(new Date().toDateString()))/86400000)}
  function lc(v){return String(v||'').trim().toLowerCase()}
  function currentEmail(){return lc((window.userInfo&&(userInfo.email||userInfo.id))||localStorage.getItem('change_v1_user_email')||'')}
  function currentName(){return (window.userInfo&&(userInfo.name||userInfo.email))||currentEmail()||'Ich'}
  function isDummyDu(p){const v=lc(p&&(p.email||p.id||p.name||p.playerId||p.userEmail||p));return v==='du'||v==='ich'||v==='me'||v==='demo'||v==='demo@example.com'||v.includes('demo nutzer')||v.includes('demo-user')}
  function normalizeMyData(){
    const me=currentEmail(); if(!me) return;
    try{
      (window.challengeCompletions||[]).forEach(c=>{ if(isDummyDu(c)){ c.playerId=me; c.userEmail=me; c.email=me; c.playerName=currentName(); } });
      if(typeof ls==='function') ls('challenge_completions',window.challengeCompletions||[]);
    }catch(e){}
    try{
      window.challengePlayers=(window.challengePlayers||[]).filter(p=>!isDummyDu(p)||lc(p.email||p.id)===me);
      const found=window.challengePlayers.some(p=>lc(p.email||p.id)===me);
      if(!found) window.challengePlayers.push({id:me,email:me,name:currentName(),online:true});
      if(typeof ls==='function') ls('challenge_players',window.challengePlayers);
    }catch(e){}
  }
  function playerId(p){return lc((p&&(p.email||p.id||p.userEmail))||p)}
  function playerName(p){const me=currentEmail(), id=playerId(p); if(id===me) return currentName(); const n=String((p&&(p.name||p.email||p.id))||'Mitspieler').trim(); return (lc(n)==='du'||lc(n)==='ich')?'Mitspieler':n;}
  window.getCurrentPlayerId=function(){return currentEmail()||'local-user'};
  const oldVisible=window.getVisibleContestPlayers||window.visiblePlayers;
  window.getVisibleContestPlayers=window.visiblePlayers=function(){
    normalizeMyData(); const me=currentEmail(); let arr=[];
    try{arr=oldVisible?oldVisible():(window.challengePlayers||[])}catch(e){arr=window.challengePlayers||[]}
    const seen=new Set(), out=[];
    (arr||[]).forEach(p=>{let id=playerId(p); if(!id&&isDummyDu(p)&&me) id=me; if(!id) return; if(isDummyDu(p)&&id!==me) return; if(seen.has(id)) return; seen.add(id); out.push(Object.assign({},p,{id,email:id,name:id===me?currentName():playerName(p)}));});
    if(me&&!seen.has(me)) out.push({id:me,email:me,name:currentName(),online:true});
    return out;
  };
  function pointSummary(id){id=lc(id); const td=todayKey(); const out={totalPoints:0,totalCount:0,todayPoints:0,todayCount:0,todayItems:[]};
    (window.challengeCompletions||[]).forEach(c=>{const cid=lc(c.playerId||c.userEmail||c.email); if(cid!==id) return; const ch=(window.challenges||[]).find(x=>x.id===c.challengeId)||{}; const pts=parseInt(c.points??ch.points??0,10)||0; out.totalPoints+=pts; out.totalCount++; if(c.date===td){out.todayPoints+=pts; out.todayCount++; out.todayItems.push({title:ch.title||c.challengeId||'Challenge',icon:ch.icon||'✅',points:pts});}}); return out;}
  window.getPlayerPointSummary=pointSummary;

  function rawEvents(){const a=[];(window.events||[]).forEach(e=>a.push(e)); if(window.googleCalendarSyncEnabled!==false&&(localStorage.getItem('change_v1_google_calendar_sync')!=='false')) (window.gEvents||[]).forEach(e=>a.push(Object.assign({},e,{source:'google'}))); return a;}
  function startOf(ev){return ev.startDate||ev.date||ev.dateKey||(ev.start&&ev.start.date)||(ev.start&&ev.start.dateTime?String(ev.start.dateTime).substring(0,10):'')}
  function endOf(ev){if(ev.endDate)return ev.endDate;if(ev.toDate)return ev.toDate;if(ev.untilDate)return ev.untilDate;if(ev.end&&ev.end.date)return dk(addD(new Date(ev.end.date+'T12:00:00'),-1));if(ev.end&&ev.end.dateTime)return String(ev.end.dateTime).substring(0,10);return startOf(ev)}
  function titleOf(ev){return ev.title||ev.summary||ev.name||'(Kein Titel)'}
  function timeOf(ev){if(ev.time)return ev.time;if(ev.start&&ev.start.dateTime)return new Date(ev.start.dateTime).toTimeString().substring(0,5);return ''}
  function colorOf(ev){return ev.color||'blue'}
  function sourceBadge(ev){if((ev.source==='google')||String(ev.id||'').startsWith('g_'))return '<span class="source-pill">von Google</span>'; if(ev.googleEventId||ev.syncedToGoogle)return '<span class="source-pill synced">Google ✓</span>'; return ''}
  function rangeText(ev){const s=startOf(ev), e=endOf(ev); return e&&e!==s?fmtS(s)+' – '+fmtS(e):fmtS(s)}
  function displayDateForRange(ev){const s=startOf(ev), e=endOf(ev)||s, t=todayKey(); if(s<=t&&e>=t) return t; return s;}
  function dashCalendarRows(){const t=todayKey(), limit=dk(addD(new Date(),14)); const rows=[]; const seen=new Set();
    rawEvents().forEach(ev=>{const s=startOf(ev), e=endOf(ev)||s; if(!s) return; if(e<t||s>limit) return; const key=(ev.id||titleOf(ev)+'_'+s+'_'+e); if(seen.has(key))return; seen.add(key); rows.push({kind:'event',ev,date:displayDateForRange(ev),sort:(s<t?t:s)});});
    try{if(typeof getHolidaysForDate==='function'){let cur=new Date(t+'T12:00:00'), end=new Date(limit+'T12:00:00');while(cur<=end){const d=dk(cur);(getHolidaysForDate(d)||[]).forEach(h=>rows.push({kind:'holiday',holiday:h,date:d,sort:d}));cur=addD(cur,1);}}}catch(e){}
    return rows.sort((a,b)=>String(a.sort).localeCompare(String(b.sort))).slice(0,8);
  }
  function challengeRows(){let ch=[]; try{ch=(typeof challengeDue==='function'?challengeDue().open:(window.challenges||[]).filter(c=>!(typeof isChallengeDoneToday==='function'&&isChallengeDoneToday(c.id))))}catch(e){ch=[]} return (ch||[]).slice(0,4);}
  function playersHtml(){const players=(window.getVisibleContestPlayers?getVisibleContestPlayers():[]).slice().sort((a,b)=>pointSummary(playerId(b)).totalPoints-pointSummary(playerId(a)).totalPoints).slice(0,5); return players.length?players.map((p,i)=>{const id=playerId(p), st=pointSummary(id), medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);return '<div class="dash-row"><div class="dash-row-icon" style="background:var(--amb-d)">'+medal+'</div><div class="dash-row-body"><div class="dash-row-title">'+escS(playerName(p))+(id===currentEmail()?'':'')+'</div><div class="dash-row-sub">Heute: '+st.todayPoints+' P · Gesamt: '+st.totalPoints+' P · '+st.totalCount+' erledigt</div></div><span class="dash-row-badge badge-green">'+st.totalPoints+' P</span></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler.</div>';}
  window.buildDashCards=function(){const grid=$('dash-grid'); if(!grid)return; normalizeMyData(); const cal=dashCalendarRows(); const calHtml=cal.length?cal.map(r=>{if(r.kind==='holiday'){const diff=daysS(r.date), badge=diff===0?'':(diff===1?'Morgen':'in '+diff+'T');return '<div class="dash-row" onclick="setMainView(\'calendar\')"><div class="dash-row-icon" style="background:var(--amb-d)">🎉</div><div class="dash-row-body"><div class="dash-row-title">'+escS(r.holiday.name)+'</div><div class="dash-row-sub">'+fmtS(r.date)+'</div></div>'+(badge?'<span class="dash-row-badge badge-amber">'+badge+'</span>':'')+'</div>';} const ev=r.ev, diff=daysS(r.date), badge=diff===0?'':(diff===1?'Morgen':'in '+diff+'T'), isRange=(endOf(ev)&&endOf(ev)!==startOf(ev)); return '<div class="dash-row" onclick="setMainView(\'calendar\')"><div class="dash-row-icon" style="background:var(--acc-d)">📅</div><div class="dash-row-body"><div class="dash-row-title">'+escS(titleOf(ev))+(isRange?'<span class="range-pill">'+escS(rangeText(ev))+'</span>':'')+sourceBadge(ev)+'</div><div class="dash-row-sub">'+fmtS(r.date)+(timeOf(ev)?' · '+timeOf(ev):'')+(isRange?' · Zeitraum: '+rangeText(ev):'')+'</div></div>'+(badge?'<span class="dash-row-badge badge-blue">'+badge+'</span>':'')+'</div>';}).join(''):'<div class="dash-empty">Keine Termine oder Feiertage gefunden</div>'; const ch=challengeRows(); const chHtml=ch.length?ch.map(c=>'<div class="dash-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--pur-d)">'+escS(c.icon||'🏆')+'</div><div class="dash-row-body"><div class="dash-row-title">'+escS(c.title||c.name||'Challenge')+'</div><div class="dash-row-sub">'+(parseInt(c.points,10)||0)+' Punkte</div></div><span class="dash-row-badge badge-amber">offen</span></div>').join(''):'<div class="dash-empty">Keine offenen Aufgaben</div>'; grid.innerHTML='<div class="dash-card calendar-card"><div class="dash-card-head"><div><div class="dash-card-title">📅 Kalender</div><div class="dash-card-sub"></div></div></div><div class="dash-card-body">'+calHtml+'</div></div><div class="dash-card challenge-card-dashboard"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenges</div><div class="dash-card-sub"></div></div></div><div class="dash-card-body">'+chHtml+'</div></div><div class="dash-card players-card-dashboard"><div class="dash-card-head"><div><div class="dash-card-title">👥 Mitspieler</div><div class="dash-card-sub"></div></div></div><div class="dash-card-body">'+playersHtml()+'</div></div>';};
  window.buildDashboard=function(){try{if(typeof buildKPIs==='function')buildKPIs()}catch(e){} try{const h=$('dash-greeting'); if(h)h.textContent=(new Date().getHours()<12?'Guten Morgen':new Date().getHours()<17?'Guten Tag':'Guten Abend')+((currentName()&&currentName()!=='Ich')?', '+currentName().split(' ')[0]:''); const s=$('dash-sub'); if(s)s.textContent='Kalender, Challenges und Mitspieler auf einen Blick';}catch(e){} buildDashCards();};

  window.renderMonth=function(y,m){const grid=$('month-grid'); if(!grid)return; grid.className=''; grid.style.display='grid'; grid.style.gridTemplateRows='repeat(6,1fr)'; grid.innerHTML=''; let firstDay=new Date(y,m,1).getDay(); firstDay=firstDay===0?6:firstDay-1; const dim=new Date(y,m+1,0).getDate(), prevDim=new Date(y,m,0).getDate(), cells=[]; for(let i=0;i<firstDay;i++)cells.push({d:prevDim-firstDay+1+i,m:m===0?11:m-1,y:m===0?y-1:y,other:true}); for(let i=1;i<=dim;i++)cells.push({d:i,m,y,other:false}); while(cells.length<42){const ld=cells.length-firstDay-dim+1;cells.push({d:ld,m:m===11?0:m+1,y:m===11?y+1:y,other:true});}
    for(let w=0;w<6;w++){const row=document.createElement('div'); row.className='week-row'; for(let d=0;d<7;d++){const c=cells[w*7+d], dt=new Date(c.y,c.m,c.d), day=dk(dt); const cell=document.createElement('div'); cell.className='day-cell'+(c.other?' other':'')+(d>=5?' weekend':'')+((typeof isToday==='function'&&isToday(dt))?' today':''); const dayEvs=rawEvents().filter(ev=>{const s=startOf(ev), e=endOf(ev)||s;return s&&s<=day&&e>=day;}).sort((a,b)=>(timeOf(a)||'99:99').localeCompare(timeOf(b)||'99:99')); cell.onclick=()=>onDayClick(dt,dayEvs); let html='<div class="day-num-wrap"><div class="day-num">'+c.d+'</div></div>'; try{if(typeof getHolidaysForDate==='function') html+=(getHolidaysForDate(day)||[]).slice(0,2).map(h=>'<div class="holiday-line">'+escS(h.name)+'</div>').join(''); if(typeof getChallengeDayStatus==='function'){const ch=getChallengeDayStatus(day); if(ch)html+='<span class="challenge-day-dot '+(ch.allDone?'done':'')+'"></span>';}}catch(e){}
      const maxV=window.innerWidth<480?1:2; dayEvs.slice(0,maxV).forEach(ev=>{const s=startOf(ev), e=endOf(ev)||s, isRange=e>s, start=day===s, end=day===e, weekStart=d===0, weekEnd=d===6; const cls='ev-chip '+colorOf(ev)+(isRange?' range-event '+(start||weekStart?'range-start ':'')+(end||weekEnd?'range-end ':'range-mid '):''); const label=(!isRange||start||weekStart)?escS(titleOf(ev)):''; html+='<div class="'+cls+'" onclick="event.stopPropagation();openEventPanel(\''+escS(ev.id||'')+'\')">'+label+(start?sourceBadge(ev):'')+'</div>';}); if(dayEvs.length>maxV)html+='<div class="more-chip">+'+(dayEvs.length-maxV)+'</div>'; cell.innerHTML=html; row.appendChild(cell);} grid.appendChild(row);} applyCalOptionStyle();};

  function applyCalOptionStyle(){let o={showHolidays:true,showChallengeDots:true,showWeekNumbers:false}; try{o=Object.assign(o,JSON.parse(localStorage.getItem('change_v1_calendar_view_options')||'{}'))}catch(e){} let st=$('final-calendar-options-style'); if(!st){st=document.createElement('style');st.id='final-calendar-options-style';document.head.appendChild(st)} st.textContent=(o.showChallengeDots?'':'.challenge-day-dot,.challenge-dot{display:none!important;}')+(o.showHolidays?'':'.holiday-line,.holiday-card,.holiday-chip{display:none!important;}')+'.ev-chip.range-event{display:block;margin-left:-4px;margin-right:-4px;border-radius:0;min-height:18px}.ev-chip.range-start{margin-left:0;border-top-left-radius:9px;border-bottom-left-radius:9px}.ev-chip.range-end{margin-right:0;border-top-right-radius:9px;border-bottom-right-radius:9px}.ev-chip.range-mid{color:transparent}.source-pill,.range-pill{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:800;background:rgba(66,133,244,.12);color:#4285F4}.source-pill.synced{background:rgba(22,163,74,.12);color:var(--grn)}';}
  const oldSaveCal=window.saveCalSettings; window.saveCalSettings=function(){try{const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked}; localStorage.setItem('change_v1_calendar_view_options',JSON.stringify(o)); window.changeCalendarViewOptions=o;}catch(e){} if(typeof oldSaveCal==='function')oldSaveCal(); applyCalOptionStyle(); if(typeof renderCalendar==='function')renderCalendar();};
  document.addEventListener('change',function(e){if(e.target&&['toggle-holidays','toggle-dots','toggle-kw'].includes(e.target.id)){try{const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked}; localStorage.setItem('change_v1_calendar_view_options',JSON.stringify(o)); window.changeCalendarViewOptions=o; applyCalOptionStyle(); if(typeof renderCalendar==='function')renderCalendar();}catch(x){}}});
  const oldOpenContest=window.openContestUserDetails; window.openContestUserDetails=function(id){id=lc(id); if(isDummyDu(id)) id=currentEmail(); if(!id)return; if(typeof oldOpenContest==='function')return oldOpenContest(id);};
  applyCalOptionStyle(); setTimeout(()=>{normalizeMyData(); try{if(currentMainView==='dashboard')buildDashboard(); if(currentMainView==='calendar')renderCalendar();}catch(e){}},500);
})();


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
  function gIcon(ev){return isGoogle(ev)?'<span class="g-mini" title="Von Google Kalender">G</span>':(isSynced(ev)?'<span class="g-mini synced" title="An Google übertragen">✓</span>':'')}
  function allEvents(){
    const out=[];
    (window.events||[]).forEach(e=>{ if(e&&startOf(e)) out.push(Object.assign({},e,{startDate:startOf(e),endDate:endOf(e)})); });
    const syncOn=(window.googleCalendarSyncEnabled!==false && localStorage.getItem('change_v1_google_calendar_sync')!=='false');
    if(syncOn){(window.gEvents||[]).forEach(ge=>{ const s=startOf(ge); if(!s)return; out.push({id:'g_'+(ge.id||s+'_'+titleOf(ge)),title:titleOf(ge),startDate:s,endDate:endOf(ge),date:s,time:timeOf(ge),color:'blue',type:'meeting',desc:ge.description||'',allDay:!!ge?.start?.date,source:'google',raw:ge}); });}
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
  window.renderMonth=function(y,m){
    applyCleanCalendarStyle(); const grid=$('month-grid'); if(!grid)return; grid.innerHTML=''; grid.style.display='grid'; const cells=buildMonthCells(y,m);
    for(let w=0;w<6;w++){
      const row=document.createElement('div'); row.className='week-row'; const weekDates=[];
      for(let d=0;d<7;d++){
        const c=cells[w*7+d], dt=new Date(c.y,c.m,c.d), day=dkey(dt); weekDates.push(day);
        const dayEvs=allEvents().filter(ev=>startOf(ev)<=day&&endOf(ev)>=day);
        const cell=document.createElement('div'); cell.className='day-cell'+(c.other?' other':'')+(d>=5?' weekend':'')+((typeof isToday==='function'&&isToday(dt))?' today':''); cell.onclick=()=>{ if(typeof onDayClick==='function')onDayClick(dt,dayEvs); else if(dayEvs[0])openEventPanel(dayEvs[0].id); else openEventPanel(null,dt); };
        let html='<div class="day-num-wrap"><div class="day-num">'+c.d+'</div></div>';
        try{ if(opt().showHolidays&&typeof getHolidaysForDate==='function') html+=(getHolidaysForDate(day)||[]).slice(0,1).map(h=>'<div class="holiday-line">'+esc(h.name)+'</div>').join(''); if(opt().showChallengeDots&&typeof getChallengeDayStatus==='function'){const ch=getChallengeDayStatus(day); if(ch)html+='<span class="challenge-day-dot '+(ch.allDone?'done':'')+'"></span>';}}
        catch(e){}
        cell.innerHTML=html; row.appendChild(cell);
      }
      const layer=document.createElement('div'); layer.className='week-event-layer';
      layoutWeekEvents(weekDates).forEach(seg=>{const ev=seg.ev, single=startOf(ev)===endOf(ev); const bar=document.createElement('div'); bar.className='range-bar '+colorOf(ev)+(single?' single':'')+(seg.continuesLeft?' continues-left':'')+(seg.continuesRight?' continues-right':''); bar.style.gridColumn=(seg.startIdx+1)+' / span '+seg.span; bar.style.gridRow=(seg.lane+1); bar.title=titleOf(ev)+' · '+fmt(startOf(ev))+(endOf(ev)!==startOf(ev)?' – '+fmt(endOf(ev)):'')+(timeOf(ev)?' · '+timeOf(ev):''); bar.onclick=(e)=>{e.stopPropagation(); openEventPanel(ev.id)}; const label=(seg.continuesLeft?'':titleOf(ev)); bar.innerHTML='<span style="overflow:hidden;text-overflow:ellipsis">'+esc(label||titleOf(ev))+'</span>'+gIcon(ev); layer.appendChild(bar);});
      row.appendChild(layer); grid.appendChild(row);
    }
  };

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
    closePanel(); renderCalendar(); if(typeof renderUpcoming==='function')renderUpcoming(); if(typeof buildDashboard==='function')buildDashboard(); if(typeof checkNotifications==='function')checkNotifications(); if(typeof saveToDrive==='function')try{saveToDrive()}catch(_){ } if(typeof toast==='function')toast(existingId?'Termin aktualisiert ✓':'Termin erstellt ✓','ok');
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
    closePanel(); renderCalendar(); if(typeof buildDashboard==='function')buildDashboard(); if(typeof toast==='function')toast('Kalender-Einstellungen gespeichert ✓','ok');
  };
  document.addEventListener('change',function(e){ if(e.target&&['toggle-holidays','toggle-dots','toggle-kw'].includes(e.target.id)){ const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked}; saveOpt(o); renderCalendar(); }});

  // Kein Dummy-„Du“ als eigener Mitspieler: Anzeigenamen nur noch bei aktuellem Konto ergänzen, nicht als extra Account.
  function accountId(){return String((window.userInfo&&(userInfo.email||userInfo.id))||localStorage.getItem('change_v1_user_email')||'').toLowerCase()}
  const oldGetPlayers=window.getVisibleContestPlayers||window.visiblePlayers;
  window.getVisibleContestPlayers=window.visiblePlayers=function(){const me=accountId(); let arr=[]; try{arr=oldGetPlayers?oldGetPlayers():(window.challengePlayers||[])}catch(e){arr=window.challengePlayers||[]} const seen=new Set(), out=[]; (arr||[]).forEach(p=>{let id=String(p?.email||p?.id||p?.userEmail||'').toLowerCase(); const name=String(p?.name||'').trim().toLowerCase(); if(!id&&(name==='du'||name==='ich'))id=me; if((name==='du'||name==='ich'||id==='du'||id==='demo@example.com')&&id!==me)return; if(!id)return; if(seen.has(id))return; seen.add(id); out.push(Object.assign({},p,{id,email:id,name:id===me?((window.userInfo&&(userInfo.name||userInfo.email))||p.name||p.email):p.name}));}); return out;};

  applyCleanCalendarStyle();
  setTimeout(()=>{try{if(window.currentMainView==='calendar')renderCalendar(); if(window.currentMainView==='dashboard'&&typeof buildDashboard==='function')buildDashboard();}catch(e){console.warn(e)}},300);
})();


(function(){
  'use strict';
  const DAY = 86400000;
  const $ = (id) => document.getElementById(id);
  const escB = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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

  window.renderMonth = function(y,m){
    const grid = $('month-grid'); if(!grid) return;
    const o = optsB();
    grid.className = 'month-grid-option-b';
    grid.style.display = 'grid';
    grid.style.gridTemplateRows = 'repeat(6, minmax(118px, 1fr))';
    grid.innerHTML = '';
    let first = new Date(y,m,1).getDay(); first = first === 0 ? 6 : first - 1;
    const dim = new Date(y,m+1,0).getDate();
    const prevDim = new Date(y,m,0).getDate();
    const cells = [];
    for(let i=0;i<first;i++) cells.push({d:prevDim-first+1+i, m:m===0?11:m-1, y:m===0?y-1:y, other:true});
    for(let d=1; d<=dim; d++) cells.push({d,m,y,other:false});
    while(cells.length < 42){ const n = cells.length - first - dim + 1; cells.push({d:n, m:m===11?0:m+1, y:m===11?y+1:y, other:true}); }

    for(let w=0; w<6; w++){
      const week = cells.slice(w*7,w*7+7);
      const row = document.createElement('div'); row.className='cal-week-b';
      const startKey = toKeyB(new Date(week[0].y, week[0].m, week[0].d));
      const endKey = toKeyB(new Date(week[6].y, week[6].m, week[6].d));
      week.forEach((c,i) => {
        const dt = new Date(c.y,c.m,c.d); const k = toKeyB(dt);
        const hs = holidaysB(k); const ch = challengeB(k);
        const cell = document.createElement('div');
        cell.className = 'cal-day-b' + (c.other?' other':'') + (i>4?' weekend':'') + (isTodayB(dt)?' today':'');
        cell.style.gridColumn = String(i+1);
        cell.onclick = () => { if(typeof window.onDayClick === 'function') window.onDayClick(dt, eventsOnB(k)); };
        cell.innerHTML = '<div class="cal-day-head"><span class="cal-day-num">'+c.d+'</span>' +
          (o.showHolidays && hs.length ? '<span class="cal-holiday-name" title="'+escB(hs[0].name)+'">'+escB(hs[0].name)+'</span>' : '') +
          '</div>' +
          (o.showChallengeDots && ch ? '<span class="cal-points-badge '+(ch.allDone?'done':'')+'" title="Challenge-Punkte">+'+ch.points+'P</span>' : '') +
          (i===0 && o.showWeekNumbers ? '<span class="cal-kw-badge">KW '+isoWeekB(dt)+'</span>' : '');
        row.appendChild(cell);
      });
      const lanes = [];
      allEventsB().filter(ev => { const r=rangeB(ev); return r.start <= endKey && r.end >= startKey; })
        .sort((a,b) => rangeB(a).start.localeCompare(rangeB(b).start) || rangeB(b).end.localeCompare(rangeB(a).end) || String(a.title).localeCompare(String(b.title)))
        .forEach(ev => {
          const r = rangeB(ev);
          const ss = r.start < startKey ? startKey : r.start;
          const ee = r.end > endKey ? endKey : r.end;
          const sc = daysB(startKey, ss) + 1;
          const ec = daysB(startKey, ee) + 1;
          let lane = 0;
          while(lanes[lane] && lanes[lane] >= sc) lane++;
          lanes[lane] = ec;
          if(lane > 2) return;
          const bar = document.createElement('button');
          bar.type = 'button';
          bar.className = 'cal-range-b '+colorB(ev)+(r.start===ss?' start':'')+(r.end===ee?' end':'')+(r.start<startKey?' cont-left':'')+(r.end>endKey?' cont-right':'');
          bar.style.gridColumn = sc + ' / ' + (ec+1);
          bar.style.setProperty('--lane', lane);
          bar.title = (ev.title||'Termin') + ' · ' + fmtB(r.start) + (r.end!==r.start ? ' – ' + fmtB(r.end) : '');
          bar.onclick = (e) => { e.stopPropagation(); if(typeof window.openEventPanel === 'function') window.openEventPanel(ev.id); };
          const dateText = r.start !== r.end && r.start === ss ? '<span class="cal-range-date">'+fmtB(r.start).replace(/\.20\d\d$/,'')+'–'+fmtB(r.end).replace(/\.20\d\d$/,'')+'</span>' : '';
          bar.innerHTML = '<span class="cal-range-title">'+escB(ev.title||'Termin')+'</span>'+dateText+googleMarkB(ev);
          row.appendChild(bar);
        });
      grid.appendChild(row);
    }
  };

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
      window.openPanel(ev.title || 'Google Termin','<div class="google-detail-b"><span class="cal-gmark big">G</span><div><div class="challenge-title">Von Google Kalender</div><div class="settings-hint">'+escB(r.start===r.end?fmtB(r.start):fmtB(r.start)+' – '+fmtB(r.end))+(ev.time?' · '+escB(ev.time):'')+'</div></div></div><button class="btn btn-ghost btn-full" onclick="closePanel()">Schließen</button>');
      return;
    }
    const start = ev?.startDate || ev?.date || (preDate ? toKeyB(preDate) : toKeyB(new Date()));
    const end = ev?.endDate || ev?.date || start;
    const color = ev?.color || 'blue';
    const html = '<div class="fg"><label class="flabel">Titel *</label><input class="finput" id="ev-title" placeholder="Termin" value="'+escB(ev?.title||'')+'"></div>'+
      '<div class="fr"><div class="fg"><label class="flabel">Von-Datum *</label><input type="date" class="finput" id="ev-date" value="'+start+'"></div><div class="fg"><label class="flabel">Bis-Datum</label><input type="date" class="finput" id="ev-end-date" value="'+end+'"></div></div>'+
      '<div class="fr"><div class="fg"><label class="flabel">Von Uhrzeit</label><input type="time" class="finput" id="ev-time" value="'+escB(ev?.time||'')+'"></div><div class="fg"><label class="flabel">Bis Uhrzeit</label><input type="time" class="finput" id="ev-end" value="'+escB(ev?.endTime||'')+'"></div></div>'+
      '<div class="fr"><div class="fg"><label class="flabel">Art</label><select class="finput" id="ev-type"><option value="meeting">Termin</option><option value="deadline">Frist</option><option value="reminder">Erinnerung</option><option value="other">Sonstiges</option></select></div><div class="fg"><label class="flabel">Farbe</label><select class="finput" id="ev-color">'+['blue','green','amber','red','purple'].map(c=>'<option value="'+c+'" '+(color===c?'selected':'')+'>'+c+'</option>').join('')+'</select></div></div>'+
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
    if(typeof toast === 'function') toast('Termin gespeichert ✓','ok');
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


/* FINAL CALENDAR REPAIR: readable month view, holidays inline, points bottom-right, settings fixed */
(function(){
  const DAY=86400000;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dk=d=>{ try{ if(typeof dateKey==='function') return dateKey(d); }catch(e){} const x=new Date(d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
  const pd=s=>new Date(String(s).slice(0,10)+'T12:00:00');
  const add=(d,n)=>{ const x=new Date(d); x.setHours(12,0,0,0); x.setDate(x.getDate()+n); return x; };
  const fmt=k=>{ try{ if(typeof fmtDate==='function') return fmtDate(k); }catch(e){} const d=pd(k); return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear(); };
  const monthNames=window.DE_MONTHS||['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  function getOptions(){
    const def={showHolidays:true,showChallengeDots:true,showWeekNumbers:true};
    ['change_v1_calendar_view_options','calendar_settings'].forEach(k=>{try{const v=JSON.parse(localStorage.getItem(k)||'{}'); Object.assign(def,v||{});}catch(e){}});
    return def;
  }
  function range(ev){
    let s=ev?.startDate||ev?.date||ev?.start?.date||String(ev?.start?.dateTime||'').slice(0,10)||'';
    let e=ev?.endDate||ev?.date||'';
    if(!e && ev?.end){ e=ev.end.date||String(ev.end.dateTime||'').slice(0,10)||s; if(ev.end.date && e>s) e=dk(add(pd(e),-1)); }
    if(!e || e<s) e=s;
    return {start:s,end:e};
  }
  function allEvents(){
    let out=[];
    try{ (window.events||[]).forEach(ev=>{ const r=range(ev); if(r.start) out.push(Object.assign({},ev,{date:r.start,startDate:r.start,endDate:r.end,source:ev.source||'local'})); }); }catch(e){}
    try{ (window.gEvents||[]).forEach(ge=>{ const s=ge.start?.date||String(ge.start?.dateTime||'').slice(0,10); if(!s) return; let e=ge.end?.date||String(ge.end?.dateTime||'').slice(0,10)||s; if(ge.end?.date && e>s) e=dk(add(pd(e),-1)); out.push({id:'g_'+ge.id,title:ge.summary||'(Kein Titel)',date:s,startDate:s,endDate:e<s?s:e,time:ge.start?.dateTime?new Date(ge.start.dateTime).toTimeString().slice(0,5):'',endTime:ge.end?.dateTime?new Date(ge.end.dateTime).toTimeString().slice(0,5):'',color:'blue',type:'meeting',desc:ge.description||'',source:'google',googleEventId:ge.id}); }); }catch(e){}
    return out.filter(e=>e.date);
  }
  window.getAllEvents=allEvents;
  window.getEventById=function(id){ return (window.events||[]).find(e=>e.id===id) || allEvents().find(e=>e.id===id); };
  function evsOn(k){ return allEvents().filter(e=>{const r=range(e); return r.start<=k && r.end>=k;}); }
  function hol(k){ try{return (typeof getHolidaysForDate==='function'?getHolidaysForDate(k):[])||[];}catch(e){return [];} }
  function isTod(d){ try{ return typeof isToday==='function'?isToday(d):dk(d)===dk(new Date()); }catch(e){return dk(d)===dk(new Date());} }
  function diff(a,b){ return Math.round((pd(b)-pd(a))/DAY); }
  function kw(dt){ const d=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())); const day=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-day); const y0=new Date(Date.UTC(d.getUTCFullYear(),0,1)); return Math.ceil((((d-y0)/DAY)+1)/7); }
  function pointSum(k){
    let me=''; try{ me=(typeof getCurrentPlayerId==='function'?getCurrentPlayerId():((window.userInfo&&userInfo.email)||'')); }catch(e){}
    me=String(me||'').toLowerCase();
    return (window.challengeCompletions||[]).filter(c=>String(c.date||'').slice(0,10)===k).filter(c=>{
      const who=String(c.playerId||c.userEmail||'').toLowerCase(); return !me || !who || who===me;
    }).reduce((s,c)=>s+(parseInt(c.points,10)||0),0);
  }
  function gmark(ev){ return ev.source==='google'?'<span class="cal-gmark" title="von Google">G</span>':((ev.googleEventId||ev.syncedToGoogle)?'<span class="cal-gmark synced" title="an Google übertragen">✓</span>':''); }

  window.renderMonth=function(y,m){
    const grid=$('month-grid'), o=getOptions(); if(!grid) return;
    grid.className='month-grid-repaired'; grid.style.display='grid'; grid.style.gridTemplateRows='repeat(6, minmax(112px, 1fr))'; grid.innerHTML='';
    let f=new Date(y,m,1).getDay(); f=f===0?6:f-1;
    const dim=new Date(y,m+1,0).getDate(), pdim=new Date(y,m,0).getDate(), cells=[];
    for(let i=0;i<f;i++) cells.push({d:pdim-f+1+i,m:m?m-1:11,y:m?y:y-1,other:true});
    for(let i=1;i<=dim;i++) cells.push({d:i,m,y,other:false});
    while(cells.length<42){ const n=cells.length-f-dim+1; cells.push({d:n,m:m===11?0:m+1,y:m===11?y+1:y,other:true}); }
    for(let w=0;w<6;w++){
      const row=document.createElement('div'); row.className='cal-week-row';
      const wc=cells.slice(w*7,w*7+7); const sk=dk(new Date(wc[0].y,wc[0].m,wc[0].d)); const ek=dk(new Date(wc[6].y,wc[6].m,wc[6].d));
      wc.forEach((c,i)=>{
        const dt=new Date(c.y,c.m,c.d), k=dk(dt), hs=hol(k), pts=pointSum(k);
        const cell=document.createElement('div'); cell.className='day-cell cal-day'+(c.other?' other':'')+(i>4?' weekend':'')+(isTod(dt)?' today':''); cell.dataset.date=k; cell.style.gridColumn=String(i+1); cell.onclick=()=>{try{onDayClick(dt,evsOn(k));}catch(e){window.openEventPanel&&openEventPanel(null,dt);}};
        let head='<div class="cal-day-head"><span class="day-num">'+c.d+'</span>';
        if(o.showHolidays && hs.length) head+='<span class="cal-holiday" title="'+esc(hs.map(h=>h.name).join(', '))+'">'+esc(hs[0].name)+'</span>';
        head+='</div>';
        cell.innerHTML=head+(o.showWeekNumbers&&i===0?'<div class="cal-kw">KW '+kw(dt)+'</div>':'')+(o.showChallengeDots&&pts>0?'<div class="challenge-points-badge">+'+pts+'P</div>':'');
        row.appendChild(cell);
      });
      const lanes=[];
      allEvents().filter(ev=>{const r=range(ev); return r.start<=ek && r.end>=sk;}).sort((a,b)=>range(a).start.localeCompare(range(b).start)||(a.time||'').localeCompare(b.time||'')).forEach(ev=>{
        const r=range(ev), ss=r.start<sk?sk:r.start, se=r.end>ek?ek:r.end, sc=diff(sk,ss)+1, ec=diff(sk,se)+1;
        let lane=0; while(lanes[lane] && lanes[lane]>=sc) lane++; lanes[lane]=ec; if(lane>2) return;
        const b=document.createElement('div'); b.className='cal-range '+(ev.color||'blue')+(r.start===ss?' start':'')+(r.end===se?' end':''); b.style.gridColumn=sc+' / '+(ec+1); b.style.setProperty('--lane',lane); b.onclick=e=>{e.stopPropagation(); window.openEventPanel&&openEventPanel(ev.id);};
        const dateText=(r.start!==r.end && r.start===ss)?'<span class="cal-range-date">'+fmt(r.start).replace(/\.20\d\d$/,'')+'–'+fmt(r.end).replace(/\.20\d\d$/,'')+'</span>':'';
        b.innerHTML='<span class="cal-range-title">'+esc(ev.title||'Termin')+'</span>'+dateText+gmark(ev);
        row.appendChild(b);
      });
      grid.appendChild(row);
    }
  };

  window.renderYear=function(y){
    const grid=$('month-grid'); if(!grid) return;
    grid.className='year-grid year-grid-repaired'; grid.style.display='grid'; grid.style.gridTemplateRows='none'; grid.innerHTML='';
    for(let m=0;m<12;m++){
      const card=document.createElement('div'); card.className='year-month-card'; card.onclick=()=>{window.curDate=new Date(y,m,1); window.currentCalView='month'; renderCalendar();};
      let f=new Date(y,m,1).getDay(); f=f===0?6:f-1; const dim=new Date(y,m+1,0).getDate();
      let html='<div class="year-month-title">'+monthNames[m]+'</div><div class="year-mini-grid">';
      ['M','D','M','D','F','S','S'].forEach(x=>html+='<div class="year-mini-day year-head">'+x+'</div>');
      for(let i=0;i<f;i++) html+='<div></div>';
      for(let d=1;d<=dim;d++){ const dt=new Date(y,m,d), k=dk(dt), hasEv=evsOn(k).length>0, hasHol=hol(k).length>0; html+='<div class="year-mini-day '+(isTod(dt)?'today ':'')+(hasEv?'has-event ':'')+(hasHol?'has-holiday ':'')+'"><span>'+d+'</span>'+(hasEv||hasHol?'<i></i>':'')+'</div>'; }
      card.innerHTML=html+'</div>'; grid.appendChild(card);
    }
  };

  window.renderCalendar=function(){
    const y=curDate.getFullYear(), m=curDate.getMonth(), ml=$('month-label'), g=$('month-grid'), a=$('agenda-view'), w=$('wday-row');
    if(ml) ml.textContent=currentCalView==='year'?String(y):(currentCalView==='workweek'?'Arbeitswoche · '+monthNames[m]+' '+y:monthNames[m]+' '+y);
    ['year','month','workweek','today'].forEach(v=>$('vbtn-'+v)?.classList.toggle('active',currentCalView===v));
    if(a) a.style.display='none'; if(g) g.style.display='grid';
    if(currentCalView==='year'){ if(w)w.style.display='none'; renderYear(y); }
    else if(currentCalView==='workweek'){ if(w)w.style.display='none'; if(typeof renderWorkweek==='function') renderWorkweek(); else renderMonth(y,m); }
    else { if(w)w.style.display='grid'; renderMonth(y,m); }
    try{ if(typeof renderUpcoming==='function') renderUpcoming(); }catch(e){}
  };
  window.setCalView=function(v){ window.currentCalView=v; renderCalendar(); };
  window.navigate=function(dir){ if(currentCalView==='year') curDate=new Date(curDate.getFullYear()+dir,0,1); else if(currentCalView==='workweek') curDate=add(curDate,dir*7); else curDate=new Date(curDate.getFullYear(),curDate.getMonth()+dir,1); renderCalendar(); };
  window.goToday=function(){ curDate=new Date(); if(currentCalView==='year') currentCalView='month'; renderCalendar(); };

  window.openCalendarSettings=function(){
    const o=getOptions();
    const states=window.STATE_OPTIONS||{ALL:'Alle Bundesländer',BW:'Baden-Württemberg',BY:'Bayern','BY-AUGSBURG':'Bayern · Augsburg',BE:'Berlin',BB:'Brandenburg',HB:'Bremen',HH:'Hamburg',HE:'Hessen',MV:'Mecklenburg-Vorpommern',NI:'Niedersachsen',NW:'Nordrhein-Westfalen',RP:'Rheinland-Pfalz',SL:'Saarland',SN:'Sachsen',ST:'Sachsen-Anhalt',SH:'Schleswig-Holstein',TH:'Thüringen'};
    const cur=(window.calendarSettings&&calendarSettings.state)||localStorage.getItem('holiday_state')||'ALL';
    const opts=Object.entries(states).map(([k,v])=>'<option value="'+k+'" '+(k===cur?'selected':'')+'>'+esc(v)+'</option>').join('');
    const tog=(title,id,key,sub)=>'<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">'+title+'</div><div class="toggle-sub">'+sub+'</div></div><label class="switch"><input type="checkbox" id="'+id+'" '+(o[key]?'checked':'')+'><span class="slider"></span></label></div>';
    const html='<div class="fg"><label class="flabel">Bundesland für Feiertage</label><select class="finput" id="holiday-state">'+opts+'</select></div>'+tog('Feiertage anzeigen','toggle-holidays','showHolidays','')+tog('Challenge-Punkte anzeigen','toggle-dots','showChallengeDots','')+tog('Kalenderwochen anzeigen','toggle-kw','showWeekNumbers','')+'<button class="btn btn-primary btn-full" onclick="saveCalSettings()">Speichern</button>';
    if(typeof openPanel==='function') openPanel('Kalender-Einstellungen',html);
  };
  window.saveCalSettings=function(){
    const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked};
    localStorage.setItem('change_v1_calendar_view_options',JSON.stringify(o)); localStorage.setItem('calendar_settings',JSON.stringify(o));
    try{ if(!window.calendarSettings) window.calendarSettings={}; calendarSettings.state=$('holiday-state')?.value||'ALL'; if(typeof ls==='function') ls('holiday_state',calendarSettings.state); else localStorage.setItem('holiday_state',JSON.stringify(calendarSettings.state)); localStorage.setItem('change_v1_holiday_state',calendarSettings.state); }catch(e){}
    if(typeof closePanel==='function') closePanel(); renderCalendar(); if(typeof toast==='function') toast('Kalender-Einstellungen gespeichert ✓','ok');
  };

  const css=document.createElement('style'); css.id='calendar-repair-final-style'; css.textContent=`
    #month-grid.month-grid-repaired{display:grid!important;grid-template-rows:repeat(6,minmax(112px,1fr))!important;overflow:hidden;background:var(--bg);border-top:1px solid var(--b1)}
    .cal-week-row{position:relative;display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr));min-height:112px;border-bottom:1px solid var(--b1)}
    .cal-day{grid-row:1;position:relative!important;min-width:0;overflow:hidden;padding:8px 8px 28px!important;background:var(--s1);border-right:1px solid var(--b1);cursor:pointer}
    .cal-day.weekend{background:rgba(248,247,244,.55)}.cal-day.other{opacity:.42}.cal-day.today{background:linear-gradient(180deg,rgba(45,106,79,.08),rgba(45,106,79,.02))!important;box-shadow:inset 0 0 0 1px rgba(45,106,79,.20)}
    .cal-day-head{display:flex!important;align-items:center;gap:6px;min-height:18px;padding-right:42px;position:relative;z-index:6}.cal-day .day-num{display:inline-flex!important;color:var(--t2)!important;font-size:12px!important;font-weight:900!important;line-height:1}.cal-day.today .day-num{background:var(--acc);color:#fff!important;border-radius:999px;padding:4px 7px;margin:-4px 0}
    .cal-holiday{display:inline-block;max-width:calc(100% - 32px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:800;color:#c76a00;background:rgba(245,158,11,.12);border-radius:999px;padding:2px 6px;line-height:1.2}
    .cal-kw{position:absolute;left:6px;bottom:6px;z-index:8;font-size:10px;font-weight:900;color:var(--acc);background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.22);border-radius:999px;padding:2px 6px;line-height:1.1}
    .cal-week-row .challenge-points-badge{position:absolute!important;right:7px!important;bottom:7px!important;top:auto!important;left:auto!important;width:auto!important;height:auto!important;min-width:0!important;z-index:9!important;font-size:10px!important;font-weight:900!important;color:var(--grn)!important;background:rgba(52,211,153,.14)!important;border:1px solid rgba(52,211,153,.28)!important;border-radius:999px!important;padding:2px 6px!important;line-height:1.1!important;pointer-events:none!important;box-shadow:none!important;writing-mode:horizontal-tb!important;transform:none!important}
    .cal-range{grid-row:1;align-self:start;position:relative;z-index:5;margin-top:calc(34px + var(--lane)*23px);height:19px;line-height:19px;padding:0 7px;display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden;border:1px solid rgba(59,130,246,.20);background:rgba(59,130,246,.13);color:#2563eb;box-shadow:0 1px 2px rgba(0,0,0,.03);border-radius:4px;cursor:pointer}
    .cal-range.start{border-top-left-radius:10px;border-bottom-left-radius:10px}.cal-range.end{border-top-right-radius:10px;border-bottom-right-radius:10px}.cal-range.green{background:rgba(45,106,79,.13);border-color:rgba(45,106,79,.22);color:var(--acc)}.cal-range.amber{background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.24);color:#b45309}.cal-range.red{background:rgba(239,68,68,.11);border-color:rgba(239,68,68,.20);color:#dc2626}.cal-range.purple{background:rgba(139,92,246,.11);border-color:rgba(139,92,246,.20);color:#7c3aed}
    .cal-range-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:800}.cal-range-date{font-size:9.5px;font-weight:800;background:rgba(255,255,255,.55);border-radius:999px;padding:0 5px;white-space:nowrap}.cal-gmark{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;font-size:8px;font-weight:900;color:#4285f4;background:rgba(66,133,244,.13);flex:0 0 auto}.cal-gmark.synced{color:var(--grn);background:rgba(52,211,153,.14)}
    .year-grid-repaired{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;padding:14px!important;overflow:auto!important}.year-mini-day{position:relative}.year-mini-day i{position:absolute;left:50%;bottom:1px;transform:translateX(-50%);width:5px;height:5px;border-radius:50%;background:var(--acc)}.year-mini-day.has-holiday i{background:#f59e0b}.year-mini-day.has-event.has-holiday i{background:linear-gradient(90deg,var(--acc) 50%,#f59e0b 50%)}
    @media(max-width:800px){#month-grid.month-grid-repaired{grid-template-rows:repeat(6,minmax(96px,1fr))!important}.cal-week-row{min-height:96px}.cal-range{margin-top:calc(31px + var(--lane)*21px);height:18px}.cal-holiday{max-width:68px}.year-grid-repaired{grid-template-columns:1fr!important}}
  `; document.head.appendChild(css);
  setTimeout(()=>{try{renderCalendar();}catch(e){console.warn('calendar repair',e)}},80);
})();


(function(){
'use strict';
const $=id=>document.getElementById(id);
const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const pad=n=>String(n).padStart(2,'0');
const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{ if(!s) return null; if(s instanceof Date) return new Date(s.getFullYear(),s.getMonth(),s.getDate()); const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); return m?new Date(+m[1],+m[2]-1,+m[3]):null; };
const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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
window.renderMonth=function(y,m){
  const grid=$('month-grid'), o=opts(); if(!grid)return;
  grid.className='fx-month'; grid.style.display='grid'; grid.innerHTML='';
  const all=cells(y,m);
  for(let w=0;w<6;w++){
    const week=all.slice(w*7,w*7+7), row=document.createElement('div'); row.className='fx-week';
    const wkStart=parse(key(new Date(week[0].y,week[0].m,week[0].d))), wkEnd=parse(key(new Date(week[6].y,week[6].m,week[6].d)));
    week.forEach((c,i)=>{const dt=new Date(c.y,c.m,c.d), k=key(dt), hs=holidays(k), pts=points(k); const cell=document.createElement('div'); cell.className='fx-day'+(c.other?' other':'')+(i>4?' weekend':'')+(today(dt)?' is-today':''); cell.style.gridColumn=String(i+1); cell.onclick=()=>onDay(dt); cell.innerHTML='<div class="fx-day-head"><span class="fx-num">'+c.d+'</span>'+(o.showHolidays&&hs.length?'<span class="fx-holiday" title="'+esc(hs[0].name)+'">'+esc(hs[0].name)+'</span>':'')+'</div>'+(o.showChallengeDots&&pts>0?'<span class="fx-points">+'+pts+'P</span>':'')+(i===0&&o.showWeekNumbers?'<span class="fx-kw">KW '+weekNo(dt)+'</span>':''); row.appendChild(cell);});
    const lanes=[];
    allEvents().filter(ev=>{const r=evRange(ev);return r.s<=wkEnd&&r.e>=wkStart;}).sort((a,b)=>evRange(a).sk.localeCompare(evRange(b).sk)||String(a.title).localeCompare(String(b.title))).forEach(ev=>{const r=evRange(ev); const s=r.s<wkStart?wkStart:r.s, e=r.e>wkEnd?wkEnd:r.e; const sc=Math.round((s-wkStart)/86400000)+1, ec=Math.round((e-wkStart)/86400000)+1; let lane=0; while(lanes[lane]&&lanes[lane]>=sc)lane++; lanes[lane]=ec; if(lane>2)return; const bar=document.createElement('button'); bar.type='button'; bar.className='fx-event '+colorClass(ev)+(key(s)===r.sk?' start':'')+(key(e)===r.ek?' end':''); bar.style.gridColumn=sc+' / '+(ec+1); bar.style.setProperty('--lane',lane); bar.onclick=(e)=>{e.stopPropagation();openEv(ev)}; const multi=r.sk!==r.ek; bar.innerHTML='<span class="fx-title">'+esc(ev.title||'Termin')+'</span>'+(multi&&key(s)===r.sk?'<span class="fx-range">'+esc((typeof fmtDate==='function'?fmtDate(r.sk):r.sk)+'–'+(typeof fmtDate==='function'?fmtDate(r.ek):r.ek))+'</span>':'')+googleMark(ev); row.appendChild(bar);});
    grid.appendChild(row);
  }
};
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


(function(){
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function storedPushEnabled(){try{return localStorage.getItem('push_enabled')==='true' || localStorage.getItem('change_push_enabled')==='true';}catch(e){return false;}}
  function setStoredPush(v){try{localStorage.setItem('push_enabled',v?'true':'false');localStorage.setItem('change_push_enabled',v?'true':'false');}catch(e){}}
  window.openNotifPanel=function(){
    const enabled=storedPushEnabled() && (typeof Notification==='undefined' || Notification.permission==='granted');
    const notes=(window.notifications||[]).slice(0,8);
    const html=
      '<div class="notif-clean-card">'+
        '<div class="notif-clean-top">'+
          '<div class="notif-clean-icon">🔔</div>'+
          '<div class="notif-clean-text">'+
            '<div class="notif-clean-title">Push-Benachrichtigungen</div>'+
          '</div>'+
          '<label class="switch"><input type="checkbox" id="bell-push-toggle" '+(enabled?'checked':'')+' onchange="togglePushFromBell(this.checked)"><span class="slider"></span></label>'+
        '</div>'+
        '<button class="notif-test-btn" onclick="sendTestBellNotification()">Test-Benachrichtigung senden</button>'+
      '</div>'+
      '<div class="notif-clean-section"><div class="notif-clean-section-title">Aktuelle Hinweise</div><div id="bell-notif-list">'+
      (notes.length?notes.map(n=>'<div class="nitem"><div class="nitem-icon" style="background:var(--acc-d)">🔔</div><div class="nitem-body"><div class="nitem-title">'+esc(n.title||'Benachrichtigung')+'</div><div class="nitem-sub">'+esc(n.body||n.text||'')+'</div></div></div>').join(''):'<div class="notif-empty">Keine neuen Benachrichtigungen</div>')+
      '</div></div>';
    if(typeof openPanel==='function') openPanel('Benachrichtigungen',html);
    const dot=document.getElementById('notif-dot'); if(dot)dot.style.display='none';
  };
  window.updateBellPushStatus=function(text){
    const t=document.getElementById('bell-push-toggle');
    if(t) t.checked=(text==='aktiv');
    const dot=document.getElementById('notif-dot'); if(dot)dot.style.display=(text==='aktiv')?'block':'none';
  };
  window.togglePushFromBell=async function(on){
    try{
      if(!on){setStoredPush(false); const t=document.getElementById('bell-push-toggle'); if(t)t.checked=false; if(typeof toast==='function')toast('Push-Benachrichtigungen deaktiviert','ok'); return;}
      if(typeof Notification==='undefined'){setStoredPush(false); const t=document.getElementById('bell-push-toggle'); if(t)t.checked=false; if(typeof toast==='function')toast('Push wird von diesem Browser nicht unterstützt','err'); return;}
      let perm=Notification.permission;
      if(perm!=='granted') perm=await Notification.requestPermission();
      if(perm==='granted'){
        setStoredPush(true); const t=document.getElementById('bell-push-toggle'); if(t)t.checked=true;
        try{ if(typeof initFirebaseMessaging==='function') initFirebaseMessaging(); }catch(e){}
        if(typeof toast==='function')toast('Push-Benachrichtigungen aktiviert','ok');
      }else{
        setStoredPush(false); const t=document.getElementById('bell-push-toggle'); if(t)t.checked=false; if(typeof toast==='function')toast('Push wurde im Browser nicht erlaubt','err');
      }
    }catch(e){console.warn('notif style patch',e); if(typeof toast==='function')toast('Push konnte nicht geändert werden','err');}
  };
  window.sendTestBellNotification=function(){
    try{
      if(!storedPushEnabled()){if(typeof toast==='function')toast('Push ist deaktiviert','err');return;}
      if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
        new Notification('Change',{body:'Test-Benachrichtigung funktioniert.'});
        if(typeof toast==='function')toast('Test gesendet','ok');
      }else if(typeof toast==='function')toast('Bitte Push zuerst aktivieren','err');
    }catch(e){if(typeof toast==='function')toast('Test-Benachrichtigung nicht möglich','err');}
  };
  const st=document.createElement('style');
  st.id='change-notification-style-de-css';
  st.textContent=`
    .notif-clean-card{margin:16px 14px 12px;padding:16px;border:1px solid #dbe7df;background:linear-gradient(135deg,#f7fbf8,#eef7f2);border-radius:14px;box-shadow:0 8px 24px rgba(22,80,55,.06)}
    .notif-clean-top{display:flex;align-items:center;gap:12px}.notif-clean-icon{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#e4f3ea;font-size:18px}.notif-clean-text{flex:1;min-width:0}.notif-clean-title{font-weight:850;color:var(--t1);font-size:15px;line-height:1.25}.notif-test-btn{width:100%;margin-top:14px;border:1px solid #d8e2dc;background:#fff;color:#1f3f31;border-radius:12px;height:38px;font-weight:750;cursor:pointer}.notif-test-btn:hover{background:#f7fbf8}.notif-clean-section{margin:12px 14px 0;padding:16px;border:1px solid #e0ded6;background:#faf9f5;border-radius:14px}.notif-clean-section-title{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6f746f;font-weight:850;margin-bottom:16px}.notif-empty{text-align:center;color:#9ba19d;padding:18px 8px 22px}.bell-push-box{display:none!important}`;
  document.head.appendChild(st);
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


/* DASHBOARD FIX: Feiertage sichtbar, Datums-/Zeitraumblock weiter links, heutige Einträge immer oben */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const parse=k=>new Date(String(k||'').slice(0,10)+'T12:00:00');
  const today=()=>key(new Date());
  const add=(k,n)=>{const d=parse(k);d.setDate(d.getDate()+n);return key(d)};
  const diff=k=>Math.round((parse(k)-parse(today()))/86400000);
  const fmt=k=>parse(k).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
  const fmtLong=k=>parse(k).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'}).replace('.', '');
  function evTitle(e){return String(e?.title||e?.summary||e?.name||'Termin').trim()||'Termin'}
  function evStart(e){return String(e?.date||e?.startDate||e?.dateKey||e?.fromDate||e?.start?.date||(e?.start?.dateTime?e.start.dateTime.slice(0,10):'')||'').slice(0,10)}
  function evEnd(e){let x=String(e?.endDate||e?.dateEnd||e?.toDate||e?.untilDate||'').slice(0,10); if(!x && e?.end?.date){const d=parse(e.end.date);d.setDate(d.getDate()-1);x=key(d)} if(!x && e?.end?.dateTime)x=String(e.end.dateTime).slice(0,10); const s=evStart(e); return (!x||x<s)?s:x;}
  function evTime(e){return e?.time||e?.startTime||(e?.start?.dateTime?new Date(e.start.dateTime).toTimeString().slice(0,5):'')||''}
  function allEvents(){const out=[]; try{(window.events||[]).forEach(e=>out.push(e))}catch(e){} try{(window.gEvents||[]).forEach(g=>out.push(g))}catch(e){} try{if(!out.length && typeof getAllEvents==='function')(getAllEvents()||[]).forEach(e=>out.push(e))}catch(e){} return out;}
  function holidayFallback(k){const d=parse(k), y=d.getFullYear(), md=pad(d.getMonth()+1)+'-'+pad(d.getDate()), out=[]; const fixed={'01-01':'Neujahr','05-01':'Tag der Arbeit','10-03':'Tag der Deutschen Einheit','12-25':'1. Weihnachtstag','12-26':'2. Weihnachtstag'}; if(fixed[md])out.push({name:fixed[md],states:['ALL']}); const a=y%19,b=Math.floor(y/100),c=y%100,dd=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-dd-g+15)%30,i=Math.floor(c/4),kk=c%4,l=(32+2*e+2*i-h-kk)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1,es=new Date(y,mo-1,da,12); [[-2,'Karfreitag'],[1,'Ostermontag'],[39,'Christi Himmelfahrt'],[50,'Pfingstmontag'],[60,'Fronleichnam']].forEach(([o,n])=>{const x=new Date(es);x.setDate(x.getDate()+o);if(key(x)===k)out.push({name:n,states:['ALL']})}); return out;}
  function holidays(k){let hs=[]; try{if(typeof getHolidaysForDate==='function')hs=getHolidaysForDate(k)||[]}catch(e){} const seen=new Set(), out=[]; hs.concat(holidayFallback(k)).forEach(h=>{const n=h&&h.name; if(n&&!seen.has(n)){seen.add(n);out.push(h)}}); return out;}
  function isActiveToday(r){const t=today();return r.start<=t&&r.end>=t}
  function eventRows(){const t=today(), limit=add(t,14), seen=new Set(), rows=[]; allEvents().forEach(e=>{const s=evStart(e), en=evEnd(e); if(!s||en<t||s>limit)return; const display=s<t?t:s; const gid=e.googleEventId||(String(e.id||'').startsWith('g_')?String(e.id).slice(2):''); const sig=(gid?'g:'+gid:evTitle(e).toLowerCase()+'|'+s+'|'+en+'|'+evTime(e)); if(seen.has(sig))return; seen.add(sig); rows.push({kind:'event',ev:e,date:display,start:s,end:en,sort:(s<=t&&en>=t?'0:':'1:')+display+'|'+(evTime(e)||'99:99')});}); return rows;}
  function holidayRows(){const t=today(), rows=[]; for(let i=0;i<=14;i++){const k=add(t,i); holidays(k).forEach(h=>rows.push({kind:'holiday',date:k,start:k,end:k,sort:(k===t?'0:':'1:')+k+'|00:00',holiday:h}))} return rows;}
  function rows(){return holidayRows().concat(eventRows()).sort((a,b)=>a.sort.localeCompare(b.sort)||(a.kind==='holiday'?-1:1)).slice(0,9)}
  function dateBlock(r){const active=isActiveToday(r), d=diff(r.date); const top=active?'Heute':(d===1?'Morgen':fmt(r.date)); const bot=active?fmt(r.date):fmtLong(r.date); return '<div class="dash-date-block dash-date-left '+(active?'is-today':'')+'"><div>'+esc(top)+'</div><span>'+esc(bot)+'</span></div>';}
  function calHtml(){const rs=rows(); if(!rs.length)return '<div class="dash-empty compact-empty">Keine Termine oder Feiertage</div>'; return rs.map(r=>{if(r.kind==='holiday')return '<div class="dash-row compact-row dashboard-calendar-row holiday-row" onclick="setMainView(\'calendar\')">'+dateBlock(r)+'<div class="dash-row-icon" style="background:var(--amb-d)">🎉</div><div class="dash-row-body"><div class="dash-row-title">'+esc(r.holiday.name)+' <span class="holiday-mini-badge">Feiertag</span></div><div class="dash-row-sub">'+esc(fmtLong(r.date))+'</div></div></div>'; const range=r.end&&r.end!==r.start, active=isActiveToday(r), sub=range?(fmt(r.start)+' – '+fmt(r.end)):(fmtLong(r.start)+(evTime(r.ev)?' · '+esc(evTime(r.ev)):'')); return '<div class="dash-row compact-row dashboard-calendar-row '+(active?'dash-today-row':'')+'" onclick="setMainView(\'calendar\')">'+dateBlock(r)+'<div class="dash-row-icon" style="background:var(--acc-d)">📅</div><div class="dash-row-body"><div class="dash-row-title">'+esc(evTitle(r.ev))+'</div><div class="dash-row-sub">'+sub+'</div></div></div>';}).join('');}
  function challengeHtml(){try{const td=today(),me=String(window.userInfo?.email||'').toLowerCase(),done=new Set((window.challengeCompletions||[]).filter(c=>String(c.date||'').slice(0,10)===td&&(!me||String(c.userEmail||c.playerId||c.email||'').toLowerCase()===me)).map(c=>String(c.challengeId||''))),chs=(window.challenges||[]).filter(c=>c&&c.active!==false&&(c.recurrence==='daily'||!c.date||String(c.date||c.startDate||'').slice(0,10)===td)).slice(0,4); if(!chs.length)return '<div class="dash-empty compact-empty">Heute keine Challenges</div>'; return chs.map(ch=>'<div class="dash-row compact-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--pur-d)">'+esc(ch.icon||'🏆')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(ch.title||ch.name||'Challenge')+'</div><div class="dash-row-sub">'+(parseInt(ch.points,10)||0)+' Punkte</div></div><span class="dash-row-badge '+(done.has(String(ch.id))?'badge-green':'badge-amber')+'">'+(done.has(String(ch.id))?'✓':'offen')+'</span></div>').join('')}catch(e){return '<div class="dash-empty compact-empty">Heute keine Challenges</div>'}}
  function playersHtml(){try{const ps=(typeof getVisibleContestPlayers==='function'?getVisibleContestPlayers():(window.challengePlayers||[])).slice(0,4),me=String(window.userInfo?.email||'').toLowerCase(); if(!ps.length)return '<div class="dash-empty compact-empty">Noch keine Mitspieler</div>'; return ps.map((p,i)=>{const id=String(p.email||p.id||'').toLowerCase(),st=typeof getPlayerPointSummary==='function'?getPlayerPointSummary(id):{totalPoints:0,todayPoints:0},medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1); return '<div class="dash-row compact-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--amb-d)">'+medal+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(p.name||p.email||'Mitspieler')+(id===me?' · Du':'')+'</div><div class="dash-row-sub">Heute '+(st.todayPoints||0)+' P · Gesamt '+(st.totalPoints||0)+' P</div></div><span class="dash-row-badge badge-green">'+(st.totalPoints||0)+' P</span></div>'}).join('')}catch(e){return '<div class="dash-empty compact-empty">Noch keine Mitspieler</div>'}}
  function inject(){let st=$('dashboard-holiday-today-left-style'); if(!st){st=document.createElement('style');st.id='dashboard-holiday-today-left-style';document.head.appendChild(st)} st.textContent=`#kpi-grid{display:none!important}#dashboard-view{padding:18px 18px 24px!important}.dash-grid{display:grid!important;grid-template-columns:minmax(390px,.82fr) minmax(460px,1.18fr)!important;gap:16px!important;align-items:start!important}.calendar-card{grid-column:auto!important}.dash-card{border-radius:18px!important;box-shadow:0 2px 12px rgba(0,0,0,.05)!important}.dash-card-head{padding:12px 16px!important}.dash-card-body{max-height:360px!important;overflow:auto!important}.dashboard-combined-card .dash-card-body{max-height:360px!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:0!important;padding:0!important}.dashboard-section+.dashboard-section{border-left:1px solid var(--b1)!important}.dashboard-section-head{padding:10px 14px 7px!important;font-size:12px!important;font-weight:800!important;color:var(--t2)!important}.compact-row{padding:10px 12px 10px 8px!important;min-height:48px!important;gap:8px!important}.compact-row .dash-row-icon{width:30px!important;height:30px!important;border-radius:9px!important;font-size:13px!important}.compact-row .dash-row-title{font-size:13px!important}.compact-row .dash-row-sub{font-size:11px!important}.dashboard-calendar-row{align-items:center!important}.dash-date-left{width:42px!important;flex:0 0 42px!important;margin-left:0!important;text-align:left!important;font-size:11px!important;font-weight:850!important;color:var(--t2)!important;line-height:1.05!important}.dash-date-left span{display:block!important;margin-top:3px!important;font-size:9.5px!important;font-weight:700!important;color:var(--t5)!important}.dash-date-left.is-today div,.dash-date-left.is-today span{color:var(--acc)!important}.dash-today-row{background:rgba(45,106,79,.06)!important;box-shadow:inset 3px 0 0 var(--acc)!important}.holiday-row{background:rgba(245,158,11,.08)!important;box-shadow:inset 3px 0 0 var(--amb)!important}.holiday-mini-badge{display:inline-flex!important;margin-left:6px!important;padding:1px 6px!important;border-radius:999px!important;background:rgba(245,158,11,.14)!important;color:#b85f00!important;border:1px solid rgba(245,158,11,.22)!important;font-size:10px!important;font-weight:800!important}.compact-empty{padding:22px 14px!important;font-size:12px!important}@media(max-width:900px){.dash-grid{grid-template-columns:1fr!important}.dashboard-combined-card .dash-card-body{grid-template-columns:1fr!important}.dashboard-section+.dashboard-section{border-left:0!important;border-top:1px solid var(--b1)!important}.dash-card-body,.dashboard-combined-card .dash-card-body{max-height:none!important}}`;}
  window.buildDashCards=function(){const grid=$('dash-grid'); if(!grid)return; inject(); grid.innerHTML='<div class="dash-card calendar-card"><div class="dash-card-head"><div><div class="dash-card-title">📅 Kalender</div><div class="dash-card-sub">Heute + nächste Tage</div></div></div><div class="dash-card-body">'+calHtml()+'</div></div><div class="dash-card dashboard-combined-card"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenges & 👥 Mitspieler</div><div class="dash-card-sub">Heute und Rangliste</div></div></div><div class="dash-card-body"><div class="dashboard-section"><div class="dashboard-section-head"><span>Challenges</span></div>'+challengeHtml()+'</div><div class="dashboard-section"><div class="dashboard-section-head"><span>Mitspieler</span></div>'+playersHtml()+'</div></div></div>';};
  window.buildDashboard=function(){try{const n=(window.userInfo&&userInfo.name)||'',h=$('dash-greeting'); if(h)h.textContent=(new Date().getHours()<12?'Guten Morgen':new Date().getHours()<17?'Guten Tag':'Guten Abend')+(n?', '+n.split(' ')[0]:''); const s=$('dash-sub'); if(s)s.textContent='Kalender, Challenges und Mitspieler auf einen Blick'}catch(e){} window.buildDashCards();};
  setTimeout(()=>{try{if(window.currentMainView==='dashboard')window.buildDashboard()}catch(e){}},250);
})();


(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad=n=>String(n).padStart(2,'0');
  const dayKey=d=>{try{if(typeof dateKey==='function')return dateKey(d)}catch(e){} const x=d instanceof Date?d:new Date(d); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())};
  const today=()=>dayKey(new Date());
  const getStore=(name,fallback)=>{try{ if(typeof eval(name)!=='undefined') return eval(name); }catch(e){} try{return window[name]??fallback}catch(e){return fallback}};
  const setStore=(name,val)=>{try{ eval(name+' = val'); }catch(e){} try{window[name]=val}catch(e){}};
  const readLS=(k,d)=>{try{const v=localStorage.getItem(k); if(v==null)return d; return JSON.parse(v)}catch(e){return d}};
  const writeLS=(k,v)=>{try{ if(typeof ls==='function')ls(k,v); else localStorage.setItem(k,JSON.stringify(v)); }catch(e){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}};
  function account(){
    let fu=null; try{fu=(window.firebase&&firebase.auth&&firebase.auth().currentUser)||null}catch(e){}
    const u=getStore('userInfo',{})||{};
    const email=String((fu&&fu.email)||u.email||u.mail||'').trim().toLowerCase();
    const uid=String((fu&&fu.uid)||u.uid||'').trim();
    const name=(fu&&fu.displayName)||u.name||email||'Du';
    const picture=(fu&&fu.photoURL)||u.picture||u.photoURL||'';
    return {id:email||uid||'local-user',email,uid,name,picture};
  }
  function syncArrays(){
    let cps=getStore('challengePlayers',[]); if(!Array.isArray(cps)) cps=[];
    let cms=getStore('challengeCompletions',[]); if(!Array.isArray(cms)) cms=[];
    let chs=getStore('challenges',[]); if(!Array.isArray(chs)) chs=[];
    if(!cms.length) cms=readLS('challenge_completions',[]);
    if(!chs.length) chs=readLS('challenges',[]);
    const a=account();
    const by=new Map();
    cps.forEach(p=>{const id=String(p?.email||p?.id||p?.uid||'').toLowerCase(); if(id && !['du','ich','me','local-user'].includes(id)) by.set(id,{...p,id,email:p.email||id});});
    cms.forEach(c=>{let id=String(c?.playerId||c?.userEmail||c?.email||'').toLowerCase(); if(['du','ich','me','local-user',''].includes(id)) id=a.id; if(id) by.set(id,{...(by.get(id)||{}),id,email:id,name:(by.get(id)?.name)||c.playerName||c.userName||id});});
    if(a.id) by.set(a.id,{...(by.get(a.id)||{}),id:a.id,email:a.email||a.id,uid:a.uid,name:a.name,picture:a.picture,online:true});
    cps=[...by.values()].filter(p=>!String(p.name||p.email||p.id||'').toLowerCase().match(/^(du|ich|me)$/));
    setStore('challengePlayers',cps); setStore('challengeCompletions',cms); setStore('challenges',chs);
    return {players:cps,completions:cms,challenges:chs,account:a};
  }
  function playerIdOf(c){const a=account();let id=String(c?.playerId||c?.userEmail||c?.email||c?.userId||'').toLowerCase(); if(!id||['du','ich','me','local-user'].includes(id)) id=a.id; return id;}
  function isDone(chId){const {completions,account:a}=syncArrays(), td=today(); return completions.some(c=>String(c.challengeId)===String(chId)&&String(c.date||'').slice(0,10)===td&&playerIdOf(c)===a.id);}
  function persistChallenges(){const {players,completions,challenges}=syncArrays(); writeLS('challenge_players',players); writeLS('challenge_completions',completions); writeLS('challenges',challenges); try{persistChangeState&&persistChangeState()}catch(e){} }
  function statsFor(id){const {completions}=syncArrays(); const td=today(); let totalPoints=0,todayPoints=0,totalCount=0; completions.forEach(c=>{if(playerIdOf(c)!==id)return; const p=parseInt(c.points,10)||0; totalPoints+=p; totalCount++; if(String(c.date||'').slice(0,10)===td)todayPoints+=p;}); return {totalPoints,todayPoints,totalCount};}

  // 1) Navigation sauber: Kalender-Steuerung nur im Kalender; keine Sichtbarkeit in anderen Reitern.
  window.setMainView=function(view){
    const v=view||'dashboard';
    try{window.currentMainView=currentMainView=v}catch(e){window.currentMainView=v}
    ['dashboard-view','cal-body','challenges-view'].forEach(id=>{const el=$(id); if(el)el.style.display='none'});
    const controls=$('cal-controls'); if(controls)controls.style.display='none';
    if(v==='calendar'){
      const cal=$('cal-body'); if(cal)cal.style.display='flex';
      if(controls)controls.style.display='flex';
      try{renderCalendar&&renderCalendar()}catch(e){}
    }else if(v==='challenges'){
      if(!$('challenges-view') && typeof installChallengeView==='function') installChallengeView();
      const chv=$('challenges-view'); if(chv)chv.style.display='flex';
      try{renderChallenges&&renderChallenges()}catch(e){}
    }else{
      const dash=$('dashboard-view'); if(dash)dash.style.display='block';
      try{buildDashboard&&buildDashboard()}catch(e){}
    }
    document.querySelectorAll('.h-tab,.bnav-item').forEach(x=>x.classList.remove('active'));
    $('htab-'+v)?.classList.add('active'); $('bnav-'+v)?.classList.add('active');
  };

  // 2) Unterste Kalender-Zeile „Demnächst“ entfernen.
  function removeUpcoming(){const u=$('upcoming-strip'); if(u)u.remove();}
  window.renderUpcoming=function(){removeUpcoming();};

  // 3) Google-Sync nur in Kalender-Einstellungen; Sync-Panel nur Live-Sync.
  const googleKey='change_google_calendar_sync_enabled';
  const googleOn=()=>{try{return localStorage.getItem(googleKey)!=='0'&&localStorage.getItem(googleKey)!=='false'}catch(e){return true}};
  const setGoogle=v=>{try{localStorage.setItem(googleKey,v?'1':'0')}catch(e){}};
  window.openPushSettingsPanel=function(){
    const liveOn=readLS('live_sync_enabled',true)!==false && readLS('change_v1_live_sync_enabled',true)!==false;
    const online=liveOn?syncArrays().players.filter(p=>p.online).length:0;
    const html='<div class="push-box"><div class="challenge-title">Live-Sync</div><div class="settings-hint" style="margin-top:8px">Push steuerst du über die Glocke. Live-Sync synchronisiert nur Mitspieler und Punkte.</div></div>'+ 
      '<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Live-Mitspieler <span class="status-pill '+(liveOn?'status-on':'status-off')+'">'+(liveOn?'VERBUNDEN':'DEAKTIVIERT')+'</span></div><div class="toggle-sub">Aktuell online: '+online+' · synchronisiert Mitspieler und erledigte Challenges.</div></div><label class="switch"><input type="checkbox" '+(liveOn?'checked':'')+' onchange="setLiveSyncEnabled&&setLiveSyncEnabled(this.checked)"><span class="slider"></span></label></div>';
    openPanel&&openPanel('Live-Sync',html);
  };
  window.setGoogleCalendarSyncEnabled=async function(enabled){
    setGoogle(!!enabled);
    if(enabled){try{toast&&toast('Google-Kalender-Sync wird aktualisiert…','')}catch(e){} try{await loadGoogleEvents?.()}catch(e){} try{renderCalendar?.();buildDashboard?.()}catch(e){} try{toast&&toast('Google-Kalender-Sync aktualisiert ✓','ok')}catch(e){}}
    else{try{setStore('gEvents',[]);renderCalendar?.();buildDashboard?.();toast&&toast('Google-Kalender-Sync deaktiviert','')}catch(e){}}
    try{openCalendarSettings&&openCalendarSettings()}catch(e){}
  };
  const oldCalendarSettings=window.openCalendarSettings;
  window.openCalendarSettings=function(){
    const states=window.STATE_OPTIONS||{ALL:'Alle Bundesländer',BW:'Baden-Württemberg',BY:'Bayern','BY-AUGSBURG':'Bayern · Augsburg',BE:'Berlin',BB:'Brandenburg',HB:'Bremen',HH:'Hamburg',HE:'Hessen',MV:'Mecklenburg-Vorpommern',NI:'Niedersachsen',NW:'Nordrhein-Westfalen',RP:'Rheinland-Pfalz',SL:'Saarland',SN:'Sachsen',ST:'Sachsen-Anhalt',SH:'Schleswig-Holstein',TH:'Thüringen'};
    const opt=readLS('change_v1_calendar_view_options',{showHolidays:true,showChallengeDots:true,showWeekNumbers:true});
    const st=(getStore('calendarSettings',{})?.state)||localStorage.getItem('holiday_state')||'ALL';
    const options=Object.entries(states).map(([k,v])=>'<option value="'+esc(k)+'" '+(k===st?'selected':'')+'>'+esc(v)+'</option>').join('');
    const row=(title,id,on,sub)=>'<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">'+title+'</div><div class="toggle-sub">'+sub+'</div></div><label class="switch"><input type="checkbox" id="'+id+'" '+(on?'checked':'')+'><span class="slider"></span></label></div>';
    const html='<div class="fg"><label class="flabel">Bundesland für Feiertage</label><select class="finput" id="holiday-state">'+options+'</select></div>'+row('Feiertage anzeigen','toggle-holidays',opt.showHolidays!==false,'Direkt im Kalender und Dashboard anzeigen.')+row('Challenge-Punkte anzeigen','toggle-dots',opt.showChallengeDots!==false,'Nur klein unten rechts im Kalendertag.')+row('Kalenderwochen anzeigen','toggle-kw',opt.showWeekNumbers!==false,'KW links unten je Woche.')+row('Google-Kalender-Sync','toggle-google-sync',googleOn(),'Beim Aktivieren wird neu synchronisiert.')+'<button class="btn btn-primary btn-full" onclick="saveCalSettings()">Speichern</button>';
    openPanel&&openPanel('Kalender-Einstellungen',html);
  };
  window.saveCalSettings=function(){
    const opts={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked};
    writeLS('change_v1_calendar_view_options',opts);
    try{ if(!window.calendarSettings)window.calendarSettings={}; calendarSettings.state=$('holiday-state')?.value||'ALL'; localStorage.setItem('holiday_state',calendarSettings.state); }catch(e){}
    const desired=!!$('toggle-google-sync')?.checked;
    const changed=desired!==googleOn(); setGoogle(desired);
    closePanel&&closePanel();
    if(changed&&desired){try{loadGoogleEvents?.()}catch(e){}}
    try{renderCalendar?.();buildDashboard?.();toast&&toast('Kalender-Einstellungen gespeichert ✓','ok')}catch(e){}
  };

  // 4 + 5) Challenges: echte Mitspieler anzeigen, „Du“-Einzelzeile verhindern, Erledigen aktualisiert Punkte sofort.
  window.getVisibleContestPlayers=function(){return syncArrays().players;};
  window.getPlayerPointSummary=function(id){return statsFor(String(id||account().id).toLowerCase());};
  window.renderChallenges=function(){
    const data=syncArrays(), list=$('challenges-list'), board=$('leaderboard-list'); if(!list||!board)return;
    const active=data.challenges.filter(c=>c&&c.active!==false);
    list.innerHTML=active.length?active.map(ch=>{const done=isDone(ch.id); const url=ch.url||ch.video||ch.youtube||ch.youtubeUrl||ch.link||''; const link=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener" class="challenge-meta" onclick="event.stopPropagation()">So geht die Übung</a>':''; return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc(ch.icon||'🏆')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title||ch.name||'Challenge')+'</div><div class="challenge-meta">'+esc(ch.desc||'')+' · '+(parseInt(ch.points,10)||0)+' Punkte</div>'+link+'</div><span class="points-pill">+'+(parseInt(ch.points,10)||0)+'</span><button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+esc(ch.id)+'\')">'+(done?'Erledigt':'Erledigen')+'</button></div>';}).join(''):'<div class="empty-state"><div class="empty-title">Keine Challenges</div><div class="empty-sub">Aktiviere Auto-Challenges oder lege eine Aufgabe an.</div></div>';
    const players=data.players.slice().sort((a,b)=>statsFor(String(b.email||b.id).toLowerCase()).totalPoints-statsFor(String(a.email||a.id).toLowerCase()).totalPoints);
    board.innerHTML=players.length?players.map((p,i)=>{const id=String(p.email||p.id||'').toLowerCase(), st=statsFor(id), me=id===data.account.id, medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1); return '<div class="leader-row clickable" onclick="try{openPlayerRecentPanel(\''+esc(id)+'\',\''+esc(p.name||p.email||id)+'\')}catch(e){}"><div class="leader-rank">'+medal+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+(p.online?'<span class="live-dot"></span>':'')+'</div><div class="leader-detail">Heute: '+st.todayPoints+' P · Gesamt: '+st.totalPoints+' P · '+st.totalCount+' erledigt</div></div><div class="leader-score">'+st.totalPoints+'</div></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler.</div>';
  };
  window.completeChallenge=function(id){
    const data=syncArrays(); const ch=data.challenges.find(c=>String(c.id)===String(id)); if(!ch)return;
    if(isDone(id)){try{toast&&toast('Diese Challenge ist heute schon erledigt','')}catch(e){} return;}
    const row={id:'cc_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),challengeId:String(id),playerId:data.account.id,userEmail:data.account.email,playerName:data.account.name,date:today(),points:parseInt(ch.points,10)||0,createdAt:new Date().toISOString()};
    data.completions.push(row); setStore('challengeCompletions',data.completions); persistChallenges();
    try{ if(typeof publishCompletionToFirestore==='function') publishCompletionToFirestore(row); }catch(e){}
    try{renderChallenges(); buildDashboard(); renderCalendar(); toast&&toast('+'+row.points+' Punkte ✓','ok')}catch(e){}
  };
  window.resetTodayChallenges=function(){const data=syncArrays(),td=today(); data.completions=data.completions.filter(c=>!(String(c.date||'').slice(0,10)===td&&playerIdOf(c)===data.account.id)); setStore('challengeCompletions',data.completions); persistChallenges(); try{renderChallenges();buildDashboard();renderCalendar();toast&&toast('Heute zurückgesetzt','')}catch(e){}};

  // 6) „Angemeldet bleiben“ entfernen.
  window.confirmLogout=function(){
    const u=account();
    const html='<div class="logout-profile"><div class="logout-avatar">'+(u.picture?'<img src="'+esc(u.picture)+'" alt="">':esc((u.name||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()))+'</div><div style="min-width:0"><div class="logout-name">'+esc(u.name)+'</div><div class="logout-mail">'+esc(u.email)+'</div></div></div><div class="logout-warning">Du meldest dich auf diesem Gerät ab.</div><button class="btn btn-danger btn-full" onclick="doLogout&&doLogout()">Abmelden</button>';
    openPanel&&openPanel('Abmelden',html);
  };

  // UI-Schutz und Initialisierung.
  function inject(){
    if(!$('cleanup-regression-fix-style')){const st=document.createElement('style');st.id='cleanup-regression-fix-style';st.textContent='#upcoming-strip{display:none!important}body:not(.calendar-active) #cal-controls{display:none!important}.icon-btn[title="Sync"],.icon-btn[title="Live- & Kalender-Sync"],.icon-btn[title="Push & Live-Sync"]{pointer-events:auto!important}';document.head.appendChild(st)}
    removeUpcoming(); document.querySelectorAll('button').forEach(b=>{if((b.textContent||'').trim()==='Angemeldet bleiben')b.remove()});
  }
  const oldOpenPanel=window.openPanel;
  if(typeof oldOpenPanel==='function') window.openPanel=function(title,html){oldOpenPanel(title,html); setTimeout(inject,0)};
  setInterval(()=>{document.body.classList.toggle('calendar-active',(window.currentMainView||'')==='calendar');inject()},500);
  setTimeout(()=>{inject();syncArrays();try{if((window.currentMainView||'dashboard')==='challenges')renderChallenges(); if((window.currentMainView||'dashboard')==='dashboard')buildDashboard();}catch(e){}},150);
})();


(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad=n=>String(n).padStart(2,'0');
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  function read(k,fb){try{const v=localStorage.getItem(k);return v==null?fb:JSON.parse(v)}catch(e){return fb}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function raw(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
  function me(){
    const email=String((window.userInfo&&userInfo.email)||'').trim().toLowerCase();
    const name=String((window.userInfo&&userInfo.name)||'').trim();
    const id=email||'local-user';
    return {id,email,name:name||email||'Mitspieler'};
  }
  function sportsDefaults(){return [
    {id:'sport_knee_squats_10',title:'10 Kniebeugen',points:10,icon:'🏋️',desc:'Saubere Kniebeugen: Füße schulterbreit, Rücken gerade, langsam runter und stabil hoch.',url:'https://www.youtube.com/results?search_query=Kniebeugen+richtig+ausf%C3%BChren',active:true,category:'sport'},
    {id:'sport_wall_pushups_10',title:'10 Wand-Liegestütze',points:10,icon:'💪',desc:'Leichte Liegestütze an der Wand oder am Tisch, Körper gerade halten.',url:'https://www.youtube.com/results?search_query=Wand+Liegest%C3%BCtze+richtig',active:true,category:'sport'},
    {id:'sport_stretch_60',title:'60 Sekunden Dehnen',points:8,icon:'🧘',desc:'Dehne Schultern, Rücken oder Beine ruhig für 60 Sekunden.',url:'https://www.youtube.com/results?search_query=60+Sekunden+Dehnen+Anf%C3%A4nger',active:true,category:'sport'},
    {id:'sport_walk_3',title:'3 Minuten gehen',points:8,icon:'🚶',desc:'Gehe 3 Minuten locker durch den Raum oder draußen.',url:'https://www.youtube.com/results?search_query=kurzes+Gehen+Bewegungspause',active:true,category:'sport'},
    {id:'sport_plank_20',title:'20 Sekunden Plank',points:12,icon:'⏱️',desc:'Halte 20 Sekunden Unterarmstütz. Alternative: Knie am Boden.',url:'https://www.youtube.com/results?search_query=Plank+richtig+ausf%C3%BChren',active:true,category:'sport'},
    {id:'sport_neck_relax',title:'Nacken lockern',points:6,icon:'🧠',desc:'Rolle die Schultern 10-mal und neige den Kopf sanft links/rechts.',url:'https://www.youtube.com/results?search_query=Nacken+lockern+%C3%9Cbungen',active:true,category:'sport'},
    {id:'sport_forearm_20',title:'20 Sekunden Unterarmstütz',points:12,icon:'🧱',desc:'Halte den Unterarmstütz 20 Sekunden sauber und ruhig.',url:'https://www.youtube.com/results?search_query=Unterarmst%C3%BCtz+richtig',active:true,category:'sport'},
    {id:'sport_lunges_10',title:'10 Ausfallschritte',points:12,icon:'🦵',desc:'Mache 10 kontrollierte Ausfallschritte, abwechselnd links und rechts.',url:'https://www.youtube.com/results?search_query=Ausfallschritte+richtig+ausf%C3%BChren',active:true,category:'sport'},
    {id:'sport_calf_raises_20',title:'20 Wadenheben',points:8,icon:'🦶',desc:'Stelle dich aufrecht hin und hebe die Fersen 20-mal langsam an.',url:'https://www.youtube.com/results?search_query=Wadenheben+richtig',active:true,category:'sport'},
    {id:'sport_arm_circles_30',title:'30 Sekunden Armkreisen',points:6,icon:'🔄',desc:'Kreise die Arme 30 Sekunden locker vorwärts und rückwärts.',url:'https://www.youtube.com/results?search_query=Armkreisen+%C3%9Cbung',active:true,category:'sport'},
    {id:'sport_side_steps_30',title:'30 Sekunden Seitsteps',points:8,icon:'↔️',desc:'Mache 30 Sekunden lockere Seitsteps, Knie leicht gebeugt.',url:'https://www.youtube.com/results?search_query=Side+Steps+Fitness+%C3%9Cbung',active:true,category:'sport'},
    {id:'sport_jumping_jacks_20',title:'20 Hampelmänner',points:12,icon:'⭐',desc:'Mache 20 Hampelmänner. Alternative: ohne Springen seitlich tippen.',url:'https://www.youtube.com/results?search_query=Hampelm%C3%A4nner+richtig',active:true,category:'sport'},
    {id:'sport_glute_bridge_12',title:'12 Glute Bridges',points:10,icon:'🌉',desc:'Lege dich auf den Rücken und hebe das Becken 12-mal kontrolliert.',url:'https://www.youtube.com/results?search_query=Glute+Bridge+richtig',active:true,category:'sport'},
    {id:'sport_bird_dog_10',title:'10 Bird Dogs',points:10,icon:'🐦',desc:'Im Vierfüßlerstand diagonal Arm und Bein strecken, 10 Wiederholungen.',url:'https://www.youtube.com/results?search_query=Bird+Dog+%C3%9Cbung+richtig',active:true,category:'sport'},
    {id:'sport_dead_bug_10',title:'10 Dead Bugs',points:10,icon:'🐞',desc:'Rückenlage, diagonal Arm und Bein senken, Bauchspannung halten.',url:'https://www.youtube.com/results?search_query=Dead+Bug+%C3%9Cbung+richtig',active:true,category:'sport'},
    {id:'sport_shoulder_blades_15',title:'15 Schulterblatt-Züge',points:8,icon:'🪽',desc:'Ziehe die Schulterblätter 15-mal bewusst nach hinten unten.',url:'https://www.youtube.com/results?search_query=Schulterbl%C3%A4tter+aktivieren+%C3%9Cbung',active:true,category:'sport'},
    {id:'sport_hip_circles_30',title:'30 Sekunden Hüftkreisen',points:6,icon:'⭕',desc:'Kreise die Hüfte locker 30 Sekunden in beide Richtungen.',url:'https://www.youtube.com/results?search_query=H%C3%BCftkreisen+%C3%9Cbung',active:true,category:'sport'},
    {id:'sport_standing_crunch_12',title:'12 Standing Crunches',points:10,icon:'🧍',desc:'Im Stand Knie und Ellenbogen diagonal zusammenführen.',url:'https://www.youtube.com/results?search_query=Standing+Crunches+richtig',active:true,category:'sport'},
    {id:'sport_mountain_20',title:'20 Mountain Climbers',points:12,icon:'⛰️',desc:'Mache 20 kontrollierte Mountain Climbers. Langsame Variante erlaubt.',url:'https://www.youtube.com/results?search_query=Mountain+Climbers+richtig',active:true,category:'sport'},
    {id:'sport_wall_sit_30',title:'30 Sekunden Wandsitz',points:12,icon:'🧱',desc:'Setze dich mit dem Rücken an die Wand und halte 30 Sekunden.',url:'https://www.youtube.com/results?search_query=Wandsitz+richtig',active:true,category:'sport'},
    {id:'sport_superman_12',title:'12 Superman',points:10,icon:'🦸',desc:'Bauchlage, Arme und Beine leicht anheben, Rücken kontrolliert aktivieren.',url:'https://www.youtube.com/results?search_query=Superman+%C3%9Cbung+richtig',active:true,category:'sport'},
    {id:'sport_cat_cow_60',title:'60 Sekunden Cat-Cow',points:8,icon:'🐈',desc:'Mobilisiere die Wirbelsäule langsam im Vierfüßlerstand.',url:'https://www.youtube.com/results?search_query=Cat+Cow+%C3%9Cbung',active:true,category:'sport'},
    {id:'sport_chair_squats_12',title:'12 Stuhl-Kniebeugen',points:10,icon:'🪑',desc:'Setze dich kontrolliert auf einen Stuhl und stehe wieder auf.',url:'https://www.youtube.com/results?search_query=Stuhl+Kniebeugen+%C3%9Cbung',active:true,category:'sport'},
    {id:'sport_step_touch_60',title:'60 Sekunden Step Touch',points:8,icon:'🎵',desc:'Leichter Step Touch im Stand, Arme locker mitnehmen.',url:'https://www.youtube.com/results?search_query=Step+Touch+Fitness',active:true,category:'sport'},
    {id:'sport_pushup_knees_8',title:'8 Knie-Liegestütze',points:10,icon:'💪',desc:'Mache 8 Liegestütze auf den Knien, Körper stabil halten.',url:'https://www.youtube.com/results?search_query=Knie+Liegest%C3%BCtze+richtig',active:true,category:'sport'},
    {id:'sport_sit_to_stand_15',title:'15 Aufstehen-Hinsetzen',points:10,icon:'⬆️',desc:'Stehe 15-mal kontrolliert vom Stuhl auf und setze dich wieder.',url:'https://www.youtube.com/results?search_query=Sit+to+Stand+%C3%9Cbung',active:true,category:'sport'},
    {id:'sport_ankle_mobility_60',title:'60 Sekunden Fußgelenke mobilisieren',points:6,icon:'🦶',desc:'Kreise und bewege beide Fußgelenke für 60 Sekunden.',url:'https://www.youtube.com/results?search_query=Fu%C3%9Fgelenk+Mobilisation+%C3%9Cbung',active:true,category:'sport'},
    {id:'sport_hamstring_stretch_60',title:'60 Sekunden Beinrückseite dehnen',points:8,icon:'🦵',desc:'Dehne die Beinrückseite sanft ohne Federn.',url:'https://www.youtube.com/results?search_query=Beinr%C3%BCckseite+dehnen',active:true,category:'sport'},
    {id:'sport_chest_opener_60',title:'60 Sekunden Brust öffnen',points:8,icon:'👐',desc:'Öffne die Brust, ziehe Schultern nach hinten und atme ruhig.',url:'https://www.youtube.com/results?search_query=Brust%C3%B6ffner+Dehnung',active:true,category:'sport'},
    {id:'sport_balance_30',title:'30 Sekunden Einbeinstand',points:8,icon:'⚖️',desc:'Stehe 30 Sekunden auf einem Bein, dann wechseln.',url:'https://www.youtube.com/results?search_query=Einbeinstand+%C3%9Cbung',active:true,category:'sport'},
    {id:'sport_high_knees_30',title:'30 Sekunden Knieheben',points:10,icon:'🏃',desc:'Hebe die Knie im Stand 30 Sekunden kontrolliert an.',url:'https://www.youtube.com/results?search_query=High+Knees+richtig',active:true,category:'sport'},
    {id:'sport_shadow_box_30',title:'30 Sekunden Schattenboxen',points:10,icon:'🥊',desc:'Boxe 30 Sekunden locker in die Luft, Schultern entspannt.',url:'https://www.youtube.com/results?search_query=Schattenboxen+Anf%C3%A4nger',active:true,category:'sport'},
    {id:'sport_side_plank_15',title:'15 Sekunden Seitstütz je Seite',points:12,icon:'📐',desc:'Halte den Seitstütz 15 Sekunden je Seite. Knie-Variante erlaubt.',url:'https://www.youtube.com/results?search_query=Seitst%C3%BCtz+richtig',active:true,category:'sport'},
    {id:'sport_reverse_fly_12',title:'12 Reverse Fly ohne Gewicht',points:8,icon:'🪽',desc:'Beuge dich leicht vor und ziehe die Arme kontrolliert nach außen.',url:'https://www.youtube.com/results?search_query=Reverse+Fly+ohne+Gewicht',active:true,category:'sport'},
    {id:'sport_triceps_dips_8',title:'8 Trizeps-Dips am Stuhl',points:12,icon:'🪑',desc:'Mache 8 vorsichtige Dips am stabilen Stuhl.',url:'https://www.youtube.com/results?search_query=Trizeps+Dips+Stuhl+richtig',active:true,category:'sport'},
    {id:'sport_good_morning_12',title:'12 Good Mornings',points:8,icon:'🙇',desc:'Hände an die Hüfte, Rücken gerade, aus der Hüfte nach vorne beugen.',url:'https://www.youtube.com/results?search_query=Good+Morning+%C3%9Cbung+richtig',active:true,category:'sport'},
    {id:'sport_heel_taps_20',title:'20 Heel Taps',points:10,icon:'👟',desc:'Rückenlage, Fersen abwechselnd antippen, Bauchspannung halten.',url:'https://www.youtube.com/results?search_query=Heel+Taps+%C3%9Cbung',active:true,category:'sport'},
    {id:'sport_world_greatest_2',title:'2 Minuten Mobility Flow',points:12,icon:'🌊',desc:'Mache einen ruhigen Ganzkörper-Mobility-Flow für 2 Minuten.',url:'https://www.youtube.com/results?search_query=Mobility+Flow+2+Minuten',active:true,category:'sport'},
    {id:'sport_stairs_2',title:'2 Minuten Treppen gehen',points:12,icon:'🪜',desc:'Gehe 2 Minuten locker Treppen oder simuliere Step-ups.',url:'https://www.youtube.com/results?search_query=Step+Ups+Treppen+%C3%9Cbung',active:true,category:'sport'},
    {id:'sport_fitness_30',title:'Fitness gehen für mind. 30 Min',points:20,icon:'🏃',desc:'Optional: Gehe mindestens 30 Minuten zum Sport/Fitness oder mache ein leichtes bis mittleres Workout.',url:'https://www.youtube.com/results?search_query=30+Minuten+Fitness+Workout+Anf%C3%A4nger',active:true,category:'sport',optional:true},
    {id:'sport_walk_10',title:'Spazieren gehen für 10 Minuten',points:10,icon:'🌳',desc:'Optional: Gehe mindestens 10 Minuten spazieren.',url:'https://www.youtube.com/results?search_query=10+Minuten+Spaziergang+Gesundheit',active:true,category:'sport',optional:true},
  ].map(x=>Object.assign({recurrence:'daily',createdAt:new Date().toISOString()},x));}
  function similar(a,b){a=String(a||'').toLowerCase();b=String(b||'').toLowerCase();return a===b||a.includes(b)||b.includes(a)}
  function seededDailySportList(list, count){
    const d=today().replace(/-/g,''); let seed=parseInt(d,10)||Date.now();
    const arr=(list||[]).slice();
    function rnd(){seed=(seed*9301+49297)%233280;return seed/233280;}
    for(let i=arr.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1)); const t=arr[i]; arr[i]=arr[j]; arr[j]=t;}
    return arr.slice(0,count);
  }
  function migrateChallenges(){
    const old=(window.challenges||read('challenges',[])||[]).filter(Boolean);
    let all=sportsDefaults().map(def=>{
      const prev=old.find(o=>similar(o.title||o.name,def.title)||String(o.id)===def.id);
      return Object.assign({},def,prev?{url:prev.url||prev.video||prev.youtube||prev.youtubeUrl||prev.link||def.url,active:prev.active!==false}:{});
    });
    const required=seededDailySportList(all.filter(c=>!c.optional),7);
    const optional=all.filter(c=>c.optional);
    const out=required.concat(optional);
    window.challenges=out; try{challenges=out}catch(e){} write('challenges',out);

    const a=me();
    let cps=(window.challengePlayers||read('challenge_players',[])||[]).filter(p=>{
      const raw=String((p&&[p.id,p.email,p.name].join(' '))||'').toLowerCase().trim();
      if(!p||!raw)return false;
      if(/demo|demo@example\.com/.test(raw))return false;
      const id=String(p.email||p.id||'').toLowerCase().trim();
      const nm=String(p.name||'').toLowerCase().trim();
      if((nm==='du'||nm==='ich'||id==='du'||id==='ich'||id==='local-user') && id!==a.id && id!==a.email)return false;
      return true;
    }).map(p=>{
      const id=String(p.email||p.id||'').toLowerCase().trim();
      if(id===a.id||id===a.email||String(p.name||'').toLowerCase().trim()==='ich'||String(p.name||'').toLowerCase().trim()==='du'){
        return Object.assign({},p,{id:a.id,email:a.email||a.id,name:a.name||a.email||p.name||'Mitspieler',online:true});
      }
      return p;
    });
    if(a.email && !cps.some(p=>String(p.id||p.email||'').toLowerCase()===a.id)) cps.unshift({id:a.id,email:a.email,name:a.name||a.email,createdAt:new Date().toISOString(),online:true});
    const seen=new Set(); cps=cps.filter(p=>{const id=String(p.email||p.id||'').toLowerCase(); if(!id||seen.has(id))return false; seen.add(id); return true;});
    window.challengePlayers=cps; try{challengePlayers=cps}catch(e){} write('challenge_players',cps);

    let comps=(window.challengeCompletions||read('challenge_completions',[])||[]).filter(c=>c&&all.some(ch=>String(ch.id)===String(c.challengeId)));
    comps=comps.map(c=>Object.assign({},c,{playerId:String(c.playerId||c.userEmail||c.email||a.id).toLowerCase(),date:String(c.date||c.completedDate||c.createdAt||today()).slice(0,10)}));
    window.challengeCompletions=comps; try{challengeCompletions=comps}catch(e){} write('challenge_completions',comps);
    return {challenges:out,allChallenges:all,players:cps,completions:comps,account:a};
  }
  function currentIds(){const a=me();const ids=new Set([a.id]); if(a.email)ids.add(a.email); return ids;}
  function isMine(c){const ids=currentIds();const who=String(c.playerId||c.userEmail||c.email||'').toLowerCase();return !who||ids.has(who)}
  function isDone(chId){const td=today();return (window.challengeCompletions||[]).some(c=>String(c.challengeId)===String(chId)&&String(c.date).slice(0,10)===td&&isMine(c));}
  function stats(id){id=String(id||'').toLowerCase();let total=0,todayPts=0,count=0;(window.challengeCompletions||[]).forEach(c=>{const who=String(c.playerId||c.userEmail||c.email||'').toLowerCase();if(who!==id)return;const p=parseInt(c.points,10)||0;total+=p;count++;if(String(c.date).slice(0,10)===today())todayPts+=p;});return{totalPoints:total,todayPoints:todayPts,totalCount:count};}
  function cleanupChallengeCards(){
    document.querySelectorAll('.challenge-week-card,.challenge-week-grid').forEach(el=>{const card=el.closest('.challenge-week-card')||el;card.remove();});
    document.querySelectorAll('body *').forEach(el=>{if(el.children.length>8)return;const t=(el.textContent||'').trim();if(/^Punkte-Kalender\s*(Aktuelle Woche|Nur für Challenges|$)/i.test(t)){const card=el.closest('.challenge-card,.leader-card,.dash-card,.card')||el; if(card&&card.id!=='challenges-list')card.remove();}});
  }
  window.getVisibleContestPlayers=function(){return migrateChallenges().players.filter(p=>!String(p.name||p.email||p.id||'').toLowerCase().includes('demo'));};
  window.getPlayerPointSummary=function(id){return stats(id||me().id);};
  window.buildDefaultChallenges=sportsDefaults;
  window.renderChallenges=function(){
    const data=migrateChallenges(); const list=$('challenges-list'), board=$('leaderboard-list'); if(!list||!board)return;
    const renderOne=ch=>{const done=isDone(ch.id),link=(ch.url||ch.video||ch.youtube||ch.youtubeUrl||ch.link||'');return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc(ch.icon||'🏆')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title||ch.name||'Sportübung')+'</div><div class="challenge-meta">'+esc(ch.desc||'')+' · '+(parseInt(ch.points,10)||0)+' Punkte</div>'+(link?'<a class="challenge-meta" href="'+esc(link)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">So geht die Übung</a>':'')+'</div><span class="points-pill">+'+(parseInt(ch.points,10)||0)+'</span>'+(done?'<button class="btn btn-success btn-sm" disabled>Erledigt</button><button class="btn btn-undo btn-sm" title="Heute rückgängig machen" onclick="undoChallenge(\''+esc(ch.id)+'\')">↶</button>':'<button class="btn btn-primary btn-sm" onclick="completeChallenge(\''+esc(ch.id)+'\')">Erledigen</button>')+'</div>';};
    const required=data.challenges.filter(c=>c.active!==false&&!c.optional), optional=data.challenges.filter(c=>c.active!==false&&c.optional);
    list.innerHTML=required.map(renderOne).join('')+(optional.length?'<div class="section-label" style="padding:14px 16px 6px">Optionale Sportpunkte</div>'+optional.map(renderOne).join(''):'');
    const players=data.players.slice().sort((a,b)=>stats(String(b.email||b.id).toLowerCase()).totalPoints-stats(String(a.email||a.id).toLowerCase()).totalPoints);
    board.innerHTML=players.map((p,i)=>{const id=String(p.email||p.id||'').toLowerCase(),s=stats(id),mine=currentIds().has(id),med=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);return '<div class="leader-row"><div class="leader-rank">'+med+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+(p.online?'<span class="live-dot"></span>':'')+'</div><div class="leader-detail">Heute: '+s.todayPoints+' P · Gesamt: '+s.totalPoints+' P · '+s.totalCount+' erledigt</div></div><div class="leader-score">'+s.totalPoints+'</div></div>';}).join('')||'<div class="dash-empty">Noch keine Mitspieler</div>';
    cleanupChallengeCards();
  };
  window.completeChallenge=function(id){
    const data=migrateChallenges(), ch=data.challenges.find(c=>String(c.id)===String(id)); if(!ch)return;
    if(isDone(id)){if(typeof toast==='function')toast('Bereits erledigt','');return;}
    const a=me(); const c={id:'cc_'+(typeof uid==='function'?uid():Date.now()),challengeId:id,playerId:a.id,userEmail:a.email,email:a.email,playerName:a.name,date:today(),points:parseInt(ch.points,10)||0,createdAt:new Date().toISOString()};
    const comps=(window.challengeCompletions||[]).concat(c); window.challengeCompletions=comps; try{challengeCompletions=comps}catch(e){} write('challenge_completions',comps);
    try{persistChangeState&&persistChangeState()}catch(e){} try{renderChallenges()}catch(e){} try{renderCalendar()}catch(e){} try{buildDashboard()}catch(e){} if(typeof toast==='function')toast('+'+(c.points||0)+' Punkte ✓','ok');
  };
  window.undoChallenge=function(id){
    const td=today(); let comps=(window.challengeCompletions||[]); const before=comps.length;
    comps=comps.filter(c=>!(String(c.challengeId)===String(id)&&String(c.date).slice(0,10)===td&&isMine(c)));
    window.challengeCompletions=comps; try{challengeCompletions=comps}catch(e){} write('challenge_completions',comps);
    try{persistChangeState&&persistChangeState()}catch(e){} try{renderChallenges()}catch(e){} try{renderCalendar()}catch(e){} try{buildDashboard()}catch(e){} if(typeof toast==='function')toast(before!==comps.length?'Challenge zurückgesetzt':'Nichts zurückzusetzen','');
  };
  window.resetTodayChallenges=function(){const td=today();let comps=(window.challengeCompletions||[]).filter(c=>!(String(c.date).slice(0,10)===td&&isMine(c)));window.challengeCompletions=comps;try{challengeCompletions=comps}catch(e){}write('challenge_completions',comps);try{renderChallenges()}catch(e){}try{renderCalendar()}catch(e){}try{buildDashboard()}catch(e){}if(typeof toast==='function')toast('Heute zurückgesetzt','')};
  window.getChallengePointsForDate=function(k){let sum=0;(window.challengeCompletions||[]).forEach(c=>{if(String(c.date||'').slice(0,10)===String(k).slice(0,10)&&isMine(c))sum+=parseInt(c.points,10)||0;});return sum;};
  window.getChallengeDayStatus=function(k){const points=window.getChallengePointsForDate(k);return points>0?{points,done:true,planned:1,allDone:true}:null};

  const googleKey='change_google_calendar_sync_enabled';
  function googleOn(){try{return localStorage.getItem(googleKey)==='1'||localStorage.getItem('change_v1_google_calendar_sync')==='true'}catch(e){return false}}
  function setGoogle(v){raw(googleKey,v?'1':'0');raw('change_v1_google_calendar_sync',v?'true':'false');window.googleCalendarSyncEnabled=!!v;}
  window.openPushSettingsPanel=function(){const live=read('live_sync_enabled',true)!==false;const online=(window.getVisibleContestPlayers?window.getVisibleContestPlayers():[]).filter(p=>p.online).length;const html='<div class="push-box"><div class="challenge-title">Live-Sync</div><div class="settings-hint" style="margin-top:8px">Push steuerst du über die Glocke. Live-Sync synchronisiert nur Mitspieler und Punkte.</div></div><div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Live-Mitspieler <span class="status-pill '+(live?'status-on':'status-off')+'">'+(live?'AKTIV':'AUS')+'</span></div><div class="toggle-sub">Online: '+online+' · synchronisiert Mitspieler und Punkte.</div></div><label class="switch"><input type="checkbox" '+(live?'checked':'')+' onchange="setLiveSyncEnabled&&setLiveSyncEnabled(this.checked)"><span class="slider"></span></label></div>';if(typeof openPanel==='function')openPanel('Live-Sync',html)};
  window.openCalendarSettings=function(){const states=window.STATE_OPTIONS||{ALL:'Alle Bundesländer',BW:'Baden-Württemberg',BY:'Bayern','BY-AUGSBURG':'Bayern · Augsburg',BE:'Berlin',BB:'Brandenburg',HB:'Bremen',HH:'Hamburg',HE:'Hessen',MV:'Mecklenburg-Vorpommern',NI:'Niedersachsen',NW:'Nordrhein-Westfalen',RP:'Rheinland-Pfalz',SL:'Saarland',SN:'Sachsen',ST:'Sachsen-Anhalt',SH:'Schleswig-Holstein',TH:'Thüringen'};const o=read('change_v1_calendar_view_options',{showHolidays:true,showChallengeDots:true,showWeekNumbers:true});const st=(window.calendarSettings&&calendarSettings.state)||localStorage.getItem('holiday_state')||'ALL';const opts=Object.entries(states).map(([k,v])=>'<option value="'+esc(k)+'" '+(k===st?'selected':'')+'>'+esc(v)+'</option>').join('');const row=(t,id,on,sub)=>'<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">'+t+'</div><div class="toggle-sub">'+sub+'</div></div><label class="switch"><input type="checkbox" id="'+id+'" '+(on?'checked':'')+'><span class="slider"></span></label></div>';const html='<div class="fg"><label class="flabel">Bundesland für Feiertage</label><select class="finput" id="holiday-state">'+opts+'</select></div>'+row('Feiertage anzeigen','toggle-holidays',o.showHolidays!==false,'Direkt im Kalender und Dashboard.')+row('Challenge-Punkte anzeigen','toggle-dots',o.showChallengeDots!==false,'Nur erledigte Punkte klein unten rechts.')+row('Kalenderwochen anzeigen','toggle-kw',o.showWeekNumbers!==false,'KW links unten im Kalender.')+row('Google-Kalender-Sync','toggle-google-sync',googleOn(),'Beim Aktivieren wird neu synchronisiert.')+'<button class="btn btn-primary btn-full" onclick="saveCalSettings()">Speichern</button>';if(typeof openPanel==='function')openPanel('Kalender-Einstellungen',html)};
  window.saveCalSettings=function(){const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked};write('change_v1_calendar_view_options',o);write('calendar_settings',o);try{if(!window.calendarSettings)window.calendarSettings={};calendarSettings.state=$('holiday-state')?.value||'ALL';localStorage.setItem('holiday_state',calendarSettings.state)}catch(e){}const g=!!$('toggle-google-sync')?.checked,changed=g!==googleOn();setGoogle(g);if(typeof closePanel==='function')closePanel();if(changed&&g){try{loadGoogleEvents&&loadGoogleEvents()}catch(e){}}try{renderCalendar()}catch(e){}try{buildDashboard()}catch(e){}if(typeof toast==='function')toast('Kalender-Einstellungen gespeichert ✓','ok')};

  const oldSet=window.setMainView;
  window.setMainView=function(v){
    v=v||'dashboard'; document.body.classList.toggle('calendar-active',v==='calendar');
    try{oldSet&&oldSet(v)}catch(e){
      ['dashboard-view','cal-body','challenges-view'].forEach(id=>{const el=$(id);if(el)el.style.display='none'});
      if(v==='calendar'){$('cal-body')&&( $('cal-body').style.display='flex');try{renderCalendar()}catch(_){}}
      else if(v==='challenges'){$('challenges-view')&&($('challenges-view').style.display='flex');try{renderChallenges()}catch(_){}}
      else {$('dashboard-view')&&($('dashboard-view').style.display='block');try{buildDashboard()}catch(_){}}
    }
    const controls=$('cal-controls'); if(controls)controls.style.display=v==='calendar'?'flex':'none';
    document.querySelectorAll('[onclick="openCalendarSettings()"],[title="Kalender-Einstellungen"]').forEach(b=>{b.style.display=v==='calendar'?'inline-flex':'none'});
    cleanupChallengeCards();
  };
  const oldRenderCalendar=window.renderCalendar;
  window.renderCalendar=function(){try{oldRenderCalendar&&oldRenderCalendar()}catch(e){console.warn(e)}document.querySelectorAll('.cal-points').forEach(el=>{const m=(el.textContent||'').match(/\+(\d+)/);if(!m||parseInt(m[1],10)<=0)el.remove()});const up=$('upcoming-strip');if(up)up.remove();};
  window.renderUpcoming=function(){const up=$('upcoming-strip');if(up)up.remove();};
  const st=document.createElement('style');st.id='change-direct-cleanup-style';st.textContent='#upcoming-strip,.challenge-week-card,.challenge-week-grid{display:none!important}body:not(.calendar-active) #cal-controls,body:not(.calendar-active) [onclick="openCalendarSettings()"],body:not(.calendar-active) [title="Kalender-Einstellungen"]{display:none!important}.challenge-item .btn[disabled]{opacity:.85;cursor:default}.section-label{font-size:11px;font-weight:900;color:var(--t4);text-transform:uppercase;letter-spacing:.04em;background:var(--s2);border-top:1px solid var(--b1)}';document.head.appendChild(st);
  function boot(){migrateChallenges();cleanupChallengeCards();try{if(window.currentMainView)window.setMainView(window.currentMainView);else window.setMainView('dashboard')}catch(e){}try{renderChallenges()}catch(e){}try{renderCalendar()}catch(e){}try{buildDashboard()}catch(e){}}
  setTimeout(boot,100);setTimeout(boot,700);new MutationObserver(()=>cleanupChallengeCards()).observe(document.documentElement,{childList:true,subtree:true});
})();


(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const pad=n=>String(n).padStart(2,'0');
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  const read=(k,f)=>{try{const v=localStorage.getItem(k);return v==null?f:JSON.parse(v)}catch(e){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const raw=(k,v)=>{try{localStorage.setItem(k,String(v))}catch(e){}};
  const norm=s=>String(s||'').trim().toLowerCase();

  try{localStorage.removeItem('change_v1_demo_mode');localStorage.removeItem('demo_mode');window.isDemoMode=false;}catch(e){}

  function account(){
    const u=window.userInfo||{};
    const email=norm(u.email);
    return {id:email||'google-user',email,name:String(u.name||u.email||'Mitspieler').trim(),picture:u.picture||''};
  }
  function isBadPlayer(p){
    const t=norm((p&&p.name||'')+' '+(p&&p.email||'')+' '+(p&&p.id||''));
    return !t || /demo|demo@example\.com|local-user|unknown|ich\s*·\s*du|\bdu\b/.test(t);
  }
  function playerKey(p){return norm((p&&p.email)|| (p&&p.id));}
  function allPlayers(){
    const a=account(), map=new Map();
    if(a.email) map.set(a.id,{id:a.id,email:a.email,name:a.name,picture:a.picture,online:true});
    (window.challengePlayers||[]).forEach(p=>{if(!p||isBadPlayer(p))return;const k=playerKey(p);if(!k)return;map.set(k,Object.assign({},map.get(k)||{},p,{id:k,email:p.email||k,name:p.name||p.email||k}));});
    const arr=[...map.values()];
    window.challengePlayers=arr; try{challengePlayers=arr}catch(e){} write('challenge_players',arr);
    return arr;
  }
  function compKey(c){return norm(c.playerId||c.userEmail||c.email||c.playerEmail)}
  function stats(id){id=norm(id);let total=0,todayPts=0,totalCount=0,todayCount=0;const td=today();(window.challengeCompletions||[]).forEach(c=>{if(compKey(c)!==id)return;const p=parseInt(c.points,10)||0;total+=p;totalCount++;if(String(c.date||'').slice(0,10)===td){todayPts+=p;todayCount++;}});return{totalPoints:total,todayPoints:todayPts,totalCount,todayCount};}
  window.getVisibleContestPlayers=allPlayers;
  window.getCurrentPlayerId=function(){return account().id};
  window.getPlayerPointSummary=function(id){return stats(id||account().id)};

  function allSports(){
    let base=[]; try{base=(typeof window.buildDefaultChallenges==='function'?window.buildDefaultChallenges():[])||[]}catch(e){}
    if(!base.length){base=[
      ['sport_knee_squats_10','10 Kniebeugen',10,'🏋️','Saubere Kniebeugen: Füße schulterbreit, Rücken gerade, langsam runter und stabil hoch.'],
      ['sport_wall_pushups_10','10 Wand-Liegestütze',10,'💪','Leichte Liegestütze an der Wand oder am Tisch, Körper gerade halten.'],
      ['sport_walk_10_optional','10 Minuten spazieren gehen',15,'🚶','Gehe 10 Minuten locker spazieren.',true],
      ['sport_fitness_30_optional','Fitness gehen · mindestens 30 Minuten',30,'🏋️','Leichtes bis mittleres Training für mindestens 30 Minuten.',true]
    ].map(x=>({id:x[0],title:x[1],name:x[1],points:x[2],icon:x[3],desc:x[4],optional:!!x[5],url:'https://www.youtube.com/results?search_query='+encodeURIComponent(x[1]+' richtige Ausführung'),active:true,category:'sport'}));}
    return base.filter(c=>c&&c.active!==false&&!/lesen|trinken|meditation|wasser|pause|haushalt|todo|email/i.test((c.title||c.name||'')+' '+(c.desc||''))).map(c=>Object.assign({},c,{category:'sport',url:c.url||c.video||c.youtube||('https://www.youtube.com/results?search_query='+encodeURIComponent((c.title||c.name||'Sportübung')+' richtige Ausführung'))}));
  }
  function dailySports(){
    const td=today(); let saved=read('change_daily_sports',null);
    const sports=allSports();
    if(!saved||saved.date!==td||!Array.isArray(saved.ids)||saved.ids.length!==7){
      const required=sports.filter(c=>!c.optional); let seed=Number(td.replace(/-/g,''));
      const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280};
      const shuffled=required.slice().sort(()=>rnd()-.5).slice(0,7).map(c=>c.id);
      saved={date:td,ids:shuffled}; write('change_daily_sports',saved);
    }
    const by=new Map(sports.map(c=>[String(c.id),c]));
    const list=saved.ids.map(id=>by.get(String(id))).filter(Boolean);
    const optional=sports.filter(c=>c.optional || /spazier|fitness/i.test(c.title||c.name||''));
    return list.concat(optional.filter(o=>!list.some(x=>x.id===o.id)));
  }
  function challengeById(id){return dailySports().find(c=>String(c.id)===String(id)) || allSports().find(c=>String(c.id)===String(id));}
  function isMine(c){return compKey(c)===account().id || (!compKey(c)&&account().id)}
  function isDone(id){const td=today();return (window.challengeCompletions||[]).some(c=>String(c.challengeId)===String(id)&&String(c.date||'').slice(0,10)===td&&isMine(c));}
  function persistComps(){write('challenge_completions',window.challengeCompletions||[]);try{challengeCompletions=window.challengeCompletions}catch(e){};try{persistChangeState&&persistChangeState()}catch(e){}}

  window.renderChallenges=function(){
    const list=$('challenges-list'), board=$('leaderboard-list'); if(!list||!board)return;
    const items=dailySports();
    const row=ch=>{const done=isDone(ch.id), pts=parseInt(ch.points,10)||0, link=ch.url||ch.video||ch.youtube||ch.youtubeUrl||ch.link||'';return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc(ch.icon||'🏆')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title||ch.name||'Sportübung')+'</div><div class="challenge-meta">'+esc(ch.desc||'')+' · '+pts+' Punkte</div>'+(link?'<a class="challenge-meta" href="'+esc(link)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">So geht die Übung</a>':'')+'</div><span class="points-pill">+'+pts+'</span>'+(done?'<button class="btn btn-success btn-sm" disabled>Erledigt</button><button class="btn btn-undo btn-sm" title="Heute rückgängig machen" onclick="undoChallenge(\''+esc(ch.id)+'\')">↶</button>':'<button class="btn btn-primary btn-sm" onclick="completeChallenge(\''+esc(ch.id)+'\')">Erledigen</button>')+'</div>'};
    const req=items.filter(c=>!c.optional), opt=items.filter(c=>c.optional);
    list.innerHTML=req.map(row).join('')+(opt.length?'<div class="section-label" style="padding:14px 16px 6px">Optionale Sportpunkte</div>'+opt.map(row).join(''):'');
    const players=allPlayers().sort((a,b)=>stats(playerKey(b)).totalPoints-stats(playerKey(a)).totalPoints);
    board.innerHTML=players.map((p,i)=>{const id=playerKey(p),s=stats(id),med=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1),live=p.online?'<span class="live-dot"></span>':'';return '<div class="leader-row clickable" onclick="openPlayerRecentPanel&&openPlayerRecentPanel(\''+esc(id)+'\',\''+esc(p.name||p.email||id)+'\')"><div class="leader-rank">'+med+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+live+'</div><div class="leader-detail">Heute: '+s.todayPoints+' P · Gesamt: '+s.totalPoints+' P · '+s.totalCount+' erledigt</div></div><div class="leader-score">'+s.totalPoints+'</div></div>'}).join('')||'<div class="dash-empty">Noch keine Mitspieler</div>';
  };
  window.completeChallenge=function(id){
    const ch=challengeById(id); if(!ch)return; if(isDone(id)){toast&&toast('Bereits erledigt','');return;}
    const a=account(), c={id:'cc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),challengeId:String(id),playerId:a.id,userEmail:a.email,email:a.email,playerName:a.name,date:today(),points:parseInt(ch.points,10)||0,createdAt:new Date().toISOString()};
    window.challengeCompletions=(window.challengeCompletions||[]).concat(c); persistComps();
    try{if(typeof publishCompletionToFirestore==='function')publishCompletionToFirestore(c)}catch(e){}
    try{renderChallenges();renderCalendar();buildDashboard()}catch(e){} if(typeof toast==='function')toast('+'+c.points+' Punkte ✓','ok');
  };
  window.undoChallenge=function(id){
    const a=account(),td=today(); let removed=[];
    window.challengeCompletions=(window.challengeCompletions||[]).filter(c=>{const hit=String(c.challengeId)===String(id)&&String(c.date||'').slice(0,10)===td&&(compKey(c)===a.id||compKey(c)===a.email); if(hit)removed.push(c); return !hit;}); persistComps();
    try{if(window.firebase&&firebase.firestore){const db=firebase.firestore();removed.forEach(c=>c.id&&db.collection('change_completions').doc(String(c.id)).delete().catch(()=>{}));}}catch(e){}
    try{renderChallenges();renderCalendar();buildDashboard()}catch(e){} if(typeof toast==='function')toast(removed.length?'Challenge zurückgesetzt':'Nichts zurückzusetzen','');
  };
  window.resetTodayChallenges=function(){const td=today(),a=account();window.challengeCompletions=(window.challengeCompletions||[]).filter(c=>!(String(c.date||'').slice(0,10)===td&&(compKey(c)===a.id||compKey(c)===a.email)));persistComps();try{renderChallenges();renderCalendar();buildDashboard()}catch(e){};toast&&toast('Heute zurückgesetzt','')};
  window.getChallengePointsForDate=function(k){const a=account();let sum=0;(window.challengeCompletions||[]).forEach(c=>{if(String(c.date||'').slice(0,10)===String(k).slice(0,10)&&(compKey(c)===a.id||compKey(c)===a.email))sum+=parseInt(c.points,10)||0});return sum};
  window.getChallengeDayStatus=function(k){const p=window.getChallengePointsForDate(k);return p>0?{points:p,done:true,allDone:true}:null};

  function googleOn(){try{return localStorage.getItem('change_google_calendar_sync_enabled')==='1'||localStorage.getItem('change_v1_google_calendar_sync')==='true'}catch(e){return false}}
  window.setGoogleCalendarSyncEnabled=async function(on){raw('change_google_calendar_sync_enabled',on?'1':'0');raw('change_v1_google_calendar_sync',on?'true':'false');window.googleCalendarSyncEnabled=!!on;if(on){try{toast&&toast('Google-Kalender-Sync wird aktualisiert…','')}catch(e){};try{await loadGoogleEvents?.()}catch(e){};try{renderCalendar();buildDashboard()}catch(e){};try{toast&&toast('Google-Kalender-Sync aktualisiert ✓','ok')}catch(e){}}else{try{window.gEvents=[];write('gEvents',[]);renderCalendar();buildDashboard();toast&&toast('Google-Kalender-Sync deaktiviert','')}catch(e){}}};
  window.openPushSettingsPanel=function(){const live=read('live_sync_enabled',true)!==false,online=allPlayers().filter(p=>p.online).length;const html='<div class="push-box"><div class="challenge-title">Live-Sync</div><div class="settings-hint" style="margin-top:8px">Push-Benachrichtigungen steuerst du nur über die Glocke.</div></div><div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Live-Mitspieler <span class="status-pill '+(live?'status-on':'status-off')+'">'+(live?'VERBUNDEN':'AUS')+'</span></div><div class="toggle-sub">Aktuell online: '+online+' · synchronisiert Kontest-Daten im Dashboard und bei Challenges.</div></div><label class="switch"><input type="checkbox" '+(live?'checked':'')+' onchange="setLiveSyncEnabled&&setLiveSyncEnabled(this.checked)"><span class="slider"></span></label></div>';openPanel&&openPanel('Live-Sync',html)};
  window.openCalendarSettings=function(){const states=window.STATE_OPTIONS||{ALL:'Alle Bundesländer'};const o=read('change_v1_calendar_view_options',{showHolidays:true,showChallengeDots:true,showWeekNumbers:true});const st=(window.calendarSettings&&calendarSettings.state)||localStorage.getItem('holiday_state')||'ALL';const opts=Object.entries(states).map(([k,v])=>'<option value="'+esc(k)+'" '+(k===st?'selected':'')+'>'+esc(v)+'</option>').join('');const row=(t,id,on,sub)=>'<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">'+t+'</div><div class="toggle-sub">'+sub+'</div></div><label class="switch"><input type="checkbox" id="'+id+'" '+(on?'checked':'')+'><span class="slider"></span></label></div>';const html='<div class="fg"><label class="flabel">Bundesland für Feiertage</label><select class="finput" id="holiday-state">'+opts+'</select></div>'+row('Feiertage anzeigen','toggle-holidays',o.showHolidays!==false,'')+row('Challenge-Punkte anzeigen','toggle-dots',o.showChallengeDots!==false,'Nur erledigte Punkte klein unten rechts.')+row('Kalenderwochen anzeigen','toggle-kw',o.showWeekNumbers!==false,'KW-Anzeige in der Monatsansicht.')+row('Google-Kalender-Sync','toggle-google-sync',googleOn(),'Beim Aktivieren wird neu synchronisiert.')+'<button class="btn btn-primary btn-full" onclick="saveCalSettings()">Speichern</button>';openPanel&&openPanel('Kalender-Einstellungen',html)};
  window.saveCalSettings=function(){const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked};write('change_v1_calendar_view_options',o);write('calendar_settings',o);try{if(!window.calendarSettings)window.calendarSettings={};calendarSettings.state=$('holiday-state')?.value||'ALL';localStorage.setItem('holiday_state',calendarSettings.state)}catch(e){};setGoogleCalendarSyncEnabled(!!$('toggle-google-sync')?.checked);closePanel&&closePanel();try{renderCalendar();buildDashboard()}catch(e){};toast&&toast('Kalender-Einstellungen gespeichert ✓','ok')};

  function dateOf(e){return String(e?.date||e?.startDate||e?.start?.date||e?.start?.dateTime||'').slice(0,10)}
  function titleOf(e){return String(e?.title||e?.summary||e?.name||'Termin').replace(/\bZeitraum\b\s*:?/gi,'').trim()}
  function allEvents(){let out=[];try{out=(typeof getAllEvents==='function'?getAllEvents():(window.events||[]))||[]}catch(e){};return out.filter(e=>dateOf(e)).sort((a,b)=>dateOf(a).localeCompare(dateOf(b))).slice(0,5)}
  window.buildDashboard=function(){
    const h=$('dash-greeting'),s=$('dash-sub'),grid=$('dash-grid'); if(h){const n=(window.userInfo&&userInfo.name)||'',hr=new Date().getHours();h.textContent=(hr<12?'Guten Morgen':hr<17?'Guten Tag':'Guten Abend')+(n?', '+n.split(' ')[0]:'')} if(s)s.textContent='Kalender, Challenges und Mitspieler auf einen Blick'; if(!grid)return;
    const evRows=allEvents().map(e=>'<div class="dash-row compact-row" onclick="setMainView(\'calendar\')"><div class="dash-row-icon" style="background:var(--acc-d)">📅</div><div class="dash-row-body"><div class="dash-row-title">'+esc(titleOf(e))+'</div><div class="dash-row-sub">'+esc(dateOf(e).split('-').reverse().join('.'))+'</div></div></div>').join('')||'<div class="dash-empty compact-empty">Keine Termine</div>';
    const chRows=dailySports().filter(c=>!isDone(c.id)).slice(0,4).map(c=>'<div class="dash-row compact-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--amb-d)">'+esc(c.icon||'🏆')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(c.title||c.name)+'</div><div class="dash-row-sub">'+(parseInt(c.points,10)||0)+' Punkte</div></div><span class="dash-row-badge">offen</span></div>').join('')||'<div class="dash-empty compact-empty">Heute erledigt</div>';
    const plRows=allPlayers().sort((a,b)=>stats(playerKey(b)).totalPoints-stats(playerKey(a)).totalPoints).slice(0,4).map((p,i)=>{const id=playerKey(p),st=stats(id),med=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);return '<div class="dash-row compact-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--amb-d)">'+med+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(p.name||p.email||'Mitspieler')+'</div><div class="dash-row-sub">Heute '+st.todayPoints+' P · Gesamt '+st.totalPoints+' P</div></div></div>'}).join('')||'<div class="dash-empty compact-empty">Noch keine Mitspieler</div>';
    grid.innerHTML='<div class="dash-card calendar-card"><div class="dash-card-head"><div><div class="dash-card-title">📅 Kalender</div><div class="dash-card-sub">Heute + nächste Tage</div></div></div><div class="dash-card-body">'+evRows+'</div></div><div class="dash-card dashboard-combined-card"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenges & 👥 Mitspieler</div><div class="dash-card-sub">Heute und Rangliste</div></div></div><div class="dash-card-body"><div class="dashboard-section"><div class="dashboard-section-head"><span>Challenges</span></div>'+chRows+'</div><div class="dashboard-section"><div class="dashboard-section-head"><span>Mitspieler</span></div>'+plRows+'</div></div></div>';
  };

  function css(){let st=$('change-canonical-clean-style');if(!st){st=document.createElement('style');st.id='change-canonical-clean-style';document.head.appendChild(st)}st.textContent='.demo-btn,[onclick="startDemo()"]{display:none!important}.challenge-mini-card,#challenge-mini-calendar,.challenge-week-card,.challenge-week-grid,#upcoming-strip{display:none!important}.btn-undo{background:rgba(239,68,68,.08)!important;border:1px solid rgba(239,68,68,.22)!important;color:#dc2626!important;min-width:36px!important}.leader-row.clickable{cursor:pointer}.leader-row.clickable:hover{background:var(--s2)}#vbtn-year,#vbtn-workweek,#vbtn-today{display:inline-flex!important}body.calendar-active #cal-controls{display:flex!important}body:not(.calendar-active) #cal-controls{display:none!important}body:not(.calendar-active) [onclick="openCalendarSettings()"]{display:none!important}';}
  const oldSet=window.setMainView; window.setMainView=function(v){if(typeof oldSet==='function')oldSet(v);document.body.classList.toggle('calendar-active',v==='calendar');const cc=$('cal-controls');if(cc)cc.style.display=v==='calendar'?'flex':'none';if(v==='challenges')setTimeout(()=>renderChallenges(),0);if(v==='dashboard')setTimeout(()=>buildDashboard(),0)};

  const oldToggle=window.togglePushFromBell;
  window.togglePushFromBell=async function(on){
    if(!on){try{localStorage.setItem('change_push_enabled','0');localStorage.setItem('push_enabled','false')}catch(e){};toast&&toast('Push-Benachrichtigungen deaktiviert','ok');openNotifPanel&&openNotifPanel();return;}
    try{
      if(typeof Notification==='undefined'){toast&&toast('Push wird von diesem Browser nicht unterstützt','err');return}
      let p=Notification.permission;if(p!=='granted')p=await Notification.requestPermission(); if(p!=='granted'){toast&&toast('Push wurde im Browser nicht erlaubt','err');openNotifPanel&&openNotifPanel();return;}
      if('serviceWorker' in navigator){await navigator.serviceWorker.register('./firebase-messaging-sw.js',{scope:'./'});}
      try{if(typeof enablePushNotifications==='function')await enablePushNotifications();else if(typeof initFirebaseMessaging==='function')await initFirebaseMessaging()}catch(e){console.warn('FCM optional failed',e)}
      localStorage.setItem('change_push_enabled','1');localStorage.setItem('push_enabled','true');toast&&toast('Push-Benachrichtigungen aktiviert ✓','ok');openNotifPanel&&openNotifPanel();
    }catch(e){console.warn('push canonical',e);toast&&toast('Push konnte nicht aktiviert werden. Bitte Seite neu laden und erneut versuchen.','err');openNotifPanel&&openNotifPanel();}
  };

  function init(){css();allPlayers();try{if(window.currentMainView==='challenges')renderChallenges(); if(window.currentMainView==='dashboard')buildDashboard(); if(window.currentMainView==='calendar')renderCalendar();}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,100));else setTimeout(init,100);
  window.addEventListener('load',()=>{setTimeout(init,300);setTimeout(init,1500);});
})();


(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  function setStoredPush(on){try{localStorage.setItem('change_push_enabled',on?'1':'0');localStorage.setItem('change_v2_push_enabled',on?'true':'false');localStorage.setItem('change_v1_push_enabled',on?'true':'false');if(typeof lsSet==='function')lsSet('push_enabled',!!on);}catch(e){}}
  function storedPushEnabled(){let raw=null;try{raw=localStorage.getItem('change_push_enabled');}catch(e){} if(raw==='0')return false; if(raw==='1')return true; try{if(localStorage.getItem('change_v2_push_enabled')==='false'||localStorage.getItem('change_v1_push_enabled')==='false')return false; if(localStorage.getItem('change_v2_push_enabled')==='true'||localStorage.getItem('change_v1_push_enabled')==='true')return true;}catch(e){} try{if(typeof ls==='function'&&ls('push_enabled')===false)return false;}catch(e){} return (typeof Notification!=='undefined'&&Notification.permission==='granted');}
  window.openNotifPanel=function(){const perm=(typeof Notification==='undefined')?'nicht unterstützt':Notification.permission; const enabled=storedPushEnabled()&&perm==='granted'; const html='<div class="push-box bell-push-box"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><div style="font-size:13px;font-weight:800;color:var(--t1)">🔔 Push-Benachrichtigungen</div><div class="push-status '+(enabled?'push-ok':'push-warn')+'" id="bell-push-status">Status: '+(enabled?'aktiv':'inaktiv')+' · Browser: '+esc(perm)+'</div></div><label class="switch"><input type="checkbox" id="bell-push-toggle" '+(enabled?'checked':'')+' onchange="togglePushFromBell(this.checked)"><span class="slider"></span></label></div><button class="btn btn-secondary btn-full" style="margin-top:12px" onclick="sendTestBellNotification()">Test-Benachrichtigung senden</button></div><div class="panel-notif-section"><div class="pns-title">Aktuelle Hinweise</div><div id="bell-notif-list">'+(((window.notifications||[]).length)?(window.notifications||[]).slice(0,8).map(n=>'<div class="nitem"><div class="nitem-icon" style="background:var(--acc-d)">🔔</div><div class="nitem-body"><div class="nitem-title">'+esc(n.title||'Benachrichtigung')+'</div><div class="nitem-sub">'+esc(n.body||n.text||'')+'</div></div></div>').join(''):'<div class="dash-empty">Keine neuen Benachrichtigungen</div>')+'</div></div>'; if(typeof openPanel==='function')openPanel('Benachrichtigungen',html); const dot=$('notif-dot'); if(dot)dot.style.display='none';};
  window.togglePushFromBell=async function(on){try{if(!on){setStoredPush(false);const t=$('bell-push-toggle');if(t)t.checked=false;if(typeof updateBellPushStatus==='function')updateBellPushStatus('inaktiv');if(typeof toast==='function')toast('Push-Benachrichtigungen deaktiviert','ok');return;} if(typeof Notification==='undefined'){setStoredPush(false);if(typeof updateBellPushStatus==='function')updateBellPushStatus('nicht unterstützt');if(typeof toast==='function')toast('Push wird von diesem Browser nicht unterstützt','err');return;} let perm=Notification.permission;if(perm!=='granted')perm=await Notification.requestPermission(); if(perm==='granted'){setStoredPush(true);if(typeof updateBellPushStatus==='function')updateBellPushStatus('aktiv');try{if(typeof initFirebaseMessaging==='function')initFirebaseMessaging();}catch(e){} if(typeof toast==='function')toast('Push-Benachrichtigungen aktiviert','ok');}else{setStoredPush(false);const t=$('bell-push-toggle');if(t)t.checked=false;if(typeof updateBellPushStatus==='function')updateBellPushStatus('blockiert');if(typeof toast==='function')toast('Push wurde im Browser nicht erlaubt','err');}}catch(e){console.warn('change-final-user-fixes-3',e);if(typeof toast==='function')toast('Push konnte nicht geändert werden','err');}};
  window.updateBellPushStatus=function(text){const s=$('bell-push-status');const perm=(typeof Notification==='undefined'?'nicht unterstützt':Notification.permission);if(s){s.textContent='Status: '+text+' · Browser: '+perm;s.className='push-status '+(text==='aktiv'?'push-ok':'push-warn');} const dot=$('notif-dot');if(dot)dot.style.display=(text==='aktiv')?'block':'none';};
  window.sendTestBellNotification=function(){try{if(!storedPushEnabled()){if(typeof toast==='function')toast('Push ist deaktiviert','err');return;} if(typeof Notification!=='undefined'&&Notification.permission==='granted'){new Notification('Change',{body:'Test-Benachrichtigung funktioniert.'});if(typeof toast==='function')toast('Test gesendet ✓','ok');}else if(typeof toast==='function')toast('Bitte Push zuerst aktivieren','err');}catch(e){if(typeof toast==='function')toast('Test-Push nicht möglich','err');}};
  const st=document.createElement('style');st.id='change-final-user-fixes-3-style';st.textContent='.last-remove-btn{display:none!important}.last-completed-main{flex:1}.bell-push-box .btn:empty::before{content:"Test-Benachrichtigung senden";}';document.head.appendChild(st);
})();


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


/* FINAL UI CALENDAR FIX */
(function(){
const DAY=86400000,$=id=>document.getElementById(id),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),D=d=>typeof dateKey==='function'?dateKey(d):new Date(d).toISOString().slice(0,10),PD=s=>new Date(String(s).slice(0,10)+'T12:00:00'),AD=(d,n)=>typeof addDays==='function'?addDays(d,n):new Date(new Date(d).getTime()+n*DAY);
function opt(){let o={showHolidays:true,showChallengeDots:true,showWeekNumbers:true};['change_v1_calendar_view_options','calendar_settings'].forEach(k=>{try{Object.assign(o,JSON.parse(localStorage.getItem(k)||'{}'))}catch(e){}});return o}
function rng(ev){let s=ev.startDate||ev.date||ev.start?.date||ev.start?.dateTime?.slice(0,10)||'',e=ev.endDate||ev.date||'';if(!e&&ev.end){e=ev.end.date||ev.end.dateTime?.slice(0,10)||s;if(ev.end.date&&e>s)e=D(AD(PD(e),-1))}if(!e||e<s)e=s;return{start:s,end:e}}
window.getAllEvents=function(){let out=[],loc=[];try{loc=[...(window.events||events||[])]}catch(e){}loc.forEach(ev=>{let r=rng(ev);out.push(Object.assign({},ev,{date:r.start,startDate:r.start,endDate:r.end,source:ev.source||'local'}))});let gg=[];try{gg=[...(window.gEvents||gEvents||[])]}catch(e){}gg.forEach(ge=>{let s=ge.start?.date||ge.start?.dateTime?.slice(0,10)||'';if(!s)return;let e=ge.end?.date||ge.end?.dateTime?.slice(0,10)||s;if(ge.end?.date&&e>s)e=D(AD(PD(e),-1));out.push({id:'g_'+ge.id,title:ge.summary||'(Kein Titel)',date:s,startDate:s,endDate:e< s?s:e,time:ge.start?.dateTime?new Date(ge.start.dateTime).toTimeString().slice(0,5):'',endTime:ge.end?.dateTime?new Date(ge.end.dateTime).toTimeString().slice(0,5):'',color:'blue',type:'meeting',desc:ge.description||'',source:'google',googleEventId:ge.id})});return out.filter(x=>x.date)};
window.getEventById=id=>(window.events||[]).find(e=>e.id===id)||getAllEvents().find(e=>e.id===id);
function evsOn(k){return getAllEvents().filter(e=>{let r=rng(e);return r.start<=k&&r.end>=k}).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'))}
function hol(k){try{return getHolidaysForDate(k)||[]}catch(e){return[]}}
function ch(k){let cs=(window.challenges||[]).filter(c=>c&&c.active!==false&&(c.recurrence==='daily'||(c.date||c.startDate||D(new Date()))===k));if(!cs.length)return null;let me='local';try{me=getCurrentPlayerId()}catch(e){}let done=cs.filter(x=>(window.challengeCompletions||challengeCompletions||[]).some(c=>c.challengeId===x.id&&c.playerId===me&&c.date===k)).length;return{points:cs.reduce((s,c)=>s+(parseInt(c.points)||0),0),done,allDone:done>=cs.length,total:cs.length}}
function kw(dt){let d=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);let y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-y0)/DAY)+1)/7)}
function diff(a,b){return Math.round((PD(b)-PD(a))/DAY)}
function gmark(ev){return ev.source==='google'?'<span class="gmark" title="von Google">G</span>':(ev.googleEventId||ev.syncedToGoogle?'<span class="gmark synced" title="an Google übertragen">✓</span>':'')}
window.renderMonth=function(y,m){let g=$('month-grid'),o=opt();if(!g)return;g.className='month-grid-clean';g.style.display='grid';g.style.gridTemplateRows='repeat(6,1fr)';g.innerHTML='';let f=new Date(y,m,1).getDay();f=f===0?6:f-1;let dim=new Date(y,m+1,0).getDate(),pdim=new Date(y,m,0).getDate(),cells=[];for(let i=0;i<f;i++)cells.push({d:pdim-f+1+i,m:m?m-1:11,y:m?y:y-1,other:true});for(let i=1;i<=dim;i++)cells.push({d:i,m,y,other:false});while(cells.length<42){let n=cells.length-f-dim+1;cells.push({d:n,m:m===11?0:m+1,y:m===11?y+1:y,other:true})}for(let w=0;w<6;w++){let row=document.createElement('div');row.className='week-row clean-range-row';let wc=cells.slice(w*7,w*7+7),sk=D(new Date(wc[0].y,wc[0].m,wc[0].d)),ek=D(new Date(wc[6].y,wc[6].m,wc[6].d));wc.forEach((c,i)=>{let dt=new Date(c.y,c.m,c.d),k=D(dt),hs=hol(k),st=ch(k),cell=document.createElement('div');cell.className='day-cell'+(c.other?' other':'')+(i>4?' weekend':'')+(isToday(dt)?' today':'');cell.style.gridColumn=i+1;cell.onclick=()=>onDayClick(dt,evsOn(k));cell.innerHTML='<div class="day-num-wrap"><div class="day-num">'+c.d+'</div>'+(o.showHolidays&&hs.length?'<div class="holiday-inline">'+E(hs[0].name)+'</div>':'')+'</div>'+(o.showChallengeDots&&st?'<div class="challenge-points-badge '+(st.allDone?'done':'')+'">+'+st.points+'P</div>':'')+(i===0&&o.showWeekNumbers?'<div class="kw-badge-left">KW '+kw(dt)+'</div>':'');row.appendChild(cell)});let lanes=[];getAllEvents().filter(ev=>{let r=rng(ev);return r.start<=ek&&r.end>=sk}).sort((a,b)=>rng(a).start.localeCompare(rng(b).start)).forEach(ev=>{let r=rng(ev),ss=r.start<sk?sk:r.start,se=r.end>ek?ek:r.end,sc=diff(sk,ss)+1,ec=diff(sk,se)+1,l=0;while(lanes[l]&&lanes[l]>=sc)l++;lanes[l]=ec;if(l>2)return;let b=document.createElement('div');b.className='range-bar ev-chip '+(ev.color||'blue')+(r.start===ss?' range-start':'')+(r.end===se?' range-end':'');b.style.gridColumn=sc+' / '+(ec+1);b.style.setProperty('--lane',l);b.onclick=e=>{e.stopPropagation();openEventPanel(ev.id)};b.innerHTML='<span class="range-title">'+E(ev.title)+'</span>'+(r.start!==r.end&&r.start===ss?' <span class="range-date">'+fmtDate(r.start).replace(/\.20\d\d$/,'')+'–'+fmtDate(r.end).replace(/\.20\d\d$/,'')+'</span>':'')+gmark(ev);row.appendChild(b)});g.appendChild(row)}};
window.renderYear=function(y){let g=$('month-grid');if(!g)return;g.className='year-grid year-grid-clean';g.style.display='grid';g.style.gridTemplateRows='none';g.innerHTML='';for(let m=0;m<12;m++){let card=document.createElement('div');card.className='year-month-card';card.onclick=()=>{curDate=new Date(y,m,1);currentCalView='month';renderCalendar()};let f=new Date(y,m,1).getDay();f=f===0?6:f-1;let dim=new Date(y,m+1,0).getDate(),html='<div class="year-month-title">'+DE_MONTHS[m]+'</div><div class="year-mini-grid">';['M','D','M','D','F','S','S'].forEach(x=>html+='<div class="year-mini-day year-head">'+x+'</div>');for(let i=0;i<f;i++)html+='<div></div>';for(let d=1;d<=dim;d++){let dt=new Date(y,m,d),k=D(dt),he=evsOn(k).length,hh=hol(k).length;html+='<div class="year-mini-day '+(isToday(dt)?'today ':'')+(he?'has-event ':'')+(hh?'has-holiday ':'')+'"><span>'+d+'</span>'+(he||hh?'<i></i>':'')+'</div>'}card.innerHTML=html+'</div>';g.appendChild(card)}};
window.renderCalendar=function(){let y=curDate.getFullYear(),m=curDate.getMonth(),ml=$('month-label'),g=$('month-grid'),a=$('agenda-view'),w=$('wday-row');if(ml)ml.textContent=currentCalView==='year'?String(y):(currentCalView==='workweek'?'Arbeitswoche · '+DE_MONTHS[m]+' '+y:DE_MONTHS[m]+' '+y);['year','month','workweek','today'].forEach(v=>$('vbtn-'+v)?.classList.toggle('active',currentCalView===v));if(currentCalView==='year'){a.style.display='none';w.style.display='none';renderYear(y)}else if(currentCalView==='workweek'){a.style.display='none';w.style.display='none';window.renderWorkweek&&window.renderWorkweek()}else{a.style.display='none';w.style.display='grid';renderMonth(y,m)}if(currentCalView!=='today')g.style.display='grid';try{renderUpcoming()}catch(e){}};
window.setCalView=v=>{currentCalView=v;renderCalendar()};window.navigate=dir=>{if(currentCalView==='year')curDate=new Date(curDate.getFullYear()+dir,0,1);else if(currentCalView==='workweek')curDate=AD(curDate,dir*7);else curDate=new Date(curDate.getFullYear(),curDate.getMonth()+dir,1);renderCalendar()};window.goToday=()=>{curDate=new Date();currentCalView='month';renderCalendar()};
window.openEventPanel=function(id,pre){let ev=id?getEventById(id):null;if(ev&&ev.source==='google'){let r=rng(ev);openPanel(ev.title,'<div class="google-detail"><span class="gmark big">G</span><div><div class="challenge-title">Von Google Kalender</div><div class="settings-hint">'+E(r.start===r.end?fmtDate(r.start):fmtDate(r.start)+' – '+fmtDate(r.end))+'</div></div></div><button class="btn btn-ghost btn-full" onclick="closePanel()">Schließen</button>');return}let dv=ev?.startDate||ev?.date||(pre?D(pre):D(new Date())),ed=ev?.endDate||ev?.date||dv;let html='<div class="fg"><label class="flabel">Titel *</label><input class="finput" id="ev-title" value="'+E(ev?.title||'')+'"></div><div class="fr"><div class="fg"><label class="flabel">Von-Datum *</label><input type="date" class="finput" id="ev-date" value="'+dv+'"></div><div class="fg"><label class="flabel">Bis-Datum</label><input type="date" class="finput" id="ev-end-date" value="'+ed+'"></div></div><div class="fr"><div class="fg"><label class="flabel">Von Uhrzeit</label><input type="time" class="finput" id="ev-time" value="'+(ev?.time||'')+'"></div><div class="fg"><label class="flabel">Bis Uhrzeit</label><input type="time" class="finput" id="ev-end" value="'+(ev?.endTime||'')+'"></div></div><div class="fg"><label class="flabel">Farbe</label><select class="finput" id="ev-color">'+['blue','green','amber','red','purple'].map(c=>'<option value="'+c+'" '+((ev?.color||'blue')===c?'selected':'')+'>'+c+'</option>').join('')+'</select></div><div class="fg"><label class="flabel">Beschreibung</label><textarea class="finput" id="ev-desc" rows="4">'+E(ev?.desc||'')+'</textarea></div><button class="btn btn-primary btn-full" onclick="saveEvent(\''+(ev?.id||'')+'\')">Speichern</button>';openPanel(ev?'Termin bearbeiten':'Neuer Termin',html)};
window.saveEvent=function(id){let title=$('ev-title')?.value.trim(),date=$('ev-date')?.value,end=$('ev-end-date')?.value||date;if(!title||!date){toast('Titel und Von-Datum fehlen','err');return}if(end<date)end=date;let old=id?getEventById(id):{},ev={id:id||'ev_'+uid(),title,date,startDate:date,endDate:end,time:$('ev-time')?.value||'',endTime:$('ev-end')?.value||'',color:$('ev-color')?.value||'blue',type:old?.type||'meeting',desc:$('ev-desc')?.value.trim()||'',source:'local',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};let arr=window.events||events,i=arr.findIndex(e=>e.id===ev.id);if(i>=0)arr[i]=Object.assign({},arr[i],ev);else arr.push(ev);try{events=arr;window.events=arr}catch(e){}ls('events',arr);closePanel();renderCalendar();try{buildDashboard()}catch(e){}toast('Termin gespeichert ✓','ok')};
window.openCalendarSettings=function(){let o=opt(),st=(window.calendarSettings?.state)||localStorage.getItem('holiday_state')||'ALL',opts=Object.entries(window.STATE_OPTIONS||STATE_OPTIONS||{}).map(([k,v])=>'<option value="'+k+'" '+(k===st?'selected':'')+'>'+v+'</option>').join('');openPanel('Kalender-Einstellungen','<div class="fg"><label class="flabel">Bundesland</label><select class="finput" id="holiday-state">'+opts+'</select></div>'+['Feiertage anzeigen|toggle-holidays|showHolidays','Challenge-Punkte|toggle-dots|showChallengeDots','Kalenderwochen|toggle-kw|showWeekNumbers'].map(x=>{let [t,id,k]=x.split('|');return '<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">'+t+'</div></div><label class="switch"><input type="checkbox" id="'+id+'" '+(o[k]?'checked':'')+'><span class="slider"></span></label></div>'}).join('')+'<button class="btn btn-primary btn-full" onclick="saveCalSettings()">Speichern</button>')};
window.saveCalSettings=function(){let o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked};localStorage.setItem('change_v1_calendar_view_options',JSON.stringify(o));localStorage.setItem('calendar_settings',JSON.stringify(o));try{calendarSettings.state=$('holiday-state')?.value||'ALL';ls('holiday_state',calendarSettings.state)}catch(e){}closePanel();renderCalendar();toast('Kalender-Einstellungen gespeichert ✓','ok')};
let css=document.createElement('style');css.textContent='.clean-range-row{position:relative;display:grid!important;grid-template-columns:repeat(7,1fr);grid-auto-rows:1fr;min-height:132px}.clean-range-row .day-cell{grid-row:1;min-width:0;overflow:hidden;padding-top:8px}.day-num-wrap{display:flex!important;align-items:center;gap:6px;min-height:22px;padding-right:44px}.holiday-inline{font-size:10px;font-weight:800;color:var(--amb);background:var(--amb-d);border-radius:999px;padding:2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:72%}.challenge-points-badge{position:absolute;top:7px;right:6px;z-index:7;font-size:10px;font-weight:900;color:var(--amb);background:var(--amb-d);border-radius:999px;padding:2px 6px}.challenge-points-badge.done{color:var(--grn);background:var(--grn-d)}.kw-badge-left{position:absolute;left:8px;bottom:8px;z-index:6;font-size:11px;font-weight:900;color:var(--acc);background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.2);border-radius:999px;padding:3px 7px}.range-bar{grid-row:1;align-self:start;margin-top:calc(36px + var(--lane)*24px);height:20px;line-height:20px;padding:0 8px!important;z-index:5;border-radius:0!important;display:flex!important;align-items:center;gap:4px;min-width:0;overflow:hidden}.range-start{border-top-left-radius:10px!important;border-bottom-left-radius:10px!important}.range-end{border-top-right-radius:10px!important;border-bottom-right-radius:10px!important}.range-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:700}.range-date{font-size:10px;font-weight:800;color:#3b82f6;background:rgba(59,130,246,.1);border-radius:999px;padding:0 5px}.gmark{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;font-size:9px;font-weight:900;color:#4285f4;background:rgba(66,133,244,.12);flex:0 0 auto}.gmark.synced{color:var(--grn);background:var(--grn-d)}.gmark.big{width:28px;height:28px;font-size:14px}.google-detail{display:flex;gap:10px;align-items:center;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r);padding:12px}.year-mini-day{position:relative}.year-mini-day i{position:absolute;bottom:1px;width:5px;height:5px;border-radius:50%;background:var(--acc)}.year-mini-day.has-holiday i{background:var(--amb)}.year-mini-day.has-event.has-holiday i{background:linear-gradient(90deg,var(--acc) 50%,var(--amb) 50%)}';document.head.appendChild(css);setTimeout(()=>{try{renderCalendar()}catch(e){console.warn(e)}},50);
})();



(function(){
  const DAY=86400000;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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

  window.renderMonth=function(y,m){
    const grid=$('month-grid'), o=loadOpts(); if(!grid)return;
    grid.className='month-grid-stacked'; grid.style.display='grid'; grid.style.gridTemplateRows='repeat(6,minmax(118px,1fr))'; grid.innerHTML='';
    let first=new Date(y,m,1).getDay(); first=first===0?6:first-1;
    const dim=new Date(y,m+1,0).getDate(), pdim=new Date(y,m,0).getDate(), cells=[];
    for(let i=0;i<first;i++)cells.push({d:pdim-first+1+i,m:m?m-1:11,y:m?y:y-1,other:true});
    for(let d=1;d<=dim;d++)cells.push({d,m,y,other:false});
    while(cells.length<42){let d=cells.length-first-dim+1;cells.push({d,m:m===11?0:m+1,y:m===11?y+1:y,other:true});}
    for(let w=0;w<6;w++){
      const row=document.createElement('div'); row.className='cal-week-stacked';
      cells.slice(w*7,w*7+7).forEach((c,i)=>{
        const dt=new Date(c.y,c.m,c.d), k=key(dt), hs=holidays(k), pts=pointsOn(k), evs=eventsOn(k);
        const cell=document.createElement('div');
        cell.className='cal-day-stacked'+(c.other?' other':'')+(i>4?' weekend':'')+((typeof isToday==='function'&&isToday(dt))?' today':'');
        cell.onclick=()=>{try{onDayClick(dt,evs)}catch(e){if(typeof openEventPanel==='function')openEventPanel('',dt)}};
        let html='<div class="cal-day-head"><span class="cal-day-num">'+c.d+'</span>'+(o.showHolidays&&hs.length?'<span class="cal-holiday-inline" title="'+esc(hs[0].name)+'">'+esc(hs[0].name)+'</span>':'')+'</div>';
        if(i===0&&o.showWeekNumbers) html+='<span class="cal-kw">KW '+weekNo(dt)+'</span>';
        html+='<div class="cal-event-stack">';
        evs.slice(0,3).forEach(e=>{html+='<button type="button" class="cal-event-chip '+esc(e.color||'blue')+'" onclick="event.stopPropagation();openEventPanel(\''+esc(e.id||'')+'\')"><span class="cal-event-title">'+esc(e.title)+'</span>'+rangeText(e,k)+googleMark(e)+'</button>';});
        if(evs.length>3) html+='<div class="cal-more">+'+(evs.length-3)+' weitere</div>';
        html+='</div>';
        if(o.showChallengeDots&&pts>0) html+='<span class="cal-points">+'+pts+'P</span>';
        cell.innerHTML=html; row.appendChild(cell);
      });
      grid.appendChild(row);
    }
  };

  window.renderYear=function(y){const grid=$('month-grid'),o=loadOpts(); if(!grid)return; grid.className='year-grid-stacked'; grid.style.display='grid'; grid.style.gridTemplateRows='none'; grid.innerHTML=''; for(let m=0;m<12;m++){const card=document.createElement('button'); card.type='button'; card.className='year-card-stacked'; card.onclick=()=>{window.curDate=curDate=new Date(y,m,1); window.currentCalView=currentCalView='month'; window.renderCalendar();}; let first=new Date(y,m,1).getDay(); first=first===0?6:first-1; let html='<div class="year-title-stacked">'+monthNames[m]+'</div><div class="year-days-stacked">'; ['M','D','M','D','F','S','S'].forEach(x=>html+='<b>'+x+'</b>'); for(let i=0;i<first;i++)html+='<span></span>'; const dim=new Date(y,m+1,0).getDate(); for(let d=1;d<=dim;d++){const dt=new Date(y,m,d),k=key(dt),hasE=eventsOn(k).length>0,hasH=o.showHolidays&&holidays(k).length>0; html+='<span class="'+((typeof isToday==='function'&&isToday(dt))?'today ':'')+(hasE?'has-event ':'')+(hasH?'has-holiday ':'')+'">'+d+((hasE||hasH)?'<i></i>':'')+'</span>'; } card.innerHTML=html+'</div>'; grid.appendChild(card);}};

  window.renderCalendar=function(){const y=curDate.getFullYear(),m=curDate.getMonth(),ml=$('month-label'),grid=$('month-grid'),ag=$('agenda-view'),wd=$('wday-row'); if(ml)ml.textContent=currentCalView==='year'?String(y):monthNames[m]+' '+y; ['year','month','workweek','today'].forEach(v=>$('vbtn-'+v)?.classList.toggle('active',currentCalView===v)); if(ag)ag.style.display='none'; if(currentCalView==='year'){if(wd)wd.style.display='none'; renderYear(y);}else{if(wd)wd.style.display='grid'; renderMonth(y,m);} if(grid)grid.style.display='grid';};
  window.setCalView=function(v){window.currentCalView=currentCalView=v;renderCalendar();};
  window.navigate=function(dir){if(currentCalView==='year')window.curDate=curDate=new Date(curDate.getFullYear()+dir,0,1);else window.curDate=curDate=new Date(curDate.getFullYear(),curDate.getMonth()+dir,1);renderCalendar();};
  window.goToday=function(){window.curDate=curDate=new Date();window.currentCalView=currentCalView='month';renderCalendar();};

  window.openCalendarSettings=function(){const o=loadOpts(); const states=window.STATE_OPTIONS||(typeof STATE_OPTIONS!=='undefined'?STATE_OPTIONS:{ALL:'Alle Bundesländer'}); const st=(window.calendarSettings&&calendarSettings.state)||localStorage.getItem('holiday_state')||'ALL'; const opts=Object.entries(states).map(([k,v])=>'<option value="'+esc(k)+'" '+(k===st?'selected':'')+'>'+esc(v)+'</option>').join(''); const row=(title,id,on,sub)=>'<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">'+title+'</div>'+(sub?'<div class="toggle-sub">'+sub+'</div>':'')+'</div><label class="switch"><input type="checkbox" id="'+id+'" '+(on?'checked':'')+'><span class="slider"></span></label></div>'; const html='<div class="fg"><label class="flabel">Bundesland für Feiertage</label><select class="finput" id="holiday-state">'+opts+'</select></div>'+row('Feiertage anzeigen','toggle-holidays',o.showHolidays,'Neben der Tageszahl, ohne Terminüberlappung.')+row('Challenge-Punkte anzeigen','toggle-dots',o.showChallengeDots,'Nur klein rechts unten am jeweiligen Tag.')+row('Kalenderwochen anzeigen','toggle-kw',o.showWeekNumbers,'Deutlich links unten pro Woche.')+'<button class="btn btn-primary btn-full" onclick="saveCalSettings()">Speichern</button>'; if(typeof openPanel==='function')openPanel('Kalender-Einstellungen',html);};
  window.saveCalSettings=function(){const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked}; saveOpts(o); try{if(!window.calendarSettings)window.calendarSettings={}; calendarSettings.state=$('holiday-state')?.value||'ALL'; if(typeof ls==='function'){ls('holiday_state',calendarSettings.state); localStorage.setItem('change_v1_holiday_state',calendarSettings.state);} else {localStorage.setItem('holiday_state',JSON.stringify(calendarSettings.state)); localStorage.setItem('change_v1_holiday_state',calendarSettings.state);}}catch(e){} if(typeof closePanel==='function')closePanel(); renderCalendar(); if(typeof toast==='function')toast('Kalender-Einstellungen gespeichert ✓','ok');};

  const style=document.createElement('style'); style.id='final-stacked-calendar-style'; style.textContent=`
    .range-bar,.fx-range,.clean-range-row>.range-bar{display:none!important}.h-actions,.h-cal-controls{position:relative;z-index:50}.icon-btn[title*="Kalender"]{pointer-events:auto!important;position:relative;z-index:60}
    #month-grid.month-grid-stacked{overflow:hidden!important;background:#fff!important}.cal-week-stacked{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr));min-height:118px;border-bottom:1px solid var(--b1);position:relative}.cal-day-stacked{position:relative;min-width:0;padding:7px 8px 22px;background:#fff;border-right:1px solid var(--b1);overflow:hidden;cursor:pointer}.cal-day-stacked.weekend{background:#faf9f6}.cal-day-stacked.other{opacity:.45}.cal-day-stacked.today{box-shadow:inset 0 0 0 1px rgba(45,106,79,.28);background:#fbfffd}.cal-day-head{display:flex;align-items:center;gap:6px;min-height:23px;padding-right:42px;min-width:0}.cal-day-num{font-size:13px;font-weight:850;color:var(--t2);line-height:1}.cal-day-stacked.today .cal-day-num{display:inline-flex;align-items:center;justify-content:center;width:23px;height:23px;border-radius:50%;background:var(--acc);color:white}.cal-holiday-inline{font-size:10px;font-weight:800;color:#c76a00;background:rgba(245,158,11,.11);border:1px solid rgba(245,158,11,.18);border-radius:999px;padding:2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 34px)}.cal-event-stack{display:flex;flex-direction:column;gap:3px;margin-top:5px;padding-right:2px}.cal-event-chip{height:20px;border:1px solid rgba(59,130,246,.18);background:rgba(59,130,246,.10);color:#2563eb;border-radius:7px;padding:0 6px;display:flex;align-items:center;gap:4px;min-width:0;text-align:left;font-size:11px;font-weight:750;line-height:18px;cursor:pointer}.cal-event-chip.green{background:rgba(22,163,74,.10);border-color:rgba(22,163,74,.18);color:#15803d}.cal-event-chip.amber{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.20);color:#b45309}.cal-event-chip.red{background:rgba(239,68,68,.10);border-color:rgba(239,68,68,.18);color:#dc2626}.cal-event-chip.purple{background:rgba(124,58,237,.10);border-color:rgba(124,58,237,.18);color:#6d28d9}.cal-event-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.cal-range-text{font-size:9px;font-weight:850;opacity:.8;white-space:nowrap}.cal-g{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;font-size:8px;font-weight:900;color:#4285f4;background:rgba(66,133,244,.13);flex:0 0 auto}.cal-g.ok{color:var(--grn);background:var(--grn-d)}.cal-more{font-size:10px;font-weight:800;color:var(--t3);padding:1px 6px}.cal-points{position:absolute;right:7px;bottom:5px;z-index:8;font-size:10px;font-weight:900;color:var(--grn);background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.24);border-radius:999px;padding:2px 6px;line-height:1}.cal-kw{position:absolute;left:7px;bottom:5px;z-index:8;font-size:10.5px;font-weight:900;color:var(--acc);background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.20);border-radius:999px;padding:2px 7px}.year-grid-stacked{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;padding:14px!important;overflow:auto!important}.year-card-stacked{background:#fff;border:1px solid var(--b1);border-radius:14px;padding:10px;text-align:left;cursor:pointer}.year-title-stacked{font-weight:850;font-size:13px;margin-bottom:7px}.year-days-stacked{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.year-days-stacked b,.year-days-stacked span{height:18px;font-size:9px;color:var(--t4);display:flex;align-items:center;justify-content:center;position:relative}.year-days-stacked span.today{background:var(--acc);color:white;border-radius:50%}.year-days-stacked span i{position:absolute;bottom:0;width:5px;height:5px;border-radius:50%;background:var(--acc)}.year-days-stacked span.has-holiday i{background:#f59e0b}.year-days-stacked span.has-event.has-holiday i{background:linear-gradient(90deg,var(--acc) 50%,#f59e0b 50%)}@media(max-width:800px){.cal-week-stacked{min-height:105px}.year-grid-stacked{grid-template-columns:1fr!important}.cal-holiday-inline{max-width:58px}.cal-event-chip{font-size:10px;padding:0 4px}}
  `; document.head.appendChild(style);
  document.addEventListener('click',function(e){const btn=e.target.closest('[title="Kalender-Einstellungen"], .icon-btn'); if(btn && (btn.getAttribute('title')||'').includes('Kalender')){e.preventDefault();e.stopPropagation();openCalendarSettings();}},true);
  setTimeout(()=>{try{renderCalendar()}catch(e){console.warn('final stacked calendar render failed',e)}},80);
})();


/* FINAL USER CALENDAR POLISH: ranges top, clean today, settings/sync split */
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DAY=86400000;
  const key=d=>typeof dateKey==='function'?dateKey(d):new Date(d).toISOString().slice(0,10);
  const parse=s=>new Date(String(s).slice(0,10)+'T12:00:00');
  const add=(d,n)=>typeof addDays==='function'?addDays(d,n):new Date(new Date(d).getTime()+n*DAY);
  const fmt=s=>typeof fmtDate==='function'?fmtDate(s):String(s).split('-').reverse().join('.');
  window.STATE_OPTIONS={ALL:'Alle Bundesländer',BW:'Baden-Württemberg',BY:'Bayern','BY-AUGSBURG':'Bayern · Augsburg',BE:'Berlin',BB:'Brandenburg',HB:'Bremen',HH:'Hamburg',HE:'Hessen',MV:'Mecklenburg-Vorpommern',NI:'Niedersachsen',NW:'Nordrhein-Westfalen',RP:'Rheinland-Pfalz',SL:'Saarland',SN:'Sachsen',ST:'Sachsen-Anhalt',SH:'Schleswig-Holstein',TH:'Thüringen'};
  function loadOpts(){let o={showHolidays:true,showChallengeDots:true,showWeekNumbers:true};['change_v1_calendar_view_options','calendar_settings'].forEach(k=>{try{Object.assign(o,JSON.parse(localStorage.getItem(k)||'{}'))}catch(e){}});return o}
  function saveOpts(o){localStorage.setItem('change_v1_calendar_view_options',JSON.stringify(o));}
  function rangeOf(ev){let s=ev.startDate||ev.date||ev.start?.date||ev.start?.dateTime?.slice(0,10)||'',e=ev.endDate||ev.date||'';if(!e&&ev.end){e=ev.end.date||ev.end.dateTime?.slice(0,10)||s;if(ev.end.date&&e>s)e=key(add(parse(e),-1))}if(!e||e<s)e=s;return{start:s,end:e,isRange:s!==e}}
  function googleMark(ev){return ev.source==='google'?'<span class="cal-g" title="von Google">G</span>':(ev.googleEventId||ev.syncedToGoogle?'<span class="cal-g ok" title="an Google übertragen">✓</span>':'')}
  function allEvents(){const out=[];try{(window.events||events||[]).forEach(ev=>{const r=rangeOf(ev);out.push({...ev,date:r.start,startDate:r.start,endDate:r.end,source:ev.source||'local'})})}catch(e){}try{(window.gEvents||gEvents||[]).forEach(ge=>{let s=ge.start?.date||ge.start?.dateTime?.slice(0,10)||'';if(!s)return;let e=ge.end?.date||ge.end?.dateTime?.slice(0,10)||s;if(ge.end?.date&&e>s)e=key(add(parse(e),-1));out.push({id:'g_'+ge.id,title:ge.summary||'(Kein Titel)',date:s,startDate:s,endDate:e<s?s:e,time:ge.start?.dateTime?new Date(ge.start.dateTime).toTimeString().slice(0,5):'',endTime:ge.end?.dateTime?new Date(ge.end.dateTime).toTimeString().slice(0,5):'',color:'blue',type:'meeting',desc:ge.description||'',source:'google',googleEventId:ge.id})})}catch(e){}return out.filter(e=>e.date)}
  window.getAllEvents=allEvents; window.getEventById=id=>(window.events||[]).find(e=>e.id===id)||allEvents().find(e=>e.id===id);
  function eventsOn(k){return allEvents().filter(e=>{const r=rangeOf(e);return r.start<=k&&r.end>=k}).sort((a,b)=>{const ar=rangeOf(a),br=rangeOf(b);if(ar.isRange!==br.isRange)return ar.isRange?-1:1;if(ar.isRange&&br.isRange)return ar.start.localeCompare(br.start)||ar.end.localeCompare(br.end)||String(a.title).localeCompare(String(b.title));return (a.time||'99:99').localeCompare(b.time||'99:99')||String(a.title).localeCompare(String(b.title))})}
  function holidays(k){try{return getHolidaysForDate(k)||[]}catch(e){return[]}}
  function weekNo(dt){let d=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);let y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-y0)/DAY)+1)/7)}
  function challengePoints(k){try{if(typeof getChallengeDayStatus==='function'){const st=getChallengeDayStatus(k);if(st&&Number(st.points)>0)return{points:Number(st.points),done:!!st.allDone}}}catch(e){}try{const cs=(window.challenges||challenges||[]).filter(c=>c&&c.active!==false&&(c.recurrence==='daily'||(c.date||c.startDate||key(new Date()))===k));const pts=cs.reduce((s,c)=>s+(parseInt(c.points)||0),0);if(!pts)return null;let me='';try{me=getCurrentPlayerId()}catch(e){}const done=cs.filter(x=>(window.challengeCompletions||challengeCompletions||[]).some(c=>c.challengeId===x.id&&c.playerId===me&&c.date===k)).length;return{points:pts,done:done>=cs.length}}catch(e){return null}}
  function rangeTxt(ev,k){const r=rangeOf(ev);if(!r.isRange)return '';if(k===r.start)return '<span class="cal-range-text">'+esc(fmt(r.start).replace(/\.20\d\d$/,'')+'–'+fmt(r.end).replace(/\.20\d\d$/,''))+'</span>';return '<span class="cal-range-text muted">Zeitraum</span>'}
  function monthName(m){return (window.DE_MONTHS||window.monthNames||['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'])[m]}
  window.renderMonth=function(y,m){const grid=$('month-grid'),o=loadOpts();if(!grid)return;grid.className='month-grid-stacked month-grid-polished';grid.style.display='grid';grid.style.gridTemplateRows='repeat(6,1fr)';grid.innerHTML='';let first=new Date(y,m,1).getDay();first=first===0?6:first-1;const dim=new Date(y,m+1,0).getDate(),prevDim=new Date(y,m,0).getDate(),cells=[];for(let i=0;i<first;i++)cells.push({d:prevDim-first+1+i,m:m?m-1:11,y:m?y:y-1,other:true});for(let i=1;i<=dim;i++)cells.push({d:i,m,y,other:false});while(cells.length<42){const n=cells.length-first-dim+1;cells.push({d:n,m:m===11?0:m+1,y:m===11?y+1:y,other:true})}for(let w=0;w<6;w++){const row=document.createElement('div');row.className='cal-week-stacked cal-week-polished';cells.slice(w*7,w*7+7).forEach((c,i)=>{const dt=new Date(c.y,c.m,c.d),k=key(dt),hs=holidays(k),evs=eventsOn(k),pts=challengePoints(k),ordered=[...evs.filter(e=>rangeOf(e).isRange),...evs.filter(e=>!rangeOf(e).isRange)];const cell=document.createElement('div');cell.className='cal-day-stacked cal-day-polished'+(c.other?' other':'')+(i>4?' weekend':'')+((typeof isToday==='function'&&isToday(dt))?' today':'');cell.onclick=()=>{try{onDayClick(dt,evs)}catch(e){}};let html='<div class="cal-day-head"><span class="cal-day-num">'+c.d+'</span>'+(o.showHolidays&&hs.length?'<span class="cal-holiday-inline" title="'+esc(hs[0].name)+'">'+esc(hs[0].name)+'</span>':'')+'</div>';if(i===0&&o.showWeekNumbers)html+='<span class="cal-kw">KW '+weekNo(dt)+'</span>';html+='<div class="cal-event-stack">';ordered.slice(0,4).forEach(e=>{const r=rangeOf(e);html+='<button type="button" class="cal-event-chip '+esc(e.color||'blue')+(r.isRange?' is-range':'')+'" onclick="event.stopPropagation();openEventPanel(\''+esc(e.id||'')+'\')"><span class="cal-event-title">'+esc(e.title)+'</span>'+rangeTxt(e,k)+googleMark(e)+'</button>'});if(ordered.length>4)html+='<div class="cal-more">+'+(ordered.length-4)+' weitere</div>';html+='</div>';if(o.showChallengeDots&&pts&&pts.points>0)html+='<span class="cal-points '+(pts.done?'done':'')+'">+'+pts.points+'P</span>';cell.innerHTML=html;row.appendChild(cell)});grid.appendChild(row)}};
  window.renderYear=function(y){const grid=$('month-grid'),o=loadOpts();if(!grid)return;grid.className='year-grid-stacked';grid.style.display='grid';grid.style.gridTemplateRows='none';grid.innerHTML='';for(let m=0;m<12;m++){const card=document.createElement('button');card.type='button';card.className='year-card-stacked';card.onclick=()=>{window.curDate=curDate=new Date(y,m,1);window.currentCalView=currentCalView='month';renderCalendar()};let first=new Date(y,m,1).getDay();first=first===0?6:first-1;let html='<div class="year-title-stacked">'+monthName(m)+'</div><div class="year-days-stacked">';['M','D','M','D','F','S','S'].forEach(x=>html+='<b>'+x+'</b>');for(let i=0;i<first;i++)html+='<span></span>';const dim=new Date(y,m+1,0).getDate();for(let d=1;d<=dim;d++){const dt=new Date(y,m,d),k=key(dt),hasE=eventsOn(k).length>0,hasH=o.showHolidays&&holidays(k).length>0;html+='<span class="'+((typeof isToday==='function'&&isToday(dt))?'today ':'')+(hasE?'has-event ':'')+(hasH?'has-holiday ':'')+'">'+d+((hasE||hasH)?'<i></i>':'')+'</span>'}card.innerHTML=html+'</div>';grid.appendChild(card)}};
  window.renderCalendar=function(){const y=curDate.getFullYear(),m=curDate.getMonth(),ml=$('month-label'),grid=$('month-grid'),ag=$('agenda-view'),wd=$('wday-row');if(ml)ml.textContent=currentCalView==='year'?String(y):monthName(m)+' '+y;['year','month','workweek','today'].forEach(v=>$('vbtn-'+v)?.classList.toggle('active',currentCalView===v));if(ag)ag.style.display='none';if(currentCalView==='year'){if(wd)wd.style.display='none';renderYear(y)}else{if(wd)wd.style.display='grid';renderMonth(y,m)}if(grid)grid.style.display='grid'};
  window.navigate=function(dir){if(currentCalView==='year')window.curDate=curDate=new Date(curDate.getFullYear()+dir,0,1);else window.curDate=curDate=new Date(curDate.getFullYear(),curDate.getMonth()+dir,1);renderCalendar()}; window.goToday=function(){window.curDate=curDate=new Date();window.currentCalView=currentCalView='month';renderCalendar()}; window.setCalView=function(v){window.currentCalView=currentCalView=v;renderCalendar()};
  window.openCalendarSettings=function(){const o=loadOpts(),st=(window.calendarSettings&&calendarSettings.state)||localStorage.getItem('holiday_state')||'ALL';const opts=Object.entries(window.STATE_OPTIONS).map(([k,v])=>'<option value="'+esc(k)+'" '+(k===st?'selected':'')+'>'+esc(v)+'</option>').join('');const row=(title,id,on,sub)=>'<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">'+title+'</div>'+(sub?'<div class="toggle-sub">'+sub+'</div>':'')+'</div><label class="switch"><input type="checkbox" id="'+id+'" '+(on?'checked':'')+'><span class="slider"></span></label></div>';const html='<div class="fg"><label class="flabel">Bundesland für Feiertage</label><select class="finput" id="holiday-state">'+opts+'</select></div>'+row('Feiertage anzeigen','toggle-holidays',o.showHolidays,'')+row('Challenge-Punkte anzeigen','toggle-dots',o.showChallengeDots,'')+row('Kalenderwochen anzeigen','toggle-kw',o.showWeekNumbers,'')+'<button class="btn btn-primary btn-full" onclick="saveCalSettings()">Speichern</button>';if(typeof openPanel==='function')openPanel('Kalender-Einstellungen',html)};
  window.saveCalSettings=function(){const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked};saveOpts(o);try{if(!window.calendarSettings)window.calendarSettings={};calendarSettings.state=$('holiday-state')?.value||'ALL';if(typeof ls==='function'){ls('holiday_state',calendarSettings.state); localStorage.setItem('change_v1_holiday_state',calendarSettings.state);}else{localStorage.setItem('holiday_state',JSON.stringify(calendarSettings.state)); localStorage.setItem('change_v1_holiday_state',calendarSettings.state);}}catch(e){}if(typeof closePanel==='function')closePanel();renderCalendar();if(typeof toast==='function')toast('Kalender-Einstellungen gespeichert ✓','ok')};
  function fixToolbarTitles(){document.querySelectorAll('[onclick="openPushSettingsPanel()"], [title="Live- & Kalender-Sync"], [title="Push & Live-Sync"]').forEach(b=>b.setAttribute('title','Sync'));document.querySelectorAll('[onclick="openCalendarSettings()"]').forEach(b=>b.setAttribute('title','Kalender-Einstellungen'))}fixToolbarTitles();setInterval(fixToolbarTitles,1000);
  document.addEventListener('click',function(e){const btn=e.target.closest('[title="Kalender-Einstellungen"]');if(btn){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();openCalendarSettings()}},true);
  const style=document.createElement('style');style.id='calendar-polish-user-final-style';style.textContent=`.range-bar,.fx-range,.clean-range-row>.range-bar{display:none!important}.h-actions,.h-cal-controls{position:relative;z-index:80}.icon-btn{pointer-events:auto!important}.icon-btn[title="Kalender-Einstellungen"],.icon-btn[title="Sync"]{position:relative;z-index:90}#month-grid.month-grid-polished{overflow:hidden!important;background:#fff!important}.cal-week-polished{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr));min-height:122px;border-bottom:1px solid var(--b1);position:relative}.cal-day-polished{position:relative;min-width:0;padding:7px 8px 23px;background:#fff;border-right:1px solid var(--b1);overflow:hidden;cursor:pointer}.cal-day-polished.weekend{background:#fbfaf7}.cal-day-polished.other{opacity:.42}.cal-day-polished.today{box-shadow:inset 0 0 0 1px rgba(45,106,79,.25);background:#f7fbf9}.cal-day-head{display:flex;align-items:center;gap:6px;min-height:24px;padding-right:44px;min-width:0}.cal-day-num{font-size:13px;font-weight:850;color:var(--t2);line-height:1}.cal-day-polished.today .cal-day-num{display:inline-flex;align-items:center;justify-content:center;height:22px;min-width:22px;border-radius:999px;background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.22);color:var(--acc);padding:0 6px}.cal-holiday-inline{font-size:10px;font-weight:850;color:#b85f00;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.18);border-radius:999px;padding:2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 38px)}.cal-event-stack{display:flex;flex-direction:column;gap:3px;margin-top:5px}.cal-event-chip{height:20px;border:1px solid rgba(59,130,246,.17);background:rgba(59,130,246,.08);color:#2563eb;border-radius:7px;padding:0 6px;display:flex;align-items:center;gap:4px;min-width:0;text-align:left;font-size:11px;font-weight:760;line-height:18px;cursor:pointer}.cal-event-chip.is-range{order:-10;background:rgba(45,106,79,.09)!important;border-color:rgba(45,106,79,.18)!important;color:var(--acc)!important}.cal-event-chip.is-range:before{content:'↔';font-size:9px;font-weight:900;opacity:.65}.cal-event-chip.green{background:rgba(22,163,74,.10);border-color:rgba(22,163,74,.18);color:#15803d}.cal-event-chip.amber{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.20);color:#b45309}.cal-event-chip.red{background:rgba(239,68,68,.10);border-color:rgba(239,68,68,.18);color:#dc2626}.cal-event-chip.purple{background:rgba(124,58,237,.10);border-color:rgba(124,58,237,.18);color:#6d28d9}.cal-event-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.cal-range-text{font-size:9px;font-weight:850;opacity:.8;white-space:nowrap}.cal-range-text.muted{opacity:.55}.cal-g{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;font-size:8px;font-weight:900;color:#4285f4;background:rgba(66,133,244,.13);flex:0 0 auto}.cal-g.ok{color:var(--grn);background:var(--grn-d)}.cal-more{font-size:10px;font-weight:800;color:var(--t3);padding:1px 6px}.cal-points{position:absolute;right:7px;bottom:5px;z-index:8;font-size:10px;font-weight:900;color:var(--grn);background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.24);border-radius:999px;padding:2px 6px;line-height:1}.cal-points.done{background:rgba(45,106,79,.14);border-color:rgba(45,106,79,.24);color:var(--acc)}.cal-kw{position:absolute;left:7px;bottom:5px;z-index:8;font-size:10.5px;font-weight:900;color:var(--acc);background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.20);border-radius:999px;padding:2px 7px}.year-grid-stacked{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;padding:14px!important;overflow:auto!important}.year-card-stacked{background:#fff;border:1px solid var(--b1);border-radius:14px;padding:10px;text-align:left;cursor:pointer}.year-title-stacked{font-weight:850;font-size:13px;margin-bottom:7px}.year-days-stacked{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.year-days-stacked b,.year-days-stacked span{height:18px;font-size:9px;color:var(--t4);display:flex;align-items:center;justify-content:center;position:relative}.year-days-stacked span.today{background:var(--acc);color:white;border-radius:50%}.year-days-stacked span i{position:absolute;bottom:0;width:5px;height:5px;border-radius:50%;background:var(--acc)}.year-days-stacked span.has-holiday i{background:#f59e0b}.year-days-stacked span.has-event.has-holiday i{background:linear-gradient(90deg,var(--acc) 50%,#f59e0b 50%)}@media(max-width:800px){.cal-week-polished{min-height:110px}.year-grid-stacked{grid-template-columns:1fr!important}.cal-holiday-inline{max-width:62px}.cal-event-chip{font-size:10px;padding:0 4px}}`;document.head.appendChild(style);setTimeout(()=>{try{fixToolbarTitles();renderCalendar()}catch(e){console.warn('calendar polish failed',e)}},120);
})();


<!-- patched-daypanel-range-merge-2026-05-01 -->
(function(){
  'use strict';
  const DAY=86400000;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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
      html+='<div class="day-detail-list">'+evs.map(ev=>{ const r=rangeOf(ev); const isRange=r.start!==r.end; const sub=isRange?(fmt(r.start)+' – '+fmt(r.end)):(fmt(k)); return '<div class="day-detail-event" onclick="openEventPanel(\''+esc(ev.id||'')+'\')"><div class="day-detail-time">'+(timeOf(ev)||'Ganztägig')+'</div><div class="day-detail-main"><div class="day-detail-title">'+esc(titleOf(ev))+googleBadge(ev)+'</div><div class="day-detail-sub">'+esc(sub)+'</div></div></div>'; }).join('')+'</div>';
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


(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  window.renderMonth=function(y,m){const grid=$('month-grid'),o=loadOpts();if(!grid)return;grid.className='month-grid-stacked month-grid-polished';grid.style.display='grid';grid.style.gridTemplateRows='repeat(6,1fr)';grid.innerHTML='';let first=new Date(y,m,1).getDay();first=first===0?6:first-1;const dim=new Date(y,m+1,0).getDate(),prevDim=new Date(y,m,0).getDate(),cells=[];for(let i=0;i<first;i++)cells.push({d:prevDim-first+1+i,m:m?m-1:11,y:m?y:y-1,other:true});for(let i=1;i<=dim;i++)cells.push({d:i,m,y,other:false});while(cells.length<42){const n=cells.length-first-dim+1;cells.push({d:n,m:m===11?0:m+1,y:m===11?y+1:y,other:true})}for(let w=0;w<6;w++){const row=document.createElement('div');row.className='cal-week-stacked cal-week-polished';cells.slice(w*7,w*7+7).forEach((c,i)=>{const dt=new Date(c.y,c.m,c.d),k=key(dt),hs=holidays(k),evs=eventsOn(k),pts=challengePoints(k);const ranges=evs.filter(e=>rangeOf(e).isRange),singles=evs.filter(e=>!rangeOf(e).isRange);const ordered=[...ranges,...singles];const cell=document.createElement('div');cell.className='cal-day-stacked cal-day-polished'+(c.other?' other':'')+(i>4?' weekend':'')+((typeof isToday==='function'&&isToday(dt))?' today':'');cell.onclick=()=>{try{if(typeof onDayClick==='function')onDayClick(dt,evs)}catch(e){}};let html='<div class="cal-day-head"><span class="cal-day-num">'+c.d+'</span>'+(o.showHolidays&&hs.length?'<span class="cal-holiday-inline" title="'+esc(hs[0].name)+'">'+esc(hs[0].name)+'</span>':'')+'</div>';if(i===0&&o.showWeekNumbers)html+='<span class="cal-kw">KW '+weekNo(dt)+'</span>';html+='<div class="cal-event-stack">';ordered.slice(0,4).forEach(e=>{const cls='cal-event-chip '+esc(e.color||'blue')+rangeClass(e,k,i);html+='<button type="button" class="'+cls+'" onclick="event.stopPropagation();openEventPanel(\''+esc(e.id||'')+'\')"><span class="cal-event-title">'+rangeLabel(e,k,i)+'</span>'+googleMark(e)+'</button>'});if(ordered.length>4)html+='<div class="cal-more">+'+(ordered.length-4)+' weitere</div>';html+='</div>';if(o.showChallengeDots&&pts&&pts.points>0)html+='<span class="cal-points '+(pts.done?'done':'')+'">+'+pts.points+'P</span>';cell.innerHTML=html;row.appendChild(cell)});grid.appendChild(row)}};
  const oldOpenDay=window.openDayPanel;
  if(typeof oldOpenDay==='function'){
    window.openDayPanel=function(dt,dayEvs){oldOpenDay(dt,dayEvs);setTimeout(()=>{document.querySelectorAll('.day-detail-sub').forEach(el=>{el.textContent=el.textContent.replace(' · Zeitraum','')})},0)};
    window.onDayClick=function(dt,dayEvs){window.openDayPanel(dt,dayEvs||[])};
  }
  let st=document.getElementById('calendar-range-connected-clean-style');if(!st){st=document.createElement('style');st.id='calendar-range-connected-clean-style';document.head.appendChild(st)}
  st.textContent=`.cal-event-chip.is-range{order:-10;margin-left:-9px!important;margin-right:-9px!important;border-radius:0!important;background:rgba(45,106,79,.09)!important;border-color:rgba(45,106,79,.20)!important;color:var(--acc)!important;box-shadow:none!important}.cal-event-chip.is-range.range-start{margin-left:0!important;border-top-left-radius:8px!important;border-bottom-left-radius:8px!important}.cal-event-chip.is-range.range-end{margin-right:0!important;border-top-right-radius:8px!important;border-bottom-right-radius:8px!important}.cal-event-chip.is-range:not(.range-start) .cal-g{display:none}.cal-event-chip.is-range:not(.range-start) .cal-range-text{display:none}.cal-event-chip.is-range.range-mid .cal-event-title{color:transparent}.cal-event-chip.is-range.range-start .cal-event-title{color:var(--acc)}.cal-event-chip.is-range:before{content:none!important}.cal-range-text{font-size:9px;font-weight:850;opacity:.75;white-space:nowrap;margin-left:4px}`;
  setTimeout(()=>{try{if(typeof renderCalendar==='function')renderCalendar()}catch(e){console.warn('connected ranges failed',e)}},80);
})();


(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const DAY=86400000;
  const pad=n=>String(n).padStart(2,'0');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  function rangeLabel(ev,k,dow){const x=r(ev);if(!x.isRange)return esc(title(ev));const show=k===x.start||dow===0;return show?esc(title(ev)):''}
  function rangeCls(ev,k,dow){const x=r(ev);if(!x.isRange)return '';const st=k===x.start||dow===0,en=k===x.end||dow===6;return ' is-range '+(st?'range-start ':'range-mid ')+(en?'range-end ':'')}
  window.getAllEvents=allEvents;
  window.getEventById=function(id){return (window.events||[]).find(e=>String(e.id)===String(id))||allEvents().find(e=>String(e.id)===String(id)||String(e.googleEventId)===String(id))||null};
  window.renderMonth=function(y,m){const grid=$('month-grid'),o=opts();if(!grid)return;grid.className='month-grid-stacked month-grid-polished change-month-final';grid.style.display='grid';grid.style.gridTemplateRows='repeat(6,1fr)';grid.innerHTML='';let first=new Date(y,m,1).getDay();first=first===0?6:first-1;const dim=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate(),cells=[];for(let i=0;i<first;i++)cells.push({d:prev-first+1+i,m:m?m-1:11,y:m?y:y-1,other:true});for(let i=1;i<=dim;i++)cells.push({d:i,m,y,other:false});while(cells.length<42){const n=cells.length-first-dim+1;cells.push({d:n,m:m===11?0:m+1,y:m===11?y+1:y,other:true})}for(let w=0;w<6;w++){const row=document.createElement('div');row.className='cal-week-stacked cal-week-polished';cells.slice(w*7,w*7+7).forEach((c,i)=>{const dt=new Date(c.y,c.m,c.d),k=key(dt),hs=hol(k),evs=evsOn(k),pts=points(k);const cell=document.createElement('div');cell.className='cal-day-stacked cal-day-polished'+(c.other?' other':'')+(i>4?' weekend':'')+((typeof isToday==='function'&&isToday(dt))?' today':'');cell.onclick=()=>{try{onDayClick(dt,evs)}catch(e){}};let html='<div class="cal-day-head"><span class="cal-day-num">'+c.d+'</span>'+(o.showHolidays&&hs.length?'<span class="cal-holiday-inline" title="'+esc(hs.map(h=>h.name).join(', '))+'">'+esc(hs[0].name)+'</span>':'')+'</div>';if(i===0&&o.showWeekNumbers)html+='<span class="cal-kw">KW '+weekNo(dt)+'</span>';html+='<div class="cal-event-stack">';evs.slice(0,4).forEach(e=>{html+='<button type="button" class="cal-event-chip '+esc(e.color||'blue')+rangeCls(e,k,i)+'" onclick="event.stopPropagation();openEventPanel(\''+esc(e.id||'')+'\')"><span class="cal-event-title">'+rangeLabel(e,k,i)+'</span>'+google(e)+'</button>'});if(evs.length>4)html+='<div class="cal-more">+'+(evs.length-4)+' weitere</div>';html+='</div>';if(o.showChallengeDots&&pts>0)html+='<span class="cal-points done">+'+pts+'P</span>';cell.innerHTML=html;row.appendChild(cell)});grid.appendChild(row)}};
  window.renderCalendar=function(){if(window.currentCalView==='year')window.currentCalView='month';const y=curDate.getFullYear(),m=curDate.getMonth();const ml=$('month-label'),ag=$('agenda-view'),wd=$('wday-row'),grid=$('month-grid');if(ml){ml.textContent=monthNames[m]+' '+y;ml.onclick=window.openMonthYearPicker;ml.setAttribute('role','button');ml.title='Monat wechseln'}$('vbtn-year')?.remove();['month','workweek','today'].forEach(v=>$('vbtn-'+v)?.classList.toggle('active',v==='month'));if(ag)ag.style.display='none';if(wd)wd.style.display='grid';if(grid)grid.style.display='grid';window.renderMonth(y,m);try{if(typeof renderUpcoming==='function')renderUpcoming()}catch(e){}};
  window.setCalView=function(v){if(v==='year'||v==='today'||v==='workweek')v='month';window.currentCalView=currentCalView=v;window.renderCalendar()};
  window.navigate=function(dir){curDate=new Date(curDate.getFullYear(),curDate.getMonth()+dir,1);window.renderCalendar();try{if(typeof loadGoogleEvents==='function')loadGoogleEvents()}catch(e){}};
  window.goToday=function(){curDate=new Date();window.currentCalView=currentCalView='month';window.renderCalendar()};
  window.openMonthYearPicker=function(){const y=curDate.getFullYear(),m=curDate.getMonth();let html='<div class="month-picker"><div class="mp-years"><button class="btn btn-secondary btn-sm" onclick="changePickerYear(-1)">‹</button><strong id="mp-year">'+y+'</strong><button class="btn btn-secondary btn-sm" onclick="changePickerYear(1)">›</button></div><div class="mp-grid">';monthNames.forEach((n,i)=>html+='<button class="mp-month '+(i===m?'active':'')+'" onclick="selectPickerMonth('+i+')">'+esc(n)+'</button>');html+='</div></div>';window.__pickerYear=y;if(typeof openPanel==='function')openPanel('Monat wählen',html)};
  window.changePickerYear=function(d){window.__pickerYear=(window.__pickerYear||curDate.getFullYear())+d;const el=$('mp-year');if(el)el.textContent=window.__pickerYear};
  window.selectPickerMonth=function(m){curDate=new Date(window.__pickerYear||curDate.getFullYear(),m,1);currentCalView='month';if(typeof closePanel==='function')closePanel();window.renderCalendar()};
  function pushOn(){try{if(localStorage.getItem('change_push_enabled')==='0')return false;if(localStorage.getItem('change_push_enabled')==='1')return true;if(typeof ls==='function'&&ls('push_enabled')===false)return false}catch(e){}return typeof Notification!=='undefined'&&Notification.permission==='granted'}
  function setPush(v){try{localStorage.setItem('change_push_enabled',v?'1':'0');localStorage.setItem('change_v2_push_enabled',v?'true':'false');localStorage.setItem('change_v1_push_enabled',v?'true':'false');if(typeof ls==='function')ls('push_enabled',!!v)}catch(e){}}
  window.openNotifPanel=function(){try{if(typeof checkNotifications==='function')checkNotifications()}catch(e){}const perm=typeof Notification==='undefined'?'nicht unterstützt':Notification.permission,on=pushOn()&&perm==='granted';const notes=(window.notifications||[]).slice(0,8);let html='<div class="push-box bell-push-box visible"><div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">Push-Benachrichtigungen <span class="status-pill '+(on?'status-on':'status-off')+'">'+(on?'AKTIV':'INAKTIV')+'</span></div><div class="toggle-sub">Zentrale Steuerung über die Glocke · Browser: '+esc(perm)+'</div></div><label class="switch"><input type="checkbox" '+(on?'checked':'')+' onchange="togglePushFromBell(this.checked)"><span class="slider"></span></label></div><button class="btn btn-secondary btn-full" style="margin-top:12px" onclick="sendTestBellNotification()">Test-Benachrichtigung senden</button></div><div class="panel-notif-section"><div class="pns-title">Aktuelle Hinweise</div>';html+=notes.length?notes.map(n=>'<div class="nitem"><div class="nitem-icon" style="background:var(--acc-d)">🔔</div><div class="nitem-body"><div class="nitem-title">'+esc(n.title||'Benachrichtigung')+'</div><div class="nitem-sub">'+esc(n.date?fmt(n.date):(n.body||n.text||''))+'</div></div></div>').join(''):'<div class="dash-empty">Keine neuen Benachrichtigungen</div>';html+='</div>';if(typeof openPanel==='function')openPanel('Benachrichtigungen',html);const dot=$('notif-dot');if(dot)dot.style.display='none'};
  window.togglePushFromBell=async function(on){try{if(!on){setPush(false);if(typeof toast==='function')toast('Push-Benachrichtigungen deaktiviert','ok');window.openNotifPanel();return}if(typeof Notification==='undefined'){setPush(false);if(typeof toast==='function')toast('Push wird von diesem Browser nicht unterstützt','err');window.openNotifPanel();return}let p=Notification.permission;if(p!=='granted')p=await Notification.requestPermission();if(p==='granted'){setPush(true);try{if(typeof enablePushNotifications==='function')await enablePushNotifications();else if(typeof initFirebaseMessaging==='function')initFirebaseMessaging()}catch(e){}if(typeof toast==='function')toast('Push-Benachrichtigungen aktiviert','ok')}else{setPush(false);if(typeof toast==='function')toast('Push wurde im Browser nicht erlaubt','err')}window.openNotifPanel()}catch(e){console.warn('togglePushFromBell',e);if(typeof toast==='function')toast('Push konnte nicht geändert werden','err')}};
  window.sendTestBellNotification=function(){try{if(typeof Notification!=='undefined'&&Notification.permission==='granted'){new Notification('Change',{body:'Test-Benachrichtigung funktioniert.'});if(typeof toast==='function')toast('Test gesendet','ok')}else if(typeof toast==='function')toast('Bitte Push zuerst aktivieren','err')}catch(e){if(typeof toast==='function')toast('Test-Benachrichtigung nicht möglich','err')}};
  let st=$('change-user-fixes-4-style');if(!st){st=document.createElement('style');st.id='change-user-fixes-4-style';document.head.appendChild(st)}
  st.textContent='#vbtn-year,#vbtn-workweek,#vbtn-today{display:none!important}.bell-push-box.visible{display:block!important}.cal-event-chip.is-range{order:-20;margin-left:-9px!important;margin-right:-9px!important;border-radius:0!important;background:rgba(45,106,79,.09)!important;border-color:rgba(45,106,79,.20)!important;color:var(--acc)!important}.cal-event-chip.is-range.range-start{margin-left:0!important;border-top-left-radius:8px!important;border-bottom-left-radius:8px!important}.cal-event-chip.is-range.range-end{margin-right:0!important;border-top-right-radius:8px!important;border-bottom-right-radius:8px!important}.cal-event-chip.is-range.range-mid .cal-event-title{color:transparent}.cal-points{position:absolute!important;right:7px!important;bottom:6px!important;top:auto!important;left:auto!important;max-width:56px!important;font-size:10px!important;line-height:1!important;font-weight:900!important;padding:3px 6px!important;border-radius:999px!important;color:var(--grn)!important;background:rgba(52,211,153,.13)!important;border:1px solid rgba(52,211,153,.22)!important;z-index:8!important;pointer-events:none!important}.month-picker{padding:4px 0}.mp-years{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:16px}.mp-years strong{font-size:18px}.mp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.mp-month{border:1px solid var(--b1);background:var(--s1);border-radius:12px;padding:12px 8px;font-weight:800;color:var(--t2);cursor:pointer}.mp-month.active,.mp-month:hover{background:var(--acc-d);color:var(--acc);border-color:rgba(45,106,79,.22)}';
  setTimeout(()=>{try{window.renderCalendar()}catch(e){console.warn('change-user-fixes-4',e)}},120);
})();


/* ═══════════════════════════════════════════════════════════
   CHANGE · FINAL OVERRIDE
   Echte durchgehende Zeitraum-Balken im Monatskalender.
   Dashboard: Zeitraum-Events dedupliziert, übersichtlich.
   Dieses Script ist das LETZTE und überschreibt alle vorherigen renderMonth / buildDashCards.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    if (ev?.googleEventId || ev?.syncedToGoogle || ev?.googleSyncedAt) {
      return '<span class="cfx-gmark ok" title="lokal vorhanden">✓</span><span class="cfx-gmark" title="mit Google Kalender verbunden">G</span>';
    }
    return '';
  }

  /* ── ALLE EVENTS (dedupliziert, mit startDate/endDate) ── */
  function allEvents() {
    const out = [], seen = new Set();
    function add(ev, src) {
      const r = getRange(ev); if (!r.start) return;
      const rawId = String(ev.id || ev.googleEventId || '');
      const googleId = ev.googleEventId || (src === 'google' ? rawId.replace(/^g_/, '') : '');
      const titleKey = String(getTitle(ev) || '').trim().toLowerCase();
      const timeKey = ev.time || (ev.start?.dateTime ? new Date(ev.start.dateTime).toTimeString().slice(0,5) : '');
      const key = googleId ? ('g:' + googleId) : ('l:' + (ev.id || (titleKey + '|' + r.start + '|' + r.end + '|' + timeKey)));
      if (seen.has(key)) return; seen.add(key);
      const id = src === 'google' ? (rawId.startsWith('g_') ? rawId : 'g_' + rawId) : ev.id;
      out.push(Object.assign({}, ev, { id, googleEventId: googleId || ev.googleEventId || '', date: r.start, startDate: r.start, endDate: r.end, source: src,
        time: ev.time || (ev.start?.dateTime ? new Date(ev.start.dateTime).toTimeString().slice(0,5) : '') }));
    }
    try { (window.events || []).forEach(ev => add(ev, ev.source || 'local')); } catch (e) {}
    try {
      if (window.googleCalendarSyncEnabled !== false && localStorage.getItem('change_v1_google_calendar_sync') !== 'false')
        (window.gEvents || []).forEach(ge => add(ge, 'google'));
    } catch (e) {}
    return out.sort((a, b) => a.startDate.localeCompare(b.startDate) || daysFrom(b.startDate, b.endDate) - daysFrom(a.startDate, a.endDate));
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

  /* ── LAYOUT-ALGORITHMUS: Balken auf Wochen-Ebene ── */
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
      if (lane > 2) continue; // max 3 Zeilen
      lanes[lane] = eIdx;
      result.push({ ev, sIdx, eIdx, span: eIdx - sIdx + 1, lane,
        contLeft: r.start < wStart, contRight: r.end > wEnd,
        showTitle: r.start >= wStart });
    }
    return result;
  }

  /* ── MONATS-ZELLEN BAUEN ── */
  function buildCells(y, m) {
    let first = new Date(y,m,1).getDay(); first = first===0?6:first-1;
    const dim = new Date(y,m+1,0).getDate(), prev = new Date(y,m,0).getDate(), cells = [];
    for (let i=0;i<first;i++) cells.push({d:prev-first+1+i, m:m?m-1:11, y:m?y:y-1, other:true});
    for (let i=1;i<=dim;i++) cells.push({d:i, m, y, other:false});
    while (cells.length<42) { const n=cells.length-first-dim+1; cells.push({d:n, m:m===11?0:m+1, y:m===11?y+1:y, other:true}); }
    return cells;
  }

  /* ── RENDERMONTH (FINAL) ── */
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
        cell.innerHTML = html; row.appendChild(cell);
      });

      /* Balken (Week-Level Grid, überspannen mehrere Spalten) */
      layoutWeek(wDates).forEach(seg => {
        const ev = seg.ev, r = getRange(ev);
        const bar = document.createElement('button');
        bar.type = 'button';
        bar.className = 'cfx-bar ' + getColor(ev) + (seg.contLeft?' cl':'') + (seg.contRight?' cr':'');
        bar.style.gridColumn = (seg.sIdx+1) + ' / span ' + seg.span;
        bar.style.setProperty('--cfx-lane', String(seg.lane));
        bar.title = getTitle(ev) + (r.isRange ? ' · '+fmt(r.start)+' – '+fmt(r.end) : (ev.time?' · '+ev.time:''));
        bar.onclick = e => { e.stopPropagation(); try { if(typeof openEventPanel==='function') openEventPanel(ev.id); } catch(ex){} };
        bar.innerHTML = '<span class="cfx-bt">'+(seg.showTitle?esc(getTitle(ev)):'')+'</span>'+gMark(ev);
        row.appendChild(bar);
      });

      grid.appendChild(row);
    }
  };

  /* ── CSS INJECTION ── */
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
/* ─── Balken ─── */
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

  /* ── DASHBOARD ── */
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
        <div class="dash-card-body">${calHtml}</div>
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


(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const parse=k=>new Date(String(k).slice(0,10)+'T12:00:00');
  const todayKey=()=>key(new Date());
  const addDays=(k,n)=>{const d=parse(k);d.setDate(d.getDate()+n);return key(d)};
  const diff=k=>Math.round((parse(k)-parse(todayKey()))/86400000);
  const fmt=k=>parse(k).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
  const fmtLong=k=>parse(k).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'});
  const evStart=e=>String(e?.date||e?.startDate||e?.dateKey||e?.start?.date||(e?.start?.dateTime?e.start.dateTime.slice(0,10):'')||'').slice(0,10);
  const evEnd=e=>{let x=String(e?.endDate||e?.toDate||e?.untilDate||'').slice(0,10); if(!x&&e?.end?.date){const d=parse(e.end.date);d.setDate(d.getDate()-1);x=key(d)} if(!x&&e?.end?.dateTime)x=String(e.end.dateTime).slice(0,10); const s=evStart(e); return (!x||x<s)?s:x};
  const evTitle=e=>e?.title||e?.summary||e?.name||'Termin';
  const evTime=e=>e?.time||(e?.start?.dateTime?new Date(e.start.dateTime).toTimeString().slice(0,5):'');
  function allEvents(){try{return typeof getAllEvents==='function'?getAllEvents():(window.events||[])}catch(e){return window.events||[]}}
  function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da,12)}
  function fallbackHolidays(k){const d=parse(k),y=d.getFullYear(),md=pad(d.getMonth()+1)+'-'+pad(d.getDate()),out=[],fixed={'01-01':'Neujahr','05-01':'Tag der Arbeit','10-03':'Tag der Deutschen Einheit','12-25':'1. Weihnachtstag','12-26':'2. Weihnachtstag'}; if(fixed[md])out.push({name:fixed[md],states:['ALL']}); const es=easter(y); [[-2,'Karfreitag'],[1,'Ostermontag'],[39,'Christi Himmelfahrt'],[50,'Pfingstmontag']].forEach(([o,n])=>{const x=new Date(es);x.setDate(x.getDate()+o);if(key(x)===k)out.push({name:n,states:['ALL']})}); return out}
  function holidays(k){let hs=[];try{if(typeof getHolidaysForDate==='function')hs=getHolidaysForDate(k)||[]}catch(e){} const m=new Map(); hs.concat(fallbackHolidays(k)).forEach(h=>{if(h?.name&&!m.has(h.name))m.set(h.name,h)}); return [...m.values()]}
  function hRows(){const td=todayKey(),a=[];for(let i=0;i<=14;i++){const k=addDays(td,i);holidays(k).forEach(h=>a.push({kind:'holiday',date:k,start:k,end:k,sort:k,holiday:h}))}return a}
  function eRows(){const td=todayKey(),lim=addDays(td,14),seen=new Set(),a=[];allEvents().forEach(e=>{const s=evStart(e),en=evEnd(e);if(!s||en<td||s>lim)return;const id=(e.googleEventId?'g:'+e.googleEventId:(e.id||evTitle(e)+s+en));if(seen.has(id))return;seen.add(id);a.push({kind:'event',ev:e,date:s<td?td:s,start:s,end:en,sort:s<td?td:s})});return a.sort((a,b)=>a.sort.localeCompare(b.sort)||String(evTime(a.ev)).localeCompare(String(evTime(b.ev)))).slice(0,6)}
  function rows(){return hRows().concat(eRows()).sort((a,b)=>a.sort.localeCompare(b.sort)||(a.kind==='holiday'?-1:1)).slice(0,8)}
  function dateBlock(r){const td=todayKey(),isT=(r.start<=td&&r.end>=td),d=diff(r.date),top=isT?'Heute':(d===1?'Morgen':fmt(r.date)),bot=isT?fmt(r.date):fmtLong(r.date).replace('.','');return '<div class="dash-date-block '+(isT?'is-today':'')+'"><div>'+esc(top)+'</div><span>'+esc(bot)+'</span></div>'}
  function calHtml(){const rs=rows();if(!rs.length)return '<div class="dash-empty compact-empty">Keine Termine oder Feiertage</div>';return rs.map(r=>{if(r.kind==='holiday')return '<div class="dash-row compact-row dashboard-calendar-row holiday-row" onclick="setMainView(\'calendar\')">'+dateBlock(r)+'<div class="dash-row-icon" style="background:var(--amb-d)">🎉</div><div class="dash-row-body"><div class="dash-row-title">'+esc(r.holiday.name)+' <span class="holiday-mini-badge">Feiertag</span></div><div class="dash-row-sub">'+esc(fmtLong(r.date))+'</div></div></div>';const range=r.end&&r.end!==r.start,sub=range?fmt(r.start)+' – '+fmt(r.end):(fmtLong(r.start)+(evTime(r.ev)?' · '+esc(evTime(r.ev)):''));return '<div class="dash-row compact-row dashboard-calendar-row '+((r.start<=todayKey()&&r.end>=todayKey())?'dash-today-row':'')+'" onclick="setMainView(\'calendar\')">'+dateBlock(r)+'<div class="dash-row-icon" style="background:var(--acc-d)">📅</div><div class="dash-row-body"><div class="dash-row-title">'+esc(evTitle(r.ev))+'</div><div class="dash-row-sub">'+sub+'</div></div></div>'}).join('')}
  function challengeHtml(){const td=todayKey();try{const me=String(window.userInfo?.email||'').toLowerCase(),done=new Set((window.challengeCompletions||[]).filter(c=>String(c.date||'')===td&&(!me||String(c.userEmail||c.playerId||c.email||'').toLowerCase()===me)).map(c=>c.challengeId)),chs=(window.challenges||[]).filter(c=>c&&c.active!==false&&(c.recurrence==='daily'||!c.date||String(c.date||c.startDate||'').slice(0,10)===td)).slice(0,4);if(!chs.length)return '<div class="dash-empty compact-empty">Heute keine Challenges</div>';return chs.map(ch=>'<div class="dash-row compact-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--pur-d)">'+esc(ch.icon||'🏆')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(ch.title||ch.name||'Challenge')+'</div><div class="dash-row-sub">'+(parseInt(ch.points,10)||0)+' Punkte</div></div><span class="dash-row-badge '+(done.has(ch.id)?'badge-green':'badge-amber')+'">'+(done.has(ch.id)?'✓':'offen')+'</span></div>').join('')}catch(e){return '<div class="dash-empty compact-empty">Heute keine Challenges</div>'}}
  function playersHtml(){try{const ps=(typeof getVisibleContestPlayers==='function'?getVisibleContestPlayers():(window.challengePlayers||[])).slice(0,4),me=String(window.userInfo?.email||'').toLowerCase();if(!ps.length)return '<div class="dash-empty compact-empty">Noch keine Mitspieler</div>';return ps.map((p,i)=>{const id=String(p.email||p.id||'').toLowerCase(),st=typeof getPlayerPointSummary==='function'?getPlayerPointSummary(id):{totalPoints:0,todayPoints:0},medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);return '<div class="dash-row compact-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--amb-d)">'+medal+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(p.name||p.email||'Mitspieler')+(id===me?' · Du':'')+'</div><div class="dash-row-sub">Heute '+(st.todayPoints||0)+' P · Gesamt '+(st.totalPoints||0)+' P</div></div><span class="dash-row-badge badge-green">'+(st.totalPoints||0)+' P</span></div>'}).join('')}catch(e){return '<div class="dash-empty compact-empty">Noch keine Mitspieler</div>'}}
  function inject(){if($('dashboard-calm-compact-style'))return;const st=document.createElement('style');st.id='dashboard-calm-compact-style';st.textContent=`#kpi-grid{display:none!important}#dashboard-view{padding:18px 18px 24px!important}.dash-grid{display:grid!important;grid-template-columns:minmax(380px,.82fr) minmax(460px,1.18fr)!important;gap:16px!important;align-items:start!important}.calendar-card{grid-column:auto!important}.dash-card{border-radius:18px!important;box-shadow:0 2px 12px rgba(0,0,0,.05)!important}.dash-card-head{padding:12px 16px!important}.dash-card-body{max-height:340px!important;overflow:auto!important}.calendar-card .dash-card-body{max-height:340px!important}.dashboard-combined-card .dash-card-body{max-height:340px!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:0!important;padding:0!important}.dashboard-section{min-width:0!important}.dashboard-section+.dashboard-section{border-left:1px solid var(--b1)!important}.dashboard-section-head{padding:10px 14px 7px!important;font-size:12px!important;font-weight:800!important;color:var(--t2)!important}.compact-row{padding:10px 14px!important;min-height:48px!important;gap:10px!important}.compact-row .dash-row-icon{width:30px!important;height:30px!important;border-radius:9px!important;font-size:13px!important}.compact-row .dash-row-title{font-size:13px!important}.compact-row .dash-row-sub{font-size:11px!important}.compact-row .dash-row-badge{font-size:10.5px!important;padding:3px 7px!important}.dashboard-calendar-row{align-items:center!important}.dash-date-block{width:54px!important;flex:0 0 54px!important;text-align:left!important;font-size:11px!important;font-weight:850!important;color:var(--t2)!important;line-height:1.05!important}.dash-date-block span{display:block!important;margin-top:3px!important;font-size:9.5px!important;font-weight:700!important;color:var(--t5)!important}.dash-date-block.is-today div,.dash-date-block.is-today span{color:var(--acc)!important}.dash-today-row{background:rgba(45,106,79,.055)!important;box-shadow:inset 3px 0 0 var(--acc)!important}.holiday-row{background:rgba(245,158,11,.075)!important;box-shadow:inset 3px 0 0 var(--amb)!important}.holiday-mini-badge{display:inline-flex!important;margin-left:6px!important;padding:1px 6px!important;border-radius:999px!important;background:rgba(245,158,11,.14)!important;color:#b85f00!important;border:1px solid rgba(245,158,11,.22)!important;font-size:10px!important;font-weight:800!important}.compact-empty{padding:22px 14px!important;font-size:12px!important}@media(max-width:900px){.dash-grid{grid-template-columns:1fr!important}.dashboard-combined-card .dash-card-body{grid-template-columns:1fr!important}.dashboard-section+.dashboard-section{border-left:0!important;border-top:1px solid var(--b1)!important}.calendar-card .dash-card-body,.dashboard-combined-card .dash-card-body{max-height:none!important}}`;document.head.appendChild(st)}
  window.buildDashCards=function(){const grid=$('dash-grid');if(!grid)return;inject();grid.innerHTML='<div class="dash-card calendar-card"><div class="dash-card-head"><div><div class="dash-card-title">📅 Kalender</div><div class="dash-card-sub">Heute + nächste Tage</div></div></div><div class="dash-card-body">'+calHtml()+'</div></div><div class="dash-card dashboard-combined-card"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenges & 👥 Mitspieler</div><div class="dash-card-sub">Heute und Rangliste</div></div></div><div class="dash-card-body"><div class="dashboard-section"><div class="dashboard-section-head"><span>Challenges</span></div>'+challengeHtml()+'</div><div class="dashboard-section"><div class="dashboard-section-head"><span>Mitspieler</span></div>'+playersHtml()+'</div></div></div>'};
  window.buildDashboard=function(){try{const n=(window.userInfo&&userInfo.name)||'',h=$('dash-greeting');if(h)h.textContent=(new Date().getHours()<12?'Guten Morgen':new Date().getHours()<17?'Guten Tag':'Guten Abend')+(n?', '+n.split(' ')[0]:'');const s=$('dash-sub');if(s)s.textContent='Kalender, Challenges und Mitspieler auf einen Blick'}catch(e){}window.buildDashCards()};
  setTimeout(()=>{try{window.buildDashboard()}catch(e){}},150);
})();


(function(){
  'use strict';
  const pad=n=>String(n).padStart(2,'0');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parse=k=>new Date(String(k).slice(0,10)+'T12:00:00');
  const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const add=(k,n)=>{const d=parse(k);d.setDate(d.getDate()+n);return key(d);};
  const fmt=k=>{try{return parse(k).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return String(k||'');}};
  const weekday=k=>{try{return parse(k).toLocaleDateString('de-DE',{weekday:'long'});}catch(e){return '';}};
  const dkey=v=>v instanceof Date?key(v):String(v||'').slice(0,10);
  const titleOf=e=>String(e?.title||e?.summary||e?.name||'Termin').replace(/\bZeitraum\b\s*:?/gi,'').replace(/\s{2,}/g,' ').trim();
  const timeOf=e=>{ if(e?.time) return e.time; if(e?.start?.dateTime) return new Date(e.start.dateTime).toTimeString().slice(0,5); return ''; };
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
    if(evs.length) html+='<div class="day-detail-list">'+evs.map(ev=>{const r=rangeOf(ev), sub=r.isRange?(fmt(r.start)+' – '+fmt(r.end)):fmt(k), id=esc(ev.id||ev.googleEventId||''), g=(ev.source==='google')?' <span class="cal-g" title="von Google">G</span>':(ev.googleEventId||ev.syncedToGoogle||ev.googleSyncedAt)?' <span class="cal-g ok" title="lokal vorhanden">✓</span> <span class="cal-g" title="mit Google Kalender verbunden">G</span>':''; return '<div class="day-detail-event" onclick="openEventPanel(\''+id+'\')"><div class="day-detail-time">'+(timeOf(ev)||'Ganztägig')+'</div><div class="day-detail-main"><div class="day-detail-title">'+esc(titleOf(ev))+g+'</div><div class="day-detail-sub">'+esc(sub)+'</div></div></div>';}).join('')+'</div>'; else html+='<div class="day-detail-empty">Keine Termine für diesen Tag</div>';
    html+='<button class="btn btn-primary btn-full day-detail-add" onclick="window.__openNewEventForDay&&window.__openNewEventForDay(\''+k+'\')">+ Neuer Termin für diesen Tag</button>';
    window.__openNewEventForDay=function(day){if(typeof window.openEventPanel==='function')window.openEventPanel(null,parse(day));};
    if(typeof window.openPanel==='function')window.openPanel(title,html);
  };
  window.onDayClick=function(dt,dayEvs){window.openDayPanel(dt,dayEvs||[]);};
})();


(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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
    const name=String((fu&&fu.displayName)||u.name||u.displayName||email||'Mitspieler').trim();
    const picture=(fu&&fu.photoURL)||u.picture||u.photoURL||'';
    return {id:email||uid||'local-authenticated-user',email,uid,name,picture};
  }
  function playerKey(p){return norm(p&&((p.email)||(p.userEmail)||(p.id)||(p.uid)))}
  function badPlayer(p){const t=norm([p&&p.name,p&&p.email,p&&p.id].join(' '));return !t||/demo|demo@example|local-user|google-user|ich\s*·\s*du|^du$|^ich$/.test(t)}
  function completionKey(c){let k=norm(c&&((c.userEmail)||(c.email)||(c.playerEmail)||(c.playerId)||(c.userId))); if(!k||['du','ich','me','local-user','google-user'].includes(k)) k=account().id; return k;}
  function canonicalPlayers(){
    const a=account(), map=new Map();
    if(a.id) map.set(a.id,{id:a.id,email:a.email||a.id,uid:a.uid,name:a.name,picture:a.picture,online:true});
    [window.challengePlayers,read('challenge_players',[]),read('challengePlayers',[]),read('changePlayers',[]),read('players',[])].flat().forEach(p=>{if(!p||badPlayer(p))return;const k=playerKey(p);if(!k)return;map.set(k,Object.assign({},map.get(k)||{},p,{id:k,email:p.email||k,name:p.name||p.displayName||p.email||k}));});
    (window.challengeCompletions||read('challenge_completions',[])||read('challengeCompletions',[])||[]).forEach(c=>{const k=completionKey(c); if(!k||['du','ich','me','local-user','google-user'].includes(k))return; if(!map.has(k)) map.set(k,{id:k,email:k,name:c.playerName||c.userName||k});});
    const arr=[...map.values()].filter(p=>!badPlayer(p));
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
  function ensureOptional(list){const have=t=>list.some(c=>norm(c.title||c.name).includes(t)); const out=list.slice(); if(!have('spazieren'))out.push({id:'sport_walk_10_optional',title:'10 Minuten spazieren gehen',name:'10 Minuten spazieren gehen',points:15,icon:'🚶',desc:'Gehe 10 Minuten locker spazieren.',optional:true,active:true,category:'sport'}); if(!have('fitness'))out.push({id:'sport_fitness_30_optional',title:'Fitness gehen · mindestens 30 Minuten',name:'Fitness gehen · mindestens 30 Minuten',points:30,icon:'🏋️',desc:'Leichtes bis mittleres Training für mindestens 30 Minuten.',optional:true,active:true,category:'sport'}); return out;}
  function dailyChallenges(){const all=ensureOptional(allChallenges()); const normal=all.filter(c=>!c.optional&&!/spazier|fitness/i.test(c.title||c.name||'')); const optional=all.filter(c=>c.optional||/spazier|fitness/i.test(c.title||c.name||'')); let saved=read('change_daily_sports',null); const td=today(); if(!saved||saved.date!==td){let seed=parseInt(td.replace(/-/g,''),10)||1; const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280}; const ids=normal.slice().sort(()=>rnd()-.5).slice(0,7).map(c=>c.id); saved={date:td,ids}; write('change_daily_sports',saved);} const map=new Map(all.map(c=>[String(c.id),c])); const seven=(saved.ids||[]).map(id=>map.get(String(id))).filter(Boolean); return seven.concat(optional.filter(o=>!seven.some(x=>x.id===o.id)));}
  function challengeById(id){return dailyChallenges().find(c=>String(c.id)===String(id))||allChallenges().find(c=>String(c.id)===String(id));}
  function done(id){const a=account(),td=today();return completions().some(c=>String(c.challengeId)===String(id)&&String(c.date||'').slice(0,10)===td&&completionKey(c)===a.id)}
  function weekDates(){const d=new Date();const day=(d.getDay()+6)%7;const mon=new Date(d);mon.setDate(d.getDate()-day);return Array.from({length:7},(_,i)=>{const x=new Date(mon);x.setDate(mon.getDate()+i);return x;});}
  function pointsForDate(k){const a=account();let s=0;completions().forEach(c=>{if(String(c.date||'').slice(0,10)===k&&completionKey(c)===a.id)s+=parseInt(c.points,10)||0});return s;}
  function renderWeekBar(){return '<div id="challenge-week-bar-clean" class="challenge-week-card"><div class="challenge-card-head"><div><div class="challenge-title">Punkte-Woche</div><div class="challenge-sub">Mo–So · erledigte Challenge-Punkte</div></div></div><div class="challenge-week-grid">'+weekDates().map(d=>{const k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),p=pointsForDate(k),is=k===today();return '<div class="challenge-week-day '+(is?'today is-today':'')+' '+(p?'has-points':'empty')+'"><div class="cwd-name challenge-week-day-name">'+['Mo','Di','Mi','Do','Fr','Sa','So'][(d.getDay()+6)%7]+'</div><div class="cwd-date challenge-week-day-date">'+d.getDate()+'.</div><div class="cwd-points challenge-week-day-points">'+(p?p+' P':'–')+'</div></div>'}).join('')+'</div></div>';}
  function ensureWeekBar(){const view=$('challenges-view'); if(!view)return; let bar=$('challenge-week-bar-clean'); if(!bar){bar=document.createElement('div');bar.id='challenge-week-bar-clean'; const layout=view.querySelector('.challenge-layout'); view.insertBefore(bar,layout||view.firstChild);} bar.outerHTML=renderWeekBar();}
  window.getVisibleContestPlayers=canonicalPlayers;
  window.getCurrentPlayerId=()=>account().id;
  window.getPlayerPointSummary=id=>stats(id||account().id);
  window.getChallengePointsForDate=k=>pointsForDate(String(k).slice(0,10));
  window.getChallengeDayStatus=k=>{const p=pointsForDate(String(k).slice(0,10));return p?{points:p,done:true,allDone:true}:null};
  window.renderChallenges=function(){
    canonicalPlayers();completions();ensureWeekBar();
    const list=$('challenges-list'), board=$('leaderboard-list'); if(!list||!board)return;
    const rows=dailyChallenges(), normal=rows.filter(c=>!(c.optional||/spazier|fitness/i.test(c.title||c.name||''))), optional=rows.filter(c=>c.optional||/spazier|fitness/i.test(c.title||c.name||''));
    const row=ch=>{const is=done(ch.id),pts=parseInt(ch.points,10)||0,opt=ch.optional||/spazier|fitness/i.test(ch.title||ch.name||''),url=opt?'':(ch.url||ch.video||ch.youtube||ch.youtubeUrl||ch.link||('https://www.youtube.com/results?search_query='+encodeURIComponent((ch.title||ch.name||'Sportübung')+' richtige Ausführung')));return '<div class="challenge-item '+(is?'challenge-done':'')+'"><div class="challenge-icon">'+esc(ch.icon||'🏆')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title||ch.name||'Sportübung')+'</div><div class="challenge-meta">'+esc(ch.desc||'')+' · '+pts+' Punkte</div>'+(url?'<a class="challenge-meta" href="'+esc(url)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">So geht die Übung</a>':'')+'</div><span class="points-pill">+'+pts+'</span>'+(is?'<button class="btn btn-success btn-sm" disabled>Erledigt</button><button type="button" class="btn btn-undo btn-sm" title="Heute rückgängig machen" onclick="window.undoChallenge(\''+esc(ch.id)+'\')">↶</button>':'<button type="button" class="btn btn-primary btn-sm" onclick="window.completeChallenge(\''+esc(ch.id)+'\')">Erledigen</button>')+'</div>'};
    list.innerHTML=normal.map(row).join('')+(optional.length?'<div class="section-label" style="padding:14px 16px 6px">Optionale Sportpunkte</div>'+optional.map(row).join(''):'');
    const players=canonicalPlayers().sort((a,b)=>stats(playerKey(b)).totalPoints-stats(playerKey(a)).totalPoints);
    board.innerHTML=players.length?players.map((p,i)=>{const id=playerKey(p),s=stats(id),med=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);return '<div class="leader-row clickable" onclick="window.openPlayerRecentPanel&&window.openPlayerRecentPanel(\''+esc(id)+'\',\''+esc(p.name||p.email||id)+'\')"><div class="leader-rank">'+med+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+(p.online?'<span class="live-dot"></span>':'')+'</div><div class="leader-detail">Heute: '+s.todayPoints+' P · Gesamt: '+s.totalPoints+' P · '+s.totalCount+' erledigt</div></div><div class="leader-score">'+s.totalPoints+'</div></div>'}).join(''):'<div class="dash-empty">Noch keine Mitspieler</div>';
  };
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
  window.buildDashboard=function(){const h=$('dash-greeting'),s=$('dash-sub'),grid=$('dash-grid');if(h){const a=account(),hr=new Date().getHours();h.textContent=(hr<12?'Guten Morgen':hr<17?'Guten Tag':'Guten Abend')+(a.name&&a.name!=='Mitspieler'?', '+a.name.split(' ')[0]:'')}if(s)s.textContent='Kalender, Challenges und Mitspieler auf einen Blick';if(!grid)return;const ev=dashRows().map(r=>{const isH=r.type==='holiday';return '<div class="dash-row compact-row" onclick="setMainView(\'calendar\')"><div class="dash-row-icon" style="background:'+(isH?'var(--amb-d)':'var(--acc-d)')+'">'+(isH?'🎉':'📅')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(r.title)+(isH?' <span class="dash-holiday-pill">Feiertag</span>':'')+'</div><div class="dash-row-sub">'+esc(r.date.split('-').reverse().join('.'))+'</div></div></div>'}).join('')||'<div class="dash-empty compact-empty">Keine Termine oder Feiertage</div>';const ch=dailyChallenges().filter(c=>!done(c.id)).slice(0,4).map(c=>'<div class="dash-row compact-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--amb-d)">'+esc(c.icon||'🏆')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(c.title||c.name)+'</div><div class="dash-row-sub">'+(parseInt(c.points,10)||0)+' Punkte</div></div><span class="dash-row-badge">offen</span></div>').join('')||'<div class="dash-empty compact-empty">Heute erledigt</div>';const pl=canonicalPlayers().sort((a,b)=>stats(playerKey(b)).totalPoints-stats(playerKey(a)).totalPoints).slice(0,4).map((p,i)=>{const id=playerKey(p),st=stats(id),med=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);return '<div class="dash-row compact-row" onclick="setMainView(\'challenges\')"><div class="dash-row-icon" style="background:var(--amb-d)">'+med+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(p.name||p.email||'Mitspieler')+'</div><div class="dash-row-sub">Heute '+st.todayPoints+' P · Gesamt '+st.totalPoints+' P</div></div></div>'}).join('')||'<div class="dash-empty compact-empty">Noch keine Mitspieler</div>';grid.innerHTML='<div class="dash-card calendar-card"><div class="dash-card-head"><div><div class="dash-card-title">📅 Kalender</div><div class="dash-card-sub">Heute · Feiertage · nächste Termine</div></div></div><div class="dash-card-body">'+ev+'</div></div><div class="dash-card dashboard-combined-card"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenges & 👥 Mitspieler</div><div class="dash-card-sub">Heute und Rangliste</div></div></div><div class="dash-card-body"><div class="dashboard-section"><div class="dashboard-section-head"><span>Challenges</span></div>'+ch+'</div><div class="dashboard-section"><div class="dashboard-section-head"><span>Mitspieler</span></div>'+pl+'</div></div></div>'};
  function installStyle(){let st=$('change-step7-style');if(!st){st=document.createElement('style');st.id='change-step7-style';document.head.appendChild(st)}st.textContent='.demo-btn,[onclick="startDemo()"],button[onclick="startDemo()"]{display:none!important}#challenge-week-bar-clean{display:block!important;flex:0 0 auto;margin:0 18px 12px}.challenge-week-card{background:#fff;border:1px solid var(--b1);border-radius:var(--rlg);box-shadow:var(--shadow);overflow:hidden}.challenge-week-grid{display:grid!important;grid-template-columns:repeat(7,1fr);gap:0;border-top:1px solid var(--b1);padding:0}.challenge-week-day{padding:10px;text-align:center;border-right:1px solid var(--b1);background:#fff}.challenge-week-day:last-child{border-right:0}.challenge-week-day.today{background:rgba(45,106,79,.06)}.cwd-name{font-size:11px;font-weight:800;color:var(--t3);text-transform:uppercase}.cwd-date{font-size:15px;font-weight:900;color:var(--t1);margin-top:3px}.cwd-points{font-size:11px;font-weight:900;color:var(--acc);margin-top:3px}.btn-undo{background:rgba(239,68,68,.08)!important;border:1px solid rgba(239,68,68,.22)!important;color:#dc2626!important;min-width:36px!important}.dash-holiday-pill{font-size:10px;font-weight:800;color:#b85f00;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.20);border-radius:999px;padding:2px 6px;margin-left:6px}.leader-row.clickable{cursor:pointer}.leader-row.clickable:hover{background:var(--s2)}'}
  const oldSet=window.setMainView;window.setMainView=function(v){if(typeof oldSet==='function')oldSet(v);document.body.classList.toggle('calendar-active',v==='calendar');const cc=$('cal-controls');if(cc)cc.style.display=v==='calendar'?'flex':'none';setTimeout(()=>{if(v==='challenges')window.renderChallenges();if(v==='dashboard')window.buildDashboard();},0)};
  function init(){installStyle();canonicalPlayers();completions();try{if((window.currentMainView||'dashboard')==='challenges')window.renderChallenges();if((window.currentMainView||'dashboard')==='dashboard')window.buildDashboard();if((window.currentMainView||'')==='calendar')window.renderCalendar&&window.renderCalendar()}catch(e){console.warn('step7 init',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,100));else setTimeout(init,100);
  window.addEventListener('load',()=>{[300,1200,2600,5200].forEach(ms=>setTimeout(init,ms));});
})();




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
              if(typeof toast==='function') toast('Bundesland gespeichert ✓','ok');
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
    if(typeof toast==='function') toast('Gespeichert ✓','ok');
  };
  window.saveCalSettings=window._saveCalSettings;
  window.openCalendarSettings=function(){return window.openSettingsPanel?window.openSettingsPanel('calendar'):undefined;};
})();




/* Final: sichtbarer lokaler Löschen-/Google-Sync-Override */
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
  function allLocalEvents(){var arr=[];try{arr=Array.isArray(window.events)?window.events:(Array.isArray(events)?events:[]);}catch(e){arr=Array.isArray(window.events)?window.events:[]}return arr;}
  function persistEvents(arr){try{window.events=arr;events=arr;}catch(e){window.events=arr;}try{if(typeof ls==='function')ls('events',arr);else localStorage.setItem('change_v1_events',JSON.stringify(arr));}catch(e){try{localStorage.setItem('change_v1_events',JSON.stringify(arr));}catch(_){}}}
  function refresh(){try{if(typeof renderCalendar==='function')renderCalendar();}catch(e){}try{if(typeof renderUpcoming==='function')renderUpcoming();}catch(e){}try{if(typeof buildDashboard==='function')buildDashboard();}catch(e){}try{if(typeof checkNotifications==='function')checkNotifications();}catch(e){}try{if(typeof saveToDrive==='function')saveToDrive();}catch(e){}}
  function findEvent(id){try{if(typeof getEventById==='function')return getEventById(id);}catch(e){}return allLocalEvents().find(function(e){return String(e.id)===String(id);});}
  function range(ev){var s=ev&&String(ev.startDate||ev.date||'').slice(0,10), e=ev&&String(ev.endDate||ev.date||s||'').slice(0,10); if(!s)s=todayKey(); if(!e||e<s)e=s; return {start:s,end:e};}
  function addOneHour(time){var parts=String(time||'09:00').split(':');var h=(parseInt(parts[0],10)||9)+1,m=parseInt(parts[1],10)||0;if(h>23)h=23;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}

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
      var gr=range(ev), txt=gr.start===gr.end?gr.start:(gr.start+' – '+gr.end);
      try{if(typeof fmtDate==='function')txt=gr.start===gr.end?fmtDate(gr.start):(fmtDate(gr.start)+' – '+fmtDate(gr.end));}catch(e){}
      openPanel(ev.title||'Google-Termin','<div class="google-detail"><span class="gmark big">G</span><div><div class="challenge-title">Von Google Kalender</div><div class="settings-hint">'+esc(txt)+'</div></div></div><button class="btn btn-ghost btn-full" onclick="closePanel()">Schließen</button>');
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


/* CHANGE · GLOBAL CHALLENGE POINT SYNC */
(function(){
  'use strict';

  const COMPLETIONS = 'change_completions';
  const PLAYERS = 'change_players';
  let db = null;
  let unsubscribe = null;
  let initStarted = false;

  const norm = v => String(v || '').trim().toLowerCase();
  const pad2 = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); };
  const safeDocId = id => norm(id || 'unknown').replace(/[^a-z0-9._-]/g, '_');

  function readLs(key, fallback){ try{ const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }catch(e){ return fallback; } }
  function writeCompletions(){
    const arr = Array.isArray(window.challengeCompletions) ? window.challengeCompletions : [];
    try{ if(typeof ls === 'function') ls('challenge_completions', arr); else localStorage.setItem('challenge_completions', JSON.stringify(arr)); }catch(e){}
    try{ localStorage.setItem('challengeCompletions', JSON.stringify(arr)); }catch(e){}
  }
  function refreshViews(){
    try{ if(typeof renderChallenges === 'function') renderChallenges(); }catch(e){}
    try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
    try{ if(window.currentMainView === 'calendar' && typeof renderCalendar === 'function') renderCalendar(); }catch(e){}
    try{ if(typeof renderWeekBar === 'function') renderWeekBar(); }catch(e){}
  }
  function account(){
    let fu = null; try{ fu = window.firebase && firebase.auth && firebase.auth().currentUser; }catch(e){}
    const info = Object.assign({}, readLs('user_info', {}) || {}, window.userInfo || {});
    const email = norm((fu && fu.email) || info.email || info.mail || localStorage.getItem('change_v1_user_email') || localStorage.getItem('user_email') || '');
    const uid = (fu && fu.uid) || info.uid || info.id || localStorage.getItem('change_v1_user_uid') || '';
    const id = email || uid || 'local-authenticated-user';
    const name = String((fu && fu.displayName) || info.name || info.displayName || email || 'Mitspieler').trim();
    const picture = (fu && fu.photoURL) || info.picture || info.photoURL || '';
    return { id: norm(id), email, uid, name, picture };
  }
  function playerOf(c){ return norm(c && (c.playerId || c.userEmail || c.email || c.userId)); }
  function toLocalCompletion(id, data){
    const who = norm(data.playerId || data.userEmail || data.email || data.userId);
    return {
      id: String(id || data.id || ''),
      challengeId: String(data.challengeId || ''),
      playerId: who,
      userEmail: norm(data.userEmail || data.email || who),
      email: norm(data.email || data.userEmail || who),
      userId: norm(data.userId || who),
      playerName: data.playerName || data.userName || data.name || data.email || 'Mitspieler',
      date: String(data.date || data.completedDate || today()).slice(0, 10),
      points: parseInt(data.points, 10) || 0,
      createdAt: data.createdAtLocal || data.createdAt?.toDate?.().toISOString?.() || data.createdAt || new Date().toISOString(),
      source: 'firestore'
    };
  }
  function upsertCompletion(row){
    if(!row || !row.id || !row.challengeId || !row.date) return;
    window.challengeCompletions = Array.isArray(window.challengeCompletions) ? window.challengeCompletions : [];
    const i = window.challengeCompletions.findIndex(c => String(c.id) === String(row.id));
    if(i >= 0) window.challengeCompletions[i] = Object.assign({}, window.challengeCompletions[i], row);
    else window.challengeCompletions.push(row);
  }
  function removeCompletion(id){ window.challengeCompletions = (window.challengeCompletions || []).filter(c => String(c.id) !== String(id)); }

  async function ensureFirebase(){
    if(db) return db;
    if(!window.firebase || !window.FIREBASE_CONFIG) return null;
    const cfg = window.FIREBASE_CONFIG || {};
    if(!cfg.apiKey || String(cfg.apiKey).includes('HIER_') || !cfg.projectId) return null;
    try{ if(!firebase.apps.length) firebase.initializeApp(cfg); db = firebase.firestore(); return db; }
    catch(e){ console.warn('Challenge Sync Firebase:', e); return null; }
  }
  async function registerPlayer(){
    const database = await ensureFirebase();
    const me = account();
    if(!database || !me.id) return;
    try{
      await database.collection(PLAYERS).doc(safeDocId(me.id)).set({
        id: me.id, email: me.email || me.id, name: me.name || me.email || 'Mitspieler', picture: me.picture || '', online: true, app: 'Change', lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }catch(e){ console.warn('Challenge Player Sync:', e); }
  }

  window.publishCompletionToFirestore = async function(completion){
    const database = await ensureFirebase();
    const me = account();
    if(!database || !completion || !completion.id || !me.id) return false;
    const row = Object.assign({}, completion, {
      playerId: me.id,
      userEmail: me.email || me.id,
      email: me.email || me.id,
      userId: me.uid || me.id,
      playerName: me.name || me.email || 'Mitspieler',
      date: String(completion.date || today()).slice(0, 10),
      points: parseInt(completion.points, 10) || 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAtLocal: completion.createdAt || new Date().toISOString()
    });
    try{
      await registerPlayer();
      await database.collection(COMPLETIONS).doc(String(row.id)).set(row, { merge: true });
      upsertCompletion(toLocalCompletion(row.id, row));
      writeCompletions();
      refreshViews();
      return true;
    }catch(e){ console.warn('Completion Firestore Sync:', e); return false; }
  };

  window.startGlobalChallengeSync = async function(){
    if(readLs('live_sync_enabled', true) === false) return false;
    const database = await ensureFirebase();
    if(!database || unsubscribe) return !!database;
    await registerPlayer();
    unsubscribe = database.collection(COMPLETIONS).orderBy('createdAt', 'desc').limit(1000).onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if(change.type === 'removed') removeCompletion(change.doc.id);
        else upsertCompletion(toLocalCompletion(change.doc.id, change.doc.data() || {}));
      });
      writeCompletions();
      refreshViews();
    }, err => console.warn('Global Challenge Sync Listener:', err));
    return true;
  };
  window.stopGlobalChallengeSync = function(){ try{ if(unsubscribe) unsubscribe(); }catch(e){} unsubscribe = null; };

  const oldSetLive = window.setLiveSyncEnabled;
  window.setLiveSyncEnabled = async function(enabled){
    try{ localStorage.setItem('live_sync_enabled', JSON.stringify(!!enabled)); }catch(e){}
    if(typeof oldSetLive === 'function'){ try{ await oldSetLive.apply(this, arguments); }catch(e){ console.warn('Live Sync Toggle:', e); } }
    if(enabled) window.startGlobalChallengeSync(); else window.stopGlobalChallengeSync();
  };

  function boot(){
    if(initStarted) return;
    initStarted = true;
    window.challengeCompletions = Array.isArray(window.challengeCompletions) ? window.challengeCompletions : readLs('challenge_completions', []);
    window.startGlobalChallengeSync();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 600));
  else setTimeout(boot, 600);
  window.addEventListener('load', () => setTimeout(boot, 1200));
})();

/* ── Mobile View Detection ──────────────────────────────── */
(function(){
  'use strict';
  function isMobileLike(){
    var ua = navigator.userAgent || '';
    var touch = (navigator.maxTouchPoints || 0) > 0;
    var w = Math.min(window.innerWidth || 9999, window.screen && window.screen.width || 9999);
    return w <= 820 || (touch && /Android|iPhone|iPad|iPod|Mobile/i.test(ua));
  }
  function apply(){
    if(document.body) document.body.classList.toggle('change-mobile', isMobileLike());
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  window.addEventListener('resize', apply, {passive:true});
  window.addEventListener('orientationchange', function(){ setTimeout(apply, 120); }, {passive:true});
})();


/* ── Account-sicherer Challenge Sync Fix ───────────────────
   Verhindert falsche Spieler wie "Mitspieler" / local-user.
   Challenge-Punkte werden nur mit echtem Google-Konto gespeichert.
────────────────────────────────────────────────────────── */
(function(){
  'use strict';

  const COMPLETIONS = 'change_completions';
  const PLAYERS = 'change_players';
  const BAD_IDS = new Set(['', 'du', 'ich', 'me', 'local-user', 'google-user', 'local-authenticated-user', 'mitspieler', 'unknown']);
  const norm = v => String(v || '').trim().toLowerCase();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const pad2 = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); };
  const safeDocId = id => norm(id || 'unknown').replace(/[^a-z0-9._-]/g, '_');
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  const isBadId = id => BAD_IDS.has(norm(id)) || !norm(id) || norm(id).startsWith('local-');

  function readJson(key, fallback){ try{ const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }catch(e){ return fallback; } }
  function writeJson(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} }
  function getGlobalUserInfo(){
    try{ if(typeof userInfo !== 'undefined' && userInfo && typeof userInfo === 'object') return userInfo; }catch(e){}
    return {};
  }
  function setGlobalUserInfo(info){
    if(!info || !info.email) return;
    try{ window.userInfo = Object.assign({}, window.userInfo || {}, info); }catch(e){}
    try{ if(typeof userInfo !== 'undefined') userInfo = Object.assign({}, userInfo || {}, info); }catch(e){}
    writeJson('change_v1_user_info', info);
    writeJson('user_info', info);
    try{ localStorage.setItem('change_v1_user_email', info.email); }catch(e){}
    try{ localStorage.setItem('user_email', info.email); }catch(e){}
  }
  function account(){
    let fu = null;
    try{ fu = window.firebase && firebase.auth && firebase.auth().currentUser; }catch(e){}
    const candidates = [
      fu || {},
      getGlobalUserInfo(),
      window.userInfo || {},
      readJson('change_v1_user_info', {}) || {},
      readJson('user_info', {}) || {},
      readJson('google_user', {}) || {},
      readJson('current_user', {}) || {}
    ];
    let email = '';
    for(const c of candidates){
      const e = norm(c && (c.email || c.mail));
      if(isEmail(e)){ email = e; break; }
    }
    const uid = String((fu && fu.uid) || candidates.find(c => c && (c.uid || c.id))?.uid || '').trim();
    let name = '';
    for(const c of candidates){
      const n = String(c && (c.displayName || c.name || '')).trim();
      if(n && !/^mitspieler$/i.test(n)){ name = n; break; }
    }
    if(!name && email) name = email.split('@')[0];
    const picture = (fu && fu.photoURL) || candidates.find(c => c && (c.picture || c.photoURL))?.picture || candidates.find(c => c && (c.picture || c.photoURL))?.photoURL || '';
    if(email) setGlobalUserInfo({ email, name: name || email, picture, uid });
    return { id: email || uid || '', email, uid, name: name || email || '', picture, ready: !!email };
  }
  function completionOwner(c){ return norm(c && (c.playerId || c.userEmail || c.email || c.userId)); }
  function validCompletion(c){ return c && c.id && c.challengeId && c.date && !isBadId(completionOwner(c)) && isEmail(c.userEmail || c.email || c.playerId); }
  function sanitizeLocalCompletions(){
    // Wichtig: beim Reload ist window.challengeCompletions oft zuerst []
    // obwohl localStorage/Firestore bereits Punkte enthält. Deshalb Quellen MERGEN,
    // niemals eine leere Runtime-Liste über gespeicherte Daten schreiben.
    const sources = [
      Array.isArray(window.challengeCompletions) ? window.challengeCompletions : [],
      Array.isArray(readJson('challenge_completions', [])) ? readJson('challenge_completions', []) : [],
      Array.isArray(readJson('challengeCompletions', [])) ? readJson('challengeCompletions', []) : []
    ];
    try{ if(typeof ls === 'function'){
      const a = ls('challenge_completions'); if(Array.isArray(a)) sources.push(a);
      const b = ls('challengeCompletions'); if(Array.isArray(b)) sources.push(b);
    }}catch(e){}
    const clean = [];
    const seen = new Set();
    sources.flat().forEach(c => {
      if(!validCompletion(c)) return;
      const id = String(c.id);
      if(seen.has(id)) return;
      seen.add(id);
      const email = norm(c.userEmail || c.email || c.playerId);
      clean.push(Object.assign({}, c, {
        playerId: email,
        userEmail: email,
        email,
        playerName: c.playerName && !/^mitspieler$/i.test(c.playerName) ? c.playerName : email.split('@')[0]
      }));
    });
    window.challengeCompletions = clean;
    try{ if(typeof challengeCompletions !== 'undefined') challengeCompletions = clean; }catch(e){}
    try{ if(typeof ls === 'function') ls('challenge_completions', clean); else writeJson('challenge_completions', clean); }catch(e){ writeJson('challenge_completions', clean); }
    writeJson('challengeCompletions', clean);
    return clean;
  }
  function refresh(){
    try{ if(typeof renderChallenges === 'function') renderChallenges(); }catch(e){}
    try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
    try{ if(window.currentMainView === 'calendar' && typeof renderCalendar === 'function') renderCalendar(); }catch(e){}
    try{ if(typeof renderWeekBar === 'function') renderWeekBar(); }catch(e){}
  }
  function getChallenges(){
    if(Array.isArray(window.challenges)) return window.challenges;
    try{ return readJson('challenges', []) || []; }catch(e){ return []; }
  }
  function findChallenge(id){ return getChallenges().find(c => String(c.id) === String(id)); }
  function isDoneToday(id, me){
    const td = today();
    return (window.challengeCompletions || []).some(c => String(c.challengeId) === String(id) && String(c.date || '').slice(0,10) === td && norm(c.playerId || c.userEmail || c.email) === me.id);
  }
  function saveLocal(rec){
    sanitizeLocalCompletions();
    if((window.challengeCompletions || []).some(c => String(c.id) === String(rec.id))) return;
    window.challengeCompletions.push(rec);
    try{ if(typeof challengeCompletions !== 'undefined') challengeCompletions = window.challengeCompletions; }catch(e){}
    try{ if(typeof ls === 'function') ls('challenge_completions', window.challengeCompletions); else writeJson('challenge_completions', window.challengeCompletions); }catch(e){ writeJson('challenge_completions', window.challengeCompletions); }
    writeJson('challengeCompletions', window.challengeCompletions);
  }
  async function ensureDb(){
    try{
      if(!window.firebase || !window.FIREBASE_CONFIG || !firebase.firestore) return null;
      if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      return firebase.firestore();
    }catch(e){ console.warn('Challenge Firebase init:', e); return null; }
  }
  async function cleanupBadRemote(){
    const db = await ensureDb();
    if(!db) return;
    try{
      const bad = ['local-user','local-authenticated-user','google-user','mitspieler','unknown',''];
      for(const id of bad){
        const snap = await db.collection(COMPLETIONS).where('playerId','==',id).limit(50).get();
        snap.forEach(doc => doc.ref.delete().catch(()=>{}));
      }
      const ps = await db.collection(PLAYERS).limit(200).get();
      ps.forEach(doc => {
        const d = doc.data() || {}, id = norm(d.id || doc.id), email = norm(d.email || '');
        if(isBadId(id) || !isEmail(email)) doc.ref.delete().catch(()=>{});
      });
    }catch(e){ console.warn('Challenge cleanup:', e); }
  }
  async function registerPlayer(me){
    const db = await ensureDb();
    if(!db || !me.ready) return false;
    try{
      await db.collection(PLAYERS).doc(safeDocId(me.id)).set({
        id: me.id,
        email: me.email,
        name: me.name || me.email.split('@')[0],
        picture: me.picture || '',
        online: true,
        app: 'Change',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge:true });
      return true;
    }catch(e){ console.warn('Player sync:', e); return false; }
  }
  function toLocal(id, data){
    const owner = norm(data.playerId || data.userEmail || data.email || data.userId);
    if(isBadId(owner) || !isEmail(data.userEmail || data.email || owner)) return null;
    const email = norm(data.userEmail || data.email || owner);
    return {
      id: String(id || data.id || ''),
      challengeId: String(data.challengeId || ''),
      playerId: email,
      userEmail: email,
      email,
      userId: String(data.userId || email),
      playerName: data.playerName && !/^mitspieler$/i.test(data.playerName) ? data.playerName : email.split('@')[0],
      date: String(data.date || today()).slice(0,10),
      points: parseInt(data.points,10) || 0,
      createdAt: data.createdAtLocal || data.createdAt?.toDate?.().toISOString?.() || data.createdAt || new Date().toISOString(),
      source: 'firestore'
    };
  }
  function upsert(row){
    if(!validCompletion(row)) return;
    window.challengeCompletions = Array.isArray(window.challengeCompletions) ? window.challengeCompletions : [];
    const i = window.challengeCompletions.findIndex(c => String(c.id) === String(row.id));
    if(i >= 0) window.challengeCompletions[i] = Object.assign({}, window.challengeCompletions[i], row);
    else window.challengeCompletions.push(row);
  }

  window.getCurrentChallengeAccount = account;

  window.publishCompletionToFirestore = async function(completion){
    const me = account();
    if(!me.ready){
      try{ if(typeof toast === 'function') toast('Bitte erst mit Google anmelden – Punkte werden sonst keinem Konto zugeordnet.','err'); }catch(e){}
      return false;
    }
    const db = await ensureDb();
    if(!db || !completion || !completion.id) return false;
    const rec = Object.assign({}, completion, {
      playerId: me.id,
      userEmail: me.email,
      email: me.email,
      userId: me.uid || me.email,
      playerName: me.name || me.email.split('@')[0],
      date: String(completion.date || today()).slice(0,10),
      points: parseInt(completion.points,10) || 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAtLocal: completion.createdAt || new Date().toISOString()
    });
    try{
      await registerPlayer(me);
      await db.collection(COMPLETIONS).doc(String(rec.id)).set(rec, { merge:true });
      const local = toLocal(rec.id, rec);
      if(local){ upsert(local); sanitizeLocalCompletions(); refresh(); }
      return true;
    }catch(e){ console.warn('Completion sync:', e); return false; }
  };

  window.completeChallenge = async function(id){
    const me = account();
    if(!me.ready){
      try{ if(typeof toast === 'function') toast('Bitte zuerst mit Google anmelden. Dann werden Punkte korrekt gespeichert.','err'); }catch(e){}
      return;
    }
    const ch = findChallenge(id);
    if(!ch){ try{ if(typeof toast === 'function') toast('Challenge nicht gefunden','err'); }catch(e){} return; }
    sanitizeLocalCompletions();
    if(isDoneToday(id, me)){ try{ if(typeof toast === 'function') toast('Bereits erledigt',''); }catch(e){} return; }
    const rec = {
      id: 'cc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7),
      challengeId: String(id),
      playerId: me.id,
      userEmail: me.email,
      email: me.email,
      userId: me.uid || me.email,
      playerName: me.name || me.email.split('@')[0],
      date: today(),
      points: parseInt(ch.points,10) || 0,
      createdAt: new Date().toISOString()
    };
    saveLocal(rec);
    refresh();
    window.publishCompletionToFirestore(rec);
    try{ if(typeof toast === 'function') toast('+' + rec.points + ' Punkte ✓','ok'); }catch(e){}
  };

  window.undoChallenge = async function(id){
    const me = account();
    if(!me.ready){ try{ if(typeof toast === 'function') toast('Bitte zuerst mit Google anmelden.','err'); }catch(e){} return; }
    const td = today();
    const removed = [];
    sanitizeLocalCompletions();
    window.challengeCompletions = (window.challengeCompletions || []).filter(c => {
      const hit = String(c.challengeId) === String(id) && String(c.date || '').slice(0,10) === td && norm(c.playerId || c.userEmail || c.email) === me.id;
      if(hit) removed.push(c);
      return !hit;
    });
    try{ if(typeof challengeCompletions !== 'undefined') challengeCompletions = window.challengeCompletions; }catch(e){}
    try{ if(typeof ls === 'function') ls('challenge_completions', window.challengeCompletions); else writeJson('challenge_completions', window.challengeCompletions); }catch(e){ writeJson('challenge_completions', window.challengeCompletions); }
    writeJson('challengeCompletions', window.challengeCompletions);
    const db = await ensureDb();
    if(db){ removed.forEach(c => c.id && db.collection(COMPLETIONS).doc(String(c.id)).delete().catch(()=>{})); }
    refresh();
    try{ if(typeof toast === 'function') toast(removed.length ? 'Challenge zurückgesetzt' : 'Nichts zurückzusetzen',''); }catch(e){}
  };

  window.resetTodayChallenges = async function(){
    const me = account();
    if(!me.ready){ try{ if(typeof toast === 'function') toast('Bitte zuerst mit Google anmelden.','err'); }catch(e){} return; }
    const td = today();
    const removed = [];
    sanitizeLocalCompletions();
    window.challengeCompletions = (window.challengeCompletions || []).filter(c => {
      const hit = String(c.date || '').slice(0,10) === td && norm(c.playerId || c.userEmail || c.email) === me.id;
      if(hit) removed.push(c);
      return !hit;
    });
    try{ if(typeof challengeCompletions !== 'undefined') challengeCompletions = window.challengeCompletions; }catch(e){}
    try{ if(typeof ls === 'function') ls('challenge_completions', window.challengeCompletions); else writeJson('challenge_completions', window.challengeCompletions); }catch(e){ writeJson('challenge_completions', window.challengeCompletions); }
    writeJson('challengeCompletions', window.challengeCompletions);
    const db = await ensureDb();
    if(db){ removed.forEach(c => c.id && db.collection(COMPLETIONS).doc(String(c.id)).delete().catch(()=>{})); }
    refresh();
    try{ if(typeof toast === 'function') toast('Heute zurückgesetzt',''); }catch(e){}
  };

  window.startGlobalChallengeSync = async function(){
    const db = await ensureDb();
    const me = account();
    if(db && me.ready) await registerPlayer(me);
    sanitizeLocalCompletions();
    if(!db) return false;
    if(window.__changeChallengeUnsub){ try{ window.__changeChallengeUnsub(); }catch(e){} }
    window.__changeChallengeUnsub = db.collection(COMPLETIONS).orderBy('createdAt','desc').limit(1000).onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if(change.type === 'removed') window.challengeCompletions = (window.challengeCompletions || []).filter(c => String(c.id) !== String(change.doc.id));
        else {
          const row = toLocal(change.doc.id, change.doc.data() || {});
          if(row) upsert(row);
        }
      });
      sanitizeLocalCompletions();
      refresh();
    }, err => console.warn('Challenge listener:', err));
    return true;
  };

  function boot(){
    const run = () => {
      account();
      sanitizeLocalCompletions();
      cleanupBadRemote();
      window.startGlobalChallengeSync();
      refresh();
    };
    [250, 900, 1800, 3500, 6500].forEach(ms => setTimeout(run, ms));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', boot);
})();
