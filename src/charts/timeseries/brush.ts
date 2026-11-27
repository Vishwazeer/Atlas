/** A brush window over index positions [start, end], both inclusive. */
export type Window = readonly [number, number];

/** Normalises a window: ordered, inside [0, n-1], at least `minSpan` points wide where possible. */
export function clampWindow([a, b]: Window, n: number, minSpan = 7): Window {
  if (n <= 0) return [0, 0];
  let start = Math.max(0, Math.min(Math.round(Math.min(a, b)), n - 1));
  let end = Math.max(0, Math.min(Math.round(Math.max(a, b)), n - 1));
  const span = Math.min(minSpan - 1, n - 1);
  if (end - start < span) {
    end = Math.min(n - 1, start + span);
    start = Math.max(0, end - span);
  }
  return [Math.max(0, start), end];
}

/** Slides the window by `delta` points, keeping its width, stopping at either edge. */
export function moveWindow([a, b]: Window, delta: number, n: number): Window {
  const span = b - a;
  const start = Math.max(0, Math.min(a + delta, n - 1 - span));
  return [start, start + span];
}

/** Moves one edge by `delta`, never letting the window shrink below `minSpan` points. */
export function resizeWindow([a, b]: Window, edge: 'start' | 'end', delta: number, n: number, minSpan = 7): Window {
  if (edge === 'start') {
    const start = Math.max(0, Math.min(a + delta, b - (minSpan - 1)));
    return [start, b];
  }
  const end = Math.min(n - 1, Math.max(b + delta, a + (minSpan - 1)));
  return [a, end];
}

/** Index of the item whose x position is nearest to `x` (items sorted ascending). */
export function nearestIndex(xs: readonly number[], x: number): number {
  if (xs.length === 0) return -1;
  let lo = 0;
  let hi = xs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((xs[mid] ?? 0) < x) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs((xs[lo - 1] ?? 0) - x) <= Math.abs((xs[lo] ?? 0) - x)) return lo - 1;
  return lo;
}
