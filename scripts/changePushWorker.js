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
      return text('change-push-worker bereit.', 200);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, 500);
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

/* ---------- Firestore: Geraete-Tokens lesen ------------------------------ */

async function listDevices(accessToken, projectId, emailDocId) {
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    projectId +
    '/databases/(default)/documents/change_push_tokens/' +
    emailDocId +
    '/devices';
  const resp = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
  const data = await resp.json();
  const out = [];
  (data.documents || []).forEach((doc) => {
    const f = doc.fields || {};
    const token = f.token && f.token.stringValue;
    // pushEnabled fehlt -> als true werten (Altbestand); explizit false -> aus
    const enabled = !(f.pushEnabled && f.pushEnabled.booleanValue === false);
    const deviceId = f.deviceId && f.deviceId.stringValue;
    if (token && enabled) out.push({ token, deviceId });
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
