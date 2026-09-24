import { describe, it, expect } from "vitest";
import { coverSourceRect, MAX_ASPECT } from "../camera-frame";

describe("coverSourceRect", () => {
  it("returns the whole frame when video and view share an aspect ratio", () => {
    const r = coverSourceRect({
      videoW: 1280,
      videoH: 720,
      viewW: 640,
      viewH: 360,
    });
    expect(r).toEqual({ sx: 0, sy: 0, sw: 1280, sh: 720 });
  });

  it("trims the sides when the video is wider than the view", () => {
    // 16:9 video shown in a 3:4 portrait viewfinder — inside the cap, so the
    // view's own aspect applies. (A real phone is narrower than 3:4 and gets
    // clamped to 9:16; that case is covered under "The 16:9 cap" below.)
    const r = coverSourceRect({
      videoW: 1920,
      videoH: 1080,
      viewW: 600,
      viewH: 800,
    });
    expect(r.sh).toBe(1080); // full height kept
    expect(r.sw).toBeCloseTo(1080 * 0.75, 5);
    expect(r.sx).toBeCloseTo((1920 - r.sw) / 2, 5); // centred
    expect(r.sy).toBe(0);
  });

  it("trims top and bottom when the video is taller than the view", () => {
    // 3:4 portrait video shown in a 3:2 landscape viewfinder — inside the cap,
    // so the view's own aspect is what applies.
    const r = coverSourceRect({
      videoW: 720,
      videoH: 960,
      viewW: 600,
      viewH: 400,
    });
    expect(r.sw).toBe(720); // full width kept
    expect(r.sh).toBeCloseTo(720 / 1.5, 5);
    expect(r.sy).toBeCloseTo((960 - r.sh) / 2, 5);
    expect(r.sx).toBe(0);
  });

  it("halves the window at 2x and keeps it centred", () => {
    const base = coverSourceRect({
      videoW: 1280,
      videoH: 720,
      viewW: 640,
      viewH: 360,
    });
    const zoomed = coverSourceRect({
      videoW: 1280,
      videoH: 720,
      viewW: 640,
      viewH: 360,
      zoom: 2,
    });
    expect(zoomed.sw).toBeCloseTo(base.sw / 2, 5);
    expect(zoomed.sh).toBeCloseTo(base.sh / 2, 5);
    // same centre point
    expect(zoomed.sx + zoomed.sw / 2).toBeCloseTo(base.sx + base.sw / 2, 5);
    expect(zoomed.sy + zoomed.sh / 2).toBeCloseTo(base.sy + base.sh / 2, 5);
  });

  it("keeps the rect inside the frame at extreme zoom", () => {
    const r = coverSourceRect({
      videoW: 1920,
      videoH: 1080,
      viewW: 390,
      viewH: 844,
      zoom: 50,
    });
    expect(r.sx).toBeGreaterThanOrEqual(0);
    expect(r.sy).toBeGreaterThanOrEqual(0);
    expect(r.sx + r.sw).toBeLessThanOrEqual(1920);
    expect(r.sy + r.sh).toBeLessThanOrEqual(1080);
  });

  it("treats zoom below 1 as no zoom", () => {
    const plain = coverSourceRect({
      videoW: 1280,
      videoH: 720,
      viewW: 640,
      viewH: 360,
    });
    expect(
      coverSourceRect({
        videoW: 1280,
        videoH: 720,
        viewW: 640,
        viewH: 360,
        zoom: 0.25,
      }),
    ).toEqual(plain);
  });

  it("falls back to the full frame before the video has loaded", () => {
    expect(
      coverSourceRect({ videoW: 0, videoH: 0, viewW: 390, viewH: 844 }),
    ).toEqual({ sx: 0, sy: 0, sw: 0, sh: 0 });
    expect(
      coverSourceRect({ videoW: 1280, videoH: 720, viewW: 0, viewH: 0 }),
    ).toEqual({ sx: 0, sy: 0, sw: 1280, sh: 720 });
  });

  it("produces a rect whose aspect ratio matches the viewfinder", () => {
    // A 4:3 viewfinder is well inside the cap, so it applies verbatim.
    for (const zoom of [1, 1.5, 2, 4]) {
      const r = coverSourceRect({
        videoW: 1920,
        videoH: 1080,
        viewW: 400,
        viewH: 300,
        zoom,
      });
      expect(r.sw / r.sh).toBeCloseTo(4 / 3, 5);
    }
  });

  // ── The 16:9 cap ─────────────────────────────────────────────────────────
  // A phone in landscape is wider than its sensor, so cropping strictly to the
  // screen saved a letterbox sliver. These pin the cap that stops it.

  it("keeps the whole 16:9 frame in landscape instead of a sliver", () => {
    // 915x356 — Android landscape with the address bar showing, ~2.57:1.
    const r = coverSourceRect({
      videoW: 1920,
      videoH: 1080,
      viewW: 915,
      viewH: 356,
    });
    expect(r).toEqual({ sx: 0, sy: 0, sw: 1920, sh: 1080 });
  });

  it("caps the crop at 16:9 however extreme the view gets", () => {
    for (const viewH of [400, 300, 200, 100]) {
      const r = coverSourceRect({
        videoW: 1920,
        videoH: 1080,
        viewW: 915,
        viewH,
      });
      expect(r.sw / r.sh).toBeLessThanOrEqual(MAX_ASPECT + 1e-9);
    }
  });

  it("caps portrait symmetrically at 9:16", () => {
    // 390x844 is ~0.46:1, narrower than 9:16 (0.5625).
    const r = coverSourceRect({
      videoW: 1080,
      videoH: 1920,
      viewW: 390,
      viewH: 844,
    });
    expect(r.sw / r.sh).toBeCloseTo(1 / MAX_ASPECT, 5);
    expect(r).toEqual({ sx: 0, sy: 0, sw: 1080, sh: 1920 });
  });

  it("still crops to portrait from a landscape sensor", () => {
    // The cap must not defeat the real job: a portrait shot off a 16:9 stream.
    const r = coverSourceRect({
      videoW: 1920,
      videoH: 1080,
      viewW: 390,
      viewH: 844,
    });
    expect(r.sh).toBe(1080); // full height
    expect(r.sw).toBeCloseTo(1080 / MAX_ASPECT, 5); // 9:16 slice of it
    expect(r.sx).toBeCloseTo((1920 - r.sw) / 2, 5);
  });

  it("composes with zoom rather than fighting it", () => {
    const r = coverSourceRect({
      videoW: 1920,
      videoH: 1080,
      viewW: 915,
      viewH: 356,
      zoom: 2,
    });
    expect(r.sw).toBeCloseTo(960, 5);
    expect(r.sh).toBeCloseTo(540, 5);
    expect(r.sw / r.sh).toBeCloseTo(MAX_ASPECT, 5);
  });

  it("honours an explicit maxAspect", () => {
    const r = coverSourceRect({
      videoW: 1920,
      videoH: 1080,
      viewW: 915,
      viewH: 356,
      maxAspect: 4 / 3,
    });
    expect(r.sw / r.sh).toBeCloseTo(4 / 3, 5);
    expect(r.sh).toBe(1080); // trims the sides of the 16:9 sensor, not the top
  });
});
