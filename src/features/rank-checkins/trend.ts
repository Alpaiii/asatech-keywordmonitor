export type RankTrendInput = {
  id: string;
  source: string;
  position: number | null;
  not_found_top_100: boolean;
  checked_at: string;
  created_at: string;
};

export type RankTrendPoint = {
  id: string;
  source: string;
  position: number | null;
  notFoundTop100: boolean;
  checkedAt: string;
};

export type RankTrendSeries = {
  source: string;
  label: string;
  points: RankTrendPoint[];
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  serp_provider: "SERP provider",
  gsc_average_position: "GSC average position",
};

export function rankSourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source;
}

export function buildRankTrendSeries(inputs: RankTrendInput[]) {
  const ordered = [...inputs].sort(
    (left, right) =>
      Date.parse(left.checked_at) - Date.parse(right.checked_at) ||
      Date.parse(left.created_at) - Date.parse(right.created_at) ||
      left.id.localeCompare(right.id),
  );
  const bySource = new Map<string, RankTrendPoint[]>();

  for (const input of ordered) {
    const points = bySource.get(input.source) ?? [];
    points.push({
      id: input.id,
      source: input.source,
      position: input.not_found_top_100 ? null : input.position,
      notFoundTop100: input.not_found_top_100,
      checkedAt: input.checked_at,
    });
    bySource.set(input.source, points);
  }

  return [...bySource.entries()].map(([source, points]) => ({
    source,
    label: rankSourceLabel(source),
    points,
  }));
}

export function splitNumericSegments(points: RankTrendPoint[]) {
  const segments: RankTrendPoint[][] = [];
  let current: RankTrendPoint[] = [];

  for (const point of points) {
    if (point.position === null) {
      if (current.length) segments.push(current);
      current = [];
      continue;
    }
    current.push(point);
  }

  if (current.length) segments.push(current);
  return segments;
}
