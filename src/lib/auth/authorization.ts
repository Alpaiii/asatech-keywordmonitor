import "server-only";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceRole = "owner" | "member";

export async function requireUser() {
  // await connection(); // Temporarily disabled for test compatibility
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) redirect("/login");

  return { supabase, user: data.user };
}

export async function requireWorkspaceMembership(workspaceId: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) notFound();

  return {
    supabase,
    user,
    membership: data as { workspace_id: string; role: WorkspaceRole },
  };
}

export async function requireRankCheckinAccess(checkinId: string) {
  const { supabase, user } = await requireUser();
  const { data: checkin } = await supabase
    .from("rank_checkins")
    .select(
      "id, workspace_id, keyword_target_id, source, position, not_found_top_100, checked_at, country_code, device, location, notes, created_by, created_at",
    )
    .eq("id", checkinId)
    .maybeSingle();

  if (!checkin) notFound();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", checkin.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) notFound();

  return {
    supabase,
    user,
    checkin,
    membership: membership as { workspace_id: string; role: WorkspaceRole },
  };
}

export async function requireKeywordTargetAccess(targetId: string) {
  const { supabase, user } = await requireUser();
  const { data: target } = await supabase
    .from("keyword_targets")
    .select(
      "id, workspace_id, project_id, phrase, country_code, language_code, device, location, target_position, priority, deadline, maintain_enabled, maintain_position_limit, check_frequency_days, assignee_user_id, created_at, updated_at",
    )
    .eq("id", targetId)
    .maybeSingle();

  if (!target) notFound();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", target.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) notFound();

  return {
    supabase,
    user,
    target,
    membership: membership as { workspace_id: string; role: WorkspaceRole },
  };
}

export async function requireProjectAccess(projectId: string) {
  const { supabase, user } = await requireUser();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, workspace_id, name, site_url, domain, default_country, default_language, timezone, gsc_property_uri, archived_at, created_at, updated_at",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (!project) notFound();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", project.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) notFound();

  return {
    supabase,
    user,
    project,
    membership: membership as { workspace_id: string; role: WorkspaceRole },
  };
}
