/* Change App · Dashboard · Events & Anzeige
 * Aus index.html extrahiert — Code unverändert
 * NICHT direkt bearbeiten — stattdessen in die passende core/ oder features/ Datei
 */

/* ── change-dashboard-event-fix ── */
(function(){
  'use strict';
  const pad = n => String(n).padStart(2,'0');
  const keyOf = d => { const x = d instanceof Date ? d : new Date(String(d)+'T12:00:00'); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate()); };
  const addDay = (k,n) => { const d = new Date(k+'T12:00:00'); d.setDate(d.getDate()+n); return keyOf(d); };
  const todayKey = () => keyOf(new Date());

  /* ==== Vollständige getAllEvents mit endDate, startDate, title ==== */
  window.getAllEvents = function(){
    const out = [], seen = new Set();
    function maybeBirthday(ev){
      try{
        if(window.ChangeBirthdays && window.ChangeBirthdays.enabled && window.ChangeBirthdays.enabled() && window.ChangeBirthdayParser){
          const parsed = window.ChangeBirthdayParser.parseEvent(ev);
          if(parsed) return window.ChangeBirthdayParser.toCalendarEvent(parsed, parsed.date);
        }
      }catch(e){}
      return ev;
    }
    function add(ev){
      ev = maybeBirthday(ev);
      if(!ev || !ev.date) return;
      const k = ev.source === 'birthday' ? 'b:'+ev.id : (ev.googleEventId ? 'g:'+ev.googleEventId : 'l:'+ev.id);
      if(seen.has(k)) return; seen.add(k);
      out.push(ev);
    }
    // Lokale Termine
    try{ const _localEvs=window.events||(typeof events!=='undefined'?events:[]); (Array.isArray(_localEvs)?_localEvs:[]).forEach(add); }catch(e){}
    // Google-Termine mit vollständiger end-Date-Auflösung
    try{
      (Array.isArray(window.gEvents) ? window.gEvents : []).forEach(ge => {
        if(!ge) return;
        const title = ge.summary || ge.title || '(Kein Titel)';
        let startDate = '', endDate = '', time = '', endTime = '', allDay = false;
        if(ge.start && ge.start.date){
          startDate = String(ge.start.date).slice(0,10);
          allDay = true;
        } else if(ge.start && ge.start.dateTime){
          startDate = String(ge.start.dateTime).slice(0,10);
          try{ time = new Date(ge.start.dateTime).toTimeString().slice(0,5); }catch(e){}
        }
        if(ge.end && ge.end.date){
          // Google all-day end is exclusive → subtract 1 day
          endDate = addDay(String(ge.end.date).slice(0,10), -1);
          if(endDate < startDate) endDate = startDate;
        } else if(ge.end && ge.end.dateTime){
          endDate = String(ge.end.dateTime).slice(0,10);
          try{ endTime = new Date(ge.end.dateTime).toTimeString().slice(0,5); }catch(e){}
        } else {
          endDate = startDate;
        }
        if(!startDate) return;
        const id = String(ge.id||'');
        add({
          id: id.startsWith('g_') ? id : 'g_'+id,
          googleEventId: id,
          title, date: startDate, startDate, endDate,
          time, endTime, allDay, color:'blue',
          type:'meeting', desc: ge.description||'',
          source:'google', notifDaysBefore: 1
        });
      });
    }catch(e){}
    return out;
  };

  /* ==== Dashboard: Heute-Block berechnet korrekt aus startDate/endDate ==== */
  function evStartK(e){ return String(e.startDate||e.date||'').slice(0,10); }
  function evEndK(e)  { return String(e.endDate||e.date||evStartK(e)||'').slice(0,10); }
  function evTitle(e) { return String(e.title||e.summary||e.name||'Termin').replace(/\bZeitraum\b\s*:?/gi,'').replace(/\s{2,}/g,' ').trim(); }
  function evTime(e)  { if(e.allDay || (!e.time && !e.endTime)) return ''; return e.time ? (e.endTime && e.endTime!==e.time ? e.time+' – '+e.endTime+' Uhr' : e.time+' Uhr') : ''; }
  window.evTime = evTime;
  function fmtShort(k){ try{ const _s=new Date(k+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}); return _s.endsWith('.')?_s.slice(0,-1):_s; }catch(e){ return k; } }
  function diffDays(k){ return Math.round((new Date(k+'T12:00:00') - new Date(todayKey()+'T12:00:00'))/86400000); }

  /* Feiertage für nächste 90 Tage */
  function upcomingHolidays(limitDays){
    const out = [];
    if(typeof window.getHolidaysForDate !== 'function') return out;
    const td = todayKey();
    for(let i=0; i<=limitDays; i++){
      const k = addDay(td, i);
      try{ (window.getHolidaysForDate(k)||[]).forEach(h => out.push({kind:'holiday',date:k,start:k,end:k,name:h.name||h.title||'Feiertag'})); }catch(e){}
    }
    return out;
  }

  function buildCalRows(){
    const td = todayKey();
    const limit = addDay(td, 90);

    // Events die heute oder in Zukunft aktiv sind (end >= today, start <= limit)
    const evs = window.getAllEvents()
      .filter(e => evEndK(e) >= td && evStartK(e) <= limit)
      .sort((a,b) => evStartK(a).localeCompare(evStartK(b)));

    // Deduplizieren
    const seen = new Set();
    const uniqueEvs = evs.filter(e => {
      const k = (e.googleEventId ? 'g:'+e.googleEventId : 'l:'+(e.id||'')) + '|' + evStartK(e) + '|' + evEndK(e);
      if(seen.has(k)) return false; seen.add(k); return true;
    });

    // Feiertage
    const holidays = upcomingHolidays(90);

    // Alles zusammen sortieren
    const combined = [];
    uniqueEvs.forEach(e => combined.push({kind:'event', date: evStartK(e) < td ? td : evStartK(e), start: evStartK(e), end: evEndK(e), ev: e}));
    holidays.forEach(h => combined.push(h));
    combined.sort((a,b) => a.date.localeCompare(b.date) || (a.kind==='holiday' ? -1 : 1));

    // Deduplizieren nach key
    const rowSeen = new Set();
    const rows = combined.filter(r => {
      const k = r.kind+'|'+r.date+'|'+(r.name || evTitle(r.ev||{}));
      if(rowSeen.has(k)) return false; rowSeen.add(k); return true;
    }).slice(0, 12);

    return {rows, td};
  }

  function renderDashboard(){
    const grid = document.getElementById('dash-grid');
    if(!grid) return;

    const {rows, td} = buildCalRows();
    const todayRows = rows.filter(r => r.kind === 'event' ? (r.start <= td && r.end >= td) : r.date === td);
    const upcomingRows = rows.filter(r => r.kind === 'event' ? r.start > td : r.date > td);

    /* Heute-Block */
    const todayDateFmt = new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
    let todayHtml = '';
    if(!todayRows.length){
      todayHtml = `<div class="dash-today-free">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:15px;height:15px;stroke-width:2;opacity:.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Heute keine Termine vorhanden
      </div>`;
    } else {
      todayRows.forEach(r => {
        if(r.kind === 'holiday'){
          todayHtml += `<div class="dash-row dash-today-row" onclick="setMainView('calendar')">
            <div class="dash-row-icon" style="background:var(--amb-d)">🎉</div>
            <div class="dash-row-body"><div class="dash-row-title" style="font-weight:800;color:var(--acc)">${r.name}</div><div class="dash-row-sub">Feiertag</div></div>
            <span class="dash-row-badge badge-green">Heute</span>
          </div>`;
        } else {
          const ev = r.ev;
          const isRange = r.start !== r.end;
          const sub = isRange ? fmtShort(r.start)+' – '+fmtShort(r.end) : (ev.time ? (ev.time+(ev.endTime&&ev.endTime!==ev.time?' – '+ev.endTime:'')+' Uhr') : 'Ganztägig');
          const colBg = ev.color==='red'?'var(--red-d)':ev.color==='green'?'var(--grn-d)':ev.color==='amber'?'var(--amb-d)':ev.color==='purple'?'var(--pur-d)':'var(--acc-d)';
          const evIcon = ev.type === 'birthday' ? '🎂' : '📅';
          todayHtml += `<div class="dash-row dash-today-row" onclick="setMainView('calendar')">
            <div class="dash-row-icon" style="background:${colBg}">${evIcon}</div>
            <div class="dash-row-body"><div class="dash-row-title" style="font-weight:800;color:var(--acc)">${evTitle(ev)}</div><div class="dash-row-sub">${sub}</div></div>
            <span class="dash-row-badge badge-green">${isRange ? fmtShort(r.start)+' – '+fmtShort(r.end) : 'Heute'}</span>
          </div>`;
        }
      });
    }

    /* Demnächst-Block */
    let upcomingHtml = '';
    if(upcomingRows.length){
      upcomingHtml = `<div class="dash-section-divider">Demnächst</div>`;
      upcomingRows.slice(0,6).forEach(r => {
        if(r.kind === 'holiday'){
          const d = diffDays(r.date);
          upcomingHtml += `<div class="dash-row" onclick="setMainView('calendar')">
            <div class="dash-row-icon" style="background:var(--amb-d)">🎉</div>
            <div class="dash-row-body"><div class="dash-row-title">${r.name}</div><div class="dash-row-sub">Feiertag</div></div>
            <span class="dash-row-badge badge-amber">${d===1?'Morgen':fmtShort(r.date)}</span>
          </div>`;
        } else {
          const ev = r.ev;
          const isRange = r.start !== r.end;
          const badge = isRange ? fmtShort(r.start)+' – '+fmtShort(r.end) : (diffDays(r.start)===1 ? 'Morgen' : fmtShort(r.start));
          const bClass = diffDays(r.start)<=1 ? 'badge-red' : diffDays(r.start)<=3 ? 'badge-amber' : 'badge-blue';
          const sub = isRange ? fmtShort(r.start)+' – '+fmtShort(r.end) : (ev.time ? (ev.time+(ev.endTime&&ev.endTime!==ev.time?' – '+ev.endTime:'')+' Uhr') : 'Ganztägig');
          const colBg = ev.color==='red'?'var(--red-d)':ev.color==='green'?'var(--grn-d)':ev.color==='amber'?'var(--amb-d)':ev.color==='purple'?'var(--pur-d)':'var(--acc-d)';
          const evIcon = ev.type === 'birthday' ? '🎂' : '📅';
          upcomingHtml += `<div class="dash-row" onclick="setMainView('calendar')">
            <div class="dash-row-icon" style="background:${colBg}">${evIcon}</div>
            <div class="dash-row-body"><div class="dash-row-title">${evTitle(ev)}</div><div class="dash-row-sub">${sub}</div></div>
            <span class="dash-row-badge ${bClass}">${badge}</span>
          </div>`;
        }
      });
    }

    /* Kalender-Karte zusammenbauen */
    const friseurHtml = (typeof window.getFriseurRowHtml==='function') ? window.getFriseurRowHtml() : '';
    const birthdayHtml = (typeof window.getBirthdayRowHtml==='function') ? window.getBirthdayRowHtml() : '';
    const urlaubHtml  = (typeof window.getUrlaubRowHtml==='function')  ? window.getUrlaubRowHtml()  : '';
    const calCardBody = `<div class="db-section">Heute &nbsp;·&nbsp; ${todayDateFmt}</div>${todayHtml}${upcomingHtml || (!todayRows.length ? '<div class="dash-empty">Keine Termine in den nächsten 90 Tagen</div>' : '')}${friseurHtml}${birthdayHtml}${urlaubHtml}`;

    /* Challenges & Mitspieler */
    let chHtml = '';
    try{
      const td2 = todayKey();
      const me = String((window.userInfo||{}).email||'').toLowerCase();
      const doneIds = new Set((window.challengeCompletions||[]).filter(c=>String(c.date||'').slice(0,10)===td2&&String(c.playerId||c.userEmail||c.email||'').toLowerCase()===me).map(c=>String(c.challengeId)));
      const isOptionalChallenge = c => !!(c && (c.optional === true || c._optional === true || /^opt_/i.test(String(c.id||''))));
      const isChallengeDueToday = c => {
        if(!c || c.active === false || isOptionalChallenge(c)) return false;
        const rec = String(c.recurrence || '').toLowerCase();
        const dk = String(c.generatedFor || c.date || c.startDate || '').slice(0,10);
        if(rec === 'daily') return !dk || dk <= td2;
        return !dk || dk === td2;
      };
      const pending = (typeof window.getOpenChallengesForDashboard === 'function')
        ? window.getOpenChallengesForDashboard()
        : (window.challenges||[]).filter(c=>c&&isChallengeDueToday(c)&&!doneIds.has(String(c.id)));
      chHtml = pending.map(c=>`<div class="dash-row" onclick="setMainView('challenges')">
        <div class="dash-row-icon" style="background:var(--acc-d)">${c.icon||'🏆'}</div>
        <div class="dash-row-body"><div class="dash-row-title">${c.title||c.name||'Challenge'}</div><div class="dash-row-sub">${parseInt(c.points,10)||0} Punkte</div></div>
        <span class="dash-row-badge badge-amber">offen</span>
      </div>`).join('') || '<div class="dash-empty">Alle Challenges heute erledigt ✓</div>';
    }catch(e){ chHtml = '<div class="dash-empty">Keine Challenges</div>'; }

    let plHtml = '';
    try{
      const players = (typeof window.getVisibleContestPlayers==='function' ? window.getVisibleContestPlayers() : (window.challengePlayers||[])).slice(0,4);
      const me = String((window.userInfo||{}).email||'').toLowerCase();
      plHtml = players.map((p,i) => {
        const id = String(p.email||p.id||'').toLowerCase();
        const st = typeof window.getPlayerPointSummary==='function' ? window.getPlayerPointSummary(id) : {todayPoints:0,totalPoints:0};
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);
        return `<div class="dash-row" onclick="setMainView('challenges')">
          <div class="dash-row-icon" style="background:var(--amb-d)">${medal}</div>
          <div class="dash-row-body"><div class="dash-row-title">${p.name||p.email||'Mitspieler'}${id===me?' · Du':''}</div><div class="dash-row-sub">Heute ${st.todayPoints||0} P · Gesamt ${st.totalPoints||0} P</div></div>
          <span class="dash-row-badge badge-green">${st.totalPoints||0} P</span>
        </div>`;
      }).join('') || '<div class="dash-empty">Noch keine Mitspieler</div>';
    }catch(e){ plHtml = '<div class="dash-empty">Noch keine Mitspieler</div>'; }

    // Fill Kalender sub-label
    const _todaySub=document.getElementById('dash-today-sub');
    if(_todaySub) _todaySub.textContent=todayDateFmt;

    grid.innerHTML = `
      <div class="db-card">
        <div class="db-head">
          <div class="db-title">📅 Kalender</div>

        </div>
        <div class="db-body">${calCardBody}</div>
      </div>
      <div class="db-card">
        <div class="db-head">
          <div class="db-title">🏆 Challenges</div>
        </div>
        <div class="db-body">
          <div class="db-section">Heute offen</div>${chHtml}
          <div class="db-section" style="border-top:1px solid var(--b1)">Rangliste</div>${plHtml}
        </div>
      </div>`;
  }

  /* Override buildDashboard mit eigenem Renderer */
  const _buildDashboard = window.buildDashboard;
  function myBuildDashboard(){
    /* Greeting */
    try{
      const h = document.getElementById('dash-greeting'), s = document.getElementById('dash-sub');
      if(h){ const hr=new Date().getHours(), name=((window.userInfo||{}).name||'').split(' ')[0]; h.textContent=(hr<12?'Guten Morgen':hr<17?'Guten Tag':'Guten Abend')+(name?', '+name:''); }
      if(s) s.textContent = new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    }catch(e){}
    renderDashboard();
  }
  /* Sofort + nach Firebase-Load feuern — eliminiert die Race-Condition */
  myBuildDashboard.__eventFix = true;
  window.buildDashboard = myBuildDashboard;
  window.buildDashCards = myBuildDashboard;

  // Sofortiger erster Aufruf (überschreibt STEP7's sofortige Zuweisung)
  if (document.readyState !== 'loading') {
    myBuildDashboard();
  } else {
    document.addEventListener('DOMContentLoaded', myBuildDashboard, {once: true});
  }

  // Erneut nach Firebase / Google-Kalender-Load
  [300, 1500, 4000, 6500].forEach(ms => setTimeout(() => {
    window.buildDashboard = myBuildDashboard;
    window.buildDashCards = myBuildDashboard;
    if((window.currentMainView||'dashboard') === 'dashboard') myBuildDashboard();
  }, ms));
  // Also permanently wrap setMainView so dashboard always uses our version
  (function(){
    const _origSMV = window.setMainView;
    if(typeof _origSMV === 'function' && !_origSMV.__dbPatched) {
      window.setMainView = function(v, fr) {
        window.buildDashboard = myBuildDashboard;
        window.buildDashCards = myBuildDashboard;
        return _origSMV.apply(this, arguments);
      };
      window.setMainView.__dbPatched = true;
    }
  })();

})();

