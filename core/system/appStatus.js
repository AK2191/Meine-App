/* Change App · App-Status, Sync-Protokoll & Gesundheitscheck
 * Rein lesendes/diagnostisches Modul.
 * Startet keine externen Dienste und verändert keinen Login-/Sync-Fluss.
 */
(function(){
  'use strict';

  var LOG_KEY = 'change_v1_sync_log';
  var MAX_LOG = 40;

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function readJson(key, fallback){
    try{ var raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }catch(e){ return fallback; }
  }
  function writeJson(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} }
  function readRaw(key){ try{ return localStorage.getItem(key) || ''; }catch(e){ return ''; } }
  function boolFromStorage(keys, fallback){
    keys = Array.isArray(keys) ? keys : [keys];
    for(var i=0;i<keys.length;i++){
      try{
        var raw = localStorage.getItem(keys[i]);
        if(raw == null) continue;
        if(raw === 'true' || raw === '1') return true;
        if(raw === 'false' || raw === '0') return false;
        var parsed = JSON.parse(raw);
        if(parsed === true || parsed === false) return parsed;
      }catch(e){}
    }
    return fallback;
  }
  function formatRelative(iso){
    if(!iso) return 'nie';
    var t = new Date(iso).getTime();
    if(!t) return 'unbekannt';
    var diff = Math.max(0, Date.now() - t);
    var min = Math.round(diff / 60000);
    if(min < 1) return 'gerade eben';
    if(min < 60) return 'vor '+min+' Min.';
    var hours = Math.round(min / 60);
    if(hours < 24) return 'vor '+hours+' Std.';
    var days = Math.round(hours / 24);
    return 'vor '+days+' Tag'+(days === 1 ? '' : 'en');
  }
  function nowIso(){ return new Date().toISOString(); }

  function record(kind, title, detail, tone){
    var item = {
      id: 'log_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
      at: nowIso(),
      kind: String(kind || 'sync'),
      title: String(title || 'Aktion'),
      detail: String(detail || ''),
      tone: String(tone || 'info')
    };
    var list = readJson(LOG_KEY, []);
    if(!Array.isArray(list)) list = [];
    list.unshift(item);
    writeJson(LOG_KEY, list.slice(0, MAX_LOG));
    try{ window.dispatchEvent(new CustomEvent('change:sync-log', {detail:item})); }catch(e){}
    return item;
  }
  function markDatabaseStart(detail){
    try{ localStorage.setItem('change_v1_database_sync_state', 'connecting'); }catch(e){}
    record('database', 'Datenbank-Sync gestartet', detail || 'Firebase wird verbunden.', 'info');
  }
  function markDatabaseSuccess(detail){
    var at = nowIso();
    try{
      localStorage.setItem('change_v1_database_last_sync_at', at);
      localStorage.setItem('change_v1_database_sync_state', 'ok');
      localStorage.removeItem('change_v1_database_last_error');
    }catch(e){}
    record('database', 'Datenbank-Sync gespeichert', detail || 'Mitspieler, Einstellungen, Challenges und Punkte wurden geprüft.', 'ok');
  }
  function markDatabaseError(message){
    try{
      localStorage.setItem('change_v1_database_sync_state', 'error');
      localStorage.setItem('change_v1_database_last_error', String(message || 'Unbekannter Fehler'));
    }catch(e){}
    record('database', 'Datenbank-Sync Fehler', String(message || 'Synchronisierung fehlgeschlagen.'), 'error');
  }
  function markGoogleSuccess(count){
    var extra = count != null ? String(count)+' Termine im Cache.' : 'Kalender wurde aktualisiert.';
    record('google', 'Google Kalender synchronisiert', extra, 'ok');
  }
  function markGoogleError(message){ record('google', 'Google Kalender Fehler', String(message || 'Synchronisierung fehlgeschlagen.'), 'error'); }
  function markNudge(toName, reason){ record('nudge', 'Anfeuern gesendet', (toName || 'Mitspieler') + (reason ? ' · '+reason : ''), 'ok'); }

  function firebaseReady(){
    try{ return !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && !String(window.FIREBASE_CONFIG.apiKey).includes('HIER_') && window.firebase && firebase.auth && firebase.firestore); }catch(e){ return false; }
  }
  function firebaseAuthReady(){
    try{ return !!(window.firebase && firebase.auth && firebase.auth().currentUser); }catch(e){ return false; }
  }
  function userLoggedIn(){
    try{ if(window.userInfo && (window.userInfo.email || window.userInfo.name)) return true; }catch(e){}
    try{ if(localStorage.getItem('change_v1_user_email') || localStorage.getItem('user_email')) return true; }catch(e){}
    return firebaseAuthReady();
  }
  function googleStatus(){
    try{ if(window.ChangeGoogleSyncStatus && window.ChangeGoogleSyncStatus.getStatus) return window.ChangeGoogleSyncStatus.getStatus(); }catch(e){}
    return {label:'UNBEKANNT', tone:'off', cached:false, cachedCount:0, lastSyncAt:'', detail:'Google-Status wird geladen.'};
  }
  function overlayState(){
    var blockers = [];
    function check(sel){
      var el = document.querySelector(sel);
      if(!el) return;
      var s = getComputedStyle(el);
      var r = el.getBoundingClientRect();
      var visible = s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.01 && r.width > 8 && r.height > 8;
      var blocks = visible && s.pointerEvents !== 'none';
      if(blocks) blockers.push(sel);
    }
    ['#loading','#setup-modal','#panel-overlay','#side-panel','.modal','.overlay'].forEach(check);
    return blockers;
  }
  function serviceWorkerState(){
    try{
      if(!('serviceWorker' in navigator)) return {ok:false,label:'Nicht verfügbar',detail:'Browser unterstützt Service Worker nicht.'};
      if(navigator.serviceWorker.controller) return {ok:true,label:'Aktiv',detail:'Service Worker steuert diese Seite.'};
      return {ok:true,label:'Bereit',detail:'Service Worker verfügbar.'};
    }catch(e){ return {ok:false,label:'Fehler',detail:e.message || String(e)}; }
  }
  function databaseStatus(){
    var enabled = boolFromStorage(['change_v1_database_sync_enabled','database_sync_enabled','change_v1_live_sync_enabled','live_sync_enabled'], false);
    var last = readRaw('change_v1_database_last_sync_at');
    var err = readRaw('change_v1_database_last_error');
    var state = readRaw('change_v1_database_sync_state');
    var cfg = firebaseReady();
    var auth = firebaseAuthReady();
    var label = 'AUS', tone = 'off', detail = 'Startet nur über Einstellungen → Sync.';
    if(!cfg){ label = 'KONFIG FEHLT'; tone = 'error'; detail = 'Firebase-Konfiguration oder SDK fehlt.'; }
    else if(err){ label = 'FEHLER'; tone = 'error'; detail = err; }
    else if(state === 'connecting'){ label = 'VERBINDET'; tone = 'off'; detail = 'Firebase-Verbindung wird hergestellt.'; }
    else if(enabled && auth){ label = 'AKTUELL'; tone = 'ok'; detail = 'Letzter Sync: '+formatRelative(last); }
    else if(enabled){ label = 'AKTIVIERT'; tone = 'off'; detail = 'Firebase Auth wird beim manuellen Speichern hergestellt.'; }
    return {ok:cfg, enabled:enabled, firebaseReady:cfg, authReady:auth, label:label, tone:tone, detail:detail, lastSyncAt:last, error:err};
  }
  function healthItems(){
    var db = databaseStatus();
    var g = googleStatus();
    var sw = serviceWorkerState();
    var blockers = overlayState();
    return [
      {name:'Login', ok:userLoggedIn(), detail:userLoggedIn() ? 'Profil lokal vorhanden.' : 'Nicht angemeldet oder Profil fehlt.'},
      {name:'Datenbank-Sync', ok:db.tone !== 'error', detail:db.label+' · '+db.detail},
      {name:'Firebase Auth', ok:!db.enabled || db.authReady, detail:db.authReady ? 'Firebase-Nutzer aktiv.' : (db.enabled ? 'Noch nicht verbunden.' : 'Ausgeschaltet.')},
      {name:'Google Kalender Cache', ok:!!(g.cached || g.loggedIn || g.active), detail:g.cached ? (g.cachedCount+' gespeicherte Termine.') : (g.detail || 'Kein Cache erkannt.')},
      {name:'Service Worker', ok:sw.ok, detail:sw.detail},
      {name:'Interaktion', ok:blockers.length === 0, detail:blockers.length ? ('Blockierende Ebene: '+blockers.join(', ')) : 'Keine blockierenden Overlays erkannt.'}
    ];
  }
  function healthScore(){
    var items = healthItems();
    var ok = items.filter(function(i){ return i.ok; }).length;
    return {ok:ok, total:items.length, tone: ok === items.length ? 'ok' : (ok >= items.length - 1 ? 'off' : 'error')};
  }
  function statusPill(text, tone){
    return '<span class="change-status-pill '+esc(tone || 'off')+'">'+esc(text)+'</span>';
  }
  function healthHtml(){
    var score = healthScore();
    var items = healthItems();
    return '<div class="change-health-head"><div><div class="change-health-title">Systemstatus</div><div class="change-health-sub">'+score.ok+' von '+score.total+' Prüfungen ok</div></div>'+statusPill(score.tone === 'ok' ? 'OK' : 'PRÜFEN', score.tone)+'</div>'
      + '<div class="change-health-list">'+items.map(function(item){
        return '<div class="change-health-row"><span class="change-health-dot '+(item.ok?'ok':'error')+'"></span><div><div class="change-health-name">'+esc(item.name)+'</div><div class="change-health-detail">'+esc(item.detail)+'</div></div></div>';
      }).join('')+'</div>';
  }
  function syncStatusHtml(){
    var db = databaseStatus();
    var g = googleStatus();
    return '<div class="change-sync-status-grid">'
      + '<div class="change-sync-status-item"><span>Datenbank</span><strong>'+esc(db.label)+'</strong><small>'+esc(db.detail)+'</small></div>'
      + '<div class="change-sync-status-item"><span>Google Kalender</span><strong>'+esc(g.label || '—')+'</strong><small>'+esc(g.detail || '')+'</small></div>'
      + '</div>';
  }
  function logItems(){
    var list = readJson(LOG_KEY, []);
    return Array.isArray(list) ? list : [];
  }
  function logHtml(limit){
    var list = logItems().slice(0, limit || 8);
    if(!list.length) return '<div class="change-feature-note">Noch kein Sync-Protokoll vorhanden.</div>';
    return '<div class="change-sync-log-list">'+list.map(function(item){
      return '<div class="change-sync-log-row"><div class="change-sync-log-icon '+esc(item.tone || 'info')+'">'+(item.tone === 'ok'?'✓':item.tone === 'error'?'!':'•')+'</div><div><div class="change-sync-log-title">'+esc(item.title)+'</div><div class="change-sync-log-detail">'+esc(item.detail || '')+'</div><div class="change-sync-log-time">'+esc(formatRelative(item.at))+'</div></div></div>';
    }).join('')+'</div>';
  }

  window.ChangeAppStatus = {
    record: record,
    markDatabaseStart: markDatabaseStart,
    markDatabaseSuccess: markDatabaseSuccess,
    markDatabaseError: markDatabaseError,
    markGoogleSuccess: markGoogleSuccess,
    markGoogleError: markGoogleError,
    markNudge: markNudge,
    getDatabaseStatus: databaseStatus,
    getHealthItems: healthItems,
    getHealthScore: healthScore,
    healthHtml: healthHtml,
    syncStatusHtml: syncStatusHtml,
    logItems: logItems,
    logHtml: logHtml,
    formatRelative: formatRelative
  };
})();
