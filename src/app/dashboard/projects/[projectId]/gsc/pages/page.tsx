import Link from "next/link";
import { requireProjectAccess } from "@/lib/auth/authorization";

export default async function GscPagesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, supabase } = await requireProjectAccess(projectId);
  const { data: rows, error } = await supabase
    .from("gsc_page_daily")
    .select("page, clicks, impressions, ctr, position, date")
    .eq("project_id", projectId)
    .order("date", { ascending: false })
    .order("clicks", { ascending: false })
    .limit(100);
  if (error) throw error;

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <Link
          className="text-sm font-bold underline"
          href={`/dashboard/projects/${projectId}/gsc`}
        >
          ← GSC overview
        </Link>
        <h1 className="mt-6 text-3xl font-black">Pages · {project.name}</h1>
        <p className="mt-2 text-sm">
          Sumber: Google Search Console · Posisi = GSC average position, bukan
          live SERP rank. Maksimal 100 baris terbaru.
        </p>
        <nav className="mt-5 flex gap-2">
          <Link
            className="rounded-base shadow-shadow border-2 border-black bg-white px-4 py-2 font-bold"
            href={`/dashboard/projects/${projectId}/gsc/queries`}
          >
            Queries
          </Link>
          <Link
            className="rounded-base bg-main shadow-shadow border-2 border-black px-4 py-2 font-bold"
            href={`/dashboard/projects/${projectId}/gsc/pages`}
          >
            Pages
          </Link>
        </nav>
        <div className="rounded-base shadow-shadow mt-6 overflow-x-auto border-2 border-black bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-blue-200">
              <tr>
                <th className="p-3">Page</th>
                <th className="p-3">Klik</th>
                <th className="p-3">Impresi</th>
                <th className="p-3">CTR</th>
                <th className="p-3">GSC avg position</th>
                <th className="p-3">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row) => (
                <tr
                  className="border-t-2 border-black"
                  key={`${row.date}-${row.page}`}
                >
                  <td
                    className="max-w-lg truncate p-3 font-bold"
                    title={row.page}
                  >
                    {row.page}
                  </td>
                  <td className="p-3">{row.clicks}</td>
                  <td className="p-3">{row.impressions}</td>
                  <td className="p-3">{(Number(row.ctr) * 100).toFixed(2)}%</td>
                  <td className="p-3">{Number(row.position).toFixed(2)}</td>
                  <td className="p-3">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows?.length ? (
            <p className="p-6">Data halaman belum tersedia.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
