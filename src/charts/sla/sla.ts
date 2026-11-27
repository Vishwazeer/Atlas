import { arc } from 'd3-shape';

export type SlaState = 'met' | 'at-risk' | 'breached';

export interface SlaItem {
  id: string;
  label: string;
  target: number;
  actual: number;
  detail?: string;
}

/** Met at or above target; at risk within `margin` points below it; breached beyond that. */
export function slaState(actual: number, target: number, margin = 1): SlaState {
  if (actual >= target) return 'met';
  if (actual >= target - margin) return 'at-risk';
  return 'breached';
}

export const STATE_LABEL: Record<SlaState, string> = { met: 'Met', 'at-risk': 'At risk', breached: 'Breached' };
export const STATE_COLOR: Record<SlaState, string> = {
  met: 'var(--accent)',
  'at-risk': 'var(--viz-warn)',
  breached: 'var(--viz-crit)',
};

/** The gauge sweeps 270 degrees, open at the bottom. */
export const SWEEP_START = -0.75 * Math.PI;
export const SWEEP_END = 0.75 * Math.PI;

/** Maps a percentage inside `domain` to a gauge angle (clamped). */
export function angleFor(value: number, domain: readonly [number, number]): number {
  const [lo, hi] = domain;
  const t = Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
  return SWEEP_START + t * (SWEEP_END - SWEEP_START);
}

export function arcPath(inner: number, outer: number, start: number, end: number): string {
  return arc().cornerRadius((outer - inner) / 2)({ innerRadius: inner, outerRadius: outer, startAngle: start, endAngle: end }) ?? '';
}
