// /assets/[...path].ts — thin proxy for Directus file assets.
// Keeps DIRECTUS_URL and DIRECTUS_TOKEN server-side only.
// e.g. /assets/abc-123?width=600&fit=cover → Directus /assets/abc-123?...

import type { APIRoute } from "astro";
import { DIRECTUS_URL, DIRECTUS_TOKEN } from "astro:env/server";

const PASS_DOWN = [
  "content-type",
  "content-length",
  "cache-control",
  "etag",
  "last-modified",
  "content-disposition",
];

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const path = params.path ?? "";
    const qs = new URL(request.url).search;
    const upstreamUrl = `${DIRECTUS_URL}/assets/${path}${qs}`;

    const upstream = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      signal: AbortSignal.timeout(15_000),
    });

    const responseHeaders = new Headers();
    for (const h of PASS_DOWN) {
      const v = upstream.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return new Response(null, { status: isTimeout ? 504 : 502 });
  }
};
