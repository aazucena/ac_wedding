import { describe, it, expect } from "vitest";
import { coverSourceRect } from "../camera-frame";

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
    // 16:9 video shown in a 9:16 portrait viewfinder.
    const r = coverSourceRect({
      videoW: 1920,
      videoH: 1080,
      viewW: 390,
      viewH: 844,
    });
    expect(r.sh).toBe(1080); // full height kept
    expect(r.sw).toBeCloseTo(1080 * (390 / 844), 5);
    expect(r.sx).toBeCloseTo((1920 - r.sw) / 2, 5); // centred
    expect(r.sy).toBe(0);
  });

  it("trims top and bottom when the video is taller than the view", () => {
    // 3:4 portrait video shown in a landscape viewfinder.
    const r = coverSourceRect({
      videoW: 720,
      videoH: 960,
      viewW: 844,
      viewH: 390,
    });
    expect(r.sw).toBe(720); // full width kept
    expect(r.sh).toBeCloseTo(720 / (844 / 390), 5);
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
    for (const zoom of [1, 1.5, 2, 4]) {
      const r = coverSourceRect({
        videoW: 1920,
        videoH: 1080,
        viewW: 390,
        viewH: 844,
        zoom,
      });
      expect(r.sw / r.sh).toBeCloseTo(390 / 844, 5);
    }
  });
});
