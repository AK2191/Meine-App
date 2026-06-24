(function(){
  'use strict';

  var DAY = 86400000;

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"'`]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];
    });
  }
  function pad(n){ return String(n).padStart(2, '0'); }
  function dateKey(value){
    if(!value) return todayKey();
    if(typeof value === 'string') return value.slice(0,10);
    if(value instanceof Date) return value.getFullYear()+'-'+pad(value.getMonth()+1)+'-'+pad(value.getDate());
    try{ return new Date(value).toISOString().slice(0,10); }catch(e){ return todayKey(); }
  }
  function todayKey(){ return dateKey(new Date()); }
  function parseDate(key){ return new Date(String(key || todayKey()).slice(0,10)+'T12:00:00'); }
  function addDays(key, amount){
    var d = typeof key === 'string' ? parseDate(key) : new Date(key);
    d.setDate(d.getDate() + amount);
    return dateKey(d);
  }
  function fmtDateSafe(key){
    try{ if(typeof window.fmtDate === 'function') return window.fmtDate(key); }catch(e){}
    var d = parseDate(key);
    return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear();
  }
  function weekday(key){
    return ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][parseDate(key).getDay()];
  }
  function readList(name, fallback){
    try{
      if(name === 'events' && window.ChangeEventStore && typeof window.ChangeEventStore.getEvents === 'function') return window.ChangeEventStore.getEvents();
      if(Array.isArray(window[name])) return window[name];
      if(typeof window.ls === 'function'){
        var lsValue = window.ls(name);
        if(Array.isArray(lsValue)) return lsValue;
      }
      var raw = localStorage.getItem(name);
      if(raw){
        var parsed = JSON.parse(raw);
        if(Array.isArray(parsed)) return parsed;
      }
    }catch(e){}
    return fallback || [];
  }
  function writeEvents(list){
    var store = window.ChangeEventStore || null;
    if(store && typeof store.replaceEvents === 'function'){
      store.replaceEvents(list || [], {persist:true});
      list = store.getEvents();
    }
    try{ window.events = list; }catch(e){}
    try{ events = list; }catch(e){}
    if(store) return;
    try{ if(typeof window.ls === 'function') window.ls('events', list); }catch(e){}
    try{ localStorage.setItem('events', JSON.stringify(list)); }catch(e){}
    try{ localStorage.setItem('change_v1_events', JSON.stringify(list)); }catch(e){}
  }
  function refresh(){
    try{ if(typeof window.renderCalendar === 'function') window.renderCalendar(); }catch(e){}
    try{ if(typeof window.renderUpcoming === 'function') window.renderUpcoming(); }catch(e){}
    try{ if(typeof window.buildDashboard === 'function') window.buildDashboard(); }catch(e){}
    try{ if(typeof window.checkNotifications === 'function') window.checkNotifications(); }catch(e){}
    try{ if(typeof window.saveToDrive === 'function') window.saveToDrive(); }catch(e){}
    try{ if(typeof window.persistChangeState === 'function') window.persistChangeState(); }catch(e){}
  }
  function titleOf(event){ return String((event && (event.title || event.summary || event.name)) || 'Termin').trim() || 'Termin'; }
  function startOf(event){
    return dateKey(event && (event.startDate || event.date || event.dateKey || (event.start && (event.start.date || event.start.dateTime))));
  }
  function endOf(event){
    if(!event) return todayKey();
    var start = startOf(event);
    var end = event.endDate || event.dateEnd || event.toDate || event.untilDate || event.date || event.startDate || '';
    if(!end && event.end && event.end.date) end = addDays(String(event.end.date).slice(0,10), -1);
    if(!end && event.end && event.end.dateTime) end = String(event.end.dateTime).slice(0,10);
    end = String(end || start).slice(0,10);
    if(!end || end < start) end = start;
    return end;
  }
  function rangeOf(event){ return {start:startOf(event), end:endOf(event)}; }
  function timeOf(event){
    if(event && event.time) return String(event.time).slice(0,5);
    if(event && event.start && event.start.dateTime){
      try{ return new Date(event.start.dateTime).toTimeString().slice(0,5); }catch(e){}
    }
    return '';
  }
  function endTimeOf(event){
    if(event && event.endTime) return String(event.endTime).slice(0,5);
    if(event && event.end && event.end.dateTime){
      try{ return new Date(event.end.dateTime).toTimeString().slice(0,5); }catch(e){}
    }
    return '';
  }
  function timeLabel(event){
    var start = timeOf(event), end = endTimeOf(event);
    if(start && end && start !== end) return start+' – '+end+' Uhr';
    if(start) return start+' Uhr';
    return 'Ganztägig';
  }
  function sourceOf(event){
    if(!event) return 'local';
    if(event.source === 'google' || String(event.id || '').indexOf('g_') === 0) return 'google';
    return 'local';
  }
  function normalizeGoogleEvent(event){
    var start = event.start && (event.start.date || String(event.start.dateTime || '').slice(0,10));
    var end = event.end && (event.end.date || String(event.end.dateTime || '').slice(0,10));
    if(event.end && event.end.date && end && end > start) end = addDays(end, -1);
    return {
      id: String(event.id || '').indexOf('g_') === 0 ? String(event.id) : 'g_'+String(event.id || titleOf(event)+'_'+start),
      title: event.summary || event.title || event.name || 'Termin',
      date: start,
      startDate: start,
      endDate: end && end >= start ? end : start,
      time: event.start && event.start.dateTime ? new Date(event.start.dateTime).toTimeString().slice(0,5) : '',
      endTime: event.end && event.end.dateTime ? new Date(event.end.dateTime).toTimeString().slice(0,5) : '',
      color: 'blue',
      type: event.type || 'meeting',
      desc: event.description || event.desc || '',
      location: event.location || '',
      source: 'google',
      googleEventId: String(event.id || '').replace(/^g_/, '')
    };
  }
  function canonicalIdKey(event){
    var range = rangeOf(event);
    var source = sourceOf(event);
    var gid = String(event && (event.googleEventId || event.id) || '').replace(/^g_/, '');
    if(source === 'google' && gid) return 'google:'+gid+'|'+range.start+'|'+range.end;
    if(source !== 'google' && event && event.id) return 'local:'+String(event.id)+'|'+range.start+'|'+range.end;
    return '';
  }
  function canonicalContentKey(event){
    var range = rangeOf(event);
    return [
      sourceOf(event),
      titleOf(event).trim().toLowerCase(),
      range.start,
      range.end,
      timeOf(event) || '',
      endTimeOf(event) || '',
      String((event && (event.location || event.place)) || '').trim().toLowerCase()
    ].join('|');
  }
  function dedupeEvents(list){
    var seenIds = new Set();
    var seenContent = new Set();
    return list.filter(function(event){
      var range = rangeOf(event);
      if(!range.start) return false;
      var idKey = canonicalIdKey(event);
      var contentKey = canonicalContentKey(event);
      if(idKey && seenIds.has(idKey)) return false;
      if(seenContent.has(contentKey)) return false;
      if(idKey) seenIds.add(idKey);
      seenContent.add(contentKey);
      return true;
    });
  }
  function allEvents(){
    var out = [];
    readList('events', []).forEach(function(event){
      if(!event) return;
      var normalized = (event.source === 'google' || String(event.id || '').indexOf('g_') === 0) && event.start ? normalizeGoogleEvent(event) : event;
      var range = rangeOf(normalized);
      if(!range.start) return;
      out.push(Object.assign({}, normalized, {
        title: titleOf(normalized),
        date: range.start,
        startDate: range.start,
        endDate: range.end,
        time: timeOf(normalized),
        endTime: endTimeOf(normalized),
        source: sourceOf(normalized)
      }));
    });
    readList('gEvents', []).forEach(function(event){
      if(!event) return;
      var normalized = event.start ? normalizeGoogleEvent(event) : Object.assign({}, event, {source:'google'});
      var range = rangeOf(normalized);
      if(range.start) out.push(Object.assign({}, normalized, {date:range.start, startDate:range.start, endDate:range.end, source:'google'}));
    });
    return dedupeEvents(out);
  }
  function eventById(id){
    id = String(id || '');
    var plain = id.replace(/__\d{4}-\d{2}-\d{2}$/, '');
    return readList('events', []).find(function(e){ return String(e.id) === id || String(e.id) === plain; })
      || allEvents().find(function(e){ return String(e.id) === id || String(e.id) === plain || String(e.googleEventId || '') === id.replace(/^g_/, ''); });
  }
  function eventsForDate(key, preferred){
    key = dateKey(key);
    var merged = allEvents();
    if(Array.isArray(preferred) && !merged.length){
      merged = preferred.map(function(event){
        if(event && event.start) return normalizeGoogleEvent(event);
        return event;
      });
    }
    return dedupeEvents(merged).filter(function(event){
      var range = rangeOf(event);
      return range.start <= key && range.end >= key;
    }).sort(function(a,b){
      var ar = rangeOf(a), br = rangeOf(b);
      var aRange = ar.start !== ar.end, bRange = br.start !== br.end;
      return (bRange - aRange) || (timeOf(a) || '99:99').localeCompare(timeOf(b) || '99:99') || titleOf(a).localeCompare(titleOf(b));
    });
  }
  function holidaysForDate(key){
    try{ return (typeof window.getHolidaysForDate === 'function' ? window.getHolidaysForDate(key) : []) || []; }catch(e){ return []; }
  }
  function currentPlayerId(){
    try{ if(typeof window.getCurrentPlayerId === 'function') return String(window.getCurrentPlayerId() || '').toLowerCase(); }catch(e){}
    try{ if(window.userInfo && window.userInfo.email) return String(window.userInfo.email).toLowerCase(); }catch(e){}
    return 'local';
  }
  function challengeTitle(ch){ return String((ch && (ch.title || ch.name)) || 'Challenge'); }
  function challengeDueOn(ch, key){
    if(!ch || ch.active === false) return false;
    var rec = ch.recurrence || 'daily';
    var start = dateKey(ch.startDate || ch.date || ch.createdAt || key);
    if(rec === 'daily') return start <= key;
    if(rec === 'weekly'){
      try{
        var days = ch.days || ch.weekdays || [];
        if(Array.isArray(days) && days.length) return days.indexOf(parseDate(key).getDay()) >= 0 && start <= key;
      }catch(e){}
    }
    return start === key;
  }
  function challengeDone(ch, key){
    var me = currentPlayerId();
    var ids = new Set([me]);
    try{ if(window.userInfo && window.userInfo.email) ids.add(String(window.userInfo.email).toLowerCase()); }catch(e){}
    var list = readList('challenge_completions', []).concat(readList('challengeCompletions', []));
    var seen = new Set();
    return list.some(function(c){
      var ck = [c.challengeId, c.date || c.completedDate || c.createdAt, c.playerId || c.userEmail || c.email || ''].join('|');
      if(seen.has(ck)) return false;
      seen.add(ck);
      var who = String(c.playerId || c.userEmail || c.email || '').toLowerCase();
      return String(c.challengeId) === String(ch.id) && dateKey(c.date || c.completedDate || c.createdAt) === key && (!who || ids.has(who));
    });
  }
  function challengesForDate(key){
    key = dateKey(key);
    return readList('challenges', []).filter(function(ch){ return challengeDueOn(ch, key); }).map(function(ch){
      var points = parseInt(ch.points, 10) || 0;
      var done = challengeDone(ch, key);
      return Object.assign({}, ch, {title:challengeTitle(ch), points:points, done:done});
    });
  }
  function daySummary(key){
    key = dateKey(key);
    var challenges = challengesForDate(key);
    var donePoints = challenges.reduce(function(sum, ch){ return sum + (ch.done ? ch.points : 0); }, 0);
    var maxPoints = challenges.reduce(function(sum, ch){ return sum + ch.points; }, 0);
    return {
      key: key,
      events: eventsForDate(key),
      holidays: holidaysForDate(key),
      challenges: challenges,
      challengeDone: challenges.filter(function(ch){ return ch.done; }).length,
      challengeTotal: challenges.length,
      donePoints: donePoints,
      maxPoints: maxPoints
    };
  }
  function spansOverlap(aStart, aEnd, bStart, bEnd){ return aStart <= bEnd && bStart <= aEnd; }
  function timeMinutes(value, fallback){
    if(!value) return fallback;
    var parts = String(value).split(':');
    return ((parseInt(parts[0],10) || 0) * 60) + (parseInt(parts[1],10) || 0);
  }
  function eventConflicts(candidate, ignoreId){
    if(!candidate) return [];
    var cRange = rangeOf(candidate);
    var cAllDay = !timeOf(candidate);
    var cStartMin = timeMinutes(timeOf(candidate), 0);
    var cEndMin = timeMinutes(endTimeOf(candidate), cStartMin + 60);
    if(cEndMin <= cStartMin) cEndMin = cStartMin + 60;
    return allEvents().filter(function(event){
      if(ignoreId && String(event.id) === String(ignoreId)) return false;
      if(ignoreId && String(event.googleEventId || '') === String(ignoreId).replace(/^g_/, '')) return false;
      var range = rangeOf(event);
      if(!spansOverlap(cRange.start, cRange.end, range.start, range.end)) return false;
      var eAllDay = !timeOf(event);
      if(cAllDay || eAllDay) return true;
      var eStartMin = timeMinutes(timeOf(event), 0);
      var eEndMin = timeMinutes(endTimeOf(event), eStartMin + 60);
      if(eEndMin <= eStartMin) eEndMin = eStartMin + 60;
      return cStartMin < eEndMin && eStartMin < cEndMin;
    });
  }
  function conflictText(conflicts){
    return conflicts.slice(0,4).map(function(event){
      var range = rangeOf(event);
      return '• '+titleOf(event)+' · '+timeLabel(event)+' · '+(range.start === range.end ? fmtDateSafe(range.start) : fmtDateSafe(range.start)+' – '+fmtDateSafe(range.end));
    }).join('\n');
  }
  function localEvents(){ return readList('events', []); }
  function getToken(){
    try{ if(typeof accessToken !== 'undefined' && accessToken) return accessToken; }catch(e){}
    return window.accessToken || '';
  }
  function isDemo(){ try{ return !!window.isDemoMode || !!isDemoMode; }catch(e){ return !!window.isDemoMode; } }
  function canUseGoogle(){ var token = getToken(); return !!(token && token !== 'firebase-auth' && !isDemo()); }
  function syncEnabled(){
    try{ if(typeof window.isGoogleSyncEnabled === 'function') return !!window.isGoogleSyncEnabled(); }catch(e){}
    try{ return localStorage.getItem('change_google_sync_enabled') !== '0'; }catch(e){}
    return true;
  }
  function persistGoogleSyncEnabled(on){
    try{ if(typeof window.setGoogleSyncEnabled === 'function') window.setGoogleSyncEnabled(!!on); }catch(e){}
    try{ localStorage.setItem('change_google_sync_enabled', on ? '1' : '0'); }catch(e){}
  }
  function addOneHour(value){
    var parts = String(value || '09:00').split(':');
    var h = (parseInt(parts[0],10) || 9) + 1;
    var m = parseInt(parts[1],10) || 0;
    if(h > 23) h = 23;
    return pad(h)+':'+pad(m);
  }
  async function syncLocalEventToGoogle(event){
    if(!event || sourceOf(event) === 'google') return false;
    var token = getToken();
    if(!token || token === 'firebase-auth' || isDemo()){
      try{ if(typeof window.toast === 'function') window.toast('Google-Sync nicht möglich: Bitte mit Google-Kalenderzugriff anmelden.','err'); }catch(e){}
      return false;
    }
    var range = rangeOf(event);
    var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin');
    var body = {summary:titleOf(event), description:event.desc || event.description || ''};
    if(timeOf(event)){
      body.start = {dateTime:range.start+'T'+timeOf(event)+':00', timeZone:tz};
      body.end = {dateTime:range.end+'T'+(endTimeOf(event) || addOneHour(timeOf(event)))+':00', timeZone:tz};
    }else{
      body.start = {date:range.start};
      body.end = {date:addDays(range.end, 1)};
    }
    try{
      var url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'+(event.googleEventId ? '/'+encodeURIComponent(event.googleEventId) : '');
      var res = await fetch(url, {method:event.googleEventId ? 'PATCH' : 'POST', headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'}, body:JSON.stringify(body)});
      if(res.status === 401){
        try{ localStorage.removeItem('access_token'); }catch(e){}
        try{ accessToken = ''; window.accessToken = ''; }catch(e){}
        throw new Error('Google-Anmeldung abgelaufen');
      }
      if(!res.ok){
        var text = await res.text().catch(function(){ return String(res.status); });
        throw new Error('Google Kalender '+res.status+' '+text.slice(0,120));
      }
      var saved = await res.json();
      var list = localEvents();
      var index = list.findIndex(function(x){ return String(x.id) === String(event.id); });
      if(index >= 0){
        list[index].googleEventId = saved.id;
        list[index].googleSyncedAt = new Date().toISOString();
        list[index].googleSyncRequested = true;
        list[index].syncedToGoogle = true;
        writeEvents(list);
      }
      try{ if(typeof window.ChangeGoogleSyncStatus === 'object') window.ChangeGoogleSyncStatus.markSuccess(); }catch(e){}
      try{ if(typeof window.loadGoogleEvents === 'function') window.loadGoogleEvents(); }catch(e){}
      refresh();
      try{ if(typeof window.toast === 'function') window.toast('Mit Google Kalender synchronisiert ✓','ok'); }catch(e){}
      return true;
    }catch(error){
      console.warn('syncLocalEventToGoogle:', error);
      try{ if(typeof window.ChangeGoogleSyncStatus === 'object') window.ChangeGoogleSyncStatus.markError(error.message || String(error)); }catch(e){}
      try{ if(typeof window.toast === 'function') window.toast('Google-Sync fehlgeschlagen: '+(error.message || error),'err'); }catch(e){}
      return false;
    }
  }

  window.ChangeCalendarModel = {
    esc: esc,
    dateKey: dateKey,
    todayKey: todayKey,
    parseDate: parseDate,
    addDays: addDays,
    fmtDate: fmtDateSafe,
    weekday: weekday,
    titleOf: titleOf,
    rangeOf: rangeOf,
    timeOf: timeOf,
    endTimeOf: endTimeOf,
    timeLabel: timeLabel,
    sourceOf: sourceOf,
    allEvents: allEvents,
    eventById: eventById,
    eventsForDate: eventsForDate,
    holidaysForDate: holidaysForDate,
    challengesForDate: challengesForDate,
    daySummary: daySummary,
    eventConflicts: eventConflicts,
    conflictText: conflictText,
    localEvents: localEvents,
    writeEvents: writeEvents,
    refresh: refresh,
    canUseGoogle: canUseGoogle,
    syncEnabled: syncEnabled,
    persistGoogleSyncEnabled: persistGoogleSyncEnabled,
    syncLocalEventToGoogle: syncLocalEventToGoogle
  };

  window.getEventById = eventById;
  window.getAllEvents = allEvents;
})();
