// apps/web/src/lib/cms-transport.ts
// Picks how server-side code reaches Directus.
//
//   proxy  — through this app's own /api/cms route (INTERNAL_URL). Keeps the
//            proxy as the single choke point for CMS access.
//   direct — straight to DIRECTUS_URL with a bearer token. No self-request.
//
// The catch with `proxy` is that INTERNAL_URL is this app's own origin, so at
// BUILD time it resolves to the *currently deployed* site. Prerendered pages
// then depend on production being healthy: on 2026-09-22 a stale token made
// every /api/cms call 401, and the build baked that failure into static HTML.
//
// So CMS_TRANSPORT=auto (the default) uses the proxy when serving requests and
// goes direct while building. Force either mode by setting CMS_TRANSPORT.

import {
  CMS_TRANSPORT,
  DIRECTUS_URL,
  DIRECTUS_TOKEN,
  INTERNAL_URL,
} from "astro:env/server";

/** Vercel sets CI=1 on the build machine, never in the function runtime. */
export const IS_BUILD = process.env.CI === "1";

export const usesDirect =
  CMS_TRANSPORT === "direct" || (CMS_TRANSPORT === "auto" && IS_BUILD);

export interface CmsTarget {
  url: string;
  headers: Record<string, string>;
}

/**
 * Resolve a Directus path (leading slash, e.g. "/items/guests") to a URL and
 * auth headers for the active transport.
 *
 * `mutation` marks POST/PATCH/DELETE/upload calls, which the proxy only lets
 * through with the internal key — see pages/api/cms/[...path].ts. Direct calls
 * always carry the bearer token and skip that guard, which exists to stop
 * *browser* mutations.
 */
export function cmsTarget(path: string, mutation = false): CmsTarget {
  if (usesDirect) {
    return {
      url: `${DIRECTUS_URL}${path}`,
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
    };
  }
  return {
    url: `${INTERNAL_URL}/api/cms${path}`,
    headers: mutation ? { "X-Internal-Key": DIRECTUS_TOKEN } : {},
  };
}

/**
 * Fetchers swallow errors so a live page survives a Directus hiccup. During a
 * build that's wrong — the failure gets frozen into static HTML — so log it and
 * fail the deploy instead of shipping empty pages.
 */
export function reportFailure(detail: string): void {
  if (!IS_BUILD) return;
  console.error(`[directus] build-time fetch failed — ${detail}`);
  process.exitCode = 1;
}
