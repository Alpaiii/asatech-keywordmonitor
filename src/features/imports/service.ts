import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function findWorkspaceMembership(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function findImportAccess(
  supabase: SupabaseClient,
  importId: string,
  userId: string,
) {
  const { data: importRecord } = await supabase
    .from("imports")
    .select(
      "id, workspace_id, type, status, file_name, idempotency_key, total_rows, valid_rows, invalid_rows, succeeded_rows, failed_rows, created_by, created_at, started_at, completed_at",
    )
    .eq("id", importId)
    .maybeSingle();
  if (!importRecord) return null;
  const membership = await findWorkspaceMembership(
    supabase,
    importRecord.workspace_id,
    userId,
  );
  return membership ? importRecord : null;
}

export async function loadImportWithRows(importId: string) {
  const admin = createAdminClient();
  const [{ data: importRecord, error }, { data: rows, error: rowsError }] =
    await Promise.all([
      admin.from("imports").select("*").eq("id", importId).single(),
      admin
        .from("import_rows")
        .select("row_number, status, input, errors, result, processed_at")
        .eq("import_id", importId)
        .order("row_number"),
    ]);
  if (error || rowsError) throw error ?? rowsError;
  return { ...importRecord, rows: rows ?? [] };
}
