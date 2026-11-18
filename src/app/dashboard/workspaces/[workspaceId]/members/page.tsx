import Link from "next/link";
import { requireWorkspaceMembership } from "@/lib/auth/authorization";

export default async function WorkspaceMembersPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { supabase, membership } =
    await requireWorkspaceMembership(workspaceId);

  const [{ data: workspace }, { data: memberRows }] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id, name")
      .eq("id", workspaceId)
      .single(),
    supabase
      .from("workspace_members")
      .select("user_id, role, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at"),
  ]);

  const userIds = (memberRows ?? []).map((member) => member.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds)
    : { data: [] };
  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-3xl">
        <Link
          className="text-sm text-slate-400 hover:text-slate-200"
          href={`/dashboard?workspace=${workspaceId}`}
        >
          ← Kembali ke workspace
        </Link>
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                Anggota workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold">
                {workspace?.name ?? "Workspace"}
              </h1>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400 uppercase">
              Akses Anda · {membership.role}
            </span>
          </div>

          <ul className="mt-8 divide-y divide-slate-800">
            {(memberRows ?? []).map((member) => (
              <li
                className="flex items-center justify-between gap-4 py-4"
                key={member.user_id}
              >
                <div>
                  <p className="font-medium">
                    {profileById.get(member.user_id) ?? "Pengguna"}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {member.user_id}
                  </p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 uppercase">
                  {member.role}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-6 text-slate-400">
            Undangan dan perubahan role belum tersedia. Owner terakhir tidak
            dapat diturunkan atau dihapus agar workspace tidak kehilangan
            pengelola.
          </p>
        </div>
      </section>
    </main>
  );
}
