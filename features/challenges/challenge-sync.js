/* Change App · Challenges · Sync & Punkte
 * Aus index.html extrahiert — Code unverändert
 * NICHT direkt bearbeiten — stattdessen in die passende core/ oder features/ Datei
 */

/* ── change-v4-last-five-completed ── */
(function(){
  'use strict';
  const PATCH='CHANGE_V4_LAST_FIVE_COMPLETED';
  const $=id=>document.getElementById(id);
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function norm(v){return String(v||'').trim().toLowerCase();}
  function badId(v){const x=norm(v); return !x||x==='me'||x==='du'||x==='ich'||x==='local-user';}
  function account(){const fu=(typeof firebase!=='undefined'&&firebase.auth&&firebase.auth().currentUser)?firebase.auth().currentUser:null; const info=window.userInfo||{}; const email=norm((fu&&fu.email)||info.email||info.mail||''); const uid=(fu&&fu.uid)||info.uid||''; const id=email||uid||'local-user'; const name=(fu&&fu.displayName)||info.name||email||'Du'; return {id,email,uid,name};}
  function completionPlayerId(c){const a=account(); let id=norm(c&&(c.playerId||c.userEmail||c.email||c.userId||c.uid)); if(badId(id)) id=a.id; return id;}
  function completionTimeValue(c){const v=c&&(c.createdAtLocal||c.completedAtLocal||c.completedAt||c.createdAt||c.date); if(!v)return 0; if(typeof v==='string'){const t=Date.parse(v.length<=10?v+'T12:00:00':v); return Number.isFinite(t)?t:0;} if(typeof v==='number')return v; if(v.seconds)return v.seconds*1000; if(typeof v.toDate==='function')return v.toDate().getTime(); return 0;}
  function titleFor(c){const ch=(window.challenges||[]).find(x=>String(x.id)===String(c.challengeId)); return (ch&&(ch.title||ch.name))||c.title||c.challengeTitle||c.challengeId||'Aufgabe';}
  function iconFor(c){const ch=(window.challenges||[]).find(x=>String(x.id)===String(c.challengeId)); return (ch&&ch.icon)||c.icon||'✅';}
  function fmt(c){const t=completionTimeValue(c); const d=t?new Date(t):(c.date?new Date(String(c.date).slice(0,10)+'T12:00:00'):null); if(!d||isNaN(d.getTime()))return esc(c.date||''); return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}
  function localRecent(playerId,limit){const id=norm(playerId), a=account(); return (window.challengeCompletions||[]).filter(c=>{let pid=completionPlayerId(c); if(badId(pid))pid=a.id; return pid===id;}).slice().sort((x,y)=>completionTimeValue(y)-completionTimeValue(x)).slice(0,limit||5);}
  function renderRecentHtml(items,loading){if(!items.length)return '<div class="dash-empty">Noch keine erledigten Aufgaben gefunden.</div>'+(loading?'<div class="dash-empty">Firebase wird geprüft …</div>':''); return items.map(c=>{const pts=parseInt(c.points,10)||0; return '<div class="last-completed-row"><div class="last-completed-icon">'+esc(iconFor(c))+'</div><div class="last-completed-main"><div class="last-completed-title">'+esc(titleFor(c))+'</div><div class="last-completed-meta">'+esc(fmt(c))+(pts?' · '+pts+' Punkte':'')+'</div></div></div>';}).join('')+(loading?'<div class="dash-empty">Firebase wird geprüft …</div>':'');}
  async function fetchRecentFromFirebase(playerId){const out=[],seen=new Set(); try{if(typeof firebase==='undefined'||!firebase.firestore)return []; const db=firebase.firestore(), id=norm(playerId); for(const field of ['playerId','userEmail','email']){try{const snap=await db.collection('change_completions').where(field,'==',id).limit(100).get(); snap.forEach(doc=>{const d={id:doc.id,...doc.data()}; if(!seen.has(d.id)){seen.add(d.id); out.push(d);}});}catch(e){console.warn(PATCH,'firebase query',field,e);}}}catch(e){console.warn(PATCH,'firebase recent',e);} return out.sort((x,y)=>completionTimeValue(y)-completionTimeValue(x)).slice(0,5);}
  window.openPlayerRecentPanel=function(playerId,playerName){const id=norm(playerId)||account().id, name=playerName||id, initial=localRecent(id,5); const html='<div class="last-completed-panel"><div class="section-label">Letzte 5 erledigte Aufgaben</div><div class="last-completed-person">'+esc(name)+'</div><div id="last-completed-list">'+renderRecentHtml(initial,true)+'</div></div>'; if(typeof openPanel==='function')openPanel('Erledigte Aufgaben',html); fetchRecentFromFirebase(id).then(remote=>{const list=$('last-completed-list'); if(!list)return; const merged=[],seen=new Set(); remote.concat(initial).sort((x,y)=>completionTimeValue(y)-completionTimeValue(x)).forEach(c=>{if(c&&c.id&&!seen.has(c.id)){seen.add(c.id); merged.push(c);}}); list.innerHTML=renderRecentHtml(merged.slice(0,5),false);});};
  function playerStats(){const a=account(), td=(typeof dateKey==='function'?dateKey(new Date()):new Date().toISOString().slice(0,10)), by={}; (window.challengePlayers||[]).forEach(p=>{const id=norm(p&&(p.email||p.id)); if(!id||id.includes('demo')||badId(id))return; by[id]={id,name:p.name||p.email||id,email:id,total:0,today:0,count:0,online:!!p.online};}); (window.challengeCompletions||[]).forEach(c=>{let id=completionPlayerId(c); if(badId(id))id=a.id; if(!id||id.includes('demo'))return; if(!by[id])by[id]={id,name:c.playerName||id,email:id,total:0,today:0,count:0,online:id===a.id}; const p=parseInt(c.points,10)||0; by[id].total+=p; by[id].count++; if(String(c.date||'').slice(0,10)===td)by[id].today+=p;}); if(!by[a.id])by[a.id]={id:a.id,name:a.name,email:a.email||a.id,total:0,today:0,count:0,online:true}; return Object.values(by).sort((x,y)=>y.total-x.total);}
  function enhanceLeaderboard(){const board=$('leaderboard-list'); if(!board)return; const a=account(); const players=playerStats(); board.innerHTML=players.map((p,i)=>{const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1; const isMe=p.id===a.id; const meTag=isMe?' · Du':''; const nudge=isMe?'':'<button class="nudge-btn" onclick="event.stopPropagation();window.sendNudge(\''+esc(p.id)+'\',\''+esc(p.name||p.email||p.id)+'\')" title="Anfeuern 💪"><span class="nudge-btn-icon">💪</span><span class="nudge-btn-label">Anfeuern</span></button>'; return '<div class="leader-row clickable" onclick="openPlayerRecentPanel(\''+esc(p.id)+'\',\''+esc(p.name||p.email||p.id)+'\')" title="Letzte erledigte Aufgaben anzeigen"><div class="leader-rank">'+medal+'</div><div style="flex:1"><div class="leader-name">'+esc(p.name||p.email)+meTag+(p.online?'<span class="live-dot"></span>':'<span class="live-dot off"></span>')+'</div><div class="leader-detail">Heute: '+p.today+' P · Gesamt: '+p.total+' P · '+p.count+' erledigt</div></div><div style="display:flex;align-items:center;gap:8px">'+nudge+'<div class="leader-score">'+p.total+'</div></div></div>';}).join('')||'<div class="dash-empty">Noch keine Kontest-Daten</div>';}
  const prevRender=window.renderChallenges; window.renderChallenges=function(){if(typeof prevRender==='function')prevRender.apply(this,arguments); try{enhanceLeaderboard();}catch(e){console.warn(PATCH,'enhance',e);}};
  if(!document.getElementById('change-v4-last-five-style')){const st=document.createElement('style');st.id='change-v4-last-five-style';st.textContent='.leader-row.clickable{cursor:pointer}.leader-row.clickable:hover{background:var(--s2)}.last-completed-person{font-size:18px;font-weight:800;color:var(--t1);margin:4px 0 14px}.last-completed-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--b1)}.last-completed-row:last-child{border-bottom:none}.last-completed-icon{width:36px;height:36px;border-radius:10px;background:var(--acc-d);display:flex;align-items:center;justify-content:center;flex-shrink:0}.last-completed-main{min-width:0}.last-completed-title{font-size:14px;font-weight:800;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.last-completed-meta{font-size:12px;color:var(--t3);margin-top:2px}';document.head.appendChild(st);}
  window.addEventListener('load',function(){setTimeout(function(){try{if((window.currentMainView||'')==='challenges')enhanceLeaderboard();}catch(e){}},900);});
})();

