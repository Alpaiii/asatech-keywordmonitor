import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { isSupabaseConfigured } from "@/lib/env";

export const instant = false;

export default async function DashboardPage() {
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-8">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              KeywordScope
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Dashboard lokal</h1>
          </div>
          <form action={logout}>
            <button className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium">
              Keluar
            </button>
          </form>
        </header>
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="font-semibold">Session aktif</h2>
          <p className="mt-2 text-sm text-slate-400">{data.user.email}</p>
          <p className="mt-6 text-sm text-slate-400">
            GSC belum terhubung. Keyword provider: <code>not_configured</code>.
          </p>
        </section>
      </div>
    </main>
  );
}
