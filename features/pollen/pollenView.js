(function(){
  'use strict';

  var Store = window.ChangeWeatherStore;
  var Service = window.ChangeWeatherService;
  var APP_VERSION = '0.1.0014';

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
  function itemsOf(day){ return day && Array.isArray(day.items) ? day.items.slice() : []; }
  function activeItems(day){
    return itemsOf(day).filter(function(p){ return Number(p.value) > 0; }).sort(function(a,b){
      return ((b.rank || 0) - (a.rank || 0)) || ((Number(b.value) || 0) - (Number(a.value) || 0));
    });
  }
  function statusFor(day){
    var items = itemsOf(day);
    var high = items.some(function(p){ return p && p.level === 'high'; });
    var medium = items.some(function(p){ return p && p.level === 'medium'; });
    var low = items.some(function(p){ return p && p.level === 'low'; });
    if(high) return {key:'high', title:'Pollen stark'};
    if(medium) return {key:'medium', title:'Pollen mittel'};
    if(low) return {key:'low', title:'Pollen leicht'};
    return {key:'none', title:'Pollen ruhig'};
  }
  function pollenScore(day){
    var items = itemsOf(day);
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
    if(!forecast || forecast.length < 2) return 'Morgen ähnlich';
    var diff = pollenScore(forecast[1]) - pollenScore(forecast[0]);
    if(diff >= 12) return 'Morgen deutlich stärker';
    if(diff >= 4) return 'Morgen etwas stärker';
    if(diff <= -12) return 'Morgen deutlich ruhiger';
    if(diff <= -4) return 'Morgen etwas ruhiger';
    return 'Morgen ähnlich';
  }
  function strongestLabel(day){
    var top = activeItems(day).slice(0, 2);
    if(!top.length) return 'keine Belastung';
    return top.map(function(p){ return p.name + ' ' + (p.levelLabel || levelLabel(p.level)); }).join(' · ');
  }
  function sublineHtml(day){
    var active = activeItems(day).slice(0, 2);
    if(!active.length) return '<span class="pollen-neo-muted">Keine Belastung</span>';
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
    var pts = days.map(function(day, i){
      var x = 12 + i * 20;
      var y = 52 - Math.round((pollenScore(day) / 100) * 34);
      return {x:x,y:y};
    });
    var poly = pts.map(function(p){ return p.x + ',' + p.y; }).join(' ');
    var peakIndex = 0;
    pts.forEach(function(p, i){ if(p.y < pts[peakIndex].y) peakIndex = i; });
    return '<svg class="pollen-neo-trend-svg" viewBox="0 0 120 60" aria-hidden="true">'
      + '<polyline points="'+esc(poly)+'" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="'+pts[peakIndex].x+'" cy="'+pts[peakIndex].y+'" r="5.5"/></svg>';
  }
  function glyphSvg(key){
    var map = {
      grass_pollen:'<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M24 40V18"/><path d="M24 28c-3-9-8-15-8-15"/><path d="M24 25c4-10 9-16 9-16"/><path d="M24 21c-7-6-14-9-14-9"/><path d="M24 18c6-5 13-8 13-8"/></g></svg>',
      birch_pollen:'<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 39V13"/><path d="M24 19c-5 0-9-4-9-9 5 0 9 4 9 9Z" fill="currentColor" fill-opacity=".12"/><path d="M24 25c5 0 9-4 9-9-5 0-9 4-9 9Z" fill="currentColor" fill-opacity=".18"/><path d="M24 29c-6 0-10-4-10-9 6 0 10 4 10 9Z" fill="currentColor" fill-opacity=".12"/></g></svg>',
      ragweed_pollen:'<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 39V15"/><path d="M24 15c0-4 3-7 7-7-1 4-3 7-7 7Z"/><path d="M24 19c0-4-3-7-7-7 1 4 3 7 7 7Z"/><path d="M24 23c4 0 7 3 7 7-4-1-7-3-7-7Z"/><path d="M24 27c-4 0-7 3-7 7 4-1 7-3 7-7Z"/></g></svg>',
      mugwort_pollen:'<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 40V13"/><path d="M24 19c-4-6-10-7-10-7 1 5 5 9 10 9"/><path d="M24 24c5-5 10-6 10-6-1 5-5 8-10 8"/><path d="M24 29c-4-5-8-6-8-6 1 4 4 7 8 7"/><path d="M24 33c4-4 8-5 8-5-1 4-4 6-8 6"/></g></svg>',
      alder_pollen:'<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 39V13"/><path d="M16 17c0 4 4 7 8 7 0-4-4-7-8-7Z"/><path d="M32 20c0 4-4 7-8 7 0-4 4-7 8-7Z"/><path d="M18 28c0 3 3 5 6 5 0-3-3-5-6-5Z"/><path d="M30 30c0 3-3 5-6 5 0-3 3-5 6-5Z"/></g></svg>',
      olive_pollen:'<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 39V16"/><path d="M24 21c-6 0-10-4-10-9 6 0 10 4 10 9Z"/><path d="M24 25c6 0 10-4 10-9-6 0-10 4-10 9Z"/><ellipse cx="31" cy="15" rx="4.5" ry="5.5" fill="currentColor" fill-opacity=".18"/></g></svg>'
    };
    return '<span class="pollen-neo-icon-svg">'+(map[key] || map.birch_pollen)+'</span>';
  }
  function heroArtSvg(){
    return '<svg class="pollen-neo-hero-illustration" viewBox="0 0 220 220" aria-hidden="true">'
      + '<defs><linearGradient id="blade" x1="0" x2="0" y1="1" y2="0"><stop offset="0" stop-color="rgba(84,142,52,.02)"/><stop offset="1" stop-color="#96d637"/></linearGradient></defs>'
      + '<g fill="none" stroke="url(#blade)" stroke-width="8" stroke-linecap="round">'
      + '<path d="M110 186C96 128 66 72 66 72"/><path d="M110 186C112 118 122 46 122 46"/><path d="M110 186C132 132 168 86 168 86"/><path d="M110 186C94 140 86 94 90 58"/><path d="M110 186C140 150 152 116 156 70"/><path d="M110 186C82 156 56 122 42 98"/>'
      + '</g><circle cx="110" cy="186" r="12" fill="rgba(150,214,55,.14)"/></svg>';
  }
  function metricCardHtml(type, label, value, sub, score, tone, body){
    var inner = body;
    if(!inner && type === 'ring') inner = '<div class="pollen-neo-ring" style="--p:'+Math.max(0, Math.min(100, Number(score) || 0))+'"><strong>'+esc(value)+'</strong><span>'+esc(sub || '')+'</span></div>';
    if(!inner) inner = '<div class="pollen-neo-metric-icon">'+esc(type || '🌿')+'</div>';
    return '<div class="pollen-neo-card pollen-neo-metric '+esc(tone || 'none')+'"><div class="pollen-neo-label">'+esc(label)+'</div>'+inner+'</div>';
  }
  function topHtml(forecast, loc){
    var today = forecast[0] || null;
    var peak = forecastPeak(forecast);
    var quiet = quietestDay(forecast);
    var status = statusFor(today);
    var score = pollenScore(today);
    var nextTrend = trendText(forecast);
    return '<section class="pollen-neo-top">'
      + '<div class="pollen-neo-hero '+esc(status.key)+'">'
        + '<div class="pollen-neo-hero-main">'
          + '<div class="pollen-neo-label">Deine Pollen heute</div>'
          + '<div class="pollen-neo-hero-title">'+esc(levelTitle(status))+'</div>'
          + '<div class="pollen-neo-subline">'+sublineHtml(today)+'</div>'
          + '<div class="pollen-neo-cta">↗ '+esc(nextTrend)+'</div>'
        + '</div>'
        + heroArtSvg()
        + '<div class="pollen-neo-hero-stats">'
          + '<div><span>●</span><strong>Pollenindex</strong><em>'+esc(score)+' %</em></div>'
          + '<div><span>▲</span><strong>Peak</strong><em>'+esc(peak ? diffLabel(dayDiff(peak.date)) : '–')+'</em></div>'
          + '<div><span>❋</span><strong>Ruhigster Tag</strong><em>'+esc(quiet ? fmtLongDay(quiet.date).split(',')[0] : '–')+'</em></div>'
        + '</div>'
      + '</div>'
      + '<div class="pollen-neo-sidecards">'
        + metricCardHtml('ring', 'Belastung heute', score+' %', levelTitle(status), score, status.key)
        + metricCardHtml('chart', 'Peak', peak ? diffLabel(dayDiff(peak.date)) : '–', peak ? fmtDay(peak.date) : '', peak ? pollenScore(peak) : 0, statusFor(peak).key, '<div class="pollen-neo-chart">'+trendSvg(forecast)+'<strong>'+esc(peak ? diffLabel(dayDiff(peak.date)) : '–')+'</strong><span>'+esc(peak ? fmtDay(peak.date) : 'kein Peak erkannt')+'</span></div>')
        + metricCardHtml('', 'Ruhigster Tag', quiet ? fmtLongDay(quiet.date).split(',')[0] : '–', quiet ? fmtDay(quiet.date) : '', quiet ? pollenScore(quiet) : 0, 'none', '<div class="pollen-neo-quiet-card">'+glyphSvg('birch_pollen')+'<strong>'+esc(quiet ? fmtLongDay(quiet.date).split(',')[0] : '–')+'</strong><span>'+esc(quiet ? fmtDay(quiet.date) : 'kein ruhiger Tag erkannt')+'</span></div>')
      + '</div>'
      + '<div class="pollen-neo-location">'+esc(loc && loc.savedAt ? 'Standort aktualisiert' : 'Standort offen')+' · v'+esc(APP_VERSION)+'</div>'
    + '</section>';
  }
  function profileHtml(today){
    var items = itemsOf(today);
    if(!items.length) return '<div class="pollen-neo-card pollen-neo-empty">Keine Einzelwerte geladen.</div>';
    return '<section class="pollen-neo-section"><div class="pollen-neo-section-head"><div><span>Allergieprofil</span></div><button type="button" data-pollen-settings>Bearbeiten</button></div>'
      + '<div class="pollen-neo-profile-grid">'
      + items.map(function(p){
        return '<div class="pollen-neo-profile-card '+esc(p.level || 'none')+'">'
          + glyphSvg(p.key)
          + '<strong>'+esc(p.name)+'</strong>'
          + '<span>'+esc(p.levelLabel || levelLabel(p.level))+'</span>'
          + '<em>'+esc(p.value)+'</em>'
        + '</div>';
      }).join('')
      + '</div></section>';
  }
  function forecastTitle(today){
    var focus = activeItems(today)[0];
    return '7-Tage-Ausblick' + (focus ? ' – ' + focus.name.toUpperCase() : '');
  }
  function forecastRow(day){
    var st = statusFor(day);
    var diff = dayDiff(day.date);
    var score = pollenScore(day);
    return '<div class="pollen-neo-forecast-row '+esc(st.key)+'">'
      + '<div class="pollen-neo-forecast-dot"></div>'
      + '<div class="pollen-neo-forecast-date"><strong>'+esc(fmtDay(day.date))+'</strong><span>'+esc(diffLabel(diff))+'</span></div>'
      + '<div class="pollen-neo-forecast-main"><strong>'+esc(st.title)+' · '+esc(score)+'%</strong><span>'+esc(strongestLabel(day))+'</span></div>'
      + '<div class="pollen-neo-bars">'+miniBars(score, st.key)+'</div>'
    + '</div>';
  }
  function forecastHtml(forecast){
    var today = forecast[0] || null;
    return '<section class="pollen-neo-section pollen-neo-forecast"><div class="pollen-neo-section-head"><div><span>'+esc(forecastTitle(today))+'</span></div><button type="button" data-pollen-settings>Andere Art wählen⌄</button></div>'
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
  function bind(){
    if(window.__changePollenNeoBound) return;
    window.__changePollenNeoBound = true;
    document.addEventListener('click', function(ev){
      var settingsBtn = ev.target && ev.target.closest ? ev.target.closest('#pollen-view [data-pollen-settings]') : null;
      if(settingsBtn){
        ev.preventDefault();
        ev.stopPropagation();
        if(window.openSettingsPanel) window.openSettingsPanel('dashboard');
      }
      var profileCard = ev.target && ev.target.closest ? ev.target.closest('#pollen-view .pollen-neo-profile-card') : null;
      if(profileCard){
        ev.preventDefault();
        ev.stopPropagation();
      }
    }, true);
  }

  window.renderPollenView = render;
  window.ChangePollenView = { render: render, version: APP_VERSION };

  document.addEventListener('DOMContentLoaded', function(){
    bind();
    if((location.hash || '').replace('#/','').replace('#','') === 'pollen') setTimeout(render, 120);
  });
})();
