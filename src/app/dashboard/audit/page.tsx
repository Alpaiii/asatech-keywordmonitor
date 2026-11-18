import Link from "next/link";
import {
  AUDIT_CATEGORIES,
  AUDIT_CATEGORY_LABELS,
  buildKeywordAudit,
  type AuditCheckin,
  type AuditTarget,
} from "@/features/audit/keyword-audit";
import { parseAuditFilters } from "@/features/audit/filters";
import {
  buildAssigneeProgress,
  buildProjectProgress,
  evaluateTargetProgress,
} from "@/features/audit/progress";
import { listWorkspaceMembers } from "@/features/keyword-targets/members";
import { requireUser, type WorkspaceRole } from "@/lib/auth/authorization";

type Workspace = {
  id: string;
  name: string;
  workspace_members: Array<{ role: WorkspaceRole }>;
};

type SearchParams = {
  workspace?: string;
  project?: string;
  category?: string;
};

export default async function AuditDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseAuditFilters(params);
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

  if (!activeWorkspace) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <p>Workspace belum tersedia.</p>
      </main>
    );
  }

  const [
    projectsResult,
    targetsResult,
    checkinsResult,
    evidenceResult,
    members,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name")
      .eq("workspace_id", activeWorkspace.id)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("keyword_targets")
      .select(
        "id, project_id, phrase, priority, assignee_user_id, target_position, deadline, maintain_enabled, maintain_position_limit, check_frequency_days",
      )
      .eq("workspace_id", activeWorkspace.id),
    supabase
      .from("rank_checkins")
      .select(
        "id, keyword_target_id, source, position, not_found_top_100, checked_at, created_at",
      )
      .eq("workspace_id", activeWorkspace.id),
    supabase
      .from("rank_evidence")
      .select("rank_checkin_id")
      .eq("workspace_id", activeWorkspace.id),
    listWorkspaceMembers(supabase, activeWorkspace.id),
  ]);

  if (projectsResult.error) throw projectsResult.error;
  if (targetsResult.error) throw targetsResult.error;
  if (checkinsResult.error) throw checkinsResult.error;
  if (evidenceResult.error) throw evidenceResult.error;

  const projects = projectsResult.data ?? [];
  const projectById = new Map(
    projects.map((project) => [project.id, project.name]),
  );
  const memberById = new Map(
    members.map((member) => [
      member.userId,
      member.displayName ?? member.userId.slice(0, 8),
    ]),
  );
  const targets = (targetsResult.data ?? []) as AuditTarget[];
  const checkins = (checkinsResult.data ?? []) as AuditCheckin[];
  const evaluatedAt = new Date();
  const allItems = buildKeywordAudit(
    targets,
    checkins,
    evidenceResult.data ?? [],
    evaluatedAt,
  );
  const targetProgress = evaluateTargetProgress(targets, checkins, evaluatedAt);
  const projectProgress = buildProjectProgress(
    projects.map((project) => project.id),
    targetProgress,
    allItems,
  );
  const assigneeProgress = buildAssigneeProgress(
    members.map((member) => member.userId),
    targetProgress,
    allItems,
  ).filter((summary) => summary.totalTargets > 0);
  const unassignedTargets = targets.filter(
    (target) => !target.assignee_user_id,
  ).length;
  const countableItems = filters.project
    ? allItems.filter((item) => item.projectId === filters.project)
    : allItems;
  const counts = new Map(
    AUDIT_CATEGORIES.map((category) => [
      category,
      countableItems.filter((item) => item.category === category).length,
    ]),
  );
  const items = allItems.filter((item) => {
    if (filters.project && item.projectId !== filters.project) return false;
    if (filters.category && item.category !== filters.category) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-6xl">
        <Link
          className="text-sm text-slate-400 hover:text-slate-200"
          href={`/dashboard?workspace=${activeWorkspace.id}`}
        >
          ← Kembali ke workspace
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              Audit operasional
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Item perlu tindakan</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Status dihitung ulang saat halaman dibuka. Setiap item menunjuk
              target, check-in acuan, rule, waktu evaluasi, dan alasan.
            </p>
          </div>
          <nav aria-label="Pilih workspace" className="flex flex-wrap gap-2">
            {workspaces.map((workspace) => (
              <Link
                className={`rounded-full border px-3 py-2 text-sm ${
                  workspace.id === activeWorkspace.id
                    ? "border-emerald-400 text-emerald-300"
                    : "border-slate-700 text-slate-300"
                }`}
                href={`/dashboard/audit?workspace=${workspace.id}`}
                key={workspace.id}
              >
                {workspace.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIT_CATEGORIES.map((category) => (
            <Link
              className={`rounded-2xl border p-4 ${
                filters.category === category
                  ? "border-amber-500 bg-amber-950/30"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
              }`}
              href={`/dashboard/audit?workspace=${activeWorkspace.id}&category=${category}${filters.project ? `&project=${filters.project}` : ""}`}
              key={category}
            >
              <p className="text-sm text-slate-400">
                {AUDIT_CATEGORY_LABELS[category]}
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {counts.get(category) ?? 0}
              </p>
            </Link>
          ))}
        </div>

        <section className="mt-8">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              Progress project
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              Pencapaian target per project
            </h2>
          </div>
          {!projectProgress.length ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
              Belum ada project aktif.
            </p>
          ) : (
            <div
              className="mt-4 grid gap-4 md:grid-cols-2"
              data-testid="project-progress"
            >
              {projectProgress.map((summary) => (
                <article
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                  key={summary.projectId}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-semibold">
                      {projectById.get(summary.projectId) ?? "Project"}
                    </h3>
                    <span className="text-2xl font-semibold text-emerald-300">
                      {summary.progressPercent}%
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      aria-label={`${summary.progressPercent}% target tercapai`}
                      className="h-full bg-emerald-400"
                      style={{ width: `${summary.progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    {summary.achievedTargets} dari {summary.totalTargets} target
                    tercapai · {summary.actionTargets} target perlu tindakan
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Overdue {summary.overdueTargets} · Stale{" "}
                    {summary.staleTargets}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              Beban target PIC
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              Kondisi target yang ditugaskan
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Ringkasan keadaan target, bukan penilaian produktivitas individu.
            </p>
          </div>
          {assigneeProgress.length ? (
            <div
              className="mt-4 overflow-x-auto rounded-2xl border border-slate-800"
              data-testid="pic-progress"
            >
              <table className="w-full min-w-3xl text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">PIC</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium">Tercapai</th>
                    <th className="px-4 py-3 font-medium">Progress</th>
                    <th className="px-4 py-3 font-medium">Perlu tindakan</th>
                    <th className="px-4 py-3 font-medium">Overdue / stale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/30">
                  {assigneeProgress.map((summary) => (
                    <tr key={summary.assigneeUserId}>
                      <td className="px-4 py-3 font-medium">
                        {memberById.get(summary.assigneeUserId) ?? "Anggota"}
                      </td>
                      <td className="px-4 py-3">{summary.totalTargets}</td>
                      <td className="px-4 py-3">{summary.achievedTargets}</td>
                      <td className="px-4 py-3">{summary.progressPercent}%</td>
                      <td className="px-4 py-3">{summary.actionTargets}</td>
                      <td className="px-4 py-3">
                        {summary.overdueTargets} / {summary.staleTargets}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
              Belum ada target yang ditugaskan ke PIC.
            </p>
          )}
          {unassignedTargets ? (
            <p className="mt-3 text-sm text-amber-300">
              {unassignedTargets} target belum memiliki PIC dan tidak masuk
              tabel PIC.
            </p>
          ) : null}
        </section>

        <form
          className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:grid-cols-2"
          method="get"
        >
          <input name="workspace" type="hidden" value={activeWorkspace.id} />
          <label className="text-sm font-medium">
            Project
            <select
              className="input mt-2"
              defaultValue={filters.project}
              name="project"
            >
              <option value="">Semua project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Kategori
            <select
              className="input mt-2"
              defaultValue={filters.category}
              name="category"
            >
              <option value="">Semua kategori</option>
              {AUDIT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {AUDIT_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950">
              Terapkan filter
            </button>
            {filters.project || filters.category ? (
              <Link
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold"
                href={`/dashboard/audit?workspace=${activeWorkspace.id}`}
              >
                Reset filter
              </Link>
            ) : null}
          </div>
        </form>

        {!items.length ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-700 p-10 text-center">
            <h2 className="text-lg font-semibold">Tidak ada item audit</h2>
            <p className="mt-2 text-sm text-slate-400">
              Tidak ada target yang cocok atau semua target pada filter ini
              tidak memerlukan tindakan.
            </p>
          </div>
        ) : (
          <ol className="mt-8 grid gap-4" data-testid="audit-items">
            {items.map((item) => (
              <li
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                key={item.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-amber-300 uppercase">
                      {AUDIT_CATEGORY_LABELS[item.category]}
                    </p>
                    <Link
                      className="mt-2 block text-lg font-semibold hover:text-emerald-300"
                      href={`/dashboard/keywords/${item.targetId}`}
                    >
                      {item.phrase}
                    </Link>
                    <p className="mt-1 text-sm text-slate-400">
                      {projectById.get(item.projectId) ?? "Project"} · PIC:{" "}
                      {item.assigneeUserId
                        ? (memberById.get(item.assigneeUserId) ?? "Anggota")
                        : "Belum ditugaskan"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 uppercase">
                    {item.priority}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-200">
                  {item.explanation}
                </p>
                <dl className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                  <div>
                    <dt>Rule</dt>
                    <dd className="mt-1 font-mono text-slate-300">
                      {item.ruleVersion}
                    </dd>
                  </div>
                  <div>
                    <dt>Check-in acuan</dt>
                    <dd className="mt-1 font-mono text-slate-300">
                      {item.basedOnCheckinId ?? "tidak ada"}
                    </dd>
                  </div>
                  <div>
                    <dt>Dievaluasi</dt>
                    <dd className="mt-1 text-slate-300">
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.evaluatedAt))}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
