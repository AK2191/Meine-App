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
  function readBoolMulti(keys, fallback){
    keys = Array.isArray(keys) ? keys : [keys];
    for(var i=0;i<keys.length;i++){
      var key = keys[i];
      try{
        if(typeof window.ls === 'function'){
          var v = window.ls(key.replace(/^change_v1_/, ''));
          if(v === true || v === false) return v;
        }
      }catch(e){}
      try{
        var raw = localStorage.getItem(key);
        if(raw === null) continue;
        if(raw === 'true' || raw === '1') return true;
        if(raw === 'false' || raw === '0') return false;
        var parsed = JSON.parse(raw);
        if(parsed === true || parsed === false) return parsed;
      }catch(e){}
    }
    return fallback;
  }
  function writeBoolMulti(keys, value){
    keys = Array.isArray(keys) ? keys : [keys];
    try{ if(typeof window.ls === 'function') window.ls(keys[0].replace(/^change_v1_/, ''), !!value); }catch(e){}
    keys.forEach(function(key){
      try{ localStorage.setItem(key, JSON.stringify(!!value)); }catch(e){}
    });
  }
  function getAutoChallengesEnabled(){
    return readBoolMulti(['change_v1_auto_challenges_enabled','auto_challenges_enabled'], true);
  }
  function setAutoChallengesState(on){
    on = !!on;
    writeBoolMulti(['change_v1_auto_challenges_enabled','auto_challenges_enabled'], on);
    try{ if(window.setAutoChallengesEnabled) window.setAutoChallengesEnabled(on); }catch(e){}
    writeBoolMulti(['change_v1_auto_challenges_enabled','auto_challenges_enabled'], on);
    if(!on){
      try{
        if(Array.isArray(window.challenges)){
          window.challenges = window.challenges.filter(function(ch){ return !(ch && ch.auto === true); });
          if(typeof window.ls === 'function') window.ls('challenges', window.challenges);
        }
      }catch(e){}
    }
    try{ if(window.renderChallenges) window.renderChallenges(); }catch(e){}
    try{ if(window.renderCalendar) window.renderCalendar(); }catch(e){}
    try{ if(window.buildDashboard) window.buildDashboard(); }catch(e){}
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
      ['ALL','Alle Feiertage'],['BW','Baden-Württemberg'],['BY','Bayern'],['BY-AUGSBURG','Bayern · Augsburg'],['BE','Berlin'],['BB','Brandenburg'],['HB','Bremen'],['HH','Hamburg'],['HE','Hessen'],['MV','Mecklenburg-Vorpommern'],['NI','Niedersachsen'],['NW','Nordrhein-Westfalen'],['RP','Rheinland-Pfalz'],['SL','Saarland'],['SN','Sachsen'],['ST','Sachsen-Anhalt'],['SH','Schleswig-Holstein'],['TH','Thüringen']
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
    var detail = loc ? 'Standort freigegeben' : 'Standort noch nicht freigegeben';
    return {settings:settings, location:loc, active:active, label:active ? (loc ? 'AKTIV' : 'STANDORT FEHLT') : 'AUS', tone:active ? (loc ? 'ok' : 'error') : 'off', detail:detail};
  }
  function calendarPane(){
    var options = calendarOptions();
    return card('Region', '<div class="change-settings-actions"><label class="flabel">Bundesland für Feiertage</label><select class="finput" id="set-holiday-state">'+stateOptions(options.holidayState)+'</select></div>')
      + card('Kalenderansicht',
        switchRow('Feiertage anzeigen', '', 'set-show-holidays', options.showHolidays)+
        switchRow('Challengepunkte im Kalender', '', 'set-show-points', options.showChallengeDots)+
        switchRow('Kalenderwochen anzeigen', '', 'set-show-kw', options.showWeekNumbers));
  }
  function dashboardBool(getterName, key, fallback){
    try{ if(typeof window[getterName] === 'function') return !!window[getterName](); }catch(e){}
    return readBool(key, fallback);
  }
  function dashboardNumber(getterName, keys, fallback){
    try{ if(typeof window[getterName] === 'function') return parseFloat(window[getterName]()) || fallback; }catch(e){}
    keys = Array.isArray(keys) ? keys : [keys];
    for(var i=0;i<keys.length;i++){
      try{ var raw = localStorage.getItem(keys[i]); if(raw != null && raw !== '') return parseFloat(raw) || fallback; }catch(e){}
    }
    return fallback;
  }
  function halfDays(){
    try{ if(typeof window.getUrlaubHalfDays === 'function') return (window.getUrlaubHalfDays() || []).slice().sort(); }catch(e){}
    try{ return (JSON.parse(localStorage.getItem('urlaub_half_days') || '[]') || []).map(function(d){ return String(d).length === 10 ? String(d).slice(5) : String(d); }).sort(); }catch(e){ return []; }
  }
  function halfDayLabel(value){
    value = String(value || '');
    if(/^\d{4}-\d{2}-\d{2}$/.test(value)) value = value.slice(5);
    if(/^\d{2}-\d{2}$/.test(value)) return value.slice(3)+'.'+value.slice(0,2)+'.';
    return value;
  }
  function halfDayChips(){
    var list = halfDays();
    if(!list.length) return '<div class="change-settings-sub" data-half-list>Keine halben Urlaubstage hinterlegt.</div>';
    return '<div data-half-list class="change-halfday-list">'+list.map(function(day){
      return '<span class="change-halfday-chip">'+esc(halfDayLabel(day))+'<button type="button" data-remove-half="'+esc(day)+'" aria-label="Halben Urlaubstag entfernen">×</button></span>';
    }).join('')+'</div>';
  }

  function weatherAlertHours(key, fallback){
    try{ var v = parseInt(localStorage.getItem(key), 10); if(v > 0) return v; }catch(e){}
    return fallback || 2;
  }
  function hoursSelect(id, current){
    var opts = [1,2,3,6,12,24].map(function(h){
      return '<option value="'+h+'" '+(h===current?'selected':'')+'>'+h+' Std. vorher</option>';
    }).join('');
    return '<div class="change-settings-actions change-setting-field"><label class="flabel">Erinnerung</label><select class="finput" id="'+id+'">'+opts+'</select></div>';
  }
  function weatherHealthCard(){
    var weather = weatherHealthStatus();
    var ws = weather.settings || {};
    var wetterOn  = !!ws.weatherEnabled;
    var rainOn    = !!ws.rainAlertsEnabled;
    var pollenOn  = !!ws.pollenEnabled;
    var pollWarnOn= !!ws.pollenAlertsEnabled;
    var rainHours   = weatherAlertHours('change_v1_rain_alert_hours', 2);
    var pollenHours = weatherAlertHours('change_v1_pollen_alert_hours', 2);

    // Wetter-Karte
    var rainSub = rainOn ? hoursSelect('set-rain-hours', rainHours) : '';
    var wetterSub = wetterOn
      ? switchRow('Regenwarnung', '', 'set-rain-alerts', rainOn)
        + rainSub
        + '<div class="change-settings-actions"><button class="btn btn-secondary btn-full" id="set-weather-location" type="button">Standort aktualisieren</button></div>'
      : '<div class="change-settings-actions"><button class="btn btn-secondary btn-full" id="set-weather-location" type="button">Standort aktualisieren</button></div>';

    var wetterCard = card('Wetter',
        switchRow('Im Dashboard anzeigen '+pill(wetterOn?'AKTIV':'AUS', wetterOn?'ok':'off'), '', 'set-weather', wetterOn)+
        wetterSub);

    // Pollen-Karte
    var pollWarnSub = pollWarnOn ? hoursSelect('set-pollen-hours', pollenHours) : '';
    var pollenSub = pollenOn
      ? switchRow('Pollenwarnung '+pill('nur stark', 'off'), '', 'set-pollen-alerts', pollWarnOn)
        + pollWarnSub
      : '';

    var pollenCard = card('Pollen',
        switchRow('Im Dashboard anzeigen '+pill(pollenOn?'AKTIV':'AUS', pollenOn?'ok':'off'), '', 'set-pollen', pollenOn)+
        pollenSub);

    return wetterCard + pollenCard;
  }
  function dashboardPane(){
    var friseurOn = dashboardBool('getFriseurEnabled', 'change_v1_friseur_enabled', false);
    var urlaubOn = dashboardBool('getUrlaubEnabled', 'urlaub_tracker_on', true);
    var friseurWeeks = dashboardNumber('getFriseurWeeks', ['change_v1_friseur_weeks','friseur_weeks'], 3);
    var urlaubDays = dashboardNumber('getUrlaubTotalDays', ['urlaub_tracker_days','urlaub_days'], 30);
    var months = [['01','Jan'],['02','Feb'],['03','Mär'],['04','Apr'],['05','Mai'],['06','Jun'],['07','Jul'],['08','Aug'],['09','Sep'],['10','Okt'],['11','Nov'],['12','Dez']];
    var monthOptions = months.map(function(item){ return '<option value="'+item[0]+'">'+item[1]+'</option>'; }).join('');
    var dayOptions = Array.from({length:31}, function(_, i){ var d = String(i+1).padStart(2,'0'); return '<option value="'+d+'">'+d+'.</option>'; }).join('');
    return weatherHealthCard()
      + card('Friseur',
          switchRow('Im Dashboard anzeigen '+pill(friseurOn?'AKTIV':'AUS', friseurOn?'ok':'off'), '', 'set-friseur', friseurOn)+
          (friseurOn
            ? '<div class="change-settings-actions change-setting-field"><label class="flabel">Erinnerung nach</label><select class="finput" id="set-friseur-weeks">'+[2,3,4,5,6,8].map(function(n){ return '<option value="'+n+'" '+(n === friseurWeeks ? 'selected' : '')+'>'+n+' Wochen</option>'; }).join('')+'</select></div>'
            : ''))
      + card('Urlaub',
          switchRow('Im Dashboard anzeigen '+pill(urlaubOn?'AKTIV':'AUS', urlaubOn?'ok':'off'), '', 'set-urlaub', urlaubOn)+
          (urlaubOn
            ? '<div class="change-settings-actions change-setting-field"><label class="flabel">Jahresurlaub</label><input type="number" class="finput" id="set-urlaub-days" min="1" max="365" value="'+urlaubDays+'"></div>'
              +'<div class="change-settings-actions change-setting-field"><label class="flabel">Halbe Urlaubstage</label><div class="change-halfday-controls"><select class="finput" id="set-half-month">'+monthOptions+'</select><select class="finput" id="set-half-day">'+dayOptions+'</select><button class="btn btn-secondary btn-sm" id="set-add-half" type="button">+ Hinzufügen</button></div>'+halfDayChips()+'</div>'
            : ''));
  }
  function firebaseStatus(){
    // Firebase-Verbindungsstatus: prüft ob db/auth bereit ist
    try{
      var hasUser = typeof firebase !== 'undefined' && firebase.auth && !!firebase.auth().currentUser;
      var hasDb = typeof window.initFirebaseLive === 'function';
      if(hasUser) return {ok:true, label:'VERBUNDEN', tone:'ok', detail:'Challenges · Rangliste · Einstellungen'};
      if(hasDb)   return {ok:false, label:'NICHT VERBUNDEN', tone:'off', detail:'Bitte mit Google anmelden.'};
    }catch(e){}
    return {ok:false, label:'AUS', tone:'off', detail:''};
  }

  function syncPane(){
    var live   = readBool('live_sync_enabled', true);
    var auto   = getAutoChallengesEnabled();
    var google = googleStatus();
    var fb     = firebaseStatus();

    // Firebase-Zeile
    var fbRow = '<div class="change-settings-row">'
      + '<div><div class="change-settings-title"><span class="change-status-dot '+fb.tone+'"></span>Datenbank-Sync '+pill(fb.label, fb.tone)+'</div>'
      + '<div class="change-settings-sub">'+esc(fb.detail)+'</div></div>'
      + (fb.ok
          ? '<label class="switch"><input type="checkbox" id="set-live" '+(live?'checked':'')+'><span class="slider"></span></label>'
          : '<button class="btn btn-secondary" style="font-size:11px;padding:5px 10px" onclick="if(typeof connectToGoogle===\'function\')connectToGoogle()">Verbinden</button>')
      + '</div>';

    // Google-Zeile
    var gRow = '<div class="change-settings-row">'
      + '<div><div class="change-settings-title"><span class="change-status-dot '+google.tone+'"></span>Google Kalender '+pill(google.label, google.tone)+'</div>'
      + '<div class="change-settings-sub">'+esc(google.detail || (google.loggedIn ? 'Termine werden importiert.' : 'Klicke Verbinden zum Anmelden.'))+'</div></div>'
      + (google.loggedIn
          ? '<label class="switch"><input type="checkbox" id="set-google" '+(google.enabled?'checked':'')+' ><span class="slider"></span></label>'
          : '<button class="btn btn-secondary" style="font-size:11px;padding:5px 10px" id="btn-google-connect">Verbinden</button>')
      + '</div>'
      + (google.loggedIn ? '<div class="change-settings-actions"><button class="btn btn-secondary btn-full" id="set-sync-google" type="button">Jetzt synchronisieren</button></div>' : '');

    // Auto-Challenges-Zeile
    var autoRow = switchRow('Auto-Challenges '+pill(auto?'AKTIV':'AUS', auto?'ok':'off'), 'Erstellt die täglichen Standard-Challenges.', 'set-auto', auto);

    return card('Synchronisierung', fbRow + gRow + autoRow);
  }
  var APP_VERSION = '0.1.0001';

  function appPane(){
    return card('App',
      '<div class="change-settings-row"><div>'
      +'<div class="change-settings-title">Change als App installieren '+pill(installedLabel(), installedLabel()==='Installiert'?'ok':'off')+'</div>'
      +'<div class="change-settings-sub">Für Handy-Nutzung, Push und Startbildschirm.</div>'
      +'</div></div>'
      +'<div class="change-settings-actions"><button class="btn btn-secondary btn-full" onclick="if(typeof installChangeApp===\'function\')installChangeApp()">Change als App installieren</button></div>')
      + card('Version',
        '<div style="padding:4px 0">'
        +'<div style="font-size:15px;font-weight:700;color:var(--t1)">Change</div>'
        +'<div style="font-size:12px;color:var(--t3);margin-top:4px">Version '+APP_VERSION+'</div>'
        +'</div>');
  }
  var currentSettingsTab = 'calendar';
  function tabButton(id, label, active){ return '<button class="change-settings-tab '+(active===id?'active':'')+'" type="button" data-settings-tab="'+id+'">'+label+'</button>'; }
  function openSettingsPanel(startTab){
    startTab = ['calendar','dashboard','sync','app'].indexOf(startTab) >= 0 ? startTab : (currentSettingsTab || 'calendar');
    currentSettingsTab = startTab;
    var html = '<div class="change-settings-tabs">'
      + tabButton('calendar','📅 Kalender', startTab)
      + tabButton('dashboard','▦ Dashboard', startTab)
      + tabButton('sync','↻ Sync', startTab)
      + tabButton('app','⚙︎ App', startTab)
      + '</div>'
      + '<div class="change-settings-pane '+(startTab==='calendar'?'active':'')+'" data-pane="calendar">'+calendarPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='dashboard'?'active':'')+'" data-pane="dashboard">'+dashboardPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='sync'?'active':'')+'" data-pane="sync">'+syncPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='app'?'active':'')+'" data-pane="app">'+appPane()+'</div>';
    if(typeof window.openPanel === 'function') window.openPanel('Einstellungen', html);
    setTimeout(bindSettings, 30);
  }
  function refreshSameTab(tab){
    if(tab && ['calendar','dashboard','sync','app'].indexOf(tab) >= 0) currentSettingsTab = tab;
    var active = document.querySelector('.change-settings-tab.active');
    var next = active ? active.getAttribute('data-settings-tab') : currentSettingsTab;
    openSettingsPanel(next || 'calendar');
  }
  function bindSettings(){
    document.querySelectorAll('[data-settings-tab]').forEach(function(btn){
      btn.addEventListener('click', function(){ currentSettingsTab = btn.getAttribute('data-settings-tab') || currentSettingsTab; openSettingsPanel(currentSettingsTab); });
    });
    var saveCal = function(){
      var options = {
        showHolidays: !!($('set-show-holidays') && $('set-show-holidays').checked),
        showChallengeDots: !!($('set-show-points') && $('set-show-points').checked),
        showWeekNumbers: !!($('set-show-kw') && $('set-show-kw').checked),
        holidayState: ($('set-holiday-state') && $('set-holiday-state').value) || 'ALL'
      };
      // setHolidayState schreibt change_v1_holiday_state + holiday_state (beide Keys),
      // normalisiert via cleanState() und löst (gewrappt) Firebase-Sync aus.
      if(typeof window.setHolidayState === 'function'){
        window.setHolidayState(options.holidayState);
      } else {
        try{ localStorage.setItem('change_v1_holiday_state', options.holidayState); }catch(e){}
        try{ localStorage.setItem('holiday_state', options.holidayState); }catch(e){}
      }
      saveCalendarOptions(options);
    };
    ['set-show-holidays','set-show-points','set-show-kw','set-holiday-state'].forEach(function(id){ var el=$(id); if(el) el.addEventListener('change', saveCal); });
    var friseur = $('set-friseur'); if(friseur) friseur.addEventListener('change', function(){ if(window.setFriseurEnabled) window.setFriseurEnabled(friseur.checked); else writeBool('change_v1_friseur_enabled', friseur.checked); try{ if(window.buildDashboard) window.buildDashboard(); }catch(e){} refreshSameTab(); });
    var frWeeks = $('set-friseur-weeks'); if(frWeeks) frWeeks.addEventListener('change', function(){ var value = parseInt(frWeeks.value,10) || 3; if(window.setFriseurWeeks) window.setFriseurWeeks(value); else localStorage.setItem('change_v1_friseur_weeks', String(value)); try{ if(window.buildDashboard) window.buildDashboard(); }catch(e){} });
    var urlaub = $('set-urlaub'); if(urlaub) urlaub.addEventListener('change', function(){ if(window.setUrlaubEnabled) window.setUrlaubEnabled(urlaub.checked); else writeBool('urlaub_tracker_on', urlaub.checked); try{ if(window.buildDashboard) window.buildDashboard(); }catch(e){} refreshSameTab(); });
    var urDays = $('set-urlaub-days'); if(urDays) urDays.addEventListener('change', function(){ var value = parseInt(urDays.value,10) || 30; if(window.setUrlaubDays) window.setUrlaubDays(value); else localStorage.setItem('urlaub_tracker_days', String(value)); try{ if(window.buildDashboard) window.buildDashboard(); }catch(e){} });
    var addHalf = $('set-add-half'); if(addHalf) addHalf.addEventListener('click', function(){ var month = $('set-half-month'), day = $('set-half-day'); if(!month || !day) return; var value = month.value+'-'+day.value; if(window.addUrlaubHalfDay) window.addUrlaubHalfDay(value); else { var list = halfDays(); if(list.indexOf(value) < 0) list.push(value); try{ localStorage.setItem('urlaub_half_days', JSON.stringify(list.sort())); }catch(e){} } try{ if(window.buildDashboard) window.buildDashboard(); }catch(e){} refreshSameTab(); });
    document.querySelectorAll('[data-remove-half]').forEach(function(btn){ btn.addEventListener('click', function(){ var value = btn.getAttribute('data-remove-half'); if(window.removeUrlaubHalfDay) window.removeUrlaubHalfDay(value); else { try{ localStorage.setItem('urlaub_half_days', JSON.stringify(halfDays().filter(function(day){ return day !== value; }))); }catch(e){} } try{ if(window.buildDashboard) window.buildDashboard(); }catch(e){} refreshSameTab(); }); });
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
    var rainHours = $('set-rain-hours'); if(rainHours) rainHours.addEventListener('change', function(){ try{ localStorage.setItem('change_v1_rain_alert_hours', rainHours.value); }catch(e){} });
    var pollenToggle = $('set-pollen'); if(pollenToggle) pollenToggle.addEventListener('change', function(){ updateWeather({pollenEnabled:pollenToggle.checked}, pollenToggle.checked); });
    var pollenAlertToggle = $('set-pollen-alerts'); if(pollenAlertToggle) pollenAlertToggle.addEventListener('change', function(){ updateWeather({pollenAlertsEnabled:pollenAlertToggle.checked, pollenEnabled: pollenAlertToggle.checked ? true : (window.ChangeWeatherStore&&window.ChangeWeatherStore.settings().pollenEnabled)}, pollenAlertToggle.checked); });
    var pollenHours = $('set-pollen-hours'); if(pollenHours) pollenHours.addEventListener('change', function(){ try{ localStorage.setItem('change_v1_pollen_alert_hours', pollenHours.value); }catch(e){} });
    var weatherLocation = $('set-weather-location'); if(weatherLocation) weatherLocation.addEventListener('click', async function(){
      try{
        if(window.ChangeWeatherStore) await window.ChangeWeatherStore.requestLocation();
        if(window.ChangeWeatherRules) await window.ChangeWeatherRules.refreshAndNotify(true);
      }catch(e){ if(typeof window.toast === 'function') window.toast(e.message || 'Standort konnte nicht aktualisiert werden','err'); }
      refreshSameTab();
    });
    var live = $('set-live'); if(live) live.addEventListener('change', async function(){ if(window.setLiveSyncEnabled) await window.setLiveSyncEnabled(live.checked); else writeBool('live_sync_enabled', live.checked); refreshSameTab(); });
    var auto = $('set-auto'); if(auto) auto.addEventListener('change', function(){
      setAutoChallengesState(!!auto.checked);
      refreshSameTab('sync');
    });
    var google = $('set-google'); if(google) google.addEventListener('change', async function(){ if(window.ChangeGoogleSyncStatus){ if(google.checked) await window.ChangeGoogleSyncStatus.syncNow(); else window.ChangeGoogleSyncStatus.disconnect(); } refreshSameTab(); });
    var syncGoogle = $('set-sync-google'); if(syncGoogle) syncGoogle.addEventListener('click', async function(){ if(window.ChangeGoogleSyncStatus) await window.ChangeGoogleSyncStatus.syncNow(); refreshSameTab(); });
    var btnGoogleConnect = $('btn-google-connect'); if(btnGoogleConnect) btnGoogleConnect.addEventListener('click', function(){ if(typeof connectToGoogle==='function') connectToGoogle(); });

  }

  // ── Cache leeren ──────────────────────────────────────────────────────────
  // Löscht alle Daten-Caches (Events, Completions, Players) aus localStorage.
  // Bewahrt: Login-Session, Einstellungen, Push-Token.
  // Löscht danach auch SW-Caches (Browser HTTP-Cache) und lädt neu.
  window.clearChangeAppCache = async function() {
    // Keys die NIEMALS gelöscht werden (Auth + Einstellungen)
    var PRESERVE = new Set([
      // Auth & Login
      'change_v1_user_info', 'user_info', 'user_info_safe',
      'change_v1_user_email', 'user_email',
      'was_logged_in', 'access_token', 'change_v1_access_token',
      'client_id', 'change_v1_client_id',
      'fcm_token', 'change_v1_fcm_token',
      // Kalender-Einstellungen
      'change_v1_calendar_view_options', 'calendar_settings',
      'change_v1_holiday_state', 'holiday_state',
      'change_v1_holiday_notifications', 'holiday_notifications',
      // Dashboard-Einstellungen
      'change_v1_friseur_enabled', 'change_v1_friseur_weeks',
      'urlaub_tracker_on', 'urlaub_tracker_days', 'urlaub_half_days',
      // Wetter-Einstellungen
      'change_v1_weather_settings', 'change_v1_rain_alert_hours', 'change_v1_pollen_alert_hours',
      // Sync-Einstellungen
      'live_sync_enabled', 'change_v1_live_sync_enabled',
      'auto_challenges_enabled', 'change_v1_auto_challenges_enabled',
      'change_v1_google_calendar_sync', 'change_google_sync_enabled',
      'push_enabled', 'change_v1_push_enabled',
      // Design
      'change_v1_dark_mode',
      // Settings-Sync-Timestamps
      'change_v1_settings_updated_at', 'change_v1_settings_synced_at'
    ]);

    // 1. Alle zu löschenden Keys sammeln
    var toDelete = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && !PRESERVE.has(key)) toDelete.push(key);
    }
    // Entfernen (separat, weil Iteration während Remove Index verschiebt)
    toDelete.forEach(function(key) {
      try { localStorage.removeItem(key); } catch(e) {}
    });

    // 2. Service Worker Caches leeren (Browser HTTP-Cache für App-Dateien)
    if ('caches' in window) {
      try {
        var names = await caches.keys();
        await Promise.all(names.map(function(n) { return caches.delete(n); }));
      } catch(e) {}
    }

    // 3. Neu laden mit Cache-Bust-Parameter (iOS Safari + Android Chrome)
    var url = window.location.href.split('?')[0].split('#')[0];
    window.location.replace(url + '?v=' + Date.now());
  };

  window.ChangeSettingsPanel = {open: openSettingsPanel, getAutoChallengesEnabled: getAutoChallengesEnabled, setAutoChallengesState: setAutoChallengesState};
  window.openSettingsPanel = openSettingsPanel;
  window.openCalendarSettings = function(){ return openSettingsPanel('calendar'); };
  window.openPushSettingsPanel = function(){ return openSettingsPanel('sync'); };
})();