/* ── change-v5-remove-single-completed ── */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function norm(v){return String(v||'').trim().toLowerCase();}
  function account(){const fu=(typeof firebase!=='undefined'&&firebase.auth&&firebase.auth().currentUser)?firebase.auth().currentUser:null; const info=window.userInfo||{}; const email=norm((fu&&fu.email)||info.email||info.mail||''); const uid=(fu&&fu.uid)||info.uid||''; return {id:email||uid||'local-user',email,uid,name:(fu&&fu.displayName)||info.name||email||'Du'};}
  function badId(v){const x=norm(v);return !x||x==='me'||x==='du'||x==='ich'||x==='local-user';}
  function playerOf(c){const a=account();let id=norm(c&&(c.playerId||c.userEmail||c.email||c.userId||c.uid));if(badId(id))id=a.id;return id;}
  function timeVal(c){const v=c&&(c.createdAtLocal||c.completedAtLocal||c.completedAt||c.createdAt||c.date); if(!v)return 0; if(typeof v==='string'){const t=Date.parse(v.length<=10?v+'T12:00:00':v);return Number.isFinite(t)?t:0;} if(typeof v==='number')return v; if(v.seconds)return v.seconds*1000; if(typeof v.toDate==='function')return v.toDate().getTime(); return 0;}
  function titleFor(c){const ch=(window.challenges||[]).find(x=>String(x.id)===String(c.challengeId));return (ch&&(ch.title||ch.name))||c.title||c.challengeTitle||c.challengeId||'Aufgabe';}
  function iconFor(c){const ch=(window.challenges||[]).find(x=>String(x.id)===String(c.challengeId));return (ch&&ch.icon)||c.icon||'✅';}
  function fmt(c){const t=timeVal(c);const d=t?new Date(t):(c.date?new Date(String(c.date).slice(0,10)+'T12:00:00'):null); if(!d||isNaN(d.getTime()))return esc(c.date||''); return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}
  function localRecent(playerId,limit){const id=norm(playerId);return (window.challengeCompletions||[]).filter(c=>playerOf(c)===id).slice().sort((x,y)=>timeVal(y)-timeVal(x)).slice(0,limit||5);}
  async function fetchRemote(playerId){const out=[],seen=new Set(); try{if(typeof firebase==='undefined'||!firebase.firestore)return []; const db=firebase.firestore(), id=norm(playerId); for(const field of ['playerId','userEmail','email']){try{const snap=await db.collection('change_completions').where(field,'==',id).limit(100).get(); snap.forEach(doc=>{const d={id:doc.id,...doc.data()}; if(!seen.has(d.id)){seen.add(d.id);out.push(d);}});}catch(e){}}}catch(e){} return out.sort((x,y)=>timeVal(y)-timeVal(x)).slice(0,5);}
  function persist(){try{if(typeof lsSet==='function')lsSet('challenge_completions',window.challengeCompletions||[]);else localStorage.setItem('challenge_completions',JSON.stringify(window.challengeCompletions||[]));}catch(e){} try{if(typeof ls==='function')ls('challenge_completions',window.challengeCompletions||[]);}catch(e){} try{if(typeof persistChangeState==='function')persistChangeState();}catch(e){} try{if(typeof saveChallengeState==='function')saveChallengeState();}catch(e){}}
  function sameCompletion(a,b){if(!a||!b)return false; if(a.id&&b.id&&String(a.id)===String(b.id))return true; return String(a.challengeId||'')===String(b.challengeId||'') && String(a.date||'').slice(0,10)===String(b.date||'').slice(0,10) && playerOf(a)===playerOf(b);}
  function rowsHtml(items,own,loading){if(!items.length)return '<div class="dash-empty">Noch keine erledigten Aufgaben gefunden.</div>'+(loading?'<div class="dash-empty">Firebase wird geprüft …</div>':''); return items.map(c=>{const pts=parseInt(c.points,10)||0; const payload=encodeURIComponent(JSON.stringify({id:c.id||'',challengeId:c.challengeId||'',date:String(c.date||'').slice(0,10),playerId:playerOf(c)})); const remove=own?'<button class="btn btn-danger btn-sm last-remove-btn" onclick="event.stopPropagation();removeSingleCompletedChallenge(\''+payload+'\')">Entnehmen</button>':''; return '<div class="last-completed-row"><div class="last-completed-icon">'+esc(iconFor(c))+'</div><div class="last-completed-main"><div class="last-completed-title">'+esc(titleFor(c))+'</div><div class="last-completed-meta">'+esc(fmt(c))+(pts?' · '+pts+' Punkte':'')+'</div></div>'+remove+'</div>';}).join('')+(loading?'<div class="dash-empty">Firebase wird geprüft …</div>':'');}
  function refreshAll(){try{if(typeof renderChallenges==='function')renderChallenges();}catch(e){} try{if(typeof buildDashboard==='function')buildDashboard();}catch(e){} try{if(typeof renderCalendar==='function')renderCalendar();}catch(e){}}
  window.removeSingleCompletedChallenge=async function(encoded){let target={}; try{target=JSON.parse(decodeURIComponent(encoded||''));}catch(e){target={id:encoded||''};} const a=account(); target.playerId=norm(target.playerId)||a.id; window.challengeCompletions=(window.challengeCompletions||[]).filter(c=>!sameCompletion(c,target)); persist(); try{if(typeof firebase!=='undefined'&&firebase.firestore){const db=firebase.firestore(); if(target.id)await db.collection('change_completions').doc(String(target.id)).delete().catch(()=>{}); for(const f of ['playerId','userEmail','email']){try{let q=db.collection('change_completions').where(f,'==',target.playerId); if(target.challengeId)q=q.where('challengeId','==',target.challengeId); if(target.date)q=q.where('date','==',target.date); const snap=await q.limit(20).get(); snap.forEach(d=>d.ref.delete().catch(()=>{}));}catch(e){}}}}catch(e){} refreshAll(); try{window.openPlayerRecentPanel(target.playerId,target.playerId===a.id?a.name:target.playerId);}catch(e){} if(typeof toast==='function')toast('Aufgabe wieder entnommen','ok');};
  window.openPlayerRecentPanel=function(playerId,playerName){const a=account(); const id=norm(playerId)||a.id; const own=id===a.id||id===a.email||id===norm(a.uid); const initial=localRecent(id,5); const html='<div class="last-completed-panel"><div class="section-label">Letzte 5 erledigte Aufgaben</div><div class="last-completed-person">'+esc(playerName||id)+'</div><div id="last-completed-list">'+rowsHtml(initial,own,true)+'</div></div>'; if(typeof openPanel==='function')openPanel('Erledigte Aufgaben',html); fetchRemote(id).then(remote=>{const list=$('last-completed-list'); if(!list)return; const merged=[],seen=new Set(); remote.concat(initial).sort((x,y)=>timeVal(y)-timeVal(x)).forEach(c=>{const key=c.id||[c.challengeId,c.date,playerOf(c)].join('|'); if(c&&!seen.has(key)){seen.add(key);merged.push(c);}}); list.innerHTML=rowsHtml(merged.slice(0,5),own,false);});};
  if(!document.getElementById('change-v5-remove-style')){const st=document.createElement('style');st.id='change-v5-remove-style';st.textContent='.last-completed-main{flex:1}.last-remove-btn{margin-left:auto;white-space:nowrap}.last-completed-row{gap:10px}';document.head.appendChild(st);}
})();

