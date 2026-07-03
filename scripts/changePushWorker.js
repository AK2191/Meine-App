/*
 * change-push-worker  (Phase 3a)
 * -------------------------------------------------------------------------
 * Separater Cloudflare-Worker NUR fuer den Push-Versand (getrennt vom
 * Deploy-Worker). Sendet FCM-Pushes auch bei geschlossener App.
 *
 * Secrets (im Cloudflare-Worker unter Settings -> Variables and Secrets):
 *   FIREBASE_SERVICE_ACCOUNT  (Secret)  - kompletter JSON-Inhalt des
 *                                         Service-Account-Schluessels
 *   PUSH_TEST_SECRET          (Secret)  - frei waehlbares Test-Passwort.
 *                                         Ohne dieses Secret ist /test gesperrt.
 *
 * Endpunkte:
 *   GET /            -> kurzer Status (kein Geheimnis noetig, leakt nichts)
 *   GET /test?secret=...[&email=...]
 *                    -> sendet einen Test-Push an alle Geraete des Nutzers
 *                       (Default: ak2191@gmx.de). Nur mit korrektem secret.
 *
 * Kontroll-Vertrag (ab Phase 4 voll wirksam):
 *   - Master/Geraet: nur Geraete in change_push_tokens/{email}/devices mit
 *     pushEnabled==true bekommen Pushes.
 *   - Pro Typ: change_settings/{email}.notificationPrefs.{typ} muss true sein.
 *   (Der Test-Endpunkt ignoriert die Typ-Prefs bewusst - er prueft nur, ob
 *    ueberhaupt ein Geraet aktiv ist.)
 * -------------------------------------------------------------------------
 */

const SCOPE =
  'https://www.googleapis.com/auth/firebase.messaging ' +
  'https://www.googleapis.com/auth/datastore';

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/test') {
        return await handleTest(url, env);
      }
      if (url.pathname === '/challenge') {
        return await handleChallenge(url, env);
      }
      if (url.pathname === '/event') {
        return await handleEvent(url, env);
      }
      if (url.pathname === '/holiday') {
        return await handleHoliday(url, env);
      }
      if (url.pathname === '/friseur') {
        return await handleFriseur(url, env);
      }
      return text('change-push-worker bereit.', 200);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, 500);
    }
  },

  // Cron-Einstieg (Phase 6d). Cloudflare-Cron laeuft jetzt STUENDLICH ("0 * * * *").
  // Der Worker prueft pro Nutzer, ob die aktuelle Berlin-Stunde zu dessen
  // eingestellten Erinnerungszeiten passt (notificationPrefs.reminderHours,
  // Defaults: challenges 8+13, events 7). DST-fest via berlinHour().
  async scheduled(event, env, ctx) {
    try {
      if (!env.FIREBASE_SERVICE_ACCOUNT) return;
      const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
      const projectId = sa.project_id;
      const hour = berlinHour();
      const slot = String(hour).padStart(2, '0');
      const accessToken = await getAccessToken(sa);
      const users = await listPushUsers(accessToken, projectId);
      for (const email of users) {
        try {
          const hours = await reminderHoursFor(accessToken, projectId, safeDocId(email));
          if (hours.events.includes(hour)) {
            await sendEventReminder(accessToken, projectId, email, { slot });
          }
          if (hours.challenges.includes(hour)) {
            await sendChallengeReminder(accessToken, projectId, email, { slot });
          }
          if (hours.holidays.includes(hour)) {
            await sendHolidayReminder(accessToken, projectId, email, { slot });
          }
          if (hours.friseur.includes(hour)) {
            await sendFriseurReminder(accessToken, projectId, email, { slot });
          }
        } catch (e) {
          // Ein Fehler bei einem Nutzer darf den restlichen Lauf nicht stoppen.
        }
      }
    } catch (e) {
      // Im Cron niemals werfen.
    }
  },
};

// Liest die eingestellten Erinnerungsstunden eines Nutzers (Defaults, wenn nicht gesetzt).
async function reminderHoursFor(accessToken, projectId, emailId) {
  const defaults = { challenges: [8, 13], events: [7], holidays: [7], friseur: [7] };
  const doc = await firestoreGetDoc(accessToken, projectId, 'change_settings/' + emailId);
  const prefs = doc && doc.fields && doc.fields.notificationPrefs;
  const rh = prefs && prefs.mapValue && prefs.mapValue.fields && prefs.mapValue.fields.reminderHours;
  const rhFields = rh && rh.mapValue && rh.mapValue.fields;
  if (!rhFields) return defaults;
  const readArr = (node) => {
    const vals = node && node.arrayValue && node.arrayValue.values;
    if (!Array.isArray(vals)) return null;
    const out = vals
      .map((v) => parseInt(v.integerValue !== undefined ? v.integerValue : v.doubleValue, 10))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 23);
    return out.length ? out : null;
  };
  return {
    challenges: readArr(rhFields.challenges) || defaults.challenges,
    events: readArr(rhFields.events) || defaults.events,
    holidays: readArr(rhFields.holidays) || defaults.holidays,
    friseur: readArr(rhFields.friseur) || defaults.friseur,
  };
}

