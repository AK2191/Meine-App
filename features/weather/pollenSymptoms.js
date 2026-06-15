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
    // Klare, sofort erkennbare Symbole — je 1 unverwechselbares Merkmal, sauber auf 22-25px
    var map = {

      // Niesen: Person die nach rechts niest — Kopf links, Niesstrahl rechts
      sneeze:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="6.5" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 9 Q6 11 7 12.5 Q8 14 9.5 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M9.5 14 Q12 13.5 14 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M14 12 Q17 10.5 19 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".7"/><path d="M14 12 Q16.5 13.5 18 14.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".55"/><path d="M14 12 Q15.5 15 16 17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".45"/><circle cx="19.5" cy="9.8" r="1.1" fill="currentColor" opacity=".7"/><circle cx="18.5" cy="14.8" r="1" fill="currentColor" opacity=".6"/><circle cx="16.5" cy="17.5" r=".9" fill="currentColor" opacity=".5"/></svg></span>',

      // Augen: einzelnes großes Auge mit deutlicher Träne
      eyes:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M3 12 Q12 5 21 12 Q12 19 3 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity=".15"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><path d="M17 8.5 Q19 7 20.5 5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".6"/><path d="M20 10 Q22 9.5 23 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".5"/></svg></span>',

      // Nase: Seitenansicht Nase mit Tropfen — klar erkennbar
      nose:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M9 4 Q9 4 10 9 Q11 13 10 16 Q9 18 10 19.5 Q11.5 21 14 20 Q16 19 16 17.5 Q16 16.5 15 16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 16 Q18 15 18 17.5 Q18 20 15 20.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 20 Q15 22 14.5 23" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".6"/><circle cx="14" cy="23.2" r="1.1" fill="currentColor" opacity=".65"/></svg></span>',

      // Atmung: Lunge — zwei geschwungene Flügel, deutlich erkennbar
      breath:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5 L12 17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 8 Q8 7 6 9 Q4 11 4 14 Q4 17 6 18 Q8 19 10 17 Q11 16 12 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8 Q16 7 18 9 Q20 11 20 14 Q20 17 18 18 Q16 19 14 17 Q13 16 12 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
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
