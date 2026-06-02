/* Change App · Termin teilen
 * Erstellt Kalenderdateien (.ics) und nutzt die native Teilen-Funktion.
 * Ziel: iOS, Android, Desktop und WhatsApp über die Teilen-Auswahl unterstützen.
 */
(function(){
  'use strict';
  if(window.ChangeEventShare && window.ChangeEventShare.loaded) return;

  var TZ = 'Europe/Berlin';
  var registry = {};
  var counter = 0;

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>\"'`]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;','`':'&#96;'}[c];
    });
  }
  function pad2(n){ return String(n).padStart(2, '0'); }
  function toast(message, type){
    try{ if(typeof window.toast === 'function') window.toast(message, type || 'ok'); }catch(e){}
  }
  function titleOf(event){ return String((event && (event.title || event.summary || event.name)) || 'Termin').trim() || 'Termin'; }
  function descOf(event){ return String((event && (event.desc || event.description || event.notes)) || '').trim(); }
  function locationOf(event){ return String((event && (event.location || event.place || event.venue || event.address)) || '').trim(); }
  function toDateKey(value){
    if(!value) return '';
    if(value instanceof Date && !isNaN(value)) return value.getFullYear()+'-'+pad2(value.getMonth()+1)+'-'+pad2(value.getDate());
    value = String(value || '');
    return value.length >= 10 ? value.slice(0,10) : '';
  }
  function addDaysKey(dateKey, days){
    var d = new Date(String(dateKey || '') + 'T12:00:00');
    if(isNaN(d)) return dateKey;
    d.setDate(d.getDate() + days);
    return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
  }
  function timeOf(event){
    if(event && event.time) return String(event.time).slice(0,5);
    if(event && event.start && event.start.dateTime){
      try{ return new Date(event.start.dateTime).toTimeString().slice(0,5); }catch(e){}
    }
    return '';
  }
  function endTimeOf(event){
    if(event && event.endTime) return String(event.endTime).slice(0,5);
    if(event && event.end && event.end.dateTime){
      try{ return new Date(event.end.dateTime).toTimeString().slice(0,5); }catch(e){}
    }
    return '';
  }
  function startDateOf(event){
    return toDateKey(event && (event.startDate || event.date || event.dateKey || (event.start && (event.start.date || event.start.dateTime))));
  }
  function endDateOf(event){
    if(!event) return '';
    var start = startDateOf(event);
    var end = event.endDate || event.dateEnd || event.toDate || event.untilDate || event.date || event.startDate || '';
    if(!end && event.end && event.end.date) end = addDaysKey(String(event.end.date).slice(0,10), -1);
    if(!end && event.end && event.end.dateTime) end = String(event.end.dateTime).slice(0,10);
    end = toDateKey(end || start);
    if(!end || (start && end < start)) end = start;
    return end;
  }
  function makeLocalDateTime(dateKey, time, fallback){
    var m = String(time || '').match(/^(\d{1,2}):(\d{2})/);
    var h = fallback === 'end' ? 23 : 0;
    var min = fallback === 'end' ? 59 : 0;
    if(m){ h = Math.max(0, Math.min(23, parseInt(m[1],10) || 0)); min = Math.max(0, Math.min(59, parseInt(m[2],10) || 0)); }
    var d = new Date(String(dateKey || '') + 'T' + pad2(h) + ':' + pad2(min) + ':00');
    return isNaN(d) ? null : d;
  }
  function addMinutes(date, minutes){ return new Date(date.getTime() + minutes * 60000); }
  function compactDate(dateKey){ return String(dateKey || '').replace(/-/g, ''); }
  function localStamp(date){ return date.getFullYear()+pad2(date.getMonth()+1)+pad2(date.getDate())+'T'+pad2(date.getHours())+pad2(date.getMinutes())+pad2(date.getSeconds()); }
  function utcStamp(date){
    return date.getUTCFullYear()+pad2(date.getUTCMonth()+1)+pad2(date.getUTCDate())+'T'+pad2(date.getUTCHours())+pad2(date.getUTCMinutes())+pad2(date.getUTCSeconds())+'Z';
  }
  function icsEscape(value){
    return String(value == null ? '' : value)
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }
  function foldLine(line){
    line = String(line || '');
    var out = '';
    while(line.length > 73){
      out += line.slice(0,73) + '\r\n ';
      line = line.slice(73);
    }
    return out + line;
  }
  function safeFileName(value){
    return String(value || 'termin')
      .toLowerCase()
      .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'')
      .slice(0,60) || 'termin';
  }
  function fmtDate(dateKey){
    try{ return new Date(dateKey+'T12:00:00').toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'long', year:'numeric'}); }catch(e){ return dateKey; }
  }
  function normalizeEvent(event){
    var startDate = startDateOf(event);
    var endDate = endDateOf(event) || startDate;
    var startTime = timeOf(event);
    var endTime = endTimeOf(event);
    var allDay = !startTime;
    var startDateTime = startTime ? makeLocalDateTime(startDate, startTime, 'start') : null;
    var endDateTime = null;

    if(startTime){
      if(endTime) endDateTime = makeLocalDateTime(endDate || startDate, endTime, 'end');
      else endDateTime = startDateTime ? addMinutes(startDateTime, 60) : null;
      if(startDateTime && endDateTime && endDateTime <= startDateTime) endDateTime = addMinutes(startDateTime, 60);
    }

    return {
      id: String((event && (event.id || event.googleEventId)) || ('event_'+Date.now()+'_'+Math.random().toString(36).slice(2))),
      title: titleOf(event),
      description: descOf(event),
      location: locationOf(event),
      startDate: startDate,
      endDate: endDate || startDate,
      startTime: startTime,
      endTime: endTime,
      allDay: allDay,
      startDateTime: startDateTime,
      endDateTime: endDateTime
    };
  }
  function timeLabel(n){
    if(!n || n.allDay) return 'Ganztägig';
    if(n.startTime && n.endTime && n.startTime !== n.endTime) return n.startTime + ' bis ' + n.endTime + ' Uhr';
    if(n.startTime && n.endDateTime){ return n.startTime + ' Uhr'; }
    return n.startTime ? n.startTime + ' Uhr' : 'Ganztägig';
  }
  function shareText(event){
    var n = normalizeEvent(event);
    var lines = [n.title, fmtDate(n.startDate)];
    var tl = timeLabel(n);
    if(tl) lines.push(tl);
    if(n.location) lines.push('Ort: ' + n.location);
    if(n.description) lines.push('', n.description);
    return lines.join('\n');
  }
  function createIcs(event){
    var n = normalizeEvent(event);
    var uidBase = safeFileName(n.id || n.title) + '-' + compactDate(n.startDate || '') + '@change-app.local';
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Change App//Termin Export//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + icsEscape(uidBase),
      'DTSTAMP:' + utcStamp(new Date()),
      'SUMMARY:' + icsEscape(n.title)
    ];
    if(n.allDay){
      lines.push('DTSTART;VALUE=DATE:' + compactDate(n.startDate));
      lines.push('DTEND;VALUE=DATE:' + compactDate(addDaysKey(n.endDate || n.startDate, 1)));
    } else {
      lines.push('DTSTART;TZID=' + TZ + ':' + localStamp(n.startDateTime));
      lines.push('DTEND;TZID=' + TZ + ':' + localStamp(n.endDateTime || addMinutes(n.startDateTime, 60)));
    }
    if(n.location) lines.push('LOCATION:' + icsEscape(n.location));
    if(n.description) lines.push('DESCRIPTION:' + icsEscape(n.description));
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.map(foldLine).join('\r\n') + '\r\n';
  }
  function fileFor(event){
    var n = normalizeEvent(event);
    var name = safeFileName(n.title) + '-' + (n.startDate || 'termin') + '.ics';
    return new File([createIcs(event)], name, {type:'text/calendar;charset=utf-8'});
  }
  function canShareFile(file){
    try{
      return !!(navigator && navigator.share && navigator.canShare && file && navigator.canShare({files:[file]}));
    }catch(e){ return false; }
  }
  async function shareNativeFile(event, text){
    var n = normalizeEvent(event);
    var file = fileFor(event);
    if(!canShareFile(file)) return false;
    await navigator.share({title:n.title, text:text || shareText(event), files:[file]});
    return true;
  }
  function downloadIcs(event){
    var file = fileFor(event);
    var url = URL.createObjectURL(file);
    var a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ try{ URL.revokeObjectURL(url); a.remove(); }catch(e){} }, 1200);
    toast('Kalenderdatei erstellt ✓', 'ok');
  }
  function copyText(event){
    var text = shareText(event);
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ toast('Termintext kopiert ✓','ok'); }).catch(function(){ fallbackCopy(text); });
    } else fallbackCopy(text);
  }
  function fallbackCopy(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', 'readonly');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); toast('Termintext kopiert ✓','ok'); }catch(e){ toast('Kopieren nicht möglich','err'); }
    try{ ta.remove(); }catch(e){}
  }
  function openWhatsAppText(event){
    var url = 'https://wa.me/?text=' + encodeURIComponent(shareText(event));
    try{ window.open(url, '_blank', 'noopener'); }catch(e){ location.href = url; }
  }
  async function shareWhatsApp(event){
    try{
      if(await shareNativeFile(event, shareText(event))){
        toast('WhatsApp auswählen – Kalenderdatei ist dabei ✓', 'ok');
        return true;
      }
    }catch(err){
      if(err && err.name === 'AbortError') return false;
    }
    downloadIcs(event);
    openWhatsAppText(event);
    toast('ICS geladen. WhatsApp kann hier nur den Text öffnen.', 'ok');
    return true;
  }
  async function shareEvent(event){
    var n = normalizeEvent(event);
    var text = shareText(event);
    try{
      if(await shareNativeFile(event, text)) return true;
      if(navigator.share){
        await navigator.share({title:n.title, text:text});
        toast('Text geteilt. Kalenderdatei bei Bedarf separat laden.','ok');
        return true;
      }
    }catch(err){
      if(err && err.name === 'AbortError') return false;
    }
    downloadIcs(event);
    return true;
  }
  function byKey(key){ return registry[String(key || '')]; }
  function register(event){
    var key = 'evshare_' + (++counter) + '_' + Date.now().toString(36);
    registry[key] = Object.assign({}, event || {});
    return key;
  }
  function actionsHtml(event){
    var key = register(event);
    return '<div class="change-share-card">'
      + '<div class="change-share-head"><div><strong>Termin teilen</strong><span>Als Kalenderdatei für iOS, Android, Google Kalender und Outlook.</span></div><div class="change-share-icon">↗</div></div>'
      + '<div class="change-share-actions">'
      + '<button class="btn btn-primary btn-full" onclick="window.ChangeEventShare.shareByKey(\''+esc(key)+'\')">Teilen · WhatsApp auswählen</button>'
      + '<button class="btn btn-ghost btn-full" onclick="window.ChangeEventShare.whatsappByKey(\''+esc(key)+'\')">WhatsApp mit Kalenderdatei</button>'
      + '<button class="btn btn-ghost btn-full" onclick="window.ChangeEventShare.downloadByKey(\''+esc(key)+'\')">Kalenderdatei laden</button>'
      + '<button class="btn btn-ghost btn-full" onclick="window.ChangeEventShare.copyByKey(\''+esc(key)+'\')">Text kopieren</button>'
      + '</div>'
      + '<div class="change-share-note">Wenn dein Gerät Datei-Sharing unterstützt, wird die .ics Datei direkt mitgegeben. Sonst lädt die App die Kalenderdatei und öffnet WhatsApp mit dem Termintext.</div>'
      + '</div>';
  }
  function detailHtml(event){
    var n = normalizeEvent(event);
    return '<div class="change-share-detail">'
      + '<div class="change-share-detail-title">'+esc(n.title)+'</div>'
      + '<div class="change-share-detail-sub">'+esc(fmtDate(n.startDate))+' · '+esc(timeLabel(n))+'</div>'
      + (n.location ? '<div class="change-share-detail-sub">Ort: '+esc(n.location)+'</div>' : '')
      + '</div>';
  }
  function openPanelFor(event){
    if(!event) return;
    if(typeof window.openPanel === 'function'){
      window.openPanel('Termin teilen', detailHtml(event) + actionsHtml(event) + '<button class="btn btn-ghost btn-full" style="margin-top:12px" onclick="closePanel()">Schließen</button>');
    } else {
      shareEvent(event);
    }
  }
  function openByKey(key){ openPanelFor(byKey(key)); }
  function runByKey(key, fn){ var event = byKey(key); if(event) fn(event); }

  window.ChangeEventShare = {
    loaded: true,
    register: register,
    actionsHtml: actionsHtml,
    detailHtml: detailHtml,
    createIcs: createIcs,
    shareEvent: shareEvent,
    shareWhatsApp: shareWhatsApp,
    downloadIcs: downloadIcs,
    shareText: shareText,
    copyText: copyText,
    openWhatsApp: shareWhatsApp,
    openWhatsAppText: openWhatsAppText,
    openPanel: openPanelFor,
    openByKey: openByKey,
    shareByKey: function(key){ runByKey(key, shareEvent); },
    downloadByKey: function(key){ runByKey(key, downloadIcs); },
    copyByKey: function(key){ runByKey(key, copyText); },
    whatsappByKey: function(key){ runByKey(key, shareWhatsApp); }
  };
})();
