"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  requireProjectAccess,
  requireWorkspaceMembership,
} from "@/lib/auth/authorization";
import { parseProjectFormData } from "@/features/projects/validation";

export type ProjectActionState = {
  error?: string;
};

const idSchema = z.string().uuid();

function errorMessage(error: { code?: string; message?: string } | null) {
  if (error?.code === "23505") {
    return "Domain sudah digunakan oleh project lain di workspace ini.";
  }

  return "Project gagal disimpan. Coba lagi.";
}

export async function createProject(
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const workspaceId = idSchema.safeParse(formData.get("workspaceId"));
  if (!workspaceId.success) return { error: "Workspace tidak valid." };

  const parsed = parseProjectFormData(formData);
  if (!parsed.success) return { error: parsed.error };

  const { supabase } = await requireWorkspaceMembership(workspaceId.data);
  const { error } = await supabase.from("projects").insert({
    workspace_id: workspaceId.data,
    name: parsed.data.name,
    site_url: parsed.data.siteUrl,
    domain: parsed.data.domain,
    default_country: parsed.data.defaultCountry,
    default_language: parsed.data.defaultLanguage,
    timezone: parsed.data.timezone,
  });

  if (error) return { error: errorMessage(error) };

  revalidatePath("/dashboard");
  redirect(`/dashboard?workspace=${workspaceId.data}`);
}

export async function updateProject(
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const projectId = idSchema.safeParse(formData.get("projectId"));
  if (!projectId.success) return { error: "Project tidak valid." };

  const parsed = parseProjectFormData(formData);
  if (!parsed.success) return { error: parsed.error };

  const { supabase, project } = await requireProjectAccess(projectId.data);
  const { error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      site_url: parsed.data.siteUrl,
      domain: parsed.data.domain,
      default_country: parsed.data.defaultCountry,
      default_language: parsed.data.defaultLanguage,
      timezone: parsed.data.timezone,
    })
    .eq("id", project.id);

  if (error) return { error: errorMessage(error) };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${project.id}`);
  redirect(`/dashboard/projects/${project.id}?saved=1`);
}

export async function archiveProject(formData: FormData) {
  const projectId = idSchema.safeParse(formData.get("projectId"));
  if (!projectId.success) return;

  const { supabase, project, membership } = await requireProjectAccess(
    projectId.data,
  );
  if (membership.role !== "owner") {
    redirect(`/dashboard/projects/${project.id}?error=owner-required`);
  }

  const { error } = await supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", project.id);

  if (error) redirect(`/dashboard/projects/${project.id}?error=archive`);

  revalidatePath("/dashboard");
  redirect(`/dashboard?workspace=${project.workspace_id}&archived=1`);
}
