// apps/web/src/pages/api/game/verify.ts
// Verifies a guest's identity by checking their table number against Directus.
// POST { guestId, tableNumber } → { ok: true, token } | { ok: false, error }
// Table number is on the guest's place card — acts as a second factor for game identity.

import type { APIRoute } from "astro";
import { DIRECTUS_URL, DIRECTUS_TOKEN } from "astro:env/server";
import { isRateLimited } from "@lib/ratelimit";
import { makeGuestToken } from "@lib/game-token";

// 10 attempts per 5 minutes per IP — table numbers are small, keep the window tight
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
  if (isRateLimited(`game-verify:${ip}`, LIMIT, WINDOW)) {
    return json(
      { ok: false, error: "Too many attempts. Please wait a few minutes." },
      429,
    );
  }

  try {
    const { guestId, tableNumber } = (await request.json()) as {
      guestId?: string;
      tableNumber?: unknown;
    };

    if (!guestId || !UUID_RE.test(guestId))
      return json({ ok: false, error: "Invalid request." }, 400);
    if (
      tableNumber === undefined ||
      tableNumber === null ||
      tableNumber === ""
    ) {
      return json({ ok: false, error: "Please enter your table number." }, 400);
    }

    const parsed = Number(tableNumber);
    if (!Number.isInteger(parsed) || parsed < 1)
      return json(
        { ok: false, error: "Please enter a valid table number." },
        400,
      );

    const res = await fetch(
      `${DIRECTUS_URL}/items/guests/${guestId}?fields=table.number`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!res.ok) return json({ ok: false, error: "Guest not found." }, 404);

    const { data } = await res.json();
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

    return json({ ok: true, token: makeGuestToken(guestId) });
  } catch {
    return json(
      { ok: false, error: "Something went wrong. Please try again." },
      500,
    );
  }
};
