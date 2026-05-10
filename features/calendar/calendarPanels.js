(function(){
  'use strict';

  var M = window.ChangeCalendarModel;
  if(!M) return;

  function $(id){ return document.getElementById(id); }
  function esc(v){ return M.esc(v); }
  function gBadge(event){
    if(M.sourceOf(event) === 'google') return '<span class="change-google-dot" title="Google Kalender">G</span>';
    if(event && (event.googleEventId || event.syncedToGoogle || event.googleSyncedAt)) return '<span class="change-google-dot synced" title="an Google übertragen">✓</span>';
    return '';
  }
  function dateLabel(event){
    var range = M.rangeOf(event);
    return range.start === range.end ? M.fmtDate(range.start) : M.fmtDate(range.start)+' – '+M.fmtDate(range.end);
  }
  function eventRow(event, options){
    options = options || {};
    return '<div class="change-day-event '+(options.detail ? 'change-event-detail-card' : '')+'" '+(options.detail ? '' : 'onclick="window.openEventPanel(\''+esc(event.id || '')+'\')"')+'>'
      + '<div class="change-day-time">'+esc(M.timeLabel(event))+'</div>'
      + '<div class="change-day-main"><div class="change-day-title">'+esc(M.titleOf(event))+gBadge(event)+'</div>'
      + '<div class="change-day-sub">'+esc(dateLabel(event))+(event.location ? ' · '+esc(event.location) : '')+'</div>'
      + (options.detail && (event.desc || event.description) ? '<div class="change-day-sub" style="margin-top:8px;line-height:1.5">'+esc(event.desc || event.description)+'</div>' : '')
      + '</div></div>';
  }
  function challengeRow(challenge){
    return '<div class="change-challenge-row '+(challenge.done ? 'done' : '')+'" onclick="try{setMainView(\'challenges\');closePanel();}catch(e){}">'
      + '<div class="change-challenge-icon">'+esc(challenge.icon || '🏆')+'</div>'
      + '<div style="min-width:0"><div class="change-challenge-title">'+esc(challenge.title || 'Challenge')+'</div>'
      + '<div class="change-challenge-sub">'+(challenge.points || 0)+' Punkte</div></div>'
      + '<div class="change-challenge-badge">'+(challenge.done ? '✓ erledigt' : 'offen')+'</div>'
      + '</div>';
  }
  function openDayPanel(date, givenEvents){
    var key = M.dateKey(date);
    var summary = M.daySummary(key);
    var events = M.eventsForDate(key, givenEvents || summary.events);
    var title = events.length ? (events.length+' '+(events.length === 1 ? 'Termin' : 'Termine')) : (summary.holidays.length ? 'Feiertag' : 'Tag');
    var html = '<div class="change-day-header"><div class="change-day-date">'+esc(M.weekday(key)+', '+M.fmtDate(key))+'</div>';
    if(summary.challengeTotal){
      html += '<div class="change-day-points">'+summary.donePoints+' / '+summary.maxPoints+' P</div>';
    }
    html += '</div>';

    if(summary.holidays.length){
      html += '<div class="change-day-section"><div class="change-day-section-title">Feiertage</div>';
      html += summary.holidays.map(function(h){ return '<div class="change-holiday-row"><div class="change-holiday-icon">🎉</div><div><span class="change-holiday-title">'+esc(h.name || h.title || h)+'</span><span class="change-holiday-sub">Feiertag</span></div></div>'; }).join('');
      html += '</div>';
    }

    html += '<div class="change-day-section"><div class="change-day-section-title">Termine</div>';
    html += events.length ? events.map(function(event){ return eventRow(event); }).join('') : '<div class="change-day-empty">Keine Termine für diesen Tag</div>';
    html += '</div>';

    html += '<div class="change-day-section"><div class="change-day-section-title">Challenges</div>';
    html += summary.challenges.length ? summary.challenges.map(challengeRow).join('') : '<div class="change-day-empty">Keine Challenges für diesen Tag</div>';
    html += '</div>';

    html += '<button class="btn btn-primary btn-full" style="margin-top:16px" onclick="window.openEventPanel(null, new Date(\''+key+'T12:00:00\'))">+ Neuer Termin für diesen Tag</button>';
    if(typeof window.openPanel === 'function') window.openPanel(title, html);
  }
  function readCandidate(existingId){
    var title = ($('ev-title') && $('ev-title').value || '').trim();
    var date = $('ev-date') && $('ev-date').value;
    var end = ($('ev-end-date') && $('ev-end-date').value) || date;
    if(end && date && end < date) end = date;
    var old = existingId ? M.localEvents().find(function(event){ return String(event.id) === String(existingId); }) : null;
    return {
      old: old,
      event: Object.assign({}, old || {}, {
        id: old ? old.id : 'ev_'+(typeof window.uid === 'function' ? window.uid() : (Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8))),
        title: title,
        date: date,
        startDate: date,
        endDate: end,
        time: ($('ev-time') && $('ev-time').value) || '',
        endTime: ($('ev-end') && $('ev-end').value) || '',
        color: ($('ev-color') && $('ev-color').value) || 'blue',
        type: (old && old.type) || 'meeting',
        desc: (($('ev-desc') && $('ev-desc').value) || '').trim(),
        source: 'local',
        googleEventId: (old && old.googleEventId) || '',
        googleSyncRequested: !!($('ev-google-sync') && $('ev-google-sync').checked),
        createdAt: (old && old.createdAt) || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    };
  }
  function openEventPanel(id, preDate){
    var event = id ? M.eventById(id) : null;
    if(event && M.sourceOf(event) === 'google'){
      if(typeof window.openPanel === 'function') window.openPanel(M.titleOf(event), eventRow(event, {detail:true})+'<button class="btn btn-ghost btn-full" onclick="closePanel()">Schließen</button>');
      return;
    }
    var start = event ? (event.startDate || event.date) : M.dateKey(preDate || new Date());
    var end = event ? (event.endDate || event.date || start) : start;
    var syncOn = !!(event && (event.googleSyncRequested || event.googleEventId || event.syncedToGoogle));
    var googleHint = M.canUseGoogle() ? '' : '<div class="settings-hint" style="margin-top:6px">Google-Kalenderzugriff ist aktuell nicht aktiv. Der Schalter wird beim Speichern geprüft.</div>';
    var html = ''
      + '<div id="event-conflict-note" class="change-conflict-note"></div>'
      + '<div class="fg"><label class="flabel">Titel *</label><input class="finput" id="ev-title" value="'+esc(event && event.title || '')+'"></div>'
      + '<div class="fr"><div class="fg"><label class="flabel">Von-Datum *</label><input type="date" class="finput" id="ev-date" value="'+esc(start)+'"></div><div class="fg"><label class="flabel">Bis-Datum</label><input type="date" class="finput" id="ev-end-date" value="'+esc(end)+'"></div></div>'
      + '<div class="fr"><div class="fg"><label class="flabel">Von Uhrzeit</label><input type="time" class="finput" id="ev-time" value="'+esc(event && event.time || '')+'"></div><div class="fg"><label class="flabel">Bis Uhrzeit</label><input type="time" class="finput" id="ev-end" value="'+esc(event && event.endTime || '')+'"></div></div>'
      + '<div class="fg"><label class="flabel">Farbe</label><select class="finput" id="ev-color">'+[['blue','Blau'],['green','Grün'],['amber','Gelb'],['red','Rot'],['purple','Lila']].map(function(pair){ return '<option value="'+pair[0]+'" '+(((event && event.color) || 'blue') === pair[0] ? 'selected' : '')+'>'+pair[1]+'</option>'; }).join('')+'</select></div>'
      + '<div class="fg"><label class="flabel">Beschreibung</label><textarea class="finput" id="ev-desc" rows="4">'+esc(event && event.desc || '')+'</textarea></div>'
      + '<div class="toggle-row" style="margin:8px 0 12px"><div class="toggle-copy"><div class="toggle-title">Mit Google Kalender synchronisieren</div><div class="settings-hint">Nur für diesen selbst erstellten Termin.</div></div><label class="switch"><input type="checkbox" id="ev-google-sync" '+(syncOn ? 'checked' : '')+'><span class="slider"></span></label></div>'+googleHint
      + '<div class="fa"><button class="btn btn-primary" style="flex:1" onclick="window.saveEvent(\''+esc(event && event.id || '')+'\')">Speichern</button>'+(event ? '<button class="btn btn-danger" onclick="window.deleteEvent(\''+esc(event.id)+'\')">Löschen</button>' : '')+'</div>';
    if(typeof window.openPanel === 'function') window.openPanel(event ? 'Termin bearbeiten' : 'Neuer Termin', html);
    setTimeout(bindConflictPreview.bind(null, event && event.id), 30);
  }
  function bindConflictPreview(existingId){
    ['ev-date','ev-end-date','ev-time','ev-end','ev-title'].forEach(function(id){
      var el = $(id);
      if(el && !el._changeConflictBound){
        el._changeConflictBound = true;
        el.addEventListener('input', function(){ updateConflictPreview(existingId); });
        el.addEventListener('change', function(){ updateConflictPreview(existingId); });
      }
    });
    updateConflictPreview(existingId);
  }
  function updateConflictPreview(existingId){
    var note = $('event-conflict-note');
    if(!note) return;
    var candidate = readCandidate(existingId).event;
    if(!candidate.date){ note.classList.remove('visible'); return; }
    var conflicts = M.eventConflicts(candidate, existingId);
    if(!conflicts.length){ note.classList.remove('visible'); note.textContent = ''; return; }
    note.innerHTML = '<strong>Konflikt möglich</strong><br>'+esc(conflicts.slice(0,2).map(function(event){ return M.titleOf(event)+' · '+M.timeLabel(event); }).join(' / '));
    note.classList.add('visible');
  }
  function saveEvent(existingId){
    var result = readCandidate(existingId);
    var event = result.event;
    if(!event.title || !event.date){
      try{ if(typeof window.toast === 'function') window.toast('Titel und Von-Datum fehlen','err'); }catch(e){}
      return false;
    }
    var conflicts = M.eventConflicts(event, existingId);
    if(conflicts.length){
      var message = 'Dieser Termin überschneidet sich mit:\n\n'+M.conflictText(conflicts)+'\n\nTrotzdem speichern?';
      if(!confirm(message)) return false;
    }
    var list = M.localEvents();
    var index = list.findIndex(function(item){ return String(item.id) === String(event.id); });
    if(index >= 0) list[index] = event;
    else list.push(event);
    M.writeEvents(list);
    try{ if(typeof window.closePanel === 'function') window.closePanel(); }catch(e){}
    M.refresh();
    try{ if(typeof window.toast === 'function') window.toast(result.old ? 'Termin aktualisiert ✓' : 'Termin gespeichert ✓','ok'); }catch(e){}
    if(event.googleSyncRequested){
      if(M.canUseGoogle()) setTimeout(function(){ M.syncLocalEventToGoogle(event); }, 150);
      else try{ if(typeof window.toast === 'function') window.toast('Google-Sync nicht möglich: Bitte mit Google-Kalenderzugriff anmelden.','err'); }catch(e){}
    }
    return event;
  }
  function deleteEvent(id){
    var event = M.localEvents().find(function(item){ return String(item.id) === String(id); });
    if(!event || M.sourceOf(event) === 'google'){
      try{ if(typeof window.toast === 'function') window.toast('Nur selbst erstellte lokale Termine können gelöscht werden.','err'); }catch(e){}
      return;
    }
    var message = event.googleEventId ? 'Diesen lokalen Termin löschen? Die Google-Kopie bleibt bestehen.' : 'Diesen lokalen Termin löschen?';
    if(!confirm(message)) return;
    M.writeEvents(M.localEvents().filter(function(item){ return String(item.id) !== String(id); }));
    try{ if(typeof window.closePanel === 'function') window.closePanel(); }catch(e){}
    M.refresh();
    try{ if(typeof window.toast === 'function') window.toast('Termin gelöscht ✓','ok'); }catch(e){}
  }

  window.ChangeCalendarPanels = {
    openDayPanel: openDayPanel,
    openEventPanel: openEventPanel,
    saveEvent: saveEvent,
    deleteEvent: deleteEvent
  };
  window.openDayPanel = openDayPanel;
  window.onDayClick = function(date, events){ openDayPanel(date, events || []); };
  window.openEventPanel = openEventPanel;
  window.saveEvent = saveEvent;
  window.deleteEvent = deleteEvent;
  window.syncEventToGoogleReliable = M.syncLocalEventToGoogle;
})();
