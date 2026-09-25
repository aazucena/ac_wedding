// lib/shot-stamp.ts — where the date stamp sits on a shared Roll Call shot.
//
// /camera is a disposable camera, so a shot a guest saves or shares gets what a
// disposable print got: the date and time burned orange into the bottom-right
// corner with the hashtag under it, and the mark alone in the bottom-left.
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
  /** Square logo, drawn in the OPPOSITE corner from the text. */
  logoSize: number;
  /** Top-left corner of the logo; `left` is also the block's left inset. */
  left: number;
  logoTop: number;
  /** Baseline y for each line; both lines are right-aligned at `right`. */
  dateBaseline: number;
  tagBaseline: number;
  right: number;
  /** Softening under the halo, so the outline doesn't read as a hard sticker. */
  shadowBlur: number;
  /**
   * Width of the dark halo stroked behind every glyph.
   *
   * Orange on a bright sky is about 2:1 against the background — legible in
   * isolation, invisible over a white tablecloth. The page solves the same
   * problem for its own controls with scrims (camera.css:124), but a scrim here
   * would darken a strip of the guest's photo. A halo is what subtitles use for
   * exactly this: it costs nothing but the glyph edges, and works over bright
   * and dark alike.
   */
  outline: number;
  /**
   * Widest the stamp may draw, passed straight to fillText/strokeText.
   *
   * "09·26·2026  10:45 PM" is twenty monospace characters. On a heavily zoomed
   * crop that can be a third of the frame, and without a ceiling it would run
   * off the left edge on the narrowest shots. Canvas condenses to fit rather
   * than clipping, so the worst case is slightly tight lettering.
   */
  maxWidth: number;
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

  // Bottom-left, opposite the date. Standing alone it carries more weight than
  // it did tucked beside the hashtag, so it's sized against the date line
  // rather than the small print. Never exceeds the 168px source, so it is only
  // ever scaled down.
  const logoSize = Math.max(18, Math.round(dateFont * 1.5));

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
    left: pad,
    logoTop: height - pad - logoSize,
    dateBaseline,
    tagBaseline,
    right: width - pad,
    shadowBlur: Math.max(2, Math.round(dateFont * 0.2)),
    // Scaled with the type, or it thickens into a blob on small shots and
    // disappears on large ones.
    outline: Math.max(2, Math.round(dateFont * 0.16)),
    maxWidth: Math.max(1, width - pad * 2),
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
 * "09·26·2026  10:45 PM" — interpunct spacing like a film date back rather than
 * slashes, which read as a filename.
 *
 * The year is written in full. A two-digit year put the day and the year beside
 * each other as "26·'26" on the wedding date itself, which reads as a mistake
 * rather than a date.
 *
 * Stamps the moment the shot was TAKEN, like a real date back. The reception
 * runs past midnight and the camera stays open until 4am, so shots from the end
 * of the night genuinely read 09·27 — that's the honest record of when they
 * happened, and it's the sort of detail that's nice to find later. The time is
 * the half that makes that worth having: which photos came before the first
 * dance, which came at 1am.
 *
 * Resolved in the VENUE's timezone, not the phone's. Guests travelling in may
 * still have their phone on another zone, and a photo taken at the reception
 * should carry the reception's time whoever shot it. Falls back to device local
 * time if the zone is unknown to the browser.
 *
 * Returns null for an invalid Date rather than stamping "NaN" on a photo.
 */
export function stampDateTime(
  when: Date,
  timeZone?: string | null,
): string | null {
  if (!(when instanceof Date) || Number.isNaN(when.getTime())) return null;

  // en-US for the uppercase AM/PM a date back printed; en-CA renders "p.m.".
  const parts = (tz?: string) =>
    new Intl.DateTimeFormat("en-US", {
      ...(tz ? { timeZone: tz } : {}),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(when);

  let resolved: Intl.DateTimeFormatPart[];
  try {
    resolved = parts(timeZone ?? undefined);
  } catch {
    // RangeError on an unrecognised zone — better the phone's clock than none.
    resolved = parts();
  }

  const find = (type: Intl.DateTimeFormatPartTypes) =>
    resolved.find((p) => p.type === type)?.value;
  const year = find("year");
  const month = find("month");
  const day = find("day");
  if (!year || !month || !day) return null;

  const date = `${month}·${day}·${year}`;

  const hour = find("hour");
  const minute = find("minute");
  const period = find("dayPeriod");
  if (!hour || !minute) return date; // date alone beats a broken clock

  const time = period
    ? `${hour}:${minute} ${period.toUpperCase()}`
    : `${hour}:${minute}`;

  // Two spaces: in monospace that's a clear gap between two separate readings,
  // without needing another separator glyph.
  return `${date}  ${time}`;
}
