/* Change App · Firebase Sync Controller
 * Zentrale, manuell gestartete Firestore-Verbindung.
 * Startet niemals automatisch nach Google-Login, sondern nur über den Live-Sync-Schalter.
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
  function writeLiveState(enabled){
    writeJson('live_sync_enabled', !!enabled);
    writeJson('change_v1_live_sync_enabled', !!enabled);
    try{ if(typeof ls === 'function') ls('live_sync_enabled', !!enabled); }catch(e){}
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
    var payload = {
      id: me.email,
      email: me.email,
      uid: me.uid || '',
      name: me.name || me.email.split('@')[0],
      picture: me.picture || '',
      online: true,
      liveSyncEnabled: true,
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
        urlaubEnabled: String(localStorage.getItem('urlaub_tracker_on') || 'true') !== 'false',
        urlaubTotalDays: parseInt(localStorage.getItem('urlaub_tracker_days'), 10) || 30,
        urlaubHalfDays: readJson('urlaub_half_days', []) || []
      },
      sync: {
        liveSyncEnabled: true,
        pushPreferenceEnabled: readJson('change_v1_push_enabled', false) === true,
        autoChallengesEnabled: readJson('change_v1_auto_challenges_enabled', readJson('auto_challenges_enabled', true)) !== false,
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
  async function publishChallengeTemplates(database){
    if(!database) return false;
    var list = currentChallenges().filter(function(ch){ return ch && ch.id; }).slice(0, 100);
    if(!list.length) return true;
    try{
      for(var i=0; i<list.length; i++){
        var ch = list[i];
        await database.collection('change_challenges').doc(String(ch.id)).set({
          id: String(ch.id),
          title: ch.title || ch.name || 'Challenge',
          desc: ch.desc || ch.description || '',
          points: parseInt(ch.points, 10) || 0,
          icon: ch.icon || '🏆',
          date: ch.date || ch.startDate || '',
          recurrence: ch.recurrence || 'once',
          active: ch.active !== false,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, {merge:true});
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
    writeLiveState(true);
    window.__changeLiveSyncManualStart = true;
    try{
      var database = await ensureDb(true);
      if(!database){
        writeLiveState(false);
        toastMsg('Firebase-Anmeldung fehlt. Live-Sync bleibt aus.', 'err');
        return false;
      }
      await ensurePlayer(database);

      if(oldSetLiveSyncEnabled){
        try{ await oldSetLiveSyncEnabled(true); }catch(e){ console.warn('Original Live-Sync start:', e); }
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
      toastMsg('Firebase-Sync verbunden ✓', 'ok');
      return true;
    }finally{
      window.__changeLiveSyncManualStart = false;
      enabling = false;
    }
  }
  async function disableFirebaseSync(){
    writeLiveState(false);
    try{ if(typeof window.stopGlobalChallengeSync === 'function') window.stopGlobalChallengeSync(); }catch(e){}
    try{
      var database = await ensureDb(false);
      var me = account();
      if(database && me.ready){
        await database.collection('change_players').doc(safeDocId(me.email)).set({
          online: false,
          liveSyncEnabled: false,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, {merge:true});
      }
    }catch(e){ console.warn('Firebase Sync Controller disable:', e); }
    try{ if(oldSetLiveSyncEnabled) await oldSetLiveSyncEnabled(false); }catch(e){ console.warn('Original Live-Sync stop:', e); }
    try{ if(typeof window._refreshSyncPills === 'function') window._refreshSyncPills(); }catch(e){}
    toastMsg('Live-Sync deaktiviert', 'ok');
    return true;
  }
  function install(){
    if(window.__changeFirebaseSyncControllerInstalled) return;
    window.__changeFirebaseSyncControllerInstalled = true;
    oldSetLiveSyncEnabled = typeof window.setLiveSyncEnabled === 'function' ? window.setLiveSyncEnabled : null;
    window.setLiveSyncEnabled = function(enabled){
      return enabled ? enableFirebaseSync() : disableFirebaseSync();
    };
    window.ChangeFirebaseSyncController = {
      enable: enableFirebaseSync,
      disable: disableFirebaseSync,
      ensurePlayer: function(){ return ensureDb(false).then(function(database){ return ensurePlayer(database); }); },
      ensureSettings: function(){ return ensureDb(false).then(function(database){ return ensureSettings(database); }); },
      status: function(){ return { liveSyncEnabled: readJson('live_sync_enabled', false) === true, firebaseReady: cfgValid(), account: account() }; }
    };
    console.warn('[Firebase Sync] Controller geladen ✓');
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(install, 300); });
  else setTimeout(install, 300);
  window.addEventListener('load', function(){ setTimeout(install, 800); });
})();
