"use client";

import { useState } from "react";

type ImportType = "keyword-targets" | "rank-checkins";
type ImportResult = {
  id: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  succeeded_rows: number;
  failed_rows: number;
  rows: Array<{
    row_number: number;
    status: string;
    errors: string[];
    result: Record<string, string> | null;
  }>;
};

export function ImportPanel({ workspaceId }: { workspaceId: string }) {
  const [type, setType] = useState<ImportType>("keyword-targets");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const endpoint = `/api/v1/imports/${type}`;

  async function preview() {
    if (!file) return setError("Pilih file Excel.");
    setPending(true);
    setError(undefined);
    const form = new FormData();
    form.set("workspaceId", workspaceId);
    form.set("file", file);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: form,
    });
    const body = await response.json();
    setPending(false);
    if (!response.ok) return setError(body.error?.message ?? "Preview gagal.");
    setResult(body.data);
  }

  async function commit() {
    if (!result) return;
    setPending(true);
    setError(undefined);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ importId: result.id }),
    });
    const body = await response.json();
    setPending(false);
    if (!response.ok) return setError(body.error?.message ?? "Import gagal.");
    setResult(body.data);
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-xl font-semibold">Import data Excel</h2>
      <p className="mt-2 text-sm text-slate-400">
        Preview wajib sebelum commit. Hasil dan error disimpan per baris.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">
          Jenis import
          <select
            className="input mt-2"
            onChange={(event) => {
              setType(event.target.value as ImportType);
              setResult(null);
            }}
            value={type}
          >
            <option value="keyword-targets">Target keyword</option>
            <option value="rank-checkins">Check-in ranking manual</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          File Excel
          <input
            accept=".xlsx"
            className="mt-2 block w-full"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950"
          disabled={pending}
          onClick={preview}
          type="button"
        >
          {pending ? "Memproses…" : "Preview import"}
        </button>
        <a
          className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold"
          download
          href={`/api/v1/imports/${type}/template`}
        >
          Unduh template {type === "keyword-targets" ? "target" : "ranking"}
        </a>
        {result?.status === "previewed" && result.valid_rows > 0 ? (
          <button
            className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950"
            disabled={pending}
            onClick={commit}
            type="button"
          >
            Commit {result.valid_rows} baris valid
          </button>
        ) : null}
      </div>
      {error ? (
        <p
          className="mt-4 rounded-xl border border-red-900 bg-red-950/60 p-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="mt-6" data-testid="import-result">
          <p className="font-semibold">
            Status: {result.status} · Total {result.total_rows} · Valid{" "}
            {result.valid_rows} · Invalid {result.invalid_rows} · Berhasil{" "}
            {result.succeeded_rows} · Gagal {result.failed_rows}
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-3">Baris</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Hasil/error</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr
                    className="border-t border-slate-800"
                    key={row.row_number}
                  >
                    <td className="p-3">{row.row_number}</td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3">
                      {row.errors.join("; ") ||
                        Object.values(row.result ?? {}).join(", ") ||
                        "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
