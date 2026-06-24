/* Change App - PollenStore
 * Zentrale lokale Datenquelle fuer Pollen-Symptomtage.
 * Liest Canonical- und bekannte Legacy-Keys, loescht nichts und schreibt nur den Canonical-Key.
 */
(function(){
  'use strict';

  var PREFIX = 'change_v1_';
  var DataModel = window.ChangeDataModel || null;
  var canonicalKeys = DataModel && DataModel.canonicalKeys ? DataModel.canonicalKeys : {};
  var legacyKeys = DataModel && DataModel.legacyKeys ? DataModel.legacyKeys : {};
  var CANONICAL_KEY = canonicalKeys.pollenSymptoms || PREFIX + 'pollen_symptoms';
  var READ_KEYS = uniqueKeys((legacyKeys.pollenSymptoms || ['pollen_symptoms', 'change_pollen_symptoms']).concat([CANONICAL_KEY]));
  var WRITE_KEYS = [CANONICAL_KEY];
  var state = {days: {}};

  function uniqueKeys(keys){
    var seen = {};
    var out = [];
    (Array.isArray(keys) ? keys : []).forEach(function(key){
      key = String(key || '').trim();
      if(!key || seen[key]) return;
      seen[key] = true;
      out.push(key);
    });
    return out;
  }

  function clone(value){
    try{ return JSON.parse(JSON.stringify(value)); }catch(e){ return value; }
  }

  function pad2(value){ return String(value).padStart(2, '0'); }
  function nowIso(){ return new Date().toISOString(); }
  function todayKey(){
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function dateKey(value){
    if(!value) return '';
    if(value instanceof Date && !isNaN(value.getTime())) return value.getFullYear() + '-' + pad2(value.getMonth() + 1) + '-' + pad2(value.getDate());
    var text = String(value || '').trim();
    var match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? match[1] + '-' + match[2] + '-' + match[3] : '';
  }

  function blank(date){
    return {
      date: date || todayKey(),
      symptoms: {sneeze:null, eyes:null, nose:null, breath:null},
      answered: {sneeze:false, eyes:false, nose:false, breath:false},
      complete: false,
      note: '',
      pollenSnapshot: null,
      updatedAtLocal: ''
    };
  }

  function readJson(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      if(raw == null) return fallback;
      return JSON.parse(raw);
    }catch(e){ return fallback; }
  }

  function writeJson(key, value){
    try{
      if(DataModel && typeof DataModel.writeJsonTo === 'function') return DataModel.writeJsonTo(localStorage, key, value);
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }catch(e){ return false; }
  }

  function normalizeMap(map){
    if(DataModel && typeof DataModel.normalizePollenSymptoms === 'function'){
      return DataModel.normalizePollenSymptoms(map || {});
    }
    var source = map && typeof map === 'object' ? map : {};
    var out = {};
    Object.keys(source).forEach(function(key){
      var item = source[key];
      if(!item || typeof item !== 'object') return;
      var day = dateKey(item.date || key);
      if(!day) return;
      var base = blank(day);
      base.symptoms = Object.assign(base.symptoms, item.symptoms || {});
      if(item.answered && typeof item.answered === 'object'){
        base.answered = Object.assign(base.answered, item.answered || {});
      }else{
        Object.keys(base.symptoms).forEach(function(field){ base.answered[field] = Number(base.symptoms[field] || 0) > 0; });
      }
      base.complete = item.complete === true;
      base.note = String(item.note || '').slice(0, 500);
      base.pollenSnapshot = item.pollenSnapshot || null;
      base.updatedAtLocal = String(item.updatedAtLocal || '');
      out[day] = Object.assign({}, item, base);
    });
    return out;
  }

  function mergeMaps(base, incoming){
    var out = normalizeMap(base);
    var next = normalizeMap(incoming);
    Object.keys(next).forEach(function(day){
      out[day] = Object.assign({}, out[day] || {}, next[day], {date:day});
    });
    return out;
  }

  function readAllMaps(){
    var out = {};
    READ_KEYS.forEach(function(key){
      var value = readJson(key, null);
      if(value && typeof value === 'object' && !Array.isArray(value)){
        out = mergeMaps(out, value);
      }
    });
    return out;
  }

  function replaceAll(map, opts){
    state.days = normalizeMap(map || {});
    if(opts && opts.persist) persistAll();
    return getAll();
  }

  function getAll(){
    return clone(state.days) || {};
  }

  function get(date){
    var day = dateKey(date) || todayKey();
    var item = state.days[day];
    return item ? clone(item) : blank(day);
  }

  function upsert(record, opts){
    opts = opts || {};
    var day = dateKey(record && record.date) || todayKey();
    var map = {};
    map[day] = Object.assign({}, record || {}, {date:day});
    var normalized = normalizeMap(map);
    var item = normalized[day] || blank(day);
    if(opts.touch !== false) item.updatedAtLocal = nowIso();
    state.days[day] = item;
    if(opts.persist) persistAll();
    return get(day);
  }

  function persistAll(){
    WRITE_KEYS.forEach(function(key){ writeJson(key, state.days); });
  }

  state.days = readAllMaps();

  window.ChangePollenStore = {
    canonicalKey: CANONICAL_KEY,
    readKeys: READ_KEYS.slice(),
    writeKeys: WRITE_KEYS.slice(),
    getAll: getAll,
    all: getAll,
    get: get,
    replaceAll: replaceAll,
    upsert: upsert,
    persistAll: persistAll,
    audit: function(){
      return {
        dataModelVersion: DataModel && DataModel.version || '',
        counts: {pollenSymptomDays: Object.keys(state.days).length},
        storageKeys: {read: READ_KEYS.slice(), write: WRITE_KEYS.slice()},
        generatedAt: nowIso()
      };
    }
  };
})();
