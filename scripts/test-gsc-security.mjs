import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey)
  throw new Error("Environment Supabase lokal belum lengkap.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function user(label) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const email = `${label}-${crypto.randomUUID()}@keywordscope.local`;
  const { data, error } = await client.auth.signUp({
    email,
    password: `Local-${crypto.randomUUID()}!`,
  });
  if (error || !data.user) throw error ?? new Error("Signup gagal.");
  const { data: membership, error: membershipError } = await client
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", data.user.id)
    .single();
  if (membershipError) throw membershipError;
  return { client, id: data.user.id, workspaceId: membership.workspace_id };
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const owner = await user("gsc-owner");
const outsider = await user("gsc-outsider");

const { data: project, error: projectError } = await owner.client
  .from("projects")
  .insert({
    workspace_id: owner.workspaceId,
    name: "GSC security",
    site_url: "https://gsc-security.example.test",
    domain: `${crypto.randomUUID()}.example.test`,
    default_country: "ID",
    default_language: "id",
    timezone: "Asia/Jakarta",
  })
  .select("id")
  .single();
if (projectError) throw projectError;

const { data: connection, error: connectionError } = await admin
  .from("oauth_connections")
  .insert({
    workspace_id: owner.workspaceId,
    provider: "gsc",
    encrypted_refresh_token: "encrypted-test-token",
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    created_by: owner.id,
  })
  .select("id")
  .single();
if (connectionError) throw connectionError;

const { data: property, error: propertyError } = await admin
  .from("project_properties")
  .insert({
    workspace_id: owner.workspaceId,
    project_id: project.id,
    oauth_connection_id: connection.id,
    provider: "gsc",
    property_uri: "sc-domain:gsc-security.example.test",
    is_default: true,
  })
  .select("id")
  .single();
if (propertyError) throw propertyError;

await admin.from("gsc_daily_property_metrics").insert({
  project_id: project.id,
  date: "2026-11-01",
  clicks: 1,
  impressions: 10,
  ctr: 0.1,
  position: 5,
});

const { data: leakedConnection } = await outsider.client
  .from("oauth_connections")
  .select("id")
  .eq("id", connection.id);
assert(
  leakedConnection.length === 0,
  "OAuth connection bocor lintas workspace.",
);
const { data: ownerConnection } = await owner.client
  .from("oauth_connections")
  .select("id")
  .eq("id", connection.id);
assert(
  ownerConnection.length === 0,
  "Refresh token dapat dibaca melalui client owner.",
);
const { data: leakedProperty } = await outsider.client
  .from("project_properties")
  .select("id")
  .eq("id", property.id);
assert(leakedProperty.length === 0, "Property bocor lintas workspace.");
const { data: leakedMetric } = await outsider.client
  .from("gsc_daily_property_metrics")
  .select("project_id")
  .eq("project_id", project.id);
assert(leakedMetric.length === 0, "Metrik GSC bocor lintas workspace.");
const { data: ownerMetric } = await owner.client
  .from("gsc_daily_property_metrics")
  .select("clicks")
  .eq("project_id", project.id)
  .single();
assert(
  Number(ownerMetric.clicks) === 1,
  "Member workspace tidak dapat membaca metrik GSC.",
);

await admin.auth.admin.deleteUser(owner.id);
await admin.auth.admin.deleteUser(outsider.id);
console.log("GSC RLS security passed.");