/* ── change-global-challenge-sync ── */
(function(){
  'use strict';

  const COMPLETIONS = 'change_completions';
  const PLAYERS = 'change_players';
  let db = null;
  let unsubscribe = null;
  let initStarted = false;

  const norm = v => String(v || '').trim().toLowerCase();
  const pad2 = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); };
  const safeDocId = id => norm(id || 'unknown').replace(/[^a-z0-9._-]/g, '_');

  function readLs(key, fallback){ try{ const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }catch(e){ return fallback; } }
  function writeCompletions(){
    const arr = Array.isArray(window.challengeCompletions) ? window.challengeCompletions : [];
    try{ if(typeof ls === 'function') ls('challenge_completions', arr); else localStorage.setItem('challenge_completions', JSON.stringify(arr)); }catch(e){}
    try{ localStorage.setItem('challengeCompletions', JSON.stringify(arr)); }catch(e){}
  }
  function refreshViews(){
    try{ if(typeof renderChallenges === 'function') renderChallenges(); }catch(e){}
    try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
    try{ if(window.currentMainView === 'calendar' && typeof renderCalendar === 'function') renderCalendar(); }catch(e){}
    try{ if(typeof renderWeekBar === 'function') renderWeekBar(); }catch(e){}
  }
  function account(){
    let fu = null; try{ fu = window.firebase && firebase.auth && firebase.auth().currentUser; }catch(e){}
    const info = Object.assign({}, readLs('user_info', {}) || {}, window.userInfo || {});
    const email = norm((fu && fu.email) || info.email || info.mail || localStorage.getItem('change_v1_user_email') || localStorage.getItem('user_email') || '');
    const uid = (fu && fu.uid) || info.uid || info.id || localStorage.getItem('change_v1_user_uid') || '';
    const id = email || uid || 'local-authenticated-user';
    const name = String((fu && fu.displayName) || info.name || info.displayName || email || 'Mitspieler').trim();
    const picture = (fu && fu.photoURL) || info.picture || info.photoURL || '';
    return { id: norm(id), email, uid, name, picture };
  }
  function playerOf(c){ return norm(c && (c.playerId || c.userEmail || c.email || c.userId)); }
  function toLocalCompletion(id, data){
    const who = norm(data.playerId || data.userEmail || data.email || data.userId);
    return {
      id: String(id || data.id || ''),
      challengeId: String(data.challengeId || ''),
      playerId: who,
      userEmail: norm(data.userEmail || data.email || who),
      email: norm(data.email || data.userEmail || who),
      userId: norm(data.userId || who),
      playerName: data.playerName || data.userName || data.name || data.email || 'Mitspieler',
      date: String(data.date || data.completedDate || today()).slice(0, 10),
      points: parseInt(data.points, 10) || 0,
      createdAt: data.createdAtLocal || data.createdAt?.toDate?.().toISOString?.() || data.createdAt || new Date().toISOString(),
      source: 'firestore'
    };
  }
  function upsertCompletion(row){
    if(!row || !row.id || !row.challengeId || !row.date) return;
    window.challengeCompletions = Array.isArray(window.challengeCompletions) ? window.challengeCompletions : [];
    const i = window.challengeCompletions.findIndex(c => String(c.id) === String(row.id));
    if(i >= 0) window.challengeCompletions[i] = Object.assign({}, window.challengeCompletions[i], row);
    else window.challengeCompletions.push(row);
  }
  function removeCompletion(id){ window.challengeCompletions = (window.challengeCompletions || []).filter(c => String(c.id) !== String(id)); }

  async function ensureFirebase(){
    if(db) return db;
    if(!window.firebase || !window.FIREBASE_CONFIG) return null;
    const cfg = window.FIREBASE_CONFIG || {};
    if(!cfg.apiKey || String(cfg.apiKey).includes('HIER_') || !cfg.projectId) return null;
    try{ if(!firebase.apps.length) firebase.initializeApp(cfg); if(window.ensureChangeFirebaseAuth){ const authOk = await window.ensureChangeFirebaseAuth({silent:true}); if(!authOk) return null; } db = firebase.firestore(); return db; }
    catch(e){ console.warn('Challenge Sync Firebase:', e); return null; }
  }
  async function registerPlayer(){
    const database = await ensureFirebase();
    const me = account();
    if(!database || !me.id) return;
    try{
      await database.collection(PLAYERS).doc(safeDocId(me.id)).set({
        id: me.id, email: me.email || me.id, name: me.name || me.email || 'Mitspieler', picture: me.picture || '', online: true, app: 'Change', lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }catch(e){ console.warn('Challenge Player Sync:', e); }
  }

  window.publishCompletionToFirestore = async function(completion){
    const database = await ensureFirebase();
    const me = account();
    if(!database || !completion || !completion.id || !me.id) return false;
    const row = Object.assign({}, completion, {
      playerId: me.id,
      userEmail: me.email || me.id,
      email: me.email || me.id,
      userId: me.uid || me.id,
      playerName: me.name || me.email || 'Mitspieler',
      date: String(completion.date || today()).slice(0, 10),
      points: parseInt(completion.points, 10) || 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAtLocal: completion.createdAt || new Date().toISOString()
    });
    try{
      await registerPlayer();
      await database.collection(COMPLETIONS).doc(String(row.id)).set(row, { merge: true });
      upsertCompletion(toLocalCompletion(row.id, row));
      writeCompletions();
      refreshViews();
      return true;
    }catch(e){ console.warn('Completion Firestore Sync:', e); return false; }
  };

  window.startGlobalChallengeSync = async function(){
    if(readLs('live_sync_enabled', false) !== true) return false;
    const database = await ensureFirebase();
    if(!database || unsubscribe) return !!database;
    await registerPlayer();
    // Nur letzte 60 Tage – reduziert Reads massiv (statt alle 1000 Docs)
    const since60 = new Date(); since60.setDate(since60.getDate()-60);
    const since60Str = since60.toISOString().slice(0,10);
    unsubscribe = database.collection(COMPLETIONS).where('date','>=',since60Str).limit(200).onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if(change.type === 'removed') removeCompletion(change.doc.id);
        else upsertCompletion(toLocalCompletion(change.doc.id, change.doc.data() || {}));
      });
      writeCompletions();
      refreshViews();
    }, err => console.warn('Global Challenge Sync Listener:', err));
    return true;
  };
  window.stopGlobalChallengeSync = function(){ try{ if(unsubscribe) unsubscribe(); }catch(e){} unsubscribe = null; };

  const oldSetLive = window.setLiveSyncEnabled;
  window.setLiveSyncEnabled = async function(enabled){
    try{ localStorage.setItem('live_sync_enabled', JSON.stringify(!!enabled)); }catch(e){}
    if(typeof oldSetLive === 'function'){ try{ await oldSetLive.apply(this, arguments); }catch(e){ console.warn('Live Sync Toggle:', e); } }
    if(enabled) if(readLs('live_sync_enabled', false)===true) window.startGlobalChallengeSync(); else window.stopGlobalChallengeSync();
  };

  function boot(){
    if(initStarted) return;
    initStarted = true;
    window.challengeCompletions = Array.isArray(window.challengeCompletions) ? window.challengeCompletions : readLs('challenge_completions', []);
    if(readLs('live_sync_enabled', false)===true) window.startGlobalChallengeSync();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 600));
  else setTimeout(boot, 600);
  window.addEventListener('load', () => setTimeout(boot, 1200));
})();

