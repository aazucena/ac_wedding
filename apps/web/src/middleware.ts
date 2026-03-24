// apps/web/src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { MAINTENANCE_MODE, INTERNAL_URL } from 'astro:env/server';

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

export const onRequest = defineMiddleware(async ({ url, redirect }, next) => {
  if (url.pathname === '/maintenance') return next();
  if (url.pathname.startsWith('/api/')) return next();
  if (MAINTENANCE_MODE || await checkDirectusMaintenance()) {
    return redirect('/maintenance', 307);
  }
  return next();
});
