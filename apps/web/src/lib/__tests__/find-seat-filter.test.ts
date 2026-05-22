import { describe, it, expect } from "vitest";
import { buildNameFilter } from "../utils/search";

describe("buildNameFilter", () => {
  it("uses _or across first/last/preferred_name for a single word", () => {
    const filter = buildNameFilter("Aldrin") as Record<string, unknown>;
    expect(filter).toHaveProperty("_or");
    const or = filter["_or"] as object[];
    expect(or).toHaveLength(3);
    // Verify all three name fields are searched
    expect(JSON.stringify(or)).toContain("first_name");
    expect(JSON.stringify(or)).toContain("last_name");
    expect(JSON.stringify(or)).toContain("preferred_name");
    // Value passed through
    expect(JSON.stringify(or)).toContain("Aldrin");
  });

  it("uses _and with first_name / last_name split for two words", () => {
    const filter = buildNameFilter("Aldrin Azucena") as Record<string, unknown>;
    expect(filter).toHaveProperty("_and");
    const and = filter["_and"] as object[];
    expect(and).toHaveLength(2);
    expect(JSON.stringify(and[0])).toContain("first_name");
    expect(JSON.stringify(and[0])).toContain("Aldrin");
    expect(JSON.stringify(and[1])).toContain("last_name");
    expect(JSON.stringify(and[1])).toContain("Azucena");
  });

  it("joins multiple trailing words as last name", () => {
    const filter = buildNameFilter("Ma Christine Ranada") as Record<
      string,
      unknown
    >;
    expect(filter).toHaveProperty("_and");
    const and = filter["_and"] as object[];
    expect(JSON.stringify(and[0])).toContain("Ma");
    // "Christine Ranada" becomes the last_name search
    expect(JSON.stringify(and[1])).toContain("Christine Ranada");
  });

  it("trims extra whitespace before splitting", () => {
    const single = buildNameFilter("  Aldrin  ") as Record<string, unknown>;
    expect(single).toHaveProperty("_or");

    const double = buildNameFilter("  Aldrin   Azucena  ") as Record<
      string,
      unknown
    >;
    expect(double).toHaveProperty("_and");
  });
});
