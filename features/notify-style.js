/* Change App · Benachrichtigungen · Stil
 * Aus index.html extrahiert — Code unverändert
 * NICHT direkt bearbeiten — stattdessen in die passende core/ oder features/ Datei
 */

/* ── change-notification-style-de ── */
(function(){
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function storedPushEnabled(){try{return localStorage.getItem('push_enabled')==='true' || localStorage.getItem('change_push_enabled')==='true';}catch(e){return false;}}
  function setStoredPush(v){try{localStorage.setItem('push_enabled',v?'true':'false');localStorage.setItem('change_push_enabled',v?'true':'false');}catch(e){}}
  window.openNotifPanel=function(){
    const enabled=storedPushEnabled() && (typeof Notification==='undefined' || Notification.permission==='granted');
    const notes=(window.notifications||[]).slice(0,8);
    const html=
      '<div class="notif-clean-card">'+
        '<div class="notif-clean-top">'+
          '<div class="notif-clean-icon">🔔</div>'+
          '<div class="notif-clean-text">'+
            '<div class="notif-clean-title">Push-Benachrichtigungen</div>'+
          '</div>'+
          '<label class="switch"><input type="checkbox" id="bell-push-toggle" '+(enabled?'checked':'')+' onchange="togglePushFromBell(this.checked)"><span class="slider"></span></label>'+
        '</div>'+
        '<button class="notif-test-btn" onclick="sendTestBellNotification()">Test-Benachrichtigung senden</button>'+
      '</div>'+
      '<div class="notif-clean-section"><div class="notif-clean-section-title">Aktuelle Hinweise</div><div id="bell-notif-list">'+
      (notes.length?notes.map(n=>'<div class="nitem"><div class="nitem-icon" style="background:var(--acc-d)">🔔</div><div class="nitem-body"><div class="nitem-title">'+esc(n.title||'Benachrichtigung')+'</div><div class="nitem-sub">'+esc(n.body||n.text||'')+'</div></div></div>').join(''):'<div class="notif-empty">Keine neuen Benachrichtigungen</div>')+
      '</div></div>';
    if(typeof openPanel==='function') openPanel('Benachrichtigungen',html);
    const dot=document.getElementById('notif-dot'); if(dot)dot.style.display='none';
  };
  window.updateBellPushStatus=function(text){
    const t=document.getElementById('bell-push-toggle');
    if(t) t.checked=(text==='aktiv');
    const dot=document.getElementById('notif-dot'); if(dot)dot.style.display=(text==='aktiv')?'block':'none';
  };
  window.togglePushFromBell=async function(on){
    try{
      if(!on){setStoredPush(false); const t=document.getElementById('bell-push-toggle'); if(t)t.checked=false; if(typeof toast==='function')toast('Push-Benachrichtigungen deaktiviert','ok'); return;}
      if(typeof Notification==='undefined'){setStoredPush(false); const t=document.getElementById('bell-push-toggle'); if(t)t.checked=false; if(typeof toast==='function')toast('Push wird von diesem Browser nicht unterstützt','err'); return;}
      let perm=Notification.permission;
      if(perm!=='granted') perm=await Notification.requestPermission();
      if(perm==='granted'){
        setStoredPush(true); const t=document.getElementById('bell-push-toggle'); if(t)t.checked=true;
        try{ if(typeof initFirebaseMessaging==='function') initFirebaseMessaging(); }catch(e){}
        if(typeof toast==='function')toast('Push-Benachrichtigungen aktiviert','ok');
      }else{
        setStoredPush(false); const t=document.getElementById('bell-push-toggle'); if(t)t.checked=false; if(typeof toast==='function')toast('Push wurde im Browser nicht erlaubt','err');
      }
    }catch(e){console.warn('notif style patch',e); if(typeof toast==='function')toast('Push konnte nicht geändert werden','err');}
  };
  window.sendTestBellNotification=function(){
    try{
      if(!storedPushEnabled()){if(typeof toast==='function')toast('Push ist deaktiviert','err');return;}
      if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
        new Notification('Change',{body:'Test-Benachrichtigung funktioniert.'});
        if(typeof toast==='function')toast('Test gesendet','ok');
      }else if(typeof toast==='function')toast('Bitte Push zuerst aktivieren','err');
    }catch(e){if(typeof toast==='function')toast('Test-Benachrichtigung nicht möglich','err');}
  };
  const st=document.createElement('style');
  st.id='change-notification-style-de-css';
  st.textContent=`
    .notif-clean-card{margin:16px 14px 12px;padding:16px;border:1px solid #dbe7df;background:linear-gradient(135deg,#f7fbf8,#eef7f2);border-radius:14px;box-shadow:0 8px 24px rgba(22,80,55,.06)}
    .notif-clean-top{display:flex;align-items:center;gap:12px}.notif-clean-icon{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#e4f3ea;font-size:18px}.notif-clean-text{flex:1;min-width:0}.notif-clean-title{font-weight:850;color:var(--t1);font-size:15px;line-height:1.25}.notif-test-btn{width:100%;margin-top:14px;border:1px solid #d8e2dc;background:#fff;color:#1f3f31;border-radius:12px;height:38px;font-weight:750;cursor:pointer}.notif-test-btn:hover{background:#f7fbf8}.notif-clean-section{margin:12px 14px 0;padding:16px;border:1px solid #e0ded6;background:#faf9f5;border-radius:14px}.notif-clean-section-title{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6f746f;font-weight:850;margin-bottom:16px}.notif-empty{text-align:center;color:#9ba19d;padding:18px 8px 22px}.bell-push-box{display:none!important}`;
  document.head.appendChild(st);
})();

