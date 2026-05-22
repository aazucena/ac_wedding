// apps/web/src/pages/api/mc/auth.ts
// Validates the MC passcode against wedding_settings.mc_token.
// POST { passcode } → { ok: true } | { ok: false, error: string }
// Does NOT return the token — caller stores whatever they typed.

import type { APIRoute } from "astro";
import { timingSafeEqual, createHash } from "node:crypto";
import { getSettings } from "@lib/directus";
import { isRateLimited } from "@lib/ratelimit";

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// 5 attempts per 15 minutes per IP
const LIMIT = 5;
const WINDOW = 15 * 60 * 1000;

export const POST: APIRoute = async ({ request }) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`mc-auth:${ip}`, LIMIT, WINDOW)) {
    return json(
      { ok: false, error: "Too many attempts. Try again in 15 minutes." },
      429,
    );
  }

  try {
    const { passcode } = (await request.json()) as { passcode?: string };
    if (!passcode)
      return json({ ok: false, error: "No passcode provided." }, 400);

    const settings = await getSettings();
    const mcToken = settings.mc_token;

    if (!mcToken || !safeEqual(passcode, mcToken)) {
      return json({ ok: false, error: "Incorrect passcode." }, 403);
    }

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: "Something went wrong." }, 500);
  }
};
