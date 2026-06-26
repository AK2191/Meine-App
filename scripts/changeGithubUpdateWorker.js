/**
 * Cloudflare Worker · Change GitHub Update Service
 * v2 — mit /commits und /rollback Endpoints
 */
const REPOSITORY = 'AK2191/Meine-App';
const BRANCH = 'main';
const MAX_ZIP_BYTES = 8 * 1024 * 1024;
const FIREBASE_PROJECT_ID = 'meine-app-4ea9e';
const FIREBASE_ISSUER = 'https://securetoken.google.com/' + FIREBASE_PROJECT_ID;
const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const ADMIN_EMAILS = ['ak2191@gmx.de'];
const ALLOWED_ORIGINS = [
  'https://ak2191.github.io',
  'https://meine-app-4ea9e.web.app',
  'https://meine-app-4ea9e.firebaseapp.com',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173'
];

class HttpError extends Error {
  constructor(status, message){
    super(message);
    this.status = status;
  }
}

function corsHeaders(request){
  const origin = request && request.headers ? request.headers.get('origin') : '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'vary': 'Origin'
  };
}

function json(data, status = 200, request){
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(request)
    }
  });
}
function base64Url(input){
  let bytes;
  if(input instanceof ArrayBuffer) bytes = new Uint8Array(input);
  else if(input instanceof Uint8Array) bytes = input;
  else bytes = new TextEncoder().encode(String(input));
  let binary = '';
  for(let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function base64UrlToBytes(input){
  const clean = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = clean + '='.repeat((4 - clean.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for(let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function decodeJwtJson(part){
  return JSON.parse(new TextDecoder('utf-8').decode(base64UrlToBytes(part)));
}
async function verifyFirebaseIdToken(idToken){
  const parts = String(idToken || '').split('.');
  if(parts.length !== 3) throw new HttpError(401, 'Firebase-ID-Token fehlt oder ist ungueltig.');
  const header = decodeJwtJson(parts[0]);
  const payload = decodeJwtJson(parts[1]);
  if(header.alg !== 'RS256' || !header.kid) throw new HttpError(401, 'Firebase-ID-Token hat eine ungueltige Signatur.');

  const jwksResponse = await fetch(FIREBASE_JWKS_URL, {cache: 'no-store'});
  if(!jwksResponse.ok) throw new HttpError(503, 'Firebase-Schluessel konnten nicht geladen werden.');
  const jwks = await jwksResponse.json();
  const key = Array.isArray(jwks.keys) ? jwks.keys.find((item) => item.kid === header.kid) : null;
  if(!key) throw new HttpError(401, 'Firebase-ID-Token-Schluessel ist unbekannt.');
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    key,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + '.' + parts[1])
  );
  if(!ok) throw new HttpError(401, 'Firebase-ID-Token-Signatur ist ungueltig.');

  const now = Math.floor(Date.now() / 1000);
  if(payload.aud !== FIREBASE_PROJECT_ID || payload.iss !== FIREBASE_ISSUER) throw new HttpError(401, 'Firebase-ID-Token gehoert nicht zu diesem Projekt.');
  if(!payload.exp || payload.exp < now) throw new HttpError(401, 'Firebase-ID-Token ist abgelaufen.');
  if(!payload.email) throw new HttpError(401, 'Firebase-ID-Token enthaelt keine E-Mail.');
  return payload;
}
async function requireAdmin(request){
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if(!match) throw new HttpError(401, 'Firebase-Admin-Anmeldung fehlt.');
  const payload = await verifyFirebaseIdToken(match[1]);
  const email = String(payload.email || '').trim().toLowerCase();
  if(!ADMIN_EMAILS.includes(email)) throw new HttpError(403, 'GitHub-Updates sind nur fuer Admins freigegeben.');
  return payload;
}
function pemToDer(pem){
  const clean = String(pem || '')
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for(let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function derLength(length){
  if(length < 128) return [length];
  const out = [];
  while(length > 0){ out.unshift(length & 255); length >>= 8; }
  return [0x80 | out.length, ...out];
}
function derSeq(parts){
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  return new Uint8Array([0x30, ...derLength(total), ...parts.flatMap((part) => Array.from(part))]);
}
function derOctet(bytes){
  return new Uint8Array([0x04, ...derLength(bytes.length), ...bytes]);
}
function pkcs1ToPkcs8(pkcs1){
  const rsaAlgorithmIdentifier = new Uint8Array([
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00
  ]);
  const version = new Uint8Array([0x02, 0x01, 0x00]);
  return derSeq([version, rsaAlgorithmIdentifier, derOctet(pkcs1)]);
}
async function signJwt(env){
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat: now - 60, exp: now + 540, iss: String(env.GITHUB_APP_ID) };
  const unsigned = base64Url(JSON.stringify(header)) + '.' + base64Url(JSON.stringify(payload));
  const pem = String(env.GITHUB_PRIVATE_KEY || '').trim();
  let keyBytes = pemToDer(pem);
  if(/BEGIN RSA PRIVATE KEY/.test(pem)) keyBytes = pkcs1ToPkcs8(keyBytes);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  return unsigned + '.' + base64Url(sig);
}
async function githubFetch(path, options, token){
  const response = await fetch('https://api.github.com' + path, {
    ...options,
    headers: {
      'accept': 'application/vnd.github+json',
      'authorization': `Bearer ${token}`,
      'user-agent': 'Change-GitHub-Update-Service',
      'x-github-api-version': '2022-11-28',
      ...(options && options.headers ? options.headers : {})
    }
  });
  const text = await response.text();
  let body = null;
  try{ body = text ? JSON.parse(text) : null; }catch(e){ body = { raw: text }; }
  if(!response.ok){
    throw new Error((body && body.message) || `GitHub API Fehler ${response.status}`);
  }
  return body;
}
async function getInstallationToken(env){
  const jwt = await signJwt(env);
  const body = await githubFetch(`/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, { method: 'POST' }, jwt);
  if(!body || !body.token) throw new Error('GitHub Installation Token konnte nicht erzeugt werden.');
  return body.token;
}
function safeZipName(fileName, targetVersion){
  const base = String(fileName || '').split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '-');
  const version = String(targetVersion || '').replace(/[^0-9.]/g, '');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = base && base.toLowerCase().endsWith('.zip') ? base : `change-update-${version || stamp}.zip`;
  return `${stamp}-${name}`.slice(0, 180);
}
function versionParts(value){
  return String(value || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
}
function compareVersions(a, b){
  const av = versionParts(a); const bv = versionParts(b);
  for(let i = 0; i < Math.max(av.length, bv.length); i++){
    const left = av[i] || 0; const right = bv[i] || 0;
    if(left > right) return 1;
    if(left < right) return -1;
  }
  return 0;
}
function decodeBase64Utf8(value){
  const clean = String(value || '').replace(/\s+/g, '');
  if(!clean) return '';
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for(let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}
function appVersionFromText(text){
  const match = String(text || '').match(/APP_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/);
  return match ? match[1] : '';
}
/* NEU: Echten GitHub Pages Build-Status abfragen statt Live-Datei zu raten */
async function getPagesDeploymentStatus(token, sinceSha){
  try{
    const body = await githubFetch(`/repos/${REPOSITORY}/pages/builds/latest`, { method: 'GET' }, token);
    const status = body && body.status ? String(body.status) : '';
    const commitSha = body && body.commit ? String(body.commit) : '';
    return {
      available: true,
      status, // 'built' | 'building' | 'errored' | 'queued'
      commitSha,
      matchesCommit: !!(sinceSha && commitSha && commitSha === sinceSha),
      error: body && body.error && body.error.message ? body.error.message : '',
      updatedAt: body && body.updated_at ? body.updated_at : ''
    };
  }catch(error){
    // Kein Pages-Zugriff (Berechtigung fehlt) oder Pages nicht ueber Branch-Deployment konfiguriert.
    return { available: false, status: '', commitSha: '', matchesCommit: false, error: error && error.message ? error.message : '' };
  }
}
async function getBranchStatus(token, targetVersion){
  let branchSha = '';
  let version = '';
  try{
    const ref = await githubFetch(`/repos/${REPOSITORY}/git/ref/heads/${BRANCH}`, { method: 'GET' }, token);
    branchSha = ref && ref.object ? ref.object.sha || '' : '';
  }catch(error){}
  try{
    const path = encodeURIComponent('features/pollen/pollenView.js').replace(/%2F/g, '/');
    const file = await githubFetch(`/repos/${REPOSITORY}/contents/${path}?ref=${encodeURIComponent(BRANCH)}`, { method: 'GET' }, token);
    version = appVersionFromText(decodeBase64Utf8(file && file.content));
  }catch(error){}
  return {
    headSha: branchSha,
    version,
    targetVersion: String(targetVersion || ''),
    targetVersionCommitted: !!(targetVersion && version && compareVersions(version, targetVersion) >= 0)
  };
}

async function getRepositoryFiles(env, request){
  await requireAdmin(request);
  const token = await getInstallationToken(env);
  const body = await githubFetch(`/repos/${REPOSITORY}/git/trees/${BRANCH}?recursive=1`, { method: 'GET' }, token);
  const files = Array.isArray(body && body.tree)
    ? body.tree.filter((item) => item && item.type === 'blob' && item.path).map((item) => String(item.path).replace(/\\/g, '/')).sort()
    : [];
  return json({ ok: true, files, count: files.length }, 200, request);
}

async function getLatestWorkflowStatus(env, commitSha, targetVersion, request){
  await requireAdmin(request);
  const token = await getInstallationToken(env);
  const qs = new URLSearchParams({ per_page: '10', branch: BRANCH });
  if(commitSha) qs.set('head_sha', String(commitSha));
  const body = await githubFetch(`/repos/${REPOSITORY}/actions/runs?${qs.toString()}`, { method: 'GET' }, token);
  const runs = Array.isArray(body && body.workflow_runs) ? body.workflow_runs : [];
  const run = runs.find((item) => String(item && item.name || '').includes('Change ZIP Update')) || runs[0] || null;
  const branch = await getBranchStatus(token, targetVersion);
  const pages = await getPagesDeploymentStatus(token, branch.headSha);
  return json({
    ok: true,
    run: run ? {
      id: run.id,
      name: run.name || '',
      status: run.status || '',
      conclusion: run.conclusion || '',
      htmlUrl: run.html_url || '',
      headSha: run.head_sha || '',
      createdAt: run.created_at || '',
      updatedAt: run.updated_at || ''
    } : null,
    branch,
    pages
  }, 200, request);
}

/* NEU: Letzte N Commits mit Version auslesen */
async function getCommitHistory(env, count, request){
  await requireAdmin(request);
  const token = await getInstallationToken(env);
  const n = Math.min(Math.max(parseInt(count) || 20, 1), 50); // Mehr laden um genug ZIP-Commits zu finden
  const body = await githubFetch(
    `/repos/${REPOSITORY}/commits?sha=${BRANCH}&per_page=${n}`,
    { method: 'GET' },
    token
  );
  const commits = Array.isArray(body) ? body : [];
  // Lese Version aus pollenView.js fuer jeden Commit
  // Nur ZIP-Update-Commits auswerten (erster Commit pro Version)
  const zipCommits = commits.filter(c => {
    const msg = (c.commit && c.commit.message || '').split('\n')[0];
    return /ZIP Update bereitstellen/i.test(msg);
  });
  const results = await Promise.all(zipCommits.map(async (commit) => {
    let version = '';
    try {
      const sha = commit.sha;
      const path = 'features/pollen/pollenView.js';
      const file = await githubFetch(
        `/repos/${REPOSITORY}/contents/${path}?ref=${encodeURIComponent(sha)}`,
        { method: 'GET' },
        token
      );
      version = appVersionFromText(decodeBase64Utf8(file && file.content));
    } catch(e) {}
    return {
      sha: commit.sha || '',
      shortSha: (commit.sha || '').slice(0, 7),
      message: (commit.commit && commit.commit.message || '').split('\n')[0].slice(0, 80),
      date: commit.commit && commit.commit.author && commit.commit.author.date || '',
      author: commit.commit && commit.commit.author && commit.commit.author.name || '',
      version
    };
  }));
  // Dedupliziere nach Version — nur ersten (neuesten) pro Version
  const seen = new Set();
  const unique = results.filter(c => {
    const key = c.version || c.sha;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return json({ ok: true, commits: unique }, 200, request);
}

/* NEU: Branch auf bestimmten Commit zuruecksetzen (force push) */
async function rollbackToCommit(env, payload, request){
  await requireAdmin(request);
  if(String(payload.secret || '') !== String(env.CHANGE_UPDATE_SECRET || '')){
    return json({ ok:false, message:'Freigabe-Code ist falsch.' }, 401, request);
  }
  const targetSha = String(payload.sha || '').trim();
  if(!targetSha || targetSha.length < 7){
    return json({ ok:false, message:'Kein gueltiger Commit-SHA angegeben.' }, 400, request);
  }
  const token = await getInstallationToken(env);
  // Verifiziere dass der Commit existiert
  let commitInfo = null;
  try {
    commitInfo = await githubFetch(`/repos/${REPOSITORY}/commits/${targetSha}`, { method: 'GET' }, token);
  } catch(e) {
    return json({ ok:false, message:'Commit nicht gefunden: ' + targetSha }, 404, request);
  }
  // Version des Ziel-Commits lesen, damit das Frontend weiss ob es ein Update oder Downgrade ist
  let targetVersion = '';
  try{
    const path = 'features/pollen/pollenView.js';
    const file = await githubFetch(`/repos/${REPOSITORY}/contents/${path}?ref=${encodeURIComponent(commitInfo.sha)}`, { method: 'GET' }, token);
    targetVersion = appVersionFromText(decodeBase64Utf8(file && file.content));
  }catch(e){}
  // Force-update den Branch auf diesen Commit
  await githubFetch(
    `/repos/${REPOSITORY}/git/refs/heads/${BRANCH}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sha: commitInfo.sha, force: true })
    },
    token
  );
  return json({
    ok: true,
    message: `Branch ${BRANCH} wurde auf Commit ${commitInfo.sha.slice(0,7)} zurueckgesetzt.`,
    sha: commitInfo.sha,
    commitSha: commitInfo.sha,
    shortSha: commitInfo.sha.slice(0,7),
    targetVersion,
    direction: 'rollback',
    commitMessage: commitInfo.commit && commitInfo.commit.message ? commitInfo.commit.message.split('\n')[0] : ''
  }, 200, request);
}

async function uploadZipToGitHub(env, payload, request){
  await requireAdmin(request);
  if(String(payload.secret || '') !== String(env.CHANGE_UPDATE_SECRET || '')){
    return json({ ok:false, message:'Freigabe-Code ist falsch.' }, 401, request);
  }
  const fileName = safeZipName(payload.fileName, payload.targetVersion);
  const contentBase64 = String(payload.contentBase64 || '').replace(/^data:.*?;base64,/, '');
  if(!contentBase64) return json({ ok:false, message:'ZIP-Inhalt fehlt.' }, 400, request);
  const byteLength = Math.floor(contentBase64.length * 3 / 4);
  if(byteLength > MAX_ZIP_BYTES) return json({ ok:false, message:'ZIP ist zu gross. Limit: 8 MB.' }, 413, request);
  const token = await getInstallationToken(env);
  const path = `updates/${fileName}`;
  const result = await githubFetch(`/repos/${REPOSITORY}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: `ZIP Update bereitstellen${payload.targetVersion ? ' v' + payload.targetVersion : ''}`,
      content: contentBase64,
      branch: BRANCH
    })
  }, token);
  return json({
    ok: true,
    message: 'ZIP wurde in updates/ abgelegt. GitHub Action startet automatisch.',
    path,
    commitSha: result && result.commit ? result.commit.sha : '',
    actionsUrl: `https://github.com/${REPOSITORY}/actions`
  }, 200, request);
}

export default {
  async fetch(request, env){
    if(request.method === 'OPTIONS') return json({ ok:true }, 200, request);
    try{
      const url = new URL(request.url);
      if(request.method === 'GET' && url.pathname === '/files'){
        return await getRepositoryFiles(env, request);
      }
      if(request.method === 'GET' && url.pathname === '/status'){
        return await getLatestWorkflowStatus(env, url.searchParams.get('commitSha') || '', url.searchParams.get('targetVersion') || '', request);
      }
      if(request.method === 'GET' && url.pathname === '/commits'){
        return await getCommitHistory(env, url.searchParams.get('count') || '10', request);
      }
      if(request.method === 'POST' && url.pathname === '/rollback'){
        const payload = await request.json();
        return await rollbackToCommit(env, payload, request);
      }
      if(request.method !== 'POST' || url.pathname !== '/upload'){
        return json({ ok:false, message:'Nur POST /upload, POST /rollback, GET /status, GET /commits oder GET /files ist erlaubt.' }, 404, request);
      }
      const payload = await request.json();
      return await uploadZipToGitHub(env, payload, request);
    }catch(error){
      return json({ ok:false, message:error && error.message ? error.message : 'Worker Fehler.' }, error && error.status ? error.status : 500, request);
    }
  }
};
