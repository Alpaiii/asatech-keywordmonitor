import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchGscOverview,
  fetchGscSyncRows,
  type GscSearchType,
} from "@/features/gsc/service";

const MAX_ATTEMPTS = 3;
const CHUNK_SIZE = 500;

type SyncJob = {
  id: string;
  workspace_id: string;
  project_id: string;
  status:
    "pending" | "running" | "completed" | "completed_with_errors" | "failed";
  attempt_count: number;
  max_attempts: number;
  date_range_start: string;
  date_range_end: string;
  search_type: GscSearchType;
  next_attempt_at: string | null;
};

function chunks<T>(rows: T[]) {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    result.push(rows.slice(index, index + CHUNK_SIZE));
  }
  return result;
}

async function setJob(jobId: string, values: Record<string, unknown>) {
  const { error } = await createAdminClient()
    .from("sync_jobs")
    .update(values)
    .eq("id", jobId);
  if (error) throw error;
}

export async function createGscSyncJob(input: {
  workspaceId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  searchType?: GscSearchType;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sync_jobs")
    .upsert(
      {
        workspace_id: input.workspaceId,
        project_id: input.projectId,
        provider: "gsc",
        status: "pending",
        search_type: input.searchType ?? "web",
        date_range_start: input.startDate,
        date_range_end: input.endDate,
        max_attempts: MAX_ATTEMPTS,
        next_attempt_at: new Date().toISOString(),
      },
      {
        onConflict:
          "project_id,provider,search_type,date_range_start,date_range_end",
        ignoreDuplicates: true,
      },
    )
    .select("id")
    .maybeSingle();
  if (error) throw error;

  if (data) return data.id as string;

  const { data: existing, error: existingError } = await admin
    .from("sync_jobs")
    .select("id")
    .eq("project_id", input.projectId)
    .eq("provider", "gsc")
    .eq("search_type", input.searchType ?? "web")
    .eq("date_range_start", input.startDate)
    .eq("date_range_end", input.endDate)
    .single();
  if (existingError) throw existingError;
  return existing.id as string;
}

export async function runGscSyncJob(jobId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sync_jobs")
    .select(
      "id, workspace_id, project_id, status, attempt_count, max_attempts, date_range_start, date_range_end, search_type, next_attempt_at",
    )
    .eq("id", jobId)
    .single();
  if (error) throw error;
  const job = data as SyncJob;

  if (job.status === "completed") return;
  if (job.attempt_count >= job.max_attempts) {
    await setJob(job.id, {
      status: "failed",
      finished_at: new Date().toISOString(),
    });
    return;
  }

  const claimed = await admin
    .from("sync_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      attempt_count: job.attempt_count + 1,
      next_attempt_at: null,
    })
    .eq("id", job.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (claimed.error) throw claimed.error;
  if (!claimed.data) return;

  try {
    const { data: property, error: propertyError } = await admin
      .from("project_properties")
      .select("property_uri")
      .eq("project_id", job.project_id)
      .eq("provider", "gsc")
      .is("disconnected_at", null)
      .single();
    if (propertyError) throw propertyError;

    const rows = await fetchGscSyncRows(
      job.workspace_id,
      property.property_uri,
      job.date_range_start,
      job.date_range_end,
      job.search_type,
    );

    const queryRows = rows.flatMap((row) => {
      const [date, query, page, country = "", device = ""] = row.keys ?? [];
      if (!date || !query || !page) return [];
      const impressions = row.impressions ?? 0;
      return [
        {
          project_id: job.project_id,
          date,
          query,
          page,
          country,
          device: device.toLowerCase(),
          search_type: job.search_type,
          clicks: row.clicks ?? 0,
          impressions,
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
        },
      ];
    });

    const pageRows = new Map<
      string,
      {
        project_id: string;
        date: string;
        page: string;
        country: string;
        device: string;
        search_type: GscSearchType;
        clicks: number;
        impressions: number;
        weightedPosition: number;
      }
    >();
    for (const row of queryRows) {
      const key = [
        row.date,
        row.page,
        row.country,
        row.device,
        row.search_type,
      ].join("\u0000");
      const aggregate = pageRows.get(key) ?? {
        project_id: row.project_id,
        date: row.date,
        page: row.page,
        country: row.country,
        device: row.device,
        search_type: row.search_type,
        clicks: 0,
        impressions: 0,
        weightedPosition: 0,
      };
      aggregate.clicks += row.clicks;
      aggregate.impressions += row.impressions;
      aggregate.weightedPosition += row.position * row.impressions;
      pageRows.set(key, aggregate);
    }

    for (const batch of chunks(queryRows)) {
      const { error: upsertError } = await admin
        .from("gsc_query_daily")
        .upsert(batch, {
          onConflict: "project_id,date,query,page,country,device,search_type",
        });
      if (upsertError) throw upsertError;
    }

    const normalizedPages = [...pageRows.values()].map(
      ({ weightedPosition, ...row }) => ({
        ...row,
        ctr: row.impressions ? row.clicks / row.impressions : 0,
        position: row.impressions ? weightedPosition / row.impressions : 0,
      }),
    );
    for (const batch of chunks(normalizedPages)) {
      const { error: upsertError } = await admin
        .from("gsc_page_daily")
        .upsert(batch, {
          onConflict: "project_id,date,page,country,device,search_type",
        });
      if (upsertError) throw upsertError;
    }

    const dates = Array.from(
      {
        length:
          Math.floor(
            (Date.parse(job.date_range_end) -
              Date.parse(job.date_range_start)) /
              86_400_000,
          ) + 1,
      },
      (_, index) =>
        new Date(Date.parse(job.date_range_start) + index * 86_400_000)
          .toISOString()
          .slice(0, 10),
    );
    const normalizedProperty = [];
    for (const date of dates) {
      const overview = await fetchGscOverview(
        job.workspace_id,
        property.property_uri,
        { startDate: date, endDate: date, searchType: job.search_type },
      );
      normalizedProperty.push({
        project_id: job.project_id,
        date,
        search_type: job.search_type,
        country: "",
        device: "",
        ...overview,
      });
    }
    const { error: metricError } = await admin
      .from("gsc_daily_property_metrics")
      .upsert(normalizedProperty, {
        onConflict: "project_id,date,search_type,country,device",
      });
    if (metricError) throw metricError;

    await matchTargetKeywords(job.workspace_id, job.project_id);
    await setJob(job.id, {
      status: "completed",
      rows_processed: rows.length,
      rows_inserted:
        queryRows.length + normalizedPages.length + normalizedProperty.length,
      rows_updated: 0,
      last_error: null,
      finished_at: new Date().toISOString(),
    });
  } catch (error) {
    const attemptCount = job.attempt_count + 1;
    const retryable =
      error instanceof Error && /Google API (429|5\d\d)/.test(error.message);
    await setJob(job.id, {
      status:
        retryable && attemptCount < job.max_attempts ? "pending" : "failed",
      last_error:
        error instanceof Error ? error.message : "Sinkronisasi gagal.",
      next_attempt_at:
        retryable && attemptCount < job.max_attempts
          ? new Date(Date.now() + 2 ** attemptCount * 60_000).toISOString()
          : null,
      finished_at:
        retryable && attemptCount < job.max_attempts
          ? null
          : new Date().toISOString(),
    });
    throw error;
  }
}

export async function matchTargetKeywords(
  workspaceId: string,
  projectId: string,
) {
  const admin = createAdminClient();
  const [
    { data: targets, error: targetError },
    { data: queries, error: queryError },
  ] = await Promise.all([
    admin
      .from("keyword_targets")
      .select("id, canonical_phrase, country_code, device")
      .eq("project_id", projectId),
    admin
      .from("gsc_query_daily")
      .select(
        "query, date, search_type, country, device, clicks, impressions, ctr, position",
      )
      .eq("project_id", projectId),
  ]);
  if (targetError) throw targetError;
  if (queryError) throw queryError;

  const byPhrase = new Map(
    (targets ?? []).map((target) => [target.canonical_phrase, target]),
  );
  const snapshots = (queries ?? []).flatMap((row) => {
    const canonical = row.query
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("id");
    const target = byPhrase.get(canonical);
    if (!target) return [];
    return [
      {
        workspace_id: workspaceId,
        project_id: projectId,
        keyword_target_id: target.id,
        query: row.query,
        date: row.date,
        search_type: row.search_type,
        country: row.country,
        device: row.device,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
    ];
  });

  for (const batch of chunks(snapshots)) {
    const { error } = await admin
      .from("gsc_target_keyword_snapshots")
      .upsert(batch, {
        onConflict: "keyword_target_id,query,date,search_type,country,device",
      });
    if (error) throw error;
  }
  return snapshots.length;
}
