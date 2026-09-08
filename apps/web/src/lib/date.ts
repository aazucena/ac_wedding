import { DateTime, Duration } from "luxon";

const DEFAULT_TIMEZONE = "America/Edmonton";

type DateInput = DateTime | string;

export function toDateTime(
  input: DateInput,
  timezone = DEFAULT_TIMEZONE,
): DateTime {
  return typeof input === "string"
    ? DateTime.fromISO(input, { zone: timezone })
    : input.setZone(timezone);
}

export function getYear(input: DateInput, timezone = DEFAULT_TIMEZONE): number {
  return toDateTime(input, timezone).year;
}

export function getMonth(
  input: DateInput,
  locale = "en-US",
  timezone = DEFAULT_TIMEZONE,
): string {
  return toDateTime(input, timezone).setLocale(locale).toFormat("MMMM");
}

export function getDayOfWeek(
  input: DateInput,
  locale = "en-US",
  timezone = DEFAULT_TIMEZONE,
): string {
  return toDateTime(input, timezone).setLocale(locale).toFormat("cccc");
}

export function toISODateString(
  input: DateInput,
  timezone = DEFAULT_TIMEZONE,
): string {
  return toDateTime(input, timezone).toISODate()!;
}

// ── Event ranges ──────────────────────────────────────────────────────────────

/**
 * Combine a Directus date (`YYYY-MM-DD`) with a time (`HH:mm` or `HH:mm:ss`)
 * into a zoned DateTime. Missing or unparseable time → midnight.
 */
export function atTime(
  date: string,
  time?: string | null,
  timezone = DEFAULT_TIMEZONE,
): DateTime {
  const dt = DateTime.fromISO(`${date}T${time ?? "00:00:00"}`, {
    zone: timezone,
  });
  return dt.isValid ? dt : DateTime.fromISO(`${date}T00:00:00`, { zone: timezone });
}

export interface EventRange {
  start: DateTime;
  end: DateTime;
  /** false when the event has no end — `end` is then a copy of `start`. */
  hasEnd: boolean;
}

/**
 * Resolve an event's start/end into concrete DateTimes.
 *  - explicit end before start → next day (overnight event, e.g. 21:00 → 01:00)
 *  - no end but a duration → start + duration
 *  - no end and no duration → a point in time (end === start, hasEnd false)
 *
 * Never fabricates an end time: callers that require one (ICS/Google/Outlook
 * exports) opt in via `hasEnd`, while display code renders the start alone.
 */
export function eventRange(
  date: string,
  start?: string | null,
  end?: string | null,
  durationMinutes?: number | null,
  timezone = DEFAULT_TIMEZONE,
): EventRange {
  const s = atTime(date, start, timezone);
  if (end) {
    const e = atTime(date, end, timezone);
    return { start: s, end: e < s ? e.plus({ days: 1 }) : e, hasEnd: true };
  }
  if (durationMinutes) {
    return { start: s, end: s.plus({ minutes: durationMinutes }), hasEnd: true };
  }
  return { start: s, end: s, hasEnd: false };
}

// ── Duration ──────────────────────────────────────────────────────────────────

/** Duration between two datetimes, normalised to hours + minutes. */
export function durationBetween(
  start: DateInput,
  end: DateInput,
  timezone = DEFAULT_TIMEZONE,
): Duration {
  return toDateTime(end, timezone)
    .diff(toDateTime(start, timezone), ["hours", "minutes"])
    .shiftTo("hours", "minutes");
}

/** Convert a raw minute count (e.g. estimated_duration_minutes) to a Duration. */
export function durationFromMinutes(minutes: number): Duration {
  return Duration.fromObject({ minutes }).shiftTo("hours", "minutes");
}

/** Format a Duration to a readable string. e.g. "1h 30m", "45m" */
export function formatDuration(duration: Duration): string {
  const { hours = 0, minutes = 0 } = duration.toObject();
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

/** Days from now until a future date (always rounded up). */
export function daysUntil(
  input: DateInput,
  timezone = DEFAULT_TIMEZONE,
): number {
  const diff = toDateTime(input, timezone).diff(
    DateTime.now().setZone(timezone),
    "days",
  );
  return Math.ceil(diff.days);
}
