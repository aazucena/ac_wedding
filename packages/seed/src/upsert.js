// packages/seed/src/upsert.js
// Upsert helpers for seed scripts.
//
// Two modes controlled by the SEED_FRESH flag (set via --fresh CLI arg):
//
//   Default (SEED_FRESH = false):
//     insert-or-skip — existing records are left untouched.
//
//   Fresh (SEED_FRESH = true):
//     insert-or-overwrite — existing records are updated in place.
//     If the update fails due to a foreign key constraint, the record is
//     deleted and re-inserted. This handles cases where child records
//     reference the existing row and Directus rejects the update.

import {
  createItem,
  readItems,
  updateItem,
  deleteItem,
  updateSingleton,
  readSingleton,
} from "@directus/sdk";
import client from "./client.js";

// ─── Fresh mode flag ──────────────────────────────────────────────────────────
// Exported so index.js can set it once after parsing CLI args.
// All upsert calls read this at runtime — no need to thread it through params.

export let SEED_FRESH = false;

export function enableFreshMode() {
  SEED_FRESH = true;
  console.log("  ⚡ Fresh mode enabled — existing records will be overwritten");
}

// ─── upsertItem ───────────────────────────────────────────────────────────────

/**
 * Insert-or-skip (default) / insert-or-overwrite (--fresh) for regular collections.
 *
 * Fresh mode strategy:
 *   1. Try PATCH — works for most records
 *   2. If Directus rejects with a FK constraint error, DELETE + re-INSERT
 *      This covers cases like persons where child collections (entourage,
 *      sponsors, readings etc.) hold FK references that block direct updates.
 */
export async function upsertItem(collection, uniqueField, data) {
  // uniqueField can be a string or array of strings for compound uniqueness
  const fields = Array.isArray(uniqueField) ? uniqueField : [uniqueField];
  const filter = fields.length === 1
    ? { [fields[0]]: { _eq: data[fields[0]] } }
    : { _and: fields.map((f) => ({ [f]: { _eq: data[f] } })) };

  const existing = await client.request(
    readItems(collection, { filter, limit: 1 })
  );

  // ── No existing record — always insert ──────────────────────────────────────
  if (existing.length === 0) {
    const created = await client.request(createItem(collection, data));
    return { status: "created", item: created };
  }

  // ── Record exists + skip mode ───────────────────────────────────────────────
  if (!SEED_FRESH) {
    return { status: "skipped", item: existing[0] };
  }

  // ── Record exists + fresh mode — try update first ──────────────────────────
  const existingId = existing[0].id;

  try {
    const updated = await client.request(updateItem(collection, existingId, data));
    return { status: "updated", item: updated };
  } catch (err) {
    const isFkError = isForeignKeyError(err);

    if (!isFkError) throw err; // Unexpected error — bubble up

    // ── FK constraint blocked the update — delete + re-insert ─────────────────
    console.log(`  ⚠  FK constraint on ${collection} [id=${existingId}] — deleting and re-inserting`);
    await client.request(deleteItem(collection, existingId));
    const recreated = await client.request(createItem(collection, data));
    return { status: "recreated", item: recreated };
  }
}

// ─── upsertSingleton ──────────────────────────────────────────────────────────

/**
 * Insert-or-skip / insert-or-overwrite for singleton collections.
 */
export async function upsertSingleton(collection, data) {
  try {
    const existing = await client.request(readSingleton(collection));
    const firstKey = Object.keys(data)[0];

    // ── Singleton is uninitialised ─────────────────────────────────────────────
    if (!existing?.[firstKey]) {
      const updated = await client.request(updateSingleton(collection, data));
      return { status: "created", item: updated };
    }

    // ── Singleton exists + skip mode ───────────────────────────────────────────
    if (!SEED_FRESH) {
      return { status: "skipped", item: existing };
    }

    // ── Singleton exists + fresh mode — overwrite ──────────────────────────────
    const updated = await client.request(updateSingleton(collection, data));
    return { status: "updated", item: updated };

  } catch {
    // Singleton row doesn't exist yet — initialise
    const created = await client.request(createItem(collection, data));
    return { status: "created", item: created };
  }
}

// ─── Logging ──────────────────────────────────────────────────────────────────

export function logResult(collection, field, value, result) {
  const icons = {
    created:   "✅",
    updated:   "🔄",
    recreated: "♻️ ",
    skipped:   "↩ ",
  };
  const labels = {
    created:   "Created",
    updated:   "Updated",
    recreated: "Recreated",
    skipped:   "Skipped",
  };
  const icon   = icons[result.status]  ?? "❓";
  const action = labels[result.status] ?? result.status;
  console.log(`  ${icon} ${action}: ${collection} [${field}="${value}"]`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Detect foreign key constraint errors from Directus/PostgreSQL.
 * Directus wraps PG errors — check both the top-level message and nested errors.
 */
function isForeignKeyError(err) {
  const msg = [
    err?.message ?? "",
    ...(err?.errors ?? []).map((e) => e.message ?? ""),
  ]
    .join(" ")
    .toLowerCase();

  return (
    msg.includes("foreign key") ||
    msg.includes("violates foreign key constraint") ||
    msg.includes("23503") // PostgreSQL FK violation error code
  );
}