/* Change App · Core UI Interaction Guard
 * Zentrale Sicherung gegen hängende Overlays nach Login/Panelwechsel.
 * Keine Feature-Logik; nur UI-Freigabe und stabile Header-Navigation.
 */
(function(){
  'use strict';
  function $(id){ return document.getElementById(id); }
  function panelIsOpen(){
    var p=$('side-panel');
    return !!(p && p.classList && p.classList.contains('open'));
  }
  function release(reason){
    try{
      var loading=$('loading');
      if(loading){
        loading.classList.add('is-hidden');
        loading.style.display='none';
        loading.style.visibility='hidden';
        loading.style.opacity='0';
        loading.style.pointerEvents='none';
        loading.setAttribute('aria-hidden','true');
      }
      var setup=$('setup-modal');
      if(setup && !setup.classList.contains('show')) setup.style.pointerEvents='none';
      var panel=$('side-panel');
      var overlay=$('panel-overlay');
      if(panel && !panelIsOpen()) panel.style.pointerEvents='none';
      if(panel && panelIsOpen()) panel.style.pointerEvents='auto';
      if(overlay && !panelIsOpen()){
        overlay.classList.remove('show');
        overlay.style.pointerEvents='none';
        overlay.setAttribute('aria-hidden','true');
      }
      if(overlay && panelIsOpen()){
        overlay.style.pointerEvents='auto';
        overlay.setAttribute('aria-hidden','false');
      }
      var main=$('main-app');
      if(main) main.style.pointerEvents='auto';
      document.documentElement.classList.remove('change-ui-locked');
      document.body.classList.remove('change-ui-locked');
    }catch(e){
      try{ console.warn('[Change UI Guard] Freigabe fehlgeschlagen:', reason, e); }catch(_){}
    }
  }

  function safeView(view){
    release('before-view-'+view);
    try{
      if(typeof window.setMainView === 'function') window.setMainView(view);
      else if(typeof setMainView === 'function') setMainView(view);
    }catch(e){
      console.warn('[Change UI Guard] View-Wechsel fehlgeschlagen:', view, e);
    }
    setTimeout(function(){ release('after-view-'+view); }, 80);
  }

  function bindButton(id, handler){
    var el=$(id);
    if(!el || el.__changeGuardBound) return;
    el.__changeGuardBound = true;
    el.addEventListener('click', function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      handler(ev);
    }, true);
  }

  function bind(){
    bindButton('htab-dashboard', function(){ safeView('dashboard'); });
    bindButton('htab-calendar', function(){ safeView('calendar'); });
    bindButton('htab-challenges', function(){ safeView('challenges'); });
    bindButton('bnav-dashboard', function(){ safeView('dashboard'); });
    bindButton('bnav-calendar', function(){ safeView('calendar'); });
    bindButton('bnav-challenges', function(){ safeView('challenges'); });
    bindButton('settings-btn', function(){ release('settings'); if(window.openSettingsPanel) window.openSettingsPanel('calendar'); });
    bindButton('notif-bell-btn', function(){ release('notifications'); if(window.openNotifPanel) window.openNotifPanel(); });
    var avatar=$('user-avatar');
    if(avatar && !avatar.__changeGuardBound){
      avatar.__changeGuardBound=true;
      avatar.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); release('avatar'); if(window.confirmLogout) window.confirmLogout(); }, true);
    }
  }

  function boot(){
    bind();
    release('boot');
    [100,300,800,1500,3000,6000].forEach(function(ms){ setTimeout(function(){ bind(); release('timer-'+ms); }, ms); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', boot);
  window.ChangeInteractionGuard = { release: release, bind: bind };
})();
