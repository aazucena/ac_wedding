// apps/web/src/pages/api/game/submissions.ts
// MC dashboard data — lists all uploaded game proof files.
// Validates MC token (query param) against settings before returning data.

import type { APIRoute } from "astro";
import { timingSafeEqual, createHash } from "node:crypto";
import { getSettings, getGameProofFiles } from "@lib/directus";
export type { GameSubmission } from "@lib/directus";

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export const GET: APIRoute = async ({ url }) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const token = url.searchParams.get("token");
  if (!token) return json({ error: "Missing token." }, 401);

  try {
    const settings = await getSettings();
    const mcToken = settings.mc_token;
    if (!mcToken || !safeEqual(token, mcToken)) {
      return json({ error: "Invalid token." }, 403);
    }

    const submissions = await getGameProofFiles();
    return json({ submissions });
  } catch (err) {
    console.error("game-submissions error:", err);
    return json({ error: "Something went wrong." }, 500);
  }
};
