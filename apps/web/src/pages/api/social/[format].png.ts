// apps/web/src/pages/api/social/[format].png.ts
// Serves social-media card PNGs.
//
// GET /api/social/square.png
// GET /api/social/dm.png
// GET /api/social/story.png
// GET /api/social/engagement.png
// GET /api/social/rsvp-reminder.png
// GET /api/social/countdown.png
// GET /api/social/wedding-morning.png
// GET /api/social/thank-you.png
//
// Optional query params:
//   ?photo=<directus-file-id>   — fetches photo from Directus and uses it as background
//   ?theme=dark                 — dark theme (default: light)

import type { APIRoute } from 'astro';
import { DIRECTUS_URL, DIRECTUS_TOKEN } from 'astro:env/server';
import { getSettings, getCeremony, getReception } from '@lib/directus';
import { renderSocialCard, type SocialFormat, type CardVariant, type SocialTheme } from '@lib/social-cards';
import { formatTime } from '@lib/print';

const VALID_FORMATS  = new Set<SocialFormat>(['square', 'split', 'vignette', 'bordered', 'dm', 'story']);
const VALID_VARIANTS = new Set<CardVariant>([
  'save-the-date', 'engagement', 'rsvp-reminder', 'countdown', 'wedding-morning', 'thank-you',
]);

async function fetchPhotoDataUrl(fileId: string, w: number, h: number): Promise<string | null> {
  try {
    const url = `${DIRECTUS_URL}/assets/${fileId}?width=${w}&height=${h}&fit=cover&quality=90&format=jpeg`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ params, url }) => {
  // Validate format (strip trailing '.png' captured by Astro's named param)
  const raw = (params.format ?? '').replace(/\.png$/i, '') as SocialFormat;
  if (!VALID_FORMATS.has(raw)) {
    return new Response('Not found', { status: 404 });
  }

  const format = raw;
  const photoId = url.searchParams.get('photo');
  const theme: SocialTheme = url.searchParams.get('theme') === 'dark' ? 'dark' : 'light';

  const rawVariant = url.searchParams.get('variant') ?? 'save-the-date';
  const variant: CardVariant = VALID_VARIANTS.has(rawVariant as CardVariant)
    ? (rawVariant as CardVariant)
    : 'save-the-date';

  // Dimensions needed to request the right crop from Directus
  const dims: Record<SocialFormat, [number, number]> = {
    square: [1080, 1080], split: [594, 1080], vignette: [1080, 1080],
    bordered: [1080, 1080], dm: [480, 630], story: [1080, 1100],
  };
  const [pw, ph] = dims[format];

  const [[settings, ceremony, reception], photoSrc] = await Promise.all([
    Promise.all([getSettings(), getCeremony(), getReception()]),
    photoId ? fetchPhotoDataUrl(photoId, pw, ph) : Promise.resolve(null),
  ]);

  const groom = settings.groom?.first_name ?? 'Aldrin';
  const bride = settings.bride?.first_name ?? 'Christine';
  const rawTag = settings.hashtag ?? 'AldrinAndChristine2026';
  const hashtag = rawTag.startsWith('#') ? rawTag : '#' + rawTag;

  const siteUrl = (import.meta.env.PUBLIC_SITE_URL ?? 'wedding.aazucena.com')
    .replace(/^https?:\/\//, '');

  const weddingDate = settings.wedding_date ?? '2026-09-26';
  const dateObj = new Date(weddingDate + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-CA', {
    month: 'long', day: 'numeric', year: 'numeric',
    timeZone: 'America/Edmonton',
  });
  const dayOfWeek = dateObj.toLocaleDateString('en-CA', {
    weekday: 'long', timeZone: 'America/Edmonton',
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysTo = Math.max(0, Math.ceil((dateObj.getTime() - today.getTime()) / 86_400_000));

  const png = await renderSocialCard(format, {
    groom,
    bride,
    date: formattedDate,
    day: dayOfWeek,
    location: ceremony.venue?.city ?? 'Lethbridge, Alberta',
    hashtag,
    ceremonyVenue:  ceremony.venue?.name   ?? 'Venue TBD',
    ceremonyTime:   formatTime(ceremony.start_time),
    receptionVenue: reception.venue?.name  ?? 'Venue TBD',
    receptionTime:  formatTime(reception.start_time),
    rsvpDeadline:   'August 1, 2026',
    siteUrl,
    daysTo,
  }, photoSrc, theme, variant);

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type':        'image/png',
      'Content-Disposition': `attachment; filename="${groom}-and-${bride}-${format}.png"`,
      'Cache-Control':       'no-store',
    },
  });
};
