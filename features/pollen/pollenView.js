(function(){
  'use strict';

  var Store = window.ChangeWeatherStore;
  var Service = window.ChangeWeatherService;
  var APP_VERSION = '0.1.0256';
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
    // Stil: klare, erkennbare Linien — minimalistisch aber botanisch treffend.
    // Wenige Striche, passend zum App-Design. Stroke-only mit leichten Fill-Akzenten.
    var map = {

      // Gräser: 3 Halme unterschiedlicher Höhe mit gebogenen Ähren-Spitzen
      grass_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        +'<path d="M8 21V10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
        +'<path d="M12 21V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
        +'<path d="M16 21V11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
        +'<path d="M8 10 Q6.5 7.5 7 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>'
        +'<path d="M12 7 Q10.5 4.5 11 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>'
        +'<path d="M16 11 Q14.5 8.5 15 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>'
        +'</svg></span>',

      // Birke: schlanker Stamm, zwei Äste, runde Krone, Andeutung Kätzchen
      birch_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        +'<path d="M12 21V14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
        +'<path d="M12 17 Q9.5 15 7.5 12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>'
        +'<path d="M12 15 Q14.5 13 16.5 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>'
        +'<ellipse cx="12" cy="8.5" rx="5" ry="4.5" stroke="currentColor" stroke-width="1.4" fill="currentColor" fill-opacity=".13"/>'
        +'<path d="M7.5 12 Q7 14 6.5 16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".6"/>'
        +'<path d="M16.5 10 Q17 12 17.5 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".6"/>'
        +'</svg></span>',

      // Ambrosia: Stängel, 2 Seitentriebe, 3 kleine runde Blütenköpfe
      ragweed_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        +'<path d="M12 21V15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
        +'<path d="M12 18 L8.5 14.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
        +'<path d="M12 18 L15.5 14.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
        +'<path d="M12 15 L12 11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
        +'<circle cx="12" cy="9.5" r="2.2" stroke="currentColor" stroke-width="1.4" fill="currentColor" fill-opacity=".16"/>'
        +'<circle cx="8" cy="13.5" r="1.6" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity=".13"/>'
        +'<circle cx="16" cy="13.5" r="1.6" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity=".13"/>'
        +'</svg></span>',

      // Beifuss: zentraler Stengel mit symmetrischen Blattpaaren
      mugwort_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        +'<path d="M12 21V5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
        +'<path d="M12 17 Q9 15.5 7.5 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>'
        +'<path d="M12 17 Q15 15.5 16.5 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>'
        +'<path d="M12 13 Q9 11.5 7.5 9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>'
        +'<path d="M12 13 Q15 11.5 16.5 9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>'
        +'<path d="M12 9 Q10 8 9 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".65"/>'
        +'<path d="M12 9 Q14 8 15 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".65"/>'
        +'</svg></span>',

      // Erle: waagrechter Ast mit zwei hängenden Kaetzchen (Ellipsen-Kette)
      alder_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        +'<path d="M4 9 Q9 7 12 9 Q15 11 20 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>'
        +'<path d="M8.5 9 Q8 13 7.5 17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>'
        +'<path d="M15.5 9 Q16 13 16.5 17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>'
        +'<ellipse cx="8.2" cy="11.5" rx="1.9" ry="1" stroke="currentColor" stroke-width="1.1" fill="currentColor" fill-opacity=".18" transform="rotate(-8 8.2 11.5)"/>'
        +'<ellipse cx="7.8" cy="14.2" rx="1.9" ry="1" stroke="currentColor" stroke-width="1.1" fill="currentColor" fill-opacity=".15" transform="rotate(-5 7.8 14.2)"/>'
        +'<ellipse cx="15.8" cy="11.5" rx="1.9" ry="1" stroke="currentColor" stroke-width="1.1" fill="currentColor" fill-opacity=".18" transform="rotate(8 15.8 11.5)"/>'
        +'<ellipse cx="16.2" cy="14.2" rx="1.9" ry="1" stroke="currentColor" stroke-width="1.1" fill="currentColor" fill-opacity=".15" transform="rotate(5 16.2 14.2)"/>'
        +'</svg></span>',

      // Olive: runde dichte Krone auf kurzem Stamm, zwei ovale Fruechte darunter
      olive_pollen:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        +'<path d="M12 21V15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
        +'<circle cx="12" cy="10" r="5.5" stroke="currentColor" stroke-width="1.4" fill="currentColor" fill-opacity=".13"/>'
        +'<path d="M9.5 11.5 Q11 9.5 12.5 8" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity=".4" fill="none"/>'
        +'<ellipse cx="9.5" cy="16" rx="1.4" ry="2" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity=".28"/>'
        +'<ellipse cx="14.5" cy="16" rx="1.4" ry="2" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity=".28"/>'
        +'</svg></span>',

      // Fallback: geschwungenes Blatt mit Mittelrippe
      leaf:'<span class="pollen-neo-icon-svg"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        +'<path d="M17 3C10 3.5 5.5 9 5.5 15c0 2 .5 3.2 1.5 4 1 .7 2.3.7 3.8.1C15.5 17.4 18 12 18 3.2c0-.2-.1-.2-.1-.2Z" stroke="currentColor" stroke-width="1.4" fill="currentColor" fill-opacity=".15"/>'
        +'<path d="M8.5 18C10 15.5 12.5 13.5 15 12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".5"/>'
        +'</svg></span>'
    };
    return map[kind] || map.leaf;
  }

  /* Große Hero-Illustration — je nach dominantem Pollentyp */
  function heroArtSvg(dominantKey){
    var illustrations = {

      // Gräser: großes Grasfeld mit mehreren Halmen
      grass_pollen: '<svg class="pollen-neo-hero-illustration" viewBox="0 0 220 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
        +'<defs>'
        +'<linearGradient id="ph-blade" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1a3a10"/><stop offset="1" stop-color="#7cb832"/></linearGradient>'
        +'<linearGradient id="ph-blade2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1a3a10"/><stop offset="1" stop-color="#9dcc45"/></linearGradient>'
        +'</defs>'
        // Hintergrund-Halme (dünn, weiter weg)
        +'<path d="M55 195C50 160 35 110 30 95" stroke="url(#ph-blade)" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".45"/>'
        +'<path d="M55 195C58 155 65 115 62 85" stroke="url(#ph-blade)" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".4"/>'
        +'<path d="M165 195C170 160 185 110 190 90" stroke="url(#ph-blade)" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".4"/>'
        +'<path d="M165 195C162 155 155 115 158 82" stroke="url(#ph-blade)" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".38"/>'
        // Vordergrund-Haupthalme (kräftig)
        +'<path d="M110 200C98 148 72 96 68 80" stroke="url(#ph-blade2)" stroke-width="7.5" stroke-linecap="round" fill="none"/>'
        +'<path d="M110 200C114 140 124 72 128 48" stroke="url(#ph-blade2)" stroke-width="7.5" stroke-linecap="round" fill="none"/>'
        +'<path d="M110 200C128 152 160 102 166 88" stroke="url(#ph-blade2)" stroke-width="7.5" stroke-linecap="round" fill="none"/>'
        +'<path d="M110 200C94 156 88 118 86 78" stroke="url(#ph-blade2)" stroke-width="6.5" stroke-linecap="round" fill="none" opacity=".8"/>'
        +'<path d="M110 200C142 158 154 126 158 88" stroke="url(#ph-blade2)" stroke-width="6.5" stroke-linecap="round" fill="none" opacity=".75"/>'
        +'<path d="M110 200C82 164 56 134 42 115" stroke="url(#ph-blade2)" stroke-width="5.5" stroke-linecap="round" fill="none" opacity=".7"/>'
        // Pollenkörner (kleine Kreise um die Ähren)
        +'<circle cx="68" cy="80" r="5" fill="#9dcc45" opacity=".55"/>'
        +'<circle cx="128" cy="48" r="5" fill="#9dcc45" opacity=".55"/>'
        +'<circle cx="166" cy="88" r="4.5" fill="#9dcc45" opacity=".5"/>'
        +'<circle cx="86" cy="78" r="4" fill="#9dcc45" opacity=".45"/>'
        +'<circle cx="158" cy="88" r="4" fill="#9dcc45" opacity=".45"/>'
        +'<circle cx="42" cy="115" r="3.5" fill="#9dcc45" opacity=".4"/>'
        // Pollenwolke
        +'<circle cx="100" cy="58" r="2.5" fill="#c8e870" opacity=".35"/>'
        +'<circle cx="118" cy="42" r="2" fill="#c8e870" opacity=".3"/>'
        +'<circle cx="82" cy="68" r="2" fill="#c8e870" opacity=".28"/>'
        +'<circle cx="140" cy="72" r="2.2" fill="#c8e870" opacity=".3"/>'
        +'</svg>',

      // Birke: schlanker Baum mit hängenden Kätzchen
      birch_pollen: '<svg class="pollen-neo-hero-illustration" viewBox="0 0 220 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
        +'<defs>'
        +'<linearGradient id="ph-birch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8dc43e"/><stop offset="1" stop-color="#3a7a1a"/></linearGradient>'
        +'</defs>'
        // Stamm (typisch Birke: schlank, leicht geschwungen)
        +'<path d="M110 200 q4-30 2-80 q-3-40 4-100" stroke="#e8e8e8" stroke-width="9" stroke-linecap="round" fill="none" opacity=".18"/>'
        +'<path d="M110 200 q4-30 2-80 q-3-40 4-100" stroke="#5a7a3a" stroke-width="7" stroke-linecap="round" fill="none" opacity=".5"/>'
        // Markante schwarze Flecken der Birkenrinde (ellipsen)
        +'<ellipse cx="112" cy="150" rx="4" ry="2.5" fill="rgba(0,0,0,.25)" transform="rotate(-5 112 150)"/>'
        +'<ellipse cx="109" cy="130" rx="3.5" ry="2" fill="rgba(0,0,0,.2)" transform="rotate(3 109 130)"/>'
        +'<ellipse cx="113" cy="110" rx="3" ry="1.8" fill="rgba(0,0,0,.18)"/>'
        // Haupt-Äste
        +'<path d="M112 80 q-20-8 -40-25" stroke="#5a7a3a" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>'
        +'<path d="M113 70 q18-10 36-28" stroke="#5a7a3a" stroke-width="5" stroke-linecap="round" fill="none" opacity=".65"/>'
        +'<path d="M111 95 q-30-5 -45-15" stroke="#5a7a3a" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/>'
        +'<path d="M113 90 q28-2 44-10" stroke="#5a7a3a" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55"/>'
        // Laubkrone — Birkenblätter (kleine dreieckige Formen)
        +'<ellipse cx="80" cy="50" rx="28" ry="22" fill="url(#ph-birch)" opacity=".35"/>'
        +'<ellipse cx="145" cy="44" rx="26" ry="20" fill="url(#ph-birch)" opacity=".32"/>'
        +'<ellipse cx="72" cy="80" rx="22" ry="17" fill="url(#ph-birch)" opacity=".28"/>'
        +'<ellipse cx="155" cy="78" rx="22" ry="17" fill="url(#ph-birch)" opacity=".26"/>'
        +'<ellipse cx="110" cy="38" rx="20" ry="18" fill="url(#ph-birch)" opacity=".3"/>'
        // Kätzchen hängend (typisches Merkmal!)
        +'<path d="M75 55 q-2 8 -2 20" stroke="#8dc43e" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/>'
        +'<path d="M80 58 q0 10 1 22" stroke="#8dc43e" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55"/>'
        +'<path d="M148 50 q2 8 2 20" stroke="#8dc43e" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/>'
        +'<path d="M143 53 q0 10 -1 22" stroke="#8dc43e" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55"/>'
        // Pollenwolke
        +'<circle cx="72" cy="76" r="3" fill="#c8e870" opacity=".4"/>'
        +'<circle cx="60" cy="68" r="2.5" fill="#c8e870" opacity=".35"/>'
        +'<circle cx="152" cy="72" r="3" fill="#c8e870" opacity=".38"/>'
        +'<circle cx="164" cy="64" r="2.5" fill="#c8e870" opacity=".32"/>'
        +'<circle cx="94" cy="34" r="2" fill="#c8e870" opacity=".3"/>'
        +'</svg>',

      // Ambrosia/Ragweed: kompakte Blütenstände
      ragweed_pollen: '<svg class="pollen-neo-hero-illustration" viewBox="0 0 220 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
        +'<defs>'
        +'<linearGradient id="ph-rag" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2a5a10"/><stop offset="1" stop-color="#8ab830"/></linearGradient>'
        +'</defs>'
        // Hauptstängel
        +'<path d="M110 205 q0-30 2-80 q2-30 -2-80" stroke="url(#ph-rag)" stroke-width="7" stroke-linecap="round" fill="none"/>'
        // Seitentriebe
        +'<path d="M110 170 q-25-5 -40-20" stroke="url(#ph-rag)" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/>'
        +'<path d="M110 170 q25-5 40-20" stroke="url(#ph-rag)" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/>'
        +'<path d="M110 140 q-28-3 -45-18" stroke="url(#ph-rag)" stroke-width="4.5" stroke-linecap="round" fill="none" opacity=".7"/>'
        +'<path d="M110 140 q28-3 45-18" stroke="url(#ph-rag)" stroke-width="4.5" stroke-linecap="round" fill="none" opacity=".7"/>'
        +'<path d="M111 110 q-22-5 -36-20" stroke="url(#ph-rag)" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/>'
        +'<path d="M111 110 q22-5 36-20" stroke="url(#ph-rag)" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/>'
        // Blütenköpfe: sternförmige Strahlenblüten
        +'<circle cx="110" cy="45" r="14" fill="rgba(138,184,48,.15)" stroke="#8ab830" stroke-width="1.5"/>'
        +'<path d="M110 31V25M110 59V65M96 45H90M124 45H130M99.5 34.5 95.5 30.5M120.5 34.5 124.5 30.5M99.5 55.5 95.5 59.5M120.5 55.5 124.5 59.5" stroke="#8ab830" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>'
        +'<circle cx="110" cy="45" r="7" fill="#8ab830" opacity=".55"/>'
        +'<circle cx="70" cy="148" r="10" fill="rgba(138,184,48,.18)" stroke="#8ab830" stroke-width="1.2" opacity=".7"/>'
        +'<circle cx="70" cy="148" r="5" fill="#8ab830" opacity=".4"/>'
        +'<circle cx="150" cy="148" r="10" fill="rgba(138,184,48,.18)" stroke="#8ab830" stroke-width="1.2" opacity=".7"/>'
        +'<circle cx="150" cy="148" r="5" fill="#8ab830" opacity=".4"/>'
        +'<circle cx="65" cy="120" r="8" fill="rgba(138,184,48,.15)" stroke="#8ab830" stroke-width="1.2" opacity=".65"/>'
        +'<circle cx="65" cy="120" r="4" fill="#8ab830" opacity=".35"/>'
        +'<circle cx="155" cy="120" r="8" fill="rgba(138,184,48,.15)" stroke="#8ab830" stroke-width="1.2" opacity=".65"/>'
        +'<circle cx="155" cy="120" r="4" fill="#8ab830" opacity=".35"/>'
        // Pollenwolke
        +'<circle cx="92" cy="36" r="2.5" fill="#c8e870" opacity=".4"/>'
        +'<circle cx="130" cy="32" r="2.5" fill="#c8e870" opacity=".38"/>'
        +'<circle cx="110" cy="28" r="2" fill="#c8e870" opacity=".35"/>'
        +'</svg>',

      // Beifuß/Mugwort: verzweigter Strauch
      mugwort_pollen: '<svg class="pollen-neo-hero-illustration" viewBox="0 0 220 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
        +'<defs>'
        +'<linearGradient id="ph-mug" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2e5a18"/><stop offset="1" stop-color="#7aaa2a"/></linearGradient>'
        +'</defs>'
        // Stamm
        +'<path d="M110 210 q-2-30 0-60 q3-40 0-90" stroke="url(#ph-mug)" stroke-width="7" stroke-linecap="round" fill="none"/>'
        // Federige Blätter — typisch Beifuß: tief eingeschnitten
        +'<path d="M110 150 c-18-8 -36-10 -40-8 2 14 14 22 40 18" fill="url(#ph-mug)" opacity=".3"/>'
        +'<path d="M110 150 c18-8 36-10 40-8-2 14-14 22-40 18" fill="url(#ph-mug)" opacity=".32"/>'
        +'<path d="M110 125 c-20-6 -38-8 -42-5 1 16 14 24 42 16" fill="url(#ph-mug)" opacity=".28"/>'
        +'<path d="M110 125 c20-6 38-8 42-5-1 16-14 24-42 16" fill="url(#ph-mug)" opacity=".3"/>'
        +'<path d="M110 100 c-18-5 -34-6 -38-3 2 14 14 20 38 12" fill="url(#ph-mug)" opacity=".26"/>'
        +'<path d="M110 100 c18-5 34-6 38-3-2 14-14 20-38 12" fill="url(#ph-mug)" opacity=".28"/>'
        +'<path d="M110 78 c-15-4 -28-5 -30-2 1 10 10 16 30 10" fill="url(#ph-mug)" opacity=".32"/>'
        +'<path d="M110 78 c15-4 28-5 30-2-1 10-10 16-30 10" fill="url(#ph-mug)" opacity=".35"/>'
        // Blütenähre oben
        +'<path d="M110 60 q-6-10 -8-24 q8 2 8 24Z" fill="#7aaa2a" opacity=".55"/>'
        +'<path d="M110 60 q6-10 8-24 q-8 2 -8 24Z" fill="#7aaa2a" opacity=".5"/>'
        +'<ellipse cx="110" cy="38" rx="5" ry="12" fill="#5a8a20" opacity=".45"/>'
        // Blütenähren-Details (kleine Blattzungen)
        +'<path d="M106 50 q-5-3 -8-8" stroke="#7aaa2a" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>'
        +'<path d="M114 50 q5-3 8-8" stroke="#7aaa2a" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>'
        +'<path d="M105 42 q-4-2 -6-6" stroke="#7aaa2a" stroke-width="1.3" stroke-linecap="round" opacity=".4"/>'
        +'<path d="M115 42 q4-2 6-6" stroke="#7aaa2a" stroke-width="1.3" stroke-linecap="round" opacity=".4"/>'
        // Pollenwolke
        +'<circle cx="95" cy="32" r="2.5" fill="#c0d860" opacity=".38"/>'
        +'<circle cx="125" cy="30" r="2" fill="#c0d860" opacity=".34"/>'
        +'<circle cx="82" cy="46" r="2" fill="#c0d860" opacity=".3"/>'
        +'<circle cx="138" cy="44" r="2" fill="#c0d860" opacity=".3"/>'
        +'</svg>',

      // Erle/Alder: Baum mit hängenden Kätzchen, Wintersilhouette
      alder_pollen: '<svg class="pollen-neo-hero-illustration" viewBox="0 0 220 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
        +'<defs>'
        +'<linearGradient id="ph-alder" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ab82e"/><stop offset="1" stop-color="#2a5a12"/></linearGradient>'
        +'</defs>'
        // Stamm
        +'<path d="M110 210 q2-25 1-55 q-2-35 2-80" stroke="#4a7a22" stroke-width="9" stroke-linecap="round" fill="none"/>'
        // Äste
        +'<path d="M111 120 q-22-8 -45-28" stroke="#4a7a22" stroke-width="6" stroke-linecap="round" fill="none" opacity=".8"/>'
        +'<path d="M112 110 q20-10 42-30" stroke="#4a7a22" stroke-width="6" stroke-linecap="round" fill="none" opacity=".75"/>'
        +'<path d="M110 90 q-28-5 -50-18" stroke="#4a7a22" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>'
        +'<path d="M112 85 q26-6 48-20" stroke="#4a7a22" stroke-width="5" stroke-linecap="round" fill="none" opacity=".65"/>'
        +'<path d="M111 68 q-15-5 -28-20" stroke="#4a7a22" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/>'
        +'<path d="M112 65 q15-6 28-22" stroke="#4a7a22" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55"/>'
        // Laubkrone
        +'<ellipse cx="72" cy="90" rx="26" ry="20" fill="url(#ph-alder)" opacity=".3"/>'
        +'<ellipse cx="150" cy="80" rx="25" ry="19" fill="url(#ph-alder)" opacity=".28"/>'
        +'<ellipse cx="65" cy="65" rx="22" ry="17" fill="url(#ph-alder)" opacity=".26"/>'
        +'<ellipse cx="156" cy="60" rx="22" ry="17" fill="url(#ph-alder)" opacity=".24"/>'
        +'<ellipse cx="85" cy="48" rx="20" ry="16" fill="url(#ph-alder)" opacity=".28"/>'
        +'<ellipse cx="136" cy="44" rx="20" ry="16" fill="url(#ph-alder)" opacity=".26"/>'
        // Kätzchen — das Aushängeschild der Erle!
        +'<path d="M68 96 q-1 12 -2 26" stroke="#7ab82e" stroke-width="5" stroke-linecap="round" fill="none"/>'
        +'<circle cx="67.5" cy="100" r="3" fill="#5a9820" opacity=".6"/>'
        +'<circle cx="67" cy="106" r="3.2" fill="#5a9820" opacity=".6"/>'
        +'<circle cx="66.5" cy="112" r="3.2" fill="#5a9820" opacity=".58"/>'
        +'<circle cx="66" cy="118" r="3" fill="#5a9820" opacity=".52"/>'
        +'<path d="M76 100 q0 10 0 22" stroke="#7ab82e" stroke-width="5" stroke-linecap="round" fill="none"/>'
        +'<circle cx="76" cy="104" r="3" fill="#5a9820" opacity=".58"/>'
        +'<circle cx="76" cy="110" r="3.2" fill="#5a9820" opacity=".58"/>'
        +'<circle cx="76" cy="116" r="3" fill="#5a9820" opacity=".5"/>'
        +'<path d="M148 86 q1 12 2 26" stroke="#7ab82e" stroke-width="5" stroke-linecap="round" fill="none"/>'
        +'<circle cx="148.5" cy="90" r="3" fill="#5a9820" opacity=".6"/>'
        +'<circle cx="149" cy="96" r="3.2" fill="#5a9820" opacity=".6"/>'
        +'<circle cx="149.5" cy="102" r="3.2" fill="#5a9820" opacity=".58"/>'
        +'<circle cx="150" cy="108" r="3" fill="#5a9820" opacity=".52"/>'
        // Pollenwolke
        +'<circle cx="52" cy="90" r="3" fill="#b8d840" opacity=".38"/>'
        +'<circle cx="44" cy="100" r="2.5" fill="#b8d840" opacity=".34"/>'
        +'<circle cx="170" cy="86" r="3" fill="#b8d840" opacity=".36"/>'
        +'<circle cx="178" cy="96" r="2.5" fill="#b8d840" opacity=".32"/>'
        +'</svg>',

      // Olive: südlicher Baum mit dichter silbrig-grüner Krone
      olive_pollen: '<svg class="pollen-neo-hero-illustration" viewBox="0 0 220 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
        +'<defs>'
        +'<linearGradient id="ph-olive" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a0b855"/><stop offset="1" stop-color="#3a6a20"/></linearGradient>'
        +'<radialGradient id="ph-olive-crown" cx="50%" cy="40%" r="55%"><stop offset="0" stop-color="#8aa840" stop-opacity=".5"/><stop offset="1" stop-color="#2a5a10" stop-opacity=".3"/></radialGradient>'
        +'</defs>'
        // Stamm (Olivenbaum: knorrig, gedreht)
        +'<path d="M108 210 q-4-20 -2-50 q3-20 0-40 q-4-15 4-40" stroke="#5a6830" stroke-width="10" stroke-linecap="round" fill="none"/>'
        // Knorrigkeit
        +'<path d="M109 160 q8-5 10-15" stroke="#4a5825" stroke-width="6" stroke-linecap="round" fill="none" opacity=".5"/>'
        +'<path d="M107 140 q-8-4 -8-12" stroke="#4a5825" stroke-width="5" stroke-linecap="round" fill="none" opacity=".45"/>'
        // Dichte Krone (Olive: buschig, oval)
        +'<ellipse cx="110" cy="90" rx="62" ry="55" fill="url(#ph-olive-crown)"/>'
        +'<ellipse cx="110" cy="80" rx="50" ry="44" fill="url(#ph-olive)" opacity=".18"/>'
        // Silbrig-grüne Blätter (Olive: schmale Lanzettblätter)
        +'<path d="M80 70 q8-15 12-25 q4 10 -2 25" fill="#8aa840" opacity=".35"/>'
        +'<path d="M140 65 q-6-14 -10-23 q-4 9 2 23" fill="#8aa840" opacity=".32"/>'
        +'<path d="M95 55 q4-16 6-26 q5 10 -1 26" fill="#8aa840" opacity=".3"/>'
        +'<path d="M128 50 q-3-15 -5-25 q-5 10 1 25" fill="#8aa840" opacity=".28"/>'
        +'<path d="M110 50 q0-16 0-28 q6 8 0 28" fill="#8aa840" opacity=".32"/>'
        // Oliven-Früchte (grün-schwarz, sehr charakteristisch)
        +'<ellipse cx="78" cy="100" rx="5" ry="7" fill="#2a4a18" opacity=".65"/>'
        +'<ellipse cx="78" cy="100" rx="3" ry="5" fill="#3a6a22" opacity=".5"/>'
        +'<ellipse cx="142" cy="95" rx="5" ry="7" fill="#2a4a18" opacity=".62"/>'
        +'<ellipse cx="142" cy="95" rx="3" ry="5" fill="#3a6a22" opacity=".48"/>'
        +'<ellipse cx="92" cy="112" rx="4.5" ry="6.5" fill="#2a4a18" opacity=".58"/>'
        +'<ellipse cx="130" cy="108" rx="4.5" ry="6.5" fill="#2a4a18" opacity=".55"/>'
        +'<ellipse cx="110" cy="118" rx="5" ry="7" fill="#2a4a18" opacity=".6"/>'
        // Blütenähren (klein, unauffällig bei Olive)
        +'<path d="M88 72 q-3-8 -2-14" stroke="#c8c840" stroke-width="2" stroke-linecap="round" opacity=".4"/>'
        +'<path d="M133 68 q3-8 2-14" stroke="#c8c840" stroke-width="2" stroke-linecap="round" opacity=".38"/>'
        // Pollenwolke
        +'<circle cx="65" cy="75" r="3" fill="#d0d850" opacity=".35"/>'
        +'<circle cx="56" cy="85" r="2.5" fill="#d0d850" opacity=".3"/>'
        +'<circle cx="162" cy="72" r="3" fill="#d0d850" opacity=".33"/>'
        +'<circle cx="170" cy="82" r="2.5" fill="#d0d850" opacity=".28"/>'
        +'</svg>'
    };

    // Fallback: Gräser-SVG
    return illustrations[dominantKey] || illustrations.grass_pollen;
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
    // Hero-Illustration: ausgewählten Typ priorisieren (Nutzerauswahl gewinnt),
    // Fallback auf höchsten Messwert, dann Gräser als Default.
    var _selKeys = Array.isArray(selectedKeys) ? selectedKeys : [];
    var _selItem = _selKeys.length > 0 ? itemByKey(today, _selKeys[0]) : null;
    var dominantKey = (_selItem && _selItem.key)
      ? String(_selItem.key)
      : ((topLoadItem && topLoadItem.key) ? String(topLoadItem.key) : 'grass_pollen');
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
        + heroArtSvg(dominantKey)
        + '<div class="pollen-neo-hero-stats pollen-neo-hero-stats-extended pollen-neo-hero-insights">'
          + '<div class="pollen-hero-insight"><span class="dot yellow"></span><strong>'+esc((topLoadItem && topLoadItem.name) || 'Pollen')+' '+esc(levelLabel(topLoadItem && topLoadItem.level))+'</strong><em>'+esc(topLoadScore)+' %</em></div>'
          + '<div class="pollen-hero-insight"><span class="mark peak"></span><strong>Peak</strong><em>'+esc(peak ? diffLabel(dayDiff(peak.date)) : '–')+'</em></div>'
          + '<div class="pollen-hero-insight"><span class="mark leaf"></span><strong>Ruhigster Tag</strong><em>'+esc(quiet ? fmtLongDay(quiet.date).split(',')[0] : '–')+'</em></div>'
        + '</div>'
      + '</div>'
    + '</section>';
  }
  function profileHtml(today, selectedKeys){
    var items = itemsOf(today).slice().sort(function(a,b){
      return clampNum(b.value) - clampNum(a.value) || ((b.rank||0)-(a.rank||0));
    });
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
    var w = 720, h = 210, padL = 54, padR = 24, padT = 16, padB = 30;
    var usableW = w - padL - padR;
    var usableH = h - padT - padB;
    var yTicks = [100, 75, 50, 25];
    var yForValue = function(value){ return padT + usableH - (usableH * clampNum(value) / 100); };
    var xy = points.map(function(p, i){
      return {x:padL + (usableW * i / Math.max(1, points.length - 1)), y:yForValue(p.value), p:p};
    });
    var line = xy.map(function(p){ return Math.round(p.x)+','+Math.round(p.y); }).join(' ');
    var area = xy.length ? ('M '+xy[0].x+' '+(h-padB)+' L '+xy.map(function(p){ return Math.round(p.x)+' '+Math.round(p.y); }).join(' L ')+' L '+xy[xy.length-1].x+' '+(h-padB)+' Z') : '';
    var peak = xy.slice().sort(function(a,b){ return b.p.value - a.p.value; })[0];
    return '<div class="pollen-hourly-chart" aria-label="24-Stunden-Belastungskurve">'
      + '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Pollenbelastung über 24 Stunden">'
        + '<defs><linearGradient id="pollen-hourly-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f7d54a"/><stop offset=".58" stop-color="#fb923c"/><stop offset="1" stop-color="#ff6252"/></linearGradient><linearGradient id="pollen-hourly-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(251,146,60,.18)"/><stop offset="1" stop-color="rgba(251,146,60,0)"/></linearGradient></defs>'
        + '<g class="pollen-hourly-grid"><line x1="'+padL+'" y1="'+(padT+usableH*.25)+'" x2="'+(w-padR)+'" y2="'+(padT+usableH*.25)+'"/><line x1="'+padL+'" y1="'+(padT+usableH*.5)+'" x2="'+(w-padR)+'" y2="'+(padT+usableH*.5)+'"/><line x1="'+padL+'" y1="'+(padT+usableH*.75)+'" x2="'+(w-padR)+'" y2="'+(padT+usableH*.75)+'"/></g>'
        + '<g class="pollen-hourly-y">'+yTicks.map(function(value){ return '<text x="'+(padL-22)+'" y="'+Math.round(yForValue(value)+4)+'" text-anchor="end">'+value+'%</text>'; }).join('')+'</g>'
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
