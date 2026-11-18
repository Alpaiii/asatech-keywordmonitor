"use client";

import { useActionState } from "react";
import type { RankCheckinActionState } from "@/app/dashboard/keyword-actions";

type Props = {
  action: (
    state: RankCheckinActionState,
    formData: FormData,
  ) => Promise<RankCheckinActionState>;
  targetId: string;
};

const initialState: RankCheckinActionState = {};

function localDateTimeValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function RankCheckinForm({ action, targetId }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-5 sm:grid-cols-2">
      <input name="targetId" type="hidden" value={targetId} />
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="position">
          Posisi manual
        </label>
        <input
          className="input"
          id="position"
          max={100}
          min={1}
          name="position"
          placeholder="1–100"
          type="number"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="checkedAt">
          Waktu observasi
        </label>
        <input
          className="input"
          defaultValue={localDateTimeValue()}
          id="checkedAt"
          name="checkedAt"
          required
          type="datetime-local"
        />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-slate-700 p-4 text-sm font-medium sm:col-span-2">
        <input name="notFoundTop100" type="checkbox" />
        Tidak ditemukan di top 100
      </label>
      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium" htmlFor="notes">
          Catatan
        </label>
        <textarea
          className="input min-h-24"
          id="notes"
          maxLength={2000}
          name="notes"
          placeholder="Opsional. Catat lokasi, kondisi browser, atau konteks observasi."
        />
      </div>
      {state.error ? (
        <p
          className="rounded-xl border border-red-900 bg-red-950/60 p-3 text-sm text-red-200 sm:col-span-2"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button
          className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Menyimpan…" : "Simpan check-in"}
        </button>
      </div>
    </form>
  );
}
