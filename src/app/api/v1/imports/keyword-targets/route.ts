import { z } from "zod";
import {
  keywordTargetInsert,
  validateKeywordImportReferences,
} from "@/features/imports/keyword-target-import";
import {
  MAX_IMPORT_FILE_BYTES,
  parseKeywordTargetWorkbook,
} from "@/features/imports/parse-workbook";
import {
  findImportAccess,
  findWorkspaceMembership,
  loadImportWithRows,
} from "@/features/imports/service";
import { getApiUser } from "@/lib/api/auth";
import { apiError, apiSuccess, requestId } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

const workspaceSchema = z.string().uuid();

export async function POST(request: Request) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth)
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return commitImport(request, auth, id);
  }
  if (!contentType.includes("multipart/form-data")) {
    return apiError(400, "INVALID_INPUT", "Format request tidak valid.", id);
  }

  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || key.length < 8 || key.length > 200) {
    return apiError(
      400,
      "INVALID_INPUT",
      "Idempotency-Key sepanjang 8–200 karakter wajib.",
      id,
    );
  }

  const form = await request.formData();
  const workspace = workspaceSchema.safeParse(form.get("workspaceId"));
  const file = form.get("file");
  if (!workspace.success || !(file instanceof File)) {
    return apiError(400, "INVALID_INPUT", "Workspace dan file wajib.", id);
  }
  if (
    file.size < 1 ||
    file.size > MAX_IMPORT_FILE_BYTES ||
    !file.name.toLowerCase().endsWith(".xlsx")
  ) {
    return apiError(
      400,
      "INVALID_INPUT",
      "File wajib .xlsx dan maksimal 5 MiB.",
      id,
    );
  }

  const membership = await findWorkspaceMembership(
    auth.supabase,
    workspace.data,
    auth.user.id,
  );
  if (!membership)
    return apiError(404, "NOT_FOUND", "Workspace tidak ditemukan.", id);

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("imports")
    .select("id")
    .eq("workspace_id", workspace.data)
    .eq("type", "keyword_targets")
    .eq("idempotency_key", key)
    .maybeSingle();
  if (existing) return apiSuccess(await loadImportWithRows(existing.id), id);

  let parsed;
  try {
    parsed = await parseKeywordTargetWorkbook(
      new Uint8Array(await file.arrayBuffer()),
    );
  } catch (error) {
    return apiError(
      400,
      "INVALID_INPUT",
      error instanceof Error ? error.message : "File Excel tidak valid.",
      id,
    );
  }

  let rows;
  try {
    rows = await validateKeywordImportReferences(
      auth.supabase,
      workspace.data,
      parsed,
    );
  } catch {
    return apiError(500, "INTERNAL_ERROR", "Preview import gagal.", id);
  }

  const validRows = rows.filter((row) => row.errors.length === 0).length;
  const { data: importRecord, error: insertError } = await admin
    .from("imports")
    .insert({
      workspace_id: workspace.data,
      type: "keyword_targets",
      status: "previewed",
      file_name: file.name,
      idempotency_key: key,
      total_rows: rows.length,
      valid_rows: validRows,
      invalid_rows: rows.length - validRows,
      created_by: auth.user.id,
    })
    .select("id")
    .single();
  if (insertError || !importRecord) {
    const { data: raced } = await admin
      .from("imports")
      .select("id")
      .eq("workspace_id", workspace.data)
      .eq("type", "keyword_targets")
      .eq("idempotency_key", key)
      .maybeSingle();
    if (raced) return apiSuccess(await loadImportWithRows(raced.id), id);
    return apiError(500, "INTERNAL_ERROR", "Preview import gagal.", id);
  }

  const { error: rowsError } = await admin.from("import_rows").insert(
    rows.map((row) => ({
      import_id: importRecord.id,
      workspace_id: workspace.data,
      row_number: row.rowNumber,
      status: row.errors.length ? "invalid" : "valid",
      input: row.input,
      errors: row.errors,
    })),
  );
  if (rowsError) {
    await admin.from("imports").delete().eq("id", importRecord.id);
    return apiError(500, "INTERNAL_ERROR", "Preview import gagal.", id);
  }

  return apiSuccess(await loadImportWithRows(importRecord.id), id, {
    status: 201,
  });
}

async function commitImport(
  request: Request,
  auth: NonNullable<Awaited<ReturnType<typeof getApiUser>>>,
  id: string,
) {
  const parsed = z
    .object({ importId: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return apiError(400, "INVALID_INPUT", "Import ID tidak valid.", id);

  const accessible = await findImportAccess(
    auth.supabase,
    parsed.data.importId,
    auth.user.id,
  );
  if (!accessible || accessible.type !== "keyword_targets") {
    return apiError(404, "NOT_FOUND", "Import tidak ditemukan.", id);
  }
  if (accessible.status !== "previewed") {
    return apiSuccess(await loadImportWithRows(accessible.id), id);
  }

  const admin = createAdminClient();
  const { data: claimed, error: claimError } = await admin.rpc("claim_import", {
    target_import_id: accessible.id,
    target_user_id: auth.user.id,
  });
  if (claimError)
    return apiError(500, "INTERNAL_ERROR", "Import gagal diproses.", id);
  if (!claimed) return apiSuccess(await loadImportWithRows(accessible.id), id);

  const { data: rows, error: rowsError } = await admin
    .from("import_rows")
    .select("id, row_number, status, input")
    .eq("import_id", accessible.id)
    .eq("status", "valid")
    .order("row_number");
  if (rowsError) {
    await admin
      .from("imports")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", accessible.id);
    return apiError(500, "INTERNAL_ERROR", "Import gagal diproses.", id);
  }

  let succeeded = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const data = row.input as Parameters<typeof keywordTargetInsert>[0];
    const { data: target, error } = await admin
      .from("keyword_targets")
      .insert(keywordTargetInsert(data, accessible.workspace_id, auth.user.id))
      .select("id")
      .single();
    if (error || !target) {
      failed += 1;
      await admin
        .from("import_rows")
        .update({
          status: "failed",
          errors: [
            error?.code === "23505"
              ? "Target duplikat saat commit."
              : "Target gagal disimpan.",
          ],
          processed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } else {
      succeeded += 1;
      await admin
        .from("import_rows")
        .update({
          status: "succeeded",
          result: { keyword_target_id: target.id },
          processed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
  }

  await admin
    .from("imports")
    .update({
      status:
        failed || accessible.invalid_rows
          ? "completed_with_errors"
          : "completed",
      succeeded_rows: succeeded,
      failed_rows: failed,
      completed_at: new Date().toISOString(),
    })
    .eq("id", accessible.id);

  return apiSuccess(await loadImportWithRows(accessible.id), id);
}
