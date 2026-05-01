/* ═══════════════════════════════════════════════════════════════
   CHANGE MASTER FIX  –  ersetzt die drei einzelnen Fix-Dateien:
     change-saveevent-fix.js
     change-calendar-fix.js
     change-challenge-undo-fix.js

   Lade NUR diese eine Datei. Die drei anderen können gelöscht werden.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─── HILFSFUNKTIONEN ─────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  function today() {
    try { return typeof dateKey === 'function' ? dateKey(new Date()) : new Date().toISOString().slice(0,10); }
    catch(e) { return new Date().toISOString().slice(0,10); }
  }

  /** Datum aus Eingabefeld lesen – akzeptiert YYYY-MM-DD und DD.MM.YYYY */
  function readDate(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    const raw = el.value.trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    // Deutsches Format DD.MM.YYYY
    const m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    // Fallback
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime()))
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    } catch (e) {}
    return '';
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function persist() {
    try { if (typeof ls === 'function') ls('events', window.events || []); } catch (e) {}
    try { ['change_v1_events','change_v2_events'].forEach(k => localStorage.setItem(k, JSON.stringify(window.events||[]))); } catch (e) {}
    try { if (typeof persistChangeState === 'function') persistChangeState(); } catch (e) {}
    try { if (typeof saveToDrive       === 'function') saveToDrive();          } catch (e) {}
  }

  function refreshCalendar() {
    try { if (typeof renderCalendar === 'function') renderCalendar(); } catch (e) {}
    try { if (typeof renderUpcoming === 'function') renderUpcoming(); } catch (e) {}
    try { if (typeof checkNotifications === 'function') checkNotifications(); } catch (e) {}
    try { if (typeof buildDashboard === 'function') buildDashboard(); } catch (e) {}
  }


  /* ══════════════════════════════════════════════════════════
     1.  SAVEEVENT  –  robuste, endgültige Version
         Schließt das Panel zuverlässig nach dem Speichern.
  ══════════════════════════════════════════════════════════ */

  window.saveEvent = function (existingId) {
    const title = val('ev-title');
    const date  = readDate('ev-date');

    if (!title) { try { toast('Bitte einen Titel eingeben','err'); } catch(e){} return; }
    if (!date)  { try { toast('Bitte ein Datum wählen','err');     } catch(e){} return; }

    window.events = Array.isArray(window.events) ? window.events : [];

    const oldIndex = existingId
      ? window.events.findIndex(e => e.id === existingId || e.googleEventId === existingId)
      : -1;
    const old = oldIndex >= 0 ? window.events[oldIndex] : null;

    const ev = {
      id:            old ? old.id : ('ev_' + uid()),
      title,
      date,
      time:          val('ev-time'),
      endTime:       val('ev-end'),
      type:          val('ev-type')  || 'meeting',
      color:         val('ev-color') || 'blue',
      desc:          val('ev-desc'),
      notifDaysBefore: parseInt(val('ev-notif') || '1', 10) || 1,
      allDay:        !val('ev-time'),
      source:        'local',
      googleEventId: old ? (old.googleEventId || '') : '',
      createdAt:     old ? (old.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    };

    if (oldIndex >= 0) window.events[oldIndex] = ev;
    else               window.events.push(ev);

    persist();

    // Panel SOFORT schließen – kein setTimeout, keine Abhängigkeit
    try { if (typeof closePanel === 'function') closePanel(); } catch (e) {}

    // Danach erst rendern
    refreshCalendar();

    try { if (typeof toast === 'function') toast(existingId ? 'Termin aktualisiert ✓' : 'Termin gespeichert ✓', 'ok'); } catch (e) {}

    // Google-Sync asynchron
    if (window.accessToken && window.accessToken !== 'firebase-auth' && !window.isDemoMode) {
      setTimeout(() => {
        try {
          if      (typeof syncEventToGoogleReliable === 'function') syncEventToGoogleReliable(ev);
          else if (typeof syncLocalEventToGoogle    === 'function') syncLocalEventToGoogle(ev);
        } catch (e) {}
      }, 300);
    }

    return ev;
  };

  window.saveToGoogleCal = existingId => window.saveEvent(existingId);

  /** deleteEvent */
  window.deleteEvent = function (id) {
    if (!confirm('Termin wirklich löschen?')) return;
    window.events = (window.events || []).filter(e => e.id !== id);
    persist();
    try { closePanel(); } catch (e) {}
    refreshCalendar();
    try { toast('Termin gelöscht', ''); } catch (e) {}
  };

  /**
   * Speichern-Button im Termin-Panel korrekt verdrahten.
   * Einmalig nach Panel-Öffnung – kein MutationObserver-Loop.
   */
  function patchSaveButton(existingId) {
    setTimeout(() => {
      const btn = document.getElementById('event-save-button');
      if (btn) {
        // alle alten Handler entfernen (clone)
        const fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);
        fresh.addEventListener('click', () => window.saveEvent(existingId || null), { once: true });
        return;
      }
      // Fallback für Panels mit onclick-Attribut
      document.querySelectorAll('#panel-body button').forEach(b => {
        if (/^(Speichern|Aktualisieren)$/.test((b.textContent||'').trim()) && !b.dataset._mf) {
          b.dataset._mf = '1';
          const clone = b.cloneNode(true);
          b.parentNode.replaceChild(clone, b);
          clone.addEventListener('click', () => window.saveEvent(existingId || null), { once: true });
        }
      });
    }, 20);
  }

  /** openEventPanel patchen, um Button korrekt zu verdrahten */
  const _openEventPanel = window.openEventPanel;
  window.openEventPanel = function (id, preDate) {
    if (typeof _openEventPanel === 'function') _openEventPanel.apply(this, arguments);
    patchSaveButton(id);
  };


  /* ══════════════════════════════════════════════════════════
     2.  ALLEEVENTS  –  Lokal + Google sauber zusammenführen
  ══════════════════════════════════════════════════════════ */

  function gDate(ge) {
    const s = ge && ge.start;
    if (!s) return '';
    if (s.date)     return String(s.date).slice(0,10);
    if (s.dateTime) return String(s.dateTime).slice(0,10);
    return '';
  }
  function gTime(ge) {
    const dt = ge && ge.start && ge.start.dateTime;
    if (!dt) return '';
    try { return new Date(dt).toTimeString().slice(0,5); } catch (e) { return ''; }
  }
  function gEndTime(ge) {
    const dt = ge && ge.end && ge.end.dateTime;
    if (!dt) return '';
    try { return new Date(dt).toTimeString().slice(0,5); } catch (e) { return ''; }
  }

  window.getAllEvents = function () {
    const out  = [];
    const seen = new Set();

    function add(ev) {
      if (!ev || !ev.date) return;
      const key = ev.googleEventId ? 'g:' + ev.googleEventId : 'l:' + ev.id;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(ev);
    }

    (Array.isArray(window.events)  ? window.events  : []).forEach(add);
    (Array.isArray(window.gEvents) ? window.gEvents : []).forEach(ge => {
      if (!ge) return;
      const date = gDate(ge);
      if (!date) return;
      const id = String(ge.id || '');
      add({
        id:            id.startsWith('g_') ? id : 'g_' + id,
        googleEventId: id,
        title:         ge.summary || '(Kein Titel)',
        date,
        time:          gTime(ge),
        endTime:       gEndTime(ge),
        color:         'blue',
        type:          'meeting',
        desc:          ge.description || '',
        allDay:        !!(ge.start && ge.start.date),
        source:        'google',
        notifDaysBefore: 1,
      });
    });

    return out;
  };

  window.getEventById = id => {
    const all = window.getAllEvents();
    return all.find(e => e.id === id) || all.find(e => e.googleEventId === id) || null;
  };


  /* ══════════════════════════════════════════════════════════
     3.  KALENDER-EINSTELLUNGEN  –  Toggles wirken sofort
  ══════════════════════════════════════════════════════════ */

  const SETTINGS_KEY = 'change_cal_master_settings';

  function loadSettings() {
    const def = { showWeekNumbers: false, showChallengeDots: true, showHolidays: true };
    const keys = [SETTINGS_KEY,'change_cal_fix_settings','change_calendar_options_v2',
                  'change_v2_calendar_settings','change_v1_calendar_view_options'];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) return Object.assign({}, def, JSON.parse(raw));
      } catch (e) {}
    }
    return def;
  }

  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
    window.changeCalendarViewOptions = s;
  }

  function applySettingsCSS(s) {
    s = s || loadSettings();
    let el = document.getElementById('_mf_cal_style');
    if (!el) {
      el = document.createElement('style');
      el.id = '_mf_cal_style';
      document.head.appendChild(el);
    }
    el.textContent = [
      !s.showWeekNumbers   ? '.kw-badge, .kw-badge-left { display:none !important; }' : '',
      !s.showChallengeDots ? '.challenge-day-dot { display:none !important; }'          : '',
      !s.showHolidays      ? '.holiday-line, .holiday-badge { display:none !important; }': '',
    ].join('\n');
  }

  function readTogglesFromDOM() {
    const s = loadSettings();
    const get = (...ids) => { for (const id of ids) { const el = document.getElementById(id); if (el && el.type==='checkbox') return el.checked; } return undefined; };
    const kw  = get('toggle-kw','toggle-weeknumbers','setting-weeknumbers');
    const dot = get('toggle-dots','toggle-challenge-dots','setting-dots');
    const hol = get('toggle-holidays','setting-holidays');
    if (kw  !== undefined) s.showWeekNumbers   = kw;
    if (dot !== undefined) s.showChallengeDots = dot;
    if (hol !== undefined) s.showHolidays      = hol;
    return s;
  }

  function onToggle() {
    const s = readTogglesFromDOM();
    saveSettings(s);
    applySettingsCSS(s);
    try { if (typeof renderCalendar === 'function') renderCalendar(); } catch (e) {}
  }

  function syncTogglesToDOM(s) {
    const map = [
      [['toggle-kw','toggle-weeknumbers','setting-weeknumbers'], 'showWeekNumbers'],
      [['toggle-dots','toggle-challenge-dots','setting-dots'],   'showChallengeDots'],
      [['toggle-holidays','setting-holidays'],                    'showHolidays'],
    ];
    map.forEach(([ids, key]) => ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.type === 'checkbox') el.checked = !!s[key];
    }));
  }

  function attachToggleListeners() {
    const ids = ['toggle-kw','toggle-weeknumbers','setting-weeknumbers',
                 'toggle-dots','toggle-challenge-dots','setting-dots',
                 'toggle-holidays','setting-holidays'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset._mf) {
        el.dataset._mf = '1';
        el.addEventListener('change', onToggle);
      }
    });
  }

  const _openCalSettings = window.openCalendarSettings;
  window.openCalendarSettings = function () {
    if (typeof _openCalSettings === 'function') _openCalSettings.apply(this, arguments);
    setTimeout(() => {
      syncTogglesToDOM(loadSettings());
      attachToggleListeners();
    }, 60);
  };

  window.saveCalSettings = function () {
    onToggle();
    try { toast('Kalender-Einstellungen gespeichert ✓', 'ok'); } catch (e) {}
    try { closePanel(); } catch (e) {}
  };

  // renderCalendar: immer CSS anwenden
  const _renderCalendar = window.renderCalendar;
  window.renderCalendar = function () {
    if (typeof _renderCalendar === 'function') _renderCalendar.apply(this, arguments);
    applySettingsCSS();
  };

  // loadGoogleEvents: nach Laden neu rendern
  const _loadGoogleEvents = window.loadGoogleEvents;
  window.loadGoogleEvents = async function () {
    let result;
    if (typeof _loadGoogleEvents === 'function') result = await _loadGoogleEvents.apply(this, arguments);
    setTimeout(() => {
      try { if (window.currentMainView === 'calendar' && typeof renderCalendar === 'function') renderCalendar(); } catch (e) {}
    }, 100);
    return result;
  };

  // Panel-Beobachter: Toggles synchronisieren wenn Einstellungs-Panel sich öffnet
  if (document.body) {
    new MutationObserver(() => {
      const panel = document.getElementById('side-panel');
      const title = document.getElementById('panel-title');
      if (!panel || !panel.classList.contains('open')) return;
      if (title && /Kalender-Einstellung/i.test(title.textContent || '')) {
        syncTogglesToDOM(loadSettings());
        attachToggleListeners();
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }


  /* ══════════════════════════════════════════════════════════
     4.  CHALLENGE UNDO  –  Rückgängig-Button in der Liste
         "Entnehmen" aus dem Kontest-Panel entfernt.
  ══════════════════════════════════════════════════════════ */

  function myId() {
    try {
      let fu = null;
      try { fu = firebase && firebase.auth && firebase.auth().currentUser; } catch (e) {}
      const info = window.userInfo || {};
      const email = String((fu && fu.email) || info.email || info.mail || '').trim().toLowerCase();
      const uid   = (fu && fu.uid) || info.uid || '';
      return email || uid || 'local-user';
    } catch (e) { return 'local-user'; }
  }

  function completionPlayerId(c) {
    const id = String(c && (c.playerId || c.userEmail || c.email || c.userId || c.uid) || '').trim().toLowerCase();
    const bad = !id || id === 'me' || id === 'du' || id === 'ich' || id === 'local-user';
    return bad ? myId() : id;
  }

  function saveCompletions() {
    try { if (typeof ls === 'function') ls('challenge_completions', window.challengeCompletions || []); } catch (e) {}
    try { localStorage.setItem('change_v2_challenge_completions', JSON.stringify(window.challengeCompletions || [])); } catch (e) {}
    try { if (typeof persistChangeState === 'function') persistChangeState(); } catch (e) {}
  }

  window.undoChallengeCompletion = function (challengeId) {
    const me = myId();
    const td = today();
    const before = (window.challengeCompletions || []).length;

    window.challengeCompletions = (window.challengeCompletions || []).filter(c => {
      const same = String(c.challengeId) === String(challengeId)
                && String(c.date || '').slice(0,10) === td
                && completionPlayerId(c) === me;
      return !same;
    });

    if (before === (window.challengeCompletions || []).length) {
      try { toast('Eintrag nicht gefunden', ''); } catch (e) {}
      return;
    }

    saveCompletions();

    // Firebase-Löschung
    try {
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        const db = firebase.firestore();
        ['playerId','userEmail','email'].forEach(field => {
          db.collection('change_completions')
            .where(field, '==', me)
            .where('challengeId', '==', String(challengeId))
            .where('date', '==', td)
            .limit(10).get()
            .then(s => s.forEach(d => d.ref.delete()))
            .catch(() => {});
        });
      }
    } catch (e) {}

    try { toast('Erledigung rückgängig ✓', 'ok'); } catch (e) {}
    try { if (typeof renderChallenges === 'function') renderChallenges(); } catch (e) {}
    try { if (typeof buildDashboard   === 'function') buildDashboard();   } catch (e) {}
  };

  // renderChallenges: Undo-Buttons zu erledigten Zeilen hinzufügen
  const _renderChallenges = window.renderChallenges;
  window.renderChallenges = function () {
    if (typeof _renderChallenges === 'function') _renderChallenges.apply(this, arguments);

    setTimeout(() => {
      const list = document.getElementById('challenges-list');
      if (!list) return;
      const me = myId();
      const td = today();
      const doneIds = new Set(
        (window.challengeCompletions || [])
          .filter(c => completionPlayerId(c) === me && String(c.date || '').slice(0,10) === td)
          .map(c => String(c.challengeId))
      );

      list.querySelectorAll('.challenge-item.challenge-done').forEach(row => {
        if (row.querySelector('.btn-undo')) return;
        const chId = row.dataset.challengeId || '';
        if (!chId || !doneIds.has(chId)) return;

        const btn = document.createElement('button');
        btn.className = 'btn btn-undo btn-sm';
        btn.title = 'Versehentlich erledigt? Rückgängig';
        btn.textContent = '↩';
        btn.onclick = e => { e.stopPropagation(); window.undoChallengeCompletion(chId); };
        row.appendChild(btn);
      });
    }, 0);
  };

  // Kontest-Panel: Entnehmen-Buttons entfernen
  const _openContestUserDetails = window.openContestUserDetails;
  window.openContestUserDetails = function (playerId) {
    if (typeof _openContestUserDetails === 'function') _openContestUserDetails.apply(this, arguments);
    setTimeout(() => {
      document.getElementById('panel-body')
        ?.querySelectorAll('.delete-completion, .remove-completion-btn, .last-remove-btn, button[onclick*="deleteChallengeCompletion"], button[onclick*="removeSingleCompleted"]')
        .forEach(btn => btn.remove());
    }, 20);
  };

  // Panel-Beobachter: Entnehmen-Buttons aus Kontest-Panel raus
  if (document.body) {
    new MutationObserver(() => {
      const panel = document.getElementById('side-panel');
      const title = document.getElementById('panel-title');
      if (!panel || !panel.classList.contains('open')) return;
      if (!title || !/Kontest/i.test(title.textContent || '')) return;
      document.getElementById('panel-body')
        ?.querySelectorAll('.delete-completion, .remove-completion-btn, .last-remove-btn')
        .forEach(btn => btn.remove());
    }).observe(document.body, { childList: true, subtree: true });
  }


  /* ══════════════════════════════════════════════════════════
     5.  STYLES
  ══════════════════════════════════════════════════════════ */

  if (!document.getElementById('_mf_style')) {
    const st = document.createElement('style');
    st.id = '_mf_style';
    st.textContent = `
      .btn-undo {
        background: transparent;
        border: 1px solid var(--b2);
        color: var(--t3);
        font-size: 14px;
        padding: 5px 9px;
        border-radius: var(--rsm);
        cursor: pointer;
        flex-shrink: 0;
        transition: all .15s;
      }
      .btn-undo:hover {
        background: var(--red-d);
        border-color: rgba(220,38,38,.35);
        color: var(--red);
      }
      .challenge-item.challenge-done {
        flex-wrap: wrap;
        gap: 6px;
      }
    `;
    document.head.appendChild(st);
  }


  /* ══════════════════════════════════════════════════════════
     6.  INIT
  ══════════════════════════════════════════════════════════ */

  window.changeCalendarViewOptions = loadSettings();
  applySettingsCSS();

  window.addEventListener('load', () => {
    setTimeout(() => {
      applySettingsCSS();
      try { if (typeof renderCalendar === 'function') renderCalendar(); } catch (e) {}
      try { if (window.accessToken && typeof loadGoogleEvents === 'function') loadGoogleEvents(); } catch (e) {}
      try { if (typeof renderChallenges === 'function') renderChallenges(); } catch (e) {}
    }, 600);
  });

})();
