/* Change App · Challenge Difficulty
 * Zentrale Logik für automatisch erzeugte Sport-Challenges.
 * UI darf nur diese API verwenden; keine Schwierigkeitslogik in features/.
 */
(function(){
  'use strict';

  var STORAGE_KEYS = ['change_v1_challenge_difficulty', 'challenge_difficulty'];
  var DEFAULT_LEVEL = 'easy';
  var DAILY_COUNT = 7;
  var YT = 'https://www.youtube.com/results?search_query=';

  var LEVELS = {
    easy: {
      id: 'easy', label: 'Leicht', tone: 'ok', pointsRange: '6–12 P',
      description: 'Kurze, saubere Alltagsbewegung ohne Überforderung.',
      pool: [
        ['squat_10','🏋️','10 Kniebeugen',10,'Füße schulterbreit, Rücken gerade, langsam runter und stabil hoch.','kniebeugen+richtig+ausfuehren'],
        ['wall_push_10','💪','10 Wand-Liegestütze',10,'Hände auf Schulterhöhe an der Wand, Körper gerade, Arme kontrolliert beugen.','wand+liegestuetze+richtig'],
        ['plank_20','⏱️','20 Sek. Unterarmstütz',10,'20 Sekunden Plank. Leichtere Variante: Knie auf den Boden.','plank+unterarmstuetz+anfaenger'],
        ['calf_15','🦵','15 Wadenheben',8,'Fersen langsam anheben und kontrolliert absenken.','wadenheben+stehend+anfaenger'],
        ['march_2','🚶','2 Min. Marschieren',8,'Auf der Stelle marschieren, Knie locker anheben, Arme mitschwingen.','marschieren+stelle+zuhause+training'],
        ['shoulder_30','🙆','30 Sek. Schulterkreisen',6,'Schultern langsam nach hinten und vorne kreisen.','schulterkreisen+dehnen+uebung'],
        ['balance_30','⚖️','30 Sek. Balance',7,'15 Sekunden je Bein stehen, Wand zur Hilfe erlaubt.','einbeinstand+balance+uebung'],
        ['stretch_60','🧘','60 Sek. Dehnen',8,'Schultern, Rücken oder Beine sanft dehnen.','dehnen+anfaenger+60+sekunden'],
        ['catcow_30','🐱','Cat-Cow 30 Sek.',7,'Auf Händen und Knien: Rücken rund machen und durchstrecken.','cat+cow+ruecken+uebung+yoga'],
        ['arm_circle_30','🙋','Armkreisen 30 Sek.',6,'Arme ausstrecken, große Kreise vor und zurück.','armkreisen+schulter+aufwaermen']
      ]
    },
    medium: {
      id: 'medium', label: 'Mittel', tone: 'warn', pointsRange: '14–25 P',
      description: 'Spürbar aktiver: mehr Wiederholungen, längere Haltezeiten.',
      pool: [
        ['squat_25','🏋️','25 Kniebeugen',22,'25 saubere Kniebeugen in gleichmäßigem Tempo.','kniebeugen+25+wiederholungen'],
        ['push_10','💪','10 Liegestütze',22,'Klassische Liegestütze, Körper gerade wie ein Brett. Knie-Variante erlaubt.','liegestuetze+10+richtig+ausfuehren'],
        ['plank_45','⏱️','45 Sek. Unterarmstütz',24,'45 Sekunden Plank, Bauch angespannt, Hüfte stabil.','plank+45+sekunden+training'],
        ['lunge_20','🏃','20 Ausfallschritte',22,'10 pro Bein, Oberkörper aufrecht, Knie kontrolliert beugen.','ausfallschritte+20+wiederholungen'],
        ['jump_40','🦘','40 Hampelmänner',20,'40 Hampelmänner zügig, locker und kontrolliert.','hampelmann+40+training'],
        ['wall_sit_60','🪑','60 Sek. Wandsitz',24,'Rücken an die Wand, Knie etwa 90°, ruhig atmen.','wandsitzen+60+sekunden'],
        ['mountain_30','🏔️','30 Mountain Climbers',22,'Liegestütz-Position, Knie abwechselnd zur Brust ziehen.','mountain+climber+uebung'],
        ['crunch_25','🤸','25 Crunches',18,'Langsam und kontrolliert, nicht am Nacken ziehen.','crunches+25+bauchmuskel'],
        ['stair_4','🪜','4 Min. Treppensteigen',24,'Treppenhaus oder Step: 4 Minuten aktives Tempo.','treppensteigen+training+zuhause'],
        ['bird_dog_20','🐦','20 Bird-Dog',18,'10 je Seite, kurz halten, Rumpf stabil.','bird+dog+uebung+ruecken']
      ]
    },
    hard: {
      id: 'hard', label: 'Schwer', tone: 'error', pointsRange: '30–50 P',
      description: 'Deutlich anstrengend: längere Sätze und echte Belastung.',
      pool: [
        ['squat_60','🏋️','60 Kniebeugen',42,'60 Kniebeugen in 2–3 sauberen Sätzen. Technik vor Tempo.','kniebeugen+60+challenge'],
        ['push_25','💪','25 Liegestütze',45,'25 Liegestütze, bei Bedarf in mehreren Sätzen.','liegestuetze+25+challenge'],
        ['plank_120','⏱️','2 Min. Plank',45,'2 Minuten Plank, Pausen kurz halten, Rumpf stabil.','plank+2+minuten+training'],
        ['lunge_50','🏃','50 Ausfallschritte',42,'25 pro Bein, kontrolliert und sauber.','ausfallschritte+50+challenge'],
        ['burpee_15','🔥','15 Burpees',50,'15 Burpees sauber ausführen, bei Bedarf kurze Pausen.','burpees+15+challenge'],
        ['mountain_80','🏔️','80 Mountain Climbers',42,'80 schnelle Mountain Climbers, Rücken stabil halten.','mountain+climbers+80'],
        ['wall_sit_120','🪑','2 Min. Wandsitz',45,'2 Minuten Wandsitz, Oberschenkel arbeiten lassen.','wandsitzen+2+minuten'],
        ['jump_100','🦘','100 Hampelmänner',38,'100 Hampelmänner in aktivem Tempo.','100+hampelmaenner+challenge'],
        ['stair_8','🪜','8 Min. Treppensteigen',48,'8 Minuten Treppen oder Step-Ups ohne langes Stoppen.','treppensteigen+8+minuten'],
        ['core_mix','⚡','Core-Mix 5 Min.',50,'5 Minuten Wechsel: Plank, Crunches, Mountain Climbers.','core+workout+5+minuten']
      ]
    },
    hardcore: {
      id: 'hardcore', label: 'Hardcore', tone: 'error', pointsRange: '60–100 P',
      description: 'Sehr fordernd: Kombi-Aufgaben, hohe Wiederholungen, viel Zeit.',
      pool: [
        ['squat_150','🏋️','150 Kniebeugen',90,'150 Kniebeugen in mehreren sauberen Sätzen. Nicht auf Kosten der Technik.','150+kniebeugen+challenge'],
        ['push_75','💪','75 Liegestütze',100,'75 Liegestütze in mehreren Sätzen. Knie-Variante nur wenn nötig.','75+liegestuetze+challenge'],
        ['plank_300','⏱️','5 Min. Plank gesamt',95,'Sammle 5 Minuten Plank-Zeit. Kurze Pausen sind erlaubt.','5+minuten+plank+challenge'],
        ['burpee_40','🔥','40 Burpees',100,'40 Burpees in sauberer Form. Teile in Sets auf.','40+burpees+challenge'],
        ['lunge_120','🏃','120 Ausfallschritte',90,'60 pro Bein, kontrolliert, Pausen kurz halten.','120+ausfallschritte+challenge'],
        ['mountain_200','🏔️','200 Mountain Climbers',85,'200 Mountain Climbers mit stabilem Oberkörper.','200+mountain+climbers+challenge'],
        ['wallsit_300','🪑','5 Min. Wandsitz gesamt',90,'Sammle 5 Minuten Wandsitz-Zeit in Sets.','5+minuten+wandsitz+challenge'],
        ['cardio_20','⚡','20 Min. Cardio-Block',100,'20 Minuten: Treppen, Hampelmänner, Marschieren oder Joggen.','20+minuten+cardio+zuhause'],
        ['fullbody_15','🏆','15 Min. Full-Body',100,'15 Minuten Zirkel: Kniebeugen, Liegestütze, Plank, Burpees.','15+minuten+full+body+workout'],
        ['jump_300','🦘','300 Hampelmänner',85,'300 Hampelmänner in mehreren Sets. Ruhig atmen, sauber landen.','300+hampelmaenner+challenge']
      ]
    }
  };

  function normalize(value){
    value = String(value || '').toLowerCase().trim();
    if(value === 'leicht') value = 'easy';
    if(value === 'mittel') value = 'medium';
    if(value === 'schwer') value = 'hard';
    if(LEVELS[value]) return value;
    return DEFAULT_LEVEL;
  }
  function readRaw(key){
    try{
      var raw = localStorage.getItem(key);
      if(raw == null) return null;
      try{ return JSON.parse(raw); }catch(_){ return raw; }
    }catch(e){ return null; }
  }
  function writeRaw(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }
  function getDifficulty(){
    for(var i=0;i<STORAGE_KEYS.length;i++){
      var v = readRaw(STORAGE_KEYS[i]);
      if(v) return normalize(v);
    }
    return DEFAULT_LEVEL;
  }
  function isAutoChallengesEnabled(){
    var keys = ['change_v1_auto_challenges_enabled','auto_challenges_enabled'];
    for(var i=0;i<keys.length;i++){
      var v = readRaw(keys[i]);
      if(v === true || v === false) return v;
    }
    return true;
  }
  function setDifficulty(value, options){
    var next = normalize(value);
    STORAGE_KEYS.forEach(function(key){ writeRaw(key, next); });
    try{ if(typeof window.ls === 'function') window.ls('challenge_difficulty', next); }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('change:challenge-difficulty', {detail:{difficulty:next}})); }catch(e){}
    if(!options || options.render !== false){
      try{ if(typeof window.renderChallenges === 'function') window.renderChallenges(); }catch(e){}
      try{ if(typeof window.renderCalendar === 'function') window.renderCalendar(); }catch(e){}
      try{ if(typeof window.buildDashboard === 'function') window.buildDashboard(); }catch(e){}
    }
    return next;
  }
  function pad(n){ return String(n).padStart(2,'0'); }
  function todayKey(){
    var d = new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  }
  function seedFor(key){
    return String(key || '').split('').reduce(function(acc, ch){ return ((acc * 31) + ch.charCodeAt(0)) >>> 0; }, 2166136261);
  }
  function rotateDeterministic(list, key){
    var arr = list.slice();
    if(!arr.length) return arr;
    arr.sort(function(a,b){ return String(a[0]).localeCompare(String(b[0])); });
    var off = seedFor(key) % arr.length;
    return arr.slice(off).concat(arr.slice(0, off));
  }
  function toChallenge(tuple, index, dateKey, difficulty){
    var cfg = LEVELS[difficulty] || LEVELS[DEFAULT_LEVEL];
    return {
      id: 'auto_'+dateKey+'_sport_'+difficulty+'_'+tuple[0],
      sourceId: tuple[0],
      title: tuple[2],
      desc: tuple[4],
      points: tuple[3],
      icon: tuple[1],
      url: YT + tuple[5],
      level: cfg.label,
      difficulty: difficulty,
      difficultyLabel: cfg.label,
      difficultyTone: cfg.tone,
      date: dateKey,
      recurrence: 'once',
      active: true,
      auto: true,
      type: 'Sport',
      sortIndex: index,
      createdAt: dateKey+'T00:00:00.000Z'
    };
  }
  function buildDailyChallenges(dateKey, difficulty){
    dateKey = String(dateKey || todayKey()).slice(0,10);
    if(!isAutoChallengesEnabled()) return [];
    difficulty = normalize(difficulty || getDifficulty());
    var cfg = LEVELS[difficulty] || LEVELS[DEFAULT_LEVEL];
    return rotateDeterministic(cfg.pool, dateKey+'|'+difficulty).slice(0, DAILY_COUNT).map(function(tuple, index){
      return toChallenge(tuple, index, dateKey, difficulty);
    });
  }
  function findChallengeById(id){
    id = String(id || '');
    var levels = Object.keys(LEVELS);
    var today = todayKey();
    for(var i=0;i<levels.length;i++){
      var built = buildDailyChallenges(today, levels[i]);
      for(var j=0;j<built.length;j++) if(String(built[j].id) === id || String(built[j].sourceId) === id) return built[j];
    }
    return null;
  }
  function selectOptions(selected){
    selected = normalize(selected || getDifficulty());
    return Object.keys(LEVELS).map(function(key){
      var cfg = LEVELS[key];
      return '<option value="'+key+'" '+(selected===key?'selected':'')+'>'+cfg.label+' · '+cfg.pointsRange+'</option>';
    }).join('');
  }
  function allTemplates(){
    var out = [];
    Object.keys(LEVELS).forEach(function(level){
      LEVELS[level].pool.forEach(function(tuple, index){ out.push(toChallenge(tuple, index, todayKey(), level)); });
    });
    return out;
  }

  window.ChangeChallengeDifficulty = {
    levels: LEVELS,
    normalize: normalize,
    get: getDifficulty,
    set: setDifficulty,
    isAutoEnabled: isAutoChallengesEnabled,
    buildDailyChallenges: buildDailyChallenges,
    findChallengeById: findChallengeById,
    selectOptions: selectOptions,
    allTemplates: allTemplates,
    currentMeta: function(){ return LEVELS[getDifficulty()] || LEVELS[DEFAULT_LEVEL]; }
  };
})();
