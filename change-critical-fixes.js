/* CHANGE CRITICAL FIXES: Kalender-KW, Challenge-Details, Google-Termine */
(function(){
  'use strict';

  function pad2(n){ return String(n).padStart(2,'0'); }
  function dk(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
  function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function esc2(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function isoWeek(d){
    const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
    const day=t.getUTCDay()||7;
    t.setUTCDate(t.getUTCDate()+4-day);
    const y=new Date(Date.UTC(t.getUTCFullYear(),0,1));
    return Math.ceil((((t-y)/86400000)+1)/7);
  }
  function monthStartMonday(y,m){
    const first=new Date(y,m,1);
    const day=(first.getDay()+6)%7; // Mo=0
    return addDays(first,-day);
  }

  function injectCriticalCss(){
    let st=document.getElementById('change-critical-fixes-style');
    if(!st){ st=document.createElement('style'); st.id='change-critical-fixes-style'; document.head.appendChild(st); }
    st.textContent = `
      #month-grid .week-row{position:relative;overflow:visible;}
      #month-grid .kw-badge,#month-grid .kw-badge-left{
        position:absolute!important;left:4px!important;bottom:5px!important;top:auto!important;right:auto!important;
        z-index:5;font-size:9px;line-height:1;font-family:var(--mono);font-weight:700;color:#b8bec6;
        background:rgba(255,255,255,.82);border-radius:6px;padding:2px 4px;pointer-events:none;
      }
      #month-grid .day-cell{min-height:118px;padding:9px 8px 20px 10px;}
      #month-grid .day-cell.other{background:#fafafa;}
      #month-grid .day-cell.other .day-num{color:#c5c9cf!important;}
      #month-grid .ev-chip{margin-top:4px;max-width:calc(100% - 4px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      #month-grid .holiday-line{max-width:calc(100% - 4px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .leader-row.clickable{cursor:pointer;}
      .leader-row.clickable:hover{background:var(--s2);}
      .challenge-history-list{display:flex;flex-direction:column;gap:8px;margin-top:10px;max-height:50vh;overflow:auto;}
      .challenge-history-item{display:flex;align-items:center;gap:10px;border:1px solid var(--b1);border-radius:12px;padding:10px;background:var(--s1);}
      .challenge-history-date{font-size:11px;color:var(--t4);font-family:var(--mono);white-space:nowrap;}
    `;
  }

  function addLeftWeekNumbers(){
    try{
      const grid=document.getElementById('month-grid');
      if(!grid || !grid.querySelector('.week-row')) return;
      document.querySelectorAll('#month-grid .kw-badge,#month-grid .kw-badge-left').forEach(x=>x.remove());
      const opts=window.changeCalendarViewOptions || {};
      if(opts.showWeekNumbers === false) return;
      const y=window.curDate instanceof Date ? window.curDate.getFullYear() : (new Date()).getFullYear();
      const m=window.curDate instanceof Date ? window.curDate.getMonth() : (new Date()).getMonth();
      const start=monthStartMonday(y,m);
      Array.from(grid.querySelectorAll('.week-row')).forEach((row,w)=>{
        const monday=addDays(start,w*7);
        const badge=document.createElement('div');
        badge.className='kw-badge-left';
        badge.textContent='KW '+isoWeek(monday);
        row.appendChild(badge);
      });
    }catch(e){ console.warn('KW-Fix:',e); }
  }

  function refreshGoogleSoon(){
    if(typeof window.loadGoogleEvents==='function' && window.accessToken && !window.isDemoMode){
      setTimeout(()=>window.loadGoogleEvents(),60);
    }
  }

  function patchCalendarNavigation(){
    const oldRender=window.renderCalendar;
    if(typeof oldRender==='function' && !oldRender.__criticalFixed){
      const fixed=function(){ const res=oldRender.apply(this,arguments); injectCriticalCss(); setTimeout(addLeftWeekNumbers,0); return res; };
      fixed.__criticalFixed=true; window.renderCalendar=fixed;
    }
    ['navigate','goToday','setCalView'].forEach(name=>{
      const old=window[name];
      if(typeof old==='function' && !old.__criticalFixed){
        const fixed=function(){ const res=old.apply(this,arguments); refreshGoogleSoon(); injectCriticalCss(); setTimeout(addLeftWeekNumbers,80); return res; };
        fixed.__criticalFixed=true; window[name]=fixed;
      }
    });
  }

  function nextDate(date){ const d=new Date(date+'T12:00:00'); d.setDate(d.getDate()+1); return dk(d); }
  function addOneHour(date,time){ const d=new Date(date+'T'+(time||'09:00')+':00'); d.setHours(d.getHours()+1); return pad2(d.getHours())+':'+pad2(d.getMinutes()); }
  function buildEventFromPanel(existingId){
    const old=existingId ? (window.events||[]).find(e=>e.id===existingId) : null;
    const title=document.getElementById('ev-title')?.value.trim();
    const date=document.getElementById('ev-date')?.value;
    if(!title){ window.toast&&toast('Bitte einen Titel eingeben','err'); return null; }
    if(!date){ window.toast&&toast('Bitte ein Datum wählen','err'); return null; }
    return {
      id:existingId||'ev_'+(window.uid?uid():(Math.random().toString(36).slice(2))), title, date,
      time:document.getElementById('ev-time')?.value||'', endTime:document.getElementById('ev-end')?.value||'',
      type:document.getElementById('ev-type')?.value||'meeting', color:document.getElementById('ev-color')?.value||'blue',
      desc:document.getElementById('ev-desc')?.value.trim()||'', notifDaysBefore:parseInt(document.getElementById('ev-notif')?.value||'1'),
      allDay:!document.getElementById('ev-time')?.value, source:'local', googleEventId:old?.googleEventId||'',
      createdAt:old?.createdAt||new Date().toISOString(), updatedAt:new Date().toISOString()
    };
  }

  async function syncGoogle(ev){
    if(!window.accessToken || window.isDemoMode || !ev || ev.source==='google') return false;
    if(window.accessToken==='firebase-auth'){
      window.toast&&toast('Kalender-Sync braucht Google-Kalenderzugriff. Bitte abmelden und erneut mit Google anmelden.','err');
      return false;
    }
    const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
    const endTime=ev.endTime || addOneHour(ev.date,ev.time);
    const body={
      summary:ev.title,
      description:ev.desc||'',
      start:ev.time ? {dateTime:ev.date+'T'+ev.time+':00',timeZone:tz} : {date:ev.date},
      end:ev.time ? {dateTime:ev.date+'T'+endTime+':00',timeZone:tz} : {date:nextDate(ev.date)}
    };
    try{
      const url=ev.googleEventId ? 'https://www.googleapis.com/calendar/v3/calendars/primary/events/'+encodeURIComponent(ev.googleEventId) : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      const r=await fetch(url,{method:ev.googleEventId?'PATCH':'POST',headers:{'Authorization':'Bearer '+window.accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(r.status===401){ window.lsDel&&lsDel('access_token'); window.accessToken=''; window.toast&&toast('Google-Anmeldung abgelaufen. Bitte neu anmelden.','err'); return false; }
      if(!r.ok){ const txt=await r.text().catch(()=>String(r.status)); throw new Error('Google Kalender '+r.status+' '+txt.substring(0,120)); }
      const saved=await r.json();
      const i=(window.events||[]).findIndex(e=>e.id===ev.id);
      if(i>=0){ window.events[i].googleEventId=saved.id; window.events[i].googleSyncedAt=new Date().toISOString(); window.ls&&ls('events',window.events); }
      await (window.loadGoogleEvents&&window.loadGoogleEvents());
      if(typeof window.renderCalendar==='function') window.renderCalendar();
      if(typeof window.renderUpcoming==='function') window.renderUpcoming();
      window.toast&&toast('Mit Google Kalender synchronisiert ✓','ok');
      return true;
    }catch(e){ console.warn('Google Calendar Sync:',e); window.toast&&toast('Kalender-Sync fehlgeschlagen: '+(e.message||e),'err'); return false; }
  }

  function patchEventSaving(){
    window.syncEventToGoogleReliable=syncGoogle;
    window.saveEvent=function(existingId){
      const ev=buildEventFromPanel(existingId); if(!ev) return;
      const i=(window.events||[]).findIndex(e=>e.id===ev.id);
      if(i>=0) window.events[i]=ev; else window.events.push(ev);
      window.ls&&ls('events',window.events);
      window.closePanel&&closePanel();
      if(typeof window.renderCalendar==='function') window.renderCalendar();
      if(typeof window.renderUpcoming==='function') window.renderUpcoming();
      if(typeof window.checkNotifications==='function') window.checkNotifications();
      if(window.currentMainView==='dashboard' && typeof window.buildDashboard==='function') window.buildDashboard();
      if(typeof window.saveToDrive==='function') window.saveToDrive();
      window.toast&&toast(existingId?'Termin aktualisiert ✓':'Termin erstellt ✓','ok');
      syncGoogle(ev);
    };
    window.saveToGoogleCal=function(existingId){
      const ev=buildEventFromPanel(existingId); if(!ev) return;
      const i=(window.events||[]).findIndex(e=>e.id===ev.id);
      if(i>=0) window.events[i]=ev; else window.events.push(ev);
      window.ls&&ls('events',window.events);
      window.closePanel&&closePanel();
      if(typeof window.renderCalendar==='function') window.renderCalendar();
      if(typeof window.renderUpcoming==='function') window.renderUpcoming();
      syncGoogle(ev);
    };
  }

  function currentPlayerId(){
    try{ if(typeof window.getCurrentPlayerId==='function') return String(window.getCurrentPlayerId()).toLowerCase(); }catch(e){}
    return String((window.userInfo&&window.userInfo.email)||'local').toLowerCase();
  }
  function patchChallengeDetails(){
    window.getPlayerPointSummary=function(playerId){
      const id=String(playerId||'').toLowerCase(); const today=dk(new Date());
      const out={totalPoints:0,totalCount:0,todayPoints:0,todayCount:0,todayItems:[],allItems:[]};
      (window.challengeCompletions||[]).forEach(c=>{
        const cid=String(c.playerId||c.email||c.userEmail||'').toLowerCase();
        if(cid!==id) return;
        const ch=(window.challenges||[]).find(x=>String(x.id)===String(c.challengeId))||{};
        const pts=parseInt(c.points)||0;
        const item={title:ch.title||c.challengeTitle||c.challengeId||'Challenge',icon:ch.icon||'✅',points:pts,date:c.date||'',url:ch.url||''};
        out.totalPoints+=pts; out.totalCount+=1; out.allItems.push(item);
        if(c.date===today){ out.todayPoints+=pts; out.todayCount+=1; out.todayItems.push(item); }
      });
      out.allItems.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
      return out;
    };
    window.openContestUserDetails=function(playerId){
      const id=String(playerId||currentPlayerId()).toLowerCase();
      const p=(window.challengePlayers||[]).find(x=>String(x.email||x.id||'').toLowerCase()===id)||{id,name:id,email:id};
      const sum=window.getPlayerPointSummary(id);
      const all=sum.allItems.length ? sum.allItems.slice(0,80).map(it=>
        '<div class="challenge-history-item"><div class="challenge-icon">'+esc2(it.icon)+'</div><div class="challenge-body"><div class="challenge-name">'+esc2(it.title)+'</div><div class="challenge-meta">Erledigt am '+esc2(it.date||'unbekannt')+(it.url?' · <a href="'+esc2(it.url)+'" target="_blank" rel="noopener">Übung ansehen</a>':'')+'</div></div><div class="challenge-history-date">+'+it.points+' P</div></div>'
      ).join('') : '<div class="dash-empty">Noch keine erledigten Challenges.</div>';
      window.openPanel&&openPanel('Kontest · '+esc2(p.name||p.email||'Mitspieler'),
        '<div class="stat-strip"><div class="stat-box"><div class="stat-num">'+sum.todayPoints+'</div><div class="stat-label">Punkte heute</div></div><div class="stat-box"><div class="stat-num">'+sum.totalPoints+'</div><div class="stat-label">Punkte gesamt</div></div></div>'+ 
        '<div class="push-status">Heute erledigt: <strong>'+sum.todayCount+'</strong> · Insgesamt erledigt: <strong>'+sum.totalCount+'</strong></div>'+ 
        '<div class="divider"></div><div class="section-label">Erledigte Challenges</div><div class="challenge-history-list">'+all+'</div>'
      );
    };
  }

  function init(){
    injectCriticalCss();
    patchCalendarNavigation();
    patchEventSaving();
    patchChallengeDetails();
    refreshGoogleSoon();
    setTimeout(()=>{ try{ if(typeof window.renderCalendar==='function') window.renderCalendar(); if(typeof window.renderChallenges==='function') window.renderChallenges(); }catch(e){} },500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,200));
  else setTimeout(init,200);
  window.addEventListener('load',()=>setTimeout(init,900));
})();
