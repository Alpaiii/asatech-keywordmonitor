import { describe, expect, it } from "vitest";
import {
  buildRankTrendSeries,
  rankSourceLabel,
  splitNumericSegments,
  type RankTrendInput,
} from "./trend";

const input = (
  overrides: Partial<RankTrendInput> & Pick<RankTrendInput, "id">,
): RankTrendInput => ({
  source: "manual",
  position: 8,
  not_found_top_100: false,
  checked_at: "2026-11-16T12:00:00.000Z",
  created_at: "2026-11-16T12:00:00.000Z",
  ...overrides,
});

describe("buildRankTrendSeries", () => {
  it("mengurutkan titik terlama ke terbaru secara deterministik", () => {
    const [series] = buildRankTrendSeries([
      input({ id: "c", checked_at: "2026-11-18T12:00:00.000Z" }),
      input({ id: "a", checked_at: "2026-11-16T12:00:00.000Z" }),
      input({ id: "b", checked_at: "2026-11-17T12:00:00.000Z" }),
    ]);

    expect(series?.points.map((point) => point.id)).toEqual(["a", "b", "c"]);
  });

  it("memisahkan seri dan label berdasarkan sumber", () => {
    const series = buildRankTrendSeries([
      input({ id: "manual" }),
      input({ id: "serp", source: "serp_provider", position: 5 }),
    ]);

    expect(series.map((item) => item.label)).toEqual([
      "Manual",
      "SERP provider",
    ]);
  });

  it("memakai null untuk not-found dan memutus garis", () => {
    const [series] = buildRankTrendSeries([
      input({ id: "a", position: 8 }),
      input({
        id: "b",
        position: null,
        not_found_top_100: true,
        checked_at: "2026-11-17T12:00:00.000Z",
      }),
      input({
        id: "c",
        position: 6,
        checked_at: "2026-11-18T12:00:00.000Z",
      }),
    ]);

    expect(series?.points[1]?.position).toBeNull();
    expect(splitNumericSegments(series?.points ?? [])).toHaveLength(2);
  });

  it("memberi label eksplisit untuk sumber GSC terpisah", () => {
    expect(rankSourceLabel("gsc_average_position")).toBe(
      "GSC average position",
    );
  });
});
