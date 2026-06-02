// api/rsvp/party.ts — resolve a party ID to its RSVP URL server-side.
// The token never appears in client-readable search results; it only travels
// as an HTTP redirect, preventing enumeration via the name-search endpoint.

import type { APIRoute } from "astro";
import { DIRECTUS_URL, DIRECTUS_TOKEN } from "astro:env/server";
import qs from "qs";
import { isRateLimited } from "@lib/ratelimit";

const LIMIT = 10;
const WINDOW = 60 * 1000;

export const GET: APIRoute = async ({ url, request, redirect }) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`rsvp-party:${ip}`, LIMIT, WINDOW)) {
    return new Response("Too many requests", { status: 429 });
  }

  const id = url.searchParams.get("id")?.trim() ?? "";
  if (!id) return new Response("Bad request", { status: 400 });

  try {
    const query = qs.stringify(
      { filter: { id: { _eq: id } }, fields: ["rsvp_token"], limit: 1 },
      { encodeValuesOnly: true },
    );
    const res = await fetch(`${DIRECTUS_URL}/items/parties?${query}`, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return new Response("Not found", { status: 404 });

    const { data } = await res.json();
    const token = data?.[0]?.rsvp_token;
    if (!token) return new Response("Not found", { status: 404 });

    return redirect(`/rsvp/${token}`, 302);
  } catch {
    return new Response("Server error", { status: 500 });
  }
};
