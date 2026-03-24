// apps/web/src/pages/api/guest/search.ts
// Lightweight guest name search for the game upload identity confirmation.
// GET ?q=<name> → [{ id, name }] (max 6 results)

import type { APIRoute } from 'astro';
import { DIRECTUS_URL, DIRECTUS_TOKEN } from 'astro:env/server';
import qs from 'qs';
import { isRateLimited } from '@lib/ratelimit';

// 20 requests per 10 seconds per IP (covers fast typists)
const LIMIT = 20;
const WINDOW = 10 * 1000;

export const GET: APIRoute = async ({ url, request }) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(`guest-search:${ip}`, LIMIT, WINDOW)) {
    return json({ results: [] }, 429);
  }

  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return json({ results: [] });

  try {
    const query = qs.stringify({
      filter: {
        _or: [
          { person: { first_name:     { _icontains: q } } },
          { person: { last_name:      { _icontains: q } } },
          { person: { preferred_name: { _icontains: q } } },
        ],
      },
      fields: ['id', 'person.first_name', 'person.last_name', 'person.preferred_name'],
      limit: 6,
    }, { encodeValuesOnly: true });

    const res = await fetch(`${DIRECTUS_URL}/items/guests?${query}`, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return json({ results: [] });

    const { data } = await res.json();
    const results = (data ?? []).map((g: any) => ({
      id:   g.id as string,
      name: [g.person?.preferred_name ?? g.person?.first_name, g.person?.last_name]
              .filter(Boolean).join(' '),
    })).filter((r: { id: string; name: string }) => r.name);

    return json({ results });
  } catch {
    return json({ results: [] });
  }
};
