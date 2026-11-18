import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import {
  exchangeCodeForTokens,
  storeConnection,
  type GoogleProvider,
} from "@/lib/integrations/google-oauth";

const cookieNames = [
  "google_oauth_state",
  "google_oauth_verifier",
  "google_oauth_provider",
  "google_oauth_workspace",
] as const;

function finish(request: Request, params: Record<string, string>) {
  const target = new URL("/dashboard/integrations", request.url);
  for (const [key, value] of Object.entries(params))
    target.searchParams.set(key, value);
  const response = NextResponse.redirect(target);
  for (const name of cookieNames) response.cookies.delete(name);
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();

  if (url.searchParams.get("error")) {
    return finish(request, { error: "consent_denied" });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const provider = cookieStore.get("google_oauth_provider")?.value as
    GoogleProvider | undefined;
  const workspaceId = cookieStore.get("google_oauth_workspace")?.value;
  const verifier = cookieStore.get("google_oauth_verifier")?.value;
  if (
    !code ||
    !state ||
    !verifier ||
    !workspaceId ||
    !provider ||
    state !== cookieStore.get("google_oauth_state")?.value ||
    !["gsc", "ga4"].includes(provider)
  ) {
    return finish(request, { error: "invalid_oauth_state" });
  }

  const auth = await getApiUser();
  if (!auth) return finish(request, { error: "unauthenticated" });

  const { data: membership } = await auth.supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (membership?.role !== "owner") {
    return finish(request, { error: "forbidden" });
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier);
    await storeConnection({
      workspaceId,
      provider,
      refreshToken: tokens.refreshToken,
      scopes: tokens.scopes,
      userId: auth.user.id,
    });
    return finish(request, { connected: provider, workspace: workspaceId });
  } catch {
    return finish(request, { error: "token_exchange_failed" });
  }
}
