/* Change App · Einstellungen · Panel & Sync
 * Aus index.html extrahiert — Code unverändert
 * NICHT direkt bearbeiten — stattdessen in die passende core/ oder features/ Datei
 */

/* ── change-unified-settings ── */
(function () {
  'use strict';

  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: inkl. backtick]
  const lsRead  = k => { try{ return JSON.parse(localStorage.getItem('change_v1_'+k)); }catch(e){ return null; } };
  const lsWrite = (k,v) => { try{ localStorage.setItem('change_v1_'+k,JSON.stringify(v)); }catch(e){} };
  const $       = id => document.getElementById(id);

  function readOpt(){
    const def={showHolidays:true,showChallengeDots:true,showWeekNumbers:true};
    ['change_v1_calendar_view_options','calendar_settings'].forEach(k=>{try{Object.assign(def,JSON.parse(localStorage.getItem(k)||'{}'));}catch(e){}});
    return def;
  }
  function saveOpt(o){
    localStorage.setItem('change_v1_calendar_view_options',JSON.stringify(o));
    localStorage.setItem('calendar_settings',JSON.stringify(o));
  }
  const switchRow=(title,sub,id,checked,disabled)=>`
    <div class="toggle-row${disabled?' toggle-row-disabled':''}">
      <div class="toggle-copy"><div class="toggle-title">${title}</div>${sub?`<div class="toggle-sub">${sub}</div>`:''}</div>
      <label class="switch"><input type="checkbox" id="${id}" ${checked?'checked':''} ${disabled?'disabled':''}><span class="slider"></span></label>
    </div>`;

  /* ==== GLOCKE: Benachrichtigungen, keine Challenge-Zusammenfassung ==== */
  window.openNotifPanel=function(){
    try{if(typeof checkNotifications==='function')checkNotifications();}catch(e){}
    var esc2=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
    var notes=(typeof notifications!=='undefined'&&Array.isArray(notifications)?notifications:(window.notifications||[])).slice(0,12);
    var icons={deadline:'⚠️',meeting:'📅',reminder:'🔔',other:'📌'};
    var bgs={crit:'var(--red-d)',warn:'var(--amb-d)',ok:'var(--s2)'};
    var html='';
    if(notes.length){
      var crit=notes.filter(function(n){return n.urgency==='crit';}),
          warn=notes.filter(function(n){return n.urgency==='warn';}),
          ok=notes.filter(function(n){return n.urgency==='ok';});
      var mkI=function(n){
        var lbl=n.diff<0?'Überfällig':n.diff===0?'Heute':n.diff===1?'Morgen':'In '+n.diff+'T';
        var bcls=n.urgency==='crit'?'ub-crit':n.urgency==='warn'?'ub-warn':'ub-ok';
        return '<div class="nitem" onclick="setMainView(\'calendar\');setTimeout(function(){openEventPanel(\''+esc2(n.id)+'\');},200);closePanel()">'
          +'<div class="nitem-icon" style="background:'+bgs[n.urgency]+'">'+(icons[n.type]||'📅')+'</div>'
          +'<div class="nitem-body"><div class="nitem-title">'+esc2(n.title||'')+'</div>'
          +'<div class="nitem-sub">'+esc2(n.date||'')+'</div></div>'
          +'<span class="nitem-badge urgency-badge '+bcls+'">'+lbl+'</span></div>';
      };
      if(crit.length) html+='<div class="panel-notif-section"><div class="pns-title" style="color:var(--red)">⚡ Dringende Termine</div>'+crit.map(mkI).join('')+'</div>';
      if(warn.length) html+='<div class="panel-notif-section"><div class="pns-title" style="color:var(--amb)">📅 Diese Woche</div>'+warn.map(mkI).join('')+'</div>';
      if(ok.length)   html+='<div class="panel-notif-section"><div class="pns-title">Demnächst</div>'+ok.map(mkI).join('')+'</div>';
    }else{
      html='<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div><div class="empty-title">Alles im Griff</div><div class="empty-sub">Keine neuen Benachrichtigungen</div></div>';
    }
    if(typeof openPanel==='function') openPanel('Benachrichtigungen', html);
    if(typeof updateBellIndicator==='function') updateBellIndicator();
  };

  /* ==== GOOGLE ==== */
  function isGoogleLoggedIn(){
    // accessToken is 'firebase-auth' when logged in via Firebase Google Sign-In
    var at=window.accessToken||(typeof accessToken!=='undefined'?accessToken:'');
    if(at&&at.length>0&&at!=='undefined') return true;
    // userInfo is a global 'let' — check both window and direct
    var ui=window.userInfo||(typeof userInfo!=='undefined'?userInfo:{});
    return !!(ui&&ui.email&&!String(ui.email).includes('demo')&&!String(ui.email).includes('example'));
  }
  function canSyncGoogleCalendar(){
    var at=window.accessToken||(typeof accessToken!=='undefined'?accessToken:'');
    return !!(at&&at!=='firebase-auth'&&at.length>10&&at!=='undefined');
  }
  function isGoogleSyncEnabled(){const v=localStorage.getItem('change_v1_google_calendar_sync');return v===null?true:v!=='false';}
  function setGoogleSyncEnabled(on){localStorage.setItem('change_v1_google_calendar_sync',on?'true':'false');window.googleCalendarSyncEnabled=on;}

  window.triggerGoogleCalendarSync=async function(){
    if(!isGoogleLoggedIn()){if(typeof toast==='function')toast('Bitte zuerst mit Google anmelden','err');return;}
    try{
      if(typeof toast==='function')toast('Wird synchronisiert…','');
      if(typeof loadGoogleData==='function') await loadGoogleData();
      else if(typeof loadGoogleEvents==='function') await loadGoogleEvents();
      if(typeof renderCalendar==='function') renderCalendar();
      if(typeof window.buildDashboard==='function') window.buildDashboard();
      if(typeof toast==='function')toast('Google Kalender synchronisiert ✓','ok');
    }catch(e){if(typeof toast==='function')toast('Sync fehlgeschlagen: '+(e.message||e),'err');}
  };
  /* Kalender sofort nach dem Laden von Google-Events neu rendern */
  (function(){
    const _origLoadGD=window.loadGoogleData;
    if(typeof _origLoadGD==='function'){
      window.loadGoogleData=async function(){
        const r=await _origLoadGD.apply(this,arguments);
        setTimeout(()=>{
          if(typeof renderCalendar==='function') renderCalendar();
          if(typeof window.buildDashboard==='function') window.buildDashboard();
        },200);
        return r;
      };
    }
  })();

  /* ==== AVATAR RING (Google-Status) ==== */
  function updateAvatarDot(){
    const av=$('user-avatar'); if(!av)return;
    const at=window.accessToken||(typeof accessToken!=='undefined'?accessToken:'');
    const ui=window.userInfo||(typeof userInfo!=='undefined'?userInfo:{});
    const loggedIn=!!(at&&at.length>0&&at!=='undefined')||
                   !!(ui&&ui.email&&!String(ui.email).includes('demo')&&!String(ui.email).includes('example'));
    av.classList.toggle('google-on', loggedIn);
    av.classList.toggle('google-off',!loggedIn);
    av.title=loggedIn?'Angemeldet · Klicken zum Abmelden':'Nicht angemeldet';
  }
  window.addEventListener('online',updateAvatarDot);
  window.addEventListener('offline',updateAvatarDot);
  setInterval(updateAvatarDot,8000);
  setTimeout(updateAvatarDot,1500);

  /* ==== EINSTELLUNGS-PANEL ==== */
  window.openSettingsPanel=function(startTab){
    startTab=startTab||'calendar';
    const o=readOpt();
    const STATES=window.STATE_OPTIONS||(typeof STATE_OPTIONS!=='undefined'?STATE_OPTIONS:{ALL:'Alle Bundesländer',BW:'Baden-Württemberg',BY:'Bayern','BY-AUGSBURG':'Bayern · Augsburg',BE:'Berlin',BB:'Brandenburg',HB:'Bremen',HH:'Hamburg',HE:'Hessen',MV:'Mecklenburg-Vorpommern',NI:'Niedersachsen',NW:'Nordrhein-Westfalen',RP:'Rheinland-Pfalz',SL:'Saarland',SN:'Sachsen',ST:'Sachsen-Anhalt',SH:'Schleswig-Holstein',TH:'Thüringen'});
    const curState=(function(){
      try{
        const v1=localStorage.getItem('change_v1_holiday_state');
        const raw=localStorage.getItem('holiday_state');
        let legacy=null; try{legacy=JSON.parse(raw||'null');}catch(_){legacy=raw;}
        const state=v1||legacy||(window.calendarSettings&&window.calendarSettings.state)||'ALL';
        if(!window.calendarSettings)window.calendarSettings={};
        window.calendarSettings.state=state;
        return state;
      }catch(e){return (window.calendarSettings&&window.calendarSettings.state)||'ALL';}
    })();
    const stateOpts=Object.entries(STATES).map(([k,v])=>`<option value="${esc(k)}" ${k===curState?'selected':''}>${esc(v)}</option>`).join('');

    const calPane=`
      <div class="settings-group">
        <div class="settings-group-label">Region</div>
        <div class="fg">
          <label class="flabel">Bundesland für Feiertage</label>
          <select class="finput" id="us-holiday-state">${stateOpts}</select>
        </div>
        <div style="height:10px"></div>
      </div>
      <div class="settings-group">
        <div class="settings-group-label">Kalenderansicht</div>
        ${switchRow('Feiertage anzeigen','','us-toggle-holidays',o.showHolidays)}
        ${switchRow('Challenge-Punkte anzeigen','','us-toggle-dots',o.showChallengeDots)}
        ${switchRow('Kalenderwochen anzeigen','','us-toggle-kw',o.showWeekNumbers)}
      </div>
      `; /* auto-save */

    const dashPane = (function(){
      var on  = typeof window.getFriseurEnabled==='function'  ? window.getFriseurEnabled()  : false;
      var w   = typeof window.getFriseurWeeks==='function'    ? window.getFriseurWeeks()    : 3;
      var uOn = typeof window.getUrlaubEnabled==='function'   ? window.getUrlaubEnabled()   : false;
      var uDy = typeof window.getUrlaubTotalDays==='function' ? window.getUrlaubTotalDays() : 30;

      var friseurSection =
        '<div class="settings-group">'        +'<div class="settings-group-label">Friseur-Tracker</div>'        +'<div class="toggle-row"><div class="toggle-copy">'        +'<div class="toggle-title">✂️ Friseur-Tracker <span class="status-pill '+(on?'status-on':'status-off')+'">'+(on?'AKTIV':'AUS')+'</span></div>'        +'<div class="toggle-sub">Zeigt wann der letzte &amp; nächste Friseur-Termin war/ist.</div>'        +'</div><label class="switch"><input type="checkbox" id="us-friseur-on" '+(on?'checked':'')+' onchange="window.setFriseurEnabled&&window.setFriseurEnabled(this.checked)"><span class="slider"></span></label></div>'        +'<div style="padding:8px 14px 12px;display:flex;align-items:center;gap:10px">'        +'<label style="font-size:12px;color:var(--t3);font-weight:600;white-space:nowrap">Erinnerung nach</label>'        +'<select class="finput" id="us-friseur-weeks" style="max-width:120px" onchange="window.setFriseurWeeks&&window.setFriseurWeeks(parseInt(this.value))">'        +[2,3,4,5,6,8].map(function(n){return '<option value="'+n+'" '+(n===w?'selected':'')+'>'+n+' Wochen</option>';}).join('')        +'</select></div>'        +'</div>';

      // Halbtage-Chips aufbauen
      // Jahresunabhängige Chips: MM-DD Format
      var _halfDaysList = (typeof window.getUrlaubHalfDays==='function' ? window.getUrlaubHalfDays() : []);
      var halfDayChips = _halfDaysList.map(function(d){
          // d ist MM-DD → TT.MM. anzeigen
          var label = d.slice(3)+'.'+d.slice(0,2)+'.';
          return '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(245,158,11,.1);color:#b45309;border:1px solid rgba(245,158,11,.25);border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600">'
            +label
            +'<button data-half-date="'+esc(d)+'" onclick="window.removeUrlaubHalfDay&&window.removeUrlaubHalfDay(this.dataset.halfDate);window.renderUrlaubHalfDayList&&window.renderUrlaubHalfDayList()" style="background:none;border:none;cursor:pointer;color:#b45309;font-size:10px;padding:0;line-height:1;margin-left:2px">✕</button>'
            +'</span>';
        }).join(' ');

      var urlaubSection =
        '<div class="settings-group">'        +'<div class="settings-group-label">Urlaubs-Tracker</div>'        +'<div class="toggle-row"><div class="toggle-copy">'        +'<div class="toggle-title">🏖️ Urlaubs-Tracker <span class="status-pill '+(uOn?'status-on':'status-off')+'">'+(uOn?'AKTIV':'AUS')+'</span></div>'        +''        +'</div><label class="switch"><input type="checkbox" id="us-urlaub-on" '+(uOn?'checked':'')+' onchange="window.setUrlaubEnabled&&window.setUrlaubEnabled(this.checked)"><span class="slider"></span></label></div>'        +'<div style="padding:8px 14px 4px;display:flex;align-items:center;gap:10px">'        +'<label style="font-size:12px;color:var(--t3);font-weight:600;white-space:nowrap">Jahresurlaub</label>'        +'<input type="number" class="finput" id="us-urlaub-days" min="1" max="365" value="'+uDy+'" style="max-width:80px" onchange="window.setUrlaubDays&&window.setUrlaubDays(parseInt(this.value)||30)">'        +'<span style="font-size:12px;color:var(--t4)"> Tage</span>'        +'</div>'        +'<div style="padding:8px 14px 12px">'        +'<div style="font-size:12px;color:var(--t3);font-weight:600;margin-bottom:6px">Halbe Urlaubstage</div>'        +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">'        +'<select class="finput" id="us-half-month" style="max-width:90px">'        +['01 Jan','02 Feb','03 Mär','04 Apr','05 Mai','06 Jun','07 Jul','08 Aug','09 Sep','10 Okt','11 Nov','12 Dez'].map(function(m){var v=m.slice(0,2);return '<option value="'+v+'">'+m.slice(3)+'</option>';}).join('')        +'</select>'        +'<select class="finput" id="us-half-day" style="max-width:70px">'        +Array.from({length:31},function(_,i){var d=String(i+1).padStart(2,'0');return '<option value="'+d+'">'+d+'.</option>';}).join('')        +'</select>'        +'<button class="btn btn-secondary btn-sm" onclick="(function(){ var m=document.getElementById(&quot;us-half-month&quot;); var d=document.getElementById(&quot;us-half-day&quot;); if(!m||!d)return; var v=m.value+&quot;-&quot;+d.value; window.addUrlaubHalfDay&&window.addUrlaubHalfDay(v); })()">'        +'+ Hinzufügen</button>'        +'</div>'        +'<div data-half-list style="display:flex;flex-wrap:wrap;gap:6px;min-height:16px">'+halfDayChips+'</div>'        +''        +'</div>'        +'</div>';

      return friseurSection + urlaubSection;
    }());

    const hasCfg=!!(window.FIREBASE_CONFIG&&window.FIREBASE_CONFIG.apiKey&&!String(window.FIREBASE_CONFIG.apiKey).includes('HIER_'));
    const perm=typeof Notification!=='undefined'?Notification.permission:'nicht unterstützt';
    const token=lsRead('fcm_token');
    const pushOn=!!token&&lsRead('push_enabled')!==false&&perm==='granted';
    const liveOn=lsRead('live_sync_enabled')!==false;
    const autoOn=lsRead('auto_challenges_enabled')!==false;
    const gIn=isGoogleLoggedIn();
    const gSync=typeof canSyncGoogleCalendar==='function'?canSyncGoogleCalendar():gIn;
    const gOn=isGoogleSyncEnabled()&&gIn;
    const online=liveOn?(window.challengePlayers||[]).filter(p=>p.online).length:0;
    const permCls=perm==='granted'?'push-ok':perm==='denied'?'push-err':'push-warn';
    const instSt=(typeof isStandaloneApp==='function'&&isStandaloneApp())?'Installiert':(typeof deferredInstallPrompt!=='undefined'&&deferredInstallPrompt?'Bereit':'Manuell');
    const gDot=`<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${gIn?'#22c55e':'#ef4444'};margin-right:5px;vertical-align:middle"></span>`;
    const gPill=gIn?(gOn?'<span class="status-pill status-on">AKTIV</span>':'<span class="status-pill status-off">AUS</span>'):'<span class="status-pill status-off">NICHT ANGEMELDET</span>';

    const syncPane=`
      <div class="settings-group">
        <div class="settings-group-label">Benachrichtigungen</div>
        ${switchRow('Push-Benachrichtigungen <span class="status-pill '+(pushOn?'status-on':'status-off')+'">'+(pushOn?'AKTIV':'INAKTIV')+'</span>','','us-toggle-push',pushOn)}
        <div style="padding:0 14px 12px">
          <button class="btn btn-secondary btn-full" style="font-size:12px" onclick="window._sendTestNotification()">Test-Benachrichtigung senden</button>
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-group-label">Synchronisierung</div>
        ${switchRow('Live-Mitspieler <span class="status-pill '+(liveOn?'status-on':'status-off')+'">'+(liveOn?'VERBUNDEN':'DEAKTIVIERT')+'</span>','','us-toggle-live',liveOn)}
        ${switchRow('Auto-Challenges <span class="status-pill '+(autoOn?'status-on':'status-off')+'">'+(autoOn?'AKTIV':'INAKTIV')+'</span>','','us-toggle-auto',autoOn)}
      </div>
      <div class="settings-group">
        <div class="settings-group-label">Google Kalender</div>
        <div class="toggle-row">
          <div class="toggle-copy">
            <div class="toggle-title">${gDot}Google Kalender ${gPill}</div>
            <div class="toggle-sub">${gIn?'':''}</div>
            
          </div>
          <label class="switch"><input type="checkbox" id="us-toggle-gsync" ${gOn?'checked':''} ${!gSync?'disabled':''}><span class="slider"></span></label>
        </div>
        <div style="padding:0 14px 12px">
          <button class="btn btn-secondary btn-full" style="font-size:12px" ${gSync?'':'disabled'} onclick="window.triggerGoogleCalendarSync()">
            <svg viewBox="0 0 24 24" width="13" height="13" style="vertical-align:middle;margin-right:5px"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/></svg>
            Jetzt synchronisieren
          </button>
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-group-label">App</div>
        <div style="padding:12px 14px">
          <button class="btn btn-secondary btn-full" onclick="if(typeof installChangeApp==='function')installChangeApp()">Change als App installieren</button>
        </div>
      </div>`;

    const panelHtml=`
      <div style="display:flex;gap:8px;padding:0 0 16px;border-bottom:1px solid var(--b1);margin-bottom:16px">
        <button class="settings-tab ${startTab==='calendar'?'active':''}" id="us-tab-calendar" onclick="window._switchSettingsTab('calendar')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Kalender
        </button>
        <button class="settings-tab ${startTab==='dashboard'?'active':''}" id="us-tab-dashboard" onclick="window._switchSettingsTab('dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>Dashboard
        </button>
        <button class="settings-tab ${startTab==='sync'?'active':''}" id="us-tab-sync" onclick="window._switchSettingsTab('sync')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Push & Sync
        </button>
      </div>
      <div id="us-pane-calendar"  class="settings-pane ${startTab==='calendar'?'active':''}">${calPane}</div>
      <div id="us-pane-dashboard" class="settings-pane ${startTab==='dashboard'?'active':''}">${dashPane}</div>
      <div id="us-pane-sync"      class="settings-pane ${startTab==='sync'?'active':''}">${syncPane}</div>`;

    if(typeof openPanel==='function') openPanel('Einstellungen',panelHtml);

    setTimeout(()=>{
      // Friseur toggles
      var frOn=$('us-friseur-on'); if(frOn&&!frOn._b){frOn._b=1;frOn.addEventListener('change',function(e){if(typeof window.setFriseurEnabled==='function')window.setFriseurEnabled(e.target.checked);});}
      var frWk=$('us-friseur-weeks'); if(frWk&&!frWk._b){frWk._b=1;frWk.addEventListener('change',function(e){if(typeof window.setFriseurWeeks==='function')window.setFriseurWeeks(parseInt(e.target.value));});}
      // Calendar settings: auto-save on change
      ['us-toggle-holidays','us-toggle-dots','us-toggle-kw'].forEach(function(id){var el=document.getElementById(id);if(el&&!el._asBound){el._asBound=true;el.addEventListener('change',function(){window._saveCalSettings();});}});
      var _stEl=document.getElementById('us-holiday-state');if(_stEl&&!_stEl._asBound){_stEl._asBound=true;_stEl.addEventListener('change',function(){window._saveCalSettings();});}
      const pT=$('us-toggle-push');
      if(pT) pT.addEventListener('change',async e=>{
        if(!e.target.checked){if(typeof disablePushNotifications==='function')await disablePushNotifications();else lsWrite('push_enabled',false);}
        else{if(typeof enablePushNotifications==='function')await enablePushNotifications();else{const p=typeof Notification!=='undefined'?await Notification.requestPermission():'denied';if(p==='granted')lsWrite('push_enabled',true);else{e.target.checked=false;if(typeof toast==='function')toast('Berechtigung verweigert','err');}}}
        window._refreshSyncPills();
      });
      const lT=$('us-toggle-live');
      if(lT) lT.addEventListener('change',async e=>{if(typeof setLiveSyncEnabled==='function')await setLiveSyncEnabled(e.target.checked);else lsWrite('live_sync_enabled',e.target.checked);window._refreshSyncPills();});
      const aT=$('us-toggle-auto');
      if(aT) aT.addEventListener('change',e=>{
        if(typeof setAutoChallengesEnabled==='function') setAutoChallengesEnabled(e.target.checked);
        else{ lsWrite('auto_challenges_enabled',e.target.checked); lsWrite('change_v1_auto_challenges_enabled',e.target.checked); }
        window._refreshSyncPills();
      });
      const gT=$('us-toggle-gsync');
      if(gT) gT.addEventListener('change',async e=>{setGoogleSyncEnabled(e.target.checked);if(e.target.checked){await window.triggerGoogleCalendarSync();}else{window.gEvents=[];if(typeof renderCalendar==='function')renderCalendar();if(typeof buildDashboard==='function')buildDashboard();if(typeof toast==='function')toast('Google Kalender getrennt','ok');}window._refreshSyncPills();});
    },80);
  };

  window._sendTestNotification=async function(){
    const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
    const isPWA=window.navigator.standalone||window.matchMedia('(display-mode: standalone)').matches;
    if(isIOS&&!isPWA){if(typeof toast==='function') toast('📱 iOS: Als App installieren (Teilen → Zum Home-Bildschirm), dann Push aktivieren.',''); return;}
    if(!('Notification' in window)){if(typeof toast==='function') toast('Push wird hier nicht unterstützt.','err'); return;}
    if(Notification.permission==='denied'){if(typeof toast==='function') toast('Push blockiert — in Browser-Einstellungen erlauben.','err'); return;}
    if(Notification.permission!=='granted'){const p=await Notification.requestPermission(); if(p!=='granted'){if(typeof toast==='function') toast('Push nicht erlaubt.','err'); return;}}
    try{
      const n=new Notification('Change · Test 🔔',{body:'Push-Benachrichtigungen funktionieren!',icon:'./icon-192.png',tag:'change-test'});
      n.onclick=()=>{window.focus();n.close();}; if(typeof toast==='function') toast('Test-Push gesendet ✓','ok');
    }catch(e){
      if('serviceWorker' in navigator){navigator.serviceWorker.ready.then(sw=>{sw.showNotification('Change · Test 🔔',{body:'Push funktioniert!',icon:'./icon-192.png'}); if(typeof toast==='function') toast('Test ✓','ok');}).catch(()=>{if(typeof toast==='function') toast('Fehlgeschlagen: '+e.message,'err');});
      }else{if(typeof toast==='function') toast('Fehlgeschlagen: '+e.message,'err');}
    }
  };
  window._switchSettingsTab=function(tab){ ['calendar','dashboard','sync'].forEach(t=>{const b=$('us-tab-'+t),p=$('us-pane-'+t);if(b)b.classList.toggle('active',t===tab);if(p)p.classList.toggle('active',t===tab);});};

  // In-Place Sync-Status aktualisieren ohne Panel zu schließen
  window._refreshSyncPills=function(){
    try{
      const perm=typeof Notification!=='undefined'?Notification.permission:'nicht unterstützt';
      const token=lsRead('fcm_token');
      const pushOn=!!token&&lsRead('push_enabled')!==false&&perm==='granted';
      const liveOn=lsRead('live_sync_enabled')!==false;
      const autoOn=lsRead('auto_challenges_enabled')!==false;
      const gIn=typeof isGoogleLoggedIn==='function'?isGoogleLoggedIn():false;
      const gOn=typeof isGoogleSyncEnabled==='function'&&isGoogleSyncEnabled()&&gIn;
      // Update push pill
      const pTog=$('us-toggle-push');
      if(pTog) pTog.checked=pushOn;
      // Update live pill
      const lTog=$('us-toggle-live');
      if(lTog) lTog.checked=liveOn;
      // Update auto-challenge pill
      const aTog=$('us-toggle-auto');
      if(aTog) aTog.checked=autoOn;
      // Update toggle title pills via label text
      document.querySelectorAll('[id^="us-pane-sync"] .toggle-title, #us-pane-sync .toggle-title').forEach(function(el){
        const txt=el.textContent||'';
        if(txt.includes('Push')){
          const sp=el.querySelector('.status-pill');
          if(sp){sp.className='status-pill '+(pushOn?'status-on':'status-off');sp.textContent=pushOn?'AKTIV':'INAKTIV';}
        }
        if(txt.includes('Live')){
          const sp=el.querySelector('.status-pill');
          if(sp){sp.className='status-pill '+(liveOn?'status-on':'status-off');sp.textContent=liveOn?'VERBUNDEN':'DEAKTIVIERT';}
        }
        if(txt.includes('Auto-Challenges')){
          const sp=el.querySelector('.status-pill');
          if(sp){sp.className='status-pill '+(autoOn?'status-on':'status-off');sp.textContent=autoOn?'AKTIV':'INAKTIV';}
        }
      });
      // Status wird im Panel direkt aktualisiert – kein zusätzlicher Toast.
    }catch(e){}
  };
  window._saveCalSettings=function(){
    const o={showHolidays:true,showChallengeDots:true,showWeekNumbers:true};
    const h=$('us-toggle-holidays');if(h)o.showHolidays=h.checked;
    const d=$('us-toggle-dots');if(d)o.showChallengeDots=d.checked;
    const k=$('us-toggle-kw');if(k)o.showWeekNumbers=k.checked;
    saveOpt(o);
    const se=$('us-holiday-state');
    if(se){const s=se.value||'ALL';localStorage.setItem('change_v1_holiday_state',s);if(typeof ls==='function')ls('holiday_state',s);else localStorage.setItem('holiday_state',JSON.stringify(s));if(!window.calendarSettings)window.calendarSettings={};window.calendarSettings.state=s;}
    if(typeof renderCalendar==='function')renderCalendar();
    // [FIREBASE SYNC] Einstellungen in Firestore speichern
    setTimeout(()=>{ if(typeof window.saveSettingsToFirestore==='function') window.saveSettingsToFirestore(); }, 300);
    // kein Toast bei Auto-Save
  };
  // Friseur-Tracker Settings
  function buildFriseurSection(){
    const on=typeof window.getFriseurEnabled==='function'?window.getFriseurEnabled():false;
    const w=typeof window.getFriseurWeeks==='function'?window.getFriseurWeeks():3;
    return '<div style="height:1px;background:var(--b1);margin:16px 0"></div>'+
      '<div class="toggle-row"><div class="toggle-copy">'+
        '<div class="toggle-title">✂️ Friseur-Tracker <span class="status-pill '+(on?'status-on':'status-off')+'">'+(on?'AKTIV':'AUS')+'</span></div>'+
        '<div class="toggle-sub">Zeigt im Dashboard wie lange der letzte Friseur-Termin her ist. Termin muss „Friseur" im Titel enthalten. Erinnerung nach '+w+' Wochen.</div>'+
      '</div><label class="switch"><input type="checkbox" id="us-friseur-on" '+(on?'checked':'')+' onchange="window.setFriseurEnabled&&window.setFriseurEnabled(this.checked)"><span class="slider"></span></label></div>'+
      '<div style="margin-top:10px;display:flex;align-items:center;gap:10px">'+
        '<label style="font-size:12px;color:var(--t3);font-weight:600;white-space:nowrap">Erinnerung nach</label>'+
        '<select class="finput" id="us-friseur-weeks" style="max-width:120px" onchange="window.setFriseurWeeks&&window.setFriseurWeeks(parseInt(this.value))">'+
          [2,3,4,5,6,8].map(function(n){return '<option value="'+n+'" '+(n===w?'selected':'')+'>'+n+' Wochen</option>';}).join('')+
        '</select></div>';
  }
  // Friseur now in Dashboard tab of settings — no separate injection needed
  window.openCalendarSettings=()=>window.openSettingsPanel('calendar');
  window.openPushSettingsPanel=()=>window.openSettingsPanel('sync');
  window.saveCalSettings=window._saveCalSettings;

  /* Glocke wird zentral über updateBellIndicator() gesteuert. */

  /* ==== PUNKTE-KALENDER RETRY NACH FIREBASE-LOAD ==== */
  (function(){
    let _done=false;
    function tryWB(){if(_done)return;if((window.challengeCompletions||[]).length>0){_done=true;if(window.currentMainView==='challenges'&&typeof window.renderWeekBar==='function')window.renderWeekBar();}}
    [1000,2500,5000,9000].forEach(ms=>setTimeout(tryWB,ms));
    let _c=window.challengeCompletions||[];
    try{Object.defineProperty(window,'challengeCompletions',{get:()=>_c,set:v=>{_c=v;if(v&&v.length>0){_done=true;setTimeout(()=>{if(window.currentMainView==='challenges'&&typeof window.renderWeekBar==='function')window.renderWeekBar();},50);}},configurable:true});}catch(e){}
  })();

  /* ==== OPTIONALE CHALLENGES SICHERSTELLEN ==== */
  (function(){
    const OPTS=[
      {id:'sport_fitness_30_optional',title:'Fitness · mind. 30 Minuten',points:30,icon:'🏋️',desc:'Leichtes bis mittleres Training für mind. 30 Minuten.',optional:true,active:true}
    ];
    function ensure(){
      const chs=window.challenges||[];
      OPTS.forEach(o=>{if(!chs.find(c=>c.id===o.id))chs.push({...o,createdAt:new Date().toISOString()});});
      if(window.ChangeChallengeStore){
        window.ChangeChallengeStore.mergeChallenges(chs,{persist:true});
        window.challenges=window.ChangeChallengeStore.getChallenges();
      }else{
        window.challenges=chs;
        try{ if(typeof window.ls==='function') window.ls('challenges', chs); }catch(e){}
      }
    }
    [400,1800,6800].forEach(ms=>setTimeout(ensure,ms));
    function wrapRC(){const fn=window.renderChallenges;if(typeof fn==='function'&&!fn.__optW){window.renderChallenges=function(){ensure();return fn.apply(this,arguments);};window.renderChallenges.__optW=true;}}
    [200,600,3100,6700].forEach(ms=>setTimeout(wrapRC,ms));
  })();

  /* ==== getAllEvents: Google-Titel korrekt ==== */
  (function(){
    const pad=n=>String(n).padStart(2,'0');
    const keyOf=d=>{const x=d instanceof Date?d:new Date(String(d)+'T12:00:00');return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());};
    const addDay=(k,n)=>{const d=new Date(k+'T12:00:00');d.setDate(d.getDate()+n);return keyOf(d);};
    function myGetAllEvents(){
      const out=[],seen=new Set();
      function add(ev){if(!ev||!ev.date)return;const k=(ev.googleEventId?'g:'+ev.googleEventId:'l:'+(ev.id||ev.title||''))+'|'+String(ev.startDate||ev.date).slice(0,10);if(seen.has(k))return;seen.add(k);out.push(ev);}
      try{(Array.isArray(window.events)?window.events:[]).forEach(ev=>{const s=String(ev.startDate||ev.date||'').slice(0,10);const e=String(ev.endDate||ev.toDate||ev.untilDate||s).slice(0,10);add({...ev,date:s,startDate:s,endDate:e>=s?e:s,title:ev.title||ev.summary||ev.name||'Termin',time:ev.time||'',endTime:ev.endTime||'',source:ev.source||'local'});});}catch(e){}
      try{(Array.isArray(window.gEvents)?window.gEvents:[]).forEach(ge=>{if(!ge)return;const title=ge.summary||ge.title||'Google-Termin';let s='',e='',time='';if(ge.start&&ge.start.date){s=String(ge.start.date).slice(0,10);}else if(ge.start&&ge.start.dateTime){s=String(ge.start.dateTime).slice(0,10);try{time=new Date(ge.start.dateTime).toTimeString().slice(0,5);}catch(ex){}}if(!s)return;if(ge.end&&ge.end.date){e=addDay(String(ge.end.date).slice(0,10),-1);if(e<s)e=s;}else if(ge.end&&ge.end.dateTime){e=String(ge.end.dateTime).slice(0,10);}else{e=s;}let endTime='';if(ge.end&&ge.end.dateTime){try{endTime=new Date(ge.end.dateTime).toTimeString().slice(0,5);}catch(ex){}}add({id:'g_'+(ge.id||''),googleEventId:ge.id||'',title,date:s,startDate:s,endDate:e,time,endTime,allDay:!ge.start?.dateTime,color:'blue',type:'meeting',desc:ge.description||'',source:'google'});});}catch(e){}
      return out;
    }
    [300,7000].forEach(ms=>setTimeout(()=>{window.getAllEvents=myGetAllEvents;},ms));
  })();

  /* Toolbar redirects */
  function fixTB(){document.querySelectorAll('[onclick="openCalendarSettings()"]').forEach(el=>el.setAttribute('onclick',"openSettingsPanel('calendar')"));document.querySelectorAll('[onclick="openPushSettingsPanel()"]').forEach(el=>el.setAttribute('onclick',"openSettingsPanel('sync')"));}
  document.addEventListener('DOMContentLoaded',()=>{fixTB();updateAvatarDot();});
  window.addEventListener('load',()=>{fixTB();updateAvatarDot();});
  setTimeout(fixTB,500);
  function bindSettingsButton(){const b=document.getElementById('settings-btn')||document.querySelector('[title="Einstellungen"]');if(b){b.onclick=function(e){if(e){e.preventDefault();e.stopPropagation();}window.openSettingsPanel&&window.openSettingsPanel('calendar');return false;};}}
  document.addEventListener('DOMContentLoaded',bindSettingsButton);
  window.addEventListener('load',bindSettingsButton);
  setTimeout(bindSettingsButton,700);

})();

