(function(){
'use strict';

/* FITNESS doppelt entfernen */
function removeFitness(){
  if(!window.challenges) return;
  window.challenges = window.challenges.filter(c =>
    !String(c.title).toLowerCase().includes("fitness")
  );
}

/* Datum Deutsch */
window.formatEventGerman = function(ev){
  if(!ev) return "";
  const d = new Date(ev.date + "T12:00:00");

  const date = new Intl.DateTimeFormat('de-DE',{
    weekday:'short',
    day:'2-digit',
    month:'long',
    year:'numeric'
  }).format(d);

  if(!ev.time){
    return date + " · Ganztägig";
  }

  return date + " · " + ev.time + (ev.endTime ? " – " + ev.endTime : "") + " Uhr";
};

/* TERMIN SPEICHERN FIX */
window.saveEvent = function(){

  const title = document.getElementById("ev-title")?.value;
  const date = document.getElementById("ev-date")?.value;
  const time = document.getElementById("ev-time")?.value;

  if(!title || !date){
    alert("Titel und Datum erforderlich");
    return;
  }

  if(!window.events) window.events = [];

  const ev = {
    id: "ev_" + Date.now(),
    title,
    date,
    time,
    endTime: "",
    allDay: !time
  };

  window.events.push(ev);

  if(window.ls) ls("events", window.events);

  if(window.renderCalendar) renderCalendar();

  alert("Termin gespeichert ✓");
};

/* DASHBOARD FIX */
window.buildDashboard = function(){

  const el = document.getElementById("dash-grid");
  if(!el) return;

  const events = (window.events || []).slice(0,5);
  const players = (window.challengePlayers || []);

  el.innerHTML = `
  <div class="dash-card">
    <h2>Kalender</h2>
    <button onclick="setMainView('calendar')">Öffnen →</button>
    ${events.map(e=>`
      <div>${e.title}<br>${formatEventGerman(e)}</div>
    `).join("")}
  </div>

  <div class="dash-card">
    <h2>Challenges</h2>
    ${players.map(p=>`
      <div onclick="openContestUserDetails('${p.email}')">
        ${p.name || p.email}
      </div>
    `).join("")}
  </div>
  `;
};

/* ENTNEHMEN FIX */
window.openContestUserDetails = function(){

  const list = (window.challengeCompletions || []).slice(-5).reverse();

  let txt = "Letzte Aufgaben:\n\n";

  list.forEach(c=>{
    txt += c.challengeId + " ("+c.date+")\n";
  });

  alert(txt);
};

setInterval(()=>{
  removeFitness();
},1000);

})();
