import { z } from "zod";
import { fetchGscOverview } from "@/features/gsc/service";
import { getApiProject } from "@/features/gsc/route-data";
import { gscFiltersSchema, parseSearchParams } from "@/features/gsc/validation";
import { apiError, apiSuccess, requestId } from "@/lib/api/response";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, context: Context) {
  const id = requestId(request);
  const { projectId } = await context.params;
  if (!z.string().uuid().safeParse(projectId).success) {
    return apiError(400, "INVALID_INPUT", "Project tidak valid.", id);
  }
  const result = await getApiProject(projectId);
  if (result.error === "unauthenticated")
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);
  if (result.error === "database")
    return apiError(500, "INTERNAL_ERROR", "Project gagal dimuat.", id);
  if (result.error === "not_found")
    return apiError(404, "NOT_FOUND", "Project tidak ditemukan.", id);

  const parsed = gscFiltersSchema.safeParse(
    parseSearchParams(new URL(request.url)),
  );
  if (!parsed.success)
    return apiError(400, "INVALID_INPUT", "Filter GSC tidak valid.", id);

  const { data: property, error } = await result.auth.supabase
    .from("project_properties")
    .select("property_uri, connected_at")
    .eq("project_id", projectId)
    .eq("provider", "gsc")
    .is("disconnected_at", null)
    .maybeSingle();
  if (error)
    return apiError(500, "INTERNAL_ERROR", "Properti gagal dimuat.", id);
  if (!property)
    return apiError(409, "CONFLICT", "Project belum terhubung ke GSC.", id);

  try {
    const metrics = await fetchGscOverview(
      result.project.workspace_id,
      property.property_uri,
      parsed.data,
    );
    const { data: latestJob } = await result.auth.supabase
      .from("sync_jobs")
      .select("status, last_error, finished_at")
      .eq("project_id", projectId)
      .eq("provider", "gsc")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return apiSuccess(
      {
        metrics,
        source: "Google Search Console",
        positionLabel: "GSC average position",
        realTime: false,
        freshness: latestJob?.finished_at ?? property.connected_at,
        sync: latestJob ?? null,
      },
      id,
    );
  } catch (error) {
    return apiError(
      502,
      "PROVIDER_ERROR",
      error instanceof Error ? error.message : "GSC gagal dimuat.",
      id,
    );
  }
}
