/* Change App · ChallengeStore
 * Zentrale Datenquelle für Challenges, Erledigungen und Mitspieler.
 * UI bleibt in features/, Logik lebt hier in core/.
 */
(function(){
  'use strict';

  var PREFIX = 'change_v1_';
  var DataModel = window.ChangeDataModel || null;
  var nowIso = function(){ return new Date().toISOString(); };
  var canonicalKeys = DataModel && DataModel.canonicalKeys ? DataModel.canonicalKeys : {};
  var legacyKeys = DataModel && DataModel.legacyKeys ? DataModel.legacyKeys : {};
  var STORAGE_ALIASES = {
    challenges: [canonicalKeys.challenges || PREFIX + 'challenges'].concat(legacyKeys.challenges || ['challenges']),
    challenge_completions: [canonicalKeys.challengeCompletions || PREFIX + 'challenge_completions'].concat(legacyKeys.challengeCompletions || ['challenge_completions', 'challengeCompletions'], ['change_v1_challengeCompletions']),
    challenge_players: [canonicalKeys.challengePlayers || PREFIX + 'challenge_players'].concat(legacyKeys.challengePlayers || ['challenge_players', 'challengePlayers'], ['change_v1_challengePlayers'])
  };
  STORAGE_ALIASES.challengeCompletions = STORAGE_ALIASES.challenge_completions;
  STORAGE_ALIASES.challengePlayers = STORAGE_ALIASES.challenge_players;
  var state = {
    challenges: [],
    completions: [],
    players: []
  };

  function norm(value){
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function uniqueKeys(keys){
    var seen = {};
    var out = [];
    (Array.isArray(keys) ? keys : []).forEach(function(key){
      key = String(key || '').trim();
      if(!key || seen[key]) return;
      seen[key] = true;
      out.push(key);
    });
    return out;
  }

  function storageKeysFor(key){
    return uniqueKeys(STORAGE_ALIASES[key] || [PREFIX + key, key]);
  }

  function storageWriteKeysFor(key){
    return storageKeysFor(key).filter(function(storageKey){
      return storageKey !== 'change_v1_challengeCompletions' && storageKey !== 'change_v1_challengePlayers';
    });
  }

  function readJson(key, fallback){
    var keys = storageKeysFor(key);
    for(var i=0;i<keys.length;i++){
      try{
        var raw = localStorage.getItem(keys[i]);
        if(raw == null) continue;
        var parsed = JSON.parse(raw);
        if(Array.isArray(fallback) && !Array.isArray(parsed)) continue;
        return parsed;
      }catch(e){}
    }
    return fallback;
  }

  function readArrayAll(key){
    var out = [];
    storageKeysFor(key).forEach(function(storageKey){
      try{
        var raw = localStorage.getItem(storageKey);
        if(raw == null) return;
        var parsed = JSON.parse(raw);
        if(Array.isArray(parsed)) out = out.concat(parsed);
      }catch(e){}
    });
    return out;
  }

  function writeJson(key, value){
    storageWriteKeysFor(key).forEach(function(storageKey){
      try{
        if(DataModel && typeof DataModel.writeJsonTo === 'function') DataModel.writeJsonTo(localStorage, storageKey, value);
        else localStorage.setItem(storageKey, JSON.stringify(value));
      }catch(e){}
    });
    // Einige ältere Feature-Dateien lesen noch ohne Prefix. Für Migration konsistent mitschreiben.
  }

  function normalizeChallenge(ch){
    if(DataModel && typeof DataModel.normalizeChallenge === 'function'){
      var normalized = DataModel.normalizeChallenge(ch);
      return normalized ? Object.assign({}, ch, normalized) : null;
    }
    if(!ch || typeof ch !== 'object') return null;
    var out = Object.assign({}, ch);
    var title = String(out.title || out.name || '').trim();
    if(!out.id && title){
      out.id = 'ch_' + norm(title).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    }
    if(!out.id) return null;
    if(title && !out.title) out.title = title;
    if(out.active === undefined) out.active = true;
    return out;
  }

  function isOptionalLike(ch){
    var text = norm((ch && (ch.title || ch.name || ch.id)) || '');
    return !!(ch && ch.optional) || /fitness|spazier|walk|fahrrad|radfahren|bike|joggen|jogging|laufen/.test(text);
  }

  function mergeChallenges(base, incoming){
    var out = [];
    var byId = new Map();
    var optionalTitle = new Map();

    function remember(ch){
      byId.set(String(ch.id), ch);
      if(isOptionalLike(ch)){
        var tk = norm(ch.title || ch.name || '');
        if(tk) optionalTitle.set(tk, ch);
      }
    }

    function add(raw){
      var ch = normalizeChallenge(raw);
      if(!ch) return;
      var existing = byId.get(String(ch.id));
      var tk = norm(ch.title || ch.name || '');
      if(!existing && isOptionalLike(ch) && tk) existing = optionalTitle.get(tk);

      if(existing){
        Object.assign(existing, ch, {
          createdAt: existing.createdAt || ch.createdAt || nowIso()
        });
        remember(existing);
      }else{
        ch.createdAt = ch.createdAt || nowIso();
        out.push(ch);
        remember(ch);
      }
    }

    (Array.isArray(base) ? base : []).forEach(add);
    (Array.isArray(incoming) ? incoming : []).forEach(add);
    return out;
  }

  function normalizeCompletions(list){
    var seen = new Set();
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function(item){
      if(!item || typeof item !== 'object') return;
      var copy = DataModel && typeof DataModel.normalizeCompletion === 'function'
        ? DataModel.normalizeCompletion(item, {})
        : Object.assign({}, item);
      if(!copy) return;
      if(typeof item.createdAtLocal === 'number') copy.createdAtLocal = item.createdAtLocal;
      var key = String(copy.id || [copy.challengeId, copy.playerId || copy.userEmail || copy.email, String(copy.date || '').slice(0,10)].join('|'));
      if(seen.has(key)) return;
      seen.add(key);
      out.push(copy);
    });
    return out;
  }

  function normalizePlayers(list){
    if(DataModel && typeof DataModel.normalizePlayer === 'function'){
      var seen = new Set();
      var normalized = [];
      (Array.isArray(list) ? list : []).forEach(function(player){
        var item = DataModel.normalizePlayer(player);
        if(!item) return;
        var key = item.email || item.id;
        if(!key || seen.has(key)) return;
        seen.add(key);
        normalized.push(item);
      });
      return normalized;
    }
    var map = new Map();
    (Array.isArray(list) ? list : []).forEach(function(player){
      if(!player || typeof player !== 'object') return;
      var id = norm(player.email || player.id || player.uid || player.name);
      if(!id) return;
      map.set(id, Object.assign({}, map.get(id) || {}, player, {
        id: player.id || id,
        email: player.email || (/^.+@.+$/.test(id) ? id : ''),
        name: player.name || player.displayName || player.email || id
      }));
    });
    return Array.from(map.values());
  }

  function replaceChallenges(list, opts){
    state.challenges = mergeChallenges([], list);
    if(opts && opts.persist) writeJson('challenges', state.challenges);
    return state.challenges;
  }

  function replaceCompletions(list, opts){
    state.completions = normalizeCompletions(list);
    if(opts && opts.persist){
      writeJson('challenge_completions', state.completions);
    }
    return state.completions;
  }

  function replacePlayers(list, opts){
    state.players = normalizePlayers(list);
    if(opts && opts.persist){
      writeJson('challenge_players', state.players);
    }
    return state.players;
  }

  function mergeChallengeList(list, opts){
    state.challenges = mergeChallenges(state.challenges, list);
    if(opts && opts.persist) writeJson('challenges', state.challenges);
    return state.challenges;
  }

  function ensureDefaults(factory){
    if(state.challenges.length) return state.challenges;
    var defaults = [];
    try{ defaults = typeof factory === 'function' ? (factory() || []) : []; }catch(e){ defaults = []; }
    state.challenges = mergeChallenges([], defaults);
    if(state.challenges.length) writeJson('challenges', state.challenges);
    return state.challenges;
  }

  function persistAll(){
    writeJson('challenges', state.challenges);
    writeJson('challenge_completions', state.completions);
    writeJson('challenge_players', state.players);
  }

  function installAlias(prop, getter, setter){
    var current = window[prop];
    try{
      Object.defineProperty(window, prop, {
        configurable: true,
        enumerable: true,
        get: getter,
        set: setter
      });
      if(Array.isArray(current)) setter(current);
    }catch(e){
      window[prop] = getter();
    }
  }

  state.challenges = mergeChallenges([], readArrayAll('challenges'));
  state.completions = normalizeCompletions(readArrayAll('challenge_completions'));
  state.players = normalizePlayers(readArrayAll('challenge_players'));

  installAlias('challenges', function(){ return state.challenges; }, function(value){ replaceChallenges(value || [], {persist:false}); });
  installAlias('challengeCompletions', function(){ return state.completions; }, function(value){ replaceCompletions(value || [], {persist:false}); });
  installAlias('challengePlayers', function(){ return state.players; }, function(value){ replacePlayers(value || [], {persist:false}); });

  window.ChangeChallengeStore = {
    getChallenges: function(){ return state.challenges; },
    getCompletions: function(){ return state.completions; },
    getPlayers: function(){ return state.players; },
    replaceChallenges: replaceChallenges,
    replaceCompletions: replaceCompletions,
    replacePlayers: replacePlayers,
    mergeChallenges: mergeChallengeList,
    ensureDefaults: ensureDefaults,
    persistAll: persistAll,
    audit: function(){
      return {
        dataModelVersion: DataModel && DataModel.version || '',
        counts: {
          challenges: state.challenges.length,
          completions: state.completions.length,
          players: state.players.length
        },
        storageKeys: {
          challenges: storageKeysFor('challenges'),
          completions: storageKeysFor('challenge_completions'),
          players: storageKeysFor('challenge_players')
        }
      };
    },
    syncFromGlobals: function(opts){
      replaceChallenges(window.challenges || [], {persist:false});
      replaceCompletions(window.challengeCompletions || [], {persist:false});
      replacePlayers(window.challengePlayers || [], {persist:false});
      if(opts && opts.persist) persistAll();
      return state;
    }
  };
})();
