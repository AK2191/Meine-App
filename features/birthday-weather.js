/**
 * birthday-weather.js
 * ─────────────────────────────────────────────────────────
 * Feature 1: Geburtstagsdetektiv
 *   - Erkennt Termine mit bday/geburtstag/birthday im Titel
 *   - 🎂-Icon in Dashboard + Kalender
 *   - Push 3 Tage vorher
 *   - Farbige Hervorhebung im Kalender (pink)
 *
 * Feature 2: Friseur-Countdown verbessert
 *   - Zeigt nächsten Termin prominent, letzten Termin klein
 *   - „In 9 Tagen" statt „vor 17d"
 *
 * Feature 3: Wetter im Tages-Panel
 *   - Beim Klick auf Kalendertag: Wetter + Temp wenn im 7-Tage-Forecast
 * ─────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── Hilfsfunktionen ───────────────────────────────── */
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dateKeyOf(str) {
    if (!str) return '';
    return String(str).slice(0, 10);
  }
  function daysUntil(dk) {
    var t = Date.parse(dk + 'T12:00:00');
    if (!isFinite(t)) return null;
    return Math.round((t - Date.now()) / 86400000);
  }
  function fmtShort(dk) {
    try { return new Date(dk + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' }); }
    catch (e) { return dk; }
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ══════════════════════════════════════════════════════
   * FEATURE 1: GEBURTSTAGSDETEKTIV
   * ══════════════════════════════════════════════════════ */

  var BDAY_KEYWORDS = ['bday', 'geburtstag', 'birthday', 'bd ', 'b-day'];

  function isBirthday(title) {
    if (!title) return false;
    var t = String(title).toLowerCase();
    return BDAY_KEYWORDS.some(function (kw) { return t.includes(kw); });
  }
  window.isBirthday = isBirthday;

  /* Kalender-CSS: pinke Chip-Farbe für Geburtstags-Events */
  (function injectBdayCss() {
    var st = document.getElementById('bday-style');
    if (st) return;
    st = document.createElement('style');
    st.id = 'bday-style';
    st.textContent = [
      /* Kalender-Chip */
      '.cal-event-chip.is-bday{background:rgba(236,72,153,.10)!important;border-color:rgba(236,72,153,.22)!important;color:#be185d!important}',
      /* Dashboard-Row */
      '.change-bday-row{background:rgba(236,72,153,.05)!important;box-shadow:inset 3px 0 0 #f472b6!important}',
      '.change-icon-bday{background:rgba(236,72,153,.13)!important}',
    ].join('');
    document.head.appendChild(st);
  })();

  /* ── Dashboard: Geburtstags-Icon + pinker Hintergrund ── */
  function patchDashboardBdayRows() {
    /* Alle `.change-dashboard-row`-Elemente suchen und Geburtstage kennzeichnen */
    document.querySelectorAll('.change-dashboard-row').forEach(function (row) {
      var title = (row.querySelector('.dash-row-title') || {}).textContent || '';
      if (!isBirthday(title)) return;
      row.classList.add('change-bday-row');
      var iconEl = row.querySelector('.dash-row-icon, .change-icon-event');
      if (iconEl) {
        iconEl.classList.add('change-icon-bday');
        iconEl.textContent = '🎂';
      }
    });
    /* Auch ältere Event-Rows im buildDashboard-Format */
    document.querySelectorAll('.dash-row').forEach(function (row) {
      var title = (row.querySelector('.dash-row-title') || {}).textContent || '';
      if (!isBirthday(title)) return;
      var iconEl = row.querySelector('.dash-row-icon');
      if (iconEl) iconEl.textContent = '🎂';
    });
  }

  /* ── Kalender: Chip-Klasse setzen ── */
  function patchCalendarBdayChips() {
    document.querySelectorAll('.cal-event-chip').forEach(function (chip) {
      var txt = chip.textContent || '';
      if (isBirthday(txt)) chip.classList.add('is-bday');
    });
  }

  /* ── Push: 3 Tage vorher ── */
  function fireBdayPush() {
    var Store = window.ChangeNotificationStore;
    if (!Store || !Store.pushActive || !Store.pushActive()) return;
    var today = todayKey();
    var allEvts = [];
    try { if (typeof window.getAllEvents === 'function') allEvts = window.getAllEvents() || []; } catch (e) { }
    if (!allEvts.length) allEvts = (window.events || []).concat(window.gEvents || []);
    allEvts.forEach(function (ev) {
      if (!isBirthday(ev.title || ev.summary || '')) return;
      var dk = dateKeyOf(ev.startDate || ev.date || (ev.start && (ev.start.date || ev.start.dateTime)) || '');
      if (!dk) return;
      var diff = daysUntil(dk);
      if (diff !== 3) return;
      var firedId = 'bday:push:' + dk + ':' + String(ev.title || '').slice(0, 30);
      if (Store.wasFired && Store.wasFired(firedId)) return;
      try {
        new Notification('🎂 Geburtstag in 3 Tagen', {
          body: esc(ev.title || 'Geburtstag') + ' · ' + fmtShort(dk),
          tag: firedId,
          icon: './icons/icon-change-192.png'
        });
        if (Store.markFired) Store.markFired(firedId);
      } catch (e) { }
    });
  }

  /* ── Benachrichtigungs-Panel: Geburtstag als kind='birthday' ── */
  var _origBuildAll = null;
  function patchNotificationCenter() {
    if (!window.ChangeNotificationCenter) return;
    /* Geburtstags-Notifications in buildAll injizieren */
    var NC = window.ChangeNotificationCenter;
    if (NC.__bdayPatched) return;
    NC.__bdayPatched = true;
    var origGetAll = NC.getAll;
    if (typeof origGetAll !== 'function') return;
    NC.getAll = function () {
      var notes = origGetAll.apply(this, arguments) || [];
      /* Geburtstage aus Event-Liste holen und als eigene Notes einfügen */
      var today = todayKey();
      var allEvts = [];
      try { if (typeof window.getAllEvents === 'function') allEvts = window.getAllEvents() || []; } catch (e) { }
      allEvts.forEach(function (ev) {
        if (!isBirthday(ev.title || ev.summary || '')) return;
        var dk = dateKeyOf(ev.startDate || ev.date || '');
        if (!dk) return;
        var diff = daysUntil(dk);
        if (diff === null || diff < 0 || diff > 7) return;
        var id = 'bday:notif:' + dk + ':' + String(ev.title || '').slice(0, 30);
        if (notes.some(function (n) { return n.id === id; })) return;
        notes.push({
          id: id,
          kind: 'birthday',
          title: '🎂 ' + esc(ev.title || 'Geburtstag'),
          body: diff === 0 ? 'Heute! ' + fmtShort(dk) : (diff === 1 ? 'Morgen · ' : 'In ' + diff + ' Tagen · ') + fmtShort(dk),
          date: dk,
          diff: diff,
          urgency: diff <= 1 ? 'warn' : 'info',
          priority: diff <= 1 ? 15 : 25,
          action: { type: 'view', view: 'calendar' }
        });
      });
      return notes;
    };
  }

  /* ══════════════════════════════════════════════════════
   * FEATURE 2: FRISEUR-COUNTDOWN VERBESSERT
   * ══════════════════════════════════════════════════════
   * Der bestehende Friseur-Code in buildKPIs() zeigt schon
   * das Badge mit dem nächsten Termin, aber die Sub-Zeile
   * sagt immer „vor Xd · letzter Termin".
   * Wir patchen die Sub-Zeile: wenn ein nächster Termin
   * vorhanden ist, zeigt sie „Nächster: In X Tagen" oder
   * „Nächster: Übermorgen" statt des vergangenen Termins.
   */
  function patchFriseurRow() {
    document.querySelectorAll('.dash-row').forEach(function (row) {
      var title = (row.querySelector('.dash-row-title') || {}).textContent || '';
      if (!title.toLowerCase().includes('friseur')) return;
      var badge = row.querySelector('.dash-row-badge');
      if (!badge) return;
      var badgeText = badge.textContent || '';
      /* Badge enthält "→ Di., 02. Jun · 17:15" – wir wollen daraus „In 9 Tagen" machen */
      /* Den nächsten Termin direkt aus Events lesen */
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var allEvts = (window.events || []).concat(window.gEvents || []);
      var futureBest = null;
      allEvts.forEach(function (e) {
        var t = String(e.title || e.summary || '').toLowerCase();
        if (!t.includes('friseur')) return;
        var dk = dateKeyOf(e.startDate || e.date || (e.start && (e.start.date || e.start.dateTime)) || '');
        if (!dk) return;
        var d = new Date(dk + 'T12:00:00');
        if (d >= today) {
          if (!futureBest || d < new Date(futureBest.date + 'T12:00:00')) {
            futureBest = { date: dk, time: e.time || '' };
          }
        }
      });
      if (!futureBest) return;
      var diff = daysUntil(futureBest.date);
      if (diff === null) return;
      var sub = row.querySelector('.dash-row-sub');
      if (!sub) return;
      var countdownText = diff === 0 ? 'Heute!' : diff === 1 ? 'Morgen' : diff === 2 ? 'Übermorgen' : 'In ' + diff + ' Tagen';
      var lastText = sub.textContent || '';
      /* Nur ersetzen wenn noch altes Format */
      if (lastText.startsWith('vor ')) {
        sub.textContent = '→ ' + countdownText + (futureBest.time ? ' · ' + futureBest.time : '') + ' Uhr';
      }
    });
  }

  /* ══════════════════════════════════════════════════════
   * FEATURE 3: WETTER IM TAGES-PANEL
   * ══════════════════════════════════════════════════════ */

  function getWeatherForDay(dk) {
    var svc = window.ChangeWeatherService;
    if (!svc || typeof svc.getCached !== 'function') return null;
    var cached = svc.getCached();
    if (!cached || !cached.weather) return null;
    var forecast = cached.weather.forecast || [];
    for (var i = 0; i < forecast.length; i++) {
      if (forecast[i].date === dk) return forecast[i];
    }
    return null;
  }

  function weatherBannerHtml(dk) {
    /* Nur für zukünftige Tage + heute */
    var today = todayKey();
    if (dk < today) return '';
    var day = getWeatherForDay(dk);
    if (!day) return '';
    var temp = day.tempMax != null ? day.tempMax + '°' : '';
    var tempMin = day.tempMin != null ? ' / ' + day.tempMin + '°' : '';
    var rain = day.rainProbability != null && day.rainProbability > 20
      ? '<span style="color:#3b82f6;font-weight:700">' + day.rainProbability + '% Regen</span>' : '';
    var sunInfo = '';
    if (day.sunrise || day.sunset) {
      sunInfo = '<span style="color:var(--t4);font-size:11px">'
        + (day.sunrise ? '🌅 ' + day.sunrise + '  ' : '')
        + (day.sunset ? '🌇 ' + day.sunset : '')
        + '</span>';
    }
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;'
      + 'background:var(--s2);border:1px solid var(--b1);border-radius:12px;margin-bottom:12px">'
      + '<span style="font-size:22px;line-height:1">' + esc(day.icon || '🌦️') + '</span>'
      + '<div style="min-width:0">'
      + '<div style="font-size:13px;font-weight:700;color:var(--t1)">'
      + esc(day.summary || 'Wetter') + ' · ' + temp + tempMin
      + (rain ? '  ' + rain : '')
      + '</div>'
      + (sunInfo ? '<div style="margin-top:3px">' + sunInfo + '</div>' : '')
      + '</div>'
      + '</div>';
  }

  /* Patch openDayPanel to inject weather */
  function patchDayPanel() {
    var orig = window.openDayPanel;
    if (!orig || orig.__weatherPatched) return;
    window.openDayPanel = function (date, givenEvents) {
      /* Wir hängen uns in openPanel ein, nachdem der Content gebaut wurde */
      var origOpenPanel = window.openPanel;
      if (typeof origOpenPanel === 'function') {
        var dk = '';
        try {
          var d = date instanceof Date ? date : new Date(String(date).slice(0, 10) + 'T12:00:00');
          dk = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        } catch (e) { }
        var patchedOnce = false;
        window.openPanel = function (title, html) {
          if (!patchedOnce && dk) {
            patchedOnce = true;
            var wx = weatherBannerHtml(dk);
            if (wx) html = wx + html;
          }
          window.openPanel = origOpenPanel;
          return origOpenPanel(title, html);
        };
      }
      return orig.apply(this, arguments);
    };
    window.openDayPanel.__weatherPatched = true;
  }

  /* ══════════════════════════════════════════════════════
   * BOOTSTRAP – alles nach DOM-Ready verdrahten
   * ══════════════════════════════════════════════════════ */

  function run() {
    patchDayPanel();
    patchNotificationCenter();
    fireBdayPush();

    /* Nach jedem Render neu anwenden */
    var observer = new MutationObserver(function () {
      patchDashboardBdayRows();
      patchCalendarBdayChips();
      patchFriseurRow();
    });
    var target = document.getElementById('content') || document.body;
    observer.observe(target, { childList: true, subtree: true });

    /* Sofort einmal laufen */
    patchDashboardBdayRows();
    patchCalendarBdayChips();
    patchFriseurRow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 400); });
  } else {
    setTimeout(run, 400);
  }
  /* Auch nach Firebase-Daten erneut patchen */
  setTimeout(function () {
    patchDashboardBdayRows();
    patchCalendarBdayChips();
    patchFriseurRow();
    fireBdayPush();
  }, 3000);

})();
