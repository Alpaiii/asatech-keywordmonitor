import Link from "next/link";
import { requireProjectAccess } from "@/lib/auth/authorization";

export default async function KeywordTargetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    statusError?: string;
  }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const { supabase, project } = await requireProjectAccess(projectId);
  const { data: targets, error: targetsError } = await supabase
    .from("keyword_targets")
    .select(
      "id, phrase, country_code, language_code, device, location, target_position, priority, deadline, assignee_user_id, created_at",
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <Link
          className="text-sm text-slate-400 hover:text-slate-200"
          href={`/dashboard/projects/${project.id}`}
        >
          ← Kembali ke detail project
        </Link>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              Keyword operations
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Target keyword</h1>
            <p className="mt-2 text-sm text-slate-400">{project.name}</p>
          </div>
          <Link
            className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"
            href={`/dashboard/projects/${project.id}/keywords/new`}
          >
            Tambah target
          </Link>
        </div>

        {query.created ? (
          <p className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            Target keyword berhasil dibuat.
          </p>
        ) : null}
        {query.deleted ? (
          <p className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            Target keyword berhasil dihapus.
          </p>
        ) : null}
        {query.statusError ? (
          <p className="mt-6 rounded-xl border border-amber-900 bg-amber-950/40 p-4 text-sm text-amber-200">
            Target tersimpan, tetapi snapshot status gagal dibuat. Jalankan
            evaluasi status ulang dari detail target.
          </p>
        ) : null}
        {targetsError ? (
          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/30 p-6">
            <h2 className="font-semibold text-red-100">
              Target keyword gagal dimuat
            </h2>
            <p className="mt-2 text-sm text-red-200/80">
              Muat ulang halaman. Data tidak ditampilkan sebagai empty state.
            </p>
          </div>
        ) : !targets?.length ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-700 p-10 text-center">
            <h2 className="text-lg font-semibold">Belum ada target keyword</h2>
            <p className="mt-2 text-sm text-slate-400">
              Tambahkan keyword asli yang ingin dipantau. Belum ada posisi
              sampai check-in dicatat.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {targets.map((target) => (
              <Link
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-600"
                href={`/dashboard/keywords/${target.id}`}
                key={target.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{target.phrase}</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {target.country_code} · {target.language_code} ·{" "}
                      {target.device}
                      {target.location ? ` · ${target.location}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 uppercase">
                    {target.priority}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-300">
                  Target posisi ≤ {target.target_position}
                  {target.deadline ? ` · Deadline ${target.deadline}` : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
