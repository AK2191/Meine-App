(function(){
  'use strict';

  var LAST_KEY = 'change_v1_google_last_sync_at';
  var ERROR_KEY = 'change_v1_google_last_error';
  var ENABLED_KEY = 'change_google_sync_enabled';

  function read(key){ try{ return localStorage.getItem(key) || ''; }catch(e){ return ''; } }
  function write(key, value){ try{ localStorage.setItem(key, value == null ? '' : String(value)); }catch(e){} }
  function remove(key){ try{ localStorage.removeItem(key); }catch(e){} }
  function getToken(){
    try{ if(typeof accessToken !== 'undefined' && accessToken) return accessToken; }catch(e){}
    return window.accessToken || '';
  }
  function isDemo(){ try{ return !!isDemoMode || !!window.isDemoMode; }catch(e){ return !!window.isDemoMode; } }
  function loggedIn(){ var token = getToken(); return !!(token && token !== 'firebase-auth' && !isDemo()); }
  function enabled(){
    try{ if(typeof window.isGoogleSyncEnabled === 'function') return !!window.isGoogleSyncEnabled(); }catch(e){}
    var value = read(ENABLED_KEY);
    return value !== '0' && value !== 'false';
  }
  function setEnabled(on){
    try{ if(typeof window.setGoogleSyncEnabled === 'function') window.setGoogleSyncEnabled(!!on); }catch(e){}
    write(ENABLED_KEY, on ? '1' : '0');
    write('google_sync_enabled', on ? 'true' : 'false');
    write('change_v1_google_calendar_sync', on ? 'true' : 'false');
  }
  function cacheInfo(){
    try{ if(window.googleEventsCacheInfo) return window.googleEventsCacheInfo(); }catch(e){}
    try{
      var raw = localStorage.getItem('change_v1_google_events_cache') || localStorage.getItem('change_google_events_cache') || '[]';
      var list = JSON.parse(raw) || [];
      return {count:Array.isArray(list)?list.length:0, hasEvents:Array.isArray(list)&&list.length>0, updatedAt:''};
    }catch(e){ return {count:0, hasEvents:false, updatedAt:''}; }
  }
  function loadCacheIntoApp(){
    try{
      var list = window.readGoogleEventsCache ? window.readGoogleEventsCache() : [];
      if(Array.isArray(list) && list.length){ window.gEvents = list; return true; }
    }catch(e){}
    return false;
  }
  function formatRelative(iso){
    if(!iso) return 'noch nicht synchronisiert';
    var then = new Date(iso).getTime();
    if(!then) return 'unbekannt';
    var diff = Math.max(0, Date.now() - then);
    var min = Math.round(diff / 60000);
    if(min < 1) return 'gerade eben';
    if(min < 60) return 'vor '+min+' Min.';
    var hours = Math.round(min / 60);
    if(hours < 24) return 'vor '+hours+' Std.';
    var days = Math.round(hours / 24);
    return 'vor '+days+' Tag'+(days === 1 ? '' : 'en');
  }
  function getStatus(){
    var isLoggedIn = loggedIn();
    var isEnabled = enabled();
    var cache = cacheInfo();
    var error = read(ERROR_KEY);
    var last = read(LAST_KEY) || cache.updatedAt || '';
    if(!isLoggedIn && cache.hasEvents && /Google-Kalenderzugriff fehlt|Google-Zugriff abgelaufen/i.test(error || '')) error = '';
    var active = isEnabled && !error && (isLoggedIn || cache.hasEvents);
    var label;
    if(!isEnabled) label = 'AUS';
    else if(error) label = 'FEHLER';
    else if(isLoggedIn) label = 'AKTIV';
    else if(cache.hasEvents) label = 'GESPEICHERT';
    else label = 'VERBINDEN';
    var tone = error ? 'error' : (active ? 'ok' : 'off');
    var detail;
    if(error) detail = error;
    else if(isLoggedIn) detail = 'Letzter Sync: '+formatRelative(last);
    else if(cache.hasEvents) detail = 'Gespeicherte Termine bleiben nach F5 sichtbar · '+cache.count+' Einträge';
    else detail = 'Zum ersten Sync mit Google verbinden.';
    return {loggedIn:isLoggedIn, enabled:isEnabled, active:active, cached:cache.hasEvents, cachedCount:cache.count, error:error, lastSyncAt:last, label:label, tone:tone, detail:detail};
  }
  function markSuccess(){ write(LAST_KEY, new Date().toISOString()); remove(ERROR_KEY); try{ if(window.ChangeAppStatus) window.ChangeAppStatus.markGoogleSuccess((cacheInfo()||{}).count); }catch(e){} }
  function markError(message){ write(ERROR_KEY, String(message || 'Synchronisierung fehlgeschlagen')); try{ if(window.ChangeAppStatus) window.ChangeAppStatus.markGoogleError(message); }catch(e){} }
  async function syncNow(){
    var status = getStatus();
    setEnabled(true);
    if(!status.loggedIn){
      loadCacheIntoApp();
      try{ if(typeof renderCalendar === 'function') renderCalendar(); }catch(e){}
      try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
      if(typeof window.connectToGoogle === 'function'){
        try{ window.connectToGoogle(); }catch(e){}
      }else{
        try{ if(typeof toast === 'function') toast('Google verbinden, um den Kalender zu aktualisieren. Gespeicherte Termine bleiben sichtbar.',''); }catch(e){}
      }
      return false;
    }
    try{
      var result = true;
      if(typeof window.loadGoogleEvents === 'function') result = await window.loadGoogleEvents();
      else if(typeof window.triggerGoogleCalendarSync === 'function' && window.triggerGoogleCalendarSync !== syncNow) result = await window.triggerGoogleCalendarSync();
      markSuccess();
      try{ if(typeof renderCalendar === 'function') renderCalendar(); }catch(e){}
      try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
      try{ if(typeof checkNotifications === 'function') checkNotifications(); }catch(e){}
      try{ if(typeof toast === 'function') toast('Google Kalender synchronisiert ✓','ok'); }catch(e){}
      return result !== false;
    }catch(error){
      console.warn('Google sync:', error);
      markError(error && error.message ? error.message : String(error));
      try{ if(typeof toast === 'function') toast('Google-Sync fehlgeschlagen','err'); }catch(e){}
      return false;
    }
  }
  function disconnect(){
    setEnabled(false);
    try{ if(window.ChangeAppStatus) window.ChangeAppStatus.record('google', 'Google Kalender getrennt', 'Kalender-Cache wurde geleert.', 'info'); }catch(e){}
    try{ window.gEvents = []; }catch(e){}
    try{ if(window.clearGoogleEventsCache) window.clearGoogleEventsCache(); }catch(e){}
    remove(ERROR_KEY);
    try{ if(typeof renderCalendar === 'function') renderCalendar(); }catch(e){}
    try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
    try{ if(typeof checkNotifications === 'function') checkNotifications(); }catch(e){}
  }

  window.ChangeGoogleSyncStatus = {
    getStatus: getStatus,
    setEnabled: setEnabled,
    syncNow: syncNow,
    disconnect: disconnect,
    markSuccess: markSuccess,
    markError: markError,
    formatRelative: formatRelative
  };

  window.triggerGoogleCalendarSync = syncNow;
})();
