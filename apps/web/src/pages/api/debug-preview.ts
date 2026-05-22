// TEMPORARY — delete after debugging preview token issue
import type { APIRoute } from "astro";
import { PREVIEW_TOKEN, MAINTENANCE_MODE } from "astro:env/server";

const PREVIEW_COOKIE = "preview_session";
const PREVIEW_COOKIE_TTL = 60 * 60 * 2;

export const GET: APIRoute = ({ url, cookies }) => {
  const tokenParam = url.searchParams.get("preview") ?? "";
  const tokenCookie = cookies.get(PREVIEW_COOKIE)?.value ?? "";
  const secret = PREVIEW_TOKEN;
  const matches = tokenParam === secret;

  // If token matches, also set the cookie directly from this endpoint
  // so we can verify Astro's cookie API works on this deployment
  if (matches && secret) {
    cookies.set(PREVIEW_COOKIE, secret, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: PREVIEW_COOKIE_TTL,
    });
  }

  return new Response(
    JSON.stringify({
      secret_set: !!secret,
      secret_length: secret.length,
      param_length: tokenParam.length,
      param_matches: matches,
      cookie_was_present: tokenCookie.length > 0,
      cookie_matches: tokenCookie === secret,
      cookie_set_attempted: matches,
      maintenance_mode: MAINTENANCE_MODE,
      instructions: matches
        ? "Cookie set. Now visit /api/debug-preview (no ?preview=) to confirm it persisted."
        : "Token did not match — cookie not set.",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
