(function(){
  'use strict';

  var Store = window.ChangeNotificationStore;
  var SW_PATH = './firebase-messaging-sw.js';
  var SW_SCOPE = './';

  function toastSafe(message, type){
    try{ if(typeof toast === 'function') toast(message, type || ''); }catch(e){}
  }
  function setEnabled(on){
    if(Store && typeof Store.setStoredPushEnabled === 'function') Store.setStoredPushEnabled(!!on);
    else {
      try{ localStorage.setItem('change_push_enabled', on ? '1' : '0'); }catch(e){}
      try{ if(typeof ls === 'function') ls('push_enabled', !!on); }catch(e){}
    }
  }
  function supportsPush(){
    return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
  }
  async function registerServiceWorker(){
    if(!('serviceWorker' in navigator)) throw new Error('Service Worker wird von diesem Browser nicht unterstützt');
    return navigator.serviceWorker.register(SW_PATH, {scope: SW_SCOPE});
  }
  async function requestPermission(){
    if(typeof Notification === 'undefined') return 'unsupported';
    if(Notification.permission === 'default') return Notification.requestPermission();
    return Notification.permission;
  }

  async function activate(){
    setEnabled(false);
    if(!supportsPush()){
      toastSafe('Push wird von diesem Browser nicht unterstützt','err');
      return false;
    }

    var permission = await requestPermission();
    if(permission !== 'granted'){
      toastSafe(permission === 'denied' ? 'Push ist im Browser blockiert' : 'Push wurde im Browser nicht erlaubt', 'err');
      return false;
    }

    try{
      var ok = false;
      if(typeof window.enablePushNotifications === 'function'){
        ok = await window.enablePushNotifications();
      }else{
        await registerServiceWorker();
        await navigator.serviceWorker.ready;
        ok = true;
      }
      if(ok === true){
        setEnabled(true);
        return true;
      }
      setEnabled(false);
      return false;
    }catch(e){
      console.warn('ChangePushController.activate:', e);
      setEnabled(false);
      toastSafe('Push konnte nicht aktiviert werden: '+(e && e.message ? e.message : e), 'err');
      return false;
    }
  }

  function deactivate(){
    setEnabled(false);
    toastSafe('Push-Benachrichtigungen deaktiviert','ok');
    return true;
  }

  async function test(){
    if(!supportsPush() || !Store || !Store.pushActive || !Store.pushActive()){
      toastSafe('Push ist deaktiviert','err');
      return false;
    }
    try{
      new Notification('Change', {body:'Test-Benachrichtigung funktioniert.', icon:'./icon-192.png', badge:'./icon-192.png', tag:'change-test'});
      toastSafe('Test gesendet ✓','ok');
      return true;
    }catch(e){
      console.warn('ChangePushController.test:', e);
      toastSafe('Test-Benachrichtigung nicht möglich','err');
      return false;
    }
  }

  window.ChangePushController = {
    activate: activate,
    deactivate: deactivate,
    test: test,
    registerServiceWorker: registerServiceWorker,
    supportsPush: supportsPush
  };
})();
