import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error("Environment Supabase lokal belum lengkap.");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createTestUser(label) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const email = `${label}-${crypto.randomUUID()}@keywordscope.local`;
  const password = `Local-${crypto.randomUUID()}!`;
  const { data, error } = await client.auth.signUp({ email, password });

  if (error || !data.user || !data.session) {
    throw error ?? new Error(`Signup ${label} gagal.`);
  }

  const { data: memberships, error: membershipError } = await client
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", data.user.id);

  if (membershipError) throw membershipError;
  assert(memberships?.length === 1, `${label} tidak memiliki satu workspace.`);
  assert(memberships[0]?.role === "owner", `${label} bukan owner default.`);

  return {
    client,
    userId: data.user.id,
    workspaceId: memberships[0].workspace_id,
  };
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const userA = await createTestUser("isolation-a");
const userB = await createTestUser("isolation-b");

const { error: lastOwnerDeleteError } = await admin
  .from("workspace_members")
  .delete()
  .eq("workspace_id", userA.workspaceId)
  .eq("user_id", userA.userId);
assert(lastOwnerDeleteError, "Owner terakhir dapat dihapus.");

const { error: lastOwnerDemoteError } = await admin
  .from("workspace_members")
  .update({ role: "member" })
  .eq("workspace_id", userA.workspaceId)
  .eq("user_id", userA.userId);
assert(lastOwnerDemoteError, "Owner terakhir dapat diturunkan menjadi member.");

const { data: projectA, error: createError } = await userA.client
  .from("projects")
  .insert({
    workspace_id: userA.workspaceId,
    name: "Project Rahasia A",
    site_url: "https://a.example.test",
    domain: `a-${crypto.randomUUID()}.example.test`,
    default_country: "ID",
    default_language: "id",
    timezone: "Asia/Jakarta",
  })
  .select("id, workspace_id, name, archived_at")
  .single();

if (createError) throw createError;

const { data: leakedWorkspace, error: workspaceReadError } = await userB.client
  .from("workspaces")
  .select("id")
  .eq("id", userA.workspaceId);
if (workspaceReadError) throw workspaceReadError;
assert(leakedWorkspace?.length === 0, "User B dapat membaca Workspace A.");

const { data: leakedProject, error: projectReadError } = await userB.client
  .from("projects")
  .select("id")
  .eq("id", projectA.id);
if (projectReadError) throw projectReadError;
assert(leakedProject?.length === 0, "User B dapat membaca Project A.");

const { data: changedProject, error: updateError } = await userB.client
  .from("projects")
  .update({ name: "Diubah User B" })
  .eq("id", projectA.id)
  .select("id");
if (updateError) throw updateError;
assert(changedProject?.length === 0, "User B dapat mengubah Project A.");

const { data: deletedProject, error: deleteError } = await userB.client
  .from("projects")
  .delete()
  .eq("id", projectA.id)
  .select("id");
if (deleteError) throw deleteError;
assert(deletedProject?.length === 0, "User B dapat menghapus Project A.");

const { error: crossInsertError } = await userB.client.from("projects").insert({
  workspace_id: userA.workspaceId,
  name: "Cross-tenant insert",
  site_url: "https://cross.example.test",
  domain: `cross-${crypto.randomUUID()}.example.test`,
});
assert(crossInsertError, "User B dapat membuat project dalam Workspace A.");

const { error: addMemberError } = await admin.from("workspace_members").insert({
  workspace_id: userA.workspaceId,
  user_id: userB.userId,
  role: "member",
});
if (addMemberError) throw addMemberError;

const { error: moveMembershipError } = await userA.client
  .from("workspace_members")
  .update({ workspace_id: userB.workspaceId })
  .eq("workspace_id", userA.workspaceId)
  .eq("user_id", userB.userId);
assert(moveMembershipError, "Identity membership dapat dipindah lewat update.");

const { data: sharedProject, error: sharedReadError } = await userB.client
  .from("projects")
  .select("id, name")
  .eq("id", projectA.id)
  .single();
if (sharedReadError) throw sharedReadError;
assert(
  sharedProject.id === projectA.id,
  "Member tidak dapat membaca project bersama.",
);

const { error: memberUpdateError } = await userB.client
  .from("projects")
  .update({ name: "Diubah Member B" })
  .eq("id", projectA.id);
if (memberUpdateError) throw memberUpdateError;

const { error: memberArchiveError } = await userB.client
  .from("projects")
  .update({ archived_at: new Date().toISOString() })
  .eq("id", projectA.id);
assert(memberArchiveError, "Member dapat mengarsipkan project.");

const { error: ownerArchiveError } = await userA.client
  .from("projects")
  .update({ archived_at: new Date().toISOString() })
  .eq("id", projectA.id);
if (ownerArchiveError) throw ownerArchiveError;

await admin.auth.admin.deleteUser(userA.userId);
await admin.auth.admin.deleteUser(userB.userId);

console.log(
  "RLS lulus: non-member terisolasi; member dapat membaca/mengubah; archive owner-only; owner terakhir terlindungi.",
);
