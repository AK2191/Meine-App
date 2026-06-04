(function(){
  'use strict';

  var Store = window.ChangeWeatherStore;
  var Service = window.ChangeWeatherService;
  var APP_VERSION = '0.1.0019';
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
    var common = ' aria-hidden="true" viewBox="0 0 32 32"';
    var map = {
      grass_pollen:'<span class="pollen-neo-icon-svg pollen-neo-botanical grass"><svg'+common+'><g fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round"><path d="M16 27V9"/><path d="M16 20.2C12.8 14.9 9.7 11 9.7 11"/><path d="M16 19.6C19.4 13.7 22.5 9 22.5 9"/><path d="M16 16.2c-2.8-3.4-5.5-5-5.5-5"/><path d="M16 15.5c2.8-3.5 5.8-5.3 5.8-5.3"/><path d="M16 23.2c-1.5-3.2-3.7-5.6-3.7-5.6"/><path d="M16 23.4c1.7-3.4 4-5.9 4-5.9"/></g></svg></span>',
      birch_pollen:'<span class="pollen-neo-icon-svg pollen-neo-botanical birch"><svg'+common+'><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 27V8.8"/><path d="M15.9 13.8C11.6 13.8 8.7 10.9 8.7 6.8c4.3 0 7.2 2.9 7.2 7Z" fill="currentColor" fill-opacity=".16"/><path d="M16.1 18.7c4.6 0 7.5-3.2 7.5-7.6-4.6 0-7.5 3.1-7.5 7.6Z" fill="currentColor" fill-opacity=".24"/><path d="M11.5 10.2c1.6.7 3 1.9 4.4 3.6"/><path d="M20.2 14.2c-1.5.9-2.8 2.4-4.1 4.5"/></g></svg></span>',
      ragweed_pollen:'<span class="pollen-neo-icon-svg pollen-neo-botanical ragweed"><svg'+common+'><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 27V8"/><path d="M16 9.9c0-3.1 2.2-5.4 5.5-5.4-.6 3.5-2.6 5.4-5.5 5.4Z"/><path d="M16 13.5c-3.1 0-5.5-2.5-5.5-5.8 3.4.6 5.5 2.6 5.5 5.8Z"/><path d="M16 17.3c3.1 0 5.5 2.5 5.5 5.8-3.4-.6-5.5-2.6-5.5-5.8Z"/><path d="M16 20.6c-3 0-5.3 2.4-5.3 5.5 3.2-.5 5.3-2.4 5.3-5.5Z"/><circle cx="16" cy="15.6" r="1.7" fill="currentColor" fill-opacity=".22" stroke="none"/></g></svg></span>',
      mugwort_pollen:'<span class="pollen-neo-icon-svg pollen-neo-botanical mugwort"><svg'+common+'><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 27V8"/><path d="M16 12C12.8 7.9 9 7.1 9 7.1c.7 3.1 2.8 5 7 5.1"/><path d="M16 15.6c3.8-3.8 7.4-4.6 7.4-4.6-.8 3.1-3.1 4.8-7.4 4.9"/><path d="M16 19.2c-2.9-3-5.5-3.7-5.5-3.7.7 2.3 2.5 3.8 5.5 4"/><path d="M16 22.2c3-2.7 5.7-3.4 5.7-3.4-.7 2.3-2.4 3.6-5.7 3.8"/></g></svg></span>',
      alder_pollen:'<span class="pollen-neo-icon-svg pollen-neo-botanical alder"><svg'+common+'><g fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M16 27V8"/><path d="M11.2 10.2c0 3.1 2 5 4.8 5 0-3.1-2-5-4.8-5Z" fill="currentColor" fill-opacity=".10"/><path d="M20.8 12.5c0 3.1-2 5-4.8 5 0-3.1 2-5 4.8-5Z" fill="currentColor" fill-opacity=".16"/><path d="M12.2 18.3c0 2.2 1.5 3.8 3.8 3.8 0-2.2-1.5-3.8-3.8-3.8Z"/><path d="M19.8 19.6c0 2.2-1.5 3.8-3.8 3.8 0-2.2 1.5-3.8 3.8-3.8Z"/></g></svg></span>',
      olive_pollen:'<span class="pollen-neo-icon-svg pollen-neo-botanical olive"><svg'+common+'><g fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M16 27V8"/><path d="M16 13.6c-4.5 0-7.4-3-7.4-7.4 4.5 0 7.4 3 7.4 7.4Z"/><path d="M16 18.5c4.5 0 7.4-3 7.4-7.4-4.5 0-7.4 3-7.4 7.4Z"/><ellipse cx="22.2" cy="9.2" rx="2.1" ry="2.8" fill="currentColor" fill-opacity=".24" stroke="none"/><ellipse cx="10.3" cy="15.7" rx="1.7" ry="2.3" fill="currentColor" fill-opacity=".16" stroke="none"/></g></svg></span>',
      leaf:'<span class="pollen-neo-icon-svg pollen-neo-botanical leaf"><svg'+common+'><path d="M25.6 6.5C15.1 6.9 8.5 13.1 8.5 21c0 2.4.7 4 2 4.9 1.3.8 3 .9 4.9.2 6.6-2.2 10.3-8.3 10.3-19.2 0-.3 0-.4-.1-.4Z" fill="currentColor"/><path d="M11.8 24.4c2.5-4.1 5.8-7.3 10.2-9.7" fill="none" stroke="#102313" stroke-width="1.6" stroke-linecap="round"/></svg></span>'
    };
    return map[kind] || map.leaf;
  }
  function miniIconSvg(kind){
    var map = {
      pollen:'<span class="pollen-neo-mini-icon pollen"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.2" fill="currentColor" fill-opacity=".95"/><circle cx="12" cy="12" r="8.3" fill="none" stroke="currentColor" stroke-opacity=".24" stroke-width="1.6"/></svg></span>',
      peak:'<span class="pollen-neo-mini-icon peak"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5 20 19H4L12 4.5Z" fill="currentColor" fill-opacity=".92"/><path d="M12 8.8v5" stroke="#2c0d0d" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="16.8" r=".9" fill="#2c0d0d"/></svg></span>',
      leaf:'<span class="pollen-neo-mini-icon leaf"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4.8C11.8 5.2 6.7 10 6.7 16.1c0 1.9.5 3.1 1.5 3.8 1 .6 2.2.7 3.7.2 4.6-1.6 7.1-6.4 7.1-15 0-.2 0-.3-.1-.3Z" fill="currentColor"/><path d="M9.2 18.6c1.7-2.7 4-4.9 6.8-6.5" fill="none" stroke="#102313" stroke-width="1.3" stroke-linecap="round"/></svg></span>'
    };
    return map[kind] || map.leaf;
  }
  function heroArtSvg(){
    return '<svg class="pollen-neo-hero-illustration" viewBox="0 0 220 220" aria-hidden="true">'
      + '<defs>'
      + '<linearGradient id="pollen-hero-stem" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#29451d" stop-opacity=".05"></stop><stop offset=".6" stop-color="#83b73d" stop-opacity=".68"></stop><stop offset="1" stop-color="#b4e15f" stop-opacity=".92"></stop></linearGradient>'
      + '<linearGradient id="pollen-hero-leaf" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#314f20" stop-opacity=".18"></stop><stop offset="1" stop-color="#a9db52" stop-opacity=".72"></stop></linearGradient>'
      + '</defs>'
      + '<g class="pollen-hero-plant" fill="none" stroke="url(#pollen-hero-stem)" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M109 188C97 135 74 92 69 76"></path>'
      + '<path d="M110 188C112 129 116 80 123 48"></path>'
      + '<path d="M110 188C128 141 151 107 166 82"></path>'
      + '<path d="M110 188C92 156 67 126 44 102"></path>'
      + '<path d="M110 188C139 158 154 130 157 92"></path>'
      + '</g>'
      + '<g fill="url(#pollen-hero-leaf)" opacity=".92">'
      + '<path d="M71 76c18 7 30 20 36 39-19-4-32-17-36-39Z"></path>'
      + '<path d="M123 48c15 14 19 30 12 49-14-13-18-30-12-49Z"></path>'
      + '<path d="M166 82c-2 20-14 35-35 44 3-21 15-36 35-44Z"></path>'
      + '</g>'
      + '<ellipse cx="110" cy="190" rx="28" ry="10" fill="#0a1212" opacity=".34"></ellipse>'
      + '</svg>';
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
          + '<div>'+miniIconSvg('pollen')+'<strong>'+esc(selectedItem.name)+' stark</strong><em>'+esc(score)+' %</em></div>'
          + '<div>'+miniIconSvg('peak')+'<strong>Peak</strong><em>'+esc(peak ? diffLabel(dayDiff(peak.date)) : '–')+'</em></div>'
          + '<div>'+miniIconSvg('leaf')+'<strong>Ruhigster Tag</strong><em>'+esc(quiet ? fmtLongDay(quiet.date).split(',')[0] : '–')+'</em></div>'
        + '</div>'
      + '</div>'
      + '<div class="pollen-neo-sidecards">'
        + metricCardHtml('ring', 'Belastung heute', '<div class="pollen-neo-ring '+esc(todaySelected.level)+'" style="--p:'+score+'"><div class="pollen-neo-ring-center"><strong>'+esc(score)+' %</strong><span>'+esc(intensity)+'</span></div></div><div class="pollen-neo-metric-foot">Pollenindex</div>', todaySelected.level)
        + metricCardHtml('peak', 'Peak', '<div class="pollen-neo-chart '+esc(peakTone)+'">'+trendSvg(selected)+'<strong>'+esc(peak ? diffLabel(dayDiff(peak.date)) : '–')+'</strong><span>'+esc(peak ? fmtLongDay(peak.date) : 'Kein Peak erkannt')+'</span></div>', peakTone)
        + metricCardHtml('quiet', 'Ruhigster Tag', '<div class="pollen-neo-quiet-card">'+glyphSvg('leaf')+'<strong>'+esc(quiet ? fmtLongDay(quiet.date).split(',')[0] : '–')+'</strong><span>'+esc(quiet ? fmtDay(quiet.date).replace('.', '') : '')+'</span></div>', 'none')
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
