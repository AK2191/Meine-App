/**
 * Cloudflare Worker · Change GitHub Update Service
 *
 * Einsatz:
 * 1. In Cloudflare Worker-Code vollständig ersetzen.
 * 2. Secrets setzen:
 *    GITHUB_APP_ID, GITHUB_INSTALLATION_ID, GITHUB_PRIVATE_KEY, CHANGE_UPDATE_SECRET
 * 3. Die Change-App sendet geprüfte ZIPs an /upload.
 */
const REPOSITORY = 'AK2191/Meine-App';
const BRANCH = 'main';
const MAX_ZIP_BYTES = 8 * 1024 * 1024;

function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
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

async function getRepositoryFiles(env){
  const token = await getInstallationToken(env);
  const body = await githubFetch(`/repos/${REPOSITORY}/git/trees/${BRANCH}?recursive=1`, { method: 'GET' }, token);
  const files = Array.isArray(body && body.tree)
    ? body.tree.filter((item) => item && item.type === 'blob' && item.path).map((item) => String(item.path).replace(/\\/g, '/')).sort()
    : [];
  return json({ ok: true, files, count: files.length });
}

async function getLatestWorkflowStatus(env, commitSha, targetVersion){
  const token = await getInstallationToken(env);
  const qs = new URLSearchParams({ per_page: '10', branch: BRANCH });
  if(commitSha) qs.set('head_sha', String(commitSha));
  const body = await githubFetch(`/repos/${REPOSITORY}/actions/runs?${qs.toString()}`, { method: 'GET' }, token);
  const runs = Array.isArray(body && body.workflow_runs) ? body.workflow_runs : [];
  const run = runs.find((item) => String(item && item.name || '').includes('Change ZIP Update')) || runs[0] || null;
  const branch = await getBranchStatus(token, targetVersion);
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
    branch
  });
}

async function uploadZipToGitHub(env, payload){
  if(String(payload.secret || '') !== String(env.CHANGE_UPDATE_SECRET || '')){
    return json({ ok:false, message:'Freigabe-Code ist falsch.' }, 401);
  }
  const fileName = safeZipName(payload.fileName, payload.targetVersion);
  const contentBase64 = String(payload.contentBase64 || '').replace(/^data:.*?;base64,/, '');
  if(!contentBase64) return json({ ok:false, message:'ZIP-Inhalt fehlt.' }, 400);
  const byteLength = Math.floor(contentBase64.length * 3 / 4);
  if(byteLength > MAX_ZIP_BYTES) return json({ ok:false, message:'ZIP ist zu groß. Limit: 8 MB.' }, 413);
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
  });
}
export default {
  async fetch(request, env){
    if(request.method === 'OPTIONS') return json({ ok:true });
    try{
      const url = new URL(request.url);
      if(request.method === 'GET' && url.pathname === '/files'){
        return await getRepositoryFiles(env);
      }
      if(request.method === 'GET' && url.pathname === '/status'){
        return await getLatestWorkflowStatus(env, url.searchParams.get('commitSha') || '', url.searchParams.get('targetVersion') || '');
      }
      if(request.method !== 'POST' || url.pathname !== '/upload'){
        return json({ ok:false, message:'Nur POST /upload, GET /status oder GET /files ist erlaubt.' }, 404);
      }
      const payload = await request.json();
      return await uploadZipToGitHub(env, payload);
    }catch(error){
      return json({ ok:false, message:error && error.message ? error.message : 'Worker Fehler.' }, 500);
    }
  }
};
