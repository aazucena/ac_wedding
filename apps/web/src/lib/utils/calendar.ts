// lib/utils/calendar.ts — helpers for building "Add to Calendar" deep links
import { atTime, eventRange } from "../date";

const ICS_FMT = "yyyyMMdd'T'HHmmss";

/** Duration given to an event with no end time, for export targets that demand one. */
export const EXPORT_FALLBACK_MINUTES = 60;

export interface CalendarEvent {
  title: string;
  start: string; // YYYYMMDDTHHMMSS
  end: string; // YYYYMMDDTHHMMSS
  location?: string;
  description?: string;
}

export function buildGoogleUrl(e: CalendarEvent): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${e.start}/${e.end}`,
  });
  if (e.location) p.set("location", e.location);
  if (e.description) p.set("details", e.description);
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function buildOutlookUrl(e: CalendarEvent): string {
  const fmt = (s: string) =>
    `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:00`;
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: fmt(e.start),
    enddt: fmt(e.end),
  });
  if (e.location) p.set("location", e.location);
  if (e.description) p.set("body", e.description);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p}`;
}

/** Convert YYYY-MM-DD + HH:MM(:SS) → YYYYMMDDTHHMMSS */
export function toCalDt(date: string, time?: string | null): string {
  return atTime(date, time).toFormat(ICS_FMT);
}

/**
 * End datetime for a calendar export. Uses the real end when one is set,
 * rolling into the next day for overnight events. Endless events fall back to a
 * one-hour block because Google, Outlook and ICS all require a concrete DTEND —
 * unlike the on-page views, which render the start time alone.
 */
export function toCalEndDt(
  date: string,
  start?: string | null,
  end?: string | null,
): string {
  const r = eventRange(date, start, end);
  const dt = r.hasEnd
    ? r.end
    : r.start.plus({ minutes: EXPORT_FALLBACK_MINUTES });
  return dt.toFormat(ICS_FMT);
}