/* ── change-account-safe-challenge-sync ── */
/* ==== Account-sicherer Challenge Sync Fix ====
   Verhindert falsche Spieler wie "Mitspieler" / local-user.
   Challenge-Punkte werden nur mit echtem Google-Konto gespeichert.
==== */
(function(){
  'use strict';

  const COMPLETIONS = 'change_completions';
  const PLAYERS = 'change_players';
  const BAD_IDS = new Set(['', 'du', 'ich', 'me', 'local-user', 'google-user', 'local-authenticated-user', 'mitspieler', 'unknown']);
  const norm = v => String(v || '').trim().toLowerCase();
  const esc = s => String(s??'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); // [FIX: inkl. backtick]
  const pad2 = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); };
  const safeDocId = id => norm(id || 'unknown').replace(/[^a-z0-9._-]/g, '_');
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  const isBadId = id => BAD_IDS.has(norm(id)) || !norm(id) || norm(id).startsWith('local-');

  function readJson(key, fallback){ try{ const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }catch(e){ return fallback; } }
  function writeJson(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} }
  function getGlobalUserInfo(){
    try{ if(typeof userInfo !== 'undefined' && userInfo && typeof userInfo === 'object') return userInfo; }catch(e){}
    return {};
  }
  function setGlobalUserInfo(info){
    if(!info || !info.email) return;
    try{ window.userInfo = Object.assign({}, window.userInfo || {}, info); }catch(e){}
    try{ if(typeof userInfo !== 'undefined') userInfo = Object.assign({}, userInfo || {}, info); }catch(e){}
    writeJson('change_v1_user_info', info);
    writeJson('user_info', info);
    try{ localStorage.setItem('change_v1_user_email', info.email); }catch(e){}
    try{ localStorage.setItem('user_email', info.email); }catch(e){}
  }
  function account(){
    let fu = null;
    try{ fu = window.firebase && firebase.auth && firebase.auth().currentUser; }catch(e){}
    const candidates = [
      fu || {},
      getGlobalUserInfo(),
      window.userInfo || {},
      readJson('change_v1_user_info', {}) || {},
      readJson('user_info', {}) || {},
      readJson('google_user', {}) || {},
      readJson('current_user', {}) || {}
    ];
    let email = '';
    for(const c of candidates){
      const e = norm(c && (c.email || c.mail));
      if(isEmail(e)){ email = e; break; }
    }
    const uid = String((fu && fu.uid) || candidates.find(c => c && (c.uid || c.id))?.uid || '').trim();
    let name = '';
    for(const c of candidates){
      const n = String(c && (c.displayName || c.name || '')).trim();
      if(n && !/^mitspieler$/i.test(n)){ name = n; break; }
    }
    if(!name && email) name = email.split('@')[0];
    const picture = (fu && fu.photoURL) || candidates.find(c => c && (c.picture || c.photoURL))?.picture || candidates.find(c => c && (c.picture || c.photoURL))?.photoURL || '';
    if(email) setGlobalUserInfo({ email, name: name || email, picture, uid });
    return { id: email || uid || '', email, uid, name: name || email || '', picture, ready: !!email };
  }
  function completionOwner(c){ return norm(c && (c.playerId || c.userEmail || c.email || c.userId)); }
  function validCompletion(c){ return c && c.id && c.challengeId && c.date && !isBadId(completionOwner(c)) && isEmail(c.userEmail || c.email || c.playerId); }
  function sanitizeLocalCompletions(){
    // Wichtig: beim Reload ist window.challengeCompletions oft zuerst []
    // obwohl localStorage/Firestore bereits Punkte enthält. Deshalb Quellen MERGEN,
    // niemals eine leere Runtime-Liste über gespeicherte Daten schreiben.
    const sources = [
      Array.isArray(window.challengeCompletions) ? window.challengeCompletions : [],
      Array.isArray(readJson('challenge_completions', [])) ? readJson('challenge_completions', []) : [],
      Array.isArray(readJson('challengeCompletions', [])) ? readJson('challengeCompletions', []) : []
    ];
    try{ if(typeof ls === 'function'){
      const a = ls('challenge_completions'); if(Array.isArray(a)) sources.push(a);
      const b = ls('challengeCompletions'); if(Array.isArray(b)) sources.push(b);
    }}catch(e){}
    const clean = [];
    const seen = new Set();
    sources.flat().forEach(c => {
      if(!validCompletion(c)) return;
      const id = String(c.id);
      if(seen.has(id)) return;
      seen.add(id);
      const email = norm(c.userEmail || c.email || c.playerId);
      clean.push(Object.assign({}, c, {
        playerId: email,
        userEmail: email,
        email,
        playerName: c.playerName && !/^mitspieler$/i.test(c.playerName) ? c.playerName : email.split('@')[0]
      }));
    });
    window.challengeCompletions = clean;
    try{ if(typeof challengeCompletions !== 'undefined') challengeCompletions = clean; }catch(e){}
    try{ if(typeof ls === 'function') ls('challenge_completions', clean); else writeJson('challenge_completions', clean); }catch(e){ writeJson('challenge_completions', clean); }
    writeJson('challengeCompletions', clean);
    return clean;
  }
  function refresh(){
    try{ if(typeof renderChallenges === 'function') renderChallenges(); }catch(e){}
    try{ if(typeof buildDashboard === 'function') buildDashboard(); }catch(e){}
    try{ if(window.currentMainView === 'calendar' && typeof renderCalendar === 'function') renderCalendar(); }catch(e){}
    try{ if(typeof renderWeekBar === 'function') renderWeekBar(); }catch(e){}
  }
  function getChallenges(){
    if(Array.isArray(window.challenges)) return window.challenges;
    try{ return readJson('challenges', []) || []; }catch(e){ return []; }
  }
  function findChallenge(id){ return getChallenges().find(c => String(c.id) === String(id)); }
  function isDoneToday(id, me){
    const td = today();
    return (window.challengeCompletions || []).some(c => String(c.challengeId) === String(id) && String(c.date || '').slice(0,10) === td && norm(c.playerId || c.userEmail || c.email) === me.id);
  }
  function saveLocal(rec){
    sanitizeLocalCompletions();
    if((window.challengeCompletions || []).some(c => String(c.id) === String(rec.id))) return;
    window.challengeCompletions.push(rec);
    try{ if(typeof challengeCompletions !== 'undefined') challengeCompletions = window.challengeCompletions; }catch(e){}
    try{ if(typeof ls === 'function') ls('challenge_completions', window.challengeCompletions); else writeJson('challenge_completions', window.challengeCompletions); }catch(e){ writeJson('challenge_completions', window.challengeCompletions); }
    writeJson('challengeCompletions', window.challengeCompletions);
  }
  async function ensureDb(){
    try{
      if(!window.firebase || !window.FIREBASE_CONFIG || !firebase.firestore) return null;
      if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      if(window.ensureChangeFirebaseAuth){
        const authOk = await window.ensureChangeFirebaseAuth({ silent:true });
        if(!authOk) return null;
      }
      return firebase.firestore();
    }catch(e){ console.warn('Challenge Firebase init:', e); return null; }
  }
  async function cleanupBadRemote(){
    const db = await ensureDb();
    if(!db) return;
    try{
      const bad = ['local-user','local-authenticated-user','google-user','mitspieler','unknown',''];
      for(const id of bad){
        const snap = await db.collection(COMPLETIONS).where('playerId','==',id).limit(50).get();
        snap.forEach(doc => doc.ref.delete().catch(()=>{}));
      }
      const ps = await db.collection(PLAYERS).limit(200).get();
      ps.forEach(doc => {
        const d = doc.data() || {}, id = norm(d.id || doc.id), email = norm(d.email || '');
        if(isBadId(id) || !isEmail(email)) doc.ref.delete().catch(()=>{});
      });
    }catch(e){ console.warn('Challenge cleanup:', e); }
  }
  async function registerPlayer(me){
    const db = await ensureDb();
    if(!db || !me.ready) return false;
    try{
      await db.collection(PLAYERS).doc(safeDocId(me.id)).set({
        id: me.id,
        email: me.email,
        name: me.name || me.email.split('@')[0],
        picture: me.picture || '',
        online: true,
        app: 'Change',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge:true });
      return true;
    }catch(e){ console.warn('Player sync:', e); return false; }
  }
  function toLocal(id, data){
    const owner = norm(data.playerId || data.userEmail || data.email || data.userId);
    if(isBadId(owner) || !isEmail(data.userEmail || data.email || owner)) return null;
    const email = norm(data.userEmail || data.email || owner);
    return {
      id: String(id || data.id || ''),
      challengeId: String(data.challengeId || ''),
      playerId: email,
      userEmail: email,
      email,
      userId: String(data.userId || email),
      playerName: data.playerName && !/^mitspieler$/i.test(data.playerName) ? data.playerName : email.split('@')[0],
      date: String(data.date || today()).slice(0,10),
      points: parseInt(data.points,10) || 0,
      createdAt: data.createdAtLocal || data.createdAt?.toDate?.().toISOString?.() || data.createdAt || new Date().toISOString(),
      source: 'firestore'
    };
  }
  function upsert(row){
    if(!validCompletion(row)) return;
    window.challengeCompletions = Array.isArray(window.challengeCompletions) ? window.challengeCompletions : [];
    const i = window.challengeCompletions.findIndex(c => String(c.id) === String(row.id));
    if(i >= 0) window.challengeCompletions[i] = Object.assign({}, window.challengeCompletions[i], row);
    else window.challengeCompletions.push(row);
  }

  window.getCurrentChallengeAccount = account;

  window.publishCompletionToFirestore = async function(completion){
    const me = account();
    if(!me.ready){
      try{ if(typeof toast === 'function') toast('Bitte erst mit Google anmelden – Punkte werden sonst keinem Konto zugeordnet.','err'); }catch(e){}
      return false;
    }
    const db = await ensureDb();
    if(!db || !completion || !completion.id) return false;
    const rec = Object.assign({}, completion, {
      playerId: me.id,
      userEmail: me.email,
      email: me.email,
      userId: me.uid || me.email,
      playerName: me.name || me.email.split('@')[0],
      date: String(completion.date || today()).slice(0,10),
      points: parseInt(completion.points,10) || 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAtLocal: completion.createdAt || new Date().toISOString()
    });
    try{
      await registerPlayer(me);
      await db.collection(COMPLETIONS).doc(String(rec.id)).set(rec, { merge:true });
      const local = toLocal(rec.id, rec);
      if(local){ upsert(local); sanitizeLocalCompletions(); refresh(); }
      return true;
    }catch(e){ console.warn('Completion sync:', e); return false; }
  };

  window.completeChallenge = async function(id){
    const me = account();
    if(!me.ready){
      try{ if(typeof toast === 'function') toast('Bitte zuerst mit Google anmelden. Dann werden Punkte korrekt gespeichert.','err'); }catch(e){}
      return;
    }
    const ch = findChallenge(id);
    if(!ch){ try{ if(typeof toast === 'function') toast('Challenge nicht gefunden','err'); }catch(e){} return; }
    sanitizeLocalCompletions();
    if(isDoneToday(id, me)){ try{ if(typeof toast === 'function') toast('Bereits erledigt',''); }catch(e){} return; }
    const rec = {
      id: 'cc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7),
      challengeId: String(id),
      playerId: me.id,
      userEmail: me.email,
      email: me.email,
      userId: me.uid || me.email,
      playerName: me.name || me.email.split('@')[0],
      date: today(),
      points: parseInt(ch.points,10) || 0,
      createdAt: new Date().toISOString()
    };
    saveLocal(rec);
    refresh();
    const synced = await window.publishCompletionToFirestore(rec);
    if(!synced){
      try{ if(typeof toast === 'function') toast('Lokal gespeichert, aber nicht mit anderen Geräten synchronisiert. Firestore-Regeln prüfen.','err'); }catch(e){}
      return;
    }
    try{ if(typeof toast === 'function') toast('+' + rec.points + ' Punkte ✓ synchronisiert','ok'); }catch(e){}
  };

  window.undoChallenge = async function(id){
    const me = account();
    if(!me.ready){ try{ if(typeof toast === 'function') toast('Bitte zuerst mit Google anmelden.','err'); }catch(e){} return; }
    const td = today();
    const removed = [];
    sanitizeLocalCompletions();
    window.challengeCompletions = (window.challengeCompletions || []).filter(c => {
      const hit = String(c.challengeId) === String(id) && String(c.date || '').slice(0,10) === td && norm(c.playerId || c.userEmail || c.email) === me.id;
      if(hit) removed.push(c);
      return !hit;
    });
    try{ if(typeof challengeCompletions !== 'undefined') challengeCompletions = window.challengeCompletions; }catch(e){}
    try{ if(typeof ls === 'function') ls('challenge_completions', window.challengeCompletions); else writeJson('challenge_completions', window.challengeCompletions); }catch(e){ writeJson('challenge_completions', window.challengeCompletions); }
    writeJson('challengeCompletions', window.challengeCompletions);
    const db = await ensureDb();
    if(db){ removed.forEach(c => c.id && db.collection(COMPLETIONS).doc(String(c.id)).delete().catch(()=>{})); }
    refresh();
    try{ if(typeof toast === 'function') toast(removed.length ? 'Challenge zurückgesetzt' : 'Nichts zurückzusetzen',''); }catch(e){}
  };

  window.resetTodayChallenges = async function(){
    const me = account();
    if(!me.ready){ try{ if(typeof toast === 'function') toast('Bitte zuerst mit Google anmelden.','err'); }catch(e){} return; }
    const td = today();
    const removed = [];
    sanitizeLocalCompletions();
    window.challengeCompletions = (window.challengeCompletions || []).filter(c => {
      const hit = String(c.date || '').slice(0,10) === td && norm(c.playerId || c.userEmail || c.email) === me.id;
      if(hit) removed.push(c);
      return !hit;
    });
    try{ if(typeof challengeCompletions !== 'undefined') challengeCompletions = window.challengeCompletions; }catch(e){}
    try{ if(typeof ls === 'function') ls('challenge_completions', window.challengeCompletions); else writeJson('challenge_completions', window.challengeCompletions); }catch(e){ writeJson('challenge_completions', window.challengeCompletions); }
    writeJson('challengeCompletions', window.challengeCompletions);
    const db = await ensureDb();
    if(db){ removed.forEach(c => c.id && db.collection(COMPLETIONS).doc(String(c.id)).delete().catch(()=>{})); }
    refresh();
    try{ if(typeof toast === 'function') toast('Heute zurückgesetzt',''); }catch(e){}
  };

  async function loadAllRemoteCompletions(){
    const db = await ensureDb();
    if(!db) return false;
    try{
      const snap = await db.collection(COMPLETIONS).orderBy('createdAt','desc').limit(1000).get();
      snap.forEach(doc => {
        const row = toLocal(doc.id, doc.data() || {});
        if(row) upsert(row);
      });
      sanitizeLocalCompletions();
      refresh();
      return true;
    }catch(e){
      console.warn('Challenge direct load:', e);
      try{ if(typeof toast === 'function') toast('Punkte konnten nicht aus Firebase geladen werden. Firestore-Regeln prüfen.','err'); }catch(_e){}
      return false;
    }
  }

  window.startGlobalChallengeSync = async function(){
    const db = await ensureDb();
    const me = account();
    if(db && me.ready) await registerPlayer(me);
    sanitizeLocalCompletions();
    if(!db) return false;
    await loadAllRemoteCompletions();
    if(window.__changeChallengeUnsub){ try{ window.__changeChallengeUnsub(); }catch(e){} }
    // Doppelter Listener entfernt – change-account-safe listener übernimmt;
    return true;
  };

  window.forceLoadChallengePoints = loadAllRemoteCompletions;

  function boot(){
    const run = () => {
      account();
      sanitizeLocalCompletions();
      cleanupBadRemote();
      if(readLs('live_sync_enabled', false)===true) if(readLs('live_sync_enabled', false)===true) window.startGlobalChallengeSync();
      refresh();
    };
    [250, 900, 1800, 3500, 6500].forEach(ms => setTimeout(run, ms));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', boot);
})();

