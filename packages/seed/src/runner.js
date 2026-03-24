// packages/seed/src/runner.js
// Generic seed runner.
//
// Reads all .json files from src/collections/, builds a dependency graph from
// their relationship definitions, topologically sorts them, then for each
// collection:
//   1. Applies field metadata via the Directus schema API
//   2. Seeds items, resolving { "$ref": "collection", "key": "..." } references
//      against an in-memory registry built as each collection completes
//
// Self-referential relationships marked "deferred": true are applied in a
// second pass after all records in the collection are inserted.
//
// Usage:
//   import { run } from "./runner.js";
//   await run();

import { readdir, readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  createField,
  readFieldsByCollection,
  updateField,
  createRelation,
  readRelations,
  updateItem,
  updateCollection,
} from "@directus/sdk";
import client from "./client.js";
import { upsertItem, upsertSingleton, logResult } from "./upsert.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COLLECTIONS_DIR = resolve(__dirname, "collections");

// ─── In-memory registry ───────────────────────────────────────────────────────
// Shape: { collection: { key: uuid, ... }, ... }
// Populated as each collection is seeded. Used to resolve $ref values.

export const registry = {};

// Set to true via --fields CLI flag to apply field metadata on each run
let SEED_FIELDS = false;
export function enableFieldsMode() { SEED_FIELDS = true; }

let SEED_META = false;
export function enableMetaMode() { SEED_META = true; }

// When set, only these collections are processed
let ONLY_COLLECTIONS = null;
export function setOnlyCollections(names) { ONLY_COLLECTIONS = new Set(names); }

// ─── $ref resolver ────────────────────────────────────────────────────────────

function resolveRefs(data) {
  if (Array.isArray(data)) return data.map(resolveRefs);

  if (data !== null && typeof data === "object") {
    // { "$ref": "persons", "key": "aldrin" }
    if ("$ref" in data && "key" in data) {
      const { $ref, key } = data;
      const id = registry[$ref]?.[key];
      if (!id) throw new Error(`$ref unresolved: ${$ref}.${key} — was that collection seeded before this one?`);
      return id;
    }
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, resolveRefs(v)])
    );
  }

  return data;
}

// ─── Topological sort ─────────────────────────────────────────────────────────

function topoSort(definitions) {
  const byName   = Object.fromEntries(definitions.map((d) => [d.collection, d]));
  const visited  = new Set();
  const sorted   = [];

  function visit(name) {
    if (visited.has(name)) return;
    visited.add(name);

    const def = byName[name];
    if (!def) return; // external collection (directus_users etc.) — skip

    for (const rel of def.relationships ?? []) {
      if (rel.deferred) continue; // self-referential — don't create a cycle
      if (rel.related_collection && rel.related_collection !== def.collection) {
        visit(rel.related_collection);
      }
    }

    sorted.push(def);
  }

  for (const def of definitions) visit(def.collection);
  return sorted;
}

// ─── Collection metadata ─────────────────────────────────────────────────────

async function applyCollectionMeta(collection, meta, singleton) {
  if (!meta) return;
  try {
    await client.request(updateCollection(collection, { meta }));
    console.log(`  🗂  Updated collection meta: ${collection}`);
  } catch (err) {
    console.warn(`  ⚠  Could not update collection meta for ${collection}:`, err?.message);
  }
}

// ─── Field metadata ───────────────────────────────────────────────────────────

async function applyFields(collection, fields) {
  if (!fields?.length) return;

  let existing;
  try {
    existing = await client.request(readFieldsByCollection(collection));
  } catch {
    existing = [];
  }

  const existingNames = new Set(existing.map((f) => f.field));

  for (const fieldDef of fields) {
    const { field, type, schema = {}, meta = {} } = fieldDef;
    try {
      if (existingNames.has(field)) {
        await client.request(updateField(collection, field, { schema, meta }));
        console.log(`  🔧 Updated field: ${collection}.${field}`);
      } else {
        await client.request(createField(collection, { field, type, schema, meta }));
        console.log(`  ➕ Created field: ${collection}.${field}`);
      }
    } catch (err) {
      console.warn(`  ⚠  Field ${collection}.${field} skipped: ${err?.message}`);
    }
  }
}

// ─── Relationships ────────────────────────────────────────────────────────────

async function applyRelationships(collection, relationships) {
  if (!relationships?.length) return;

  let existing;
  try {
    const all = await client.request(readRelations());
    existing = all.filter((r) => r.collection === collection);
  } catch {
    existing = [];
  }

  const existingFields = new Set(existing.map((r) => r.field));

  for (const rel of relationships) {
    if (rel.deferred) continue; // handled after data seeding
    if (existingFields.has(rel.field)) continue;

    try {
      await client.request(createRelation({
        collection,
        field: rel.field,
        related_collection: rel.related_collection,
        meta: rel.meta ?? {},
        schema: rel.schema ?? {},
      }));
      console.log(`  🔗 Created relation: ${collection}.${rel.field} → ${rel.related_collection}`);
    } catch (err) {
      console.warn(`  ⚠  Relation ${collection}.${rel.field} skipped: ${err?.message}`);
    }
  }
}

