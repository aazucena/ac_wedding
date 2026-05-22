import { defineConfig } from "vitest/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // Server-side utility code — no DOM needed
    environment: "node",
  },
  resolve: {
    alias: {
      // Mirror the aliases in astro.config.mjs
      "@lib": resolve(__dirname, "src/lib"),
      "@components": resolve(__dirname, "src/components"),
      "@styles": resolve(__dirname, "src/styles"),
      "@layouts": resolve(__dirname, "src/layouts"),
      "@assets": resolve(__dirname, "src/assets"),
      // Astro virtual module — not available in plain Vitest; stub it out
      "astro:env/server": resolve(
        __dirname,
        "src/__mocks__/astro-env-server.ts",
      ),
    },
  },
});
