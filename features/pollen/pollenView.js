(function(){
  'use strict';

  var Store = window.ChangeWeatherStore;
  var Service = window.ChangeWeatherService;
  var APP_VERSION = '0.1.0015';
  var FOCUS_KEY = 'change_v1_pollen_focus_key';
  var EDIT_KEY = 'change_v1_pollen_edit_mode';

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
  function fmtDay(date){
    try{ return dateFromKey(String(date).slice(0,10)).toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'}); }
    catch(e){ return String(date || ''); }
  }
  function fmtLongDay(date){
    try{ return dateFromKey(String(date).slice(0,10)).toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'2-digit'}); }
    catch(e){ return String(date || ''); }
  }
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
  function clampNum(value){ return Math.max(0, Math.min(100, Number(value) || 0)); }
  function itemsOf(day){ return day && Array.isArray(day.items) ? day.items.slice() : []; }
  function itemByKey(day, key){
    return itemsOf(day).find(function(p){ return String(p && p.key) === String(key || ''); }) || null;
  }
  function activeItems(day){
    return itemsOf(day).filter(function(p){ return clampNum(p && p.value) > 0; }).sort(function(a,b){
      return ((b.rank || 0) - (a.rank || 0)) || (clampNum(b.value) - clampNum(a.value));
    });
  }
  function overallSubline(day){
    var active = activeItems(day).slice(0, 2);
    if(!active.length) return '<span class="pollen-neo-muted">Keine Belastung</span>';
    return active.map(function(p){
      return '<span class="pollen-neo-word '+esc(p.level || 'none')+'">'+esc(p.name)+' '+esc(levelLabel(p.level))+'</span>';
    }).join('<span class="pollen-neo-dotsep">·</span>');
  }
  function levelLabel(level){ return level === 'high' ? 'hoch' : level === 'medium' ? 'mittel' : level === 'low' ? 'niedrig' : 'keine'; }
  function intensityTitle(level){ return level === 'high' ? 'Hoch' : level === 'medium' ? 'Mittel' : level === 'low' ? 'Niedrig' : 'Ruhig'; }
  function selectedStatus(item){
    var level = item && item.level || 'none';
    return {
      key: level,
      title: level === 'high' ? 'Pollen stark' : level === 'medium' ? 'Pollen mittel' : level === 'low' ? 'Pollen leicht' : 'Pollen ruhig',
      score: Math.round(clampNum(item && item.value))
    };
  }
  function readFocus(){
    try{ return String(localStorage.getItem(FOCUS_KEY) || '').trim(); }catch(e){ return ''; }
  }
  function writeFocus(key){
    try{ localStorage.setItem(FOCUS_KEY, String(key || '')); }catch(e){}
  }
  function readEditMode(){
    try{ return String(localStorage.getItem(EDIT_KEY) || '').trim(); }catch(e){ return ''; }
  }
  function writeEditMode(value){
    try{ localStorage.setItem(EDIT_KEY, String(value || '')); }catch(e){}
  }
  function resolveFocus(today){
    var items = itemsOf(today);
    if(!items.length) return '';
    var saved = readFocus();
    if(saved && items.some(function(p){ return String(p.key) === saved; })) return saved;
    var top = activeItems(today)[0] || items[0];
    return top ? String(top.key || '') : '';
  }
  function selectedForecast(forecast, key){
    return (forecast || []).map(function(day){
      var item = itemByKey(day, key);
      var state = selectedStatus(item);
      return {
        date: day.date,
        item: item,
        key: key,
        name: item && item.name || '',
        level: state.key,
        title: state.title,
        score: state.score
      };
    });
  }
  function forecastPeak(days){
    if(!days || !days.length) return null;
    return days.slice().sort(function(a,b){ return (b.score || 0) - (a.score || 0); })[0] || null;
  }
  function quietestDay(days){
    if(!days || !days.length) return null;
    return days.slice().sort(function(a,b){ return (a.score || 0) - (b.score || 0); })[0] || null;
  }
  function trendText(days){
    if(!days || days.length < 2) return 'Morgen ähnlich';
    var diff = Number(days[1].score || 0) - Number(days[0].score || 0);
    if(diff >= 12) return 'Morgen deutlich stärker';
    if(diff >= 4) return 'Morgen etwas stärker';
    if(diff <= -12) return 'Morgen deutlich ruhiger';
    if(diff <= -4) return 'Morgen etwas ruhiger';
    return 'Morgen ähnlich';
  }
  function miniBars(score, tone){
    var active = Math.max(0, Math.min(6, Math.ceil((Number(score) || 0) / 17)));
    var html = '';
    for(var i=0;i<6;i++) html += '<span class="'+(i < active ? 'on '+esc(tone || 'none') : '')+'"></span>';
    return html;
  }
  function trendSvg(days){
    var list = (days || []).slice(0, 6);
    if(list.length < 2) return '';
    var pts = list.map(function(day, i){
      return {x: 12 + i * 19, y: 52 - Math.round((Number(day.score || 0) / 100) * 34)};
    });
    var peakIndex = 0;
    pts.forEach(function(p, i){ if(p.y < pts[peakIndex].y) peakIndex = i; });
    return '<svg class="pollen-neo-trend-svg" viewBox="0 0 118 60" aria-hidden="true">'
      + '<polyline points="'+pts.map(function(p){ return p.x + ',' + p.y; }).join(' ')+'" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"></polyline>'
      + '<circle cx="'+pts[peakIndex].x+'" cy="'+pts[peakIndex].y+'" r="5.2"></circle>'
      + '</svg>';
  }
  function glyphSvg(kind){
    var map = {
      grass_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V9"/><path d="M12 14.2c-1.8-4.3-4-6.8-4-6.8"/><path d="M12 14.4c1.8-4.5 4-7 4-7"/><path d="M12 11.3c-1.2-2.2-2.7-3.6-2.7-3.6"/><path d="M12 11.4c1.2-2.3 2.8-3.8 2.8-3.8"/></g></svg></span>',
      birch_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8"/><path d="M12 12c-3.2 0-5.2-2.2-5.2-5.2 3.1 0 5.2 2.1 5.2 5.2Z" fill="currentColor" fill-opacity=".16"/><path d="M12 15.7c3.3 0 5.4-2.4 5.4-5.6-3.3 0-5.4 2.3-5.4 5.6Z" fill="currentColor" fill-opacity=".24"/></g></svg></span>',
      ragweed_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8"/><path d="M12 9.2c0-2.1 1.7-3.7 3.8-3.7-.4 2.3-1.8 3.7-3.8 3.7Z"/><path d="M12 12c-2.1 0-3.8-1.7-3.8-3.8 2.2.4 3.8 1.7 3.8 3.8Z"/><path d="M12 14.3c2.1 0 3.8 1.7 3.8 3.8-2.2-.4-3.8-1.7-3.8-3.8Z"/><path d="M12 16.4c-2.1 0-3.8 1.7-3.8 3.8 2.2-.4 3.8-1.7 3.8-3.8Z"/></g></svg></span>',
      mugwort_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8"/><path d="M12 10.8C9.9 7.7 7.5 7 7.5 7c.5 2.1 1.9 3.7 4.5 3.8"/><path d="M12 13.1c2.4-2.7 4.8-3.3 4.8-3.3-.4 2.1-1.9 3.5-4.8 3.6"/><path d="M12 15.4c-1.8-2.1-3.5-2.5-3.5-2.5.4 1.5 1.5 2.8 3.5 2.8"/><path d="M12 17.4c1.8-1.8 3.6-2.2 3.6-2.2-.4 1.5-1.5 2.6-3.6 2.6"/></g></svg></span>',
      alder_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8"/><path d="M9 9.7c0 2 1.3 3.5 3 3.5 0-2-1.3-3.5-3-3.5Z"/><path d="M15 11.2c0 2-1.3 3.5-3 3.5 0-2 1.3-3.5 3-3.5Z"/><path d="M9.8 15.1c0 1.4.9 2.5 2.2 2.5 0-1.4-.9-2.5-2.2-2.5Z"/><path d="M14.2 16c0 1.4-.9 2.5-2.2 2.5 0-1.4.9-2.5 2.2-2.5Z"/></g></svg></span>',
      olive_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8"/><path d="M12 11.2c-3 0-5.1-2.1-5.1-5.1 3 0 5.1 2.1 5.1 5.1Z"/><path d="M12 14.4c3 0 5.1-2.1 5.1-5.1-3 0-5.1 2.1-5.1 5.1Z"/><circle cx="16.2" cy="7.3" r="1.5" fill="currentColor" fill-opacity=".25" stroke="none"/></g></svg></span>',
      leaf:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4.8C11.8 5.2 6.7 10 6.7 16.1c0 1.9.5 3.1 1.5 3.8 1 .6 2.2.7 3.7.2 4.6-1.6 7.1-6.4 7.1-15 0-.2 0-.3-.1-.3Z" fill="currentColor"/><path d="M9.2 18.6c1.7-2.7 4-4.9 6.8-6.5" fill="none" stroke="#102313" stroke-width="1.3" stroke-linecap="round"/></svg></span>'
    };
    return map[kind] || map.leaf;
  }
  function heroArtSvg(){
    return '<svg class="pollen-neo-hero-illustration" viewBox="0 0 220 220" aria-hidden="true">'
      + '<defs><linearGradient id="pollen-blade" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#29431d"></stop><stop offset="1" stop-color="#80b53b"></stop></linearGradient></defs>'
      + '<g fill="none" stroke="url(#pollen-blade)" stroke-width="7" stroke-linecap="round">'
      + '<path d="M110 188C98 134 70 86 70 86"></path><path d="M110 188C112 122 120 54 123 54"></path><path d="M110 188C126 140 162 96 162 96"></path><path d="M110 188C95 150 88 114 90 75"></path><path d="M110 188C140 154 151 124 154 85"></path><path d="M110 188C83 160 58 129 44 110"></path>'
      + '</g></svg>';
  }
  function metricCardHtml(type, label, body, tone){
    return '<div class="pollen-neo-card pollen-neo-metric '+esc(tone || 'none')+'"><div class="pollen-neo-label">'+esc(label)+'</div>'+body+'</div>';
  }
  function topHtml(forecast, selectedKey, loc){
    var today = forecast[0] || {};
    var selected = selectedForecast(forecast, selectedKey);
    var todaySelected = selected[0] || {score:0, level:'none', title:'Pollen ruhig'};
    var peak = forecastPeak(selected);
    var quiet = quietestDay(selected);
    var selectedItem = itemByKey(today, selectedKey) || {key:selectedKey, name:'Pollen', level:'none', value:0};
    var nextTrend = trendText(selected);
    var score = Math.round(todaySelected.score || 0);
    var intensity = intensityTitle(todaySelected.level);
    var peakTone = peak ? peak.level : 'none';
    return '<section class="pollen-neo-top">'
      + '<div class="pollen-neo-hero '+esc(todaySelected.level)+'">'
        + '<div class="pollen-neo-hero-main">'
          + '<div class="pollen-neo-label">Deine Pollen heute</div>'
          + '<div class="pollen-neo-hero-title">'+esc(intensity)+'</div>'
          + '<div class="pollen-neo-subline">'+overallSubline(today)+'</div>'
          + '<div class="pollen-neo-cta">↗ '+esc(nextTrend)+'</div>'
        + '</div>'
        + heroArtSvg()
        + '<div class="pollen-neo-hero-stats">'
          + '<div><span class="dot yellow"></span><strong>'+esc(selectedItem.name)+' stark</strong><em>'+esc(score)+' %</em></div>'
          + '<div><span class="mark peak"></span><strong>Peak</strong><em>'+esc(peak ? diffLabel(dayDiff(peak.date)) : '–')+'</em></div>'
          + '<div><span class="mark leaf"></span><strong>Ruhigster Tag</strong><em>'+esc(quiet ? fmtLongDay(quiet.date).split(',')[0] : '–')+'</em></div>'
        + '</div>'
      + '</div>'
      + '<div class="pollen-neo-sidecards">'
        + metricCardHtml('ring', 'Belastung heute', '<div class="pollen-neo-ring '+esc(todaySelected.level)+'" style="--p:'+score+'"><div class="pollen-neo-ring-center"><strong>'+esc(score)+' %</strong><span>'+esc(intensity)+'</span></div></div><div class="pollen-neo-metric-foot">Pollenindex</div>', todaySelected.level)
        + metricCardHtml('peak', 'Peak', '<div class="pollen-neo-chart '+esc(peakTone)+'">'+trendSvg(selected)+'<strong>'+esc(peak ? diffLabel(dayDiff(peak.date)) : '–')+'</strong><span>'+esc(peak ? fmtLongDay(peak.date) : 'Kein Peak erkannt')+'</span><div class="pollen-neo-link">Mehr dazu →</div></div>', peakTone)
        + metricCardHtml('quiet', 'Ruhigster Tag', '<div class="pollen-neo-quiet-card">'+glyphSvg('leaf')+'<strong>'+esc(quiet ? fmtLongDay(quiet.date).split(',')[0] : '–')+'</strong><span>'+esc(quiet ? fmtDay(quiet.date).replace('.', '') : '')+'</span><div class="pollen-neo-link">Mehr dazu →</div></div>', 'none')
      + '</div>'
    + '</section>';
  }
  function profileHtml(today, selectedKey){
    var items = itemsOf(today);
    if(!items.length) return '<div class="pollen-neo-card pollen-neo-empty">Keine Einzelwerte geladen.</div>';
    return '<section class="pollen-neo-section">'
      + '<div class="pollen-neo-section-head"><div><span>Allergieprofil</span></div></div>'
      + '<div class="pollen-neo-profile-grid">'
      + items.map(function(p){
        return '<button type="button" class="pollen-neo-profile-card '+esc(p.level || 'none')+' '+(String(selectedKey)===String(p.key)?'active':'')+'" data-pollen-select="'+esc(p.key)+'">'
          + glyphSvg(p.key)
          + '<strong>'+esc(p.name)+'</strong>'
          + '<span>'+esc(levelLabel(p.level))+'</span>'
          + '<em>'+esc(Number(p.value || 0))+'</em>'
        + '</button>';
      }).join('')
      + '</div>'
    + '</section>';
  }
  function forecastRow(day){
    return '<div class="pollen-neo-forecast-row '+esc(day.level || 'none')+'">'
      + '<div class="pollen-neo-forecast-dot"></div>'
      + '<div class="pollen-neo-forecast-date"><strong>'+esc(fmtDay(day.date))+'</strong><span>'+esc(diffLabel(dayDiff(day.date)))+'</span></div>'
      + '<div class="pollen-neo-forecast-main"><strong>'+esc(day.title)+' · '+esc(day.score)+'%</strong><span>'+esc(day.item ? day.item.name + ' ' + levelLabel(day.item.level) : 'keine Belastung')+'</span></div>'
      + '<div class="pollen-neo-bars">'+miniBars(day.score, day.level)+'</div>'
    + '</div>';
  }
  function forecastHtml(forecast, selectedKey){
    var today = forecast[0] || {};
    var currentItem = itemByKey(today, selectedKey) || {name:'Pollen'};
    var list = selectedForecast(forecast, selectedKey);
    return '<section class="pollen-neo-section pollen-neo-forecast">'
      + '<div class="pollen-neo-section-head"><div><span>7-Tage-Ausblick – '+esc(String((currentItem.name || 'Pollen')).toUpperCase())+'</span></div></div>'
      + '<div class="pollen-neo-forecast-list">'+list.slice(0,7).map(forecastRow).join('')+'</div>'
    + '</section>';
  }
  function pageHtml(data, loc){
    var forecast = data && data.pollen && data.pollen.forecast || [];
    if(!forecast.length){
      return '<div class="pollen-neo-shell"><div class="pollen-neo-card pollen-neo-empty"><strong>Noch kein Pollen-Ausblick geladen.</strong><span>Aktualisiere den Standort, um die Ansicht aufzubauen.</span><button class="btn btn-primary" type="button" onclick="ChangeWeatherCard&&ChangeWeatherCard.updateLocation&&ChangeWeatherCard.updateLocation()">Standort aktualisieren</button></div></div>';
    }
    var today = forecast[0];
    var selectedKey = resolveFocus(today);
    writeFocus(selectedKey);
    return '<div class="pollen-neo-shell">'
      + topHtml(forecast, selectedKey, loc)
      + '<div class="pollen-neo-main-grid">'
        + '<div class="pollen-neo-left">'
          + profileHtml(today, selectedKey)
          + (window.ChangePollenSymptoms && window.ChangePollenSymptoms.panelHtml ? '<section class="pollen-neo-section pollen-neo-symptoms">'+window.ChangePollenSymptoms.panelHtml(todayKey(), forecast)+'</section>' : '')
        + '</div>'
        + forecastHtml(forecast, selectedKey)
      + '</div>'
    + '</div>';
  }
  function ensureHeaderChrome(){
    var view = document.getElementById('pollen-view');
    if(!view) return;
    var header = view.querySelector('.list-header');
    if(!header) return;
    header.classList.add('pollen-neo-headerbar');
    if(!header.querySelector('.pollen-neo-header-settings')){
      var action = document.createElement('button');
      action.type = 'button';
      action.className = 'pollen-neo-header-settings';
      action.setAttribute('data-pollen-settings','');
      action.innerHTML = '<span class="pollen-neo-header-settings-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Zm9 3-.13-.03-1.78-.7a7.15 7.15 0 0 0-.53-1.27l.76-1.74a.9.9 0 0 0-.19-.98l-1.66-1.66a.9.9 0 0 0-.98-.19l-1.74.76c-.4-.21-.83-.39-1.27-.53L12.43 3.1a.9.9 0 0 0-.84-.6h-2.18a.9.9 0 0 0-.84.6l-.68 1.74c-.44.14-.87.32-1.27.53l-1.74-.76a.9.9 0 0 0-.98.19L2.24 6.46a.9.9 0 0 0-.19.98l.76 1.74c-.21.4-.39.83-.53 1.27l-1.74.68a.9.9 0 0 0-.6.84v2.18c0 .38.23.72.6.84l1.74.68c.14.44.32.87.53 1.27l-.76 1.74a.9.9 0 0 0 .19.98l1.66 1.66c.27.27.68.35.98.19l1.74-.76c.4.21.83.39 1.27.53l.68 1.74c.13.36.47.6.84.6h2.18c.37 0 .71-.24.84-.6l.68-1.74c.44-.14.87-.32 1.27-.53l1.74.76c.3.16.71.08.98-.19l1.66-1.66a.9.9 0 0 0 .19-.98l-.76-1.74c.21-.4.39-.83.53-1.27l1.78-.7.13-.03a.9.9 0 0 0 .6-.84v-2.18a.9.9 0 0 0-.6-.84Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path></svg></span><span>Pollen-Settings</span>';
      header.appendChild(action);
    }
  }
  function setShellMode(active){ return !!active; }
  function patchViewSwitcher(){ return; }
  async function getData(){
    if(Service && Service.ensureFresh) return Service.ensureFresh();
    if(Service && Service.getCached) return Service.getCached();
    return null;
  }
  async function render(){
    ensureHeaderChrome();
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
      var mode = readEditMode();
      body.classList.toggle('pollen-edit-active', mode === 'profile' || mode === 'symptoms');
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
        if(window.openSettingsPanel) window.openSettingsPanel('app');
        return;
      }
      var pick = ev.target && ev.target.closest ? ev.target.closest('#pollen-view [data-pollen-select]') : null;
      if(pick){
        ev.preventDefault();
        ev.stopPropagation();
        writeFocus(pick.getAttribute('data-pollen-select') || '');
        render();
        return;
      }
      var edit = ev.target && ev.target.closest ? ev.target.closest('#pollen-view [data-pollen-edit]') : null;
      if(edit){
        ev.preventDefault();
        ev.stopPropagation();
        var mode = edit.getAttribute('data-pollen-edit') || '';
        writeEditMode(readEditMode() === mode ? '' : mode);
        render();
      }
    }, true);
  }

  window.renderPollenView = render;
  window.ChangePollenView = { render: render, version: APP_VERSION };

  document.addEventListener('DOMContentLoaded', function(){
    ensureHeaderChrome();
    patchViewSwitcher();
    bind();
    if((location.hash || '').replace('#/','').replace('#','') === 'pollen') setTimeout(render, 120);
  });
})();
