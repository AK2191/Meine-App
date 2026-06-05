/* Change App · App · Hauptlogik
 * Aus index.html extrahiert — Code unverändert
 * NICHT direkt bearbeiten — stattdessen in die passende core/ oder features/ Datei
 */

'use strict';

/* CONSTANTS & STATE */
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
var curDate = new Date(); // var = global window.curDate für change-post.js

// Data
let events = [];
let gEvents = [];
let challenges = [];
let challengeCompletions = [];
let challengePlayers = [];
let notifications = [];
try{ window.notifications = notifications; }catch(_){}

/* ==== GOOGLE KALENDER CACHE (F5-PERSISTENZ) ==== */
const GOOGLE_EVENTS_CACHE_KEY = LSK + '_google_events_cache';
const GOOGLE_EVENTS_CACHE_META_KEY = LSK + '_google_events_cache_meta';
function isGoogleCalendarSyncWanted(){
  try{
    const keys = ['change_v1_google_calendar_sync','change_google_sync_enabled','google_sync_enabled'];
    for(const key of keys){
      const raw = localStorage.getItem(key);
      if(raw !== null){
        if(raw === 'false' || raw === '0') return false;
        if(raw === 'true' || raw === '1') return true;
      }
    }
  }catch(e){}
  return true;
}
function readGoogleEventsCache(){
  if(!isGoogleCalendarSyncWanted()) return [];
  try{
    const raw = localStorage.getItem(GOOGLE_EVENTS_CACHE_KEY) || localStorage.getItem('change_google_events_cache') || '';
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  }catch(e){ return []; }
}
function writeGoogleEventsCache(list){
  const safe = Array.isArray(list) ? list : [];
  try{
    localStorage.setItem(GOOGLE_EVENTS_CACHE_KEY, JSON.stringify(safe));
    localStorage.setItem('change_google_events_cache', JSON.stringify(safe));
    localStorage.setItem(GOOGLE_EVENTS_CACHE_META_KEY, JSON.stringify({updatedAt:new Date().toISOString(), count:safe.length}));
  }catch(e){}
}
function clearGoogleEventsCache(){
  try{
    localStorage.removeItem(GOOGLE_EVENTS_CACHE_KEY);
    localStorage.removeItem('change_google_events_cache');
    localStorage.removeItem(GOOGLE_EVENTS_CACHE_META_KEY);
  }catch(e){}
}
function googleEventsCacheInfo(){
  const list = readGoogleEventsCache();
  let meta = null;
  try{ meta = JSON.parse(localStorage.getItem(GOOGLE_EVENTS_CACHE_META_KEY) || 'null'); }catch(e){}
  return {count:list.length, updatedAt: meta && meta.updatedAt || '', hasEvents:list.length > 0};
}
try{
  window.readGoogleEventsCache = readGoogleEventsCache;
  window.writeGoogleEventsCache = writeGoogleEventsCache;
  window.clearGoogleEventsCache = clearGoogleEventsCache;
  window.googleEventsCacheInfo = googleEventsCacheInfo;
}catch(_e){}


function exposeChangeGlobals(){
  try{
    window.userInfo = userInfo || {};
    window.events = events || [];
    window.gEvents = gEvents || [];
    window.challenges = challenges || [];
    window.challengeCompletions = challengeCompletions || [];
    window.challengePlayers = challengePlayers || [];
    window.notifications = notifications || [];
  }catch(_e){}
}

/* ==== CHALLENGE STATE BRIDGE ==== */
function getChallengeStore(){
  return (typeof window !== 'undefined' && window.ChangeChallengeStore) ? window.ChangeChallengeStore : null;
}
function syncChallengeStateFromStore(defaultFactory){
  const store = getChallengeStore();
  if(!store) return false;
  try{
    store.ensureDefaults(typeof defaultFactory === 'function' ? defaultFactory : (typeof window.buildDefaultChallenges === 'function' ? window.buildDefaultChallenges : null));
    challenges = store.getChallenges();
    challengeCompletions = store.getCompletions();
    challengePlayers = store.getPlayers();
    return true;
  }catch(e){
    console.warn('ChallengeStore sync:', e);
    return false;
  }
}
function persistChallengeStateToStore(){
  const store = getChallengeStore();
  if(!store) return false;
  try{
    const storeChallenges = store.getChallenges();
    const storeCompletions = store.getCompletions();
    const storePlayers = store.getPlayers();
    if((!Array.isArray(challenges) || !challenges.length) && storeChallenges.length) challenges = storeChallenges;
    else store.replaceChallenges(challenges || [], {persist:false});
    if((!Array.isArray(challengeCompletions) || !challengeCompletions.length) && storeCompletions.length) challengeCompletions = storeCompletions;
    else store.replaceCompletions(challengeCompletions || [], {persist:false});
    if((!Array.isArray(challengePlayers) || !challengePlayers.length) && storePlayers.length) challengePlayers = storePlayers;
    else store.replacePlayers(challengePlayers || [], {persist:false});
    store.persistAll();
    challenges = store.getChallenges();
    challengeCompletions = store.getCompletions();
    challengePlayers = store.getPlayers();
    return true;
  }catch(e){
    console.warn('ChallengeStore persist:', e);
    return false;
  }
}


// Filter state
let invFilter = 'alle';
let conFilter = 'alle';

/* ==== LOCAL STORAGE ==== */
const ls = (k,v) => {
  if(v===undefined){try{return JSON.parse(localStorage.getItem(LSK+'_'+k));}catch{return null;}}
  try{localStorage.setItem(LSK+'_'+k,JSON.stringify(v));}catch{}
};
const lsDel = k => {try{localStorage.removeItem(LSK+'_'+k);}catch{}};
try{ window.ls = ls; window.lsDel = lsDel; }catch(_){}


