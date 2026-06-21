/* Change App - SettingsStore
 * Canonical Snapshot fuer Einstellungen.
 * Liest bestehende Legacy-Keys, schreibt nur den Settings-Snapshot und loescht nichts.
 */
(function(){
  'use strict';

  var DataModel = window.ChangeDataModel || null;
  var canonicalKeys = DataModel && DataModel.canonicalKeys ? DataModel.canonicalKeys : {};
  var SNAPSHOT_KEY = canonicalKeys.settingsSnapshot || 'change_v1_settings_snapshot';
  var timer = null;

  function nowIso(){ return new Date().toISOString(); }

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

  function clone(value){
    try{ return JSON.parse(JSON.stringify(value)); }catch(e){ return value; }
  }

  function normalizeSnapshot(snapshot){
    var out = snapshot && typeof snapshot === 'object' ? clone(snapshot) : {};
    out.schema = parseInt(out.schema, 10) || 1;
    out.updatedAtLocal = out.updatedAtLocal || nowIso();
    out.calendar = out.calendar && typeof out.calendar === 'object' ? out.calendar : {};
    out.dashboard = out.dashboard && typeof out.dashboard === 'object' ? out.dashboard : {};
    out.sync = out.sync && typeof out.sync === 'object' ? out.sync : {};
    out.weather = out.weather && typeof out.weather === 'object' ? out.weather : {};
    return out;
  }

  function collectSnapshot(){
    var snapshot = null;
    try{
      if(typeof window.getChangeSettings === 'function') snapshot = window.getChangeSettings();
    }catch(e){ snapshot = null; }
    if(!snapshot && DataModel && typeof DataModel.collectSettings === 'function'){
      try{ snapshot = DataModel.collectSettings(localStorage); }catch(e){ snapshot = null; }
    }
    return normalizeSnapshot(snapshot);
  }

  function readSnapshot(){
    return normalizeSnapshot(readJson(SNAPSHOT_KEY, {}));
  }

  function persistSnapshot(options){
    options = options || {};
    var snapshot = options.snapshot || collectSnapshot();
    snapshot = normalizeSnapshot(snapshot);
    if(options.source) snapshot.source = String(options.source);
    writeJson(SNAPSHOT_KEY, snapshot);
    return snapshot;
  }

  function scheduleSnapshot(options){
    options = options || {};
    clearTimeout(timer);
    timer = setTimeout(function(){ persistSnapshot(options); }, options.delay || 120);
  }

  window.ChangeSettingsStore = {
    snapshotKey: SNAPSHOT_KEY,
    collectSnapshot: collectSnapshot,
    readSnapshot: readSnapshot,
    persistSnapshot: persistSnapshot,
    scheduleSnapshot: scheduleSnapshot,
    markChanged: scheduleSnapshot,
    audit: function(){
      var snapshot = readSnapshot();
      return {
        dataModelVersion: DataModel && DataModel.version || '',
        snapshotKey: SNAPSHOT_KEY,
        hasSnapshot: !!localStorage.getItem(SNAPSHOT_KEY),
        sections: Object.keys(snapshot).filter(function(key){ return snapshot[key] && typeof snapshot[key] === 'object'; }),
        updatedAtLocal: snapshot.updatedAtLocal || ''
      };
    }
  };
})();
