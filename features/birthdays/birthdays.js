/* Change App · Feature · Geburtstage
 * Kein DOM-Patcher: Dashboard/Kalender fragen dieses Feature direkt ab.
 */
(function(){
  'use strict';

  var LS_ON = 'change_v1_birthdays_enabled';
  var LS_ON_LEGACY = 'birthdays_enabled';

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
    try{ return p.upcoming(limit || 90); }catch(e){ return []; }
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
  function panelRow(item){
    var badge = item.diff === 0 ? 'Heute' : diffLabel(item.diff);
    return '<div class="dash-row" style="cursor:default">'
      + '<div class="dash-row-icon" style="background:rgba(139,92,246,.11)">🎂</div>'
      + '<div class="dash-row-body"><div class="dash-row-title">'+esc(item.name)+'</div><div class="dash-row-sub">'+esc(fmt(item.nextDate))+' · erkannt aus „'+esc(item.rawTitle)+'“</div></div>'
      + '<span class="dash-row-badge '+(item.diff===0?'badge-amber':'badge-blue')+'">'+esc(badge)+'</span>'
      + '</div>';
  }
  function openPanel(){
    var list = upcoming(370);
    var body = '';
    if(!list.length){
      body = '<div class="dash-empty" style="padding:18px">Keine Geburtstage gefunden.<br><span style="font-size:12px;color:var(--t4)">Erkannt werden z. B. „Bday Alex“, „Alex B-day“, „Birthday Maria“ oder „Geburtstag Tom“ im Kalender.</span></div>';
    }else{
      body = '<div class="db-section">Nächste Geburtstage</div>' + list.slice(0,20).map(panelRow).join('');
    }
    body += '<div style="margin-top:14px;padding:12px;border:1px solid var(--b1);border-radius:14px;background:var(--s2);font-size:12px;color:var(--t3);line-height:1.45">'
      + '<strong style="color:var(--t2)">Erkennung:</strong> Bday, B-day, Birthday, Geburtstag und Geb. werden automatisch als Geburtstage erkannt. In der App wird daraus sauber „🎂 Name“.'
      + '</div>';
    if(typeof window.openPanel === 'function') window.openPanel('🎂 Geburtstage', body);
  }
  function notificationItems(){
    return upcoming(1).map(function(item){
      return {
        id: 'birthday:'+item.name.toLowerCase()+':'+item.nextDate,
        kind: 'birthday',
        title: item.diff === 0 ? item.name + ' hat heute Geburtstag' : item.name + ' hat morgen Geburtstag',
        body: item.diff === 0 ? 'Heute gratulieren 🎂' : 'Morgen gratulieren 🎂',
        date: item.nextDate,
        diff: item.diff,
        label: item.diff === 0 ? 'Heute' : 'Morgen',
        urgency: item.diff === 0 ? 'warn' : 'info',
        icon: '🎂',
        priority: item.diff === 0 ? 12 : 35,
        action: {type:'birthday'}
      };
    });
  }

  window.ChangeBirthdays = {
    enabled: enabled,
    setEnabled: setEnabled,
    upcoming: upcoming,
    getRowHtml: getRowHtml,
    openPanel: openPanel,
    notificationItems: notificationItems
  };
  window.getBirthdaysEnabled = enabled;
  window.setBirthdaysEnabled = setEnabled;
  window.getBirthdayRowHtml = getRowHtml;
  window.openBirthdayPanel = openPanel;
})();
