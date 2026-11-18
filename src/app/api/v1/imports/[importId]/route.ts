import { z } from "zod";
import {
  findImportAccess,
  loadImportWithRows,
} from "@/features/imports/service";
import { getApiUser } from "@/lib/api/auth";
import { apiError, apiSuccess, requestId } from "@/lib/api/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ importId: string }> },
) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth)
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).importId);
  if (!parsed.success)
    return apiError(404, "NOT_FOUND", "Import tidak ditemukan.", id);
  const accessible = await findImportAccess(
    auth.supabase,
    parsed.data,
    auth.user.id,
  );
  if (!accessible)
    return apiError(404, "NOT_FOUND", "Import tidak ditemukan.", id);
  return apiSuccess(await loadImportWithRows(accessible.id), id);
}
