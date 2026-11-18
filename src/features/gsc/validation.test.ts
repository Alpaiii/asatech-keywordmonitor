import { describe, expect, it } from "vitest";
import { gscFiltersSchema, gscTableFiltersSchema } from "./validation";

describe("GSC filter validation", () => {
  it("menerima periode dan default GSC", () => {
    expect(
      gscFiltersSchema.parse({
        startDate: "2026-10-01",
        endDate: "2026-10-28",
      }),
    ).toMatchObject({ searchType: "web" });
  });

  it("menolak periode terbalik", () => {
    expect(
      gscFiltersSchema.safeParse({
        startDate: "2026-10-28",
        endDate: "2026-10-01",
      }).success,
    ).toBe(false);
  });

  it("membatasi pagination", () => {
    expect(
      gscTableFiltersSchema.safeParse({
        startDate: "2026-10-01",
        endDate: "2026-10-28",
        limit: "101",
      }).success,
    ).toBe(false);
  });
});
