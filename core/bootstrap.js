/* Change App · Bootstrap · Kalender-Initialisierung
 * Aus index.html extrahiert — Code unverändert
 * NICHT direkt bearbeiten — stattdessen in die passende core/ oder features/ Datei
 */

/* ── change-core-calendar-bootstrap ── */
(function(){
  'use strict';

  var STATE_OPTIONS_BOOT = {
    ALL:'Alle Bundesländer',
    BW:'Baden-Württemberg',
    BY:'Bayern',
    'BY-AUGSBURG':'Bayern · Augsburg',
    BE:'Berlin',
    BB:'Brandenburg',
    HB:'Bremen',
    HH:'Hamburg',
    HE:'Hessen',
    MV:'Mecklenburg-Vorpommern',
    NI:'Niedersachsen',
    NW:'Nordrhein-Westfalen',
    RP:'Rheinland-Pfalz',
    SL:'Saarland',
    SN:'Sachsen',
    ST:'Sachsen-Anhalt',
    SH:'Schleswig-Holstein',
    TH:'Thüringen'
  };
  var VALID_STATES = Object.keys(STATE_OPTIONS_BOOT).reduce(function(acc,k){ acc[k]=true; return acc; }, {});
  var LABEL_TO_STATE = {
    'alle bundesländer':'ALL',
    'alle bundeslaender':'ALL',
    'bundesweite feiertage':'ALL',
    'baden-württemberg':'BW',
    'baden-wuerttemberg':'BW',
    'bayern':'BY',
    'bayern · augsburg':'BY-AUGSBURG',
    'bayern augsburg':'BY-AUGSBURG',
    'augsburg':'BY-AUGSBURG',
    'berlin':'BE',
    'brandenburg':'BB',
    'bremen':'HB',
    'hamburg':'HH',
    'hessen':'HE',
    'mecklenburg-vorpommern':'MV',
    'niedersachsen':'NI',
    'nordrhein-westfalen':'NW',
    'rheinland-pfalz':'RP',
    'saarland':'SL',
    'sachsen':'SN',
    'sachsen-anhalt':'ST',
    'schleswig-holstein':'SH',
    'thüringen':'TH',
    'thueringen':'TH'
  };

  function readRaw(key){
    try{ return localStorage.getItem(key); }catch(e){ return null; }
  }
  function writeRaw(key,value){
    try{ localStorage.setItem(key,value); }catch(e){}
  }
  function cleanState(value){
    if(value == null || value === '') return '';
    var s = String(value).trim();
    for(var i=0;i<3;i++){
      if((s.charAt(0)==='"' && s.charAt(s.length-1)==='"') || (s.charAt(0)==="'" && s.charAt(s.length-1)==="'")){
        try{ s = JSON.parse(s); }catch(e){ s = s.slice(1,-1); }
        s = String(s).trim();
      }
    }
    s = s.replace(/^BY_AUGSBURG$/i,'BY-AUGSBURG').toUpperCase();
    if(VALID_STATES[s]) return s;
    return LABEL_TO_STATE[String(value).trim().replace(/^"|"$/g,'').toLowerCase()] || '';
  }
  function readState(){
    var keys = ['change_v1_holiday_state','holiday_state'];
    for(var i=0;i<keys.length;i++){
      var raw = readRaw(keys[i]);
      var st = cleanState(raw);
      if(st) return st;
      try{ st = cleanState(JSON.parse(raw || 'null')); if(st) return st; }catch(e){}
    }
    return cleanState(window.calendarSettings && window.calendarSettings.state) || 'ALL';
  }
  function readHolidayNotifications(){
    var raw = readRaw('holiday_notifications');
    if(raw == null) return true;
    if(raw === 'false' || raw === '0') return false;
    try{ return JSON.parse(raw) !== false; }catch(e){ return true; }
  }
  function writeState(state){
    var st = cleanState(state) || 'ALL';
    writeRaw('change_v1_holiday_state', st);
    writeRaw('holiday_state', st);
    window.calendarSettings = window.calendarSettings || {};
    window.calendarSettings.state = st;
    return st;
  }

  window.STATE_OPTIONS = window.STATE_OPTIONS || STATE_OPTIONS_BOOT;
  // Top-Level var ist bewusst nötig: ältere App-Blöcke greifen per `calendarSettings` / `STATE_OPTIONS` zu.
  window.calendarSettings = window.calendarSettings || { state: readState(), holidayNotifications: readHolidayNotifications() };
  window.calendarSettings.state = cleanState(window.calendarSettings.state) || readState();
  if(typeof window.calendarSettings.holidayNotifications !== 'boolean') window.calendarSettings.holidayNotifications = readHolidayNotifications();
  window.getHolidayState = window.getHolidayState || readState;
  window.setHolidayState = window.setHolidayState || writeState;
  writeState(window.calendarSettings.state);

  function pad(n){ return String(n).padStart(2,'0'); }
  function dateKeyLocal(date){ return date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate()); }
  function addDaysLocal(date, days){ var d = new Date(date.getTime()); d.setDate(d.getDate()+days); return d; }
  function easterDate(year){
    var a=year%19, b=Math.floor(year/100), c=year%100, d=Math.floor(b/4), e=b%4;
    var f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
    var i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
    var m=Math.floor((a+11*h+22*l)/451), month=Math.floor((h+l-7*m+114)/31);
    var day=((h+l-7*m+114)%31)+1;
    return new Date(year, month-1, day, 12, 0, 0);
  }
  function holiday(date,name,states,local){ return { date: dateKeyLocal(date), name: name, states: states || ['ALL'], local: !!local }; }

  window.getGermanHolidays = window.getGermanHolidays || function(year){
    var e = easterDate(year);
    var nov23 = new Date(year,10,23,12,0,0);
    var offset = (nov23.getDay()+4)%7;
    return [
      holiday(new Date(year,0,1,12,0,0),'Neujahr',['ALL']),
      holiday(new Date(year,0,6,12,0,0),'Heilige Drei Könige',['BW','BY','BY-AUGSBURG','ST']),
      holiday(new Date(year,2,8,12,0,0),'Internationaler Frauentag',['BE','MV']),
      holiday(addDaysLocal(e,-2),'Karfreitag',['ALL']),
      holiday(addDaysLocal(e,1),'Ostermontag',['ALL']),
      holiday(new Date(year,4,1,12,0,0),'Tag der Arbeit',['ALL']),
      holiday(addDaysLocal(e,39),'Christi Himmelfahrt',['ALL']),
      holiday(addDaysLocal(e,50),'Pfingstmontag',['ALL']),
      holiday(addDaysLocal(e,60),'Fronleichnam',['BW','BY','BY-AUGSBURG','HE','NW','RP','SL']),
      holiday(new Date(year,7,8,12,0,0),'Augsburger Friedensfest',['BY-AUGSBURG'],true),
      holiday(new Date(year,7,15,12,0,0),'Mariä Himmelfahrt',['BY','BY-AUGSBURG','SL']),
      holiday(new Date(year,8,20,12,0,0),'Weltkindertag',['TH']),
      holiday(new Date(year,9,3,12,0,0),'Tag der Deutschen Einheit',['ALL']),
      holiday(new Date(year,9,31,12,0,0),'Reformationstag',['BB','MV','SN','ST','TH','HB','HH','NI','SH']),
      holiday(new Date(year,10,1,12,0,0),'Allerheiligen',['BW','BY','BY-AUGSBURG','NW','RP','SL']),
      holiday(addDaysLocal(nov23,-offset),'Buß- und Bettag',['SN']),
      holiday(new Date(year,11,25,12,0,0),'1. Weihnachtstag',['ALL']),
      holiday(new Date(year,11,26,12,0,0),'2. Weihnachtstag',['ALL'])
    ];
  };

  window.getHolidaysForDate = function(dateKey){
    var dk = String(dateKey || '').slice(0,10);
    var year = parseInt(dk.slice(0,4),10);
    if(!year) return [];
    var state = cleanState(window.calendarSettings && window.calendarSettings.state) || readState();
    return (window.getGermanHolidays(year) || []).filter(function(h){
      if(h.date !== dk) return false;
      if(h.states.indexOf('ALL') !== -1) return true;
      if(state === 'ALL') return true;
      return h.states.indexOf(state) !== -1;
    });
  };
})();
var STATE_OPTIONS = window.STATE_OPTIONS;
var calendarSettings = window.calendarSettings;

