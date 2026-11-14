const services = [
  {
    name: "Database lokal",
    status: "Menunggu Docker dan Supabase CLI",
    tone: "warning",
  },
  {
    name: "Google Search Console",
    status: "Belum terhubung",
    tone: "neutral",
  },
  {
    name: "Provider keyword",
    status: "not_configured",
    tone: "neutral",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 font-bold text-slate-950">
              K
            </span>
            <span className="text-lg font-semibold tracking-tight">
              KeywordScope
            </span>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
            Local foundation
          </span>
        </div>

        <section className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-emerald-400 uppercase">
              SEO research & monitoring
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Fondasi lokal sedang disiapkan.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
              Build production Next.js aktif lebih dulu. Database, autentikasi,
              dan isolasi workspace menyusul setelah runtime Supabase lokal
              tersedia.
            </p>
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
            <h2 className="mb-5 text-sm font-semibold text-slate-200">
              Status layanan
            </h2>
            <ul className="space-y-4">
              {services.map((service) => (
                <li
                  className="flex items-start justify-between gap-6"
                  key={service.name}
                >
                  <span className="text-sm text-slate-400">{service.name}</span>
                  <span
                    className={
                      service.tone === "warning"
                        ? "text-right text-sm font-medium text-amber-300"
                        : "text-right font-mono text-xs text-slate-300"
                    }
                  >
                    {service.status}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            [
              "01",
              "Auth lokal",
              "Login dan session melalui Supabase Auth lokal.",
            ],
            [
              "02",
              "Workspace aman",
              "Membership dan RLS mencegah akses lintas-tenant.",
            ],
            [
              "03",
              "Data jujur",
              "Tidak ada KPI atau metrik SEO yang difabrikasi.",
            ],
          ].map(([number, title, description]) => (
            <article
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
              key={number}
            >
              <span className="font-mono text-xs text-emerald-400">
                {number}
              </span>
              <h2 className="mt-5 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {description}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