/* ---------- Test-Endpunkt ------------------------------------------------ */

async function handleTest(url, env) {
  if (!env.PUSH_TEST_SECRET) {
    return json({ error: 'Test deaktiviert: Secret PUSH_TEST_SECRET ist nicht gesetzt.' }, 403);
  }
  const provided = url.searchParams.get('secret') || '';
  if (provided !== env.PUSH_TEST_SECRET) {
    return json({ error: 'Falsches oder fehlendes secret.' }, 403);
  }
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    return json({ error: 'Secret FIREBASE_SERVICE_ACCOUNT fehlt.' }, 500);
  }

  let sa;
  try {
    sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    return json({ error: 'FIREBASE_SERVICE_ACCOUNT ist kein gueltiges JSON.' }, 500);
  }
  const projectId = sa.project_id;
  const email = (url.searchParams.get('email') || 'ak2191@gmx.de').toLowerCase();
  const emailDocId = safeDocId(email);

  const accessToken = await getAccessToken(sa);
  const devices = await listDevices(accessToken, projectId, emailDocId);

  const results = [];
  for (const dev of devices) {
    const r = await fcmSend(
      accessToken,
      projectId,
      dev.token,
      'Change Test',
      'Test-Push vom Worker - kommt auch bei geschlossener App an.'
    );
    results.push({
      device: dev.deviceId || null,
      ok: r.ok,
      status: r.status,
      error: r.ok ? null : (r.data && r.data.error && r.data.error.status) || 'unknown',
    });
  }

  return json({
    projectId,
    email,
    deviceCount: devices.length,
    sent: results.filter((x) => x.ok).length,
    results,
  });
}

/* ---------- Google-Anmeldung (Service-Account -> Access-Token) ----------- */

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(claim));
  const key = await importPrivateKey(sa.private_key);
  const sigBuf = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(unsigned)
  );
  const jwt = unsigned + '.' + b64urlBytes(new Uint8Array(sigBuf));

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:
      'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' +
      encodeURIComponent(jwt),
  });
  const data = await resp.json();
  if (!data.access_token) {
    throw new Error('Access-Token-Fehler: ' + JSON.stringify(data));
  }
  return data.access_token;
}

