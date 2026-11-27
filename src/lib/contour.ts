import { contours } from 'd3-contour';
import { createRng } from '../data/rng';

export interface Peak {
  /** Position as a fraction of the field, 0-1. */
  x: number;
  y: number;
  height: number;
  spread: number;
}

/**
 * A seeded topographic field drawn with d3-contour: the hero's "map" of the infrastructure.
 * Peaks stand for regions; the marked contour is the level the markers sit on.
 */
export function buildField(peaks: readonly Peak[], cols = 150, rows = 60, seed = 5) {
  const rng = createRng(seed);
  const waves = Array.from({ length: 4 }, () => ({ fx: rng.range(1.5, 4), fy: rng.range(1, 3), p: rng.range(0, Math.PI * 2), a: rng.range(0.05, 0.12) }));
  const values = new Float64Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u = i / (cols - 1);
      const v = j / (rows - 1);
      let z = 0;
      for (const pk of peaks) {
        const dx = (u - pk.x) * 2.5;
        const dy = v - pk.y;
        z += pk.height * Math.exp(-(dx * dx + dy * dy) / (2 * pk.spread * pk.spread));
      }
      for (const w of waves) z += w.a * Math.sin(u * w.fx * Math.PI * 2 + w.p) * Math.cos(v * w.fy * Math.PI + w.p);
      values[j * cols + i] = z;
    }
  }
  const levels = contours().size([cols, rows]).thresholds(14)(Array.from(values));
  return { cols, rows, levels };
}

export function ringPath(ring: number[][]): string {
  return `M${ring.map(([x, y]) => `${(x ?? 0).toFixed(2)},${(y ?? 0).toFixed(2)}`).join('L')}Z`;
}

export const HERO_PEAKS: (Peak & { label: string; note: string })[] = [
  { x: 0.62, y: 0.34, height: 1.05, spread: 0.2, label: 'eu-west', note: '2 degraded' },
  { x: 0.83, y: 0.62, height: 0.9, spread: 0.18, label: 'us-east', note: 'all clean' },
  { x: 0.44, y: 0.78, height: 0.6, spread: 0.16, label: 'ap-south', note: '1 critical' },
  { x: 0.88, y: 0.2, height: 0.7, spread: 0.14, label: 'us-west', note: 'all clean' },
];

