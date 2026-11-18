import Link from "next/link";
import {
  openRankEvidence,
  uploadRankEvidence,
} from "@/app/dashboard/evidence-actions";
import {
  createRankCheckin,
  deleteKeywordTarget,
  evaluateKeywordTargetStatus,
  updateKeywordTarget,
} from "@/app/dashboard/keyword-actions";
import { EvidenceUploadForm } from "@/components/keywords/evidence-upload-form";
import { KeywordTargetForm } from "@/components/keywords/keyword-target-form";
import { RankCheckinForm } from "@/components/keywords/rank-checkin-form";
import { RankTrendChart } from "@/components/keywords/rank-trend-chart";
import { listWorkspaceMembers } from "@/features/keyword-targets/members";
import {
  rankStatusLabel,
  type RankStatus,
} from "@/features/rank-status/status-engine";
import { requireKeywordTargetAccess } from "@/lib/auth/authorization";

export default async function KeywordTargetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ targetId: string }>;
  searchParams: Promise<{
    saved?: string;
    checkin?: string;
    evidence?: string;
    status?: string;
    statusError?: string;
    error?: string;
  }>;
}) {
  const { targetId } = await params;
  const query = await searchParams;
  const { supabase, target, membership } =
    await requireKeywordTargetAccess(targetId);
  const [members, checkinsResult, evidenceResult, statusesResult] =
    await Promise.all([
      listWorkspaceMembers(supabase, target.workspace_id),
      supabase
        .from("rank_checkins")
        .select(
          "id, source, position, not_found_top_100, checked_at, country_code, device, location, notes, created_at",
        )
        .eq("keyword_target_id", target.id)
        .order("checked_at", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
      supabase
        .from("rank_evidence")
        .select(
          "id, rank_checkin_id, file_name, mime_type, size_bytes, created_at",
        )
        .eq("workspace_id", target.workspace_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("rank_status_snapshots")
        .select(
          "id, status, rule_version, explanation, based_on_checkin_id, evaluated_at, created_at",
        )
        .eq("keyword_target_id", target.id)
        .order("evaluated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
    ]);
  if (checkinsResult.error) throw checkinsResult.error;
  if (evidenceResult.error) throw evidenceResult.error;
  if (statusesResult.error) throw statusesResult.error;
  const checkins = checkinsResult.data;
  const evidenceRows = evidenceResult.data;
  const statusSnapshots = statusesResult.data;
  const evidenceByCheckin = new Map<string, typeof evidenceRows>();
  for (const evidence of evidenceRows ?? []) {
    const rows = evidenceByCheckin.get(evidence.rank_checkin_id) ?? [];
    rows.push(evidence);
    evidenceByCheckin.set(evidence.rank_checkin_id, rows);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-3xl">
        <Link
          className="text-sm text-slate-400 hover:text-slate-200"
          href={`/dashboard/projects/${target.project_id}/keywords`}
        >
          ← Kembali ke target keyword
        </Link>
        {query.saved ? (
          <p className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            Perubahan target tersimpan.
          </p>
        ) : null}
        {query.checkin ? (
          <p className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            Check-in manual tersimpan sebagai riwayat baru.
          </p>
        ) : null}
        {query.evidence ? (
          <p className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            Evidence tersimpan di storage privat.
          </p>
        ) : null}
        {query.status ? (
          <p className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            Status baru tersimpan sebagai snapshot immutable.
          </p>
        ) : null}
        {query.statusError ? (
          <p className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
            Evaluasi status gagal. Check-in yang sudah tersimpan tetap aman.
          </p>
        ) : null}
        {query.error ? (
          <p className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
            {query.error === "deleteForbidden"
              ? "Hanya owner workspace yang dapat menghapus target."
              : "Target keyword gagal dihapus. Riwayat immutable mungkin masih merujuk target ini."}
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <p className="text-sm font-semibold text-emerald-400">
            Detail target
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{target.phrase}</h1>
          <KeywordTargetForm
            action={updateKeywordTarget}
            members={members}
            submitLabel="Simpan perubahan"
            target={target}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                Status v1
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Status target</h2>
            </div>
            <form action={evaluateKeywordTargetStatus}>
              <input name="targetId" type="hidden" value={target.id} />
              <button className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-slate-500">
                Evaluasi sekarang
              </button>
            </form>
          </div>
          {statusSnapshots?.length ? (
            <>
              <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                    {rankStatusLabel(statusSnapshots[0].status as RankStatus)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {statusSnapshots[0].rule_version}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-200">
                  {statusSnapshots[0].explanation}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Dievaluasi{" "}
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(statusSnapshots[0].evaluated_at))}
                </p>
              </div>
              <details className="mt-5">
                <summary className="cursor-pointer text-sm font-semibold text-slate-300">
                  Riwayat status ({statusSnapshots.length})
                </summary>
                <ol className="mt-3 divide-y divide-slate-800">
                  {statusSnapshots.map((snapshot) => (
                    <li className="py-4" key={snapshot.id}>
                      <div className="flex flex-wrap justify-between gap-3">
                        <span className="font-medium">
                          {rankStatusLabel(snapshot.status as RankStatus)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {snapshot.rule_version}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        {snapshot.explanation}
                      </p>
                    </li>
                  ))}
                </ol>
              </details>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              Belum ada snapshot status. Evaluasi menyimpan hasil, rule version,
              explanation, dan input secara immutable.
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <p className="text-sm font-semibold text-emerald-400">
            Posisi manual
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Tambah check-in</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Observasi disimpan sebagai event immutable. Sumber: manual. Posisi
            GSC tidak dicatat melalui form ini.
          </p>
          <RankCheckinForm action={createRankCheckin} targetId={target.id} />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <p className="text-sm font-semibold text-emerald-400">Trend</p>
          <h2 className="mt-2 text-2xl font-semibold">Trend posisi</h2>
          <RankTrendChart checkins={checkins ?? []} />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <p className="text-sm font-semibold text-emerald-400">Riwayat</p>
          <h2 className="mt-2 text-2xl font-semibold">Check-in posisi</h2>
          {!checkins?.length ? (
            <p className="mt-4 text-sm text-slate-400">
              Belum ada check-in. Status posisi tetap no_data.
            </p>
          ) : (
            <ol
              className="mt-6 divide-y divide-slate-800"
              data-testid="rank-history"
            >
              {checkins.map((checkin) => (
                <li className="py-5" key={checkin.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">
                        {checkin.not_found_top_100
                          ? "Tidak ditemukan di top 100"
                          : `Posisi ${checkin.position}`}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(checkin.checked_at))}
                        {` · ${checkin.country_code} · ${checkin.device}`}
                        {checkin.location ? ` · ${checkin.location}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 uppercase">
                      {checkin.source}
                    </span>
                  </div>
                  {checkin.notes ? (
                    <p className="mt-3 text-sm text-slate-300">
                      {checkin.notes}
                    </p>
                  ) : null}
                  {(evidenceByCheckin.get(checkin.id) ?? []).length ? (
                    <ul className="mt-4 grid gap-2">
                      {(evidenceByCheckin.get(checkin.id) ?? []).map(
                        (evidence) => (
                          <li
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-950/60 p-3 text-sm"
                            key={evidence.id}
                          >
                            <span>
                              {evidence.file_name} · {evidence.mime_type} ·{" "}
                              {Math.ceil(evidence.size_bytes / 1024)} KiB
                            </span>
                            <form action={openRankEvidence}>
                              <input
                                name="evidenceId"
                                type="hidden"
                                value={evidence.id}
                              />
                              <input
                                name="targetId"
                                type="hidden"
                                value={target.id}
                              />
                              <button className="font-semibold text-emerald-300 hover:text-emerald-200">
                                Buka 60 detik
                              </button>
                            </form>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : null}
                  <EvidenceUploadForm
                    action={uploadRankEvidence}
                    checkinId={checkin.id}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>

        {membership.role === "owner" ? (
          <div className="mt-6 rounded-2xl border border-red-950 bg-red-950/20 p-6">
            <h2 className="font-semibold text-red-100">Hapus target</h2>
            <p className="mt-2 text-sm leading-6 text-red-200/70">
              Penghapusan owner-only dan hanya tersedia sebelum target memiliki
              riwayat check-in.
            </p>
            <form action={deleteKeywordTarget} className="mt-4">
              <input name="targetId" type="hidden" value={target.id} />
              <button className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/60">
                Hapus target
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}
