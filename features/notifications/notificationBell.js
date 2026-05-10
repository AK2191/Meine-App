(function(){
  'use strict';

  var Store = window.ChangeNotificationStore;
  var Center = window.ChangeNotifications;

  function esc(v){ return Center && Center.esc ? Center.esc(v) : String(v == null ? '' : v); }
  function statusText(){
    var perm = Store.permissionLabel();
    var on = Store.pushActive();
    return {on:on, perm:perm, text:on ? 'AKTIV' : 'INAKTIV'};
  }
  function renderPushBox(){
    var st = statusText();
    return '<div class="push-box bell-push-box">'
      + '<div class="toggle-row">'
      + '<div class="toggle-copy"><div class="toggle-title">Push-Benachrichtigungen <span class="change-notif-status '+(st.on?'on':'off')+'">'+st.text+'</span></div>'
      + '<div class="toggle-sub">Zentrale Steuerung über die Glocke · Browser: '+esc(st.perm)+'</div></div>'
      + '<label class="switch"><input type="checkbox" id="bell-push-toggle" '+(st.on?'checked':'')+'><span class="slider"></span></label>'
      + '</div>'
      + '<button class="btn btn-secondary btn-full" id="bell-test-push" type="button" style="margin-top:12px">Test-Benachrichtigung senden</button>'
      + '</div>';
  }
  function badgeClass(n){
    if(n.urgency === 'crit') return 'ub-crit';
    if(n.urgency === 'warn') return 'ub-warn';
    return 'ub-ok';
  }
  function sectionTitle(kind){
    if(kind === 'crit') return 'Dringend';
    if(kind === 'warn') return 'Heute & diese Woche';
    if(kind === 'info') return 'Neu';
    return 'Demnächst';
  }
  function renderItem(n){
    return '<div class="nitem change-notification-item" data-notification-action="'+esc(n.id)+'">'
      + '<div class="nitem-icon" style="background:var(--acc-d)">'+esc(n.icon || '🔔')+'</div>'
      + '<div class="nitem-body"><div class="nitem-title">'+esc(n.title || 'Benachrichtigung')+'</div>'
      + '<div class="nitem-sub">'+esc(n.body || n.date || '')+'</div></div>'
      + '<span class="nitem-badge urgency-badge '+badgeClass(n)+'">'+esc(n.label || 'Neu')+'</span>'
      + '<button class="change-read-btn" type="button" title="Als gelesen markieren" data-notification-read="'+esc(n.id)+'">✓</button>'
      + '</div>';
  }
  function renderList(notes){
    if(!notes.length){
      return '<div class="change-notif-empty"><strong>Alles im Griff</strong><span>Keine neuen Benachrichtigungen</span></div>';
    }
    var groups = {crit:[], warn:[], info:[], ok:[]};
    notes.forEach(function(n){ (groups[n.urgency] || groups.ok).push(n); });
    return Object.keys(groups).map(function(key){
      if(!groups[key].length) return '';
      return '<div class="panel-notif-section change-notif-section"><div class="pns-title">'+sectionTitle(key)+'</div>'+groups[key].map(renderItem).join('')+'</div>';
    }).join('');
  }
  function bindPanelEvents(){
    var toggle = document.getElementById('bell-push-toggle');
    if(toggle) toggle.addEventListener('change', function(){ window.togglePushFromBell(toggle.checked); });
    var test = document.getElementById('bell-test-push');
    if(test) test.addEventListener('click', window.sendTestBellNotification);
    document.querySelectorAll('[data-notification-action]').forEach(function(el){
      el.addEventListener('click', function(){ window.openNotificationAction(el.getAttribute('data-notification-action')); });
    });
    document.querySelectorAll('[data-notification-read]').forEach(function(btn){
      btn.addEventListener('click', function(ev){
        ev.stopPropagation();
        window.markNotificationRead(btn.getAttribute('data-notification-read'));
      });
    });
    var all = document.getElementById('mark-all-notifications-read');
    if(all) all.addEventListener('click', window.markAllNotificationsRead);
  }
  function render(){
    var notes = Center.build({includeRead:false});
    var html = renderPushBox()
      + '<div class="change-notif-head"><div class="change-notif-count">'+notes.length+' ungelesen</div>'
      + (notes.length ? '<button class="change-mark-all" type="button" id="mark-all-notifications-read">Alle gelesen</button>' : '')
      + '</div>'
      + renderList(notes);
    if(typeof openPanel === 'function') openPanel('Benachrichtigungen', html);
    bindPanelEvents();
    Center.updateBellIndicator();
  }

  window.ChangeNotificationBell = { render: render };
  window.openNotifPanel = render;
  window.togglePushFromBell = async function(on){
    try{
      if(!on){
        Store.setStoredPushEnabled(false);
        if(typeof toast === 'function') toast('Push-Benachrichtigungen deaktiviert','ok');
        render();
        return;
      }
      if(typeof Notification === 'undefined'){
        Store.setStoredPushEnabled(false);
        if(typeof toast === 'function') toast('Push wird von diesem Browser nicht unterstützt','err');
        render();
        return;
      }
      var permission = Notification.permission;
      if(permission !== 'granted') permission = await Notification.requestPermission();
      if(permission === 'granted'){
        Store.setStoredPushEnabled(true);
        try{
          if(typeof initFirebaseMessaging === 'function') await initFirebaseMessaging();
          else if(typeof enablePushNotifications === 'function') await enablePushNotifications();
        }catch(e){ console.warn('Push optional:', e); }
        if(typeof toast === 'function') toast('Push-Benachrichtigungen aktiviert ✓','ok');
      }else{
        Store.setStoredPushEnabled(false);
        if(typeof toast === 'function') toast('Push wurde im Browser nicht erlaubt','err');
      }
      render();
    }catch(e){
      console.warn('togglePushFromBell:', e);
      Store.setStoredPushEnabled(false);
      if(typeof toast === 'function') toast('Push konnte nicht geändert werden','err');
      render();
    }
  };
  window.reqNotifPermission = function(){ return window.togglePushFromBell(true); };
  window.sendTestBellNotification = function(){
    try{
      if(!Store.pushActive()){
        if(typeof toast === 'function') toast('Push ist deaktiviert','err');
        return;
      }
      new Notification('Change', {body:'Test-Benachrichtigung funktioniert.', tag:'change-test'});
      if(typeof toast === 'function') toast('Test gesendet ✓','ok');
    }catch(e){
      if(typeof toast === 'function') toast('Test-Benachrichtigung nicht möglich','err');
    }
  };

  setTimeout(function(){ if(Center && Center.updateBellIndicator) Center.updateBellIndicator(); }, 0);
})();
