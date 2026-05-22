import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  formatTime,
  formatDate,
  assetUrl,
  toTelHref,
  getCountdown,
} from "../utils/format";
import type { DirectusFiles } from "../types";

// Pin "now" for deterministic getCountdown tests
const FIXED_NOW = new Date("2026-01-01T07:00:00.000Z"); // = 2026-01-01 00:00 Mountain

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

describe("formatTime", () => {
  it("formats HH:mm:ss to 12-hour time", () => {
    expect(formatTime("14:00:00")).toBe("2:00 PM");
    expect(formatTime("09:30:00")).toBe("9:30 AM");
    expect(formatTime("00:00:00")).toBe("12:00 AM");
    expect(formatTime("12:00:00")).toBe("12:00 PM");
  });

  it("formats an ISO datetime string", () => {
    expect(formatTime("2026-09-26T14:00:00")).toBe("2:00 PM");
  });

  it("returns the raw string when input is invalid", () => {
    expect(formatTime("not-a-time")).toBe("not-a-time");
  });
});

describe("formatDate", () => {
  it("formats an ISO date to the default long form", () => {
    expect(formatDate("2026-09-26")).toBe("September 26, 2026");
  });

  it("accepts a custom Luxon format string", () => {
    expect(formatDate("2026-09-26", "MM/dd/yyyy")).toBe("09/26/2026");
  });

  it("returns the raw string when input is invalid", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("assetUrl", () => {
  it("builds a path from a UUID string", () => {
    expect(assetUrl("abc-123")).toBe("/assets/abc-123");
  });

  it("builds a path from a DirectusFiles object", () => {
    const file = { id: "abc-123" } as DirectusFiles;
    expect(assetUrl(file)).toBe("/assets/abc-123");
  });

  it("appends qs-encoded query params", () => {
    expect(assetUrl("abc-123", { width: 600, fit: "cover" })).toBe(
      "/assets/abc-123?width=600&fit=cover",
    );
  });

  it("omits the query string when params object is empty", () => {
    expect(assetUrl("abc-123", {})).toBe("/assets/abc-123");
  });
});

describe("toTelHref", () => {
  it("strips formatting characters and prepends tel:+1", () => {
    expect(toTelHref("(403) 123-4567")).toBe("tel:+14031234567");
    expect(toTelHref("403.123.4567")).toBe("tel:+14031234567");
    expect(toTelHref("4031234567")).toBe("tel:+14031234567");
  });
});

describe("getCountdown", () => {
  it("returns null for a date in the past", () => {
    expect(getCountdown("2025-01-01")).toBeNull();
  });

  it("returns a countdown object for a future date", () => {
    const result = getCountdown("2026-09-26");
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      days: expect.any(Number),
      hours: expect.any(Number),
      minutes: expect.any(Number),
      seconds: expect.any(Number),
    });
    expect(result!.days).toBeGreaterThan(0);
  });
});
