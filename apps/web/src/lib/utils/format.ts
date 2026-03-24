// utils/format.ts — date/time formatting via luxon
import qs from 'qs';
import type { DirectusFiles } from '../types';
import { DateTime } from 'luxon';
import { toDateTime } from '../date';

/**
 * Format a time string (HH:mm:ss or ISO) to a human-readable time.
 * e.g. "14:00:00" → "2:00 PM"
 */
export function formatTime(time: string, timezone = 'America/Edmonton'): string {
  const dt = time.includes('T')
    ? toDateTime(time, timezone)
    : DateTime.fromISO(`2000-01-01T${time}`, { zone: timezone });
  return dt.isValid ? dt.toFormat('h:mm a') : time;
}

/**
 * Format a date string to a localized date.
 * e.g. "2026-09-26" → "September 26, 2026"
 */
export function formatDate(date: string, format = 'MMMM d, yyyy', timezone = 'America/Edmonton'): string {
  const dt = toDateTime(date, timezone);
  return dt.isValid ? dt.toFormat(format) : date;
}

/**
 * Build a Directus asset URL routed through the /api/cms proxy.
 * Accepts a file UUID string or a DirectusFiles object.
 * Safe to use in both server-rendered and client-side contexts.
 * e.g. assetUrl(image, { width: 600, fit: 'cover' })
 *   → "/assets/abc-123?width=600&fit=cover"
 */
export function assetUrl(
  file: string | DirectusFiles,
  params?: { width?: number; height?: number; fit?: 'cover' | 'contain' | 'inside' | 'outside'; quality?: number; format?: string },
): string {
  const id   = typeof file === 'string' ? file : file.id;
  const base = `/assets/${id}`;
  return params && Object.keys(params).length
    ? `${base}?${qs.stringify(params, { encodeValuesOnly: true })}`
    : base;
}

/**
 * Strip non-digits from a phone number and return a `tel:` href value.
 * e.g. "(403) 123-4567" → "tel:+14031234567"
 */
export function toTelHref(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, '')}`;
}

/**
 * Calculate the countdown from now to a target date.
 * Returns { days, hours, minutes, seconds } or null if date is in the past.
 */
export function getCountdown(targetDate: string, timezone = 'America/Edmonton'): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} | null {
  const target = toDateTime(targetDate, timezone);
  const now = DateTime.now().setZone(timezone);
  const diff = target.diff(now, ['days', 'hours', 'minutes', 'seconds']);
  if (diff.milliseconds <= 0) return null;
  return {
    days:    Math.floor(diff.days),
    hours:   Math.floor(diff.hours),
    minutes: Math.floor(diff.minutes),
    seconds: Math.floor(diff.seconds),
  };
}