async function importPrivateKey(pem) {
  const der = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function pemToArrayBuffer(pem) {
  const body = String(pem)
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/* ---------- Firestore: gemeinsame Helfer + Geraete-Tokens ---------------- */

function fsBase(projectId) {
  return 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';
}

async function firestoreListDocs(accessToken, projectId, collPath) {
  const resp = await fetch(fsBase(projectId) + '/' + collPath + '?pageSize=300', {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  const data = await resp.json();
  return data.documents || [];
}

async function firestoreGetDoc(accessToken, projectId, docPath) {
  const resp = await fetch(fsBase(projectId) + '/' + docPath, {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  if (resp.status === 404) return null;
  const data = await resp.json();
  if (data.error) return null;
  return data;
}

async function firestoreRunQuery(accessToken, projectId, collectionId, fieldPath, value, limit) {
  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      where: { fieldFilter: { field: { fieldPath }, op: 'EQUAL', value: { stringValue: value } } },
      limit: limit || 200,
    },
  };
  const resp = await fetch(fsBase(projectId) + ':runQuery', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!Array.isArray(data)) return [];
  return data.filter((x) => x.document).map((x) => x.document);
}

async function firestorePatch(accessToken, projectId, docPath, fields, maskPaths) {
  const mask = (maskPaths || Object.keys(fields))
    .map((p) => 'updateMask.fieldPaths=' + encodeURIComponent(p))
    .join('&');
  await fetch(fsBase(projectId) + '/' + docPath + '?' + mask, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
}

function lastSeg(name) {
  const p = String(name || '').split('/');
  return p[p.length - 1];
}

async function listDevices(accessToken, projectId, emailDocId) {
  const docs = await firestoreListDocs(accessToken, projectId, 'change_push_tokens/' + emailDocId + '/devices');
  const out = [];
  docs.forEach((doc) => {
    const f = doc.fields || {};
    const tk = f.token && f.token.stringValue;
    // pushEnabled fehlt -> als true werten (Altbestand); explizit false -> aus
    const enabled = !(f.pushEnabled && f.pushEnabled.booleanValue === false);
    const deviceId = f.deviceId && f.deviceId.stringValue;
    if (tk && enabled) out.push({ token: tk, deviceId, name: doc.name });
  });
  return out;
}

/* ---------- FCM: einzelnen Push senden ----------------------------------- */

async function fcmSend(accessToken, projectId, deviceToken, title, body) {
  const resp = await fetch(
    'https://fcm.googleapis.com/v1/projects/' + projectId + '/messages:send',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          // Reines data-Paket: der eigene Service-Worker-Handler zeigt es an
          // (unabhaengig vom Firebase-SDK). KEIN notification-Feld -> keine Doppel-Anzeige.
          data: {
            title: title,
            body: body,
            url: 'https://ak2191.github.io/Meine-App/',
            tag: 'change-challenge',
          },
          webpush: {
            headers: { Urgency: 'high', TTL: '86400' },
            fcm_options: { link: 'https://ak2191.github.io/Meine-App/' },
          },
        },
      }),
    }
  );
  let data = {};
  try {
    data = await resp.json();
  } catch (e) {
    /* leer */
  }
  return { ok: resp.ok, status: resp.status, data };
}

/* ---------- Challenge-Erinnerung (Phase 4) ------------------------------- */

async function handleChallenge(url, env) {
  if (!env.PUSH_TEST_SECRET) {
    return json({ error: 'gesperrt: Secret PUSH_TEST_SECRET ist nicht gesetzt.' }, 403);
  }
  if ((url.searchParams.get('secret') || '') !== env.PUSH_TEST_SECRET) {
    return json({ error: 'Falsches oder fehlendes secret.' }, 403);
  }
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    return json({ error: 'Secret FIREBASE_SERVICE_ACCOUNT fehlt.' }, 500);
  }
  let sa;
  try {
    sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    return json({ error: 'FIREBASE_SERVICE_ACCOUNT ist kein gueltiges JSON.' }, 500);
  }
  const projectId = sa.project_id;
  const email = (url.searchParams.get('email') || 'ak2191@gmx.de').toLowerCase();
  const force = url.searchParams.get('force') === '1'; // Dedupe fuer Tests umgehen
  const slot = url.searchParams.get('slot') || 'manual';
  const accessToken = await getAccessToken(sa);
  const result = await sendChallengeReminder(accessToken, projectId, email, { force, slot });
  return json(result);
}

