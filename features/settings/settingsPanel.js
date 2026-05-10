(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function esc(value){
    var model = window.ChangeCalendarModel;
    if(model && model.esc) return model.esc(value);
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }
  function readBool(key, fallback){
    try{
      if(typeof window.ls === 'function'){
        var v = window.ls(key);
        if(v === true || v === false) return v;
      }
      var raw = localStorage.getItem(key);
      if(raw === 'true' || raw === '1') return true;
      if(raw === 'false' || raw === '0') return false;
    }catch(e){}
    return fallback;
  }
  function writeBool(key, value){
    try{ if(typeof window.ls === 'function') window.ls(key, !!value); }catch(e){}
    try{ localStorage.setItem(key, value ? 'true' : 'false'); }catch(e){}
  }
  function readJson(key, fallback){ try{ return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }catch(e){ return fallback; } }
  function saveCalendarOptions(options){
    try{ localStorage.setItem('calendar_settings', JSON.stringify(options)); }catch(e){}
    try{ localStorage.setItem('change_v1_calendar_view_options', JSON.stringify(options)); }catch(e){}
    try{ if(typeof window.renderCalendar === 'function') window.renderCalendar(); }catch(e){}
  }
  function calendarOptions(){
    var options = {showHolidays:true, showChallengeDots:true, showWeekNumbers:true, holidayState:'ALL'};
    ['change_v1_calendar_view_options','calendar_settings'].forEach(function(key){ Object.assign(options, readJson(key, {})); });
    try{ options.holidayState = localStorage.getItem('holiday_state') || options.holidayState; }catch(e){}
    return options;
  }
  function stateOptions(selected){
    var states = [
      ['ALL','Alle Feiertage'],['BW','Baden-Württemberg'],['BY','Bayern'],['BY-AUX','Bayern · Augsburg'],['BE','Berlin'],['BB','Brandenburg'],['HB','Bremen'],['HH','Hamburg'],['HE','Hessen'],['MV','Mecklenburg-Vorpommern'],['NI','Niedersachsen'],['NW','Nordrhein-Westfalen'],['RP','Rheinland-Pfalz'],['SL','Saarland'],['SN','Sachsen'],['ST','Sachsen-Anhalt'],['SH','Schleswig-Holstein'],['TH','Thüringen']
    ];
    return states.map(function(item){ return '<option value="'+item[0]+'" '+(selected === item[0] ? 'selected' : '')+'>'+item[1]+'</option>'; }).join('');
  }
  function pill(text, tone){ return '<span class="change-status-pill '+(tone || '')+'">'+esc(text)+'</span>'; }
  function switchRow(title, subtitle, id, checked, disabled){
    return '<div class="change-settings-row"><div><div class="change-settings-title">'+title+'</div>'+(subtitle ? '<div class="change-settings-sub">'+subtitle+'</div>' : '')+'</div><label class="switch"><input type="checkbox" id="'+id+'" '+(checked ? 'checked' : '')+' '+(disabled ? 'disabled' : '')+'><span class="slider"></span></label></div>';
  }
  function card(label, inner){ return '<div class="change-settings-card"><div class="change-settings-label">'+esc(label)+'</div>'+inner+'</div>'; }
  function pushStatus(){
    var store = window.ChangeNotificationStore;
    var active = store && store.pushActive ? store.pushActive() : readBool('push_enabled', false);
    var perm = store && store.permissionLabel ? store.permissionLabel() : (typeof Notification === 'undefined' ? 'nicht unterstützt' : Notification.permission);
    return {active:active, label:active ? 'AKTIV' : 'INAKTIV', tone:active ? 'ok' : 'off', detail:'Browser: '+perm};
  }
  function googleStatus(){
    if(window.ChangeGoogleSyncStatus && window.ChangeGoogleSyncStatus.getStatus) return window.ChangeGoogleSyncStatus.getStatus();
    var loggedIn = true;
    try{ loggedIn = !!accessToken; }catch(e){ loggedIn = !!window.accessToken; }
    return {loggedIn:loggedIn, enabled:readBool('google_sync_enabled', true), active:loggedIn, label:loggedIn?'AKTIV':'NICHT ANGEMELDET', tone:loggedIn?'ok':'error', detail:''};
  }
  function installedLabel(){
    var installed = false;
    try{ installed = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches; }catch(e){}
    return installed ? 'Installiert' : 'Nicht installiert';
  }
  function weatherHealthStatus(){
    var store = window.ChangeWeatherStore;
    var service = window.ChangeWeatherService;
    var settings = store && store.settings ? store.settings() : {};
    var loc = store && store.getLocation ? store.getLocation() : null;
    var cache = service && service.getCached ? service.getCached() : null;
    var active = !!(settings.weatherEnabled || settings.rainAlertsEnabled || settings.pollenEnabled || settings.pollenAlertsEnabled);
    var detail = loc ? ('Standort gespeichert' + (cache && cache.savedAt ? ' · aktualisiert ' + new Date(cache.savedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) : '')) : 'Standort noch nicht freigegeben';
    return {settings:settings, location:loc, active:active, label:active ? (loc ? 'AKTIV' : 'STANDORT FEHLT') : 'AUS', tone:active ? (loc ? 'ok' : 'error') : 'off', detail:detail};
  }
  function calendarPane(){
    var options = calendarOptions();
    return card('Region', '<div class="change-settings-actions"><label class="flabel">Bundesland für Feiertage</label><select class="finput" id="set-holiday-state">'+stateOptions(options.holidayState)+'</select><div class="settings-hint">Steuert Feiertage im Kalender und in der Tagesübersicht.</div></div>')
      + card('Kalenderansicht',
        switchRow('Feiertage anzeigen', '', 'set-show-holidays', options.showHolidays)+
        switchRow('Challengepunkte im Kalender', 'Nur kleines Badge unten rechts.', 'set-show-points', options.showChallengeDots)+
        switchRow('Kalenderwochen anzeigen', '', 'set-show-kw', options.showWeekNumbers));
  }
  function dashboardPane(){
    var friseurOn = readBool('friseur_enabled', true);
    var urlaubOn = readBool('urlaub_enabled', true);
    var friseurWeeks = 4;
    var urlaubDays = 30;
    try{ friseurWeeks = parseInt(localStorage.getItem('friseur_weeks') || '4', 10) || 4; }catch(e){}
    try{ urlaubDays = parseInt(localStorage.getItem('urlaub_days') || '30', 10) || 30; }catch(e){}
    var activity = window.ChangePlayerActivity && window.ChangePlayerActivity.panelHtml ? window.ChangePlayerActivity.panelHtml(4) : '<div class="dash-empty">Keine Aktivität</div>';
    return card('Dashboard',
        switchRow('Friseur-Tracker '+pill(friseurOn?'AKTIV':'AUS', friseurOn?'ok':'off'), 'Zeigt den letzten und nächsten Friseur-Termin.', 'set-friseur', friseurOn)+
        '<div class="change-settings-actions"><label class="flabel">Erinnerung nach</label><select class="finput" id="set-friseur-weeks">'+[2,3,4,5,6,8].map(function(n){ return '<option value="'+n+'" '+(n === friseurWeeks ? 'selected' : '')+'>'+n+' Wochen</option>'; }).join('')+'</select></div>'+
        switchRow('Urlaubs-Tracker '+pill(urlaubOn?'AKTIV':'AUS', urlaubOn?'ok':'off'), '', 'set-urlaub', urlaubOn)+
        '<div class="change-settings-actions"><label class="flabel">Jahresurlaub</label><input type="number" class="finput" id="set-urlaub-days" min="1" max="365" value="'+urlaubDays+'"></div>')
      + card('Mitspieler-Aktivität', '<div class="change-settings-actions"><div class="change-settings-sub" style="margin-bottom:8px">'+esc(window.ChangePlayerActivity && window.ChangePlayerActivity.summaryText ? window.ChangePlayerActivity.summaryText() : '')+'</div>'+activity+'</div>');
  }
  function syncPane(){
    var push = pushStatus();
    var live = readBool('live_sync_enabled', true);
    var auto = readBool('auto_challenges_enabled', true);
    var google = googleStatus();
    var weather = weatherHealthStatus();
    var ws = weather.settings || {};
    return card('Benachrichtigungen',
        switchRow('Push-Benachrichtigungen '+pill(push.label, push.tone), push.detail, 'set-push', push.active)+
        '<div class="change-settings-actions"><button class="btn btn-secondary btn-full" id="set-test-push" type="button">Test-Benachrichtigung senden</button></div>')
      + card('Wetter & Gesundheit',
        '<div class="change-settings-row"><div><div class="change-settings-title"><span class="change-status-dot '+weather.tone+'"></span>Wetter & Pollen '+pill(weather.label, weather.tone)+'</div><div class="change-settings-sub">'+esc(weather.detail)+'</div></div></div>'+        
        switchRow('Wetter im Dashboard', 'Zeigt heutiges Wetter am aktuellen Standort.', 'set-weather', !!ws.weatherEnabled)+
        switchRow('Regenwarnung', 'Hinweis, wenn Regen in der nächsten Stunde möglich ist.', 'set-rain-alerts', !!ws.rainAlertsEnabled)+
        switchRow('Pollen aktuell', 'Zeigt, welche Pollen gerade mittel oder stark sind.', 'set-pollen', !!ws.pollenEnabled)+
        switchRow('Pollen-Hinweise '+pill('nur stark', 'off'), 'Maximal ein Hinweis pro Tag bei hoher Belastung.', 'set-pollen-alerts', !!ws.pollenAlertsEnabled)+
        '<div class="change-settings-actions"><button class="btn btn-secondary btn-full" id="set-weather-location" type="button">Standort aktualisieren</button></div>')
      + card('Synchronisierung',
        switchRow('Live-Mitspieler '+pill(live?'VERBUNDEN':'AUS', live?'ok':'off'), 'Aktualisiert Rangliste und Aktivität.', 'set-live', live)+
        switchRow('Auto-Challenges '+pill(auto?'AKTIV':'AUS', auto?'ok':'off'), 'Erstellt die täglichen Standard-Challenges.', 'set-auto', auto))
      + card('Google Kalender',
        '<div class="change-settings-row"><div><div class="change-settings-title"><span class="change-status-dot '+google.tone+'"></span>Google Kalender '+pill(google.label, google.tone)+'</div><div class="change-settings-sub">'+esc(google.detail || '')+'</div></div><label class="switch"><input type="checkbox" id="set-google" '+(google.enabled && google.loggedIn ? 'checked' : '')+' '+(!google.loggedIn ? 'disabled' : '')+'><span class="slider"></span></label></div>'+
        '<div class="change-settings-actions"><button class="btn btn-secondary btn-full" id="set-sync-google" type="button" '+(!google.loggedIn ? 'disabled' : '')+'>Jetzt synchronisieren</button></div>');
  }
  function appPane(){
    return card('App', '<div class="change-settings-row"><div><div class="change-settings-title">Change als App installieren '+pill(installedLabel(), installedLabel()==='Installiert'?'ok':'off')+'</div><div class="change-settings-sub">Für Handy-Nutzung, Push und Startbildschirm.</div></div></div><div class="change-settings-actions"><button class="btn btn-secondary btn-full" onclick="if(typeof installChangeApp===\'function\')installChangeApp()">Change als App installieren</button></div>')
      + card('Daten', '<div class="change-settings-actions"><button class="btn btn-secondary btn-full" onclick="try{localStorage.setItem(\'change_v1_manual_backup\', JSON.stringify({events:window.events||[],challenges:window.challenges||[],challengeCompletions:window.challengeCompletions||[],settings:{calendar:localStorage.getItem(\'calendar_settings\')}}));toast&&toast(\'Backup lokal erstellt ✓\',\'ok\')}catch(e){toast&&toast(\'Backup fehlgeschlagen\',\'err\')}">Lokales Backup erstellen</button></div>');
  }
  function tabButton(id, label, active){ return '<button class="change-settings-tab '+(active===id?'active':'')+'" type="button" data-settings-tab="'+id+'">'+label+'</button>'; }
  function openSettingsPanel(startTab){
    startTab = startTab || 'calendar';
    var html = '<div class="change-settings-tabs">'
      + tabButton('calendar','📅 Kalender', startTab)
      + tabButton('dashboard','▦ Dashboard', startTab)
      + tabButton('sync','↻ Push & Sync', startTab)
      + tabButton('app','⚙︎ App', startTab)
      + '</div>'
      + '<div class="change-settings-pane '+(startTab==='calendar'?'active':'')+'" data-pane="calendar">'+calendarPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='dashboard'?'active':'')+'" data-pane="dashboard">'+dashboardPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='sync'?'active':'')+'" data-pane="sync">'+syncPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='app'?'active':'')+'" data-pane="app">'+appPane()+'</div>';
    if(typeof window.openPanel === 'function') window.openPanel('Einstellungen', html);
    setTimeout(bindSettings, 30);
  }
  function refreshSameTab(){
    var active = document.querySelector('.change-settings-tab.active');
    openSettingsPanel(active ? active.getAttribute('data-settings-tab') : 'calendar');
  }
  function bindSettings(){
    document.querySelectorAll('[data-settings-tab]').forEach(function(btn){
      btn.addEventListener('click', function(){ openSettingsPanel(btn.getAttribute('data-settings-tab')); });
    });
    var saveCal = function(){
      var options = {
        showHolidays: !!($('set-show-holidays') && $('set-show-holidays').checked),
        showChallengeDots: !!($('set-show-points') && $('set-show-points').checked),
        showWeekNumbers: !!($('set-show-kw') && $('set-show-kw').checked),
        holidayState: ($('set-holiday-state') && $('set-holiday-state').value) || 'ALL'
      };
      try{ localStorage.setItem('holiday_state', options.holidayState); }catch(e){}
      saveCalendarOptions(options);
    };
    ['set-show-holidays','set-show-points','set-show-kw','set-holiday-state'].forEach(function(id){ var el=$(id); if(el) el.addEventListener('change', saveCal); });
    var friseur = $('set-friseur'); if(friseur) friseur.addEventListener('change', function(){ if(window.setFriseurEnabled) window.setFriseurEnabled(friseur.checked); else writeBool('friseur_enabled', friseur.checked); refreshSameTab(); });
    var frWeeks = $('set-friseur-weeks'); if(frWeeks) frWeeks.addEventListener('change', function(){ if(window.setFriseurWeeks) window.setFriseurWeeks(parseInt(frWeeks.value,10)); else localStorage.setItem('friseur_weeks', frWeeks.value); });
    var urlaub = $('set-urlaub'); if(urlaub) urlaub.addEventListener('change', function(){ if(window.setUrlaubEnabled) window.setUrlaubEnabled(urlaub.checked); else writeBool('urlaub_enabled', urlaub.checked); refreshSameTab(); });
    var urDays = $('set-urlaub-days'); if(urDays) urDays.addEventListener('change', function(){ if(window.setUrlaubDays) window.setUrlaubDays(parseInt(urDays.value,10) || 30); else localStorage.setItem('urlaub_days', String(parseInt(urDays.value,10) || 30)); });
    var push = $('set-push'); if(push) push.addEventListener('change', async function(){ if(window.togglePushFromBell) await window.togglePushFromBell(push.checked); refreshSameTab(); });
    var test = $('set-test-push'); if(test) test.addEventListener('click', function(){ if(window.sendTestBellNotification) window.sendTestBellNotification(); });
    var updateWeather = async function(patch, needsLocation){
      try{
        if(window.ChangeWeatherStore && window.ChangeWeatherStore.writeSettings) window.ChangeWeatherStore.writeSettings(patch || {});
        if(needsLocation && window.ChangeWeatherStore && !window.ChangeWeatherStore.getLocation()) await window.ChangeWeatherStore.requestLocation();
        if(window.ChangeWeatherRules && window.ChangeWeatherRules.refreshAndNotify) await window.ChangeWeatherRules.refreshAndNotify(true);
        if(window.ChangeWeatherCard && window.ChangeWeatherCard.update) window.ChangeWeatherCard.update();
      }catch(e){ if(typeof window.toast === 'function') window.toast(e.message || 'Wetter-Einstellung konnte nicht gespeichert werden','err'); }
      refreshSameTab();
    };
    var weatherToggle = $('set-weather'); if(weatherToggle) weatherToggle.addEventListener('change', function(){ updateWeather({weatherEnabled:weatherToggle.checked}, weatherToggle.checked); });
    var rainToggle = $('set-rain-alerts'); if(rainToggle) rainToggle.addEventListener('change', function(){ updateWeather({rainAlertsEnabled:rainToggle.checked, weatherEnabled: rainToggle.checked ? true : (window.ChangeWeatherStore&&window.ChangeWeatherStore.settings().weatherEnabled)}, rainToggle.checked); });
    var pollenToggle = $('set-pollen'); if(pollenToggle) pollenToggle.addEventListener('change', function(){ updateWeather({pollenEnabled:pollenToggle.checked}, pollenToggle.checked); });
    var pollenAlertToggle = $('set-pollen-alerts'); if(pollenAlertToggle) pollenAlertToggle.addEventListener('change', function(){ updateWeather({pollenAlertsEnabled:pollenAlertToggle.checked, pollenEnabled: pollenAlertToggle.checked ? true : (window.ChangeWeatherStore&&window.ChangeWeatherStore.settings().pollenEnabled)}, pollenAlertToggle.checked); });
    var weatherLocation = $('set-weather-location'); if(weatherLocation) weatherLocation.addEventListener('click', async function(){
      try{
        if(window.ChangeWeatherStore) await window.ChangeWeatherStore.requestLocation();
        if(window.ChangeWeatherRules) await window.ChangeWeatherRules.refreshAndNotify(true);
      }catch(e){ if(typeof window.toast === 'function') window.toast(e.message || 'Standort konnte nicht aktualisiert werden','err'); }
      refreshSameTab();
    });
    var live = $('set-live'); if(live) live.addEventListener('change', async function(){ if(window.setLiveSyncEnabled) await window.setLiveSyncEnabled(live.checked); else writeBool('live_sync_enabled', live.checked); refreshSameTab(); });
    var auto = $('set-auto'); if(auto) auto.addEventListener('change', function(){ if(window.setAutoChallengesEnabled) window.setAutoChallengesEnabled(auto.checked); else { writeBool('auto_challenges_enabled', auto.checked); writeBool('change_v1_auto_challenges_enabled', auto.checked); } refreshSameTab(); });
    var google = $('set-google'); if(google) google.addEventListener('change', async function(){ if(window.ChangeGoogleSyncStatus){ if(google.checked) await window.ChangeGoogleSyncStatus.syncNow(); else window.ChangeGoogleSyncStatus.disconnect(); } refreshSameTab(); });
    var syncGoogle = $('set-sync-google'); if(syncGoogle) syncGoogle.addEventListener('click', async function(){ if(window.ChangeGoogleSyncStatus) await window.ChangeGoogleSyncStatus.syncNow(); refreshSameTab(); });
  }

  window.ChangeSettingsPanel = {open: openSettingsPanel};
  window.openSettingsPanel = openSettingsPanel;
  window.openCalendarSettings = function(){ return openSettingsPanel('calendar'); };
  window.openPushSettingsPanel = function(){ return openSettingsPanel('sync'); };
})();
