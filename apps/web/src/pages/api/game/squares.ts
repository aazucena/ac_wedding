// apps/web/src/pages/api/game/squares.ts
// Returns square numbers already submitted by a guest (source='game' memories).
// GET ?guestId=<uuid> -> { squares: ["1", "3", "7"] }
// Used by the upload grid to pre-mark completed squares and prevent duplicates.

import type { APIRoute } from 'astro';
import { DIRECTUS_URL, DIRECTUS_TOKEN } from 'astro:env/server';
import { verifyGuestToken } from '@lib/game-token';

const SQUARE_RE = /\u00b7\s*Square\s*#(\d+)/i;

export const GET: APIRoute = async ({ url }) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const guestId = url.searchParams.get('guestId')?.trim();
  const token   = url.searchParams.get('token')?.trim();
  if (!guestId || !token || !verifyGuestToken(guestId, token)) return json({ squares: [] }, 403);

  try {
    const params = new URLSearchParams({
      'filter[guest][_eq]':  guestId,
      'filter[source][_eq]': 'game',
      'fields':              'image.title',
      'limit':               '-1',
    });

    const res = await fetch(`${DIRECTUS_URL}/items/memories?${params}`, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      signal:  AbortSignal.timeout(8_000),
    });

    if (!res.ok) return json({ squares: [] });

    const { data } = await res.json();
    const squares: string[] = (data ?? [])
      .map((m: { image?: { title?: string } }) => {
        const match = SQUARE_RE.exec(m.image?.title ?? '');
        return match ? match[1] : null;
      })
      .filter(Boolean);

    return json({ squares });
  } catch {
    return json({ squares: [] });
  }
};
