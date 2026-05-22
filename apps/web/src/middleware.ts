// apps/web/src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import {
  MAINTENANCE_MODE,
  INTERNAL_URL,
  PREVIEW_TOKEN,
} from "astro:env/server";

const PREVIEW_COOKIE = "preview_session";
const PREVIEW_COOKIE_TTL = 60 * 60 * 2; // 2 hours

async function checkDirectusMaintenance(): Promise<boolean> {
  try {
    const res = await fetch(
      `${INTERNAL_URL}/api/cms/items/wedding_settings?fields=maintenance`,
      { signal: AbortSignal.timeout(3_000) },
    );
    if (!res.ok) return false;
    const json = await res.json();
    return json?.data?.maintenance === true;
  } catch {
    return false;
  }
}

export const onRequest = defineMiddleware(
  async ({ url, cookies, locals, redirect }, next) => {
    if (url.pathname === "/maintenance") return next();
    if (url.pathname.startsWith("/api/")) return next();

    // Preview token — bypasses maintenance mode and grants access to gated pages
    const secret = PREVIEW_TOKEN;
    if (secret) {
      const tokenParam = url.searchParams.get("preview");
      const tokenCookie = cookies.get(PREVIEW_COOKIE)?.value;

      if (tokenParam === secret) {
        // Redirect to the same URL without ?preview= so the cookie lands
        // on a fresh response we fully control. cookies.set() + next() does
        // not serialise into the response for prerendered (static) pages on
        // the Vercel adapter — only a response we construct ourselves does.
        const cleanUrl = new URL(url);
        cleanUrl.searchParams.delete("preview");
        return new Response(null, {
          status: 302,
          headers: {
            Location: cleanUrl.toString(),
            "Set-Cookie": `${PREVIEW_COOKIE}=${secret}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${PREVIEW_COOKIE_TTL}`,
          },
        });
      }

      if (tokenCookie === secret) {
        locals.isPreview = true;
        return next();
      }
    }

    // isPreview is only true when the token matched above — full bypass
    if (!locals.isPreview) {
      if (MAINTENANCE_MODE || (await checkDirectusMaintenance())) {
        return redirect("/maintenance", 307);
      }

      if (
        (url.pathname.startsWith("/print/") ||
          url.pathname.startsWith("/admin/")) &&
        !import.meta.env.DEV
      ) {
        return redirect("/", 307);
      }
    }

    return next();
  },
);