// Orchestrierung mit den ZWEI Kontroll-Ebenen + Slot-Dedupe + Token-Hygiene.
// opts: { force?:bool, slot?:string }  (slot '08'/'13' vom Cron, 'manual' vom Test)
async function sendChallengeReminder(accessToken, projectId, email, opts) {
  opts = opts || {};
  const force = !!opts.force;
  const slot = opts.slot || 'manual';
  const emailId = safeDocId(email);          // Dokument-ID, z.B. ak2191_gmx.de
  const playerId = String(email).toLowerCase(); // playerId in change_completions
  const today = berlinToday();
  const mark = today + '#' + slot;           // pro Tag UND Slot nur einmal

  // Kontroll-Ebene 2: Typ "challenges" eingeschaltet?
  const allowed = await challengePrefAllows(accessToken, projectId, emailId);
  if (!allowed) return { skipped: 'typ-challenges-aus', today, slot };

  // Dedupe: dieser Slot heute schon gesendet?
  if (!force) {
    const state = await firestoreGetDoc(accessToken, projectId, 'change_push_state/' + emailId);
    const last = state && state.fields && state.fields.lastChallengeMark && state.fields.lastChallengeMark.stringValue;
    if (last === mark) return { skipped: 'slot-bereits-gesendet', today, slot };
  }

  // Gibt es ueberhaupt eine offene Challenge heute?
  const open = await computeOpenChallenges(accessToken, projectId, playerId, today);
  if (!open.count) return { skipped: 'keine-offene-challenge', today, slot };

  // Kontroll-Ebene 1: aktive Geraete (pushEnabled)
  const devices = await listDevices(accessToken, projectId, emailId);
  if (!devices.length) return { skipped: 'kein-aktives-geraet', today, slot, openChallenges: open.count };

  const title = 'Change';
  const body = 'Deine Tages-Challenge wartet 💪';
  const results = [];
  const pruned = [];
  for (const dev of devices) {
    const r = await fcmSend(accessToken, projectId, dev.token, title, body);
    // Token-Hygiene: abgemeldete/ungueltige Tokens (404) entfernen.
    if (!r.ok && r.status === 404 && dev.name) {
      try { await firestoreDeleteByName(accessToken, dev.name); pruned.push(dev.deviceId || null); } catch (e) {}
    }
    results.push({
      device: dev.deviceId || null,
      ok: r.ok,
      status: r.status,
      error: r.ok ? null : (r.data && r.data.error && r.data.error.status) || 'unknown',
    });
  }
  const sent = results.filter((x) => x.ok).length;
  if (sent > 0) {
    await firestorePatch(
      accessToken,
      projectId,
      'change_push_state/' + emailId,
      {
        lastChallengeMark: { stringValue: mark },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
      ['lastChallengeMark', 'updatedAt']
    );
  }
  return { today, slot, openChallenges: open.count, deviceCount: devices.length, sent, pruned, results };
}

// Kontroll-Ebene 2: change_settings/{emailId}.notificationPrefs.challenges
// Fehlt das Dokument/Feld -> App-Default "an". Explizit false -> aus.
async function challengePrefAllows(accessToken, projectId, emailId) {
  const doc = await firestoreGetDoc(accessToken, projectId, 'change_settings/' + emailId);
  if (!doc || !doc.fields) return true;
  const prefs = doc.fields.notificationPrefs;
  const ch = prefs && prefs.mapValue && prefs.mapValue.fields && prefs.mapValue.fields.challenges;
  if (ch && ch.booleanValue === false) return false;
  return true;
}

// Spiegelt die Client-Logik challengeDueToday + erledigt-heute.
async function computeOpenChallenges(accessToken, projectId, playerId, today) {
  const challenges = await firestoreListDocs(accessToken, projectId, 'change_challenges');
  const comps = await firestoreRunQuery(accessToken, projectId, 'change_completions', 'playerId', playerId, 300);
  const doneToday = new Set();
  comps.forEach((c) => {
    const f = c.fields || {};
    const date = f.date && f.date.stringValue;
    if (date !== today) return;
    const cid = f.challengeId && f.challengeId.stringValue;
    if (cid) doneToday.add(String(cid));
  });
  let count = 0;
  challenges.forEach((doc) => {
    const f = doc.fields || {};
    if (f.active && f.active.booleanValue === false) return;
    const id = (f.id && f.id.stringValue) || lastSeg(doc.name);
    const rec = (f.recurrence && f.recurrence.stringValue) || 'once';
    const start = (f.date && f.date.stringValue) || today;
    const due = rec === 'daily' ? start <= today : start === today;
    if (!due) return;
    if (doneToday.has(String(id))) return;
    count++;
  });
  return { count };
}

/* ---------- Termin-Erinnerung (Phase 6b) --------------------------------- */

async function handleEvent(url, env) {
  if (!env.PUSH_TEST_SECRET) {
    return json({ error: 'gesperrt: Secret PUSH_TEST_SECRET ist nicht gesetzt.' }, 403);
  }
  if ((url.searchParams.get('secret') || '') !== env.PUSH_TEST_SECRET) {
    return json({ error: 'Falsches oder fehlendes secret.' }, 403);
  }
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    return json({ error: 'Secret FIREBASE_SERVICE_ACCOUNT fehlt.' }, 500);
  }
  let sa;
  try {
    sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    return json({ error: 'FIREBASE_SERVICE_ACCOUNT ist kein gueltiges JSON.' }, 500);
  }
  const projectId = sa.project_id;
  const email = (url.searchParams.get('email') || 'ak2191@gmx.de').toLowerCase();
  const force = url.searchParams.get('force') === '1';
  const slot = url.searchParams.get('slot') || 'manual';
  const accessToken = await getAccessToken(sa);
  const result = await sendEventReminder(accessToken, projectId, email, { force, slot });
  return json(result);
}

