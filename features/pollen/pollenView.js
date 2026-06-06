(function(){
  'use strict';

  var Store = window.ChangeWeatherStore;
  var Service = window.ChangeWeatherService;
  var APP_VERSION = '0.1.0105';
  var FOCUS_KEY = 'change_v1_pollen_focus_key';
  var SELECTED_KEY = 'change_v1_pollen_selected_keys';
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
  function itemHasData(item){ return !item || item.dataAvailable !== false; }
  function activeItems(day){
    return itemsOf(day).filter(function(p){ return itemHasData(p) && clampNum(p && p.value) > 0; }).sort(function(a,b){
      return ((b.rank || 0) - (a.rank || 0)) || (clampNum(b.value) - clampNum(a.value));
    });
  }
  function selectedItems(day, keys){
    var valid = Array.isArray(keys) ? keys : [];
    return valid.map(function(key){ return itemByKey(day, key); }).filter(Boolean);
  }
  function dominantItem(day, keys){
    var items = selectedItems(day, keys);
    if(!items.length) items = activeItems(day).slice(0, 1);
    return items.sort(function(a,b){
      return clampNum(b.value) - clampNum(a.value) || ((b.rank || 0) - (a.rank || 0));
    })[0] || null;
  }
  function summaryForItems(items){
    var list = (items || []).filter(Boolean);
    if(!list.length) return '<span class="pollen-neo-muted">Keine Belastung</span>';
    return list.map(function(p){
      return '<span class="pollen-neo-word '+esc(p.level || 'none')+'">'+esc(p.name)+' '+esc(levelLabel(p.level))+'</span>';
    }).join('<span class="pollen-neo-dotsep">·</span>');
  }
  function summaryTextForItems(items){
    var list = (items || []).filter(Boolean);
    if(!list.length) return 'keine Belastung';
    return list.map(function(p){ return String(p.name || 'Pollen') + ' ' + levelLabel(p.level); }).join(', ');
  }
  function overallSubline(day, keys){
    var items = selectedItems(day, keys).filter(function(p){ return clampNum(p && p.value) > 0; });
    if(!items.length && selectedItems(day, keys).length) items = selectedItems(day, keys).slice(0, 2);
    return summaryForItems(items.slice(0, 3));
  }
  function relevantLoadItems(day){
    return activeItems(day).filter(function(p){ return clampNum(p && p.value) > 1; }).slice(0, 4);
  }
  function relevantLoadHtml(day){
    var items = relevantLoadItems(day);
    if(!items.length){
      return '';
    }
    return '<div class="pollen-neo-loadline"><span>Aktuell ab 1 %</span><div>' + items.map(function(p){
      return '<strong class="'+esc(p.level || 'none')+'">'+esc(p.name)+' <em>'+esc(Math.round(clampNum(p.value)))+' %</em></strong>';
    }).join('') + '</div></div>';
  }
  function levelLabel(level){ return level === 'high' ? 'hoch' : level === 'medium' ? 'mittel' : level === 'low' ? 'niedrig' : 'keine'; }
  function intensityTitle(level){ return level === 'high' ? 'Hoch' : level === 'medium' ? 'Mittel' : level === 'low' ? 'Niedrig' : 'Ruhig'; }
  function selectedStatus(item, missing){
    if(missing || (item && item.dataAvailable === false)){
      return {key:'missing', title:'Keine API-Daten', score:null};
    }
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
  function readSelectedRaw(){
    try{
      var raw = localStorage.getItem(SELECTED_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    }catch(e){ return []; }
  }
  function writeSelectedKeys(keys){
    var clean = Array.from(new Set((Array.isArray(keys) ? keys : []).map(String).filter(Boolean)));
    try{ localStorage.setItem(SELECTED_KEY, JSON.stringify(clean)); }catch(e){}
    if(clean[0]) writeFocus(clean[0]);
  }
  function resolveSelectedKeys(today){
    var items = itemsOf(today);
    var validKeys = items.map(function(p){ return String(p.key || ''); }).filter(Boolean);
    if(!validKeys.length) return [];
    var saved = readSelectedRaw().filter(function(key){ return validKeys.indexOf(String(key)) >= 0; });
    if(saved.length) return saved;
    var legacy = readFocus();
    if(legacy && validKeys.indexOf(legacy) >= 0) return [legacy];
    var top = activeItems(today)[0] || items[0];
    return top && top.key ? [String(top.key)] : [validKeys[0]];
  }
  function toggleSelectedKey(today, key){
    var current = resolveSelectedKeys(today);
    var value = String(key || '');
    if(!value) return current;
    var exists = current.indexOf(value) >= 0;
    var next = exists ? current.filter(function(k){ return k !== value; }) : current.concat(value);
    if(!next.length) next = [value];
    writeSelectedKeys(next);
    return next;
  }
  function selectedDaySummary(day, keys){
    var missing = !!(day && day.dataMissing);
    var items = selectedItems(day, keys);
    if(!items.length){
      var fallback = activeItems(day)[0] || itemsOf(day)[0] || null;
      if(fallback) items = [fallback];
    }
    if(missing) items = items.map(function(p){ return Object.assign({}, p || {}, {dataAvailable:false}); });
    var main = (items || []).slice().sort(function(a,b){
      return clampNum(b.value) - clampNum(a.value) || ((b.rank || 0) - (a.rank || 0));
    })[0] || null;
    var state = selectedStatus(main, missing);
    return {
      date: day && day.date,
      items: items,
      item: main,
      keys: keys,
      name: main && main.name || '',
      level: state.key,
      title: state.title,
      score: state.score,
      dataMissing: missing,
      summary: missing ? 'keine API-Daten' : summaryTextForItems(items)
    };
  }
  function selectedForecast(forecast, keys){
    return (forecast || []).map(function(day){ return selectedDaySummary(day, keys); });
  }
  function forecastPeak(days){
    days = (days || []).filter(function(day){ return !day.dataMissing && day.score !== null && day.score !== undefined; });
    if(!days.length) return null;
    return days.slice().sort(function(a,b){ return (b.score || 0) - (a.score || 0); })[0] || null;
  }
  function quietestDay(days){
    days = (days || []).filter(function(day){ return !day.dataMissing && day.score !== null && day.score !== undefined; });
    if(!days.length) return null;
    return days.slice().sort(function(a,b){ return (a.score || 0) - (b.score || 0); })[0] || null;
  }
  function trendText(days){
    days = (days || []).filter(function(day){ return !day.dataMissing && day.score !== null && day.score !== undefined; });
    if(days.length < 2) return 'Morgen ähnlich';
    var diff = Number(days[1].score || 0) - Number(days[0].score || 0);
    if(diff >= 12) return 'Morgen deutlich stärker';
    if(diff >= 4) return 'Morgen etwas stärker';
    if(diff <= -12) return 'Morgen deutlich ruhiger';
    if(diff <= -4) return 'Morgen etwas ruhiger';
    return 'Morgen ähnlich';
  }
  function miniBars(score, tone){
    if(score === null || score === undefined) return '<span></span><span></span><span></span><span></span><span></span><span></span>';
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
      grass_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8.8"/><path d="M12 12.8 8.4 7.2"/><path d="M12 11.6 10 5.8"/><path d="M12 12.8 15.7 7.1"/><path d="M12 11.8 14.1 6"/></g><g fill="currentColor"><circle cx="8.1" cy="6.8" r="1.1"/><circle cx="10" cy="5.2" r="1"/><circle cx="15.9" cy="6.8" r="1.1"/><circle cx="14" cy="5.2" r="1"/></g></svg></span>',
      birch_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8.2"/><path d="M12 11.5c-3 0-4.8-2-4.8-5 2.8 0 4.8 1.9 4.8 5Z" fill="currentColor" fill-opacity=".16"/><path d="M12 15.2c3.1 0 5-2.2 5-5.3-3 0-5 2.1-5 5.3Z" fill="currentColor" fill-opacity=".22"/></g></svg></span>',
      ragweed_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V9.3"/><path d="M12 9.3 8.4 6.6"/><path d="M12 11.6 8 11"/><path d="M12 14.1 8.4 16.9"/><path d="M12 9.3 15.6 6.6"/><path d="M12 11.6 16 11"/><path d="M12 14.1 15.6 16.9"/></g><g fill="currentColor"><circle cx="7.5" cy="6.1" r="1.05"/><circle cx="6.8" cy="10.9" r="1.05"/><circle cx="7.6" cy="17.4" r="1.05"/><circle cx="16.5" cy="6.1" r="1.05"/><circle cx="17.2" cy="10.9" r="1.05"/><circle cx="16.4" cy="17.4" r="1.05"/></g></svg></span>',
      mugwort_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8.5"/><path d="M12 10.5c-2.2-1.8-4.1-2.1-4.1-2.1.4 1.9 1.8 3.1 4.1 3.2"/><path d="M12 13.4c2.5-1.7 4.5-1.8 4.5-1.8-.5 2.1-2 3.2-4.5 3.2"/><path d="M12 15.3c-1.9-1.4-3.4-1.6-3.4-1.6.4 1.5 1.5 2.4 3.4 2.5"/><path d="M12 17.4c1.9-1.4 3.4-1.6 3.4-1.6-.4 1.5-1.5 2.4-3.4 2.5"/></g></svg></span>',
      alder_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8"/><path d="M9.5 8.8c0 1.8 1.1 3.3 2.5 3.3 0-1.8-1.1-3.3-2.5-3.3Z" fill="currentColor" fill-opacity=".12"/><path d="M14.5 10c0 1.8-1.1 3.2-2.5 3.2 0-1.8 1.1-3.2 2.5-3.2Z" fill="currentColor" fill-opacity=".18"/><path d="M10.2 14.1c0 1.4.8 2.5 1.8 2.5 0-1.4-.8-2.5-1.8-2.5Z"/><path d="M13.8 15c0 1.3-.8 2.4-1.8 2.4 0-1.3.8-2.4 1.8-2.4Z"/></g></svg></span>',
      olive_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8.7"/><path d="M12 11.6c-2.8 0-4.6-1.8-4.6-4.7 2.8 0 4.6 1.8 4.6 4.7Z" fill="currentColor" fill-opacity=".12"/><path d="M12 14.8c2.8 0 4.7-1.9 4.7-4.9-2.8 0-4.7 1.9-4.7 4.9Z" fill="currentColor" fill-opacity=".2"/></g><circle cx="16.5" cy="7.2" r="1.35" fill="currentColor" fill-opacity=".34"/></svg></span>',
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
  function topHtml(forecast, selectedKeys, loc){
    var today = forecast[0] || {};
    var selected = selectedForecast(forecast, selectedKeys);
    var todaySelected = selected[0] || {score:0, level:'none', title:'Pollen ruhig', items:[]};
    var peak = forecastPeak(selected);
    var quiet = quietestDay(selected);
    var selectedItem = todaySelected.item || dominantItem(today, selectedKeys) || {key:selectedKeys && selectedKeys[0], name:'Pollen', level:'none', value:0};
    var topLoadItem = relevantLoadItems(today)[0] || activeItems(today)[0] || selectedItem;
    var topLoadScore = Math.round(clampNum(topLoadItem && topLoadItem.value));
    var nextTrend = trendText(selected);
    var score = Math.round(todaySelected.score || 0);
    var intensity = intensityTitle(todaySelected.level);
    var peakTone = peak ? peak.level : 'none';
    return '<section class="pollen-neo-top pollen-neo-top-mainonly">'
      + '<div class="pollen-neo-hero pollen-neo-hero-wide '+esc(todaySelected.level)+'">'
        + '<div class="pollen-neo-hero-main">'
          + '<div class="pollen-neo-label">Deine Pollen heute</div>'
          + '<div class="pollen-neo-hero-title">'+esc(intensity)+'</div>'
          + '<div class="pollen-neo-subline">'+overallSubline(today, selectedKeys)+'</div>'
          + '<div class="pollen-neo-cta">↗ '+esc(nextTrend)+'</div>'
        + '</div>'
        + heroArtSvg()
        + '<div class="pollen-neo-hero-stats pollen-neo-hero-stats-extended pollen-neo-hero-insights">'
          + '<div class="pollen-hero-insight"><span class="dot yellow"></span><strong>'+esc((topLoadItem && topLoadItem.name) || 'Pollen')+' '+esc(levelLabel(topLoadItem && topLoadItem.level))+'</strong><em>'+esc(topLoadScore)+' %</em></div>'
          + '<div class="pollen-hero-insight"><span class="mark peak"></span><strong>Peak</strong><em>'+esc(peak ? diffLabel(dayDiff(peak.date)) : '–')+'</em></div>'
          + '<div class="pollen-hero-insight"><span class="mark leaf"></span><strong>Ruhigster Tag</strong><em>'+esc(quiet ? fmtLongDay(quiet.date).split(',')[0] : '–')+'</em></div>'
        + '</div>'
      + '</div>'
    + '</section>';
  }
  function profileHtml(today, selectedKeys){
    var items = itemsOf(today);
    if(!items.length) return '<div class="pollen-neo-card pollen-neo-empty">Keine Einzelwerte geladen.</div>';
    return '<section class="pollen-neo-section">'
      + '<div class="pollen-neo-section-head"><div><span>Allergieprofil</span></div></div>'
      + '<div class="pollen-neo-profile-grid">'
      + items.map(function(p){
        return '<button type="button" class="pollen-neo-profile-card '+esc(p.level || 'none')+' '+((selectedKeys || []).indexOf(String(p.key)) >= 0 ? 'active' : '')+'" data-pollen-select="'+esc(p.key)+'">'
          + glyphSvg(p.key)
          + '<strong>'+esc(p.name)+'</strong>'
          + '<span>'+esc(levelLabel(p.level))+'</span>'
          + '<em>'+esc(Math.round(clampNum(p.value)))+'</em>'
        + '</button>'; 
      }).join('')
      + '</div>'
    + '</section>';
  }
  function forecastItemChips(day){
    if(day && day.dataMissing){
      return '<span class="pollen-neo-forecast-empty missing">Keine API-Daten</span>';
    }
    var items = (day && Array.isArray(day.items) ? day.items.slice() : []).filter(Boolean);
    if(!items.length && day && day.item) items = [day.item];
    if(!items.length) return '<span class="pollen-neo-forecast-empty">keine Belastung</span>';
    return '<div class="pollen-neo-forecast-items">' + items.map(function(p){
      if(p && p.dataAvailable === false){
        return '<span class="missing"><strong>'+esc(p.name || 'Pollen')+'</strong><em>keine Daten</em></span>';
      }
      var value = Math.round(clampNum(p && p.value));
      var level = p && p.level || 'none';
      return '<span class="'+esc(level)+' '+(value <= 0 ? 'zero' : '')+'"><strong>'+esc(p && p.name || 'Pollen')+'</strong><em>'+esc(value)+' %</em></span>';
    }).join('') + '</div>';
  }
  function forecastRow(day){
    var count = day && Array.isArray(day.items) ? day.items.length : 0;
    var isMulti = count > 1;
    return '<div class="pollen-neo-forecast-row '+esc(day.level || 'none')+' '+(isMulti ? 'multi' : 'single')+'">'
      + '<div class="pollen-neo-forecast-dot"></div>'
      + '<div class="pollen-neo-forecast-date"><strong>'+esc(fmtDay(day.date))+'</strong><span>'+esc(diffLabel(dayDiff(day.date)))+'</span></div>'
      + '<div class="pollen-neo-forecast-main">'+forecastItemChips(day)+'</div>'
      + '<div class="pollen-neo-bars">'+miniBars(day.score, day.level)+'</div>'
    + '</div>';
  }
  function forecastHtml(forecast, selectedKeys){
    var list = selectedForecast(forecast, selectedKeys).filter(function(day){
      return day && !day.dataMissing;
    }).slice(0,5);
    // Der Bereich heißt bewusst 5-Tages-Ausblick. Wenn die API weniger verwertbare
    // Tage liefert, bleiben wir bei den geladenen Tagen statt technische Platzhalter
    // wie "Keine API-Daten" anzuzeigen.
    return '<section class="pollen-neo-section pollen-neo-forecast">'
      + '<div class="pollen-neo-section-head"><div><span>5-Tages-Ausblick</span></div></div>'
      + '<div class="pollen-neo-forecast-list">'+list.map(forecastRow).join('')+'</div>'
    + '</section>';
  }
  function hourlyTone(value){
    value = clampNum(value);
    if(value >= 75) return 'very-high';
    if(value >= 50) return 'high';
    if(value >= 25) return 'moderate';
    return 'low';
  }
  function hourlyToneLabel(value){
    value = clampNum(value);
    if(value >= 75) return 'sehr hoch';
    if(value >= 50) return 'hoch';
    if(value >= 25) return 'moderat';
    return 'niedrig';
  }
  function hourlyCurve(todaySelected, selectedItem){
    var base = Math.max(8, clampNum(todaySelected && todaySelected.score));
    var now = new Date().getHours();
    var slots = [0,3,6,9,12,15,18,21,24];
    return slots.map(function(offset){
      var hour = (now + offset) % 24;
      var wave = 0.62 + (Math.sin(((hour - 11) / 24) * Math.PI * 2) + 1) * 0.22;
      var evening = hour >= 17 && hour <= 22 ? 1.18 : 1;
      var night = hour >= 0 && hour <= 5 ? .72 : 1;
      var value = clampNum(Math.round(base * wave * evening * night));
      return {hour:hour, label:offset === 0 ? 'Jetzt' : pad2(hour), value:value, tone:hourlyTone(value)};
    });
  }
  function rangeOfHours(points, from, to){
    var values = (points || []).filter(function(p){
      if(from <= to) return p.hour >= from && p.hour <= to;
      return p.hour >= from || p.hour <= to;
    }).map(function(p){ return p.value; });
    if(!values.length) values = [0];
    return {min:Math.min.apply(null, values), max:Math.max.apply(null, values)};
  }
  function hourlyInsightHtml(points){
    var peak = points.slice().sort(function(a,b){ return b.value - a.value; })[0] || {hour:0,value:0};
    var best = points.slice().sort(function(a,b){ return a.value - b.value; })[0] || {hour:0,value:0};
    var trend = points.length > 2 ? (points[points.length-1].value - points[0].value) : 0;
    var trendText = trend > 12 ? 'Steigend' : trend < -12 ? 'Ruhiger' : 'Stabil';
    var trendSub = trend > 12 ? 'abends höher' : trend < -12 ? 'später ruhiger' : 'kaum Änderung';
    return '<div class="pollen-hourly-insights">'
      + '<div class="pollen-hourly-insight '+esc(hourlyTone(peak.value))+'"><span class="pollen-hourly-insight-icon">↗</span><small>Peak</small><strong>'+esc(pad2(peak.hour))+':00</strong><em>'+esc(peak.value)+'%</em></div>'
      + '<div class="pollen-hourly-insight '+esc(hourlyTone(best.value))+'"><span class="pollen-hourly-insight-icon">◷</span><small>Beste Zeit</small><strong>'+esc(pad2(best.hour))+':00</strong><em>'+esc(best.value)+'%</em></div>'
      + '<div class="pollen-hourly-insight trend"><span class="pollen-hourly-insight-icon">↗</span><small>Trend</small><strong>'+esc(trendText)+'</strong><em>'+esc(trendSub)+'</em></div>'
    + '</div>';
  }
  function hourlyChartHtml(points, name){
    var w = 720, h = 210, padL = 36, padR = 24, padT = 16, padB = 30;
    var usableW = w - padL - padR;
    var usableH = h - padT - padB;
    var xy = points.map(function(p, i){
      return {x:padL + (usableW * i / Math.max(1, points.length - 1)), y:padT + usableH - (usableH * clampNum(p.value) / 100), p:p};
    });
    var line = xy.map(function(p){ return Math.round(p.x)+','+Math.round(p.y); }).join(' ');
    var area = xy.length ? ('M '+xy[0].x+' '+(h-padB)+' L '+xy.map(function(p){ return Math.round(p.x)+' '+Math.round(p.y); }).join(' L ')+' L '+xy[xy.length-1].x+' '+(h-padB)+' Z') : '';
    var peak = xy.slice().sort(function(a,b){ return b.p.value - a.p.value; })[0];
    return '<div class="pollen-hourly-chart" aria-label="24-Stunden-Belastungskurve">'
      + '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Pollenbelastung über 24 Stunden">'
        + '<defs><linearGradient id="pollen-hourly-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f7d54a"/><stop offset=".58" stop-color="#fb923c"/><stop offset="1" stop-color="#ff6252"/></linearGradient><linearGradient id="pollen-hourly-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(251,146,60,.18)"/><stop offset="1" stop-color="rgba(251,146,60,0)"/></linearGradient></defs>'
        + '<g class="pollen-hourly-grid"><line x1="'+padL+'" y1="'+(padT+usableH*.25)+'" x2="'+(w-padR)+'" y2="'+(padT+usableH*.25)+'"/><line x1="'+padL+'" y1="'+(padT+usableH*.5)+'" x2="'+(w-padR)+'" y2="'+(padT+usableH*.5)+'"/><line x1="'+padL+'" y1="'+(padT+usableH*.75)+'" x2="'+(w-padR)+'" y2="'+(padT+usableH*.75)+'"/></g>'
        + '<path class="pollen-hourly-area" d="'+esc(area)+'"></path>'
        + '<polyline class="pollen-hourly-line" points="'+esc(line)+'"></polyline>'
        + xy.map(function(pt){ return '<circle class="pollen-hourly-point '+esc(pt.p.tone)+'" cx="'+Math.round(pt.x)+'" cy="'+Math.round(pt.y)+'" r="4"></circle>'; }).join('')
        + (peak ? '<circle class="pollen-hourly-peak" cx="'+Math.round(peak.x)+'" cy="'+Math.round(peak.y)+'" r="6"></circle>' : '')
        + '<g class="pollen-hourly-x">'+xy.map(function(pt, i){ return '<text x="'+Math.round(pt.x)+'" y="'+(h-8)+'" text-anchor="middle">'+esc(i === 0 ? 'Jetzt' : pad2(pt.p.hour))+'</text>'; }).join('')+'</g>'
      + '</svg>'
    + '</div>';
  }
  function hourlyDayPartsHtml(points){
    var parts = [
      {key:'morning', icon:'☀️', title:'Morgen', range:rangeOfHours(points,6,11)},
      {key:'noon', icon:'☀', title:'Mittag', range:rangeOfHours(points,12,16)},
      {key:'evening', icon:'◔', title:'Abend', range:rangeOfHours(points,17,20)},
      {key:'night', icon:'☾', title:'Nacht', range:rangeOfHours(points,21,5)}
    ];
    return '<div class="pollen-hourly-parts">' + parts.map(function(part){
      var tone = hourlyTone(part.range.max);
      var value = part.range.min === part.range.max ? String(part.range.max)+'%' : String(part.range.min)+'–'+String(part.range.max)+'%' ;
      return '<div class="pollen-hourly-part '+esc(tone)+'">'
        + '<span>'+esc(part.icon)+'</span><strong>'+esc(part.title)+'</strong><em>'+esc(value)+'</em><small>'+esc(hourlyToneLabel(part.range.max))+'</small>'
      + '</div>'; 
    }).join('') + '</div>';
  }
  function hourlyProfileSummaryHtml(todaySelected, selectedKeys){
    var items = (todaySelected && todaySelected.items || []).filter(function(item){ return item && item.dataAvailable !== false; });
    if(!items.length) return '';
    var sorted = items.slice().sort(function(a,b){ return clampNum(b.value) - clampNum(a.value) || String(a.name || '').localeCompare(String(b.name || '')); });
    return '<div class="pollen-hourly-profile" aria-label="Aktives Allergieprofil für den 24-Stunden-Ausblick">'
      + '<span class="pollen-hourly-profile-label">Aus Allergieprofil</span>'
      + '<div class="pollen-hourly-profile-chips">'
      + sorted.slice(0, 4).map(function(item, index){
          var tone = hourlyTone(clampNum(item.value));
          return '<span class="pollen-hourly-profile-chip '+esc(tone)+(index === 0 ? ' primary' : '')+'">'
            + glyphSvg(item.key || 'leaf')
            + '<strong>'+esc(item.name || 'Pollen')+'</strong>'
            + '<em>'+esc(clampNum(item.value))+' %</em>'
            + '</span>';
        }).join('')
      + '</div></div>';
  }
  function hourlyHtml(forecast, selectedKeys){
    var selected = selectedForecast(forecast, selectedKeys);
    var todaySelected = selected[0] || {score:0, item:null, items:[]};
    var selectedItem = todaySelected.item || dominantItem((forecast || [])[0], selectedKeys) || {name:'Pollen', value:0};
    var name = selectedItem && selectedItem.name || 'Pollen';
    var points = hourlyCurve(todaySelected, selectedItem);
    return '<section class="pollen-neo-section pollen-hourly-section">'
      + '<div class="pollen-neo-section-head pollen-hourly-title"><div><span>24-Stunden-Ausblick</span></div></div>'
      + '<div class="pollen-hourly-card pollen-neo-card">'
        + hourlyInsightHtml(points)
        + hourlyChartHtml(points, name)
        + hourlyDayPartsHtml(points)
      + '</div>'
      + '</section>';
  }
  function pageHtml(data, loc){
    var forecast = data && data.pollen && data.pollen.forecast || [];
    if(!forecast.length){
      return '<div class="pollen-neo-shell"><div class="pollen-neo-card pollen-neo-empty"><strong>Noch kein Pollen-Ausblick geladen.</strong><span>Aktualisiere den Standort, um die Ansicht aufzubauen.</span><button class="btn btn-primary" type="button" onclick="ChangeWeatherCard&&ChangeWeatherCard.updateLocation&&ChangeWeatherCard.updateLocation()">Standort aktualisieren</button></div></div>';
    }
    var today = forecast[0];
    var selectedKeys = resolveSelectedKeys(today);
    writeSelectedKeys(selectedKeys);
    var symptomForecast = selectedKeys.length ? (forecast || []).map(function(day){
      var copy = Object.assign({}, day || {});
      copy.items = selectedItems(day, selectedKeys);
      return copy;
    }) : forecast;
    return '<div class="pollen-neo-shell">'
      + topHtml(forecast, selectedKeys, loc)
      + '<div class="pollen-neo-main-grid">'
        + '<div class="pollen-neo-left">'
          + profileHtml(today, selectedKeys)
          + (window.ChangePollenSymptoms && window.ChangePollenSymptoms.panelHtml ? '<section class="pollen-neo-section pollen-neo-symptoms"><div class="pollen-neo-section-head pollen-neo-symptoms-title"><div><span>Symptome heute</span></div></div>'+window.ChangePollenSymptoms.panelHtml(todayKey(), symptomForecast)+'</section>' : '')
        + '</div>'
        + '<div class="pollen-neo-right">'
          + hourlyHtml(forecast, selectedKeys)
          + forecastHtml(forecast, selectedKeys)
        + '</div>'
      + '</div>'
    + '</div>';
  }
  function notificationCount(){
    var total = 0;
    try{
      if(typeof window.getCalendarNotificationCount === 'function') total += Number(window.getCalendarNotificationCount() || 0);
      else total += ((window.notifications || []).filter(function(n){ return n && (n.urgency === 'crit' || n.urgency === 'warn'); }).length || 0);
    }catch(_){ }
    try{
      if(typeof window.getUnreadNudgeCount === 'function') total += Number(window.getUnreadNudgeCount() || 0);
      else total += ((JSON.parse(sessionStorage.getItem('change_nudges_in') || '[]') || []).filter(function(n){ return n && n.localSeen !== true; }).length || 0);
    }catch(_){ }
    if(!total){
      try{
        var globalBadge = document.getElementById('notif-count-badge');
        if(globalBadge && globalBadge.style.display !== 'none'){
          var raw = (globalBadge.textContent || '').trim();
          if(raw === '9+') total = 10;
          else total = Number(raw || 0) || 0;
        }
      }catch(_){ }
    }
    return Math.max(0, total || 0);
  }
  function updateHeaderNotificationBadge(){
    var view = document.getElementById('pollen-view');
    if(!view) return;
    var badge = view.querySelector('[data-pollen-notify-count]');
    if(!badge) return;
    var total = notificationCount();
    if(total > 0){
      badge.textContent = total > 9 ? '9+' : String(total);
      badge.style.display = 'inline-flex';
    }else{
      badge.textContent = '';
      badge.style.display = 'none';
    }
  }
  function ensureHeaderChrome(){
    var view = document.getElementById('pollen-view');
    if(!view) return;
    var header = view.querySelector('.list-header');
    if(!header) return;
    header.classList.add('pollen-neo-headerbar');
    var actions = header.querySelector('.pollen-neo-header-actions');
    if(!actions){
      actions = document.createElement('div');
      actions.className = 'pollen-neo-header-actions';
      header.appendChild(actions);
    }
    if(!actions.querySelector('.pollen-neo-header-notify')){
      var notify = document.createElement('button');
      notify.type = 'button';
      notify.className = 'pollen-neo-header-notify';
      notify.setAttribute('data-pollen-notify','');
      notify.setAttribute('aria-label','Benachrichtigungen');
      notify.title = 'Benachrichtigungen';
      notify.innerHTML = '<span class="pollen-neo-header-settings-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 9.7c0-3.3-2.1-5.7-5.1-6.2V2.8a.9.9 0 0 0-1.8 0v.7C8.1 4 6 6.4 6 9.7v3.5c0 1.4-.6 2.5-1.5 3.4a.9.9 0 0 0 .6 1.5h13.8a.9.9 0 0 0 .6-1.5c-.9-.9-1.5-2-1.5-3.4V9.7Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path><path d="M9.8 19.5a2.4 2.4 0 0 0 4.4 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg></span><span class="pollen-neo-notify-count" data-pollen-notify-count style="display:none"></span>';
      actions.appendChild(notify);
    }
    var settingsExisting = actions.querySelector('.pollen-neo-header-settings');
    if(settingsExisting){
      settingsExisting.setAttribute('aria-label','Allergieprofil');
      settingsExisting.title = 'Allergieprofil';
      var label = settingsExisting.querySelector('.pollen-neo-header-settings-label');
      if(!label){
        Array.prototype.slice.call(settingsExisting.childNodes).forEach(function(node){
          if(node.nodeType === 3 && String(node.textContent || '').trim()){ node.textContent = ''; }
        });
        label = document.createElement('span');
        label.className = 'pollen-neo-header-settings-label';
        settingsExisting.appendChild(label);
      }
      label.textContent = 'Allergieprofil';
    }
    if(!actions.querySelector('.pollen-neo-header-settings')){
      var action = document.createElement('button');
      action.type = 'button';
      action.className = 'pollen-neo-header-settings';
      action.setAttribute('data-pollen-settings','');
      action.innerHTML = '<span class="pollen-neo-header-settings-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82V22a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1.82V2a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.36.12.69.31 1 .6.31.29.51.64.6 1H22a2 2 0 1 1 0 4h-.09c-.37.09-.72.29-1 .6-.29.31-.48.64-.51 1z"></path></svg></span><span class="pollen-neo-header-settings-label">Allergieprofil</span>';
      actions.appendChild(action);
    }
    updateHeaderNotificationBadge();
  }
  function setShellMode(active){ return !!active; }
  function patchViewSwitcher(){ return; }
  async function getData(options){
    options = options || {};
    if(options.preferCached && Service && Service.getCached){
      var cached = Service.getCached();
      if(cached) return cached;
    }
    if(Service && Service.ensureFresh) return Service.ensureFresh();
    if(Service && Service.getCached) return Service.getCached();
    return null;
  }
  function pollenScrollSelectors(){
    return ['.pollen-neo-profile-grid', '.pollen-neo-symptoms', '.pollen-neo-forecast-card', '.pollen-neo-shell'];
  }
  function capturePollenScrollState(body){
    var state = {bodyTop:0, windowY:0, containers:{}};
    try{ state.bodyTop = body ? body.scrollTop : 0; }catch(_e){}
    try{ state.windowY = window.scrollY || 0; }catch(_e){}
    try{
      pollenScrollSelectors().forEach(function(selector){
        var el = document.querySelector('#pollen-view ' + selector);
        if(el) state.containers[selector] = {left:el.scrollLeft || 0, top:el.scrollTop || 0};
      });
    }catch(_e){}
    return state;
  }
  function restorePollenScroll(body, state){
    if(!body || state == null) return;
    var apply = function(){
      if(typeof state === 'number') state = {bodyTop:state, windowY:state, containers:{}};
      try{ body.scrollTop = state.bodyTop || 0; }catch(_e){}
      try{ if((window.scrollY || 0) !== (state.windowY || 0)) window.scrollTo(window.scrollX || 0, state.windowY || 0); }catch(_e){}
      try{
        var containers = state.containers || {};
        Object.keys(containers).forEach(function(selector){
          var el = document.querySelector('#pollen-view ' + selector);
          var val = containers[selector];
          if(el && val){ el.scrollLeft = val.left || 0; el.scrollTop = val.top || 0; }
        });
      }catch(_e){}
    };
    requestAnimationFrame(function(){ apply(); requestAnimationFrame(apply); });
  }
  async function render(options){
    options = options || {};
    ensureHeaderChrome();
    var body = document.getElementById('pollen-view-body');
    if(!body) return;
    var oldScroll = null;
    if(options.preserveScroll){
      try{ oldScroll = capturePollenScrollState(body); }catch(_e){ oldScroll = null; }
    }
    if(!options.preferCached){
      body.innerHTML = '<div class="pollen-neo-shell"><div class="pollen-neo-card pollen-neo-empty">Pollen werden geladen…</div></div>';
    }
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
        restorePollenScroll(body, oldScroll);
        return;
      }
      var data = await getData(options);
      loc = Store && Store.getLocation ? Store.getLocation() : loc;
      if(!options.preferCached && window.ChangeWeatherCard && typeof window.ChangeWeatherCard.update === 'function') window.ChangeWeatherCard.update();
      body.innerHTML = pageHtml(data, loc);
      updateHeaderNotificationBadge();
      var mode = readEditMode();
      body.classList.toggle('pollen-edit-active', mode === 'profile' || mode === 'symptoms');
      restorePollenScroll(body, oldScroll);
    }catch(e){
      body.innerHTML = '<div class="pollen-neo-shell"><div class="pollen-neo-card pollen-neo-empty"><strong>Pollen konnten nicht geladen werden.</strong><span>'+esc(e.message || e || 'Bitte später erneut versuchen.')+'</span></div></div>';
      restorePollenScroll(body, oldScroll);
    }
  }
  function bind(){
    if(window.__changePollenNeoBound) return;
    window.__changePollenNeoBound = true;
    document.addEventListener('click', function(ev){
      var notifyBtn = ev.target && ev.target.closest ? ev.target.closest('#pollen-view [data-pollen-notify]') : null;
      if(notifyBtn){
        ev.preventDefault();
        ev.stopPropagation();
        if(window.openNotifPanel) window.openNotifPanel();
        return;
      }
      var settingsBtn = ev.target && ev.target.closest ? ev.target.closest('#pollen-view [data-pollen-settings]') : null;
      if(settingsBtn){
        ev.preventDefault();
        ev.stopPropagation();
        if(window.openSettingsPanel) window.openSettingsPanel('dashboard');
        return;
      }
      var pick = ev.target && ev.target.closest ? ev.target.closest('#pollen-view [data-pollen-select]') : null;
      if(pick){
        ev.preventDefault();
        ev.stopPropagation();
        var cached = null;
        try{ cached = window.ChangeWeatherService && window.ChangeWeatherService.getCached ? window.ChangeWeatherService.getCached() : null; }catch(e){}
        var today = cached && cached.pollen && cached.pollen.forecast && cached.pollen.forecast[0] || null;
        if(today) toggleSelectedKey(today, pick.getAttribute('data-pollen-select') || '');
        else writeSelectedKeys([pick.getAttribute('data-pollen-select') || '']);
        render({preferCached:true, preserveScroll:true});
        return;
      }
      var edit = ev.target && ev.target.closest ? ev.target.closest('#pollen-view [data-pollen-edit]') : null;
      if(edit){
        ev.preventDefault();
        ev.stopPropagation();
        var mode = edit.getAttribute('data-pollen-edit') || '';
        writeEditMode(readEditMode() === mode ? '' : mode);
        render({preferCached:true, preserveScroll:true});
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
