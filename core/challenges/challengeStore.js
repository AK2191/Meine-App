/* Change App · ChallengeStore
 * Zentrale Datenquelle für Challenges, Erledigungen und Mitspieler.
 * UI bleibt in features/, Logik lebt hier in core/.
 */
(function(){
  'use strict';

  var PREFIX = 'change_v1_';
  var nowIso = function(){ return new Date().toISOString(); };
  var state = {
    challenges: [],
    completions: [],
    players: []
  };

  function norm(value){
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function readJson(key, fallback){
    var keys = [PREFIX + key, key];
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
    [PREFIX + key, key].forEach(function(storageKey){
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
    try{ localStorage.setItem(PREFIX + key, JSON.stringify(value)); }catch(e){}
    // Einige ältere Feature-Dateien lesen noch ohne Prefix. Für Migration konsistent mitschreiben.
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }

  function normalizeChallenge(ch){
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
      var copy = Object.assign({}, item);
      var key = String(copy.id || [copy.challengeId, copy.playerId || copy.userEmail || copy.email, String(copy.date || '').slice(0,10)].join('|'));
      if(seen.has(key)) return;
      seen.add(key);
      out.push(copy);
    });
    return out;
  }

  function normalizePlayers(list){
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
      writeJson('challengeCompletions', state.completions);
    }
    return state.completions;
  }

  function replacePlayers(list, opts){
    state.players = normalizePlayers(list);
    if(opts && opts.persist){
      writeJson('challenge_players', state.players);
      writeJson('challengePlayers', state.players);
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
    writeJson('challengeCompletions', state.completions);
    writeJson('challenge_players', state.players);
    writeJson('challengePlayers', state.players);
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
  state.completions = normalizeCompletions(
    [].concat(readArrayAll('challenge_completions'), readArrayAll('challengeCompletions'))
  );
  state.players = normalizePlayers(
    [].concat(readArrayAll('challenge_players'), readArrayAll('challengePlayers'))
  );

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
    syncFromGlobals: function(opts){
      replaceChallenges(window.challenges || [], {persist:false});
      replaceCompletions(window.challengeCompletions || [], {persist:false});
      replacePlayers(window.challengePlayers || [], {persist:false});
      if(opts && opts.persist) persistAll();
      return state;
    }
  };
})();
