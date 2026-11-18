"use client";

import { useActionState } from "react";
import type { EvidenceActionState } from "@/app/dashboard/evidence-actions";

type Props = {
  action: (
    state: EvidenceActionState,
    formData: FormData,
  ) => Promise<EvidenceActionState>;
  checkinId: string;
};

const initialState: EvidenceActionState = {};

export function EvidenceUploadForm({ action, checkinId }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-4">
      <input name="checkinId" type="hidden" value={checkinId} />
      <label
        className="block text-sm font-medium"
        htmlFor={`evidence-${checkinId}`}
      >
        Upload evidence
      </label>
      <input
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="mt-2 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-slate-100"
        id={`evidence-${checkinId}`}
        name="evidence"
        required
        type="file"
      />
      <p className="mt-2 text-xs text-slate-500">
        Private · JPEG, PNG, WebP, atau PDF · maksimal 10 MiB
      </p>
      {state.error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Mengunggah…" : "Simpan evidence"}
      </button>
    </form>
  );
}