/* ── change-final-two-way-challenge-sync ── */
/* CHANGE · FINAL TWO-WAY CHALLENGE SYNC
   Ziel:
   - Desktop-lokale gültige Punkte beim Start nach Firestore spiegeln
   - Handy lädt globale Punkte direkt aus Firestore
   - keine Termine/Dashboard-Daten global speichern
*/
(function(){
  'use strict';

  const COMPLETIONS='change_completions';
  const PLAYERS='change_players';
  const BAD=new Set(['','du','ich','me','local-user','google-user','local-authenticated-user','mitspieler','unknown']);
  const norm=v=>String(v||'').trim().toLowerCase();
  const isEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
  const pad=n=>String(n).padStart(2,'0');
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  const safe=id=>norm(id||'unknown').replace(/[^a-z0-9._-]/g,'_');
  const bad=id=>BAD.has(norm(id))||norm(id).startsWith('local-');
  let db=null, unsub=null, syncing=false;

  function toastMsg(m,t){try{if(typeof toast==='function')toast(m,t||'')}catch(e){}}
  function read(key,fallback){try{const raw=localStorage.getItem(key);return raw==null?fallback:JSON.parse(raw)}catch(e){return fallback}}
  function write(key,val){try{localStorage.setItem(key,JSON.stringify(val))}catch(e){}}
  function appRead(k,fallback){try{if(typeof ls==='function'){const v=ls(k);return v==null?fallback:v}}catch(e){} return read('change_v1_'+k,fallback)}
  function appWrite(k,val){try{if(typeof ls==='function')ls(k,val)}catch(e){} write('change_v1_'+k,val)}

  function getUserInfo(){
    const out={};
    try{Object.assign(out, read('change_v1_user_info',{})||{})}catch(e){}
    try{Object.assign(out, read('user_info',{})||{})}catch(e){}
    try{Object.assign(out, window.userInfo||{})}catch(e){}
    try{if(typeof userInfo!=='undefined')Object.assign(out,userInfo||{})}catch(e){}
    return out;
  }
  function setUserInfo(info){
    if(!info||!isEmail(info.email))return;
    try{window.userInfo=Object.assign({},window.userInfo||{},info)}catch(e){}
    try{if(typeof userInfo!=='undefined')userInfo=Object.assign({},userInfo||{},info)}catch(e){}
    write('change_v1_user_info',info); write('user_info',info);
    try{localStorage.setItem('change_v1_user_email',norm(info.email));localStorage.setItem('user_email',norm(info.email));}catch(e){}
  }
  function account(){
    let fu=null;try{fu=window.firebase&&firebase.auth&&firebase.auth().currentUser}catch(e){}
    const info=getUserInfo();
    const email=norm((fu&&fu.email)||info.email||info.mail||localStorage.getItem('change_v1_user_email')||localStorage.getItem('user_email')||'');
    const uid=(fu&&fu.uid)||info.uid||info.id||localStorage.getItem('change_v1_user_uid')||'';
    const name=String((fu&&fu.displayName)||info.name||info.displayName||email.split('@')[0]||'').trim();
    const picture=(fu&&fu.photoURL)||info.picture||info.photoURL||'';
    if(isEmail(email))setUserInfo({email,name:name||email.split('@')[0],picture,uid});
    return {ready:isEmail(email),id:email,email,uid,name:name||email.split('@')[0],picture};
  }

  async function ensureDb(){
    if(db)return db;
    try{
      if(!window.firebase||!window.FIREBASE_CONFIG||!firebase.firestore)return null;
      if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);
      if(window.ensureChangeFirebaseAuth){
        const authOk=await window.ensureChangeFirebaseAuth({silent:true});
        if(!authOk)return null;
      }
      db=firebase.firestore();
      return db;
    }catch(e){console.warn('Final Challenge Sync Firebase init:',e);toastMsg('Firebase konnte nicht gestartet werden.','err');return null;}
  }

  function allLocalCompletions(){
    const out=[], seen=new Set();
    const sources=[
      Array.isArray(window.challengeCompletions)?window.challengeCompletions:[],
      (function(){try{return typeof challengeCompletions!=='undefined'&&Array.isArray(challengeCompletions)?challengeCompletions:[]}catch(e){return[]}})(),
      appRead('challenge_completions',[]),
      read('challenge_completions',[]),
      read('challengeCompletions',[])
    ];
    sources.flat().forEach(c=>{
      if(!c||typeof c!=='object')return;
      const key=String(c.id||'')+'|'+String(c.challengeId||'')+'|'+String(c.date||'')+'|'+String(c.playerId||c.userEmail||c.email||'');
      if(seen.has(key))return;seen.add(key);out.push(c);
    });
    return out;
  }
  function normalizeCompletion(c, owner){
    if(!c||!c.challengeId)return null;
    const me=owner||account();
    let email=norm(c.userEmail||c.email||c.playerEmail||c.playerId||'');
    // Alte lokale Einträge ohne echte E-Mail gehören dem aktuell eingeloggten Nutzer.
    if(!isEmail(email)||bad(email)) email=me.ready?me.email:'';
    if(!isEmail(email))return null;
    const id=String(c.id||('cc_'+String(c.challengeId)+'_'+String(c.date||today())+'_'+safe(email))).replace(/[^a-zA-Z0-9._-]/g,'_');
    return {
      id,
      challengeId:String(c.challengeId),
      playerId:email,
      userEmail:email,
      email,
      userId:String(c.userId||c.uid||(email)),
      playerName:String(c.playerName||c.userName||c.name||(email.split('@')[0])),
      date:String(c.date||today()).slice(0,10),
      points:parseInt(c.points,10)||0,
      createdAtLocal:String(c.createdAtLocal||c.createdAt||new Date().toISOString()),
      syncedFrom:'change-final-two-way'
    };
  }
  function mergeLocal(row){
    if(!row||!row.id||!row.challengeId||!isEmail(row.email))return;
    window.challengeCompletions=Array.isArray(window.challengeCompletions)?window.challengeCompletions:[];
    const i=window.challengeCompletions.findIndex(c=>String(c.id)===String(row.id));
    if(i>=0)window.challengeCompletions[i]=Object.assign({},window.challengeCompletions[i],row);
    else window.challengeCompletions.push(row);
  }
  function persistCompletions(){
    const arr=(window.challengeCompletions||[]).map(c=>normalizeCompletion(c,account())).filter(Boolean);
    window.challengeCompletions=arr;
    try{if(typeof challengeCompletions!=='undefined')challengeCompletions=arr}catch(e){}
    appWrite('challenge_completions',arr);write('challenge_completions',arr);write('challengeCompletions',arr);
  }
  function refresh(){
    try{if(typeof renderChallenges==='function')renderChallenges()}catch(e){}
    try{if(typeof buildDashboard==='function')buildDashboard()}catch(e){}
    try{if(typeof renderWeekBar==='function')renderWeekBar()}catch(e){}
    try{if(window.currentMainView==='calendar'&&typeof renderCalendar==='function')renderCalendar()}catch(e){}
  }
  async function registerPlayer(me){
    const database=await ensureDb(); if(!database||!me.ready)return false;
    try{await database.collection(PLAYERS).doc(safe(me.email)).set({id:me.email,email:me.email,name:me.name||me.email.split('@')[0],picture:me.picture||'',online:true,app:'Change',lastSeen:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});return true;}
    catch(e){console.warn('Final Player Sync:',e);return false;}
  }
  async function uploadLocalCompletions(){
    const database=await ensureDb(); const me=account();
    if(!database||!me.ready)return false;
    const locals=allLocalCompletions().map(c=>normalizeCompletion(c,me)).filter(Boolean);
    if(!locals.length){persistCompletions();return true;}
    try{
      await registerPlayer(me);
      for(const row of locals){
        await database.collection(COMPLETIONS).doc(String(row.id)).set(Object.assign({},row,{createdAt:firebase.firestore.FieldValue.serverTimestamp()}),{merge:true});
        mergeLocal(row);
      }
      persistCompletions();
      return true;
    }catch(e){console.warn('Final Challenge upload failed:',e);toastMsg('Punkte konnten nicht online gespeichert werden: '+(e.message||e),'err');return false;}
  }
  async function loadRemoteCompletions(){
    const database=await ensureDb(); if(!database)return false;
    try{
      const snap=await database.collection(COMPLETIONS).limit(1000).get();
      snap.forEach(doc=>{const row=normalizeCompletion(Object.assign({id:doc.id},doc.data()||{}),account());if(row)mergeLocal(row)});
      persistCompletions();refresh();return true;
    }catch(e){console.warn('Final Challenge remote load failed:',e);toastMsg('Punkte konnten nicht aus Firebase geladen werden: '+(e.message||e),'err');return false;}
  }
  async function startSync(){
    if(readLs('live_sync_enabled', false)!==true)return false;
    if(syncing)return; syncing=true;
    const database=await ensureDb(); const me=account();
    if(!database){syncing=false;return false;}
    if(me.ready)await registerPlayer(me);
    await uploadLocalCompletions();
    await loadRemoteCompletions();
    if(unsub){try{unsub()}catch(e){}unsub=null;}
    try{
      // Nur letzte 60 Tage
      const d60=new Date(); d60.setDate(d60.getDate()-60);
      unsub=database.collection(COMPLETIONS).where('date','>=',d60.toISOString().slice(0,10)).limit(200).onSnapshot(snap=>{
        snap.docChanges().forEach(ch=>{
          if(ch.type==='removed') window.challengeCompletions=(window.challengeCompletions||[]).filter(c=>String(c.id)!==String(ch.doc.id));
          else {const row=normalizeCompletion(Object.assign({id:ch.doc.id},ch.doc.data()||{}),account());if(row)mergeLocal(row);}
        });
        persistCompletions();refresh();
      },err=>{console.warn('Final Challenge listener failed:',err);toastMsg('Live-Punkte-Sync blockiert: '+(err.message||err),'err');});
    }catch(e){console.warn('Final Challenge listener setup failed:',e);}
    syncing=false;return true;
  }

  const oldPublish=window.publishCompletionToFirestore;
  window.publishCompletionToFirestore=async function(completion){
    const me=account();
    const row=normalizeCompletion(completion,me);
    if(!row){toastMsg('Bitte erst mit Google anmelden – Punkte werden sonst keinem Konto zugeordnet.','err');return false;}
    mergeLocal(row);persistCompletions();
    const ok=await uploadLocalCompletions();
    setTimeout(loadRemoteCompletions,400);
    return ok;
  };

  const oldComplete=window.completeChallenge;
  window.completeChallenge=async function(id){
    const before=(window.challengeCompletions||[]).length;
    let res;
    if(typeof oldComplete==='function') res=await oldComplete.apply(this,arguments);
    setTimeout(async()=>{
      await uploadLocalCompletions();
      await loadRemoteCompletions();
      if((window.challengeCompletions||[]).length>before) refresh();
    },150);
    return res;
  };

  window.startGlobalChallengeSync=startSync;
  window.forceLoadChallengePoints=async function(){await uploadLocalCompletions();return loadRemoteCompletions();};
  window.debugChallengeSync=async function(){const me=account();const database=await ensureDb();let remote=-1;try{if(database){const s=await database.collection(COMPLETIONS).limit(1000).get();remote=s.size;}}catch(e){remote='Fehler: '+(e.message||e)};const local=allLocalCompletions().length;toastMsg('Sync-Status: lokal '+local+' · online '+remote+' · '+(me.email||'kein Konto'), remote===0?'err':'ok');return {account:me,local,remote};};

  function boot(){[200,800,1800,3500,7000,12000,20000].forEach(ms=>setTimeout(()=>{ if(readLs('live_sync_enabled', false)===true) startSync(); },ms));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
  window.addEventListener('load',boot);
})();

