/** Deterministic PRNG (mulberry32). Same seed, same infrastructure, every render and every test. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
    pick: <T,>(items: readonly T[]): T => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error('pick() on empty list');
      return item;
    },
    /** Approximately normal, via the sum of three uniforms. */
    gauss: (mean: number, sd: number) => mean + sd * ((next() + next() + next()) * 2 - 3),
  };
}

export type Rng = ReturnType<typeof createRng>;

/** Fixed reference date so the mock data never drifts with the wall clock. */
export const REFERENCE_DATE = new Date(Date.UTC(2026, 10, 26));

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