// Morgen-Uebersicht: erinnert an die heutigen Termine (nur Datum/Uhrzeit, kein Titel).
async function sendEventReminder(accessToken, projectId, email, opts) {
  opts = opts || {};
  const force = !!opts.force;
  const slot = opts.slot || 'manual';
  const emailId = safeDocId(email);
  const today = berlinToday();
  const mark = today + '#event' + slot;

  // Kontroll-Ebene 2: Typ "events" eingeschaltet?
  const allowed = await eventPrefAllows(accessToken, projectId, emailId);
  if (!allowed) return { skipped: 'typ-events-aus', today, slot };

  // Dedupe
  if (!force) {
    const state = await firestoreGetDoc(accessToken, projectId, 'change_push_state/' + emailId);
    const last = state && state.fields && state.fields.lastEventMark && state.fields.lastEventMark.stringValue;
    if (last === mark) return { skipped: 'slot-bereits-gesendet', today, slot };
  }

  const evs = await computeTodaysEvents(accessToken, projectId, emailId, today);
  if (!evs.count) return { skipped: 'keine-termine-heute', today, slot };

  // Kontroll-Ebene 1: aktive Geraete
  const devices = await listDevices(accessToken, projectId, emailId);
  if (!devices.length) return { skipped: 'kein-aktives-geraet', today, slot, events: evs.count };

  const title = 'Change';
  const body = buildEventBody(evs);

  const results = [];
  const pruned = [];
  for (const dev of devices) {
    const r = await fcmSend(accessToken, projectId, dev.token, title, body);
    if (!r.ok && r.status === 404 && dev.name) {
      try { await firestoreDeleteByName(accessToken, dev.name); pruned.push(dev.deviceId || null); } catch (e) {}
    }
    results.push({
      device: dev.deviceId || null,
      ok: r.ok,
      status: r.status,
      error: r.ok ? null : (r.data && r.data.error && r.data.error.status) || 'unknown',
    });
  }
  const sent = results.filter((x) => x.ok).length;
  if (sent > 0) {
    await firestorePatch(
      accessToken,
      projectId,
      'change_push_state/' + emailId,
      { lastEventMark: { stringValue: mark }, updatedAt: { timestampValue: new Date().toISOString() } },
      ['lastEventMark', 'updatedAt']
    );
  }
  return { today, slot, events: evs.count, deviceCount: devices.length, sent, pruned, results };
}

// Nachrichtentext im Stil der lokalen Benachrichtigung ("Heute: Bouldern um 22:00").
// Faellt sauber zurueck, wenn (alte) Eintraege noch keinen Titel haben.
function buildEventBody(evs) {
  const label = (it) => {
    const t = (it.title || '').trim();
    if (t && it.time) return t + ' um ' + it.time;
    if (t) return t;
    if (it.time) return 'Termin um ' + it.time;
    return '';
  };
  if (evs.count === 1) {
    const l = label(evs.items[0]);
    return l ? 'Heute: ' + l + '.' : 'Du hast heute einen Termin.';
  }
  const parts = evs.items.map(label).filter(Boolean).slice(0, 3);
  if (parts.length) {
    let s = 'Heute ' + evs.count + ' Termine: ' + parts.join(', ');
    if (evs.count > parts.length) s += ', +' + (evs.count - parts.length) + ' weitere';
    return s + '.';
  }
  return evs.firstTime
    ? 'Du hast heute ' + evs.count + ' Termine, ab ' + evs.firstTime + '.'
    : 'Du hast heute ' + evs.count + ' Termine.';
}

// Kontroll-Ebene 2: change_settings/{emailId}.notificationPrefs.events (fehlt -> an).
async function eventPrefAllows(accessToken, projectId, emailId) {
  const doc = await firestoreGetDoc(accessToken, projectId, 'change_settings/' + emailId);
  if (!doc || !doc.fields) return true;
  const prefs = doc.fields.notificationPrefs;
  const ev = prefs && prefs.mapValue && prefs.mapValue.fields && prefs.mapValue.fields.events;
  if (ev && ev.booleanValue === false) return false;
  return true;
}

// Termine, die HEUTE stattfinden (Einzeltag oder laufender Zeitraum). Datum/Uhrzeit + kurzer Titel.
async function computeTodaysEvents(accessToken, projectId, emailId, today) {
  const docs = await firestoreListDocs(accessToken, projectId, 'change_events/' + emailId + '/items');
  const items = [];
  docs.forEach((doc) => {
    const f = doc.fields || {};
    const date = f.date && f.date.stringValue;
    if (!date) return;
    const endDate = (f.endDate && f.endDate.stringValue) || date;
    if (date <= today && endDate >= today) {
      const time = (f.time && f.time.stringValue) || '';
      items.push({
        title: (f.title && f.title.stringValue) || '',
        // Startzeit nur nennen, wenn der Termin heute BEGINNT (laufende Zeitraeume haben heute keine Startzeit)
        time: date === today ? time : '',
      });
    }
  });
  items.sort((a, b) => (a.time || '99:99') < (b.time || '99:99') ? -1 : 1);
  return { count: items.length, items, firstTime: (items[0] && items[0].time) || '' };
}

/* ---------- Feiertags-Erinnerung (Phase 7a) ------------------------------- */

