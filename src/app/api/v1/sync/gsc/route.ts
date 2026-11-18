import { z } from "zod";
import { createGscSyncJob, runGscSyncJob } from "@/features/gsc/sync";
import { serverEnv } from "@/lib/env";
import { apiError, apiSuccess, requestId } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  projectId: z.string().uuid().optional(),
  date: z.iso.date().optional(),
});

export async function POST(request: Request) {
  const id = requestId(request);
  if (
    !serverEnv.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${serverEnv.CRON_SECRET}`
  ) {
    return apiError(
      401,
      "UNAUTHENTICATED",
      "Kredensial scheduler tidak valid.",
      id,
    );
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return apiError(400, "INVALID_INPUT", "Payload scheduler tidak valid.", id);

  const admin = createAdminClient();
  const target =
    parsed.data.date ??
    new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
  let query = admin
    .from("project_properties")
    .select("project_id, workspace_id")
    .eq("provider", "gsc")
    .is("disconnected_at", null);
  if (parsed.data.projectId)
    query = query.eq("project_id", parsed.data.projectId);
  const { data: properties, error } = await query;
  if (error)
    return apiError(500, "INTERNAL_ERROR", "Properti gagal dimuat.", id);

  const jobs: string[] = [];
  for (const property of properties ?? []) {
    jobs.push(
      await createGscSyncJob({
        workspaceId: property.workspace_id,
        projectId: property.project_id,
        startDate: target,
        endDate: target,
      }),
    );
  }
  for (const jobId of jobs) await runGscSyncJob(jobId).catch(() => undefined);
  return apiSuccess({ jobs }, id);
}
