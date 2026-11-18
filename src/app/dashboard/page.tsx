import Link from "next/link";
import { logout } from "@/app/login/actions";
import { requireUser, type WorkspaceRole } from "@/lib/auth/authorization";

type DashboardPageProps = {
  searchParams: Promise<{
    workspace?: string;
    archived?: string;
  }>;
};

type Workspace = {
  id: string;
  name: string;
  workspace_members: Array<{ role: WorkspaceRole }>;
};

type Project = {
  id: string;
  name: string;
  site_url: string;
  domain: string;
  default_country: string;
  default_language: string;
  timezone: string;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: workspaceRows, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name, workspace_members!inner(role)")
    .eq("workspace_members.user_id", user.id)
    .order("created_at");
  if (workspaceError) throw workspaceError;

  const workspaces = (workspaceRows ?? []) as Workspace[];
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === params.workspace) ??
    workspaces[0];
  const role = activeWorkspace?.workspace_members[0]?.role;

  let projects: Project[] = [];
  if (activeWorkspace) {
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, name, site_url, domain, default_country, default_language, timezone",
      )
      .eq("workspace_id", activeWorkspace.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    projects = (data ?? []) as Project[];
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-slate-800 pb-7">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              KeywordScope
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Project workspace</h1>
            <p className="mt-2 text-sm text-slate-300">{user.email}</p>
          </div>
          <form action={logout}>
            <button className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium hover:border-slate-500">
              Keluar
            </button>
          </form>
        </header>

        {workspaces.length > 0 ? (
          <nav
            aria-label="Pilih workspace"
            className="mt-6 flex flex-wrap gap-2"
          >
            {workspaces.map((workspace) => (
              <Link
                className={`rounded-full border px-4 py-2 text-sm font-medium ${
                  workspace.id === activeWorkspace?.id
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                    : "border-slate-600 text-slate-200 hover:border-slate-400"
                }`}
                href={`/dashboard?workspace=${workspace.id}`}
                key={workspace.id}
              >
                {workspace.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {params.archived ? (
          <p className="mt-6 rounded-xl border border-emerald-800 bg-emerald-950/50 p-4 text-sm text-emerald-100">
            Project berhasil diarsipkan.
          </p>
        ) : null}

        {!activeWorkspace ? (
          <section className="mt-8 rounded-2xl border border-amber-800 bg-amber-950/40 p-6">
            <h2 className="font-semibold text-amber-50">
              Workspace belum tersedia
            </h2>
            <p className="mt-2 text-sm text-amber-100">
              Akun tidak memiliki membership aktif. Hubungi owner workspace.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Workspace aktif · {role}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {activeWorkspace.name}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  className="rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-100 hover:border-slate-400"
                  href={`/dashboard/audit?workspace=${activeWorkspace.id}`}
                >
                  Audit operasional
                </Link>
                <Link
                  className="rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-100 hover:border-slate-400"
                  href={`/dashboard/keywords?workspace=${activeWorkspace.id}`}
                >
                  Target keyword
                </Link>
                <Link
                  className="rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-100 hover:border-slate-400"
                  href={`/dashboard/integrations?workspace=${activeWorkspace.id}`}
                >
                  Integrasi
                </Link>
                <Link
                  className="rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-100 hover:border-slate-400"
                  href={`/dashboard/workspaces/${activeWorkspace.id}/members`}
                >
                  Anggota
                </Link>
                <Link
                  className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"
                  href={`/dashboard/projects/new?workspace=${activeWorkspace.id}`}
                >
                  Tambah project
                </Link>
              </div>
            </section>

            {projects.length === 0 ? (
              <section className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
                <h3 className="text-lg font-semibold">Belum ada project</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-300">
                  Tambahkan website pertama. GSC dan keyword provider tetap
                  berstatus belum terhubung sampai integrasi dikonfigurasi.
                </p>
              </section>
            ) : (
              <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Link
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600"
                    href={`/dashboard/projects/${project.id}`}
                    key={project.id}
                  >
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="mt-2 truncate text-sm text-slate-400">
                      {project.site_url}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span>{project.default_country}</span>
                      <span className="text-slate-500">·</span>
                      <span>{project.default_language}</span>
                      <span className="text-slate-500">·</span>
                      <span>{project.timezone}</span>
                    </div>
                  </Link>
                ))}
              </section>
            )}
          </>
        )}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-300">
          GSC: <strong className="text-slate-100">Belum terhubung</strong> ·
          Keyword provider:{" "}
          <code className="text-slate-100">not_configured</code> · Tidak ada
          metrik SEO demo ditampilkan.
        </section>
      </div>
    </main>
  );
}
