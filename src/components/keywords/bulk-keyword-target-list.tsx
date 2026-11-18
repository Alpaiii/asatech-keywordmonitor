"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  bulkUpdateKeywordTargets,
  type BulkKeywordTargetActionState,
} from "@/app/dashboard/keyword-actions";

type Member = {
  userId: string;
  displayName: string;
};

type Target = {
  id: string;
  projectName: string;
  phrase: string;
  locale: string;
  targetPosition: number;
  priority: string;
  statusLabel: string | null;
  assigneeName: string;
  maintainEnabled: boolean;
};

const initialState: BulkKeywordTargetActionState = {};

export function BulkKeywordTargetList({
  members,
  targets,
  workspaceId,
}: {
  members: Member[];
  targets: Target[];
  workspaceId: string;
}) {
  const [state, formAction, pending] = useActionState(
    bulkUpdateKeywordTargets,
    initialState,
  );
  const [operation, setOperation] = useState("priority");
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = targets.length > 0 && selected.length === targets.length;

  return (
    <form action={formAction} className="mt-8">
      <input name="workspaceId" type="hidden" value={workspaceId} />
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-medium">
            Operasi bulk
            <select
              className="input mt-2"
              name="operation"
              onChange={(event) => setOperation(event.target.value)}
              value={operation}
            >
              <option value="priority">Ubah prioritas</option>
              <option value="assignee">Ubah PIC</option>
              <option value="evaluate">Evaluasi status</option>
            </select>
          </label>
          {operation === "priority" ? (
            <label className="text-sm font-medium">
              Prioritas baru
              <select
                className="input mt-2"
                name="priority"
                defaultValue="medium"
              >
                <option value="low">Rendah</option>
                <option value="medium">Sedang</option>
                <option value="high">Tinggi</option>
                <option value="critical">Kritis</option>
              </select>
            </label>
          ) : null}
          {operation === "assignee" ? (
            <label className="text-sm font-medium">
              PIC baru
              <select
                className="input mt-2"
                name="assigneeUserId"
                defaultValue="unassigned"
              >
                <option value="unassigned">Belum ditugaskan</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
            disabled={pending || selected.length === 0}
            type="submit"
          >
            {pending ? "Memproses…" : `Terapkan ke ${selected.length} target`}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Maksimal 100 target. Bulk delete tidak tersedia agar riwayat tidak
          terhapus.
        </p>
        {state.error ? (
          <p
            className="mt-4 rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-200"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}
        {state.updated ? (
          <p
            className="mt-4 rounded-xl border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200"
            role="status"
          >
            {state.updated} target berhasil diproses.
            {state.statusFailures
              ? ` ${state.statusFailures} evaluasi status gagal.`
              : ""}
          </p>
        ) : null}
      </div>

      <label className="mt-5 flex w-fit items-center gap-3 text-sm font-medium">
        <input
          checked={allSelected}
          onChange={(event) =>
            setSelected(
              event.target.checked ? targets.map((target) => target.id) : [],
            )
          }
          type="checkbox"
        />
        Pilih semua hasil ({targets.length})
      </label>

      <div className="mt-4 grid gap-4" data-testid="filtered-targets">
        {targets.map((target) => (
          <article
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            key={target.id}
          >
            <div className="flex items-start gap-4">
              <input
                aria-label={`Pilih ${target.phrase}`}
                checked={selected.includes(target.id)}
                name="targetId"
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, target.id]
                      : current.filter((id) => id !== target.id),
                  )
                }
                type="checkbox"
                value={target.id}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      {target.projectName}
                    </p>
                    <h2 className="mt-1 font-semibold">
                      <Link
                        className="hover:text-emerald-300"
                        href={`/dashboard/keywords/${target.id}`}
                      >
                        {target.phrase}
                      </Link>
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {target.locale}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-800 px-3 py-1 uppercase">
                      {target.priority}
                    </span>
                    {target.statusLabel ? (
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">
                        {target.statusLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-300">
                  Target ≤ {target.targetPosition} · PIC: {target.assigneeName}{" "}
                  · Maintain: {target.maintainEnabled ? "Aktif" : "Nonaktif"}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </form>
  );
}
