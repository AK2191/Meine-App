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
function findZip(){
  if(explicitZip){
    const full = path.resolve(repoRoot, explicitZip);
    if(!full.startsWith(repoRoot + path.sep)) fail('ZIP-Pfad liegt außerhalb des Repositorys.');
    if(!fs.existsSync(full)) fail(`ZIP nicht gefunden: ${explicitZip}`);
    return full;
  }
  const updateDir = path.join(repoRoot, 'updates');
  const zips = walk(updateDir).filter((file) => file.toLowerCase().endsWith('.zip'));
  if(!zips.length) fail('Keine ZIP in updates/ gefunden.');
  zips.sort((a,b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return zips[0];
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
  const bad = files.filter((file) => {
    if(file.includes('..')) return true;
    if(file.startsWith('.git/')) return true;
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

const zipPath = findZip();
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
fs.rmSync(tempDir, {recursive:true, force:true});
console.log(`ZIP Update vorbereitet: ${result.targetVersion}, ${result.files.length} Dateien.`);
