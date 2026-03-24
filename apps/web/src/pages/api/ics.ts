// apps/web/src/pages/api/ics.ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { getSettings, getEvents } from '../../lib/directus';

const eventSchema = z.enum(['ceremony', 'reception', 'brunch']);
const TZ = 'America/Edmonton';

/** Parse a Directus HH:mm:ss time string onto a given date (YYYY-MM-DD) */
function toIcsTimestamp(date: string, time: string): string {
  return DateTime.fromISO(`${date}T${time}`, { zone: TZ })
    .toFormat("yyyyMMdd'T'HHmmss");
}

export const GET: APIRoute = async ({ url }) => {
  const parsed = eventSchema.safeParse(url.searchParams.get('event') ?? 'ceremony');
  const id     = parsed.success ? parsed.data : 'ceremony';
  const now    = DateTime.now().toUTC().toFormat("yyyyMMdd'T'HHmmss") + 'Z';

  const [settings, allEvents] = await Promise.all([getSettings(), getEvents()]);

  const date     = settings.wedding_date ?? '2026-09-26';
  const nextDay  = DateTime.fromISO(date).plus({ days: 1 }).toISODate()!;

  const ceremony  = settings.ceremony;
  const reception = settings.reception;

  const ceremonyStart   = ceremony?.start_time ?? '14:00:00';
  const ceremonyDurMins = (ceremony as any)?.estimated_duration ?? 90;
  const ceremonyEnd     = DateTime.fromISO(`${date}T${ceremonyStart}`, { zone: TZ })
    .plus({ minutes: ceremonyDurMins })
    .toFormat("yyyyMMdd'T'HHmmss");

  const brunchEvent = allEvents.find(e =>
    e.name.toLowerCase().includes('brunch') && e.date === nextDay,
  );

  const events: Record<string, {
    uid: string; summary: string; dtstart: string; dtend: string;
    location: string; description: string;
  }> = {
    ceremony: {
      uid:         'ceremony-2026@aldrinandchristine.com',
      summary:     'Aldrin & Christine — Nuptial Mass',
      dtstart:     toIcsTimestamp(date, ceremonyStart),
      dtend:       ceremonyEnd,
      location:    ceremony?.venue?.name ?? 'Lethbridge, Alberta, Canada',
      description: 'Wedding ceremony — Nuptial Mass',
    },
    reception: {
      uid:         'reception-2026@aldrinandchristine.com',
      summary:     'Aldrin & Christine — Wedding Reception',
      dtstart:     toIcsTimestamp(date, reception?.start_time ?? '18:00:00'),
      dtend:       toIcsTimestamp(date, reception?.end_time   ?? '22:00:00'),
      location:    reception?.venue?.name ?? 'Lethbridge, Alberta, Canada',
      description: 'Wedding reception — dinner & celebration',
    },
    brunch: {
      uid:         'brunch-2026@aldrinandchristine.com',
      summary:     'Aldrin & Christine — Day-After Brunch',
      dtstart:     toIcsTimestamp(brunchEvent?.date ?? nextDay, brunchEvent?.start_time ?? '10:00:00'),
      dtend:       toIcsTimestamp(brunchEvent?.date ?? nextDay, brunchEvent?.end_time   ?? '12:00:00'),
      location:    brunchEvent?.venue?.name ?? 'Lethbridge, Alberta, Canada',
      description: 'Post-wedding brunch — all guests welcome',
    },
  };

  const event = events[id]!; // id is validated against enum keys above

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AldrinAndChristine//Wedding2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${TZ}:${event.dtstart}`,
    `DTEND;TZID=${TZ}:${event.dtend}`,
    `SUMMARY:${event.summary}`,
    `LOCATION:${event.location}`,
    `DESCRIPTION:${event.description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type':        'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${id}.ics"`,
    },
  });
};
