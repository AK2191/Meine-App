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
  var WEATHER_ICONS = {
    0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️', 45:'🌫️', 48:'🌫️',
    51:'🌦️', 53:'🌦️', 55:'🌧️', 56:'🌧️', 57:'🌧️',
    61:'🌧️', 63:'🌧️', 65:'🌧️', 66:'🌧️', 67:'🌧️',
    71:'🌨️', 73:'🌨️', 75:'❄️', 77:'❄️',
    80:'🌦️', 81:'🌧️', 82:'⛈️', 85:'🌨️', 86:'🌨️',
    95:'⛈️', 96:'⛈️', 99:'⛈️'
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
  function dateKeyFromTime(t){ return String(t || '').slice(0,10); }
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
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
      forecast_days: '7',
      timezone: 'auto'
    });
    return WEATHER_ENDPOINT + '?' + params.toString();
  }
  function pollenUrl(loc, days){
    var vars = POLLEN.map(function(p){ return p.key; }).join(',');
    var params = new URLSearchParams({
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      current: vars,
      hourly: vars,
      forecast_days: String(days || 7),
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
  function parseWeatherForecast(data){
    var daily = data && data.daily ? data.daily : {};
    var times = daily.time || [];
    return times.slice(0, 7).map(function(date, i){
      var code = daily.weather_code && daily.weather_code[i];
      var prob = daily.precipitation_probability_max && daily.precipitation_probability_max[i];
      var sum = daily.precipitation_sum && daily.precipitation_sum[i];
      return {
        date: date,
        code: code,
        icon: WEATHER_ICONS[code] || '🌦️',
        summary: WEATHER_CODES[code] || 'Wetter',
        tempMax: round(daily.temperature_2m_max && daily.temperature_2m_max[i], 0),
        tempMin: round(daily.temperature_2m_min && daily.temperature_2m_min[i], 0),
        rainProbability: isFinite(Number(prob)) ? Number(prob) : null,
        precipitation: round(sum || 0, 1) || 0
      };
    });
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
      icon: WEATHER_ICONS[code] || '🌦️',
      code: code,
      precipitation: round(current.precipitation || current.rain || current.showers || 0, 1),
      nextRain: nextRain,
      forecast: parseWeatherForecast(data),
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
  function itemForPollen(p, value){
    value = round(value || 0, 1) || 0;
    var level = pollenLevel(value);
    return {key:p.key, name:p.name, value:value, level:level.key, levelLabel:level.label, rank:level.rank};
  }
  function sortPollenItems(items){
    return items.sort(function(a,b){ return (b.rank - a.rank) || (b.value - a.value) || a.name.localeCompare(b.name); });
  }
  function parsePollenForecast(data){
    var hourly = data && data.hourly ? data.hourly : {};
    var times = hourly.time || [];
    var grouped = {};
    times.forEach(function(t, idx){
      var date = dateKeyFromTime(t);
      if(!date) return;
      if(!grouped[date]) grouped[date] = {};
      POLLEN.forEach(function(p){
        var val = Number(hourly[p.key] && hourly[p.key][idx]);
        if(!isFinite(val)) val = 0;
        grouped[date][p.key] = Math.max(grouped[date][p.key] || 0, val);
      });
    });
    return Object.keys(grouped).sort().slice(0,7).map(function(date){
      var vals = grouped[date] || {};
      var items = sortPollenItems(POLLEN.map(function(p){ return itemForPollen(p, vals[p.key]); }));
      return {
        date: date,
        items: items,
        strong: items.filter(function(p){ return p.level === 'high'; }),
        elevated: items.filter(function(p){ return p.level === 'medium'; }),
        top: items.filter(function(p){ return p.rank >= 2; }).slice(0,3)
      };
    });
  }
  function parsePollen(data){
    var current = data && data.current ? data.current : {};
    var hourly = data && data.hourly ? data.hourly : {};
    var idx = closestIndex(hourly.time || [], Date.now());
    var items = sortPollenItems(POLLEN.map(function(p){
      var value = current[p.key];
      if(value == null && idx >= 0 && hourly[p.key]) value = hourly[p.key][idx];
      return itemForPollen(p, value);
    }));
    return {
      items: items,
      strong: items.filter(function(p){ return p.level === 'high'; }),
      elevated: items.filter(function(p){ return p.level === 'medium'; }),
      available: items.some(function(p){ return p.value > 0; }),
      forecast: parsePollenForecast(data),
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
        jobs.push(fetchJson(pollenUrl(loc, 7)).catch(function(){ return fetchJson(pollenUrl(loc, 5)); }).then(function(data){ result.pollen = parsePollen(data); }).catch(function(e){ result.pollenError = e.message || String(e); }));
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
    codeLabel: function(code){ return WEATHER_CODES[code] || 'Wetter'; },
    codeIcon: function(code){ return WEATHER_ICONS[code] || '🌦️'; },
    pollenCatalog: function(){ return POLLEN.slice(); }
  };
})();
