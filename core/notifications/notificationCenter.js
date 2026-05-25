(function(){
  'use strict';

  var Store = window.ChangeNotificationStore;
  var DAY = 24 * 60 * 60 * 1000;
  var ORDER = {crit:0, warn:1, info:2, ok:3};

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function readGlobal(name, fallback){
    try{
      return Function('fallback','try{return (typeof '+name+'!=="undefined")?'+name+':fallback;}catch(e){return fallback;}')(fallback);
    }catch(e){ return fallback; }
  }
  function writeGlobal(name, value){
    try{ Function('value','try{'+name+'=value;}catch(e){}')(value); }catch(e){}
    try{ window[name] = value; }catch(e){}
  }
  function pad(n){ return String(n).padStart(2,'0'); }
  function todayKey(){
    if(typeof dateKey === 'function') return dateKey(new Date());
    var d = new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  }
  function dateOnly(value){
    if(!value) return '';
    if(value instanceof Date) return value.getFullYear()+'-'+pad(value.getMonth()+1)+'-'+pad(value.getDate());
    return String(value).slice(0,10);
  }
  function daysUntilKey(key){
    if(typeof daysUntil === 'function') return daysUntil(key);
    var d = new Date(key+'T12:00:00');
    var t = new Date();
    t.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    return Math.round((d - t) / DAY);
  }
  function formatDate(key){
    if(typeof fmtDate === 'function') return fmtDate(key);
    if(!key) return '';
    return new Date(key+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'});
  }
  function currentPlayerIds(){
    var ids = new Set(['me','ich']);
    try{
      var id = typeof getCurrentPlayerId === 'function' ? getCurrentPlayerId() : '';
      if(id) ids.add(String(id).toLowerCase());
    }catch(e){}
    try{
      var info = readGlobal('userInfo', {}) || {};
      if(info.email) ids.add(String(info.email).toLowerCase());
      if(info.name) ids.add(String(info.name).toLowerCase());
    }catch(e){}
    try{
      var fb = window.firebase && firebase.auth ? firebase.auth().currentUser : null;
      if(fb && fb.email) ids.add(String(fb.email).toLowerCase());
      if(fb && fb.uid) ids.add(String(fb.uid).toLowerCase());
    }catch(e){}
    return ids;
  }
  function eventTitle(ev){ return ev && (ev.title || ev.summary || ev.name) || 'Termin'; }
  function eventStart(ev){ return dateOnly(ev && (ev.startDate || ev.date || ev.dateKey || (ev.start && (ev.start.date || ev.start.dateTime)))); }
  function eventTime(ev){
    if(!ev) return '';
    if(ev.time) return ev.time;
    if(ev.start && ev.start.dateTime){
      try{ return new Date(ev.start.dateTime).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); }catch(e){}
    }
    return '';
  }
  function eventBody(ev, dk){
    var parts = [];
    var time = eventTime(ev);
    if(time) parts.push(time);
    if(dk) parts.push(formatDate(dk));
    if(ev && (ev.desc || ev.description)) parts.push(String(ev.desc || ev.description).replace(/<[^>]+>/g,'').slice(0,80));
    return parts.join(' · ');
  }
  function eventIcon(ev){
    var icons = {deadline:'⚠️', meeting:'📅', reminder:'🔔', other:'📌'};
    return icons[(ev && ev.type) || 'meeting'] || '📅';
  }
  function eventLabel(diff){
    if(diff < 0) return 'Überfällig';
    if(diff === 0) return 'Heute';
    if(diff === 1) return 'Morgen';
    return 'In '+diff+'T';
  }

  function buildEventNotifications(){
    var source = [];
    try{ if(typeof getAllEvents === 'function') source = getAllEvents() || []; }catch(e){ source = []; }
    if(!source.length) source = readGlobal('events', []) || [];
    var seen = new Set();
    return (source || []).map(function(ev){
      var dk = eventStart(ev);
      if(!dk) return null;
      var diff = daysUntilKey(dk);
      if(diff < -1 || diff > 1) return null;  // nur heute (0) und morgen (1)
      var rawId = String((ev && ev.id) || (ev && ev.googleEventId) || eventTitle(ev)+'_'+dk);
      var dedupe = rawId+'|'+dk+'|'+eventTitle(ev);
      if(seen.has(dedupe)) return null;
      seen.add(dedupe);
      var urgency = diff <= 0 ? 'crit' : diff <= 7 ? 'warn' : 'ok';
      return {
        id: 'event:'+rawId+':'+dk,
        kind: 'event',
        sourceId: rawId,
        title: eventTitle(ev),
        body: eventBody(ev, dk),
        date: dk,
        diff: diff,
        label: eventLabel(diff),
        urgency: urgency,
        icon: eventIcon(ev),
        color: (ev && ev.color) || 'blue',
        priority: urgency === 'crit' ? 10 : urgency === 'warn' ? 30 : 80,
        action: {type:'event', eventId: rawId}
      };
    }).filter(Boolean);
  }

  function challengeDueToday(ch, today){
    if(!ch || ch.active === false) return false;
    var start = dateOnly(ch.date || ch.startDate || ch.createdAt) || today;
    if((ch.recurrence || 'once') === 'daily') return start <= today;
    return start === today;
  }
  function buildChallengeNotifications(){
    var today = todayKey();
    var ids = currentPlayerIds();
    var challenges = readGlobal('challenges', []) || [];
    var completions = readGlobal('challengeCompletions', []) || [];
    var done = new Set();
    completions.forEach(function(c){
      var d = dateOnly(c && (c.date || c.completedDate || c.createdAt));
      if(d !== today) return;
      var who = String((c && (c.playerId || c.userEmail || c.email || c.playerName)) || '').toLowerCase();
      if(who && ids.size && !ids.has(who)) return;
      if(c && c.challengeId) done.add(String(c.challengeId));
    });
    var open = challenges.filter(function(ch){ return challengeDueToday(ch, today) && !done.has(String(ch.id)); });
    if(!open.length) return [];
    var points = open.reduce(function(sum, ch){ return sum + (parseInt(ch.points, 10) || 0); }, 0);
    return [{
      id: 'challenge:daily:'+today,
      kind: 'challenge',
      title: open.length === 1 ? '1 Challenge offen' : open.length+' Challenges offen',
      body: points+' Punkte möglich · Heute erledigen',
      date: today,
      diff: 0,
      label: 'Heute',
      urgency: 'warn',
      icon: '✅',
      priority: 20,
      action: {type:'view', view:'challenges'}
    }];
  }

  function buildNudgeNotifications(){
    var list = [];
    try{ list = JSON.parse(sessionStorage.getItem('change_nudges_in') || '[]') || []; }catch(e){ list = []; }
    return list.filter(function(n){ return n && n.localSeen !== true; }).slice(0,10).map(function(n){
      var key = [n.from || '', n.sentAt || '', n.message || ''].join('|');
      return {
        id: 'nudge:'+key,
        kind: 'nudge',
        title: (n.fromName || n.from || 'Jemand') + ' feuert dich an',
        body: n.message || 'Weiter so!',
        date: dateOnly(n.sentAt),
        diff: 0,
        label: 'Neu',
        urgency: 'info',
        icon: '💪',
        priority: 15,
        action: {type:'view', view:'challenges'},
        nudgeKey: key
      };
    });
  }

  function buildGoogleSyncNotifications(){
    try{
      var sync = window.ChangeGoogleSyncStatus && window.ChangeGoogleSyncStatus.getStatus ? window.ChangeGoogleSyncStatus.getStatus() : null;
      if(!sync || !sync.error) return [];
      return [{
        id: 'google-sync:error:'+String(sync.error).slice(0,64),
        kind: 'google-sync',
        title: 'Google-Sync prüfen',
        body: sync.error,
        date: todayKey(),
        diff: 0,
        label: 'Aktion nötig',
        urgency: 'crit',
        icon: '⚠️',
        priority: 8,
        action: {type:'settings', tab:'sync'}
      }];
    }catch(e){ return []; }
  }

  function buildPlayerActivityNotifications(){
    try{
      if(!window.ChangePlayerActivity || typeof window.ChangePlayerActivity.inboxItems !== 'function') return [];
      return window.ChangePlayerActivity.inboxItems(3);
    }catch(e){ return []; }
  }

  function buildDailySummaryNotifications(){
    try{
      if(!window.ChangePlayerActivity || typeof window.ChangePlayerActivity.dailySummaryNotification !== 'function') return [];
      var note = window.ChangePlayerActivity.dailySummaryNotification();
      return note ? [note] : [];
    }catch(e){ return []; }
  }

  function buildWeatherHealthNotifications(){
    try{
      if(!window.ChangeWeatherRules || typeof window.ChangeWeatherRules.buildNotifications !== 'function') return [];
      return window.ChangeWeatherRules.buildNotifications() || [];
    }catch(e){ return []; }
  }

  function buildAll(options){
    options = options || {};
    var notes = []
      .concat(buildGoogleSyncNotifications())
      .concat(buildNudgeNotifications())
      .concat(buildPlayerActivityNotifications())
      .concat(buildWeatherHealthNotifications())
      .concat(buildChallengeNotifications())
      // buildDailySummaryNotifications() → entfernt (Tageszusammenfassung nicht gewünscht)
      .concat(buildEventNotifications());
    notes.sort(function(a,b){
      return (a.priority - b.priority) || ((ORDER[a.urgency] || 9) - (ORDER[b.urgency] || 9)) || ((a.diff || 0) - (b.diff || 0)) || String(a.title).localeCompare(String(b.title));
    });
    if(!options.includeRead) notes = notes.filter(function(n){ return !Store.isRead(n.id); });
    writeGlobal('notifications', notes);
    return notes;
  }

  function markRelatedNudgeRead(id){
    if(!String(id || '').startsWith('nudge:')) return;
    try{
      var key = String(id).slice(6);
      var arr = JSON.parse(sessionStorage.getItem('change_nudges_in') || '[]') || [];
      arr = arr.map(function(n){
        var nKey = [n.from || '', n.sentAt || '', n.message || ''].join('|');
        return nKey === key ? Object.assign({}, n, {localSeen:true}) : n;
      });
      sessionStorage.setItem('change_nudges_in', JSON.stringify(arr));
    }catch(e){}
  }
  function markRead(id){
    Store.markRead(id);
    markRelatedNudgeRead(id);
    updateBellIndicator();
  }
  function markAllRead(){
    var ids = buildAll({includeRead:false}).map(function(n){ return n.id; });
    Store.markManyRead(ids);
    ids.forEach(markRelatedNudgeRead);
    updateBellIndicator();
  }

  function updateBellIndicator(){
    var count = buildAll({includeRead:false}).length;
    var dot = document.getElementById('notif-dot');
    var badge = document.getElementById('notif-count-badge');
    if(dot) dot.style.display = count > 0 ? 'block' : 'none';
    if(badge){
      if(count > 0){
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.style.display = 'block';
      }else{
        badge.textContent = '';
        badge.style.display = 'none';
      }
    }
  }

  function browserNotificationAllowed(){ return Store.pushActive(); }
  function fireDueBrowserNotifications(){
    if(!browserNotificationAllowed()) return;
    var firedToday = 'browser_fired_' + todayKey();
    var fired = new Set(JSON.parse(sessionStorage.getItem(firedToday) || '[]'));
    function send(id, title, body, tag){
      if(fired.has(id) || Store.wasFired(id)) return;
      try{
        new Notification(title, {body: body || '', tag: tag || id, icon: '/icons/icon-change-192.png'});
        Store.markFired(id);
        fired.add(id);
        sessionStorage.setItem(firedToday, JSON.stringify(Array.from(fired)));
      }catch(e){}
    }
    buildAll({includeRead:false}).forEach(function(n){
      if(n.kind === 'event'){
        // Termin morgen oder heute
        var rawEvent = null;
        try{ rawEvent = typeof getEventById === 'function' ? getEventById(n.sourceId) : null; }catch(e){}
        var threshold = rawEvent && rawEvent.notifDaysBefore != null ? parseInt(rawEvent.notifDaysBefore,10) : 1;
        if(n.diff !== threshold) return;
        send('browser:'+n.id+':'+n.diff, (n.diff===0?'Heute':'Morgen')+': '+n.title, n.body, n.id);
      } else if(n.kind === 'weather' || n.kind === 'pollen'){
        // Wetter/Pollen einmal pro Tag
        send('browser:'+n.id, n.title, n.body, n.id);
      } else if(n.kind === 'challenge'){
        // Challenge-Erinnerung einmal pro Tag
        send('browser:'+n.id, n.title, n.body, n.id);
      }
    });
  }
  function checkNotifications(){
    var notes = buildAll({includeRead:false});
    updateBellIndicator();
    fireDueBrowserNotifications();
    return notes;
  }

  function openNotification(id){
    var note = buildAll({includeRead:true}).find(function(n){ return n.id === id; });
    markRead(id);
    if(note && note.action){
      if(note.action.type === 'event'){
        try{ if(typeof setMainView === 'function') setMainView('calendar'); }catch(e){}
        setTimeout(function(){
          try{ if(typeof openEventPanel === 'function') openEventPanel(note.action.eventId); }catch(e){}
        }, 180);
      }else if(note.action.type === 'view' && note.action.view){
        try{ if(typeof setMainView === 'function') setMainView(note.action.view); }catch(e){}
      }else if(note.action.type === 'settings'){
        try{ if(typeof openSettingsPanel === 'function') openSettingsPanel(note.action.tab || 'sync'); }catch(e){}
      }
    }
    if(!note || !note.action || note.action.type !== 'settings'){
      try{ if(typeof closePanel === 'function') closePanel(); }catch(e){}
    }
  }

  window.ChangeNotifications = {
    build: buildAll,
    check: checkNotifications,
    updateBellIndicator: updateBellIndicator,
    markRead: markRead,
    markAllRead: markAllRead,
    openNotification: openNotification,
    esc: esc,
    formatDate: formatDate
  };

  window.checkNotifications = checkNotifications;
  window.updateBellIndicator = updateBellIndicator;
  window.markNotificationRead = function(id){
    markRead(id);
    if(window.ChangeNotificationBell && typeof window.ChangeNotificationBell.render === 'function') window.ChangeNotificationBell.render();
  };
  window.markAllNotificationsRead = function(){
    markAllRead();
    if(window.ChangeNotificationBell && typeof window.ChangeNotificationBell.render === 'function') window.ChangeNotificationBell.render();
  };
  window.openNotificationAction = openNotification;

  setTimeout(checkNotifications, 0);
  setTimeout(checkNotifications, 600);
  setInterval(checkNotifications, 5 * 60 * 1000);
})();
