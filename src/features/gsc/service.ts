import "server-only";

import {
  listGscSites,
  queryGscSearchAnalytics,
  type GscDimensionFilter,
  type GscSearchAnalyticsRequest,
  type GscSearchAnalyticsRow,
} from "@/lib/integrations/google-oauth";

export type GscSearchType = "web" | "image" | "video" | "news";
export type GscSort = "clicks" | "impressions" | "ctr" | "position";

export type GscFilters = {
  startDate: string;
  endDate: string;
  searchType: GscSearchType;
  country?: string;
  device?: string;
};

export type GscMetricRow = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscQueryRow = GscMetricRow & { query: string; page: string };
export type GscPageRow = GscMetricRow & { page: string };

export async function getAuthorizedGscProperties(workspaceId: string) {
  return listGscSites(workspaceId);
}

function dimensionFilters(filters: GscFilters) {
  const result: GscDimensionFilter[] = [];
  if (filters.country) {
    result.push({
      dimension: "country",
      expression: filters.country.toLowerCase(),
      operator: "equals",
    });
  }
  if (filters.device) {
    result.push({
      dimension: "device",
      expression: filters.device.toUpperCase(),
      operator: "equals",
    });
  }
  return result;
}

function baseRequest(filters: GscFilters): GscSearchAnalyticsRequest {
  const requestFilters = dimensionFilters(filters);
  return {
    startDate: filters.startDate,
    endDate: filters.endDate,
    type: filters.searchType,
    dataState: "final",
    ...(requestFilters.length
      ? {
          dimensionFilterGroups: [
            { groupType: "and", filters: requestFilters },
          ],
        }
      : {}),
  };
}

export async function fetchGscOverview(
  workspaceId: string,
  propertyUri: string,
  filters: GscFilters,
) {
  const result = await queryGscSearchAnalytics(workspaceId, propertyUri, {
    ...baseRequest(filters),
    aggregationType: "byProperty",
  });
  const row = result.rows?.[0];
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: row?.ctr ?? 0,
    position: row?.position ?? 0,
  } satisfies GscMetricRow;
}

async function fetchAllRows(
  workspaceId: string,
  propertyUri: string,
  request: GscSearchAnalyticsRequest,
  ceiling = 100_000,
) {
  const rows: GscSearchAnalyticsRow[] = [];
  const rowLimit = 25_000;

  while (rows.length < ceiling) {
    const result = await queryGscSearchAnalytics(workspaceId, propertyUri, {
      ...request,
      rowLimit,
      startRow: rows.length,
    });
    const page = result.rows ?? [];
    rows.push(...page);
    if (page.length < rowLimit) break;
  }

  return rows.slice(0, ceiling);
}

function metricRow(row: GscSearchAnalyticsRow): GscMetricRow {
  return {
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  };
}

function sortRows<T extends GscMetricRow>(
  rows: T[],
  sort: GscSort,
  order: "asc" | "desc",
) {
  return rows.sort((left, right) =>
    order === "asc" ? left[sort] - right[sort] : right[sort] - left[sort],
  );
}

export async function fetchGscQueries(
  workspaceId: string,
  propertyUri: string,
  filters: GscFilters & {
    search?: string;
    sort: GscSort;
    order: "asc" | "desc";
    limit: number;
    offset: number;
  },
) {
  let rows: GscQueryRow[] = (
    await fetchAllRows(workspaceId, propertyUri, {
      ...baseRequest(filters),
      dimensions: ["query", "page"],
      aggregationType: "auto",
    })
  ).map((row) => ({
    query: row.keys?.[0] ?? "",
    page: row.keys?.[1] ?? "",
    ...metricRow(row),
  }));

  if (filters.search) {
    const search = filters.search.toLocaleLowerCase("id");
    rows = rows.filter((row) =>
      row.query.toLocaleLowerCase("id").includes(search),
    );
  }

  sortRows(rows, filters.sort, filters.order);
  return {
    rows: rows.slice(filters.offset, filters.offset + filters.limit),
    total: rows.length,
    incomplete: rows.length >= 100_000,
  };
}

export async function fetchGscPages(
  workspaceId: string,
  propertyUri: string,
  filters: GscFilters & {
    search?: string;
    sort: GscSort;
    order: "asc" | "desc";
    limit: number;
    offset: number;
  },
) {
  let rows: GscPageRow[] = (
    await fetchAllRows(workspaceId, propertyUri, {
      ...baseRequest(filters),
      dimensions: ["page"],
      aggregationType: "byPage",
    })
  ).map((row) => ({ page: row.keys?.[0] ?? "", ...metricRow(row) }));

  if (filters.search) {
    const search = filters.search.toLocaleLowerCase("id");
    rows = rows.filter((row) =>
      row.page.toLocaleLowerCase("id").includes(search),
    );
  }

  sortRows(rows, filters.sort, filters.order);
  return {
    rows: rows.slice(filters.offset, filters.offset + filters.limit),
    total: rows.length,
    incomplete: rows.length >= 100_000,
  };
}

export async function fetchGscSyncRows(
  workspaceId: string,
  propertyUri: string,
  startDate: string,
  endDate: string,
  searchType: GscSearchType,
) {
  return fetchAllRows(
    workspaceId,
    propertyUri,
    {
      startDate,
      endDate,
      type: searchType,
      dataState: "final",
      dimensions: ["date", "query", "page", "country", "device"],
      aggregationType: "auto",
    },
    250_000,
  );
}
