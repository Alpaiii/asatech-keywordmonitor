import { describe, expect, it } from "vitest";
import {
  evaluateRankStatus,
  RANK_STATUS_RULE_VERSION,
  type RankStatusCheckin,
  type RankStatusTarget,
} from "./status-engine";

const now = new Date("2026-11-16T12:00:00.000Z");
const target = (
  overrides: Partial<RankStatusTarget> = {},
): RankStatusTarget => ({
  target_position: 5,
  deadline: null,
  maintain_enabled: false,
  maintain_position_limit: null,
  check_frequency_days: 14,
  ...overrides,
});
const checkin = (
  overrides: Partial<RankStatusCheckin> = {},
): RankStatusCheckin => ({
  id: "latest",
  source: "manual",
  position: 8,
  not_found_top_100: false,
  checked_at: "2026-11-16T10:00:00.000Z",
  created_at: "2026-11-16T10:01:00.000Z",
  ...overrides,
});

describe("evaluateRankStatus", () => {
  it("mengikuti urutan prioritas no_data dan menyimpan versi/input", () => {
    const result = evaluateRankStatus(target(), [], now);
    expect(result.status).toBe("no_data");
    expect(result.ruleVersion).toBe(RANK_STATUS_RULE_VERSION);
    expect(result.basedOnCheckinId).toBeNull();
    expect(result.ruleInput.evaluatedAt).toBe(now.toISOString());
  });

  it("memilih overdue sebelum stale saat target belum tercapai", () => {
    const result = evaluateRankStatus(
      target({ deadline: "2026-11-10", check_frequency_days: 1 }),
      [checkin({ checked_at: "2026-11-01T10:00:00.000Z" })],
      now,
    );
    expect(result.status).toBe("overdue");
  });

  it("memilih maintain_warning sebelum stale", () => {
    const result = evaluateRankStatus(
      target({
        maintain_enabled: true,
        maintain_position_limit: 10,
        check_frequency_days: 1,
      }),
      [
        checkin({
          position: 12,
          checked_at: "2026-11-01T10:00:00.000Z",
        }),
      ],
      now,
    );
    expect(result.status).toBe("maintain_warning");
  });

  it("memberi stale ketika check-in melewati frequency", () => {
    const result = evaluateRankStatus(
      target({ check_frequency_days: 7 }),
      [checkin({ checked_at: "2026-11-01T10:00:00.000Z" })],
      now,
    );
    expect(result.status).toBe("stale");
  });

  it("memberi achieved untuk posisi sama atau lebih baik dari target", () => {
    const result = evaluateRankStatus(
      target(),
      [checkin({ position: 5 })],
      now,
    );
    expect(result.status).toBe("achieved");
  });

  it("memberi at_risk ketika deadline tinggal tujuh hari", () => {
    const result = evaluateRankStatus(
      target({ deadline: "2026-11-23" }),
      [checkin()],
      now,
    );
    expect(result.status).toBe("at_risk");
  });

  it("memberi at_risk saat dua observasi sumber sama memburuk", () => {
    const result = evaluateRankStatus(
      target(),
      [
        checkin({ id: "new", position: 9 }),
        checkin({
          id: "old",
          position: 7,
          checked_at: "2026-11-15T10:00:00.000Z",
          created_at: "2026-11-15T10:01:00.000Z",
        }),
      ],
      now,
    );
    expect(result.status).toBe("at_risk");
    expect(result.ruleInput.trendWorsened).toBe(true);
  });

  it("tidak membandingkan tren lintas sumber", () => {
    const result = evaluateRankStatus(
      target(),
      [
        checkin({ id: "new", source: "manual", position: 9 }),
        checkin({
          id: "old",
          source: "serp_provider",
          position: 7,
          checked_at: "2026-11-15T10:00:00.000Z",
        }),
      ],
      now,
    );
    expect(result.status).toBe("on_track");
    expect(result.ruleInput.previousSameSourceCheckin).toBeNull();
  });

  it("memberi on_track tanpa pemicu risiko", () => {
    expect(evaluateRankStatus(target(), [checkin()], now).status).toBe(
      "on_track",
    );
  });
});
