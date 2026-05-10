(function(){
  'use strict';

  var Store = window.ChangeWeatherStore;
  var Service = window.ChangeWeatherService;

  function pad(n){ return String(n).padStart(2, '0'); }
  function dayKey(){ var d = new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function hourKey(iso){
    var d = iso ? new Date(iso) : new Date();
    if(isNaN(d)) d = new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours());
  }
  function joinNames(items){
    return (items || []).map(function(p){ return p.name; }).join(', ');
  }
  function cache(){ return Service && Service.getCached ? Service.getCached() : null; }

  function buildNotifications(){
    var settings = Store && Store.settings ? Store.settings() : {};
    var data = cache();
    var notes = [];
    if(!data || data.status === 'needs_location') return notes;

    if(settings.rainAlertsEnabled && data.weather && data.weather.nextRain){
      var rain = data.weather.nextRain;
      var body = rain.probability != null
        ? 'In ca. '+rain.minutes+' Minuten · '+rain.probability+' % Regenwahrscheinlichkeit'
        : 'In ca. '+rain.minutes+' Minuten kann es regnen';
      notes.push({
        id: 'weather:rain:'+hourKey(rain.time),
        kind: 'weather',
        title: 'Regen möglich',
        body: body,
        date: dayKey(),
        diff: 0,
        label: 'Nächste Std.',
        urgency: 'warn',
        icon: '🌧️',
        priority: 12,
        action: {type:'settings', tab:'sync'}
      });
    }

    if(settings.pollenAlertsEnabled && data.pollen && data.pollen.strong && data.pollen.strong.length){
      var names = joinNames(data.pollen.strong.slice(0,3));
      notes.push({
        id: 'pollen:high:'+dayKey()+':'+names.toLowerCase().replace(/\s+/g,'-'),
        kind: 'pollen',
        title: 'Pollen heute stark',
        body: 'Heute stark: '+names,
        date: dayKey(),
        diff: 0,
        label: 'Heute',
        urgency: 'info',
        icon: '🌿',
        priority: 18,
        action: {type:'settings', tab:'sync'}
      });
    }
    return notes;
  }

  async function refreshAndNotify(force){
    if(Service && Service.refresh) await Service.refresh(!!force);
    try{ if(typeof window.updateBellIndicator === 'function') window.updateBellIndicator(); }catch(e){}
    try{ if(window.ChangeWeatherCard && window.ChangeWeatherCard.update) window.ChangeWeatherCard.update(); }catch(e){}
  }

  window.ChangeWeatherRules = {
    buildNotifications: buildNotifications,
    refreshAndNotify: refreshAndNotify
  };

  setTimeout(function(){ refreshAndNotify(false); }, 900);
  setInterval(function(){ refreshAndNotify(false); }, 60 * 60 * 1000);
})();