// ─── Seed items ───────────────────────────────────────────────────────────────

async function seedItems(def) {
  const { collection, singleton, unique_field, data, relationships } = def;

  registry[collection] ??= {};

  if (singleton) {
    const item = resolveRefs(data?.item ?? {});
    const result = await upsertSingleton(collection, item);
    logResult(collection, "singleton", collection, result);
    return;
  }

  const items = data?.items ?? [];
  if (!items.length) return;

  // ── Pass 1: insert all records ────────────────────────────────────────────
  const insertedKeys = []; // [{ key, id }] — for deferred pass

  const deferredFields = new Set(
    (relationships ?? []).filter((r) => r.deferred).map((r) => r.field)
  );

  for (const raw of items) {
    // Strip deferred fields BEFORE resolveRefs — they may $ref records that
    // don't exist in the registry yet (self-referential collections).
    // Note: _key is intentionally kept — it is a real DB field used as the
    // unique identifier, not a runner-only annotation.
    const stripped = Object.fromEntries(
      Object.entries(raw).filter(([k]) => !deferredFields.has(k))
    );

    // Strip _key — runner-only annotation, not a DB field
    delete stripped._key;

    const clean = resolveRefs(stripped);

    const result = await upsertItem(collection, unique_field, clean);

    // Build label for logging
    const fields = Array.isArray(unique_field) ? unique_field : [unique_field];
    const label = fields.map((f) => clean[f]).join(' / ');
    logResult(collection, fields[0], label, result);

    // Register by _key AND unique_field value — both may be used in $ref lookups
    if (raw._key) registry[collection][raw._key] = result.item.id;
    const uniqueVal = Array.isArray(unique_field)
      ? unique_field.map((f) => clean[f]).join('_')
      : clean[unique_field];
    if (uniqueVal) registry[collection][uniqueVal] = result.item.id;
    if (!result.item?.id) console.warn(`  ⚠  result.item.id missing for ${collection}:`, JSON.stringify(result));

    insertedKeys.push({ raw, id: result.item.id });
  }

  console.log(`  🗂  Registry[${collection}] keys:`, Object.keys(registry[collection]));

  // ── Pass 2: patch deferred (self-referential) fields ─────────────────────
  const deferredRels = (relationships ?? []).filter((r) => r.deferred);
  if (!deferredRels.length) return;

  console.log(`\n  ↩  Patching deferred relations for ${collection}...`);

  for (const { raw, id } of insertedKeys) {
    const patch = {};

    for (const rel of deferredRels) {
      const rawValue = raw[rel.field];
      if (!rawValue) continue;
      patch[rel.field] = resolveRefs(rawValue);
    }

    if (!Object.keys(patch).length) continue;

    try {
      await client.request(updateItem(collection, id, patch));
      console.log(`  🔄 Patched deferred: ${collection} [id=${id}]`);
    } catch (err) {
      console.warn(`  ⚠  Deferred patch failed for ${collection} [id=${id}]: ${err?.message}`);
    }
  }
}

// ─── Main runner ──────────────────────────────────────────────────────────────

export async function run() {
  // Load all collection definition files
  const files = (await readdir(COLLECTIONS_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort(); // alphabetical baseline before topo sort

  const definitions = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(resolve(COLLECTIONS_DIR, file), "utf8");
      return JSON.parse(raw);
    })
  );

  // Topological sort by dependencies
  const sorted = topoSort(definitions);

  console.log("\n📦 Seed order:");
  sorted.forEach((d, i) => console.log(`  ${i + 1}. ${d.collection}`));

  // Process each collection
  for (const def of sorted) {
    if (ONLY_COLLECTIONS && !ONLY_COLLECTIONS.has(def.collection)) continue;

    console.log(`\n${"─".repeat(50)}`);
    console.log(`  📂 ${def.collection}${def.singleton ? " (singleton)" : ""}`);

    if (SEED_META)   await applyCollectionMeta(def.collection, def.meta, def.singleton);
    if (SEED_FIELDS) await applyFields(def.collection, def.fields);
    if (SEED_FIELDS) await applyRelationships(def.collection, def.relationships);
    // Skip data seeding when --collection scopes a --fields-only run
    if (!ONLY_COLLECTIONS || !SEED_FIELDS) await seedItems(def);
  }
}