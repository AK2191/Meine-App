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
  function pollenStore(){
    return window.ChangePollenStore || null;
  }
  function databaseSyncEnabled(){
    return readJson('change_v1_database_sync_enabled', readJson('database_sync_enabled', false)) === true;
  }
  function all(){
    var store = pollenStore();
    if(store && typeof store.getAll === 'function'){
      var stored = store.getAll();
      return stored && typeof stored === 'object' ? stored : {};
    }
    var data = readJson(STORE_KEY, {});
    return data && typeof data === 'object' ? data : {};
  }
  function blank(date){
    return {
      date: date || todayKey(),
      symptoms: {sneeze:null, eyes:null, nose:null, breath:null},
      answered: {sneeze:false, eyes:false, nose:false, breath:false},
      complete: false,
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
      if(item.answered && typeof item.answered === 'object'){
        base.answered = Object.assign(base.answered, item.answered || {});
      }else{
        // Alte lokale Standard-Nullen gelten nicht automatisch als bewusst gewähltes "Keine".
        Object.keys(base.symptoms).forEach(function(k){ base.answered[k] = Number(base.symptoms[k] || 0) > 0; });
      }
      base.complete = item.complete === true || isComplete(base);
      base.note = String(item.note || '');
      base.pollenSnapshot = item.pollenSnapshot || null;
      base.updatedAtLocal = item.updatedAtLocal || '';
    }
    return base;
  }
  function isAnswered(record, key){
    return !!(record && record.answered && record.answered[key] === true);
  }
  function answeredCount(record){
    return FIELDS.reduce(function(sum, field){ return sum + (isAnswered(record, field.key) ? 1 : 0); }, 0);
  }
  function isComplete(record){
    return answeredCount(record) === FIELDS.length;
  }
  function symptomValue(record, key){
    if(!isAnswered(record, key)) return null;
    return Math.max(0, Math.min(3, Number(record.symptoms && record.symptoms[key]) || 0));
  }
  function maxSymptom(record){
    var values = FIELDS.map(function(field){ return symptomValue(record, field.key); }).filter(function(v){ return v != null; });
    return values.length ? Math.max.apply(Math, values) : 0;
  }
  function totalSymptomScore(record){
    return FIELDS.reduce(function(sum, field){ return sum + (symptomValue(record, field.key) || 0); }, 0);
  }
  function mainSymptom(record){
    var best = 'sneeze';
    FIELDS.forEach(function(field){
      if((symptomValue(record, field.key) || 0) > (symptomValue(record, best) || 0)) best = field.key;
    });
    return {key: best, label: FIELD_LABELS[best], value: symptomValue(record, best) || 0};
  }
  function completenessText(record){
    var count = answeredCount(record);
    if(count >= FIELDS.length) return 'Vollständig bewertet';
    if(count === 0) return 'Heute noch nicht bewertet';
    return count + ' von ' + FIELDS.length + ' Bereichen bewertet';
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
    record.complete = isComplete(record);
    record.updatedAtLocal = new Date().toISOString();
    if(!record.pollenSnapshot) record.pollenSnapshot = snapshotFor(record.date);
    var store = pollenStore();
    if(store && typeof store.upsert === 'function'){
      store.upsert(record, {persist:true, touch:false});
      return;
    }
    var data = all();
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
        answered: Object.assign({}, record.answered || {}),
        complete: isComplete(record),
        symptomScore: totalSymptomScore(record),
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
      rec.answered = Object.assign(rec.answered, data.answered || {});
      rec.complete = data.complete === true || isComplete(rec);
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
  function statusText(record){
    var max = maxSymptom(record);
    if(max >= 3) return 'Starke Symptome hinterlegt';
    if(max === 2) return 'Mittlere Symptome hinterlegt';
    if(max === 1) return 'Leichte Symptome hinterlegt';
    return 'Keine Symptome hinterlegt';
  }
  function relevantRecords(){
    return Object.values(all()).filter(function(rec){
      return rec && isComplete(rec) && rec.pollenSnapshot && Array.isArray(rec.pollenSnapshot.items);
    }).sort(function(a,b){ return String(a.date || '').localeCompare(String(b.date || '')); });
  }
  function strongestCorrelation(){
    var records = relevantRecords();
    var stats = {};
    var highFreeDays = 0;
    var highDays = 0;
    records.forEach(function(rec){
      var main = mainSymptom(rec);
      var max = maxSymptom(rec);
      var score = totalSymptomScore(rec);
      var dayHadHigh = false;
      (rec.pollenSnapshot.items || []).forEach(function(p){
        var value = Number(p.value || 0);
        var levelHit = p.level === 'medium' || p.level === 'high' || value >= 30;
        if(!levelHit) return;
        dayHadHigh = true;
        var key = p.key || p.name;
        if(!stats[key]) stats[key] = {key:key, name:p.name || key, days:0, symptomDays:0, freeDays:0, strongDays:0, totalPollen:0, totalSymptoms:0, symptomCounts:{}};
        stats[key].days += 1;
        stats[key].totalPollen += value;
        stats[key].totalSymptoms += score;
        if(score === 0) stats[key].freeDays += 1;
        if(score > 0) stats[key].symptomDays += 1;
        if(max >= 3) stats[key].strongDays += 1;
        if(main.value > 0) stats[key].symptomCounts[main.key] = (stats[key].symptomCounts[main.key] || 0) + Math.max(1, main.value);
      });
      if(dayHadHigh){
        highDays += 1;
        if(score === 0) highFreeDays += 1;
      }
    });
    var best = Object.keys(stats).map(function(key){
      var s = stats[key];
      var symptomKey = Object.keys(s.symptomCounts).sort(function(a,b){ return s.symptomCounts[b] - s.symptomCounts[a]; })[0] || 'nose';
      s.avg = Math.round(s.totalPollen / Math.max(1, s.days));
      s.correlation = Math.round((s.symptomDays / Math.max(1, s.days)) * 100);
      s.freeRatio = Math.round((s.freeDays / Math.max(1, s.days)) * 100);
      s.symptomKey = symptomKey;
      s.symptomLabel = FIELD_LABELS[symptomKey] || 'Symptome';
      s.score = s.symptomDays * 18 + s.strongDays * 12 + s.avg - s.freeDays * 5;
      return s;
    }).sort(function(a,b){ return b.score - a.score; })[0] || null;
    return {records:records, best:best, highDays:highDays, highFreeDays:highFreeDays};
  }
  function formatDate(value){
    var parts = String(value || '').split('-').map(Number);
    if(parts.length !== 3) return String(value || '');
    var d = new Date(parts[0], parts[1]-1, parts[2]);
    return d.toLocaleDateString('de-DE', {day:'2-digit', month:'short'});
  }
  function formatLongDate(value){
    var parts = String(value || '').split('-').map(Number);
    if(parts.length !== 3) return String(value || '');
    var d = new Date(parts[0], parts[1]-1, parts[2]);
    return d.toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'long', year:'numeric'});
  }
  function profileSummary(result){
    result = result || strongestCorrelation();
    var count = result.records.length;
    if(!count) return {title:'Dein Allergieprofil', text:'Noch keine vollständigen Tage erfasst', hint:'Tippe, um deine Auswertungen zu sehen.'};
    if(!result.best || count < 5) return {title:'Dein Allergieprofil', text:count + ' vollständige Tage erfasst', hint:'Mit mehr Tagen werden deine Hinweise präziser.'};
    var b = result.best;
    if(b.symptomDays === 0) return {title:'Dein Allergieprofil', text:count + ' vollständige Tage erfasst', hint:'Bisher keine klare Belastung erkennbar.'};
    return {title:'Dein Allergieprofil', text:count + ' vollständige Tage erfasst', hint:b.name + ' wahrscheinlichster Auslöser'};
  }
  function insightHtml(){
    var result = strongestCorrelation();
    var count = result.records.length;
    var summary = profileSummary(result);
    return '<button type="button" class="change-symptom-insight change-symptom-profile-entry'+(count ? ' strong' : ' empty')+'" data-pollen-profile-open="1" aria-label="Dein Allergieprofil öffnen">'
      + '<span class="change-symptom-insight-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18V9"/><path d="M10 18V5"/><path d="M16 18v-7"/><path d="M22 18v-4"/></svg></span>'
      + '<span class="change-symptom-profile-copy"><strong>'+esc(summary.title)+'</strong><span>'+esc(summary.text)+'<br>'+esc(summary.hint)+'</span></span>'
      + '<span class="change-symptom-profile-chevron" aria-hidden="true">›</span>'
      + '</button>';
  }
  function pollenBadge(item){
    if(!item) return 'Ruhig';
    if(item.level === 'high') return 'Hoch';
    if(item.level === 'medium') return 'Mittel';
    if(item.level === 'low') return 'Niedrig';
    return 'Ruhig';
  }
  function profileBars(result){
    result = result || strongestCorrelation();
    var stats = {};
    result.records.forEach(function(rec){
      (rec.pollenSnapshot.items || []).forEach(function(p){
        var key = p.key || p.name;
        if(!stats[key]) stats[key] = {name:p.name || key, symptomDays:0, days:0};
        var value = Number(p.value || 0);
        if(p.level === 'medium' || p.level === 'high' || value >= 30){
          stats[key].days += 1;
          if(totalSymptomScore(rec) > 0) stats[key].symptomDays += 1;
        }
      });
    });
    var list = Object.keys(stats).map(function(key){
      var s = stats[key];
      s.percent = Math.round((s.symptomDays / Math.max(1, s.days)) * 100);
      return s;
    }).sort(function(a,b){ return b.percent - a.percent; }).slice(0,4);
    if(!list.length) list = [{name:'Gräser',percent:0},{name:'Birke',percent:0},{name:'Ambrosia',percent:0},{name:'Beifuß',percent:0}];
    return list.map(function(s){ return '<div class="change-profile-bar"><span>'+esc(s.name)+'</span><i><b style="width:'+Math.max(4, Math.min(100, s.percent))+'%"></b></i><strong>'+s.percent+'%</strong></div>'; }).join('');
  }
  function recentRecords(limit){
    return relevantRecords().slice().sort(function(a,b){ return String(b.date || '').localeCompare(String(a.date || '')); }).slice(0, limit || 6);
  }
  function dayDots(rec){
    return FIELDS.map(function(field){
      var v = symptomValue(rec, field.key);
      var cls = v == null ? 'missing' : (v === 0 ? 'none' : (v === 1 ? 'light' : (v === 2 ? 'medium' : 'strong')));
      return '<span class="change-profile-dot '+cls+'"></span>';
    }).join('');
  }
  function profileViewHtml(tab){
    var result = strongestCorrelation();
    var records = result.records;
    var first = records[0] && formatDate(records[0].date);
    var last = records[records.length-1] && formatDate(records[records.length-1].date);
    var b = result.best;
    var freePct = Math.round((result.highFreeDays / Math.max(1, result.highDays)) * 100);
    var title = b && b.symptomDays ? b.name + ' ist dein wahrscheinlichster Auslöser' : 'Noch kein klarer Auslöser erkennbar';
    var text = b && b.symptomDays ? 'Bei erhöhter Belastung hattest du an '+b.symptomDays+' von '+b.days+' Tagen Beschwerden, besonders bei '+b.symptomLabel+'.' : 'Erfasse weitere vollständige Tage, damit Change Pollen und Beschwerden sicher vergleichen kann.';
    var days = recentRecords(8);
    var dayRows = days.map(function(rec){
      var items = rec.pollenSnapshot && rec.pollenSnapshot.items || [];
      var top = items.slice().sort(function(a,b){ return Number(b.value||0)-Number(a.value||0); })[0] || null;
      return '<button type="button" class="change-profile-day-row" data-pollen-profile-day="'+esc(rec.date)+'"><span>'+esc(formatLongDate(rec.date))+'</span><em>'+dayDots(rec)+'</em><strong>'+esc(pollenBadge(top))+'</strong><i>›</i></button>';
    }).join('') || '<div class="change-profile-empty">Noch keine vollständigen Tage vorhanden.</div>';
    var insights = [];
    if(result.highDays) insights.push('An '+result.highFreeDays+' von '+result.highDays+' Tagen mit erhöhter Pollenbelastung warst du beschwerdefrei.');
    if(b && b.symptomDays) insights.push(b.symptomLabel+' trat an '+b.symptomDays+' von '+b.days+' Tagen mit erhöhter '+b.name+'-Belastung auf.');
    if(records.length < 10) insights.push('Noch '+Math.max(1, 10-records.length)+' vollständige Tage, bis deine Auswertung deutlich präziser wird.');
    if(!insights.length) insights.push('Noch keine belastbare Tendenz. Deine Daten bleiben als Rohdaten gespeichert.');
    var insightRows = insights.map(function(t){ return '<div class="change-profile-insight-row"><span></span><p>'+esc(t)+'</p></div>'; }).join('');
    return '<div class="change-profile-overlay" data-pollen-profile-overlay="1">'
      + '<div class="change-profile-panel" role="dialog" aria-modal="true" aria-label="Dein Allergieprofil">'
      + '<div class="change-profile-top"><button type="button" data-pollen-profile-close="1">‹</button><strong>Dein Allergieprofil</strong><span></span></div>'
      + '<div class="change-profile-hero"><div class="change-profile-leaf" aria-hidden="true"></div><div><strong>'+records.length+' vollständige Tage erfasst</strong><span>'+(first && last ? esc(first+' – '+last) : 'Auswertungen starten mit vollständigen Tagen')+'</span><small>Auswertungen basieren auf bewusst bewerteten Symptomen.</small></div></div>'
      + '<div class="change-profile-section"><h3>Zusammenfassung</h3><div class="change-profile-summary"><strong>'+esc(title)+'</strong><p>'+esc(text)+'</p>'+profileBars(result)+'</div></div>'
      + '<div class="change-profile-mini-grid"><div><b>'+result.highFreeDays+' / '+Math.max(0,result.highDays)+'</b><span>beschwerdefreie Tage trotz höherer Pollen</span><em>'+freePct+'%</em></div><div><b>'+esc(b && b.symptomLabel || 'Noch offen')+'</b><span>häufigster Beschwerdebereich</span><em>'+records.length+' Tage</em></div></div>'
      + '<div class="change-profile-section"><h3>Was Change erkennt</h3><div class="change-profile-insights">'+insightRows+'</div></div>'
      + '<div class="change-profile-section"><h3>Letzte Tage</h3><div class="change-profile-days">'+dayRows+'</div></div>'
      + '</div></div>';
  }
  function dayDetailHtml(date){
    var rec = get(date);
    var items = rec.pollenSnapshot && rec.pollenSnapshot.items || [];
    var topItems = items.slice().sort(function(a,b){ return Number(b.value||0)-Number(a.value||0); }).slice(0,4);
    var pollen = topItems.map(function(p){ return '<span><b>'+esc(p.name)+'</b><em>'+esc(pollenBadge(p))+'</em></span>'; }).join('') || '<span><b>Pollen</b><em>Keine Daten</em></span>';
    var symptoms = FIELDS.map(function(field){
      var v = symptomValue(rec, field.key);
      var label = v == null ? 'Offen' : LEVELS.filter(function(l){ return l.key === v; })[0].label;
      return '<div class="change-profile-symptom-line"><span>'+symptomIconSvg(field.key)+' '+esc(field.label)+'</span><strong>'+esc(label)+'</strong></div>';
    }).join('');
    var score = totalSymptomScore(rec);
    var rating = score === 0 ? 'Sehr guter Tag' : (score <= 3 ? 'Guter Tag' : (score <= 7 ? 'Auffälliger Tag' : 'Starker Beschwerdetag'));
    return '<div class="change-profile-overlay" data-pollen-profile-overlay="1"><div class="change-profile-panel change-profile-detail" role="dialog" aria-modal="true" aria-label="Tagesdetails">'
      + '<div class="change-profile-top"><button type="button" data-pollen-profile-back="1">‹</button><strong>Tagesdetails</strong><span></span></div>'
      + '<div class="change-profile-date-card">'+esc(formatLongDate(date))+'</div>'
      + '<div class="change-profile-section"><h3>Pollenbelastung</h3><div class="change-profile-pollen-list">'+pollen+'</div></div>'
      + '<div class="change-profile-section"><h3>Meine Symptome</h3><div class="change-profile-symptoms">'+symptoms+'</div></div>'
      + '<div class="change-profile-section"><h3>Notiz</h3><p class="change-profile-note">'+esc(rec.note || 'Keine Notiz hinterlegt.')+'</p></div>'
      + '<div class="change-profile-rating"><strong>'+esc(rating)+'</strong><span>'+esc(completenessText(rec))+'</span></div>'
      + '</div></div>';
  }
  function openProfile(){
    closeProfile();
    document.body.insertAdjacentHTML('beforeend', profileViewHtml());
    document.body.classList.add('change-profile-open');
  }
  function openDayDetail(date){
    closeProfile();
    document.body.insertAdjacentHTML('beforeend', dayDetailHtml(date));
    document.body.classList.add('change-profile-open');
  }
  function closeProfile(){
    document.querySelectorAll('[data-pollen-profile-overlay]').forEach(function(el){ el.remove(); });
    document.body.classList.remove('change-profile-open');
  }
  function symptomIconSvg(key){
    // Symptom-Icon-Set v0.1.0278: übernimmt ausschließlich die neue Bildsprache.
    var map = {
      sneeze:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M11 43 V16 C11 10 15 6 21 6 C26 6 30 10 30 16 C30 19 32 20.5 34 23 C35 24.5 34 26 32 26 L29 26 C28 27 28 29 29 30 C30 31 29 33 26 33 L24 33 C24 36 23 38 20 38 L11 38 Z" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path><g fill="#F87171"><circle cx="42.5" cy="18" r="1.7"></circle><circle cx="44.5" cy="28" r="1.6"></circle><circle cx="38.5" cy="31" r="1.3"></circle></g></svg></span>',
      eyes:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M7 21 C13 13 29 13 35 21 C29 29 13 29 7 21Z" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="21" cy="21" r="4.6" stroke="currentColor" stroke-width="2.1"></circle><path d="M33 28 C33 33 29 35 29 39.5 C29 42 30.8 43.6 33 43.6 C35.2 43.6 37 42 37 39.5 C37 35 33 33 33 28Z" fill="currentColor" fill-opacity=".35" stroke="currentColor" stroke-width="1.4"></path></svg></span>',
      nose:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M27 8 C24 14 21 21 20 25 C19.4 28 21 30.5 25 31.5 C29 32.3 31 33.5 29 35" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21 37 C24 39 28 39 30.5 35.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"></path><circle cx="25.5" cy="34" r="1.1" fill="currentColor" stroke="none"></circle></svg></span>',
      breath:'<span class="change-symptom-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8 V22"></path><path d="M24 18 C24 18 22 22 20 22 C18 22 18 26 18 26"></path><path d="M24 18 C24 18 26 22 28 22 C30 22 30 26 30 26"></path><path d="M18 22 C13 23 10 28 10 34 C10 39 13 41 16 39 C18 38 18 32 18 28Z"></path><path d="M30 22 C35 23 38 28 38 34 C38 39 35 41 32 39 C30 38 30 32 30 28Z"></path></svg></span>'
    };
    return map[key] || map.sneeze;
  }

  function levelButtons(field, value, date, answered){
    return LEVELS.map(function(level){
      var active = answered === true && Number(value || 0) === level.key ? ' active' : '';
      return '<button type="button" class="change-symptom-level'+active+'" data-level="'+level.key+'" data-symptom-field="'+esc(field)+'" data-symptom-value="'+level.key+'" data-symptom-date="'+esc(date)+'">'+esc(level.label)+'</button>';
    }).join('');
  }
  function panelHtml(date, forecast){
    setForecast(forecast || latestForecast);
    var key = date || todayKey();
    var rec = get(key);
    if(!rec.pollenSnapshot) rec.pollenSnapshot = snapshotFor(key);
    var rows = FIELDS.map(function(field){
      var answered = isAnswered(rec, field.key);
      var value = answered ? (rec.symptoms && rec.symptoms[field.key] != null ? rec.symptoms[field.key] : 0) : null;
      return '<div class="change-symptom-row" data-symptom-row="'+esc(field.key)+'"><div class="change-symptom-label">'+symptomIconSvg(field.key)+'<strong>'+esc(field.label)+'</strong></div><div class="change-symptom-levels">'+levelButtons(field.key, value, key, answered)+'</div></div>';
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
      var open = ev.target && ev.target.closest ? ev.target.closest('[data-pollen-profile-open]') : null;
      if(open){ ev.preventDefault(); openProfile(); return; }
      var close = ev.target && ev.target.closest ? ev.target.closest('[data-pollen-profile-close]') : null;
      if(close){ ev.preventDefault(); closeProfile(); return; }
      var back = ev.target && ev.target.closest ? ev.target.closest('[data-pollen-profile-back]') : null;
      if(back){ ev.preventDefault(); openProfile(); return; }
      var day = ev.target && ev.target.closest ? ev.target.closest('[data-pollen-profile-day]') : null;
      if(day){ ev.preventDefault(); openDayDetail(day.getAttribute('data-pollen-profile-day')); return; }
      var backdrop = ev.target && ev.target.matches && ev.target.matches('[data-pollen-profile-overlay]') ? ev.target : null;
      if(backdrop){ ev.preventDefault(); closeProfile(); return; }
      var btn = ev.target && ev.target.closest ? ev.target.closest('[data-symptom-field]') : null;
      if(!btn) return;
      ev.preventDefault();
      var date = btn.getAttribute('data-symptom-date') || todayKey();
      var field = btn.getAttribute('data-symptom-field');
      var value = parseInt(btn.getAttribute('data-symptom-value'), 10) || 0;
      var rec = get(date);
      rec.symptoms[field] = value;
      rec.answered[field] = true;
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
    openProfile: openProfile,
    install: install
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
