import Link from "next/link";
import { ImportPanel } from "@/components/imports/import-panel";
import { BulkKeywordTargetList } from "@/components/keywords/bulk-keyword-target-list";
import {
  hasKeywordTargetFilters,
  parseKeywordTargetFilters,
} from "@/features/keyword-targets/filters";
import { listWorkspaceMembers } from "@/features/keyword-targets/members";
import {
  rankStatusLabel,
  type RankStatus,
} from "@/features/rank-status/status-engine";
import { requireUser, type WorkspaceRole } from "@/lib/auth/authorization";

type Workspace = {
  id: string;
  name: string;
  workspace_members: Array<{ role: WorkspaceRole }>;
};

type SearchParams = {
  workspace?: string;
  project?: string;
  pic?: string;
  priority?: string;
  status?: string;
  maintain?: string;
};

const priorities = [
  ["low", "Rendah"],
  ["medium", "Sedang"],
  ["high", "Tinggi"],
  ["critical", "Kritis"],
] as const;
const statuses: Array<[RankStatus, string]> = [
  ["no_data", "Belum ada data"],
  ["overdue", "Terlambat"],
  ["maintain_warning", "Peringatan maintain"],
  ["stale", "Data kedaluwarsa"],
  ["achieved", "Target tercapai"],
  ["at_risk", "Berisiko"],
  ["on_track", "Sesuai jalur"],
];

export default async function WorkspaceKeywordTargetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseKeywordTargetFilters(params);
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

  const [projectsResult, members, targetsResult, snapshotsResult] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name")
        .eq("workspace_id", activeWorkspace.id)
        .is("archived_at", null)
        .order("name"),
      listWorkspaceMembers(supabase, activeWorkspace.id),
      supabase
        .from("keyword_targets")
        .select(
          "id, project_id, phrase, country_code, language_code, device, location, target_position, priority, deadline, maintain_enabled, assignee_user_id, created_at",
        )
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("rank_status_snapshots")
        .select(
          "id, keyword_target_id, status, explanation, evaluated_at, created_at",
        )
        .eq("workspace_id", activeWorkspace.id)
        .order("evaluated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
    ]);
  if (projectsResult.error) throw projectsResult.error;
  if (targetsResult.error) throw targetsResult.error;
  if (snapshotsResult.error) throw snapshotsResult.error;
  const projects = projectsResult.data;
  const targetRows = targetsResult.data;
  const snapshotRows = snapshotsResult.data;

  const projectById = new Map(
    (projects ?? []).map((project) => [project.id, project.name]),
  );
  const memberById = new Map(
    members.map((member) => [
      member.userId,
      member.displayName ?? member.userId.slice(0, 8),
    ]),
  );
  const latestStatusByTarget = new Map<
    string,
    NonNullable<typeof snapshotRows>[number]
  >();
  for (const snapshot of snapshotRows ?? []) {
    if (!latestStatusByTarget.has(snapshot.keyword_target_id)) {
      latestStatusByTarget.set(snapshot.keyword_target_id, snapshot);
    }
  }

  const targets = (targetRows ?? []).filter((target) => {
    const latestStatus = latestStatusByTarget.get(target.id)?.status;
    if (filters.project && target.project_id !== filters.project) return false;
    if (filters.pic === "unassigned" && target.assignee_user_id !== null)
      return false;
    if (
      filters.pic &&
      filters.pic !== "unassigned" &&
      target.assignee_user_id !== filters.pic
    )
      return false;
    if (filters.priority && target.priority !== filters.priority) return false;
    if (filters.status && latestStatus !== filters.status) return false;
    if (
      filters.maintain &&
      target.maintain_enabled !== (filters.maintain === "enabled")
    )
      return false;
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
              Keyword operations
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Semua target keyword
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {activeWorkspace.name} · {targets.length} hasil
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <a
              className="rounded-xl border border-slate-700 bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"
              download
              href="/api/v1/imports/keyword-targets/template"
            >
              Unduh template Excel
            </a>
            <nav aria-label="Pilih workspace" className="flex flex-wrap gap-2">
              {workspaces.map((workspace) => (
                <Link
                  className={`rounded-full border px-3 py-2 text-sm ${
                    workspace.id === activeWorkspace.id
                      ? "border-emerald-400 text-emerald-300"
                      : "border-slate-700 text-slate-300"
                  }`}
                  href={`/dashboard/keywords?workspace=${workspace.id}`}
                  key={workspace.id}
                >
                  {workspace.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <form
          className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:grid-cols-2 lg:grid-cols-5"
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
              {(projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            PIC
            <select
              className="input mt-2"
              defaultValue={filters.pic}
              name="pic"
            >
              <option value="">Semua PIC</option>
              <option value="unassigned">Belum ditugaskan</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName ?? member.userId.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Prioritas
            <select
              className="input mt-2"
              defaultValue={filters.priority}
              name="priority"
            >
              <option value="">Semua prioritas</option>
              {priorities.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Status
            <select
              className="input mt-2"
              defaultValue={filters.status}
              name="status"
            >
              <option value="">Semua status</option>
              {statuses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Maintain
            <select
              className="input mt-2"
              defaultValue={filters.maintain}
              name="maintain"
            >
              <option value="">Semua mode</option>
              <option value="enabled">Aktif</option>
              <option value="disabled">Nonaktif</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2 lg:col-span-5">
            <button className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950">
              Terapkan filter
            </button>
            {hasKeywordTargetFilters(filters) ? (
              <Link
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold"
                href={`/dashboard/keywords?workspace=${activeWorkspace.id}`}
              >
                Reset filter
              </Link>
            ) : null}
          </div>
        </form>

        <ImportPanel workspaceId={activeWorkspace.id} />

        {!targets.length ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-700 p-10 text-center">
            <h2 className="text-lg font-semibold">
              {hasKeywordTargetFilters(filters)
                ? "Tidak ada target yang cocok"
                : "Belum ada target keyword"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {hasKeywordTargetFilters(filters)
                ? "Ubah atau reset filter untuk melihat target lain."
                : "Tambahkan target dari salah satu project workspace ini."}
            </p>
          </div>
        ) : (
          <BulkKeywordTargetList
            members={members.map((member) => ({
              userId: member.userId,
              displayName: member.displayName ?? member.userId.slice(0, 8),
            }))}
            targets={targets.map((target) => {
              const snapshot = latestStatusByTarget.get(target.id);
              return {
                id: target.id,
                projectName: projectById.get(target.project_id) ?? "Project",
                phrase: target.phrase,
                locale: `${target.country_code} · ${target.language_code} · ${target.device}${target.location ? ` · ${target.location}` : ""}`,
                targetPosition: target.target_position,
                priority: target.priority,
                statusLabel: snapshot
                  ? rankStatusLabel(snapshot.status as RankStatus)
                  : null,
                assigneeName: target.assignee_user_id
                  ? (memberById.get(target.assignee_user_id) ?? "Anggota")
                  : "Belum ditugaskan",
                maintainEnabled: target.maintain_enabled,
              };
            })}
            workspaceId={activeWorkspace.id}
          />
        )}
      </section>
    </main>
  );
}
