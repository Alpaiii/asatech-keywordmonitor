import { describe, expect, it } from "vitest";
import { keywordTargetSchema } from "./validation";

const validTarget = {
  phrase: "Jasa SEO Jakarta",
  countryCode: "ID",
  languageCode: "id",
  device: "mobile",
  location: "Jakarta",
  targetPosition: 5,
  priority: "high",
  deadline: "2026-12-31",
  maintainEnabled: true,
  maintainPositionLimit: 10,
  checkFrequencyDays: 7,
  assigneeUserId: "",
};

describe("keywordTargetSchema", () => {
  it("menerima target lengkap", () => {
    expect(keywordTargetSchema.safeParse(validTarget).success).toBe(true);
  });

  it("menolak target posisi di luar 1..100", () => {
    expect(
      keywordTargetSchema.safeParse({ ...validTarget, targetPosition: 101 })
        .success,
    ).toBe(false);
  });

  it("mewajibkan batas maintain saat aktif", () => {
    expect(
      keywordTargetSchema.safeParse({
        ...validTarget,
        maintainPositionLimit: "",
      }).success,
    ).toBe(false);
  });

  it("menolak frekuensi di luar 1..365 hari", () => {
    expect(
      keywordTargetSchema.safeParse({ ...validTarget, checkFrequencyDays: 0 })
        .success,
    ).toBe(false);
  });
});
