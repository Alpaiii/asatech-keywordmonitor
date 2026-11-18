"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseBulkKeywordTargetFormData } from "@/features/keyword-targets/bulk";
import { parseKeywordTargetFormData } from "@/features/keyword-targets/validation";
import { parseRankCheckinFormData } from "@/features/rank-checkins/validation";
import { saveRankStatusSnapshot } from "@/features/rank-status/service";
import {
  requireKeywordTargetAccess,
  requireProjectAccess,
  requireWorkspaceMembership,
} from "@/lib/auth/authorization";

export type KeywordTargetActionState = {
  error?: string;
};

export type RankCheckinActionState = {
  error?: string;
};

export type BulkKeywordTargetActionState = {
  error?: string;
  updated?: number;
  statusFailures?: number;
};

const idSchema = z.string().uuid();

function targetError(error: { code?: string } | null) {
  if (error?.code === "23505") {
    return "Keyword dengan locale, device, dan lokasi tersebut sudah ada.";
  }
  if (error?.code === "23503") {
    return "PIC harus menjadi anggota workspace ini.";
  }
  return "Target keyword gagal disimpan. Coba lagi.";
}

export async function bulkUpdateKeywordTargets(
  _state: BulkKeywordTargetActionState,
  formData: FormData,
): Promise<BulkKeywordTargetActionState> {
  const workspaceId = idSchema.safeParse(formData.get("workspaceId"));
  if (!workspaceId.success) return { error: "Workspace tidak valid." };
  const parsed = parseBulkKeywordTargetFormData(formData);
  if (!parsed.success) return { error: parsed.error };

  const { supabase } = await requireWorkspaceMembership(workspaceId.data);
  const { data: targets, error: targetsError } = await supabase
    .from("keyword_targets")
    .select(
      "id, workspace_id, target_position, deadline, maintain_enabled, maintain_position_limit, check_frequency_days",
    )
    .eq("workspace_id", workspaceId.data)
    .in("id", parsed.data.targetIds);

  if (targetsError) return { error: "Target keyword gagal dibaca." };
  if ((targets ?? []).length !== parsed.data.targetIds.length) {
    return {
      error:
        "Pilihan target tidak valid atau bukan bagian dari workspace aktif.",
    };
  }

  let updateError: { code?: string } | null = null;
  if (parsed.data.operation === "priority") {
    const result = await supabase
      .from("keyword_targets")
      .update({ priority: parsed.data.priority })
      .eq("workspace_id", workspaceId.data)
      .in("id", parsed.data.targetIds);
    updateError = result.error;
  } else if (parsed.data.operation === "assignee") {
    const result = await supabase
      .from("keyword_targets")
      .update({ assignee_user_id: parsed.data.assigneeUserId })
      .eq("workspace_id", workspaceId.data)
      .in("id", parsed.data.targetIds);
    updateError = result.error;
  }

  if (updateError) return { error: targetError(updateError) };

  let statusFailures = 0;
  if (parsed.data.operation === "evaluate") {
    const evaluations = await Promise.all(
      (targets ?? []).map((target) => saveRankStatusSnapshot(supabase, target)),
    );
    statusFailures = evaluations.filter((result) => result.error).length;
  }

  revalidatePath("/dashboard/keywords");
  for (const target of targets ?? []) {
    revalidatePath(`/dashboard/keywords/${target.id}`);
  }

  if (statusFailures === (targets ?? []).length) {
    return { error: "Evaluasi status seluruh target gagal." };
  }

  return {
    updated: (targets ?? []).length - statusFailures,
    statusFailures: statusFailures || undefined,
  };
}

export async function createKeywordTarget(
  _state: KeywordTargetActionState,
  formData: FormData,
): Promise<KeywordTargetActionState> {
  const projectId = idSchema.safeParse(formData.get("projectId"));
  if (!projectId.success) return { error: "Project tidak valid." };
  const parsed = parseKeywordTargetFormData(formData);
  if (!parsed.success) return { error: parsed.error };

  const { supabase, user, project } = await requireProjectAccess(
    projectId.data,
  );
  const { data: target, error } = await supabase
    .from("keyword_targets")
    .insert({
      workspace_id: project.workspace_id,
      project_id: project.id,
      phrase: parsed.data.phrase,
      country_code: parsed.data.countryCode,
      language_code: parsed.data.languageCode,
      device: parsed.data.device,
      location: parsed.data.location,
      target_position: parsed.data.targetPosition,
      priority: parsed.data.priority,
      deadline: parsed.data.deadline,
      maintain_enabled: parsed.data.maintainEnabled,
      maintain_position_limit: parsed.data.maintainPositionLimit,
      check_frequency_days: parsed.data.checkFrequencyDays,
      assignee_user_id: parsed.data.assigneeUserId,
      created_by: user.id,
    })
    .select(
      "id, workspace_id, target_position, deadline, maintain_enabled, maintain_position_limit, check_frequency_days",
    )
    .single();

  if (error || !target) return { error: targetError(error) };

  const { error: statusError } = await saveRankStatusSnapshot(supabase, target);
  revalidatePath(`/dashboard/projects/${project.id}/keywords`);
  redirect(
    `/dashboard/projects/${project.id}/keywords?created=1${statusError ? "&statusError=1" : ""}`,
  );
}

