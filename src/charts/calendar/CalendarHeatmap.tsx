import { useCallback, useMemo, useState } from 'react';
import { ChartShell, Legend, Tooltip } from '../core/ChartShell';
import { useRovingFocus } from '../core/hooks';
import { gridKey } from '../core/navigation';
import { fmtDay, fmtPct } from '../core/format';
import { bucketScale, DEFAULT_THRESHOLDS, layoutCalendar, lowestDays, SEQ_TOKENS, type CalendarDatum } from './layout';

export interface CalendarHeatmapProps<T extends CalendarDatum> {
  /** Consecutive days, oldest first. */
  data: T[];
  title?: string;
  description?: string;
  /** Four ascending cut points for the five colour steps. */
  thresholds?: readonly number[];
  valueLabel?: string;
  formatValue?: (value: number) => string;
  /** Extra tooltip / table detail for a day. */
  detail?: (datum: T) => string;
  /** How many of the lowest days to ring and list. Set 0 to disable. */
  annotateLowest?: number;
  onSelect?: (datum: T) => void;
}

const GAP = 2;
const LEFT = 30;
const TOP = 20;
const WEEKDAY_LABELS: [number, string][] = [
  [0, 'Mon'],
  [2, 'Wed'],
  [4, 'Fri'],
];

export function CalendarHeatmap<T extends CalendarDatum>({
  data,
  title = 'Backup success by day',
  description = 'Each square is one day. Darker teal in light mode and brighter teal in dark mode means more jobs finished clean.',
  thresholds = DEFAULT_THRESHOLDS,
  valueLabel = 'Success rate',
  formatValue = (v) => fmtPct(v),
  detail,
  annotateLowest = 3,
  onSelect,
}: CalendarHeatmapProps<T>) {
  const { cells, columns, months } = useMemo(() => layoutCalendar(data), [data]);
  const bucket = useMemo(() => bucketScale(thresholds), [thresholds]);
  const lowest = useMemo(() => new Set(lowestDays(data, annotateLowest)), [data, annotateLowest]);
  const [hover, setHover] = useState<number | null>(null);

  const resolveKey = useCallback((key: string, i: number) => gridKey(key, i, cells.length, 7), [cells.length]);
  const { active, setActive, onKeyDown, register } = useRovingFocus(cells.length, resolveKey);

  const shown = hover !== null ? cells[hover] : undefined;
  const focused = cells[active];
  const announcement = focused ? `${fmtDay(focused.datum.date)}, ${valueLabel} ${formatValue(focused.datum.value)}` : '';
  const t = thresholds;

  const legendItems = SEQ_TOKENS.map((token, i) => ({
    key: token,
    color: `var(${token})`,
    label:
      i === 0
        ? `under ${t[0]}%`
        : i === SEQ_TOKENS.length - 1
          ? `${t[3]}% and up`
          : `${t[i - 1]}–${t[i]}%`,
  }));

  return (
    <ChartShell
      title={title}
      description={description}
      height={7 * 17 + TOP + 8}
      announcement={announcement}
      legend={
        <Legend
          label={`${valueLabel} colour steps`}
          items={[
            ...legendItems,
            ...(annotateLowest > 0 ? [{ key: 'low', label: 'lowest days', color: 'var(--text)', shape: 'ring' as const }] : []),
          ]}
        />
      }
      table={{
        caption: `${title}: ${valueLabel.toLowerCase()} for each day`,
        rows: cells.map((c) => c.datum),
        rowKey: (d) => d.date.toISOString(),
        columns: [
          { key: 'date', header: 'Date', render: (d) => fmtDay(d.date) },
          { key: 'value', header: valueLabel, numeric: true, render: (d) => formatValue(d.value) },
          ...(detail ? [{ key: 'detail', header: 'Detail', render: (d: T) => detail(d) }] : []),
        ],
      }}
    >
      {({ width, height }) => {
        const cell = Math.max(6, Math.min(15, Math.floor((width - LEFT) / Math.max(columns, 1)) - GAP));
        const step = cell + GAP;
        const plotW = LEFT + columns * step;
        return (
          <>
            <svg
              width={Math.max(plotW, width)}
              height={height}
              role="group"
              aria-label={`${title}, ${cells.length} days. Use arrow keys to move by day and week.`}
              onKeyDown={onKeyDown}
              onPointerLeave={() => setHover(null)}
              className="calendar"
            >
              <g aria-hidden="true" className="axis-label">
                {months.map((m) => (
                  <text key={`${m.label}-${m.col}`} x={LEFT + m.col * step} y={12}>
                    {m.label}
                  </text>
                ))}
                {WEEKDAY_LABELS.map(([row, label]) => (
                  <text key={label} x={0} y={TOP + row * step + cell * 0.8}>
                    {label}
                  </text>
                ))}
              </g>
              <g transform={`translate(${LEFT},${TOP})`}>
                {cells.map((c) => {
                  const level = bucket(c.datum.value);
                  const isActive = c.index === active;
                  const isLow = lowest.has(c.datum);
                  return (
                    <rect
                      key={c.index}
                      ref={register(c.index)}
                      x={c.col * step}
                      y={c.row * step}
                      width={cell}
                      height={cell}
                      rx={2}
                      fill={`var(${SEQ_TOKENS[level] ?? SEQ_TOKENS[0]})`}
                      stroke={isLow ? 'var(--text)' : 'none'}
                      strokeWidth={isLow ? 1.5 : 0}
                      className="mark mark--cell"
                      tabIndex={isActive ? 0 : -1}
                      role="img"
                      aria-label={`${fmtDay(c.datum.date)}: ${formatValue(c.datum.value)}`}
                      data-index={c.index}
                      onPointerEnter={() => setHover(c.index)}
                      onFocus={() => {
                        setActive(c.index);
                        setHover(c.index);
                      }}
                      onBlur={() => setHover(null)}
                      onClick={() => onSelect?.(c.datum)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelect?.(c.datum);
                        }
                      }}
                    />
                  );
                })}
              </g>
            </svg>
            {shown && (
              <Tooltip x={LEFT + shown.col * step + cell / 2} y={TOP + shown.row * step + cell / 2} bound={width}>
                <span className="tooltip__title">{fmtDay(shown.datum.date)}</span>
                <span className="tooltip__row">
                  <span>{valueLabel}</span>
                  <strong>{formatValue(shown.datum.value)}</strong>
                </span>
                {detail && <span className="tooltip__muted">{detail(shown.datum)}</span>}
              </Tooltip>
            )}
          </>
        );
      }}
    </ChartShell>
  );
}
