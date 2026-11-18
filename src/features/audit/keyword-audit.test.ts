import { describe, expect, it } from "vitest";
import {
  buildKeywordAudit,
  type AuditCheckin,
  type AuditTarget,
} from "./keyword-audit";

const now = new Date("2026-11-18T12:00:00.000Z");
const target = (overrides: Partial<AuditTarget> = {}): AuditTarget => ({
  id: "target-1",
  project_id: "project-1",
  phrase: "jasa seo",
  priority: "high",
  assignee_user_id: "user-1",
  target_position: 5,
  deadline: null,
  maintain_enabled: false,
  maintain_position_limit: null,
  check_frequency_days: 14,
  ...overrides,
});
const checkin = (overrides: Partial<AuditCheckin> = {}): AuditCheckin => ({
  id: "checkin-1",
  keyword_target_id: "target-1",
  source: "manual",
  position: 8,
  not_found_top_100: false,
  checked_at: "2026-11-18T10:00:00.000Z",
  created_at: "2026-11-18T10:01:00.000Z",
  ...overrides,
});

describe("buildKeywordAudit", () => {
  it("membuat no_data dan no_pic yang traceable", () => {
    const items = buildKeywordAudit(
      [target({ assignee_user_id: null })],
      [],
      [],
      now,
    );

    expect(items.map((item) => item.category)).toEqual(["no_data", "no_pic"]);
    expect(items[0]).toMatchObject({
      basedOnCheckinId: null,
      ruleVersion: "rank-status-v1",
      evaluatedAt: now.toISOString(),
    });
  });

  it("membuat no_evidence dan target_failure dari check-in terbaru", () => {
    const items = buildKeywordAudit([target()], [checkin()], [], now);

    expect(items.map((item) => item.category)).toEqual([
      "no_evidence",
      "target_failure",
    ]);
    expect(items[0]?.basedOnCheckinId).toBe("checkin-1");
  });

  it("tidak membuat no_evidence atau failure saat target tercapai dan evidence ada", () => {
    const items = buildKeywordAudit(
      [target()],
      [checkin({ position: 4 })],
      [{ rank_checkin_id: "checkin-1" }],
      now,
    );

    expect(items).toEqual([]);
  });

  it("memakai evidence check-in terbaru, bukan evidence historis", () => {
    const items = buildKeywordAudit(
      [target()],
      [
        checkin({ id: "new", checked_at: "2026-11-18T10:00:00.000Z" }),
        checkin({ id: "old", checked_at: "2026-11-17T10:00:00.000Z" }),
      ],
      [{ rank_checkin_id: "old" }],
      now,
    );

    expect(items.some((item) => item.category === "no_evidence")).toBe(true);
    expect(items[0]?.basedOnCheckinId).toBe("new");
  });

  it("membuat kategori status operasional dari evaluasi live", () => {
    const items = buildKeywordAudit(
      [target({ deadline: "2026-11-01" })],
      [checkin()],
      [{ rank_checkin_id: "checkin-1" }],
      now,
    );

    expect(items.map((item) => item.category)).toEqual([
      "overdue",
      "target_failure",
    ]);
  });
});
