// packages/seed/src/client.js
// Initialises and exports an authenticated Directus SDK client.
// Reads DIRECTUS_URL and DIRECTUS_ADMIN_TOKEN from workspace root .env.local

import { createDirectus, rest, staticToken } from "@directus/sdk";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load from workspace root .env.local
config({ path: resolve(__dirname, "../../../.env.local") });

const url = process.env.DIRECTUS_URL;
const token = process.env.DIRECTUS_ADMIN_TOKEN;

if (!url) {
  console.error("❌  DIRECTUS_URL is not set in your .env.local");
  process.exit(1);
}

if (!token) {
  console.error("❌  DIRECTUS_ADMIN_TOKEN is not set in your .env.local");
  console.error(
    "   Generate one in Directus → Settings → Access Tokens → Create Token"
  );
  process.exit(1);
}

const client = createDirectus(url).with(staticToken(token)).with(rest());

export default client;