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
        // Delegate cookie-setting to /api/preview-auth, which always runs
        // through the Vercel server function and flushes cookies reliably.
        // Middleware cannot set cookies for prerendered (static) pages because
        // the Vercel adapter serves them before the middleware response pipeline.
        const cleanUrl = new URL(url);
        cleanUrl.searchParams.delete("preview");
        const then = cleanUrl.pathname + cleanUrl.search;

        const authUrl = new URL("/api/preview-auth", url.origin);
        authUrl.searchParams.set("token", secret);
        authUrl.searchParams.set("then", then || "/");
        return redirect(authUrl.toString(), 302);
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
