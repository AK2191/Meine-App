(function(){
  'use strict';

  var READ_KEY = 'change_v1_notification_read_state';
  var FIRED_KEY = 'change_v1_notification_fired_state';
  var PUSH_KEYS = ['change_push_enabled','change_v2_push_enabled','change_v1_push_enabled','change_v1_push_enabled'];

  function readJson(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ return fallback; }
  }
  function writeJson(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }
  function nowIso(){ return new Date().toISOString(); }
  function normalizeId(id){ return String(id || '').trim(); }

  function getReadMap(){
    var map = readJson(READ_KEY, {});
    return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
  }
  function saveReadMap(map){
    var entries = Object.entries(map || {}).slice(-250);
    writeJson(READ_KEY, Object.fromEntries(entries));
  }
  function getFiredMap(){
    var map = readJson(FIRED_KEY, {});
    return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
  }
  function saveFiredMap(map){
    var entries = Object.entries(map || {}).slice(-350);
    writeJson(FIRED_KEY, Object.fromEntries(entries));
  }

  function isRead(id){
    id = normalizeId(id);
    if(!id) return false;
    return !!getReadMap()[id];
  }
  function markRead(id){
    id = normalizeId(id);
    if(!id) return;
    var map = getReadMap();
    map[id] = nowIso();
    saveReadMap(map);
  }
  function markManyRead(ids){
    var map = getReadMap();
    (ids || []).forEach(function(id){
      id = normalizeId(id);
      if(id) map[id] = nowIso();
    });
    saveReadMap(map);
  }
  function wasFired(id){
    id = normalizeId(id);
    if(!id) return false;
    return !!getFiredMap()[id];
  }
  function markFired(id){
    id = normalizeId(id);
    if(!id) return;
    var map = getFiredMap();
    map[id] = nowIso();
    saveFiredMap(map);
  }

  function readStoredPushEnabled(){
    try{
      var explicit = localStorage.getItem('change_push_enabled');
      if(explicit === '0' || explicit === 'false') return false;
      if(explicit === '1' || explicit === 'true') return true;
      if(localStorage.getItem('change_v2_push_enabled') === 'false') return false;
      if(localStorage.getItem('change_v1_push_enabled') === 'false') return false;
      if(localStorage.getItem('change_v2_push_enabled') === 'true') return true;
      if(localStorage.getItem('change_v1_push_enabled') === 'true') return true;
    }catch(e){}
    try{
      if(typeof ls === 'function'){
        var stored = ls('push_enabled');
        if(stored === false) return false;
        if(stored === true) return true;
      }
    }catch(e){}
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  }
  function setStoredPushEnabled(on){
    try{
      localStorage.setItem('change_push_enabled', on ? '1' : '0');
      localStorage.setItem('change_v2_push_enabled', on ? 'true' : 'false');
      localStorage.setItem('change_v1_push_enabled', on ? 'true' : 'false');
      localStorage.setItem('push_enabled', on ? 'true' : 'false');
      if(typeof ls === 'function') ls('push_enabled', !!on);
    }catch(e){}
  }
  function permissionLabel(){
    if(typeof Notification === 'undefined') return 'nicht unterstützt';
    if(Notification.permission === 'granted') return 'erlaubt';
    if(Notification.permission === 'denied') return 'blockiert';
    return 'noch nicht erlaubt';
  }
  function pushActive(){
    return readStoredPushEnabled() && typeof Notification !== 'undefined' && Notification.permission === 'granted';
  }

  window.ChangeNotificationStore = {
    isRead: isRead,
    markRead: markRead,
    markManyRead: markManyRead,
    wasFired: wasFired,
    markFired: markFired,
    pushActive: pushActive,
    permissionLabel: permissionLabel,
    storedPushEnabled: readStoredPushEnabled,
    setStoredPushEnabled: setStoredPushEnabled
  };
})();
