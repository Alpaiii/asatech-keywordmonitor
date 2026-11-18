import Link from "next/link";
import { createKeywordTarget } from "@/app/dashboard/keyword-actions";
import { KeywordTargetForm } from "@/components/keywords/keyword-target-form";
import { listWorkspaceMembers } from "@/features/keyword-targets/members";
import { requireProjectAccess } from "@/lib/auth/authorization";

export default async function NewKeywordTargetPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { supabase, project } = await requireProjectAccess(projectId);
  const members = await listWorkspaceMembers(supabase, project.workspace_id);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-3xl">
        <Link
          className="text-sm text-slate-400 hover:text-slate-200"
          href={`/dashboard/projects/${project.id}/keywords`}
        >
          ← Kembali ke target keyword
        </Link>
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <p className="text-sm font-semibold text-emerald-400">Target baru</p>
          <h1 className="mt-2 text-3xl font-semibold">Tambahkan keyword</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Posisi belum dibuat otomatis. Check-in manual ditambahkan sebagai
            event terpisah setelah target tersimpan.
          </p>
          <KeywordTargetForm
            action={createKeywordTarget}
            members={members}
            projectId={project.id}
            submitLabel="Simpan target"
          />
        </div>
      </section>
    </main>
  );
}
