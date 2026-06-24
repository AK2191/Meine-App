/* Change App · Core · Geburtstags-Erkennung
 * Sichtbares Wording: „Geburtstage".
 * Erkannte Kalender-Schreibweisen: Bday, B-day, Birthday, Geburtstag, Geb.
 */
(function(){
  'use strict';

  var DAY = 24 * 60 * 60 * 1000;
  var KEYWORD_RE = /(^|[\s\-_:()\[\]{}.,;!¡¿?\/\\|])(?:b\s*-?\s*day|birthday|geburtstag|geb\.)(?=$|[\s\-_:()\[\]{}.,;!¡¿?\/\\|])/i;
  var CLEAN_KEYWORD_RE = /(?:\bb\s*-?\s*day\b|\bbirthday\b|\bgeburtstag\b|\bgeb\.)/ig;

  function pad(n){ return String(n).padStart(2, '0'); }
  function dateKey(value){
    if(!value) return '';
    if(value instanceof Date){ return value.getFullYear()+'-'+pad(value.getMonth()+1)+'-'+pad(value.getDate()); }
    var s = String(value || '');
    if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
    try{
      var d = new Date(s);
      if(!isNaN(d.getTime())) return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
    }catch(e){}
    return '';
  }
  function addDays(key, n){ var d = new Date(key+'T12:00:00'); d.setDate(d.getDate()+n); return dateKey(d); }
  function daysBetween(a, b){ return Math.round((new Date(b+'T12:00:00') - new Date(a+'T12:00:00')) / DAY); }
  function todayKey(){ return dateKey(new Date()); }
  function titleOf(ev){ return String((ev && (ev.title || ev.summary || ev.name)) || '').trim(); }
  function startOf(ev){
    if(!ev) return '';
    return dateKey(ev.date || ev.startDate || ev.dateKey || (ev.start && (ev.start.date || ev.start.dateTime)) || ev.createdAt);
  }
  function sourceId(ev){
    if(!ev) return '';
    return String(ev.googleEventId || ev.id || [titleOf(ev), startOf(ev)].join('_')).replace(/^g_/, '');
  }
  function slug(value){
    return String(value || 'birthday')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'birthday';
  }
  function normalizeSpaces(value){ return String(value || '').replace(/\s+/g, ' ').trim(); }
  function cleanName(rawTitle){
    var title = String(rawTitle || '');
    title = title.replace(/[🎂🎉🥳]/g, ' ');
    title = title.replace(CLEAN_KEYWORD_RE, ' ');
    title = title.replace(/\b(?:von|für|fuer|zum|zur|der|die|das|am)\b/ig, ' ');
    title = title.replace(/^[\s\-_:.,;\/\\|]+|[\s\-_:.,;\/\\|]+$/g, ' ');
    title = normalizeSpaces(title);
    if(!title) title = 'Geburtstag';
    return title;
  }
  function isBirthdayTitle(title){ return KEYWORD_RE.test(String(title || '')); }
  function parseEvent(ev){
    var title = titleOf(ev);
    if(!isBirthdayTitle(title)) return null;
    var start = startOf(ev);
    if(!start) return null;
    var name = cleanName(title);
    var sid = sourceId(ev);
    return {
      id: 'birthday_' + slug(name) + '_' + start.slice(5) + '_' + slug(sid).slice(0, 32),
      name: name,
      date: start,
      monthDay: start.slice(5),
      rawTitle: title,
      sourceEventId: sid,
      source: (ev && (ev.source || (sid ? 'google' : 'local'))) || 'calendar'
    };
  }
  function nextOccurrence(parsed, fromKey){
    if(!parsed || !parsed.monthDay) return '';
    fromKey = fromKey || todayKey();
    var y = parseInt(fromKey.slice(0,4), 10) || (new Date()).getFullYear();
    var cand = y + '-' + parsed.monthDay;
    if(cand < fromKey) cand = (y + 1) + '-' + parsed.monthDay;
    return cand;
  }
  function toCalendarEvent(parsed, occurrenceKey){
    if(!parsed) return null;
    var key = occurrenceKey || parsed.date;
    return {
      id: 'birthday_' + slug(parsed.name) + '_' + key,
      title: '🎂 ' + parsed.name,
      summary: '🎂 ' + parsed.name,
      date: key,
      startDate: key,
      endDate: key,
      time: '',
      endTime: '',
      allDay: true,
      color: 'purple',
      type: 'birthday',
      source: 'birthday',
      birthdayName: parsed.name,
      birthdayRawTitle: parsed.rawTitle,
      birthdaySourceEventId: parsed.sourceEventId,
      originalDate: parsed.date,
      generatedFrom: 'birthday-parser'
    };
  }
  function collectRawEvents(){
    var raw = [];
    try{ if(Array.isArray(window.events)) window.events.forEach(function(e){ raw.push(e); }); }catch(e){}
    try{ if(Array.isArray(window.gEvents)) window.gEvents.forEach(function(e){ raw.push(e); }); }catch(e){}
    return raw;
  }
  function parseEvents(rawEvents){
    var seen = Object.create(null);
    var out = [];
    (Array.isArray(rawEvents) ? rawEvents : []).forEach(function(ev){
      var p = parseEvent(ev);
      if(!p) return;
      var key = p.name.toLowerCase() + '|' + p.monthDay;
      if(seen[key]) return;
      seen[key] = true;
      out.push(p);
    });
    return out.sort(function(a,b){ return a.monthDay.localeCompare(b.monthDay) || a.name.localeCompare(b.name); });
  }
  function upcoming(limitDays, fromKey){
    fromKey = fromKey || todayKey();
    var max = addDays(fromKey, typeof limitDays === 'number' ? limitDays : 90);
    return parseEvents(collectRawEvents()).map(function(p){
      var next = nextOccurrence(p, fromKey);
      return Object.assign({}, p, {nextDate: next, diff: daysBetween(fromKey, next)});
    }).filter(function(p){ return p.nextDate >= fromKey && p.nextDate <= max; })
      .sort(function(a,b){ return a.nextDate.localeCompare(b.nextDate) || a.name.localeCompare(b.name); });
  }
  function calendarEventsFor(rawEvents){
    var from = todayKey();
    var currentYear = parseInt(from.slice(0,4), 10) || (new Date()).getFullYear();
    var list = [];
    parseEvents(rawEvents).forEach(function(p){
      [currentYear - 1, currentYear, currentYear + 1].forEach(function(y){
        list.push(toCalendarEvent(p, y + '-' + p.monthDay));
      });
    });
    return list;
  }

  window.ChangeBirthdayParser = {
    isBirthdayTitle: isBirthdayTitle,
    parseEvent: parseEvent,
    parseEvents: parseEvents,
    toCalendarEvent: toCalendarEvent,
    calendarEventsFor: calendarEventsFor,
    upcoming: upcoming,
    todayKey: todayKey,
    dateKey: dateKey,
    daysBetween: daysBetween,
    cleanName: cleanName
  };
})();
