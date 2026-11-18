import Link from "next/link";
import { PerformanceChart } from "@/components/gsc/performance-chart";
import { requireProjectAccess } from "@/lib/auth/authorization";

function dateRange() {
  const end = new Date(Date.now() - 3 * 86_400_000);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export default async function GscOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, supabase } = await requireProjectAccess(projectId);
  const range = dateRange();
  const [
    { data: property },
    { data: metrics },
    { data: queries },
    { data: pages },
    { data: latestJob },
  ] = await Promise.all([
    supabase
      .from("project_properties")
      .select("property_uri, connected_at")
      .eq("project_id", projectId)
      .eq("provider", "gsc")
      .is("disconnected_at", null)
      .maybeSingle(),
    supabase
      .from("gsc_daily_property_metrics")
      .select("date, clicks, impressions, ctr, position")
      .eq("project_id", projectId)
      .gte("date", range.start)
      .lte("date", range.end)
      .eq("search_type", "web")
      .eq("country", "")
      .eq("device", "")
      .order("date"),
    supabase
      .from("gsc_query_daily")
      .select("query, clicks, impressions, position")
      .eq("project_id", projectId)
      .gte("date", range.start)
      .lte("date", range.end)
      .order("clicks", { ascending: false })
      .limit(5),
    supabase
      .from("gsc_page_daily")
      .select("page, clicks, impressions, position")
      .eq("project_id", projectId)
      .gte("date", range.start)
      .lte("date", range.end)
      .order("clicks", { ascending: false })
      .limit(5),
    supabase
      .from("sync_jobs")
      .select("status, last_error, finished_at")
      .eq("project_id", projectId)
      .eq("provider", "gsc")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const totals = (metrics ?? []).reduce(
    (result, row) => ({
      clicks: result.clicks + Number(row.clicks),
      impressions: result.impressions + Number(row.impressions),
      weightedPosition:
        result.weightedPosition +
        Number(row.position) * Number(row.impressions),
    }),
    { clicks: 0, impressions: 0, weightedPosition: 0 },
  );
  const ctr = totals.impressions ? totals.clicks / totals.impressions : 0;
  const position = totals.impressions
    ? totals.weightedPosition / totals.impressions
    : 0;

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <Link
          className="text-sm font-bold underline"
          href={`/dashboard/projects/${projectId}`}
        >
          ← Detail project
        </Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-blue-700">
              Google Search Console
            </p>
            <h1 className="text-3xl font-black">{project.name} performance</h1>
            <p className="mt-2 text-sm">
              {range.start} sampai {range.end} · Data historis, bukan real-time.
            </p>
          </div>
          <nav className="flex gap-2" aria-label="Navigasi GSC">
            <Link
              className="rounded-base bg-main shadow-shadow border-2 border-black px-4 py-2 font-bold"
              href={`/dashboard/projects/${projectId}/gsc`}
            >
              Overview
            </Link>
            <Link
              className="rounded-base shadow-shadow border-2 border-black bg-white px-4 py-2 font-bold"
              href={`/dashboard/projects/${projectId}/gsc/queries`}
            >
              Queries
            </Link>
            <Link
              className="rounded-base shadow-shadow border-2 border-black bg-white px-4 py-2 font-bold"
              href={`/dashboard/projects/${projectId}/gsc/pages`}
            >
              Pages
            </Link>
          </nav>
        </div>

        {!property ? (
          <section className="rounded-base shadow-shadow mt-8 border-2 border-black bg-amber-200 p-6">
            <h2 className="text-xl font-black">Properti GSC belum terhubung</h2>
            <p className="mt-2">
              Owner perlu menghubungkan akun Google dan memilih properti.
            </p>
            <Link
              className="mt-4 inline-block font-bold underline"
              href={`/dashboard/integrations?workspace=${project.workspace_id}&project=${projectId}`}
            >
              Buka integrasi
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Klik", formatNumber(totals.clicks)],
                ["Impresi", formatNumber(totals.impressions)],
                ["CTR", `${(ctr * 100).toFixed(2)}%`],
                ["GSC average position", position ? position.toFixed(2) : "—"],
              ].map(([label, value]) => (
                <article
                  className="rounded-base shadow-shadow border-2 border-black bg-white p-5"
                  key={label}
                >
                  <p className="text-sm font-bold">{label}</p>
                  <p className="mt-2 text-3xl font-black">{value}</p>
                </article>
              ))}
            </section>
            <p className="rounded-base mt-5 border-2 border-black bg-blue-100 p-3 text-sm">
              Sumber: Google Search Console · Freshness:{" "}
              {latestJob?.finished_at ?? property.connected_at} · Status sync:{" "}
              {latestJob?.status ?? "belum berjalan"}
              {latestJob?.last_error ? ` · Error: ${latestJob.last_error}` : ""}
            </p>
            <div className="mt-6">
              <PerformanceChart
                points={(metrics ?? []).map((row) => ({
                  date: row.date,
                  clicks: Number(row.clicks),
                  impressions: Number(row.impressions),
                }))}
              />
            </div>
            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <GscList
                title="Top queries"
                rows={(queries ?? []).map((row) => ({
                  label: row.query,
                  ...row,
                }))}
              />
              <GscList
                title="Top pages"
                rows={(pages ?? []).map((row) => ({ label: row.page, ...row }))}
              />
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function GscList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    label: string;
    clicks: number;
    impressions: number;
    position: number;
  }>;
}) {
  return (
    <section className="rounded-base shadow-shadow border-2 border-black bg-white p-5">
      <h2 className="text-xl font-black">{title}</h2>
      {!rows.length ? (
        <p className="mt-4 text-sm">Data belum tersedia.</p>
      ) : (
        <ul className="mt-4 divide-y-2 divide-black">
          {rows.map((row) => (
            <li
              className="grid grid-cols-[1fr_auto] gap-4 py-3"
              key={row.label}
            >
              <span className="truncate font-bold" title={row.label}>
                {row.label}
              </span>
              <span className="text-sm">
                {row.clicks} klik · pos {Number(row.position).toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
