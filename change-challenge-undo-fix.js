/* CHANGE CHALLENGE UNDO FIX
   - "Entnehmen" weg aus dem Kontest-Mitspieler-Panel
   - Erledigte Aufgaben in der Challenge-Liste haben einen kleinen Rückgängig-Button
*/
(function () {
  'use strict';

  /* ─── HELPERS ─────────────────────────────────────────────────── */
  function norm(v) { return String(v || '').trim().toLowerCase(); }

  function account() {
    let fu = null;
    try { fu = firebase && firebase.auth && firebase.auth().currentUser; } catch (e) {}
    const info = window.userInfo || {};
    const email = norm((fu && fu.email) || info.email || info.mail || '');
    const uid   = (fu && fu.uid) || info.uid || '';
    return { id: email || uid || 'local-user', name: (fu && fu.displayName) || info.name || email || 'Du' };
  }

  function badId(v) {
    const x = norm(v);
    return !x || x === 'me' || x === 'du' || x === 'ich' || x === 'local-user';
  }

  function playerId(c) {
    const a = account();
    let id = norm(c && (c.playerId || c.userEmail || c.email || c.userId || c.uid));
    if (badId(id)) id = a.id;
    return id;
  }

  function today() {
    try { return typeof dateKey === 'function' ? dateKey(new Date()) : new Date().toISOString().slice(0, 10); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function saveCompletions() {
    try { if (typeof ls === 'function') ls('challenge_completions', window.challengeCompletions || []); } catch (e) {}
    try { localStorage.setItem('change_v2_challenge_completions', JSON.stringify(window.challengeCompletions || [])); } catch (e) {}
    try { if (typeof persistChangeState === 'function') persistChangeState(); } catch (e) {}
  }

  function refreshAll() {
    try { if (typeof renderChallenges === 'function') renderChallenges(); } catch (e) {}
    try { if (typeof buildDashboard   === 'function') buildDashboard();   } catch (e) {}
  }

  /* ─── COMPLETION ENTFERNEN ────────────────────────────────────── */
  window.undoChallengeCompletion = function (challengeId) {
    const a   = account();
    const td  = today();
    const before = (window.challengeCompletions || []).length;

    window.challengeCompletions = (window.challengeCompletions || []).filter(c => {
      const sameChallenge = String(c.challengeId) === String(challengeId);
      const sameDate      = String(c.date || '').slice(0, 10) === td;
      const samePlayer    = playerId(c) === a.id;
      return !(sameChallenge && sameDate && samePlayer);
    });

    const removed = before - (window.challengeCompletions || []).length;
    if (!removed) {
      try { if (typeof toast === 'function') toast('Kein Eintrag gefunden', ''); } catch (e) {}
      return;
    }

    saveCompletions();

    // Auch aus Firebase löschen wenn möglich
    try {
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        const db = firebase.firestore();
        ['playerId', 'userEmail', 'email'].forEach(field => {
          db.collection('change_completions')
            .where(field, '==', a.id)
            .where('challengeId', '==', String(challengeId))
            .where('date', '==', td)
            .limit(10).get()
            .then(snap => snap.forEach(d => d.ref.delete()))
            .catch(() => {});
        });
      }
    } catch (e) {}

    try { if (typeof toast === 'function') toast('Erledigung rückgängig gemacht ✓', 'ok'); } catch (e) {}
    refreshAll();
  };

  /* ─── CHALLENGE-LISTE MIT UNDO-BUTTON ─────────────────────────── */
  function challengeRow(ch, done) {
    const url = ch.url && !ch.noVideo
      ? `<a href="${esc(ch.url)}" target="_blank" rel="noopener" class="challenge-meta" onclick="event.stopPropagation()">So geht die Übung</a>`
      : '';
    const optBadge = ch.optional
      ? '<span class="dash-row-badge badge-blue">freiwillig</span>'
      : '';

    if (done) {
      // Erledigt-Zeile: grüner Button + kleiner Rückgängig-Button
      return `
        <div class="challenge-item challenge-done" data-challenge-id="${esc(ch.id)}">
          <div class="challenge-icon">${esc(ch.icon || '✅')}</div>
          <div class="challenge-body">
            <div class="challenge-name">${esc(ch.title || ch.name || 'Challenge')}</div>
            <div class="challenge-meta">${esc(ch.desc || '')} · ${parseInt(ch.points, 10) || 0} Punkte · ✅ heute erledigt</div>
            ${url}
          </div>
          ${optBadge}
          <span class="points-pill">✓ ${parseInt(ch.points, 10) || 0}</span>
          <button class="btn btn-success btn-sm" disabled>Erledigt</button>
          <button
            class="btn btn-undo btn-sm"
            title="Versehentlich erledigt? Rückgängig machen"
            onclick="event.stopPropagation(); undoChallengeCompletion('${esc(ch.id)}')"
          >↩</button>
        </div>`;
    }

    // Offene Zeile
    return `
      <div class="challenge-item" data-challenge-id="${esc(ch.id)}">
        <div class="challenge-icon">${esc(ch.icon || '🏃')}</div>
        <div class="challenge-body">
          <div class="challenge-name">${esc(ch.title || ch.name || 'Challenge')}</div>
          <div class="challenge-meta">${esc(ch.desc || '')} · ${parseInt(ch.points, 10) || 0} Punkte</div>
          ${url}
        </div>
        ${optBadge}
        <span class="points-pill">+${parseInt(ch.points, 10) || 0}</span>
        <button class="btn btn-primary btn-sm" onclick="completeChallenge('${esc(ch.id)}')">Erledigen</button>
      </div>`;
  }

  /* ─── RENDERCHALLENGES PATCHEN ─────────────────────────────────── */
  const _renderChallenges = window.renderChallenges;
  window.renderChallenges = function () {
    // Zuerst bisherige Funktion aufrufen
    if (typeof _renderChallenges === 'function') _renderChallenges.apply(this, arguments);

    // Dann: erledigte Einträge mit Undo-Button nachträglich ergänzen
    try {
      const list = document.getElementById('challenges-list');
      if (!list) return;

      const a  = account();
      const td = today();

      // Welche Challenges sind heute von mir erledigt?
      const doneIds = new Set(
        (window.challengeCompletions || [])
          .filter(c => playerId(c) === a.id && String(c.date || '').slice(0, 10) === td)
          .map(c => String(c.challengeId))
      );

      // Alle Erledigt-Zeilen ohne Undo-Button bekommen einen
      list.querySelectorAll('.challenge-item.challenge-done').forEach(row => {
        if (row.querySelector('.btn-undo')) return; // bereits vorhanden
        const chId = row.dataset.challengeId || '';
        if (!chId || !doneIds.has(chId)) return;

        const undoBtn = document.createElement('button');
        undoBtn.className = 'btn btn-undo btn-sm';
        undoBtn.title = 'Versehentlich erledigt? Rückgängig machen';
        undoBtn.textContent = '↩';
        undoBtn.onclick = (e) => {
          e.stopPropagation();
          window.undoChallengeCompletion(chId);
        };
        row.appendChild(undoBtn);
      });
    } catch (e) { console.warn('UNDO-FIX render patch:', e); }
  };

  /* ─── KONTEST-PANEL: ENTNEHMEN-BUTTON AUSBLENDEN ─────────────── */
  // openContestUserDetails überschreiben – Entnehmen-Buttons entfernen
  const _openContestUserDetails = window.openContestUserDetails;
  window.openContestUserDetails = function (playerId) {
    if (typeof _openContestUserDetails === 'function') {
      _openContestUserDetails.apply(this, arguments);
    }
    // Nach dem Rendern des Panels alle Entnehmen-Buttons entfernen
    setTimeout(() => {
      const panel = document.getElementById('panel-body');
      if (!panel) return;
      panel.querySelectorAll(
        '.delete-completion, .remove-completion-btn, .last-remove-btn, button[onclick*="deleteChallengeCompletion"], button[onclick*="removeSingleCompleted"]'
      ).forEach(btn => btn.remove());
    }, 20);
  };

  // Sicherheitsnetz: jedes Mal wenn das Panel sich öffnet, Entnehmen-Buttons prüfen
  if (document.body) {
    new MutationObserver(() => {
      const panel  = document.getElementById('side-panel');
      const title  = document.getElementById('panel-title');
      if (!panel || !panel.classList.contains('open')) return;
      if (!title || !/Kontest/i.test(title.textContent || '')) return;
      document.getElementById('panel-body')
        ?.querySelectorAll(
          '.delete-completion, .remove-completion-btn, .last-remove-btn, button[onclick*="deleteChallengeCompletion"], button[onclick*="removeSingleCompleted"]'
        )
        .forEach(btn => btn.remove());
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ─── STYLES ──────────────────────────────────────────────────── */
  if (!document.getElementById('_undo_fix_style')) {
    const st = document.createElement('style');
    st.id = '_undo_fix_style';
    st.textContent = `
      /* Rückgängig-Button */
      .btn-undo {
        background: transparent;
        border: 1px solid var(--b2);
        color: var(--t3);
        font-size: 14px;
        line-height: 1;
        padding: 5px 8px;
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
      /* Erledigt-Zeile Buttons nebeneinander */
      .challenge-item.challenge-done {
        flex-wrap: wrap;
        gap: 6px;
      }
      .challenge-item.challenge-done .btn-success[disabled] {
        cursor: default;
        opacity: 0.85;
      }
    `;
    document.head.appendChild(st);
  }

  window.addEventListener('load', () => {
    setTimeout(() => {
      try { if (typeof renderChallenges === 'function') renderChallenges(); } catch (e) {}
    }, 700);
  });

})();
