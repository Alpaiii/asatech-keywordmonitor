import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
      <section className="max-w-lg text-center">
        <p className="text-sm font-semibold text-emerald-400">404</p>
        <h1 className="mt-3 text-3xl font-semibold">
          Resource tidak ditemukan
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Resource tidak ada atau akun Anda tidak memiliki akses ke workspace
          tersebut.
        </p>
        <Link
          className="mt-6 inline-block rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"
          href="/dashboard"
        >
          Kembali ke dashboard
        </Link>
      </section>
    </main>
  );
}