/* ── friseur-tracker ── */
(function(){
  'use strict';
  const LS_KEY = 'change_v1_friseur_enabled';
  const LS_WEEKS = 'change_v1_friseur_weeks';
  const KEYWORD = 'friseur';

  function isEnabled(){
    const v = localStorage.getItem(LS_KEY);
    return v === null ? false : v === 'true';
  }
  function getWeeks(){
    return parseInt(localStorage.getItem(LS_WEEKS)||'3')||3;
  }
  function daysSince(dateStr){
    const d = new Date(dateStr+'T12:00:00');
    return Math.floor((Date.now()-d.getTime())/86400000);
  }
  function findLastFriseur(){
    const kw = KEYWORD.toLowerCase();
    const today = new Date(); today.setHours(23,59,59,0);
    let best = null;
    // Check local events
    (window.events||[]).forEach(function(ev){
      const title = String(ev.title||ev.summary||ev.name||'').toLowerCase();
      const desc  = String(ev.desc||ev.description||'').toLowerCase();
      if(!title.includes(kw)&&!desc.includes(kw)) return;
      const d = new Date((ev.startDate||ev.date||'')+'T12:00:00');
      if(isNaN(d)||d>today) return;
      if(!best||d>new Date(best+'T12:00:00')) best = ev.startDate||ev.date||'';
    });
    // Check Google events (gEvents raw)
    (window.gEvents||[]).forEach(function(ge){
      if(!ge) return;
      const title = String(ge.summary||ge.title||'').toLowerCase();
      const desc  = String(ge.description||'').toLowerCase();
      if(!title.includes(kw)&&!desc.includes(kw)) return;
      // Get start date from Google event
      const startStr = (ge.start&&(ge.start.date||ge.start.dateTime||''))||'';
      if(!startStr) return;
      const d = new Date(startStr.length===10?startStr+'T12:00:00':startStr);
      if(isNaN(d)||d>today) return;
      const k = startStr.slice(0,10);
      if(!best||d>new Date(best+'T12:00:00')) best = k;
    });
    // Also check via getAllEvents (normalized)
    if(typeof window.getAllEvents==='function'){
      (window.getAllEvents()||[]).forEach(function(ev){
        const title = String(ev.title||ev.summary||'').toLowerCase();
        const desc  = String(ev.desc||ev.description||'').toLowerCase();
        if(!title.includes(kw)&&!desc.includes(kw)) return;
        const d = new Date((ev.date||ev.startDate||'')+'T12:00:00');
        if(isNaN(d)||d>today) return;
        const k = (ev.date||ev.startDate||'').slice(0,10);
        if(k&&(!best||d>new Date(best+'T12:00:00'))) best = k;
      });
    }
    return best;
  }

  function findNextFriseur(){
    var info=findNextFriseurInfo();
    return info&&info.date;
  }

  function findNextFriseurInfo(){
    var kw=KEYWORD.toLowerCase(), today=new Date(); today.setHours(0,0,0,0);
    var best=null;
    function checkEvt(title,desc,dateStr,time,endTime){
      var rawTitle=String(title||'Termin');
      title=rawTitle.toLowerCase(); desc=String(desc||'').toLowerCase();
      if(!title.includes(kw)&&!desc.includes(kw)) return;
      var date=(dateStr||'').slice(0,10), d=new Date(date+'T12:00:00');
      if(!date||isNaN(d)||d<today) return;
      if(!best||d<new Date(best.date+'T12:00:00')) best={date:date,title:rawTitle,time:time||'',endTime:endTime||''};
    }
    (window.events||[]).forEach(function(e){checkEvt(e.title,e.desc,e.startDate||e.date,e.time,e.endTime);});
    (window.gEvents||[]).forEach(function(g){
      if(!g)return;
      var s=(g.start&&(g.start.date||g.start.dateTime)||''), t='', et='';
      if(g.start&&g.start.dateTime){try{t=new Date(g.start.dateTime).toTimeString().slice(0,5);}catch(e){}}
      if(g.end&&g.end.dateTime){try{et=new Date(g.end.dateTime).toTimeString().slice(0,5);}catch(e){}}
      checkEvt(g.summary,g.description,s,t,et);
    });
    if(typeof window.getAllEvents==='function')(window.getAllEvents()||[]).forEach(function(e){checkEvt(e.title,e.desc,e.date||e.startDate,e.time,e.endTime);});
    return best;
  }

  function renderFriseurBanner(){
    // Friseur-Info ist in die Kalender-Kachel integriert → Dashboard neu bauen
    if(typeof window.buildDashCards==='function') window.buildDashCards();
  }

  // Push notification after threshold
  function checkFriseurNotif(){
    if(!isEnabled()) return;
    const lastDate = findLastFriseur();
    if(!lastDate) return;
    const days  = daysSince(lastDate);
    const weeks = getWeeks();
    if(days < weeks*7) return;
    const key = 'friseur_notif_'+lastDate;
    if(localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    if(typeof Notification!=='undefined' && Notification.permission==='granted'){
      new Notification('✂️ Friseur-Erinnerung', {
        body: 'Dein letzter Friseur-Termin war vor '+days+' Tagen. Zeit für einen neuen Termin?'
      });
    }
  }

  // Public API
  window.renderFriseurBanner = renderFriseurBanner;
  window._friseurFindLast   = findLastFriseur;
  window._friseurFindNext   = findNextFriseurInfo;
  window.getFriseurEnabled   = isEnabled;
  window.setFriseurEnabled   = function(on){
    localStorage.setItem(LS_KEY, on?'true':'false');
    if(typeof window.buildDashCards==='function') window.buildDashCards();
  };
  window.setFriseurWeeks = function(w){
    localStorage.setItem(LS_WEEKS, String(parseInt(w)||3));
    if(typeof window.buildDashCards==='function') window.buildDashCards();
  };
  window.getFriseurWeeks = getWeeks;

  // Alle Friseur-Termine des aktuellen Jahres (vergangen + zukünftig)
  function findAllFriseurThisYear(){
    var kw   = KEYWORD.toLowerCase();
    var year = String(new Date().getFullYear());
    var seen = {};
    var all  = [];

    function addEvent(title, dateStr, time, endTime){
      var date = (dateStr||'').slice(0,10);
      if(!date || date.slice(0,4) !== year) return;
      var key  = date + '|' + String(title||'');
      if(seen[key]) return;
      seen[key] = true;
      var rawTitle = String(title||'Friseur-Termin');
      var t = rawTitle.toLowerCase();
      if(!t.includes(kw)) return;
      all.push({ date: date, title: rawTitle, time: time||'', endTime: endTime||'' });
    }

    (window.events||[]).forEach(function(e){
      addEvent(e.title, e.startDate||e.date, e.time, e.endTime);
    });
    (window.gEvents||[]).forEach(function(g){
      if(!g) return;
      var s = (g.start&&(g.start.date||g.start.dateTime)||'');
      var t='', et='';
      if(g.start&&g.start.dateTime){try{t=new Date(g.start.dateTime).toTimeString().slice(0,5);}catch(e){}}
      if(g.end  &&g.end.dateTime  ){try{et=new Date(g.end.dateTime  ).toTimeString().slice(0,5);}catch(e){}}
      addEvent(g.summary||g.title, s, t, et);
    });
    if(typeof window.getAllEvents==='function'){
      (window.getAllEvents()||[]).forEach(function(e){
        addEvent(e.title, e.date||e.startDate, e.time, e.endTime);
      });
    }

    return all.sort(function(a,b){ return a.date.localeCompare(b.date); });
  }

  // Detail-Panel: Jahresübersicht aller Friseur-Besuche
  window.openFriseurPanel = function(){
    var year     = new Date().getFullYear();
    var today    = new Date().toISOString().slice(0,10);
    var weeks    = getWeeks();
    var lastDate = findLastFriseur();
    var nextInfo = findNextFriseurInfo();
    var allAppts = findAllFriseurThisYear();
    var past     = allAppts.filter(function(a){ return a.date <= today; });
    var future   = allAppts.filter(function(a){ return a.date >  today; });

    var fmtDate  = function(str){
      try{ return new Date(str+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long'}); }
      catch(e){ return str; }
    };
    var fmtShort = function(str){
      try{ return new Date(str+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'short'}); }
      catch(e){ return str; }
    };

    // Durchschnittlicher Abstand zwischen vergangenen Terminen
    var avgDays = '';
    if(past.length >= 2){
      var diffs = [];
      for(var i=1; i<past.length; i++){
        var a = new Date(past[i-1].date+'T12:00:00');
        var b = new Date(past[i  ].date+'T12:00:00');
        diffs.push(Math.round((b-a)/86400000));
      }
      var sum = diffs.reduce(function(s,d){ return s+d; }, 0);
      avgDays = Math.round(sum/diffs.length);
    }

    // Zusammenfassungs-Kacheln
    var summaryHtml = '<div style="display:flex;gap:0;margin-bottom:16px;border-radius:var(--r);overflow:hidden;border:1px solid var(--b1)">'
      + '<div style="flex:1;text-align:center;padding:12px 8px;background:var(--s1);border-right:1px solid var(--b1)">'
      +   '<div style="font-size:20px;font-weight:900;color:var(--acc)">'+past.length+'</div>'
      +   '<div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Besuche '+year+'</div>'
      + '</div>'
      + (avgDays ? '<div style="flex:1;text-align:center;padding:12px 8px;background:var(--s1);border-right:1px solid var(--b1)">'
      +   '<div style="font-size:20px;font-weight:900;color:var(--t2)">'+avgDays+'d</div>'
      +   '<div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Ø Abstand</div>'
      + '</div>' : '')
      + '<div style="flex:1;text-align:center;padding:12px 8px;background:var(--s1)">'
      +   '<div style="font-size:20px;font-weight:900;color:var(--t2)">'+weeks+'W</div>'
      +   '<div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Erinnerung</div>'
      + '</div>'
      + '</div>';

    // Nächster Termin-Box
    var nextBox = '';
    if(nextInfo){
      var nt = nextInfo.time ? nextInfo.time+' Uhr' : '';
      var ntEnd = nextInfo.endTime && nextInfo.endTime !== nextInfo.time ? ' – '+nextInfo.endTime+' Uhr' : '';
      nextBox = '<div style="background:rgba(45,106,79,.07);border:1px solid rgba(45,106,79,.15);border-radius:var(--r);padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">'
        + '<span style="font-size:16px">📅</span>'
        + '<div><div style="font-size:12px;font-weight:700;color:var(--acc)">Nächster Termin</div>'
        + '<div style="font-size:13px;font-weight:600;color:var(--t1);margin-top:2px">'+fmtDate(nextInfo.date)+(nt?' · '+nt+ntEnd:'')+'</div>'
        + (nextInfo.title !== KEYWORD ? '<div style="font-size:11px;color:var(--t3);margin-top:1px">'+nextInfo.title+'</div>' : '')
        + '</div></div>';
    }

    // Liste vergangener Termine (neueste zuerst)
    var pastRows = past.slice().reverse().map(function(a, i){
      var isLast = i === 0;
      var days   = Math.round((Date.now() - new Date(a.date+'T12:00:00').getTime()) / 86400000);
      var timeStr = a.time ? a.time + (a.endTime && a.endTime !== a.time ? ' – '+a.endTime : '') + ' Uhr' : 'Ganztägig';
      return '<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--b1)">'
        + '<div style="width:8px;height:8px;border-radius:50%;background:'+(isLast?'var(--acc)':'var(--b1)')+';border:2px solid '+(isLast?'var(--acc)':'var(--t4)')+';flex-shrink:0"></div>'
        + '<div style="flex:1;min-width:0">'
        +   '<div style="font-size:13px;font-weight:600;color:var(--t1)">'+fmtDate(a.date)+'</div>'
        +   '<div style="font-size:11px;color:var(--t3);margin-top:1px">'+timeStr
        +   (a.title.toLowerCase() !== KEYWORD.toLowerCase() ? ' · '+a.title : '')+'</div>'
        + '</div>'
        + '<div style="font-size:11px;font-weight:700;color:'+(isLast?'var(--acc)':'var(--t3)')+'">'+
          (isLast ? 'letzter' : 'vor '+days+'d') +'</div>'
        + '</div>';
    }).join('');

    var emptyHtml = past.length === 0
      ? '<div style="color:var(--t4);font-size:13px;padding:16px 0">Noch kein Friseur-Termin in '+year+' gefunden.<br><span style="font-size:11px">Tipp: Termin muss „Friseur" im Titel enthalten.</span></div>'
      : '';

    var sectionLabel = '<div style="font-size:10px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.5px;padding-bottom:6px;border-bottom:1px solid var(--b1);margin-bottom:4px">Besuche in '+year+'</div>';

    if(typeof openPanel === 'function'){
      openPanel('✂️ Friseur-Besuche '+year, summaryHtml + nextBox + sectionLabel + pastRows + emptyHtml);
    }
  };

  // Gibt fertiges HTML für die Friseur-Zeile zurück (für buildDashCards)
  window.getFriseurRowHtml = function(){
    if(!isEnabled()) return '';
    var lastDate = findLastFriseur();
    var nextInfo = findNextFriseurInfo();
    var nextDate = nextInfo && nextInfo.date;
    if(!lastDate && !nextDate) return '';

    var weeks = getWeeks();
    var fmtS = function(k){ try{ return new Date(k+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'short'}); }catch(e){ return k; } };
    var days = lastDate ? Math.round((Date.now()-new Date(lastDate+'T12:00:00'))/86400000) : null;
    var warn = days!==null && days >= weeks*7;
    var overdue = days!==null && days >= weeks*7+7;
    var daysUntilNext = nextDate ? Math.round((new Date(nextDate+'T12:00:00')-Date.now())/86400000) : null;

    var leftColor = overdue ? '#ef4444' : warn ? '#f59e0b' : 'var(--acc)';
    var leftText = lastDate
      ? 'vor <span style="font-weight:800;color:'+leftColor+'">'+days+' Tagen</span>'
        + '<span style="color:var(--t4)"> – zuletzt besucht am '+fmtS(lastDate)+'</span>'
      : '<span style="color:var(--t4)">Kein vergangener Termin</span>';

    var badge = '';
    if(nextDate){
      var urgCls = daysUntilNext <= 3 ? 'rgba(245,158,11,.15);color:#b45309' : 'rgba(45,106,79,.1);color:var(--acc)';
      var timeStr = nextInfo && nextInfo.time ? ' um '+nextInfo.time+' Uhr' : '';
      badge = '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;white-space:nowrap;background:'+urgCls+'">nächster Termin am '+fmtS(nextDate)+timeStr+'</span>';
    } else if(overdue){
      badge = '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;white-space:nowrap;background:rgba(239,68,68,.12);color:#dc2626">⚠ Überfällig</span>';
    } else if(warn){
      badge = '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;white-space:nowrap;background:rgba(245,158,11,.12);color:#b45309">⏰ Bald fällig</span>';
    } else {
      badge = '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;white-space:nowrap;background:rgba(156,163,175,.12);color:var(--t3)">Kein Termin geplant</span>';
    }

    return '<div onclick="window.openFriseurPanel&&window.openFriseurPanel()" style="display:flex;align-items:center;gap:8px;padding:10px 14px 10px;border-top:1px solid var(--b1);margin-top:4px;cursor:pointer" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
      + '<span style="font-size:12px;flex-shrink:0">✂️</span>'
      + '<span style="font-size:11px;font-weight:700;color:var(--t2);white-space:nowrap;margin-right:2px">Friseur</span>'
      + '<span style="font-size:11px;min-width:0">'+leftText+'</span>'
      + '<span style="margin-left:auto">'+badge+'</span>'
      + '</div>';
  };


  // Hook into buildDashboard
  var _origBD = window.buildDashboard;
  function wrappedBD(){
    if(typeof _origBD==='function') _origBD.apply(this,arguments);
    setTimeout(checkFriseurNotif, 2000);
  }
  wrappedBD.__eventFix = _origBD&&_origBD.__eventFix;
  window.buildDashboard = wrappedBD;
  // KEIN buildDashCards = wrappedBD → würde Endlosrekursion auslösen

  // Init
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(checkFriseurNotif, 3000);
  });
})();

