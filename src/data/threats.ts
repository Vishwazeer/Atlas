import { addDays, createRng, REFERENCE_DATE } from './rng';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
/** Stack order, bottom to top: the most severe sits on the baseline, where lengths compare best. */
export const SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low'];

export interface ThreatWeek {
  weekStart: Date;
  counts: Record<Severity, number>;
}

export function generateThreatWeeks(seed = 31, weeks = 16): ThreatWeek[] {
  const rng = createRng(seed);
  const out: ThreatWeek[] = [];
  for (let w = 0; w < weeks; w++) {
    const weekStart = addDays(REFERENCE_DATE, -7 * (weeks - 1 - w) - 3);
    const surge = w === 9 || w === 10 ? 1.8 : 1;
    out.push({
      weekStart,
      counts: {
        critical: Math.round(Math.max(0, rng.gauss(3, 1.6)) * surge),
        high: Math.round(Math.max(1, rng.gauss(11, 3)) * surge),
        medium: Math.round(Math.max(4, rng.gauss(26, 5))),
        low: Math.round(Math.max(8, rng.gauss(44, 8))),
      },
    });
  }
  return out;
}
