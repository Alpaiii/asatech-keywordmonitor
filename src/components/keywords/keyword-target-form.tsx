"use client";

import { useActionState } from "react";
import type { KeywordTargetActionState } from "@/app/dashboard/keyword-actions";

type Member = {
  userId: string;
  displayName: string | null;
};

type Target = {
  id: string;
  phrase: string;
  country_code: string;
  language_code: string;
  device: "desktop" | "mobile" | "tablet";
  location: string;
  target_position: number;
  priority: "low" | "medium" | "high" | "critical";
  deadline: string | null;
  maintain_enabled: boolean;
  maintain_position_limit: number | null;
  check_frequency_days: number;
  assignee_user_id: string | null;
};

type Props = {
  action: (
    state: KeywordTargetActionState,
    formData: FormData,
  ) => Promise<KeywordTargetActionState>;
  members: Member[];
  projectId?: string;
  submitLabel: string;
  target?: Target;
};

const initialState: KeywordTargetActionState = {};

export function KeywordTargetForm({
  action,
  members,
  projectId,
  submitLabel,
  target,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-5 sm:grid-cols-2">
      {projectId ? (
        <input name="projectId" type="hidden" value={projectId} />
      ) : null}
      {target ? (
        <input name="targetId" type="hidden" value={target.id} />
      ) : null}

      <Field label="Keyword" name="phrase" wide>
        <input
          className="input"
          defaultValue={target?.phrase}
          id="phrase"
          maxLength={500}
          name="phrase"
          required
        />
      </Field>
      <Field label="Negara" name="countryCode">
        <select
          className="input"
          defaultValue={target?.country_code ?? "ID"}
          id="countryCode"
          name="countryCode"
        >
          <option value="ID">Indonesia (ID)</option>
          <option value="MY">Malaysia (MY)</option>
          <option value="SG">Singapura (SG)</option>
          <option value="US">Amerika Serikat (US)</option>
        </select>
      </Field>
      <Field label="Bahasa" name="languageCode">
        <select
          className="input"
          defaultValue={target?.language_code ?? "id"}
          id="languageCode"
          name="languageCode"
        >
          <option value="id">Indonesia (id)</option>
          <option value="en">English (en)</option>
          <option value="ms">Melayu (ms)</option>
        </select>
      </Field>
      <Field label="Device" name="device">
        <select
          className="input"
          defaultValue={target?.device ?? "desktop"}
          id="device"
          name="device"
        >
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </select>
      </Field>
      <Field label="Lokasi" name="location">
        <input
          className="input"
          defaultValue={target?.location}
          id="location"
          maxLength={200}
          name="location"
          placeholder="Opsional, contoh: Jakarta"
        />
      </Field>
      <Field label="Target posisi" name="targetPosition">
        <input
          className="input"
          defaultValue={target?.target_position ?? 10}
          id="targetPosition"
          max={100}
          min={1}
          name="targetPosition"
          required
          type="number"
        />
      </Field>
      <Field label="Prioritas" name="priority">
        <select
          className="input"
          defaultValue={target?.priority ?? "medium"}
          id="priority"
          name="priority"
        >
          <option value="low">Rendah</option>
          <option value="medium">Sedang</option>
          <option value="high">Tinggi</option>
          <option value="critical">Kritis</option>
        </select>
      </Field>
      <Field label="Deadline" name="deadline">
        <input
          className="input"
          defaultValue={target?.deadline ?? ""}
          id="deadline"
          name="deadline"
          type="date"
        />
      </Field>
      <Field label="Frekuensi check-in (hari)" name="checkFrequencyDays">
        <input
          className="input"
          defaultValue={target?.check_frequency_days ?? 14}
          id="checkFrequencyDays"
          max={365}
          min={1}
          name="checkFrequencyDays"
          required
          type="number"
        />
      </Field>
      <Field label="PIC" name="assigneeUserId" wide>
        <select
          className="input"
          defaultValue={target?.assignee_user_id ?? ""}
          id="assigneeUserId"
          name="assigneeUserId"
        >
          <option value="">Belum ditugaskan</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName ?? member.userId}
            </option>
          ))}
        </select>
      </Field>
      <div className="rounded-xl border border-slate-700 p-4 sm:col-span-2">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            defaultChecked={target?.maintain_enabled}
            name="maintainEnabled"
            type="checkbox"
          />
          Aktifkan mode maintain
        </label>
        <label className="mt-4 block text-sm" htmlFor="maintainPositionLimit">
          Batas posisi maintain
        </label>
        <input
          className="input mt-2"
          defaultValue={target?.maintain_position_limit ?? ""}
          id="maintainPositionLimit"
          max={100}
          min={1}
          name="maintainPositionLimit"
          placeholder="Wajib bila maintain aktif"
          type="number"
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
          {pending ? "Menyimpan…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  children,
  label,
  name,
  wide = false,
}: {
  children: React.ReactNode;
  label: string;
  name: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label className="mb-2 block text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      {children}
    </div>
  );
}
