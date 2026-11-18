import "server-only";

import { getApiUser } from "@/lib/api/auth";

export async function getApiProject(projectId: string) {
  const auth = await getApiUser();
  if (!auth) return { error: "unauthenticated" as const };

  const { data, error } = await auth.supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();
  if (error) return { error: "database" as const };
  if (!data) return { error: "not_found" as const };
  return { auth, project: data };
}
