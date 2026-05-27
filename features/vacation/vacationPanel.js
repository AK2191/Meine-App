(function(){
  'use strict';

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function totalDays(){
    try{ if(typeof window.getUrlaubTotalDays === 'function') return parseFloat(window.getUrlaubTotalDays()) || 30; }catch(e){}
    try{ return parseFloat(localStorage.getItem('urlaub_tracker_days') || '30') || 30; }catch(e){ return 30; }
  }
  function halfDays(){
    try{ if(typeof window.getUrlaubHalfDays === 'function') return (window.getUrlaubHalfDays() || []).slice().sort(); }catch(e){}
    try{ return (JSON.parse(localStorage.getItem('urlaub_half_days') || '[]') || []).map(normalizeHalfDay).filter(Boolean).sort(); }catch(e){ return []; }
  }
  function normalizeHalfDay(value){
    value = String(value || '').trim();
    if(/^\d{2}-\d{2}$/.test(value)) return value;
    if(/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(5);
    return value;
  }
  function isHalfDay(dateStr){ return halfDays().indexOf(String(dateStr).slice(5)) !== -1; }
  function toKey(value){
    if(!value) return '';
    if(value instanceof Date){ return value.getFullYear() + '-' + String(value.getMonth()+1).padStart(2,'0') + '-' + String(value.getDate()).padStart(2,'0'); }
    return String(value).slice(0,10);
  }
  function addDays(dateStr, amount){
    var d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + amount);
    return toKey(d);
  }
  function rangeOf(ev){
    var start = toKey(ev && (ev.startDate || ev.fromDate || ev.date || (ev.start && (ev.start.date || ev.start.dateTime))));
    if(!start) return null;
    var end = toKey(ev.endDate || ev.toDate || ev.untilDate || (ev.end && (ev.end.date || ev.end.dateTime)) || start);
    if(ev.source === 'google' && ev.end && ev.end.date && !ev.end.dateTime && end > start) end = addDays(end, -1);
    if(end < start) end = start;
    return {start:start, end:end};
  }
  function titleOf(ev){ return String((ev && (ev.title || ev.summary || ev.name)) || 'Urlaub').trim() || 'Urlaub'; }
  function allEvents(){
    try{ if(typeof window.getAllEvents === 'function') return window.getAllEvents() || []; }catch(e){}
    return window.events || [];
  }
  function isWeekend(dateStr){
    var d = new Date(dateStr + 'T12:00:00');
    var day = d.getDay();
    return day === 0 || day === 6;
  }
  function isHoliday(dateStr){
    try{ return typeof window.getHolidaysForDate === 'function' && (window.getHolidaysForDate(dateStr) || []).length > 0; }catch(e){ return false; }
  }
  function forEachWorkday(start, end, cb){
    var d = new Date(start + 'T12:00:00');
    var last = new Date(end + 'T12:00:00');
    while(d <= last){
      var key = toKey(d);
      if(!isWeekend(key) && !isHoliday(key)) cb(key);
      d.setDate(d.getDate() + 1);
    }
  }
  function countCalendarDays(start, end){
    var first = new Date(start + 'T12:00:00');
    var last = new Date(end + 'T12:00:00');
    if(isNaN(first) || isNaN(last) || last < first) return 0;
    return Math.round((last - first) / 86400000) + 1;
  }
  function dayValue(dateStr){ return isHalfDay(dateStr) ? 0.5 : 1; }
  function fmtNumber(value){
    var n = Math.round((Number(value) || 0) * 2) / 2;
    return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
  }
  function fmtDate(dateStr){
    try{ return new Date(dateStr + 'T12:00:00').toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'}); }
    catch(e){ return dateStr; }
  }
  function fmtRange(start, end){ return start === end ? fmtDate(start) : fmtDate(start) + ' – ' + fmtDate(end); }
  function eventsForYear(year){
    var yearStart = year + '-01-01';
    var yearEnd = year + '-12-31';
    var seen = new Set();
    return allEvents().filter(function(ev){
      var title = titleOf(ev).toLowerCase();
      if(title.indexOf('urlaub') === -1) return false;
      var r = rangeOf(ev);
      if(!r || r.end < yearStart || r.start > yearEnd) return false;
      var key = title + '|' + r.start + '|' + r.end;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(function(ev){
      var r = rangeOf(ev);
      var start = r.start < yearStart ? yearStart : r.start;
      var end = r.end > yearEnd ? yearEnd : r.end;
      var days = 0;
      forEachWorkday(start, end, function(day){ days += dayValue(day); });
      return {title:titleOf(ev), start:start, end:end, days:days, calendarDays:countCalendarDays(start, end), raw:ev};
    }).sort(function(a,b){ return a.start.localeCompare(b.start) || a.title.localeCompare(b.title); });
  }
  function plannedDays(year, rows){
    var dayMap = {};
    rows.forEach(function(row){
      forEachWorkday(row.start, row.end, function(day){ dayMap[day] = dayValue(day); });
    });
    halfDays().forEach(function(mmdd){
      var day = year + '-' + normalizeHalfDay(mmdd);
      if(/^\d{4}-\d{2}-\d{2}$/.test(day) && !isWeekend(day) && !isHoliday(day)) dayMap[day] = 0.5;
    });
    return Object.keys(dayMap).reduce(function(sum, key){ return sum + dayMap[key]; }, 0);
  }
  function rowStatus(row, today){
    if(row.start <= today && row.end >= today) return {label:'Aktuell', cls:'now'};
    if(row.end < today) return {label:'Vergangen', cls:'past'};
    return {label:'Kommend', cls:'future'};
  }
  function vacationRows(rows, today){
    if(!rows.length) return '<div class="change-vacation-empty">Noch keine Urlaubs-Einträge gefunden.<br><small>Tipp: Der Terminname muss „Urlaub“ enthalten.</small></div>';
    return '<div class="change-vacation-list">' + rows.map(function(row){
      var st = rowStatus(row, today);
      var dayText = row.days === 0.5 ? '½ Urlaubstag' : row.days === 1 ? '1 Urlaubstag' : fmtNumber(row.days) + ' Urlaubstage';
      var calText = row.calendarDays && row.calendarDays !== row.days
        ? (row.calendarDays === 1 ? '1 Kalendertag' : row.calendarDays + ' Kalendertage')
        : '';
      return '<div class="change-vacation-row '+esc(st.cls)+'"><div class="change-vacation-row-icon">🏖️</div><div class="change-vacation-main"><div class="change-vacation-title">'+esc(row.title)+'</div><div class="change-vacation-date">'+esc(fmtRange(row.start, row.end))+'</div></div><div class="change-vacation-side"><span>'+esc(st.label)+'</span><strong>'+esc(dayText)+'</strong>'+(calText?'<small>'+esc(calText)+'</small>':'')+'</div></div>';
    }).join('') + '</div>';
  }
  function halfDayHtml(year){
    var list = halfDays();
    if(!list.length) return '';
    return '<div class="change-vacation-section"><div class="change-vacation-section-title">Halbe Urlaubstage</div><div class="change-vacation-halfdays">' + list.map(function(mmdd){
      var dk = year + '-' + normalizeHalfDay(mmdd);
      return '<span class="change-vacation-halfday"><strong>'+esc(fmtDate(dk))+'</strong><small>½ Tag</small></span>';
    }).join('') + '</div></div>';
  }
  function openUrlaubPanel(){
    var year = new Date().getFullYear();
    var today = toKey(new Date());
    var rows = eventsForYear(year);
    var total = totalDays();
    var planned = plannedDays(year, rows);
    var remaining = total - planned;
    var pct = total > 0 ? Math.max(0, Math.min(100, Math.round(planned / total * 100))) : 0;
    var remainingClass = remaining < 0 ? 'bad' : remaining <= 3 ? 'warn' : 'ok';
    var summary = '<div class="change-vacation-panel"><div class="change-vacation-summary"><div><strong>'+esc(fmtNumber(planned))+'</strong><span>Verplant</span></div><div class="'+remainingClass+'"><strong>'+esc(fmtNumber(remaining))+'</strong><span>Frei</span></div><div><strong>'+esc(fmtNumber(total))+'</strong><span>Jahresurlaub</span></div></div><div class="change-vacation-progress"><span style="width:'+pct+'%"></span></div><div class="change-vacation-caption">'+esc(fmtNumber(planned))+' von '+esc(fmtNumber(total))+' Urlaubstagen verplant</div>';
    var body = summary + '<div class="change-vacation-section"><div class="change-vacation-section-title">Urlaube '+year+'</div>' + vacationRows(rows, today) + '</div>' + halfDayHtml(year) + '<div class="change-vacation-note">Gezählt werden Urlaubstage: Wochenenden und gesetzliche Feiertage zählen nicht. Bei Zeitraum-Einträgen zeigen wir zusätzlich die Kalendertage.</div></div>';
    if(typeof window.openPanel === 'function') window.openPanel('🏖️ Urlaub ' + year, body);
  }

  window.ChangeVacationPanel = { open: openUrlaubPanel, eventsForYear: eventsForYear, plannedDays: plannedDays };
  window.openUrlaubPanel = openUrlaubPanel;
})();
