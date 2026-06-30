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
      return text('change-push-worker bereit.', 200);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, 500);
    }
  },

  // Cron-Einstieg (Phase 5). Cloudflare ruft das nach Zeitplan auf.
  // Cron laeuft in UTC; wir handeln nur, wenn es in Europe/Berlin 08:00 oder 13:00 ist
  // (DST-fest). Schedule daher in Cloudflare: "0 6,7,11,12 * * *".
  async scheduled(event, env, ctx) {
    try {
      if (!env.FIREBASE_SERVICE_ACCOUNT) return;
      const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
      const projectId = sa.project_id;
      const hour = berlinHour();
      const slot = hour === 8 ? '08' : hour === 13 ? '13' : null;
      if (!slot) return; // Cron feuerte ausserhalb der Zielzeiten (nur DST-Puffer)
      const accessToken = await getAccessToken(sa);
      const users = await listPushUsers(accessToken, projectId);
      for (const email of users) {
        try {
          await sendChallengeReminder(accessToken, projectId, email, { slot });
        } catch (e) {
          // Ein Fehler bei einem Nutzer darf den restlichen Lauf nicht stoppen.
        }
      }
    } catch (e) {
      // Im Cron niemals werfen.
    }
  },
};

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
          notification: { title, body },
          webpush: {
            notification: {
              icon: '/icons/icon-change-192.png',
              badge: '/icons/icon-change-192.png',
            },
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
