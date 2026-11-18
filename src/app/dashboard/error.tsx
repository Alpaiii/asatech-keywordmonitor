"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
      <section className="max-w-lg rounded-2xl border border-red-950 bg-red-950/20 p-8 text-center">
        <h1 className="text-2xl font-semibold">Dashboard gagal dimuat</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Periksa koneksi Supabase lokal, lalu coba lagi. Detail privat tidak
          ditampilkan.
        </p>
        <button
          className="mt-6 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950"
          onClick={reset}
        >
          Coba lagi
        </button>
      </section>
    </main>
  );
}
