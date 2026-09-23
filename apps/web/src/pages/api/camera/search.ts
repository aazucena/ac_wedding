// apps/web/src/pages/api/camera/search.ts
// Name search for the Roll Call gate (/camera).
// GET ?q=<name> → { results: [{ id, name }] } — `id` is a PERSON id.
//
// Seating lives on persons.table (see a6bc5af), so "can this person shoot?" is
// "do they have a seat?" — which also covers parents and other hosts who never
// get a guest record. Vendors are excluded: the photographer and coordinator
// have a seat and a meal, but the party camera isn't theirs.
//
// Deliberately NOT api/guest/search: that one searches every guest including
// unseated ones, and hands back guest ids.

import type { APIRoute } from "astro";
import { DIRECTUS_URL, DIRECTUS_TOKEN } from "astro:env/server";
import qs from "qs";
import { isRateLimited } from "@lib/ratelimit";
import { buildNameFilter } from "@lib/utils/search";

// 20 requests per 10 seconds per IP (covers fast typists)
const LIMIT = 20;
const WINDOW = 10 * 1000;

export const GET: APIRoute = async ({ url, request }) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`camera-search:${ip}`, LIMIT, WINDOW)) {
    return json({ results: [] }, 429);
  }

  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return json({ results: [] });

  try {
    const query = qs.stringify(
      {
        filter: {
          // `null` relation → conditions apply to persons directly, not through
          // a `person` M2O (lib/utils/search.ts).
          ...buildNameFilter(q, null),
          table: { _nnull: true },
          vendor: { _null: true },
        },
        fields: ["id", "first_name", "last_name", "preferred_name"],
        limit: 6,
      },
      { encodeValuesOnly: true },
    );

    const res = await fetch(`${DIRECTUS_URL}/items/persons?${query}`, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return json({ results: [] });

    const { data } = await res.json();
    const results = (data ?? [])
      .map((p: any) => ({
        id: p.id as string,
        name: [p.preferred_name ?? p.first_name, p.last_name]
          .filter(Boolean)
          .join(" "),
      }))
      .filter((r: { id: string; name: string }) => r.name);

    return json({ results });
  } catch {
    return json({ results: [] });
  }
};
