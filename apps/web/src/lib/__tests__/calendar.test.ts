import { describe, it, expect } from "vitest";
import {
  buildGoogleUrl,
  toCalDt,
  toCalEndDt,
  EXPORT_FALLBACK_MINUTES,
} from "../utils/calendar";

describe("toCalDt", () => {
  it("formats a date + time as YYYYMMDDTHHMMSS", () => {
    expect(toCalDt("2026-09-26", "11:30:00")).toBe("20260926T113000");
  });

  it("accepts HH:mm without seconds", () => {
    expect(toCalDt("2026-09-26", "11:30")).toBe("20260926T113000");
  });

  it("falls back to midnight when no time is given", () => {
    expect(toCalDt("2026-09-26", null)).toBe("20260926T000000");
  });
});

describe("toCalEndDt", () => {
  it("uses the real end time when one is set", () => {
    expect(toCalEndDt("2026-09-26", "17:00:00", "21:00:00")).toBe(
      "20260926T210000",
    );
  });

  it("rolls an overnight end time into the next day", () => {
    expect(toCalEndDt("2026-09-20", "21:00:00", "01:00:00")).toBe(
      "20260921T010000",
    );
  });

  it("falls back to a one-hour block when there is no end time", () => {
    expect(EXPORT_FALLBACK_MINUTES).toBe(60);
    expect(toCalEndDt("2026-09-26", "11:30:00", null)).toBe("20260926T123000");
  });

  // Regression: the old `(h + 1) % 24` fallback produced 20260920T003000 —
  // an end 23 hours *before* the start.
  it("advances the date when the one-hour fallback crosses midnight", () => {
    expect(toCalEndDt("2026-09-20", "23:30:00", null)).toBe("20260921T003000");
  });

  it("never returns an end earlier than the start", () => {
    for (const start of ["00:00:00", "11:30:00", "23:00:00", "23:59:00"]) {
      expect(
        toCalEndDt("2026-09-20", start, null) >= toCalDt("2026-09-20", start),
      ).toBe(true);
    }
  });
});

describe("buildGoogleUrl", () => {
  it("encodes an endless event as a one-hour block that rolls over midnight", () => {
    const url = buildGoogleUrl({
      title: "Bachelor Party",
      start: toCalDt("2026-09-20", "23:30:00"),
      end: toCalEndDt("2026-09-20", "23:30:00", null),
    });
    expect(url).toContain("dates=20260920T233000%2F20260921T003000");
  });
});
