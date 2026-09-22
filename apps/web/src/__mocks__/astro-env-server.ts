// Stub for astro:env/server — used by Vitest (aliased in vitest.config.ts).
// The game-token tests are purely behavioral (same-input → same-output),
// so the actual secret value doesn't matter as long as it's consistent.
export const DIRECTUS_TOKEN = "vitest-stub-secret";
export const DIRECTUS_URL = "http://directus.test";
export const INTERNAL_URL = "http://site.test";
// cms-transport tests override this per case with vi.doMock — see
// lib/__tests__/cms-transport.test.ts
export const CMS_TRANSPORT = "auto";
