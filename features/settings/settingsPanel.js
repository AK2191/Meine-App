(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function esc(value){
    var model = window.ChangeCalendarModel;
    if(model && model.esc) return model.esc(value);
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }
  function iconMarkup(value){
    var raw = String(value == null ? '' : value);
    if(raw.indexOf('<') === 0) return raw;
    return esc(raw);
  }
  function githubIcon(){
    return '<img class="change-github-mark" src="./icons/github-mark.png" alt="" aria-hidden="true">';
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
  function readDatabaseSyncEnabled(){
    return readBoolMulti(['change_v1_database_sync_enabled','database_sync_enabled','change_v1_live_sync_enabled','live_sync_enabled'], false);
  }
  function getAutoChallengesEnabled(){
    return readBoolMulti(['change_v1_auto_challenges_enabled','auto_challenges_enabled'], true);
  }
  function getChallengeDifficulty(){
    try{ if(window.ChangeChallengeDifficulty && window.ChangeChallengeDifficulty.get) return window.ChangeChallengeDifficulty.get(); }catch(e){}
    try{ return JSON.parse(localStorage.getItem('change_v1_challenge_difficulty') || 'null') || localStorage.getItem('challenge_difficulty') || 'easy'; }catch(e){ return 'easy'; }
  }
  function setChallengeDifficulty(value){
    var next = 'easy';
    try{ next = window.ChangeChallengeDifficulty && window.ChangeChallengeDifficulty.set ? window.ChangeChallengeDifficulty.set(value) : String(value || 'easy'); }catch(e){ next = String(value || 'easy'); }
    try{ localStorage.setItem('change_v1_challenge_difficulty', JSON.stringify(next)); localStorage.setItem('challenge_difficulty', JSON.stringify(next)); }catch(e){}
    try{ if(typeof window.saveChangeSettings === 'function' && readDatabaseSyncEnabled()) window.saveChangeSettings(true); }catch(e){}
    return next;
  }
  function challengeDifficultySelect(id){
    var current = getChallengeDifficulty();
    var options = '';
    try{ if(window.ChangeChallengeDifficulty && window.ChangeChallengeDifficulty.selectOptions) options = window.ChangeChallengeDifficulty.selectOptions(current); }catch(e){}
    if(!options){
      options = '<option value="easy" '+(current==='easy'?'selected':'')+'>Leicht · 6–12 P</option>'+
                '<option value="medium" '+(current==='medium'?'selected':'')+'>Mittel · 14–25 P</option>'+
                '<option value="hard" '+(current==='hard'?'selected':'')+'>Schwer · 30–50 P</option>'+
                '<option value="hardcore" '+(current==='hardcore'?'selected':'')+'>Hardcore · 60–100 P</option>';
    }
    return featureField('Schwierigkeit der Auto-Challenges', '<select class="finput" id="'+id+'">'+options+'</select>', 'Steuert nur automatisch erzeugte Aufgaben. Manuelle Challenges bleiben unverändert.');
  }
  function getAutoChallengeCount(){
    try{ if(window.ChangeChallengeDifficulty && window.ChangeChallengeDifficulty.getDailyCount) return window.ChangeChallengeDifficulty.getDailyCount(); }catch(e){}
    try{ return parseInt(JSON.parse(localStorage.getItem('change_v1_auto_challenge_count') || 'null'), 10) || parseInt(localStorage.getItem('auto_challenge_count'), 10) || 7; }catch(e){ return 7; }
  }
  function setAutoChallengeCount(value){
    var next = parseInt(value, 10) || 7;
    try{ if(window.ChangeChallengeDifficulty && window.ChangeChallengeDifficulty.setDailyCount) next = window.ChangeChallengeDifficulty.setDailyCount(next); }catch(e){}
    try{ localStorage.setItem('change_v1_auto_challenge_count', JSON.stringify(next)); localStorage.setItem('auto_challenge_count', JSON.stringify(next)); }catch(e){}
    try{ if(typeof window.saveChangeSettings === 'function' && readDatabaseSyncEnabled()) window.saveChangeSettings(true); }catch(e){}
    return next;
  }
  function autoChallengeCountSelect(id){
    var current = getAutoChallengeCount();
    var options = '';
    try{ if(window.ChangeChallengeDifficulty && window.ChangeChallengeDifficulty.countOptions) options = window.ChangeChallengeDifficulty.countOptions(current); }catch(e){}
    if(!options){
      [[3,'Kompakt'],[5,'Normal'],[7,'Aktiv'],[10,'Intensiv']].forEach(function(item){ options += '<option value="'+item[0]+'" '+(current===item[0]?'selected':'')+'>'+item[1]+' · '+item[0]+' Aufgaben</option>'; });
    }
    return featureField('Tagesumfang', '<select class="finput" id="'+id+'">'+options+'</select>', 'Bestimmt, wie viele Auto-Challenges pro Tag erzeugt und synchronisiert werden.');
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
  function appThemePreference(){
    try{ if(window.ChangeTheme && window.ChangeTheme.get) return window.ChangeTheme.get(); }catch(e){}
    try{
      var value = localStorage.getItem('change_v1_theme');
      if(value === 'system' || value === 'light' || value === 'dark') return value;
      var legacy = localStorage.getItem('change_v1_dark_mode');
      if(legacy !== null) return legacy === '1' ? 'dark' : 'light';
    }catch(e){}
    return 'system';
  }
  function appThemeResolved(){
    try{ if(window.ChangeTheme && window.ChangeTheme.resolved) return window.ChangeTheme.resolved(); }catch(e){}
    try{ return document.documentElement.getAttribute('data-theme') || 'light'; }catch(e){ return 'light'; }
  }
  function setAppTheme(value){
    value = value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
    try{ if(window.ChangeTheme && window.ChangeTheme.set) return window.ChangeTheme.set(value); }catch(e){}
    try{ localStorage.setItem('change_v1_theme', value); }catch(e){}
    try{
      var resolved = value === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : (value === 'dark' ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.setAttribute('data-theme-preference', value);
      if(document.body){
        document.body.classList.remove('theme-system','theme-light','theme-dark');
        document.body.classList.add('theme-' + value);
      }
    }catch(e){}
  }
  function themeOptionButton(value, title, subtitle, active){
    return '<button type="button" class="change-theme-option '+(active===value?'active':'')+'" data-change-theme="'+esc(value)+'"><strong>'+esc(title)+'</strong><span>'+esc(subtitle)+'</span></button>';
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
  function featureSwitch(title, subtitle, id, checked, disabled){
    var control = '<label class="switch"><input type="checkbox" id="'+id+'" '+(checked ? 'checked' : '')+' '+(disabled ? 'disabled' : '')+'><span class="slider"></span></label>';
    return '<div class="change-feature-row"><div><div class="change-feature-row-title">'+title+'</div>'+(subtitle ? '<div class="change-feature-row-sub">'+subtitle+'</div>' : '')+'</div>'+control+'</div>';
  }
  function featureField(label, inner, hint){
    return '<div class="change-feature-field"><label class="flabel">'+esc(label)+'</label>'+inner+(hint ? '<div class="change-feature-row-sub">'+esc(hint)+'</div>' : '')+'</div>';
  }
  function calendarPane(){
    var options = calendarOptions();
    var holidaysBody = featureField(
      'Region',
      '<select class="finput" id="set-holiday-state">'+stateOptions(options.holidayState)+'</select>',
      'Bestimmt, welche gesetzlichen Feiertage klein im Kalender erscheinen.'
    );
    return '<div class="change-settings-stack">'
      + settingsFeatureCard(
        '🗓️',
        'Feiertage',
        options.showHolidays ? 'AKTIV' : 'AUS',
        options.showHolidays ? 'ok' : 'off',
        'Kleine Feiertags-Hinweise direkt am Tag.',
        '<label class="switch"><input type="checkbox" id="set-show-holidays" '+(options.showHolidays ? 'checked' : '')+'><span class="slider"></span></label>',
        holidaysBody
      )
      + settingsFeatureCard(
        '🏆',
        'Challengepunkte',
        options.showChallengeDots ? 'AKTIV' : 'AUS',
        options.showChallengeDots ? 'ok' : 'off',
        'Zeigt erledigte Punkte nur als kleines Badge unten rechts.',
        '<label class="switch"><input type="checkbox" id="set-show-points" '+(options.showChallengeDots ? 'checked' : '')+'><span class="slider"></span></label>',
        '<div class="change-feature-note">Keine großen Elemente im Kalender. Die Tageszellen bleiben ruhig und übersichtlich.</div>'
      )
      + settingsFeatureCard(
        '📌',
        'Kalenderwochen',
        options.showWeekNumbers ? 'AKTIV' : 'AUS',
        options.showWeekNumbers ? 'ok' : 'off',
        'Zeigt KW dezent für Monats- und Jahresplanung.',
        '<label class="switch"><input type="checkbox" id="set-show-kw" '+(options.showWeekNumbers ? 'checked' : '')+'><span class="slider"></span></label>',
        ''
      )
      + '</div>';
  }
  function dashboardBool(getterName, key, fallback){
    try{ if(typeof window[getterName] === 'function') return !!window[getterName](); }catch(e){}
    return readBool(key, fallback);
  }
  function dashboardNumber(getterName, keys, fallback){
    try{
      if(typeof window[getterName] === 'function'){
        var fromGetter = parseFloat(window[getterName]());
        if(Number.isFinite(fromGetter)) return fromGetter;
      }
    }catch(e){}
    keys = Array.isArray(keys) ? keys : [keys];
    for(var i=0;i<keys.length;i++){
      try{
        var raw = localStorage.getItem(keys[i]);
        if(raw != null && raw !== ''){
          var parsed = parseFloat(raw);
          if(Number.isFinite(parsed)) return parsed;
        }
      }catch(e){}
    }
    return fallback;
  }

  function dashboardModuleCount(){
    var modules = [
      dashboardBool('getFriseurEnabled', 'change_v1_friseur_enabled', true),
      dashboardBool('getBirthdaysEnabled', 'change_v1_birthdays_enabled', true),
      dashboardBool('getUrlaubEnabled', 'urlaub_tracker_on', true)
    ];
    try{
      var weather = weatherHealthStatus();
      var ws = weather.settings || {};
      modules.push(!!ws.weatherEnabled);
      modules.push(!!ws.pollenEnabled);
    }catch(e){
      modules.push(false);
      modules.push(false);
    }
    modules.push(true); // Termine
    modules.push(true); // Aufgaben
    modules.push(true); // Mitspieler
    return modules.filter(Boolean).length;
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
    return featureField('Erinnerung', '<select class="finput" id="'+id+'">'+opts+'</select>', '');
  }
  function birthdayDaysSelect(id, current){
    current = Math.max(0, Math.min(365, parseInt(current, 10) || 0));
    var days = [];
    for(var i=0;i<=30;i++) days.push(i);
    [45,60,90,120,180,365].forEach(function(day){ if(days.indexOf(day) < 0) days.push(day); });
    if(days.indexOf(current) < 0) days.push(current);
    days.sort(function(a,b){ return a-b; });
    var opts = days.map(function(day){
      var label = day === 0 ? 'Am Geburtstag' : (day === 1 ? '1 Tag vorher' : day + ' Tage vorher');
      return '<option value="'+day+'" '+(day===current?'selected':'')+'>'+label+'</option>';
    }).join('');
    return featureField('Erinnerung', '<select class="finput" id="'+id+'">'+opts+'</select>', 'Steuert, ab wie vielen Tagen vorher Geburtstage in Glocke/Benachrichtigung erscheinen.');
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

    var wetterBody = '';
    if(wetterOn){
      wetterBody += featureSwitch('Regenwarnung', 'Warnt nur, wenn Wetter aktiv ist.', 'set-rain-alerts', rainOn);
      if(rainOn) wetterBody += hoursSelect('set-rain-hours', rainHours);
    }else{
      wetterBody += '<div class="change-feature-note">Wetter bleibt ausgeblendet. Standort wird erst nach bewusster Aktualisierung genutzt.</div>';
    }
    wetterBody += '<button class="btn btn-secondary btn-full" id="set-weather-location" type="button">Standort aktualisieren</button>';

    var pollenBody = '';
    if(pollenOn){
      pollenBody += featureSwitch('Pollenwarnung', 'Benachrichtigt nur bei starker Belastung.', 'set-pollen-alerts', pollWarnOn);
      if(pollWarnOn) pollenBody += hoursSelect('set-pollen-hours', pollenHours);
    }else{
      pollenBody += '<div class="change-feature-note">Pollen bleiben ausgeblendet und erzeugen keine Dashboard-Karte.</div>';
    }

    return settingsFeatureCard(
        '🌦️',
        'Wetter',
        wetterOn ? 'AKTIV' : 'AUS',
        wetterOn ? 'ok' : 'off',
        'Zeigt Wetter kompakt im Dashboard.',
        '<label class="switch"><input type="checkbox" id="set-weather" '+(wetterOn ? 'checked' : '')+'><span class="slider"></span></label>',
        wetterBody
      )
      + settingsFeatureCard(
        '🌿',
        'Pollen',
        pollenOn ? 'AKTIV' : 'AUS',
        pollenOn ? 'ok' : 'off',
        'Zeigt Pollenbelastung ruhig im Dashboard.',
        '<label class="switch"><input type="checkbox" id="set-pollen" '+(pollenOn ? 'checked' : '')+'><span class="slider"></span></label>',
        pollenBody
      );
  }
  function dashboardPane(){
    var friseurOn = dashboardBool('getFriseurEnabled', 'change_v1_friseur_enabled', true);
    var birthdaysOn = dashboardBool('getBirthdaysEnabled', 'change_v1_birthdays_enabled', true);
    var urlaubOn = dashboardBool('getUrlaubEnabled', 'urlaub_tracker_on', true);
    var friseurWeeks = dashboardNumber('getFriseurWeeks', ['change_v1_friseur_weeks','friseur_weeks'], 3);
    var birthdayNotificationDays = Math.max(0, Math.min(365, parseInt(dashboardNumber('getBirthdayNotificationDays', ['change_v1_birthday_notification_days','birthday_notification_days'], 1), 10) || 0));
    var urlaubDays = dashboardNumber('getUrlaubTotalDays', ['urlaub_tracker_days','urlaub_days'], 30);
    var months = [['01','Jan'],['02','Feb'],['03','Mär'],['04','Apr'],['05','Mai'],['06','Jun'],['07','Jul'],['08','Aug'],['09','Sep'],['10','Okt'],['11','Nov'],['12','Dez']];
    var monthOptions = months.map(function(item){ return '<option value="'+item[0]+'">'+item[1]+'</option>'; }).join('');
    var dayOptions = Array.from({length:31}, function(_, i){ var d = String(i+1).padStart(2,'0'); return '<option value="'+d+'">'+d+'.</option>'; }).join('');

    var friseurBody = friseurOn
      ? featureField('Erinnerung nach', '<select class="finput" id="set-friseur-weeks">'+[2,3,4,5,6,8].map(function(n){ return '<option value="'+n+'" '+(n === friseurWeeks ? 'selected' : '')+'>'+n+' Wochen</option>'; }).join('')+'</select>', 'Steuert den nächsten empfohlenen Friseurtermin im Dashboard.')
      : '<div class="change-feature-note">Friseur wird im Dashboard ausgeblendet.</div>';

    var birthdaysBody = birthdaysOn
      ? birthdayDaysSelect('set-birthday-notification-days', birthdayNotificationDays)
        + '<div class="change-feature-note">Erkennt Bday, B-day, Birthday, Geburtstag und Geb. aus dem Google Kalender. Sichtbar bleibt es als „Geburtstage“.</div>'
      : '<div class="change-feature-note">Geburtstage werden im Dashboard und in der Glocke ausgeblendet.</div>';

    var urlaubBody = urlaubOn
      ? featureField('Jahresurlaub', '<input type="number" class="finput" id="set-urlaub-days" min="1" max="365" value="'+urlaubDays+'">', 'Gezählt werden Urlaubstage. Wochenenden und Feiertage zählen nicht.')
        + featureField('Halbe Urlaubstage', '<div class="change-halfday-controls"><select class="finput" id="set-half-month">'+monthOptions+'</select><select class="finput" id="set-half-day">'+dayOptions+'</select><button class="btn btn-secondary btn-sm" id="set-add-half" type="button">+ Hinzufügen</button></div>'+halfDayChips(), '')
      : '<div class="change-feature-note">Urlaub wird im Dashboard ausgeblendet.</div>';

    return '<div class="change-settings-stack">'
      + weatherHealthCard()
      + settingsFeatureCard(
        '✂️',
        'Friseur',
        friseurOn ? 'AKTIV' : 'AUS',
        friseurOn ? 'ok' : 'off',
        'Zeigt den nächsten Friseurtermin als ruhige Dashboard-Karte.',
        '<label class="switch"><input type="checkbox" id="set-friseur" '+(friseurOn ? 'checked' : '')+'><span class="slider"></span></label>',
        friseurBody
      )
      + settingsFeatureCard(
        '🎂',
        'Geburtstage',
        birthdaysOn ? 'AKTIV' : 'AUS',
        birthdaysOn ? 'ok' : 'off',
        'Zeigt kommende Geburtstage ähnlich wie Friseur.',
        '<label class="switch"><input type="checkbox" id="set-birthdays" '+(birthdaysOn ? 'checked' : '')+'><span class="slider"></span></label>',
        birthdaysBody
      )
      + settingsFeatureCard(
        '🏖️',
        'Urlaub',
        urlaubOn ? 'AKTIV' : 'AUS',
        urlaubOn ? 'ok' : 'off',
        'Zeigt geplante Urlaubstage und Resturlaub.',
        '<label class="switch"><input type="checkbox" id="set-urlaub" '+(urlaubOn ? 'checked' : '')+'><span class="slider"></span></label>',
        urlaubBody
      )
      + '</div>';
  }
  function firebaseStatus(){
    try{ if(window.ChangeAppStatus && window.ChangeAppStatus.getDatabaseStatus) return window.ChangeAppStatus.getDatabaseStatus(); }catch(e){}
    var status = window._firebaseSyncStatus || 'unknown';
    var cfgOk = !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && !String(window.FIREBASE_CONFIG.apiKey).includes('HIER_'));
    var enabled = readDatabaseSyncEnabled();
    try{
      var hasUser = typeof firebase !== 'undefined' && firebase.auth && !!firebase.auth().currentUser;
      if(enabled && hasUser)
        return {ok:cfgOk, label:'AKTIV', tone:'ok', detail:'Firebase speichert Mitspieler, Einstellungen, Challenges und Punkte.'};
      if(status === 'connecting')
        return {ok:cfgOk, label:'VERBINDET', tone:'off', detail:'Firebase-Verbindung wird hergestellt.'};
      if(status === 'auth_failed')
        return {ok:cfgOk, label:'ANMELDUNG NÖTIG', tone:'error', detail:'Beim Aktivieren mit Google/Firebase anmelden.'};
      if(enabled)
        return {ok:cfgOk, label:'AKTIVIERT', tone:'off', detail:'Beim nächsten manuellen Speichern wird Firebase verbunden.'};
    }catch(e){}
    return {ok:cfgOk, label:'AUS', tone:'off', detail: cfgOk ? 'Startet nur über diesen Schalter.' : 'Firebase-Konfiguration nicht geladen.'};
  }

  function settingsFeatureCard(icon, title, badgeText, badgeTone, subtitle, controlHtml, bodyHtml){
    return '<div class="change-settings-feature-card">'
      + '<div class="change-feature-head">'
      + '<div class="change-feature-left"><div class="change-feature-icon">'+iconMarkup(icon)+'</div><div>'
      + '<div class="change-feature-title">'+esc(title)+' '+pill(badgeText, badgeTone)+'</div>'
      + (subtitle ? '<div class="change-feature-sub">'+esc(subtitle)+'</div>' : '')
      + '</div></div>'
      + (controlHtml ? '<div class="change-feature-control">'+controlHtml+'</div>' : '')
      + '</div>'
      + (bodyHtml ? '<div class="change-feature-body">'+bodyHtml+'</div>' : '')
      + '</div>';
  }

  function syncPane(){
    var dbOn   = readDatabaseSyncEnabled();
    var google = googleStatus();
    var fb     = firebaseStatus();

    var dbSwitch = '<label class="switch"><input type="checkbox" id="set-database-sync" '+(dbOn?'checked':'')+' '+(!fb.ok?'disabled':'')+'><span class="slider"></span></label>';
    var dbBody = '<div class="change-feature-chips"><span>Mitspieler</span><span>Einstellungen</span><span>Challenges</span><span>Punkte</span></div>'
      + '<button class="btn btn-secondary btn-full" id="set-database-sync-now" type="button" '+(!fb.ok?'disabled':'')+'>Jetzt in Firebase speichern</button>';

    var googleCanToggle = !!(google.loggedIn || google.cached);
    var googleControl = googleCanToggle
      ? '<label class="switch"><input type="checkbox" id="set-google" '+(google.enabled?'checked':'')+'><span class="slider"></span></label>'
      : '<button class="btn btn-secondary btn-compact" id="btn-google-connect" type="button">Verbinden</button>';
    var googleSub = google.detail || (google.loggedIn ? 'Importiert Kalendertermine. Getrennt vom Datenbank-Sync.' : 'Nur für Kalendertermine. Startet keinen Datenbank-Sync.');
    var googleBody = googleCanToggle
      ? '<button class="btn btn-secondary btn-full" id="set-sync-google" type="button">Google Kalender '+(google.loggedIn?'neu synchronisieren':'aktualisieren')+'</button>'
      : '<div class="change-feature-note">Google Kalender bleibt unabhängig von Firebase.</div>';

    var statusBody = (window.ChangeAppStatus && window.ChangeAppStatus.syncStatusHtml) ? window.ChangeAppStatus.syncStatusHtml() : '<div class="change-feature-note">Status wird geladen.</div>';
    var logBody = (window.ChangeAppStatus && window.ChangeAppStatus.logHtml) ? window.ChangeAppStatus.logHtml(6) + '<button class="btn btn-secondary btn-full" id="clear-sync-log" type="button">Protokoll leeren</button>' : '<div class="change-feature-note">Noch kein Protokoll vorhanden.</div>';
    return '<div class="change-settings-stack">'
      + settingsFeatureCard('☁️', 'Datenbank-Sync', fb.label, fb.tone, fb.detail, dbSwitch, dbBody)
      + settingsFeatureCard('📅', 'Google Kalender', google.label, google.tone, googleSub, googleControl, googleBody)
      + settingsFeatureCard('🟢', 'Sync-Status', 'LIVE', 'ok', 'Zeigt, ob Datenbank und Google Kalender aktuell sind.', '', statusBody)
      + settingsFeatureCard('🧾', 'Sync-Protokoll', 'LOKAL', 'off', 'Letzte Sync- und Anfeuern-Aktionen auf diesem Gerät.', '', logBody)
      + '</div>';
  }
  function challengesPane(){
    var auto = getAutoChallengesEnabled();
    var body = auto
      ? autoChallengeCountSelect('set-auto-count') + challengeDifficultySelect('set-challenge-difficulty')
      : '<div class="change-feature-note">Automatische Tagesaufgaben sind ausgeschaltet. Manuelle Challenges bleiben unverändert.</div>';
    return '<div class="change-settings-stack">'
      + settingsFeatureCard(
        '🏆',
        'Auto-Challenges',
        auto ? 'AKTIV' : 'AUS',
        auto ? 'ok' : 'off',
        'Erstellt jeden Tag genau einen sauberen Aufgaben-Satz.',
        '<label class="switch"><input type="checkbox" id="set-auto" '+(auto ? 'checked' : '')+'><span class="slider"></span></label>',
        body
      )
      + '</div>';
  }
  var APP_VERSION = '0.1.0208';



  var githubUpdateState = {
    file: null,
    status: 'empty',
    message: '',
    files: [],
    checks: [],
    fromVersion: '0.1.0184',
    toVersion: '',
    rootFiles: [],
    githubFiles: [],
    newFiles: [],
    fileListOpen: false,
    uploadCommitSha: '',
    actionRunUrl: '',
    actionStatus: '',
    actionConclusion: '',
    actionMessage: '',
    actionCheckedAt: '',
    actionStartedAt: 0,
    actionPollTimer: null,
    updateReady: false,
    branchCommitSha: '',
    branchVersion: '',
    targetCommitted: false,
    liveVersion: '',
    liveReady: false,
    lastRunId: ''
  };

  var GITHUB_UPDATE_WORKER_URL = 'https://change-github-update.ak2191.workers.dev';
  function readGithubUpdateSecret(){
    try{ return localStorage.getItem('change_github_update_secret') || ''; }catch(e){ return ''; }
  }
  function writeGithubUpdateSecret(value){
    try{ localStorage.setItem('change_github_update_secret', String(value || '').trim()); }catch(e){}
  }
  function arrayBufferToBase64(buffer){
    var bytes = new Uint8Array(buffer);
    var chunk = 0x8000;
    var binary = '';
    for(var i=0;i<bytes.length;i+=chunk){
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function versionParts(value){
    return String(value || '').split('.').map(function(part){ return parseInt(part, 10) || 0; });
  }
  function compareVersions(a, b){
    var av = versionParts(a), bv = versionParts(b);
    for(var i=0;i<Math.max(av.length, bv.length);i++){
      var left = av[i] || 0, right = bv[i] || 0;
      if(left > right) return 1;
      if(left < right) return -1;
    }
    return 0;
  }
  function maxVersion(values){
    var best = '';
    var currentPrefix = versionParts(APP_VERSION).slice(0, 2).join('.') + '.';
    (values || []).forEach(function(value){
      value = String(value || '').trim();
      if(!/^\d+\.\d+\.\d+$/.test(value)) return;
      if(value.indexOf(currentPrefix) !== 0) return;
      if(!best || compareVersions(value, best) > 0) best = value;
    });
    return best;
  }
  function collectVersions(text){
    var found = [];
    text = String(text || '');
    text.replace(/##\s+Version\s+(\d+\.\d+\.\d+)/g, function(_, version){ found.push(version); return _; });
    text.replace(/APP_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/g, function(_, version){ found.push(version); return _; });
    text.replace(/sichtbare App-Version wurde auf [`'"]?(\d+\.\d+\.\d+)[`'"]?/g, function(_, version){ found.push(version); return _; });
    return found;
  }
  function decodeUtf8(bytes){
    return new TextDecoder('utf-8').decode(bytes);
  }
  function readUInt16(view, offset){ return view.getUint16(offset, true); }
  function readUInt32(view, offset){ return view.getUint32(offset, true); }
  function normalizeZipPath(path){
    path = String(path || '').replace(/\\/g, '/').replace(/^\/+/, '');
    var parts = path.split('/').filter(Boolean);
    if(parts.length > 1 && /^meine-app/i.test(parts[0])) parts.shift();
    return parts.join('/');
  }
  async function inflateZipData(bytes){
    if(typeof DecompressionStream !== 'function') throw new Error('ZIP-Entpackung wird von diesem Browser nicht unterstützt.');
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    var buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  }
  function parseZipDirectory(buffer){
    var view = new DataView(buffer);
    var bytes = new Uint8Array(buffer);
    var eocd = -1;
    for(var i=bytes.length - 22;i>=0 && i>bytes.length - 66000;i--){
      if(readUInt32(view, i) === 0x06054b50){ eocd = i; break; }
    }
    if(eocd < 0) throw new Error('ZIP-Struktur konnte nicht gelesen werden.');
    var total = readUInt16(view, eocd + 10);
    var offset = readUInt32(view, eocd + 16);
    var entries = [];
    for(var entryIndex=0; entryIndex<total && offset < bytes.length; entryIndex++){
      if(readUInt32(view, offset) !== 0x02014b50) break;
      var method = readUInt16(view, offset + 10);
      var compressedSize = readUInt32(view, offset + 20);
      var uncompressedSize = readUInt32(view, offset + 24);
      var nameLen = readUInt16(view, offset + 28);
      var extraLen = readUInt16(view, offset + 30);
      var commentLen = readUInt16(view, offset + 32);
      var localOffset = readUInt32(view, offset + 42);
      var rawName = bytes.slice(offset + 46, offset + 46 + nameLen);
      var originalPath = decodeUtf8(rawName);
      var path = normalizeZipPath(originalPath);
      if(path){
        entries.push({
          originalPath: originalPath,
          path: path,
          method: method,
          compressedSize: compressedSize,
          uncompressedSize: uncompressedSize,
          localOffset: localOffset,
          isDirectory: /\/$/.test(originalPath) || /\/$/.test(path)
        });
      }
      offset += 46 + nameLen + extraLen + commentLen;
    }
    return {view:view, bytes:bytes, entries:entries};
  }
  async function readZipText(zip, entry){
    if(!entry || entry.isDirectory) return '';
    var view = zip.view, bytes = zip.bytes, offset = entry.localOffset;
    if(readUInt32(view, offset) !== 0x04034b50) throw new Error('ZIP-Datei ist beschädigt: '+entry.path);
    var nameLen = readUInt16(view, offset + 26);
    var extraLen = readUInt16(view, offset + 28);
    var dataStart = offset + 30 + nameLen + extraLen;
    var compressed = bytes.slice(dataStart, dataStart + entry.compressedSize);
    var data;
    if(entry.method === 0) data = compressed;
    else if(entry.method === 8) data = await inflateZipData(compressed);
    else throw new Error('ZIP-Kompression wird nicht unterstützt: '+entry.path);
    return decodeUtf8(data);
  }
  function githubCheckLine(check){
    var ok = !!check.ok;
    var label = check.label || '';
    var detail = check.detail || '';
    var title = check.key === 'files' ? '<button type="button" class="change-github-check-link" id="github-files-toggle">'+esc(label)+'</button>' : '<strong>'+esc(label)+'</strong>';
    return '<div class="change-github-check '+(ok?'ok':'warn')+'"><span>'+(ok?'✓':'!')+'</span><div>'+title+(detail?'<small>'+esc(detail)+'</small>':'')+'</div></div>';
  }
  function githubCheckSummary(){
    var state = githubUpdateState;
    var checks = state.checks || [];
    if(!checks.length) return '';
    var ok = checks.every(function(check){ return !!check.ok; });
    var failed = checks.find(function(check){ return !check.ok; });
    var files = (state.files || []).length;
    var githubFiles = (state.githubFiles || []).length;
    var target = state.toVersion || '';
    var label = ok ? 'ZIP bereit' : 'ZIP prüfen';
    var detail = ok
      ? ((target ? (APP_VERSION + ' → ' + target) : 'Version erkannt') + (files ? ' · ' + files + ' Dateien' : '') + (githubFiles ? ' · GitHub gelesen' : ''))
      : ((failed && failed.label ? failed.label : 'Prüfung offen') + (failed && failed.detail ? ' · ' + failed.detail : ''));
    var toggle = files ? '<button type="button" class="change-github-check-inline-link" id="github-files-toggle">Dateien</button>' : '';
    return '<div class="change-github-check-summary '+(ok?'ok':'warn')+'"><span></span><strong>'+esc(label)+'</strong><small>'+esc(detail)+'</small>'+toggle+'</div>';
  }
  function shortSha(value){
    value = String(value || '').trim();
    return value ? value.slice(0, 7) : '';
  }
  function appVersionFromText(text){
    var match = String(text || '').match(/APP_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/);
    return match ? match[1] : '';
  }
  async function readLiveAppVersion(targetVersion){
    try{
      var cacheKey = encodeURIComponent(targetVersion || String(Date.now()));
      var response = await fetch('./features/pollen/pollenView.js?v='+cacheKey+'&t='+Date.now(), {cache:'no-store'});
      if(!response.ok) throw new Error('Live-Datei '+response.status);
      return appVersionFromText(await response.text());
    }catch(e){
      return '';
    }
  }
  function githubActionCurrent(){
    var state = githubUpdateState;
    var target = state.toVersion || APP_VERSION;
    var actionDone = state.actionStatus === 'completed';
    var actionOk = actionDone && state.actionConclusion === 'success';
    var actionError = state.actionConclusion && state.actionConclusion !== 'success';
    var tone = 'active';
    var label = state.actionMessage || 'GitHub Status wird geprüft…';
    var detail = '';
    if(actionError){
      tone = 'error';
      label = state.actionMessage || 'GitHub Action fehlgeschlagen';
      detail = state.actionRunUrl ? 'Details in GitHub prüfen' : 'Bitte Action-Log prüfen';
    }else if(state.updateReady && state.liveReady){
      tone = 'ok';
      label = 'Update live bereit';
      detail = target ? ('Version '+target+' ist erreichbar') : 'Live-Version ist erreichbar';
    }else if(state.targetCommitted && !state.liveReady){
      tone = 'active';
      label = 'Live-Version wird bereitgestellt…';
      detail = state.liveVersion ? ('Live aktuell '+state.liveVersion) : 'Wartet auf GitHub Pages / Cache';
    }else if(actionOk && !state.targetCommitted){
      tone = 'active';
      label = 'Commit auf main wird geprüft…';
      detail = state.branchVersion ? ('Main '+state.branchVersion) : 'Action fertig, Commit wird gesucht';
    }else if(state.actionStatus === 'queued'){
      label = 'GitHub Action wartet…';
      detail = 'ZIP übertragen · Workflow startet';
    }else if(state.actionStatus === 'in_progress'){
      label = 'GitHub Action läuft…';
      detail = 'ZIP wird geprüft, entpackt und committed';
    }else if(state.uploadCommitSha){
      label = 'GitHub Action wird gesucht…';
      detail = 'Upload-Commit '+shortSha(state.uploadCommitSha);
    }else{
      label = state.actionMessage || 'Wartet auf Upload';
      detail = target ? ('Zielversion '+target) : '';
    }
    var meta = [];
    if(target) meta.push('Ziel '+target);
    if(state.branchVersion) meta.push('Main '+state.branchVersion);
    if(state.liveVersion) meta.push('Live '+state.liveVersion);
    if(state.actionCheckedAt) meta.push('Stand '+state.actionCheckedAt);
    if(meta.length) detail += (detail ? ' · ' : '') + meta.join(' · ');
    return {tone:tone,label:label,detail:detail};
  }
  function githubActionStatusPanel(){
    var state = githubUpdateState;
    if(!state.actionMessage && !state.updateReady && !state.actionRunUrl && !state.uploadCommitSha) return '';
    var current = githubActionCurrent();
    var cls = current.tone === 'ok' ? 'ok' : (current.tone === 'error' ? 'error' : 'checking');
    var target = state.toVersion || APP_VERSION;
    var link = state.actionRunUrl ? '<a href="'+esc(state.actionRunUrl)+'" target="_blank" rel="noopener">Details in GitHub öffnen</a>' : '';
    var button = state.updateReady && state.liveReady ? '<button class="btn btn-primary btn-full" id="github-update-reload" type="button">Update auf Version '+esc(target)+' laden</button>' : '';
    return '<div class="change-github-action '+esc(cls)+'"><div class="change-github-action-current '+esc(current.tone)+'"><span></span><div><strong>'+esc(current.label)+'</strong><small>'+esc(current.detail)+'</small></div></div>'+(link?'<div class="change-github-action-links">'+link+'</div>':'')+button+'</div>';
  }

  async function reloadChangeUpdateVersion(){
    var version = githubUpdateState.toVersion || APP_VERSION;
    try{
      if(window.caches && caches.keys){
        var keys = await caches.keys();
        await Promise.all(keys.map(function(key){ return caches.delete(key); }));
      }
    }catch(e){}
    try{
      if(navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function(reg){ return reg.update().catch(function(){}); }));
      }
    }catch(e){}
    var url = new URL(window.location.href);
    url.searchParams.set('v', version);
    url.searchParams.set('t', String(Date.now()));
    window.location.replace(url.toString());
  }

  function stopGithubActionPolling(){
    if(githubUpdateState.actionPollTimer){
      clearTimeout(githubUpdateState.actionPollTimer);
      githubUpdateState.actionPollTimer = null;
    }
  }

  function scheduleGithubActionPoll(delay){
    stopGithubActionPolling();
    githubUpdateState.actionPollTimer = setTimeout(function(){ pollGithubActionStatus(); }, delay || 5000);
  }

  async function pollGithubActionStatus(){
    var state = githubUpdateState;
    if(!state.uploadCommitSha && !state.actionStartedAt) return;
    var target = state.toVersion || APP_VERSION;
    if(Date.now() - (state.actionStartedAt || Date.now()) > 480000){
      state.actionStatus = 'timeout';
      state.actionConclusion = 'failure';
      state.actionMessage = 'Update wurde nicht rechtzeitig live erkannt.';
      state.actionCheckedAt = new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
      stopGithubActionPolling();
      refreshSameTab('github');
      return;
    }
    try{
      var url = GITHUB_UPDATE_WORKER_URL + '/status';
      var params = [];
      if(state.uploadCommitSha) params.push('commitSha=' + encodeURIComponent(state.uploadCommitSha));
      if(target) params.push('targetVersion=' + encodeURIComponent(target));
      if(params.length) url += '?' + params.join('&');
      var response = await fetch(url, {cache:'no-store'});
      var result = null;
      try{ result = await response.json(); }catch(parseErr){}
      if(!response.ok || !result || !result.ok) throw new Error((result && result.message) || ('Status Fehler '+response.status));
      var run = result.run || null;
      var branch = result.branch || null;
      state.actionCheckedAt = new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
      if(branch){
        state.branchCommitSha = branch.headSha || state.branchCommitSha || '';
        state.branchVersion = branch.version || state.branchVersion || '';
        if(branch.targetVersionCommitted === true || (target && state.branchVersion && compareVersions(state.branchVersion, target) >= 0)){
          state.targetCommitted = true;
        }
      }
      if(run){
        state.lastRunId = run.id || state.lastRunId || '';
        state.actionStatus = run.status || '';
        state.actionConclusion = run.conclusion || '';
        state.actionRunUrl = run.htmlUrl || state.actionRunUrl || '';
        if(run.status === 'completed'){
          if(run.conclusion === 'success'){
            if(!state.targetCommitted && !branch){
              state.targetCommitted = true;
            }
            state.liveVersion = await readLiveAppVersion(target);
            state.liveReady = !!(target && state.liveVersion && compareVersions(state.liveVersion, target) >= 0);
            if(state.liveReady){
              state.updateReady = true;
              state.actionMessage = 'Update ist live bereit.';
              stopGithubActionPolling();
              refreshSameTab('github');
              return;
            }
            state.updateReady = false;
            state.actionMessage = state.targetCommitted ? 'Commit ist da. Live-Version wird bereitgestellt…' : 'GitHub Action fertig. Commit auf main wird geprüft…';
          }else{
            state.updateReady = false;
            state.liveReady = false;
            state.actionMessage = 'GitHub Action fehlgeschlagen.';
            stopGithubActionPolling();
            refreshSameTab('github');
            return;
          }
        }else{
          state.updateReady = false;
          state.liveReady = false;
          state.actionMessage = run.status === 'queued' ? 'GitHub Action wartet…' : 'GitHub Action läuft…';
        }
      }else{
        state.updateReady = false;
        state.liveReady = false;
        state.actionMessage = 'GitHub Action wird gesucht…';
      }
    }catch(e){
      var statusError = e && e.message ? e.message : 'Status konnte nicht gelesen werden.';
      if(/404|Status Fehler 404|Not Found/i.test(statusError)){
        statusError = 'Cloudflare Worker ist nicht aktuell: /status fehlt. Worker bitte neu deployen.';
      }
      state.actionMessage = statusError;
      state.actionConclusion = 'failure';
      state.actionCheckedAt = new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
    }
    refreshSameTab('github');
    if(!state.updateReady && !(state.actionConclusion && state.actionConclusion !== 'success')) scheduleGithubActionPoll(5000);
  }

  function githubFileOverview(){
    var state = githubUpdateState;
    if(!state.fileListOpen || !(state.files || []).length) return '';
    var newFiles = state.newFiles || [];
    var zipFiles = state.files || [];
    var newList = newFiles.slice(0, 20).map(function(path){ return '<li>'+esc(path)+'</li>'; }).join('') || '<li>Keine neuen Dateien erkannt.</li>';
    if(newFiles.length > 20) newList += '<li>+'+(newFiles.length - 20)+' weitere neue Dateien</li>';
    var zipList = zipFiles.slice(0, 40).map(function(path){ return '<li>'+esc(path)+'</li>'; }).join('');
    if(zipFiles.length > 40) zipList += '<li>+'+(zipFiles.length - 40)+' weitere Dateien</li>';
    return '<div class="change-github-files">'
      + '<strong>Dateiübersicht</strong>'
      + '<div class="change-github-file-stats"><span>GitHub aktuell: '+esc((state.githubFiles || []).length || 'nicht gelesen')+'</span><span>ZIP: '+esc(zipFiles.length)+'</span><span>Neu: '+esc(newFiles.length)+'</span></div>'
      + '<div class="change-github-file-section"><b>Neue Dateien</b><ul>'+newList+'</ul></div>'
      + '<div class="change-github-file-section"><b>ZIP-Dateien</b><ul>'+zipList+'</ul></div>'
      + '</div>';
  }
  function githubUpdateBody(){
    var state = githubUpdateState;
    var selectedLabel = state.file ? esc(state.file.name)+' · '+Math.round((state.file.size || 0) / 1024)+' KB' : 'ZIP hier ablegen oder auswählen';
    var checks = githubCheckSummary();
    var statusLine = state.message ? '<div class="change-github-status '+esc(state.status || 'empty')+'">'+esc(state.message || '')+'</div>' : '';
    return '<div class="change-github-update">'
      + '<label class="change-github-secret"><span>Freigabe-Code</span><input type="text" id="github-update-secret" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Freigabe-Code eingeben" value="'+esc(readGithubUpdateSecret())+'"></label>'
      + '<div class="change-github-upload-panel">'
      + '<div class="change-github-upload-title"><span>ZIP Update</span></div>'
      + '<label class="change-github-dropzone" id="github-zip-dropzone"><input type="file" id="github-zip-input" accept=".zip,application/zip,application/x-zip-compressed"><span>'+selectedLabel+'</span><small>ZIP per Drag & Drop hier ablegen oder antippen.</small></label>'
      + statusLine
      + (checks || '')
      + githubFileOverview()
      + githubActionStatusPanel()
      + '<button class="btn btn-primary btn-full" id="github-zip-commit" type="button" '+(state.status === 'ok' ? '' : 'disabled')+'>Direkt auf GitHub übertragen</button>'
      + '</div>'
      + '</div>';
  }
  function githubUpdateCard(){
    var status = githubUpdateState.status === 'ok' ? 'BEREIT' : (githubUpdateState.status === 'error' ? 'FEHLER' : 'LOKAL');
    var tone = githubUpdateState.status === 'ok' ? 'ok' : (githubUpdateState.status === 'error' ? 'error' : 'off');
    return settingsFeatureCard(githubIcon(), 'GitHub', status, tone, '', '', githubUpdateBody());
  }

  async function commitGithubZip(){
    var state = githubUpdateState;
    if(!state.file || state.status !== 'ok'){
      if(typeof window.toast === 'function') window.toast('Bitte ZIP zuerst erfolgreich prüfen', 'err');
      return;
    }
    var secretInput = $('github-update-secret');
    var secret = secretInput ? String(secretInput.value || '').trim() : readGithubUpdateSecret();
    if(!secret){
      state.status = 'error';
      state.message = 'Bitte den Cloudflare Freigabe-Code eintragen.';
      if(typeof window.toast === 'function') window.toast('Freigabe-Code fehlt', 'err');
      refreshSameTab('github');
      return;
    }
    writeGithubUpdateSecret(secret);
    state.status = 'checking';
    state.message = 'ZIP wird an den geschützten Worker übertragen…';
    refreshSameTab('github');
    try{
      var buffer = await state.file.arrayBuffer();
      var payload = {
        secret: secret,
        fileName: state.file.name || ('change-update-'+Date.now()+'.zip'),
        contentBase64: arrayBufferToBase64(buffer),
        fromVersion: state.fromVersion || APP_VERSION,
        targetVersion: state.toVersion || '',
        fileSize: state.file.size || buffer.byteLength || 0
      };
      var response = await fetch(GITHUB_UPDATE_WORKER_URL + '/upload', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      var result = null;
      try{ result = await response.json(); }catch(parseErr){}
      if(!response.ok || !result || !result.ok){
        throw new Error((result && result.message) || ('Worker Fehler '+response.status));
      }
      state.status = 'ok';
      state.message = 'ZIP wurde übertragen. GitHub Action wird geprüft…';
      state.uploadCommitSha = result.commitSha || '';
      state.actionRunUrl = result.actionsUrl || '';
      state.actionStatus = 'queued';
      state.actionConclusion = '';
      state.actionMessage = 'GitHub Action wird gesucht…';
      state.actionCheckedAt = '';
      state.actionStartedAt = Date.now();
      state.branchCommitSha = '';
      state.branchVersion = '';
      state.targetCommitted = false;
      state.liveVersion = '';
      state.liveReady = false;
      state.lastRunId = '';
      state.updateReady = false;
      if(typeof window.toast === 'function') window.toast('Update an GitHub übertragen', 'ok');
      scheduleGithubActionPoll(2500);
    }catch(e){
      state.status = 'error';
      state.message = e && e.message ? e.message : 'Übertragung fehlgeschlagen.';
      if(typeof window.toast === 'function') window.toast('GitHub Übertragung fehlgeschlagen', 'err');
    }
    refreshSameTab('github');
  }

  async function fetchGithubRepoFiles(){
    try{
      var response = await fetch(GITHUB_UPDATE_WORKER_URL + '/files', {cache:'no-store'});
      if(!response.ok) throw new Error('Worker Dateien '+response.status);
      var data = await response.json();
      if(!data || !data.ok || !Array.isArray(data.files)) throw new Error((data && data.message) || 'GitHub-Dateiliste nicht verfügbar');
      return data.files.map(function(file){ return String(file || '').replace(/\\/g, '/'); }).filter(Boolean).sort();
    }catch(e){
      return [];
    }
  }

  async function analyzeGithubZip(){
    var state = githubUpdateState;
    if(!state.file){ state.message = 'Bitte zuerst eine ZIP auswählen.'; state.status = 'error'; refreshSameTab('github'); return; }
    state.status = 'checking';
    state.message = 'ZIP wird geprüft…';
    refreshSameTab('github');
    try{
      var buffer = await state.file.arrayBuffer();
      var zip = parseZipDirectory(buffer);
      var entries = zip.entries.filter(function(entry){ return !entry.isDirectory; });
      var paths = entries.map(function(entry){ return entry.path; }).filter(Boolean).sort();
      var byPath = {};
      entries.forEach(function(entry){ byPath[entry.path] = entry; });
      var duplicates = [];
      var seen = {};
      paths.forEach(function(path){ if(seen[path]) duplicates.push(path); seen[path] = true; });
      var allowedRootFiles = {'CHANGELOG.md':1,'CLAUDE.md':1,'app.js':1,'change-pre.js':1,'change-post.js':1,'change.css':1,'firebase-messaging-sw.js':1,'firebase.json':1,'index.html':1,'manifest.json':1};
      var allowedRootDirs = {'core':1,'features':1,'firebase':1,'icons':1,'styles':1,'public':1,'components':1,'.github':1,'scripts':1,'updates':1};
      var badRoot = paths.filter(function(path){
        var first = path.split('/')[0];
        if(path.indexOf('/') < 0) return !allowedRootFiles[first];
        return !allowedRootDirs[first];
      });
      var textTargets = ['CLAUDE.md','CHANGELOG.md','features/settings/settingsPanel.js','features/pollen/pollenView.js'];
      var texts = {};
      for(var i=0;i<textTargets.length;i++){
        var target = textTargets[i];
        if(byPath[target]) texts[target] = await readZipText(zip, byPath[target]);
      }
      var versions = [];
      Object.keys(texts).forEach(function(key){ versions = versions.concat(collectVersions(texts[key])); });
      var nextVersion = maxVersion(versions);
      var claudeText = texts['CLAUDE.md'] || '';
      var changelogText = texts['CHANGELOG.md'] || '';
      var versionHigher = nextVersion && compareVersions(nextVersion, APP_VERSION) > 0;
      var claudeUpdated = !!(nextVersion && claudeText.indexOf('## Version '+nextVersion) >= 0 && claudeText.indexOf(nextVersion) >= 0);
      var changelogUpdated = !!(nextVersion && changelogText.indexOf(nextVersion) >= 0);
      var githubFiles = await fetchGithubRepoFiles();
      var githubSet = {};
      githubFiles.forEach(function(path){ githubSet[path] = true; });
      var newFiles = paths.filter(function(path){ return !githubSet[path]; });
      var fileDetail = githubFiles.length
        ? 'GitHub aktuell: '+githubFiles.length+' · ZIP: '+paths.length+' · Neu: '+newFiles.length
        : 'ZIP: '+paths.length+' · GitHub aktuell nicht gelesen';
      var checks = [
        {ok: !!versionHigher, label:'Version erhöht', detail: nextVersion ? APP_VERSION+' → '+nextVersion : 'Keine Zielversion erkannt.'},
        {ok: claudeUpdated, label:'CLAUDE.md aktualisiert', detail: claudeUpdated ? 'Eintrag zur Zielversion gefunden.' : 'Kein passender Versionseintrag gefunden.'},
        {ok: changelogUpdated, label:'CHANGELOG.md aktualisiert', detail: changelogUpdated ? 'Eintrag zur Zielversion gefunden.' : 'Kein passender Versionseintrag gefunden.'},
        {ok: duplicates.length === 0, label:'Keine doppelten Dateien', detail: duplicates.length ? duplicates.slice(0,3).join(', ') : 'Pfade sind eindeutig.'},
        {ok: badRoot.length === 0, label:'Keine unerwünschten Root-Dateien', detail: badRoot.length ? badRoot.slice(0,3).join(', ') : 'Root-Struktur ist sauber.'},
        {ok: paths.length > 0, key:'files', label:'Anzahl der Dateien', detail: fileDetail}
      ];
      var ok = checks.every(function(check){ return check.ok; });
      state.files = paths;
      state.githubFiles = githubFiles;
      state.newFiles = newFiles;
      state.rootFiles = badRoot;
      state.toVersion = nextVersion || '';
      state.checks = checks;
      state.status = ok ? 'ok' : 'error';
      state.message = ok ? 'ZIP geprüft und bereit.' : 'ZIP braucht noch Korrekturen.';
    }catch(e){
      state.status = 'error';
      state.message = e && e.message ? e.message : 'ZIP konnte nicht geprüft werden.';
      state.checks = [{ok:false,label:'ZIP-Prüfung fehlgeschlagen',detail:state.message}];
    }
    refreshSameTab('github');
  }

  function healthSummaryPill(){
    try{
      if(window.ChangeAppStatus && window.ChangeAppStatus.getHealthScore){
        var score = window.ChangeAppStatus.getHealthScore();
        var ok = parseInt(score.ok,10) || 0;
        var total = parseInt(score.total,10) || 0;
        var tone = score.tone === 'ok' ? 'ok' : (score.tone === 'error' ? 'error' : 'off');
        var label = (tone === 'ok' ? 'Gesund' : 'Prüfen') + ' · ' + ok + '/' + total;
        return '<div class="change-health-pill is-static '+tone+'"><span>♡</span><strong>'+esc(label)+'</strong></div>';
      }
    }catch(e){}
    return '<div class="change-health-pill is-static off"><span>♡</span><strong>Status offen</strong></div>';
  }

  function settingsHeroStatusRows(google){
    var googleLoggedIn = !!(google && google.loggedIn);
    var healthTone = 'off';
    var healthValue = 'Status offen';
    try{
      if(window.ChangeAppStatus && window.ChangeAppStatus.getHealthScore){
        var score = window.ChangeAppStatus.getHealthScore();
        var ok = parseInt(score.ok,10) || 0;
        var total = parseInt(score.total,10) || 0;
        healthTone = score.tone === 'ok' ? 'ok' : (score.tone === 'error' ? 'error' : 'off');
        healthValue = (healthTone === 'ok' ? 'Gesund' : 'Prüfen') + ' · ' + ok + '/' + total;
      }
    }catch(e){}
    return ''
      + '<div class="change-settings-profile-stat is-google '+(googleLoggedIn ? 'ok' : 'off')+'">'
      + '<span class="change-settings-profile-stat-icon">G</span>'
      + '<strong>Google</strong>'
      + '<em>'+(googleLoggedIn ? 'Angemeldet' : 'Nicht angemeldet')+'</em>'
      + '</div>'
      + '<div class="change-settings-profile-stat is-health '+healthTone+'">'
      + '<span class="change-settings-profile-stat-icon">♡</span>'
      + '<strong>Gesundheitscheck</strong>'
      + '<em>'+esc(healthValue)+'</em>'
      + '</div>'
      + '<div class="change-settings-profile-stat is-version ok">'
      + '<span class="change-settings-profile-stat-icon">#</span>'
      + '<strong>Version</strong>'
      + '<em>'+esc(APP_VERSION)+'</em>'
      + '</div>';
  }

  function appPane(){
    var installed = installedLabel();
    var installCard = settingsFeatureCard(
      '📱',
      'Change als App installieren',
      installed,
      installed === 'Installiert' ? 'ok' : 'off',
      'Für Handy-Nutzung, Push und Startbildschirm.',
      '',
      '<button class="btn btn-secondary btn-full" onclick="window.installChangeApp&&window.installChangeApp()">Change als App installieren</button>'
    );
    var versionCard = '<div class="change-settings-feature-card change-version-simple-card">'
      + '<div class="change-version-simple-head"><div><div class="change-version-simple-label">Version</div><div class="change-version-simple-title">Change</div><div class="change-version-simple-sub">Kalender, Challenges und Sync</div></div><strong>'+esc(APP_VERSION)+'</strong></div>'
      + '<div class="change-version-simple-meta"><span>Installationsstatus</span><strong>'+esc(installed)+'</strong></div>'
      + '</div>';
    var theme = appThemePreference();
    var themeLabel = theme === 'system' ? 'SYSTEM' : (theme === 'light' ? 'HELL' : 'DUNKEL');
    var themeBody = '<div class="change-theme-options">'
      + themeOptionButton('system','System','Folgt deinem Gerät', theme)
      + themeOptionButton('light','Hell','Ruhiger heller Look', theme)
      + themeOptionButton('dark','Dunkel','Aktueller Darkmode', theme)
      + '</div>'
      + '<div class="change-feature-note">Aktuell aktiv: '+esc(appThemeResolved()==='dark'?'Dunkel':'Hell')+'. Diese Einstellung gilt global für die App. Pollen unterstützt bereits Hell und Dunkel.</div>';
    var themeCard = settingsFeatureCard('◐','Darstellung',themeLabel,theme === 'dark' ? 'ok' : (theme === 'light' ? 'ok' : 'off'),'Steuert Hellmodus, Dunkelmodus oder die Systemeinstellung.','',themeBody);
    var health = '';
    if(window.ChangeAppStatus && window.ChangeAppStatus.healthHtml){
      var healthBody = appHealthExpanded
        ? window.ChangeAppStatus.healthHtml() + '<button class="btn btn-secondary btn-full" id="run-app-health" type="button">Erneut prüfen</button>'
        : '<div class="change-feature-note">Der Check wird erst angezeigt, wenn du ihn bewusst startest.</div><button class="btn btn-secondary btn-full" id="run-app-health" type="button">App-Gesundheitscheck prüfen</button>';
      health = settingsFeatureCard('🩺', 'App-Gesundheitscheck', appHealthExpanded ? 'GEPRÜFT' : 'BEREIT', appHealthExpanded ? 'ok' : 'off', 'Prüft Login, Cache, Sync und blockierende Overlays.', '', healthBody);
    }
    return '<div class="change-settings-stack">' + installCard + themeCard + versionCard + health + '</div>';
  }
  function githubPane(){
    return '<div class="change-settings-stack">' + githubUpdateCard() + '</div>';
  }

  var currentSettingsTab = 'dashboard';
  var appHealthExpanded = false;
  var settingsScrollState = null;
  function settingsScrollSelectors(){
    return ['.change-settings-premium', '.change-settings-nav-grid', '.change-settings-detail-card', '.change-settings-tabs'];
  }
  function captureSettingsScrollState(){
    var state = {windowY:0, viewTop:0, containers:{}};
    try{ state.windowY = window.scrollY || 0; }catch(e){}
    try{
      var view = document.getElementById('settings-view');
      if(view) state.viewTop = view.scrollTop || 0;
      settingsScrollSelectors().forEach(function(selector){
        var el = document.querySelector('#settings-view ' + selector);
        if(el) state.containers[selector] = {left:el.scrollLeft || 0, top:el.scrollTop || 0};
      });
    }catch(e){}
    settingsScrollState = state;
    return state;
  }
  function restoreSettingsScrollState(state){
    state = state || settingsScrollState;
    if(!state) return;
    var apply = function(){
      try{
        var view = document.getElementById('settings-view');
        if(view) view.scrollTop = state.viewTop || 0;
        Object.keys(state.containers || {}).forEach(function(selector){
          var el = document.querySelector('#settings-view ' + selector);
          var value = state.containers[selector];
          if(el && value){ el.scrollLeft = value.left || 0; el.scrollTop = value.top || 0; }
        });
      }catch(e){}
      try{ if((window.scrollY || 0) !== (state.windowY || 0)) window.scrollTo(window.scrollX || 0, state.windowY || 0); }catch(e){}
    };
    requestAnimationFrame(function(){ apply(); requestAnimationFrame(apply); });
  }
  function tabButton(id, label, active){ return '<button class="change-settings-tab '+(active===id?'active':'')+'" type="button" data-settings-tab="'+id+'">'+label+'</button>'; }
  function settingsNavCard(id, icon, title, sub, active){
    return '<button class="change-settings-nav-card '+(active===id?'active':'')+'" type="button" data-settings-tab="'+id+'">'
      + '<span class="change-settings-nav-icon">'+iconMarkup(icon)+'</span>'
      + '<span class="change-settings-nav-copy"><strong>'+esc(title)+'</strong><small>'+esc(sub)+'</small></span>'
      + '<span class="change-settings-nav-arrow">›</span>'
      + '</button>';
  }
  function ensurePremiumSettingsCloseBridge(){
    if(window.__changeSettingsCloseBridge) return;
    var original = window.closePanel;
    if(typeof original === 'function'){
      window.closePanel = function(){
        try{ document.body && document.body.classList.remove('change-settings-premium-open'); }catch(e){}
        return original.apply(this, arguments);
      };
      window.__changeSettingsCloseBridge = true;
    }
  }
  function ensureSettingsView(){
    var view = document.getElementById('settings-view');
    if(view) return view;
    var content = document.getElementById('content');
    if(!content) return null;
    view = document.createElement('div');
    view.id = 'settings-view';
    view.style.display = 'none';
    view.style.flex = '1';
    view.style.minHeight = '0';
    view.style.overflow = 'hidden';
    view.style.flexDirection = 'column';
    content.appendChild(view);
    return view;
  }
  function activateSettingsView(html){
    var view = ensureSettingsView();
    if(!view) return false;
    try{ if(typeof window.closePanel === 'function') window.closePanel(); }catch(e){}
    ['dashboard-view','cal-body','challenges-view','pollen-view'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.style.display = 'none';
    });
    var cal = document.getElementById('cal-controls'); if(cal) cal.style.display = 'none';
    var fab = document.getElementById('fab'); if(fab) fab.style.display = 'none';
    view.innerHTML = html;
    view.style.display = 'flex';
    try{
      if(document.body){
        document.body.classList.remove('change-view-dashboard','change-view-calendar','change-view-challenges','change-view-pollen');
        document.body.classList.add('change-view-settings','change-settings-premium-open');
      }
    }catch(e){}
    try{ if(typeof window.enforceDesktopContentVisibility === 'function') window.enforceDesktopContentVisibility('settings'); }catch(e){}
    try{
      var isDesktopSettings = window.matchMedia && window.matchMedia('(min-width:701px)').matches && !(document.body && document.body.classList.contains('change-mobile'));
      var content = document.getElementById('content');
      if(content){
        content.style.setProperty('display','block','important');
        content.style.setProperty('visibility','visible','important');
        content.style.setProperty('opacity','1','important');
        if(isDesktopSettings){
          content.style.setProperty('grid-column','2','important');
          content.style.setProperty('height','100vh','important');
        }else{
          content.style.removeProperty('grid-column');
          content.style.removeProperty('height');
          content.style.removeProperty('overflow');
        }
      }
      view.style.setProperty('display','block','important');
      view.style.setProperty('visibility','visible','important');
      view.style.setProperty('opacity','1','important');
    }catch(e){}
    try{ document.querySelectorAll('.h-tab,.bnav-item').forEach(function(item){ item.classList.remove('active'); }); }catch(e){}
    return true;
  }
  function resetSettingsWorkspaceShell(){
    try{
      var main = document.getElementById('main-app');
      if(main){ ['display','grid-template-columns','grid-template-rows','width','height','overflow','flex-direction'].forEach(function(prop){ main.style.removeProperty(prop); }); }
      var content = document.getElementById('content');
      if(content){ ['display','visibility','opacity','grid-column','grid-row','width','height','min-height','overflow','overflow-y','overflow-x','position','z-index'].forEach(function(prop){ content.style.removeProperty(prop); }); }
      var view = document.getElementById('settings-view');
      if(view){ ['display','visibility','opacity','width','height','min-height','overflow','overflow-y','overflow-x'].forEach(function(prop){ view.style.removeProperty(prop); }); }
      if(document.body){ document.body.classList.remove('change-view-settings','change-settings-premium-open'); }
    }catch(e){}
  }
  function hideSettingsWorkspace(){
    try{
      var view = document.getElementById('settings-view');
      if(view){ view.style.display = 'none'; view.innerHTML = ''; }
      resetSettingsWorkspaceShell();
    }catch(e){}
  }
  function installSettingsRouteGuard(){
    if(window.__changeSettingsWorkspaceRouteGuard) return;
    var original = window.setMainView;
    if(typeof original === 'function'){
      window.setMainView = function(view){
        if(view !== 'settings') hideSettingsWorkspace();
        return original.apply(this, arguments);
      };
      window.__changeSettingsWorkspaceRouteGuard = true;
    }
  }
  function openSettingsPanel(startTab){
    startTab = ['dashboard','calendar','challenges','sync','app','github'].indexOf(startTab) >= 0 ? startTab : (currentSettingsTab || 'dashboard');
    currentSettingsTab = startTab;
    var scrollBeforeRender = captureSettingsScrollState();
    ensurePremiumSettingsCloseBridge();
    installSettingsRouteGuard();
    try{ document.body && document.body.classList.add('change-settings-premium-open'); }catch(e){}
    var profile = window.userInfo || {};
    var name = profile.name || profile.email || 'Change';
    var first = String(name || 'Change').split(' ')[0] || 'Change';
    var picture = profile.picture ? '<img src="'+esc(profile.picture)+'" alt="">' : '<span>'+esc(String(first).slice(0,1).toUpperCase())+'</span>';
    var google = googleStatus();
    var weather = weatherHealthStatus();
    var calendarSummary = calendarOptions().showHolidays ? 'Woche · Feiertage an' : 'Woche · Feiertage aus';
    var dashboardModules = dashboardModuleCount();
    var nav = settingsNavCard('dashboard','▦','Dashboard',dashboardModules+' Module aktiv',startTab)
      + settingsNavCard('calendar','□','Kalender',calendarSummary,startTab)
      + settingsNavCard('challenges','🏆','Challenges',String(getAutoChallengeCount())+' Tagesaufgaben',startTab)
      + settingsNavCard('sync','↻','Daten & Sync','Manuell · keine Auto-Starts',startTab)
      + settingsNavCard('app','🛡','App & Sicherheit','Darstellung · Version '+APP_VERSION,startTab)
      + settingsNavCard('github',githubIcon(),'GitHub','',startTab);
    var html = '<div class="change-settings-premium">'
      + '<div class="change-settings-page-head"><div class="change-settings-page-title"><span>⚙︎</span><strong>Einstellungen</strong></div></div>'
      + '<section class="change-settings-profile-card">'
      + '<div class="change-settings-profile-left"><div class="change-settings-profile-avatar">'+picture+'<i></i></div><div class="change-settings-profile-copy"><div class="change-settings-profile-name">'+esc(name)+'</div></div></div>'
      + '<div class="change-settings-profile-right">'+settingsHeroStatusRows(google)+'</div>'
      + '</section>'
      + '<div class="change-settings-workspace">'
      + '<div class="change-settings-nav-grid">'
      + nav
      + '</div>'
      + '<div class="change-settings-detail-card">'
      + '<div class="change-settings-detail-head"><div><div class="change-settings-detail-title">'+(startTab==='dashboard'?'Dashboard':startTab==='calendar'?'Kalender':startTab==='challenges'?'Challenges':startTab==='sync'?'Daten & Sync':startTab==='github'?'GitHub':'App & Sicherheit')+'</div></div></div>'
      + '<div class="change-settings-pane '+(startTab==='dashboard'?'active':'')+'" data-pane="dashboard">'+dashboardPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='calendar'?'active':'')+'" data-pane="calendar">'+calendarPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='challenges'?'active':'')+'" data-pane="challenges">'+challengesPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='sync'?'active':'')+'" data-pane="sync">'+syncPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='app'?'active':'')+'" data-pane="app">'+appPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='github'?'active':'')+'" data-pane="github">'+githubPane()+'</div>'
      + '</div></div></div>';
    activateSettingsView(html);
    restoreSettingsScrollState(scrollBeforeRender);
    setTimeout(bindSettings, 30);
  }
  function refreshSameTab(tab){
    if(tab && ['dashboard','calendar','challenges','sync','app','github'].indexOf(tab) >= 0) currentSettingsTab = tab;
    var active = document.querySelector('.change-settings-tab.active');
    var next = active ? active.getAttribute('data-settings-tab') : currentSettingsTab;
    openSettingsPanel(next || 'dashboard');
  }
  function bindSettingsTabScroller(){
    var scroller = document.querySelector('[data-settings-tabs-scroll]');
    if(!scroller) return;
    var scrollTabs = function(direction){
      var amount = Math.max(128, Math.round(scroller.clientWidth * 0.7));
      try{
        scroller.scrollBy({left: direction * amount, behavior: 'smooth'});
      }catch(e){
        scroller.scrollLeft += direction * amount;
      }
    };
    var left = document.querySelector('[data-settings-tab-left]');
    var right = document.querySelector('[data-settings-tab-right]');
    if(left) left.addEventListener('click', function(){ scrollTabs(-1); });
    if(right) right.addEventListener('click', function(){ scrollTabs(1); });
    /* Kein automatisches Zentrieren der aktiven Auswahl: Auf Mobil darf die horizontale
       Scrollposition nach einem Klick nicht an den Anfang oder zur Mitte springen. */
  }
  function bindSettings(){
    bindSettingsTabScroller();
    document.querySelectorAll('[data-settings-tab]').forEach(function(btn){
      btn.addEventListener('click', function(ev){ if(ev) ev.preventDefault(); currentSettingsTab = btn.getAttribute('data-settings-tab') || currentSettingsTab; openSettingsPanel(currentSettingsTab); });
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
    var birthdays = $('set-birthdays'); if(birthdays) birthdays.addEventListener('change', function(){ if(window.setBirthdaysEnabled) window.setBirthdaysEnabled(birthdays.checked); else writeBool('change_v1_birthdays_enabled', birthdays.checked); try{ if(typeof window.saveChangeSettings === 'function' && readDatabaseSyncEnabled()) window.saveChangeSettings(true); }catch(e){} try{ if(window.buildDashboard) window.buildDashboard(); }catch(e){} refreshSameTab(); });
    var birthdayDays = $('set-birthday-notification-days'); if(birthdayDays) birthdayDays.addEventListener('change', function(){ var value = Math.max(0, Math.min(365, parseInt(birthdayDays.value,10) || 0)); birthdayDays.value = String(value); if(window.setBirthdayNotificationDays) window.setBirthdayNotificationDays(value); else { try{ localStorage.setItem('change_v1_birthday_notification_days', String(value)); localStorage.setItem('birthday_notification_days', String(value)); }catch(e){} } try{ if(typeof window.saveChangeSettings === 'function' && readDatabaseSyncEnabled()) window.saveChangeSettings(true); }catch(e){} try{ if(typeof window.checkNotifications === 'function') window.checkNotifications(); }catch(e){} try{ if(window.ChangeNotificationBell && typeof window.ChangeNotificationBell.render === 'function') window.ChangeNotificationBell.render(); }catch(e){} });
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
    var dbSync = $('set-database-sync'); if(dbSync) dbSync.addEventListener('change', async function(){ if(window.setDatabaseSyncEnabled) await window.setDatabaseSyncEnabled(dbSync.checked); else if(window.setLiveSyncEnabled) await window.setLiveSyncEnabled(dbSync.checked); else writeBoolMulti(['change_v1_database_sync_enabled','database_sync_enabled','change_v1_live_sync_enabled','live_sync_enabled'], dbSync.checked); refreshSameTab('sync'); });
    var dbSyncNow = $('set-database-sync-now'); if(dbSyncNow) dbSyncNow.addEventListener('click', async function(){ if(window.ChangeFirebaseSyncController && window.ChangeFirebaseSyncController.enable) await window.ChangeFirebaseSyncController.enable(); else if(window.setDatabaseSyncEnabled) await window.setDatabaseSyncEnabled(true); refreshSameTab('sync'); });
    var auto = $('set-auto'); if(auto) auto.addEventListener('change', function(){
      setAutoChallengesState(!!auto.checked);
      refreshSameTab('challenges');
    });
    var autoCount = $('set-auto-count'); if(autoCount) autoCount.addEventListener('change', function(){
      setAutoChallengeCount(autoCount.value);
      refreshSameTab('challenges');
    });
    var diff = $('set-challenge-difficulty'); if(diff) diff.addEventListener('change', function(){
      setChallengeDifficulty(diff.value);
      refreshSameTab('challenges');
    });
    var google = $('set-google'); if(google) google.addEventListener('change', async function(){ if(window.ChangeGoogleSyncStatus){ if(google.checked) await window.ChangeGoogleSyncStatus.syncNow(); else window.ChangeGoogleSyncStatus.disconnect(); } refreshSameTab(); });
    var syncGoogle = $('set-sync-google'); if(syncGoogle) syncGoogle.addEventListener('click', async function(){ if(window.ChangeGoogleSyncStatus) await window.ChangeGoogleSyncStatus.syncNow(); refreshSameTab(); });
    var clearSyncLog = $('clear-sync-log'); if(clearSyncLog) clearSyncLog.addEventListener('click', function(){ try{ localStorage.removeItem('change_v1_sync_log'); }catch(e){} refreshSameTab('sync'); });
    document.querySelectorAll('[data-change-theme]').forEach(function(btn){ btn.addEventListener('click', function(){ setAppTheme(btn.getAttribute('data-change-theme') || 'system'); refreshSameTab('app'); }); });
    var runHealth = $('run-app-health'); if(runHealth) runHealth.addEventListener('click', function(){ appHealthExpanded = true; refreshSameTab('app'); });
    function setGithubZipFile(file){
      githubUpdateState.file = file || null;
      githubUpdateState.status = githubUpdateState.file ? 'selected' : 'empty';
      githubUpdateState.message = githubUpdateState.file ? '' : '';
      githubUpdateState.files = [];
      githubUpdateState.checks = [];
      githubUpdateState.toVersion = '';
      githubUpdateState.uploadCommitSha = '';
      githubUpdateState.actionRunUrl = '';
      githubUpdateState.actionStatus = '';
      githubUpdateState.actionConclusion = '';
      githubUpdateState.actionMessage = '';
      githubUpdateState.actionCheckedAt = '';
      githubUpdateState.actionStartedAt = 0;
      githubUpdateState.branchCommitSha = '';
      githubUpdateState.branchVersion = '';
      githubUpdateState.targetCommitted = false;
      githubUpdateState.liveVersion = '';
      githubUpdateState.liveReady = false;
      githubUpdateState.lastRunId = '';
      githubUpdateState.updateReady = false;
      stopGithubActionPolling();
      if(githubUpdateState.file) analyzeGithubZip();
      else refreshSameTab('github');
    }
    var githubZipInput = $('github-zip-input');
    if(githubZipInput) githubZipInput.addEventListener('change', function(){ setGithubZipFile(githubZipInput.files && githubZipInput.files[0] ? githubZipInput.files[0] : null); });
    var githubDropzone = $('github-zip-dropzone');
    if(githubDropzone){
      ['dragenter','dragover'].forEach(function(name){
        githubDropzone.addEventListener(name, function(event){ event.preventDefault(); event.stopPropagation(); githubDropzone.classList.add('is-dragging'); });
      });
      ['dragleave','drop'].forEach(function(name){
        githubDropzone.addEventListener(name, function(event){ event.preventDefault(); event.stopPropagation(); githubDropzone.classList.remove('is-dragging'); });
      });
      githubDropzone.addEventListener('drop', function(event){
        var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0] ? event.dataTransfer.files[0] : null;
        if(file && !/\.zip$/i.test(file.name || '')){
          githubUpdateState.status = 'error';
          githubUpdateState.message = 'Bitte eine ZIP-Datei auswählen.';
          refreshSameTab('github');
          return;
        }
        setGithubZipFile(file);
      });
    }
    var githubFilesToggle = $('github-files-toggle');
    if(githubFilesToggle) githubFilesToggle.addEventListener('click', function(event){
      event.preventDefault();
      event.stopPropagation();
      githubUpdateState.fileListOpen = !githubUpdateState.fileListOpen;
      refreshSameTab('github');
    });
    var githubZipCommit = $('github-zip-commit'); if(githubZipCommit) githubZipCommit.addEventListener('click', function(){ commitGithubZip(); });
    var githubUpdateReload = $('github-update-reload'); if(githubUpdateReload) githubUpdateReload.addEventListener('click', function(){ reloadChangeUpdateVersion(); });
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
      'database_sync_enabled', 'change_v1_database_sync_enabled',
      'live_sync_enabled', 'change_v1_live_sync_enabled',
      'auto_challenges_enabled', 'change_v1_auto_challenges_enabled',
      'auto_challenge_count', 'change_v1_auto_challenge_count',
      'challenge_difficulty', 'change_v1_challenge_difficulty',
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
  window.hideSettingsWorkspace = hideSettingsWorkspace;
  window.resetSettingsWorkspaceShell = resetSettingsWorkspaceShell;
  window.openCalendarSettings = function(){ return openSettingsPanel('calendar'); };
  window.openPushSettingsPanel = function(){ return openSettingsPanel('sync'); };


  // connectToGoogle: sicherer Google-TokenClient ohne Firebase-Redirect.
  // Wichtig: kein signInWithRedirect, kein versteckter Datenbank-Sync-Start.
  window.connectToGoogle = function(){
    var clientId = (typeof getGoogleClientId === 'function') ? getGoogleClientId() : '';
    if(!clientId){
      try{ clientId = JSON.parse(localStorage.getItem('change_v1_client_id') || '""') || localStorage.getItem('client_id') || ''; }catch(e){}
    }
    if(!clientId){
      if(typeof toast === 'function') toast('Keine Google Client-ID – bitte in Einstellungen konfigurieren', 'err');
      return;
    }
    if(!window.google || !google.accounts || !google.accounts.oauth2){
      if(typeof toast === 'function') toast('Google-Bibliothek wird geladen…', '');
      return;
    }
    try{
      var scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
      var tc = google.accounts.oauth2.initTokenClient({
        client_id: (typeof cleanGoogleClientId === 'function') ? cleanGoogleClientId(clientId) : String(clientId).trim(),
        scope: scope,
        callback: async function(resp){
          if(resp && resp.error){ if(typeof toast === 'function') toast('Google-Verbindung fehlgeschlagen: '+resp.error, 'err'); return; }
          if(!resp || !resp.access_token){ if(typeof toast === 'function') toast('Google-Verbindung wurde nicht abgeschlossen', 'err'); return; }
          try{ window.accessToken = resp.access_token; }catch(e){}
          try{ if(typeof accessToken !== 'undefined') accessToken = resp.access_token; }catch(e){}
          try{ if(typeof SecureTokenStore !== 'undefined') SecureTokenStore.setToken(resp.access_token, 3600); }catch(e){}
          try{ localStorage.setItem('change_v1_google_calendar_sync', 'true'); localStorage.setItem('change_google_sync_enabled', 'true'); }catch(e){}
          try{ if(window.ChangeGoogleSyncStatus && window.ChangeGoogleSyncStatus.syncNow) await window.ChangeGoogleSyncStatus.syncNow(); }catch(e){}
          try{ if(typeof loadGoogleData === 'function') await loadGoogleData(); }catch(e){}
          if(typeof toast === 'function') toast('Google Kalender verbunden ✓', 'ok');
          try{ if(typeof openSettingsPanel === 'function') openSettingsPanel('sync'); }catch(e){}
        }
      });
      tc.requestAccessToken({prompt:'consent'});
    }catch(e){
      console.warn('[Change] connectToGoogle:', e);
      if(typeof toast === 'function') toast('Google-Verbindung konnte nicht gestartet werden', 'err');
    }
  };
})();
