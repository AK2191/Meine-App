(function(){
  'use strict';

  var Store = window.ChangeWeatherStore;
  var Service = window.ChangeWeatherService;
  var Rules = window.ChangeWeatherRules;
  var installed = false;

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function fmtUpdated(iso){
    if(!iso) return '';
    try{ return new Date(iso).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}); }catch(e){ return ''; }
  }
  function settings(){ return Store && Store.settings ? Store.settings() : {}; }
  function hasAnyEnabled(){
    var s = settings();
    return !!(s.weatherEnabled || s.rainAlertsEnabled || s.pollenEnabled || s.pollenAlertsEnabled);
  }
  function pollenLine(data){
    var p = data && data.pollen;
    if(!p) return '<div class="change-health-muted">Pollen werden geladen …</div>';
    if(p.strong && p.strong.length) return '<div><strong>Stark:</strong> '+esc(p.strong.map(function(x){ return x.name; }).join(', '))+'</div>';
    if(p.elevated && p.elevated.length) return '<div><strong>Mittel:</strong> '+esc(p.elevated.map(function(x){ return x.name; }).join(', '))+'</div>';
    return '<div>Keine starke Pollenbelastung</div>';
  }
  function pollenChips(data){
    var p = data && data.pollen;
    if(!p || !p.items) return '';
    return p.items.filter(function(item){ return item.rank >= 2; }).slice(0,4).map(function(item){
      return '<span class="change-pollen-chip '+esc(item.level)+'">'+esc(item.name)+' · '+esc(item.levelLabel)+'</span>';
    }).join('');
  }
  function weatherLine(data){
    var w = data && data.weather;
    if(!w) return '<div class="change-health-muted">Wetter wird geladen …</div>';
    var main = (w.temperature != null ? w.temperature+' °C · ' : '') + (w.summary || 'Wetter');
    var rain = w.nextRain ? 'Regen in ca. '+w.nextRain.minutes+' Min.' : 'Keine Regenwarnung nächste Stunde';
    return '<div><strong>'+esc(main)+'</strong></div><div class="change-health-muted">'+esc(rain)+'</div>';
  }
  function cardHtml(){
    var s = settings();
    var loc = Store && Store.getLocation ? Store.getLocation() : null;
    var data = Service && Service.getCached ? Service.getCached() : null;
    if(!hasAnyEnabled()){
      return '<div class="dash-card change-health-card"><div class="dash-card-head"><div><div class="dash-card-title">🌦️ Wetter & Pollen</div><div class="dash-card-sub">Aktueller Standort</div></div></div><div class="dash-card-body"><div class="change-health-empty">Wetter und Pollen sind ausgeschaltet.</div><button class="btn btn-secondary btn-full" type="button" onclick="ChangeWeatherCard.enableAll()">Wetter & Pollen aktivieren</button></div></div>';
    }
    if(!loc){
      return '<div class="dash-card change-health-card"><div class="dash-card-head"><div><div class="dash-card-title">🌦️ Wetter & Pollen</div><div class="dash-card-sub">Standort benötigt</div></div></div><div class="dash-card-body"><div class="change-health-empty">Standort freigeben, damit Change Wetter und starke Pollen anzeigen kann.</div><button class="btn btn-secondary btn-full" type="button" onclick="ChangeWeatherCard.updateLocation()">Standort freigeben</button></div></div>';
    }
    var body = '';
    if(s.weatherEnabled || s.rainAlertsEnabled){
      body += '<div class="change-health-block"><div class="change-health-label">Wetter</div>'+weatherLine(data)+'</div>';
    }
    if(s.pollenEnabled || s.pollenAlertsEnabled){
      body += '<div class="change-health-block"><div class="change-health-label">Pollen aktuell</div>'+pollenLine(data)+'<div class="change-pollen-chips">'+pollenChips(data)+'</div></div>';
    }
    if(data && (data.weatherError || data.pollenError)){
      body += '<div class="change-health-error">'+esc(data.weatherError || data.pollenError)+'</div>';
    }
    var updated = data && data.savedAt ? 'Aktualisiert '+fmtUpdated(data.savedAt) : 'Wird aktualisiert';
    return '<div class="dash-card change-health-card" id="change-health-card"><div class="dash-card-head"><div><div class="dash-card-title">🌦️ Wetter & Pollen</div><div class="dash-card-sub">'+esc(updated)+'</div></div><button class="btn btn-ghost btn-sm" type="button" onclick="ChangeWeatherCard.refresh()">↻</button></div><div class="dash-card-body">'+body+'</div></div>';
  }
  function insertCard(){
    var grid = document.getElementById('dash-grid');
    if(!grid) return;
    var old = document.getElementById('change-health-card');
    if(old) old.remove();
    grid.insertAdjacentHTML('beforeend', cardHtml());
  }
  function update(){
    insertCard();
  }
  async function updateLocation(){
    try{
      if(!Store || !Store.requestLocation) throw new Error('Standortfunktion fehlt.');
      await Store.requestLocation();
      await refresh();
    }catch(e){ if(typeof toast === 'function') toast(e.message || 'Standort konnte nicht gespeichert werden','err'); }
  }
  async function enableAll(){
    try{
      Store.writeSettings({weatherEnabled:true, rainAlertsEnabled:true, pollenEnabled:true, pollenAlertsEnabled:true});
      await updateLocation();
      try{ if(typeof window.openSettingsPanel === 'function' && document.getElementById('set-weather')) window.openSettingsPanel('sync'); }catch(e){}
    }catch(e){ if(typeof toast === 'function') toast(e.message || 'Wetter konnte nicht aktiviert werden','err'); }
  }
  async function refresh(){
    try{
      if(Rules && Rules.refreshAndNotify) await Rules.refreshAndNotify(true);
      else if(Service && Service.refresh) await Service.refresh(true);
      update();
      try{ if(typeof window.updateBellIndicator === 'function') window.updateBellIndicator(); }catch(e){}
    }catch(e){ if(typeof toast === 'function') toast(e.message || 'Wetterdaten konnten nicht geladen werden','err'); }
  }
  function installDashboardHook(){
    if(installed) return;
    installed = true;
    var original = window.buildDashCards;
    window.buildDashCards = function(){
      if(typeof original === 'function') original.apply(this, arguments);
      insertCard();
    };
    var originalBuild = window.buildDashboard;
    if(typeof originalBuild === 'function'){
      window.buildDashboard = function(){
        originalBuild.apply(this, arguments);
        insertCard();
      };
    }
    setTimeout(insertCard, 100);
    setTimeout(insertCard, 700);
  }

  window.ChangeWeatherCard = {
    cardHtml: cardHtml,
    update: update,
    refresh: refresh,
    updateLocation: updateLocation,
    enableAll: enableAll,
    installDashboardHook: installDashboardHook
  };

  setTimeout(installDashboardHook, 0);
})();
