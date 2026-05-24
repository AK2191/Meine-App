(function(){
  'use strict';

  var SETTINGS_KEY = 'change_v1_weather_settings';
  var LOCATION_KEY = 'change_v1_weather_location';
  var CACHE_KEY = 'change_v1_weather_pollen_cache';

  var DEFAULT_SETTINGS = {
    weatherEnabled: false,
    rainAlertsEnabled: false,
    pollenEnabled: false,
    pollenAlertsEnabled: false,
    weatherHourlyHours: 12
  };

  function readJson(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ return fallback; }
  }
  function writeJson(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }
  function readSettings(){
    var saved = readJson(SETTINGS_KEY, {});
    return Object.assign({}, DEFAULT_SETTINGS, saved && typeof saved === 'object' ? saved : {});
  }
  function writeSettings(next){
    var merged = Object.assign({}, readSettings(), next || {});
    writeJson(SETTINGS_KEY, merged);
    return merged;
  }
  function bool(value){ return value === true || value === 'true' || value === '1' || value === 1; }
  function setFlag(name, value){
    var patch = {};
    patch[name] = !!value;
    return writeSettings(patch);
  }

  function getLocation(){
    var loc = readJson(LOCATION_KEY, null);
    if(!loc || typeof loc !== 'object') return null;
    var lat = Number(loc.latitude);
    var lon = Number(loc.longitude);
    if(!isFinite(lat) || !isFinite(lon)) return null;
    return {
      latitude: lat,
      longitude: lon,
      accuracy: Number(loc.accuracy || 0) || 0,
      savedAt: loc.savedAt || '',
      source: loc.source || 'browser'
    };
  }
  function saveLocation(position){
    var coords = position && position.coords ? position.coords : position;
    if(!coords) return null;
    var loc = {
      latitude: Number(coords.latitude),
      longitude: Number(coords.longitude),
      accuracy: Number(coords.accuracy || 0) || 0,
      savedAt: new Date().toISOString(),
      source: 'browser'
    };
    if(!isFinite(loc.latitude) || !isFinite(loc.longitude)) return null;
    writeJson(LOCATION_KEY, loc);
    return loc;
  }
  function clearLocation(){
    try{ localStorage.removeItem(LOCATION_KEY); }catch(e){}
  }
  function requestLocation(){
    return new Promise(function(resolve, reject){
      if(!navigator.geolocation){
        reject(new Error('Standort wird von diesem Browser nicht unterstützt.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(function(position){
        var loc = saveLocation(position);
        if(loc) resolve(loc); else reject(new Error('Standort konnte nicht gespeichert werden.'));
      }, function(err){
        var msg = 'Standort konnte nicht abgerufen werden.';
        if(err && err.code === 1) msg = 'Standortfreigabe wurde blockiert.';
        if(err && err.code === 2) msg = 'Standort ist aktuell nicht verfügbar.';
        if(err && err.code === 3) msg = 'Standortabfrage hat zu lange gedauert.';
        reject(new Error(msg));
      }, {enableHighAccuracy:false, maximumAge:15 * 60 * 1000, timeout:10000});
    });
  }

  function readCache(){
    var cache = readJson(CACHE_KEY, null);
    return cache && typeof cache === 'object' ? cache : null;
  }
  function writeCache(cache){
    writeJson(CACHE_KEY, Object.assign({}, cache || {}, {savedAt:new Date().toISOString()}));
  }
  function ageMs(iso){
    if(!iso) return Infinity;
    var t = Date.parse(iso);
    return isNaN(t) ? Infinity : Date.now() - t;
  }
  function locationAgeMs(loc){
    return ageMs((loc || getLocation() || {}).savedAt);
  }
  function cacheAgeMs(cache){
    if(!cache || !cache.savedAt) return Infinity;
    return ageMs(cache.savedAt);
  }

  window.ChangeWeatherStore = {
    settings: readSettings,
    writeSettings: writeSettings,
    setFlag: setFlag,
    bool: bool,
    getLocation: getLocation,
    saveLocation: saveLocation,
    clearLocation: clearLocation,
    requestLocation: requestLocation,
    readCache: readCache,
    writeCache: writeCache,
    cacheAgeMs: cacheAgeMs,
    locationAgeMs: locationAgeMs
  };
})();
