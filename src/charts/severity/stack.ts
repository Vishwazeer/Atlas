export type StackMode = 'count' | 'share';

export interface StackSegment<K extends string> {
  key: K;
  value: number;
  /** Lower and upper edge in the chosen unit (count, or 0-100 share). */
  y0: number;
  y1: number;
}

export interface StackedRow<K extends string, R> {
  row: R;
  total: number;
  segments: StackSegment<K>[];
}

/** Stacks `keys` bottom-up for each row. In share mode every bar sums to 100. */
export function stackRows<K extends string, R extends { counts: Record<K, number> }>(
  rows: readonly R[],
  keys: readonly K[],
  mode: StackMode,
): StackedRow<K, R>[] {
  return rows.map((row) => {
    const total = keys.reduce((acc, k) => acc + row.counts[k], 0);
    const scale = mode === 'share' && total > 0 ? 100 / total : 1;
    let cursor = 0;
    const segments = keys.map((key) => {
      const v = row.counts[key] * scale;
      const seg = { key, value: row.counts[key], y0: cursor, y1: cursor + v };
      cursor += v;
      return seg;
    });
    return { row, total, segments };
  });
}

export function stackMax<K extends string, R>(stacked: readonly StackedRow<K, R>[]): number {
  return stacked.reduce((acc, s) => Math.max(acc, s.segments[s.segments.length - 1]?.y1 ?? 0), 0);
}
