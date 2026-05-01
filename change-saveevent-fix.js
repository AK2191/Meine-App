/* CHANGE SAVEEVENT FIX
   Problem: saveEvent durch viele Patches kaputtgeschrieben.
   Datum kommt manchmal als "01.05.2026" statt "2026-05-01".
   Lösung: robuste Neufassung die alle Fälle abdeckt.
*/
(function () {
  'use strict';

  /* ─── Hilfsfunktionen ─────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  /* Datum aus Eingabefeld lesen – egal welches Format */
  function readDate(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    const raw = (el.value || '').trim();
    if (!raw) return '';

    // Bereits YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    // Deutsches Format DD.MM.YYYY
    const de = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (de) return `${de[3]}-${de[2].padStart(2,'0')}-${de[1].padStart(2,'0')}`;

    // DD/MM/YYYY
    const sl = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (sl) return `${sl[3]}-${sl[2].padStart(2,'0')}-${sl[1].padStart(2,'0')}`;

    // Fallback: Date-parse versuchen
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2,'0') + '-' +
          String(d.getDate()).padStart(2,'0');
      }
    } catch (e) {}

    return '';
  }

  function readField(id, fallback) {
    const el = document.getElementById(id);
    return el ? (el.value || '').trim() : (fallback || '');
  }

  function lsWrite(k, v) {
    const prefixes = ['change_v1_', 'change_v2_', ''];
    prefixes.forEach(p => {
      try { localStorage.setItem(p + k, JSON.stringify(v)); } catch (e) {}
    });
  }

  function persist() {
    lsWrite('events', window.events || []);
    try { if (typeof persistChangeState === 'function') persistChangeState(); } catch (e) {}
    try { if (typeof saveToDrive       === 'function') saveToDrive();          } catch (e) {}
  }

  function refreshViews() {
    try { if (typeof renderCalendar === 'function') renderCalendar(); }  catch (e) {}
    try { if (typeof renderUpcoming === 'function') renderUpcoming(); }  catch (e) {}
    try { if (typeof buildDashboard === 'function') buildDashboard(); }  catch (e) {}
    try { if (typeof checkNotifications === 'function') checkNotifications(); } catch (e) {}
    // getAllEvents-Cache leeren falls vorhanden
    try { if (typeof addCalendarPointBadges === 'function') setTimeout(addCalendarPointBadges, 100); } catch (e) {}
  }

  /* ─── Haupt-saveEvent ─────────────────────────────────────────── */
  window.saveEvent = function (existingId) {
    /* Felder lesen */
    const title = readField('ev-title');
    const date  = readDate('ev-date');
    const time  = readField('ev-time');
    const endTime = readField('ev-end');
    const type  = readField('ev-type') || 'meeting';
    const color = readField('ev-color') || 'blue';
    const desc  = readField('ev-desc');
    const notifDaysBefore = parseInt(readField('ev-notif') || '1', 10) || 1;

    /* Validierung */
    if (!title) {
      try { if (typeof toast === 'function') toast('Bitte einen Titel eingeben', 'err'); } catch (e) {}
      return;
    }
    if (!date) {
      try { if (typeof toast === 'function') toast('Bitte ein Datum wählen', 'err'); } catch (e) {}
      return;
    }

    /* Alten Eintrag finden */
    window.events = Array.isArray(window.events) ? window.events : [];
    const oldIndex = existingId
      ? window.events.findIndex(e => e.id === existingId || e.googleEventId === existingId)
      : -1;
    const old = oldIndex >= 0 ? window.events[oldIndex] : null;

    /* Neues Event-Objekt */
    const ev = {
      id:            old ? old.id : ('ev_' + uid()),
      title,
      date,
      time,
      endTime,
      type,
      color,
      desc,
      notifDaysBefore,
      allDay:        !time,
      source:        'local',
      googleEventId: old ? (old.googleEventId || '') : '',
      createdAt:     old ? (old.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    };

    /* Speichern */
    if (oldIndex >= 0) {
      window.events[oldIndex] = ev;
    } else {
      window.events.push(ev);
    }

    persist();

    /* Panel schließen */
    try { if (typeof closePanel === 'function') closePanel(); } catch (e) {}

    /* Ansicht aktualisieren */
    refreshViews();

    /* Feedback */
    try {
      if (typeof toast === 'function')
        toast(existingId ? 'Termin aktualisiert ✓' : 'Termin gespeichert ✓', 'ok');
    } catch (e) {}

    /* Google-Sync falls Token vorhanden */
    if (window.accessToken && window.accessToken !== 'firebase-auth' && !window.isDemoMode) {
      setTimeout(() => {
        try {
          if (typeof syncEventToGoogleReliable === 'function') syncEventToGoogleReliable(ev);
          else if (typeof syncLocalEventToGoogle === 'function') syncLocalEventToGoogle(ev);
        } catch (e) {}
      }, 200);
    }

    return ev;
  };

  /* saveToGoogleCal leitet weiter */
  window.saveToGoogleCal = function (existingId) {
    window.saveEvent(existingId);
  };

  /* ─── deleteEvent ─────────────────────────────────────────────── */
  window.deleteEvent = function (id) {
    if (!confirm('Termin wirklich löschen?')) return;
    window.events = (window.events || []).filter(e => e.id !== id);
    persist();
    try { if (typeof closePanel === 'function') closePanel(); } catch (e) {}
    refreshViews();
    try { if (typeof toast === 'function') toast('Termin gelöscht', ''); } catch (e) {}

    // Auch aus Google löschen falls vorhanden
    const ev = (window.events || []).find(e => e.id === id);
    if (ev && ev.googleEventId && window.accessToken && window.accessToken !== 'firebase-auth') {
      try {
        fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(ev.googleEventId)}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + window.accessToken }
        }).catch(() => {});
      } catch (e) {}
    }
  };

  /* ─── Datum-Anzeige im Panel korrigieren ─────────────────────── */
  // Wenn das Datum-Feld als Text-Input rendern würde statt <input type="date">:
  // Wir stellen sicher, dass der Wert beim Öffnen im richtigen Format steht.
  const _openEventPanel = window.openEventPanel;
  window.openEventPanel = function (id, preDate) {
    if (typeof _openEventPanel === 'function') _openEventPanel.apply(this, arguments);

    setTimeout(() => {
      const dateEl = document.getElementById('ev-date');
      if (!dateEl) return;

      // Sicherstellen type=date
      if (dateEl.type !== 'date') dateEl.type = 'date';

      // Wert ins richtige Format bringen
      const val = (dateEl.value || '').trim();
      if (val && !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const de = val.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (de) dateEl.value = `${de[3]}-${de[2].padStart(2,'0')}-${de[1].padStart(2,'0')}`;
      }

      // Speichern-Button sicherstellen
      const saveBtn = document.getElementById('event-save-button');
      if (saveBtn) {
        saveBtn.onclick = () => window.saveEvent(id || null);
      }
      // Fallback: alle "Speichern"-Buttons im Panel patchen
      document.querySelectorAll('#panel-body button').forEach(btn => {
        const txt = (btn.textContent || '').trim();
        if (txt === 'Speichern' || txt === 'Aktualisieren') {
          btn.onclick = () => window.saveEvent(id || null);
        }
      });
    }, 30);
  };

  /* ─── Sicherheitsnetz: Speichern-Button im Panel immer patchen ── */
  if (document.body) {
    new MutationObserver(() => {
      const panel = document.getElementById('side-panel');
      const title = document.getElementById('panel-title');
      if (!panel || !panel.classList.contains('open')) return;
      if (!title) return;
      const t = title.textContent || '';
      if (!/(Termin|Neuer Termin|Termin bearbeiten)/i.test(t)) return;

      document.querySelectorAll('#panel-body button').forEach(btn => {
        const txt = (btn.textContent || '').trim();
        if ((txt === 'Speichern' || txt === 'Aktualisieren') && !btn.dataset._sfixed) {
          btn.dataset._sfixed = '1';
          btn.addEventListener('click', () => {
            // existingId aus dem Panel-Titel ableiten oder aus data-Attribut
            const evId = btn.closest('[data-event-id]')?.dataset.eventId || null;
            window.saveEvent(evId);
          });
        }
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

})();
