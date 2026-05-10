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
  function fmtDay(date){
    try{
      var d = new Date(String(date).slice(0,10) + 'T12:00:00');
      return d.toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'});
    }catch(e){ return String(date || ''); }
  }
  function settings(){ return Store && Store.settings ? Store.settings() : {}; }
  function hourlyRange(){
    var n = Number(settings().weatherHourlyHours || 12);
    return n === 24 ? 24 : 12;
  }
  function hasAnyEnabled(){
    var s = settings();
    return !!(s.weatherEnabled || s.rainAlertsEnabled || s.pollenEnabled || s.pollenAlertsEnabled);
  }
  function pollenSummary(data){
    var p = data && data.pollen;
    if(!p) return 'Pollen werden geladen';
    if(p.strong && p.strong.length) return 'Stark: ' + p.strong.map(function(x){ return x.name; }).join(', ');
    if(p.elevated && p.elevated.length) return 'Mittel: ' + p.elevated.map(function(x){ return x.name; }).join(', ');
    return 'Pollen ruhig';
  }
  function weatherSummary(data){
    var w = data && data.weather;
    if(!w) return 'Wetter wird geladen';
    return (w.icon || '🌦️') + ' ' + (w.temperature != null ? w.temperature + ' °C' : 'Wetter') + ' · ' + (w.summary || 'heute');
  }
  function rainSummary(data){
    var w = data && data.weather;
    if(!w || !w.nextRain) return 'keine Regenwarnung';
    var prob = w.nextRain.probability != null ? ' · ' + w.nextRain.probability + ' %' : '';
    return 'Regen in ' + w.nextRain.minutes + ' Min.' + prob;
  }
  function ensureHeader(){
    var hello = document.querySelector('.dash-hello');
    if(!hello) return null;
    hello.classList.add('change-health-ready');
    var h = document.getElementById('dash-greeting');
    var sub = document.getElementById('dash-sub');
    var title = hello.querySelector('.change-dash-title-block');
    if(!title && h){
      title = document.createElement('div');
      title.className = 'change-dash-title-block';
      hello.insertBefore(title, hello.firstChild);
      title.appendChild(h);
      if(sub) title.appendChild(sub);
    }
    var summary = document.getElementById('change-health-summary');
    if(!summary){
      summary = document.createElement('div');
      summary.id = 'change-health-summary';
      summary.className = 'change-health-summary';
      hello.appendChild(summary);
    }
    return summary;
  }
  function heroHtml(){
    var s = settings();
    var loc = Store && Store.getLocation ? Store.getLocation() : null;
    var data = Service && Service.getCached ? Service.getCached() : null;
    if(!hasAnyEnabled()) return '';
    if(!loc){
      return '<button class="change-health-pill is-warning" type="button" onclick="ChangeWeatherCard.updateLocation()"><span>📍</span><span><strong>Standort fehlt</strong><small>für Wetter & Pollen</small></span></button>';
    }
    var html = '';
    if(s.weatherEnabled || s.rainAlertsEnabled){
      html += '<button class="change-health-pill" type="button" onclick="ChangeWeatherCard.openForecast(\'weather\')"><span>🌦️</span><span><strong>'+esc(weatherSummary(data))+'</strong><small>'+esc(rainSummary(data))+'</small></span></button>';
    }
    if(s.pollenEnabled || s.pollenAlertsEnabled){
      var hasStrong = data && data.pollen && data.pollen.strong && data.pollen.strong.length;
      html += '<button class="change-health-pill '+(hasStrong?'is-warning':'')+'" type="button" onclick="ChangeWeatherCard.openForecast(\'pollen\')"><span>🌿</span><span><strong>'+esc(pollenSummary(data))+'</strong><small>7-Tage-Ausblick</small></span></button>';
    }
    return html;
  }
  function removeOldCard(){
    var old = document.getElementById('change-health-card');
    if(old) old.remove();
    document.querySelectorAll('.change-health-card').forEach(function(el){ el.remove(); });
  }
  function updateHero(){
    removeOldCard();
    var node = ensureHeader();
    if(!node) return;
    node.innerHTML = heroHtml();
    node.style.display = node.innerHTML.trim() ? '' : 'none';
  }
  function levelClass(level){ return level === 'high' ? 'high' : level === 'medium' ? 'medium' : level === 'low' ? 'low' : 'none'; }
  function levelLabel(level){ return level === 'high' ? 'hoch' : level === 'medium' ? 'mittel' : level === 'low' ? 'niedrig' : 'ruhig'; }
  function weatherCurrentHtml(data){
    var w = data && data.weather;
    if(!w) return '';
    var rain = rainSummary(data);
    var forecast = w.forecast && w.forecast[0] ? w.forecast[0] : null;
    var tempLine = (w.temperature != null ? w.temperature + ' °C' : 'Wetter') + ' · ' + (w.summary || 'heute');
    var range = forecast ? ((forecast.tempMax != null ? forecast.tempMax + '°' : '–') + ' / ' + (forecast.tempMin != null ? forecast.tempMin + '°' : '–')) : '';
    return '<div class="change-weather-now"><div class="change-weather-now-icon">'+esc(w.icon || '🌦️')+'</div><div><strong>'+esc(tempLine)+'</strong><small>'+esc(rain)+' '+(range ? '· Tageswerte '+range : '')+'</small></div></div>';
  }
  function weatherHourlyHtml(data){
    var hourly = data && data.weather && data.weather.hourly || [];
    if(!hourly.length) return '<div class="change-forecast-empty">Noch keine Stundenwerte geladen.</div>';
    var range = hourlyRange();
    var visible = hourly.slice(0, range);
    var lastDay = null;
    var cards = visible.map(function(hour, index){
      var divider = '';
      if(index > 0 && hour.dayKey !== lastDay){
        divider = '<div class="change-hourly-divider">'+esc(hour.dayLabel || 'Morgen')+'</div>';
      }
      lastDay = hour.dayKey;
      var prob = hour.rainProbability != null ? hour.rainProbability + ' %' : '';
      var rainText = prob || (hour.precipitation ? hour.precipitation + ' mm' : hour.summary || '');
      return divider + '<div class="change-hourly-card '+(hour.isWet?'is-rain':'')+'"><div class="change-hourly-time">'+esc(hour.label || '')+'</div><div class="change-hourly-icon">'+esc(hour.icon || '🌦️')+'</div><strong>'+esc(hour.temperature != null ? hour.temperature + '°' : '–')+'</strong><small>'+esc(rainText)+'</small></div>';
    }).join('');
    return '<section class="change-hourly-section"><div class="change-section-head"><strong>Nächste Stunden</strong><div class="change-hourly-toggle" role="group" aria-label="Stundenbereich"><button type="button" class="'+(range===12?'active':'')+'" onclick="ChangeWeatherCard.setHourlyRange(12)">12 h</button><button type="button" class="'+(range===24?'active':'')+'" onclick="ChangeWeatherCard.setHourlyRange(24)">24 h</button></div></div><div class="change-hourly-strip">'+cards+'</div></section>';
  }
  function weatherForecastHtml(data){
    var forecast = data && data.weather && data.weather.forecast || [];
    if(!forecast.length) return '<div class="change-forecast-empty">Noch kein Wetter-Ausblick geladen.</div>';
    return '<section class="change-daily-section"><div class="change-section-head"><strong>7-Tage-Ausblick</strong></div><div class="change-forecast-list">' + forecast.map(function(day){
      var rain = day.rainProbability != null ? day.rainProbability + ' % Regen' : (day.precipitation ? day.precipitation + ' mm' : 'kaum Regen');
      var temp = (day.tempMax != null ? day.tempMax + '°' : '–') + ' / ' + (day.tempMin != null ? day.tempMin + '°' : '–');
      return '<div class="change-forecast-row"><div class="change-forecast-date"><strong>'+esc(fmtDay(day.date))+'</strong><span>'+esc(day.icon || '🌦️')+'</span></div><div class="change-forecast-main"><strong>'+esc(day.summary || 'Wetter')+'</strong><small>'+esc(rain)+'</small></div><div class="change-forecast-value">'+esc(temp)+'</div></div>';
    }).join('') + '</div></section>';
  }
  function pollenForecastHtml(data){
    var forecast = data && data.pollen && data.pollen.forecast || [];
    if(!forecast.length) return '<div class="change-forecast-empty">Noch kein Pollen-Ausblick geladen.</div>';
    return '<div class="change-forecast-list">' + forecast.map(function(day){
      var top = (day.top && day.top.length ? day.top : (day.items || []).slice(0,2)).filter(function(x){ return x.rank > 0; });
      var strong = day.strong && day.strong.length;
      var label = strong ? 'stark' : (day.elevated && day.elevated.length ? 'mittel' : 'ruhig');
      var chips = top.length ? top.map(function(p){ return '<span class="change-pollen-chip '+esc(levelClass(p.level))+'">'+esc(p.name)+' · '+esc(p.levelLabel || levelLabel(p.level))+'</span>'; }).join('') : '<span class="change-pollen-chip none">keine starke Belastung</span>';
      return '<div class="change-forecast-row"><div class="change-forecast-date"><strong>'+esc(fmtDay(day.date))+'</strong><span>🌿</span></div><div class="change-forecast-main"><strong>Pollen '+esc(label)+'</strong><div class="change-pollen-chips">'+chips+'</div></div></div>';
    }).join('') + '</div>';
  }
  async function getData(force){
    if(force && Service && Service.refresh) return Service.refresh(true);
    if(Service && Service.ensureFresh) return Service.ensureFresh();
    return Service && Service.getCached ? Service.getCached() : null;
  }
  async function openForecast(type, options){
    options = options || {};
    try{
      var s = settings();
      if(type === 'weather' && !(s.weatherEnabled || s.rainAlertsEnabled)) Store.writeSettings({weatherEnabled:true});
      if(type === 'pollen' && !(s.pollenEnabled || s.pollenAlertsEnabled)) Store.writeSettings({pollenEnabled:true});
      if(Store && !Store.getLocation()) await Store.requestLocation();
      var data = await getData(options.forceRefresh === false ? false : true);
      updateHero();
      var isPollen = type === 'pollen';
      var title = isPollen ? '🌿 Pollen-Ausblick' : '🌦️ Wetter-Ausblick';
      var sub = isPollen ? 'Nächste 7 Tage · aktueller Standort' : 'Heute · Stunden · 7 Tage';
      var content = isPollen ? pollenForecastHtml(data) : (weatherCurrentHtml(data) + weatherHourlyHtml(data) + weatherForecastHtml(data));
      var body = '<div class="change-forecast-panel"><div class="change-forecast-head"><div><div class="change-forecast-title">'+title+'</div><div class="change-forecast-sub">'+sub+'</div></div></div>' + content + '</div>';
      if(typeof window.openPanel === 'function') window.openPanel(isPollen ? 'Pollen' : 'Wetter', body);
    }catch(e){ if(typeof toast === 'function') toast(e.message || 'Ausblick konnte nicht geladen werden','err'); }
  }
  async function refreshForecast(type){
    await refresh();
    await openForecast(type || 'weather', {forceRefresh:false});
  }
  async function setHourlyRange(hours){
    var next = Number(hours) === 24 ? 24 : 12;
    if(Store && Store.writeSettings) Store.writeSettings({weatherHourlyHours: next});
    await openForecast('weather', {forceRefresh:false});
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
      updateHero();
      try{ if(typeof window.updateBellIndicator === 'function') window.updateBellIndicator(); }catch(e){}
    }catch(e){ if(typeof toast === 'function') toast(e.message || 'Wetterdaten konnten nicht geladen werden','err'); }
  }
  function installDashboardHook(){
    if(installed) return;
    installed = true;
    var original = window.buildDashCards;
    window.buildDashCards = function(){
      var result;
      if(typeof original === 'function') result = original.apply(this, arguments);
      setTimeout(updateHero, 0);
      return result;
    };
    var originalBuild = window.buildDashboard;
    if(typeof originalBuild === 'function'){
      window.buildDashboard = function(){
        var result = originalBuild.apply(this, arguments);
        setTimeout(updateHero, 0);
        return result;
      };
    }
    setTimeout(updateHero, 100);
    setTimeout(updateHero, 700);
  }

  window.ChangeWeatherCard = {
    update: updateHero,
    refresh: refresh,
    updateLocation: updateLocation,
    enableAll: enableAll,
    openForecast: openForecast,
    refreshForecast: refreshForecast,
    setHourlyRange: setHourlyRange,
    installDashboardHook: installDashboardHook
  };

  setTimeout(installDashboardHook, 0);
})();
