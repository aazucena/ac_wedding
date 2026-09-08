import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  atTime,
  eventRange,
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

describe("atTime", () => {
  it("combines a Directus date and HH:mm:ss time in the Edmonton zone", () => {
    const dt = atTime("2026-09-26", "11:30:00", TZ);
    expect(dt.zoneName).toBe(TZ);
    expect(dt.toFormat("yyyy-MM-dd HH:mm")).toBe("2026-09-26 11:30");
  });

  it("accepts HH:mm without seconds", () => {
    expect(atTime("2026-09-26", "11:30", TZ).toFormat("HH:mm")).toBe("11:30");
  });

  it("falls back to midnight when the time is missing or unparseable", () => {
    expect(atTime("2026-09-26", null, TZ).toFormat("HH:mm")).toBe("00:00");
    expect(atTime("2026-09-26", "not-a-time", TZ).toFormat("HH:mm")).toBe(
      "00:00",
    );
  });
});

describe("eventRange", () => {
  it("treats an event with no end time as a point in time", () => {
    const r = eventRange("2026-09-26", "11:30:00", null, null, TZ);
    expect(r.hasEnd).toBe(false);
    expect(r.end.toISO()).toBe(r.start.toISO());
  });

  // Regression: the old `(h + 1) % 24` default wrapped the clock without
  // advancing the date, so 23:30 produced an end of 00:30 the *same* day.
  it("never invents an end that precedes a late-night start", () => {
    const r = eventRange("2026-09-20", "23:30:00", null, null, TZ);
    expect(r.hasEnd).toBe(false);
    expect(r.end >= r.start).toBe(true);
    expect(r.end.toFormat("yyyy-MM-dd HH:mm")).toBe("2026-09-20 23:30");
  });

  it("rolls an overnight end time into the next day", () => {
    const r = eventRange("2026-09-20", "21:00:00", "01:00:00", null, TZ);
    expect(r.hasEnd).toBe(true);
    expect(r.end.toFormat("yyyy-MM-dd HH:mm")).toBe("2026-09-21 01:00");
  });

  it("keeps a same-day end time on the same day", () => {
    const r = eventRange("2026-09-26", "17:00:00", "21:00:00", null, TZ);
    expect(r.hasEnd).toBe(true);
    expect(r.end.toFormat("yyyy-MM-dd HH:mm")).toBe("2026-09-26 21:00");
  });

  it("derives an end from a duration when no end time is set", () => {
    const r = eventRange("2026-09-26", "12:00:00", null, 60, TZ);
    expect(r.hasEnd).toBe(true);
    expect(r.end.toFormat("HH:mm")).toBe("13:00");
  });

  it("prefers an explicit end time over a duration", () => {
    const r = eventRange("2026-09-26", "12:00:00", "12:45:00", 60, TZ);
    expect(r.end.toFormat("HH:mm")).toBe("12:45");
  });

  it("defaults a missing start to midnight without throwing", () => {
    const r = eventRange("2026-09-26", null, null, null, TZ);
    expect(r.hasEnd).toBe(false);
    expect(r.start.toFormat("HH:mm")).toBe("00:00");
  });
});
