#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const repoRoot = process.cwd();
const explicitZip = (process.argv[2] || '').trim();

function fail(message){
  console.error('FEHLER:', message);
  process.exit(1);
}
function readText(file){
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}
function versionParts(value){
  return String(value || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
}
function compareVersions(a, b){
  const av = versionParts(a); const bv = versionParts(b);
  for(let i=0;i<Math.max(av.length, bv.length);i++){
    const left = av[i] || 0; const right = bv[i] || 0;
    if(left > right) return 1;
    if(left < right) return -1;
  }
  return 0;
}
function collectVersions(text){
  const found = [];
  text = String(text || '');
  for(const re of [
    /##\s+Version\s+(\d+\.\d+\.\d+)/g,
    /APP_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/g,
    /sichtbare App-Version wurde auf [`'"]?(\d+\.\d+\.\d+)[`'"]?/g,
  ]){
    let match;
    while((match = re.exec(text))) found.push(match[1]);
  }
  return found;
}
function maxVersion(values, prefix){
  let best = '';
  for(const raw of values || []){
    const value = String(raw || '').trim();
    if(!/^\d+\.\d+\.\d+$/.test(value)) continue;
    if(prefix && !value.startsWith(prefix)) continue;
    if(!best || compareVersions(value, best) > 0) best = value;
  }
  return best;
}
function walk(dir){
  const result = [];
  if(!fs.existsSync(dir)) return result;
  for(const entry of fs.readdirSync(dir, {withFileTypes:true})){
    const full = path.join(dir, entry.name);
    if(entry.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}
function eventZipCandidates(){
  const eventPath = process.env.GITHUB_EVENT_PATH || '';
  if(!eventPath || !fs.existsSync(eventPath)) return [];
  try{
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const candidates = [];
    const add = (file) => {
      const value = String(file || '').replace(/\\/g, '/');
      if(/^updates\/[^/]+\.zip$/i.test(value) && !candidates.includes(value)) candidates.push(value);
    };
    add(event?.head_commit?.added?.find((file) => /\.zip$/i.test(file)));
    add(event?.head_commit?.modified?.find((file) => /\.zip$/i.test(file)));
    for(const commit of event?.commits || []){
      for(const file of commit.added || []) add(file);
      for(const file of commit.modified || []) add(file);
    }
    return candidates;
  }catch(error){
    console.warn('WARNUNG: GitHub Event konnte nicht gelesen werden:', error.message);
    return [];
  }
}
async function downloadGitHubZip(relativePath){
  const token = process.env.GITHUB_TOKEN || '';
  const repository = process.env.GITHUB_REPOSITORY || '';
  const ref = process.env.GITHUB_SHA || 'main';
  if(!token || !repository) return null;
  const apiPath = relativePath.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${repository}/contents/${apiPath}?ref=${encodeURIComponent(ref)}`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'Change-ZIP-Update-Action',
      'x-github-api-version': '2022-11-28'
    }
  });
  if(!response.ok){
    console.warn(`WARNUNG: ZIP konnte nicht über GitHub API geladen werden (${response.status}).`);
    return null;
  }
  const body = await response.json();
  if(!body || body.type !== 'file' || !body.content) return null;
  const localPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(localPath), {recursive:true});
  fs.writeFileSync(localPath, Buffer.from(String(body.content).replace(/\s+/g, ''), 'base64'));
  console.log(`ZIP über GitHub API nachgeladen: ${relativePath}`);
  return localPath;
}
async function findZip(){
  if(explicitZip){
    const full = path.resolve(repoRoot, explicitZip);
    if(!full.startsWith(repoRoot + path.sep)) fail('ZIP-Pfad liegt außerhalb des Repositorys.');
    if(!fs.existsSync(full)){
      const downloaded = await downloadGitHubZip(explicitZip);
      if(downloaded && fs.existsSync(downloaded)) return downloaded;
      fail(`ZIP nicht gefunden: ${explicitZip}`);
    }
    return full;
  }

  const updateDir = path.join(repoRoot, 'updates');
  const localZips = walk(updateDir).filter((file) => file.toLowerCase().endsWith('.zip'));
  if(localZips.length){
    localZips.sort((a,b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return localZips[0];
  }

  for(const candidate of eventZipCandidates()){
    const downloaded = await downloadGitHubZip(candidate);
    if(downloaded && fs.existsSync(downloaded)) return downloaded;
  }

  fail('Keine ZIP in updates/ gefunden.');
}
function findExtractRoot(tempDir){
  const entries = fs.readdirSync(tempDir).filter((name) => !name.startsWith('__MACOSX'));
  if(entries.length === 1){
    const only = path.join(tempDir, entries[0]);
    if(fs.statSync(only).isDirectory()) return only;
  }
  return tempDir;
}
function assertSafeTree(srcRoot){
  const files = walk(srcRoot).map((file) => path.relative(srcRoot, file).replace(/\\/g, '/'));
  if(!files.includes('CLAUDE.md')) fail('CLAUDE.md fehlt in der ZIP.');
  if(!files.includes('CHANGELOG.md')) fail('CHANGELOG.md fehlt in der ZIP.');
  const bad = files.filter((file) => {
    if(file.includes('..')) return true;
    if(file.startsWith('.git/')) return true;
    if(file.startsWith('updates/') && file.toLowerCase().endsWith('.zip')) return true;
    return false;
  });
  if(bad.length) fail(`Unsichere Pfade gefunden: ${bad.slice(0,5).join(', ')}`);
  const currentText = readText(path.join(repoRoot, 'features/pollen/pollenView.js')) + '\n' + readText(path.join(repoRoot, 'features/settings/settingsPanel.js'));
  const currentVersion = maxVersion(collectVersions(currentText)) || '0.0.0';
  const prefix = versionParts(currentVersion).slice(0,2).join('.') + '.';
  const targetTexts = [
    readText(path.join(srcRoot, 'CLAUDE.md')),
    readText(path.join(srcRoot, 'CHANGELOG.md')),
    readText(path.join(srcRoot, 'features/pollen/pollenView.js')),
    readText(path.join(srcRoot, 'features/settings/settingsPanel.js')),
  ].join('\n');
  const targetVersion = maxVersion(collectVersions(targetTexts), prefix);
  if(!targetVersion) fail('Keine passende Zielversion gefunden.');
  if(compareVersions(targetVersion, currentVersion) <= 0) fail(`Zielversion ist nicht höher: ${currentVersion} → ${targetVersion}`);
  const claude = readText(path.join(srcRoot, 'CLAUDE.md'));
  if(!claude.includes(`## Version ${targetVersion}`)) fail(`CLAUDE.md enthält keinen Eintrag für ${targetVersion}.`);
  const changelog = readText(path.join(srcRoot, 'CHANGELOG.md'));
  if(!changelog.includes(targetVersion)) fail(`CHANGELOG.md enthält keinen Eintrag für ${targetVersion}.`);
  console.log(`Version geprüft: ${currentVersion} → ${targetVersion}`);
  return { currentVersion, targetVersion, files };
}
function removeOldAppFiles(){
  const keep = new Set(['.git', '.github', 'scripts', 'updates']);
  for(const entry of fs.readdirSync(repoRoot)){
    if(keep.has(entry)) continue;
    fs.rmSync(path.join(repoRoot, entry), {recursive:true, force:true});
  }
}
function copyDir(src, dest){
  fs.mkdirSync(dest, {recursive:true});
  for(const entry of fs.readdirSync(src, {withFileTypes:true})){
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if(entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const zipPath = await findZip();
console.log(`Nutze ZIP: ${path.relative(repoRoot, zipPath)}`);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'change-zip-'));
execFileSync('unzip', ['-q', zipPath, '-d', tempDir], {stdio:'inherit'});
const srcRoot = findExtractRoot(tempDir);
const result = assertSafeTree(srcRoot);
removeOldAppFiles();
copyDir(srcRoot, repoRoot);
for(const zip of walk(path.join(repoRoot, 'updates')).filter((file) => file.toLowerCase().endsWith('.zip'))){
  fs.rmSync(zip, {force:true});
}
fs.writeFileSync(path.join(repoRoot, '.change-update-version'), result.targetVersion + '\n', 'utf8');
fs.rmSync(tempDir, {recursive:true, force:true});
console.log(`ZIP Update vorbereitet: ${result.targetVersion}, ${result.files.length} Dateien.`);
