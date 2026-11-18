import {
  evaluateRankStatus,
  type RankStatus,
  type RankStatusCheckin,
  type RankStatusTarget,
} from "../rank-status/status-engine";

export const AUDIT_CATEGORIES = [
  "no_data",
  "stale",
  "overdue",
  "maintain_warning",
  "no_pic",
  "no_evidence",
  "target_failure",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  no_data: "Belum ada data",
  stale: "Data kedaluwarsa",
  overdue: "Terlambat",
  maintain_warning: "Peringatan maintain",
  no_pic: "Tanpa PIC",
  no_evidence: "Tanpa evidence",
  target_failure: "Target belum tercapai",
};

export type AuditTarget = RankStatusTarget & {
  id: string;
  project_id: string;
  phrase: string;
  priority: string;
  assignee_user_id: string | null;
};

export type AuditCheckin = RankStatusCheckin & {
  keyword_target_id: string;
};

export type AuditEvidence = {
  rank_checkin_id: string;
};

export type KeywordAuditItem = {
  id: string;
  category: AuditCategory;
  targetId: string;
  projectId: string;
  phrase: string;
  priority: string;
  assigneeUserId: string | null;
  basedOnCheckinId: string | null;
  status: RankStatus;
  ruleVersion: string;
  evaluatedAt: string;
  explanation: string;
};

const STATUS_AUDIT_CATEGORIES = new Set<RankStatus>([
  "no_data",
  "stale",
  "overdue",
  "maintain_warning",
]);

function compareNewest(left: AuditCheckin, right: AuditCheckin) {
  return (
    Date.parse(right.checked_at) - Date.parse(left.checked_at) ||
    Date.parse(right.created_at) - Date.parse(left.created_at) ||
    right.id.localeCompare(left.id)
  );
}

export function buildKeywordAudit(
  targets: AuditTarget[],
  checkins: AuditCheckin[],
  evidence: AuditEvidence[],
  evaluatedAt = new Date(),
) {
  const checkinsByTarget = new Map<string, AuditCheckin[]>();
  for (const checkin of checkins) {
    const rows = checkinsByTarget.get(checkin.keyword_target_id) ?? [];
    rows.push(checkin);
    checkinsByTarget.set(checkin.keyword_target_id, rows);
  }

  const evidenceCheckinIds = new Set(
    evidence.map((row) => row.rank_checkin_id),
  );
  const items: KeywordAuditItem[] = [];

  for (const target of targets) {
    const targetCheckins = (checkinsByTarget.get(target.id) ?? []).sort(
      compareNewest,
    );
    const evaluation = evaluateRankStatus(target, targetCheckins, evaluatedAt);
    const latest = targetCheckins[0] ?? null;
    const base = {
      targetId: target.id,
      projectId: target.project_id,
      phrase: target.phrase,
      priority: target.priority,
      assigneeUserId: target.assignee_user_id,
      basedOnCheckinId: evaluation.basedOnCheckinId,
      status: evaluation.status,
      ruleVersion: evaluation.ruleVersion,
      evaluatedAt: evaluation.ruleInput.evaluatedAt,
    };
    const add = (category: AuditCategory, explanation: string) => {
      items.push({
        ...base,
        id: `${target.id}:${category}`,
        category,
        explanation,
      });
    };

    if (STATUS_AUDIT_CATEGORIES.has(evaluation.status)) {
      add(evaluation.status as AuditCategory, evaluation.explanation);
    }
    if (!target.assignee_user_id) {
      add("no_pic", "Target belum memiliki PIC workspace.");
    }
    if (latest && !evidenceCheckinIds.has(latest.id)) {
      add(
        "no_evidence",
        `Check-in terbaru ${latest.checked_at} belum memiliki evidence.`,
      );
    }
    if (
      latest &&
      (latest.not_found_top_100 ||
        latest.position === null ||
        latest.position > target.target_position)
    ) {
      add(
        "target_failure",
        latest.not_found_top_100
          ? `Check-in terbaru tidak menemukan keyword di top 100; target posisi ≤ ${target.target_position} belum tercapai.`
          : `Posisi terbaru ${latest.position} belum mencapai target ≤ ${target.target_position}.`,
      );
    }
  }

  return items;
}