async function handleHoliday(url, env) {
  if (!env.PUSH_TEST_SECRET) {
    return json({ error: 'gesperrt: Secret PUSH_TEST_SECRET ist nicht gesetzt.' }, 403);
  }
  if ((url.searchParams.get('secret') || '') !== env.PUSH_TEST_SECRET) {
    return json({ error: 'Falsches oder fehlendes secret.' }, 403);
  }
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    return json({ error: 'Secret FIREBASE_SERVICE_ACCOUNT fehlt.' }, 500);
  }
  let sa;
  try {
    sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    return json({ error: 'FIREBASE_SERVICE_ACCOUNT ist kein gueltiges JSON.' }, 500);
  }
  const projectId = sa.project_id;
  const email = (url.searchParams.get('email') || 'ak2191@gmx.de').toLowerCase();
  const force = url.searchParams.get('force') === '1';
  const slot = url.searchParams.get('slot') || 'manual';
  const accessToken = await getAccessToken(sa);
  const result = await sendHolidayReminder(accessToken, projectId, email, { force, slot });
  return json(result);
}

// Erinnert am VORTAG an einen Feiertag ("Morgen ist Feiertag: ...").
// Bundesland kommt aus change_settings.calendar.holidayState (bereits gesynct seit Phase K).
async function sendHolidayReminder(accessToken, projectId, email, opts) {
  opts = opts || {};
  const force = !!opts.force;
  const slot = opts.slot || 'manual';
  const emailId = safeDocId(email);
  const today = berlinToday();
  const mark = today + '#holiday' + slot;

  const settingsDoc = await firestoreGetDoc(accessToken, projectId, 'change_settings/' + emailId);

  // Kontroll-Ebene 2: notificationPrefs.holidays (fehlt -> an)
  const prefs = settingsDoc && settingsDoc.fields && settingsDoc.fields.notificationPrefs;
  const hol = prefs && prefs.mapValue && prefs.mapValue.fields && prefs.mapValue.fields.holidays;
  if (hol && hol.booleanValue === false) return { skipped: 'typ-holidays-aus', today, slot };

  // Dedupe
  if (!force) {
    const state = await firestoreGetDoc(accessToken, projectId, 'change_push_state/' + emailId);
    const last = state && state.fields && state.fields.lastHolidayMark && state.fields.lastHolidayMark.stringValue;
    if (last === mark) return { skipped: 'slot-bereits-gesendet', today, slot };
  }

  // Bundesland lesen (Default ALL = nur bundesweite)
  const cal = settingsDoc && settingsDoc.fields && settingsDoc.fields.calendar;
  const st = cal && cal.mapValue && cal.mapValue.fields && cal.mapValue.fields.holidayState;
  const holidayState = (st && st.stringValue) || 'ALL';

  // Morgen ein Feiertag?
  const tomorrow = berlinAddDays(today, 1);
  const names = germanHolidaysFor(tomorrow, holidayState);
  if (!names.length) return { skipped: 'morgen-kein-feiertag', today, tomorrow, slot };

  const devices = await listDevices(accessToken, projectId, emailId);
  if (!devices.length) return { skipped: 'kein-aktives-geraet', today, slot };

  const title = 'Change';
  const body = 'Morgen ist Feiertag: ' + names.join(', ') + '.';
  const results = [];
  const pruned = [];
  for (const dev of devices) {
    const r = await fcmSend(accessToken, projectId, dev.token, title, body);
    if (!r.ok && r.status === 404 && dev.name) {
      try { await firestoreDeleteByName(accessToken, dev.name); pruned.push(dev.deviceId || null); } catch (e) {}
    }
    results.push({
      device: dev.deviceId || null,
      ok: r.ok,
      status: r.status,
      error: r.ok ? null : (r.data && r.data.error && r.data.error.status) || 'unknown',
    });
  }
  const sent = results.filter((x) => x.ok).length;
  if (sent > 0) {
    await firestorePatch(
      accessToken,
      projectId,
      'change_push_state/' + emailId,
      { lastHolidayMark: { stringValue: mark }, updatedAt: { timestampValue: new Date().toISOString() } },
      ['lastHolidayMark', 'updatedAt']
    );
  }
  return { today, tomorrow, holiday: names.join(', '), slot, deviceCount: devices.length, sent, pruned, results };
}

