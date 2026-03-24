// Catch-all proxy — sole owner of DIRECTUS_URL and DIRECTUS_TOKEN.
// Adds auth server-side so credentials never reach the browser.
//
// Mutation guard: POST/PATCH/DELETE require either:
//   (a) X-Internal-Key: <DIRECTUS_TOKEN>  — set by server-side lib/directus.ts helpers, or
//   (b) path matches BROWSER_MUTATION_ALLOWLIST — explicit browser-accessible mutations

import type { APIRoute } from 'astro';
import { DIRECTUS_URL, DIRECTUS_TOKEN } from 'astro:env/server';

const PASS_UP   = ['accept', 'content-language'];
const PASS_DOWN = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified'];

// Paths that browser JS is explicitly allowed to PATCH (no internal key needed).
// DELETE/POST/PUT still require an internal key — this list is PATCH-only.
// MC dashboard approve/decline — already gated by mc-auth passcode.
const BROWSER_PATCH_ALLOWLIST = [/^items\/memories\/[^/]+$/];

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'DELETE', 'PUT']);

async function handler({ request, params }: Parameters<APIRoute>[0]): Promise<Response> {
  const path = params.path ?? '';

  if (MUTATION_METHODS.has(request.method)) {
    const internalKey = request.headers.get('x-internal-key');
    const isInternal  = internalKey === DIRECTUS_TOKEN;
    const isAllowed   = request.method === 'PATCH' && BROWSER_PATCH_ALLOWLIST.some(re => re.test(path));

    if (!isInternal && !isAllowed) {
      return new Response(JSON.stringify({ errors: [{ message: 'Forbidden' }] }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const qs          = new URL(request.url).search;
    const upstreamUrl = `${DIRECTUS_URL}/${path}${qs}`;

    const contentType = request.headers.get('content-type') ?? '';
    const isUpload    = contentType.includes('multipart/form-data');

    const headers: Record<string, string> = { Authorization: `Bearer ${DIRECTUS_TOKEN}` };
    for (const h of PASS_UP) {
      const v = request.headers.get(h);
      if (v) headers[h] = v;
    }
    // Forward Content-Type for JSON and multipart (preserves multipart boundary).
    // Skip for GET/DELETE — no body.
    if (contentType && request.method !== 'GET' && request.method !== 'DELETE') {
      headers['Content-Type'] = contentType;
    }

    const body =
      request.method !== 'GET' && request.method !== 'DELETE'
        ? (request.body ?? undefined)
        : undefined;

    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(isUpload ? 60_000 : 15_000),
      // @ts-expect-error — Node 18 fetch requires duplex when body is a ReadableStream
      duplex: body instanceof ReadableStream ? 'half' : undefined,
    });

    const responseHeaders = new Headers();
    for (const h of PASS_DOWN) {
      const v = upstream.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }

    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return new Response(
      JSON.stringify({ errors: [{ message: isTimeout ? 'Gateway timeout' : 'Upstream error' }] }),
      { status: isTimeout ? 504 : 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export const GET: APIRoute    = handler;
export const POST: APIRoute   = handler;
export const PATCH: APIRoute  = handler;
export const DELETE: APIRoute = handler;
