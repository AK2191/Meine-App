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
  function settingsStore(){
    return window.ChangeSettingsStore || null;
  }
  function markSettingsSnapshotChanged(source){
    try{
      var store = settingsStore();
      if(store && typeof store.scheduleSnapshot === 'function') store.scheduleSnapshot({source:source || 'settings-panel'});
    }catch(e){}
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
    return featureField('Schwierigkeit der Auto-Challenges', '<select class="finput" id="'+id+'">'+options+'</select>', '');
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
    return featureField('Tagesumfang', '<select class="finput" id="'+id+'">'+options+'</select>', '');
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
  // ── Akzentfarbe ──────────────────────────────────────────────────────────
  var ACCENT_OPTIONS = [
    { value: 'green',  label: 'Grün',    dark: ['86efac','34d399'], light: ['2D6A4F','245C43'] },
    { value: 'blue',   label: 'Blau',    dark: ['7DA9F5','3B82F6'], light: ['2563EB','1D4ED8'] },
    { value: 'amber',  label: 'Amber',   dark: ['FCD34D','F59E0B'], light: ['D97706','B45309'] },
    { value: 'violet', label: 'Violett', dark: ['C4B5FD','A78BFA'], light: ['7C3AED','6D28D9'] },
    { value: 'red',    label: 'Rot',     dark: ['FCA5A5','EF4444'], light: ['DC2626','B91C1C'] }
  ];
  function appAccentPreference(){
    try{ var v = localStorage.getItem('change_v1_accent'); if(v) return v; }catch(e){}
    return 'green';
  }
  function setAppAccent(value){
    value = ACCENT_OPTIONS.some(function(o){ return o.value === value; }) ? value : 'green';
    try{ localStorage.setItem('change_v1_accent', value); }catch(e){}
    try{
      if(value === 'green'){ document.documentElement.removeAttribute('data-accent'); }
      else { document.documentElement.setAttribute('data-accent', value); }
    }catch(e){}
  }
  // Beim Start Akzent wiederherstellen
  (function(){ try{ var a = localStorage.getItem('change_v1_accent'); if(a && a !== 'green') document.documentElement.setAttribute('data-accent', a); }catch(e){} })();

  function themePreviewHtml(mode){
    if(mode === 'system'){
      return '<div class="cs-theme-preview-system">'
        + '<div class="half l"><div class="cs-theme-bar" style="width:55%;background:#10b981"></div><div class="cs-theme-bar sub-l" style="width:78%"></div></div>'
        + '<div class="half d"><div class="cs-theme-bar" style="width:55%"></div><div class="cs-theme-bar sub" style="width:78%"></div></div>'
        + '</div>';
    }
    var cls = mode === 'dark' ? 'dark' : 'light';
    var barSub = cls === 'light' ? 'sub-l' : 'sub';
    var accentBar = cls === 'light' ? 'background:#10b981;' : '';
    return '<div class="cs-theme-preview '+cls+'">'
      + '<div class="cs-theme-bar" style="width:55%;'+accentBar+'"></div>'
      + '<div class="cs-theme-bar '+barSub+'" style="width:78%"></div>'
      + '<div class="cs-theme-bar '+barSub+'" style="width:62%"></div>'
      + '</div>';
  }

  function themeOptionButton(value, title, subtitle, active){
    var isActive = active === value;
    var radioHtml = isActive
      ? '<span class="cs-theme-radio" style="background:#34d399;border-color:transparent;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#06140F" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg></span>'
      : '<span class="cs-theme-radio"></span>';
    return '<button type="button" class="cs-theme-option '+(isActive?'active':'')+'" data-change-theme="'+esc(value)+'">'  
      + themePreviewHtml(value)
      + '<div class="cs-theme-label"><span>'+esc(title)+'</span>'+radioHtml+'</div>'
      + '<div class="cs-theme-sub">'+esc(subtitle)+'</div>'
      + '</button>';
  }

  function accentOptionButton(opt, current){
    var isActive = current === opt.value;
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var colors = isDark ? opt.dark : opt.light;
    var c1 = colors[0], c2 = colors[1];
    var checkSvg = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#06140F" stroke-width="3.2"><polyline points="20 6 9 17 4 12"/></svg>';
    var dotHtml = isActive
      ? '<div class="cs-accent-dot" style="background:radial-gradient(circle at 32% 28%,#'+c1+',#'+c2+' 70%);box-shadow:0 6px 16px rgba(0,0,0,.32)">'+checkSvg+'</div>'
      : '<div class="cs-accent-dot" style="background:radial-gradient(circle at 32% 28%,#'+c1+',#'+c2+' 70%)"></div>';
    return '<button type="button" class="cs-accent-option'+(isActive?' active':'')+'" data-change-accent="'+esc(opt.value)+'">'  
      + dotHtml
      + '<span class="cs-accent-name">'+esc(opt.label)+'</span>'
      + '</button>';
  }

  function accentSectionHtml(){
    var current = appAccentPreference();
    var buttons = ACCENT_OPTIONS.map(function(o){ return accentOptionButton(o, current); }).join('');
    return '<div class="cs-accent-section" style="margin-top:16px;border-top:1px solid rgba(255,255,255,.07);padding-top:14px">'
      + '<div class="cs-secl" style="margin-bottom:10px">Akzentfarbe</div>'
      + '<div class="cs-accent-grid">'+buttons+'</div>'
      + '<div class="cs-accent-preview">'
      + '<div class="cs-accent-preview-bar"></div>'
      + '<div class="cs-accent-preview-icon"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5H20.5M8 3v4M16 3v4"/></svg></div>'
      + '<div style="flex:1;min-width:0"><div class="cs-accent-preview-title">Zahnarzt-Termin</div><div class="cs-accent-preview-sub">Morgen · 14:30</div></div>'
      + '<button class="cs-accent-preview-btn" type="button" tabindex="-1">Öffnen</button>'
      + '</div>'
      + '</div>';
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
    return '<div class="cs-feature-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><div class="cs-feature-row-title" style="font-size:13px;font-weight:800;color:#F2F5F1">'+title+'</div>'+(subtitle ? '<div class="cs-feature-row-sub" style="font-size:11.5px;color:#7E8A80;margin-top:3px">'+subtitle+'</div>' : '')+'</div>'+control+'</div>';
  }
  function featureField(label, inner, hint){
    return '<div class="cs-feature-field" style="display:grid;gap:7px"><label class="flabel">'+esc(label)+'</label>'+inner+(hint ? '<div class="cs-feature-row-sub" style="font-size:11.5px;color:#7E8A80;margin-top:3px">'+esc(hint)+'</div>' : '')+'</div>';
  }
  // ── Profil-Pane ───────────────────────────────────────────────────────────
  function profilPane(){
    var profile = window.userInfo || {};
    var name = profile.name || profile.email || 'Change';
    var first = String(name).slice(0,2).toUpperCase();
    var google = googleStatus();
    var googleBadge = google.loggedIn
      ? '<div class="cs-profile-badge"><div class="cs-profile-badge-dot"></div><span>Mit Google angemeldet</span></div>'
      : '<div class="cs-profile-badge" style="background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.2)"><div class="cs-profile-badge-dot" style="background:#f87171;box-shadow:0 0 0 3px rgba(248,113,113,.2)"></div><span style="color:#FCA5A5">Nicht angemeldet</span></div>';
    var avatarHtml = profile.picture
      ? '<img src="'+esc(profile.picture)+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:18px">'
      : '<span style="font-size:20px;font-weight:800;color:#06140F">'+esc(first)+'</span>';

    // Mitspieler
    var players = [];
    try{
      var ps = window.ChangeChallengePlayers && window.ChangeChallengePlayers.getAll ? window.ChangeChallengePlayers.getAll() : null;
      if(!ps) ps = JSON.parse(localStorage.getItem('change_v1_challenge_players') || localStorage.getItem('challenge_players') || '[]');
      players = Array.isArray(ps) ? ps : Object.values(ps || {});
    }catch(e){}

    var myEmail = String((window.userInfo && window.userInfo.email) || '').toLowerCase();
    var playerRows = '';
    players.forEach(function(p){
      var pName = esc(p.name || p.email || '?');
      var pEmail = esc(p.email || '');
      var isMe = myEmail && pEmail.toLowerCase() === myEmail;
      var initials = String(p.name || p.email || '?').slice(0,2).toUpperCase();
      var avatarStyle = isMe
        ? 'background:radial-gradient(circle at 32% 28%,#86efac,#10b981 75%);color:#06140F'
        : 'background:radial-gradient(circle at 32% 28%,#C4B5FD,#7C5CD6 75%);color:#fff';
      var pts = (p.points !== undefined ? p.points : (p.totalPoints !== undefined ? p.totalPoints : '')) + ' P';
      playerRows += '<div class="cs-player-row">'
        + '<div class="cs-player-avatar" style="'+avatarStyle+'">'+initials+'</div>'
        + '<div class="cs-player-copy">'
        + '<div class="cs-player-name">'+pName+(isMe ? '<span class="cs-player-you">DU</span>' : '')+'</div>'
        + '<div class="cs-player-email">'+pEmail+'</div>'
        + '</div>'
        + '<span class="cs-player-pts">'+esc(String(pts))+'</span>'
        + '</div>';
    });
    if(players.length > 1){
      // Trennlinien zwischen Spielern
      playerRows = playerRows.split('</div><div class="cs-player-row">').join('</div><div class="cs-player-sep"></div><div class="cs-player-row">');
    }
    var playerCount = players.length ? String(players.length)+' AKTIV' : '0 AKTIV';

    return '<div style="display:flex;flex-direction:column;gap:14px">'
      // Profilkarte
      + '<div class="cs-profile-card">'
      + '<div class="cs-profile-card-glow"></div>'
      + '<div class="cs-profile-avatar" style="position:relative;flex:none">'+avatarHtml+'</div>'
      + '<div class="cs-profile-copy">'
      + '<div class="cs-profile-name">'+esc(name)+'</div>'
      + '<div class="cs-profile-email">'+esc(profile.email || '')+'</div>'
      + googleBadge
      + '</div>'
      + '<button class="cs-profile-btn" id="btn-profile-signout" type="button">Abmelden</button>'
      + '</div>'
      // Mitspieler-Karte
      + '<div class="cs-mod">'
      + '<div class="cs-modhead">'
      + '<div class="cs-ava"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17" cy="8" r="2.6"/><path d="M16 14c2.5.2 4.5 2.2 4.5 5"/></svg></div>'
      + '<div class="cs-mod-copy"><div style="display:flex;align-items:center;gap:8px"><span class="cs-mod-title">Mitspieler</span><span class="cs-chip-a">'+esc(playerCount)+'</span></div><div class="cs-mod-sub">Automatisch über Google-Login erkannt.</div></div>'
      + '</div>'
      + (playerRows ? '<div class="cs-sep"></div>'+playerRows : '<div class="cs-sep"></div><div class="cs-mod-sub">Noch keine Mitspieler geladen.</div>')
      + '</div>'
      + '</div>';
  }

  // ── Darstellung-Pane ───────────────────────────────────────────────────────
  function darstellungPane(){
    var theme = appThemePreference();
    var themeLabel = theme === 'system' ? 'SYSTEM' : (theme === 'light' ? 'HELL' : 'DUNKEL');
    var themeGrid = '<div class="cs-theme-grid">'
      + themeOptionButton('system','System','Folgt deinem Gerät', theme)
      + themeOptionButton('light','Hell','Ruhiger heller Look', theme)
      + themeOptionButton('dark','Dunkel','Aktueller Darkmode', theme)
      + '</div>';
    return '<div class="cs-mod">'
      + '<div class="cs-modhead">'
      + '<div class="cs-ava"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3 a9 9 0 0 1 0 18 z" fill="#34d399" stroke="none"/></svg></div>'
      + '<div class="cs-mod-copy"><div style="display:flex;align-items:center;gap:8px"><span class="cs-mod-title">Darstellung</span><span class="cs-chip-a">'+esc(themeLabel)+'</span></div></div>'
      + '</div>'
      + '<div style="margin-top:15px">'+themeGrid+'</div>'
      + accentSectionHtml()
      + '</div>';
  }

  // ── Benachrichtigungen-Pane ─────────────────────────────────────────────────
  function pushPane(){
    var push = pushStatus();
    var rainOn = readBool('change_v1_rain_alerts_enabled', false);
    var pollenWarnOn = readBool('change_v1_pollen_alerts_enabled', false);
    var friseurOn = dashboardBool('getFriseurEnabled', 'change_v1_friseur_enabled', true);
    var rainHours = weatherAlertHours('change_v1_rain_alert_hours', 2);
    var pollenHours = weatherAlertHours('change_v1_pollen_alert_hours', 2);
    var holidayPush = readBool('change_v1_holiday_notifications', false);

    function selHours(id, current){
      return '<div class="cs-sel-native" style="margin-top:10px"><select id="'+id+'">'
        + [1,2,3,6,12,24].map(function(h){ return '<option value="'+h+'" '+(h===current?'selected':'')+'>'+h+' Std. vorher</option>'; }).join('')
        + '</select><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#7E8A80" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg></div>';
    }
    function sw(id, on){ return '<label class="switch"><input type="checkbox" id="'+id+'" '+(on?'checked':'')+'><span class="slider"></span></label>'; }

    return '<div style="display:flex;flex-direction:column;gap:14px">'
      // Master Push
      + '<div class="cs-mod">'
      + '<div class="cs-modhead">'
      + '<div class="cs-ava"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg></div>'
      + '<div class="cs-mod-copy"><div style="display:flex;align-items:center;gap:8px"><span class="cs-mod-title">Push-Benachrichtigungen</span><span class="'+(push.active?'cs-chip-a':'cs-chip-n')+'">'+esc(push.label)+'</span></div></div>'
      + '<div class="cs-mod-right">'+sw('set-push', push.active)+'</div>'
      + '</div>'
      + '<div class="cs-sep"></div>'
      + '<button class="cs-btn" id="btn-push-test" type="button">Test-Benachrichtigung senden</button>'
      + '</div>'
      // Section Label
      + '<div class="cs-secl" style="margin:2px 2px -4px">MODULE</div>'
      // Regenwarnung
      + '<div class="cs-mod">'
      + '<div class="cs-modhead">'
      + '<div class="cs-ava"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.6-1.3A3.8 3.8 0 0 1 18 17"/><path d="M8 20l-1 2M12 20l-1 2M16 20l-1 2"/></svg></div>'
      + '<div class="cs-mod-copy"><div style="display:flex;align-items:center;gap:8px"><span class="cs-mod-title">Regenwarnung</span><span class="cs-chip-a">WETTER</span></div><div class="cs-mod-sub">Warnt, wenn Regen erwartet wird.</div></div>'
      + '<div class="cs-mod-right">'+sw('set-rain-alerts', rainOn)+'</div>'
      + '</div>'
      + (rainOn ? '<div class="cs-sep"></div><div class="cs-secl" style="margin-bottom:8px">Erinnerung</div><div class="cs-sel-native"><select id="set-rain-hours">'
        + [1,2,3,6,12,24].map(function(h){ return '<option value="'+h+'" '+(h===rainHours?'selected':'')+'>'+h+' Std. vorher</option>'; }).join('')
        + '</select><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#7E8A80" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg></div>' : '')
      + '</div>'
      // Pollenwarnung
      + '<div class="cs-mod">'
      + '<div class="cs-modhead">'
      + '<div class="cs-ava"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9"/><path d="M12 13c-4 0-7-2-7-6 4 0 7 2 7 6z"/><path d="M12 11c1-3 4-5 7-5 0 4-3 6-7 6"/></svg></div>'
      + '<div class="cs-mod-copy"><div style="display:flex;align-items:center;gap:8px"><span class="cs-mod-title">Pollenwarnung</span><span class="cs-chip-a">POLLEN</span></div><div class="cs-mod-sub">Benachrichtigt nur bei starker Belastung.</div></div>'
      + '<div class="cs-mod-right">'+sw('set-pollen-alerts', pollenWarnOn)+'</div>'
      + '</div>'
      + (pollenWarnOn ? '<div class="cs-sep"></div><div class="cs-secl" style="margin-bottom:8px">Erinnerung</div><div class="cs-sel-native"><select id="set-pollen-hours">'
        + [1,2,3,6,12,24].map(function(h){ return '<option value="'+h+'" '+(h===pollenHours?'selected':'')+'>'+h+' Std. vorher</option>'; }).join('')
        + '</select><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#7E8A80" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg></div>' : '')
      + '</div>'
      // Friseur-Erinnerung
      + (friseurOn ? '<div class="cs-mod">'
      + '<div class="cs-modhead">'
      + '<div class="cs-ava"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="2.8"/><circle cx="6.5" cy="17.5" r="2.8"/><path d="M8.7 8.4 L20 16.5M8.7 15.6 L20 7.5"/></svg></div>'
      + '<div class="cs-mod-copy"><div style="display:flex;align-items:center;gap:8px"><span class="cs-mod-title">Friseur-Erinnerung</span><span class="cs-chip-a">FRISEUR</span></div><div class="cs-mod-sub">Erinnert an den nächsten Termin.</div></div>'
      + '</div>'
      + '</div>' : '')
      // Termin-Erinnerung
      + '<div class="cs-mod">'
      + '<div class="cs-modhead">'
      + '<div class="cs-ava"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2.6"/><path d="M12 13.6v1.4l1 .7"/></svg></div>'
      + '<div class="cs-mod-copy"><span class="cs-mod-title">Termin-Erinnerung</span></div>'
      + '</div>'
      + '<div class="cs-sep"></div>'
      + '<div class="cs-sel-native"><select id="set-event-reminder"><option value="1440" selected>1 Tag vorher</option><option value="60">1 Std. vorher</option><option value="30">30 Min. vorher</option></select><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#7E8A80" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg></div>'
      + '</div>'
      // Geburtstags-Erinnerung
      + '<div class="cs-mod">'
      + '<div class="cs-modhead">'
      + '<div class="cs-ava"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16v-7H4z"/><path d="M4 13c0-2 1.6-3 4-3s4 1 4 3M12 13c0-2 1.6-3 4-3s4 1 4 3"/><path d="M12 10V7"/><circle cx="12" cy="5" r="1.4"/></svg></div>'
      + '<div class="cs-mod-copy"><span class="cs-mod-title">Geburtstags-Erinnerung</span></div>'
      + '</div>'
      + '<div class="cs-sep"></div>'
      + '<div class="cs-sel-native"><select id="set-birthday-push"><option value="1" selected>1 Tag vorher</option><option value="2">2 Tage vorher</option><option value="7">1 Woche vorher</option></select><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#7E8A80" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg></div>'
      + '</div>'
      // Feiertags-Benachrichtigungen
      + '<div class="cs-mod">'
      + '<div class="cs-modhead">'
      + '<div class="cs-ava"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg></div>'
      + '<div class="cs-mod-copy"><span class="cs-mod-title">Feiertags-Benachrichtigungen</span></div>'
      + '<div class="cs-mod-right">'+sw('set-holiday-push', holidayPush)+'</div>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  function calendarPane(){
    var options = calendarOptions();
    var holidaysBody = featureField(
      'Region',
      '<select class="finput" id="set-holiday-state">'+stateOptions(options.holidayState)+'</select>',
      ''
    );
    return '<div class="cs-stack">'
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
    return '<div data-half-list class="cs-halfday-list">'+list.map(function(day){
      return '<span class="cs-halfday-chip">'+esc(halfDayLabel(day))+'<button type="button" data-remove-half="'+esc(day)+'" aria-label="Halben Urlaubstag entfernen">×</button></span>';
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
      wetterBody += featureSwitch('Regenwarnung', '', 'set-rain-alerts', rainOn);
      if(rainOn) wetterBody += hoursSelect('set-rain-hours', rainHours);
    }else{
    }
    wetterBody += '<button class="cs-btn" id="set-weather-location" type="button">Standort aktualisieren</button>';

    var pollenBody = '';
    if(pollenOn){
      pollenBody += featureSwitch('Pollenwarnung', 'Benachrichtigt nur bei starker Belastung.', 'set-pollen-alerts', pollWarnOn);
      if(pollWarnOn) pollenBody += hoursSelect('set-pollen-hours', pollenHours);
    }else{
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
        '',
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
      ? featureField('Erinnerung nach', '<select class="finput" id="set-friseur-weeks">'+[2,3,4,5,6,8].map(function(n){ return '<option value="'+n+'" '+(n === friseurWeeks ? 'selected' : '')+'>'+n+' Wochen</option>'; }).join('')+'</select>', ''): ''

    var birthdaysBody = birthdaysOn
      ? birthdayDaysSelect('set-birthday-notification-days', birthdayNotificationDays): ''

    var urlaubBody = urlaubOn
      ? featureField('Jahresurlaub', '<input type="number" class="finput" id="set-urlaub-days" min="1" max="365" value="'+urlaubDays+'">', '')
        + featureField('Halbe Urlaubstage', '<div class="change-halfday-controls"><select class="finput" id="set-half-month">'+monthOptions+'</select><select class="finput" id="set-half-day">'+dayOptions+'</select><button class="btn btn-secondary btn-sm" id="set-add-half" type="button">+ Hinzufügen</button></div>'+halfDayChips(), ''): ''

    return '<div class="cs-stack">'
      + weatherHealthCard()
      + settingsFeatureCard(
        '✂️',
        'Friseur',
        friseurOn ? 'AKTIV' : 'AUS',
        friseurOn ? 'ok' : 'off',
        '',
        '<label class="switch"><input type="checkbox" id="set-friseur" '+(friseurOn ? 'checked' : '')+'><span class="slider"></span></label>',
        friseurBody
      )
      + settingsFeatureCard(
        '🎂',
        'Geburtstage',
        birthdaysOn ? 'AKTIV' : 'AUS',
        birthdaysOn ? 'ok' : 'off',
        '',
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

  function chipHtml(text, tone){
    var cls = (tone === 'ok') ? 'cs-chip-a' : (tone === 'error' ? 'cs-chip-e' : 'cs-chip-n');
    return text ? '<span class="'+cls+'">'+esc(text)+'</span>' : '';
  }
  function settingsFeatureCard(icon, title, badgeText, badgeTone, subtitle, controlHtml, bodyHtml){
    var iconHtml = iconMarkup(icon);
    var ava = (iconHtml.indexOf('<img') === 0 || iconHtml.indexOf('<svg') === 0)
      ? '<div class="cs-ava-plain">'+iconHtml+'</div>'
      : '<div class="cs-ava">'+iconHtml+'</div>';
    return '<div class="cs-mod">'
      + '<div class="cs-modhead">'
      + ava
      + '<div class="cs-mod-copy">'
      + '<div style="display:flex;align-items:center;gap:8px"><span class="cs-mod-title">'+esc(title)+'</span>'+chipHtml(badgeText, badgeTone)+'</div>'
      + (subtitle ? '<div class="cs-mod-sub">'+esc(subtitle)+'</div>' : '')
      + '</div>'
      + (controlHtml ? '<div class="cs-mod-right">'+controlHtml+'</div>' : '')
      + '</div>'
      + (bodyHtml ? '<div style="margin-top:14px">'+bodyHtml+'</div>' : '')
      + '</div>';
  }

  function dataAuditStorage(){
    try{ return window.localStorage || null; }catch(e){ return null; }
  }
  function dataAuditReadJson(key, fallback){
    try{
      var storage = dataAuditStorage();
      var raw = storage && storage.getItem ? storage.getItem(key) : null;
      if(raw == null || raw === '') return fallback;
      return JSON.parse(raw);
    }catch(e){ return fallback; }
  }
  function dataAuditHasKey(key){
    try{
      var storage = dataAuditStorage();
      return !!(storage && storage.getItem && storage.getItem(key) != null);
    }catch(e){ return false; }
  }
  function dataAuditStorageKeyCount(){
    try{
      var storage = dataAuditStorage();
      return storage && typeof storage.length === 'number' ? storage.length : 0;
    }catch(e){ return 0; }
  }
  function dataAuditCountFromKeys(keys){
    keys = Array.isArray(keys) ? keys : [keys];
    var max = 0;
    for(var i=0;i<keys.length;i++){
      var value = dataAuditReadJson(keys[i], null);
      var count = 0;
      if(Array.isArray(value)) count = value.length;
      else if(value && typeof value === 'object') count = Object.keys(value).length;
      if(count > max) max = count;
    }
    return max;
  }
  function dataAuditReport(){
    var storage = dataAuditStorage();
    var audit = null;
    try{
      if(window.ChangeDataModel && typeof window.ChangeDataModel.auditStorage === 'function'){
        audit = window.ChangeDataModel.auditStorage(storage || null);
      }
    }catch(e){ audit = null; }
    var counts = audit && audit.counts ? audit.counts : {};
    var keys = audit && audit.keys ? audit.keys : {};
    var snapshot = dataAuditReadJson('change_v1_settings_snapshot', null);
    var snapshotPresent = dataAuditHasKey('change_v1_settings_snapshot');
    return {
      version: audit && audit.version ? audit.version : '',
      counts: {
        storageKeys: parseInt(counts.storageKeys, 10) || dataAuditStorageKeyCount(),
        events: parseInt(counts.events, 10) || dataAuditCountFromKeys(['change_v1_events','events','change_v2_events']),
        challenges: parseInt(counts.challenges, 10) || dataAuditCountFromKeys(['change_v1_challenges','challenges']),
        challengeCompletions: parseInt(counts.challengeCompletions, 10) || dataAuditCountFromKeys(['change_v1_challenge_completions','challenge_completions','challengeCompletions']),
        challengePlayers: parseInt(counts.challengePlayers, 10) || dataAuditCountFromKeys(['change_v1_challenge_players','challenge_players','challengePlayers']),
        pollenSymptomDays: parseInt(counts.pollenSymptomDays, 10) || dataAuditCountFromKeys(['change_v1_pollen_symptoms','pollen_symptoms','change_pollen_symptoms'])
      },
      keys: {
        canonicalPresent: Array.isArray(keys.canonicalPresent) ? keys.canonicalPresent.length : 0,
        legacyPresent: Array.isArray(keys.legacyPresent) ? keys.legacyPresent.length : 0,
        cachePresent: Array.isArray(keys.cachePresent) ? keys.cachePresent.length : 0,
        unknownChangeKeys: Array.isArray(keys.unknownChangeKeys) ? keys.unknownChangeKeys.length : 0
      },
      settingsSnapshot: {
        present: snapshotPresent,
        updatedAtLocal: snapshot && snapshot.updatedAtLocal ? snapshot.updatedAtLocal : ''
      }
    };
  }
  function dataAuditChip(label, value){
    return '<span>'+esc(label)+': '+esc(parseInt(value, 10) || 0)+'</span>';
  }
  function dataAuditBody(expanded){
    if(!expanded){
      return '<div class="cs-note">Liest nur lokale Zaehler und Speicher-Keys. Es wird nichts geloescht, migriert oder synchronisiert.</div>'
        + '<button class="cs-btn" id="run-data-audit" type="button">Daten-Audit pruefen</button>';
    }
    var report = dataAuditReport();
    var counts = report.counts;
    var keys = report.keys;
    var totalKeys = counts.storageKeys || 0;
    // Drei große Zähler-Kacheln
    var counters = '<div style="display:flex;gap:9px;margin-top:14px">'
      + '<div style="flex:1;background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.16);border-radius:13px;padding:12px 14px"><div style="font-family:var(--mono);font-size:24px;font-weight:600;color:#9CEFBE;letter-spacing:-1px;line-height:1">'+esc(String(counts.challenges||0))+'</div><div style="font-size:11px;font-weight:700;color:#7E8A80;margin-top:5px">Challenges</div></div>'
      + '<div style="flex:1;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:13px;padding:12px 14px"><div style="font-family:var(--mono);font-size:24px;font-weight:600;color:#F2F5F1;letter-spacing:-1px;line-height:1">'+esc(String(counts.challengePlayers||0))+'</div><div style="font-size:11px;font-weight:700;color:#7E8A80;margin-top:5px">Mitspieler</div></div>'
      + '<div style="flex:1;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:13px;padding:12px 14px"><div style="font-family:var(--mono);font-size:24px;font-weight:600;color:#F2F5F1;letter-spacing:-1px;line-height:1">'+esc(String(counts.pollenSymptomDays||0))+'</div><div style="font-size:11px;font-weight:700;color:#7E8A80;margin-top:5px">Pollen-Tage</div></div>'
      + '</div>';
    // Events + Punkte Zeile
    var eventsRow = '<div style="display:flex;align-items:center;gap:18px;margin-top:10px;padding:11px 16px;background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.09);border-radius:12px">'
      + '<div style="display:flex;align-items:baseline;gap:7px"><span style="font-family:var(--mono);font-size:15px;font-weight:600;color:#5E6A60">'+esc(String(counts.events||0))+'</span><span style="font-size:12px;color:#7E8A80;font-weight:600">Events</span></div>'
      + '<div style="width:1px;height:14px;background:rgba(255,255,255,.1)"></div>'
      + '<div style="display:flex;align-items:baseline;gap:7px"><span style="font-family:var(--mono);font-size:15px;font-weight:600;color:#5E6A60">'+esc(String(counts.challengeCompletions||0))+'</span><span style="font-size:12px;color:#7E8A80;font-weight:600">Punkte</span></div>'
      + '</div>';
    // Storage-Diagnose-Grid
    var diagGrid = '<div class="cs-secl" style="margin:14px 0 9px">Storage-Diagnose · '+esc(String(totalKeys))+' Keys</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.14);border-radius:10px;padding:9px 13px"><span style="font-size:12px;font-weight:700;color:#9CEFBE">Canonical</span><span style="font-family:var(--mono);font-size:14px;font-weight:600;color:#9CEFBE">'+esc(String(keys.canonicalPresent||0))+'</span></div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(91,134,201,.06);border:1px solid rgba(91,134,201,.16);border-radius:10px;padding:9px 13px"><span style="font-size:12px;font-weight:700;color:#8FB0E0">Cache</span><span style="font-family:var(--mono);font-size:14px;font-weight:600;color:#8FB0E0">'+esc(String(keys.cachePresent||0))+'</span></div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:9px 13px"><span style="font-size:12px;font-weight:700;color:#C7D0C7">Legacy</span><span style="font-family:var(--mono);font-size:14px;font-weight:600;color:#C7D0C7">'+esc(String(keys.legacyPresent||0))+'</span></div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:9px 13px"><span style="font-size:12px;font-weight:700;color:#7E8A80">Unbekannt</span><span style="font-family:var(--mono);font-size:14px;font-weight:600;color:#7E8A80">'+esc(String(keys.unknownChangeKeys||0))+'</span></div>'
      + '</div>';
    return counters + eventsRow + diagGrid
      + '<button class="cs-btn" id="run-data-audit" type="button" style="margin-top:14px">Erneut pruefen</button>';
  }

  function syncPane(){
    var dbOn   = readDatabaseSyncEnabled();
    var google = googleStatus();
    var fb     = firebaseStatus();

    var dbSwitch = '<label class="switch"><input type="checkbox" id="set-database-sync" '+(dbOn?'checked':'')+' '+(!fb.ok?'disabled':'')+'><span class="slider"></span></label>';
    var dbBody = '<div class="cs-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"><span>Mitspieler</span><span>Einstellungen</span><span>Challenges</span><span>Punkte</span></div>'
      + '<button class="cs-btn" id="set-database-sync-now" type="button" '+(!fb.ok?'disabled':'')+'>Jetzt in Firebase speichern</button>';

    var googleCanToggle = !!(google.loggedIn || google.cached);
    var googleControl = googleCanToggle
      ? '<label class="switch"><input type="checkbox" id="set-google" '+(google.enabled?'checked':'')+'><span class="slider"></span></label>'
      : '<button class="cs-btn-sm" id="btn-google-connect" type="button">Verbinden</button>';
    var googleSub = google.detail || (google.loggedIn ? 'Importiert Kalendertermine. Getrennt vom Datenbank-Sync.' : 'Nur für Kalendertermine. Startet keinen Datenbank-Sync.');
    var googleBody = googleCanToggle
      ? '<button class="cs-btn" id="set-sync-google" type="button">Google Kalender '+(google.loggedIn?'neu synchronisieren':'aktualisieren')+'</button>': ''

    var statusBody = (window.ChangeAppStatus && window.ChangeAppStatus.syncStatusHtml) ? window.ChangeAppStatus.syncStatusHtml(): ''
    var logBody = (window.ChangeAppStatus && window.ChangeAppStatus.logHtml) ? window.ChangeAppStatus.logHtml(6) + '<button class="cs-btn" id="clear-sync-log" type="button">Protokoll leeren</button>': ''
    return '<div class="cs-stack">'
      + settingsFeatureCard('☁️', 'Datenbank-Sync', fb.label, fb.tone, fb.detail, dbSwitch, dbBody)
      + settingsFeatureCard('📅', 'Google Kalender', google.label, google.tone, googleSub, googleControl, googleBody)
      + settingsFeatureCard('🟢', 'Sync-Status', 'LIVE', 'ok', 'Zeigt, ob Datenbank und Google Kalender aktuell sind.', '', statusBody)
      + settingsFeatureCard('🧾', 'Sync-Protokoll', 'LOKAL', 'off', '', '', logBody)
      + '</div>';
  }
  function challengesPane(){
    var auto = getAutoChallengesEnabled();
    var body = auto
      ? autoChallengeCountSelect('set-auto-count') + challengeDifficultySelect('set-challenge-difficulty'): ''
    return '<div class="cs-stack">'
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
  var APP_VERSION = '0.1.0307';



  var githubUpdateState = {
    file: null,
    fileBuffer: null,
    fileName: '',
    fileSize: 0,
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
    lastRunId: '',
    // NEU: einzelne State-Machine-Phase statt verstreuter Flag-Kombinationen.
    // Werte: 'idle' | 'queued' | 'workflow_running' | 'pages_building' | 'live' | 'error'
    phase: 'idle',
    pagesAvailable: false,
    pagesStatus: '',
    direction: 'update', // 'update' | 'rollback' — bestimmt nur die Beschriftung
    panelTab: 'update' // 'update' | 'history' — UI-Tab, immer 'update' beim Öffnen
  };

  var GITHUB_UPDATE_WORKER_URL = 'https://change-github-update.ak2191.workers.dev';
  var githubUpdateSecretMemory = '';
  // Ein bewusst gestarteter GitHub-Job bleibt auch ausserhalb der Einstellungen aktiv.
  // Die Anzeige wird dabei niemals in eine andere App-Ansicht gedrueckt.
  var GITHUB_UPDATE_SESSION_KEY = 'change_github_update_background_v1';
  var GITHUB_UPDATE_SESSION_FIELDS = [
    'fromVersion','toVersion','uploadCommitSha','actionRunUrl','actionStatus','actionConclusion',
    'actionMessage','actionCheckedAt','actionStartedAt','updateReady','branchCommitSha',
    'branchVersion','targetCommitted','liveVersion','liveReady','lastRunId','phase',
    'pagesAvailable','pagesStatus','direction'
  ];
  function githubUpdateSessionSnapshot(){
    var state = githubUpdateState;
    var snapshot = {version:1};
    GITHUB_UPDATE_SESSION_FIELDS.forEach(function(field){ snapshot[field] = state[field]; });
    return snapshot;
  }
  function persistGithubUpdateSession(){
    var state = githubUpdateState;
    try{
      if(!state.uploadCommitSha && !state.actionStartedAt){
        localStorage.removeItem(GITHUB_UPDATE_SESSION_KEY);
        return;
      }
      localStorage.setItem(GITHUB_UPDATE_SESSION_KEY, JSON.stringify(githubUpdateSessionSnapshot()));
    }catch(e){}
  }
  function clearGithubUpdateSession(){
    try{ localStorage.removeItem(GITHUB_UPDATE_SESSION_KEY); }catch(e){}
  }
  function restoreGithubUpdateSession(){
    var snapshot = null;
    try{ snapshot = JSON.parse(localStorage.getItem(GITHUB_UPDATE_SESSION_KEY) || 'null'); }catch(e){}
    if(!snapshot || snapshot.version !== 1 || (!snapshot.uploadCommitSha && !snapshot.actionStartedAt)) return false;
    // Fehlgeschlagene Alt-Jobs duerfen keinen neuen Upload blockieren.
    if(snapshot.actionConclusion && snapshot.actionConclusion !== 'success'){
      clearGithubUpdateSession();
      return false;
    }
    GITHUB_UPDATE_SESSION_FIELDS.forEach(function(field){
      if(Object.prototype.hasOwnProperty.call(snapshot, field)) githubUpdateState[field] = snapshot[field];
    });
    githubUpdateState.direction = githubUpdateState.direction === 'rollback' ? 'rollback' : 'update';
    githubUpdateState.actionStartedAt = Number(githubUpdateState.actionStartedAt) || 0;
    githubUpdateState.updateReady = githubUpdateState.updateReady === true;
    githubUpdateState.liveReady = githubUpdateState.liveReady === true;
    githubUpdateState.targetCommitted = githubUpdateState.targetCommitted === true;
    githubUpdateState.pagesAvailable = githubUpdateState.pagesAvailable === true;
    return true;
  }
  function isGithubUpdatePanelVisible(){
    var view = document.getElementById('settings-view');
    return !!(
      document.body && document.body.classList.contains('change-view-settings') &&
      currentSettingsTab === 'github' && view && view.style.display !== 'none'
    );
  }
  function refreshGithubUpdatePanelIfVisible(){
    // Kein Routing und kein Overlay: nur die bereits offene GitHub-Ansicht aktualisieren.
    if(isGithubUpdatePanelVisible()) refreshSameTab('github');
  }
  function githubAdminEmail(email){
    var access = window.ChangeAccessControl || null;
    if(access && typeof access.isAdminEmail === 'function') return access.isAdminEmail(email);
    return String(email || '').trim().toLowerCase() === 'ak2191@gmx.de';
  }
  function isGithubAdmin(){
    var access = window.ChangeAccessControl || null;
    if(access && typeof access.isCurrentUserAdmin === 'function') return access.isCurrentUserAdmin();
    var email = '';
    try{ email = (window.userInfo && window.userInfo.email) || ''; }catch(e){}
    try{ if(!email && window.firebase && firebase.auth && firebase.auth().currentUser) email = firebase.auth().currentUser.email || ''; }catch(e){}
    return githubAdminEmail(email);
  }
  async function githubAdminAuthHeaders(interactive){
    if(!isGithubAdmin()) throw new Error('GitHub-Updates sind nur fuer Admins freigegeben.');

    // Firebase Auth direkt prüfen – unabhängig von Firestore/Messaging SDK-Zustand.
    // ensureChangeFirebaseAuth schlägt fehl wenn firebase.firestore nicht geladen ist;
    // für den GitHub-Upload brauchen wir nur ein Auth-Token, nicht Firestore.
    var user = null;
    try{ user = window.firebase && firebase.auth ? firebase.auth().currentUser : null; }catch(e){}

    // Kein User im Cache → kurz auf Auth-State warten (max 2,5s)
    if(!user){
      user = await new Promise(function(resolve){
        var done = false;
        var timer = setTimeout(function(){ if(!done){ done=true; resolve(null); } }, 2500);
        try{
          var unsub = firebase.auth().onAuthStateChanged(function(u){
            if(!done){ done=true; clearTimeout(timer); try{ unsub(); }catch(e){} resolve(u); }
          });
        }catch(e){ clearTimeout(timer); resolve(null); }
      });
    }

    if(!user || !githubAdminEmail(user.email || '')) throw new Error('Firebase-Admin-Anmeldung fehlt. Bitte neu mit Google einloggen.');
    var token = null;
    try{ token = await user.getIdToken(true); }catch(e){ throw new Error('Firebase-Token konnte nicht erneuert werden: ' + (e && e.message ? e.message : e)); }
    if(!token) throw new Error('Firebase-Token ist leer.');
    return {'Authorization':'Bearer ' + token};
  }
  function readGithubUpdateSecret(){
    try{ localStorage.removeItem('change_github_update_secret'); }catch(e){}
    try{ return githubUpdateSecretMemory || sessionStorage.getItem('change_github_update_secret') || ''; }catch(e){ return githubUpdateSecretMemory || ''; }
  }
  function writeGithubUpdateSecret(value){
    githubUpdateSecretMemory = String(value || '').trim();
    try{ localStorage.removeItem('change_github_update_secret'); }catch(e){}
    try{ sessionStorage.setItem('change_github_update_secret', githubUpdateSecretMemory); }catch(e){}
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
    var label = ok ? 'Update bereit' : 'ZIP prüfen';
    var detail = ok
      ? ((target ? ('Zielversion ' + target) : 'Zielversion erkannt') + (files ? ' · ' + files + ' Dateien' : ''))
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
  function latestGithubUpdateVersion(){
    var values = [
      githubUpdateState.toVersion,
      githubUpdateState.liveVersion,
      githubUpdateState.branchVersion,
      APP_VERSION
    ];
    var best = '';
    values.forEach(function(value){
      value = String(value || '').trim();
      if(!/^\d+\.\d+\.\d+$/.test(value)) return;
      if(!best || compareVersions(value, best) > 0) best = value;
    });
    return best || APP_VERSION;
  }
  function githubTargetVersionLabel(){
    var target = githubUpdateState.toVersion || latestGithubUpdateVersion();
    return target ? ('Zielversion ' + target) : 'Zielversion offen';
  }
  function githubFriendlyError(message){
    message = String(message || '').trim();
    if(/requested file could not be read|permission problems|reference to a file was acquired|NotReadableError|file could not be read/i.test(message)){
      return 'Datei konnte nicht gelesen werden. Bitte ZIP neu auswählen und direkt erneut übertragen.';
    }
    if(/Status Fehler 404|Not Found|\/status fehlt|404/i.test(message)){
      return 'Status konnte nicht gelesen werden. Bitte Worker prüfen.';
    }
    if(message) return message;
    return 'Update konnte nicht abgeschlossen werden.';
  }
  function githubUpdateNeedsReload(){
    var version = latestGithubUpdateVersion();
    return !!(version && compareVersions(version, APP_VERSION) > 0);
  }
  /* NEU: Einzige Quelle der Wahrheit fuer die Update-Phase.
     Ersetzt die bisherige verschachtelte if-Kette, die drei Flags
     (actionStatus, targetCommitted, liveReady) einzeln kombiniert hat. */
  function computeGithubPhase(){
    var state = githubUpdateState;
    var actionDone = state.actionStatus === 'completed';
    var actionFailed = actionDone && state.actionConclusion && state.actionConclusion !== 'success';
    var pagesErrored = state.pagesAvailable && state.pagesStatus === 'errored';

    if(actionFailed || pagesErrored){
      return { key: 'error', tone: 'error' };
    }
    if(state.updateReady && state.liveReady){
      return { key: 'live', tone: 'ok' };
    }
    // Workflow erfolgreich, Branch trägt Zielversion, aber Pages hat es noch nicht ausgeliefert.
    if(state.targetCommitted && state.pagesAvailable && state.pagesStatus === 'building'){
      return { key: 'pages_building', tone: 'active' };
    }
    if(state.targetCommitted){
      return { key: 'pages_building', tone: 'active' };
    }
    if(actionDone && state.actionConclusion === 'success'){
      return { key: 'pages_building', tone: 'active' };
    }
    if(state.actionStatus === 'queued' || state.actionStatus === 'in_progress'){
      return { key: 'workflow_running', tone: 'active' };
    }
    if(state.uploadCommitSha){
      return { key: 'queued', tone: 'active' };
    }
    return { key: 'idle', tone: 'active' };
  }
  function githubPhaseLabel(phaseKey, direction){
    var isRollback = direction === 'rollback';
    switch(phaseKey){
      case 'queued': return isRollback ? 'Rückstufung wird vorbereitet…' : 'Update wird vorbereitet…';
      case 'workflow_running': return isRollback ? 'Rückstufung wird angewendet…' : 'Update wird angewendet…';
      case 'pages_building': return isRollback ? 'Rückstufung wird veröffentlicht…' : 'Update wird veröffentlicht…';
      case 'live': return githubUpdateNeedsReload() ? (isRollback ? 'Rückstufung ist bereit' : 'Update ist bereit') : 'Du bist aktuell';
      case 'error': return isRollback ? 'Rückstufung konnte nicht abgeschlossen werden' : 'Update konnte nicht abgeschlossen werden';
      default: return isRollback ? 'Rückstufung wird vorbereitet…' : 'Update wird vorbereitet…';
    }
  }
  function githubActionCurrent(){
    var state = githubUpdateState;
    var targetLine = githubTargetVersionLabel();
    var phase = computeGithubPhase();
    var label = githubPhaseLabel(phase.key, state.direction);
    var detail = targetLine;
    if(phase.key === 'error'){
      detail = githubFriendlyError(state.actionMessage);
    }else if(phase.key === 'live'){
      detail = githubUpdateNeedsReload() ? targetLine : ('Version ' + latestGithubUpdateVersion());
    }
    state.phase = phase.key;
    return { tone: phase.tone, label: label, detail: detail };
  }

  var GITHUB_PHASE_ORDER = ['queued', 'workflow_running', 'pages_building', 'live'];
  function githubPhaseProgress(phaseKey){
    if(phaseKey === 'error') return -1;
    var idx = GITHUB_PHASE_ORDER.indexOf(phaseKey);
    return idx < 0 ? 0 : idx;
  }
  function githubProgressTrack(phaseKey){
    var progress = githubPhaseProgress(phaseKey);
    if(progress < 0) return ''; // Fehlerzustand: kein Fortschrittsbalken, Fehlertext reicht
    var dots = GITHUB_PHASE_ORDER.map(function(step, i){
      var state = i < progress ? 'done' : (i === progress ? 'active' : 'wait');
      return '<span class="change-github-progress-dot '+state+'"></span>';
    }).join('');
    return '<div class="change-github-progress-track">'+dots+'</div>';
  }
  function githubActionStatusPanel(){
    var state = githubUpdateState;
    if(!state.actionMessage && !state.updateReady && !state.actionRunUrl && !state.uploadCommitSha) return '';
    var current = githubActionCurrent();
    var cls = current.tone === 'ok' ? 'ok' : (current.tone === 'error' ? 'error' : 'checking');
    var files = (state.files || []).length;
    var compactDetail = current.detail + (files ? ' · ' + files + ' Dateien' : '');
    var link = state.actionRunUrl ? '<a href="'+esc(state.actionRunUrl)+'" target="_blank" rel="noopener">Technische Details öffnen</a>' : '';
    var isRollback = state.direction === 'rollback';
    var buttonLabel = isRollback ? 'App vollständig neu laden (Rückstufung)' : 'App vollständig neu laden';
    var button = state.updateReady && state.liveReady && githubUpdateNeedsReload()
      ? '<button class="cs-btn-p" id="github-update-reload" type="button">'+esc(buttonLabel)+'</button>'
      : '';
    var loaded = state.updateReady && state.liveReady && !githubUpdateNeedsReload()
      ? '<div class="change-github-loaded-note">Version '+esc(latestGithubUpdateVersion())+' ist bereits geladen.</div>'
      : '';
    var progress = githubProgressTrack(state.phase);
    return '<div class="change-github-action '+esc(cls)+'"><div class="change-github-action-current '+esc(current.tone)+'"><span></span><div><strong>'+esc(current.label)+'</strong><small>'+esc(compactDetail)+'</small></div></div>'+progress+(link?'<div class="change-github-action-links">'+link+'</div>':'')+button+loaded+'</div>';
  }


  async function reloadChangeUpdateVersion(){
    var state = githubUpdateState;
    // Nur ausführen wenn GitHub-Deployment wirklich abgeschlossen ist
    if(!state.liveReady || !state.updateReady){
      if(typeof window.toast === 'function') window.toast('Warte bis das Update bereit ist…', '');
      return;
    }
    var version = latestGithubUpdateVersion();
    if(!version || compareVersions(version, APP_VERSION) <= 0){
      if(typeof window.toast === 'function') window.toast('Aktuelle Version ist bereits geladen', 'ok');
      return;
    }
    try{
      githubUpdateState.actionMessage = 'App wird vollständig neu geladen…';
      refreshSameTab('github');
    }catch(e){}
    try{
      if(window.caches && caches.keys){
        var keys = await caches.keys();
        await Promise.all(keys.map(function(key){ return caches.delete(key); }));
      }
    }catch(e){}
    try{
      if(navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function(reg){
          return reg.unregister ? reg.unregister().catch(function(){}) : Promise.resolve();
        }));
      }
    }catch(e){}
    try{
      localStorage.setItem('change_v1_last_hard_reload_version', version);
      sessionStorage.setItem('change_v1_force_reload_version', version);
    }catch(e){}
    var url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('v', version);
    url.searchParams.set('t', String(Date.now()));
    url.searchParams.set('hard', '1');
    try{
      await fetch(url.toString(), {cache:'reload', credentials:'same-origin'});
    }catch(e){}
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
      state.actionMessage = state.direction === 'rollback'
        ? 'Rückstufung wurde nicht rechtzeitig live erkannt.'
        : 'Update wurde nicht rechtzeitig live erkannt.';
      state.actionCheckedAt = new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
      stopGithubActionPolling();
      persistGithubUpdateSession();
      refreshGithubUpdatePanelIfVisible();
      return;
    }
    try{
      var url = GITHUB_UPDATE_WORKER_URL + '/status';
      var params = [];
      if(state.uploadCommitSha) params.push('commitSha=' + encodeURIComponent(state.uploadCommitSha));
      if(target) params.push('targetVersion=' + encodeURIComponent(target));
      if(params.length) url += '?' + params.join('&');
      var response = await fetch(url, {cache:'no-store', headers: await githubAdminAuthHeaders(false)});
      var result = null;
      try{ result = await response.json(); }catch(parseErr){}
      if(!response.ok || !result || !result.ok) throw new Error((result && result.message) || ('Status Fehler '+response.status));
      var run = result.run || null;
      var branch = result.branch || null;
      var pages = result.pages || null;
      state.actionCheckedAt = new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
      if(branch){
        state.branchCommitSha = branch.headSha || state.branchCommitSha || '';
        state.branchVersion = branch.version || state.branchVersion || '';
        if(branch.targetVersionCommitted === true || (target && state.branchVersion && compareVersions(state.branchVersion, target) >= 0)){
          state.targetCommitted = true;
        }
      }
      if(pages){
        state.pagesAvailable = !!pages.available;
        state.pagesStatus = pages.status || '';
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
            // Bevorzugt: echter Pages-Build-Status fuer den Ziel-Commit.
            // Fallback (Pages-API nicht erreichbar/keine Berechtigung): alte Live-Datei-Heuristik.
            if(pages && pages.available){
              state.liveReady = pages.status === 'built' && (pages.matchesCommit || !state.branchCommitSha);
              if(!state.liveReady && pages.status === 'errored'){
                state.actionConclusion = 'failure';
                state.actionMessage = pages.error || 'GitHub Pages Build fehlgeschlagen.';
                stopGithubActionPolling();
                persistGithubUpdateSession();
      refreshGithubUpdatePanelIfVisible();
                return;
              }
            }else{
              state.liveVersion = await readLiveAppVersion(target);
              state.liveReady = !!(target && state.liveVersion && compareVersions(state.liveVersion, target) >= 0);
            }
            if(state.liveReady){
              state.updateReady = true;
              state.actionMessage = githubPhaseLabel('live', state.direction);
              stopGithubActionPolling();
              persistGithubUpdateSession();
      refreshGithubUpdatePanelIfVisible();
              return;
            }
            state.updateReady = false;
            state.actionMessage = githubPhaseLabel('pages_building', state.direction);
          }else{
            state.updateReady = false;
            state.liveReady = false;
            state.actionMessage = githubPhaseLabel('error', state.direction);
            stopGithubActionPolling();
            persistGithubUpdateSession();
      refreshGithubUpdatePanelIfVisible();
            return;
          }
        }else{
          state.updateReady = false;
          state.liveReady = false;
          state.actionMessage = githubPhaseLabel('workflow_running', state.direction);
        }
      }else{
        state.updateReady = false;
        state.liveReady = false;
        state.actionMessage = githubPhaseLabel('workflow_running', state.direction);
      }
    }catch(e){
      var statusError = e && e.message ? e.message : 'Status konnte nicht gelesen werden.';
      if(/404|Status Fehler 404|Not Found/i.test(statusError)){
        statusError = 'Status konnte nicht gelesen werden. Bitte Worker prüfen.';
      }
      state.actionMessage = githubFriendlyError(statusError);
      state.actionConclusion = 'failure';
      state.actionCheckedAt = new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
    }
    persistGithubUpdateSession();
    refreshGithubUpdatePanelIfVisible();
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
  var githubCommitHistory = [];
  var githubCommitHistoryLoading = false;
  var githubCommitHistoryVisible = 5;
  var githubRollbackState = { running: false, message: '', error: '' };

  function githubCommitHistoryPanel(){
    var secret = readGithubUpdateSecret();
    if(!secret) return '';
    var rows = '';
    var moreBtn = '';
    if(githubCommitHistoryLoading){
      rows = '<div class="change-github-history-loading">Commits werden geladen…</div>';
    } else if(githubCommitHistory.length === 0){
      rows = '<div class="change-github-history-empty">Noch nicht geladen.</div>';
    } else {
      // Dedupliziere: nur ersten (neuesten) Commit pro Version zeigen
      var _seen = {};
      var _dedup = githubCommitHistory.filter(function(c){
        if(!c.version && !/ZIP Update bereitstellen/i.test(c.message)) return false;
        var key = c.version || c.sha;
        if(_seen[key]) return false;
        _seen[key] = true;
        return true;
      });
      var _visible = _dedup.slice(0, githubCommitHistoryVisible);
      rows = _visible.map(function(c, i){
        var isFirst = i === 0;
        var date = c.date ? new Date(c.date).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
        var displayVersion = c.version ? 'v'+esc(c.version) : esc(c.shortSha);
        var metaLine = esc(c.shortSha)+' · '+esc(date);
        var trailing = isFirst
          ? '<span class="change-github-commit-current">Aktuell</span>'
          : '<button class="change-github-rollback-link" data-sha="'+esc(c.sha)+'" data-msg="'+esc(c.message)+'" type="button">Zurück</button>';
        return '<div class="change-github-commit-row'+(isFirst?' is-current':'')+'">'
          + '<div class="change-github-commit-info">'
          + '<div class="change-github-commit-version-main">'+displayVersion+'</div>'
          + '<div class="change-github-commit-meta">'+metaLine+'</div>'
          + '</div>'
          + trailing
          + '</div>';
      }).join('') || '<div class="change-github-history-empty">Keine Update-Commits gefunden.</div>';
      if(_dedup.length > githubCommitHistoryVisible){
        moreBtn = '<button class="change-github-history-more" id="github-history-more" type="button">+'+(_dedup.length - githubCommitHistoryVisible)+' weitere anzeigen</button>';
      }
    }
    var rollbackStatus = githubRollbackState.running
      ? '<div class="change-github-rollback-status running">Rollback wird durchgeführt…</div>'
      : githubRollbackState.message
        ? '<div class="change-github-rollback-status ok">'+esc(githubRollbackState.message)+'</div>'
        : githubRollbackState.error
          ? '<div class="change-github-rollback-status error">'+esc(githubRollbackState.error)+'</div>'
          : '';
    return '<div class="change-github-history-panel">'
      + rollbackStatus + rows + moreBtn + '</div>';
  }

  async function loadGithubCommitHistory(){
    if(githubCommitHistoryLoading) return;
    githubCommitHistoryLoading = true;
    githubCommitHistory = [];
    refreshSameTab('github');
    try{
      var response = await fetch(GITHUB_UPDATE_WORKER_URL + '/commits?count=10', {cache:'no-store', headers: await githubAdminAuthHeaders(false)});
      var result = await response.json();
      githubCommitHistory = (result && result.ok && Array.isArray(result.commits)) ? result.commits : [];
    }catch(e){ githubCommitHistory = []; }
    githubCommitHistoryLoading = false;
    refreshSameTab('github');
  }

  async function rollbackToCommit(sha, message){
    var secret = readGithubUpdateSecret();
    if(!secret){ if(typeof window.toast === 'function') window.toast('Bitte Freigabe-Code eintragen', 'err'); return; }
    // Schöner Dialog statt browser confirm
    var confirmed = false;
    var dlgHtml = '<div class="change-rollback-dialog"><div class="change-rollback-dialog-box"><div class="change-rollback-dialog-title">↺ Rollback zu '+sha.slice(0,7)+'?</div><div class="change-rollback-dialog-msg">'+esc(message)+'</div><div class="change-rollback-dialog-btns"><button class="change-rollback-cancel" id="rb-cancel" type="button">Abbrechen</button><button class="change-rollback-ok" id="rb-ok" type="button">Zurücksetzen</button></div></div></div>';
    var dlgEl = document.createElement('div');
    dlgEl.innerHTML = dlgHtml;
    document.body.appendChild(dlgEl);
    await new Promise(function(resolve){
      dlgEl.querySelector('#rb-ok').onclick = function(){ confirmed = true; document.body.removeChild(dlgEl); resolve(); };
      dlgEl.querySelector('#rb-cancel').onclick = function(){ document.body.removeChild(dlgEl); resolve(); };
      dlgEl.querySelector('.change-rollback-dialog').onclick = function(e){ if(e.target===dlgEl.querySelector('.change-rollback-dialog')){ document.body.removeChild(dlgEl); resolve(); } };
    });
    if(!confirmed) return;
    githubRollbackState = { running: true, message: '', error: '' };
    refreshSameTab('github');
    try{
      var response = await fetch(GITHUB_UPDATE_WORKER_URL + '/rollback', {
        method:'POST', headers:Object.assign({'Content-Type':'application/json'}, await githubAdminAuthHeaders(true)),
        body:JSON.stringify({ secret:secret, sha:sha })
      });
      var result = await response.json();
      if(result && result.ok){
        githubRollbackState = { running:false, message:'Zurückgesetzt auf '+result.shortSha+' — GitHub Action startet.', error:'' };
        githubCommitHistory = [];
        setTimeout(function(){ loadGithubCommitHistory(); }, 3000);
        // Symmetrisch zum Upload: denselben Status-Flow durchlaufen, nur mit direction='rollback'.
        var state = githubUpdateState;
        state.direction = 'rollback';
        state.uploadCommitSha = result.commitSha || result.sha || '';
        state.toVersion = result.targetVersion || '';
        state.actionStatus = '';
        state.actionConclusion = '';
        state.actionRunUrl = '';
        state.actionMessage = githubPhaseLabel('queued', 'rollback');
        state.actionStartedAt = Date.now();
        state.targetCommitted = false;
        state.liveReady = false;
        state.updateReady = false;
        state.pagesAvailable = false;
        state.pagesStatus = '';
        persistGithubUpdateSession();
        scheduleGithubActionPoll(4000);
      } else {
        githubRollbackState = { running:false, message:'', error:(result&&result.message)||'Rollback fehlgeschlagen.' };
      }
    }catch(e){ githubRollbackState = { running:false, message:'', error:'Netzwerkfehler.' }; }
    refreshGithubUpdatePanelIfVisible();
  }

  function githubTabBar(){
    var tab = githubUpdateState.panelTab || 'update';
    return '<div class="change-github-tabs">'
      + '<button class="change-github-tab'+(tab==='update'?' is-active':'')+'" id="github-tab-update" type="button">Update</button>'
      + '<button class="change-github-tab'+(tab==='history'?' is-active':'')+'" id="github-tab-history" type="button">Verlauf</button>'
      + '</div>';
  }

  function githubUpdateBody(){
    var state = githubUpdateState;
    var tab = state.panelTab || 'update';
    var selectedLabel = state.file ? esc(state.file.name)+' · '+Math.round((state.file.size || 0) / 1024)+' KB' : 'ZIP hier ablegen oder auswählen';
    var actionPanel = githubActionStatusPanel();
    var checks = actionPanel ? '' : githubCheckSummary();
    var statusLine = state.message && state.status !== 'ok' && !actionPanel ? '<div class="change-github-status '+esc(state.status || 'empty')+'">'+esc(state.message || '')+'</div>' : '';

    var updatePane = '<div class="change-github-upload-panel change-github-upload-panel-v226">'
      + '<div class="change-github-dropzone-wrap">'
      + '<label class="change-github-dropzone" id="github-zip-dropzone"><input type="file" id="github-zip-input" accept=".zip,application/zip,application/x-zip-compressed"><span>'+selectedLabel+'</span>'+(state.file ? '' : '<small>ZIP per Drag & Drop hier ablegen oder antippen.</small>')+'</label>'
      + (state.file ? '<button class="change-github-zip-clear" id="github-zip-clear" type="button" title="ZIP entfernen">×</button>' : '')
      + '</div>'
      + statusLine
      + (actionPanel ? '' : checks)
      + githubFileOverview()
      + ((!state.actionStartedAt && !state.actionMessage && !state.uploadCommitSha && !state.actionConclusion) ? '<button class="cs-btn-p" id="github-zip-commit" type="button" '+(state.status === 'ok' && !state.updateReady ? '' : 'disabled')+'>Auf GitHub übertragen</button>' : '')
      + '</div>';

    var historyPane = !readGithubUpdateSecret()
      ? '<div class="change-github-history-empty">Freigabe-Code eintragen, um den Verlauf zu laden.</div>'
      : '<div class="change-github-history-toolbar"><button class="change-github-history-refresh" id="github-history-refresh" type="button">↻ Laden</button></div>'
        + githubCommitHistoryPanel();

    return '<div class="change-github-update">'
      + '<label class="cs-secret"><span>Freigabe-Code</span><input type="text" id="github-update-secret" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Freigabe-Code eingeben" value="'+esc(readGithubUpdateSecret())+'"></label>'
      + (actionPanel || '')
      + githubTabBar()
      + '<div class="change-github-tabpane">'
      + (tab === 'history' ? historyPane : updatePane)
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
      return;
    }
    var secretInput = $('github-update-secret');
    var secret = secretInput ? String(secretInput.value || '').trim() : readGithubUpdateSecret();
    if(!secret){
      state.status = 'error';
      state.message = 'Bitte den Cloudflare Freigabe-Code eintragen.';
      refreshGithubUpdatePanelIfVisible();
      return;
    }
    writeGithubUpdateSecret(secret);
    state.status = 'checking';
    state.message = 'Update wird hochgeladen…';
    state.actionMessage = '';
    refreshSameTab('github');
    try{
      var buffer = state.fileBuffer || null;
      if(!buffer){
        try{ buffer = await state.file.arrayBuffer(); }
        catch(fileErr){ throw new Error('Datei konnte nicht gelesen werden. Bitte ZIP neu auswählen und direkt erneut übertragen.'); }
      }
      var payload = {
        secret: secret,
        fileName: state.fileName || state.file.name || ('change-update-'+Date.now()+'.zip'),
        contentBase64: arrayBufferToBase64(buffer),
        fromVersion: state.fromVersion || APP_VERSION,
        targetVersion: state.toVersion || '',
        fileSize: state.fileSize || state.file.size || buffer.byteLength || 0
      };
      var response = await fetch(GITHUB_UPDATE_WORKER_URL + '/upload', {
        method: 'POST',
        headers: Object.assign({'Content-Type':'application/json'}, await githubAdminAuthHeaders(true)),
        body: JSON.stringify(payload)
      });
      var result = null;
      try{ result = await response.json(); }catch(parseErr){}
      if(!response.ok || !result || !result.ok){
        throw new Error((result && result.message) || ('Worker Fehler '+response.status));
      }
      state.status = 'ok';
      state.message = '';
      state.direction = 'update';
      state.uploadCommitSha = result.commitSha || '';
      state.actionRunUrl = result.actionsUrl || '';
      state.actionStatus = 'queued';
      state.actionConclusion = '';
      state.actionMessage = githubPhaseLabel('queued', 'update');
      state.actionCheckedAt = '';
      state.actionStartedAt = Date.now();
      state.branchCommitSha = '';
      state.branchVersion = '';
      state.targetCommitted = false;
      state.liveVersion = '';
      state.liveReady = false;
      state.lastRunId = '';
      state.updateReady = false;
      state.pagesAvailable = false;
      state.pagesStatus = '';
      persistGithubUpdateSession();
      scheduleGithubActionPoll(2500);
    }catch(e){
      state.status = 'error';
      state.message = githubFriendlyError(e && e.message ? e.message : 'Übertragung fehlgeschlagen.');
      state.actionMessage = state.message;
      persistGithubUpdateSession();
    }
    refreshGithubUpdatePanelIfVisible();
  }
  async function fetchGithubRepoFiles(){
    try{
      var response = await fetch(GITHUB_UPDATE_WORKER_URL + '/files', {cache:'no-store', headers: await githubAdminAuthHeaders(false)});
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
      state.fileBuffer = buffer;
      state.fileName = state.file.name || state.fileName || '';
      state.fileSize = state.file.size || buffer.byteLength || state.fileSize || 0;
      var zip = parseZipDirectory(buffer);
      var entries = zip.entries.filter(function(entry){ return !entry.isDirectory; });
      var paths = entries.map(function(entry){ return entry.path; }).filter(Boolean).sort();
      var byPath = {};
      entries.forEach(function(entry){ byPath[entry.path] = entry; });
      var duplicates = [];
      var seen = {};
      paths.forEach(function(path){ if(seen[path]) duplicates.push(path); seen[path] = true; });
      var allowedRootFiles = {'CHANGELOG.md':1,'CLAUDE.md':1,'app.js':1,'change-pre.js':1,'change-post.js':1,'change.css':1,'firebase-messaging-sw.js':1,'firebase.json':1,'index.html':1,'manifest.json':1};
      var allowedRootDirs = {'core':1,'features':1,'firebase':1,'icons':1,'styles':1,'public':1,'components':1,'.github':1,'scripts':1,'updates':1,'docs':1};
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
        {ok: !!versionHigher, label:'Zielversion', detail: nextVersion ? nextVersion : 'Keine Zielversion erkannt.'},
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
      state.message = ok ? '' : 'ZIP braucht noch Korrekturen.';
    }catch(e){
      state.status = 'error';
      state.message = githubFriendlyError(e && e.message ? e.message : 'ZIP konnte nicht geprüft werden.');
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
    return '<div class="cs-chip-n"><span>♡</span><strong>Status offen</strong></div>';
  }

  function settingsHeroArtSvg(){
    return '<svg class="settings-hero-illustration" viewBox="0 0 160 160" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round" stroke-linejoin="round">'
      + '<circle cx="74" cy="80" r="40" stroke="#2F5C44" stroke-width="3" opacity=".55"/>'
      + '<circle cx="74" cy="80" r="28" stroke="#7DE6AB" stroke-width="3" opacity=".7"/>'
      + '<g stroke="#7DE6AB" stroke-width="3"><circle cx="74" cy="80" r="13"/><path d="M74 60 V67 M74 93 V100 M54 80 H61 M87 80 H94 M60 66 l5 5 M83 89 l5 5 M88 66 l-5 5 M65 89 l-5 5"/></g>'
      + '<circle cx="74" cy="80" r="4.5" fill="#7DE6AB"/>'
      + '<circle cx="116" cy="48" r="9" stroke="#7DE6AB" stroke-width="2.6" opacity=".8"/>'
      + '<circle cx="116" cy="48" r="2.4" fill="#7DE6AB"/>'
      + '<g fill="#9FE8C0" opacity=".7"><circle cx="40" cy="116" r="2.2"/><circle cx="120" cy="118" r="1.8"/><circle cx="36" cy="56" r="1.6"/></g>'
      + '</svg>';
    return '<svg class="settings-hero-illustration" viewBox="0 0 220 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
      + '<defs>'
      + '<linearGradient id="set-cog-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4ade80" stop-opacity="0.85"/><stop offset="1" stop-color="#166534" stop-opacity="0.35"/></linearGradient>'
      + '</defs>'
      // Großes Zahnrad
      + '<circle cx="105" cy="108" r="30" fill="none" stroke="url(#set-cog-grad)" stroke-width="5" opacity="0.55"/>'
      + '<circle cx="105" cy="108" r="14" fill="none" stroke="url(#set-cog-grad)" stroke-width="3.5" opacity="0.5"/>'
      // Zahnrad-Zähne (8 Stück)
      + '<rect x="101" y="68" width="8" height="14" rx="3" fill="url(#set-cog-grad)" opacity="0.45"/>'
      + '<rect x="101" y="134" width="8" height="14" rx="3" fill="url(#set-cog-grad)" opacity="0.45"/>'
      + '<rect x="65" y="104" width="14" height="8" rx="3" fill="url(#set-cog-grad)" opacity="0.45"/>'
      + '<rect x="131" y="104" width="14" height="8" rx="3" fill="url(#set-cog-grad)" opacity="0.45"/>'
      + '<rect x="74" y="77" width="8" height="14" rx="3" transform="rotate(45 78 84)" fill="url(#set-cog-grad)" opacity="0.38"/>'
      + '<rect x="122" y="77" width="8" height="14" rx="3" transform="rotate(-45 126 84)" fill="url(#set-cog-grad)" opacity="0.38"/>'
      + '<rect x="74" y="117" width="8" height="14" rx="3" transform="rotate(-45 78 124)" fill="url(#set-cog-grad)" opacity="0.38"/>'
      + '<rect x="122" y="117" width="8" height="14" rx="3" transform="rotate(45 126 124)" fill="url(#set-cog-grad)" opacity="0.38"/>'
      // Kleines Zahnrad oben rechts
      + '<circle cx="158" cy="62" r="17" fill="none" stroke="rgba(74,222,128,0.3)" stroke-width="3.5"/>'
      + '<circle cx="158" cy="62" r="8" fill="none" stroke="rgba(74,222,128,0.28)" stroke-width="2.5"/>'
      + '<rect x="155" y="41" width="6" height="10" rx="2" fill="rgba(74,222,128,0.28)"/>'
      + '<rect x="155" y="73" width="6" height="10" rx="2" fill="rgba(74,222,128,0.28)"/>'
      + '<rect x="137" y="59" width="10" height="6" rx="2" fill="rgba(74,222,128,0.28)"/>'
      + '<rect x="169" y="59" width="10" height="6" rx="2" fill="rgba(74,222,128,0.28)"/>'
      // Verbindungslinie
      + '<line x1="141" y1="79" x2="130" y2="90" stroke="rgba(74,222,128,0.18)" stroke-width="1.5"/>'
      // Kleine Punkte
      + '<circle cx="62" cy="155" r="3" fill="rgba(74,222,128,0.3)"/>'
      + '<circle cx="72" cy="168" r="2" fill="rgba(74,222,128,0.2)"/>'
      + '<circle cx="165" cy="148" r="2.5" fill="rgba(74,222,128,0.22)"/>'
      + '</svg>';
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
      + '<em>'+(googleLoggedIn ? 'Angemeldet' : 'Nicht angem.')+'</em>'
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
      '',
      '',
      '<button class="cs-btn" onclick="window.installChangeApp&&window.installChangeApp()">Change als App installieren</button>'
    );
    var versionCard = '<div class="cs-mod">'
      + '<div class="cs-modhead">'
      + '<div class="cs-ava"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg></div>'
      + '<div class="cs-mod-copy"><span class="cs-mod-title">Change</span><div class="cs-mod-sub">Kalender, Challenges und Sync</div></div>'
      + '<span style="font-family:var(--mono);font-size:13px;font-weight:700;color:#9CEFBE">'+esc(APP_VERSION)+'</span>'
      + '</div>'
      + '<div style="margin-top:13px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:11px 14px">'
      + '<span class="cs-secl" style="margin:0">Installationsstatus</span>'
      + '<strong style="font-size:12.5px;font-weight:800;color:#F2F5F1">'+esc(installed)+'</strong>'
      + '</div>'
      + '</div>';
    // Darstellung hat eigenen Tab — kein doppelter Block in appPane
    var dataAuditCard = settingsFeatureCard(
      'DB',
      'Daten-Audit',
      dataAuditExpanded ? 'GEPRUEFT' : 'BEREIT',
      dataAuditExpanded ? 'ok' : 'off',
      'Lokaler Read-only-Ueberblick ueber Events, Punkte, Challenges und Settings.',
      '',
      dataAuditBody(dataAuditExpanded)
    );
    var health = '';
    if(window.ChangeAppStatus && window.ChangeAppStatus.healthHtml){
      var healthBody = appHealthExpanded
        ? window.ChangeAppStatus.healthHtml() + '<button class="cs-btn" id="run-app-health" type="button">Erneut prüfen</button>'
        : '<div class="cs-note">Der Check wird erst angezeigt, wenn du ihn bewusst startest.</div><button class="cs-btn" id="run-app-health" type="button">App-Gesundheitscheck prüfen</button>';
      health = settingsFeatureCard('🩺', 'App-Gesundheitscheck', appHealthExpanded ? 'GEPRÜFT' : 'BEREIT', appHealthExpanded ? 'ok' : 'off', '', '', healthBody);
    }
    return '<div class="cs-stack">' + installCard + dataAuditCard + health + '</div>';
  }
  function githubPane(){
    if(!isGithubAdmin()){
      return '<div class="cs-stack"><div class="cs-note">GitHub-Updates sind nur fuer Admins freigegeben.</div></div>';
    }
    return '<div class="cs-stack">' + githubUpdateCard() + '</div>';
  }

  var currentSettingsTab = 'dashboard';
  var appHealthExpanded = false;
  var dataAuditExpanded = false;
  var settingsScrollState = null;
  function allowedSettingsTabs(){
    var tabs = ['profil','darstellung','push','dashboard','calendar','challenges','sync','app'];
    if(isGithubAdmin()) tabs.push('github');
    return tabs;
  }
  function settingsTabAllowed(tab){
    return allowedSettingsTabs().indexOf(tab) >= 0;
  }
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
    var iconHtml = iconMarkup(icon);
    var isImg = iconHtml.indexOf('<img') === 0;
    return '<button class="change-settings-navitem '+(active===id?'active':'')+'" type="button" data-settings-tab="'+id+'">'
      + (isImg ? '<span style="display:flex;align-items:center;width:18px;height:18px">'+iconHtml+'</span>' : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"></svg>')
      + esc(title)
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
      if(content){ ['display','visibility','opacity','grid-column','grid-row','width','height','min-height','overflow','overflow-y','overflow-x','position','z-index','padding'].forEach(function(prop){ content.style.removeProperty(prop); }); }
      var view = document.getElementById('settings-view');
      if(view){ ['display','visibility','opacity','width','height','min-height','overflow','overflow-y','overflow-x','padding-bottom','flex','flex-direction'].forEach(function(prop){ view.style.removeProperty(prop); }); }
      ['dashboard-view','cal-body','challenges-view','pollen-view','cal-controls','fab'].forEach(function(id){
        var el = document.getElementById(id);
        if(el) el.style.removeProperty('display');
      });
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
    startTab = settingsTabAllowed(startTab) ? startTab : (settingsTabAllowed(currentSettingsTab) ? currentSettingsTab : 'dashboard');
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
      + (isGithubAdmin() ? settingsNavCard('github',githubIcon(),'GitHub','Admin',startTab) : '');
    function navItem(id, svgPath, label){
      return '<button class="change-settings-navitem '+(startTab===id?'active':'')+'" type="button" data-settings-tab="'+id+'">'
        + svgPath + esc(label)
        + '</button>';
    }
    var svgProfil   = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>';
    var svgDarst    = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3 a9 9 0 0 1 0 18 z" fill="currentColor" stroke="none"/></svg>';
    var svgPush     = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
    var svgDash     = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>';
    var svgCal      = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>';
    var svgCh       = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/><path d="M9 20h6M12 14v6"/></svg>';
    var svgSync     = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"/></svg>';
    var svgApp      = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg>';
    var html = '<div class="change-settings-premium">'
      + '<div class="change-settings-page-head">'
      + '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
      + '<span class="change-settings-page-title">Einstellungen</span>'
      + '<span class="change-settings-page-version">v'+esc(APP_VERSION)+'</span>'
      + '</div>'
      + '<div class="change-settings-shell">'
      + '<nav class="change-settings-rail">'
      + navItem('profil', svgProfil, 'Profil')
      + navItem('darstellung', svgDarst, 'Darstellung')
      + navItem('push', svgPush, 'Benachrichtigungen')
      + '<div class="change-settings-rail-sep"></div>'
      + navItem('dashboard', svgDash, 'Dashboard')
      + navItem('calendar', svgCal, 'Kalender')
      + navItem('challenges', svgCh, 'Challenges')
      + navItem('sync', svgSync, 'Daten &amp; Sync')
      + navItem('app', svgApp, 'App &amp; Sicherheit')
      + (isGithubAdmin() ? navItem('github', githubIcon(), 'GitHub') : '')
      + '</nav>'
      + '<div class="change-settings-panel">'
      + '<div class="change-settings-panel-glow"></div>'
      + '<div class="change-settings-panel-inner">'
      + '<div class="change-settings-pane '+(startTab==='profil'?'active':'')+'" data-pane="profil"><div class="change-settings-ptitle">Profil</div>'+profilPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='darstellung'?'active':'')+'" data-pane="darstellung"><div class="change-settings-ptitle">Darstellung</div>'+darstellungPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='push'?'active':'')+'" data-pane="push"><div class="change-settings-ptitle">Benachrichtigungen</div>'+pushPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='dashboard'?'active':'')+'" data-pane="dashboard"><div class="change-settings-ptitle">Dashboard</div>'+dashboardPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='calendar'?'active':'')+'" data-pane="calendar"><div class="change-settings-ptitle">Kalender</div>'+calendarPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='challenges'?'active':'')+'" data-pane="challenges"><div class="change-settings-ptitle">Challenges</div>'+challengesPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='sync'?'active':'')+'" data-pane="sync"><div class="change-settings-ptitle">Daten &amp; Sync</div>'+syncPane()+'</div>'
      + '<div class="change-settings-pane '+(startTab==='app'?'active':'')+'" data-pane="app"><div class="change-settings-ptitle">App &amp; Sicherheit</div>'+appPane()+'</div>'
      + (isGithubAdmin() ? '<div class="change-settings-pane '+(startTab==='github'?'active':'')+'" data-pane="github"><div class="change-settings-ptitle">GitHub</div>'+githubPane()+'</div>' : '')
      + '</div></div></div></div>';
    activateSettingsView(html);
    restoreSettingsScrollState(scrollBeforeRender);
    setTimeout(bindSettings, 30);
  }
  function refreshSameTab(tab){
    if(tab && settingsTabAllowed(tab)) currentSettingsTab = tab;
    var active = document.querySelector('.change-settings-tab.active');
    var next = active ? active.getAttribute('data-settings-tab') : currentSettingsTab;
    openSettingsPanel(settingsTabAllowed(next) ? next : 'dashboard');
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
    if(!window.__changeSettingsSnapshotPanelHook){
      window.__changeSettingsSnapshotPanelHook = true;
      document.addEventListener('change', function(event){
        var target = event && event.target;
        if(!target || !target.id) return;
        if(/^set-/.test(target.id)) markSettingsSnapshotChanged('settings-panel');
      }, true);
      document.addEventListener('click', function(event){
        var target = event && event.target;
        if(!target) return;
        var inSettings = target.closest && target.closest('#settings-view');
        if(inSettings && (target.hasAttribute('data-remove-half') || target.getAttribute('data-change-theme'))) markSettingsSnapshotChanged('settings-panel');
      }, true);
    }
    document.querySelectorAll('[data-settings-tab]').forEach(function(btn){
      btn.addEventListener('click', function(ev){
        if(ev) ev.preventDefault();
        var nextTab = btn.getAttribute('data-settings-tab') || currentSettingsTab;
        currentSettingsTab = settingsTabAllowed(nextTab) ? nextTab : 'dashboard';
        openSettingsPanel(currentSettingsTab);
      });
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
    document.querySelectorAll('[data-change-theme]').forEach(function(btn){ btn.addEventListener('click', function(){ setAppTheme(btn.getAttribute('data-change-theme') || 'system'); refreshSameTab('darstellung'); }); });
    document.querySelectorAll('[data-change-accent]').forEach(function(btn){ btn.addEventListener('click', function(){ setAppAccent(btn.getAttribute('data-change-accent') || 'green'); refreshSameTab('darstellung'); }); });
    var btnSignout = document.getElementById('btn-profile-signout');
    if(btnSignout) btnSignout.addEventListener('click', function(){ try{ if(typeof signOut==='function') signOut(); else if(window.firebase&&firebase.auth) firebase.auth().signOut(); }catch(e){} });
    var btnPushTest = document.getElementById('btn-push-test');
    if(btnPushTest) btnPushTest.addEventListener('click', function(){ try{ if(window.ChangeNotificationStore&&window.ChangeNotificationStore.sendTest) window.ChangeNotificationStore.sendTest(); }catch(e){} });
    var setHolidayPush = document.getElementById('set-holiday-push');
    if(setHolidayPush) setHolidayPush.addEventListener('change', function(){ writeBool('change_v1_holiday_notifications', setHolidayPush.checked); markSettingsSnapshotChanged('settings-panel'); });
    var setPushMaster = document.getElementById('set-push');
    if(setPushMaster) setPushMaster.addEventListener('change', function(){ try{ if(window.ChangeNotificationStore&&window.ChangeNotificationStore.toggle) window.ChangeNotificationStore.toggle(setPushMaster.checked); }catch(e){} });
    var runDataAudit = $('run-data-audit'); if(runDataAudit) runDataAudit.addEventListener('click', function(){ dataAuditExpanded = true; refreshSameTab('app'); });
    var runHealth = $('run-app-health'); if(runHealth) runHealth.addEventListener('click', function(){ appHealthExpanded = true; refreshSameTab('app'); });
    function setGithubZipFile(file){
      githubUpdateState.file = file || null;
      githubUpdateState.fileBuffer = null;
      githubUpdateState.fileName = file && file.name ? file.name : '';
      githubUpdateState.fileSize = file && file.size ? file.size : 0;
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
      clearGithubUpdateSession();
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
    var githubHistoryRefresh = $('github-history-refresh'); if(githubHistoryRefresh) githubHistoryRefresh.addEventListener('click', function(){ loadGithubCommitHistory(); });
    var githubHistoryMore = $('github-history-more'); if(githubHistoryMore) githubHistoryMore.addEventListener('click', function(){ githubCommitHistoryVisible += 5; refreshSameTab('github'); });
    var githubTabUpdate = $('github-tab-update'); if(githubTabUpdate) githubTabUpdate.addEventListener('click', function(){ githubUpdateState.panelTab = 'update'; refreshSameTab('github'); });
    var githubTabHistory = $('github-tab-history'); if(githubTabHistory) githubTabHistory.addEventListener('click', function(){ githubUpdateState.panelTab = 'history'; if(!githubCommitHistory.length && !githubCommitHistoryLoading) loadGithubCommitHistory(); else refreshSameTab('github'); });
    var githubZipClear = $('github-zip-clear'); if(githubZipClear) githubZipClear.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      githubUpdateState.file = null; githubUpdateState.fileBuffer = null; githubUpdateState.status = 'empty'; githubUpdateState.message = '';
      githubUpdateState.actionConclusion = ''; githubUpdateState.actionStartedAt = 0; githubUpdateState.actionMessage = ''; githubUpdateState.uploadCommitSha = '';
      githubUpdateState.actionStatus = ''; githubUpdateState.actionRunUrl = ''; githubUpdateState.updateReady = false; githubUpdateState.liveReady = false;
      stopGithubActionPolling(); clearGithubUpdateSession();
      var inp = $('github-zip-input'); if(inp) inp.value = ''; refreshGithubUpdatePanelIfVisible();
    });
    document.querySelectorAll('.change-github-rollback-link:not(:disabled)').forEach(function(btn){
      btn.addEventListener('click', function(){
        rollbackToCommit(btn.getAttribute('data-sha') || '', btn.getAttribute('data-msg') || '');
      });
    });
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

  // Nur einen bereits bewusst gestarteten Deploy wieder aufnehmen. Kein Firebase-Login,
  // kein Datenbank-Sync und keine sichtbare Benachrichtigung werden dadurch ausgeloest.
  setTimeout(function(){
    if(!restoreGithubUpdateSession()) return;
    if(!githubUpdateState.updateReady && !(githubUpdateState.actionConclusion && githubUpdateState.actionConclusion !== 'success')){
      scheduleGithubActionPoll(1200);
    }
    refreshGithubUpdatePanelIfVisible();
  }, 0);

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