/* ==== PROFILE AVATAR ==== */
function readRawJson(key, fallback = null){
  try{
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  }catch(e){ return fallback; }
}
function writeRawJson(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
}
function normalizeProfileInfo(info){
  const current = (typeof userInfo !== 'undefined' && userInfo && typeof userInfo === 'object') ? userInfo : {};
  const next = Object.assign({}, current, info || {});
  const name = String(next.name || next.displayName || next.email || '').trim();
  const email = String(next.email || next.mail || '').trim();
  const picture = String(next.picture || next.photoURL || current.picture || '').trim();
  return { name, email, picture };
}
function saveUserProfileInfo(info){
  const normalized = normalizeProfileInfo(info);
  if(!normalized.name && !normalized.email && !normalized.picture) return normalized;
  userInfo = Object.assign({}, userInfo || {}, normalized);
  try{ SecureTokenStore.setUser(userInfo); }catch(e){}
  const safe = { name:userInfo.name||'', email:userInfo.email||'', picture:userInfo.picture||'' };
  try{ ls('user_info_safe', safe); }catch(e){}
  try{ ls('user_info', safe); }catch(e){}
  writeRawJson('user_info_safe', safe);
  writeRawJson('user_info', safe);
  return normalized;
}
function resolveUserProfileInfo(){
  let fbUser = null;
  try{ fbUser = window.firebase && firebase.auth && firebase.auth().currentUser; }catch(e){}
  const candidates = [
    fbUser ? {name:fbUser.displayName||'', email:fbUser.email||'', picture:fbUser.photoURL||''} : null,
    (typeof userInfo !== 'undefined' ? userInfo : null),
    (typeof SecureTokenStore !== 'undefined' && SecureTokenStore.getUser ? SecureTokenStore.getUser() : null),
    ls('user_info_safe'),
    ls('user_info'),
    readRawJson('change_v1_user_info_safe'),
    readRawJson('change_v1_user_info'),
    readRawJson('user_info_safe'),
    readRawJson('user_info'),
    readRawJson('google_user'),
    readRawJson('current_user')
  ].filter(Boolean);
  const result = { name:'', email:'', picture:'' };
  for(const c of candidates){
    if(!result.name) result.name = String(c.name || c.displayName || '').trim();
    if(!result.email) result.email = String(c.email || c.mail || '').trim();
    const pic = String(c.picture || c.photoURL || '').trim();
    if(!result.picture && /^https:\/\//i.test(pic)) result.picture = pic;
  }
  if(!result.name && result.email) result.name = result.email.split('@')[0];
  return saveUserProfileInfo(result);
}
function renderAvatarInitials(av, initials){
  while(av && av.firstChild) av.removeChild(av.firstChild);
  if(!av) return;
  const sp = document.createElement('span');
  sp.id = 'avatar-initials';
  sp.textContent = initials || '?';
  av.appendChild(sp);
}
function updateAvatar(){
  const av = document.getElementById('user-avatar');
  if(!av) return;
  const profile = resolveUserProfileInfo();
  const rawName = String(profile.name || profile.email || '?');
  const initials = rawName.split(/[\s._-]+/).filter(Boolean).map(w=>w[0]||'').join('').substring(0,2).toUpperCase() || '?';
  while(av.firstChild) av.removeChild(av.firstChild);
  if(profile.picture && /^https:\/\//i.test(profile.picture)){
    const img = document.createElement('img');
    img.alt = rawName;
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.src = profile.picture;
    img.addEventListener('error', () => renderAvatarInitials(av, initials), {once:true});
    av.appendChild(img);
  } else {
    renderAvatarInitials(av, initials);
  }
  try{ if(typeof updateAvatarDot === 'function') updateAvatarDot(); }catch(e){}
}
window.updateAvatar = updateAvatar;
async function persistChangeState(){
  try{
    ls('events', events);
    if(!persistChallengeStateToStore()){
      ls('challenges', challenges);
      ls('challenge_completions', challengeCompletions);
      ls('challenge_players', challengePlayers);
    }
    // [FIX AUTH-GUARD] Firestore nur schreiben wenn Firebase Auth aktiv
    const fbUser = (typeof firebase!=='undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if(typeof registerLivePlayer==='function' && fbUser) registerLivePlayer();
  }catch(e){console.warn('Persist local:',e);}
}

/* ==== DATE HELPERS ==== */
const pad = n => String(n).padStart(2,'0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const isToday = d => {const t=new Date();return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate();};
const daysUntil = dk => {if(!dk)return 999;const d=new Date(dk+'T12:00:00'),t=new Date();t.setHours(0,0,0,0);d.setHours(0,0,0,0);return Math.round((d-t)/86400000);};
const fmtDate = dk => {if(!dk)return'—';const d=new Date(dk+'T12:00:00');return`${d.getDate()}. ${DE_MONTHS_S[d.getMonth()]} ${d.getFullYear()}`;};
const fmtMoney = v => {if(!v&&v!==0)return'—';return Number(v).toLocaleString('de-DE',{style:'currency',currency:'EUR'});};
// [FIX CRIT-4] esc() — vollst. HTML-Escaping inkl. Apostrophe
const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
// [FIX HIGH] safeUrl() — blockiert javascript:/data: URLs in href
const safeUrl = u => { if(!u) return ''; const s=String(u).trim(); if(/^(javascript|data|vbscript):/i.test(s)) return ''; if(!/^https?:\/\//.test(s)) return ''; return s; };
const uid = () => Math.random().toString(36).substring(2,10)+Date.now().toString(36);

/* INIT */
/* ==========================
   [FIX CRIT-3] SECURE TOKEN STORE
   Access-Token NUR im RAM – nie in localStorage
========================== */
const SecureTokenStore = (() => {
  let _tok = null, _exp = 0, _usr = null;
  // Alte unsichere Tokens sofort aus localStorage löschen
  try { localStorage.removeItem(LSK+'_access_token'); } catch(_e) {}
  return {
    setToken(t, expiresIn = 3600) { _tok = t; _exp = Date.now() + expiresIn * 1000; },
    getToken() { return (_tok && Date.now() < _exp) ? _tok : null; },
    isValid() { return !!_tok && Date.now() < _exp; },
    setUser(u) { _usr = { name: String(u.name||''), email: String(u.email||''), picture: String(u.picture||'') }; },
    getUser() { return _usr ? {..._usr} : null; },
    clear() { _tok = null; _exp = 0; _usr = null; }
  };
})();

// [FIX PERSISTENZ] Stille Google-Neuanmeldung nach F5 (kein Popup)
function trySilentGoogleTokenRefresh(){
  // Bewusst deaktiviert: stille Google-OAuth-Refreshes können auf GitHub Pages
  // nach dem Login kurz die Oberfläche blockieren. Google-Sync wird nur
  // manuell über den eigenen Google-Kalender-Schalter/Sync-Button gestartet.
  return;
}

// [AUTO-REFRESH] Google Token alle 50 Min still erneuern
// Token läuft nach 60 Min ab — 50 Min Intervall = immer gültig
let _tokenRefreshTimer = null;
function startTokenAutoRefresh(){
  // Kein Hintergrund-Refresh. Token werden bei manueller Google-Synchronisierung erneuert.
  return;
}

window.addEventListener('load', async () => {
  await new Promise(r => setTimeout(r,700));

  CLIENT_ID = getGoogleClientId();
  // Token aus RAM — leer nach F5, wird unten per Firebase Auth wiederhergestellt
  accessToken = SecureTokenStore.getToken() || '';
  userInfo    = SecureTokenStore.getUser()  || {};

  // Lokale Daten laden
  events              = ls('events')               || [];
  // Google-Kalenderdaten bleiben nach F5 sichtbar. Der OAuth-Token bleibt bewusst nur im RAM.
  gEvents             = readGoogleEventsCache();
  window.events       = events;
  window.gEvents      = gEvents;
  challenges          = ls('challenges')           || [];
  challengeCompletions= ls('challenge_completions')|| [];
  challengePlayers    = ls('challenge_players')    || [];
  syncChallengeStateFromStore();
  exposeChangeGlobals();

  await handleFirebaseRedirectLogin();
  if(document.getElementById('main-app').style.display==='flex') { initPWA(); scheduleNotifCheck(); return; }

  // [FIX PERSISTENZ] Firebase Auth State prüfen
  // Firebase speichert Session in IndexedDB → überlebt F5, bleibt 2+ Tage aktiv
  // [FIX F5] Wenn Nutzer vorher eingeloggt war: App sofort zeigen
  // Firebase Auth lädt Session im Hintergrund (IndexedDB) — kann 500ms dauern
  const wasPreviouslyLoggedIn = ls('was_logged_in') && ls('user_info_safe')?.email;
  if(wasPreviouslyLoggedIn){
    // Nutzerdaten aus sicherem localStorage-Cache wiederherstellen
    const cached = ls('user_info_safe');
    userInfo = saveUserProfileInfo({ 
      name:    cached.name    || cached.email || '', 
      email:   cached.email   || '', 
      picture: cached.picture || ''
    });
    isDemoMode = false;
    bootMainApp(); // App sofort zeigen — kein Warten auf Firebase
    setTimeout(trySilentGoogleTokenRefresh, 1500);
    startTokenAutoRefresh();
    initPWA(); scheduleNotifCheck();
    // Firebase Auth im Hintergrund prüfen (aktualisiert Avatar-Bild etc.)
    if(window.firebase && firebase.auth && firebase.apps.length){
      firebase.auth().onAuthStateChanged(async (fbUser) => {
        if(fbUser){
          // Session bestätigt — Bild nur aktualisieren, nicht mit leerem Wert überschreiben
          saveUserProfileInfo({
            name: fbUser.displayName || userInfo.name || fbUser.email || '',
            email: fbUser.email || userInfo.email || '',
            picture: fbUser.photoURL || userInfo.picture || ''
          });
          updateAvatar();
          // Kein automatischer Firestore-/Datenbank-Sync nach Auth-Bestätigung.
          // Datenbank-Sync startet ausschließlich über den eigenen Schalter.
        } else {
          // Session abgelaufen — beim nächsten Firestore-Write wird Fehler kommen
          // Nutzer muss sich neu anmelden wenn er Daten speichern will
          lsDel('was_logged_in');
        }
      });
    }
    return;
  }

  if(window.firebase && firebase.auth && firebase.apps.length){
    firebase.auth().onAuthStateChanged(async (fbUser) => {
      if(fbUser && !isDemoMode){
        // ✅ Noch eingeloggt — Session aus Firebase Auth wiederherstellen
        userInfo = {
          name:    fbUser.displayName || fbUser.email || '',
          email:   fbUser.email       || '',
          picture: fbUser.photoURL    || ''
        };
        saveUserProfileInfo(userInfo);
        ls('was_logged_in', true);
        isDemoMode = false;
        lsDel('demo_mode');

        if(document.getElementById('main-app').style.display !== 'flex'){
          bootMainApp();
        }
        // Kein automatischer Firestore-/Settings-Sync nach Login.
        // Datenbank-Sync und Settings-Sync starten nur durch den Datenbank-Sync-Schalter.
        setTimeout(trySilentGoogleTokenRefresh, 1500);
        startTokenAutoRefresh();
        initPWA(); scheduleNotifCheck();
        return;
      }

      // Nicht eingeloggt → Login anzeigen
      lsDel('demo_mode'); isDemoMode = false;
      lsDel('was_logged_in');
      if(ls('demo_mode')){
        startDemoInternal();
      } else if(CLIENT_ID){
        showLogin();
      } else {
        hideLd();
        document.getElementById('setup-modal').classList.add('show');
      }
      initPWA();
      scheduleNotifCheck();
    }); // end onAuthStateChanged
    return; // Firebase Auth übernimmt — fertig
  }

  // Fallback: kein Firebase → klassischer Pfad
  lsDel('demo_mode'); isDemoMode = false;
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

/* ==== PWA ==== */
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
/* SETUP & AUTH */
function saveClientId(){
  // [FIX MED-1] Strikte Validierung der OAuth Client-ID
  const raw = document.getElementById('client-id-input').value || '';
  const v = cleanGoogleClientId(raw);
  // Format: <zahlen>-<alphanum>.apps.googleusercontent.com
  const validPattern = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/i;
  if(!v || !validPattern.test(v)){
    toast('Ungültige Client-ID — Format: 12345-xxxx.apps.googleusercontent.com','err');
    return;
  }
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

async function handleGoogleLogin(){
  // Stabiler Google-Kalender-Login: Firebase darf die Anmeldung nicht blockieren.
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
        try{ if(typeof SecureTokenStore !== 'undefined') SecureTokenStore.setToken(accessToken, 3600); else ls('access_token',accessToken); }catch(e){ try{ ls('access_token', accessToken); }catch(_e){} }
        isDemoMode=false; try{ lsDel('demo_mode'); }catch(e){}
        await fetchUserInfo();
        try{ if(typeof SecureTokenStore !== 'undefined') SecureTokenStore.setUser(userInfo); }catch(e){}
        try{ ls('user_info_safe', {name:userInfo.name||'',email:userInfo.email||'',picture:userInfo.picture||''}); ls('was_logged_in', true); }catch(e){}
        try{ if(typeof startTokenAutoRefresh === 'function') startTokenAutoRefresh(); }catch(e){}
        bootMainApp();
        loadGoogleData();
        // Kein automatischer Firebase-/Datenbank-Sync nach Login.
        // Die App bleibt sofort bedienbar; Datenbank-Sync startet nur über den eigenen Schalter.
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
    if(!result || !result.user){
      try{ sessionStorage.removeItem('firebase:redirectEventId'); }catch(_e){}
      return;
    }
    if(result && result.user){
      if(window.applyChangeFirebaseAuthResult) window.applyChangeFirebaseAuthResult(result);
      else {
        const u=result.user;
        saveUserProfileInfo({name:u.displayName||u.email,email:u.email,picture:u.photoURL||''});
      }
      isDemoMode=false; lsDel('demo_mode');
      bootMainApp();
      // Kein automatischer Firestore-/Datenbank-Sync nach Redirect-Login.
      if(accessToken) loadGoogleData();
      toast('Mobile Anmeldung erfolgreich ✓','ok');
    }
  }catch(e){console.warn('Redirect Ergebnis:',e);}
}

async function fetchUserInfo(){
  try{
    const r=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{'Authorization':'Bearer '+accessToken}});
    if(!r.ok)return;
    const u=await r.json();
    const displayName = String(u.name || ((u.given_name||'') + ' ' + (u.family_name||'')) || u.email || '').trim();
    saveUserProfileInfo({
      name: displayName || u.email || userInfo.name || '',
      email: u.email || userInfo.email || '',
      picture: u.picture || userInfo.picture || ''
    });
    updateAvatar();
  }catch{}
}

/* ==== DEMO ==== */
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



function releaseUiLock(reason){
  try{
    var main=document.getElementById('main-app');
    var loading=document.getElementById('loading');
    var setup=document.getElementById('setup-modal');
    var panel=document.getElementById('side-panel');
    var overlay=document.getElementById('panel-overlay');
    if(loading){
      loading.classList.add('is-hidden');
      loading.style.display='none';
      loading.style.visibility='hidden';
      loading.style.opacity='0';
      loading.style.pointerEvents='none';
      loading.setAttribute('aria-hidden','true');
    }
    if(setup && !setup.classList.contains('show')) setup.style.pointerEvents='none';
    if(panel && !panel.classList.contains('open')) panel.style.pointerEvents='none';
    if(overlay && (!panel || !panel.classList.contains('open'))){
      overlay.classList.remove('show');
      overlay.style.pointerEvents='none';
      overlay.setAttribute('aria-hidden','true');
    }
    if(main) main.style.pointerEvents='auto';
  }catch(e){ console.warn('[Change] UI-Lock-Freigabe fehlgeschlagen:', reason, e); }
}


/* BOOT */
function bootMainApp(){
  hideLd();
  document.getElementById('login-screen').style.display='none';
  document.getElementById('main-app').style.display='flex';
  exposeChangeGlobals();
  releaseUiLock('bootMainApp');
  /* Bereinige Demo-Termine die beim ersten Start gesetzt wurden */
  try{
    var _dIds=new Set(['d1','d2','d3','d4']);
    var _before=events.length;
    events=events.filter(function(e){ return e&&!_dIds.has(e.id)&&e.source!=='demo'; });
    if(events.length!==_before) ls('events',events);
  }catch(_){}

  updateAvatar();

  setMainView('dashboard');
  checkNotifications();
  // Push-Berechtigung wird nicht automatisch abgefragt. Steuerung nur über Glocke.

  // Greeting
  const h=new Date().getHours();
  const gr=h<12?'Guten Morgen':h<18?'Guten Tag':'Guten Abend';
  const name=userInfo.name?userInfo.name.split(' ')[0]:'';
  document.getElementById('dash-greeting').textContent=`${gr}${name?', '+name:''}`;
  document.getElementById('dash-sub').textContent=`${new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})} · Ihr persönlicher Überblick`;
}

/* MAIN VIEW CONTROLLER */
function setMainView(v){
  currentMainView=v;
  const views=['dashboard','calendar','challenges','pollen'];
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

    } else if(v==='pollen'){
      document.getElementById('pollen-view')?.style.setProperty('display','flex');
      if(typeof window.renderPollenView === 'function') window.renderPollenView();

    } else {
      document.getElementById('dashboard-view').style.display='block';
      buildDashboard();
    }
  }
  document.querySelectorAll('.h-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('htab-'+v)?.classList.add('active');
  document.querySelectorAll('.bnav-item').forEach(t=>t.classList.remove('active'));
  document.getElementById('bnav-'+v)?.classList.add('active');
  const fab=document.getElementById('fab'); if(fab) fab.style.display = v==='calendar' ? 'flex' : 'none';
}

function fabAction(){
  if(currentMainView==='calendar') openEventPanel(null);
  else if(currentMainView==='challenges') openChallengePanel(null);
  else openEventPanel(null);
}

/* DASHBOARD */
function buildDashboard(){
  buildKPIs();
  buildDashCards();
}

function buildKPIs(){
  const grid=document.getElementById('kpi-grid');
  if(!grid) return;
  const allEvs=getAllEvents();
  const upcoming7=allEvs.filter(e=>{const d=daysUntil(e.date);return d>=0&&d<=7;}).length;
  const today=dateKey(new Date());
  const me=userInfo.email||'demo@example.com';
  const doneToday=(typeof challengeCompletions!=='undefined'?challengeCompletions:[]).filter(c=>c.date===today&&c.userEmail===me).length;
  const myPoints=(typeof calcStats==='function'?calcStats()[me]?.points:0)||0;
  grid.innerHTML=`
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

/* ==========================
   DASHBOARD TRACKER ROWS
   Erweiterbar: weitere Tracker hier ergänzen
========================== */
function renderTrackerRows(){
  var rows='';

  // ==== Friseur-Tracker ====
  // Wenn das eigenständige Feature geladen ist, nutzen wir bewusst dessen
  // Zeitlogik. Dort wird nicht nur das Datum, sondern auch Start-/Enduhrzeit
  // berücksichtigt, damit ein Termin nach der Endzeit nicht mehr als geplant gilt.
  if(typeof window.getFriseurRowHtml === 'function'){
    try{ rows += window.getFriseurRowHtml() || ''; }catch(e){}
  } else {
    var friseurOn=typeof window.getFriseurEnabled==='function'?window.getFriseurEnabled():false;
    if(friseurOn){
      var lastDate=typeof window._friseurFindLast==='function'?window._friseurFindLast():null;
      var nextInfo=typeof window._friseurFindNext==='function'?window._friseurFindNext():null;

      // Fallback: search events directly
      if(!lastDate&&!nextInfo){
        var kw='friseur', today=new Date(); today.setHours(0,0,0,0);
        var pastBest=null, futureBest=null;
        var allEvts=(window.events||[]).concat(window.gEvents||[]).concat(typeof window.getAllEvents==='function'?window.getAllEvents():[]);
        allEvts.forEach(function(e){
          var t=String(e.title||e.summary||'').toLowerCase();
          if(!t.includes(kw)) return;
          var dk=(e.startDate||e.date||(e.start&&(e.start.date||e.start.dateTime))||'').slice(0,10);
          if(!dk) return;
          var d=new Date(dk+'T12:00:00');
          if(d<today){if(!pastBest||d>new Date(pastBest+'T12:00:00'))pastBest=dk;}
          else{if(!futureBest||d<new Date(futureBest.date+'T12:00:00'))futureBest={date:dk,title:String(e.title||e.summary||''),time:e.time||''};}
        });
        lastDate=pastBest;
        nextInfo=futureBest;
      }

      var nextDate=nextInfo&&nextInfo.date;
      var fmtS=function(k){try{return new Date(k+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'short'});}catch(e){return k;}};
      var weeks=typeof window.getFriseurWeeks==='function'?window.getFriseurWeeks():3;
      var days=lastDate?Math.round((Date.now()-new Date(lastDate+'T12:00:00'))/86400000):null;
      var overdue=days!==null&&days>=weeks*7;
      var daysUntilNext=nextDate?Math.round((new Date(nextDate+'T12:00:00')-Date.now())/86400000):null;

      var iconBg=overdue?'rgba(239,68,68,.12)':'rgba(156,163,175,.12)';
      var sub;
      if(nextDate && daysUntilNext !== null){
        var cd = daysUntilNext===0?'Heute geplant':daysUntilNext===1?'Morgen geplant':daysUntilNext===2?'Übermorgen geplant':'in '+daysUntilNext+' Tagen';
        var timeStr=nextInfo&&nextInfo.time?' · '+nextInfo.time+' Uhr':'';
        sub = cd+timeStr+(lastDate?' · Letzter: '+fmtS(lastDate):'');
      } else if(lastDate) {
        sub = overdue ? 'Friseurtermin überfällig · Letzter Termin vor '+days+' Tagen' : (days===0?'Heute erledigt':'Neuer Termin offen · Letzter Termin vor '+days+' Tagen');
      } else {
        sub='Neuer Termin offen';
      }

      var badge='';
      if(nextDate && daysUntilNext !== null){
        badge='<span class="dash-row-badge badge-green">'+fmtS(nextDate)+'</span>';
      } else if(overdue){
        badge='<span class="dash-row-badge badge-red">⚠ Überfällig</span>';
      } else {
        badge='<span class="dash-row-badge" style="background:var(--s2);color:var(--t4);border:1px solid var(--b1)">Offen</span>';
      }

      rows+=`<div class="dash-row" style="cursor:default">
        <div class="dash-row-icon" style="background:${iconBg};font-size:14px">✂️</div>
        <div class="dash-row-body">
          <div class="dash-row-title">Friseur</div>
          <div class="dash-row-sub">${sub}</div>
        </div>
        ${badge}
      </div>`;
    }
  }

  // ==== Weitere Tracker hier ergänzen ====
  // Beispiel: Arzt, Auto-Service, etc.
  // if(arztOn){ rows += renderArztRow(); }

  return rows;
}

function buildDashCards(){
  const dashGrid=document.getElementById('dash-grid');
  if(!dashGrid) return;
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

  // Tracker-Rows (Friseur + künftige Erweiterungen)
  const trackerHtml=(function(){
    try{
      var rows=renderTrackerRows();
      if(!rows) return '';
      return '<div class="dash-section-label" style="margin-top:0">Tracker</div>'+rows;
    }catch(e){return '';}
  }());

  dashGrid.innerHTML=`
    <div class="dash-card"><div class="dash-card-head"><div><div class="dash-card-title">📅 Anstehende Termine</div><div class="dash-card-sub">Nächste 14 Tage</div></div><button class="btn btn-ghost btn-sm" onclick="setMainView('calendar')">Alle →</button></div><div class="dash-card-body">${evHtml}${trackerHtml}</div></div>
    <div class="dash-card"><div class="dash-card-head"><div><div class="dash-card-title">🏆 Challenge-Kontest</div><div class="dash-card-sub">Punkte &amp; Rangliste</div></div><button class="btn btn-ghost btn-sm" onclick="setMainView('challenges')">Öffnen →</button></div><div class="dash-card-body">${chHtml}</div></div>`;
}

function renderLeaderboardMini(){
  if(typeof calcStats!=='function'||typeof getPlayers!=='function') return '<div class="dash-empty">Keine Kontest-Daten</div>';
  const stats=calcStats();
  return getPlayers().sort((a,b)=>(stats[b.email]?.points||0)-(stats[a.email]?.points||0)).slice(0,5).map((p,idx)=>`<div class="dash-row" onclick="setMainView('challenges')"><div class="dash-row-icon" style="background:var(--amb-d)">${idx+1}</div><div class="dash-row-body"><div class="dash-row-title">${esc(p.name||p.email)}</div><div class="dash-row-sub">${stats[p.email]?.count||0} Challenges erledigt</div></div><span class="dash-row-badge badge-green">${stats[p.email]?.points||0} P</span></div>`).join('')||'<div class="dash-empty">Noch keine Punkte</div>';
}


/* CALENDAR */
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
        <div class="ag-time">${ev.time?(ev.time+(ev.endTime&&ev.endTime!==ev.time?' – '+ev.endTime:'')):'Ganztägig'}</div>
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

/* EVENT PANEL (CALENDAR) */
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
  /* no close */
if(currentMainView==='calendar'){renderCalendar();renderUpcoming();}
  checkNotifications();
  if(currentMainView==='dashboard')buildDashboard();
  toast(existingId?'Termin aktualisiert ✓':'Termin erstellt ✓','ok');
}

window._execDeleteEvent = function(id){
  events = (events||[]).filter(function(e){ return e.id!==id; });
  if(typeof ls==='function') ls('events', events);
  if(typeof closePanel==='function') /* no close */
if(currentMainView==='calendar'){
    if(typeof renderCalendar==='function') renderCalendar();
    if(typeof renderUpcoming==='function') renderUpcoming();
  }
  if(typeof checkNotifications==='function') checkNotifications();
  if(typeof window.buildDashboard==='function') window.buildDashboard();
  if(typeof toast==='function') toast('Termin gelöscht','ok');
};
function _doDelEvent(id){
  events=(events||[]).filter(function(e){return e.id!==id;});
  ls('events',events);
  closePanel();
  if(currentMainView==='calendar'){renderCalendar();if(typeof renderUpcoming==='function')renderUpcoming();}
  if(typeof checkNotifications==='function')checkNotifications();
  buildDashboard();
  toast('Termin gelöscht ✓','ok');
}
function deleteEvent(id){
  var ev=(events||[]).find(function(e){return e.id===id;});
  var t=esc((ev&&ev.title)?ev.title:'Termin');
  openPanel('Termin löschen',
    '<div class="push-box" style="margin-bottom:14px">'+
      '<div class="toggle-title" style="font-weight:700">'+t+'</div>'+
      '<div class="toggle-sub" style="margin-top:4px">Diesen Termin wirklich löschen?</div>'+
    '</div>'+
    '<button class="btn btn-danger btn-full" onclick="_doDelEvent('+JSON.stringify(id)+')">Löschen</button>'+
    '<button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="closePanel()">Abbrechen</button>'
  );
}

function openDayPanel(dt,dayEvs){
  const ds=`${DE_DAYS_F[dt.getDay()]}, ${dt.getDate()}. ${DE_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  let html=`<div style="font-size:12px;color:var(--t4);margin-bottom:12px;font-weight:600">${ds}</div>`;
  dayEvs.forEach(ev=>{
    html+=`<div class="ag-card ${ev.color}" style="margin-bottom:8px" onclick="openEventPanel('${ev.id}')">
      <div class="ag-time">${ev.time?(ev.time+(ev.endTime&&ev.endTime!==ev.time?' – '+ev.endTime:'')):'Ganztägig'}</div>
      <div class="ag-body"><div class="ag-title">${esc(ev.title)}</div>${ev.desc?`<div class="ag-desc">${esc(ev.desc)}</div>`:''}</div>
    </div>`;
  });
  html+=`<button class="btn btn-primary btn-full" style="margin-top:10px" onclick="openEventPanel(null,new Date('${dateKey(dt)}'))">+ Neuer Termin für diesen Tag</button>`;
  openPanel(`${dayEvs.length} Termine`,html);
}

/* GOOGLE APIs */
async function loadGoogleData(){
  if(!accessToken){
    const cached = readGoogleEventsCache();
    if(cached.length){
      gEvents = cached;
      window.gEvents = gEvents;
      if(currentMainView==='calendar'){renderCalendar();renderUpcoming();}
      if(currentMainView==='dashboard')buildDashboard();
    }
    return false;
  }
  return await loadGoogleEvents();
  // Google-Kalender-Sync darf keinen Firestore-/Datenbank-Sync starten.
}

async function loadGoogleEvents(){
  if(!accessToken){
    const cached = readGoogleEventsCache();
    if(cached.length){
      gEvents = cached;
      window.gEvents = gEvents;
      if(currentMainView==='calendar'){renderCalendar();renderUpcoming();}
      if(currentMainView==='dashboard')buildDashboard();
    }
    return false;
  }
  try{
    // Wichtig für die erste Ansicht:
    // Urlaub und Friseur werden im Dashboard jahresbezogen ausgewertet.
    // Der alte Abruf holte nur curDate -1 bis +4 Monate; dadurch fehlten beim Start z. B. Februar-Termine,
    // bis man im Kalender in diesen Monat navigiert hatte. Deshalb laden wir den kompletten relevanten Zeitraum.
    const baseYear=(curDate instanceof Date&&!isNaN(curDate))?curDate.getFullYear():new Date().getFullYear();
    const start=new Date(baseYear-1,11,1,0,0,0).toISOString();
    const end=new Date(baseYear+1,0,31,23,59,59).toISOString();
    const r=await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&singleEvents=true&orderBy=startTime&maxResults=2500`,
      {headers:{'Authorization':'Bearer '+accessToken}}
    );
    if(r.status===401){
      lsDel('access_token');accessToken='';window.accessToken='';
      try{ if(window.ChangeGoogleSyncStatus && window.ChangeGoogleSyncStatus.markError) window.ChangeGoogleSyncStatus.markError('Google-Zugriff abgelaufen. Gespeicherte Kalenderdaten bleiben sichtbar.'); }catch(e){}
      return false;
    }
    if(!r.ok){
      try{ if(window.ChangeGoogleSyncStatus && window.ChangeGoogleSyncStatus.markError) window.ChangeGoogleSyncStatus.markError('Google Kalender '+r.status); }catch(e){}
      return false;
    }
    const data=await r.json();
    gEvents=data.items||[];
    window.gEvents=gEvents;
    window.events=events;
    writeGoogleEventsCache(gEvents);
    try{ if(window.ChangeGoogleSyncStatus && window.ChangeGoogleSyncStatus.markSuccess) window.ChangeGoogleSyncStatus.markSuccess(); }catch(e){}
    if(currentMainView==='calendar'){renderCalendar();renderUpcoming();}
    if(currentMainView==='dashboard')buildDashboard();
    return true;
  }catch(e){
    console.warn('GCal:',e);
    try{ if(window.ChangeGoogleSyncStatus && window.ChangeGoogleSyncStatus.markError) window.ChangeGoogleSyncStatus.markError(e && e.message ? e.message : String(e)); }catch(_e){}
    return false;
  }
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

/* ==== FIREBASE / LOCAL STORAGE BRIDGE ==== */
async function loadFromDrive(){
  // Daten werden lokal und – sobald Firebase verbunden ist – in Firestore synchronisiert.
  // Datenbank-Sync startet nicht automatisch beim Speichern/Laden.
}

async function saveToDrive(){
  // Kompatibilitätsfunktion: alte Aufrufe bleiben gültig, speichern aber nicht mehr in Firebase.
  ls('events', events);
  if(!persistChallengeStateToStore()){
    ls('challenges', challenges);
    ls('challenge_completions', challengeCompletions);
    ls('challenge_players', challengePlayers);
  }
  if(ls('live_sync_enabled')===true && typeof registerLivePlayer==='function') registerLivePlayer();
}

function showDriveStatus(){ /* nicht mehr benötigt */ }

/* NOTIFICATIONS */
function getUnreadNudgeCount(){
  try{
    return (JSON.parse(sessionStorage.getItem('change_nudges_in')||'[]')||[])
      .filter(function(n){ return n && n.localSeen !== true; }).length;
  }catch(_){ return 0; }
}

function getCalendarNotificationCount(){
  try{
    return (notifications||[]).filter(function(n){ return n && (n.urgency==='crit'||n.urgency==='warn'); }).length;
  }catch(_){ return 0; }
}

function updateBellIndicator(){
  const total = getCalendarNotificationCount() + getUnreadNudgeCount();
  const dot = document.getElementById('notif-dot');
  const badge = document.getElementById('notif-count-badge');
  if(dot) dot.style.display = total > 0 ? 'block' : 'none';
  if(badge){
    if(total > 0){
      badge.textContent = total > 9 ? '9+' : String(total);
      badge.style.display = 'block';
    }else{
      badge.textContent = '';
      badge.style.display = 'none';
    }
  }
}

function checkNotifications(){
  const allEvs=getAllEvents();
  notifications=[];
  try{ window.notifications = notifications; }catch(_){}
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
  try{ window.notifications = notifications; }catch(_){}
  updateBellIndicator();
}

function fireNotification(ev,daysLeft){
  if(Notification.permission!=='granted')return;
  const title=daysLeft===0?`Heute fällig: ${ev.title}`:`In ${daysLeft} Tag${daysLeft>1?'en':''}: ${ev.title}`;
  // Service Worker showNotification() – funktioniert auf iOS/Android (new Notification ist dort nicht erlaubt)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.ready.then(reg=>{
      reg.showNotification(title,{body:ev.desc||'Termin',icon:'./icons/icon-change-192.png',badge:'./icons/icon-change-192.png',tag:ev.id});
    }).catch(()=>{});
  }
}

function scheduleNotifCheck(){
  if(window._changeNotificationScheduleStarted) return;
  window._changeNotificationScheduleStarted = true;
  setInterval(()=>{
    try{
      if(window.ChangeNotifications && typeof window.ChangeNotifications.check === 'function') window.ChangeNotifications.check();
      else if(typeof checkNotifications === 'function') checkNotifications();
    }catch(_e){}
  },3600000);
}
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
      <div class="empty-sub">Keine neuen Benachrichtigungen</div>
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

/* PANEL SYSTEM */
function openPanel(title,html){
  var panel=document.getElementById('side-panel');
  var overlay=document.getElementById('panel-overlay');
  document.getElementById('panel-title').textContent=title;
  var panelBody = document.getElementById('panel-body');
  if(panelBody){
    panelBody.innerHTML = html;
    try{ panelBody.scrollTop = 0; }catch(e){}
  }
  if(panel){ panel.classList.add('open'); panel.style.pointerEvents='auto'; try{ panel.scrollTop = 0; }catch(e){} }
  if(overlay){ overlay.classList.add('show'); overlay.style.pointerEvents='auto'; overlay.removeAttribute('aria-hidden'); }
}
function closePanel(){
  var panel=document.getElementById('side-panel');
  var overlay=document.getElementById('panel-overlay');
  if(panel){ panel.classList.remove('open'); panel.style.pointerEvents='none'; }
  if(overlay){ overlay.classList.remove('show'); overlay.style.pointerEvents='none'; overlay.setAttribute('aria-hidden','true'); }
  releaseUiLock('closePanel');
}

/* TOAST */
function toast(msg,type){
  const w=document.getElementById('toast-wrap');
  const el=document.createElement('div');
  el.className='toast'+(type?' '+type:'');
  el.textContent=msg;
  w.appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .3s';setTimeout(()=>el.remove(),300);},3200);
}

/* AUTH / LOGOUT */
function confirmLogout(){
  const name=userInfo.name||userInfo.email||'Nutzer';
  const mail=userInfo.email||'';
  let picUrl = userInfo.picture || '';
  if(!picUrl){
    try{
      const fbU = window.firebase && firebase.auth ? firebase.auth().currentUser : null;
      if(fbU && fbU.photoURL) picUrl = fbU.photoURL;
    }catch(_e){}
  }
  const initials = (name||'?').split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase()||'?';
  const avatarInner = picUrl
    ? `<img src="${esc(picUrl)}" alt="" class="profile-panel-img">`
    : `<span class="profile-panel-initials">${esc(initials)}</span>`;
  const html=`
    <div class="profile-panel-hero">
      <div class="profile-panel-avatar">${avatarInner}</div>
      <div class="profile-panel-name">${esc(name)}</div>
      <div class="profile-panel-mail">${esc(mail)}</div>
    </div>
    <div class="change-settings-card">
      <button class="profile-panel-row" onclick="if(typeof window.clearChangeAppCache==='function'){this.querySelector('.profile-panel-row-title').textContent='Wird gelöscht …';this.disabled=true;setTimeout(()=>window.clearChangeAppCache(),200)}">
        <span class="profile-panel-row-icon">🗑️</span>
        <div class="profile-panel-row-body">
          <div class="profile-panel-row-title">Cache leeren &amp; neu laden</div>
          <div class="profile-panel-row-sub">Alle Daten frisch aus Firebase laden. Login bleibt erhalten.</div>
        </div>
        <svg class="profile-panel-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button class="profile-panel-row profile-panel-row--danger" onclick="logout()">
        <span class="profile-panel-row-icon">🚪</span>
        <div class="profile-panel-row-body">
          <div class="profile-panel-row-title">Abmelden</div>
          <div class="profile-panel-row-sub">${esc(mail)}</div>
        </div>
        <svg class="profile-panel-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>`;
  openPanel(name, html);
}
async function logout(){
  // 1. Google-Token revozieren – WICHTIG: verhindert GIS-Freeze beim naechsten Login.
  //    Wenn der Token NICHT revoziert wird, kennt Google den Nutzer noch.
  //    GIS oeffnet dann einen Popup der sich sofort schliesst → window.closed-Polling → Freeze.
  var tokenToRevoke = accessToken || (typeof ls==='function' ? ls('access_token') : '');
  if(tokenToRevoke){
    try{
      // Fire-and-forget: Token revozieren ohne auf Antwort zu warten
      navigator.sendBeacon('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(tokenToRevoke));
    }catch(e){
      try{ fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(tokenToRevoke), {method:'POST', mode:'no-cors'}); }catch(_e){}
    }
  }
  // 2. GIS-Zustand zuruecksetzen (falls Bibliothek geladen)
  try{ if(window.google && google.accounts && google.accounts.oauth2) google.accounts.oauth2.revoke(tokenToRevoke || '', ()=>{}); }catch(e){}
  // 3. Firebase signOut
  try{ if(window.firebase && firebase.auth) await firebase.auth().signOut(); }catch(e){}
  // 4. Alle Session-Daten loeschen
  lsDel('was_logged_in');
  lsDel('access_token'); lsDel('user_info'); lsDel('demo_mode');
  lsDel('change_v1_user_info'); lsDel('user_info_safe'); lsDel('change_v1_user_email'); lsDel('user_email');
  lsDel('change_gis_token'); lsDel('change_gis_ts');
  try{ sessionStorage.clear(); }catch(e){}
  accessToken = ''; userInfo = {};
  closePanel();
  // 5. Seitenreload – sauberer Start ohne alte Listener
  var url = window.location.href.split('?')[0].split('#')[0];
  window.location.replace(url + '?logout=' + Date.now());
}

/* ==== KEYBOARD ==== */
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

/* ==== TOUCH SWIPE (calendar) ==== */
let touchX0=0;
document.addEventListener('touchstart',e=>{touchX0=e.touches[0].clientX;},{passive:true});
document.addEventListener('touchend',e=>{
  if(document.getElementById('side-panel').classList.contains('open'))return;
  if(currentMainView!=='calendar')return;
  const dx=e.changedTouches[0].clientX-touchX0;
  if(Math.abs(dx)>60)navigate(dx<0?1:-1);
},{passive:true});

/* CHANGE EXTENSIONS: Challenges + Contest + Auto Sync */
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
    if(!syncChallengeStateFromStore(window.buildDefaultChallenges)){
      challenges = ls('challenges') || challenges || [];
      challengeCompletions = ls('challenge_completions') || challengeCompletions || [];
      challengePlayers = ls('challenge_players') || challengePlayers || [];
      if(!challenges.length){challenges = buildDefaultChallenges(); ls('challenges',challenges);}
    }
    ensureCurrentChallengePlayer();
    persistChallengeStateToStore();
  }


  async function persistChangeState(){
    ls('events',events);
    if(!persistChallengeStateToStore()){
      ls('challenges',challenges);
      ls('challenge_completions',challengeCompletions);
      ls('challenge_players',challengePlayers);
    }
    // [FIX AUTH-GUARD] Firestore nur wenn Firebase Auth aktiv
    const _fbU = (typeof firebase!=='undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if(ls('live_sync_enabled')===true && typeof registerLivePlayer==='function' && _fbU) registerLivePlayer();
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
      persistChallengeStateToStore() || ls('challenge_players',challengePlayers);
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
    div.innerHTML='<div class="list-header challenge-neo-header"><div><div class="list-title">Challenges</div></div><div class="challenge-view-actions"><button class="btn btn-ghost btn-sm" onclick="resetTodayChallenges()">Heute zurücksetzen</button></div></div><div class="challenge-layout"><div class="challenge-card"><div class="challenge-card-head"><div><div class="challenge-title">Heutige Aufgaben</div><div class="challenge-sub">Ein Klick erledigt eine Challenge und vergibt Punkte</div></div></div><div id="challenges-list"></div></div><div class="leader-card"><div class="leader-card-head"><div><div class="challenge-title">Team</div></div></div><div id="leaderboard-list"></div></div></div>';
    content.appendChild(div);
  }
  function installChallengeNav(){
    if(!document.getElementById('htab-challenges')){
      const tabs=document.querySelector('.h-tabs');
      const btn=document.createElement('button');
      btn.className='h-tab';
      btn.id='htab-challenges';
      btn.onclick=()=>setMainView('challenges');
      btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/></svg>Challenges';
      if(tabs) tabs.appendChild(btn);
    }
    if(!document.getElementById('bnav-challenges')){
      const nav=document.querySelector('.bnav-inner');
      const btn=document.createElement('button');
      btn.className='bnav-item';
      btn.id='bnav-challenges';
      btn.onclick=()=>setMainView('challenges');
      btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/></svg><span class="bnav-label">Challenges</span>';
      if(nav) nav.appendChild(btn);
    }
  }

  window.renderTodayView=function(){
    const ag=document.getElementById('agenda-view');
    if(!ag) return;
    const dk=dateKey(new Date());
    const hs=getHolidaysForDate(dk);
    const chs=challengeScheduleForDate(dk);
    const evs=eventRowsForDate(dk);
    let html='<div class="today-view"><div class="dash-hello"><h1>Heute</h1><p>'+fmtDate(dk)+'</p></div>';
    if(hs.length) html+='<div class="dash-card" style="margin-bottom:14px"><div class="dash-card-head"><div class="dash-card-title">Feiertage</div><div class="dash-card-sub">'+esc(STATE_OPTIONS[calendarSettings.state]||calendarSettings.state)+'</div></div><div class="dash-card-body">'+hs.map(h=>'<div class="dash-row"><div class="dash-row-icon" style="background:var(--amb-d)">🎉</div><div class="dash-row-body"><div class="dash-row-title">'+esc(h.name)+'</div><div class="dash-row-sub">'+esc(h.states.map(s=>STATE_OPTIONS[s]||s).join(', '))+'</div></div></div>').join('')+'</div></div>';
    html+='<div class="dash-card" style="margin-bottom:14px"><div class="dash-card-head"><div class="dash-card-title">Challenges</div><button class="btn btn-ghost btn-sm" onclick="setMainView(\'challenges\')">Öffnen</button></div><div class="dash-card-body">'+(chs.length?chs.map(ch=>'<div class="dash-row"><div class="dash-row-icon" style="background:var(--pur-d)">'+esc(ch.icon||'🏆')+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(ch.title)+'</div><div class="dash-row-sub">'+(ch.points||0)+' Punkte</div></div><button class="btn btn-primary btn-sm" onclick="completeChallenge(\''+ch.id+'\')">Erledigen</button></div>').join(''):'<div class="dash-empty">Heute keine Challenge geplant</div>')+'</div></div>';
    html+='<div class="dash-card"><div class="dash-card-head"><div class="dash-card-title">Termine</div></div><div class="dash-card-body">'+(evs.length?evs.map(ev=>'<div class="dash-row" onclick="openEventPanel(\''+ev.id+'\')"><div class="dash-row-icon" style="background:var(--acc-d)">📅</div><div class="dash-row-body"><div class="dash-row-title">'+esc(ev.title)+'</div><div class="dash-row-sub">'+(ev.time?(ev.time+(ev.endTime&&ev.endTime!==ev.time?' – '+ev.endTime:'')+' Uhr'):'Ganztägig')+'</div></div></div>').join(''):'<div class="dash-empty">Heute keine Termine</div>')+'</div></div></div>';
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
  window.goToday=function(){curDate=new Date();window.curDate=curDate;currentCalView='today';renderCalendar();};
  window.openCalendarSettings=function(){
    const state=calendarSettings.state||'ALL';
    const opts=Object.entries(STATE_OPTIONS).map(([k,v])=>'<option value="'+k+'" '+(k===state?'selected':'')+'>'+v+'</option>').join('');
    openPanel('Kalender-Einstellungen','<div class="fg"><label class="flabel">Bundesland für Feiertage & Benachrichtigungen</label><select class="finput" id="holiday-state">'+opts+'</select><div class="settings-hint">Wähle „Bayern · Augsburg“, damit auch das Augsburger Friedensfest als lokaler Feiertag erscheint.</div></div><div class="fg"><label class="flabel">Feiertags-Benachrichtigungen</label><select class="finput" id="holiday-notifications"><option value="1" '+(calendarSettings.holidayNotifications?'selected':'')+'>Aktiv</option><option value="0" '+(!calendarSettings.holidayNotifications?'selected':'')+'>Aus</option></select></div><button class="btn btn-primary btn-full" onclick="saveCalendarSettings()">Einstellungen speichern</button>');
  };
  window.saveCalendarSettings=function(){
    calendarSettings.state=document.getElementById('holiday-state')?.value||'ALL';
    calendarSettings.holidayNotifications=document.getElementById('holiday-notifications')?.value==='1';
    ls('holiday_state',calendarSettings.state); localStorage.setItem('change_v1_holiday_state',calendarSettings.state); ls('holiday_notifications',calendarSettings.holidayNotifications); /* no close */
renderCalendar(); toast('Kalender-Einstellungen gespeichert ✓','ok');
  };
  const originalOpenChallengePanel=window.openChallengePanel;
  window.openChallengePanel=function(id){
    const ch=id?challenges.find(c=>c.id===id):null;
    const html='<div class="fg"><label class="flabel">Titel *</label><input class="finput" id="ch-title" value="'+esc(ch?.title||'')+'" placeholder="z.B. 10 Minuten Bewegung"></div><div class="fr"><div class="fg"><label class="flabel">Punkte</label><input type="number" class="finput" id="ch-points" min="1" value="'+(ch?.points||10)+'"></div><div class="fg"><label class="flabel">Icon</label><input class="finput" id="ch-icon" value="'+esc(ch?.icon||'🏆')+'" placeholder="🏆"></div></div><div class="fr"><div class="fg"><label class="flabel">Challenge-Tag</label><input type="date" class="finput" id="ch-date" value="'+esc(ch?.date||ch?.startDate||dateKey(new Date()))+'"></div><div class="fg"><label class="flabel">Wiederholung</label><select class="finput" id="ch-recurrence"><option value="once" '+((ch?.recurrence||'once')==='once'?'selected':'')+'>Einmalig</option><option value="daily" '+(ch?.recurrence==='daily'?'selected':'')+'>Täglich</option></select></div></div><div class="fg"><label class="flabel">Beschreibung</label><textarea class="finput" id="ch-desc" rows="4" placeholder="Was muss erledigt werden?">'+esc(ch?.desc||'')+'</textarea></div><div class="fa"><button class="btn btn-primary" style="flex:1" onclick="saveChallenge(\''+(ch?.id||'')+'\')">'+(ch?'Aktualisieren':'Challenge speichern')+'</button>'+(ch?'<button class="btn btn-danger" onclick="deleteChallenge(\''+ch.id+'\')">Löschen</button>':'')+'</div>';
    openPanel(ch?'Challenge bearbeiten':'Neue Challenge',html);
  };
  window.saveChallenge=function(existingId){
    syncChallengeStateFromStore();
    const title=document.getElementById('ch-title')?.value.trim(); if(!title){toast('Bitte Titel eingeben','err');return;}
    const old=existingId?challenges.find(c=>c.id===existingId):null;
    const ch={id:existingId||'ch_'+uid(),title,points:parseInt(document.getElementById('ch-points')?.value)||10,icon:document.getElementById('ch-icon')?.value.trim()||'🏆',desc:document.getElementById('ch-desc')?.value.trim()||'',date:document.getElementById('ch-date')?.value||dateKey(new Date()),recurrence:document.getElementById('ch-recurrence')?.value||'once',active:true,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const i=challenges.findIndex(c=>c.id===ch.id); if(i>=0)challenges[i]=ch; else challenges.push(ch);
    persistChallengeStateToStore() || ls('challenges',challenges); persistChangeState(); closePanel(); renderChallenges(); buildDashboard(); renderCalendar(); toast('Challenge gespeichert ✓','ok');
  };
  const originalCompleteChallenge=window.completeChallenge;
  window.completeChallenge=function(id){
    syncChallengeStateFromStore();
    const ch=challenges.find(c=>c.id===id); if(!ch)return;
    const dk=dateKey(new Date()), me=getCurrentPlayerId();
    if((challengeCompletions||[]).some(c=>c.challengeId===id&&c.playerId===me&&c.date===dk)){toast('Diese Challenge ist heute schon erledigt','');return;}
    challengeCompletions.push({id:'cc_'+uid(),challengeId:id,playerId:me,playerName:userInfo.name||userInfo.email||'Ich',date:dk,points:parseInt(ch.points)||0,createdAt:new Date().toISOString()});
    persistChallengeStateToStore() || ls('challenge_completions',challengeCompletions); persistChangeState(); renderChallenges(); buildDashboard(); renderCalendar(); toast('+'+(ch.points||0)+' Punkte ✓','ok');
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



/* AUTO-CHALLENGES: täglich kleine Rätsel & Trainingsübungen */
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
    syncChallengeStateFromStore();
    if(ls(AUTO_KEY)===false) return [];
    window.challenges = window.challenges || challenges || [];
    const daily=autoChallengesForDate(dk);
    let changed=false;
    daily.forEach(ch=>{
      if(!challenges.some(x=>x.id===ch.id)){challenges.push(ch);changed=true;}
    });
    if(changed){persistChallengeStateToStore() || ls('challenges',challenges); if(typeof publishLocalChallengesToFirestore==='function') publishLocalChallengesToFirestore();}
    return daily;
  };
  window.setAutoChallengesEnabled=function(enabled){
    const on=!!enabled;
    ls(AUTO_KEY,on);
    try{localStorage.setItem('change_v1_auto_challenges_enabled', JSON.stringify(on)); localStorage.setItem('auto_challenges_enabled', JSON.stringify(on));}catch(e){}
    if(on) ensureDailyAutoChallenges();
    else{ try{ if(Array.isArray(challenges)){ challenges=challenges.filter(ch=>!(ch&&ch.auto===true)); persistChallengeStateToStore() || ls('challenges', challenges); } }catch(e){} }
    if(typeof renderChallenges==='function') renderChallenges();
    if(typeof renderCalendar==='function') renderCalendar();
    if(typeof buildDashboard==='function') buildDashboard();
    if(typeof window._refreshSyncPills==='function') window._refreshSyncPills();
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

/* ==========================
   FIREBASE EXTENSION: echte Push Notifications + automatische Mitspieler-Erkennung
   Voraussetzung: firebase/firebase-config.js, firebase-messaging-sw.js und manifest.json liegen im Repo.
========================== */
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

  window.initFirebaseLive = async function(options){
    options = options || {};
    const manualStart = options.manual === true || window.__changeLiveSyncManualStart === true;
    if(!manualStart){
      return false;
    }
    window.__changeLiveSyncManualStart = false;
    if(!hasFirebaseConfig() || !window.firebase){
      console.info('Firebase ist noch nicht konfiguriert. firebase-config.js ausfüllen.');
      return false;
    }
    try{
      if(!firebase.apps.length) fbApp=firebase.initializeApp(getFirebaseConfig());
      else fbApp=firebase.app();
      db=firebase.firestore();
      if(window.ensureChangeFirebaseAuth){
        const authOk = await window.ensureChangeFirebaseAuth({ silent:true });
        if(!authOk){ console.warn('Firebase Auth nicht bereit: Firestore-Sync/Push pausiert.'); return false; }
      }
      if(firebase.messaging && 'serviceWorker' in navigator && 'Notification' in window){ messaging=firebase.messaging(); }
      ls(FIREBASE_READY_KEY,true);
      installForegroundPushHandler();
      startChallengeReminderLoop();
      const startLiveFeatures = options.live === true || (options.live !== false && ls('live_sync_enabled') === true);
      if(!startLiveFeatures){
        return true;
      }
      await registerLivePlayer();
      startLivePlayersListener();
      startLiveCompletionsListener();
      return true;
    }catch(e){ console.warn('Firebase init fehlgeschlagen:',e); return false; }
  };

  window.registerLivePlayer = async function(){
    if(ls('live_sync_enabled')!==true) return;
    if(!db || !userInfo.email) return;
    // [FIX AUTH-GUARD] Firebase Auth muss aktiv sein
    const fbUser = (typeof firebase!=='undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if(!fbUser){ return; }
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
    if(ls('live_sync_enabled')!==true) return;
    if(!db || unsubscribePlayers) return;
    unsubscribePlayers=db.collection('change_players').onSnapshot(snap=>{
      snap.forEach(doc=>mergePlayer({id:doc.id,...doc.data()}));
      persistChallengeStateToStore() || ls('challenge_players',challengePlayers);
      if(currentMainView==='challenges') renderChallenges();
      if(currentMainView==='dashboard') buildDashboard();
    },err=>console.warn('Players listener:',err));
  }

  function startLiveCompletionsListener(){
    if(ls('live_sync_enabled')!==true) return;
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
      persistChallengeStateToStore() || ls('challenge_completions',challengeCompletions);
      if(currentMainView==='challenges') renderChallenges();
      if(currentMainView==='dashboard') buildDashboard();
      if(currentMainView==='calendar') renderCalendar();
    },err=>console.warn('Completions listener:',err));
  }

  async function publishCompletionToFirestore(completion){
    if(ls('live_sync_enabled')!==true) return;
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
    function fail(message, showToast){
      try{ ls('push_enabled', false); }catch(_e){}
      try{ localStorage.setItem('change_push_enabled','0'); }catch(_e){}
      if(showToast !== false && typeof toast === 'function') toast(message, 'err');
      return false;
    }
    if(!hasFirebaseConfig()) return fail('Firebase ist noch nicht eingerichtet: firebase-config.js ausfüllen');
    if(!('serviceWorker' in navigator)) return fail('Dieser Browser unterstützt keine Service Worker');
    if(!('Notification' in window)) return fail('Dieser Browser unterstützt keine Push-Mitteilungen');
    if(Notification.permission === 'denied') return fail('Benachrichtigungen sind im Browser blockiert');
    if(isIOSDevice() && !isStandaloneApp()){
      try{ installChangeApp(); }catch(_e){}
      return fail('iPhone: erst Change zum Home-Bildschirm hinzufügen');
    }
    const authReady = window.ensureChangeFirebaseAuth ? await window.ensureChangeFirebaseAuth({ silent:false, interactive:true }) : true;
    if(!authReady) return fail('Push braucht eine gültige Firebase-Anmeldung. Bitte einmal neu mit Google anmelden');
    window.__changeLiveSyncManualStart = true;
    const ok = await initFirebaseLive({manual:true, live:false});
    if(!ok) return fail('Firebase konnte nicht gestartet werden');
    try{
      let perm = Notification.permission;
      if(perm === 'default') perm = await Notification.requestPermission();
      if(perm !== 'granted') return fail('Benachrichtigungen wurden nicht erlaubt');

      // SW wurde bereits in initPWA() registriert – hier nur auf ready warten
      const reg = await navigator.serviceWorker.ready;

      const vapid = getVapidKey();
      if(!vapid || vapid.includes('HIER_')) return fail('VAPID Key fehlt in firebase-config.js');
      if(!messaging) messaging = firebase.messaging();
      const token = await messaging.getToken({vapidKey:vapid, serviceWorkerRegistration:reg});
      if(!token) throw new Error('Kein Push-Token erhalten');

      ls('fcm_token', token);
      ls('push_enabled', true);
      try{ localStorage.setItem('change_push_enabled','1'); }catch(_e){}
      await db.collection('change_players').doc(safeDocId(currentEmail())).set({
        ...publicPlayer(), fcmToken:token, pushEnabled:true, tokenUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});
      if(typeof toast === 'function') toast('Push-Benachrichtigungen aktiviert ✓','ok');
      return true;
    }catch(e){
      console.warn('Push aktivieren:', e);
      return fail('Push konnte nicht aktiviert werden: '+(e.message||e));
    }
  };

  function installForegroundPushHandler(){
    if(!messaging || messaging._changeHandlerInstalled) return;
    messaging.onMessage(payload=>{
      const n=payload.notification||{};
      if(Notification.permission==='granted' && 'serviceWorker' in navigator){
        navigator.serviceWorker.ready.then(reg=>{
          reg.showNotification(n.title||'Change',{body:n.body||'',icon:'./icons/icon-change-192.png',badge:'./icons/icon-change-192.png'});
        }).catch(()=>{});
      }
      toast(n.title||'Neue Change-Nachricht','ok');
    });
    messaging._changeHandlerInstalled=true;
  }

  function openLocalNotification(title,body){
    if('Notification' in window && Notification.permission==='granted' && 'serviceWorker' in navigator){
      navigator.serviceWorker.ready.then(reg=>{
        reg.showNotification(title,{body,icon:'./icons/icon-change-192.png',badge:'./icons/icon-change-192.png'});
      }).catch(()=>{});
    }
  }
  function startChallengeReminderLoop(){
    if(window._changeReminderLoop) return;
    window._changeReminderLoop=setInterval(()=>{
      try{
        const today=dateKey(new Date());
        // Strict filter: only challenges that explicitly belong to today (not "any time")
        let allCh=[];
        if(typeof challengeScheduleForDate==='function'){
          allCh=challengeScheduleForDate(today);
        } else {
          allCh=(challenges||[]).filter(function(ch){
            return ch.active!==false && (ch.recurrence==='daily' || ch.date===today);
          });
        }
        allCh=allCh.filter(function(ch){ return ch.active!==false && !ch.optional; });
        if(!allCh.length) return;
        const me2=(typeof currentEmail==='function'?currentEmail():String(((typeof userInfo!=='undefined'?userInfo:{})||{}).email||'')).toLowerCase();
        const doneIds=new Set((challengeCompletions||[]).filter(function(c){ return String(c.date||'').slice(0,10)===today&&String(c.playerId||c.email||c.userEmail||'').toLowerCase()===me2; }).map(function(c){ return c.challengeId; }));
        const open=allCh.filter(function(ch){ return !doneIds.has(ch.id); });
        const key=today+'_'+open.length;
        if(open.length && key!==lastChallengeNotifyKey){
          lastChallengeNotifyKey=key;
          openLocalNotification('Change: offene Challenges', open.length+' Übung'+(open.length===1?'':'en')+' heute noch offen.');
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

  window.disablePushNotifications = async function(options){
    options = options || {};
    try{
      window.__changeLiveSyncManualStart = true;
      await initFirebaseLive({manual:true, live:false});
      if(messaging){
        const token=ls('fcm_token');
        if(token){ try{ await messaging.deleteToken(token); }catch(_e){} }
      }
      lsDel('fcm_token');
      ls('push_enabled',false);
      if(db && userInfo.email){
        await db.collection('change_players').doc(safeDocId(currentEmail())).set({pushEnabled:false,fcmToken:'',tokenUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      }
      if(!options.silent && typeof toast === 'function') toast('Push-Benachrichtigungen deaktiviert','ok');
      if(!options.keepPanel && window.ChangeNotificationBell && typeof window.ChangeNotificationBell.render === 'function') window.ChangeNotificationBell.render();
    }catch(e){ console.warn('Push deaktivieren:',e); if(!options.silent && typeof toast === 'function') toast('Push konnte nicht deaktiviert werden','err'); return false; }
    return true;
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
        toast('Datenbank-Sync deaktiviert','ok');
      }else{
        window.__changeLiveSyncManualStart = true;
        const liveOk = await initFirebaseLive({manual:true, live:true});
        if(liveOk && typeof window.startChangeSettingsSync === 'function') await window.startChangeSettingsSync();
        toast(liveOk ? 'Datenbank-Sync verbunden ✓' : 'Datenbank-Sync ist aktuell nicht verfügbar','ok');
      }
    }catch(e){ console.warn('Datenbank-Sync Umschalten:',e); toast('Datenbank-Sync konnte nicht geändert werden','err'); }
    openPushSettingsPanel();
  };

  window.openPushSettingsPanel = function(){
    if(window.openSettingsPanel) return window.openSettingsPanel('sync');
    if(typeof openPanel === 'function') openPanel('Sync', '<div class="dash-empty">Sync-Einstellungen werden geladen.</div>');
  };

  window.openParticipantPanel = function(){
    // Datenbank-Sync startet nicht beim Öffnen der Mitspieler-Ansicht.
    const players=[...(challengePlayers||[])].sort((a,b)=>(b.online===true)-(a.online===true)||String(a.name||'').localeCompare(String(b.name||'')));
    const html='<div class="section-label">Automatisch erkannte Mitspieler</div>'+
      (players.length?players.map(p=>'<div class="leader-row"><div class="leader-rank">'+(p.picture?'<img src="'+esc(p.picture)+'" style="width:28px;height:28px;border-radius:50%;object-fit:cover">':'👤')+'</div><div><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+(p.email===userInfo.email?' · Du':'')+(p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>')+'</div><div class="leader-detail">'+esc(p.email||'')+'</div></div></div>').join(''):'<div class="dash-empty">Noch keine Mitspieler erkannt. Sobald sich jemand mit Google anmeldet, erscheint er hier automatisch.</div>')+
      '<div class="settings-hint">Manuelles Hinzufügen ist deaktiviert. Jeder Google-Login wird automatisch als Mitspieler registriert.</div>';
    openPanel('Mitspieler',html);
  };

  const _boot=window.bootMainApp;
  window.bootMainApp=function(){ _boot.apply(this,arguments); /* Datenbank-Sync startet nur über den Schalter. */ };
  if(typeof window.setDatabaseSyncEnabled !== 'function') window.setDatabaseSyncEnabled = window.setLiveSyncEnabled;

  const _fetchUserInfo=window.fetchUserInfo;
  if(_fetchUserInfo){
    window.fetchUserInfo=async function(){ const r=await _fetchUserInfo.apply(this,arguments); exposeChangeGlobals(); return r; };
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

  // Kein automatischer Datenbank-Sync nach Login.
})();

/* ==== FIREBASE EXTENSION 2: Challenges live veröffentlichen ==== */
(function(){
  function hasCfg(){const c=window.FIREBASE_CONFIG||{};return !!(c.apiKey&&!String(c.apiKey).includes('HIER_')&&c.projectId&&window.firebase)}
  function getDb(){try{return firebase.firestore()}catch(e){return null}}
  function publishTodayKey(){ return dateKey(new Date()); }
  function publishChallengeDate(ch){
    if(!ch) return '';
    const raw = ch.generatedFor || ch.date || ch.startDate || '';
    const direct = String(raw || '').slice(0,10);
    if(direct) return direct;
    const m = String(ch.id || '').match(/^auto_(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }
  function isOptionalChallengeForPublish(ch){
    return !!(ch && (ch.optional === true || ch._optional === true || /^opt_/i.test(String(ch.id || ''))));
  }
  function shouldPublishChallengeDoc(ch){
    if(!ch || !ch.id || ch.active === false || isOptionalChallengeForPublish(ch)) return false;
    const id = String(ch.id || '');
    const isAuto = ch.auto === true || ch.source === 'auto' || !!ch.generatedFor || /^auto_\d{4}-\d{2}-\d{2}/.test(id) || /^auto_.*_sport_/.test(id);
    if(!isAuto) return true;
    const today = publishTodayKey();
    if(publishChallengeDate(ch) !== today) return false;
    try{
      if(window.ChangeChallengeDifficulty && typeof window.ChangeChallengeDifficulty.isManagedAutoChallenge === 'function'){
        return window.ChangeChallengeDifficulty.isManagedAutoChallenge(ch, today) === true;
      }
    }catch(e){}
    return true;
  }
  function chDueData(ch){return {
    id:String(ch.id),
    title:ch.title||'Challenge',
    desc:ch.desc||'',
    points:parseInt(ch.points)||0,
    icon:ch.icon||'🏆',
    url:ch.url||ch.link||ch.youtubeUrl||'',
    source:ch.source || (ch.auto===true?'auto':''),
    sourceId:ch.sourceId||ch.templateId||'',
    templateId:ch.templateId||ch.sourceId||'',
    difficulty:ch.difficulty||'',
    difficultyLabel:ch.difficultyLabel||ch.level||'',
    generatedFor:ch.generatedFor||ch.date||'',
    generationKey:ch.generationKey||'',
    autoVersion:ch.autoVersion||'',
    sortIndex:ch.sortIndex!=null?ch.sortIndex:null,
    auto:ch.auto===true,
    type:ch.type||'Sport',
    date:ch.date||ch.startDate||dateKey(new Date()),
    recurrence:ch.recurrence||'once',
    active:ch.active!==false,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  }}
  window.publishChallengesToFirestore=async function(options){
    options = options || {};
    syncChallengeStateFromStore();
    try{ if(typeof window.ensureDailyAutoChallenges === 'function') window.ensureDailyAutoChallenges(dateKey(new Date())); }catch(e){}
    const dbSyncOn = (ls('database_sync_enabled')===true || ls('live_sync_enabled')===true || options.manual===true);
    if(!dbSyncOn) return;
    if(!hasCfg()) return;
    const db=getDb(); if(!db) return;
    if(window.ensureChangeFirebaseAuth){
      const authOk = await window.ensureChangeFirebaseAuth({silent:true});
      if(!authOk) return;
    }
    try{
      const seen = new Set();
      for(const ch of (challenges||[])){
        if(!shouldPublishChallengeDoc(ch)) continue;
        const id = String(ch.id);
        if(seen.has(id)) continue;
        seen.add(id);
        await db.collection('change_challenges').doc(id).set(chDueData(ch),{merge:true});
      }
    }catch(e){console.warn('Challenge live publish:',e)}
  };
  window.listenLiveChallenges=function(){
    syncChallengeStateFromStore();
    if(ls('live_sync_enabled')!==true) return;
    if(window._changeLiveChallengesListener || !hasCfg()) return;
    const db=getDb(); if(!db) return;
    window._changeLiveChallengesListener=db.collection('change_challenges').where('active','==',true).onSnapshot(snap=>{
      snap.forEach(doc=>{const ch={id:doc.id,...doc.data()}; const i=(challenges||[]).findIndex(x=>x.id===ch.id); if(i>=0) challenges[i]={...challenges[i],...ch}; else challenges.push(ch);});
      try{
        if(window.ChangeChallengeDifficulty && typeof window.ChangeChallengeDifficulty.reconcileChallenges === 'function'){
          const dk = dateKey(new Date());
          const daily = window.ChangeChallengeDifficulty.buildDailyChallenges(dk);
          challenges = window.ChangeChallengeDifficulty.reconcileChallenges(challenges, daily, dk);
        }
      }catch(e){}
      persistChallengeStateToStore() || ls('challenges',challenges);
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


/* FINAL PATCH: Kalender-Sync, Sport-Challenges, Contest-Details */
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
    persistChallengeStateToStore() || (ls('challenges',challenges), ls('challenge_players',challengePlayers));
  }
  const oldBoot=window.bootMainApp;
  window.bootMainApp=function(){ oldBoot.apply(this,arguments); setTimeout(()=>{normalizeSportChallenges(); if(typeof renderChallenges==='function')renderChallenges(); if(typeof buildDashboard==='function')buildDashboard(); if(typeof renderCalendar==='function')renderCalendar();},150); };
  window.buildDefaultChallenges=function(){ return SPORT_POOL.slice(0,4).map(x=>({...x,active:true,type:'Sport',createdAt:new Date().toISOString()})); };
  window.ensureDailyAutoChallenges=function(dk=dkToday()){
    syncChallengeStateFromStore();
    if(ls('auto_challenges_enabled')===false) return [];
    const daily=SPORT_POOL.slice(0,3).map((base,i)=>({id:'auto_'+dk+'_sport_'+i,title:base.title,desc:base.desc,points:base.points,icon:base.icon,date:dk,recurrence:'once',active:true,auto:true,type:'Sport',createdAt:dk+'T00:00:00.000Z'}));
    let changed=false;
    challenges=(challenges||[]).filter(c=>!c.auto || String(c.id||'').startsWith('auto_'+dk+'_sport_'));
    daily.forEach(ch=>{ if(!challenges.some(x=>x.id===ch.id)){challenges.push(ch); changed=true;} });
    if(changed){persistChallengeStateToStore() || ls('challenges',challenges); if(typeof publishChallengesToFirestore==='function') publishChallengesToFirestore();}
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
    syncChallengeStateFromStore();
    normalizeSportChallenges(); ensureDailyAutoChallenges();
    syncChallengeStateFromStore();
    const list=document.getElementById('challenges-list'); const board=document.getElementById('leaderboard-list'); if(!list||!board)return;
    const active=(challenges||[]).filter(c=>c.active!==false);
    list.innerHTML=active.length?active.map(ch=>{const done=isChallengeDoneToday(ch.id); return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc(ch.icon||'🏃')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title)+'</div><div class="challenge-meta">'+esc(ch.desc||'')+' · '+(ch.points||0)+' Punkte</div></div><span class="points-pill">+'+(ch.points||0)+'</span><button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+ch.id+'\')">'+(done?'Erledigt':'Erledigen')+'</button></div>';}).join(''):'<div class="empty-state"><div class="empty-title">Keine Sportübungen</div><div class="empty-sub">Auto-Challenges aktivieren oder Sportübung anlegen.</div></div>';
    const players=getVisibleContestPlayers(); players.sort((a,b)=>getPlayerPointSummary(playerKey(b)).totalPoints-getPlayerPointSummary(playerKey(a)).totalPoints);
    board.innerHTML=players.length?players.map((p,idx)=>{const id=playerKey(p); const st=getPlayerPointSummary(id); const me=id===getCurrentPlayerId(); const medal=idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':(idx+1); const live=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>'; const nudgeBtn = me ? '' : '<button class="nudge-btn" onclick="event.stopPropagation();window.sendNudge(\''+esc(id)+'\',\''+esc(p.name||p.email||'Mitspieler')+'\')" title="Anfeuern"><span class="nudge-btn-icon">💪</span><span class="nudge-btn-label">Anfeuern</span></button>';
      return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+esc(id)+'\')"><div class="leader-rank">'+medal+'</div><div style="flex:1"><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+live+'</div><div class="leader-detail">Heute: '+st.todayPoints+' Punkte · Gesamt: '+st.totalPoints+' Punkte · '+st.totalCount+' erledigt</div></div><div style="display:flex;align-items:center;gap:8px">'+nudgeBtn+'<div class="leader-score">'+st.totalPoints+'</div></div></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler. Sobald sich jemand mit Google anmeldet, erscheint er hier automatisch.</div>';
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
    const i=events.findIndex(e=>e.id===ev.id); if(i>=0)events[i]=ev; else events.push(ev); ls('events',events); /* no close */
if(currentMainView==='calendar'){renderCalendar();renderUpcoming();} checkNotifications(); if(currentMainView==='dashboard')buildDashboard(); if(typeof saveToDrive==='function') saveToDrive(); toast(existingId?'Termin aktualisiert ✓':'Termin erstellt ✓','ok'); if(accessToken&&!isDemoMode) syncEventToGoogleReliable(ev);
  };
  window.saveToGoogleCal=function(existingId){
    const title=document.getElementById('ev-title')?.value.trim(); const date=document.getElementById('ev-date')?.value; if(!title||!date){toast('Bitte Titel und Datum eingeben','err');return;}
    const old=existingId?events.find(e=>e.id===existingId):null; const ev={id:existingId||'ev_'+uid(),title,date,time:document.getElementById('ev-time')?.value||'',endTime:document.getElementById('ev-end')?.value||'',type:document.getElementById('ev-type')?.value||'meeting',color:document.getElementById('ev-color')?.value||'blue',desc:document.getElementById('ev-desc')?.value.trim()||'',notifDaysBefore:parseInt(document.getElementById('ev-notif')?.value||'1'),allDay:!document.getElementById('ev-time')?.value,source:'local',googleEventId:old?.googleEventId||'',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const i=events.findIndex(e=>e.id===ev.id); if(i>=0)events[i]=ev; else events.push(ev); ls('events',events); /* no close */
if(currentMainView==='calendar'){renderCalendar();renderUpcoming();} syncEventToGoogleReliable(ev);
  };
  setTimeout(()=>{normalizeSportChallenges(); if(typeof renderChallenges==='function') renderChallenges();},500);
})();



/* FINAL FIX 2: Demo-User aus echtem Contest, Sportlinks, Kalender-403-Hilfe */
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
      persistChallengeStateToStore() || (ls('challenge_players',challengePlayers), ls('challenge_completions',challengeCompletions));
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
    persistChallengeStateToStore() || ls('challenges',challenges);
  }
  window.buildDefaultChallenges=function(){return SPORTS_ONLY_POOL.slice(0,4).map(x=>({...x,active:true,type:'Sport',createdAt:new Date().toISOString()}));};
  window.ensureDailyAutoChallenges=function(dk=dateKey(new Date())){
    syncChallengeStateFromStore();
    if(ls('auto_challenges_enabled')===false) return [];
    stripNonSport();
    const dayIndex=Math.floor(new Date(dk+'T12:00:00').getTime()/86400000);
    const picks=[0,1,2].map(i=>SPORTS_ONLY_POOL[(dayIndex+i)%SPORTS_ONLY_POOL.length]);
    const daily=picks.map((base,i)=>({id:'auto_'+dk+'_sport_'+i,title:base.title,desc:base.desc,points:base.points,icon:base.icon,url:base.url,level:base.level,date:dk,recurrence:'once',active:true,auto:true,type:'Sport',createdAt:dk+'T00:00:00.000Z'}));
    challenges=(challenges||[]).filter(c=>!c.auto || String(c.id||'').startsWith('auto_'+dk+'_sport_'));
    daily.forEach(ch=>{ if(!challenges.some(x=>x.id===ch.id)) challenges.push(ch); });
    persistChallengeStateToStore() || ls('challenges',challenges);
    if(typeof publishChallengesToFirestore==='function') setTimeout(()=>publishChallengesToFirestore(),50);
    return daily;
  };
  window.getVisibleContestPlayers=function(){
    syncChallengeStateFromStore();
    clearDemoEverywhere();
    const seen=new Set();
    return (challengePlayers||[]).filter(p=>isDemoMode || !isDemo(p)).filter(p=>{const k=String(p.email||p.id||'').toLowerCase(); if(!k||seen.has(k)) return false; seen.add(k); return true;});
  };
  window.getPlayerPointSummary=function(playerId){
    syncChallengeStateFromStore();
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
    syncChallengeStateFromStore();
    ensureDailyAutoChallenges();
    syncChallengeStateFromStore();
    clearDemoEverywhere();
    const list=document.getElementById('challenges-list'); const board=document.getElementById('leaderboard-list'); if(!list||!board)return;
    const active=(challenges||[]).filter(c=>c.active!==false && (c.type==='Sport' || /^sport_|^auto_.*_sport_/.test(c.id||'')));
    list.innerHTML=active.length?active.map(ch=>{const done=isChallengeDoneToday(ch.id); const link=ch.url?'<a href="'+safeUrl(ch.url)+'" target="_blank" rel="noopener" class="challenge-meta" onclick="event.stopPropagation()">So geht die Übung</a>':''; return '<div class="challenge-item '+(done?'challenge-done':'')+'"><div class="challenge-icon">'+esc(ch.icon||'🏃')+'</div><div class="challenge-body"><div class="challenge-name">'+esc(ch.title)+'</div><div class="challenge-meta">'+esc(ch.desc||'')+' · '+esc(ch.level||'leicht')+' · '+(ch.points||0)+' Punkte</div>'+link+'</div><span class="points-pill">+'+(ch.points||0)+'</span><button class="btn '+(done?'btn-success':'btn-primary')+' btn-sm" onclick="completeChallenge(\''+ch.id+'\')">'+(done?'Erledigt':'Erledigen')+'</button></div>';}).join(''):'<div class="empty-state"><div class="empty-title">Keine Sportübungen</div><div class="empty-sub">Aktiviere Auto-Challenges oder lege eine Sportübung an.</div></div>';
    const players=getVisibleContestPlayers(); players.sort((a,b)=>getPlayerPointSummary(String(b.email||b.id).toLowerCase()).totalPoints-getPlayerPointSummary(String(a.email||a.id).toLowerCase()).totalPoints);
    board.innerHTML=players.length?players.map((p,idx)=>{const id=String(p.email||p.id||'').toLowerCase(); const st=getPlayerPointSummary(id); const me=id===getCurrentPlayerId(); const medal=idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':(idx+1); const live=p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>'; const nudgeBtn=me?'':'<button class="nudge-btn" onclick="event.stopPropagation();window.sendNudge(\''+esc(id)+'\',\''+esc(p.name||p.email||'Mitspieler')+'\')" title="Anfeuern"><span class="nudge-btn-icon">💪</span><span class="nudge-btn-label">Anfeuern</span></button>'; return '<div class="leader-row clickable" onclick="openContestUserDetails(\''+esc(id)+'\')"><div class="leader-rank">'+medal+'</div><div style="flex:1"><div class="leader-name">'+esc(p.name||p.email||'Mitspieler')+live+'</div><div class="leader-detail">Heute: '+st.todayPoints+' P · Gesamt: '+st.totalPoints+' P · '+st.totalCount+' erledigt</div></div><div style="display:flex;align-items:center;gap:8px">'+nudgeBtn+'<div class="leader-score">'+st.totalPoints+'</div></div></div>';}).join(''):'<div class="dash-empty">Noch keine Mitspieler. Sobald sich jemand mit Google anmeldet, erscheint er hier automatisch.</div>';
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

/* FINAL CALENDAR REPAIR: readable month view, holidays inline, points bottom-right, settings fixed */
(function(){
  const DAY=86400000;
  const $=id=>document.getElementById(id);
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: +backtick]
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
    if(typeof closePanel==='function') /* no close */
renderCalendar(); if(typeof toast==='function') toast('Kalender-Einstellungen gespeichert ✓','ok');
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

/* CHANGE CLEAN DASHBOARD FIX v2026-05-01-ROBUST
   Last loaded dashboard renderer. No extra files required.
   Fixes: dashboard calendar shows holidays, dates are bound left to content, today is visible. */
(function(){
  'use strict';
  const $ = (id)=>document.getElementById(id);
  const pad = (n)=>String(n).padStart(2,'0');
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: +backtick]
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
      const isBday = typeof window.isBirthday==='function' && window.isBirthday(r.title);
      const evIcon = isBday ? '🎂' : '📅';
      const evRowCls = isBday ? 'change-dashboard-row change-bday-row' : 'change-dashboard-row';
      const evIconCls = isBday ? 'dash-row-icon change-icon-bday' : 'dash-row-icon change-icon-event';
      return '<div class="dash-row '+evRowCls+' '+((r.start<=today()&&r.end>=today())?'change-today-row':'')+'" onclick="setMainView(\'calendar\')">'+dateBlock(r)+'<div class="'+evIconCls+'">'+evIcon+'</div><div class="dash-row-body"><div class="dash-row-title">'+esc(r.title)+'</div><div class="dash-row-sub">'+sub+'</div></div></div>';
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
window.openEventPanel=function(id,pre){let ev=id?getEventById(id):null;if(ev&&ev.source==='google'){let r=rng(ev);openPanel(ev.title,'<div class="google-detail"><span class="gmark big">G</span><div><div class="challenge-title"></div><div class="settings-hint">'+E(r.start===r.end?fmtDate(r.start):fmtDate(r.start)+' – '+fmtDate(r.end))+'</div></div></div><button class="btn btn-ghost btn-full" onclick="closePanel()">Schließen</button>');return}let dv=ev?.startDate||ev?.date||(pre?D(pre):D(new Date())),ed=ev?.endDate||ev?.date||dv;let html='<div class="fg"><label class="flabel">Titel *</label><input class="finput" id="ev-title" value="'+E(ev?.title||'')+'"></div><div class="fr"><div class="fg"><label class="flabel">Von-Datum *</label><input type="date" class="finput" id="ev-date" value="'+dv+'"></div><div class="fg"><label class="flabel">Bis-Datum</label><input type="date" class="finput" id="ev-end-date" value="'+ed+'"></div></div><div class="fr"><div class="fg"><label class="flabel">Von Uhrzeit</label><input type="time" class="finput" id="ev-time" value="'+(ev?.time||'')+'"></div><div class="fg"><label class="flabel">Bis Uhrzeit</label><input type="time" class="finput" id="ev-end" value="'+(ev?.endTime||'')+'"></div></div><div class="fg"><label class="flabel">Farbe</label><select class="finput" id="ev-color">'+[['blue','Blau','#3b82f6'],['green','Grün','#22c55e'],['amber','Gelb','#f59e0b'],['red','Rot','#ef4444'],['purple','Lila','#a855f7']].map(function(x){return '<option value="'+x[0]+'" style="background:'+x[2]+'20;font-weight:600" '+((ev?.color||'blue')===x[0]?'selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></div><div class="fg"><label class="flabel">Beschreibung</label><textarea class="finput" id="ev-desc" rows="4">'+E(ev?.desc||'')+'</textarea></div><button class="btn btn-primary btn-full" onclick="saveEvent(\''+(ev?.id||'')+'\')">Speichern</button>';openPanel(ev?'Termin bearbeiten':'Neuer Termin',html)};
window.saveEvent=function(id){let title=$('ev-title')?.value.trim(),date=$('ev-date')?.value,end=$('ev-end-date')?.value||date;if(!title||!date){toast('Titel und Von-Datum fehlen','err');return}if(end<date)end=date;let old=id?getEventById(id):{},ev={id:id||'ev_'+uid(),title,date,startDate:date,endDate:end,time:$('ev-time')?.value||'',endTime:$('ev-end')?.value||'',color:$('ev-color')?.value||'blue',type:old?.type||'meeting',desc:$('ev-desc')?.value.trim()||'',source:'local',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};let arr=window.events||events,i=arr.findIndex(e=>e.id===ev.id);if(i>=0)arr[i]=Object.assign({},arr[i],ev);else arr.push(ev);try{events=arr;window.events=arr}catch(e){}ls('events',arr);/* no close */
renderCalendar();try{buildDashboard()}catch(e){}toast('Termin gespeichert ✓','ok')};
window.openCalendarSettings=function(){let o=opt(),st=(window.calendarSettings?.state)||localStorage.getItem('holiday_state')||'ALL',opts=Object.entries(window.STATE_OPTIONS||STATE_OPTIONS||{}).map(([k,v])=>'<option value="'+k+'" '+(k===st?'selected':'')+'>'+v+'</option>').join('');openPanel('Kalender-Einstellungen','<div class="fg"><label class="flabel">Bundesland</label><select class="finput" id="holiday-state">'+opts+'</select></div>'+['Feiertage anzeigen|toggle-holidays|showHolidays','Challenge-Punkte|toggle-dots|showChallengeDots','Kalenderwochen|toggle-kw|showWeekNumbers'].map(x=>{let [t,id,k]=x.split('|');return '<div class="toggle-row"><div class="toggle-copy"><div class="toggle-title">'+t+'</div></div><label class="switch"><input type="checkbox" id="'+id+'" '+(o[k]?'checked':'')+'><span class="slider"></span></label></div>'}).join('')+'<button class="btn btn-primary btn-full" onclick="saveCalSettings()">Speichern</button>')};
window.saveCalSettings=function(){let o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked};localStorage.setItem('change_v1_calendar_view_options',JSON.stringify(o));localStorage.setItem('calendar_settings',JSON.stringify(o));try{calendarSettings.state=$('holiday-state')?.value||'ALL';ls('holiday_state',calendarSettings.state)}catch(e){}/* no close */
renderCalendar();toast('Kalender-Einstellungen gespeichert ✓','ok')};
let css=document.createElement('style');css.textContent='.clean-range-row{position:relative;display:grid!important;grid-template-columns:repeat(7,1fr);grid-auto-rows:1fr;min-height:132px}.clean-range-row .day-cell{grid-row:1;min-width:0;overflow:hidden;padding-top:8px}.day-num-wrap{display:flex!important;align-items:center;gap:6px;min-height:22px;padding-right:44px}.holiday-inline{font-size:10px;font-weight:800;color:var(--amb);background:var(--amb-d);border-radius:999px;padding:2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:72%}.challenge-points-badge{position:absolute;top:7px;right:6px;z-index:7;font-size:10px;font-weight:900;color:var(--amb);background:var(--amb-d);border-radius:999px;padding:2px 6px}.challenge-points-badge.done{color:var(--grn);background:var(--grn-d)}.kw-badge-left{position:absolute;left:8px;bottom:8px;z-index:6;font-size:11px;font-weight:900;color:var(--acc);background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.2);border-radius:999px;padding:3px 7px}.range-bar{grid-row:1;align-self:start;margin-top:calc(36px + var(--lane)*24px);height:20px;line-height:20px;padding:0 8px!important;z-index:5;border-radius:0!important;display:flex!important;align-items:center;gap:4px;min-width:0;overflow:hidden}.range-start{border-top-left-radius:10px!important;border-bottom-left-radius:10px!important}.range-end{border-top-right-radius:10px!important;border-bottom-right-radius:10px!important}.range-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:700}.range-date{font-size:10px;font-weight:800;color:#3b82f6;background:rgba(59,130,246,.1);border-radius:999px;padding:0 5px}.gmark{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;font-size:9px;font-weight:900;color:#4285f4;background:rgba(66,133,244,.12);flex:0 0 auto}.gmark.synced{color:var(--grn);background:var(--grn-d)}.gmark.big{width:28px;height:28px;font-size:14px}.google-detail{display:flex;gap:10px;align-items:center;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r);padding:12px}.year-mini-day{position:relative}.year-mini-day i{position:absolute;bottom:1px;width:5px;height:5px;border-radius:50%;background:var(--acc)}.year-mini-day.has-holiday i{background:var(--amb)}.year-mini-day.has-event.has-holiday i{background:linear-gradient(90deg,var(--acc) 50%,var(--amb) 50%)}';document.head.appendChild(css);setTimeout(()=>{try{renderCalendar()}catch(e){console.warn(e)}},50);
})();

/* FINAL USER CALENDAR POLISH: ranges top, clean today, settings/sync split */
(function(){
  const $=id=>document.getElementById(id);
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: +backtick]
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
  window.saveCalSettings=function(){const o={showHolidays:!!$('toggle-holidays')?.checked,showChallengeDots:!!$('toggle-dots')?.checked,showWeekNumbers:!!$('toggle-kw')?.checked};saveOpts(o);try{if(!window.calendarSettings)window.calendarSettings={};calendarSettings.state=$('holiday-state')?.value||'ALL';if(typeof ls==='function'){ls('holiday_state',calendarSettings.state); localStorage.setItem('change_v1_holiday_state',calendarSettings.state);}else{localStorage.setItem('holiday_state',JSON.stringify(calendarSettings.state)); localStorage.setItem('change_v1_holiday_state',calendarSettings.state);}}catch(e){}if(typeof closePanel==='function')/* no close */
renderCalendar();if(typeof toast==='function')toast('Kalender-Einstellungen gespeichert ✓','ok')};
  function fixToolbarTitles(){document.querySelectorAll('[onclick="openPushSettingsPanel()"], [title="Live- & Kalender-Sync"], [title="Push & Live-Sync"], [title="Datenbank- & Kalender-Sync"]').forEach(b=>b.setAttribute('title','Sync'));document.querySelectorAll('[onclick="openCalendarSettings()"]').forEach(b=>b.setAttribute('title','Kalender-Einstellungen'))}fixToolbarTitles();setInterval(fixToolbarTitles,1000);
  document.addEventListener('click',function(e){const btn=e.target.closest('[title="Kalender-Einstellungen"]');if(btn){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();openCalendarSettings()}},true);
  const style=document.createElement('style');style.id='calendar-polish-user-final-style';style.textContent=`.range-bar,.fx-range,.clean-range-row>.range-bar{display:none!important}.h-actions,.h-cal-controls{position:relative;z-index:80}.icon-btn{pointer-events:auto!important}.icon-btn[title="Kalender-Einstellungen"],.icon-btn[title="Sync"]{position:relative;z-index:90}#month-grid.month-grid-polished{overflow:hidden!important;background:#fff!important}.cal-week-polished{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr));min-height:122px;border-bottom:1px solid var(--b1);position:relative}.cal-day-polished{position:relative;min-width:0;padding:7px 8px 23px;background:#fff;border-right:1px solid var(--b1);overflow:hidden;cursor:pointer}.cal-day-polished.weekend{background:#fbfaf7}.cal-day-polished.other{opacity:.42}.cal-day-polished.today{box-shadow:inset 0 0 0 1px rgba(45,106,79,.25);background:#f7fbf9}.cal-day-head{display:flex;align-items:center;gap:6px;min-height:24px;padding-right:44px;min-width:0}.cal-day-num{font-size:13px;font-weight:850;color:var(--t2);line-height:1}.cal-day-polished.today .cal-day-num{display:inline-flex;align-items:center;justify-content:center;height:22px;min-width:22px;border-radius:999px;background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.22);color:var(--acc);padding:0 6px}.cal-holiday-inline{font-size:10px;font-weight:850;color:#b85f00;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.18);border-radius:999px;padding:2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 38px)}.cal-event-stack{display:flex;flex-direction:column;gap:3px;margin-top:5px}.cal-event-chip{height:20px;border:1px solid rgba(59,130,246,.17);background:rgba(59,130,246,.08);color:#2563eb;border-radius:7px;padding:0 6px;display:flex;align-items:center;gap:4px;min-width:0;text-align:left;font-size:11px;font-weight:760;line-height:18px;cursor:pointer}.cal-event-chip.is-range{order:-10;background:rgba(45,106,79,.09)!important;border-color:rgba(45,106,79,.18)!important;color:var(--acc)!important}.cal-event-chip.is-range:before{content:'↔';font-size:9px;font-weight:900;opacity:.65}.cal-event-chip.green{background:rgba(22,163,74,.10);border-color:rgba(22,163,74,.18);color:#15803d}.cal-event-chip.amber{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.20);color:#b45309}.cal-event-chip.red{background:rgba(239,68,68,.10);border-color:rgba(239,68,68,.18);color:#dc2626}.cal-event-chip.purple{background:rgba(124,58,237,.10);border-color:rgba(124,58,237,.18);color:#6d28d9}.cal-event-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.cal-range-text{font-size:9px;font-weight:850;opacity:.8;white-space:nowrap}.cal-range-text.muted{opacity:.55}.cal-g{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;font-size:8px;font-weight:900;color:#4285f4;background:rgba(66,133,244,.13);flex:0 0 auto}.cal-g.ok{color:var(--grn);background:var(--grn-d)}.cal-more{font-size:10px;font-weight:800;color:var(--t3);padding:1px 6px}.cal-points{position:absolute;right:7px;bottom:5px;z-index:8;font-size:10px;font-weight:900;color:var(--grn);background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.24);border-radius:999px;padding:2px 6px;line-height:1}.cal-points.done{background:rgba(45,106,79,.14);border-color:rgba(45,106,79,.24);color:var(--acc)}.cal-kw{position:absolute;left:7px;bottom:5px;z-index:8;font-size:10.5px;font-weight:900;color:var(--acc);background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.20);border-radius:999px;padding:2px 7px}.year-grid-stacked{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;padding:14px!important;overflow:auto!important}.year-card-stacked{background:#fff;border:1px solid var(--b1);border-radius:14px;padding:10px;text-align:left;cursor:pointer}.year-title-stacked{font-weight:850;font-size:13px;margin-bottom:7px}.year-days-stacked{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.year-days-stacked b,.year-days-stacked span{height:18px;font-size:9px;color:var(--t4);display:flex;align-items:center;justify-content:center;position:relative}.year-days-stacked span.today{background:var(--acc);color:white;border-radius:50%}.year-days-stacked span i{position:absolute;bottom:0;width:5px;height:5px;border-radius:50%;background:var(--acc)}.year-days-stacked span.has-holiday i{background:#f59e0b}.year-days-stacked span.has-event.has-holiday i{background:linear-gradient(90deg,var(--acc) 50%,#f59e0b 50%)}@media(max-width:800px){.cal-week-polished{min-height:110px}.year-grid-stacked{grid-template-columns:1fr!important}.cal-holiday-inline{max-width:62px}.cal-event-chip{font-size:10px;padding:0 4px}}`;document.head.appendChild(style);setTimeout(()=>{try{fixToolbarTitles();renderCalendar()}catch(e){console.warn('calendar polish failed',e)}},120);
})();

/* ==========================
   URLAUBS-TRACKER
   Zeigt im Dashboard verbrauchte / verbleibende Urlaubstage
   Berechnung: Kalendereinträge mit "Urlaub" im Titel,
               minus Wochenenden, minus Feiertage (gem. Bundesland)
========================== */
(function(){
  var LS_ON    = 'urlaub_tracker_on';
  var LS_DAYS  = 'urlaub_tracker_days';
  var LS_HALF  = 'urlaub_half_days';     // JSON-Array mit Datums-Strings: ["2026-05-15","2026-06-01"]

  function isOn(){ return localStorage.getItem(LS_ON) !== 'false'; }
  function getTotalDays(){ return parseInt(localStorage.getItem(LS_DAYS) || '30', 10) || 30; }
  function getHalfDays(){
    try{ return JSON.parse(localStorage.getItem(LS_HALF) || '[]'); }catch(e){ return []; }
  }
  function saveHalfDays(arr){ localStorage.setItem(LS_HALF, JSON.stringify(arr)); }
  // [FIX] Jahresunabhängige Halbtage: Format MM-DD statt YYYY-MM-DD
  // Alte Einträge (YYYY-MM-DD) werden automatisch migriert
  function normalizeHalfDay(d){
    if(!d) return '';
    // Bereits MM-DD Format
    if(/^\d{2}-\d{2}$/.test(d)) return d;
    // YYYY-MM-DD → MM-DD
    if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return d.slice(5);
    return d;
  }
  function getHalfDaysNorm(){
    var raw = getHalfDays();
    // Migration: falls alte YYYY-Einträge drin — umwandeln
    var norm = raw.map(normalizeHalfDay).filter(Boolean);
    // Deduplizieren
    norm = norm.filter(function(v,i){ return norm.indexOf(v)===i; }).sort();
    // Zurückschreiben wenn Format geändert
    if(JSON.stringify(raw) !== JSON.stringify(norm)) saveHalfDays(norm);
    return norm;
  }
  function isHalfDay(dateStr){
    var mmdd = normalizeHalfDay(dateStr);
    return getHalfDaysNorm().indexOf(mmdd) !== -1;
  }
  function fmtMMDD(mmdd){
    // MM-DD → TT.MM. (z.B. "01-05" → "05.01.")
    if(!mmdd || mmdd.length !== 5) return mmdd;
    return mmdd.slice(3)+'.'+mmdd.slice(0,2)+'.';
  }

  window.setUrlaubEnabled   = function(v){ localStorage.setItem(LS_ON, v ? 'true' : 'false'); if(typeof window.buildDashCards==='function') window.buildDashCards(); };
  window.setUrlaubDays      = function(d){ localStorage.setItem(LS_DAYS, String(parseInt(d)||30)); if(typeof window.buildDashCards==='function') window.buildDashCards(); };
  window.getUrlaubEnabled   = isOn;
  window.getUrlaubTotalDays = getTotalDays;
  window.getUrlaubHalfDays  = getHalfDaysNorm;

  window.addUrlaubHalfDay = function(dateStr){
    if(!dateStr) return;
    var mmdd = normalizeHalfDay(dateStr);
    if(!mmdd) return;
    var arr = getHalfDaysNorm();
    if(arr.indexOf(mmdd) === -1){ arr.push(mmdd); arr.sort(); saveHalfDays(arr); }
    if(typeof window.buildDashCards==='function') window.buildDashCards();
    window.renderUrlaubHalfDayList && window.renderUrlaubHalfDayList();
  };
  window.removeUrlaubHalfDay = function(dateStr){
    var mmdd = normalizeHalfDay(dateStr);
    saveHalfDays(getHalfDaysNorm().filter(function(d){ return d !== mmdd; }));
    if(typeof window.buildDashCards==='function') window.buildDashCards();
    window.renderUrlaubHalfDayList && window.renderUrlaubHalfDayList();
  };

  // Chip-Liste: zeigt nur MM-DD, kein Jahr
  window.renderUrlaubHalfDayList = function(){
    var container = document.querySelector('[data-half-list]');
    if(!container) return;
    var chips = getHalfDaysNorm().map(function(d){
      var label = fmtMMDD(d);
      var span = document.createElement('span');
      span.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(245,158,11,.1);color:#b45309;border:1px solid rgba(245,158,11,.25);border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600';
      span.innerHTML = label + '<button style="background:none;border:none;cursor:pointer;color:#b45309;font-size:10px;padding:0;line-height:1;margin-left:2px">✕</button>';
      span.querySelector('button').onclick = function(){ window.removeUrlaubHalfDay(d); };
      return span;
    });
    container.innerHTML = '';
    chips.forEach(function(c){ container.appendChild(c); });
  };

  // Prüft ob ein Datum ein Wochenende ist
  function isWeekend(dateStr){
    var d = new Date(dateStr + 'T12:00:00');
    var dow = d.getDay(); // 0=So, 6=Sa
    return dow === 0 || dow === 6;
  }

  // Prüft ob ein Datum ein Feiertag ist (gem. Bundesland-Einstellung)
  function isHoliday(dateStr){
    if(typeof window.getHolidaysForDate !== 'function') return false;
    try{
      var holidays = window.getHolidaysForDate(dateStr);
      return holidays && holidays.length > 0;
    }catch(e){ return false; }
  }

  function formatVacationDays(value){
    var n = Math.round((Number(value) || 0) * 2) / 2;
    return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
  }

  function getVacationDayValue(dateStr){
    return isHalfDay(dateStr) ? 0.5 : 1;
  }

  function forEachWorkday(startStr, endStr, cb){
    var d   = new Date(startStr + 'T12:00:00');
    var end = new Date(endStr   + 'T12:00:00');
    while(d <= end){
      var dk = d.getFullYear() + '-'
        + String(d.getMonth()+1).padStart(2,'0') + '-'
        + String(d.getDate()).padStart(2,'0');
      if(!isWeekend(dk) && !isHoliday(dk)){
        cb(dk);
      }
      d.setDate(d.getDate() + 1);
    }
  }

  // Zählt Arbeitstage in einem Zeitraum [startStr, endStr] (inklusive)
  // Halbtage zählen als 0,5.
  function countWorkdays(startStr, endStr){
    var count = 0;
    forEachWorkday(startStr, endStr, function(dk){
      count += getVacationDayValue(dk);
    });
    return count;
  }

  function normalizeDateKey(v){
    if(!v) return '';
    if(v instanceof Date){
      return v.getFullYear() + '-' + String(v.getMonth()+1).padStart(2,'0') + '-' + String(v.getDate()).padStart(2,'0');
    }
    return String(v).slice(0,10);
  }

  function addDaysKey(dateStr, offset){
    var d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function getEventRange(e){
    var start = normalizeDateKey(e.startDate || e.fromDate || e.date || (e.start && (e.start.date || e.start.dateTime)));
    if(!start) return null;

    var end = normalizeDateKey(e.endDate || e.toDate || e.untilDate || (e.end && (e.end.date || e.end.dateTime)) || start);

    // Google-Ganztagstermine liefern end.date exklusiv. Ein Urlaub 05.–07. kommt von Google als 05.–08.
    // Lokale Change-Termine speichern endDate dagegen inklusiv. Deshalb nur bei rohem Google-Enddatum korrigieren.
    var isGoogleAllDayExclusive = !!(e.source === 'google' && e.end && e.end.date && !e.end.dateTime);
    if(isGoogleAllDayExclusive && end > start) end = addDaysKey(end, -1);

    if(end < start) end = start;
    return { start:start, end:end };
  }

  // Liefert Urlaub-Events, die das aktuelle Kalenderjahr berühren.
  function getUrlaubEvents(){
    var year = new Date().getFullYear();
    var yearStart = year + '-01-01';
    var yearEnd   = year + '-12-31';
    var allEvs = typeof window.getAllEvents === 'function' ? window.getAllEvents() : (window.events || []);

    return allEvs.filter(function(e){
      var title = (e.title || e.summary || '').toLowerCase();
      if(!title.includes('urlaub')) return false;
      var r = getEventRange(e);
      if(!r) return false;
      return r.end >= yearStart && r.start <= yearEnd;
    });
  }

  // Berechnet verbrauchte Urlaubstage im aktuellen Jahr.
  // Dashboard und Detailpanel nutzen dieselbe datumsgestützte Berechnung:
  // - Halbtage zählen immer als 0,5
  // - überlappende Urlaubseinträge zählen denselben Tag nicht doppelt
  // - manuell gepflegte Halbtage zählen auch ohne separaten Google-Urlaubstermin
  function calcUsedDays(){
    var year = new Date().getFullYear();
    var yearStart = year + '-01-01';
    var yearEnd   = year + '-12-31';
    var dayValues = {};

    getUrlaubEvents().forEach(function(e){
      var r = getEventRange(e);
      if(!r) return;
      var start = r.start < yearStart ? yearStart : r.start;
      var end   = r.end   > yearEnd   ? yearEnd   : r.end;
      forEachWorkday(start, end, function(dk){
        dayValues[dk] = getVacationDayValue(dk);
      });
    });

    getHalfDaysNorm().forEach(function(mmdd){
      var dk = /^\d{2}-\d{2}$/.test(mmdd) ? (year + '-' + mmdd) : normalizeHalfDay(mmdd);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(dk)) dk = year + '-' + mmdd;
      if(dk < yearStart || dk > yearEnd) return;
      if(isWeekend(dk) || isHoliday(dk)) return;
      dayValues[dk] = 0.5;
    });

    return Object.keys(dayValues).reduce(function(sum, dk){ return sum + dayValues[dk]; }, 0);
  }

  // HTML-Zeile für Dashboard (gleicher Stil wie Friseur-Tracker)
  // Detail-Panel: zeigt alle Urlaubs-Einträge mit Arbeitstagen
  window.openUrlaubPanel = function(){
    var totalDays = getTotalDays();
    var used      = calcUsedDays();
    var remaining = totalDays - used;
    var events    = getUrlaubEvents();
    var year      = new Date().getFullYear();
    var halfDays  = (typeof getHalfDaysNorm==='function'?getHalfDaysNorm():getHalfDays()); // jahresunabhängig
    var today     = new Date().toISOString().slice(0,10);

    var fmtD = function(str){
      try{ return new Date(str+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'short'}); }
      catch(e){ return str; }
    };

    // Arbeitstage pro Event berechnen
    var rows = events.map(function(e){
      var r = getEventRange(e);
      var yearStart = year + '-01-01';
      var yearEnd   = year + '-12-31';
      var start = r.start < yearStart ? yearStart : r.start;
      var end   = r.end   > yearEnd   ? yearEnd   : r.end;
      var days  = countWorkdays(start, end);
      var range = (end === start || !end) ? fmtD(start) : fmtD(start) + ' – ' + fmtD(end);
      return { title: e.title || e.summary || 'Urlaub', range: range, days: days, start: start };
    }).sort(function(a,b){ return a.start.localeCompare(b.start); });

    // Urlaubs-Liste
    var listHtml = rows.length ? rows.map(function(r){
      var isPast    = r.start < today;
      var isNow     = r.start === today;
      var dotColor  = (isPast||isNow) ? 'var(--acc)' : 'var(--t3)';
      var dayLabel  = r.days === 0.5 ? '½ Tag' : r.days === 1 ? '1 Tag' : r.days + ' Tage';
      return '<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--b1)">'
        + '<div style="width:8px;height:8px;border-radius:50%;background:'+dotColor+';flex-shrink:0"></div>'
        + '<div style="flex:1;min-width:0">'
        +   '<div style="font-size:13px;font-weight:600;color:var(--t1)">'+r.title+'</div>'
        +   '<div style="font-size:11px;color:var(--t3);margin-top:1px">'+r.range+'</div>'
        + '</div>'
        + '<div style="font-size:12px;font-weight:700;color:'+(isPast?'var(--acc)':'var(--t3)')+'">'+dayLabel+'</div>'
        + '</div>';
    }).join('') : '<div style="color:var(--t4);font-size:13px;padding:16px 0">Keine Urlaubs-Einträge in '+year+'.<br><small>Tipp: Einträge müssen „Urlaub" im Titel enthalten.</small></div>';

    // Halbtage-Liste
    var halfHtml = '';
    if(halfDays.length){
      halfHtml = '<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--b1)">'
        + '<div style="font-size:10px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Halbe Urlaubstage</div>'
        + halfDays.map(function(d){
          var lbl = (d&&d.length===5) ? d.slice(3)+'.'+d.slice(0,2)+'.' : fmtD(d);
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--b1)">'
            + '<span style="font-size:12px;color:var(--t2)">'+lbl+'</span>'
            + '<span style="font-size:11px;font-weight:700;background:rgba(245,158,11,.1);color:#b45309;padding:2px 8px;border-radius:999px">½ Tag</span>'
            + '</div>';
        }).join('')
        + '</div>';
    }

    // Kacheln
    var remainColor = remaining < 0 ? '#ef4444' : remaining === 0 ? 'var(--acc)' : remaining <= 5 ? '#f59e0b' : 'var(--acc)';
    var usedDisp    = formatVacationDays(used);
    var remDisp     = formatVacationDays(remaining);
    var summaryHtml = '<div style="display:flex;gap:0;margin-bottom:16px;border-radius:var(--r);overflow:hidden;border:1px solid var(--b1)">'
      + '<div style="flex:1;text-align:center;padding:12px 8px;background:var(--s1);border-right:1px solid var(--b1)">'
      +   '<div style="font-size:20px;font-weight:900;color:var(--acc)">'+usedDisp+'</div>'
      +   '<div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Verbraucht</div>'
      + '</div>'
      + '<div style="flex:1;text-align:center;padding:12px 8px;background:var(--s1);border-right:1px solid var(--b1)">'
      +   '<div style="font-size:20px;font-weight:900;color:'+remainColor+'">'+remDisp+'</div>'
      +   '<div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Verbleibend</div>'
      + '</div>'
      + '<div style="flex:1;text-align:center;padding:12px 8px;background:var(--s1)">'
      +   '<div style="font-size:20px;font-weight:900;color:var(--t2)">'+totalDays+'</div>'
      +   '<div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Gesamt</div>'
      + '</div>'
      + '</div>';

    var noteHtml = '<div style="font-size:10.5px;color:var(--t4);margin-top:12px;padding-top:10px;border-top:1px solid var(--b1)">'
      + '⚠ Gezählt werden Urlaubstage: Wochenenden &amp; gesetzliche Feiertage zählen nicht. Halbe Tage zählen als 0,5.</div>';

    if(typeof openPanel === 'function'){
      openPanel('🏖️ Urlaubsübersicht ' + year, summaryHtml + listHtml + halfHtml + noteHtml);
    }
  };

  window.getUrlaubRowHtml = function(){
    if(!isOn()) return '';

    var totalDays = getTotalDays();
    var used      = calcUsedDays();
    var remaining = totalDays - used;
    var pct       = Math.min(100, Math.round((used / totalDays) * 100));

    var usedColor = remaining < 0 ? '#ef4444' : remaining <= 5 ? '#f59e0b' : 'var(--acc)';
    var barColor  = usedColor;

    // Kompakte Sub-Zeile: "26 von 30 Tagen verbraucht"
    var subLine = '<b style="color:'+usedColor+'">'+formatVacationDays(used)+' von '+formatVacationDays(totalDays)+'</b>'
              + '<span style="color:var(--t4)"> Urlaubstage</span>';

    // Fortschrittsbalken inline (klein, passt in Sub-Zeile)
    var bar = '<span style="display:inline-block;width:48px;height:3px;background:var(--b1);border-radius:2px;vertical-align:middle;margin:0 6px">'
            + '<span style="display:block;width:'+pct+'%;height:100%;background:'+barColor+';border-radius:2px"></span>'
            + '</span>';

    var badge = remaining === 0
      ? '<span class="dash-row-badge badge-green" style="white-space:nowrap;font-size:10px">✓ Vollständig verplant</span>'
      : remaining < 0
        ? '<span class="dash-row-badge badge-red" style="white-space:nowrap;font-size:10px">⚠ '+Math.abs(remaining)+' überzogen</span>'
        : '<span class="dash-row-badge" style="white-space:nowrap;font-size:10px;background:'+(remaining<=5?'rgba(245,158,11,.15);color:#b45309':'rgba(45,106,79,.1);color:var(--acc)')+'">'+formatVacationDays(remaining)+' Urlaubstage übrig</span>';

    return '<div class="dash-row dashboard-feature-row" onclick="window.openUrlaubPanel&&window.openUrlaubPanel()" style="cursor:pointer">'
      + '<div class="dash-row-icon" style="background:rgba(156,163,175,.1);font-size:14px">🏖️</div>'
      + '<div class="dash-row-body">'
      + '<div class="dash-row-title">Urlaub</div>'
      + '<div class="dash-row-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+subLine+bar+'</div>'
      + '</div>'
      + badge
      + '</div>';
  };
})();

/* ==================================================
   CHANGE APP — STREAK · BADGES · DARK MODE · NOTIF
   Firebase-Sync für alle Features
================================================== */
(function(){

/* ====
   DARK MODE
==== */
const DM_KEY = 'change_v1_dark_mode';
const THEME_KEY = 'change_v1_theme'; // system | light | dark
let changeThemeMediaListenerBound = false;

function normalizedTheme(value){
  value = String(value || '').toLowerCase();
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}
function preferredSystemTheme(){
  try{ return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }catch(e){ return 'light'; }
}
function storedThemePreference(){
  try{
    const next = localStorage.getItem(THEME_KEY);
    if(next) return normalizedTheme(next);
    const legacy = localStorage.getItem(DM_KEY);
    if(legacy !== null) return legacy === '1' ? 'dark' : 'light';
  }catch(e){}
  return 'system';
}
function syncThemeIcon(resolved){
  const moon = document.getElementById('dm-moon');
  const sun  = document.getElementById('dm-sun');
  if(moon) moon.style.display = resolved === 'dark' ? 'none' : '';
  if(sun)  sun.style.display  = resolved === 'dark' ? '' : 'none';
}
function applyThemePreference(preference, persist){
  const pref = normalizedTheme(preference);
  const resolved = pref === 'system' ? preferredSystemTheme() : pref;
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-theme-preference', pref);
  if(document.body){
    document.body.classList.remove('theme-system','theme-light','theme-dark');
    document.body.classList.add('theme-' + pref);
  }
  syncThemeIcon(resolved);
  if(persist){
    try{ localStorage.setItem(THEME_KEY, pref); }catch(e){}
    try{ localStorage.setItem(DM_KEY, resolved === 'dark' ? '1' : '0'); }catch(e){}
  }
  return {preference:pref, resolved:resolved};
}
function bindSystemThemeListener(){
  if(changeThemeMediaListenerBound || !window.matchMedia) return;
  changeThemeMediaListenerBound = true;
  try{
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = function(){
      if(storedThemePreference() === 'system') applyThemePreference('system', false);
    };
    if(media.addEventListener) media.addEventListener('change', onChange);
    else if(media.addListener) media.addListener(onChange);
  }catch(e){}
}
function applyTheme(dark){
  return applyThemePreference(dark ? 'dark' : 'light', true);
}

window.ChangeTheme = {
  get:function(){ return storedThemePreference(); },
  resolved:function(){ return document.documentElement.getAttribute('data-theme') || preferredSystemTheme(); },
  set:function(value){ return applyThemePreference(value, true); },
  apply:function(value){ return applyThemePreference(value || storedThemePreference(), false); }
};
window.toggleDarkMode = function(){
  const resolved = document.documentElement.getAttribute('data-theme') || preferredSystemTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  applyThemePreference(next, true);
};

// Init on load
(function initDark(){
  bindSystemThemeListener();
  applyThemePreference(storedThemePreference(), false);
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ applyThemePreference(storedThemePreference(), false); }, {once:true});
  }
})();

/* ====
   STREAK BERECHNUNG
==== */
window.getCurrentStreak = function(email){
  try{
    const me = email || (typeof userInfo !== 'undefined' ? userInfo.email : '') || '';
    const completions = window.challengeCompletions || [];
    if(!completions.length) return 0;

    // Alle Tage an denen ich etwas erledigt habe
    const doneDays = new Set(
      completions
        .filter(c => !me || String(c.playerId||c.email||'').toLowerCase() === me.toLowerCase())
        .map(c => String(c.date||'').slice(0,10))
        .filter(Boolean)
    );

    // Rückwärts von heute zählen
    let streak = 0;
    const d = new Date();
    const today = d.toISOString().slice(0,10);

    // Wenn heute noch nichts erledigt → ab gestern starten
    let start = doneDays.has(today) ? 0 : 1;

    for(let i = start; i < 365; i++){
      const dd = new Date();
      dd.setDate(dd.getDate() - i);
      const key = dd.toISOString().slice(0,10);
      if(doneDays.has(key)){
        streak++;
      } else {
        break;
      }
    }
    return streak;
  } catch(e){ return 0; }
};

/* ====
   MEILENSTEINE & ABZEICHEN
==== */
const BADGES = [
  { id:'first_done', icon:'🎯', name:'Erster Schritt', desc:'Erste Challenge erledigt', check:(s,p)=>p.totalDone>=1 },
  { id:'done5', icon:'🌱', name:'Warm geworden', desc:'5 Challenges erledigt', check:(s,p)=>p.totalDone>=5 },
  { id:'done10', icon:'💪', name:'Fleißig', desc:'10 Challenges erledigt', check:(s,p)=>p.totalDone>=10 },
  { id:'done25', icon:'🥉', name:'Dranbleiber', desc:'25 Challenges erledigt', check:(s,p)=>p.totalDone>=25 },
  { id:'done50', icon:'🎖️', name:'Durchhalter', desc:'50 Challenges erledigt', check:(s,p)=>p.totalDone>=50 },
  { id:'done100', icon:'🦁', name:'Legende', desc:'100 Challenges erledigt', check:(s,p)=>p.totalDone>=100 },
  { id:'done250', icon:'🛡️', name:'Veteran', desc:'250 Challenges erledigt', check:(s,p)=>p.totalDone>=250 },
  { id:'done500', icon:'🐉', name:'Unfassbar', desc:'500 Challenges erledigt', check:(s,p)=>p.totalDone>=500 },

  { id:'streak3', icon:'🔥', name:'3 Tage dabei', desc:'3 Tage Streak', check:(s,p)=>s>=3 },
  { id:'streak7', icon:'⚡', name:'Eine Woche Feuer', desc:'7 Tage Streak', check:(s,p)=>s>=7 },
  { id:'streak14', icon:'🌙', name:'Zwei Wochen Fokus', desc:'14 Tage Streak', check:(s,p)=>s>=14 },
  { id:'streak30', icon:'🌟', name:'Unaufhaltsam', desc:'30 Tage Streak', check:(s,p)=>s>=30 },
  { id:'streak60', icon:'☄️', name:'Routine-Monster', desc:'60 Tage Streak', check:(s,p)=>s>=60 },
  { id:'streak100', icon:'💎', name:'100 Tage Disziplin', desc:'100 Tage Streak', check:(s,p)=>s>=100 },

  { id:'points100', icon:'💯', name:'100 Punkte', desc:'100 Punkte gesammelt', check:(s,p)=>(p.totalPoints||0)>=100 },
  { id:'points250', icon:'🧱', name:'250 Punkte', desc:'250 Punkte gesammelt', check:(s,p)=>(p.totalPoints||0)>=250 },
  { id:'points500', icon:'🏆', name:'500 Punkte', desc:'500 Punkte gesammelt', check:(s,p)=>(p.totalPoints||0)>=500 },
  { id:'points1000', icon:'👑', name:'1000 Punkte', desc:'1000 Punkte gesammelt', check:(s,p)=>(p.totalPoints||0)>=1000 },
  { id:'points2500', icon:'🚀', name:'2500 Punkte', desc:'2500 Punkte gesammelt', check:(s,p)=>(p.totalPoints||0)>=2500 },
  { id:'points5000', icon:'🏔️', name:'5000 Punkte', desc:'5000 Punkte gesammelt', check:(s,p)=>(p.totalPoints||0)>=5000 },
  { id:'points10000', icon:'🌌', name:'10000 Punkte', desc:'10000 Punkte gesammelt', check:(s,p)=>(p.totalPoints||0)>=10000 },

  { id:'day50', icon:'☀️', name:'Starker Tag', desc:'50 Punkte an einem Tag', check:(s,p)=>(p.bestDayPoints||0)>=50 },
  { id:'day100', icon:'🔥', name:'Power-Tag', desc:'100 Punkte an einem Tag', check:(s,p)=>(p.bestDayPoints||0)>=100 },
  { id:'day200', icon:'⚔️', name:'Monster-Tag', desc:'200 Punkte an einem Tag', check:(s,p)=>(p.bestDayPoints||0)>=200 },
  { id:'week250', icon:'📈', name:'Starke Woche', desc:'250 Punkte in einer Woche', check:(s,p)=>(p.weekPoints||0)>=250 },
  { id:'week500', icon:'🏅', name:'Elite-Woche', desc:'500 Punkte in einer Woche', check:(s,p)=>(p.weekPoints||0)>=500 },
  { id:'week1000', icon:'🏹', name:'Wahnsinns-Woche', desc:'1000 Punkte in einer Woche', check:(s,p)=>(p.weekPoints||0)>=1000 },

  { id:'hard5', icon:'🧗', name:'Schwer gestartet', desc:'5 schwere Challenges erledigt', check:(s,p)=>(p.hardDone||0)>=5 },
  { id:'hard25', icon:'🪨', name:'Schwergewichtig', desc:'25 schwere Challenges erledigt', check:(s,p)=>(p.hardDone||0)>=25 },
  { id:'hard100', icon:'🦾', name:'Stahlmodus', desc:'100 schwere Challenges erledigt', check:(s,p)=>(p.hardDone||0)>=100 },
  { id:'hardcore1', icon:'💥', name:'Hardcore betreten', desc:'Erste Hardcore-Challenge erledigt', check:(s,p)=>(p.hardcoreDone||0)>=1 },
  { id:'hardcore10', icon:'🧨', name:'Hardcore-Fan', desc:'10 Hardcore-Challenges erledigt', check:(s,p)=>(p.hardcoreDone||0)>=10 },
  { id:'hardcore50', icon:'☠️', name:'Endgegner', desc:'50 Hardcore-Challenges erledigt', check:(s,p)=>(p.hardcoreDone||0)>=50 },

  { id:'auto10', icon:'🤖', name:'Auto-Rhythmus', desc:'10 Auto-Challenges erledigt', check:(s,p)=>(p.autoDone||0)>=10 },
  { id:'auto50', icon:'⚙️', name:'Maschine läuft', desc:'50 Auto-Challenges erledigt', check:(s,p)=>(p.autoDone||0)>=50 },
  { id:'auto100', icon:'🏭', name:'Automatik-Legende', desc:'100 Auto-Challenges erledigt', check:(s,p)=>(p.autoDone||0)>=100 },
  { id:'group_goal', icon:'🤝', name:'Teamziel erreicht', desc:'Aktuelles Gruppenziel erreicht', check:(s,p)=>p.groupGoalReached===true },
];

function getWeekStartForBadges(){
  const d = new Date();
  const day = d.getDay() || 7;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - (day - 1));
  return d.toISOString().slice(0,10);
}
function challengeForCompletion(c){
  const id = String(c && c.challengeId || '');
  const list = [];
  try{ if(Array.isArray(window.challenges)) list.push.apply(list, window.challenges); }catch(e){}
  try{ if(typeof challenges !== 'undefined' && Array.isArray(challenges)) list.push.apply(list, challenges); }catch(e){}
  for(let i=0;i<list.length;i++) if(String(list[i] && list[i].id) === id) return list[i];
  try{ if(window.ChangeChallengeDifficulty && typeof window.ChangeChallengeDifficulty.findChallengeById === 'function') return window.ChangeChallengeDifficulty.findChallengeById(id); }catch(e){}
  return null;
}
function getMyStats(){
  const me = (typeof userInfo !== 'undefined' ? userInfo.email : '') || '';
  const meLower = String(me || '').toLowerCase();
  const weekStart = getWeekStartForBadges();
  const today = new Date().toISOString().slice(0,10);
  const byDay = {};
  let hardDone = 0, hardcoreDone = 0, autoDone = 0;
  const completions = (window.challengeCompletions||[]).filter(c => {
    const who = String(c.playerId||c.email||c.userEmail||'').toLowerCase();
    return !meLower || who === meLower;
  }).map(c => {
    const ch = challengeForCompletion(c) || {};
    const difficulty = String(c.difficulty || ch.difficulty || '').toLowerCase();
    const source = String(c.source || ch.source || '').toLowerCase();
    const isAuto = c.auto === true || ch.auto === true || source === 'auto' || /^auto_/.test(String(c.challengeId||''));
    const pts = parseInt(c.points,10)||0;
    const day = String(c.date || c.createdAt || '').slice(0,10);
    if(day) byDay[day] = (byDay[day] || 0) + pts;
    if(difficulty === 'hard') hardDone++;
    if(difficulty === 'hardcore') hardcoreDone++;
    if(isAuto) autoDone++;
    return Object.assign({}, c, {points:pts, date:day, difficulty:difficulty, auto:isAuto});
  });
  const totalPoints = completions.reduce((sum,c)=>sum+(parseInt(c.points,10)||0),0);
  const totalDone = completions.length;
  const todayPoints = byDay[today] || 0;
  const weekPoints = Object.keys(byDay).filter(d=>d>=weekStart).reduce((sum,d)=>sum+(byDay[d]||0),0);
  const bestDayPoints = Object.keys(byDay).reduce((best,d)=>Math.max(best, byDay[d]||0),0);
  let groupGoalReached = false;
  try{ groupGoalReached = !!(window.getGroupGoal && window.getGroupPoints && window.getGroupPoints() >= window.getGroupGoal().target); }catch(e){}
  return { totalPoints, totalDone, email: me, todayPoints, weekPoints, bestDayPoints, hardDone, hardcoreDone, autoDone, daysActive:Object.keys(byDay).length, groupGoalReached };
}

window.getEarnedBadges

window.getEarnedBadges = function(){
  const streak = window.getCurrentStreak();
  const stats  = getMyStats();
  return BADGES.filter(b => {
    try{ return b.check(streak, stats); } catch(e){ return false; }
  });
};

window.getNewBadges = function(){
  const earned = window.getEarnedBadges().map(b=>b.id);
  const seen   = JSON.parse(localStorage.getItem('change_seen_badges')||'[]');
  return earned.filter(id => !seen.includes(id));
};

window.markBadgesSeen = function(){
  const earned = window.getEarnedBadges().map(b=>b.id);
  localStorage.setItem('change_seen_badges', JSON.stringify(earned));
};

function checkNewBadges(){
  const newBadges = window.getNewBadges();
  if(!newBadges.length) return;
  newBadges.forEach(id => {
    const b = BADGES.find(x=>x.id===id);
    if(!b) return;
    // Toast für neues Abzeichen
    if(typeof toast === 'function'){
      setTimeout(()=> toast(b.icon+' Abzeichen freigeschaltet: '+b.name, 'ok'), 500);
    }
  });
  window.markBadgesSeen();
  if(typeof checkNotifications === 'function') checkNotifications();
}

/* ====
   STREAK & BADGE DISPLAY IM DASHBOARD
==== */
function injectStreakCard(){
  // Alte Zeilen entfernen
  document.querySelectorAll('#streak-row, #streak-row-dash').forEach(el => el.remove());

  const streak = window.getCurrentStreak();
  const badges = window.getEarnedBadges();
  if(streak === 0 && badges.length === 0) return;

  // ==== Streak-Inhalt ====
  const streakPart = streak > 0
    ? `<span style="font-size:16px;line-height:1">🔥</span>
       <div style="display:flex;flex-direction:column;line-height:1.2">
         <span style="font-size:15px;font-weight:800;color:var(--acc)">${streak} Tag${streak!==1?'e':''}</span>
         <span style="font-size:10px;font-weight:600;color:var(--t4);text-transform:uppercase;letter-spacing:.05em">Streak</span>
       </div>`
    : '';

  const badgePart = badges.length > 0
    ? `<div style="display:flex;align-items:center;gap:3px;margin-left:8px">
         ${badges.slice(-5).map(b=>`<span title="${b.name}" style="font-size:15px">${b.icon}</span>`).join('')}
         ${badges.length > 5 ? `<span style="font-size:10px;color:var(--t4);font-weight:600">+${badges.length-5}</span>` : ''}
       </div>`
    : '';

  // ==== 1. In Challenges-Karte: direkt unter dem Header (oben) ====
  const chHead = document.querySelector('.challenge-card-head');
  if(chHead && chHead.parentElement){
    const row = document.createElement('div');
    row.id = 'streak-row';
    row.style.cssText = [
      'display:flex;align-items:center;gap:10px',
      'padding:10px 16px',
      'border-bottom:1px solid var(--b1)',
      'background:var(--acc-d2)',
      'cursor:pointer'
    ].join(';');
    row.onclick = () => window.openBadgePanel && window.openBadgePanel();
    row.innerHTML = streakPart + badgePart +
      `<span style="font-size:11px;color:var(--t4);margin-left:auto;font-weight:500">Abzeichen →</span>`;
    // Nach dem Header einfügen (vor challenges-list)
    const list = chHead.parentElement.querySelector('#challenges-list');
    if(list){
      chHead.parentElement.insertBefore(row, list);
    } else {
      chHead.insertAdjacentElement('afterend', row);
    }
  }

  // ==== 2. Im Dashboard-Challenges-Block ====
  const dashChHead = document.querySelector('.dash-card-body');
  // KPI-Karte für Challenges im Dashboard
  const kpiCh = document.getElementById('kpi-challenges');
  if(kpiCh && streak > 0){
    // Streak-Badge auf KPI-Karte
    let streakBadge = kpiCh.querySelector('.kpi-streak-badge');
    if(!streakBadge){
      streakBadge = document.createElement('div');
      streakBadge.className = 'kpi-streak-badge';
      streakBadge.style.cssText = 'font-size:11px;font-weight:700;color:var(--acc);margin-top:2px';
      kpiCh.appendChild(streakBadge);
    }
    streakBadge.textContent = '🔥 '+streak+' Tage Streak';
  }
}
// Explizit exportieren, damit challenges.js nach app.js darauf zugreifen kann
window.injectStreakCard = injectStreakCard;
window.checkNewBadges  = checkNewBadges;

/* ====
   BENACHRICHTIGUNGS-PANEL — Streak + Badges
==== */
window.openBadgePanel = function(){
  const badges   = window.getEarnedBadges();
  const allBadges= BADGES;
  const streak   = window.getCurrentStreak();
  const stats    = getMyStats();

  const rows = allBadges.map(b => {
    const earned = badges.find(x=>x.id===b.id);
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--b1);opacity:${earned?1:0.35}">
      <div style="font-size:26px;width:36px;text-align:center">${b.icon}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--t1)">${b.name}</div>
        <div style="font-size:11px;color:var(--t3)">${b.desc}</div>
      </div>
      ${earned?'<div style="font-size:18px">✅</div>':'<div style="font-size:11px;color:var(--t4)">gesperrt</div>'}
    </div>`;
  }).join('');

  const html = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:var(--s2);border-radius:var(--r);padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:var(--t1)">${streak}</div>
        <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Streak</div>
      </div>
      <div style="background:var(--s2);border-radius:var(--r);padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:var(--t1)">${stats.totalPoints}</div>
        <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Punkte</div>
      </div>
      <div style="background:var(--s2);border-radius:var(--r);padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:var(--t1)">${badges.length}/${allBadges.length}</div>
        <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Abzeichen</div>
      </div>
    </div>
    ${rows}`;

  if(typeof openPanel === 'function') openPanel('Meine Abzeichen', html);
};

/* ====
   BENACHRICHTIGUNGS-PANEL — nur echte Benachrichtigungen
==== */
const _origOpenNotif = window.openNotifPanel;
window.openNotifPanel = function(){
  try{
    if(typeof checkNotifications === 'function') checkNotifications();
    const notes = (typeof notifications !== 'undefined' && Array.isArray(notifications) ? notifications : (window.notifications||[])).slice(0,12);
    let html = '';

    if(notes.length > 0){
      const icons={deadline:'⚠️',meeting:'📅',reminder:'🔔',other:'📌'};
      const bgs={crit:'var(--red-d)',warn:'var(--amb-d)',ok:'var(--s2)'};
      const crit=notes.filter(n=>n.urgency==='crit');
      const warn=notes.filter(n=>n.urgency==='warn');
      const ok=notes.filter(n=>n.urgency==='ok');
      const mkItem=n=>{
        const label=n.diff<0?'Überfällig':n.diff===0?'Heute':n.diff===1?'Morgen':`In ${n.diff}T`;
        const bcls=n.urgency==='crit'?'ub-crit':n.urgency==='warn'?'ub-warn':'ub-ok';
        return `<div class="nitem" onclick="setMainView('calendar');setTimeout(()=>openEventPanel('${n.id}'),200);closePanel()"><div class="nitem-icon" style="background:${bgs[n.urgency]}">${icons[n.type]||'📅'}</div><div class="nitem-body"><div class="nitem-title">${n.title||''}</div><div class="nitem-sub">${n.date||''}</div></div><span class="nitem-badge urgency-badge ${bcls}">${label}</span></div>`;
      };
      if(crit.length) html+=`<div class="panel-notif-section"><div class="pns-title" style="color:var(--red)">⚡ Dringend</div>${crit.map(mkItem).join('')}</div>`;
      if(warn.length) html+=`<div class="panel-notif-section"><div class="pns-title" style="color:var(--amb)">⚠ Diese Woche</div>${warn.map(mkItem).join('')}</div>`;
      if(ok.length) html+=`<div class="panel-notif-section"><div class="pns-title">Demnächst</div>${ok.map(mkItem).join('')}</div>`;
    }else{
      html = `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div><div class="empty-title">Alles im Griff</div><div class="empty-sub">Keine neuen Benachrichtigungen</div></div>`;
    }

    if(typeof openPanel === 'function') openPanel('Benachrichtigungen', html);
    if(typeof updateBellIndicator === 'function') updateBellIndicator();
  }catch(e){ if(typeof _origOpenNotif==='function') _origOpenNotif(); }
};

/* ====
   FIREBASE SYNC — Streak + Badges in change_players
==== */
window.syncStreakToFirestore = async function(){
  try{
    const db = window.firebase && firebase.firestore ? firebase.firestore() : null;
    if(!db) return;
    const fbUser = firebase.auth ? firebase.auth().currentUser : null;
    if(!fbUser) return;
    const email = (typeof userInfo!=='undefined'?userInfo.email:'') || '';
    // [FIX] Nur mit echter Email (nicht Anonymous UID)
    if(!email || !email.includes('@')) return;
    const docId = email.toLowerCase().replace(/[^a-z0-9._-]/g,'_');
    const streak = window.getCurrentStreak();
    const badges = window.getEarnedBadges().map(b=>b.id);
    const stats  = getMyStats();
    var difficulty = '';
    var autoCount = 7;
    var plan = null;
    try{
      if(window.ChangeChallengeDifficulty){
        difficulty = window.ChangeChallengeDifficulty.get ? window.ChangeChallengeDifficulty.get() : '';
        autoCount = window.ChangeChallengeDifficulty.getDailyCount ? window.ChangeChallengeDifficulty.getDailyCount() : autoCount;
        if(typeof window.ChangeChallengeDifficulty.normalizePlayerPlan === 'function'){
          plan = window.ChangeChallengeDifficulty.normalizePlayerPlan({challengeDifficulty:difficulty, autoChallengeCount:autoCount});
        }
      }
    }catch(e){}
    await db.collection('change_players').doc(docId).set({
      streak,
      badges,
      totalPoints: stats.totalPoints,
      totalDone:   stats.totalDone,
      challengeDifficulty: difficulty,
      challengeDifficultyLabel: plan ? plan.difficultyLabel : '',
      autoChallengeCount: autoCount,
      weeklyTargetContribution: plan ? plan.targetContribution : null,
      weeklyPointPotential: plan ? plan.weeklyPotential : null,
      streakUpdatedAt: new Date().toISOString()
    },{merge:true});
  }catch(e){ console.warn('[Streak Sync]', e.message); }
};

/* ====
   HOOKS — nach Challenge-Erledigung
==== */
const _origComplete = window.completeChallenge;
window.completeChallenge = function(id){
  if(typeof _origComplete === 'function') _origComplete.call(this, id);
  setTimeout(()=>{
    checkNewBadges();
    window.syncStreakToFirestore && window.syncStreakToFirestore();
    // Streak-Karte neu rendern
    const old = document.getElementById('streak-card');
    if(old) old.remove();
    setTimeout(injectStreakCard, 500);
    if(typeof checkNotifications === 'function') checkNotifications();
  }, 800);
};

// Dashboard + Challenges Hook
const _origBuildDash = window.buildDashboard;
window.buildDashboard = function(){
  if(typeof _origBuildDash === 'function') _origBuildDash.apply(this, arguments);
  setTimeout(injectStreakCard, 600);
};

// Auch nach Challenges-Render einbauen
const _origSetView = window.setMainView;
window.setMainView = function(view){
  if(typeof _origSetView === 'function') _origSetView.apply(this, arguments);
  if(view === 'challenges'){
    setTimeout(injectStreakCard, 500);
  }
};

// Nach Login
const _origBoot2 = window.bootMainApp;
window.bootMainApp = function(){
  if(typeof _origBoot2 === 'function') _origBoot2.apply(this, arguments);
  setTimeout(()=>{
    injectStreakCard();
    checkNewBadges();
    if(typeof checkNotifications === 'function') checkNotifications();
  }, 1200);
};

// Dark Mode in Settings-Sync einbinden
// Settings-Sync läuft vollständig über features/settings/settings-logic.js
// Dark Mode wird nur lokal gespeichert (kein Firebase-Sync per Nutzer-Wunsch)
window.saveSettingsToFirestore = window.saveChangeSettings || window.saveSettingsToFirestore;
window.loadSettingsFromFirestore = window.forceLoadChangeSettings || window.loadSettingsFromFirestore;

console.warn('[Change] Streak · Badges · Dark Mode · Notif geladen ✓');
})();


try{ window.bootMainApp = bootMainApp; window.setMainView = setMainView; window.openPanel = openPanel; window.closePanel = closePanel; window.handleGoogleLogin = handleGoogleLogin; }catch(_e){}
