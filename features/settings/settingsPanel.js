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
      + '<div class="change-feature-left"><div class="change-feature-icon">'+esc(icon)+'</div><div>'
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
  var APP_VERSION = '0.1.0050';

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

  var currentSettingsTab = 'dashboard';
  var appHealthExpanded = false;
  function tabButton(id, label, active){ return '<button class="change-settings-tab '+(active===id?'active':'')+'" type="button" data-settings-tab="'+id+'">'+label+'</button>'; }
  function openSettingsPanel(startTab){
    startTab = ['dashboard','calendar','challenges','sync','app'].indexOf(startTab) >= 0 ? startTab : (currentSettingsTab || 'dashboard');
    currentSettingsTab = startTab;
    var html = '<div class="change-settings-tab-shell">'
      + '<button class="change-settings-tab-scroll" type="button" aria-label="Tabs nach links scrollen" data-settings-tab-left>‹</button>'
      + '<div class="change-settings-tabs" data-settings-tabs-scroll>'
      + tabButton('dashboard','▦ Dashboard', startTab)
      + tabButton('calendar','📅 Kalender', startTab)
      + tabButton('challenges','🏆 Challenges', startTab)
      + tabButton('sync','↻ Sync', startTab)
      + tabButton('app','⚙︎ App', startTab)
      + '</div>'
      + '<button class="change-settings-tab-scroll" type="button" aria-label="Tabs nach rechts scrollen" data-settings-tab-right>›</button>'
      + '</div>'
      + '<div class="change-settings-pane '+(startTab==='dashboard'?'active':'')+'" data-pane="dashboard">'+dashboardPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='calendar'?'active':'')+'" data-pane="calendar">'+calendarPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='challenges'?'active':'')+'" data-pane="challenges">'+challengesPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='sync'?'active':'')+'" data-pane="sync">'+syncPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='app'?'active':'')+'" data-pane="app">'+appPane()+'</div>';
    if(typeof window.openPanel === 'function') window.openPanel('Einstellungen', html);
    setTimeout(bindSettings, 30);
  }
  function refreshSameTab(tab){
    if(tab && ['dashboard','calendar','challenges','sync','app'].indexOf(tab) >= 0) currentSettingsTab = tab;
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
    var active = scroller.querySelector('.change-settings-tab.active');
    if(active && active.scrollIntoView){
      setTimeout(function(){
        try{ active.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'}); }catch(e){ active.scrollIntoView(false); }
      }, 0);
    }
  }
  function bindSettings(){
    bindSettingsTabScroller();
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
