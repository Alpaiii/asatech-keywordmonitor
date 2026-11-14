import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Environment Supabase lokal belum tersedia.");
}

const supabase = createClient(url, anonKey);
const email = `verify-${Date.now()}@keywordscope.local`;
const password = `Local-${crypto.randomUUID()}!`;

const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
});
if (authError || !authData.user || !authData.session) {
  throw authError ?? new Error("Signup lokal tidak menghasilkan session.");
}

const { data: memberships, error: membershipError } = await supabase
  .from("workspace_members")
  .select("workspace_id, role")
  .eq("user_id", authData.user.id);

if (membershipError) throw membershipError;
if (memberships?.length !== 1 || memberships[0]?.role !== "owner") {
  throw new Error("Trigger default workspace atau RLS membership gagal.");
}

const { data: workspaces, error: workspaceError } = await supabase
  .from("workspaces")
  .select("id, name, owner_id")
  .eq("id", memberships[0].workspace_id);

if (workspaceError) throw workspaceError;
if (workspaces?.length !== 1 || workspaces[0]?.owner_id !== authData.user.id) {
  throw new Error("Workspace default tidak dapat dibaca owner.");
}

console.log(
  "Supabase lokal terverifikasi: auth, trigger workspace, membership, dan RLS read lulus.",
);
