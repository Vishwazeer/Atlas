/** Small line drawings of each chart form, used in the nav and the index. */
export function ChartGlyph({ slug, size = 16 }: { slug: string; size?: number }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let body: React.ReactNode;
  switch (slug) {
    case 'topology-graph':
      body = (
        <>
          <path d="M4 4.5 8 8l4-3.5M8 8v4.5" {...common} />
          <circle cx="4" cy="4.5" r="1.6" {...common} />
          <circle cx="12" cy="4.5" r="1.6" {...common} />
          <circle cx="8" cy="8" r="1.8" fill="currentColor" />
          <circle cx="8" cy="12.5" r="1.6" {...common} />
        </>
      );
      break;
    case 'brush-time-series':
      body = (
        <>
          <path d="M1.5 9.5 4.5 6l3 2.5 3-5 4 3.5" {...common} />
          <rect x="6" y="11" width="5" height="3.4" rx="1" {...common} />
          <path d="M1.5 12.7h13" {...common} strokeOpacity="0.5" />
        </>
      );
      break;
    case 'calendar-heatmap':
      body = (
        <>
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect key={`${r}${c}`} x={1.5 + c * 3.4} y={3 + r * 3.4} width="2.6" height="2.6" rx="0.6" fill="currentColor" opacity={0.3 + ((r * 4 + c) % 5) * 0.16} />
            )),
          )}
        </>
      );
      break;
    case 'data-treemap':
      body = (
        <>
          <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" {...common} />
          <path d="M8.5 1.5v13M8.5 8h6M1.5 10h7M11.5 8v6.5" {...common} />
        </>
      );
      break;
    case 'severity-breakdown':
      body = (
        <>
          <path d="M3 14.5V8M6.5 14.5V5M10 14.5V9.5M13.5 14.5V3" {...common} strokeWidth={2.4} strokeLinecap="butt" strokeOpacity={0.45} />
          <path d="M3 14.5V12M6.5 14.5V10.5M10 14.5V13M13.5 14.5V9" {...common} strokeWidth={2.4} strokeLinecap="butt" />
        </>
      );
      break;
    default:
      body = (
        <>
          <path d="M4.2 12.3a5.2 5.2 0 1 1 7.6 0" {...common} strokeOpacity="0.4" />
          <path d="M4.2 12.3a5.2 5.2 0 0 1 6.6-8" {...common} />
        </>
      );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="glyph">
      {body}
    </svg>
  );
}
