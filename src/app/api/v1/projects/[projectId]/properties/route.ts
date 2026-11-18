import { z } from "zod";
import { getApiUser } from "@/lib/api/auth";
import { apiError, apiSuccess, requestId } from "@/lib/api/response";
import { createGscSyncJob } from "@/features/gsc/sync";
import { listGscSites, getConnection } from "@/lib/integrations/google-oauth";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();
const bodySchema = z.object({
  provider: z.literal("gsc"),
  propertyUri: z.string().trim().min(1).max(2048),
});
type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Context) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth)
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);

  const { projectId } = await context.params;
  const parsedId = idSchema.safeParse(projectId);
  const parsedBody = bodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedId.success || !parsedBody.success) {
    return apiError(
      400,
      "INVALID_INPUT",
      "Project atau properti tidak valid.",
      id,
    );
  }

  const { data: project, error } = await auth.supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (error)
    return apiError(500, "INTERNAL_ERROR", "Project gagal dimuat.", id);
  if (!project)
    return apiError(404, "NOT_FOUND", "Project tidak ditemukan.", id);

  const { data: membership } = await auth.supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", project.workspace_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!membership)
    return apiError(404, "NOT_FOUND", "Project tidak ditemukan.", id);
  if (membership.role !== "owner") {
    return apiError(
      403,
      "FORBIDDEN",
      "Hanya owner dapat menghubungkan properti.",
      id,
    );
  }

  try {
    const [connection, sites] = await Promise.all([
      getConnection(project.workspace_id, "gsc"),
      listGscSites(project.workspace_id),
    ]);
    if (!connection || connection.status !== "connected") {
      return apiError(409, "CONFLICT", "Koneksi GSC belum aktif.", id);
    }
    const site = sites.find(
      (candidate) => candidate.siteUrl === parsedBody.data.propertyUri,
    );
    if (!site) {
      return apiError(
        400,
        "INVALID_INPUT",
        "Properti tidak tersedia pada akun Google.",
        id,
      );
    }

    const admin = createAdminClient();
    const { data, error: upsertError } = await admin
      .from("project_properties")
      .upsert(
        {
          workspace_id: project.workspace_id,
          project_id: project.id,
          oauth_connection_id: connection.id,
          provider: "gsc",
          property_uri: site.siteUrl,
          property_name: site.siteUrl,
          permission_level: site.permissionLevel,
          is_default: true,
          disconnected_at: null,
        },
        { onConflict: "project_id,provider" },
      )
      .select("id, property_uri, permission_level, connected_at")
      .single();
    if (upsertError) throw upsertError;
    await admin
      .from("projects")
      .update({ gsc_property_uri: site.siteUrl })
      .eq("id", project.id);

    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 3);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 89);
    const syncJobId = await createGscSyncJob({
      workspaceId: project.workspace_id,
      projectId: project.id,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });

    return apiSuccess({ ...data, syncJobId }, id, { status: 201 });
  } catch (error) {
    return apiError(
      502,
      "PROVIDER_ERROR",
      error instanceof Error
        ? error.message
        : "Properti GSC gagal dihubungkan.",
      id,
    );
  }
}
