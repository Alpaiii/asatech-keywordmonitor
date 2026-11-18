import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function listWorkspaceMembers(
  supabase: SupabaseClient,
  workspaceId: string,
) {
  const { data: memberships, error: membershipsError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .order("created_at");
  if (membershipsError) throw membershipsError;
  const userIds = (memberships ?? []).map((item) => item.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  if (profilesError) throw profilesError;
  const names = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );

  return userIds.map((userId) => ({
    userId,
    displayName: names.get(userId) ?? null,
  }));
}
