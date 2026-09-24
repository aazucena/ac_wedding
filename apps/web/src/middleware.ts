// apps/web/src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import { MAINTENANCE_MODE, PREVIEW_TOKEN } from "astro:env/server";
import { cmsTarget } from "./lib/cms-transport";

const PREVIEW_COOKIE = "preview_session";
const PREVIEW_COOKIE_TTL = 60 * 60 * 2; // 2 hours

async function checkDirectusMaintenance(): Promise<boolean> {
  try {
    const { url, headers } = cmsTarget("/items/wedding_settings");
    const res = await fetch(`${url}?fields=maintenance`, {
      headers,
      signal: AbortSignal.timeout(3_000),
    });
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
    //
    // A strict === on the raw values fails silently on a trailing newline or a
    // case difference, and that failure is indistinguishable from a wrong
    // token — expensive to diagnose at exactly the moment you need in.
    //
    // Normalised only when the secret is hex/UUID-shaped, where case carries NO
    // information — "A1B2" and "a1b2" are the same number, so folding case on
    // hex costs zero entropy. A token of any other character class is compared
    // exactly as stored, untouched.
    //
    // Both sides are normalised in the hex case, because the whitespace that
    // breaks this usually rides on the STORED value (pasted into a dashboard),
    // not on the URL.
    const hexish = /^\s*[0-9a-f-]+\s*$/i.test(PREVIEW_TOKEN);
    const norm = (v: string | null | undefined) => {
      const raw = (v ?? "").trim();
      return hexish ? raw.toLowerCase() : raw;
    };

    const secret = hexish ? norm(PREVIEW_TOKEN) : PREVIEW_TOKEN;
    if (secret) {
      const tokenParam = norm(url.searchParams.get("preview"));
      const tokenCookie = norm(cookies.get(PREVIEW_COOKIE)?.value);

      if (tokenParam === secret) {
        locals.isPreview = true;
        const response = await next();
        response.headers.append(
          "Set-Cookie",
          `${PREVIEW_COOKIE}=${secret}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${PREVIEW_COOKIE_TTL}`,
        );
        return response;
      }

      if (tokenCookie === secret) {
        locals.isPreview = true;
        return next();
      }
    }

    if (
      (url.pathname.startsWith("/print/") ||
        url.pathname.startsWith("/admin/")) &&
      !locals.isPreview &&
      !import.meta.env.DEV
    ) {
      return redirect("/", 307);
    }

    if (MAINTENANCE_MODE || (await checkDirectusMaintenance())) {
      return redirect("/maintenance", 307);
    }

    return next();
  },
);
