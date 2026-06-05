(function(){
  'use strict';

  var M = window.ChangeCalendarModel;
  if(!M) return;

  var MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  var WEEK_SHORT = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  var selectedKey = M.todayKey();
  var premiumBound = false;
  var originalRenderCalendar = null;
  var originalSetCalView = null;
  var originalNavigate = null;
  var currentPremiumView = 'month';

  function $(id){ return document.getElementById(id); }
  function esc(v){ return M.esc ? M.esc(v) : String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function keyOf(value){ return M.dateKey(value); }
  function dateObj(key){ return M.parseDate(key); }
  function addDays(key, amount){ return M.addDays(key, amount); }
  function isToday(key){ return key === M.todayKey(); }
  function sameMonth(key, base){ var a=dateObj(key), b=dateObj(base); return a.getMonth()===b.getMonth() && a.getFullYear()===b.getFullYear(); }
  function selectedDate(){ return dateObj(selectedKey || M.todayKey()); }
  function currentDateSafe(){ try{ return typeof curDate !== 'undefined' ? curDate : new Date(); }catch(e){ return new Date(); } }
  function setCurrentDate(date){ try{ curDate = date; }catch(e){ window.curDate = date; } }
  function viewSafe(){ try{ return typeof currentCalView !== 'undefined' ? currentCalView : currentPremiumView; }catch(e){ return currentPremiumView; } }
  function setViewSafe(view){ currentPremiumView = view; try{ currentCalView = view; }catch(e){ window.currentCalView = view; } }
  function weekdayName(key){ return M.weekday ? M.weekday(key) : ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][dateObj(key).getDay()]; }
  function compactDate(key){ var d=dateObj(key); return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'; }
  function monthLabel(date){ return MONTHS[date.getMonth()]+' '+date.getFullYear(); }
  function rangeOf(event){ return M.rangeOf(event); }
  function timeOf(event){ return M.timeOf(event); }
  function titleOf(event){ return M.titleOf(event); }
  function timeLabel(event){ return M.timeLabel(event); }
  function sourceOf(event){ return M.sourceOf(event); }
  function eventIcon(event){
    var title = (titleOf(event) || '').toLowerCase();
    if(sourceOf(event) === 'google' || title.indexOf('meet') >= 0) return '<span class="cal-premium-event-icon google">G</span>';
    if(title.indexOf('friseur') >= 0 || title.indexOf('hair') >= 0) return '<span class="cal-premium-event-icon health">✂</span>';
    if(title.indexOf('geburtstag') >= 0 || title.indexOf('birthday') >= 0) return '<span class="cal-premium-event-icon private">🎁</span>';
    if(title.indexOf('sync') >= 0 || title.indexOf('team') >= 0) return '<span class="cal-premium-event-icon work">👥</span>';
    return '<span class="cal-premium-event-icon other">●</span>';
  }
  function sourceBadge(event){
    if(sourceOf(event) === 'google') return '<span class="cal-premium-pill google">Google</span>';
    if(event && (event.googleEventId || event.syncedToGoogle || event.googleSyncedAt)) return '<span class="cal-premium-pill google">Google ✓</span>';
    return '';
  }
  function categoryOf(event){
    var title = (titleOf(event) || '').toLowerCase();
    if(sourceOf(event) === 'google' || title.indexOf('büro') >= 0 || title.indexOf('team') >= 0 || title.indexOf('sync') >= 0) return 'Arbeit';
    if(title.indexOf('friseur') >= 0 || title.indexOf('arzt') >= 0 || title.indexOf('gesund') >= 0) return 'Gesundheit';
    if(title.indexOf('geburtstag') >= 0 || title.indexOf('privat') >= 0 || title.indexOf('sport') >= 0) return 'Privat';
    return 'Sonstiges';
  }
  function eventTone(event){
    var cat = categoryOf(event);
    return cat === 'Arbeit' ? 'work' : cat === 'Privat' ? 'private' : cat === 'Gesundheit' ? 'health' : 'other';
  }
  function shareButton(event){
    if(!window.ChangeEventShare) return '';
    return '<button class="cal-premium-share" type="button" onclick="event.stopPropagation();window.ChangeEventShare.openWhatsApp&&window.ChangeEventShare.openWhatsApp(\''+esc(event.id||'')+'\')">WhatsApp teilen</button>';
  }
  function openById(id){ if(window.openEventPanel) window.openEventPanel(id); }
  function eventsFor(key){ return M.eventsForDate(key) || []; }
  function allEvents(){ return M.allEvents ? M.allEvents() : []; }
  function nextEvent(){
    var now = new Date();
    var today = M.todayKey();
    return allEvents().filter(function(event){
      var r = rangeOf(event);
      if(r.end < today) return false;
      if(r.start === today && timeOf(event)){
        var t = timeOf(event).split(':');
        var d = dateObj(today); d.setHours(parseInt(t[0],10)||0, parseInt(t[1],10)||0, 0, 0);
        return d >= now;
      }
      return true;
    }).sort(function(a,b){
      var ar = rangeOf(a), br = rangeOf(b);
      return ar.start.localeCompare(br.start) || (timeOf(a)||'99:99').localeCompare(timeOf(b)||'99:99') || titleOf(a).localeCompare(titleOf(b));
    })[0] || null;
  }
  function weekStart(key){
    var d = dateObj(key); var day = d.getDay(); var diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate()+diff);
    return keyOf(d);
  }
  function selectedWeek(){
    var start = weekStart(selectedKey || M.todayKey());
    var out = [];
    for(var i=0;i<7;i++) out.push(addDays(start, i));
    return out;
  }
  function monthDays(baseKey){
    var base = dateObj(baseKey || selectedKey || M.todayKey());
    var y=base.getFullYear(), m=base.getMonth();
    var first = new Date(y,m,1).getDay(); first = first===0 ? 6 : first-1;
    var days = [];
    for(var i=0;i<first;i++) days.push('');
    var dim = new Date(y,m+1,0).getDate();
    for(var d=1; d<=dim; d++) days.push(keyOf(new Date(y,m,d)));
    return days;
  }
  function yearOptions(year){
    var out = '';
    for(var y=year-3; y<=year+3; y++){
      out += '<option value="'+y+'" '+(y===year?'selected':'')+'>'+y+'</option>';
    }
    return out;
  }
  function monthOptions(month){
    return MONTHS.map(function(name,index){
      return '<option value="'+index+'" '+(index===month?'selected':'')+'>'+esc(name)+'</option>';
    }).join('');
  }
  function eventRows(key){
    var list = eventsFor(key);
    if(!list.length) return '<div class="cal-premium-empty">Keine Termine für diesen Tag</div>';
    return list.map(function(event){
      var loc = event.location ? '<span>'+esc(event.location)+'</span>' : '';
      var important = /friseur|arzt|geburtstag|wichtig/i.test(titleOf(event)) ? '<span class="cal-premium-tag">Wichtig</span>' : '';
      return '<button class="cal-premium-agenda-row '+eventTone(event)+'" type="button" onclick="window.openEventPanel&&window.openEventPanel(\''+esc(event.id||'')+'\')">'
        + '<div class="cal-premium-agenda-time">'+esc(timeOf(event) || 'Ganztägig')+'</div>'
        + '<div class="cal-premium-agenda-main">'+eventIcon(event)+'<div><strong>'+esc(titleOf(event))+'</strong><div>'+loc+important+'</div></div></div>'
        + '</button>';
    }).join('');
  }
  function heroHtml(){
    // Der Hero bleibt bewusst immer auf dem echten heutigen Tag.
    // Auswahl in Woche/Mini-Monat steuert nur Tagesagenda und Monatskarte.
    var key = M.todayKey();
    var d = dateObj(key);
    var list = eventsFor(key);
    var next = nextEvent();
    var nextTime = next ? (timeOf(next) || 'Ganztägig') : '—';
    var nextTitle = next ? titleOf(next) : 'Kein Termin';
    var progress = Math.max(8, Math.min(100, (d.getDate() / new Date(d.getFullYear(), d.getMonth()+1, 0).getDate()) * 100));
    return '<div class="cal-premium-hero-grid">'
      + '<section class="cal-premium-hero">'
      + '<div class="cal-premium-eyebrow">Heute</div>'
      + '<h2>'+esc(weekdayName(key))+', '+compactDate(key)+'</h2>'
      + '<div class="cal-premium-hero-line"><span class="cal-premium-dot"></span><strong>'+list.length+'</strong> '+(list.length===1?'Termin':'Termine')+'</div>'
      + '<div class="cal-premium-hero-line muted">Nächster Termin: <strong>'+esc(nextTime)+'</strong>'+(next ? ' · '+esc(nextTitle) : '')+'</div>'
      + '<div class="cal-premium-date-ring" style="--p:'+progress+'"><span>'+String(d.getDate()).padStart(2,'0')+'</span><small>'+MONTHS[d.getMonth()].slice(0,3).toUpperCase()+'</small></div>'
      + '</section>'
      + '<section class="cal-premium-next"><div><div class="cal-premium-eyebrow">Nächster Termin</div><strong>'+esc(nextTime)+'</strong><span>'+esc(nextTitle)+'</span></div><div class="cal-premium-next-icon">⌚</div></section>'
      + '</div>';
  }
  function weekHtml(){
    var days = selectedWeek();
    return '<section class="cal-premium-week"><div class="cal-premium-section-head"><strong>Woche · '+esc(monthLabel(selectedDate()))+'</strong></div><div class="cal-premium-week-row">'
      + days.map(function(key){
          var d=dateObj(key); var count=eventsFor(key).length;
          return '<button type="button" class="cal-premium-week-day '+(key===selectedKey?'selected ':'')+(isToday(key)?'today ':'')+'" data-cal-day="'+key+'"><span>'+WEEK_SHORT[d.getDay()]+'</span><strong>'+compactDate(key)+'</strong><i '+(count?'':'class="empty"')+'></i></button>';
        }).join('') + '</div></section>';
  }
  function miniMonthHtml(){
    var base = selectedDate();
    var days = monthDays(selectedKey);
    var month = base.getMonth();
    var year = base.getFullYear();
    return '<section class="cal-premium-side-card cal-premium-mini"><div class="cal-premium-side-head cal-premium-month-head"><strong>Monatsübersicht</strong><div><button data-cal-nav="-1">‹</button><button data-cal-nav="1">›</button></div></div>'
      + '<div class="cal-premium-month-picker"><select data-cal-month>'+monthOptions(month)+'</select><select data-cal-year>'+yearOptions(year)+'</select></div>'
      + '<div class="cal-premium-mini-grid">'
      + ['Mo','Di','Mi','Do','Fr','Sa','So'].map(function(x){return '<span class="head">'+x+'</span>';}).join('')
      + days.map(function(key){
          if(!key) return '<span></span>';
          var d=dateObj(key); var has=eventsFor(key).length; var cls=(key===selectedKey?'selected ':'')+(isToday(key)?'today ':'')+(has?'has ':'');
          return '<button type="button" class="'+cls+'" data-cal-day="'+key+'">'+d.getDate()+(has?'<i></i>':'')+'</button>';
        }).join('') + '</div></section>';
  }
  function filtersHtml(){
    return '<section class="cal-premium-side-card cal-premium-filter"><strong>Kategorien & Filter</strong>'
      + [['Arbeit','work'],['Privat','private'],['Gesundheit','health'],['Sonstiges','other']].map(function(x){ return '<div><span class="cal-premium-filter-dot '+x[1]+'"></span><span>'+x[0]+'</span><b>✓</b></div>'; }).join('')
      + '</section>';
  }
  function renderPremium(){
    var body = $('cal-body'); if(!body) return;
    if(!selectedKey) selectedKey = M.todayKey();
    var view = viewSafe();
    if(view === 'year' || view === 'workweek'){
      if(originalRenderCalendar && originalRenderCalendar !== window.renderCalendar) originalRenderCalendar();
      return;
    }
    var existing = $('calendar-premium-view');
    if(!existing){
      existing = document.createElement('div');
      existing.id = 'calendar-premium-view';
      body.insertBefore(existing, body.firstChild);
    }
    var control = '<div class="cal-premium-top"><div class="cal-premium-title"><span>▣</span><h1>Kalender</h1></div></div>';
    existing.innerHTML = control + heroHtml() + weekHtml()
      + '<div class="cal-premium-main-grid">'
      + '<section class="cal-premium-card cal-premium-agenda"><div class="cal-premium-section-head"><strong>Tagesagenda</strong></div><div class="cal-premium-agenda-list">'+eventRows(selectedKey)+'</div><div class="cal-premium-agenda-footer"><button class="cal-premium-add" type="button" data-cal-add="1">+ Termin hinzufügen</button></div></section>'
      + '<aside class="cal-premium-side">'+miniMonthHtml()+'</aside>'
      + '</div>';
    var mg=$('month-grid'), wday=$('wday-row'), ag=$('agenda-view');
    if(mg) mg.style.display='none'; if(wday) wday.style.display='none'; if(ag) ag.style.display='none';
    bindPremium();
  }
  function bindPremium(){
    var root = $('calendar-premium-view'); if(!root) return;
    root.querySelectorAll('[data-cal-day]').forEach(function(btn){ btn.onclick=function(){ selectedKey=this.getAttribute('data-cal-day'); setCurrentDate(dateObj(selectedKey)); renderPremium(); }; });
    root.querySelectorAll('[data-cal-nav]').forEach(function(btn){ btn.onclick=function(){ var d=selectedDate(); d.setMonth(d.getMonth()+parseInt(this.getAttribute('data-cal-nav'),10)); selectedKey=keyOf(new Date(d.getFullYear(),d.getMonth(),1)); setCurrentDate(dateObj(selectedKey)); renderPremium(); }; });
    var monthSelect = root.querySelector('[data-cal-month]');
    var yearSelect = root.querySelector('[data-cal-year]');
    function changeMonthYear(){
      var d = selectedDate();
      var m = monthSelect ? parseInt(monthSelect.value,10) : d.getMonth();
      var y = yearSelect ? parseInt(yearSelect.value,10) : d.getFullYear();
      if(isNaN(m)) m = d.getMonth();
      if(isNaN(y)) y = d.getFullYear();
      selectedKey = keyOf(new Date(y,m,1));
      setCurrentDate(dateObj(selectedKey));
      renderPremium();
    }
    if(monthSelect) monthSelect.onchange = changeMonthYear;
    if(yearSelect) yearSelect.onchange = changeMonthYear;
    root.querySelectorAll('[data-cal-view]').forEach(function(btn){ btn.onclick=function(){ var v=this.getAttribute('data-cal-view'); if(v==='today'){ selectedKey=M.todayKey(); setCurrentDate(dateObj(selectedKey)); } setViewSafe('month'); renderPremium(); }; });
    root.querySelectorAll('[data-cal-add]').forEach(function(btn){ btn.onclick=function(){ if(window.openEventPanel) window.openEventPanel(null, dateObj(selectedKey || M.todayKey())); }; });
  }
  function patchCalendar(){
    if(premiumBound) return;
    if(typeof window.renderCalendar !== 'function') return;
    premiumBound = true;
    originalRenderCalendar = window.renderCalendar;
    originalSetCalView = window.setCalView;
    originalNavigate = window.navigate;
    window.renderCalendar = function(){ renderPremium(); try{ if(typeof window.renderUpcoming === 'function') window.renderUpcoming(); }catch(e){} };
    window.setCalView = function(view){ if(view === 'today'){ selectedKey = M.todayKey(); setCurrentDate(dateObj(selectedKey)); setViewSafe('month'); } else if(view === 'week' || view === 'month'){ setViewSafe('month'); } else { setViewSafe(view); }
      if(view === 'year' || view === 'workweek'){ if(originalSetCalView) return originalSetCalView(view); }
      renderPremium(); };
    window.navigate = function(dir){
      var d=selectedDate();
      if(viewSafe()==='year' || viewSafe()==='workweek'){ if(originalNavigate) return originalNavigate(dir); }
      d.setMonth(d.getMonth()+dir); selectedKey=keyOf(new Date(d.getFullYear(), d.getMonth(), Math.min(d.getDate(),28))); setCurrentDate(dateObj(selectedKey)); renderPremium();
    };
    renderPremium();
    [150, 700, 1600].forEach(function(ms){ setTimeout(function(){
      try{ if((window.currentMainView || '') === 'calendar' || document.body.classList.contains('change-view-calendar')) renderPremium(); }catch(e){}
    }, ms); });
    try{
      if(typeof window.setMainView === 'function' && !window.setMainView._calendarPremiumRefreshPatch){
        var oldSetMainView = window.setMainView;
        window.setMainView = function(view){
          var result = oldSetMainView.apply(this, arguments);
          if(view === 'calendar'){
            selectedKey = M.todayKey();
            setCurrentDate(dateObj(selectedKey));
            setTimeout(renderPremium, 60);
            setTimeout(renderPremium, 350);
            setTimeout(renderPremium, 1000);
            setTimeout(renderPremium, 1800);
          }
          return result;
        };
        window.setMainView._calendarPremiumRefreshPatch = true;
      }
    }catch(e){}
  }

  /* Panel-Funktionen bleiben erhalten, aber ruhiger aufgebaut */
  function readCandidate(existingId){
    var title = ($('ev-title') && $('ev-title').value || '').trim();
    var date = $('ev-date') && $('ev-date').value;
    var end = ($('ev-end-date') && $('ev-end-date').value) || date;
    if(end && date && end < date) end = date;
    var old = existingId ? M.localEvents().find(function(event){ return String(event.id) === String(existingId); }) : null;
    return { old: old, event: Object.assign({}, old || {}, { id: old ? old.id : 'ev_'+(Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)), title: title, date: date, startDate: date, endDate: end, time: ($('ev-time') && $('ev-time').value) || '', endTime: ($('ev-end') && $('ev-end').value) || '', color: ($('ev-color') && $('ev-color').value) || 'green', type: (old && old.type) || 'meeting', desc: (($('ev-desc') && $('ev-desc').value) || '').trim(), source: 'local', googleEventId: (old && old.googleEventId) || '', googleSyncRequested: !!($('ev-google-sync') && $('ev-google-sync').checked), createdAt: (old && old.createdAt) || new Date().toISOString(), updatedAt: new Date().toISOString() }) };
  }
  function openEventPanel(id, preDate){
    var event = id ? M.eventById(id) : null;
    if(event && sourceOf(event) === 'google'){
      var share = window.ChangeEventShare ? window.ChangeEventShare.actionsHtml(event) : '';
      if(window.openPanel) window.openPanel(titleOf(event), '<div class="change-event-detail-card change-day-event"><div class="change-day-time">'+esc(timeLabel(event))+'</div><div><div class="change-day-title">'+esc(titleOf(event))+'</div><div class="change-day-sub">Aus Google Kalender</div></div></div>'+share+'<button class="btn btn-ghost btn-full" onclick="closePanel()">Schließen</button>');
      return;
    }
    var start = event ? (event.startDate || event.date) : M.dateKey(preDate || dateObj(selectedKey));
    var end = event ? (event.endDate || event.date || start) : start;
    var syncOn = !!(event && (event.googleSyncRequested || event.googleEventId || event.syncedToGoogle));
    var html = '<div id="event-conflict-note" class="change-conflict-note"></div>'
      + '<div class="fg"><label class="flabel">Titel *</label><input class="finput" id="ev-title" value="'+esc(event && event.title || '')+'"></div>'
      + '<div class="fr"><div class="fg"><label class="flabel">Von-Datum *</label><input type="date" class="finput" id="ev-date" value="'+esc(start)+'"></div><div class="fg"><label class="flabel">Bis-Datum</label><input type="date" class="finput" id="ev-end-date" value="'+esc(end)+'"></div></div>'
      + '<div class="fr"><div class="fg"><label class="flabel">Von Uhrzeit</label><input type="time" class="finput" id="ev-time" value="'+esc(event && event.time || '')+'"></div><div class="fg"><label class="flabel">Bis Uhrzeit</label><input type="time" class="finput" id="ev-end" value="'+esc(event && event.endTime || '')+'"></div></div>'
      + '<div class="fg"><label class="flabel">Farbe</label><select class="finput" id="ev-color">'+[['blue','Blau'],['green','Grün'],['amber','Gelb'],['red','Rot'],['purple','Lila']].map(function(pair){ return '<option value="'+pair[0]+'" '+(((event && event.color) || 'green') === pair[0] ? 'selected' : '')+'>'+pair[1]+'</option>'; }).join('')+'</select></div>'
      + '<div class="fg"><label class="flabel">Beschreibung</label><textarea class="finput" id="ev-desc" rows="4">'+esc(event && event.desc || '')+'</textarea></div>'
      + (event && window.ChangeEventShare ? window.ChangeEventShare.actionsHtml(event) : '')
      + '<div class="toggle-row" style="margin:8px 0 12px"><div class="toggle-copy"><div class="toggle-title">Mit Google Kalender synchronisieren</div><div class="settings-hint">Nur für diesen selbst erstellten Termin.</div></div><label class="switch"><input type="checkbox" id="ev-google-sync" '+(syncOn ? 'checked' : '')+'><span class="slider"></span></label></div>'
      + '<div class="fa"><button class="btn btn-primary" style="flex:1" onclick="window.saveEvent(\''+esc(event && event.id || '')+'\')">Speichern</button>'+(event ? '<button class="btn btn-danger" onclick="window.deleteEvent(\''+esc(event.id)+'\')">Löschen</button>' : '')+'</div>';
    if(window.openPanel) window.openPanel(event ? 'Termin bearbeiten' : 'Neuer Termin', html);
  }
  function saveEvent(existingId){
    var result = readCandidate(existingId), event = result.event;
    if(!event.title || !event.date){ try{ window.toast&&window.toast('Titel und Von-Datum fehlen','err'); }catch(e){} return false; }
    var conflicts = M.eventConflicts(event, existingId);
    if(conflicts.length && !confirm('Dieser Termin überschneidet sich mit:\n\n'+M.conflictText(conflicts)+'\n\nTrotzdem speichern?')) return false;
    var list = M.localEvents();
    var index = list.findIndex(function(item){ return String(item.id) === String(event.id); });
    if(index >= 0) list[index] = event; else list.push(event);
    M.writeEvents(list);
    try{ window.closePanel&&window.closePanel(); }catch(e){}
    if(event.googleSyncRequested && M.canUseGoogle()) setTimeout(function(){ M.syncLocalEventToGoogle(event); },150);
    M.refresh(); selectedKey = event.date || selectedKey; renderPremium();
    try{ window.toast&&window.toast(result.old ? 'Termin aktualisiert ✓' : 'Termin gespeichert ✓','ok'); }catch(e){}
    return event;
  }
  function deleteEvent(id){
    var event = M.localEvents().find(function(item){ return String(item.id) === String(id); });
    if(!event || sourceOf(event) === 'google'){ try{ window.toast&&window.toast('Nur lokale Termine können gelöscht werden.','err'); }catch(e){} return; }
    if(!confirm('Diesen lokalen Termin löschen?')) return;
    M.writeEvents(M.localEvents().filter(function(item){ return String(item.id) !== String(id); }));
    try{ window.closePanel&&window.closePanel(); }catch(e){}
    M.refresh(); renderPremium();
    try{ window.toast&&window.toast('Termin gelöscht ✓','ok'); }catch(e){}
  }

  window.ChangeCalendarPanels = {openEventPanel:openEventPanel, saveEvent:saveEvent, deleteEvent:deleteEvent, renderPremium:renderPremium};
  window.openEventPanel = openEventPanel;
  window.saveEvent = saveEvent;
  window.deleteEvent = deleteEvent;
  window.syncEventToGoogleReliable = M.syncLocalEventToGoogle;

  setTimeout(patchCalendar, 0);
  setTimeout(patchCalendar, 120);
  setTimeout(function(){ if(document.body && document.body.classList.contains('change-view-calendar')) renderPremium(); }, 400);
})();

(function(){
  'use strict';
  var VERSION = '0.1.0064';
  function replaceVersionText(root){
    try{
      var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
      var nodes = [];
      while(walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function(node){
        if(/0\.1\.00\d+/.test(node.nodeValue || '')) node.nodeValue = node.nodeValue.replace(/0\.1\.00\d+/g, VERSION);
      });
    }catch(e){}
  }
  function patchSettings(){
    if(window.openSettingsPanel && !window.openSettingsPanel._calendarPremiumVersionPatch){
      var old = window.openSettingsPanel;
      window.openSettingsPanel = function(){
        var result = old.apply(this, arguments);
        setTimeout(function(){ replaceVersionText(document.getElementById('settings-panel') || document.body); }, 50);
        return result;
      };
      window.openSettingsPanel._calendarPremiumVersionPatch = true;
    }
  }
  setTimeout(patchSettings, 500);
  setTimeout(patchSettings, 1200);
})();
