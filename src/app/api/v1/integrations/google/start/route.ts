import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api/auth";
import { apiError, requestId } from "@/lib/api/response";
import {
  buildGoogleAuthUrl,
  generatePkce,
  generateState,
} from "@/lib/integrations/google-oauth";

const querySchema = z.object({
  provider: z.enum(["gsc", "ga4"]),
  workspaceId: z.string().uuid(),
});

export async function GET(request: Request) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth)
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    provider: url.searchParams.get("provider"),
    workspaceId: url.searchParams.get("workspaceId"),
  });
  if (!parsed.success) {
    return apiError(
      400,
      "INVALID_INPUT",
      "Provider atau workspace tidak valid.",
      id,
    );
  }

  const { data: membership, error } = await auth.supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", parsed.data.workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error)
    return apiError(500, "INTERNAL_ERROR", "Akses gagal diperiksa.", id);
  if (!membership)
    return apiError(404, "NOT_FOUND", "Workspace tidak ditemukan.", id);
  if (membership.role !== "owner") {
    return apiError(
      403,
      "FORBIDDEN",
      "Hanya owner dapat mengelola integrasi.",
      id,
    );
  }

  try {
    const state = generateState();
    const { codeVerifier, codeChallenge } = generatePkce();
    const response = NextResponse.redirect(
      buildGoogleAuthUrl(parsed.data.provider, state, codeChallenge),
    );
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 600,
      path: "/api/v1/integrations/google",
    };
    response.cookies.set("google_oauth_state", state, cookieOptions);
    response.cookies.set("google_oauth_verifier", codeVerifier, cookieOptions);
    response.cookies.set(
      "google_oauth_provider",
      parsed.data.provider,
      cookieOptions,
    );
    response.cookies.set(
      "google_oauth_workspace",
      parsed.data.workspaceId,
      cookieOptions,
    );
    response.headers.set("x-request-id", id);
    return response;
  } catch (error) {
    return apiError(
      503,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Google OAuth gagal dimulai.",
      id,
    );
  }
}
