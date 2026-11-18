import { describe, expect, it } from "vitest";
import { rankCheckinSchema } from "./validation";

const base = {
  checkedAt: "2026-11-16T12:00",
  notes: "Observasi manual",
};

describe("rankCheckinSchema", () => {
  it("menerima posisi 1..100", () => {
    expect(
      rankCheckinSchema.safeParse({
        ...base,
        position: 8,
        notFoundTop100: false,
      }).success,
    ).toBe(true);
  });

  it("menerima tidak ditemukan top 100 tanpa posisi", () => {
    expect(
      rankCheckinSchema.safeParse({
        ...base,
        position: "",
        notFoundTop100: true,
      }).success,
    ).toBe(true);
  });

  it("menolak posisi dan not-found bersamaan", () => {
    expect(
      rankCheckinSchema.safeParse({
        ...base,
        position: 8,
        notFoundTop100: true,
      }).success,
    ).toBe(false);
  });

  it("menolak posisi di luar top 100", () => {
    expect(
      rankCheckinSchema.safeParse({
        ...base,
        position: 101,
        notFoundTop100: false,
      }).success,
    ).toBe(false);
  });

  it("menolak waktu check-in di masa depan", () => {
    expect(
      rankCheckinSchema.safeParse({
        ...base,
        checkedAt: "2099-01-01T00:00",
        position: 8,
        notFoundTop100: false,
      }).success,
    ).toBe(false);
  });
});
