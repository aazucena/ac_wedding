// packages/seed/src/index.js
//
// Usage (from workspace root):
//   pnpm seed              — insert-or-skip (safe, default)
//   pnpm seed -- --fresh   — insert-or-overwrite (destructive)

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env.local") });

import { enableFreshMode } from "./upsert.js";
import { run, enableFieldsMode, enableMetaMode, setOnlyCollections } from "./runner.js";

const isFresh  = process.argv.includes("--fresh");
const isFields = process.argv.includes("--fields");
const isMeta   = process.argv.includes("--meta");

// --collection persons,vendors  (comma-separated, no spaces)
const colArg   = process.argv.find(a => a.startsWith("--collection="));
const onlyCols = colArg ? colArg.replace("--collection=", "").split(",").map(s => s.trim()) : null;

if (isFresh)   enableFreshMode();
if (isFields)  enableFieldsMode();
if (isMeta)    enableMetaMode();
if (onlyCols)  setOnlyCollections(onlyCols);

console.log("═══════════════════════════════════════════");
console.log("  💍 Catholic Wedding Planner — Seed Runner");
console.log(`  Directus: ${process.env.DIRECTUS_URL}`);
console.log(`  Mode:     ${isFresh ? "⚡ fresh (overwrite)" : "default (skip existing)"}${isFields ? " + fields" : ""}${isMeta ? " + meta" : ""}${onlyCols ? ` | only: ${onlyCols.join(", ")}` : ""}`);
console.log("═══════════════════════════════════════════");

run()
  .then(() => {
    console.log("\n═══════════════════════════════════════════");
    console.log("  ✅ Seed complete");
    console.log("═══════════════════════════════════════════\n");
  })
  .catch((err) => {
    console.error("\n❌  Seed failed:", err?.message ?? err);
    if (err?.errors) err.errors.forEach((e) => console.error("  •", e.message));
    process.exit(1);
  });