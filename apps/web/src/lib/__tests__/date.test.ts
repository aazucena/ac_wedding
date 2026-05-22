import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  toDateTime,
  getYear,
  getMonth,
  getDayOfWeek,
  toISODateString,
  durationBetween,
  durationFromMinutes,
  formatDuration,
  daysUntil,
} from "../date";

const TZ = "America/Edmonton";

// Pin "now" to a fixed UTC instant for deterministic daysUntil tests.
// 2026-01-01T07:00:00Z = 2026-01-01T00:00:00 Mountain (UTC-7 in January)
const FIXED_NOW = new Date("2026-01-01T07:00:00.000Z");

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

describe("toDateTime", () => {
  it("parses an ISO date string in the Edmonton timezone", () => {
    const dt = toDateTime("2026-09-26", TZ);
    expect(dt.isValid).toBe(true);
    expect(dt.zoneName).toBe(TZ);
    expect(dt.year).toBe(2026);
    expect(dt.month).toBe(9);
    expect(dt.day).toBe(26);
  });
});

describe("getYear / getMonth / getDayOfWeek", () => {
  it("extracts year from a date string", () => {
    expect(getYear("2026-09-26", TZ)).toBe(2026);
  });

  it("returns full month name in English", () => {
    expect(getMonth("2026-09-26", "en-US", TZ)).toBe("September");
  });

  it("returns full day-of-week name in English", () => {
    expect(getDayOfWeek("2026-09-26", "en-US", TZ)).toBe("Saturday");
  });
});

describe("toISODateString", () => {
  it("returns yyyy-MM-dd from an ISO datetime string", () => {
    expect(toISODateString("2026-09-26T14:00:00", TZ)).toBe("2026-09-26");
  });
});

describe("durationBetween", () => {
  it("calculates hours and minutes between two times", () => {
    const dur = durationBetween(
      "2026-09-26T14:00:00",
      "2026-09-26T15:30:00",
      TZ,
    );
    expect(dur.hours).toBe(1);
    expect(dur.minutes).toBe(30);
  });

  it("normalises past midnight correctly", () => {
    const dur = durationBetween(
      "2026-09-26T23:00:00",
      "2026-09-27T01:00:00",
      TZ,
    );
    expect(dur.hours).toBe(2);
    expect(dur.minutes).toBe(0);
  });
});

describe("durationFromMinutes", () => {
  it("converts 90 minutes to 1h 30m", () => {
    const dur = durationFromMinutes(90);
    expect(dur.hours).toBe(1);
    expect(dur.minutes).toBe(30);
  });

  it("converts 45 minutes (less than an hour)", () => {
    const dur = durationFromMinutes(45);
    expect(dur.hours).toBe(0);
    expect(dur.minutes).toBe(45);
  });
});

describe("formatDuration", () => {
  it("formats hours and minutes together", () => {
    expect(formatDuration(durationFromMinutes(90))).toBe("1h 30m");
  });

  it("formats whole hours with no minutes", () => {
    expect(formatDuration(durationFromMinutes(120))).toBe("2h");
  });

  it("formats minutes-only when under an hour", () => {
    expect(formatDuration(durationFromMinutes(45))).toBe("45m");
  });
});

describe("daysUntil", () => {
  // Now is pinned to 2026-01-01T00:00:00 Edmonton.

  it("returns a positive number for a future date", () => {
    expect(daysUntil("2026-09-26", TZ)).toBeGreaterThan(0);
  });

  it("returns a negative number for a past date", () => {
    expect(daysUntil("2025-01-01", TZ)).toBeLessThan(0);
  });

  it("rounds up partial days", () => {
    // Exactly 1 day ahead: 2026-01-02 midnight Edmonton = 2026-01-02T07:00:00Z
    // Now is 2026-01-01T00:00:00 Edmonton → diff is exactly 1.0 days → ceil = 1
    expect(daysUntil("2026-01-02", TZ)).toBe(1);
  });
});
