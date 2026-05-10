(function(){
  'use strict';

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function pad(n){ return String(n).padStart(2, '0'); }
  function todayKey(){ var d = new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function dateOnly(value){ return String(value || '').slice(0,10); }
  function readList(name){
    try{ if(Array.isArray(window[name])) return window[name]; }catch(e){}
    try{ if(typeof window.ls === 'function'){ var v = window.ls(name); if(Array.isArray(v)) return v; } }catch(e){}
    try{ var raw = localStorage.getItem(name); if(raw){ var parsed = JSON.parse(raw); if(Array.isArray(parsed)) return parsed; } }catch(e){}
    return [];
  }
  function playerKey(player){ return String((player && (player.email || player.id || player.userEmail || player.uid)) || '').toLowerCase(); }
  function currentKey(){
    try{ if(typeof window.getCurrentPlayerId === 'function') return String(window.getCurrentPlayerId() || '').toLowerCase(); }catch(e){}
    try{ if(window.userInfo && window.userInfo.email) return String(window.userInfo.email).toLowerCase(); }catch(e){}
    return '';
  }
  function players(){
    try{ if(typeof window.getVisibleContestPlayers === 'function') return window.getVisibleContestPlayers() || []; }catch(e){}
    return readList('challengePlayers').concat(readList('challenge_players'));
  }
  function playerNameByKey(key){
    key = String(key || '').toLowerCase();
    var p = players().find(function(player){ return playerKey(player) === key; });
    return (p && (p.name || p.displayName || p.email || p.id)) || key || 'Mitspieler';
  }
  function challengeNameById(id){
    var ch = readList('challenges').find(function(item){ return String(item.id) === String(id); });
    return (ch && (ch.title || ch.name)) || 'Challenge';
  }
  function completions(){ return readList('challengeCompletions').concat(readList('challenge_completions')); }
  function getRecent(limit){
    limit = limit || 5;
    var seen = new Set();
    return completions().map(function(c){
      var id = c.id || [c.playerId || c.userEmail || c.email || '', c.challengeId || '', c.date || '', c.createdAt || ''].join('|');
      if(seen.has(id)) return null;
      seen.add(id);
      var key = String(c.playerId || c.userEmail || c.email || '').toLowerCase();
      return {
        id: id,
        playerId: key,
        playerName: c.playerName || playerNameByKey(key),
        challengeId: c.challengeId || '',
        challengeName: c.challengeName || challengeNameById(c.challengeId),
        points: parseInt(c.points,10) || 0,
        date: dateOnly(c.date || c.completedDate || c.createdAt),
        createdAt: c.createdAt || (dateOnly(c.date) ? dateOnly(c.date)+'T12:00:00' : '')
      };
    }).filter(Boolean).sort(function(a,b){ return String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)); }).slice(0, limit);
  }
  function todayStats(){
    var today = todayKey();
    var byPlayer = new Map();
    completions().forEach(function(c){
      if(dateOnly(c.date || c.completedDate || c.createdAt) !== today) return;
      var key = String(c.playerId || c.userEmail || c.email || '').toLowerCase() || 'unknown';
      var cur = byPlayer.get(key) || {playerId:key, playerName:c.playerName || playerNameByKey(key), points:0, count:0};
      cur.points += parseInt(c.points,10) || 0;
      cur.count += 1;
      byPlayer.set(key, cur);
    });
    return Array.from(byPlayer.values()).sort(function(a,b){ return b.points - a.points || b.count - a.count; });
  }
  function summaryText(){
    var stats = todayStats();
    if(!stats.length) return 'Heute noch keine Aktivität.';
    var me = currentKey();
    var own = stats.find(function(s){ return s.playerId === me; });
    var total = stats.reduce(function(sum, s){ return sum + s.points; }, 0);
    var active = stats.length;
    if(own) return 'Du: '+own.points+' P · '+active+' aktiv · Team: '+total+' P';
    return active+' Mitspieler aktiv · Team: '+total+' P';
  }
  function inboxItems(limit){
    var me = currentKey();
    return getRecent(limit || 4).filter(function(item){ return !me || item.playerId !== me; }).map(function(item){
      return {
        id: 'activity:'+item.id,
        kind: 'activity',
        title: item.playerName+' war aktiv',
        body: item.challengeName+' · +'+item.points+' P',
        date: item.date,
        diff: 0,
        label: 'Neu',
        urgency: 'info',
        icon: '👥',
        priority: 35,
        action: {type:'view', view:'challenges'}
      };
    });
  }
  function panelHtml(limit){
    var rows = getRecent(limit || 5);
    if(!rows.length) return '<div class="dash-empty">Heute noch keine Mitspieler-Aktivität</div>';
    return rows.map(function(item){
      return '<div class="activity-row"><div class="activity-icon">👥</div><div class="activity-main"><div class="activity-title">'+esc(item.playerName)+'</div><div class="activity-sub">'+esc(item.challengeName)+' · +'+item.points+' P</div></div></div>';
    }).join('');
  }
  function dailySummaryNotification(){
    var today = todayKey();
    var model = window.ChangeCalendarModel;
    var day = model && model.daySummary ? model.daySummary(today) : null;
    if(!day || (!day.challengeTotal && !day.events.length)) return null;
    return {
      id: 'summary:daily:'+today,
      kind: 'summary',
      title: 'Tageszusammenfassung',
      body: day.donePoints+' / '+day.maxPoints+' Punkte · '+day.events.length+' Termin'+(day.events.length === 1 ? '' : 'e'),
      date: today,
      diff: 0,
      label: 'Heute',
      urgency: 'ok',
      icon: '🌙',
      priority: 70,
      action: {type:'view', view:'dashboard'}
    };
  }

  window.ChangePlayerActivity = {
    recent: getRecent,
    todayStats: todayStats,
    summaryText: summaryText,
    inboxItems: inboxItems,
    panelHtml: panelHtml,
    dailySummaryNotification: dailySummaryNotification
  };
})();
