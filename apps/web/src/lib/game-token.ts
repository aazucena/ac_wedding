// lib/game-token.ts — HMAC-based guest identity tokens for the reception game
// Tokens prove the client went through the server-issued search flow for a specific guestId.
// They are stateless: derived from guestId + server secret, verifiable without storage.

import { createHmac, timingSafeEqual } from "node:crypto";
import { DIRECTUS_TOKEN } from "astro:env/server";

export function makeGuestToken(guestId: string): string {
  return createHmac("sha256", DIRECTUS_TOKEN).update(guestId).digest("hex");
}

export function verifyGuestToken(guestId: string, token: string): boolean {
  const expected = makeGuestToken(guestId);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
