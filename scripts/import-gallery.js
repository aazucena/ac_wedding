// scripts/import-gallery.js
// Batch-import prenup (or wedding) photos from tmp/gallery/ into the Directus gallery collection.
// Usage: pnpm gallery:import  (requires Directus running: pnpm directus:start)

import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Load .env.local without dotenv (pure fs, works from any directory) ─────
const envPath = resolve(ROOT, '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq < 0) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  if (key && !(key in process.env)) process.env[key] = val;
}

const DIRECTUS_URL   = process.env.DIRECTUS_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;
const GALLERY_DIR    = resolve(ROOT, 'tmp/gallery');
const BATCH_SIZE     = 3;

if (!DIRECTUS_URL) {
  console.error('❌  DIRECTUS_URL not set in .env.local');
  process.exit(1);
}
if (!DIRECTUS_TOKEN) {
  console.error('❌  DIRECTUS_ADMIN_TOKEN not set in .env.local');
  console.error('   Generate one: Directus → Settings → Access Tokens → Create Token');
  process.exit(1);
}

const authHeader = { Authorization: `Bearer ${DIRECTUS_TOKEN}` };

// ── Upload a file to Directus /files ──────────────────────────────────────
async function uploadFile(filename) {
  const buffer = readFileSync(resolve(GALLERY_DIR, filename));
  const form   = new FormData();
  // Do NOT set Content-Type manually — fetch sets multipart boundary automatically
  form.append('file', new Blob([buffer], { type: 'image/jpeg' }), filename);

  const res = await fetch(`${DIRECTUS_URL}/files`, {
    method: 'POST',
    headers: authHeader,
    body: form,
  });
  if (!res.ok) throw new Error(`/files ${res.status}: ${await res.text()}`);
  const { data } = await res.json();
  return data.id;
}

// ── Create a gallery record pointing to the uploaded file ─────────────────
async function createGalleryRecord(fileId, sortIndex) {
  const res = await fetch(`${DIRECTUS_URL}/items/gallery`, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: fileId, status: 'published', sort: sortIndex }),
  });
  if (!res.ok) throw new Error(`/items/gallery ${res.status}: ${await res.text()}`);
}

// ── Main ──────────────────────────────────────────────────────────────────
const files = readdirSync(GALLERY_DIR)
  .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
  .sort();

if (files.length === 0) {
  console.error(`❌  No image files found in tmp/gallery/`);
  process.exit(1);
}

console.log(`\n📸  Importing ${files.length} photos → Directus gallery\n`);

let failed = 0;

for (let i = 0; i < files.length; i += BATCH_SIZE) {
  const batch = files.slice(i, i + BATCH_SIZE);

  await Promise.all(batch.map(async (filename, batchIdx) => {
    const sortIndex = i + batchIdx + 1;
    try {
      const fileId = await uploadFile(filename);
      await createGalleryRecord(fileId, sortIndex);
      console.log(`  ✓  [${String(sortIndex).padStart(2)}/${files.length}]  ${filename}`);
    } catch (err) {
      console.error(`  ✗  [${String(sortIndex).padStart(2)}/${files.length}]  ${filename}  —  ${err.message}`);
      failed++;
    }
  }));
}

console.log(
  `\n${failed === 0
    ? '✅  All photos imported successfully!'
    : `⚠️   Done with ${failed} failure(s) — see above.`}\n`
);
if (failed > 0) process.exit(1);
