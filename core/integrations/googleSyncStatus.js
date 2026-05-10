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
    return window.accessToken || read('access_token') || '';
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
    var error = read(ERROR_KEY);
    var last = read(LAST_KEY);
    var active = isLoggedIn && isEnabled && !error;
    var label = !isLoggedIn ? 'NICHT ANGEMELDET' : (error ? 'FEHLER' : (isEnabled ? 'AKTIV' : 'AUS'));
    var tone = !isLoggedIn || error ? 'error' : (isEnabled ? 'ok' : 'off');
    var detail = !isLoggedIn
      ? 'Google-Kalenderzugriff fehlt.'
      : (error ? error : 'Letzter Sync: '+formatRelative(last));
    return {loggedIn:isLoggedIn, enabled:isEnabled, active:active, error:error, lastSyncAt:last, label:label, tone:tone, detail:detail};
  }
  function markSuccess(){ write(LAST_KEY, new Date().toISOString()); remove(ERROR_KEY); }
  function markError(message){ write(ERROR_KEY, String(message || 'Synchronisierung fehlgeschlagen')); }
  async function syncNow(){
    var status = getStatus();
    if(!status.loggedIn){
      markError('Google-Kalenderzugriff fehlt. Bitte neu anmelden.');
      try{ if(typeof toast === 'function') toast('Google-Kalenderzugriff fehlt. Bitte neu anmelden.','err'); }catch(e){}
      return false;
    }
    setEnabled(true);
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
    try{ window.gEvents = []; }catch(e){}
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
