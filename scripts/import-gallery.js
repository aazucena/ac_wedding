// scripts/import-gallery.js
// Batch-import the wedding photos in tmp/gallery/<Folder>/ into the Directus gallery collection.
// Each folder name decides the category (and the B&W flag); everything is created as `pending`.
//
// Usage (requires DIRECTUS_URL + DIRECTUS_ADMIN_TOKEN in the shell or .env.local):
//   pnpm gallery:import                         dry run — prints the plan, uploads nothing
//   pnpm gallery:import -- --upload             upload everything not already in the manifest
//   pnpm gallery:import -- --upload --limit=10  rehearsal with the first 10 photos
//   pnpm gallery:import -- --upload --only=Ceremony
//   pnpm gallery:import -- --rollback           delete exactly what the manifest lists

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, rmSync } from 'fs';
import { resolve, dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Load .env.local if present (pure fs, shell env wins) ───────────────────
const envPath = resolve(ROOT, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

// ── Args ───────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const flag     = name => args.includes(`--${name}`);
const option   = name => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const UPLOAD   = flag('upload');
const ROLLBACK = flag('rollback');
const LIMIT    = option('limit') ? Number(option('limit')) : Infinity;
const ONLY     = option('only');

const DIRECTUS_URL   = process.env.DIRECTUS_URL?.replace(/\/$/, '');
const DIRECTUS_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;
const GALLERY_DIR    = resolve(ROOT, args.find(a => !a.startsWith('--')) ?? 'tmp/gallery');
const MANIFEST_PATH  = join(GALLERY_DIR, '.import-manifest.json');
const FILE_FOLDER    = 'Gallery';
const BATCH_SIZE     = 3;

// ── Folder name → gallery fields ───────────────────────────────────────────
// Keys are normalised (lower-case, letters only) so "Couple_s Portrait" and
// "Couple's Portrait" both resolve. CATEGORY_ORDER is the display order on the site.
const normalise = name => name.toLowerCase().replace(/[^a-z]/g, '');

const CATEGORY_ORDER = ['preparation', 'details', 'ceremony', 'group_photos', 'portraits', 'reception'];
const FOLDER_MAP = {
  preparation:     { category: 'preparation',  bw: false },
  preperation:     { category: 'preparation',  bw: false },
  details:         { category: 'details',      bw: false },
  ceremony:        { category: 'ceremony',     bw: false },
  groupphotos:     { category: 'group_photos', bw: false },
  couplesportrait: { category: 'portraits',    bw: false },
  reception:       { category: 'reception',    bw: false },
  // B&W frames all fall inside the couple's portrait session.
  bw:              { category: 'portraits',    bw: true  },
};
const SKIP_FOLDERS = ['engagementsession']; // already imported

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// ── Build the plan from disk ───────────────────────────────────────────────
// Always returns every importable photo; --only / --limit are applied later so
// a photo's sort position is the same however the import is sliced.
function buildPlan() {
  const plan = [];
  const skipped = [];
  const unknown = [];

  for (const folder of readdirSync(GALLERY_DIR).sort()) {
    const dir = join(GALLERY_DIR, folder);
    if (!statSync(dir).isDirectory()) continue;

    const key = normalise(folder);
    if (SKIP_FOLDERS.includes(key)) { skipped.push(folder); continue; }
    const fields = FOLDER_MAP[key];
    if (!fields) { unknown.push(folder); continue; }

    for (const filename of readdirSync(dir).sort()) {
      if (!(extname(filename).toLowerCase() in MIME)) continue;
      plan.push({
        rel: `${folder}/${filename}`,
        folder,
        filename,
        size: statSync(join(dir, filename)).size,
        ...fields,
      });
    }
  }

  if (unknown.length) {
    console.error(`❌  Unrecognised folder(s): ${unknown.join(', ')}`);
    console.error('   Add them to FOLDER_MAP or SKIP_FOLDERS in scripts/import-gallery.js');
    process.exit(1);
  }

  // Day order, then filename — so B&W portraits interleave with the colour ones.
  plan.sort((a, b) =>
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
    a.filename.localeCompare(b.filename));

  return { plan, skipped };
}

function printPlan(plan, skipped) {
  const mb = bytes => `${(bytes / 1e6).toFixed(1)} MB`;
  const byFolder = new Map();
  for (const p of plan) {
    const row = byFolder.get(p.folder) ?? { count: 0, size: 0, category: p.category, bw: p.bw };
    row.count++; row.size += p.size;
    byFolder.set(p.folder, row);
  }
  console.log(`\n📂  ${GALLERY_DIR}\n`);
  for (const [folder, row] of byFolder) {
    console.log(
      `  ${folder.padEnd(20)} ${String(row.count).padStart(4)}  ${mb(row.size).padStart(9)}` +
      `  → ${row.category}${row.bw ? ' (B&W)' : ''}`);
  }
  for (const folder of skipped) console.log(`  ${folder.padEnd(20)}       skipped`);
  console.log(`\n  ${'Total'.padEnd(20)} ${String(plan.length).padStart(4)}  ${mb(plan.reduce((n, p) => n + p.size, 0)).padStart(9)}\n`);
}

// ── Manifest (resume + undo list) ──────────────────────────────────────────
function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}
const saveManifest = manifest => writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

// ── Directus helpers ───────────────────────────────────────────────────────
const authHeader = () => ({ Authorization: `Bearer ${DIRECTUS_TOKEN}` });

async function api(method, path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: { ...authHeader(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : (await res.json()).data;
}

async function getMaxSort() {
  const data = await api('GET', '/items/gallery?aggregate[max]=sort');
  return Number(data?.[0]?.max?.sort ?? 0);
}

async function getFolderId() {
  const data = await api('GET', `/folders?filter[name][_eq]=${encodeURIComponent(FILE_FOLDER)}&limit=1`);
  if (!data?.[0]) throw new Error(`File folder "${FILE_FOLDER}" not found in Directus`);
  return data[0].id;
}

// ── Drop the Photoshop/IPTC block when Directus would misread it ──────────
// Directus looks for IPTC markers (1C 02) anywhere in the JPEG's APP13 block, so
// bytes inside the embedded Photoshop thumbnail can pass for a caption or headline
// full of NULs — which Postgres rejects ("invalid byte sequence ... 0x00").
// Only that block is removed; pixels, EXIF, XMP and the ICC profile are untouched.
const IPTC_TEXT_TYPES = [120, 105, 25]; // caption, headline, keywords → description, title, tags

function hasBogusIptc(segment) {
  for (let i = 0; i < segment.length - 5; i++) {
    if (segment[i] !== 0x1c || segment[i + 1] !== 0x02) continue;
    if (!IPTC_TEXT_TYPES.includes(segment[i + 2])) continue;
    const size = segment.readUInt16BE(i + 3);
    if (segment.subarray(i + 5, i + 5 + size).includes(0)) return true;
  }
  return false;
}

function stripBogusIptc(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer; // not a JPEG
  const keep = [buffer.subarray(0, 2)];
  let dropped = false;
  let i = 2;
  // Walk the header segments up to the start of the image data (SOS).
  while (i + 4 <= buffer.length && buffer[i] === 0xff && buffer[i + 1] !== 0xda) {
    const end = i + 2 + buffer.readUInt16BE(i + 2);
    const segment = buffer.subarray(i, end);
    if (buffer[i + 1] === 0xed && hasBogusIptc(segment)) dropped = true;
    else keep.push(segment);
    i = end;
  }
  if (!dropped) return buffer;
  keep.push(buffer.subarray(i));
  return Buffer.concat(keep);
}

// ── Upload a file to Directus /files ──────────────────────────────────────
async function uploadFile(entry, folderId) {
  const buffer = stripBogusIptc(readFileSync(join(GALLERY_DIR, entry.rel)));
  const form   = new FormData();
  // Directus only applies fields that arrive BEFORE the file part.
  form.append('folder', folderId);
  // Do NOT set Content-Type manually — fetch sets multipart boundary automatically
  form.append('file', new Blob([buffer], { type: MIME[extname(entry.filename).toLowerCase()] }), entry.filename);

  const res = await fetch(`${DIRECTUS_URL}/files`, { method: 'POST', headers: authHeader(), body: form });
  if (!res.ok) throw new Error(`/files ${res.status}: ${await res.text()}`);
  return (await res.json()).data.id;
}

// ── Upload + create the gallery record pointing to the uploaded file ──────
async function importOne(entry, sort, folderId) {
  const fileId = await uploadFile(entry, folderId);
  try {
    const item = await api('POST', '/items/gallery', {
      image: fileId, status: 'pending', category: entry.category, bw: entry.bw, sort,
    });
    return { fileId, itemId: item.id };
  } catch (err) {
    // Don't leave an orphaned file behind for the retry to duplicate.
    await api('DELETE', `/files/${fileId}`).catch(() => {});
    throw err;
  }
}

function requireTarget() {
  if (!DIRECTUS_URL) {
    console.error('❌  DIRECTUS_URL not set (shell env or .env.local)');
    process.exit(1);
  }
  if (!DIRECTUS_TOKEN) {
    console.error('❌  DIRECTUS_ADMIN_TOKEN not set (shell env or .env.local)');
    console.error('   Generate one: Directus → Settings → Access Tokens → Create Token');
    process.exit(1);
  }
}

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  if (answer.trim().toLowerCase() !== 'y') { console.log('Aborted.'); process.exit(0); }
}

// ── Rollback ───────────────────────────────────────────────────────────────
async function rollback() {
  requireTarget();
  const manifest = loadManifest();
  const entries = Object.entries(manifest?.done ?? {});
  if (!entries.length) { console.log('Nothing to roll back — manifest is empty.'); return; }
  if (manifest.target !== DIRECTUS_URL) {
    console.error(`❌  Manifest was created against ${manifest.target}, not ${DIRECTUS_URL}`);
    process.exit(1);
  }
  await confirm(`Delete ${entries.length} gallery items and their files from ${DIRECTUS_URL}?`);

  for (let i = 0; i < entries.length; i += 100) {
    const chunk = entries.slice(i, i + 100);
    await api('DELETE', '/items/gallery', chunk.map(([, e]) => e.itemId));
    await api('DELETE', '/files', chunk.map(([, e]) => e.fileId));
    // Forget each chunk as it goes, so an interrupted rollback can be re-run.
    for (const [rel] of chunk) delete manifest.done[rel];
    saveManifest(manifest);
    console.log(`  ✓  removed ${Math.min(i + 100, entries.length)}/${entries.length}`);
  }
  rmSync(MANIFEST_PATH);
  console.log('\n✅  Rolled back.\n');
}

// ── Main ──────────────────────────────────────────────────────────────────
if (ROLLBACK) {
  await rollback();
  process.exit(0);
}

if (!existsSync(GALLERY_DIR)) {
  console.error(`❌  Photo folder not found: ${GALLERY_DIR}`);
  const stray = args.find(a => !a.startsWith('--'));
  if (stray) console.error(`   "${stray}" was read as a folder path — did you mean --${stray}?`);
  process.exit(1);
}

const { plan, skipped } = buildPlan();
if (plan.length === 0) {
  console.error(`❌  No image files found in the sub-folders of ${GALLERY_DIR}`);
  process.exit(1);
}
if (ONLY && !plan.some(p => normalise(p.folder) === normalise(ONLY))) {
  console.error(`❌  --only=${ONLY} matches no folder in ${GALLERY_DIR}`);
  process.exit(1);
}
printPlan(plan, skipped);

if (!UPLOAD) {
  console.log(`Dry run — nothing uploaded. Target: ${DIRECTUS_URL ?? '(DIRECTUS_URL not set)'}`);
  console.log('Add --upload to import (as `pending`).\n');
  process.exit(0);
}

requireTarget();

let manifest = loadManifest();
if (manifest && manifest.target !== DIRECTUS_URL) {
  console.error(`❌  ${MANIFEST_PATH} belongs to ${manifest.target}, not ${DIRECTUS_URL}`);
  console.error('   Run --rollback against that server (or delete the manifest) first.');
  process.exit(1);
}
// sortBase is fixed on the first run so a resumed run keeps the same order.
manifest ??= { target: DIRECTUS_URL, sortBase: await getMaxSort(), done: {} };

const sortOf = new Map(plan.map((p, i) => [p.rel, manifest.sortBase + i + 1]));
const todo   = plan
  .filter(p => !ONLY || normalise(p.folder) === normalise(ONLY))
  .filter(p => !manifest.done[p.rel])
  .slice(0, LIMIT);

if (todo.length === 0) {
  console.log('✅  Nothing to do — every selected photo is already in the manifest.\n');
  process.exit(0);
}

console.log(`${Object.keys(manifest.done).length} already imported, ${todo.length} to upload.`);
await confirm(`Upload ${todo.length} photos to ${DIRECTUS_URL} as pending?`);

const folderId = await getFolderId();
console.log(`\n📸  Importing ${todo.length} photos → Directus gallery\n`);

let failed = 0;
let count  = 0;

for (let i = 0; i < todo.length; i += BATCH_SIZE) {
  const batch = todo.slice(i, i + BATCH_SIZE);

  await Promise.all(batch.map(async entry => {
    try {
      manifest.done[entry.rel] = await importOne(entry, sortOf.get(entry.rel), folderId);
      saveManifest(manifest);
      console.log(`  ✓  [${String(++count).padStart(3)}/${todo.length}]  ${entry.rel}`);
    } catch (err) {
      console.error(`  ✗  [${String(++count).padStart(3)}/${todo.length}]  ${entry.rel}  —  ${err.message}`);
      failed++;
    }
  }));
}

console.log(
  `\n${failed === 0
    ? '✅  All photos imported as pending — review and publish them in Directus.'
    : `⚠️   Done with ${failed} failure(s) — run the same command again to retry them.`}\n`
);
if (failed > 0) process.exit(1);
