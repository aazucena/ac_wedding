import { DateTime, Duration } from "luxon";

const DEFAULT_TIMEZONE = "America/Edmonton";

type DateInput = DateTime | string;

export function toDateTime(input: DateInput, timezone = DEFAULT_TIMEZONE): DateTime {
  return typeof input === "string"
    ? DateTime.fromISO(input, { zone: timezone })
    : input.setZone(timezone);
}

export function getYear(input: DateInput, timezone = DEFAULT_TIMEZONE): number {
  return toDateTime(input, timezone).year;
}

export function getMonth(input: DateInput, locale = "en-US", timezone = DEFAULT_TIMEZONE): string {
  return toDateTime(input, timezone).setLocale(locale).toFormat("MMMM");
}

export function getDayOfWeek(input: DateInput, locale = "en-US", timezone = DEFAULT_TIMEZONE): string {
  return toDateTime(input, timezone).setLocale(locale).toFormat("cccc");
}

export function toISODateString(input: DateInput, timezone = DEFAULT_TIMEZONE): string {
  return toDateTime(input, timezone).toISODate()!;
}

// ── Duration ──────────────────────────────────────────────────────────────────

/** Duration between two datetimes, normalised to hours + minutes. */
export function durationBetween(start: DateInput, end: DateInput, timezone = DEFAULT_TIMEZONE): Duration {
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
export function daysUntil(input: DateInput, timezone = DEFAULT_TIMEZONE): number {
  const diff = toDateTime(input, timezone).diff(DateTime.now().setZone(timezone), "days");
  return Math.ceil(diff.days);
}
