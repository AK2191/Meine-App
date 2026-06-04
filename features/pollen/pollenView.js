(function(){
  'use strict';

  var Store = window.ChangeWeatherStore;
  var Service = window.ChangeWeatherService;
  var POLLEN_FOCUS_KEY = 'change_v1_pollen_focus';
  var APP_VERSION = '0.1.0013';

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
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
  function diffLabel(diff){
    if(diff === 0) return 'Heute';
    if(diff === 1) return 'Morgen';
    if(diff === 2) return 'Übermorgen';
    if(diff > 0) return 'In ' + diff + ' Tagen';
    return 'Heute';
  }
  function fmtDay(date){
    try{ return dateFromKey(String(date).slice(0,10)).toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'}); }
    catch(e){ return String(date || ''); }
  }
  function fmtLongDay(date){
    try{ return dateFromKey(String(date).slice(0,10)).toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'2-digit'}); }
    catch(e){ return String(date || ''); }
  }
  function levelLabel(level){ return level === 'high' ? 'hoch' : level === 'medium' ? 'mittel' : level === 'low' ? 'niedrig' : 'keine'; }
  function levelTitle(status){ return status.key === 'high' ? 'Hoch' : status.key === 'medium' ? 'Mittel' : status.key === 'low' ? 'Niedrig' : 'Ruhig'; }
  function readFocus(){
    try{
      var list = JSON.parse(localStorage.getItem(POLLEN_FOCUS_KEY) || '[]');
      return Array.isArray(list) ? list.filter(Boolean) : [];
    }catch(e){ return []; }
  }
  function writeFocus(list){
    try{ localStorage.setItem(POLLEN_FOCUS_KEY, JSON.stringify((list || []).filter(Boolean))); }catch(e){}
  }
  function hasFocus(key){ return readFocus().indexOf(String(key || '')) >= 0; }
  function filteredItems(day){
    var items = day && Array.isArray(day.items) ? day.items.slice() : [];
    var focus = readFocus();
    if(!focus.length) return items;
    return items.filter(function(p){ return p && focus.indexOf(p.key) >= 0; });
  }
  function allActive(day){
    return filteredItems(day).filter(function(p){ return Number(p.value) > 0; }).sort(function(a,b){
      return ((b.rank || 0) - (a.rank || 0)) || ((Number(b.value) || 0) - (Number(a.value) || 0));
    });
  }
  function statusFor(day){
    var items = filteredItems(day);
    var high = items.some(function(p){ return p && p.level === 'high'; });
    var medium = items.some(function(p){ return p && p.level === 'medium'; });
    var low = items.some(function(p){ return p && p.level === 'low'; });
    if(high) return {key:'high', title:'Pollen stark'};
    if(medium) return {key:'medium', title:'Pollen mittel'};
    if(low) return {key:'low', title:'Pollen leicht'};
    return {key:'none', title:'Pollen ruhig'};
  }
  function pollenScore(day){
    var items = filteredItems(day);
    if(!items.length) return 0;
    var total = items.reduce(function(sum, p){ return sum + Math.min(100, Math.max(0, Number(p.value) || 0)); }, 0);
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
  function trendText(forecast){
    if(!forecast || forecast.length < 2) return 'Kein Trend verfügbar';
    var diff = pollenScore(forecast[1]) - pollenScore(forecast[0]);
    if(diff >= 12) return 'Morgen deutlich stärker';
    if(diff >= 4) return 'Morgen etwas stärker';
    if(diff <= -12) return 'Morgen deutlich ruhiger';
    if(diff <= -4) return 'Morgen etwas ruhiger';
    return 'Morgen ähnlich';
  }
  function pollenIcon(key){
    var map = {
      grass_pollen:'🌾', birch_pollen:'🌿', ragweed_pollen:'✳️', mugwort_pollen:'☘️', alder_pollen:'🍃', olive_pollen:'🫒'
    };
    return map[key] || '🌱';
  }
  function sublineHtml(day){
    var active = allActive(day).slice(0, 3);
    if(!active.length) return '<span class="pollen-neo-muted">keine Belastung</span>';
    return active.map(function(p){
      return '<span class="pollen-neo-word '+esc(p.level || 'none')+'">'+esc(p.name)+' '+esc(p.levelLabel || levelLabel(p.level))+'</span>';
    }).join('<span class="pollen-neo-dotsep">·</span>');
  }
  function miniBars(score, tone){
    var active = Math.max(0, Math.min(6, Math.ceil((Number(score) || 0) / 17)));
    var html = '';
    for(var i=0;i<6;i++) html += '<span class="'+(i < active ? 'on '+esc(tone || '') : '')+'"></span>';
    return html;
  }
  function trendSvg(forecast){
    var days = (forecast || []).slice(0, 6);
    if(days.length < 2) return '';
    var points = days.map(function(day, i){
      var x = 10 + i * 22;
      var y = 54 - Math.round((pollenScore(day) / 100) * 42);
      return x + ',' + y;
    }).join(' ');
    return '<svg class="pollen-neo-trend-svg" viewBox="0 0 130 64" aria-hidden="true"><polyline points="'+esc(points)+'" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="'+esc(points.split(' ')[1] ? points.split(' ')[1].split(',')[0] : 32)+'" cy="'+esc(points.split(' ')[1] ? points.split(' ')[1].split(',')[1] : 28)+'" r="5"/></svg>';
  }
  function metricCardHtml(type, label, value, sub, score, tone, extra){
    var ring = type === 'ring'
      ? '<div class="pollen-neo-ring" style="--p:'+Math.max(0, Math.min(100, Number(score) || 0))+'"><strong>'+esc(value)+'</strong><span>'+esc(sub || '')+'</span></div>'
      : (extra || '<div class="pollen-neo-metric-icon">'+esc(type || '🌿')+'</div>');
    return '<div class="pollen-neo-card pollen-neo-metric '+esc(tone || 'none')+'"><div class="pollen-neo-label">'+esc(label)+'</div>'+ring+'</div>';
  }
  function topHtml(forecast, loc){
    var today = forecast[0] || null;
    var peak = forecastPeak(forecast);
    var quiet = quietestDay(forecast);
    var status = statusFor(today);
    var score = pollenScore(today);
    var peakScore = pollenScore(peak);
    var quietScore = pollenScore(quiet);
    var nextTrend = trendText(forecast);
    var heroStatus = levelTitle(status);
    return '<section class="pollen-neo-top">'
      + '<div class="pollen-neo-hero '+esc(status.key)+'">'
        + '<div class="pollen-neo-hero-main">'
          + '<div class="pollen-neo-label">Deine Pollen heute</div>'
          + '<div class="pollen-neo-hero-title">'+esc(heroStatus)+'</div>'
          + '<div class="pollen-neo-subline">'+sublineHtml(today)+'</div>'
          + '<div class="pollen-neo-cta">↗ '+esc(nextTrend)+'</div>'
        + '</div>'
        + '<div class="pollen-neo-grass" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>'
        + '<div class="pollen-neo-hero-stats">'
          + '<div><span>🟡</span><strong>Pollenindex</strong><em>'+esc(score)+' %</em></div>'
          + '<div><span>🔺</span><strong>Peak</strong><em>'+esc(peak ? diffLabel(dayDiff(peak.date)) : '–')+'</em></div>'
          + '<div><span>🌿</span><strong>Ruhigster Tag</strong><em>'+esc(quiet ? fmtLongDay(quiet.date).split(',')[0] : '–')+'</em></div>'
        + '</div>'
      + '</div>'
      + '<div class="pollen-neo-sidecards">'
        + metricCardHtml('ring', 'Belastung heute', score+' %', heroStatus, score, status.key)
        + metricCardHtml('chart', 'Peak', peak ? diffLabel(dayDiff(peak.date)) : '–', peak ? fmtDay(peak.date) : 'kein Peak', peakScore, statusFor(peak).key, '<div class="pollen-neo-chart">'+trendSvg(forecast)+'<strong>'+esc(peak ? diffLabel(dayDiff(peak.date)) : '–')+'</strong><span>'+esc(peak ? fmtDay(peak.date) : '')+'</span></div>')
        + metricCardHtml('🌿', 'Ruhigster Tag', quiet ? fmtLongDay(quiet.date).split(',')[0] : '–', quiet ? fmtDay(quiet.date) : '', quietScore, 'none')
      + '</div>'
      + '<div class="pollen-neo-location">'+esc(loc && loc.savedAt ? 'Standort aktualisiert' : 'Standort offen')+' · v'+esc(APP_VERSION)+'</div>'
    + '</section>';
  }
  function profileHtml(today){
    var items = today && Array.isArray(today.items) ? today.items.slice() : [];
    if(!items.length) return '<div class="pollen-neo-card pollen-neo-empty">Keine Einzelwerte geladen.</div>';
    return '<section class="pollen-neo-section"><div class="pollen-neo-section-head"><div><span>Allergieprofil</span></div><button type="button" data-pollen-settings>Bearbeiten</button></div>'
      + '<div class="pollen-neo-profile-grid">'
      + items.map(function(p){
        var focus = hasFocus(p.key);
        return '<button type="button" data-pollen-focus="'+esc(p.key)+'" class="pollen-neo-profile-card '+esc(p.level || 'none')+' '+(focus ? 'active' : '')+'">'
          + '<div class="pollen-neo-profile-icon">'+esc(pollenIcon(p.key))+'</div>'
          + '<strong>'+esc(p.name)+'</strong>'
          + '<span>'+esc(p.levelLabel || levelLabel(p.level))+'</span>'
          + '<em>'+esc(p.value)+'</em>'
        + '</button>';
      }).join('')
      + '</div></section>';
  }
  function forecastRow(day){
    var st = statusFor(day);
    var diff = dayDiff(day.date);
    var score = pollenScore(day);
    var top = allActive(day).slice(0, 3);
    var txt = top.length ? top.map(function(p){ return p.name + ' ' + (p.levelLabel || levelLabel(p.level)); }).join(', ') : 'keine Belastung';
    return '<div class="pollen-neo-forecast-row '+esc(st.key)+'">'
      + '<div class="pollen-neo-forecast-dot"></div>'
      + '<div class="pollen-neo-forecast-date"><strong>'+esc(fmtDay(day.date))+'</strong><span>'+esc(diffLabel(diff))+'</span></div>'
      + '<div class="pollen-neo-forecast-main"><strong>'+esc(st.title)+' · '+esc(score)+'%</strong><span>'+esc(txt)+'</span></div>'
      + '<div class="pollen-neo-bars">'+miniBars(score, st.key)+'</div>'
    + '</div>';
  }
  function forecastHtml(forecast){
    return '<section class="pollen-neo-section pollen-neo-forecast"><div class="pollen-neo-section-head"><div><span>7-Tage-Ausblick</span></div><button type="button" data-pollen-settings>Andere Art wählen⌄</button></div>'
      + '<div class="pollen-neo-forecast-list">'+forecast.slice(0, 7).map(forecastRow).join('')+'</div></section>';
  }
  function pageHtml(data, loc){
    var forecast = data && data.pollen && data.pollen.forecast || [];
    if(!forecast.length){
      return '<div class="pollen-neo-shell"><div class="pollen-neo-card pollen-neo-empty"><strong>Noch kein Pollen-Ausblick geladen.</strong><span>Aktualisiere den Standort, um die Ansicht aufzubauen.</span><button class="btn btn-primary" type="button" onclick="ChangeWeatherCard&&ChangeWeatherCard.updateLocation&&ChangeWeatherCard.updateLocation()">Standort aktualisieren</button></div></div>';
    }
    var today = forecast[0];
    return '<div class="pollen-neo-shell">'
      + topHtml(forecast, loc)
      + '<div class="pollen-neo-main-grid">'
        + '<div class="pollen-neo-left">'
          + profileHtml(today)
          + (window.ChangePollenSymptoms && window.ChangePollenSymptoms.panelHtml ? '<section class="pollen-neo-section pollen-neo-symptoms">'+window.ChangePollenSymptoms.panelHtml(todayKey(), forecast)+'</section>' : '')
        + '</div>'
        + forecastHtml(forecast)
      + '</div>'
    + '</div>';
  }
  async function getData(){
    if(Service && Service.ensureFresh) return Service.ensureFresh();
    if(Service && Service.getCached) return Service.getCached();
    return null;
  }
  async function render(){
    var body = document.getElementById('pollen-view-body');
    if(!body) return;
    body.innerHTML = '<div class="pollen-neo-shell"><div class="pollen-neo-card pollen-neo-empty">Pollen werden geladen…</div></div>';
    try{
      Store = window.ChangeWeatherStore;
      Service = window.ChangeWeatherService;
      if(Store && Store.writeSettings){
        var s = Store.settings ? Store.settings() : {};
        if(!(s.pollenEnabled || s.pollenAlertsEnabled)) Store.writeSettings({pollenEnabled:true});
      }
      var loc = Store && Store.getLocation ? Store.getLocation() : null;
      if(!loc){
        body.innerHTML = '<div class="pollen-neo-shell"><div class="pollen-neo-card pollen-neo-empty"><strong>Standort fehlt</strong><span>Für den Pollen-Ausblick braucht Change einmalig deinen Standort.</span><button class="btn btn-primary" type="button" onclick="ChangeWeatherCard&&ChangeWeatherCard.updateLocation&&ChangeWeatherCard.updateLocation()">Standort aktualisieren</button></div></div>';
        return;
      }
      var data = await getData();
      loc = Store && Store.getLocation ? Store.getLocation() : loc;
      if(window.ChangeWeatherCard && typeof window.ChangeWeatherCard.update === 'function') window.ChangeWeatherCard.update();
      body.innerHTML = pageHtml(data, loc);
    }catch(e){
      body.innerHTML = '<div class="pollen-neo-shell"><div class="pollen-neo-card pollen-neo-empty"><strong>Pollen konnten nicht geladen werden.</strong><span>'+esc(e.message || e || 'Bitte später erneut versuchen.')+'</span></div></div>';
    }
  }
  function toggleFocus(key){
    key = String(key || '');
    if(!key) return;
    var list = readFocus();
    var index = list.indexOf(key);
    if(index >= 0) list.splice(index, 1); else list.push(key);
    writeFocus(list);
    render();
    if(window.ChangeWeatherCard && typeof window.ChangeWeatherCard.update === 'function') window.ChangeWeatherCard.update();
  }
  function bind(){
    if(window.__changePollenNeoBound) return;
    window.__changePollenNeoBound = true;
    document.addEventListener('click', function(ev){
      var focusBtn = ev.target && ev.target.closest ? ev.target.closest('#pollen-view [data-pollen-focus]') : null;
      if(focusBtn){ ev.preventDefault(); toggleFocus(focusBtn.getAttribute('data-pollen-focus')); return; }
      var settingsBtn = ev.target && ev.target.closest ? ev.target.closest('#pollen-view [data-pollen-settings]') : null;
      if(settingsBtn){ ev.preventDefault(); if(window.openSettingsPanel) window.openSettingsPanel('dashboard'); }
    });
  }

  window.renderPollenView = render;
  window.ChangePollenView = { render: render, version: APP_VERSION };

  document.addEventListener('DOMContentLoaded', function(){
    bind();
    if((location.hash || '').replace('#/','').replace('#','') === 'pollen') setTimeout(render, 120);
  });
})();
