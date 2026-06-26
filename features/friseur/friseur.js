/* Change App · Friseur
 * Eigenes Dashboard-Feature für Friseurtermine.
 * Nicht an settings-logic.js koppeln, damit der Dashboard-Punkt auch bleibt,
 * wenn Settings-Sync oder Firebase temporär nicht lädt.
 */
(function(){
  'use strict';
  if(window.ChangeFriseurFeature && window.ChangeFriseurFeature.loaded) return;

  const LS_KEY = 'change_v1_friseur_enabled';
  const LS_WEEKS = 'change_v1_friseur_weeks';
  const KEYWORD = 'friseur';

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>\"'`]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;','`':'&#96;'}[c];
    });
  }

  function readRaw(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
  function writeRaw(key, value){ try{ localStorage.setItem(key, value); }catch(e){} }
  function isEnabled(){
    const v = readRaw(LS_KEY);
    // Friseur ist ein bestehendes Dashboard-Feature. Ohne gespeicherte Einstellung bleibt es sichtbar.
    return v === null ? true : v === 'true';
  }
  function getWeeks(){ return parseInt(readRaw(LS_WEEKS)||'3',10)||3; }
  function pad2(n){ return String(n).padStart(2, '0'); }
  function todayKey(){
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }
  function dateFromKey(dateStr){ return new Date(String(dateStr || '') + 'T12:00:00'); }
  function calendarDiffDays(fromKey, toKey){
    var from = dateFromKey(fromKey);
    var to = dateFromKey(toKey);
    if(isNaN(from) || isNaN(to)) return null;
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }
  function daysSince(dateStr){
    var diff = calendarDiffDays(dateStr, todayKey());
    return diff === null ? 0 : Math.max(0, diff);
  }
  function relativeFriseurText(dateStr, mode){
    if(!dateStr) return '—';
    var diff = calendarDiffDays(todayKey(), dateStr);
    if(diff === null) return '—';
    if(diff === 0) return 'Heute';
    if(mode === 'past'){
      var pastDays = Math.abs(diff);
      return 'vor ' + pastDays + ' ' + (pastDays === 1 ? 'Tag' : 'Tagen');
    }
    if(diff < 0){
      var agoDays = Math.abs(diff);
      return 'vor ' + agoDays + ' ' + (agoDays === 1 ? 'Tag' : 'Tagen');
    }
    return 'in ' + diff + ' ' + (diff === 1 ? 'Tag' : 'Tagen');
  }
  function friseurSummaryMetric(dateStr, mode){
    if(!dateStr) return { value:'—', label: mode === 'next' ? 'Nächster' : 'Letzter' };
    var diff = mode === 'last' ? calendarDiffDays(dateStr, todayKey()) : calendarDiffDays(todayKey(), dateStr);
    if(diff === null) return { value:'—', label: mode === 'next' ? 'Nächster' : 'Letzter' };
    var days = Math.max(0, Math.abs(diff));
    if(days === 0) return { value:'0', label:'Heute' };
    if(mode === 'last') return { value:String(days), label: days === 1 ? 'Tag her' : 'Tage her' };
    return { value:String(days), label: days === 1 ? 'Tag bis' : 'Tage bis' };
  }
  function toDateKey(value){
    value = String(value || '');
    return value.length >= 10 ? value.slice(0,10) : '';
  }
  function eventDate(ev){
    if(!ev) return '';
    return toDateKey(ev.startDate || ev.date || ev.dateKey || (ev.start && (ev.start.date || ev.start.dateTime)) || '');
  }
  function eventTime(ev){
    if(!ev) return '';
    if(ev.time) return ev.time;
    if(ev.start && ev.start.dateTime){ try{ return new Date(ev.start.dateTime).toTimeString().slice(0,5); }catch(e){} }
    return '';
  }
  function eventEndTime(ev){
    if(!ev) return '';
    if(ev.endTime) return ev.endTime;
    if(ev.end && ev.end.dateTime){ try{ return new Date(ev.end.dateTime).toTimeString().slice(0,5); }catch(e){} }
    return '';
  }
  function eventEndDate(ev){
    if(!ev) return '';
    if(ev.endDate) return toDateKey(ev.endDate);
    if(ev.end && (ev.end.date || ev.end.dateTime)) return toDateKey(ev.end.date || ev.end.dateTime);
    return eventDate(ev);
  }
  function makeLocalDateTime(dateKey, time, fallback){
    if(!dateKey) return null;
    var t = String(time || '').trim();
    var m = t.match(/^(\d{1,2}):(\d{2})/);
    var iso = '';
    if(m){
      var h = Math.max(0, Math.min(23, parseInt(m[1],10) || 0));
      var min = Math.max(0, Math.min(59, parseInt(m[2],10) || 0));
      iso = dateKey + 'T' + pad2(h) + ':' + pad2(min) + ':00';
    } else {
      iso = dateKey + (fallback === 'end' ? 'T23:59:59' : 'T00:00:00');
    }
    var d = new Date(iso);
    return isNaN(d) ? null : d;
  }
  function friseurDateTimes(item){
    if(!item || !item.date) return { start:null, end:null };
    var start = makeLocalDateTime(item.date, item.time, 'start');
    var end = null;
    if(item.endTime){
      end = makeLocalDateTime(item.endDate || item.date, item.endTime, 'end');
    } else if(item.endDate && item.endDate !== item.date){
      var exclusiveEnd = new Date(item.endDate + 'T00:00:00');
      end = isNaN(exclusiveEnd) ? null : new Date(exclusiveEnd.getTime() - 1);
    } else if(item.time){
      end = start ? new Date(start.getTime()) : null;
    } else {
      end = makeLocalDateTime(item.date, '', 'end');
    }
    if(start && end && end < start) end = new Date(end.getTime() + 86400000);
    return { start:start, end:end };
  }
  function friseurTemporalState(item, now){
    now = now || new Date();
    var dt = friseurDateTimes(item);
    var running = !!(dt.start && dt.end && dt.start <= now && dt.end > now);
    var future = !!(dt.start && dt.start > now);
    var past = !!(dt.end && dt.end <= now);
    return { start:dt.start, end:dt.end, running:running, future:future, past:past };
  }
  function clockLabel(time){
    return time ? String(time) + ' Uhr' : '';
  }
  function lastDoneClock(item){
    return clockLabel((item && (item.endTime || item.time)) || '');
  }
  function isFriseur(title, desc){
    const t = String(title || '').toLowerCase();
    const d = String(desc || '').toLowerCase();
    return t.includes(KEYWORD) || d.includes(KEYWORD);
  }
  function eachFriseurEvent(fn){
    const seen = new Set();
    function add(ev, source){
      if(!ev) return;
      const title = ev.title || ev.summary || ev.name || 'Friseur-Termin';
      const desc = ev.desc || ev.description || '';
      if(!isFriseur(title, desc)) return;
      const date = eventDate(ev);
      if(!date) return;
      const key = [source, date, title, eventTime(ev)].join('|');
      if(seen.has(key)) return;
      seen.add(key);
      fn({
        id: String(ev.id || ev.googleEventId || [source, date, title, eventTime(ev)].join('_')),
        title: String(title || 'Friseur-Termin'),
        desc: String(desc || ''),
        description: String(desc || ''),
        location: String(ev.location || ev.place || ev.venue || ev.address || ''),
        date: date,
        startDate: date,
        time: eventTime(ev),
        endDate: eventEndDate(ev),
        endTime: eventEndTime(ev),
        source: source
      });
    }
    try{ (window.events || []).forEach(function(ev){ add(ev, 'local'); }); }catch(e){}
    try{ (window.gEvents || []).forEach(function(ev){ add(ev, 'google'); }); }catch(e){}
    try{
      if(typeof window.getAllEvents === 'function'){
        (window.getAllEvents() || []).forEach(function(ev){ add(ev, 'all'); });
      }
    }catch(e){}
  }
  function findLastFriseurInfo(){
    var now = new Date();
    var best = null;
    eachFriseurEvent(function(ev){
      var state = friseurTemporalState(ev, now);
      if(!state.past || !state.end) return;
      if(!best || state.end > best._endDateTime){
        ev._endDateTime = state.end;
        ev._startDateTime = state.start;
        best = ev;
      }
    });
    return best;
  }
  function findLastFriseur(){
    var best = findLastFriseurInfo();
    return best && best.date ? best.date : null;
  }
  function findNextFriseurInfo(){
    var now = new Date();
    var best = null;
    eachFriseurEvent(function(ev){
      var state = friseurTemporalState(ev, now);
      if(!(state.running || state.future) || !state.end) return;
      if(!best || state.start < best._startDateTime){
        ev._startDateTime = state.start;
        ev._endDateTime = state.end;
        ev._running = state.running;
        best = ev;
      }
    });
    return best;
  }
  function renderFriseurBanner(){
    if(typeof window.buildDashCards === 'function') window.buildDashCards();
    else if(typeof window.buildDashboard === 'function') window.buildDashboard();
  }
  function friseurNotifOn(){ try{ var r = readRaw('change_v1_friseur_notifications'); return (r == null || r === '') ? true : (r !== 'false' && r !== '0' && r !== false); }catch(e){ return true; } }
  function checkFriseurNotif(){
    if(!isEnabled()) return;
    if(!friseurNotifOn()) return;
    const lastDate = findLastFriseur();
    if(!lastDate) return;
    const days  = daysSince(lastDate);
    const weeks = getWeeks();
    if(days < weeks*7) return;
    const key = 'friseur_notif_'+lastDate;
    if(readRaw(key)) return;
    writeRaw(key, '1');
    if(typeof Notification !== 'undefined' && Notification.permission === 'granted' && 'serviceWorker' in navigator){
      try{
        navigator.serviceWorker.ready.then(function(reg){
          return reg.showNotification('✂️ Friseur-Erinnerung', {
            body: 'Dein letzter Friseur-Termin war vor '+days+' Tagen. Zeit für einen neuen Termin?',
            icon: './icons/icon-change-192.png',
            badge: './icons/icon-change-192.png',
            tag: 'change-friseur-'+lastDate
          });
        }).catch(function(){});
      }catch(e){}
    }
  }
  function fmtS(k){
    try{ return new Date(k+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'short'}); }catch(e){ return k; }
  }
  function findAllFriseurThisYear(){
    var year = String(new Date().getFullYear());
    var seen = {};
    var arr = [];
    eachFriseurEvent(function(ev){
      if(!ev.date || !ev.date.startsWith(year)) return;
      var key = ev.date+'|'+ev.title+'|'+ev.time;
      if(seen[key]) return;
      seen[key] = true;
      arr.push({id:ev.id,date:ev.date,startDate:ev.date,title:ev.title,desc:ev.desc,description:ev.description,location:ev.location,time:ev.time,endDate:ev.endDate,endTime:ev.endTime,source:ev.source});
    });
    arr.sort(function(a,b){
      var ak = String(a.date || '') + 'T' + String(a.time || '00:00');
      var bk = String(b.date || '') + 'T' + String(b.time || '00:00');
      return bk.localeCompare(ak);
    });
    return arr;
  }
  window.renderFriseurBanner = renderFriseurBanner;
  window._friseurFindLast = findLastFriseur;
  window._friseurFindLastInfo = findLastFriseurInfo;
  window._friseurFindNext = findNextFriseurInfo;
  window.getFriseurEnabled = isEnabled;
  window.setFriseurEnabled = function(on){
    writeRaw(LS_KEY, on ? 'true' : 'false');
    renderFriseurBanner();
  };
  window.setFriseurWeeks = function(w){
    writeRaw(LS_WEEKS, String(parseInt(w,10)||3));
    renderFriseurBanner();
  };
  window.getFriseurWeeks = getWeeks;

  window.getFriseurRowHtml = function(){
    if(!isEnabled()) return '';
    var lastInfo = findLastFriseurInfo();
    var lastDate = lastInfo && lastInfo.date;
    var nextInfo = findNextFriseurInfo();
    var nextDate = nextInfo && nextInfo.date;
    if(!lastDate && !nextDate) return '';

    var weeks = getWeeks();
    var days = lastDate ? calendarDiffDays(lastDate, todayKey()) : null;
    var overdue = days !== null && days >= weeks*7;
    var daysUntilNext = nextDate ? calendarDiffDays(todayKey(), nextDate) : null;
    var nextState = nextInfo ? friseurTemporalState(nextInfo, new Date()) : null;
    var iconBg = overdue && !nextDate ? 'rgba(239,68,68,.12)' : 'rgba(156,163,175,.1)';
    var subLine = '';
    var badge = '';

    if(nextDate && daysUntilNext !== null){
      var nextText = '';
      var nextDetail = '';
      if(nextState && nextState.running){
        nextText = 'Läuft gerade';
        nextDetail = nextInfo.endTime ? 'bis ' + nextInfo.endTime + ' Uhr' : 'heute';
        badge = '<span class="dash-row-badge" style="background:rgba(45,106,79,.1);color:var(--acc);white-space:nowrap;font-size:10px">Läuft</span>';
      } else {
        nextText = daysUntilNext === 0
          ? 'Heute geplant'
          : (daysUntilNext === 1 ? 'Morgen geplant' : 'in ' + daysUntilNext + ' Tagen');
        nextDetail = fmtS(nextDate) + (nextInfo.time ? ' · ' + nextInfo.time + ' Uhr' : '');
        var badgeTime = nextInfo.time ? ' · ' + esc(nextInfo.time) : '';
        badge = '<span class="dash-row-badge" style="background:rgba(45,106,79,.1);color:var(--acc);white-space:nowrap;font-size:10px">→ '+esc(fmtS(nextDate))+badgeTime+'</span>';
      }
      subLine = '<b style="color:var(--acc)">' + esc(nextText) + '</b>'
        + (nextDetail ? '<span style="color:var(--t4)"> · ' + esc(nextDetail) + '</span>' : '');
    } else if(lastInfo){
      var doneClock = lastDoneClock(lastInfo);
      var detail = '';
      if(days === 0){
        subLine = '<b style="color:var(--acc)">Heute erledigt</b>'
          + (doneClock ? '<span style="color:var(--t4)"> · ' + esc(doneClock) + '</span>' : '');
        badge = '<span class="dash-row-badge" style="background:rgba(45,106,79,.1);color:var(--acc);white-space:nowrap;font-size:10px">Erledigt</span>';
      } else if(overdue){
        detail = 'Letzter Termin vor ' + days + ' ' + (days === 1 ? 'Tag' : 'Tagen');
        subLine = '<b style="color:#ef4444">Friseurtermin überfällig</b><span style="color:var(--t4)"> · ' + esc(detail) + '</span>';
        badge = '<span class="dash-row-badge badge-red" style="white-space:nowrap;font-size:10px">⚠ Überfällig</span>';
      } else {
        detail = days === 1 ? 'Letzter Termin gestern' : 'Letzter Termin vor ' + days + ' Tagen';
        if(days === 1 && doneClock) detail += ' · ' + doneClock;
        subLine = '<b style="color:var(--t2)">Neuer Termin offen</b><span style="color:var(--t4)"> · ' + esc(detail) + '</span>';
        badge = '<span class="dash-row-badge" style="white-space:nowrap;font-size:10px;background:var(--s2);color:var(--t4);border:1px solid var(--b1)">Offen</span>';
      }
    } else {
      subLine = '<b style="color:var(--t2)">Neuer Termin offen</b><span style="color:var(--t4)"> · Noch kein vergangener Termin</span>';
      badge = '<span class="dash-row-badge" style="white-space:nowrap;font-size:10px;background:var(--s2);color:var(--t4);border:1px solid var(--b1)">Offen</span>';
    }

    return '<div class="dash-row dashboard-feature-row" onclick="window.openFriseurPanel&&window.openFriseurPanel()" style="cursor:pointer">'
      + '<div class="dash-row-icon" style="background:'+iconBg+';font-size:14px">✂️</div>'
      + '<div class="dash-row-body">'
      + '<div class="dash-row-title">Friseur</div>'
      + '<div class="dash-row-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+subLine+'</div>'
      + '</div>'
      + badge
      + '</div>';
  };

  function fmtPanelDate(k){
    try{ return new Date(k+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'short'}); }catch(e){ return k; }
  }
  function formatTimeRange(item){
    if(!item || !item.time) return 'Ganztägig';
    var end = item.endTime && item.endTime !== item.time ? ' – ' + item.endTime : '';
    return item.time + end + ' Uhr';
  }
  function friseurPanelRow(item){
    var now = new Date();
    var temporal = friseurTemporalState(item, now);
    var next = findNextFriseurInfo();
    var itemKey = String(item.date || '') + '|' + String(item.title || '') + '|' + String(item.time || '');
    var nextKey = next ? String(next.date || '') + '|' + String(next.title || '') + '|' + String(next.time || '') : '';
    var isNext = !temporal.past && itemKey === nextKey;
    var state = temporal.past ? 'past' : (isNext || temporal.running ? 'next' : 'upcoming');
    var stateLabel = temporal.running ? 'Läuft' : (temporal.past ? 'Vergangen' : (isNext ? 'Nächster' : 'Kommend'));
    return '<div class="change-hair-row '+state+'">'
      + '<div class="change-hair-dot"></div>'
      + '<div class="change-hair-main">'
      + '<div class="change-hair-title">'+esc(item.title || 'Friseur-Termin')+'</div>'
      + '<div class="change-hair-meta">'+esc(fmtPanelDate(item.date))+' · '+esc(formatTimeRange(item))+'</div>'
      + '</div>'
      + '<div class="change-hair-state">'+stateLabel+'</div>'
      + '</div>';
  }
  window.openFriseurPanel = function(){
    var year = new Date().getFullYear();
    var lastDate = findLastFriseur();
    var nextInfo = findNextFriseurInfo();
    var all = findAllFriseurThisYear();
    var now = new Date();
    var visits = all.filter(function(item){ return friseurTemporalState(item, now).past; }).length;
    var lastMetric = friseurSummaryMetric(lastDate, 'last');
    var nextMetric = friseurSummaryMetric(nextInfo && nextInfo.date, 'next');
    var rows = all.map(friseurPanelRow).join('');
    var summary = '<div class="change-hair-panel">'
      + '<div class="change-hair-summary">'
      + '<div><strong>'+visits+'</strong><span>Besuche</span></div>'
      + '<div><strong>'+esc(lastMetric.value)+'</strong><span>'+esc(lastMetric.label)+'</span></div>'
      + '<div><strong>'+esc(nextMetric.value)+'</strong><span>'+esc(nextMetric.label)+'</span></div>'
      + '</div>'
      + (nextInfo ? '<div class="change-hair-next"><div class="change-hair-next-icon">✂</div><div><strong>'+esc(nextInfo.title || 'Friseur-Termin')+'</strong><span>'+esc(fmtPanelDate(nextInfo.date))+' · '+esc(formatTimeRange(nextInfo))+'</span></div></div>' : '')
      + '<div class="change-hair-section-title">Termine '+year+'</div>';
    var empty = '<div class="change-hair-empty">Noch kein Friseur-Termin in '+year+' gefunden.<br><span>Tipp: Der Termin muss „Friseur“ im Titel oder in der Beschreibung enthalten.</span></div>';
    if(typeof openPanel === 'function') openPanel('✂ Friseur '+year, summary + '<div class="change-hair-list">' + (rows || empty) + '</div></div>');
  };

  var _origBD = window.buildDashboard;
  if(typeof _origBD === 'function' && !_origBD.__friseurWrapped){
    function wrappedBD(){
      var result = _origBD.apply(this, arguments);
      setTimeout(checkFriseurNotif, 2000);
      return result;
    }
    wrappedBD.__eventFix = _origBD && _origBD.__eventFix;
    wrappedBD.__friseurWrapped = true;
    window.buildDashboard = wrappedBD;
  }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(checkFriseurNotif, 3000); });

  window.ChangeFriseurFeature = { loaded:true, check:checkFriseurNotif, rowHtml:window.getFriseurRowHtml, open:window.openFriseurPanel };
})();
