/* Change App · Pollen Symptom Tracker
 * Speichert Tages-Symptome lokal und schreibt sie nur bei aktivem Datenbank-Sync nach Firebase.
 * Kein Auto-Start nach Login, kein eigener Firebase-Start.
 */
(function(){
  'use strict';

  var STORE_KEY = 'change_v1_pollen_symptoms';
  var latestForecast = [];
  var LEVELS = [
    {key:0,label:'Keine'},
    {key:1,label:'Leicht'},
    {key:2,label:'Mittel'},
    {key:3,label:'Stark'}
  ];
  var FIELDS = [
    {key:'sneeze', label:'Niesen', icon:'🤧'},
    {key:'eyes', label:'Augen', icon:'👀'},
    {key:'nose', label:'Nase', icon:'👃'},
    {key:'breath', label:'Atmung', icon:'🫁'}
  ];
  var FIELD_LABELS = {sneeze:'Niesen', eyes:'Augen', nose:'Nase', breath:'Atmung'};

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function todayKey(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function safeDocId(value){
    return String(value || 'unknown').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_') || 'unknown';
  }
  function readJson(key, fallback){
    try{ var raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }catch(e){ return fallback; }
  }
  function writeJson(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }
  function databaseSyncEnabled(){
    return readJson('change_v1_database_sync_enabled', readJson('database_sync_enabled', false)) === true;
  }
  function all(){
    var data = readJson(STORE_KEY, {});
    return data && typeof data === 'object' ? data : {};
  }
  function blank(date){
    return {
      date: date || todayKey(),
      symptoms: {sneeze:0, eyes:0, nose:0, breath:0},
      note: '',
      pollenSnapshot: null,
      updatedAtLocal: ''
    };
  }
  function get(date){
    var key = date || todayKey();
    var item = all()[key];
    var base = blank(key);
    if(item && typeof item === 'object'){
      base.symptoms = Object.assign(base.symptoms, item.symptoms || {});
      base.note = String(item.note || '');
      base.pollenSnapshot = item.pollenSnapshot || null;
      base.updatedAtLocal = item.updatedAtLocal || '';
    }
    return base;
  }
  function maxSymptom(record){
    var values = record && record.symptoms ? Object.values(record.symptoms).map(Number) : [];
    return values.length ? Math.max.apply(Math, values) : 0;
  }
  function mainSymptom(record){
    var symptoms = record && record.symptoms ? record.symptoms : {};
    var best = 'sneeze';
    Object.keys(FIELD_LABELS).forEach(function(key){
      if(Number(symptoms[key] || 0) > Number(symptoms[best] || 0)) best = key;
    });
    return {key: best, label: FIELD_LABELS[best], value: Number(symptoms[best] || 0)};
  }
  function setForecast(forecast){
    latestForecast = Array.isArray(forecast) ? forecast : [];
  }
  function snapshotFor(date){
    var key = date || todayKey();
    var day = null;
    for(var i=0;i<latestForecast.length;i++){
      if(latestForecast[i] && latestForecast[i].date === key){ day = latestForecast[i]; break; }
    }
    if(!day && latestForecast.length) day = latestForecast[0];
    if(!day || !Array.isArray(day.items)) return null;
    return {
      date: key,
      score: pollenScore(day),
      items: day.items.map(function(p){
        return {key:p.key, name:p.name, value:Number(p.value || 0), level:p.level || 'none', rank:Number(p.rank || 0)};
      })
    };
  }
  function pollenScore(day){
    var items = day && day.items || [];
    if(!items.length) return 0;
    var total = items.reduce(function(sum,p){ return sum + Math.min(100, Math.max(0, Number(p.value) || 0)); }, 0);
    return Math.round(Math.min(100, total / Math.max(1, items.length) * 1.6));
  }
  function saveLocal(record){
    var data = all();
    record.updatedAtLocal = new Date().toISOString();
    if(!record.pollenSnapshot) record.pollenSnapshot = snapshotFor(record.date);
    data[record.date] = record;
    writeJson(STORE_KEY, data);
  }
  function currentUser(){
    var fu = null;
    try{ fu = window.firebase && firebase.auth ? firebase.auth().currentUser : null; }catch(e){}
    var stored = readJson('change_v1_user_info', readJson('user_info', {})) || {};
    var email = String((fu && fu.email) || stored.email || stored.mail || '').trim().toLowerCase();
    var name = String((fu && fu.displayName) || stored.name || stored.displayName || '').trim();
    return {email:email, name:name || (email ? email.split('@')[0] : '')};
  }
  function dbReady(){
    try{ return !!(window.firebase && firebase.firestore && firebase.auth && firebase.auth().currentUser); }catch(e){ return false; }
  }
  async function publish(record){
    if(!databaseSyncEnabled()) return false;
    if(!dbReady()) return false;
    var user = currentUser();
    if(!user.email) return false;
    try{
      var db = firebase.firestore();
      var id = safeDocId(user.email) + '_' + String(record.date || todayKey());
      await db.collection('change_pollen_symptoms').doc(id).set({
        id: id,
        date: record.date || todayKey(),
        userEmail: user.email,
        userName: user.name,
        symptoms: Object.assign({}, record.symptoms || {}),
        note: String(record.note || '').slice(0, 500),
        pollenSnapshot: record.pollenSnapshot || snapshotFor(record.date || todayKey()),
        updatedAtLocal: record.updatedAtLocal || new Date().toISOString(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});
      return true;
    }catch(e){
      console.warn('Pollen symptom Firebase sync:', e);
      return false;
    }
  }
  async function loadFromFirebase(date){
    if(!databaseSyncEnabled() || !dbReady()) return null;
    var user = currentUser();
    if(!user.email) return null;
    try{
      var id = safeDocId(user.email) + '_' + String(date || todayKey());
      var doc = await firebase.firestore().collection('change_pollen_symptoms').doc(id).get();
      if(!doc.exists) return null;
      var data = doc.data() || {};
      var rec = blank(date || todayKey());
      rec.symptoms = Object.assign(rec.symptoms, data.symptoms || {});
      rec.note = String(data.note || '');
      rec.pollenSnapshot = data.pollenSnapshot || null;
      rec.updatedAtLocal = data.updatedAtLocal || '';
      saveLocal(rec);
      return rec;
    }catch(e){
      console.warn('Pollen symptom Firebase load:', e);
      return null;
    }
  }
  function levelButtons(field, value, date){
    return LEVELS.map(function(level){
      var active = Number(value || 0) === level.key ? ' active' : '';
      return '<button type="button" class="change-symptom-level'+active+'" data-symptom-field="'+esc(field)+'" data-symptom-value="'+level.key+'" data-symptom-date="'+esc(date)+'">'+esc(level.label)+'</button>';
    }).join('');
  }
  function statusText(record){
    var max = maxSymptom(record);
    if(max >= 3) return 'Starke Symptome hinterlegt';
    if(max === 2) return 'Mittlere Symptome hinterlegt';
    if(max === 1) return 'Leichte Symptome hinterlegt';
    return 'Keine Symptome hinterlegt';
  }
  function relevantRecords(){
    return Object.values(all()).filter(function(rec){
      return rec && rec.pollenSnapshot && Array.isArray(rec.pollenSnapshot.items) && maxSymptom(rec) >= 1;
    }).sort(function(a,b){ return String(a.date || '').localeCompare(String(b.date || '')); });
  }
  function strongestCorrelation(){
    var records = relevantRecords();
    var stats = {};
    records.forEach(function(rec){
      var main = mainSymptom(rec);
      var max = maxSymptom(rec);
      (rec.pollenSnapshot.items || []).forEach(function(p){
        var value = Number(p.value || 0);
        var levelHit = p.level === 'medium' || p.level === 'high' || value >= 30;
        if(!levelHit) return;
        var key = p.key || p.name;
        if(!stats[key]) stats[key] = {name:p.name || key, hits:0, strongHits:0, totalValue:0, symptomCounts:{}};
        stats[key].hits += 1;
        stats[key].totalValue += value;
        if(max >= 3) stats[key].strongHits += 1;
        stats[key].symptomCounts[main.key] = (stats[key].symptomCounts[main.key] || 0) + Math.max(1, main.value);
      });
    });
    var best = Object.keys(stats).map(function(key){
      var s = stats[key];
      var symptomKey = Object.keys(s.symptomCounts).sort(function(a,b){ return s.symptomCounts[b] - s.symptomCounts[a]; })[0] || 'nose';
      s.key = key;
      s.avg = Math.round(s.totalValue / Math.max(1, s.hits));
      s.symptomKey = symptomKey;
      s.symptomLabel = FIELD_LABELS[symptomKey] || 'Symptome';
      s.score = s.hits * 10 + s.strongHits * 7 + s.avg;
      return s;
    }).sort(function(a,b){ return b.score - a.score; })[0] || null;
    return {records:records, best:best};
  }
  function insightHtml(){
    var result = strongestCorrelation();
    var count = result.records.length;
    if(!count){
      return '<div class="change-symptom-insight empty"><div class="change-symptom-insight-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18V9"/><path d="M10 18V5"/><path d="M16 18v-7"/><path d="M22 18v-4"/></svg></div><div><strong>Noch keine Auswertung</strong><span>Trage Symptome ein. Ab mehreren Tagen erkennt Change Muster zwischen Pollen und Beschwerden.</span></div></div>';
    }
    if(!result.best || count < 3){
      return '<div class="change-symptom-insight"><div class="change-symptom-insight-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18V9"/><path d="M10 18V5"/><path d="M16 18v-7"/><path d="M22 18v-4"/></svg></div><div><strong>Auswertung startet</strong><span>'+count+' Symptomtag(e) gespeichert. Ab 3 Tagen werden belastbarere Muster sichtbar.</span></div></div>';
    }
    var b = result.best;
    var strength = b.strongHits ? b.strongHits + 'x stark' : b.hits + 'x auffällig';
    return '<div class="change-symptom-insight strong"><div class="change-symptom-insight-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M5 8c5 0 7 4 7 8"/><path d="M19 8c-5 0-7 4-7 8"/><path d="M7 17h10"/></svg></div><div><strong>'+esc(b.name)+' auffällig</strong><span>Bei erhöhter Belastung hattest du '+esc(strength)+' vor allem '+esc(b.symptomLabel)+'. Durchschnittlicher Wert: '+esc(b.avg)+'%.</span></div></div>';
  }
  function symptomIconSvg(key){
    var map = {

      // Niesen: Kopf von rechts, Nase links, Niesstrahl (3 Wellenlinien) nach links wegfliegend
      sneeze:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="16" cy="5.5" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M16 8.5 Q15.5 10.5 14.5 11.5 Q13 13 11 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M11 13 Q8.5 12.5 6.5 11.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M6.5 11.5 Q4 10.5 2.5 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".65"/><path d="M6.5 11.5 Q4.5 13 3 14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".55"/><path d="M6.5 11.5 Q5.5 9 4.5 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".45"/><circle cx="2.2" cy="10" r="1.1" fill="currentColor" opacity=".7"/><circle cx="2.8" cy="14.2" r="1" fill="currentColor" opacity=".6"/><circle cx="4.2" cy="7.8" r=".9" fill="currentColor" opacity=".5"/></svg></span>',

      // Augen: einzelnes großes Auge mit Träne
      eyes:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M3 12 Q12 5 21 12 Q12 19 3 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4" fill="currentColor" fill-opacity=".15"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><path d="M18 7.5 Q20 6 21.5 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".55"/><path d="M20.5 9.5 Q22 9 23 8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".45"/></svg></span>',

      // Nase: klassische Nase von vorne — zwei Nasenflügel, Brücke, ein Tropfen
      nose:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3 L12 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 13 Q10 14 8.5 16 Q7 18 8 19.5 Q9 21 11 21 Q13 21 13 19.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M12 13 Q14 14 15.5 16 Q17 18 16 19.5 Q15 21 13 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><ellipse cx="9.5" cy="19.5" rx="2.5" ry="1.4" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity=".12"/><ellipse cx="14.5" cy="19.5" rx="2.5" ry="1.4" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity=".12"/><path d="M12 21 Q12 22.5 12.5 23.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".6"/><circle cx="12.8" cy="23.8" r="1" fill="currentColor" opacity=".65"/></svg></span>',

      // Atmung: zwei Lungenflügel mit Atemwegen
      breath:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 4 L12 16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 7 Q8.5 6 6.5 8 Q4.5 10 4.5 13.5 Q4.5 17 6.5 18 Q8.5 19 10.5 17 Q11.5 16 12 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7 Q15.5 6 17.5 8 Q19.5 10 19.5 13.5 Q19.5 17 17.5 18 Q15.5 19 13.5 17 Q12.5 16 12 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    };
    return map[key] || map.sneeze;
  }

  function levelButtons(field, value, date){
    return LEVELS.map(function(level){
      var active = Number(value || 0) === level.key ? ' active' : '';
      return '<button type="button" class="change-symptom-level'+active+'" data-level="'+level.key+'" data-symptom-field="'+esc(field)+'" data-symptom-value="'+level.key+'" data-symptom-date="'+esc(date)+'">'+esc(level.label)+'</button>';
    }).join('');
  }
  function panelHtml(date, forecast){
    setForecast(forecast || latestForecast);
    var key = date || todayKey();
    var rec = get(key);
    if(!rec.pollenSnapshot) rec.pollenSnapshot = snapshotFor(key);
    var rows = FIELDS.map(function(field){
      var value = rec.symptoms && rec.symptoms[field.key] != null ? rec.symptoms[field.key] : 0;
      return '<div class="change-symptom-row" data-symptom-row="'+esc(field.key)+'"><div class="change-symptom-label">'+symptomIconSvg(field.key)+'<strong>'+esc(field.label)+'</strong></div><div class="change-symptom-levels">'+levelButtons(field.key, value, key)+'</div></div>';
    }).join('');
    return '<div class="change-symptom-card" data-symptom-card="'+esc(key)+'">'
      + insightHtml()
      + '<div class="change-symptom-body">'
        + '<div class="change-symptom-list">'+rows+'</div>'
        + '<div class="change-symptom-note-wrap"><div class="change-symptom-note-label">Notiz</div><div class="change-symptom-note-frame"><textarea class="change-symptom-note" data-symptom-note="'+esc(key)+'" maxlength="500" placeholder="z. B. Fenster offen, draußen gewesen, Tablette genommen">'+esc(rec.note)+'</textarea><span class="change-symptom-note-action" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 4h6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M10 14 20 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M20 14v5a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></div></div>'
      + '</div>'
      + '</div>';
  }
  function refreshVisibleCard(date){
    var card = document.querySelector('[data-symptom-card="'+(date || todayKey())+'"]');
    if(!card) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = panelHtml(date, latestForecast);
    card.replaceWith(wrap.firstChild);
  }
  function install(){
    if(window.__changePollenSymptomsInstalled) return;
    window.__changePollenSymptomsInstalled = true;
    document.addEventListener('click', async function(ev){
      var btn = ev.target && ev.target.closest ? ev.target.closest('[data-symptom-field]') : null;
      if(!btn) return;
      ev.preventDefault();
      var date = btn.getAttribute('data-symptom-date') || todayKey();
      var field = btn.getAttribute('data-symptom-field');
      var value = parseInt(btn.getAttribute('data-symptom-value'), 10) || 0;
      var rec = get(date);
      rec.symptoms[field] = value;
      rec.pollenSnapshot = snapshotFor(date) || rec.pollenSnapshot;
      saveLocal(rec);
      refreshVisibleCard(date);
      // Lokale Interaktion: kein automatischer Firebase-Write pro Klick.
    });
    document.addEventListener('change', async function(ev){
      var note = ev.target && ev.target.matches && ev.target.matches('[data-symptom-note]') ? ev.target : null;
      if(!note) return;
      var date = note.getAttribute('data-symptom-note') || todayKey();
      var rec = get(date);
      rec.note = String(note.value || '').slice(0, 500);
      rec.pollenSnapshot = snapshotFor(date) || rec.pollenSnapshot;
      saveLocal(rec);
      refreshVisibleCard(date);
      // Lokale Notiz: kein automatischer Firebase-Write beim Verlassen des Feldes.
    });
  }


  function pollenItemFor(day, key){
    var items = day && day.items || [];
    for(var i=0;i<items.length;i++){
      if(String(items[i].key || items[i].name) === String(key)) return items[i];
    }
    return null;
  }
  function pollenLevelText(item){
    if(!item) return 'nicht auffällig';
    if(item.level === 'high') return 'hoch';
    if(item.level === 'medium') return 'mittel';
    if(item.level === 'low') return 'niedrig';
    return 'ruhig';
  }
  function notificationItems(forecast){
    forecast = Array.isArray(forecast) ? forecast : latestForecast;
    var result = strongestCorrelation();
    if(!result || !result.best || result.records.length < 3) return [];
    if(!forecast || !forecast.length) return [];
    var target = forecast[1] || forecast[0];
    var b = result.best;
    var item = pollenItemFor(target, b.key);
    if(!item) return [];
    var value = Number(item.value || 0);
    var relevant = item.level === 'medium' || item.level === 'high' || value >= 30;
    if(!relevant) return [];
    var date = target.date || todayKey();
    var urgency = item.level === 'high' || b.strongHits ? 'warn' : 'info';
    var label = date === todayKey() ? 'Heute' : 'Morgen';
    return [{
      id: 'pollen-symptom:'+date+':'+String(b.key).replace(/[^a-z0-9_-]/gi,'_')+':'+String(b.symptomKey || ''),
      kind: 'pollen-symptom',
      title: b.name + ' kann dich belasten',
      body: b.name + ' ist ' + pollenLevelText(item) + '. Bei ähnlicher Belastung hattest du vor allem ' + b.symptomLabel + '.',
      date: date,
      diff: date === todayKey() ? 0 : 1,
      label: label,
      urgency: urgency,
      icon: '🤧',
      priority: 13,
      action: {type:'settings', tab:'sync'}
    }];
  }

  window.ChangePollenSymptoms = {
    panelHtml: panelHtml,
    get: get,
    all: all,
    publish: publish,
    loadFromFirebase: loadFromFirebase,
    setForecast: setForecast,
    insightHtml: insightHtml,
    notificationItems: notificationItems,
    install: install
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
