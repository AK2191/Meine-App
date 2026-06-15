/* Change App · Dashboard · Premium Tages-Hub
 * Version 0.1.0071
 * UI-only: baut das Dashboard neu auf, ohne Kalender-, Challenge-, Sync- oder Firebase-Logik zu ändern.
 */
(function(){
  'use strict';

  var VERSION = '0.1.0071';
  var DAY = 86400000;
  var styleInstalled = false;

  function $(id){ return document.getElementById(id); }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"'`]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];
    });
  }
  function pad(n){ return String(n).padStart(2,'0'); }
  function dateKey(value){
    if(value instanceof Date) return value.getFullYear()+'-'+pad(value.getMonth()+1)+'-'+pad(value.getDate());
    if(value) return String(value).slice(0,10);
    return dateKey(new Date());
  }
  function parseDate(key){ return new Date(String(key || dateKey(new Date())).slice(0,10)+'T12:00:00'); }
  function addDays(key, amount){ var d = parseDate(key); d.setDate(d.getDate() + amount); return dateKey(d); }
  function diffDays(key){ return Math.round((parseDate(key).getTime() - parseDate(dateKey(new Date())).getTime()) / DAY); }
  function fmtShort(key){
    try{ return parseDate(key).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}).replace(/\.$/,''); }
    catch(e){ return String(key || ''); }
  }
  function fmtWeekdayDate(key){
    try{ return parseDate(key).toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}); }
    catch(e){ return String(key || ''); }
  }
  function dayLabel(key){
    var d = diffDays(key);
    if(d === 0) return 'Heute';
    if(d === 1) return 'Morgen';
    if(d === 2) return 'Übermorgen';
    if(d > 0) return 'In '+d+' Tagen';
    return 'Heute';
  }
  function titleOf(event){ return String((event && (event.title || event.summary || event.name)) || 'Termin').trim() || 'Termin'; }
  function startOf(event){
    if(!event) return '';
    if(event.startDate || event.date || event.dateKey) return dateKey(event.startDate || event.date || event.dateKey);
    if(event.start && (event.start.date || event.start.dateTime)) return dateKey(event.start.date || event.start.dateTime);
    return '';
  }
  function endOf(event){
    if(!event) return '';
    var start = startOf(event);
    var end = event.endDate || event.toDate || event.untilDate || event.dateEnd || event.date || event.startDate || '';
    if(!end && event.end && event.end.date) end = addDays(dateKey(event.end.date), -1);
    if(!end && event.end && event.end.dateTime) end = dateKey(event.end.dateTime);
    end = dateKey(end || start);
    if(!end || (start && end < start)) end = start;
    return end;
  }
  function timeOf(event){
    if(event && event.time) return String(event.time).slice(0,5);
    if(event && event.start && event.start.dateTime){ try{ return new Date(event.start.dateTime).toTimeString().slice(0,5); }catch(e){} }
    return '';
  }
  function endTimeOf(event){
    if(event && event.endTime) return String(event.endTime).slice(0,5);
    if(event && event.end && event.end.dateTime){ try{ return new Date(event.end.dateTime).toTimeString().slice(0,5); }catch(e){} }
    return '';
  }
  function timeLabel(event){
    var start = timeOf(event), end = endTimeOf(event);
    if(start && end && start !== end) return start+' – '+end;
    if(start) return start;
    return 'Ganztägig';
  }
  function locationOf(event){ return String((event && (event.location || event.place || event.venue)) || '').trim(); }
  function eventIcon(event){
    var type = String((event && event.type) || '').toLowerCase();
    if(type === 'birthday' || (event && event.source === 'birthday')) return '🎁';
    if(type.indexOf('hair') >= 0 || /friseur/i.test(titleOf(event))) return '✂️';
    if(event && (event.source === 'google' || String(event.id || '').indexOf('g_') === 0)) return 'G';
    return '📅';
  }
  function eventTone(event){
    var color = String((event && event.color) || 'green').toLowerCase();
    if(['blue','amber','red','purple','green'].indexOf(color) >= 0) return color;
    if(event && (event.source === 'google' || String(event.id || '').indexOf('g_') === 0)) return 'blue';
    return 'green';
  }
  function allEvents(){
    if(window.ChangeCalendarModel && window.ChangeCalendarModel.allEvents){
      try{ return window.ChangeCalendarModel.allEvents() || []; }catch(e){}
    }
    if(typeof window.getAllEvents === 'function'){
      try{ return window.getAllEvents() || []; }catch(e){}
    }
    var out = [];
    try{ (Array.isArray(window.events) ? window.events : []).forEach(function(e){ out.push(e); }); }catch(e){}
    try{
      (Array.isArray(window.gEvents) ? window.gEvents : []).forEach(function(ge){
        if(!ge) return;
        var s = startOf(ge);
        if(!s) return;
        out.push(Object.assign({}, ge, {id:String(ge.id || '').indexOf('g_') === 0 ? ge.id : 'g_'+(ge.id || s+'_'+titleOf(ge)), title:titleOf(ge), date:s, startDate:s, endDate:endOf(ge), time:timeOf(ge), endTime:endTimeOf(ge), color:'blue', source:'google'}));
      });
    }catch(e){}
    return out;
  }
  function dedupEvents(list){
    var seen = new Set();
    return (list || []).filter(function(event){
      var s = startOf(event), e = endOf(event);
      if(!s) return false;
      var key = (event.googleEventId ? 'g:'+event.googleEventId : String(event.id || titleOf(event)))+'|'+s+'|'+e+'|'+timeOf(event);
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function eventsForRange(from, to){
    return dedupEvents(allEvents()).filter(function(event){
      return startOf(event) <= to && endOf(event) >= from;
    }).sort(function(a,b){
      var ra = startOf(a), rb = startOf(b);
      return ra.localeCompare(rb) || (timeOf(a) || '99:99').localeCompare(timeOf(b) || '99:99') || titleOf(a).localeCompare(titleOf(b));
    });
  }
  function todayEvents(){ var td = dateKey(new Date()); return eventsForRange(td, td); }
  function nextEvent(){
    var td = dateKey(new Date());
    return eventsForRange(td, addDays(td, 60)).filter(function(event){
      return endOf(event) >= td;
    })[0] || null;
  }
  function todayChallenges(){
    try{
      if(typeof window.getOpenChallengesForDashboard === 'function') return window.getOpenChallengesForDashboard() || [];
    }catch(e){}
    var td = dateKey(new Date());
    var me = String((window.userInfo || {}).email || '').toLowerCase();
    var done = new Set((window.challengeCompletions || []).filter(function(c){
      return dateKey(c.date || c.completedDate || c.createdAt) === td && String(c.playerId || c.userEmail || c.email || '').toLowerCase() === me;
    }).map(function(c){ return String(c.challengeId); }));
    function optional(c){ return !!(c && (c.optional === true || c._optional === true || /^opt_/i.test(String(c.id || '')))); }
    function due(c){
      if(!c || c.active === false || optional(c)) return false;
      var generated = String(c.generatedFor || c.date || c.startDate || '').slice(0,10);
      var rec = String(c.recurrence || '').toLowerCase();
      if(rec === 'daily') return !generated || generated <= td;
      return !generated || generated === td;
    }
    return (window.challenges || []).filter(function(c){ return due(c) && !done.has(String(c.id)); });
  }
  function playerKey(player){ return String((player && (player.email || player.id || player.playerId)) || '').toLowerCase(); }
  function playerStats(id){
    try{ if(typeof window.getPlayerPointSummary === 'function') return window.getPlayerPointSummary(id) || {todayPoints:0,totalPoints:0,completedToday:0}; }catch(e){}
    return {todayPoints:0,totalPoints:0,completedToday:0};
  }
  function players(){
    try{ if(typeof window.getVisibleContestPlayers === 'function') return window.getVisibleContestPlayers() || []; }catch(e){}
    return Array.isArray(window.challengePlayers) ? window.challengePlayers : [];
  }
  function weatherData(){
    try{ return window.ChangeWeatherService && window.ChangeWeatherService.getCached ? window.ChangeWeatherService.getCached() : (window.ChangeWeatherStore && window.ChangeWeatherStore.readCache ? window.ChangeWeatherStore.readCache() : null); }catch(e){ return null; }
  }
  function weatherSummary(){
    var data = weatherData();
    var w = data && data.weather;
    if(!w) return {icon:'☁️', temp:'--°', text:'Wetter offen', meta:'Standort prüfen'};
    return {icon:w.icon || '🌦️', temp:(w.temperature != null ? Math.round(Number(w.temperature))+'°' : '--°'), text:w.summary || 'Wetter', meta:(w.forecast && w.forecast[0] ? '↑ '+Math.round(w.forecast[0].max)+'° · ↓ '+Math.round(w.forecast[0].min)+'°' : 'heute')};
  }
  function pollenSummary(){
    var data = weatherData();
    var p = data && data.pollen;
    if(!p) return {icon:'🌿', level:'-', text:'Pollen offen', meta:'Profil prüfen', tone:'green'};
    var items = (p.items || []).slice().sort(function(a,b){ return (b.rank - a.rank) || (b.value - a.value); });
    var top = items[0];
    var level = top && top.level === 'high' ? 'Hoch' : top && top.level === 'medium' ? 'Mittel' : top && top.level === 'low' ? 'Niedrig' : 'Ruhig';
    return {icon:'🌿', level:level, text:top ? top.name+' '+(top.levelLabel || '').trim() : 'keine Belastung', meta:(items.filter(function(x){ return Number(x.value) > 0; }).slice(0,2).map(function(x){ return x.name; }).join(', ') || 'keine Werte'), tone:level === 'Hoch' ? 'red' : level === 'Mittel' ? 'amber' : 'green'};
  }
  function vacationSummary(){
    var txt = 'nicht geplant';
    var meta = 'Urlaub';
    try{
      var rows = [];
      if(typeof window.getUrlaubRowHtml === 'function'){
        var tmp = document.createElement('div');
        tmp.innerHTML = window.getUrlaubRowHtml() || '';
        rows = Array.prototype.slice.call(tmp.querySelectorAll('*')).map(function(n){ return n.textContent.trim(); }).filter(Boolean);
        txt = rows.find(function(x){ return /\d+\s*Tage|in\s*\d+\s*Tagen|\d{2}\.\d{2}/i.test(x); }) || txt;
        meta = rows.find(function(x){ return /Urlaub|Ferien|Reise/i.test(x); }) || meta;
      }
    }catch(e){}
    return {icon:'🌴', text:txt, meta:meta};
  }
  function friseurSummary(){
    var text = 'nicht geplant';
    var meta = 'Friseur';
    try{
      if(typeof window.getFriseurRowHtml === 'function'){
        var tmp = document.createElement('div');
        tmp.innerHTML = window.getFriseurRowHtml() || '';
        var title = tmp.querySelector('.dash-row-title');
        var sub = tmp.querySelector('.dash-row-sub');
        if(title && title.textContent.trim()) meta = title.textContent.trim();
        if(sub && sub.textContent.trim()) text = sub.textContent.trim().replace(/\s+/g,' ');
      }
    }catch(e){}
    return {icon:'✂️', text:text, meta:meta};
  }
  function greeting(){
    var hr = new Date().getHours();
    var name = String((window.userInfo && window.userInfo.name) || '').split(' ')[0];
    return (hr < 12 ? 'Guten Morgen' : hr < 17 ? 'Guten Tag' : 'Guten Abend') + (name ? ', '+name : '');
  }
  function statusCards(openChallenges, todayCount){
    var w = weatherSummary();
    var p = pollenSummary();
    var v = vacationSummary();
    var f = friseurSummary();
    return '<div class="dashp-quick-grid">' +
      '<button class="dashp-mini-card" onclick="setMainView(\'calendar\')"><span class="dashp-mini-icon">📅</span><span><b>'+todayCount+'</b><small>Termine heute</small></span></button>'+
      '<button class="dashp-mini-card" onclick="window.ChangeWeatherCard&&ChangeWeatherCard.openForecast&&ChangeWeatherCard.openForecast(\'weather\')"><span class="dashp-mini-icon">'+esc(w.icon)+'</span><span><b>'+esc(w.temp)+'</b><small>'+esc(w.text)+'</small></span></button>'+
      '<button class="dashp-mini-card" onclick="setMainView(\'pollen\')"><span class="dashp-mini-icon">'+esc(p.icon)+'</span><span><b>'+esc(p.level)+'</b><small>'+esc(p.text)+'</small></span></button>'+
      '<button class="dashp-mini-card" onclick="window.openFriseurPanel&&window.openFriseurPanel()"><span class="dashp-mini-icon">'+esc(f.icon)+'</span><span><b>'+esc(f.meta)+'</b><small>'+esc(f.text)+'</small></span></button>'+
      '<button class="dashp-mini-card" onclick="setMainView(\'calendar\')"><span class="dashp-mini-icon">'+esc(v.icon)+'</span><span><b>'+esc(v.text)+'</b><small>'+esc(v.meta)+'</small></span></button>'+
      '<button class="dashp-mini-card" onclick="setMainView(\'challenges\')"><span class="dashp-mini-icon">💪</span><span><b>'+openChallenges+'</b><small>Challenges offen</small></span></button>'+
      '</div>';
  }

  function overviewRows(todayCount, next, w, p, f, v){
    var nextLabel = next ? (timeLabel(next)+' · '+titleOf(next)) : 'Kein Termin geplant';
    return '<div class="dashp-hero-insights" aria-label="Dashboard Schnellübersicht">'
      + '<button class="dashp-insight-row" onclick="window.ChangeWeatherCard&&ChangeWeatherCard.openForecast&&ChangeWeatherCard.openForecast(\'weather\')"><span class="dashp-insight-dot">'+esc(w.icon)+'</span><span><b>Wetter</b><small>'+esc(w.temp)+' · '+esc(w.text)+'</small></span></button>'
      + '<button class="dashp-insight-row" onclick="setMainView(\'pollen\')"><span class="dashp-insight-dot">🌿</span><span><b>Pollen</b><small>'+esc(p.level)+' · '+esc(p.meta || p.text)+'</small></span></button>'
      + '<button class="dashp-insight-row" onclick="setMainView(\'calendar\')"><span class="dashp-insight-dot">📅</span><span><b>Nächster Termin</b><small>'+esc(nextLabel)+'</small></span></button>'
      + '</div>';
  }
  function dashboardTermItems(){
    var td = dateKey(new Date());
    var today = todayEvents();
    var items = [{kind:'todayStatus', event:today[0] || null, count:today.length, key:td}];
    eventsForRange(addDays(td,1), addDays(td,90)).slice(0,3).forEach(function(event){ items.push({kind:'event', event:event, key:startOf(event)}); });
    var f = friseurSummary();
    if(items.length < 4 && f.text && !/nicht geplant/i.test(f.text)){ items.push({kind:'friseur', key:td, title:f.meta || 'Friseur', sub:f.text, icon:'✂️', action:'friseur'}); }
    var v = vacationSummary();
    if(items.length < 4 && v.text && !/nicht geplant/i.test(v.text)){ items.push({kind:'urlaub', key:td, title:'Urlaub', sub:v.text+' · '+v.meta, icon:'🌴', action:'urlaub'}); }
    return items.slice(0,4);
  }
  function timelineUpcomingHtml(items){
    items = items || [];
    if(!items.length) return '<div class="dashp-empty">Heute keiner vorhanden.</div>';
    return items.map(function(item){
      if(item.kind === 'todayStatus'){
        var ev = item.event;
        var label = ev ? (item.count > 1 ? item.count+' Termine heute' : 'Heute 1 Termin') : 'Heute keiner vorhanden';
        var sub = ev ? timeLabel(ev)+' · '+titleOf(ev) : 'Keine Termine für heute geplant.';
        var emptyToday = !ev;
        return '<div class="dashp-event-row tone-green '+(emptyToday?'is-disabled':'')+'" '+(emptyToday?'aria-disabled="true"':'onclick="setMainView(\'calendar\')"')+'>'
          + '<div class="dashp-event-icon">📅</div>'
          + '<div class="dashp-event-time"><strong>Heute</strong><small>'+esc(fmtShort(item.key))+'</small></div>'
          + '<div class="dashp-event-main"><strong>'+esc(label)+'</strong><span>'+esc(sub)+'</span></div>'
          + '</div>';
      }
      if(item.kind === 'event'){
        var event = item.event;
        var loc = locationOf(event);
        var isGoogle = event.source === 'google' || String(event.id || '').indexOf('g_') === 0;
        var k = startOf(event);
        return '<div class="dashp-event-row tone-'+eventTone(event)+'" onclick="setMainView(\'calendar\')">'
          + '<div class="dashp-event-icon">'+esc(eventIcon(event))+'</div>'
          + '<div class="dashp-event-time"><strong>'+esc(timeLabel(event))+'</strong><small>'+esc(dayLabel(k))+'</small></div>'
          + '<div class="dashp-event-main"><strong>'+esc(titleOf(event))+'</strong><span>'+esc(loc || (isGoogle ? 'Google Kalender' : fmtShort(k)))+'</span></div>'
          + (isGoogle ? '<span class="dashp-source-dot">G</span>' : '')
          + '</div>';
      }
      var click = item.action === 'friseur' ? 'window.openFriseurPanel&&window.openFriseurPanel()' : (item.action === 'urlaub' ? 'window.openUrlaubPanel?window.openUrlaubPanel():(window.openUrlaubSettings?window.openUrlaubSettings():setMainView(\'calendar\'))' : 'setMainView(\'calendar\')');
      return '<div class="dashp-event-row tone-green" onclick="'+click+'">'
        + '<div class="dashp-event-icon">'+esc(item.icon || '📌')+'</div>'
        + '<div class="dashp-event-time"><strong>'+esc(dayLabel(item.key || dateKey(new Date())))+'</strong><small>'+esc(fmtShort(item.key || dateKey(new Date())))+'</small></div>'
        + '<div class="dashp-event-main"><strong>'+esc(item.title || 'Eintrag')+'</strong><span>'+esc(item.sub || '')+'</span></div>'
        + '</div>';
    }).join('');
  }

  function timelineHtml(events){
    if(!events.length) return '<div class="dashp-empty">Heute sind keine Termine geplant.</div>';
    return events.slice(0,5).map(function(event){
      var loc = locationOf(event);
      var isGoogle = event.source === 'google' || String(event.id || '').indexOf('g_') === 0;
      return '<div class="dashp-event-row tone-'+eventTone(event)+'" onclick="setMainView(\'calendar\')">'
        + '<div class="dashp-event-icon">'+esc(eventIcon(event))+'</div>'
        + '<div class="dashp-event-time">'+esc(timeLabel(event))+'</div>'
        + '<div class="dashp-event-main"><strong>'+esc(titleOf(event))+'</strong><span>'+esc(loc || (isGoogle ? 'Google Kalender' : 'Heute'))+'</span></div>'
        + (isGoogle ? '<span class="dashp-source-dot">G</span>' : '')
        + '</div>';
    }).join('');
  }
  function challengesHtml(list){
    if(!list.length) return '<div class="dashp-empty">Alle Aufgaben für heute erledigt.</div>';
    return list.slice(0,4).map(function(c){
      var title = c.title || c.name || 'Challenge';
      var points = parseInt(c.points,10) || 0;
      var diff = c.difficultyLabel || c.difficulty || (points >= 30 ? 'Schwer' : '');
      return '<div class="dashp-task-row" onclick="setMainView(\'challenges\')">'
        + '<div class="dashp-task-icon">'+esc(c.icon || '💪')+'</div>'
        + '<div class="dashp-task-main"><strong>'+esc(title)+'</strong><span>'+esc(diff || 'Heute')+'</span></div>'
        + '<span class="dashp-points">+'+points+'</span>'
        + '</div>';
    }).join('');
  }
  function playersHtml(){
    var list = players().slice().sort(function(a,b){ return (playerStats(playerKey(b)).totalPoints || 0) - (playerStats(playerKey(a)).totalPoints || 0); }).slice(0,4);
    if(!list.length) return '<div class="dashp-empty">Noch keine Mitspieler sichtbar.</div>';
    var me = String((window.userInfo || {}).email || '').toLowerCase();
    return list.map(function(p, idx){
      var id = playerKey(p);
      var st = playerStats(id);
      var initials = String(p.name || p.email || '?').trim().slice(0,1).toUpperCase();
      return '<div class="dashp-player-row" onclick="setMainView(\'challenges\')">'
        + '<span class="dashp-rank">'+(idx+1)+'</span>'
        + '<span class="dashp-avatar-small">'+esc(initials)+'</span>'
        + '<span class="dashp-player-main"><strong>'+esc(p.name || p.email || 'Mitspieler')+(id === me ? ' <em>DU</em>' : '')+'</strong><small>Heute '+(st.todayPoints || 0)+' P · Gesamt '+(st.totalPoints || 0)+' P</small></span>'
        + '<b class="dashp-score">'+(st.totalPoints || 0)+'</b>'
        + '</div>';
    }).join('');
  }
  function forecastHtml(){
    var data = weatherData();
    var weather = data && data.weather;
    var days = weather && Array.isArray(weather.forecast) ? weather.forecast.slice(0,7) : [];
    if(!days.length) return '<div class="dashp-empty">7-Tage-Ausblick noch nicht verfügbar.</div>';
    var pollen = pollenSummary();
    return days.map(function(day){
      var date = day.date || day.day || '';
      var label = date ? parseDate(date).toLocaleDateString('de-DE',{weekday:'short'}) : '';
      var max = day.max != null ? Math.round(day.max)+'°' : '--°';
      var min = day.min != null ? Math.round(day.min)+'°' : '--°';
      return '<div class="dashp-forecast-row"><span>'+esc(label)+'</span><b>'+esc(fmtShort(date))+'</b><em>'+esc(day.icon || '☀️')+'</em><small>'+max+' / '+min+'</small><strong class="tone-'+esc(pollen.tone)+'">'+esc(pollen.level)+'</strong></div>';
    }).join('');
  }
  function installStyle(){
    if(styleInstalled || document.getElementById('dashboard-premium-style')) return;
    styleInstalled = true;
    var st = document.createElement('style');
    st.id = 'dashboard-premium-style';
    st.textContent = `
      body.change-view-dashboard #content{overflow:auto!important;}
      body.change-view-dashboard #dashboard-view{max-width:1320px!important;width:100%!important;margin:0 auto!important;padding:0!important;background:transparent!important;}
      body.change-view-dashboard .dash-hello{min-height:46px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:14px!important;margin:0 0 24px!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;}
      body.change-view-dashboard .dash-hello h1{margin:0!important;font-size:27px!important;font-weight:950!important;letter-spacing:-.8px!important;line-height:1!important;color:var(--t1,#f7fff9)!important;}
      body.change-view-dashboard .dash-hello p{display:none!important;}
      body.change-view-dashboard #kpi-grid{display:none!important;}
      body.change-view-dashboard #dash-grid{display:grid!important;grid-template-columns:minmax(0,1.15fr) minmax(360px,.85fr)!important;gap:16px!important;align-items:start!important;}
      .dashp-hero{grid-column:1 / -1;display:grid;grid-template-columns:minmax(0,1.6fr) repeat(4,minmax(160px,.55fr));gap:14px;align-items:stretch;}
      .dashp-card{border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(13,22,29,.74),rgba(8,15,21,.74));border-radius:22px;box-shadow:0 18px 44px rgba(0,0,0,.20);overflow:hidden;}
      .dashp-main-hero{position:relative;min-height:178px;padding:28px 30px;background:radial-gradient(circle at 78% 45%,rgba(74,222,128,.18),transparent 28%),linear-gradient(135deg,rgba(19,71,43,.50),rgba(8,15,21,.78));display:flex;justify-content:space-between;gap:18px;}
      .dashp-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:rgba(244,247,244,.72);margin-bottom:12px;}
      .dashp-hero-title{font-size:31px;font-weight:950;letter-spacing:-.9px;line-height:1.05;color:#fff;margin-bottom:12px;}
      .dashp-hero-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
      .dashp-pill{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);font-size:12px;font-weight:850;color:rgba(244,247,244,.88);}
      .dashp-next{margin-top:auto;display:flex;align-items:center;gap:10px;color:rgba(244,247,244,.78);font-weight:750;}
      .dashp-next strong{color:#4ade80;font-weight:950;}
      .dashp-hero-orb{width:116px;height:116px;border-radius:999px;border:4px solid rgba(74,222,128,.38);display:flex;align-items:center;justify-content:center;align-self:center;box-shadow:0 0 42px rgba(74,222,128,.18), inset 0 0 0 12px rgba(74,222,128,.05);font-size:40px;}
      .dashp-mini-card{appearance:none;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(13,22,29,.72),rgba(8,15,21,.74));border-radius:22px;padding:20px 18px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:18px;color:inherit;min-height:178px;text-align:left;box-shadow:0 18px 44px rgba(0,0,0,.16);cursor:pointer;}
      .dashp-mini-card:hover{transform:translateY(-1px);border-color:rgba(74,222,128,.22);}
      .dashp-mini-icon{width:44px;height:44px;border-radius:17px;display:inline-flex;align-items:center;justify-content:center;background:rgba(74,222,128,.12);color:#4ade80;font-size:22px;font-weight:950;}
      .dashp-mini-card b{display:block;font-size:25px;line-height:1;font-weight:950;color:#fff;margin-bottom:7px;}
      .dashp-mini-card small{display:block;font-size:12px;font-weight:750;color:rgba(244,247,244,.62);line-height:1.35;}
      .dashp-section-card{padding:0;}
      .dashp-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.07);}
      .dashp-card-title{font-size:17px;font-weight:950;letter-spacing:-.2px;color:#fff;display:flex;align-items:center;gap:9px;}
      .dashp-card-body{padding:14px 16px 16px;}
      .dashp-event-row,.dashp-task-row,.dashp-player-row{display:flex;align-items:center;gap:13px;min-height:58px;padding:11px 12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.035);border-radius:17px;margin-bottom:9px;cursor:pointer;}
      .dashp-event-row:hover,.dashp-task-row:hover,.dashp-player-row:hover{background:rgba(255,255,255,.055);border-color:rgba(74,222,128,.18);}
      .dashp-event-icon,.dashp-task-icon{width:38px;height:38px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:rgba(74,222,128,.12);font-size:17px;font-weight:950;flex:0 0 38px;}
      .dashp-event-row.tone-blue .dashp-event-icon{background:rgba(59,130,246,.13);color:#60a5fa}.dashp-event-row.tone-amber .dashp-event-icon{background:rgba(245,158,11,.14);color:#fbbf24}.dashp-event-row.tone-red .dashp-event-icon{background:rgba(239,68,68,.14);color:#f87171}.dashp-event-row.tone-purple .dashp-event-icon{background:rgba(168,85,247,.14);color:#c084fc}
      .dashp-event-time{min-width:72px;font-size:16px;font-weight:950;color:#fff;font-variant-numeric:tabular-nums;}
      .dashp-event-main,.dashp-task-main,.dashp-player-main{min-width:0;flex:1;}
      .dashp-event-main strong,.dashp-task-main strong,.dashp-player-main strong{display:block;color:#fff;font-size:14px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .dashp-event-main span,.dashp-task-main span,.dashp-player-main small{display:block;margin-top:3px;color:rgba(244,247,244,.58);font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .dashp-source-dot{width:26px;height:26px;border-radius:999px;background:rgba(59,130,246,.13);color:#60a5fa;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:950;}
      .dashp-points,.dashp-score{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:28px;border-radius:999px;background:rgba(74,222,128,.13);color:#4ade80;font-size:12px;font-weight:950;}
      .dashp-rank{width:27px;height:27px;border-radius:10px;background:rgba(245,158,11,.16);color:#fbbf24;display:flex;align-items:center;justify-content:center;font-weight:950;}
      .dashp-avatar-small{width:34px;height:34px;border-radius:999px;background:rgba(74,222,128,.13);color:#4ade80;display:flex;align-items:center;justify-content:center;font-weight:950;}
      .dashp-player-main em{display:inline-flex;margin-left:5px;padding:2px 6px;border-radius:999px;background:rgba(74,222,128,.14);color:#4ade80;font-style:normal;font-size:10px;}
      .dashp-link-btn{width:100%;height:40px;border:0;background:transparent;color:#4ade80;font-weight:900;cursor:pointer;border-radius:14px;margin-top:2px;}
      .dashp-link-btn:hover{background:rgba(74,222,128,.08);}
      .dashp-empty{padding:18px 14px;border:1px dashed rgba(255,255,255,.09);border-radius:16px;color:rgba(244,247,244,.58);font-size:13px;font-weight:750;text-align:center;}
      .dashp-side-stack{display:grid;gap:16px;}
      .dashp-forecast-row{display:grid;grid-template-columns:34px 60px 34px 1fr auto;gap:10px;align-items:center;padding:9px 2px;border-bottom:1px solid rgba(255,255,255,.07);font-size:13px;}
      .dashp-forecast-row:last-child{border-bottom:0;}.dashp-forecast-row span{color:rgba(244,247,244,.65);font-weight:850}.dashp-forecast-row b{color:#fff}.dashp-forecast-row small{color:rgba(244,247,244,.66);font-weight:800}.dashp-forecast-row strong{font-weight:950}.tone-red{color:#ff675d!important}.tone-amber{color:#fbbf24!important}.tone-green{color:#4ade80!important}
      @media(max-width:1180px){.dashp-hero{grid-template-columns:minmax(0,1fr) repeat(2,minmax(160px,.5fr));}.dashp-weather-mini{display:none!important;}body.change-view-dashboard #dash-grid{grid-template-columns:1fr!important;}}
      @media(max-width:700px){body.change-view-dashboard #content{padding:18px 14px calc(86px + env(safe-area-inset-bottom,0px))!important;}body.change-view-dashboard #dashboard-view{padding:0!important;max-width:none!important;}body.change-view-dashboard .dash-hello{min-height:42px!important;display:flex!important;align-items:center!important;margin:0 0 14px!important;padding:0!important;}body.change-view-dashboard .dash-hello h1{font-size:24px!important;line-height:1!important;}body.change-view-dashboard #dash-grid{display:block!important;}.dashp-hero{display:block;margin-bottom:12px;}.dashp-main-hero{min-height:0;padding:20px;border-radius:22px;margin-bottom:12px;}.dashp-hero-orb{display:none}.dashp-hero-title{font-size:25px}.dashp-hero-meta{gap:7px}.dashp-pill{font-size:11px;padding:7px 9px}.dashp-mini-card{display:inline-flex;width:154px;min-height:118px;margin-right:8px;padding:14px;border-radius:18px;vertical-align:top}.dashp-hero .dashp-mini-card{display:inline-flex}.dashp-hero{white-space:nowrap;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}.dashp-hero::-webkit-scrollbar{display:none}.dashp-mini-card span{white-space:normal}.dashp-mini-icon{width:34px;height:34px;border-radius:13px;font-size:18px}.dashp-mini-card b{font-size:20px}.dashp-mini-card small{font-size:11px}.dashp-card{border-radius:20px;margin-bottom:12px}.dashp-card-head{padding:15px 16px}.dashp-card-title{font-size:16px}.dashp-card-body{padding:12px}.dashp-event-row,.dashp-task-row,.dashp-player-row{min-height:56px;padding:10px;margin-bottom:8px}.dashp-event-time{min-width:58px;font-size:14px}.dashp-event-icon,.dashp-task-icon{width:34px;height:34px;flex-basis:34px}.dashp-forecast-row{grid-template-columns:30px 52px 26px 1fr auto;font-size:12px;gap:7px}.dashp-side-stack{display:block;}}

      [data-theme="light"] body.change-view-dashboard .dash-hello h1,body.theme-light.change-view-dashboard .dash-hello h1,body.change-theme-light.change-view-dashboard .dash-hello h1{color:#142018!important;}
      [data-theme="light"] .dashp-card,body.theme-light .dashp-card,body.change-theme-light .dashp-card,[data-theme="light"] .dashp-mini-card,body.theme-light .dashp-mini-card,body.change-theme-light .dashp-mini-card{background:rgba(255,255,255,.78)!important;border-color:rgba(20,35,24,.10)!important;box-shadow:0 18px 38px rgba(31,53,38,.08)!important;}
      [data-theme="light"] .dashp-main-hero,body.theme-light .dashp-main-hero,body.change-theme-light .dashp-main-hero{background:radial-gradient(circle at 78% 45%,rgba(36,190,91,.16),transparent 32%),linear-gradient(135deg,rgba(235,250,240,.92),rgba(255,255,255,.78))!important;}
      [data-theme="light"] .dashp-hero-title,[data-theme="light"] .dashp-mini-card b,[data-theme="light"] .dashp-card-title,[data-theme="light"] .dashp-event-main strong,[data-theme="light"] .dashp-task-main strong,[data-theme="light"] .dashp-player-main strong,[data-theme="light"] .dashp-event-time,[data-theme="light"] .dashp-forecast-row b,body.theme-light .dashp-hero-title,body.theme-light .dashp-mini-card b,body.theme-light .dashp-card-title,body.theme-light .dashp-event-main strong,body.theme-light .dashp-task-main strong,body.theme-light .dashp-player-main strong,body.theme-light .dashp-event-time,body.theme-light .dashp-forecast-row b,body.change-theme-light .dashp-hero-title,body.change-theme-light .dashp-mini-card b,body.change-theme-light .dashp-card-title,body.change-theme-light .dashp-event-main strong,body.change-theme-light .dashp-task-main strong,body.change-theme-light .dashp-player-main strong,body.change-theme-light .dashp-event-time,body.change-theme-light .dashp-forecast-row b{color:#142018!important;}
      [data-theme="light"] .dashp-event-row,[data-theme="light"] .dashp-task-row,[data-theme="light"] .dashp-player-row,body.theme-light .dashp-event-row,body.theme-light .dashp-task-row,body.theme-light .dashp-player-row,body.change-theme-light .dashp-event-row,body.change-theme-light .dashp-task-row,body.change-theme-light .dashp-player-row{background:rgba(255,255,255,.68)!important;border-color:rgba(20,35,24,.08)!important;}
      [data-theme="light"] .dashp-event-main span,[data-theme="light"] .dashp-task-main span,[data-theme="light"] .dashp-player-main small,[data-theme="light"] .dashp-mini-card small,[data-theme="light"] .dashp-next,body.theme-light .dashp-event-main span,body.theme-light .dashp-task-main span,body.theme-light .dashp-player-main small,body.theme-light .dashp-mini-card small,body.theme-light .dashp-next,body.change-theme-light .dashp-event-main span,body.change-theme-light .dashp-task-main span,body.change-theme-light .dashp-player-main small,body.change-theme-light .dashp-mini-card small,body.change-theme-light .dashp-next{color:#5d6b61!important;}

      [data-theme="light"] .dashp-card-head,body.theme-light .dashp-card-head,body.change-theme-light .dashp-card-head,[data-theme="light"] .dashp-forecast-row,body.theme-light .dashp-forecast-row,body.change-theme-light .dashp-forecast-row{border-color:rgba(20,35,24,.08)!important;}

      body.change-view-dashboard .dash-hello p{display:none!important;}

      .dashp-hero-visual{
        display:flex!important;align-items:flex-end!important;justify-content:center!important;align-self:stretch!important;
      }
      @media(max-width:700px){
        .dashp-hero-visual{
          position:absolute!important;top:20px!important;right:20px!important;
          width:108px!important;height:108px!important;
        }
      }
    `;
    document.head.appendChild(st);
  }
  function dashHeroArtSvg(){
    return '<svg class="dashp-hero-illustration" viewBox="0 0 220 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
      + '<defs>'
      + '<linearGradient id="dash-grid-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4ade80" stop-opacity="0.8"/><stop offset="1" stop-color="#166534" stop-opacity="0.3"/></linearGradient>'
      + '<linearGradient id="dash-bar-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4ade80" stop-opacity="0.85"/><stop offset="1" stop-color="#4ade80" stop-opacity="0.25"/></linearGradient>'
      + '</defs>'
      // Hintergrund-Raster (leicht angedeutet)
      + '<line x1="60" y1="50" x2="60" y2="170" stroke="rgba(74,222,128,0.10)" stroke-width="1"/>'
      + '<line x1="95" y1="50" x2="95" y2="170" stroke="rgba(74,222,128,0.10)" stroke-width="1"/>'
      + '<line x1="130" y1="50" x2="130" y2="170" stroke="rgba(74,222,128,0.10)" stroke-width="1"/>'
      + '<line x1="165" y1="50" x2="165" y2="170" stroke="rgba(74,222,128,0.10)" stroke-width="1"/>'
      + '<line x1="50" y1="85" x2="175" y2="85" stroke="rgba(74,222,128,0.10)" stroke-width="1"/>'
      + '<line x1="50" y1="120" x2="175" y2="120" stroke="rgba(74,222,128,0.10)" stroke-width="1"/>'
      + '<line x1="50" y1="155" x2="175" y2="155" stroke="rgba(74,222,128,0.10)" stroke-width="1"/>'
      // Balken (Bar Chart Style)
      + '<rect x="60" y="120" width="22" height="50" rx="5" fill="url(#dash-bar-grad)" opacity="0.5"/>'
      + '<rect x="95" y="95" width="22" height="75" rx="5" fill="url(#dash-bar-grad)" opacity="0.6"/>'
      + '<rect x="130" y="75" width="22" height="95" rx="5" fill="url(#dash-bar-grad)" opacity="0.75"/>'
      + '<rect x="165" y="105" width="22" height="65" rx="5" fill="url(#dash-bar-grad)" opacity="0.55"/>'
      // Linie über Balken
      + '<polyline points="71,120 106,95 141,75 176,105" fill="none" stroke="url(#dash-grid-grad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>'
      // Datenpunkte
      + '<circle cx="71" cy="120" r="4" fill="#4ade80" opacity="0.7"/>'
      + '<circle cx="106" cy="95" r="4" fill="#4ade80" opacity="0.7"/>'
      + '<circle cx="141" cy="75" r="5.5" fill="#4ade80" opacity="0.85"/>'
      + '<circle cx="176" cy="105" r="4" fill="#4ade80" opacity="0.7"/>'
      + '</svg>';
  }
  function renderDashboard(){
    installStyle();
    var grid = $('dash-grid');
    if(!grid) return;
    var today = todayEvents();
    var next = nextEvent();
    var open = todayChallenges();
    var w = weatherSummary();
    var p = pollenSummary();
    var sub = $('dash-sub');
    var head = $('dash-greeting');
    if(head) head.textContent = 'Dashboard';
    if(sub) sub.textContent = '';
    var v = vacationSummary();
    var f = friseurSummary();
    grid.innerHTML = ''+
      '<div class="dashp-hero">'
        + '<section class="dashp-card dashp-main-hero dashp-main-hero-pollen change-hero-card change-hero-dashboard">'
          + '<div class="dashp-hero-copy"><div class="dashp-eyebrow">Heute auf einen Blick</div><div class="dashp-hero-title">'+esc(greeting())+'</div></div>'
          + dashHeroArtSvg()
          + overviewRows(today.length, next, w, p, f, v)
        + '</section>'
      + '</div>'
      + '<section class="dashp-card dashp-section-card"><div class="dashp-card-head"><div class="dashp-card-title">📍 Termine</div></div><div class="dashp-card-body">'+timelineUpcomingHtml(dashboardTermItems())+'</div></section>'
      + '<section class="dashp-card dashp-section-card"><div class="dashp-card-head"><div class="dashp-card-title">💪 Aufgaben</div><span class="dashp-header-pill">'+open.length+' offen</span></div><div class="dashp-card-body">'+challengesHtml(open)+'</div></section>'
      + '<section class="dashp-card dashp-section-card dashp-players-card"><div class="dashp-card-head"><div class="dashp-card-title">👥 Mitspieler</div></div><div class="dashp-card-body">'+playersHtml()+'</div></section>';
  }
  function buildDashboard(){ renderDashboard(); }
  buildDashboard.__premiumDashboard = true;
  window.buildDashboard = buildDashboard;
  window.buildDashCards = buildDashboard;
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildDashboard, {once:true});
  else buildDashboard();
  [250, 900, 1800, 4200, 7000].forEach(function(ms){ setTimeout(function(){ if((window.currentMainView || 'dashboard') === 'dashboard') buildDashboard(); }, ms); });
  try{
    var oldSetMainView = window.setMainView;
    if(typeof oldSetMainView === 'function' && !oldSetMainView.__premiumDashboardWrapped){
      window.setMainView = function(view){
        var result = oldSetMainView.apply(this, arguments);
        if(view === 'dashboard') setTimeout(buildDashboard, 40);
        return result;
      };
      window.setMainView.__premiumDashboardWrapped = true;
    }
  }catch(e){}
})();
