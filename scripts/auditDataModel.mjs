#!/usr/bin/env node
/* Non-destructive data model audit for Change.
 * This script audits source references and can validate a JSON localStorage export.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const model = require(path.join(repoRoot, 'core/data/dataModel.js'));

function walk(dir, out = []){
  for(const entry of fs.readdirSync(dir, {withFileTypes:true})){
    if(entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if(entry.isDirectory()) walk(full, out);
    else if(/\.(js|mjs|html|rules)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function unique(list){ return Array.from(new Set(list)).sort(); }
function rel(file){ return path.relative(repoRoot, file).replace(/\\/g, '/'); }
function isStorageKeyCandidate(key){
  return !!key && !/[\s${}]/.test(key);
}
function parseArgs(argv){
  const args = {json:false, storageExport:''};
  for(let i = 2; i < argv.length; i++){
    const arg = argv[i];
    if(arg === '--json') args.json = true;
    else if(arg === '--storage-export') args.storageExport = argv[++i] || '';
  }
  return args;
}

function makeStorageFromObject(obj){
  const map = new Map(Object.entries(obj || {}).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
  return {
    get length(){ return map.size; },
    key(index){ return Array.from(map.keys())[index] || null; },
    getItem(key){ return map.has(key) ? map.get(key) : null; },
    setItem(key, value){ map.set(key, String(value)); },
    removeItem(key){ map.delete(key); }
  };
}

function sourceAudit(){
  const files = walk(repoRoot);
  const storageKeys = [];
  const firestoreCollections = [];
  const runtimeFilesTouchedByData = [];
  const storageCallPattern = /(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*['"`]([^'"`]+)['"`]\s*[,)]|(?:readJson|writeJson|readRaw|writeRaw|appRead|appWrite|ls|lsDel)\(\s*['"`]([^'"`]+)['"`]\s*[,)]/g;
  const storageLiteralPattern = /['"`]((?:change_v\d+_[A-Za-z0-9_]+|change_google_sync_enabled|change_google_events_cache|change_push_enabled|calendar_settings|events|challenges|challenge_completions|challengeCompletions|challenge_players|challengePlayers|user_info|user_info_safe|user_email|fcm_token|push_enabled|live_sync_enabled|database_sync_enabled|auto_challenges_enabled|auto_challenge_count|challenge_difficulty|holiday_state|holiday_notifications|urlaub_[a-z0-9_]+|birthdays_enabled|birthday_notification_days))['"`]/g;
  const collectionPattern = /collection\(\s*['"`](change_[A-Za-z0-9_]+)['"`]\s*\)|match\s+\/(change_[A-Za-z0-9_]+)/g;

  for(const file of files){
    const text = fs.readFileSync(file, 'utf8');
    let hasDataRef = false;
    for(const match of text.matchAll(storageCallPattern)){
      storageKeys.push(match[1] || match[2]);
      hasDataRef = true;
    }
    for(const match of text.matchAll(storageLiteralPattern)){
      storageKeys.push(match[1]);
      hasDataRef = true;
    }
    for(const match of text.matchAll(collectionPattern)){
      firestoreCollections.push(match[1] || match[2]);
      hasDataRef = true;
    }
    if(hasDataRef && !rel(file).startsWith('docs/')) runtimeFilesTouchedByData.push(rel(file));
  }
  return {
    dataModelVersion: model.version,
    storageKeys: unique(storageKeys.filter(isStorageKeyCandidate)),
    firestoreCollections: unique(firestoreCollections),
    runtimeFilesWithDataRefs: unique(runtimeFilesTouchedByData),
    canonicalKeys: model.canonicalKeys,
    legacyKeys: model.legacyKeys,
    cacheKeys: model.cacheKeys,
    neverDeleteKeys: model.neverDeleteKeys
  };
}

function loadStorageAudit(file){
  if(!file) return null;
  const full = path.resolve(process.cwd(), file);
  const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
  const storage = makeStorageFromObject(parsed);
  return model.auditStorage(storage, {includeData:false});
}

function printHuman(result){
  console.log('Change data model audit');
  console.log('Version:', result.dataModelVersion);
  console.log('');
  console.log('Firestore collections:');
  result.firestoreCollections.forEach(name => console.log('  - ' + name));
  console.log('');
  console.log('Canonical localStorage keys:');
  Object.entries(result.canonicalKeys).forEach(([group, key]) => console.log('  - ' + group + ': ' + key));
  console.log('');
  console.log('Legacy localStorage keys still referenced:', result.storageKeys.filter(key => {
    return Object.values(result.legacyKeys).some(list => list.includes(key));
  }).length);
  console.log('');
  console.log('Files with data references:', result.runtimeFilesWithDataRefs.length);
  if(result.storageExportAudit){
    console.log('');
    console.log('Storage export counts:');
    Object.entries(result.storageExportAudit.counts).forEach(([key, value]) => console.log('  - ' + key + ': ' + value));
    console.log('Legacy keys present:', result.storageExportAudit.keys.legacyPresent.join(', ') || 'none');
    console.log('Cache keys present:', result.storageExportAudit.keys.cachePresent.join(', ') || 'none');
  }
}

const args = parseArgs(process.argv);
const result = sourceAudit();
const storageExportAudit = loadStorageAudit(args.storageExport);
if(storageExportAudit) result.storageExportAudit = storageExportAudit;

if(args.json) console.log(JSON.stringify(result, null, 2));
else printHuman(result);
