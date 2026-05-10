(function(){
  'use strict';

  var Store = window.ChangeWeatherStore;
  var CACHE_TTL = 30 * 60 * 1000;
  var WEATHER_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
  var POLLEN_ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality';

  var inFlight = null;

  var WEATHER_CODES = {
    0:'klar', 1:'überwiegend klar', 2:'teils bewölkt', 3:'bewölkt',
    45:'Nebel', 48:'Reifnebel', 51:'leichter Nieselregen', 53:'Nieselregen', 55:'starker Nieselregen',
    56:'gefrierender Nieselregen', 57:'starker gefrierender Nieselregen', 61:'leichter Regen', 63:'Regen', 65:'starker Regen',
    66:'gefrierender Regen', 67:'starker gefrierender Regen', 71:'leichter Schnee', 73:'Schnee', 75:'starker Schnee',
    77:'Schneekörner', 80:'leichte Schauer', 81:'Schauer', 82:'starke Schauer',
    85:'Schneeschauer', 86:'starke Schneeschauer', 95:'Gewitter', 96:'Gewitter mit Hagel', 99:'starkes Gewitter'
  };
  var POLLEN = [
    {key:'alder_pollen', name:'Erle'},
    {key:'birch_pollen', name:'Birke'},
    {key:'grass_pollen', name:'Gräser'},
    {key:'mugwort_pollen', name:'Beifuß'},
    {key:'olive_pollen', name:'Olive'},
    {key:'ragweed_pollen', name:'Ambrosia'}
  ];

  function round(n, digits){
    n = Number(n);
    if(!isFinite(n)) return null;
    var f = Math.pow(10, digits || 0);
    return Math.round(n * f) / f;
  }
  function closestIndex(times, now){
    if(!times || !times.length) return -1;
    var best = 0;
    var bestDiff = Infinity;
    var target = now || Date.now();
    times.forEach(function(t, i){
      var d = Math.abs(Date.parse(t) - target);
      if(d < bestDiff){ best = i; bestDiff = d; }
    });
    return best;
  }
  function fetchJson(url){
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function(){ controller.abort(); }, 10000) : null;
    return fetch(url, {signal: controller ? controller.signal : undefined}).then(function(res){
      if(timer) clearTimeout(timer);
      if(!res.ok) throw new Error('Abruf fehlgeschlagen ('+res.status+')');
      return res.json();
    });
  }
  function weatherUrl(loc){
    var params = new URLSearchParams({
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      current: 'temperature_2m,precipitation,rain,showers,weather_code',
      hourly: 'precipitation_probability,precipitation,rain,showers,weather_code',
      forecast_hours: '4',
      timezone: 'auto'
    });
    return WEATHER_ENDPOINT + '?' + params.toString();
  }
  function pollenUrl(loc){
    var vars = POLLEN.map(function(p){ return p.key; }).join(',');
    var params = new URLSearchParams({
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      current: vars,
      hourly: vars,
      forecast_hours: '24',
      timezone: 'auto',
      domains: 'cams_europe'
    });
    return POLLEN_ENDPOINT + '?' + params.toString();
  }
  function rainAmountAt(hourly, idx){
    if(!hourly || idx < 0) return 0;
    return Math.max(0, Number(hourly.precipitation && hourly.precipitation[idx]) || 0)
      + Math.max(0, Number(hourly.rain && hourly.rain[idx]) || 0)
      + Math.max(0, Number(hourly.showers && hourly.showers[idx]) || 0);
  }
  function parseWeather(data){
    var now = Date.now();
    var current = data && data.current ? data.current : {};
    var hourly = data && data.hourly ? data.hourly : {};
    var times = hourly.time || [];
    var temp = round(current.temperature_2m, 0);
    var code = current.weather_code;
    var nextRain = null;
    for(var i=0;i<times.length;i++){
      var ts = Date.parse(times[i]);
      if(!isFinite(ts) || ts < now - 15 * 60 * 1000 || ts > now + 90 * 60 * 1000) continue;
      var amount = rainAmountAt(hourly, i);
      var probability = Number(hourly.precipitation_probability && hourly.precipitation_probability[i]);
      var wetCode = [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].indexOf(Number(hourly.weather_code && hourly.weather_code[i])) !== -1;
      if(amount > 0 || probability >= 60 || wetCode){
        nextRain = {
          time: times[i],
          minutes: Math.max(0, Math.round((ts - now) / 60000)),
          amount: round(amount, 1),
          probability: isFinite(probability) ? probability : null,
          code: hourly.weather_code && hourly.weather_code[i]
        };
        break;
      }
    }
    return {
      temperature: temp,
      summary: WEATHER_CODES[code] || 'Wetter',
      code: code,
      precipitation: round(current.precipitation || current.rain || current.showers || 0, 1),
      nextRain: nextRain,
      timezone: data && data.timezone,
      updatedAt: new Date().toISOString()
    };
  }
  function pollenLevel(value){
    value = Number(value) || 0;
    if(value <= 0) return {key:'none', label:'keine', rank:0};
    if(value < 10) return {key:'low', label:'niedrig', rank:1};
    if(value < 50) return {key:'medium', label:'mittel', rank:2};
    return {key:'high', label:'hoch', rank:3};
  }
  function parsePollen(data){
    var current = data && data.current ? data.current : {};
    var hourly = data && data.hourly ? data.hourly : {};
    var idx = closestIndex(hourly.time || [], Date.now());
    var items = POLLEN.map(function(p){
      var value = current[p.key];
      if(value == null && idx >= 0 && hourly[p.key]) value = hourly[p.key][idx];
      value = round(value || 0, 1) || 0;
      var level = pollenLevel(value);
      return {key:p.key, name:p.name, value:value, level:level.key, levelLabel:level.label, rank:level.rank};
    }).sort(function(a,b){ return (b.rank - a.rank) || (b.value - a.value) || a.name.localeCompare(b.name); });
    return {
      items: items,
      strong: items.filter(function(p){ return p.level === 'high'; }),
      elevated: items.filter(function(p){ return p.level === 'medium'; }),
      available: items.some(function(p){ return p.value > 0; }),
      updatedAt: new Date().toISOString()
    };
  }

  async function refresh(force){
    if(inFlight && !force) return inFlight;
    inFlight = (async function(){
      var loc = Store.getLocation();
      if(!loc) return {status:'needs_location', location:null, weather:null, pollen:null, savedAt:new Date().toISOString()};
      var settings = Store.settings();
      var result = {status:'ok', location:loc, weather:null, pollen:null, savedAt:new Date().toISOString()};
      var jobs = [];
      if(settings.weatherEnabled || settings.rainAlertsEnabled){
        jobs.push(fetchJson(weatherUrl(loc)).then(function(data){ result.weather = parseWeather(data); }).catch(function(e){ result.weatherError = e.message || String(e); }));
      }
      if(settings.pollenEnabled || settings.pollenAlertsEnabled){
        jobs.push(fetchJson(pollenUrl(loc)).then(function(data){ result.pollen = parsePollen(data); }).catch(function(e){ result.pollenError = e.message || String(e); }));
      }
      await Promise.all(jobs);
      Store.writeCache(result);
      return result;
    })();
    try{ return await inFlight; }
    finally{ inFlight = null; }
  }

  function getCached(){ return Store.readCache(); }
  function needsRefresh(){ return Store.cacheAgeMs(Store.readCache()) > CACHE_TTL; }
  async function ensureFresh(){
    var cache = Store.readCache();
    if(cache && !needsRefresh()) return cache;
    return refresh(false);
  }

  window.ChangeWeatherService = {
    refresh: refresh,
    ensureFresh: ensureFresh,
    getCached: getCached,
    needsRefresh: needsRefresh,
    pollenLevel: pollenLevel,
    codeLabel: function(code){ return WEATHER_CODES[code] || 'Wetter'; }
  };
})();
