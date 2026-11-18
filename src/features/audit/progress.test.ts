import { describe, expect, it } from "vitest";
import type {
  AuditCheckin,
  AuditTarget,
  KeywordAuditItem,
} from "./keyword-audit";
import {
  buildAssigneeProgress,
  buildProjectProgress,
  evaluateTargetProgress,
} from "./progress";

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
  position: 4,
  not_found_top_100: false,
  checked_at: "2026-11-18T10:00:00.000Z",
  created_at: "2026-11-18T10:01:00.000Z",
  ...overrides,
});
const auditItem = (
  overrides: Partial<KeywordAuditItem> = {},
): KeywordAuditItem => ({
  id: "target-2:target_failure",
  category: "target_failure",
  targetId: "target-2",
  projectId: "project-1",
  phrase: "seo jakarta",
  priority: "medium",
  assigneeUserId: "user-1",
  basedOnCheckinId: "checkin-2",
  status: "on_track",
  ruleVersion: "rank-status-v1",
  evaluatedAt: now.toISOString(),
  explanation: "Belum tercapai.",
  ...overrides,
});

describe("audit progress", () => {
  it("menghitung progress project dari status live", () => {
    const targets = [
      target(),
      target({ id: "target-2", assignee_user_id: "user-1" }),
      target({ id: "target-3", project_id: "project-2" }),
    ];
    const checkins = [
      checkin(),
      checkin({
        id: "checkin-2",
        keyword_target_id: "target-2",
        position: 9,
      }),
    ];
    const progress = evaluateTargetProgress(targets, checkins, now);
    const summaries = buildProjectProgress(
      ["project-1", "project-2"],
      progress,
      [auditItem()],
    );

    expect(summaries[0]).toMatchObject({
      totalTargets: 2,
      achievedTargets: 1,
      progressPercent: 50,
      actionTargets: 1,
    });
    expect(summaries[1]).toMatchObject({
      totalTargets: 1,
      achievedTargets: 0,
      progressPercent: 0,
    });
  });

  it("menghitung target tindakan unik walau punya beberapa audit item", () => {
    const progress = evaluateTargetProgress(
      [target({ id: "target-2" })],
      [checkin({ keyword_target_id: "target-2", position: 9 })],
      now,
    );
    const summary = buildAssigneeProgress(["user-1"], progress, [
      auditItem(),
      auditItem({ id: "target-2:no_evidence", category: "no_evidence" }),
    ])[0];

    expect(summary.actionTargets).toBe(1);
  });

  it("tidak memasukkan target tanpa PIC ke performa PIC", () => {
    const progress = evaluateTargetProgress(
      [target({ assignee_user_id: null })],
      [checkin()],
      now,
    );
    const summary = buildAssigneeProgress(["user-1"], progress, [])[0];

    expect(summary.totalTargets).toBe(0);
    expect(summary.progressPercent).toBe(0);
  });
});
