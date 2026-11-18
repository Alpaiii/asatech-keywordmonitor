import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type GoogleProvider = "gsc" | "ga4";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

export type OAuthConnection = {
  id: string;
  workspace_id: string;
  provider: GoogleProvider;
  encrypted_refresh_token: string;
  scopes: string[];
  status: "connected" | "disconnected" | "revoked" | "error";
};

export type GscSite = {
  siteUrl: string;
  permissionLevel: string;
};

export type GscDimension = "date" | "query" | "page" | "country" | "device";

export type GscDimensionFilter = {
  dimension: Exclude<GscDimension, "date">;
  expression: string;
  operator?:
    "equals" | "contains" | "notContains" | "includingRegex" | "excludingRegex";
};

export type GscSearchAnalyticsRequest = {
  startDate: string;
  endDate: string;
  dimensions?: GscDimension[];
  dimensionFilterGroups?: Array<{
    groupType?: "and";
    filters: GscDimensionFilter[];
  }>;
  rowLimit?: number;
  startRow?: number;
  type?: "web" | "image" | "video" | "news";
  aggregationType?: "auto" | "byPage" | "byProperty";
  dataState?: "final" | "all";
};

export type GscSearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

const scopes: Record<GoogleProvider, string[]> = {
  gsc: ["https://www.googleapis.com/auth/webmasters.readonly"],
  ga4: ["https://www.googleapis.com/auth/analytics.readonly"],
};

function requireGoogleConfig() {
  if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth belum dikonfigurasi.");
  }

  return {
    clientId: serverEnv.GOOGLE_CLIENT_ID,
    clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    redirectUri: `${serverEnv.APP_BASE_URL}/api/v1/integrations/google/callback`,
  };
}

function encryptionKey() {
  if (!serverEnv.OAUTH_TOKEN_ENCRYPTION_KEY) {
    throw new Error("Kunci enkripsi token OAuth belum dikonfigurasi.");
  }
  return createHash("sha256")
    .update(serverEnv.OAUTH_TOKEN_ENCRYPTION_KEY)
    .digest();
}

export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64",
  );
}

export function decryptToken(encryptedToken: string) {
  const payload = Buffer.from(encryptedToken, "base64");
  if (payload.length < 29)
    throw new Error("Token OAuth terenkripsi tidak valid.");

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    payload.subarray(0, 12),
  );
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([
    decipher.update(payload.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}

export function generatePkce() {
  const codeVerifier = randomBytes(32).toString("base64url");
  return {
    codeVerifier,
    codeChallenge: createHash("sha256")
      .update(codeVerifier)
      .digest("base64url"),
  };
}

export function generateState() {
  return randomBytes(32).toString("base64url");
}

export function buildGoogleAuthUrl(
  provider: GoogleProvider,
  state: string,
  codeChallenge: string,
) {
  const config = requireGoogleConfig();
  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    access_type: "offline",
    client_id: config.clientId,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: scopes[provider].join(" "),
    state,
  })}`;
}

async function parseTokenResponse(response: Response) {
  const data = (await response.json()) as TokenResponse;
  if (!response.ok) {
    throw new Error(
      data.error_description ?? data.error ?? "Permintaan token Google gagal.",
    );
  }
  return data;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
) {
  const config = requireGoogleConfig();
  const data = await parseTokenResponse(
    await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
      cache: "no-store",
    }),
  );

  if (!data.access_token || !data.refresh_token) {
    throw new Error("Google tidak mengembalikan access dan refresh token.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ?? 3600,
    scopes: data.scope?.split(" ").filter(Boolean) ?? [],
  };
}

async function refreshAccessToken(refreshToken: string) {
  const config = requireGoogleConfig();
  const data = await parseTokenResponse(
    await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    }),
  );

  if (!data.access_token)
    throw new Error("Access token Google tidak tersedia.");
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 3600 };
}

export async function storeConnection(input: {
  workspaceId: string;
  provider: GoogleProvider;
  refreshToken: string;
  scopes: string[];
  userId: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("oauth_connections")
    .upsert(
      {
        workspace_id: input.workspaceId,
        provider: input.provider,
        encrypted_refresh_token: encryptToken(input.refreshToken),
        scopes: input.scopes,
        status: "connected",
        last_error: null,
        created_by: input.userId,
      },
      { onConflict: "workspace_id,provider" },
    )
    .select("id, workspace_id, provider, scopes, status")
    .single();

  if (error) throw error;
  return data;
}

export async function getConnection(
  workspaceId: string,
  provider: GoogleProvider,
) {
  const { data, error } = await createAdminClient()
    .from("oauth_connections")
    .select(
      "id, workspace_id, provider, encrypted_refresh_token, scopes, status",
    )
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  return data as OAuthConnection | null;
}

export async function getGoogleAccessToken(
  workspaceId: string,
  provider: GoogleProvider,
) {
  const connection = await getConnection(workspaceId, provider);
  if (!connection || connection.status !== "connected") {
    throw new Error(`Koneksi ${provider.toUpperCase()} tidak aktif.`);
  }

  try {
    const token = await refreshAccessToken(
      decryptToken(connection.encrypted_refresh_token),
    );
    await createAdminClient()
      .from("oauth_connections")
      .update({
        last_refresh_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + token.expiresIn * 1000).toISOString(),
        last_error: null,
      })
      .eq("id", connection.id);
    return token.accessToken;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Refresh token gagal.";
    await createAdminClient()
      .from("oauth_connections")
      .update({ status: "error", last_error: message })
      .eq("id", connection.id);
    throw error;
  }
}

async function googleRequest<T>(
  workspaceId: string,
  provider: GoogleProvider,
  url: string,
  init?: RequestInit,
) {
  const accessToken = await getGoogleAccessToken(workspaceId, provider);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  const data = (await response.json()) as T & {
    error?: { code?: number; message?: string };
  };
  if (!response.ok) {
    const status = data.error?.code ?? response.status;
    const message = data.error?.message ?? "Google API gagal.";
    throw new Error(`Google API ${status}: ${message}`);
  }
  return data;
}

export async function listGscSites(workspaceId: string) {
  const data = await googleRequest<{ siteEntry?: GscSite[] }>(
    workspaceId,
    "gsc",
    "https://www.googleapis.com/webmasters/v3/sites",
  );
  return data.siteEntry ?? [];
}

export async function queryGscSearchAnalytics(
  workspaceId: string,
  siteUrl: string,
  request: GscSearchAnalyticsRequest,
) {
  return googleRequest<{ rows?: GscSearchAnalyticsRow[] }>(
    workspaceId,
    "gsc",
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    },
  );
}

export async function disconnectGoogleConnection(
  workspaceId: string,
  provider: GoogleProvider,
) {
  const connection = await getConnection(workspaceId, provider);
  if (!connection) return;

  try {
    await fetch(
      `https://oauth2.googleapis.com/revoke?${new URLSearchParams({ token: decryptToken(connection.encrypted_refresh_token) })}`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        cache: "no-store",
      },
    );
  } finally {
    const admin = createAdminClient();
    await admin
      .from("project_properties")
      .update({ disconnected_at: new Date().toISOString(), is_default: false })
      .eq("oauth_connection_id", connection.id);
    await admin
      .from("oauth_connections")
      .update({ status: "disconnected" })
      .eq("id", connection.id);
  }
}
