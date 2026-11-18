import { z } from "zod";
import { getApiUser } from "@/lib/api/auth";
import { apiError, apiSuccess, requestId } from "@/lib/api/response";

const idSchema = z.string().uuid();

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth) {
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);
  }

  const { projectId } = await context.params;
  const parsedId = idSchema.safeParse(projectId);
  if (!parsedId.success) {
    return apiError(400, "INVALID_INPUT", "Project tidak valid.", id);
  }

  const { data, error } = await auth.supabase
    .from("projects")
    .select(
      "id, workspace_id, name, site_url, domain, default_country, default_language, timezone, archived_at, created_at, updated_at",
    )
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error) {
    return apiError(500, "INTERNAL_ERROR", "Project gagal dimuat.", id);
  }
  if (!data) {
    return apiError(404, "NOT_FOUND", "Project tidak ditemukan.", id);
  }

  const { data: membership, error: membershipError } = await auth.supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", data.workspace_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (membershipError) {
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Akses project gagal diperiksa.",
      id,
    );
  }
  if (!membership) {
    return apiError(404, "NOT_FOUND", "Project tidak ditemukan.", id);
  }

  return apiSuccess(data, id);
}
