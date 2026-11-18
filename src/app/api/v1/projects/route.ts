import { z } from "zod";
import { getApiUser } from "@/lib/api/auth";
import { apiError, apiSuccess, requestId } from "@/lib/api/response";
import {
  normalizeProjectInput,
  projectSchema,
} from "@/features/projects/validation";

const querySchema = z.object({
  workspaceId: z.string().uuid(),
});

export async function GET(request: Request) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth) {
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);
  }

  const url = new URL(request.url);
  const query = querySchema.safeParse({
    workspaceId: url.searchParams.get("workspaceId"),
  });
  if (!query.success) {
    return apiError(400, "INVALID_INPUT", "Workspace tidak valid.", id);
  }

  const { data: membership, error: membershipError } = await auth.supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", query.data.workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (membershipError) {
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Akses workspace gagal diperiksa.",
      id,
    );
  }
  if (!membership) {
    return apiError(404, "NOT_FOUND", "Workspace tidak ditemukan.", id);
  }

  const { data, error } = await auth.supabase
    .from("projects")
    .select(
      "id, workspace_id, name, site_url, domain, default_country, default_language, timezone, archived_at, created_at, updated_at",
    )
    .eq("workspace_id", query.data.workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(500, "INTERNAL_ERROR", "Project gagal dimuat.", id);
  }

  return apiSuccess(data ?? [], id);
}

const createProjectSchema = projectSchema.extend({
  workspaceId: z.string().uuid(),
});

export async function POST(request: Request) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth) {
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_INPUT", "JSON tidak valid.", id);
  }

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      400,
      "INVALID_INPUT",
      parsed.error.issues[0]?.message ?? "Data project tidak valid.",
      id,
    );
  }

  const { workspaceId, ...projectInput } = parsed.data;
  const { data: membership, error: membershipError } = await auth.supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (membershipError) {
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Akses workspace gagal diperiksa.",
      id,
    );
  }
  if (!membership) {
    return apiError(404, "NOT_FOUND", "Workspace tidak ditemukan.", id);
  }

  const normalized = normalizeProjectInput(projectInput);
  const { data, error } = await auth.supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      name: normalized.name,
      site_url: normalized.siteUrl,
      domain: normalized.domain,
      default_country: normalized.defaultCountry,
      default_language: normalized.defaultLanguage,
      timezone: normalized.timezone,
    })
    .select(
      "id, workspace_id, name, site_url, domain, default_country, default_language, timezone, archived_at, created_at, updated_at",
    )
    .single();

  if (error?.code === "23505") {
    return apiError(
      409,
      "CONFLICT",
      "Domain sudah digunakan oleh project lain di workspace ini.",
      id,
    );
  }
  if (error) {
    return apiError(500, "INTERNAL_ERROR", "Project gagal disimpan.", id);
  }

  return apiSuccess(data, id, { status: 201 });
}
