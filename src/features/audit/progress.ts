import {
  evaluateRankStatus,
  type RankStatus,
} from "../rank-status/status-engine";
import type {
  AuditCheckin,
  AuditTarget,
  KeywordAuditItem,
} from "./keyword-audit";

export type TargetProgress = {
  targetId: string;
  projectId: string;
  assigneeUserId: string | null;
  status: RankStatus;
  achieved: boolean;
};

export type ProgressSummary = {
  totalTargets: number;
  achievedTargets: number;
  progressPercent: number;
  actionTargets: number;
  overdueTargets: number;
  staleTargets: number;
};

export type ProjectProgress = ProgressSummary & {
  projectId: string;
};

export type AssigneeProgress = ProgressSummary & {
  assigneeUserId: string;
};

function compareNewest(left: AuditCheckin, right: AuditCheckin) {
  return (
    Date.parse(right.checked_at) - Date.parse(left.checked_at) ||
    Date.parse(right.created_at) - Date.parse(left.created_at) ||
    right.id.localeCompare(left.id)
  );
}

export function evaluateTargetProgress(
  targets: AuditTarget[],
  checkins: AuditCheckin[],
  evaluatedAt = new Date(),
) {
  const checkinsByTarget = new Map<string, AuditCheckin[]>();
  for (const checkin of checkins) {
    const rows = checkinsByTarget.get(checkin.keyword_target_id) ?? [];
    rows.push(checkin);
    checkinsByTarget.set(checkin.keyword_target_id, rows);
  }

  return targets.map((target): TargetProgress => {
    const evaluation = evaluateRankStatus(
      target,
      (checkinsByTarget.get(target.id) ?? []).sort(compareNewest),
      evaluatedAt,
    );
    return {
      targetId: target.id,
      projectId: target.project_id,
      assigneeUserId: target.assignee_user_id,
      status: evaluation.status,
      achieved: evaluation.status === "achieved",
    };
  });
}

function summarize(rows: TargetProgress[], auditItems: KeywordAuditItem[]) {
  const targetIds = new Set(rows.map((row) => row.targetId));
  const actionTargetIds = new Set(
    auditItems
      .filter((item) => targetIds.has(item.targetId))
      .map((item) => item.targetId),
  );
  const totalTargets = rows.length;
  const achievedTargets = rows.filter((row) => row.achieved).length;

  return {
    totalTargets,
    achievedTargets,
    progressPercent:
      totalTargets === 0
        ? 0
        : Math.round((achievedTargets / totalTargets) * 100),
    actionTargets: actionTargetIds.size,
    overdueTargets: rows.filter((row) => row.status === "overdue").length,
    staleTargets: rows.filter((row) => row.status === "stale").length,
  } satisfies ProgressSummary;
}

export function buildProjectProgress(
  projectIds: string[],
  progress: TargetProgress[],
  auditItems: KeywordAuditItem[],
) {
  return projectIds.map((projectId): ProjectProgress => ({
    projectId,
    ...summarize(
      progress.filter((row) => row.projectId === projectId),
      auditItems,
    ),
  }));
}

export function buildAssigneeProgress(
  assigneeUserIds: string[],
  progress: TargetProgress[],
  auditItems: KeywordAuditItem[],
) {
  return assigneeUserIds.map((assigneeUserId): AssigneeProgress => ({
    assigneeUserId,
    ...summarize(
      progress.filter((row) => row.assigneeUserId === assigneeUserId),
      auditItems,
    ),
  }));
}
