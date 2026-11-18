import { getApiUser } from "@/lib/api/auth";
import { apiError, apiSuccess, requestId } from "@/lib/api/response";

export async function GET(request: Request) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth) {
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);
  }

  const { data, error } = await auth.supabase
    .from("workspaces")
    .select("id, name, created_at, workspace_members!inner(role)")
    .eq("workspace_members.user_id", auth.user.id)
    .order("created_at");

  if (error) {
    return apiError(500, "INTERNAL_ERROR", "Workspace gagal dimuat.", id);
  }

  return apiSuccess(data ?? [], id);
}
