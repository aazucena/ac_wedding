// apps/web/src/pages/api/preview-auth.ts
// Sets the preview_session cookie and redirects to the intended destination.
// Middleware cannot reliably write Set-Cookie for prerendered pages on the
// Vercel adapter, so cookie-setting is delegated here (API routes always
// run through the server function and flush cookies correctly).
import type { APIRoute } from "astro";
import { PREVIEW_TOKEN } from "astro:env/server";

const PREVIEW_COOKIE = "preview_session";
const PREVIEW_COOKIE_TTL = 60 * 60 * 2; // 2 hours

export const GET: APIRoute = ({ url, cookies }) => {
  const token = url.searchParams.get("token") ?? "";
  const then = url.searchParams.get("then") ?? "/";
  const secret = PREVIEW_TOKEN;

  // Reject if token missing or doesn't match
  if (!secret || token !== secret) {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }

  // Set the session cookie — this always works from a dynamic API route
  cookies.set(PREVIEW_COOKIE, secret, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: PREVIEW_COOKIE_TTL,
  });

  // Redirect to the intended page (must be a relative path, no open-redirect)
  const safeTarget = then.startsWith("/") ? then : "/";
  return new Response(null, { status: 302, headers: { Location: safeTarget } });
};
