import { z } from "zod";
import {
  MAX_IMPORT_FILE_BYTES,
  parseRankCheckinWorkbook,
  type RankCheckinImportData,
} from "@/features/imports/parse-workbook";
import {
  findImportAccess,
  findWorkspaceMembership,
  loadImportWithRows,
} from "@/features/imports/service";
import { saveRankStatusSnapshot } from "@/features/rank-status/service";
import { getApiUser } from "@/lib/api/auth";
import { apiError, apiSuccess, requestId } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid = z.string().uuid();

export async function POST(request: Request) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth)
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);
  if (
    (request.headers.get("content-type") ?? "").includes("application/json")
  ) {
    return commit(request, auth, id);
  }
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || key.length < 8 || key.length > 200)
    return apiError(400, "INVALID_INPUT", "Idempotency-Key wajib.", id);
  const form = await request.formData().catch(() => null);
  const workspace = uuid.safeParse(form?.get("workspaceId"));
  const file = form?.get("file");
  if (!workspace.success || !(file instanceof File))
    return apiError(400, "INVALID_INPUT", "Workspace dan file wajib.", id);
  if (
    file.size < 1 ||
    file.size > MAX_IMPORT_FILE_BYTES ||
    !file.name.toLowerCase().endsWith(".xlsx")
  )
    return apiError(400, "INVALID_INPUT", "File .xlsx maksimal 5 MiB.", id);
  if (
    !(await findWorkspaceMembership(
      auth.supabase,
      workspace.data,
      auth.user.id,
    ))
  )
    return apiError(404, "NOT_FOUND", "Workspace tidak ditemukan.", id);

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("imports")
    .select("id")
    .eq("workspace_id", workspace.data)
    .eq("type", "rank_checkins")
    .eq("idempotency_key", key)
    .maybeSingle();
  if (existing) return apiSuccess(await loadImportWithRows(existing.id), id);

  let parsed;
  try {
    parsed = await parseRankCheckinWorkbook(
      new Uint8Array(await file.arrayBuffer()),
    );
  } catch (error) {
    return apiError(
      400,
      "INVALID_INPUT",
      error instanceof Error ? error.message : "File tidak valid.",
      id,
    );
  }

  const targetIds = [
    ...new Set(
      parsed.flatMap((row) => (row.data ? [row.data.keyword_target_id] : [])),
    ),
  ];
  const { data: targets, error: targetsError } = await auth.supabase
    .from("keyword_targets")
    .select("id")
    .eq("workspace_id", workspace.data)
    .in("id", targetIds.length ? targetIds : [crypto.randomUUID()]);
  if (targetsError)
    return apiError(500, "INTERNAL_ERROR", "Preview import gagal.", id);
  const allowed = new Set((targets ?? []).map((target) => target.id));
  const rows = parsed.map((row) => ({
    ...row,
    errors:
      row.data && !allowed.has(row.data.keyword_target_id)
        ? [...row.errors, "keyword_target_id bukan target workspace ini."]
        : row.errors,
  }));
  const validRows = rows.filter((row) => !row.errors.length).length;
  const { data: record, error } = await admin
    .from("imports")
    .insert({
      workspace_id: workspace.data,
      type: "rank_checkins",
      file_name: file.name,
      idempotency_key: key,
      total_rows: rows.length,
      valid_rows: validRows,
      invalid_rows: rows.length - validRows,
      created_by: auth.user.id,
    })
    .select("id")
    .single();
  if (error || !record)
    return apiError(500, "INTERNAL_ERROR", "Preview import gagal.", id);
  const { error: rowError } = await admin.from("import_rows").insert(
    rows.map((row) => ({
      import_id: record.id,
      workspace_id: workspace.data,
      row_number: row.rowNumber,
      status: row.errors.length ? "invalid" : "valid",
      input: row.input,
      errors: row.errors,
    })),
  );
  if (rowError) {
    await admin.from("imports").delete().eq("id", record.id);
    return apiError(500, "INTERNAL_ERROR", "Preview import gagal.", id);
  }
  return apiSuccess(await loadImportWithRows(record.id), id, { status: 201 });
}

async function commit(
  request: Request,
  auth: NonNullable<Awaited<ReturnType<typeof getApiUser>>>,
  id: string,
) {
  const body = z
    .object({ importId: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!body.success)
    return apiError(400, "INVALID_INPUT", "Import ID tidak valid.", id);
  const accessible = await findImportAccess(
    auth.supabase,
    body.data.importId,
    auth.user.id,
  );
  if (!accessible || accessible.type !== "rank_checkins")
    return apiError(404, "NOT_FOUND", "Import tidak ditemukan.", id);
  if (accessible.status !== "previewed")
    return apiSuccess(await loadImportWithRows(accessible.id), id);
  const admin = createAdminClient();
  const { data: claimed } = await admin.rpc("claim_import", {
    target_import_id: accessible.id,
    target_user_id: auth.user.id,
  });
  if (!claimed) return apiSuccess(await loadImportWithRows(accessible.id), id);
  const { data: rows } = await admin
    .from("import_rows")
    .select("id, input")
    .eq("import_id", accessible.id)
    .eq("status", "valid");
  const targetIds = (rows ?? []).map(
    (row) => (row.input as RankCheckinImportData).keyword_target_id,
  );
  const { data: targets } = await admin
    .from("keyword_targets")
    .select(
      "id, workspace_id, country_code, device, location, target_position, deadline, maintain_enabled, maintain_position_limit, check_frequency_days",
    )
    .eq("workspace_id", accessible.workspace_id)
    .in("id", targetIds.length ? targetIds : [crypto.randomUUID()]);
  const targetById = new Map(
    (targets ?? []).map((target) => [target.id, target]),
  );
  let succeeded = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const input = row.input as RankCheckinImportData;
    const target = targetById.get(input.keyword_target_id);
    const result = target
      ? await admin
          .from("rank_checkins")
          .insert({
            workspace_id: accessible.workspace_id,
            keyword_target_id: target.id,
            source: "manual",
            position: input.position || null,
            not_found_top_100: input.not_found_top_100 === "true",
            checked_at: input.checked_at,
            country_code: target.country_code,
            device: target.device,
            location: target.location,
            notes: input.notes || null,
            created_by: auth.user.id,
          })
          .select("id")
          .single()
      : { data: null, error: { message: "Target hilang." } };
    if (result.error || !result.data) {
      failed += 1;
      await admin
        .from("import_rows")
        .update({
          status: "failed",
          errors: ["Check-in gagal disimpan."],
          processed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } else if (target) {
      succeeded += 1;
      await admin
        .from("import_rows")
        .update({
          status: "succeeded",
          result: { rank_checkin_id: result.data.id },
          processed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      await saveRankStatusSnapshot(admin, target);
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
