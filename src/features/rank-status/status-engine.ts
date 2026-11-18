export const RANK_STATUS_RULE_VERSION = "rank-status-v1";
export const AT_RISK_BEFORE_DEADLINE_DAYS = 7;

export type RankStatus =
  | "no_data"
  | "overdue"
  | "maintain_warning"
  | "stale"
  | "achieved"
  | "at_risk"
  | "on_track";

export type RankStatusTarget = {
  target_position: number;
  deadline: string | null;
  maintain_enabled: boolean;
  maintain_position_limit: number | null;
  check_frequency_days: number;
};

export type RankStatusCheckin = {
  id: string;
  source: string;
  position: number | null;
  not_found_top_100: boolean;
  checked_at: string;
  created_at: string;
};

export type RankStatusEvaluation = {
  status: RankStatus;
  ruleVersion: typeof RANK_STATUS_RULE_VERSION;
  explanation: string;
  basedOnCheckinId: string | null;
  ruleInput: {
    evaluatedAt: string;
    targetPosition: number;
    deadline: string | null;
    maintainEnabled: boolean;
    maintainPositionLimit: number | null;
    staleAfterDays: number;
    atRiskBeforeDeadlineDays: number;
    latestCheckin: RankStatusCheckin | null;
    previousSameSourceCheckin: RankStatusCheckin | null;
    trendWorsened: boolean;
  };
};

const DAY_MS = 86_400_000;

const STATUS_LABELS: Record<RankStatus, string> = {
  no_data: "Belum ada data",
  overdue: "Terlambat",
  maintain_warning: "Peringatan maintain",
  stale: "Data kedaluwarsa",
  achieved: "Target tercapai",
  at_risk: "Berisiko",
  on_track: "Sesuai jalur",
};

export function rankStatusLabel(status: RankStatus) {
  return STATUS_LABELS[status];
}

function compareNewest(left: RankStatusCheckin, right: RankStatusCheckin) {
  return (
    Date.parse(right.checked_at) - Date.parse(left.checked_at) ||
    Date.parse(right.created_at) - Date.parse(left.created_at) ||
    right.id.localeCompare(left.id)
  );
}

function utcDateMs(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function isWorse(
  latest: RankStatusCheckin,
  previous: RankStatusCheckin | null,
) {
  if (!previous) return false;
  if (latest.not_found_top_100) return !previous.not_found_top_100;
  if (previous.not_found_top_100 || latest.position === null) return false;
  return previous.position !== null && latest.position > previous.position;
}

export function evaluateRankStatus(
  target: RankStatusTarget,
  checkins: RankStatusCheckin[],
  evaluatedAt = new Date(),
): RankStatusEvaluation {
  const evaluatedAtIso = evaluatedAt.toISOString();
  const ordered = [...checkins].sort(compareNewest);
  const latest = ordered[0] ?? null;
  const previousSameSource = latest
    ? (ordered.find(
        (checkin, index) => index > 0 && checkin.source === latest.source,
      ) ?? null)
    : null;
  const trendWorsened = latest ? isWorse(latest, previousSameSource) : false;
  const maintainLimit = target.maintain_enabled
    ? (target.maintain_position_limit ?? 10)
    : target.maintain_position_limit;
  const ruleInput = {
    evaluatedAt: evaluatedAtIso,
    targetPosition: target.target_position,
    deadline: target.deadline,
    maintainEnabled: target.maintain_enabled,
    maintainPositionLimit: maintainLimit,
    staleAfterDays: target.check_frequency_days,
    atRiskBeforeDeadlineDays: AT_RISK_BEFORE_DEADLINE_DAYS,
    latestCheckin: latest,
    previousSameSourceCheckin: previousSameSource,
    trendWorsened,
  };
  const result = (
    status: RankStatus,
    explanation: string,
  ): RankStatusEvaluation => ({
    status,
    ruleVersion: RANK_STATUS_RULE_VERSION,
    explanation,
    basedOnCheckinId: latest?.id ?? null,
    ruleInput,
  });

  if (!latest) {
    return result("no_data", "Belum ada check-in posisi untuk target ini.");
  }

  const achieved =
    !latest.not_found_top_100 &&
    latest.position !== null &&
    latest.position <= target.target_position;
  const todayMs = utcDateMs(evaluatedAtIso.slice(0, 10));
  const deadlineMs = target.deadline ? utcDateMs(target.deadline) : null;
  const daysUntilDeadline =
    deadlineMs === null ? null : Math.round((deadlineMs - todayMs) / DAY_MS);

  if (daysUntilDeadline !== null && daysUntilDeadline < 0 && !achieved) {
    return result(
      "overdue",
      `Deadline ${target.deadline} telah lewat dan target posisi ≤ ${target.target_position} belum tercapai.`,
    );
  }

  const maintainWarning =
    target.maintain_enabled &&
    (latest.not_found_top_100 ||
      (latest.position !== null &&
        maintainLimit !== null &&
        latest.position > maintainLimit));
  if (maintainWarning) {
    return result(
      "maintain_warning",
      `Posisi terbaru melewati batas maintain ≤ ${maintainLimit}.`,
    );
  }

  const ageMs = evaluatedAt.getTime() - Date.parse(latest.checked_at);
  if (ageMs > target.check_frequency_days * DAY_MS) {
    return result(
      "stale",
      `Check-in terbaru lebih lama dari ${target.check_frequency_days} hari.`,
    );
  }

  if (achieved) {
    return result(
      "achieved",
      `Posisi terbaru ${latest.position} mencapai target ≤ ${target.target_position}.`,
    );
  }

  const deadlineAtRisk =
    daysUntilDeadline !== null &&
    daysUntilDeadline >= 0 &&
    daysUntilDeadline <= AT_RISK_BEFORE_DEADLINE_DAYS;
  if (deadlineAtRisk || trendWorsened) {
    const explanation = deadlineAtRisk
      ? `Deadline tinggal ${daysUntilDeadline} hari dan target posisi ≤ ${target.target_position} belum tercapai.`
      : `Dua observasi terbaru dari sumber ${latest.source} memburuk.`;
    return result("at_risk", explanation);
  }

  return result(
    "on_track",
    `Data masih fresh; target posisi ≤ ${target.target_position} belum tercapai tanpa pemicu risiko.`,
  );
}