export async function updateKeywordTarget(
  _state: KeywordTargetActionState,
  formData: FormData,
): Promise<KeywordTargetActionState> {
  const targetId = idSchema.safeParse(formData.get("targetId"));
  if (!targetId.success) return { error: "Target keyword tidak valid." };
  const parsed = parseKeywordTargetFormData(formData);
  if (!parsed.success) return { error: parsed.error };

  const { supabase, target } = await requireKeywordTargetAccess(targetId.data);
  const { error } = await supabase
    .from("keyword_targets")
    .update({
      phrase: parsed.data.phrase,
      country_code: parsed.data.countryCode,
      language_code: parsed.data.languageCode,
      device: parsed.data.device,
      location: parsed.data.location,
      target_position: parsed.data.targetPosition,
      priority: parsed.data.priority,
      deadline: parsed.data.deadline,
      maintain_enabled: parsed.data.maintainEnabled,
      maintain_position_limit: parsed.data.maintainPositionLimit,
      check_frequency_days: parsed.data.checkFrequencyDays,
      assignee_user_id: parsed.data.assigneeUserId,
    })
    .eq("id", target.id);

  if (error) return { error: targetError(error) };

  const { error: statusError } = await saveRankStatusSnapshot(supabase, {
    ...target,
    target_position: parsed.data.targetPosition,
    deadline: parsed.data.deadline,
    maintain_enabled: parsed.data.maintainEnabled,
    maintain_position_limit: parsed.data.maintainPositionLimit,
    check_frequency_days: parsed.data.checkFrequencyDays,
  });
  revalidatePath(`/dashboard/projects/${target.project_id}/keywords`);
  revalidatePath(`/dashboard/keywords/${target.id}`);
  redirect(
    `/dashboard/keywords/${target.id}?saved=1${statusError ? "&statusError=1" : ""}`,
  );
}

export async function createRankCheckin(
  _state: RankCheckinActionState,
  formData: FormData,
): Promise<RankCheckinActionState> {
  const targetId = idSchema.safeParse(formData.get("targetId"));
  if (!targetId.success) return { error: "Target keyword tidak valid." };
  const parsed = parseRankCheckinFormData(formData);
  if (!parsed.success) return { error: parsed.error };

  const { supabase, user, target } = await requireKeywordTargetAccess(
    targetId.data,
  );
  const { error } = await supabase.from("rank_checkins").insert({
    workspace_id: target.workspace_id,
    keyword_target_id: target.id,
    source: "manual",
    position: parsed.data.position,
    not_found_top_100: parsed.data.notFoundTop100,
    checked_at: parsed.data.checkedAt,
    country_code: target.country_code,
    device: target.device,
    location: target.location,
    notes: parsed.data.notes,
    created_by: user.id,
  });

  if (error) return { error: "Check-in gagal disimpan. Coba lagi." };

  const { error: statusError } = await saveRankStatusSnapshot(supabase, target);
  if (statusError) {
    revalidatePath(`/dashboard/keywords/${target.id}`);
    redirect(`/dashboard/keywords/${target.id}?checkin=1&statusError=1`);
  }

  revalidatePath(`/dashboard/keywords/${target.id}`);
  redirect(`/dashboard/keywords/${target.id}?checkin=1`);
}

export async function evaluateKeywordTargetStatus(formData: FormData) {
  const targetId = idSchema.safeParse(formData.get("targetId"));
  if (!targetId.success) return;

  const { supabase, target } = await requireKeywordTargetAccess(targetId.data);
  const { error } = await saveRankStatusSnapshot(supabase, target);

  revalidatePath(`/dashboard/keywords/${target.id}`);
  redirect(
    `/dashboard/keywords/${target.id}?${error ? "statusError=1" : "status=1"}`,
  );
}

export async function deleteKeywordTarget(formData: FormData) {
  const targetId = idSchema.safeParse(formData.get("targetId"));
  if (!targetId.success) return;

  const { supabase, target, membership } = await requireKeywordTargetAccess(
    targetId.data,
  );
  if (membership.role !== "owner") {
    redirect(`/dashboard/keywords/${target.id}?error=deleteForbidden`);
  }
  const { error } = await supabase
    .from("keyword_targets")
    .delete()
    .eq("id", target.id);
  if (error) redirect(`/dashboard/keywords/${target.id}?error=delete`);

  revalidatePath(`/dashboard/projects/${target.project_id}/keywords`);
  redirect(`/dashboard/projects/${target.project_id}/keywords?deleted=1`);
}
