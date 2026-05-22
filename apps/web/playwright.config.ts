import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env for test helpers (cleanup API calls use DIRECTUS_URL / DIRECTUS_TOKEN)
config({ path: resolve(__dirname, ".env.local") });
// Root .env.local has DIRECTUS_ADMIN_TOKEN if it differs from DIRECTUS_TOKEN
config({ path: resolve(__dirname, "../../.env.local"), override: false });

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",

  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },

  // Chromium only — sufficient for local regression testing
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:4321",
    // Reuse an already-running dev server when developing locally
    reuseExistingServer: !process.env.CI,
  },
});
