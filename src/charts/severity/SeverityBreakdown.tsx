import { useCallback, useMemo, useState } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import { ChartShell, Legend, Tooltip } from '../core/ChartShell';
import { useRovingFocus } from '../core/hooks';
import { roundedTopRect } from '../core/geometry';
import { fmtInt, fmtPct, fmtShortDay } from '../core/format';
import { stackMax, stackRows, type StackMode } from './stack';

export interface SeverityRow<K extends string> {
  weekStart: Date;
  counts: Record<K, number>;
}

export interface SeverityBreakdownProps<K extends string> {
  data: SeverityRow<K>[];
  /** Stack order, bottom to top. */
  keys: readonly K[];
  /** CSS colour for each key; defaults to the --viz-sev-* ramp. */
  colors?: Partial<Record<K, string>>;
  labels?: Partial<Record<K, string>>;
  title?: string;
  description?: string;
  /** Initial mode; the toolbar lets readers switch between counts and shares. */
  defaultMode?: StackMode;
  height?: number;
}

const M = { top: 10, right: 76, bottom: 26, left: 36 };
const GAP = 2;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function SeverityBreakdown<K extends string>({
  data,
  keys,
  colors,
  labels,
  title = 'Threats by severity, weekly',
  description = 'Detections from backup scans, stacked with the most severe on the baseline.',
  defaultMode = 'count',
  height = 300,
}: SeverityBreakdownProps<K>) {
  const [mode, setMode] = useState<StackMode>(defaultMode);
  const [hover, setHover] = useState<number | null>(null);
  const stacked = useMemo(() => stackRows(data, keys, mode), [data, keys, mode]);
  const k = keys.length;
  const colorOf = (key: K) => colors?.[key] ?? `var(--viz-sev-${key})`;
  const labelOf = (key: K) => labels?.[key] ?? cap(key);

  const resolveKey = useCallback(
    (key: string, i: number) => {
      const week = Math.floor(i / k);
      const level = i % k;
      switch (key) {
        case 'ArrowRight':
          return week < data.length - 1 ? i + k : i;
        case 'ArrowLeft':
          return week > 0 ? i - k : i;
        case 'ArrowUp':
          return level < k - 1 ? i + 1 : i;
        case 'ArrowDown':
          return level > 0 ? i - 1 : i;
        case 'Home':
          return level;
        case 'End':
          return (data.length - 1) * k + level;
        default:
          return null;
      }
    },
    [k, data.length],
  );
  const { active, setActive, onKeyDown, register } = useRovingFocus(data.length * k, resolveKey);

  const fmtValue = (seg: { value: number; y0: number; y1: number }) =>
    mode === 'share' ? `${fmtInt(seg.value)} (${fmtPct(seg.y1 - seg.y0, 0)})` : fmtInt(seg.value);

  const focusRow = stacked[Math.floor(active / k)];
  const focusSeg = focusRow?.segments[active % k];
  const announcement =
    focusRow && focusSeg
      ? `Week of ${fmtShortDay(focusRow.row.weekStart)}: ${labelOf(focusSeg.key)} ${fmtValue(focusSeg)} of ${fmtInt(focusRow.total)}`
      : '';

  return (
    <ChartShell
      title={title}
      description={description}
      height={height}
      announcement={announcement}
      toolbar={
        <div className="segmented" role="group" aria-label="Scale">
          {(['count', 'share'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === 'count' ? 'Count' : 'Share'}
            </button>
          ))}
        </div>
      }
      legend={
        <Legend
          label="Severity"
          items={keys.map((key) => ({ key, label: labelOf(key), color: colorOf(key) }))}
        />
      }
      table={{
        caption: `${title} (${mode === 'share' ? 'share of week' : 'counts'})`,
        rows: stacked,
        rowKey: (s) => s.row.weekStart.toISOString(),
        columns: [
          { key: 'week', header: 'Week of', render: (s) => fmtShortDay(s.row.weekStart) },
          ...keys.map((key) => ({
            key,
            header: labelOf(key),
            numeric: true,
            render: (s: (typeof stacked)[number]) => {
              const seg = s.segments.find((g) => g.key === key);
              return seg ? fmtValue(seg) : '';
            },
          })),
          { key: 'total', header: 'Total', numeric: true, render: (s) => fmtInt(s.total) },
        ],
      }}
    >
      {({ width, height: h }) => {
        const innerW = Math.max(width - M.left - M.right, 40);
        const innerH = h - M.top - M.bottom;
        const x = scaleBand<number>()
          .domain(data.map((_, i) => i))
          .range([0, innerW])
          .paddingInner(0.32)
          .paddingOuter(0.1);
        const y = scaleLinear()
          .domain([0, mode === 'share' ? 100 : stackMax(stacked)])
          .nice(4)
          .range([innerH, 0]);
        const ticks = y.ticks(4);
        const bw = x.bandwidth();
        const last = stacked[stacked.length - 1];
        const hoverRow = hover !== null ? stacked[Math.floor(hover / k)] : undefined;
        const hoverIdx = hover !== null ? Math.floor(hover / k) : 0;

        return (
          <>
            <svg width={width} height={h} role="group" aria-label={`${title}. Arrow keys move between weeks and severities.`} onKeyDown={onKeyDown} onPointerLeave={() => setHover(null)}>
              <g transform={`translate(${M.left},${M.top})`}>
                <g aria-hidden="true">
                  {ticks.map((t) => (
                    <g key={t} transform={`translate(0,${y(t)})`}>
                      <line x2={innerW} className="gridline" />
                      <text x={-8} dy="0.32em" textAnchor="end" className="axis-label">
                        {mode === 'share' ? `${t}%` : t}
                      </text>
                    </g>
                  ))}
                  {data.map((d, i) =>
                    i % Math.ceil(data.length / Math.max(2, Math.floor(innerW / 64))) === 0 ? (
                      <text key={i} x={(x(i) ?? 0) + bw / 2} y={innerH + 18} textAnchor="middle" className="axis-label">
                        {fmtShortDay(d.weekStart)}
                      </text>
                    ) : null,
                  )}
                  <line y1={innerH} y2={innerH} x2={innerW} className="baseline" />
                </g>
                {stacked.map((s, wi) => {
                  const x0 = x(wi) ?? 0;
                  const topIndex = s.segments.reduce((acc, seg, si) => (seg.y1 > seg.y0 ? si : acc), -1);
                  return (
                    <g key={wi} className={hover !== null && Math.floor(hover / k) !== wi ? 'dimmed' : undefined}>
                      <rect x={x0 - 3} width={bw + 6} y={0} height={innerH} fill="transparent" onPointerEnter={() => setHover(wi * k + (active % k))} aria-hidden="true" />
                      {s.segments.map((seg, si) => {
                        const i = wi * k + si;
                        const yTop = y(seg.y1);
                        const yBot = y(seg.y0);
                        const segH = Math.max(0, yBot - yTop - (si > 0 ? GAP : 0));
                        const d = si === topIndex ? roundedTopRect(x0, yTop, bw, segH, 3) : `M${x0},${yTop}h${bw}v${segH}h${-bw}Z`;
                        return (
                          <path
                            key={seg.key}
                            ref={register(i)}
                            d={d || `M${x0},${yBot}h${bw}`}
                            fill={colorOf(seg.key)}
                            className="mark"
                            tabIndex={i === active ? 0 : -1}
                            role="img"
                            aria-label={`Week of ${fmtShortDay(s.row.weekStart)}, ${labelOf(seg.key)}: ${fmtValue(seg)}`}
                            onPointerEnter={() => setHover(i)}
                            onFocus={() => {
                              setActive(i);
                              setHover(i);
                            }}
                            onBlur={() => setHover(null)}
                          />
                        );
                      })}
                    </g>
                  );
                })}
                {last && (
                  <g aria-hidden="true" className="direct-labels">
                    {last.segments.map((seg) => {
                      const mid = (y(seg.y0) + y(seg.y1)) / 2;
                      return y(seg.y0) - y(seg.y1) >= 12 ? (
                        <text key={seg.key} x={(x(stacked.length - 1) ?? 0) + bw + 8} y={mid} dy="0.32em">
                          {labelOf(seg.key)}
                        </text>
                      ) : null;
                    })}
                  </g>
                )}
              </g>
            </svg>
            {hoverRow && (
              <Tooltip x={M.left + (x(hoverIdx) ?? 0) + bw / 2} y={M.top + y((hoverRow.segments[hoverRow.segments.length - 1]?.y1 ?? 0) / 2)} bound={width}>
                <span className="tooltip__title">Week of {fmtShortDay(hoverRow.row.weekStart)}</span>
                {[...hoverRow.segments].reverse().map((seg) => (
                  <span key={seg.key} className={`tooltip__row${hover !== null && hoverRow.segments[hover % k]?.key === seg.key ? ' is-active' : ''}`}>
                    <span>
                      <i className="swatch" style={{ background: colorOf(seg.key) }} />
                      {labelOf(seg.key)}
                    </span>
                    <strong>{fmtValue(seg)}</strong>
                  </span>
                ))}
                <span className="tooltip__row tooltip__total">
                  <span>Total</span>
                  <strong>{fmtInt(hoverRow.total)}</strong>
                </span>
              </Tooltip>
            )}
          </>
        );
      }}
    </ChartShell>
  );
}
