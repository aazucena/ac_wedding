// lib/utils/calendar.ts — helpers for building "Add to Calendar" deep links

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
  const t = (time ?? "00:00").slice(0, 5).replace(":", "");
  return date.replace(/-/g, "") + "T" + t + "00";
}

/** Derive an end datetime, defaulting to start + 1 hour if no end time given */
export function toCalEndDt(
  date: string,
  start?: string | null,
  end?: string | null,
): string {
  if (end) return toCalDt(date, end);
  const [h = 0, m = 0] = (start ?? "00:00").slice(0, 5).split(":").map(Number);
  const endH = String((h + 1) % 24).padStart(2, "0");
  return toCalDt(date, `${endH}:${String(m).padStart(2, "0")}`);
}
