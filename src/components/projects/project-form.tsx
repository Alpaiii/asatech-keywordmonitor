"use client";

import { useActionState } from "react";
import type { ProjectActionState } from "@/app/dashboard/actions";

type ProjectFormProps = {
  action: (
    state: ProjectActionState,
    formData: FormData,
  ) => Promise<ProjectActionState>;
  workspaceId?: string;
  project?: {
    id: string;
    name: string;
    site_url: string;
    default_country: string;
    default_language: string;
    timezone: string;
  };
  submitLabel: string;
};

const initialState: ProjectActionState = {};

export function ProjectForm({
  action,
  workspaceId,
  project,
  submitLabel,
}: ProjectFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-5 sm:grid-cols-2">
      {workspaceId ? (
        <input name="workspaceId" type="hidden" value={workspaceId} />
      ) : null}
      {project ? (
        <input name="projectId" type="hidden" value={project.id} />
      ) : null}
      <Field label="Nama project" name="name" wide>
        <input
          className="input"
          defaultValue={project?.name}
          id="name"
          maxLength={100}
          name="name"
          required
        />
      </Field>
      <Field label="URL website" name="siteUrl" wide>
        <input
          className="input"
          defaultValue={project?.site_url}
          id="siteUrl"
          name="siteUrl"
          placeholder="https://example.com"
          required
          type="url"
        />
      </Field>
      <Field label="Negara" name="defaultCountry">
        <select
          className="input"
          defaultValue={project?.default_country ?? "ID"}
          id="defaultCountry"
          name="defaultCountry"
        >
          <option value="ID">Indonesia (ID)</option>
          <option value="MY">Malaysia (MY)</option>
          <option value="SG">Singapura (SG)</option>
          <option value="US">Amerika Serikat (US)</option>
        </select>
      </Field>
      <Field label="Bahasa" name="defaultLanguage">
        <select
          className="input"
          defaultValue={project?.default_language ?? "id"}
          id="defaultLanguage"
          name="defaultLanguage"
        >
          <option value="id">Indonesia (id)</option>
          <option value="en">English (en)</option>
          <option value="ms">Melayu (ms)</option>
        </select>
      </Field>
      <Field label="Zona waktu" name="timezone" wide>
        <select
          className="input"
          defaultValue={project?.timezone ?? "Asia/Jakarta"}
          id="timezone"
          name="timezone"
        >
          <option value="Asia/Jakarta">Asia/Jakarta</option>
          <option value="Asia/Makassar">Asia/Makassar</option>
          <option value="Asia/Jayapura">Asia/Jayapura</option>
          <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur</option>
          <option value="Asia/Singapore">Asia/Singapore</option>
          <option value="UTC">UTC</option>
        </select>
      </Field>
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
