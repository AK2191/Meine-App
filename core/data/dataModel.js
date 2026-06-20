/* Change App - Canonical Data Model
 * Passive Datenschicht: normalisiert Daten, loescht nichts und migriert nie automatisch.
 */
(function(root, factory){
  'use strict';
  var api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  if(root) root.ChangeDataModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  var VERSION = '0.1.0299';
  var CANONICAL_KEYS = {
    events: 'change_v1_events',
    challenges: 'change_v1_challenges',
    challengeCompletions: 'change_v1_challenge_completions',
    challengePlayers: 'change_v1_challenge_players',
    settingsSnapshot: 'change_v1_settings_snapshot',
    pollenSymptoms: 'change_v1_pollen_symptoms',
    migrationMeta: 'change_v1_data_model_migration_meta'
  };
  var LEGACY_KEYS = {
    events: ['events', 'change_v2_events'],
    challenges: ['challenges'],
    challengeCompletions: ['challenge_completions', 'challengeCompletions'],
    challengePlayers: ['challenge_players', 'challengePlayers'],
    pollenSymptoms: []
  };
  var CACHE_KEYS = [
    'change_google_events_cache',
    'change_v1_google_events_cache',
    'change_v1_google_events_cache_meta',
    'change_v1_weather_pollen_cache',
    'change_nudges_failed'
  ];
  var NEVER_DELETE_KEYS = [
    'change_v1_user_info',
    'change_v1_user_info_safe',
    'user_info',
    'user_info_safe',
    'change_v1_user_email',
    'user_email',
    'change_v1_client_id',
    'client_id',
    'change_v1_fcm_token',
    'fcm_token',
    'change_push_enabled',
    'change_v1_push_enabled',
    'change_v2_push_enabled'
  ];

  function pad2(value){ return String(value).padStart(2, '0'); }
  function nowIso(){ return new Date().toISOString(); }
  function normalizeEmail(value){ return String(value || '').trim().toLowerCase(); }
  function isEmail(value){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value)); }
  function safeDocId(value){ return normalizeEmail(value || 'unknown').replace(/[^a-z0-9._-]/g, '_') || 'unknown'; }
  function dateKey(value){
    if(!value) return '';
    if(value instanceof Date && !isNaN(value.getTime())) return value.getFullYear() + '-' + pad2(value.getMonth() + 1) + '-' + pad2(value.getDate());
    var text = String(value || '').trim();
    var match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? match[1] + '-' + match[2] + '-' + match[3] : '';
  }
  function readJsonFrom(storage, key, fallback){
    try{
      var raw = storage && storage.getItem ? storage.getItem(key) : null;
      if(raw == null) return fallback;
      return JSON.parse(raw);
    }catch(e){ return fallback; }
  }
  function writeJsonTo(storage, key, value){
    if(!storage || !storage.setItem) return false;
    try{ storage.setItem(key, JSON.stringify(value)); return true; }catch(e){ return false; }
  }
  function valuesFromKeys(storage, keys){
    var out = [];
    keys.forEach(function(key){
      var value = readJsonFrom(storage, key, null);
      if(Array.isArray(value)) out = out.concat(value);
      else if(value && typeof value === 'object') out.push(value);
    });
    return out;
  }
  function normalizeText(value){ return String(value == null ? '' : value).trim(); }
  function stableId(parts, prefix){
    return (prefix || 'id') + '_' + parts.map(function(part){ return normalizeText(part).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }).filter(Boolean).join('_').slice(0, 120);
  }
  function uniqueBy(list, keyFn){
    var seen = new Set();
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function(item){
      var key = keyFn(item);
      if(!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }

  function normalizeEvent(raw){
    if(!raw || typeof raw !== 'object') return null;
    var start = dateKey(raw.startDate || raw.date || raw.start || raw.dateTime);
    var end = dateKey(raw.endDate || raw.end || start) || start;
    var title = normalizeText(raw.title || raw.summary || raw.name);
    if(!start || !title) return null;
    var id = normalizeText(raw.id || raw.eventId || raw.googleEventId) || stableId([title, start, raw.time || raw.startTime || '', end], 'ev');
    return Object.assign({}, raw, {
      id: id,
      title: title,
      date: start,
      startDate: start,
      endDate: end < start ? start : end,
      time: normalizeText(raw.time || raw.startTime),
      endTime: normalizeText(raw.endTime),
      color: normalizeText(raw.color || 'blue'),
      source: normalizeText(raw.source || (raw.googleEventId ? 'google' : 'local')),
      updatedAtLocal: normalizeText(raw.updatedAtLocal || raw.updatedAt || '')
    });
  }

  function normalizeChallenge(raw){
    if(!raw || typeof raw !== 'object') return null;
    var title = normalizeText(raw.title || raw.name);
    var id = normalizeText(raw.id) || stableId([title || 'challenge'], 'ch');
    if(!id || !title) return null;
    return Object.assign({}, raw, {
      id: id,
      title: title,
      desc: normalizeText(raw.desc || raw.description),
      points: parseInt(raw.points, 10) || 0,
      type: normalizeText(raw.type || 'Sport'),
      recurrence: normalizeText(raw.recurrence || (raw.date || raw.generatedFor ? 'once' : 'daily')),
      active: raw.active !== false,
      optional: raw.optional === true,
      auto: raw.auto === true,
      date: dateKey(raw.date || raw.generatedFor || raw.startDate)
    });
  }

  function ownerEmail(raw, fallbackEmail){
    var email = normalizeEmail(raw && (raw.email || raw.userEmail || raw.playerEmail || raw.playerId));
    if(isEmail(email)) return email;
    email = normalizeEmail(fallbackEmail);
    return isEmail(email) ? email : '';
  }
  function normalizeCompletion(raw, options){
    if(!raw || typeof raw !== 'object') return null;
    var day = dateKey(raw.date || raw.createdAtLocal || raw.createdAt) || dateKey(new Date());
    var challengeId = normalizeText(raw.challengeId || raw.challenge || raw.idChallenge);
    if(!challengeId || !day) return null;
    var email = ownerEmail(raw, options && options.fallbackEmail);
    var id = normalizeText(raw.id) || stableId([challengeId, email || 'local', day], 'cc');
    return Object.assign({}, raw, {
      id: id,
      challengeId: challengeId,
      date: day,
      playerId: email || normalizeText(raw.playerId || raw.userEmail || raw.email || 'local-user'),
      userEmail: email,
      email: email,
      points: parseInt(raw.points, 10) || 0,
      createdAtLocal: normalizeText(raw.createdAtLocal || raw.createdAt || nowIso())
    });
  }

  function normalizePlayer(raw){
    if(!raw || typeof raw !== 'object') return null;
    var email = normalizeEmail(raw.email || raw.userEmail || raw.id);
    var id = isEmail(email) ? email : normalizeText(raw.id || raw.uid || raw.name);
    if(!id) return null;
    return Object.assign({}, raw, {
      id: id,
      email: isEmail(email) ? email : normalizeEmail(raw.email || ''),
      uid: normalizeText(raw.uid),
      name: normalizeText(raw.name || raw.displayName || (isEmail(email) ? email.split('@')[0] : id)),
      picture: normalizeText(raw.picture || raw.photoURL),
      online: raw.online === true
    });
  }

  function normalizePollenSymptoms(raw){
    var data = raw && typeof raw === 'object' ? raw : {};
    var out = {};
    Object.keys(data).forEach(function(key){
      var rec = data[key];
      if(!rec || typeof rec !== 'object') return;
      var day = dateKey(rec.date || key);
      if(!day) return;
      var symptoms = Object.assign({sneeze:null, eyes:null, nose:null, breath:null}, rec.symptoms || {});
      var answered = Object.assign({sneeze:false, eyes:false, nose:false, breath:false}, rec.answered || {});
      out[day] = Object.assign({}, rec, {
        date: day,
        symptoms: symptoms,
        answered: answered,
        complete: rec.complete === true,
        note: normalizeText(rec.note).slice(0, 500),
        updatedAtLocal: normalizeText(rec.updatedAtLocal || '')
      });
    });
    return out;
  }

  function collectSettings(storage){
    var calendarOptions = readJsonFrom(storage, 'change_v1_calendar_view_options', readJsonFrom(storage, 'calendar_settings', {})) || {};
    var weather = readJsonFrom(storage, 'change_v1_weather_settings', {}) || {};
    function readBool(keys, fallback){
      for(var i = 0; i < keys.length; i++){
        var raw = storage && storage.getItem ? storage.getItem(keys[i]) : null;
        if(raw == null) continue;
        if(raw === 'true' || raw === '1') return true;
        if(raw === 'false' || raw === '0') return false;
        try{ return JSON.parse(raw) === true; }catch(e){}
      }
      return fallback;
    }
    function readRaw(keys, fallback){
      for(var i = 0; i < keys.length; i++){
        try{
          var raw = storage.getItem(keys[i]);
          if(raw != null) return raw.replace(/^"|"$/g, '');
        }catch(e){}
      }
      return fallback;
    }
    return {
      schema: 1,
      calendar: {
        holidayState: readRaw(['change_v1_holiday_state', 'holiday_state'], 'ALL'),
        showHolidays: calendarOptions.showHolidays !== false,
        showChallengeDots: calendarOptions.showChallengeDots !== false,
        showWeekNumbers: calendarOptions.showWeekNumbers === true
      },
      weather: weather,
      dashboard: {
        friseurEnabled: readBool(['change_v1_friseur_enabled'], false),
        friseurWeeks: parseInt(readRaw(['change_v1_friseur_weeks', 'friseur_weeks'], '3'), 10) || 3,
        birthdaysEnabled: readBool(['change_v1_birthdays_enabled', 'birthdays_enabled'], true),
        birthdayNotificationDays: parseInt(readRaw(['change_v1_birthday_notification_days', 'birthday_notification_days'], '1'), 10) || 1,
        urlaubEnabled: readBool(['urlaub_tracker_on'], true),
        urlaubTotalDays: parseInt(readRaw(['urlaub_tracker_days'], '30'), 10) || 30,
        urlaubHalfDays: readJsonFrom(storage, 'urlaub_half_days', []) || []
      },
      sync: {
        databaseSyncEnabled: readBool(['change_v1_database_sync_enabled', 'database_sync_enabled', 'change_v1_live_sync_enabled', 'live_sync_enabled'], false),
        googleCalendarSyncEnabled: readBool(['change_v1_google_calendar_sync', 'change_google_sync_enabled'], true),
        pushPreferenceEnabled: readBool(['change_push_enabled', 'change_v1_push_enabled', 'change_v2_push_enabled', 'push_enabled'], false),
        autoChallengesEnabled: readBool(['change_v1_auto_challenges_enabled', 'auto_challenges_enabled'], true),
        autoChallengeCount: parseInt(readRaw(['change_v1_auto_challenge_count', 'auto_challenge_count'], '7'), 10) || 7,
        challengeDifficulty: readRaw(['change_v1_challenge_difficulty', 'challenge_difficulty'], 'easy')
      },
      theme: readRaw(['change_v1_theme'], readBool(['change_v1_dark_mode'], false) ? 'dark' : 'system'),
      updatedAtLocal: nowIso()
    };
  }

  function readCanonicalData(storage, options){
    options = options || {};
    var fallbackEmail = normalizeEmail(options.fallbackEmail || '');
    var eventKeys = [CANONICAL_KEYS.events].concat(LEGACY_KEYS.events);
    var challengeKeys = [CANONICAL_KEYS.challenges].concat(LEGACY_KEYS.challenges);
    var completionKeys = [CANONICAL_KEYS.challengeCompletions].concat(LEGACY_KEYS.challengeCompletions);
    var playerKeys = [CANONICAL_KEYS.challengePlayers].concat(LEGACY_KEYS.challengePlayers);
    return {
      schema: 1,
      exportedAt: nowIso(),
      events: uniqueBy(valuesFromKeys(storage, eventKeys).map(normalizeEvent).filter(Boolean), function(item){ return item.id; }),
      challenges: uniqueBy(valuesFromKeys(storage, challengeKeys).map(normalizeChallenge).filter(Boolean), function(item){ return item.id; }),
      challengeCompletions: uniqueBy(valuesFromKeys(storage, completionKeys).map(function(item){ return normalizeCompletion(item, {fallbackEmail:fallbackEmail}); }).filter(Boolean), function(item){ return item.id; }),
      challengePlayers: uniqueBy(valuesFromKeys(storage, playerKeys).map(normalizePlayer).filter(Boolean), function(item){ return item.email || item.id; }),
      settings: collectSettings(storage),
      pollenSymptoms: normalizePollenSymptoms(readJsonFrom(storage, CANONICAL_KEYS.pollenSymptoms, {}))
    };
  }

  function listStorageKeys(storage){
    var keys = [];
    if(!storage) return keys;
    try{
      for(var i = 0; i < storage.length; i++){
        var key = storage.key(i);
        if(key) keys.push(key);
      }
    }catch(e){}
    return keys.sort();
  }
  function auditStorage(storage, options){
    options = options || {};
    var keys = listStorageKeys(storage);
    var canonicalData = readCanonicalData(storage, options);
    var canonicalKeySet = new Set(Object.keys(CANONICAL_KEYS).map(function(k){ return CANONICAL_KEYS[k]; }));
    var legacyFlat = [];
    Object.keys(LEGACY_KEYS).forEach(function(group){ legacyFlat = legacyFlat.concat(LEGACY_KEYS[group]); });
    var legacySet = new Set(legacyFlat);
    var cacheSet = new Set(CACHE_KEYS);
    return {
      version: VERSION,
      generatedAt: nowIso(),
      counts: {
        storageKeys: keys.length,
        events: canonicalData.events.length,
        challenges: canonicalData.challenges.length,
        challengeCompletions: canonicalData.challengeCompletions.length,
        challengePlayers: canonicalData.challengePlayers.length,
        pollenSymptomDays: Object.keys(canonicalData.pollenSymptoms).length
      },
      keys: {
        canonicalPresent: keys.filter(function(key){ return canonicalKeySet.has(key); }),
        legacyPresent: keys.filter(function(key){ return legacySet.has(key); }),
        cachePresent: keys.filter(function(key){ return cacheSet.has(key); }),
        unknownChangeKeys: keys.filter(function(key){ return /^change_/i.test(key) && !canonicalKeySet.has(key) && !legacySet.has(key) && !cacheSet.has(key) && NEVER_DELETE_KEYS.indexOf(key) === -1; })
      },
      recommendations: [
        'Keine Alt-Keys loeschen, bevor canonicalWrite einmal erfolgreich war und die App danach geprueft wurde.',
        'Cache-Keys duerfen spaeter neu aufgebaut werden; Punkte, Events und Einstellungen vorher sichern.',
        'Firestore-Dokumente nur nach Export und nur collectionweise bereinigen.'
      ],
      canonicalData: options.includeData === true ? canonicalData : undefined
    };
  }

  function migrateLocalStorage(storage, options){
    options = Object.assign({dryRun:true, writeBackup:true}, options || {});
    var data = readCanonicalData(storage, options);
    var writes = [
      [CANONICAL_KEYS.events, data.events],
      [CANONICAL_KEYS.challenges, data.challenges],
      [CANONICAL_KEYS.challengeCompletions, data.challengeCompletions],
      [CANONICAL_KEYS.challengePlayers, data.challengePlayers],
      [CANONICAL_KEYS.settingsSnapshot, data.settings],
      [CANONICAL_KEYS.pollenSymptoms, data.pollenSymptoms],
      [CANONICAL_KEYS.migrationMeta, {schema:1, version:VERSION, migratedAt:nowIso(), dryRun:options.dryRun === true}]
    ];
    var report = {version: VERSION, dryRun: options.dryRun === true, writes: writes.map(function(item){ return {key:item[0], count: Array.isArray(item[1]) ? item[1].length : (item[1] && typeof item[1] === 'object' ? Object.keys(item[1]).length : 1)}; }), deleted: []};
    if(options.dryRun === true) return report;
    if(options.writeBackup !== false){
      writeJsonTo(storage, 'change_v1_data_model_backup_' + Date.now(), data);
    }
    writes.forEach(function(item){ writeJsonTo(storage, item[0], item[1]); });
    return report;
  }

  return {
    version: VERSION,
    canonicalKeys: CANONICAL_KEYS,
    legacyKeys: LEGACY_KEYS,
    cacheKeys: CACHE_KEYS.slice(),
    neverDeleteKeys: NEVER_DELETE_KEYS.slice(),
    normalizeEmail: normalizeEmail,
    isEmail: isEmail,
    safeDocId: safeDocId,
    dateKey: dateKey,
    readJsonFrom: readJsonFrom,
    writeJsonTo: writeJsonTo,
    normalizeEvent: normalizeEvent,
    normalizeChallenge: normalizeChallenge,
    normalizeCompletion: normalizeCompletion,
    normalizePlayer: normalizePlayer,
    normalizePollenSymptoms: normalizePollenSymptoms,
    collectSettings: collectSettings,
    readCanonicalData: readCanonicalData,
    auditStorage: auditStorage,
    migrateLocalStorage: migrateLocalStorage
  };
});
