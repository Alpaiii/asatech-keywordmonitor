import { z } from "zod";
import { getApiUser } from "@/lib/api/auth";
import { apiError, apiSuccess, requestId } from "@/lib/api/response";
import { disconnectGoogleConnection } from "@/lib/integrations/google-oauth";

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  provider: z.enum(["gsc", "ga4"]),
});

export async function POST(request: Request) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth)
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return apiError(400, "INVALID_INPUT", "Data tidak valid.", id);

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
      "Hanya owner dapat memutus integrasi.",
      id,
    );
  }

  await disconnectGoogleConnection(
    parsed.data.workspaceId,
    parsed.data.provider,
  );
  return apiSuccess({ disconnected: true }, id);
}
