import Link from "next/link";
import { notFound } from "next/navigation";
import { createProject } from "@/app/dashboard/actions";
import { ProjectForm } from "@/components/projects/project-form";
import { requireWorkspaceMembership } from "@/lib/auth/authorization";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { workspace } = await searchParams;
  if (!workspace) notFound();

  await requireWorkspaceMembership(workspace);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-2xl">
        <Link
          className="text-sm text-slate-400 hover:text-slate-200"
          href={`/dashboard?workspace=${workspace}`}
        >
          ← Kembali ke project
        </Link>
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <p className="text-sm font-semibold text-emerald-400">Project baru</p>
          <h1 className="mt-2 text-3xl font-semibold">Tambahkan website</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Domain aktif unik dalam workspace. Integrasi GSC ditambahkan pada
            fase berikutnya.
          </p>
          <ProjectForm
            action={createProject}
            submitLabel="Simpan project"
            workspaceId={workspace}
          />
        </div>
      </section>
    </main>
  );
}
