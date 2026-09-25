// lib/shot-stamp.ts — where the date stamp sits on a shared Roll Call shot.
//
// /camera is a disposable camera, so a shot a guest saves or shares gets what a
// disposable print got: the date burned orange into the bottom-right corner,
// with the insignia and hashtag small and quiet beneath it.
//
// Only the SHARED copy is stamped — never the one uploaded to the couple. See
// stampForSharing() in scripts/camera.ts for why that distinction is delicate.
//
// Pure and DOM-free on purpose, the same way lib/camera-frame.ts is: this is
// the arithmetic that decides whether the stamp is invisible on one phone and
// enormous on the next, so it's unit-tested without a browser.

export interface StampInput {
  /** Pixel dimensions of the image being stamped. */
  width: number;
  height: number;
}

export interface StampLayout {
  /** Inset from the right and bottom edges. */
  pad: number;
  /** Type size of the date line. */
  dateFont: number;
  /** Type size of the insignia + hashtag line. */
  tagFont: number;
  /** Square logo drawn to the left of the hashtag. */
  logoSize: number;
  /** Gap between the logo and the hashtag. */
  logoGap: number;
  /** Baseline y for each line; both lines are right-aligned at `right`. */
  dateBaseline: number;
  tagBaseline: number;
  right: number;
  /** Offset of the drop shadow that keeps the stamp legible over a bright frame. */
  shadowBlur: number;
}

/**
 * Everything scales off the SHORT edge.
 *
 * Shots are capped at MAX_EDGE = 2048 but are often smaller — the picker
 * fallback passes through whatever the phone produced, and a heavily zoomed
 * capture crops to a fraction of the sensor. A stamp in fixed pixels would be a
 * sliver on a big frame and a billboard on a small one. The short edge also
 * means portrait and landscape shots get the same visual weight rather than the
 * stamp tracking whichever way the phone was held.
 *
 * The floors matter more than the ratios: below roughly 12px a monospace date
 * stops being readable at all, at which point the stamp is just dirt on the
 * photo.
 */
export function stampLayout({ width, height }: StampInput): StampLayout {
  const short = Math.max(1, Math.min(width, height));

  const dateFont = Math.max(13, Math.round(short * 0.038));
  const tagFont = Math.max(9, Math.round(dateFont * 0.62));
  const pad = Math.max(10, Math.round(short * 0.04));

  const logoSize = Math.round(tagFont * 1.15);
  const logoGap = Math.max(3, Math.round(tagFont * 0.4));

  // Measured up from the bottom edge: the tag line sits on the padding, the
  // date sits a line above it. Leading is generous — a date stamp reads as two
  // separate marks, not a paragraph.
  const tagBaseline = height - pad;
  const dateBaseline = tagBaseline - Math.round(tagFont * 1.7);

  return {
    pad,
    dateFont,
    tagFont,
    logoSize,
    logoGap,
    dateBaseline,
    tagBaseline,
    right: width - pad,
    shadowBlur: Math.max(2, Math.round(dateFont * 0.25)),
  };
}

/**
 * The hashtag as it should read on the photo, with the leading `#` the stored
 * setting doesn't have — Directus holds it bare (`AlTine2026`), and every
 * on-screen use goes through components/Hashtag.astro, which prepends it. Canvas
 * text has no such component, so the rule lives here too.
 *
 * Returns null for an empty setting, so the stamp drops the line instead of
 * drawing a lone insignia next to nothing.
 */
export function stampHashtag(tag: string | null | undefined): string | null {
  const trimmed = tag?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

/**
 * "09·26·'26" — the interpunct spacing of a film date back rather than slashes,
 * which read as a filename.
 *
 * Stamps the moment the shot was TAKEN, like a real date back. The reception
 * runs past midnight and the camera stays open until 4am, so shots from the end
 * of the night genuinely read 09·27 — that's the honest record of when they
 * happened, and it's the sort of detail that's nice to find later.
 *
 * Resolved in the VENUE's timezone, not the phone's. Guests travelling in may
 * still have their phone on another zone, and a photo taken at the reception
 * should carry the reception's date whoever shot it. Falls back to device local
 * time if the zone is unknown to the browser.
 *
 * Returns null for an invalid Date rather than stamping "NaN" on a photo.
 */
export function stampDate(when: Date, timeZone?: string | null): string | null {
  if (!(when instanceof Date) || Number.isNaN(when.getTime())) return null;

  const parts = (tz?: string) =>
    new Intl.DateTimeFormat("en-CA", {
      ...(tz ? { timeZone: tz } : {}),
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(when);

  let resolved: Intl.DateTimeFormatPart[];
  try {
    resolved = parts(timeZone ?? undefined);
  } catch {
    // RangeError on an unrecognised zone — better the phone's date than none.
    resolved = parts();
  }

  const find = (type: Intl.DateTimeFormatPartTypes) =>
    resolved.find((p) => p.type === type)?.value;
  const year = find("year");
  const month = find("month");
  const day = find("day");
  if (!year || !month || !day) return null;

  return `${month}·${day}·'${year}`;
}