// 1:1-Port der App-Berechnung (core/bootstrap.js): Gauss-Osterformel + Liste + Bundesland-Filter.
// Muss inhaltlich identisch zur App bleiben (Charta: keine doppelte, ABWEICHENDE Logik).
function germanHolidaysFor(dateKey, state) {
  const year = parseInt(String(dateKey).slice(0, 4), 10);
  if (!year) return [];
  const pad = (n) => String(n).padStart(2, '0');
  const dk = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const addDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d0 = Math.floor(b / 4), e0 = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d0 - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e0 + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451), month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const e = new Date(year, month - 1, day, 12, 0, 0);
  const nov23 = new Date(year, 10, 23, 12, 0, 0);
  const offset = (nov23.getDay() + 4) % 7;
  const H = (date, name, states) => ({ date: dk(date), name, states: states || ['ALL'] });
  const list = [
    H(new Date(year, 0, 1, 12), 'Neujahr'),
    H(new Date(year, 0, 6, 12), 'Heilige Drei Könige', ['BW', 'BY', 'BY-AUGSBURG', 'ST']),
    H(new Date(year, 2, 8, 12), 'Internationaler Frauentag', ['BE', 'MV']),
    H(addDays(e, -2), 'Karfreitag'),
    H(addDays(e, 1), 'Ostermontag'),
    H(new Date(year, 4, 1, 12), 'Tag der Arbeit'),
    H(addDays(e, 39), 'Christi Himmelfahrt'),
    H(addDays(e, 50), 'Pfingstmontag'),
    H(addDays(e, 60), 'Fronleichnam', ['BW', 'BY', 'BY-AUGSBURG', 'HE', 'NW', 'RP', 'SL']),
    H(new Date(year, 7, 8, 12), 'Augsburger Friedensfest', ['BY-AUGSBURG']),
    H(new Date(year, 7, 15, 12), 'Mariä Himmelfahrt', ['BY', 'BY-AUGSBURG', 'SL']),
    H(new Date(year, 8, 20, 12), 'Weltkindertag', ['TH']),
    H(new Date(year, 9, 3, 12), 'Tag der Deutschen Einheit'),
    H(new Date(year, 9, 31, 12), 'Reformationstag', ['BB', 'MV', 'SN', 'ST', 'TH', 'HB', 'HH', 'NI', 'SH']),
    H(new Date(year, 10, 1, 12), 'Allerheiligen', ['BW', 'BY', 'BY-AUGSBURG', 'NW', 'RP', 'SL']),
    H(addDays(nov23, -offset), 'Buß- und Bettag', ['SN']),
    H(new Date(year, 11, 25, 12), '1. Weihnachtstag'),
    H(new Date(year, 11, 26, 12), '2. Weihnachtstag'),
  ];
  const target = String(dateKey).slice(0, 10);
  return list
    .filter((x) => x.date === target)
    .filter((x) => x.states.indexOf('ALL') !== -1 || state === 'ALL' || x.states.indexOf(state) !== -1)
    .map((x) => x.name);
}

// dateKey (YYYY-MM-DD) + n Tage, kalendersicher.
function berlinAddDays(dateKey, n) {
  const p = String(dateKey).split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/* ---------- Friseur-Erinnerung (Phase 7b) --------------------------------- */

async function handleFriseur(url, env) {
  if (!env.PUSH_TEST_SECRET) {
    return json({ error: 'gesperrt: Secret PUSH_TEST_SECRET ist nicht gesetzt.' }, 403);
  }
  if ((url.searchParams.get('secret') || '') !== env.PUSH_TEST_SECRET) {
    return json({ error: 'Falsches oder fehlendes secret.' }, 403);
  }
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    return json({ error: 'Secret FIREBASE_SERVICE_ACCOUNT fehlt.' }, 500);
  }
  let sa;
  try {
    sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    return json({ error: 'FIREBASE_SERVICE_ACCOUNT ist kein gueltiges JSON.' }, 500);
  }
  const projectId = sa.project_id;
  const email = (url.searchParams.get('email') || 'ak2191@gmx.de').toLowerCase();
  const force = url.searchParams.get('force') === '1';
  const slot = url.searchParams.get('slot') || 'manual';
  const accessToken = await getAccessToken(sa);
  const result = await sendFriseurReminder(accessToken, projectId, email, { force, slot });
  return json(result);
}

