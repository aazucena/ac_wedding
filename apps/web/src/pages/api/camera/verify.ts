// apps/web/src/pages/api/camera/verify.ts
// Second step of the Roll Call gate: prove the person you picked is you.
// POST { personId, tableNumber } → { ok: true, token } | { ok: false, error }
//
// The table number is on the place card, so it's a second factor that only
// someone actually at the table has. Reads persons.table.number directly —
// one hop shorter than api/game/verify, which starts from a guest record.

import type { APIRoute } from "astro";
import { DIRECTUS_URL, DIRECTUS_TOKEN } from "astro:env/server";
import { isRateLimited } from "@lib/ratelimit";
import { makeGuestToken } from "@lib/game-token";

// 10 attempts per 5 minutes per IP — table numbers are small, keep it tight
const LIMIT = 10;
const WINDOW = 5 * 60 * 1000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST: APIRoute = async ({ request }) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`camera-verify:${ip}`, LIMIT, WINDOW)) {
    return json(
      { ok: false, error: "Too many attempts. Please wait a few minutes." },
      429,
    );
  }

  try {
    const { personId, tableNumber } = (await request.json()) as {
      personId?: string;
      tableNumber?: unknown;
    };

    if (!personId || !UUID_RE.test(personId))
      return json({ ok: false, error: "Invalid request." }, 400);
    if (tableNumber === undefined || tableNumber === null || tableNumber === "")
      return json({ ok: false, error: "Please enter your table number." }, 400);

    const parsed = Number(tableNumber);
    if (!Number.isInteger(parsed) || parsed < 1)
      return json(
        { ok: false, error: "Please enter a valid table number." },
        400,
      );

    const res = await fetch(
      `${DIRECTUS_URL}/items/persons/${personId}?fields=table.number,vendor`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!res.ok) return json({ ok: false, error: "Name not found." }, 404);

    const { data } = await res.json();

    // Re-checked here, not just in search: a person id lifted from elsewhere
    // shouldn't be able to mint a token.
    if (data?.vendor) return json({ ok: false, error: "Name not found." }, 404);

    const assignedTable = data?.table?.number;
    if (assignedTable === undefined || assignedTable === null) {
      return json(
        { ok: false, error: "No table assigned — ask the MC for help." },
        400,
      );
    }

    if (Number(assignedTable) !== parsed) {
      return json(
        {
          ok: false,
          error: "Table number doesn't match. Check your place card.",
        },
        403,
      );
    }

    // Same HMAC helper the reception game uses — it signs an id, and here that
    // id is a person rather than a guest.
    return json({ ok: true, token: makeGuestToken(personId) });
  } catch {
    return json(
      { ok: false, error: "Something went wrong. Please try again." },
      500,
    );
  }
};
