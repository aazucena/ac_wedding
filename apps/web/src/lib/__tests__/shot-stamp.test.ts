import { describe, it, expect } from "vitest";
import { stampLayout, stampDateTime, stampHashtag } from "../shot-stamp";

/** The sizes real shots actually arrive at — see MAX_EDGE in scripts/camera.ts. */
const LANDSCAPE = { width: 2048, height: 1152 };
const PORTRAIT = { width: 1152, height: 2048 };
const SMALL = { width: 640, height: 480 };

describe("stampLayout", () => {
  it("keeps the stamp inside the frame", () => {
    for (const size of [LANDSCAPE, PORTRAIT, SMALL]) {
      const l = stampLayout(size);
      expect(l.right).toBeLessThan(size.width);
      expect(l.right).toBeGreaterThan(0);
      expect(l.tagBaseline).toBeLessThan(size.height);
      // The mark sits in the opposite corner and must clear both edges.
      expect(l.left).toBeGreaterThan(0);
      expect(l.logoTop).toBeGreaterThan(0);
      expect(l.logoTop + l.logoSize).toBeLessThanOrEqual(size.height);
      expect(l.left + l.logoSize).toBeLessThan(size.width);
      // The date sits above the tag line, and above the top of the frame is a
      // bug that would silently clip the whole stamp away.
      expect(l.dateBaseline).toBeLessThan(l.tagBaseline);
      expect(l.dateBaseline).toBeGreaterThan(0);
    }
  });

  it("gives portrait and landscape the same weight", () => {
    // Same short edge, rotated — the stamp should not change size just because
    // the phone was held the other way up.
    const a = stampLayout(LANDSCAPE);
    const b = stampLayout(PORTRAIT);
    expect(b.dateFont).toBe(a.dateFont);
    expect(b.tagFont).toBe(a.tagFont);
    expect(b.pad).toBe(a.pad);
  });

  it("scales with the image rather than sitting at a fixed size", () => {
    const big = stampLayout(LANDSCAPE);
    const small = stampLayout(SMALL);
    expect(big.dateFont).toBeGreaterThan(small.dateFont);
    expect(big.pad).toBeGreaterThan(small.pad);
  });

  it("stays readable on a tiny image", () => {
    // A heavy digital-zoom crop can be genuinely small. Below ~12px a monospace
    // date isn't a stamp, it's dirt on the photo.
    const l = stampLayout({ width: 200, height: 150 });
    expect(l.dateFont).toBeGreaterThanOrEqual(13);
    expect(l.tagFont).toBeGreaterThanOrEqual(9);
    expect(l.pad).toBeGreaterThanOrEqual(10);
  });

  it("keeps the date larger than the hashtag", () => {
    // The whole design decision: the date leads, the branding is quiet.
    for (const size of [LANDSCAPE, PORTRAIT, SMALL]) {
      const l = stampLayout(size);
      expect(l.tagFont).toBeLessThan(l.dateFont);
    }
  });

  it("survives degenerate dimensions instead of returning NaN", () => {
    for (const size of [
      { width: 0, height: 0 },
      { width: 1, height: 1 },
    ]) {
      const l = stampLayout(size);
      for (const v of Object.values(l)) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});

describe("stampDateTime", () => {
  const TZ = "America/Edmonton";

  it("writes the year in full", () => {
    // "26·'26" on the wedding date read as a typo, not a date.
    const out = stampDateTime(new Date("2026-09-27T00:00:00Z"), TZ);
    expect(out).toContain("09·26·2026");
    expect(out).not.toContain("'26");
  });

  it("includes the time of capture", () => {
    // 00:00 UTC on the 27th is 18:00 on the 26th in Edmonton.
    expect(stampDateTime(new Date("2026-09-27T00:00:00Z"), TZ)).toBe(
      "09·26·2026  6:00 PM",
    );
  });

  it("resolves in the venue's zone, not the device's", () => {
    // A guest whose phone is still on another timezone must stamp the venue's.
    const during = new Date("2026-09-27T02:00:00Z");
    expect(stampDateTime(during, TZ)).toBe("09·26·2026  8:00 PM");
    expect(stampDateTime(during, "Asia/Manila")).toBe("09·27·2026  10:00 AM");
  });

  it("lets a late shot honestly read the next day", () => {
    // 1am Edmonton — the camera stays open until 4am, and this is the real
    // record of when the photo happened.
    expect(stampDateTime(new Date("2026-09-27T07:00:00Z"), TZ)).toBe(
      "09·27·2026  1:00 AM",
    );
  });

  it("uses uppercase AM/PM rather than a locale's dotted form", () => {
    const out = stampDateTime(new Date("2026-09-26T18:00:00Z"), TZ);
    expect(out).toMatch(/ (AM|PM)$/);
  });

  it("falls back to device local time on an unknown zone", () => {
    const d = new Date("2026-09-26T18:00:00Z");
    expect(stampDateTime(d, "Not/AZone")).toMatch(
      /^\d{2}·\d{2}·\d{4}  \d{1,2}:\d{2} (AM|PM)$/,
    );
  });

  it("drops the line rather than stamping NaN on someone's photo", () => {
    expect(stampDateTime(new Date("nonsense"), TZ)).toBeNull();
  });
});

describe("stampHashtag", () => {
  it("adds the # the stored setting doesn't carry", () => {
    // Directus holds it bare — the live value is literally "AlTine2026".
    expect(stampHashtag("AlTine2026")).toBe("#AlTine2026");
  });

  it("doesn't double up when one is already there", () => {
    expect(stampHashtag("#AlTine2026")).toBe("#AlTine2026");
  });

  it("drops the line when there's no hashtag set", () => {
    for (const bad of [null, undefined, "", "   "]) {
      expect(stampHashtag(bad)).toBeNull();
    }
  });
});

describe("stampLayout halo", () => {
  it("scales the outline with the type", () => {
    // Fixed-width would blob on a small shot and vanish on a large one.
    const big = stampLayout(LANDSCAPE);
    const small = stampLayout(SMALL);
    expect(big.outline).toBeGreaterThan(small.outline);
  });

  it("never lets the stamp reach past its own padding", () => {
    // "09·26·2026  10:45 PM" is twenty monospace characters — long enough to
    // run off a narrow crop without a ceiling.
    for (const size of [
      LANDSCAPE,
      PORTRAIT,
      SMALL,
      { width: 200, height: 150 },
    ]) {
      const l = stampLayout(size);
      expect(l.maxWidth).toBeGreaterThan(0);
      expect(l.maxWidth).toBeLessThanOrEqual(size.width - l.pad);
    }
  });

  it("keeps the halo thin enough not to swallow the glyphs", () => {
    for (const size of [
      LANDSCAPE,
      PORTRAIT,
      SMALL,
      { width: 200, height: 150 },
    ]) {
      const l = stampLayout(size);
      expect(l.outline).toBeGreaterThanOrEqual(2);
      // Stroke is centred on the path, so half of it eats into the glyph.
      expect(l.outline).toBeLessThan(l.tagFont / 2);
    }
  });
});

describe("the mark", () => {
  it("sits in the corner opposite the text", () => {
    const l = stampLayout(LANDSCAPE);
    expect(l.left).toBeLessThan(l.right);
    // Left edge of the logo must not reach the right-aligned text block.
    expect(l.left + l.logoSize).toBeLessThan(l.right - l.maxWidth / 2);
  });

  it("is sized against the date line, not the small print", () => {
    // It stands alone now, so it carries more weight than when it was tucked
    // beside the hashtag at ~1.15x the tag size.
    const l = stampLayout(LANDSCAPE);
    expect(l.logoSize).toBeGreaterThan(l.dateFont);
    expect(l.logoSize).toBeGreaterThan(l.tagFont * 2);
  });

  it("never asks for more pixels than the 168px source has", () => {
    // Largest plausible shot is a square at MAX_EDGE. Upscaling would soften
    // artwork we were asked not to alter.
    const l = stampLayout({ width: 2048, height: 2048 });
    expect(l.logoSize).toBeLessThanOrEqual(168);
  });
});
