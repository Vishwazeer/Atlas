import { useMemo } from 'react';
import { buildField, HERO_PEAKS, ringPath } from '../lib/contour';

export function ContourField() {
  const field = useMemo(() => buildField(HERO_PEAKS), []);
  const marked = Math.floor(field.levels.length * 0.55);
  return (
    <div className="contour" aria-hidden="true">
      <svg viewBox={`0 0 ${field.cols - 1} ${field.rows - 1}`} preserveAspectRatio="none" className="contour__svg">
        {field.levels.map((level, li) => (
          <path
            key={level.value}
            d={level.coordinates.flatMap((poly) => poly.map((ring) => ringPath(ring))).join('')}
            className={li === marked ? 'contour__line contour__line--marked' : 'contour__line'}
            style={{ opacity: li === marked ? undefined : 0.25 + (li / field.levels.length) * 0.6 }}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {HERO_PEAKS.map((p) => (
        <span key={p.label} className="contour__marker" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
          <i />
          <b>{p.label}</b>
          <em>{p.note}</em>
        </span>
      ))}
    </div>
  );
}
