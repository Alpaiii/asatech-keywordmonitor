type Point = {
  date: string;
  clicks: number;
  impressions: number;
};

export function PerformanceChart({ points }: { points: Point[] }) {
  if (!points.length) {
    return (
      <p className="rounded-base border-2 border-dashed border-black bg-white p-8 text-sm">
        Data harian belum tersedia. Jalankan sinkronisasi GSC.
      </p>
    );
  }

  const width = 800;
  const height = 220;
  const padding = 24;
  const maxClicks = Math.max(...points.map((point) => point.clicks), 1);
  const coordinates = points
    .map((point, index) => {
      const x =
        padding +
        (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
      const y =
        height - padding - (point.clicks / maxClicks) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <figure className="rounded-base shadow-shadow border-2 border-black bg-white p-4">
      <figcaption className="mb-3 text-sm font-bold">
        Klik harian · Google Search Console
      </figcaption>
      <svg
        aria-label="Grafik klik harian GSC"
        className="h-auto w-full"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <line
          x1={padding}
          x2={padding}
          y1={padding}
          y2={height - padding}
          stroke="black"
          strokeWidth="2"
        />
        <line
          x1={padding}
          x2={width - padding}
          y1={height - padding}
          y2={height - padding}
          stroke="black"
          strokeWidth="2"
        />
        <polyline
          fill="none"
          points={coordinates}
          stroke="#2563eb"
          strokeLinejoin="round"
          strokeWidth="4"
        />
      </svg>
      <div className="mt-2 flex justify-between text-xs">
        <span>{points[0]?.date}</span>
        <span>Satuan: klik</span>
        <span>{points.at(-1)?.date}</span>
      </div>
    </figure>
  );
}
