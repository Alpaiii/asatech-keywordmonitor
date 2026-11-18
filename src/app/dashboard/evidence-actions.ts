"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  evidenceExtension,
  validateEvidenceFile,
} from "@/features/rank-evidence/validation";
import {
  requireKeywordTargetAccess,
  requireRankCheckinAccess,
} from "@/lib/auth/authorization";

export type EvidenceActionState = {
  error?: string;
};

const idSchema = z.string().uuid();

export async function uploadRankEvidence(
  _state: EvidenceActionState,
  formData: FormData,
): Promise<EvidenceActionState> {
  const checkinId = idSchema.safeParse(formData.get("checkinId"));
  if (!checkinId.success) return { error: "Check-in tidak valid." };
  const parsedFile = validateEvidenceFile(formData.get("evidence"));
  if (!parsedFile.success) return { error: parsedFile.error };

  const { supabase, user, checkin } = await requireRankCheckinAccess(
    checkinId.data,
  );
  const extension = evidenceExtension(parsedFile.file);
  if (!extension) return { error: "Tipe file tidak valid." };

  const path = `${checkin.workspace_id}/${checkin.keyword_target_id}/${checkin.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("rank-evidence")
    .upload(path, parsedFile.file, {
      contentType: parsedFile.file.type,
      upsert: false,
    });
  if (uploadError) return { error: "Upload evidence gagal. Coba lagi." };

  const { error: metadataError } = await supabase.from("rank_evidence").insert({
    workspace_id: checkin.workspace_id,
    rank_checkin_id: checkin.id,
    storage_path: path,
    file_name: parsedFile.file.name.slice(0, 255),
    mime_type: parsedFile.file.type,
    size_bytes: parsedFile.file.size,
    uploaded_by: user.id,
  });
  if (metadataError) {
    await supabase.storage.from("rank-evidence").remove([path]);
    return { error: "Metadata evidence gagal disimpan." };
  }

  revalidatePath(`/dashboard/keywords/${checkin.keyword_target_id}`);
  redirect(`/dashboard/keywords/${checkin.keyword_target_id}?evidence=1`);
}

export async function openRankEvidence(formData: FormData) {
  const evidenceId = idSchema.safeParse(formData.get("evidenceId"));
  const targetId = idSchema.safeParse(formData.get("targetId"));
  if (!evidenceId.success || !targetId.success) return;

  const { supabase, target } = await requireKeywordTargetAccess(targetId.data);
  const { data: evidence } = await supabase
    .from("rank_evidence")
    .select("id, storage_path, rank_checkin_id")
    .eq("id", evidenceId.data)
    .eq("workspace_id", target.workspace_id)
    .maybeSingle();
  if (!evidence) redirect(`/dashboard/keywords/${target.id}?error=evidence`);

  const { data: checkin } = await supabase
    .from("rank_checkins")
    .select("keyword_target_id")
    .eq("id", evidence.rank_checkin_id)
    .eq("keyword_target_id", target.id)
    .maybeSingle();
  if (!checkin) redirect(`/dashboard/keywords/${target.id}?error=evidence`);

  const { data, error } = await supabase.storage
    .from("rank-evidence")
    .createSignedUrl(evidence.storage_path, 60);
  if (error || !data.signedUrl) {
    redirect(`/dashboard/keywords/${target.id}?error=evidence`);
  }

  redirect(data.signedUrl);
}
