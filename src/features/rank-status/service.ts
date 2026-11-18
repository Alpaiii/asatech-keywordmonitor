import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateRankStatus,
  type RankStatusTarget,
} from "@/features/rank-status/status-engine";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveRankStatusSnapshot(
  supabase: SupabaseClient,
  target: RankStatusTarget & { id: string; workspace_id: string },
  evaluatedAt = new Date(),
) {
  const { data: checkins, error: checkinsError } = await supabase
    .from("rank_checkins")
    .select("id, source, position, not_found_top_100, checked_at, created_at")
    .eq("keyword_target_id", target.id)
    .order("checked_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (checkinsError) return { error: checkinsError };

  const evaluation = evaluateRankStatus(target, checkins ?? [], evaluatedAt);
  const admin = createAdminClient();
  const { data: snapshot, error } = await admin
    .from("rank_status_snapshots")
    .insert({
      workspace_id: target.workspace_id,
      keyword_target_id: target.id,
      based_on_checkin_id: evaluation.basedOnCheckinId,
      status: evaluation.status,
      rule_version: evaluation.ruleVersion,
      explanation: evaluation.explanation,
      rule_input: evaluation.ruleInput,
      evaluated_at: evaluation.ruleInput.evaluatedAt,
    })
    .select(
      "id, status, rule_version, explanation, rule_input, based_on_checkin_id, evaluated_at, created_at",
    )
    .single();

  return { snapshot, error };
}
