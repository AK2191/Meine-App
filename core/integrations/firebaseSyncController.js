/* Change App · Firebase Sync Controller
 * Zentrale, manuell gestartete Firestore-Verbindung.
 * Startet niemals automatisch nach Google-Login.
 * Sichtbarer Einstiegspunkt ist ausschließlich der Datenbank-Sync-Schalter.
 * Legacy-Namen wie setLiveSyncEnabled bleiben nur intern kompatibel.
 */
(function(){
  'use strict';

  var db = null;
  var enabling = false;
  var oldSetLiveSyncEnabled = null;

  function toastMsg(message, type){
    try{ if(typeof toast === 'function') toast(message, type || ''); }catch(e){}
  }
  function readJson(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    }catch(e){ return fallback; }
  }
  function writeJson(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }
  function readChallengeDifficulty(){
    try{ if(window.ChangeChallengeDifficulty && window.ChangeChallengeDifficulty.get) return window.ChangeChallengeDifficulty.get(); }catch(e){}
    return String(readJson('change_v1_challenge_difficulty', readJson('challenge_difficulty', 'easy')) || 'easy').toLowerCase();
  }
  function readAutoChallengeCount(){
    try{ if(window.ChangeChallengeDifficulty && window.ChangeChallengeDifficulty.getDailyCount) return window.ChangeChallengeDifficulty.getDailyCount(); }catch(e){}
    return parseInt(readJson('change_v1_auto_challenge_count', readJson('auto_challenge_count', 7)), 10) || 7;
  }
  function writeDatabaseSyncState(enabled){
    writeJson('database_sync_enabled', !!enabled);
    writeJson('change_v1_database_sync_enabled', !!enabled);
    // Legacy-Keys bleiben erhalten, damit bestehende interne Module nicht brechen.
    writeJson('live_sync_enabled', !!enabled);
    writeJson('change_v1_live_sync_enabled', !!enabled);
    try{ if(typeof ls === 'function') ls('live_sync_enabled', !!enabled); }catch(e){}
    try{ if(typeof ls === 'function') ls('database_sync_enabled', !!enabled); }catch(e){}
  }
  function cfgValid(){
    var cfg = window.FIREBASE_CONFIG || {};
    return !!(window.firebase && cfg.apiKey && !String(cfg.apiKey).includes('HIER_') && cfg.projectId && firebase.auth && firebase.firestore);
  }
  function safeDocId(id){
    return String(id || 'unknown').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_') || 'unknown';
  }
  function isEmail(value){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }
  function storedUser(){
    var out = {};
    ['change_v1_user_info','user_info','user_info_safe','change_v1_user_info_safe'].forEach(function(key){
      var item = readJson(key, null);
      if(item && typeof item === 'object') out = Object.assign(out, item);
    });
    try{ if(window.userInfo) out = Object.assign(out, window.userInfo); }catch(e){}
    try{ if(typeof userInfo !== 'undefined' && userInfo) out = Object.assign(out, userInfo); }catch(e){}
    return out;
  }
  function account(){
    var fu = null;
    try{ fu = firebase.auth().currentUser; }catch(e){}
    var local = storedUser();
    var email = String((fu && fu.email) || local.email || local.mail || '').trim().toLowerCase();
    var uid = String((fu && fu.uid) || local.uid || local.id || '').trim();
    var name = String((fu && fu.displayName) || local.name || local.displayName || '').trim();
    var picture = String((fu && fu.photoURL) || local.picture || local.photoURL || '').trim();
    if(!name && email) name = email.split('@')[0];
    var info = { email: email, uid: uid, name: name || email || 'Mitspieler', picture: picture };
    if(isEmail(email)){
      try{ window.userInfo = Object.assign({}, window.userInfo || {}, info); }catch(e){}
      try{ if(typeof userInfo !== 'undefined') userInfo = Object.assign({}, userInfo || {}, info); }catch(e){}
      writeJson('change_v1_user_info', info);
      writeJson('user_info', info);
      writeJson('user_info_safe', {name:info.name,email:info.email,picture:info.picture});
      try{ localStorage.setItem('change_v1_user_email', email); localStorage.setItem('user_email', email); }catch(e){}
    }
    return { ready: isEmail(email), id: email || uid, email: email, uid: uid, name: info.name, picture: picture };
  }
  async function ensureDb(interactive){
    if(!cfgValid()){
      toastMsg('Firebase-Konfiguration oder SDK fehlt.', 'err');
      return null;
    }
    try{
      if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      if(window.ensureChangeFirebaseAuth){
        var ok = await window.ensureChangeFirebaseAuth({
          interactive: interactive === true,
          silent: interactive !== true,
          waitMs: interactive === true ? 2500 : 1500
        });
        if(!ok) return null;
      }
      db = firebase.firestore();
      return db;
    }catch(e){
      console.warn('Firebase Sync Controller init:', e);
      toastMsg('Firebase konnte nicht verbunden werden: ' + (e.message || e), 'err');
      return null;
    }
  }
  function currentChallenges(){
    try{ if(Array.isArray(window.challenges)) return window.challenges; }catch(e){}
    try{ if(typeof challenges !== 'undefined' && Array.isArray(challenges)) return challenges; }catch(e){}
    return readJson('change_v1_challenges', readJson('challenges', [])) || [];
  }
  function ensureAutoChallengesForToday(){
    try{
      if(window.ChangeChallengeDifficulty && typeof window.ChangeChallengeDifficulty.ensureDailyState === 'function'){
        var d = new Date();
        var day = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        window.ChangeChallengeDifficulty.ensureDailyState(day, readChallengeDifficulty(), {persist:true});
      }else if(typeof window.ensureDailyAutoChallenges === 'function'){
        window.ensureDailyAutoChallenges();
      }
    }catch(e){ console.warn('Auto-Challenge Tagesplan:', e); }
  }
  function currentCompletions(){
    var list = [];
    try{ if(Array.isArray(window.challengeCompletions)) list = list.concat(window.challengeCompletions); }catch(e){}
    try{ if(typeof challengeCompletions !== 'undefined' && Array.isArray(challengeCompletions)) list = list.concat(challengeCompletions); }catch(e){}
    ['change_v1_challenge_completions','challenge_completions','challengeCompletions'].forEach(function(key){
      var arr = readJson(key, []);
      if(Array.isArray(arr)) list = list.concat(arr);
    });
    var out = [], seen = new Set();
    list.forEach(function(item){
      if(!item || typeof item !== 'object') return;
      var key = String(item.id || '') + '|' + String(item.challengeId || '') + '|' + String(item.date || '');
      if(seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }
  async function ensurePlayer(database){
    var me = account();
    if(!database || !me.ready) return false;
    var difficulty = readChallengeDifficulty();
    var autoCount = readAutoChallengeCount();
    var plan = null;
    try{
      if(window.ChangeChallengeDifficulty && typeof window.ChangeChallengeDifficulty.normalizePlayerPlan === 'function'){
        plan = window.ChangeChallengeDifficulty.normalizePlayerPlan({challengeDifficulty:difficulty, autoChallengeCount:autoCount});
      }
    }catch(e){}
    var payload = {
      id: me.email,
      email: me.email,
      uid: me.uid || '',
      name: me.name || me.email.split('@')[0],
      picture: me.picture || '',
      online: true,
      databaseSyncEnabled: true,
      liveSyncEnabled: true,
      challengeDifficulty: difficulty,
      challengeDifficultyLabel: plan ? plan.difficultyLabel : '',
      autoChallengeCount: autoCount,
      weeklyTargetContribution: plan ? plan.targetContribution : null,
      weeklyPointPotential: plan ? plan.weeklyPotential : null,
      app: 'Change',
      updatedAtLocal: new Date().toISOString(),
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try{
      await database.collection('change_players').doc(safeDocId(me.email)).set(payload, {merge:true});
      try{
        window.challengePlayers = Array.isArray(window.challengePlayers) ? window.challengePlayers : [];
        var idx = window.challengePlayers.findIndex(function(p){ return String(p.email || p.id || '').toLowerCase() === me.email; });
        var local = {id:me.email,email:me.email,name:payload.name,picture:payload.picture,online:true};
        if(idx >= 0) window.challengePlayers[idx] = Object.assign({}, window.challengePlayers[idx], local);
        else window.challengePlayers.push(local);
        if(typeof challengePlayers !== 'undefined') challengePlayers = window.challengePlayers;
        if(typeof ls === 'function') ls('challenge_players', window.challengePlayers);
      }catch(e){}
      return true;
    }catch(e){
      console.warn('Firebase Sync Controller player:', e);
      toastMsg('Mitspieler konnte nicht in Firebase gespeichert werden.', 'err');
      return false;
    }
  }
  function readDatabaseSyncEnabled(){
    var direct = readJson('database_sync_enabled', null);
    if(direct === true || direct === false) return direct;
    direct = readJson('change_v1_database_sync_enabled', null);
    if(direct === true || direct === false) return direct;
    return readJson('live_sync_enabled', false) === true || readJson('change_v1_live_sync_enabled', false) === true;
  }
  function fallbackSettingsPayload(){
    var me = account();
    var weatherSettings = readJson('change_v1_weather_settings', {}) || {};
    var calendarOptions = readJson('change_v1_calendar_view_options', readJson('calendar_settings', {})) || {};
    return {
      schema: 1,
      owner: {email: me.email, uid: me.uid || '', name: me.name || ''},
      calendar: {
        holidayState: String(localStorage.getItem('change_v1_holiday_state') || localStorage.getItem('holiday_state') || 'ALL').replace(/^"|"$/g,''),
        holidayNotifications: readJson('change_v1_holiday_notifications', readJson('holiday_notifications', true)) !== false,
        showHolidays: calendarOptions.showHolidays !== false,
        showChallengeDots: calendarOptions.showChallengeDots !== false,
        showWeekNumbers: calendarOptions.showWeekNumbers === true
      },
      weather: weatherSettings,
      dashboard: {
        friseurEnabled: String(localStorage.getItem('change_v1_friseur_enabled') || 'false') === 'true',
        friseurWeeks: parseInt(localStorage.getItem('change_v1_friseur_weeks'), 10) || 3,
        birthdaysEnabled: String(localStorage.getItem('change_v1_birthdays_enabled') || localStorage.getItem('birthdays_enabled') || 'true') !== 'false',
        urlaubEnabled: String(localStorage.getItem('urlaub_tracker_on') || 'true') !== 'false',
        urlaubTotalDays: parseInt(localStorage.getItem('urlaub_tracker_days'), 10) || 30,
        urlaubHalfDays: readJson('urlaub_half_days', []) || []
      },
      sync: {
        databaseSyncEnabled: true,
        liveSyncEnabled: true,
        pushPreferenceEnabled: readJson('change_v1_push_enabled', false) === true,
        autoChallengesEnabled: readJson('change_v1_auto_challenges_enabled', readJson('auto_challenges_enabled', true)) !== false,
        autoChallengeCount: readAutoChallengeCount(),
        challengeDifficulty: readChallengeDifficulty(),
        groupGoalMode: 'dynamic',
        googleCalendarSyncEnabled: String(localStorage.getItem('change_v1_google_calendar_sync') || 'true') !== 'false'
      },
      google: {
        clientId: (typeof getGoogleClientId === 'function' ? getGoogleClientId() : '') || ''
      },
      updatedAtLocal: new Date().toISOString(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }
  async function ensureSettings(database){
    var me = account();
    if(!database || !me.ready) return false;
    try{
      if(typeof window.saveChangeSettings === 'function'){
        var saved = await window.saveChangeSettings(true);
        if(saved) return true;
      }
      await database.collection('change_settings').doc(safeDocId(me.email)).set(fallbackSettingsPayload(), {merge:true});
      return true;
    }catch(e){
      console.warn('Firebase Sync Controller settings:', e);
      toastMsg('Einstellungen konnten nicht in Firebase gespeichert werden.', 'err');
      return false;
    }
  }
  function todayKey(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function challengeDocDate(ch){
    if(!ch) return '';
    var direct = String(ch.generatedFor || ch.date || ch.startDate || '').slice(0,10);
    if(direct) return direct;
    var m = String(ch.id || '').match(/^auto_(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }
  function isOptionalChallenge(ch){
    return !!(ch && (ch.optional === true || ch._optional === true || /^opt_/i.test(String(ch.id || ''))));
  }
  function isAutoChallenge(ch){
    var id = String(ch && ch.id || '');
    return !!(ch && (ch.auto === true || ch.source === 'auto' || ch.generatedFor || /^auto_\d{4}-\d{2}-\d{2}/.test(id) || /^auto_.*_sport_/.test(id)));
  }
  function shouldPublishChallenge(ch){
    if(!ch || !ch.id || ch.active === false || isOptionalChallenge(ch)) return false;
    if(!isAutoChallenge(ch)) return true;
    var day = todayKey();
    if(challengeDocDate(ch) !== day) return false;
    try{
      if(window.ChangeChallengeDifficulty && typeof window.ChangeChallengeDifficulty.isManagedAutoChallenge === 'function'){
        return window.ChangeChallengeDifficulty.isManagedAutoChallenge(ch, day) === true;
      }
    }catch(e){}
    return true;
  }
  function filteredChallengesForPublish(){
    ensureAutoChallengesForToday();
    var list = currentChallenges().filter(shouldPublishChallenge);
    var seen = new Set();
    return list.filter(function(ch){
      var id = String(ch.id || '');
      if(!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  async function cleanupOldAutoChallengeDocs(database){
    if(!database) return;
    var day = todayKey();
    var refs = new Map();
    async function collect(query){
      try{
        var snap = await query.limit(250).get();
        snap.forEach(function(doc){
          var data = doc.data() || {};
          var docDate = challengeDocDate(Object.assign({id:doc.id}, data));
          if(docDate && docDate !== day) refs.set(doc.id, doc.ref);
        });
      }catch(e){}
    }
    try{
      await collect(database.collection('change_challenges').where('source','==','auto'));
      await collect(database.collection('change_challenges').where('auto','==',true));
      if(!refs.size) return;
      var batch = database.batch();
      var count = 0;
      refs.forEach(function(ref){
        if(count >= 450) return;
        batch.delete(ref);
        count++;
      });
      if(count) await batch.commit();
    }catch(e){ console.warn('Firebase Sync Controller auto cleanup:', e); }
  }
  function challengePayload(ch){
    return {
      id: String(ch.id),
      title: ch.title || ch.name || 'Challenge',
      desc: ch.desc || ch.description || '',
      points: parseInt(ch.points, 10) || 0,
      icon: ch.icon || '🏆',
      url: ch.url || ch.link || ch.youtubeUrl || '',
      source: ch.source || (ch.auto === true ? 'auto' : ''),
      sourceId: ch.sourceId || ch.templateId || '',
      templateId: ch.templateId || ch.sourceId || '',
      difficulty: ch.difficulty || readChallengeDifficulty(),
      difficultyLabel: ch.difficultyLabel || ch.level || '',
      generatedFor: ch.generatedFor || ch.date || ch.startDate || '',
      generationKey: ch.generationKey || '',
      autoVersion: ch.autoVersion || '',
      sortIndex: ch.sortIndex != null ? ch.sortIndex : null,
      auto: ch.auto === true,
      type: ch.type || 'Sport',
      date: ch.date || ch.startDate || ch.generatedFor || '',
      recurrence: ch.recurrence || 'once',
      active: ch.active !== false,
      updatedAtLocal: new Date().toISOString(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }
  async function publishChallengeTemplates(database){
    if(!database) return false;
    var list = filteredChallengesForPublish();
    await cleanupOldAutoChallengeDocs(database);
    if(!list.length) return true;
    var seen = new Set();
    try{
      for(var i=0; i<list.length; i++){
        var ch = list[i];
        var id = String(ch.id);
        if(seen.has(id)) continue;
        seen.add(id);
        await database.collection('change_challenges').doc(id).set(challengePayload(ch), {merge:true});
      }
      return true;
    }catch(e){
      console.warn('Firebase Sync Controller challenges:', e);
      return false;
    }
  }

  async function publishOwnCompletions(database){
    var me = account();
    if(!database || !me.ready) return false;
    var list = currentCompletions().filter(function(c){ return c && c.id && c.challengeId; }).slice(0, 500);
    try{
      for(var i=0; i<list.length; i++){
        var c = list[i];
        var email = String(c.email || c.userEmail || c.playerId || me.email).toLowerCase();
        if(!isEmail(email)) email = me.email;
        if(email !== me.email) continue;
        await database.collection('change_completions').doc(String(c.id)).set(Object.assign({}, c, {
          playerId: me.email,
          userEmail: me.email,
          email: me.email,
          userId: me.uid || me.email,
          playerName: me.name || me.email.split('@')[0],
          createdAtLocal: c.createdAtLocal || c.createdAt || new Date().toISOString(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }), {merge:true});
      }
      return true;
    }catch(e){
      console.warn('Firebase Sync Controller completions:', e);
      return false;
    }
  }
  async function startFeatureListeners(){
    try{ if(typeof window.startChangeSettingsSync === 'function') await window.startChangeSettingsSync(); }catch(e){ console.warn('Settings listener start:', e); }
    try{ if(typeof window.publishChallengesToFirestore === 'function') await window.publishChallengesToFirestore(); }catch(e){ console.warn('Challenge template publish:', e); }
    try{
      if(typeof window.startGlobalChallengeSync === 'function'){
        window.__changeLiveSyncManualStart = true;
        await window.startGlobalChallengeSync({manual:true});
      }
    }catch(e){ console.warn('Challenge listener start:', e); }
  }
  async function enableFirebaseSync(){
    if(enabling) return false;
    enabling = true;
    writeDatabaseSyncState(true);
    window.__changeLiveSyncManualStart = true;
    try{
      var database = await ensureDb(true);
      if(!database){
        writeDatabaseSyncState(false);
        toastMsg('Firebase-Anmeldung fehlt. Datenbank-Sync bleibt aus.', 'err');
        return false;
      }
      await ensurePlayer(database);

      if(oldSetLiveSyncEnabled){
        try{ await oldSetLiveSyncEnabled(true); }catch(e){ console.warn('Original Datenbank-Sync start:', e); }
      }else if(typeof window.initFirebaseLive === 'function'){
        window.__changeLiveSyncManualStart = true;
        try{ await window.initFirebaseLive({manual:true, live:true}); }catch(e){ console.warn('initFirebaseLive:', e); }
      }

      database = db || firebase.firestore();
      await ensurePlayer(database);
      await ensureSettings(database);
      await publishChallengeTemplates(database);
      await publishOwnCompletions(database);
      await startFeatureListeners();
      try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
      try{ if(typeof renderChallenges === 'function') renderChallenges(); }catch(e){}
      try{ if(typeof window._refreshSyncPills === 'function') window._refreshSyncPills(); }catch(e){}
      toastMsg('Datenbank-Sync verbunden ✓', 'ok');
      return true;
    }finally{
      window.__changeLiveSyncManualStart = false;
      enabling = false;
    }
  }
  async function disableFirebaseSync(){
    writeDatabaseSyncState(false);
    try{ if(typeof window.stopGlobalChallengeSync === 'function') window.stopGlobalChallengeSync(); }catch(e){}
    try{
      var database = await ensureDb(false);
      var me = account();
      if(database && me.ready){
        await database.collection('change_players').doc(safeDocId(me.email)).set({
          online: false,
          databaseSyncEnabled: false,
          liveSyncEnabled: false,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, {merge:true});
      }
    }catch(e){ console.warn('Firebase Sync Controller disable:', e); }
    try{ if(oldSetLiveSyncEnabled) await oldSetLiveSyncEnabled(false); }catch(e){ console.warn('Original Datenbank-Sync stop:', e); }
    try{ if(typeof window._refreshSyncPills === 'function') window._refreshSyncPills(); }catch(e){}
    toastMsg('Datenbank-Sync deaktiviert', 'ok');
    return true;
  }
  function install(){
    if(window.__changeFirebaseSyncControllerInstalled) return;
    window.__changeFirebaseSyncControllerInstalled = true;
    oldSetLiveSyncEnabled = typeof window.setLiveSyncEnabled === 'function' ? window.setLiveSyncEnabled : null;
    function setDatabaseSyncEnabled(enabled){
      return enabled ? enableFirebaseSync() : disableFirebaseSync();
    }
    window.setDatabaseSyncEnabled = setDatabaseSyncEnabled;
    // Legacy-Kompatibilität: vorhandene interne Module rufen diesen Namen noch auf.
    window.setLiveSyncEnabled = setDatabaseSyncEnabled;
    window.ChangeFirebaseSyncController = {
      enable: enableFirebaseSync,
      disable: disableFirebaseSync,
      setEnabled: setDatabaseSyncEnabled,
      ensurePlayer: function(){ return ensureDb(false).then(function(database){ return ensurePlayer(database); }); },
      ensureSettings: function(){ return ensureDb(false).then(function(database){ return ensureSettings(database); }); },
      status: function(){ return { databaseSyncEnabled: readDatabaseSyncEnabled(), liveSyncEnabled: readDatabaseSyncEnabled(), firebaseReady: cfgValid(), account: account() }; }
    };
    console.warn('[Datenbank-Sync] Controller geladen ✓');
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(install, 300); });
  else setTimeout(install, 300);
  window.addEventListener('load', function(){ setTimeout(install, 800); });
})();
