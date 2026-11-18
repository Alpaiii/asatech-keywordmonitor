import { describe, expect, it } from "vitest";
import { hasKeywordTargetFilters, parseKeywordTargetFilters } from "./filters";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("parseKeywordTargetFilters", () => {
  it("menerima seluruh filter valid", () => {
    expect(
      parseKeywordTargetFilters({
        project: uuid,
        pic: "unassigned",
        priority: "high",
        status: "at_risk",
        maintain: "enabled",
      }),
    ).toEqual({
      project: uuid,
      pic: "unassigned",
      priority: "high",
      status: "at_risk",
      maintain: "enabled",
    });
  });

  it("membuang nilai tidak valid", () => {
    expect(
      parseKeywordTargetFilters({
        project: "not-an-id",
        pic: "outsider",
        priority: "urgent",
        status: "invented",
        maintain: "yes",
      }),
    ).toEqual({});
  });

  it("menerima PIC UUID", () => {
    expect(parseKeywordTargetFilters({ pic: uuid }).pic).toBe(uuid);
  });

  it("mendeteksi filter aktif", () => {
    expect(hasKeywordTargetFilters({})).toBe(false);
    expect(hasKeywordTargetFilters({ status: "no_data" })).toBe(true);
  });
});