/* ── change-settings-sync ── */
/* ==========================
   CHANGE SETTINGS SYNC
   Zentrale Speicherung aller Einstellungspunkte über Firebase.
   Es werden nur Präferenzen gespeichert – keine Tokens und keine Access-Keys.
========================== */
(function(){
  'use strict';

  const COLLECTION = 'change_settings';
  const STAMP_KEY = 'change_v1_settings_updated_at';
  const LAST_SYNC_KEY = 'change_v1_settings_synced_at';
  const LISTENER_KEY = '__changeSettingsSyncListener';
  const SAVE_DELAY = 650;
  const CONTROL_IDS = new Set([
    'us-holiday-state','holiday-state','us-toggle-holidays','toggle-holidays','us-toggle-dots','toggle-dots','us-toggle-kw','toggle-kw',
    'holiday-notifications','us-friseur-on','us-friseur-weeks','us-urlaub-on','us-urlaub-days','us-half-date',
    'us-toggle-push','us-toggle-live','us-toggle-auto','us-toggle-gsync','client-id-input'
  ]);

  let saveTimer = null;
  let isApplyingRemote = false;
  let isSaving = false;

  const nowIso = () => new Date().toISOString();
  const norm = v => String(v || '').trim().toLowerCase();
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  const safeDocId = id => norm(id || 'unknown').replace(/[^a-z0-9._-]/g, '_');

  function readRaw(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
  function writeRaw(key, value){ try{ localStorage.setItem(key, value); }catch(e){} }
  function readStored(key, fallback){
    const raw = readRaw(key);
    if(raw === null || raw === undefined) return fallback;
    try{ return JSON.parse(raw); }catch(e){ return raw; }
  }
  function writeJson(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} }
  function writeString(key, value){ try{ localStorage.setItem(key, String(value)); }catch(e){} }
  function readFirst(keys, fallback){
    for(const key of keys){
      const raw = readRaw(key);
      if(raw === null || raw === undefined) continue;
      const parsed = readStored(key, raw);
      if(parsed !== null && parsed !== undefined && parsed !== '') return parsed;
    }
    return fallback;
  }
  function readBool(keys, fallback){
    for(const key of keys){
      const v = readStored(key, undefined);
      if(v === undefined || v === null || v === '') continue;
      if(typeof v === 'boolean') return v;
      if(typeof v === 'number') return v !== 0;
      const s = String(v).trim().toLowerCase();
      if(['true','1','yes','ja','on'].includes(s)) return true;
      if(['false','0','no','nein','off'].includes(s)) return false;
    }
    return fallback;
  }
  function readNumber(keys, fallback){
    for(const key of keys){
      const n = parseInt(readStored(key, ''), 10);
      if(Number.isFinite(n)) return n;
    }
    return fallback;
  }
  function readObject(keys, fallback){
    for(const key of keys){
      const v = readStored(key, undefined);
      if(v && typeof v === 'object' && !Array.isArray(v)) return Object.assign({}, fallback || {}, v);
    }
    return Object.assign({}, fallback || {});
  }
  function readArray(keys, fallback){
    for(const key of keys){
      const v = readStored(key, undefined);
      if(Array.isArray(v)) return v.slice();
    }
    return Array.isArray(fallback) ? fallback.slice() : [];
  }
  function timeValue(value){
    if(!value) return 0;
    if(typeof value.toMillis === 'function') return value.toMillis();
    if(typeof value.toDate === 'function') return value.toDate().getTime();
    const t = Date.parse(String(value));
    return Number.isFinite(t) ? t : 0;
  }

  function globalUserInfo(){
    try{ if(typeof userInfo !== 'undefined' && userInfo && typeof userInfo === 'object') return userInfo; }catch(e){}
    return window.userInfo || {};
  }
  function settingsAccount(){
    let fu = null;
    try{ fu = window.firebase && firebase.auth && firebase.auth().currentUser; }catch(e){}
    const candidates = [
      fu || {},
      globalUserInfo(),
      readStored('change_v1_user_info', {}) || {},
      readStored('user_info', {}) || {},
      readStored('google_user', {}) || {},
      readStored('current_user', {}) || {}
    ];
    let email = '';
    for(const c of candidates){
      const e = norm(c && (c.email || c.mail));
      if(isEmail(e)){ email = e; break; }
    }
    const uid = String((fu && fu.uid) || candidates.find(c => c && (c.uid || c.id))?.uid || candidates.find(c => c && (c.uid || c.id))?.id || '').trim();
    let name = '';
    for(const c of candidates){
      const n = String(c && (c.displayName || c.name || '')).trim();
      if(n && !/^mitspieler$/i.test(n)){ name = n; break; }
    }
    return { id: email || uid || '', email, uid, name: name || email || '', ready: !!email || !!uid };
  }
  async function ensureSettingsDb(){
    if(!window.firebase || !window.FIREBASE_CONFIG) return null;
    const cfg = window.FIREBASE_CONFIG || {};
    if(!cfg.apiKey || String(cfg.apiKey).includes('HIER_') || !cfg.projectId) return null;
    try{ if(!firebase.apps.length) firebase.initializeApp(cfg); if(window.ensureChangeFirebaseAuth){ const authOk = await window.ensureChangeFirebaseAuth({ silent:true }); if(!authOk) return null; } return firebase.firestore(); }
    catch(e){ console.warn('Settings Sync Firebase:', e); return null; }
  }

  function readHolidayState(){
    try{ if(typeof window.getHolidayState === 'function') return window.getHolidayState() || 'ALL'; }catch(e){}
    const raw = readFirst(['change_v1_holiday_state','holiday_state'], 'ALL');
    return String(raw || 'ALL').replace(/^"|"$/g, '') || 'ALL';
  }
  function readCalendarOptions(){
    return readObject(['change_v1_calendar_view_options','calendar_settings'], { showHolidays:true, showChallengeDots:true, showWeekNumbers:true });
  }
  function readClientId(){
    try{ if(typeof window.getGoogleClientId === 'function') return window.getGoogleClientId() || ''; }catch(e){}
    return String(readFirst(['change_v1_client_id','client_id'], '') || '').trim();
  }

  function collectSettings(){
    const calendarOptions = readCalendarOptions();
    return {
      schema: 1,
      owner: settingsAccount(),
      calendar: {
        holidayState: readHolidayState(),
        holidayNotifications: readBool(['change_v1_holiday_notifications','holiday_notifications'], true),
        showHolidays: calendarOptions.showHolidays !== false,
        showChallengeDots: calendarOptions.showChallengeDots !== false,
        showWeekNumbers: calendarOptions.showWeekNumbers === true
      },
      dashboard: {
        friseurEnabled: typeof window.getFriseurEnabled === 'function' ? !!window.getFriseurEnabled() : readBool(['change_v1_friseur_enabled'], false),
        friseurWeeks: typeof window.getFriseurWeeks === 'function' ? parseInt(window.getFriseurWeeks(), 10) || 3 : readNumber(['change_v1_friseur_weeks'], 3),
        urlaubEnabled: typeof window.getUrlaubEnabled === 'function' ? !!window.getUrlaubEnabled() : readBool(['urlaub_tracker_on'], true),
        urlaubTotalDays: typeof window.getUrlaubTotalDays === 'function' ? parseInt(window.getUrlaubTotalDays(), 10) || 30 : readNumber(['urlaub_tracker_days'], 30),
        urlaubHalfDays: typeof window.getUrlaubHalfDays === 'function' ? (window.getUrlaubHalfDays() || []) : readArray(['urlaub_half_days'], [])
      },
      sync: {
        pushPreferenceEnabled: readBool(['change_v1_push_enabled'], false),
        liveSyncEnabled: readBool(['change_v1_live_sync_enabled','live_sync_enabled'], true),
        autoChallengesEnabled: readBool(['change_v1_auto_challenges_enabled','auto_challenges_enabled'], true),
        googleCalendarSyncEnabled: readBool(['change_v1_google_calendar_sync'], true)
      },
      google: {
        clientId: readClientId()
      },
      updatedAtLocal: readRaw(STAMP_KEY) || nowIso()
    };
  }

  function applySettings(settings){
    if(!settings || typeof settings !== 'object') return;
    isApplyingRemote = true;
    try{
      const cal = settings.calendar || {};
      const dash = settings.dashboard || {};
      const sync = settings.sync || {};
      const google = settings.google || {};
      const opts = {
        showHolidays: cal.showHolidays !== false,
        showChallengeDots: cal.showChallengeDots !== false,
        showWeekNumbers: cal.showWeekNumbers === true
      };

      if(cal.holidayState){
        if(typeof window.setHolidayState === 'function') window.setHolidayState(cal.holidayState);
        else { writeRaw('change_v1_holiday_state', cal.holidayState); writeRaw('holiday_state', cal.holidayState); }
        if(!window.calendarSettings) window.calendarSettings = {};
        window.calendarSettings.state = cal.holidayState;
      }
      if(typeof cal.holidayNotifications === 'boolean'){
        writeJson('change_v1_holiday_notifications', cal.holidayNotifications);
        writeJson('holiday_notifications', cal.holidayNotifications);
        if(!window.calendarSettings) window.calendarSettings = {};
        window.calendarSettings.holidayNotifications = cal.holidayNotifications;
      }
      writeJson('change_v1_calendar_view_options', opts);
      writeJson('calendar_settings', opts);

      if(typeof dash.friseurEnabled === 'boolean') writeString('change_v1_friseur_enabled', dash.friseurEnabled ? 'true' : 'false');
      if(dash.friseurWeeks) writeString('change_v1_friseur_weeks', parseInt(dash.friseurWeeks, 10) || 3);
      if(typeof dash.urlaubEnabled === 'boolean') writeString('urlaub_tracker_on', dash.urlaubEnabled ? 'true' : 'false');
      if(dash.urlaubTotalDays) writeString('urlaub_tracker_days', parseInt(dash.urlaubTotalDays, 10) || 30);
      if(Array.isArray(dash.urlaubHalfDays)) writeJson('urlaub_half_days', dash.urlaubHalfDays.slice().sort());

      if(typeof sync.pushPreferenceEnabled === 'boolean') writeJson('change_v1_push_enabled', sync.pushPreferenceEnabled);
      if(typeof sync.liveSyncEnabled === 'boolean'){
        writeJson('change_v1_live_sync_enabled', sync.liveSyncEnabled);
        writeJson('live_sync_enabled', sync.liveSyncEnabled);
      }
      if(typeof sync.autoChallengesEnabled === 'boolean'){ writeJson('change_v1_auto_challenges_enabled', sync.autoChallengesEnabled); writeJson('auto_challenges_enabled', sync.autoChallengesEnabled); }
      if(typeof sync.googleCalendarSyncEnabled === 'boolean'){
        writeRaw('change_v1_google_calendar_sync', sync.googleCalendarSyncEnabled ? 'true' : 'false');
        window.googleCalendarSyncEnabled = sync.googleCalendarSyncEnabled;
      }
      if(google.clientId) writeJson('change_v1_client_id', google.clientId);

      const stamp = settings.updatedAtLocal || settings.updatedAt?.toDate?.().toISOString?.() || nowIso();
      writeRaw(STAMP_KEY, stamp);
      writeRaw(LAST_SYNC_KEY, stamp);

      updateOpenControls(settings);
      refreshSettingsDependentViews();
    }finally{
      setTimeout(() => { isApplyingRemote = false; }, 0);
    }
  }

  function updateOpenControls(settings){
    try{
      const cal = settings.calendar || {}, dash = settings.dashboard || {}, sync = settings.sync || {};
      const setChecked = (id, val) => { const el = document.getElementById(id); if(el && typeof val === 'boolean') el.checked = val; };
      const setValue = (id, val) => { const el = document.getElementById(id); if(el && val !== undefined && val !== null) el.value = String(val); };
      setValue('us-holiday-state', cal.holidayState);
      setChecked('us-toggle-holidays', cal.showHolidays !== false);
      setChecked('us-toggle-dots', cal.showChallengeDots !== false);
      setChecked('us-toggle-kw', cal.showWeekNumbers === true);
      setChecked('us-friseur-on', dash.friseurEnabled);
      setValue('us-friseur-weeks', dash.friseurWeeks);
      setChecked('us-urlaub-on', dash.urlaubEnabled);
      setValue('us-urlaub-days', dash.urlaubTotalDays);
      setChecked('us-toggle-live', sync.liveSyncEnabled);
      setChecked('us-toggle-auto', sync.autoChallengesEnabled);
      setChecked('us-toggle-gsync', sync.googleCalendarSyncEnabled);
      if(typeof window.renderUrlaubHalfDayList === 'function') window.renderUrlaubHalfDayList();
    }catch(e){}
  }
  function refreshSettingsDependentViews(){
    try{ if(typeof renderCalendar === 'function') renderCalendar(); }catch(e){}
    try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
    try{ if(typeof window.buildDashCards === 'function') window.buildDashCards(); }catch(e){}
    try{ if(typeof renderChallenges === 'function') renderChallenges(); }catch(e){}
  }

  function markSettingsChanged(){
    if(isApplyingRemote) return;
    writeRaw(STAMP_KEY, nowIso());
    scheduleSettingsSave();
  }
  function scheduleSettingsSave(){
    if(isApplyingRemote) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { window.saveChangeSettings(true); }, SAVE_DELAY);
  }

  window.getChangeSettings = collectSettings;
  window.saveChangeSettings = async function(silent){
    if(isApplyingRemote || isSaving) return false;
    const database = await ensureSettingsDb();
    const me = settingsAccount();
    if(!database || !me.ready) return false;
    isSaving = true;
    try{
      const data = collectSettings();
      data.owner = me;
      data.updatedAtLocal = readRaw(STAMP_KEY) || nowIso();
      const payload = Object.assign({}, data, {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await database.collection(COLLECTION).doc(safeDocId(me.email || me.id)).set(payload, { merge:true });
      writeRaw(LAST_SYNC_KEY, data.updatedAtLocal);
      // Autosave läuft ruhig im Hintergrund; kein generischer Erfolgs-Toast.
      return true;
    }catch(e){
      console.warn('Settings Sync save:', e);
      if(!silent && typeof toast === 'function') toast('Einstellungen konnten nicht gespeichert werden','err');
      return false;
    }finally{
      isSaving = false;
    }
  };

  window.forceLoadChangeSettings = async function(silent){
    const database = await ensureSettingsDb();
    const me = settingsAccount();
    if(!database || !me.ready) return false;
    try{
      const snap = await database.collection(COLLECTION).doc(safeDocId(me.email || me.id)).get();
      if(!snap.exists){
        await window.saveChangeSettings(true);
        // Initialer Settings-Save läuft ruhig im Hintergrund.
        return true;
      }
      applySettings(Object.assign({id:snap.id}, snap.data() || {}));
      // Settings wurden geladen; kein zusätzlicher Toast im Push-&-Sync-Panel.
      return true;
    }catch(e){
      console.warn('Settings Sync load:', e);
      if(!silent && typeof toast === 'function') toast('Einstellungen konnten nicht geladen werden','err');
      return false;
    }
  };

  window.startChangeSettingsSync = async function(){
    const database = await ensureSettingsDb();
    const me = settingsAccount();
    if(!database || !me.ready) return false;
    const ref = database.collection(COLLECTION).doc(safeDocId(me.email || me.id));
    try{
      const snap = await ref.get();
      const localStamp = timeValue(readRaw(STAMP_KEY));
      if(snap.exists){
        const data = Object.assign({id:snap.id}, snap.data() || {});
        const remoteStamp = timeValue(data.updatedAtLocal) || timeValue(data.updatedAt);
        if(remoteStamp && (!localStamp || remoteStamp > localStamp)) applySettings(data);
        else await window.saveChangeSettings(true);
      }else{
        writeRaw(STAMP_KEY, readRaw(STAMP_KEY) || nowIso());
        await window.saveChangeSettings(true);
      }
      if(window[LISTENER_KEY]){ try{ window[LISTENER_KEY](); }catch(e){} window[LISTENER_KEY] = null; }
      window[LISTENER_KEY] = ref.onSnapshot(doc => {
        if(!doc.exists || isSaving) return;
        const data = Object.assign({id:doc.id}, doc.data() || {});
        const remoteStamp = timeValue(data.updatedAtLocal) || timeValue(data.updatedAt);
        const localStamp2 = timeValue(readRaw(STAMP_KEY));
        if(remoteStamp && remoteStamp > localStamp2) applySettings(data);
      }, err => console.warn('Settings Sync listener:', err));
      return true;
    }catch(e){
      console.warn('Settings Sync start:', e);
      return false;
    }
  };

  function wrapSettingFunction(name){
    const fn = window[name];
    if(typeof fn !== 'function' || fn.__settingsSyncWrapped) return;
    const wrapped = function(){
      const result = fn.apply(this, arguments);
      Promise.resolve(result).finally(markSettingsChanged);
      return result;
    };
    wrapped.__settingsSyncWrapped = true;
    window[name] = wrapped;
  }
  function installHooks(){
    [
      '_saveCalSettings','saveCalSettings','setHolidayState','saveCalendarSettings',
      'setPushNotificationsEnabled','enablePushNotifications','disablePushNotifications','setLiveSyncEnabled','setAutoChallengesEnabled',
      'setFriseurEnabled','setFriseurWeeks','setUrlaubEnabled','setUrlaubDays','addUrlaubHalfDay','removeUrlaubHalfDay'
    ].forEach(wrapSettingFunction);

    if(!window.__changeSettingsDomHook){
      window.__changeSettingsDomHook = true;
      document.addEventListener('change', function(e){
        const el = e.target;
        if(el && CONTROL_IDS.has(el.id)) setTimeout(markSettingsChanged, 80);
      }, true);
      document.addEventListener('click', function(e){
        const el = e.target;
        if(el && (el.dataset?.halfDate || el.closest?.('[data-half-list]'))) setTimeout(markSettingsChanged, 120);
      }, true);
    }

    const oldInit = window.initFirebaseLive;
    if(typeof oldInit === 'function' && !oldInit.__settingsSyncWrapped){
      const wrappedInit = async function(){
        const res = await oldInit.apply(this, arguments);
        setTimeout(() => window.startChangeSettingsSync(), 350);
        return res;
      };
      wrappedInit.__settingsSyncWrapped = true;
      window.initFirebaseLive = wrappedInit;
    }
  }

  function boot(){
    installHooks();
    [500, 1500, 3500, 7000].forEach(ms => setTimeout(() => { installHooks(); window.startChangeSettingsSync(); }, ms));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', boot);
})();

