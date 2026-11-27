/** Placeholder shaped like a chart page, shown while its lazy chunk loads. */
export function DocSkeleton() {
  return (
    <div className="doc skeleton" aria-busy="true" aria-label="Loading chart page">
      <div className="sk sk--crumb" />
      <div className="sk sk--title" />
      <div className="sk sk--line" />
      <div className="sk sk--line sk--short" />
      <div className="sk-stage">
        <div className="sk sk--bar" />
        <div className="sk-plot">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ height: `${28 + ((i * 37) % 60)}%` }} />
          ))}
        </div>
      </div>
      <div className="sk sk--block" />
    </div>
  );
}
