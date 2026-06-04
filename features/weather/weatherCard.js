(function(){
  'use strict';

  var Store = window.ChangeWeatherStore;
  var Service = window.ChangeWeatherService;
  var Rules = window.ChangeWeatherRules;
  var installed = false;
  var pollenPanelView = 'all';
  var LOCATION_MAX_AGE = 2 * 60 * 60 * 1000;

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function settings(){ return Store && Store.settings ? Store.settings() : {}; }
  function locationIsFresh(loc){
    if(!loc || !loc.savedAt) return false;
    var t = Date.parse(loc.savedAt);
    return isFinite(t) && Date.now() - t <= LOCATION_MAX_AGE;
  }
  function locationHint(loc){
    if(!loc || !loc.savedAt) return 'Standort aktualisieren';
    try{ return 'Standort von '+new Date(loc.savedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return 'Standort aktualisieren'; }
  }
  function pad2(n){ return String(n).padStart(2, '0'); }
  function todayKey(){
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }
  function fmtDay(date){
    try{ return new Date(String(date).slice(0,10)+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'}); }
    catch(e){ return String(date || ''); }
  }
  function dateFromKey(key){ return new Date(String(key || '') + 'T12:00:00'); }
  function dayDiff(key){
    var a = dateFromKey(todayKey());
    var b = dateFromKey(key);
    if(isNaN(a) || isNaN(b)) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }
  function pollenDiffLabel(diff){
    if(diff === 0) return 'Heute';
    if(diff === 1) return 'Morgen';
    if(diff === 2) return 'Übermorgen';
    if(diff > 0) return 'In ' + diff + ' Tagen';
    return 'Heute';
  }
  function levelLabel(level){ return level === 'high' ? 'hoch' : level === 'medium' ? 'mittel' : level === 'low' ? 'niedrig' : 'ruhig'; }
  function hasAnyEnabled(){
    var s = settings();
    return !!(s.weatherEnabled || s.rainAlertsEnabled || s.pollenEnabled || s.pollenAlertsEnabled);
  }
  function todayPollen(data){
    var p = data && data.pollen;
    if(!p) return null;
    var forecast = p.forecast || [];
    if(forecast.length){
      var key = todayKey();
      for(var i=0;i<forecast.length;i++){ if(forecast[i] && forecast[i].date === key) return forecast[i]; }
      return forecast[0];
    }
    return {items:p.items || [], strong:p.strong || [], elevated:p.elevated || [], top:(p.items || []).filter(function(x){ return x.rank >= 2; }).slice(0,3)};
  }
  function allActivePollen(day){
    var items = (day && day.items ? day.items : []).slice();
    return items.filter(function(p){ return Number(p.value) > 0; }).sort(function(a,b){ return (b.rank-a.rank) || (Number(b.value)-Number(a.value)); });
  }
  function pollenStatus(day){
    var strong = day && day.strong && day.strong.length;
    var medium = day && day.elevated && day.elevated.length;
    if(strong) return {key:'high', title:'Pollen stark', state:'Stark'};
    if(medium) return {key:'medium', title:'Pollen mittel', state:'Mittel'};
    return {key:'none', title:'Pollen ruhig', state:'Ruhig'};
  }
  function pollenSummary(data){
    var day = todayPollen(data);
    if(!day) return 'Pollen werden geladen';
    var active = allActivePollen(day);
    if(day.strong && day.strong.length) return 'Pollen stark · '+active.length+' Arten';
    if(day.elevated && day.elevated.length) return 'Pollen mittel · '+active.length+' Arten';
    return 'Pollen ruhig';
  }
  function pollenSubline(data){
    var active = allActivePollen(todayPollen(data)).slice(0,3);
    if(active.length) return active.map(function(x){ return x.name + ' ' + (x.levelLabel || levelLabel(x.level)); }).join(', ');
    return '7-Tage-Ausblick';
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
    if(!loc) return '<button class="change-health-pill is-warning" type="button" onclick="ChangeWeatherCard.updateLocation()"><span>📍</span><span><strong>Standort fehlt</strong><small>für Wetter & Pollen</small></span></button>';
    if(!locationIsFresh(loc)) return '<button class="change-health-pill is-warning" type="button" onclick="ChangeWeatherCard.updateLocation()"><span>📍</span><span><strong>Standort aktualisieren</strong><small>Wetter nur mit aktuellem Standort</small></span></button>';
    var html = '';
    if(s.weatherEnabled || s.rainAlertsEnabled){
      html += '<button class="change-health-pill" type="button" onclick="ChangeWeatherCard.openForecast(\'weather\')"><span>🌦️</span><span><strong>'+esc(weatherSummary(data))+'</strong><small>'+esc(rainSummary(data))+'</small></span></button>';
    }
    if(s.pollenEnabled || s.pollenAlertsEnabled){
      var day = todayPollen(data);
      var hasStrong = day && day.strong && day.strong.length;
      html += '<button class="change-health-pill '+(hasStrong?'is-warning':'')+'" type="button" onclick="ChangeWeatherCard.openForecast(\'pollen\')"><span>🌿</span><span><strong>'+esc(pollenSummary(data))+'</strong><small>'+esc(pollenSubline(data))+'</small></span></button>';
    }
    return html;
  }
  function updateHero(){
    document.querySelectorAll('#change-health-card,.change-health-card').forEach(function(el){ el.remove(); });
    var node = ensureHeader();
    if(!node) return;
    node.innerHTML = heroHtml();
    node.style.display = node.innerHTML.trim() ? '' : 'none';
  }
  function weatherSummaryPanelHtml(data){
    var w = data && data.weather;
    if(!w) return '';
    var f = w.forecast && w.forecast[0] ? w.forecast[0] : null;
    var temp = w.temperature != null ? Math.round(Number(w.temperature)) + '°' : '–';
    var rain = w.nextRain && w.nextRain.minutes != null ? w.nextRain.minutes + ' Min.' : (f && f.rainProbability != null ? f.rainProbability + ' %' : 'ruhig');
    var range = f ? ((f.tempMax != null ? Math.round(Number(f.tempMax)) + '°' : '–') + ' / ' + (f.tempMin != null ? Math.round(Number(f.tempMin)) + '°' : '–')) : '–';
    return '<div class="change-weather-summary"><div><strong>'+esc(temp)+'</strong><span>Jetzt</span></div><div><strong>'+esc(rain)+'</strong><span>Regen</span></div><div><strong>'+esc(range)+'</strong><span>Max / Min</span></div></div>';
  }
  function weatherCurrentHtml(data){
    var w = data && data.weather;
    if(!w) return '';
    var f = w.forecast && w.forecast[0] ? w.forecast[0] : null;
    var range = f ? ((f.tempMax != null ? f.tempMax + '°' : '–') + ' / ' + (f.tempMin != null ? f.tempMin + '°' : '–')) : '';
    var sun = (w.sunrise ? '<span>🌅 '+esc(w.sunrise)+'</span>' : '') + (w.sunset ? '<span>🌇 '+esc(w.sunset)+'</span>' : '');
    return '<div class="change-weather-now"><div class="change-weather-now-icon">'+esc(w.icon || '🌦️')+'</div><div class="change-weather-now-main"><strong>'+esc((w.temperature != null ? w.temperature+' °C' : 'Wetter')+' · '+(w.summary || 'heute'))+'</strong><span>'+esc(rainSummary(data))+(range ? ' · Tageswerte '+esc(range) : '')+'</span>'+(sun ? '<div class="change-sun-row">'+sun+'</div>' : '')+'</div></div>';
  }
  function weatherHourlyHtml(data){
    var hourly = data && data.weather && data.weather.hourly || [];
    if(!hourly.length) return '<div class="change-forecast-empty">Noch keine Stundenwerte geladen.</div>';
    var range = Number(settings().weatherHourlyHours || 12) === 24 ? 24 : 12;
    var lastDay = null;
    var cards = hourly.slice(0, range).map(function(hour, index){
      var isNewDay = index > 0 && hour.dayKey !== lastDay;
      lastDay = hour.dayKey;
      var rainText = hour.rainProbability != null ? hour.rainProbability+' %' : (hour.precipitation ? hour.precipitation+' mm' : hour.summary || '');
      var marker = isNewDay ? '<div class="change-hourly-day-marker">'+esc(hour.dayLabel || 'Morgen')+'</div>' : '';
      return '<div class="change-hourly-card '+(hour.isWet?'is-rain ':'')+(isNewDay?'has-day-marker':'')+'">'+marker+'<div class="change-hourly-time">'+esc(hour.label || '')+'</div><div class="change-hourly-icon">'+esc(hour.icon || '🌦️')+'</div><strong>'+esc(hour.temperature != null ? hour.temperature+'°' : '–')+'</strong><small>'+esc(rainText)+'</small></div>';
    }).join('');
    return '<section class="change-hourly-section"><div class="change-section-head"><strong>Nächste Stunden</strong><div class="change-hourly-toggle" role="group" aria-label="Stundenbereich"><button type="button" class="'+(range===12?'active':'')+'" onclick="ChangeWeatherCard.setHourlyRange(12)">12 h</button><button type="button" class="'+(range===24?'active':'')+'" onclick="ChangeWeatherCard.setHourlyRange(24)">24 h</button></div></div><div class="change-hourly-strip">'+cards+'</div></section>';
  }
  function weatherForecastHtml(data){
    var forecast = data && data.weather && data.weather.forecast || [];
    if(!forecast.length) return '<div class="change-forecast-empty">Noch kein Wetter-Ausblick geladen.</div>';
    return '<section class="change-daily-section"><div class="change-section-head"><strong>7-Tage-Ausblick</strong></div><div class="change-forecast-list">' + forecast.map(function(day){
      var rain = day.rainProbability != null ? day.rainProbability + ' % Regen' : (day.precipitation ? day.precipitation + ' mm' : 'kaum Regen');
      var temp = (day.tempMax != null ? day.tempMax + '°' : '–') + ' / ' + (day.tempMin != null ? day.tempMin + '°' : '–');
      return '<div class="change-forecast-row '+(day.rainProbability >= 50?'is-rain':'')+'"><div class="change-forecast-date"><strong>'+esc(fmtDay(day.date))+'</strong><span>'+esc(day.icon || '🌦️')+'</span></div><div class="change-forecast-main"><strong>'+esc(day.summary || 'Wetter')+'</strong><small>'+esc(rain)+'</small></div><div class="change-forecast-value">'+esc(temp)+'</div></div>';
    }).join('') + '</div></section>';
  }
  function pollenScore(day){
    var items = day && day.items || [];
    if(!items.length) return 0;
    var total = items.reduce(function(sum,p){ return sum + Math.min(100, Math.max(0, Number(p.value) || 0)); }, 0);
    return Math.round(Math.min(100, total / Math.max(1, items.length) * 1.6));
  }
  function forecastPeak(forecast){
    if(!forecast || !forecast.length) return null;
    return forecast.slice().sort(function(a,b){ return pollenScore(b) - pollenScore(a); })[0] || null;
  }
  function quietestDay(forecast){
    if(!forecast || !forecast.length) return null;
    return forecast.slice().sort(function(a,b){ return pollenScore(a) - pollenScore(b); })[0] || null;
  }
  function tomorrowTrend(forecast){
    if(!forecast || forecast.length < 2) return 'Kein Trend verfügbar.';
    var today = pollenScore(forecast[0]);
    var tomorrow = pollenScore(forecast[1]);
    var diff = tomorrow - today;
    if(diff >= 12) return 'Morgen steigt die Belastung deutlich.';
    if(diff >= 4) return 'Morgen steigt die Belastung leicht.';
    if(diff <= -12) return 'Morgen wird es deutlich ruhiger.';
    if(diff <= -4) return 'Morgen wird es etwas ruhiger.';
    return 'Morgen bleibt die Belastung ähnlich.';
  }
  function pollenInsightText(day){
    var active = allActivePollen(day);
    if(!active.length) return 'Heute sind keine relevanten Pollenwerte sichtbar.';
    var top = active[0];
    if(top && top.key === 'grass_pollen') return 'Gräser werden von der Gratis-API als Sammelwert geliefert. Roggen und einzelne Grasarten sind darin nicht getrennt enthalten.';
    return 'Haupttreiber heute: ' + top.name + ' mit Belastung ' + (top.levelLabel || levelLabel(top.level)) + '.';
  }
  function pollenSummaryPanelHtml(forecast){
    var today = forecast[0] || null;
    var peak = forecastPeak(forecast);
    var active = allActivePollen(today).length;
    var peakText = peak ? pollenDiffLabel(dayDiff(peak.date)) : '–';
    return '<div class="change-pollen-summary"><div><strong>'+esc(pollenScore(today))+'%</strong><span>Index</span></div><div><strong>'+esc(active)+'</strong><span>Arten</span></div><div><strong>'+esc(peakText)+'</strong><span>Peak</span></div></div>';
  }
  function pollenChipsHtml(day){
    var items = day && day.items || [];
    if(!items.length) return '<div class="change-pollen-empty">Keine Einzelwerte geladen.</div>';
    return '<div class="change-pollen-chips">' + items.map(function(p){
      return '<span class="change-pollen-chip '+esc(p.level || 'none')+'">'+esc(p.name)+' · '+esc(p.levelLabel || levelLabel(p.level))+' · '+esc(p.value)+'</span>';
    }).join('') + '</div>';
  }
  function pollenAdviceHtml(forecast){
    var peak = forecastPeak(forecast);
    var quiet = quietestDay(forecast);
    var trend = tomorrowTrend(forecast);
    var peakText = peak ? fmtDay(peak.date) + ' · ' + pollenScore(peak) + '%' : 'nicht verfügbar';
    var quietText = quiet ? fmtDay(quiet.date) + ' · ' + pollenScore(quiet) + '%' : 'nicht verfügbar';
    return '<div class="change-pollen-next none"><div class="change-pollen-next-icon">🧭</div><div class="change-pollen-next-main"><strong>Ausblick & Empfehlung</strong><span>'+esc(trend)+' Peak: '+esc(peakText)+'. Ruhigster Tag: '+esc(quietText)+'.</span></div></div>';
  }
  function pollenPanelRow(day){
    var status = pollenStatus(day);
    var diff = dayDiff(day.date);
    var top = allActivePollen(day).slice(0,4);
    var txt = top.length ? top.map(function(p){ return p.name+' '+(p.levelLabel || levelLabel(p.level)); }).join(', ') : 'keine Belastung';
    return '<div class="change-pollen-row '+esc(status.key)+'"><div class="change-pollen-dot"></div><div class="change-pollen-main"><div class="change-pollen-title">'+esc(fmtDay(day.date))+' · '+esc(status.title)+' · '+esc(pollenScore(day))+'%</div><div class="change-pollen-meta">'+esc(txt)+'</div></div><div class="change-pollen-state">'+esc(pollenDiffLabel(diff))+'</div></div>';
  }
  function pollenForecastHtml(data, view, loc){
    var forecast = data && data.pollen && data.pollen.forecast || [];
    if(!forecast.length) return '<div class="change-pollen-panel"><div class="change-pollen-empty">Noch kein Pollen-Ausblick geladen.<br><span>Aktualisiere Standort oder Pollen in den Einstellungen.</span></div></div>';
    var today = forecast[0];
    var status = pollenStatus(today);
    return '<div class="change-pollen-panel">'
      + pollenSummaryPanelHtml(forecast)
      + '<div class="change-pollen-next '+esc(status.key)+'"><div class="change-pollen-next-icon">🌿</div><div class="change-pollen-next-main"><strong>'+esc(status.title)+' · '+esc(fmtDay(today.date))+'</strong><span>'+esc(pollenInsightText(today))+'</span></div></div>'
      + pollenAdviceHtml(forecast)
      + '<div class="change-pollen-section-title">Heute nach Pollenart · '+esc(locationHint(loc))+'</div>'
      + pollenChipsHtml(today)
      + '<div class="change-pollen-section-title">7-Tage-Ausblick</div>'
      + '<div class="change-pollen-list">'+forecast.map(pollenPanelRow).join('')+'</div>'
      + '<div class="change-feature-note">Kostenlose Datenquelle: Open-Meteo CAMS Europe. Einzelne Gräserarten werden dort nicht getrennt ausgewiesen.</div>'
      + '</div>';
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
      var loc = Store && Store.getLocation ? Store.getLocation() : null;
      if(type === 'pollen'){
        pollenPanelView = options.view || pollenPanelView || 'all';
        if(typeof window.openPanel === 'function') window.openPanel('🌿 Pollen', pollenForecastHtml(data, pollenPanelView, loc));
        return;
      }
      var body = '<div class="change-forecast-panel change-weather-panel">' + weatherSummaryPanelHtml(data) + weatherCurrentHtml(data) + '<div class="change-weather-section-title">Stunden · '+esc(locationHint(loc))+'</div>' + weatherHourlyHtml(data) + weatherForecastHtml(data) + '</div>';
      if(typeof window.openPanel === 'function') window.openPanel('🌦️ Wetter', body);
    }catch(e){ if(typeof toast === 'function') toast(e.message || 'Ausblick konnte nicht geladen werden','err'); }
  }
  async function refreshForecast(type){ await refresh(); await openForecast(type || 'weather', {forceRefresh:false}); }
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
    openPollenForecast: function(view){ return openForecast('pollen', {forceRefresh:false, view:view || 'all'}); },
    refreshForecast: refreshForecast,
    setHourlyRange: setHourlyRange,
    installDashboardHook: installDashboardHook
  };

  function silentWeatherRefresh(){
    if(!Store || !Store.getLocation || !Service) return;
    var loc = Store.getLocation();
    if(!loc) return;
    if(Service.needsRefresh && Service.needsRefresh()){
      Service.refresh(false).then(updateHero).catch(function(){});
    }
  }
  function installAutoRefresh(){ setInterval(silentWeatherRefresh, 60 * 60 * 1000); }

  setTimeout(installDashboardHook, 0);
  setTimeout(installAutoRefresh, 500);
})();