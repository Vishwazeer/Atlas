import { addDays, createRng, REFERENCE_DATE } from './rng';

export interface BackupDay {
  date: Date;
  /** Data moved by backup jobs that day, TB. */
  throughputTb: number;
  /** Share of jobs that finished clean, 0-100. */
  successRate: number;
  jobs: number;
}

/** Daily history ending on the reference date: weekly rhythm, slow growth and a few incidents. */
export function generateBackupHistory(seed = 11, days = 365): BackupDay[] {
  const rng = createRng(seed);
  const start = addDays(REFERENCE_DATE, -(days - 1));
  const incidents = new Set<number>();
  for (let i = 0; i < 7; i++) incidents.add(rng.int(10, days - 2));

  const out: BackupDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const weekday = date.getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    const trend = 38 + (i / days) * 14;
    const weekly = weekend ? 1.35 : 1; // full backups run at weekends
    const incident = incidents.has(i);
    const throughput = Math.max(5, trend * weekly + rng.gauss(0, 2.4) - (incident ? rng.range(12, 22) : 0));
    const base = 99.2 + rng.gauss(0, 0.5);
    const success = incident ? rng.range(78, 92) : Math.min(100, base - (rng.next() < 0.08 ? rng.range(2, 6) : 0));
    out.push({
      date,
      throughputTb: Math.round(throughput * 10) / 10,
      successRate: Math.round(success * 10) / 10,
      jobs: Math.round(1200 * weekly + rng.gauss(0, 40)),
    });
  }
  return out;
}
