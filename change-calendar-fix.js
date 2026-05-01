/* CHANGE CALENDAR FIX
   Behebt:
   1. Google-Termine + lokale Termine erscheinen wieder im Kalender
   2. Kalendereinstellungen (KW, Dots, Feiertage) wirken sofort
   3. Regler-Animation stimmt – Änderung sichtbar ohne Panel schließen
*/
(function () {
  'use strict';

  /* ─── 1. SETTINGS STORAGE ─────────────────────────────────────── */
  const SKEY = 'change_cal_fix_settings';

  function loadSettings() {
    const defaults = { showWeekNumbers: false, showChallengeDots: true, showHolidays: true };
    try {
      // Alle möglichen alten Keys abfragen
      for (const k of [SKEY, 'change_cal_settings_master', 'change_v2_calendar_settings',
                       'change_v1_calendar_settings', 'change_calendar_options_v2',
                       'change_v1_calendar_view_options']) {
        const raw = localStorage.getItem(k);
        if (raw) return Object.assign({}, defaults, JSON.parse(raw));
      }
    } catch (e) {}
    return defaults;
  }

  function persistSettings(s) {
    try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {}
    window.changeCalendarViewOptions = s;
  }

  /* ─── 2. CSS SOFORT ANWENDEN ──────────────────────────────────── */
  function applyCSS(s) {
    s = s || loadSettings();
    let el = document.getElementById('_calfix_style');
    if (!el) {
      el = document.createElement('style');
      el.id = '_calfix_style';
      document.head.appendChild(el);
    }
    el.textContent = [
      /* KW-Badges – alle bekannten Klassen abdecken */
      !s.showWeekNumbers
        ? '.kw-badge, .kw-badge-left, #month-grid .kw-badge, #month-grid .kw-badge-left { display: none !important; }'
        : '',
      /* Challenge-Dots */
      !s.showChallengeDots
        ? '.challenge-day-dot { display: none !important; }'
        : '',
      /* Feiertage */
      !s.showHolidays
        ? '.holiday-line, .holiday-badge, .holiday-chip { display: none !important; }'
        : '',
    ].join('\n');
  }

  /* ─── 3. TOGGLE-ZUSTAND IM PANEL SETZEN ──────────────────────── */
  function syncToggles(s) {
    const map = [
      [['toggle-kw', 'toggle-weeknumbers', 'setting-weeknumbers'], 'showWeekNumbers'],
      [['toggle-dots', 'toggle-challenge-dots', 'setting-dots'],   'showChallengeDots'],
      [['toggle-holidays', 'setting-holidays'],                     'showHolidays'],
    ];
    map.forEach(([ids, key]) => {
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.type === 'checkbox') el.checked = !!s[key];
      });
    });
  }

  /* ─── 4. TOGGLE-ÄNDERUNG → SOFORT SPEICHERN + RENDERN ────────── */
  function readToggles() {
    const s = loadSettings();
    const get = (...ids) => {
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.type === 'checkbox') return el.checked;
      }
      return undefined;
    };
    const kw  = get('toggle-kw', 'toggle-weeknumbers', 'setting-weeknumbers');
    const dot = get('toggle-dots', 'toggle-challenge-dots', 'setting-dots');
    const hol = get('toggle-holidays', 'setting-holidays');
    if (kw  !== undefined) s.showWeekNumbers    = kw;
    if (dot !== undefined) s.showChallengeDots  = dot;
    if (hol !== undefined) s.showHolidays       = hol;
    return s;
  }

  function onAnyToggleChange() {
    const s = readToggles();
    persistSettings(s);
    applyCSS(s);
    try { if (typeof renderCalendar === 'function') renderCalendar(); } catch (e) {}
  }

  function attachListeners() {
    const ids = ['toggle-kw','toggle-weeknumbers','setting-weeknumbers',
                 'toggle-dots','toggle-challenge-dots','setting-dots',
                 'toggle-holidays','setting-holidays'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset._calfix) {
        el.dataset._calfix = '1';
        el.addEventListener('change', onAnyToggleChange);
      }
    });
  }

  /* ─── 5. OPENKALENDARSETTINGS PATCHEN ─────────────────────────── */
  const _openCalSettings = window.openCalendarSettings;
  window.openCalendarSettings = function () {
    if (typeof _openCalSettings === 'function') _openCalSettings.apply(this, arguments);
    setTimeout(() => {
      const s = loadSettings();
      syncToggles(s);
      attachListeners();
    }, 60);
  };

  /* saveCalSettings → sofort */
  window.saveCalSettings = function () {
    onAnyToggleChange();
    try { if (typeof toast === 'function') toast('Kalender-Einstellungen gespeichert ✓', 'ok'); } catch (e) {}
    try { if (typeof closePanel === 'function') closePanel(); } catch (e) {}
  };

  /* ─── 6. ALLEEVENTS: LOKAL + GOOGLE ZUSAMMENFÜHREN ───────────── */
  function googleEvDate(ge) {
    const s = ge && ge.start;
    if (!s) return '';
    if (s.date) return String(s.date).slice(0, 10);
    if (s.dateTime) return String(s.dateTime).slice(0, 10);
    return '';
  }
  function googleEvTime(ge) {
    const dt = ge && ge.start && ge.start.dateTime;
    if (!dt) return '';
    try { return new Date(dt).toTimeString().slice(0, 5); } catch (e) { return ''; }
  }
  function googleEvEndTime(ge) {
    const dt = ge && ge.end && ge.end.dateTime;
    if (!dt) return '';
    try { return new Date(dt).toTimeString().slice(0, 5); } catch (e) { return ''; }
  }

  window.getAllEvents = function () {
    const out = [];
    const seen = new Set();

    function add(ev) {
      if (!ev || !ev.date) return;
      const key = ev.googleEventId ? 'g:' + ev.googleEventId : 'l:' + ev.id;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(ev);
    }

    // Lokale Termine
    (Array.isArray(window.events) ? window.events : []).forEach(add);

    // Google-Termine
    (Array.isArray(window.gEvents) ? window.gEvents : []).forEach(ge => {
      if (!ge) return;
      const date = googleEvDate(ge);
      if (!date) return;
      const id = String(ge.id || '');
      add({
        id: id.startsWith('g_') ? id : 'g_' + id,
        googleEventId: id,
        title: ge.summary || '(Kein Titel)',
        date,
        time: googleEvTime(ge),
        endTime: googleEvEndTime(ge),
        color: 'blue',
        type: 'meeting',
        desc: ge.description || '',
        allDay: !!(ge.start && ge.start.date),
        source: 'google',
        notifDaysBefore: 1,
      });
    });

    return out;
  };

  /* getEventById neu */
  window.getEventById = function (id) {
    const all = window.getAllEvents();
    return all.find(e => e.id === id) ||
           all.find(e => e.googleEventId === id) ||
           null;
  };

  /* ─── 7. SAVEEVENT: NACH SPEICHERN NEU RENDERN ────────────────── */
  const _saveEvent = window.saveEvent;
  window.saveEvent = function (existingId) {
    if (typeof _saveEvent === 'function') _saveEvent.apply(this, arguments);
    setTimeout(() => {
      try { if (typeof renderCalendar === 'function') renderCalendar(); } catch (e) {}
      try { if (typeof renderUpcoming === 'function') renderUpcoming(); } catch (e) {}
      try { if (typeof buildDashboard === 'function') buildDashboard(); } catch (e) {}
    }, 80);
  };

  /* ─── 8. RENDERCALENDAR: IMMER CSS ANWENDEN ──────────────────── */
  const _renderCalendar = window.renderCalendar;
  window.renderCalendar = function () {
    if (typeof _renderCalendar === 'function') _renderCalendar.apply(this, arguments);
    applyCSS();
  };

  /* ─── 9. LOADGOOGLEEVENTS: NACH LADEN NEU RENDERN ────────────── */
  const _loadGoogleEvents = window.loadGoogleEvents;
  window.loadGoogleEvents = async function () {
    let result;
    if (typeof _loadGoogleEvents === 'function') {
      result = await _loadGoogleEvents.apply(this, arguments);
    }
    setTimeout(() => {
      try {
        if (window.currentMainView === 'calendar' && typeof renderCalendar === 'function') {
          renderCalendar();
        }
        if (typeof renderUpcoming === 'function') renderUpcoming();
      } catch (e) {}
    }, 100);
    return result;
  };

  /* ─── 10. PANEL-BEOBACHTER FÜR TOGGLE-LISTENER ───────────────── */
  if (document.body) {
    new MutationObserver(() => {
      const panel = document.getElementById('side-panel');
      if (panel && panel.classList.contains('open')) {
        attachListeners();
        // Wenn Kalender-Settings-Panel offen: Toggles synchronisieren
        const title = document.getElementById('panel-title');
        if (title && /Kalender-Einstellung/i.test(title.textContent || '')) {
          syncToggles(loadSettings());
          attachListeners();
        }
      }
    }).observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['class'],
    });
  }

  /* ─── INIT ────────────────────────────────────────────────────── */
  window.changeCalendarViewOptions = loadSettings();
  applyCSS();

  window.addEventListener('load', () => {
    setTimeout(() => {
      applyCSS();
      try { if (typeof renderCalendar === 'function') renderCalendar(); } catch (e) {}
      try { if (window.accessToken && typeof loadGoogleEvents === 'function') loadGoogleEvents(); } catch (e) {}
    }, 600);
  });

})();
