// TEMPORARY — delete after debugging preview token issue
import type { APIRoute } from "astro";
import { PREVIEW_TOKEN, MAINTENANCE_MODE } from "astro:env/server";

export const GET: APIRoute = ({ url, cookies }) => {
  const tokenParam = url.searchParams.get("preview") ?? "";
  const tokenCookie = cookies.get("preview_session")?.value ?? "";
  const secret = PREVIEW_TOKEN;

  return new Response(
    JSON.stringify({
      secret_set: !!secret,
      secret_length: secret.length,
      param_length: tokenParam.length,
      param_matches: tokenParam === secret,
      cookie_length: tokenCookie.length,
      cookie_matches: tokenCookie === secret,
      maintenance_mode: MAINTENANCE_MODE,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