// Spiegelt die App-Regel (features/friseur/friseur.js, checkFriseurNotif):
// faellig, wenn seit dem letzten Friseur-Termin >= wochen*7 Tage vergangen sind;
// genau EINE Erinnerung pro letztem Termin (Dedupe-Marke = friseurLastDate).
async function sendFriseurReminder(accessToken, projectId, email, opts) {
  opts = opts || {};
  const force = !!opts.force;
  const slot = opts.slot || 'manual';
  const emailId = safeDocId(email);
  const today = berlinToday();

  const settingsDoc = await firestoreGetDoc(accessToken, projectId, 'change_settings/' + emailId);
  const f = settingsDoc && settingsDoc.fields;
  const dash = f && f.dashboard && f.dashboard.mapValue && f.dashboard.mapValue.fields;

  // Feature an? (Tracker-Schalter)
  const enabled = dash && dash.friseurEnabled && dash.friseurEnabled.booleanValue === true;
  if (!enabled) return { skipped: 'friseur-tracker-aus', today, slot };

  // Kontroll-Ebene 2: notificationPrefs.friseur (fehlt -> an)
  const prefs = f && f.notificationPrefs;
  const fr = prefs && prefs.mapValue && prefs.mapValue.fields && prefs.mapValue.fields.friseur;
  if (fr && fr.booleanValue === false) return { skipped: 'typ-friseur-aus', today, slot };

  const lastDate = (dash.friseurLastDate && dash.friseurLastDate.stringValue) || '';
  if (!lastDate) return { skipped: 'kein-letzter-termin', today, slot };
  const weeks = parseInt(dash.friseurWeeks && dash.friseurWeeks.integerValue, 10) || 3;
  const days = daysBetween(lastDate, today);
  if (days < weeks * 7) return { skipped: 'noch-nicht-faellig', today, slot, lastDate, days, dueAfterDays: weeks * 7 };

  // Dedupe: eine Erinnerung pro letztem Termin (wie die App: friseur_notif_+lastDate)
  if (!force) {
    const state = await firestoreGetDoc(accessToken, projectId, 'change_push_state/' + emailId);
    const done = state && state.fields && state.fields.lastFriseurMark && state.fields.lastFriseurMark.stringValue;
    if (done === lastDate) return { skipped: 'fuer-diesen-termin-bereits-erinnert', today, slot, lastDate };
  }

  const devices = await listDevices(accessToken, projectId, emailId);
  if (!devices.length) return { skipped: 'kein-aktives-geraet', today, slot };

  const title = 'Change';
  const body = 'Dein letzter Friseur-Termin war vor ' + days + ' Tagen. Zeit für einen neuen Termin?';
  const results = [];
  const pruned = [];
  for (const dev of devices) {
    const r = await fcmSend(accessToken, projectId, dev.token, title, body);
    if (!r.ok && r.status === 404 && dev.name) {
      try { await firestoreDeleteByName(accessToken, dev.name); pruned.push(dev.deviceId || null); } catch (e) {}
    }
    results.push({
      device: dev.deviceId || null,
      ok: r.ok,
      status: r.status,
      error: r.ok ? null : (r.data && r.data.error && r.data.error.status) || 'unknown',
    });
  }
  const sent = results.filter((x) => x.ok).length;
  if (sent > 0) {
    await firestorePatch(
      accessToken,
      projectId,
      'change_push_state/' + emailId,
      { lastFriseurMark: { stringValue: lastDate }, updatedAt: { timestampValue: new Date().toISOString() } },
      ['lastFriseurMark', 'updatedAt']
    );
  }
  return { today, slot, lastDate, days, deviceCount: devices.length, sent, pruned, results };
}

// Volle Tage zwischen zwei dateKeys (YYYY-MM-DD), kalendersicher.
function daysBetween(fromKey, toKey) {
  const p = (k) => { const a = String(k).split('-').map(Number); return new Date(a[0], a[1] - 1, a[2], 12, 0, 0); };
  return Math.floor((p(toKey) - p(fromKey)) / 86400000);
}

// Heutiges Datum als YYYY-MM-DD in Europe/Berlin (DST-fest).
function berlinToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Aktuelle Stunde (0-23) in Europe/Berlin (DST-fest).
function berlinHour() {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    hour12: false,
  }).format(new Date());
  return parseInt(h, 10);
}

// Alle Nutzer mit Push-Token (aus den Eltern-Markern in change_push_tokens).
async function listPushUsers(accessToken, projectId) {
  const docs = await firestoreListDocs(accessToken, projectId, 'change_push_tokens');
  const emails = [];
  docs.forEach((doc) => {
    const f = doc.fields || {};
    const email = (f.email && f.email.stringValue) || '';
    if (email) emails.push(String(email).toLowerCase());
  });
  return emails;
}

// Loescht ein Dokument anhand seines vollen Firestore-Namens (fuer tote Tokens).
async function firestoreDeleteByName(accessToken, name) {
  await fetch('https://firestore.googleapis.com/v1/' + name, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + accessToken },
  });
}

/* ---------- Helfer ------------------------------------------------------- */

function safeDocId(value) {
  return String(value || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_') || 'unknown';
}

function b64url(str) {
  return b64urlBytes(new TextEncoder().encode(str));
}

function b64urlBytes(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function text(str, status) {
  return new Response(str, {
    status: status || 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
