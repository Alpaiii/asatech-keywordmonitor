import {
  buildRankTrendSeries,
  splitNumericSegments,
  type RankTrendInput,
} from "@/features/rank-checkins/trend";

type Props = {
  checkins: RankTrendInput[];
};

const WIDTH = 760;
const HEIGHT = 300;
const LEFT = 48;
const RIGHT = 20;
const TOP = 20;
const BOTTOM = 58;
const PLOT_WIDTH = WIDTH - LEFT - RIGHT;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;
const GRID_POSITIONS = [1, 25, 50, 75, 100];
const COLORS = ["#34d399", "#60a5fa", "#f59e0b", "#e879f9"];

function yForPosition(position: number) {
  return TOP + ((position - 1) / 99) * PLOT_HEIGHT;
}

export function RankTrendChart({ checkins }: Props) {
  if (!checkins.length) {
    return (
      <div
        className="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400"
        data-testid="rank-trend-empty"
      >
        Belum ada data untuk trend posisi.
      </div>
    );
  }

  const series = buildRankTrendSeries(checkins);
  const orderedPoints = series
    .flatMap((item) => item.points)
    .sort(
      (left, right) =>
        Date.parse(left.checkedAt) - Date.parse(right.checkedAt) ||
        left.id.localeCompare(right.id),
    );
  const pointIndex = new Map(
    orderedPoints.map((point, index) => [point.id, index]),
  );
  const xForPoint = (id: string) => {
    const index = pointIndex.get(id) ?? 0;
    return orderedPoints.length === 1
      ? LEFT + PLOT_WIDTH / 2
      : LEFT + (index / (orderedPoints.length - 1)) * PLOT_WIDTH;
  };
  const notFoundPoints = orderedPoints.filter((point) => point.notFoundTop100);
  const firstDate = orderedPoints[0]?.checkedAt;
  const lastDate = orderedPoints.at(-1)?.checkedAt;
  const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mt-6" data-testid="rank-trend-chart">
      <div className="flex flex-wrap gap-4 text-xs text-slate-300">
        {series.map((item, index) => (
          <span className="flex items-center gap-2" key={item.source}>
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            Sumber: {item.label}
          </span>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <svg
          aria-label="Trend posisi keyword; posisi 1 berada di atas"
          className="min-w-[620px]"
          role="img"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        >
          {GRID_POSITIONS.map((position) => {
            const y = yForPosition(position);
            return (
              <g key={position}>
                <line
                  stroke="#1e293b"
                  strokeWidth="1"
                  x1={LEFT}
                  x2={WIDTH - RIGHT}
                  y1={y}
                  y2={y}
                />
                <text
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="end"
                  x={LEFT - 10}
                  y={y + 4}
                >
                  {position}
                </text>
              </g>
            );
          })}
          {series.map((item, seriesIndex) => {
            const color = COLORS[seriesIndex % COLORS.length];
            return (
              <g data-source={item.source} key={item.source}>
                {splitNumericSegments(item.points).map((segment) => {
                  const coordinates = segment
                    .map(
                      (point) =>
                        `${xForPoint(point.id)},${yForPosition(point.position ?? 100)}`,
                    )
                    .join(" ");
                  return segment.length > 1 ? (
                    <polyline
                      fill="none"
                      key={segment.map((point) => point.id).join("-")}
                      points={coordinates}
                      stroke={color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                  ) : null;
                })}
                {item.points
                  .filter((point) => point.position !== null)
                  .map((point) => (
                    <circle
                      cx={xForPoint(point.id)}
                      cy={yForPosition(point.position ?? 100)}
                      fill={color}
                      key={point.id}
                      r="4"
                    >
                      <title>{`${item.label}: posisi ${point.position} · ${dateFormatter.format(new Date(point.checkedAt))}`}</title>
                    </circle>
                  ))}
              </g>
            );
          })}
          {notFoundPoints.map((point) => (
            <g key={point.id}>
              <line
                stroke="#64748b"
                strokeDasharray="3 3"
                x1={xForPoint(point.id)}
                x2={xForPoint(point.id)}
                y1={TOP}
                y2={TOP + PLOT_HEIGHT}
              />
              <path
                d={`M ${xForPoint(point.id)} ${TOP + PLOT_HEIGHT + 8} l 5 5 l -5 5 l -5 -5 z`}
                fill="#94a3b8"
              >
                <title>{`Tidak ditemukan di top 100 · ${dateFormatter.format(new Date(point.checkedAt))}`}</title>
              </path>
            </g>
          ))}
          {firstDate ? (
            <text fill="#94a3b8" fontSize="11" x={LEFT} y={HEIGHT - 8}>
              {dateFormatter.format(new Date(firstDate))}
            </text>
          ) : null}
          {lastDate && lastDate !== firstDate ? (
            <text
              fill="#94a3b8"
              fontSize="11"
              textAnchor="end"
              x={WIDTH - RIGHT}
              y={HEIGHT - 8}
            >
              {dateFormatter.format(new Date(lastDate))}
            </text>
          ) : null}
        </svg>
      </div>
      {notFoundPoints.length ? (
        <p className="mt-3 text-xs text-slate-400">
          Berlian abu-abu: tidak ditemukan di top 100. Nilai ini membuat gap;
          bukan posisi 100 atau 101.
        </p>
      ) : null}
      <p className="mt-2 text-xs text-slate-500">
        Posisi 1 berada di atas. Seri tiap sumber tidak digabung. GSC average
        position akan memakai seri provider terpisah saat integrasi aktif.
      </p>
    </div>
  );
}
