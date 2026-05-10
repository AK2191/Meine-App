(function(){
  'use strict';

  var Store = window.ChangeNotificationStore;
  var Center = window.ChangeNotifications;

  function esc(v){ return Center && Center.esc ? Center.esc(v) : String(v == null ? '' : v); }
  function statusText(){
    var perm = Store && Store.permissionLabel ? Store.permissionLabel() : (typeof Notification === 'undefined' ? 'nicht unterstützt' : Notification.permission);
    var on = Store && Store.pushActive ? Store.pushActive() : false;
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
      + '<div class="change-notification-actions">'
      + '<span class="nitem-badge urgency-badge '+badgeClass(n)+'">'+esc(n.label || 'Neu')+'</span>'
      + '<button class="change-read-btn" type="button" title="Als gelesen markieren" aria-label="Als gelesen markieren" data-notification-read="'+esc(n.id)+'">✓</button>'
      + '</div>'
      + '</div>';
  }
  function renderList(notes){
    if(!notes.length){
      return '<div class="change-notif-empty"><strong>Alles gelesen</strong><span>Keine offenen Benachrichtigungen.</span></div>';
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
    if(all) all.addEventListener('click', function(ev){ ev.preventDefault(); window.markAllNotificationsRead(); });
  }
  function render(){
    var notes = Center.build({includeRead:false});
    var html = '<div class="change-notification-bell-panel" id="change-notification-bell-panel">'
      + renderPushBox()
      + '<div class="change-notif-head"><div class="change-notif-count">'+notes.length+' ungelesen</div>'
      + (notes.length ? '<button class="change-mark-all" type="button" id="mark-all-notifications-read">Alle gelesen</button>' : '')
      + '</div>'
      + renderList(notes)
      + '</div>';
    if(typeof openPanel === 'function') openPanel('Benachrichtigungen', html);
    bindPanelEvents();
    Center.updateBellIndicator();
  }

  window.ChangeNotificationBell = { render: render };
  window.openNotifPanel = render;
  window.togglePushFromBell = async function(on){
    try{
      var toggle = document.getElementById('bell-push-toggle');
      if(toggle) toggle.disabled = true;
      var ok = false;
      if(!on){
        ok = window.ChangePushController && window.ChangePushController.deactivate ? await window.ChangePushController.deactivate() : (Store && Store.setStoredPushEnabled ? Store.setStoredPushEnabled(false) : null, true);
      }else{
        ok = window.ChangePushController && window.ChangePushController.activate ? await window.ChangePushController.activate() : false;
      }
      if(!ok && Store && Store.setStoredPushEnabled) Store.setStoredPushEnabled(false);
      render();
      return !!ok;
    }catch(e){
      console.warn('togglePushFromBell:', e);
      if(Store && Store.setStoredPushEnabled) Store.setStoredPushEnabled(false);
      if(typeof toast === 'function') toast('Push konnte nicht geändert werden','err');
      render();
      return false;
    }
  };
  window.reqNotifPermission = function(){ return window.togglePushFromBell(true); };
  window.sendTestBellNotification = function(){
    if(window.ChangePushController && typeof window.ChangePushController.test === 'function') return window.ChangePushController.test();
    if(typeof toast === 'function') toast('Test-Benachrichtigung nicht möglich','err');
    return false;
  };

  setTimeout(function(){ if(Center && Center.updateBellIndicator) Center.updateBellIndicator(); }, 0);
})();
