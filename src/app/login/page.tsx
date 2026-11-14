import { isSupabaseConfigured } from "@/lib/env";
import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 py-12 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <p className="text-sm font-semibold text-emerald-400">KeywordScope</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Masuk ke workspace
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Auth lokal memakai Supabase. Consent Google data tetap terpisah.
        </p>
        {isSupabaseConfigured ? (
          <AuthForm />
        ) : (
          <p className="mt-8 rounded-xl border border-amber-900 bg-amber-950/50 p-4 text-sm text-amber-200">
            Supabase belum dikonfigurasi. Jalankan Supabase lokal lalu isi{" "}
            <code>.env.local</code>.
          </p>
        )}
      </section>
    </main>
  );
}
