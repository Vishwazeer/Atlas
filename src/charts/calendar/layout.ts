import { scaleThreshold } from 'd3-scale';

export interface CalendarDatum {
  date: Date;
  value: number;
}

export interface CalendarCell<T extends CalendarDatum = CalendarDatum> {
  datum: T;
  index: number;
  /** Week column, 0-based. */
  col: number;
  /** Weekday row, Monday = 0. */
  row: number;
}

export interface MonthLabel {
  label: string;
  col: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Monday-first weekday index of a UTC date. */
export const mondayIndex = (d: Date) => (d.getUTCDay() + 6) % 7;

/**
 * Places consecutive days into a week-column grid. Returns the cells, the number of columns
 * and a label for the first column of each month (skipping a month that starts in the last column).
 */
export function layoutCalendar<T extends CalendarDatum>(data: readonly T[]) {
  const first = data[0];
  if (!first) return { cells: [] as CalendarCell<T>[], columns: 0, months: [] as MonthLabel[] };
  const offset = mondayIndex(first.date);
  const cells = data.map((datum, index) => ({
    datum,
    index,
    col: Math.floor((index + offset) / 7),
    row: (index + offset) % 7,
  }));
  const columns = (cells[cells.length - 1]?.col ?? 0) + 1;
  const months: MonthLabel[] = [];
  let lastMonth = -1;
  for (const cell of cells) {
    const m = cell.datum.date.getUTCMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      const col = cell.row === 0 ? cell.col : cell.col + 1;
      if (col < columns - 1) months.push({ label: MONTHS[m] ?? '', col });
    }
  }
  return { cells, columns, months };
}

export const DEFAULT_THRESHOLDS = [90, 95, 98, 99.5] as const;
export const SEQ_TOKENS = ['--viz-seq-0', '--viz-seq-1', '--viz-seq-2', '--viz-seq-3', '--viz-seq-4'] as const;

/** Maps a value to one of five sequential steps (0 = fewest clean jobs, 4 = all clean). */
export function bucketScale(thresholds: readonly number[] = DEFAULT_THRESHOLDS) {
  return scaleThreshold<number, number>().domain([...thresholds]).range([0, 1, 2, 3, 4]);
}

/** The n lowest days, used for direct annotation. */
export function lowestDays<T extends CalendarDatum>(data: readonly T[], n = 3): T[] {
  return [...data].sort((a, b) => a.value - b.value || a.date.getTime() - b.date.getTime()).slice(0, n);
}
