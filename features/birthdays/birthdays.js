/* Change App · Feature · Geburtstage
 * Kein DOM-Patcher: Dashboard/Kalender fragen dieses Feature direkt ab.
 */
(function(){
  'use strict';

  var LS_ON = 'change_v1_birthdays_enabled';
  var LS_ON_LEGACY = 'birthdays_enabled';
  var LS_NOTIFICATION_DAYS = 'change_v1_birthday_notification_days';
  var LS_NOTIFICATION_DAYS_LEGACY = 'birthday_notification_days';
  var panelView = 'all';

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"'`]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];
    });
  }
  function readBool(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      if(raw === null) return fallback;
      if(raw === 'true' || raw === '1') return true;
      if(raw === 'false' || raw === '0') return false;
      var parsed = JSON.parse(raw);
      if(parsed === true || parsed === false) return parsed;
    }catch(e){}
    return fallback;
  }
  function writeBool(key, value){ try{ localStorage.setItem(key, value ? 'true' : 'false'); }catch(e){} }
  function readNumber(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      if(raw === null || raw === '') return fallback;
      var parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    }catch(e){ return fallback; }
  }
  function clampNotificationDays(value){
    var next = parseInt(value, 10);
    if(!Number.isFinite(next)) next = 1;
    return Math.max(0, Math.min(365, next));
  }
  function notificationDays(){
    return clampNotificationDays(readNumber(LS_NOTIFICATION_DAYS, readNumber(LS_NOTIFICATION_DAYS_LEGACY, 1)));
  }
  function setNotificationDays(value){
    var next = clampNotificationDays(value);
    try{ localStorage.setItem(LS_NOTIFICATION_DAYS, String(next)); }catch(e){}
    try{ localStorage.setItem(LS_NOTIFICATION_DAYS_LEGACY, String(next)); }catch(e){}
    try{ if(typeof window.checkNotifications === 'function') window.checkNotifications(); }catch(e){}
    try{ if(window.ChangeNotificationBell && typeof window.ChangeNotificationBell.render === 'function') window.ChangeNotificationBell.render(); }catch(e){}
    return next;
  }
  function enabled(){ return readBool(LS_ON, readBool(LS_ON_LEGACY, true)) !== false; }
  function setEnabled(on){
    writeBool(LS_ON, !!on);
    writeBool(LS_ON_LEGACY, !!on);
    try{ if(typeof window.buildDashboard === 'function') window.buildDashboard(); }catch(e){}
    try{ if(typeof window.renderCalendar === 'function') window.renderCalendar(); }catch(e){}
    try{ if(typeof window.checkNotifications === 'function') window.checkNotifications(); }catch(e){}
  }
  function parser(){ return window.ChangeBirthdayParser || null; }
  function upcoming(limit){
    if(!enabled()) return [];
    var p = parser();
    if(!p || typeof p.upcoming !== 'function') return [];
    try{ return p.upcoming(limit == null ? 90 : limit); }catch(e){ return []; }
  }
  function pad2(n){ return String(n).padStart(2, '0'); }
  function todayKey(){
    var p = parser();
    if(p && typeof p.todayKey === 'function'){
      try{ return p.todayKey(); }catch(e){}
    }
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }
  function dateFromKey(key){ return new Date(String(key || '') + 'T12:00:00'); }
  function addDaysKey(key, days){
    var d = dateFromKey(key);
    if(isNaN(d)) return key;
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }
  function weekEndKey(key){
    var d = dateFromKey(key || todayKey());
    if(isNaN(d)) return key || todayKey();
    var day = d.getDay();
    var daysToSunday = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + daysToSunday);
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }
  function fmt(key){
    try{ return new Date(key+'T12:00:00').toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'}).replace(',', ''); }
    catch(e){ return key; }
  }
  function diffLabel(diff){
    if(diff === 0) return 'Heute';
    if(diff === 1) return 'Morgen';
    if(diff === 2) return 'Übermorgen';
    return 'In ' + diff + ' Tagen';
  }
  function rangeTitle(view){
    if(view === 'today') return 'Heute';
    if(view === 'tomorrow') return 'Morgen';
    if(view === 'week') return 'Diese Woche';
    if(view === 'month') return 'Dieser Monat';
    return 'Alle Geburtstage';
  }
  function isInThisWeek(item){
    var from = todayKey();
    return item && item.nextDate >= from && item.nextDate <= weekEndKey(from);
  }
  function isInThisMonth(item){
    var from = todayKey();
    return !!(item && item.nextDate && item.nextDate.slice(0,7) === from.slice(0,7));
  }
  function filterByView(list, view){
    var selected = view || 'all';
    if(selected === 'today') return list.filter(function(item){ return item.diff === 0; });
    if(selected === 'tomorrow') return list.filter(function(item){ return item.diff === 1; });
    if(selected === 'week') return list.filter(isInThisWeek);
    if(selected === 'month') return list.filter(isInThisMonth);
    return list;
  }
  function viewCount(list, view){ return filterByView(list, view).length; }
  function getRowHtml(){
    if(!enabled()) return '';
    var list = upcoming(90);
    var next = list[0] || null;
    var iconBg = next && next.diff <= 1 ? 'rgba(245,158,11,.12)' : 'rgba(139,92,246,.11)';
    var title = 'Geburtstage';
    var sub = '';
    var badge = '';
    if(next){
      sub = esc(next.name) + ' · ' + diffLabel(next.diff) + ' · ' + fmt(next.nextDate);
      badge = '<span class="dash-row-badge '+(next.diff===0?'badge-amber':'badge-blue')+'">'+esc(diffLabel(next.diff))+'</span>';
    }else{
      sub = 'Keine Geburtstage in den nächsten 90 Tagen';
      badge = '<span class="dash-row-badge" style="background:var(--s2);color:var(--t4);border:1px solid var(--b1)">—</span>';
    }
    return '<div class="dash-row" onclick="window.openBirthdayPanel&&window.openBirthdayPanel()" style="cursor:pointer">'
      + '<div class="dash-row-icon" style="background:'+iconBg+';font-size:14px">🎂</div>'
      + '<div class="dash-row-body"><div class="dash-row-title">'+title+'</div><div class="dash-row-sub">'+sub+'</div></div>'
      + badge
      + '</div>';
  }
  function birthdayPanelRow(item){
    var state = item.diff === 0 ? 'today' : (item.diff === 1 ? 'tomorrow' : (item.diff <= 7 ? 'soon' : 'later'));
    var badge = diffLabel(item.diff);
    return '<div class="change-bday-row '+state+'">'
      + '<div class="change-bday-dot"></div>'
      + '<div class="change-bday-main">'
      + '<div class="change-bday-title">'+esc(item.name)+'</div>'
      + '<div class="change-bday-meta">'+esc(fmt(item.nextDate))+' · erkannt aus „'+esc(item.rawTitle)+'“</div>'
      + '</div>'
      + '<div class="change-bday-state">'+esc(badge)+'</div>'
      + '</div>';
  }
  function nextHighlight(item){
    if(!item) return '';
    return '<div class="change-bday-next">'
      + '<div class="change-bday-next-icon">🎂</div>'
      + '<div class="change-bday-next-main"><strong>'+esc(item.name)+'</strong><span>'+esc(fmt(item.nextDate))+' · '+esc(diffLabel(item.diff))+'</span></div>'
      + '</div>';
  }
  function filterChips(list, active){
    var views = [
      {key:'today', label:'Heute'},
      {key:'tomorrow', label:'Morgen'},
      {key:'week', label:'Woche'},
      {key:'month', label:'Monat'},
      {key:'all', label:'Alle'}
    ];
    return '<div class="change-bday-filter" role="group" aria-label="Geburtstage filtern">' + views.map(function(view){
      var count = viewCount(list, view.key);
      var cls = view.key === active ? ' active' : '';
      return '<button type="button" class="change-bday-chip'+cls+'" onclick="window.ChangeBirthdays&&window.ChangeBirthdays.openPanel(\''+view.key+'\')">'
        + '<span>'+esc(view.label)+'</span><strong>'+count+'</strong></button>';
    }).join('') + '</div>';
  }
  function emptyView(view){
    return '<div class="change-bday-empty">Keine Geburtstage für „'+esc(rangeTitle(view))+'“ gefunden.<br><span>Wechsle auf „Alle“, um die nächsten erkannten Geburtstage zu sehen.</span></div>';
  }
  function openPanel(view){
    panelView = view || 'all';
    var activeView = panelView;
    var list = upcoming(370);
    var body = '';
    if(!list.length){
      body = '<div class="change-bday-panel"><div class="change-bday-empty">Keine Geburtstage gefunden.<br><span>Erkannt werden z. B. „Bday Alex“, „Alex B-day“, „Birthday Maria“ oder „Geburtstag Tom“ im Kalender.</span></div></div>';
    }else{
      var next = list[0];
      var monthCount = viewCount(list, 'month');
      var selected = filterByView(list, activeView);
      body = '<div class="change-bday-panel">'
        + '<div class="change-bday-summary">'
        + '<div><strong>'+list.length+'</strong><span>Geburtstage</span></div>'
        + '<div><strong>'+esc(String(next.diff))+'</strong><span>'+(next.diff === 0 ? 'Heute' : 'Tage bis')+'</span></div>'
        + '<div><strong>'+monthCount+'</strong><span>Dieser Monat</span></div>'
        + '</div>'
        + nextHighlight(next)
        + filterChips(list, activeView)
        + '<div class="change-bday-section-title">'+esc(rangeTitle(activeView))+'</div>'
        + '<div class="change-bday-list">' + (selected.length ? selected.slice(0, 40).map(birthdayPanelRow).join('') : emptyView(activeView)) + '</div>'
        + '</div>';
    }
    if(typeof window.openPanel === 'function') window.openPanel('🎂 Geburtstage', body);
  }
  function notificationTitle(item){
    if(item.diff === 0) return item.name + ' hat heute Geburtstag';
    if(item.diff === 1) return item.name + ' hat morgen Geburtstag';
    return item.name + ' hat in ' + item.diff + ' Tagen Geburtstag';
  }
  function notificationBody(item){
    if(item.diff === 0) return 'Heute gratulieren 🎂';
    if(item.diff === 1) return 'Morgen gratulieren 🎂';
    return 'Am ' + fmt(item.nextDate) + ' gratulieren 🎂';
  }
  function notificationItems(){
    var days = notificationDays();
    return upcoming(days).map(function(item){
      return {
        id: 'birthday:'+item.name.toLowerCase()+':'+item.nextDate,
        kind: 'birthday',
        title: notificationTitle(item),
        body: notificationBody(item),
        date: item.nextDate,
        diff: item.diff,
        label: diffLabel(item.diff),
        urgency: item.diff === 0 ? 'warn' : 'info',
        icon: '🎂',
        priority: item.diff === 0 ? 12 : (item.diff === 1 ? 35 : 45 + Math.min(item.diff, 20)),
        reminderDays: days,
        action: {type:'birthday'}
      };
    });
  }

  window.ChangeBirthdays = {
    enabled: enabled,
    setEnabled: setEnabled,
    notificationDays: notificationDays,
    setNotificationDays: setNotificationDays,
    upcoming: upcoming,
    getRowHtml: getRowHtml,
    openPanel: openPanel,
    notificationItems: notificationItems
  };
  window.getBirthdaysEnabled = enabled;
  window.setBirthdaysEnabled = setEnabled;
  window.getBirthdayNotificationDays = notificationDays;
  window.setBirthdayNotificationDays = setNotificationDays;
  window.getBirthdayRowHtml = getRowHtml;
  window.openBirthdayPanel = openPanel;
})();
