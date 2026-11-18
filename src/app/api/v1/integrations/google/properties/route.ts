import { z } from "zod";
import { getApiUser } from "@/lib/api/auth";
import { apiError, apiSuccess, requestId } from "@/lib/api/response";
import { listGscSites } from "@/lib/integrations/google-oauth";

const querySchema = z.object({
  provider: z.literal("gsc"),
  workspaceId: z.string().uuid(),
});

export async function GET(request: Request) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth)
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    provider: url.searchParams.get("provider"),
    workspaceId: url.searchParams.get("workspaceId"),
  });
  if (!parsed.success) {
    return apiError(400, "INVALID_INPUT", "Query properti tidak valid.", id);
  }

  const { data: membership, error } = await auth.supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", parsed.data.workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error)
    return apiError(500, "INTERNAL_ERROR", "Akses gagal diperiksa.", id);
  if (!membership)
    return apiError(404, "NOT_FOUND", "Workspace tidak ditemukan.", id);
  if (membership.role !== "owner") {
    return apiError(
      403,
      "FORBIDDEN",
      "Hanya owner dapat memilih properti.",
      id,
    );
  }

  try {
    return apiSuccess(await listGscSites(parsed.data.workspaceId), id);
  } catch (error) {
    return apiError(
      502,
      "PROVIDER_ERROR",
      error instanceof Error ? error.message : "Properti GSC gagal dimuat.",
      id,
    );
  }
}
