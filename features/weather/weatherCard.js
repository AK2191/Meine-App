(function(){
  'use strict';

  var Store = window.ChangeWeatherStore;
  var Service = window.ChangeWeatherService;
  var Rules = window.ChangeWeatherRules;
  var installed = false;
  var pollenPanelView = 'all';

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  var LOCATION_MAX_AGE = 2 * 60 * 60 * 1000;  // 2h – sync mit weatherService

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
  function locationIsFresh(loc){
    if(!loc || !loc.savedAt) return false;
    var t = Date.parse(loc.savedAt);
    return isFinite(t) && Date.now() - t <= LOCATION_MAX_AGE;
  }
  function locationHint(loc){
    if(!loc || !loc.savedAt) return 'Standort aktualisieren';
    try{ return 'Standort von '+new Date(loc.savedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return 'Standort aktualisieren'; }
  }
  function hasAnyEnabled(){
    var s = settings();
    return !!(s.weatherEnabled || s.rainAlertsEnabled || s.pollenEnabled || s.pollenAlertsEnabled);
  }
  function todayPollen(data){
    var p = data && data.pollen;
    if(!p) return null;
    var forecast = p.forecast || [];
    if(forecast.length){
      var todayKey = new Date().toISOString().slice(0, 10);
      for(var i=0;i<forecast.length;i++){
        if(forecast[i] && forecast[i].date === todayKey) return forecast[i];
      }
      return forecast[0];
    }
    return {items:p.items || [], strong:p.strong || [], elevated:p.elevated || [], top:(p.items || []).filter(function(x){ return x.rank >= 2; }).slice(0,3)};
  }
  function pollenSummary(data){
    var day = todayPollen(data);
    if(!day) return 'Pollen werden geladen';
    if(day.strong && day.strong.length) return 'Pollen stark';
    if(day.elevated && day.elevated.length) return 'Pollen mittel';
    return 'Pollen ruhig';
  }
  function pollenSubline(data){
    var day = todayPollen(data);
    if(!day) return '7-Tage-Ausblick';
    var top = (day.strong && day.strong.length ? day.strong : (day.elevated && day.elevated.length ? day.elevated : [])).slice(0, 2);
    if(top.length) return top.map(function(x){ return x.name; }).join(', ');
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
    if(!loc){
      return '<button class="change-health-pill is-warning" type="button" onclick="ChangeWeatherCard.updateLocation()"><span>📍</span><span><strong>Standort fehlt</strong><small>für Wetter & Pollen</small></span></button>';
    }
    if(!locationIsFresh(loc)){
      return '<button class="change-health-pill is-warning" type="button" onclick="ChangeWeatherCard.updateLocation()"><span>📍</span><span><strong>Standort aktualisieren</strong><small>Wetter nur mit aktuellem Standort</small></span></button>';
    }
    var html = '';
    if(s.weatherEnabled || s.rainAlertsEnabled){
      html += '<button class="change-health-pill" type="button" onclick="ChangeWeatherCard.openForecast(\'weather\')"><span>🌦️</span><span><strong>'+esc(weatherSummary(data))+'</strong><small>'+esc(rainSummary(data))+'</small></span></button>';
    }
    if(s.pollenEnabled || s.pollenAlertsEnabled){
      var dayPollen = todayPollen(data);
      var hasStrong = dayPollen && dayPollen.strong && dayPollen.strong.length;
      html += '<button class="change-health-pill '+(hasStrong?'is-warning':'')+'" type="button" onclick="ChangeWeatherCard.openForecast(\'pollen\')"><span>🌿</span><span><strong>'+esc(pollenSummary(data))+'</strong><small>'+esc(pollenSubline(data))+'</small></span></button>';
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
  function pad2(n){ return String(n).padStart(2, '0'); }
  function todayKey(){
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }
  function dateFromKey(key){ return new Date(String(key || '') + 'T12:00:00'); }
  function dayDiff(key){
    var a = dateFromKey(todayKey());
    var b = dateFromKey(key);
    if(isNaN(a) || isNaN(b)) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }
  function weekEndKey(key){
    var d = dateFromKey(key || todayKey());
    if(isNaN(d)) return key || todayKey();
    var day = d.getDay();
    var daysToSunday = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + daysToSunday);
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }
  function pollenRangeTitle(view){
    if(view === 'today') return 'Heute';
    if(view === 'tomorrow') return 'Morgen';
    if(view === 'week') return 'Diese Woche';
    if(view === 'month') return 'Dieser Monat';
    return 'Alle Pollentage';
  }
  function pollenDiffLabel(diff){
    if(diff === 0) return 'Heute';
    if(diff === 1) return 'Morgen';
    if(diff === 2) return 'Übermorgen';
    if(diff > 0) return 'In ' + diff + ' Tagen';
    return 'Heute';
  }
  function pollenStatus(day){
    var strong = day && day.strong && day.strong.length;
    var medium = day && day.elevated && day.elevated.length;
    if(strong) return {key:'high', title:'Pollen stark', state:'Stark'};
    if(medium) return {key:'medium', title:'Pollen mittel', state:'Mittel'};
    return {key:'none', title:'Pollen ruhig', state:'Ruhig'};
  }
  function pollenTopItems(day){
    var items = [];
    if(day && day.top && day.top.length) items = day.top.slice();
    else if(day && day.items && day.items.length) items = day.items.filter(function(x){ return x.rank > 0; }).slice(0, 3);
    return items;
  }
  function pollenItemText(day){
    var top = pollenTopItems(day);
    if(!top.length) return 'keine starke Belastung';
    return top.slice(0, 3).map(function(p){ return p.name + ' · ' + (p.levelLabel || levelLabel(p.level)); }).join(', ');
  }
  function isPollenInWeek(day){
    var from = todayKey();
    return !!(day && day.date >= from && day.date <= weekEndKey(from));
  }
  function isPollenInMonth(day){
    var from = todayKey();
    return !!(day && day.date && day.date.slice(0,7) === from.slice(0,7));
  }
  function filterPollenByView(list, view){
    var selected = view || 'all';
    if(selected === 'today') return list.filter(function(day){ return dayDiff(day.date) === 0; });
    if(selected === 'tomorrow') return list.filter(function(day){ return dayDiff(day.date) === 1; });
    if(selected === 'week') return list.filter(isPollenInWeek);
    if(selected === 'month') return list.filter(isPollenInMonth);
    return list;
  }
  function pollenViewCount(list, view){ return filterPollenByView(list, view).length; }
  function weatherCurrentHtml(data){
    var w = data && data.weather;
    if(!w) return '';
    var rain = rainSummary(data);
    var forecast = w.forecast && w.forecast[0] ? w.forecast[0] : null;
    var tempLine = (w.temperature != null ? w.temperature + ' °C' : 'Wetter') + ' · ' + (w.summary || 'heute');
    var range = forecast ? ((forecast.tempMax != null ? forecast.tempMax + '°' : '–') + ' / ' + (forecast.tempMin != null ? forecast.tempMin + '°' : '–')) : '';
    var sunHtml = '';
    if(w.sunrise || w.sunset){
      sunHtml = '<div class="change-sun-row">'
        + (w.sunrise ? '<span>🌅 '+esc(w.sunrise)+'</span>' : '')
        + (w.sunset  ? '<span>🌇 '+esc(w.sunset) +'</span>' : '')
        + '</div>';
    }
    return '<div class="change-weather-now"><div class="change-weather-now-icon">'+esc(w.icon || '🌦️')+'</div><div><strong>'+esc(tempLine)+'</strong><small>'+esc(rain)+' '+(range ? '· Tageswerte '+range : '')+'</small>'+sunHtml+'</div></div>';
  }
  function weatherHourlyHtml(data){
    var hourly = data && data.weather && data.weather.hourly || [];
    if(!hourly.length) return '<div class="change-forecast-empty">Noch keine Stundenwerte geladen.</div>';
    var range = hourlyRange();
    var visible = hourly.slice(0, range);
    var lastDay = null;
    var cards = visible.map(function(hour, index){
      var isNewDay = index > 0 && hour.dayKey !== lastDay;
      lastDay = hour.dayKey;
      var prob = hour.rainProbability != null ? hour.rainProbability + ' %' : '';
      var rainText = prob || (hour.precipitation ? hour.precipitation + ' mm' : hour.summary || '');
      var marker = isNewDay ? '<div class="change-hourly-day-marker">'+esc(hour.dayLabel || 'Morgen')+'</div>' : '';
      return '<div class="change-hourly-card '+(hour.isWet?'is-rain ':'')+(isNewDay?'has-day-marker':'')+'">'+marker+'<div class="change-hourly-time">'+esc(hour.label || '')+'</div><div class="change-hourly-icon">'+esc(hour.icon || '🌦️')+'</div><strong>'+esc(hour.temperature != null ? hour.temperature + '°' : '–')+'</strong><small>'+esc(rainText)+'</small></div>';
    }).join('');
    return '<section class="change-hourly-section"><div class="change-section-head"><strong>Nächste Stunden</strong><div class="change-hourly-toggle" role="group" aria-label="Stundenbereich"><button type="button" class="'+(range===12?'active':'')+'" onclick="ChangeWeatherCard.setHourlyRange(12)">12 h</button><button type="button" class="'+(range===24?'active':'')+'" onclick="ChangeWeatherCard.setHourlyRange(24)">24 h</button></div></div><div class="change-hourly-strip">'+cards+'</div></section>';
  }
  function weatherForecastHtml(data){
    var forecast = data && data.weather && data.weather.forecast || [];
    if(!forecast.length) return '<div class="change-forecast-empty">Noch kein Wetter-Ausblick geladen.</div>';
    return '<section class="change-daily-section"><div class="change-section-head"><strong>7-Tage-Ausblick</strong></div><div class="change-forecast-list">' + forecast.map(function(day){
      var rain = day.rainProbability != null ? day.rainProbability + ' % Regen' : (day.precipitation ? day.precipitation + ' mm' : 'kaum Regen');
      var temp = (day.tempMax != null ? day.tempMax + '°' : '–') + ' / ' + (day.tempMin != null ? day.tempMin + '°' : '–');
      var sunStr = (day.sunrise ? '🌅 '+esc(day.sunrise) : '') + (day.sunrise && day.sunset ? '  ' : '') + (day.sunset ? '🌇 '+esc(day.sunset) : '');
      return '<div class="change-forecast-row"><div class="change-forecast-date"><div class="change-forecast-row-icon">'+esc(day.icon || '🌦️')+'</div><strong>'+esc(fmtDay(day.date))+'</strong></div><div class="change-forecast-main"><strong>'+esc(day.summary || 'Wetter')+'</strong><small>'+esc(rain)+(sunStr ? ' · '+sunStr : '')+'</small></div><div class="change-forecast-value">'+esc(temp)+'</div></div>';
    }).join('') + '</div></section>';
  }
  function pollenFilterChips(list, active){
    var views = [
      {key:'today', label:'Heute'},
      {key:'tomorrow', label:'Morgen'},
      {key:'week', label:'Woche'},
      {key:'month', label:'Monat'},
      {key:'all', label:'Alle'}
    ];
    return '<div class="change-pollen-filter" role="group" aria-label="Pollen filtern">' + views.map(function(view){
      var cls = view.key === active ? ' active' : '';
      return '<button type="button" class="change-pollen-view-chip'+cls+'" onclick="window.ChangeWeatherCard&&window.ChangeWeatherCard.openPollenForecast(\''+view.key+'\')">'
        + '<span>'+esc(view.label)+'</span><strong>'+pollenViewCount(list, view.key)+'</strong></button>';
    }).join('') + '</div>';
  }
  function pollenHighlight(day){
    if(!day) return '';
    var status = pollenStatus(day);
    var diff = dayDiff(day.date);
    return '<div class="change-pollen-next '+esc(status.key)+'">'
      + '<div class="change-pollen-next-icon">🌿</div>'
      + '<div class="change-pollen-next-main"><strong>'+esc(status.title)+'</strong><span>'+esc(fmtDay(day.date))+' · '+esc(pollenDiffLabel(diff))+' · '+esc(pollenItemText(day))+'</span></div>'
      + '</div>';
  }
  function pollenPanelRow(day){
    var status = pollenStatus(day);
    var diff = dayDiff(day.date);
    return '<div class="change-pollen-row '+esc(status.key)+'">'
      + '<div class="change-pollen-row-icon">🌿</div>'
      + '<div class="change-pollen-main">'
      + '<div class="change-pollen-title">'+esc(status.title)+'</div>'
      + '<div class="change-pollen-meta">'+esc(fmtDay(day.date))+' · '+esc(pollenItemText(day))+'</div>'
      + '</div>'
      + '<div class="change-pollen-state">'+esc(pollenDiffLabel(diff))+'</div>'
      + '</div>';
  }
  function pollenEmpty(){
    return '<div class="change-pollen-empty">Keine Pollenwerte im geladenen Ausblick gefunden.<br><span>Aktualisiere Standort oder Pollen in den Einstellungen.</span></div>';
  }
  function pollenForecastHtml(data, view, loc){
    var forecast = data && data.pollen && data.pollen.forecast || [];
    if(!forecast.length) return '<div class="change-pollen-panel"><div class="change-pollen-empty">Noch kein Pollen-Ausblick geladen.<br><span>Aktualisiere Standort oder Pollen in den Einstellungen.</span></div></div>';
    var highCount = forecast.filter(function(day){ return day && day.strong && day.strong.length; }).length;
    var mediumCount = forecast.filter(function(day){ return day && !(day.strong && day.strong.length) && day.elevated && day.elevated.length; }).length;
    var highlight = forecast.find(function(day){ return day && ((day.strong && day.strong.length) || (day.elevated && day.elevated.length)); }) || forecast[0];
    return '<div class="change-pollen-panel">'
      + '<div class="change-pollen-summary">'
      + '<div><strong>'+forecast.length+'</strong><span>Tage</span></div>'
      + '<div><strong>'+highCount+'</strong><span>Stark</span></div>'
      + '<div><strong>'+mediumCount+'</strong><span>Mittel</span></div>'
      + '</div>'
      + pollenHighlight(highlight)
      + '<div class="change-pollen-section-title">Pollen-Ausblick · '+esc(locationHint(loc))+'</div>'
      + '<div class="change-pollen-list">' + (forecast.length ? forecast.map(pollenPanelRow).join('') : pollenEmpty()) + '</div>'
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
      var isPollen = type === 'pollen';
      var loc = Store && Store.getLocation ? Store.getLocation() : null;
      if(isPollen){
        pollenPanelView = options.view || pollenPanelView || 'all';
        if(typeof window.openPanel === 'function') window.openPanel('🌿 Pollen', pollenForecastHtml(data, pollenPanelView, loc));
        return;
      }
      var title = '🌦️ Wetter-Ausblick';
      var sub = 'Heute · Stunden · 7 Tage · '+locationHint(loc);
      var content = weatherCurrentHtml(data) + weatherHourlyHtml(data) + weatherForecastHtml(data);
      var body = '<div class="change-forecast-panel"><div class="change-forecast-head"><div><div class="change-forecast-title">'+title+'</div><div class="change-forecast-sub">'+sub+'</div></div></div>' + content + '</div>';
      if(typeof window.openPanel === 'function') window.openPanel('Wetter', body);
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
    openPollenForecast: function(){ return openForecast('pollen', {forceRefresh:false, view:'all'}); },
    refreshForecast: refreshForecast,
    setHourlyRange: setHourlyRange,
    installDashboardHook: installDashboardHook
  };

  // ── Auto-Wetter-Refresh ───────────────────────────────────────────────
  // Nach dem Login niemals automatisch Geolocation öffnen.
  // Stündlich wird nur mit bereits vorhandenem Standort der Wetter-Cache erneuert.

  function silentWeatherRefresh(){
    if(!Store || !Store.getLocation || !Service) return;
    var loc = Store.getLocation();
    if(!loc) return;
    if(Service.needsRefresh && Service.needsRefresh()){
      Service.refresh(false).then(updateHero).catch(function(){});
    }
  }

  function installAutoRefresh(){
    setInterval(silentWeatherRefresh, 60 * 60 * 1000);
  }

  setTimeout(installDashboardHook, 0);
  setTimeout(installAutoRefresh, 500);
})();
