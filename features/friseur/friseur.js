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

  function readRaw(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
  function writeRaw(key, value){ try{ localStorage.setItem(key, value); }catch(e){} }
  function isEnabled(){
    const v = readRaw(LS_KEY);
    // Friseur ist ein bestehendes Dashboard-Feature. Ohne gespeicherte Einstellung bleibt es sichtbar.
    return v === null ? true : v === 'true';
  }
  function getWeeks(){ return parseInt(readRaw(LS_WEEKS)||'3',10)||3; }
  function daysSince(dateStr){ const d = new Date(dateStr+'T12:00:00'); return Math.floor((Date.now()-d.getTime())/86400000); }
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
        title: String(title || 'Friseur-Termin'),
        desc: String(desc || ''),
        date: date,
        time: eventTime(ev),
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
  function findLastFriseur(){
    const today = new Date(); today.setHours(23,59,59,0);
    let best = null;
    eachFriseurEvent(function(ev){
      const d = new Date(ev.date+'T12:00:00');
      if(isNaN(d) || d > today) return;
      if(!best || d > new Date(best+'T12:00:00')) best = ev.date;
    });
    return best;
  }
  function findNextFriseurInfo(){
    const today = new Date(); today.setHours(0,0,0,0);
    let best = null;
    eachFriseurEvent(function(ev){
      const d = new Date(ev.date+'T12:00:00');
      if(isNaN(d) || d < today) return;
      if(!best || d < new Date(best.date+'T12:00:00')) best = ev;
    });
    return best;
  }
  function renderFriseurBanner(){
    if(typeof window.buildDashCards === 'function') window.buildDashCards();
    else if(typeof window.buildDashboard === 'function') window.buildDashboard();
  }
  function checkFriseurNotif(){
    if(!isEnabled()) return;
    const lastDate = findLastFriseur();
    if(!lastDate) return;
    const days  = daysSince(lastDate);
    const weeks = getWeeks();
    if(days < weeks*7) return;
    const key = 'friseur_notif_'+lastDate;
    if(readRaw(key)) return;
    writeRaw(key, '1');
    if(typeof Notification !== 'undefined' && Notification.permission === 'granted'){
      try{
        new Notification('✂️ Friseur-Erinnerung', {
          body: 'Dein letzter Friseur-Termin war vor '+days+' Tagen. Zeit für einen neuen Termin?'
        });
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
      arr.push({date:ev.date,title:ev.title,time:ev.time,endTime:ev.endTime});
    });
    arr.sort(function(a,b){ return String(a.date+a.time).localeCompare(String(b.date+b.time)); });
    return arr;
  }
  window.renderFriseurBanner = renderFriseurBanner;
  window._friseurFindLast = findLastFriseur;
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
    var lastDate = findLastFriseur();
    var nextInfo = findNextFriseurInfo();
    var nextDate = nextInfo && nextInfo.date;
    if(!lastDate && !nextDate) return '';

    var weeks = getWeeks();
    var days = lastDate ? Math.round((Date.now()-new Date(lastDate+'T12:00:00'))/86400000) : null;
    var warn = days !== null && days >= weeks*7;
    var overdue = days !== null && days >= weeks*7+7;
    var daysUntilNext = nextDate ? Math.round((new Date(nextDate+'T12:00:00')-Date.now())/86400000) : null;
    var leftColor = overdue ? '#ef4444' : warn ? '#f59e0b' : 'var(--acc)';
    var subLine = lastDate
      ? 'vor <b style="color:'+leftColor+'">' + days + 'd</b> · ' + fmtS(lastDate)
      : '<span style="color:var(--t4)">Kein vergangener Termin</span>';

    var badge = '';
    if(nextDate){
      var urgBg  = daysUntilNext <= 3 ? 'rgba(245,158,11,.15)' : 'rgba(45,106,79,.1)';
      var urgCol = daysUntilNext <= 3 ? '#b45309' : 'var(--acc)';
      var timeStr = nextInfo && nextInfo.time ? ' · ' + nextInfo.time : '';
      badge = '<span class="dash-row-badge" style="background:'+urgBg+';color:'+urgCol+';white-space:nowrap;font-size:10px">→ '+fmtS(nextDate)+timeStr+'</span>';
    } else if(overdue){
      badge = '<span class="dash-row-badge badge-red" style="white-space:nowrap;font-size:10px">⚠ Überfällig</span>';
    } else if(warn){
      badge = '<span class="dash-row-badge badge-amber" style="white-space:nowrap;font-size:10px">⏰ Bald fällig</span>';
    } else {
      badge = '<span class="dash-row-badge" style="white-space:nowrap;font-size:10px;background:var(--s2);color:var(--t4);border:1px solid var(--b1)">Kein Termin</span>';
    }

    return '<div class="dash-row" onclick="window.openFriseurPanel&&window.openFriseurPanel()" style="cursor:pointer;border-top:1px solid var(--b1);margin-top:4px">'
      + '<div class="dash-row-icon" style="background:rgba(156,163,175,.1);font-size:14px">✂️</div>'
      + '<div class="dash-row-body">'
      + '<div class="dash-row-title">Friseur</div>'
      + '<div class="dash-row-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+subLine+'</div>'
      + '</div>'
      + badge
      + '</div>';
  };

  window.openFriseurPanel = function(){
    var year = new Date().getFullYear();
    var lastDate = findLastFriseur();
    var nextInfo = findNextFriseurInfo();
    var all = findAllFriseurThisYear();
    var visits = all.filter(function(item){ return new Date(item.date+'T12:00:00') <= new Date(); }).length;
    var rows = all.map(function(item){
      var d = new Date(item.date+'T12:00:00');
      var past = d < new Date(new Date().setHours(0,0,0,0));
      var time = item.time ? item.time + (item.endTime && item.endTime !== item.time ? ' – '+item.endTime : '') + ' Uhr' : 'Ganztägig';
      return '<div class="vacation-row '+(past?'past':'upcoming')+'">'
        + '<div class="vacation-row-dot"></div><div class="vacation-row-main"><strong>'+item.title+'</strong><span>'+fmtS(item.date)+' · '+time+'</span></div>'
        + '<div class="vacation-row-days">'+(past?'vergangen':'kommend')+'</div></div>';
    }).join('');
    var summary = '<div class="vacation-summary-grid"><div><strong>'+visits+'</strong><span>Besuche</span></div><div><strong>'+(lastDate?fmtS(lastDate):'—')+'</strong><span>Letzter</span></div><div><strong>'+(nextInfo?fmtS(nextInfo.date):'—')+'</strong><span>Nächster</span></div></div>';
    var empty = '<div style="color:var(--t4);font-size:13px;padding:16px 0">Noch kein Friseur-Termin in '+year+' gefunden.<br><span style="font-size:11px">Tipp: Termin muss „Friseur“ im Titel enthalten.</span></div>';
    if(typeof openPanel === 'function') openPanel('✂️ Friseur '+year, summary + (rows || empty));
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
