import Link from "next/link";
import { requireUser } from "@/lib/auth/authorization";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    workspace?: string;
    project?: string;
    connected?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .eq("user_id", user.id);
  if (error) throw error;
  const membership =
    memberships?.find((item) => item.workspace_id === params.workspace) ??
    memberships?.[0];
  if (!membership)
    return <main className="p-10">Workspace belum tersedia.</main>;

  const [{ data: properties }, { data: projects }] = await Promise.all([
    supabase
      .from("project_properties")
      .select("provider, disconnected_at")
      .eq("workspace_id", membership.workspace_id)
      .eq("provider", "gsc")
      .is("disconnected_at", null),
    supabase
      .from("projects")
      .select("id, name, gsc_property_uri")
      .eq("workspace_id", membership.workspace_id)
      .is("archived_at", null)
      .order("name"),
  ]);
  const gscConnected =
    Boolean(properties?.length) || params.connected === "gsc";

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-4xl">
        <Link
          className="text-sm font-bold underline"
          href={`/dashboard?workspace=${membership.workspace_id}`}
        >
          ← Workspace
        </Link>
        <h1 className="mt-6 text-3xl font-black">Integrasi Google</h1>
        <p className="mt-2">
          Token tetap server-side dan terenkripsi. Scope GSC read-only.
        </p>
        {params.connected ? (
          <p className="rounded-base mt-5 border-2 border-black bg-green-200 p-3 font-bold">
            Koneksi {params.connected.toUpperCase()} berhasil.
          </p>
        ) : null}
        {params.error ? (
          <p className="rounded-base mt-5 border-2 border-black bg-red-200 p-3 font-bold">
            OAuth gagal: {params.error}
          </p>
        ) : null}

        <section className="rounded-base shadow-shadow mt-8 border-2 border-black bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Google Search Console</h2>
              <p className="mt-1 text-sm">
                Status: {gscConnected ? "connected" : "belum terhubung"}
              </p>
            </div>
            {membership.role === "owner" ? (
              <Link
                className="rounded-base bg-main shadow-shadow border-2 border-black px-4 py-2 font-bold"
                href={`/api/v1/integrations/google/start?provider=gsc&workspaceId=${membership.workspace_id}`}
              >
                Hubungkan Google
              </Link>
            ) : (
              <p className="text-sm">Hanya owner dapat mengelola koneksi.</p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black">Project dan properti</h2>
          <div className="mt-4 grid gap-3">
            {(projects ?? []).map((project) => (
              <article
                className="rounded-base shadow-shadow border-2 border-black bg-white p-4"
                key={project.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black">{project.name}</h3>
                    <p className="text-sm">
                      {project.gsc_property_uri ?? "Properti belum dipilih"}
                    </p>
                  </div>
                  <Link
                    className="font-bold underline"
                    href={`/dashboard/projects/${project.id}/gsc`}
                  >
                    Buka GSC
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {gscConnected ? (
            <p className="mt-4 text-sm">
              Pemilihan properti tersedia lewat{" "}
              <code>
                GET
                /api/v1/integrations/google/properties?provider=gsc&amp;workspaceId=...
              </code>{" "}
              lalu <code>POST /api/v1/projects/:projectId/properties</code>.
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
