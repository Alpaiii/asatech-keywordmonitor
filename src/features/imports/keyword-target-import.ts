import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { KeywordImportData, ParsedImportRow } from "./parse-workbook";

export type ValidatedKeywordImportRow = ParsedImportRow<KeywordImportData> & {
  errors: string[];
};

function canonical(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function identity(row: KeywordImportData) {
  return [
    row.project_id,
    canonical(row.keyword),
    row.country_code,
    row.language_code,
    row.device,
    canonical(row.location),
  ].join("|");
}

export async function validateKeywordImportReferences(
  supabase: SupabaseClient,
  workspaceId: string,
  rows: ParsedImportRow<KeywordImportData>[],
) {
  const [projectsResult, membersResult, targetsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null),
    supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId),
    supabase
      .from("keyword_targets")
      .select(
        "project_id, canonical_phrase, country_code, language_code, device, normalized_location",
      )
      .eq("workspace_id", workspaceId),
  ]);
  if (projectsResult.error || membersResult.error || targetsResult.error) {
    throw new Error("Referensi workspace gagal dibaca.");
  }

  const projects = new Set((projectsResult.data ?? []).map((row) => row.id));
  const members = new Set((membersResult.data ?? []).map((row) => row.user_id));
  const existing = new Set(
    (targetsResult.data ?? []).map((row) =>
      [
        row.project_id,
        row.canonical_phrase,
        row.country_code,
        row.language_code,
        row.device,
        row.normalized_location,
      ].join("|"),
    ),
  );
  const seen = new Set<string>();

  return rows.map((row): ValidatedKeywordImportRow => {
    const errors = [...row.errors];
    if (!row.data) return { ...row, errors };
    if (!projects.has(row.data.project_id)) {
      errors.push("project_id bukan project aktif dalam workspace ini.");
    }
    if (row.data.assignee_user_id && !members.has(row.data.assignee_user_id)) {
      errors.push("assignee_user_id bukan anggota workspace ini.");
    }
    const key = identity(row.data);
    if (seen.has(key)) errors.push("Target duplikat dalam file.");
    if (existing.has(key)) errors.push("Target sudah ada dalam project.");
    seen.add(key);
    return { ...row, errors };
  });
}

export function keywordTargetInsert(
  row: KeywordImportData,
  workspaceId: string,
  userId: string,
) {
  return {
    workspace_id: workspaceId,
    project_id: row.project_id,
    phrase: row.keyword,
    country_code: row.country_code,
    language_code: row.language_code,
    device: row.device,
    location: row.location,
    target_position: row.target_position,
    priority: row.priority,
    deadline: row.deadline || null,
    maintain_enabled: row.maintain_enabled === "true",
    maintain_position_limit: row.maintain_position_limit || null,
    check_frequency_days: row.check_frequency_days,
    assignee_user_id: row.assignee_user_id || null,
    created_by: userId,
  };
}
