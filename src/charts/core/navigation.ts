/** Pure keyboard-navigation helpers shared by every chart. Kept pure so they are unit-tested in isolation. */

export function linearKey(key: string, index: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return Math.min(index + 1, count - 1);
    case 'ArrowLeft':
    case 'ArrowUp':
      return Math.max(index - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/**
 * Column-major grid (a calendar: columns are weeks, rows are weekdays).
 * Up/Down move one row, Left/Right move one column, PageUp/PageDown move ~a month.
 */
export function gridKey(key: string, index: number, count: number, rows: number): number | null {
  const clamp = (n: number) => Math.min(Math.max(n, 0), count - 1);
  switch (key) {
    case 'ArrowDown':
      return clamp(index + 1);
    case 'ArrowUp':
      return clamp(index - 1);
    case 'ArrowRight':
      return index + rows < count ? index + rows : index;
    case 'ArrowLeft':
      return index - rows >= 0 ? index - rows : index;
    case 'PageDown':
      return clamp(index + rows * 4);
    case 'PageUp':
      return clamp(index - rows * 4);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
