import Link from "next/link";
import { archiveProject, updateProject } from "@/app/dashboard/actions";
import { ProjectForm } from "@/components/projects/project-form";
import { requireProjectAccess } from "@/lib/auth/authorization";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const { project, membership } = await requireProjectAccess(projectId);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-3xl">
        <Link
          className="text-sm text-slate-400 hover:text-slate-200"
          href={`/dashboard?workspace=${project.workspace_id}`}
        >
          ← Kembali ke project
        </Link>

        {query.saved ? (
          <p className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            Perubahan project tersimpan.
          </p>
        ) : null}
        {query.error ? (
          <p className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
            {query.error === "owner-required"
              ? "Hanya owner workspace yang dapat mengarsipkan project."
              : "Project gagal diarsipkan."}
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                Detail project
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>
              <p className="mt-2 text-sm text-slate-400">{project.domain}</p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400 uppercase">
              {membership.role}
            </span>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-block rounded-xl border border-emerald-800 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-950/40"
                href={`/dashboard/projects/${project.id}/keywords`}
              >
                Kelola target keyword
              </Link>
              <Link
                className="inline-block rounded-xl border border-blue-800 px-4 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-950/40"
                href={`/dashboard/projects/${project.id}/gsc`}
              >
                Google Search Console
              </Link>
            </div>
          </div>

          <ProjectForm
            action={updateProject}
            project={project}
            submitLabel="Simpan perubahan"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-red-950 bg-red-950/20 p-6">
          <h2 className="font-semibold text-red-100">Zona berbahaya</h2>
          <p className="mt-2 text-sm leading-6 text-red-200/70">
            Archive menghentikan project dari daftar aktif. Data tidak dihapus
            permanen.
          </p>
          {membership.role === "owner" ? (
            <form action={archiveProject} className="mt-4">
              <input name="projectId" type="hidden" value={project.id} />
              <button className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/60">
                Arsipkan project
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-red-200/70">
              Hanya owner workspace dapat mengarsipkan project.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
