import { useCallback, useMemo, useRef, useState } from 'react';
import { extent, max, min } from 'd3-array';
import { scaleLinear, scaleUtc } from 'd3-scale';
import { area, curveMonotoneX, line } from 'd3-shape';
import { ChartShell, Tooltip } from '../core/ChartShell';
import { useRovingFocus } from '../core/hooks';
import { linearKey } from '../core/navigation';
import { fmtDay, fmtShortDay } from '../core/format';
import { clampWindow, moveWindow, nearestIndex, resizeWindow, type Window } from './brush';

export interface TimeMetric<T> {
  key: string;
  label: string;
  value: (d: T) => number;
  format: (v: number) => string;
  /** 'zero' anchors the axis at 0 and fills an area; 'auto' fits the window and draws a line only. */
  baseline?: 'zero' | 'auto';
  /** Unit shown above the y axis, e.g. "TB" or "%". */
  unit?: string;
  /** Hard upper bound for the axis (100 for a percentage). */
  ceiling?: number;
}

export interface BrushTimeSeriesProps<T> {
  data: T[];
  date: (d: T) => Date;
  /** One or more measures; with more than one the toolbar offers a switch (never a second axis). */
  metrics: TimeMetric<T>[];
  title?: string;
  description?: string;
  /** Initial brush window as point indices; defaults to the last 90 points. */
  initialWindow?: Window;
  minSpan?: number;
  onWindowChange?: (window: Window) => void;
  height?: number;
}

const M = { top: 12, right: 16, bottom: 22, left: 44 };
const OVERVIEW_H = 52;
const GAP = 34;

type DragMode = { kind: 'move'; origin: number; window: Window } | { kind: 'start' } | { kind: 'end' } | { kind: 'new'; anchor: number };

export function BrushTimeSeries<T>({
  data,
  date,
  metrics,
  title = 'Backup throughput',
  description = 'Drag across the overview strip to choose a window; the detail chart above follows it.',
  initialWindow,
  minSpan = 7,
  onWindowChange,
  height = 340,
}: BrushTimeSeriesProps<T>) {
  const n = data.length;
  const [metricKey, setMetricKey] = useState(metrics[0]?.key ?? '');
  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0];
  const [win, setWinState] = useState<Window>(() => clampWindow(initialWindow ?? [n - 90, n - 1], n, minSpan));
  const [hover, setHover] = useState<number | null>(null);
  const drag = useRef<DragMode | null>(null);

  const setWin = useCallback(
    (next: Window) => {
      setWinState((prev) => {
        if (prev[0] === next[0] && prev[1] === next[1]) return prev;
        onWindowChange?.(next);
        return next;
      });
    },
    [onWindowChange],
  );

  const visible = useMemo(() => data.slice(win[0], win[1] + 1), [data, win]);
  const resolveKey = useCallback((key: string, i: number) => linearKey(key, i, visible.length), [visible.length]);
  const { active, setActive, onKeyDown, register } = useRovingFocus(visible.length, resolveKey);

  if (!metric) return null;
  const value = metric.value;
  const focusedDatum = visible[active];
  const windowText = `${fmtDay(date(data[win[0]] as T))} to ${fmtDay(date(data[win[1]] as T))}`;
  const announcement = focusedDatum ? `${fmtDay(date(focusedDatum))}: ${metric.label} ${metric.format(value(focusedDatum))}` : '';

  return (
    <ChartShell
      title={title}
      description={description}
      height={height}
      announcement={announcement}
      toolbar={
        metrics.length > 1 ? (
          <div className="segmented" role="group" aria-label="Measure">
            {metrics.map((m) => (
              <button key={m.key} type="button" aria-pressed={m.key === metric.key} onClick={() => setMetricKey(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
        ) : undefined
      }
      table={{
        caption: `${title}: ${metric.label}, ${windowText}`,
        rows: visible,
        rowKey: (d) => date(d).toISOString(),
        columns: [
          { key: 'date', header: 'Date', render: (d) => fmtDay(date(d)) },
          ...metrics.map((m) => ({ key: m.key, header: m.label, numeric: true, render: (d: T) => m.format(m.value(d)) })),
        ],
      }}
    >
      {({ width, height: h }) => {
        const innerW = Math.max(width - M.left - M.right, 60);
        const detailH = h - M.top - M.bottom - GAP - OVERVIEW_H;
        const fullExtent = extent(data, date) as [Date, Date];
        const xo = scaleUtc().domain(fullExtent).range([0, innerW]);
        const xs = data.map((d) => xo(date(d)));
        const allMax = max(data, value) ?? 1;
        const allMin = min(data, value) ?? 0;
        const zero = metric.baseline !== 'auto';
        const yo = scaleLinear()
          .domain([zero ? 0 : allMin, allMax])
          .range([OVERVIEW_H, 2]);

        const xd = scaleUtc()
          .domain([date(data[win[0]] as T), date(data[win[1]] as T)])
          .range([0, innerW]);
        const vMax = max(visible, value) ?? 1;
        const vMin = min(visible, value) ?? 0;
        const pad = (vMax - vMin) * 0.12 || 1;
        const yd = scaleLinear()
          .domain(zero ? [0, vMax] : [vMin - pad, Math.min(vMax + pad, metric.ceiling ?? Infinity)])
          .nice(5)
          .range([detailH, 0]);

        const detailLine = line<T>()
          .x((d) => xd(date(d)))
          .y((d) => yd(value(d)))
          .curve(curveMonotoneX);
        const detailArea = area<T>()
          .x((d) => xd(date(d)))
          .y0(detailH)
          .y1((d) => yd(value(d)))
          .curve(curveMonotoneX);
        const overviewArea = area<T>()
          .x((d) => xo(date(d)))
          .y0(OVERVIEW_H)
          .y1((d) => yo(value(d)))
          .curve(curveMonotoneX);
        const overviewLine = line<T>()
          .x((d) => xo(date(d)))
          .y((d) => yo(value(d)))
          .curve(curveMonotoneX);

        const bx0 = xs[win[0]] ?? 0;
        const bx1 = xs[win[1]] ?? innerW;
        const hoverDatum = hover !== null ? visible[hover] : undefined;
        const yTicks = yd.ticks(5);
        const xTicks = xd.ticks(Math.max(2, Math.floor(innerW / 110)));
        const oTicks = xo.ticks(Math.max(2, Math.floor(innerW / 90)));

        const toIndex = (clientX: number, el: Element) => {
          const rect = el.getBoundingClientRect();
          return nearestIndex(xs, clientX - rect.left);
        };

        const onOverviewDown = (event: React.PointerEvent<SVGRectElement>) => {
          const target = event.target as Element;
          const role = target.getAttribute('data-brush');
          const idx = toIndex(event.clientX, event.currentTarget);
          if (role === 'start' || role === 'end') drag.current = { kind: role };
          else if (role === 'window') drag.current = { kind: 'move', origin: idx, window: win };
          else {
            drag.current = { kind: 'new', anchor: idx };
            setWin(clampWindow([idx - Math.floor(minSpan / 2), idx + Math.ceil(minSpan / 2)], n, minSpan));
          }
          event.currentTarget.setPointerCapture?.(event.pointerId);
        };
        const onOverviewMove = (event: React.PointerEvent<SVGRectElement>) => {
          const mode = drag.current;
          if (!mode) return;
          const idx = toIndex(event.clientX, event.currentTarget);
          if (mode.kind === 'move') setWin(moveWindow(mode.window, idx - mode.origin, n));
          else if (mode.kind === 'start') setWin(resizeWindow(win, 'start', idx - win[0], n, minSpan));
          else if (mode.kind === 'end') setWin(resizeWindow(win, 'end', idx - win[1], n, minSpan));
          else setWin(clampWindow([mode.anchor, idx], n, minSpan));
        };
        const endDrag = () => {
          drag.current = null;
        };

        const brushKeys = (edge: 'window' | 'start' | 'end') => (event: React.KeyboardEvent) => {
          const step = event.shiftKey ? 7 : 1;
          let delta: number;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta = -step;
          else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta = step;
          else if (event.key === 'PageDown') delta = -30;
          else if (event.key === 'PageUp') delta = 30;
          else if (event.key === 'Home') delta = -n;
          else if (event.key === 'End') delta = n;
          else return;
          event.preventDefault();
          event.stopPropagation();
          if (edge === 'window') setWin(moveWindow(win, delta, n));
          else setWin(resizeWindow(win, edge, delta, n, minSpan));
        };

        return (
          <>
            <svg width={width} height={h} className="timeseries">
              {/* Detail */}
              <g
                transform={`translate(${M.left},${M.top})`}
                role="group"
                aria-label={`${metric.label}, ${windowText}. Arrow keys step through days.`}
                onKeyDown={onKeyDown}
              >
                <g aria-hidden="true">
                  {yTicks.map((t) => (
                    <g key={t} transform={`translate(0,${yd(t)})`}>
                      <line x2={innerW} className="gridline" />
                      <text x={-8} dy="0.32em" textAnchor="end" className="axis-label">
                        {t}
                      </text>
                    </g>
                  ))}
                  {xTicks.map((t) => (
                    <text key={t.getTime()} x={xd(t)} y={detailH + 16} textAnchor="middle" className="axis-label">
                      {fmtShortDay(t)}
                    </text>
                  ))}
                  <text x={-M.left} y={-2} className="axis-label axis-label--unit">
                    {metric.unit ?? ''}
                  </text>
                </g>
                <clipPath id="detail-clip">
                  <rect width={innerW} height={detailH + 2} y={-1} />
                </clipPath>
                <g clipPath="url(#detail-clip)" aria-hidden="true">
                  {zero && <path d={detailArea(visible) ?? ''} fill="var(--viz-area)" />}
                  <path d={detailLine(visible) ?? ''} fill="none" stroke="var(--viz-line)" strokeWidth={2} strokeLinejoin="round" />
                </g>
                <rect
                  width={innerW}
                  height={detailH}
                  fill="transparent"
                  aria-hidden="true"
                  onPointerMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const vx = visible.map((d) => xd(date(d)));
                    setHover(nearestIndex(vx, e.clientX - rect.left));
                  }}
                  onPointerLeave={() => setHover(null)}
                />
                {hoverDatum && (
                  <g aria-hidden="true" pointerEvents="none">
                    <line x1={xd(date(hoverDatum))} x2={xd(date(hoverDatum))} y2={detailH} className="crosshair" />
                    <circle cx={xd(date(hoverDatum))} cy={yd(value(hoverDatum))} r={4.5} className="focus-dot" />
                  </g>
                )}
                {visible.map((d, i) => (
                  <circle
                    key={date(d).getTime()}
                    ref={register(i)}
                    cx={xd(date(d))}
                    cy={yd(value(d))}
                    r={4}
                    className="mark mark--point"
                    tabIndex={i === active ? 0 : -1}
                    role="img"
                    aria-label={`${fmtDay(date(d))}: ${metric.format(value(d))}`}
                    onFocus={() => {
                      setActive(i);
                      setHover(i);
                    }}
                    onBlur={() => setHover(null)}
                  />
                ))}
              </g>

              {/* Overview + brush */}
              <g transform={`translate(${M.left},${M.top + detailH + GAP})`}>
                <g aria-hidden="true">
                  <path d={overviewArea(data) ?? ''} fill="var(--viz-area)" />
                  <path d={overviewLine(data) ?? ''} fill="none" stroke="var(--viz-ink)" strokeOpacity={0.55} strokeWidth={1} />
                  <line y1={OVERVIEW_H} y2={OVERVIEW_H} x2={innerW} className="baseline" />
                  {oTicks.map((t) => (
                    <text key={t.getTime()} x={xo(t)} y={OVERVIEW_H + 15} textAnchor="middle" className="axis-label">
                      {fmtShortDay(t)}
                    </text>
                  ))}
                </g>
                <rect
                  width={innerW}
                  height={OVERVIEW_H}
                  fill="transparent"
                  className="brush__surface"
                  onPointerDown={onOverviewDown}
                  onPointerMove={onOverviewMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  aria-hidden="true"
                />
                <rect
                  x={bx0}
                  width={Math.max(bx1 - bx0, 2)}
                  height={OVERVIEW_H}
                  className="brush__window"
                  data-brush="window"
                  pointerEvents="none"
                />
                <rect
                  x={bx0}
                  width={Math.max(bx1 - bx0, 2)}
                  height={OVERVIEW_H}
                  fill="transparent"
                  className="brush__handle-area"
                  tabIndex={0}
                  role="slider"
                  aria-label="Brush window"
                  aria-valuemin={0}
                  aria-valuemax={n - 1}
                  aria-valuenow={win[0]}
                  aria-valuetext={windowText}
                  aria-orientation="horizontal"
                  data-brush="window"
                  onKeyDown={brushKeys('window')}
                  onPointerDown={(e) => {
                    const surface = e.currentTarget.parentElement?.querySelector('.brush__surface');
                    if (!surface) return;
                    drag.current = { kind: 'move', origin: toIndex(e.clientX, surface), window: win };
                    (surface as SVGRectElement).setPointerCapture?.(e.pointerId);
                  }}
                />
                {(['start', 'end'] as const).map((edge) => {
                  const hx = edge === 'start' ? bx0 : bx1;
                  return (
                    <g key={edge} transform={`translate(${hx},0)`}>
                      <rect
                        x={-6}
                        width={12}
                        height={OVERVIEW_H}
                        fill="transparent"
                        className="brush__edge"
                        tabIndex={0}
                        role="slider"
                        aria-label={edge === 'start' ? 'Window start' : 'Window end'}
                        aria-valuemin={0}
                        aria-valuemax={n - 1}
                        aria-valuenow={edge === 'start' ? win[0] : win[1]}
                        aria-valuetext={fmtDay(date(data[edge === 'start' ? win[0] : win[1]] as T))}
                        data-brush={edge}
                        onKeyDown={brushKeys(edge)}
                        onPointerDown={(e) => {
                          const surface = e.currentTarget.closest('g')?.parentElement?.querySelector('.brush__surface');
                          drag.current = { kind: edge };
                          (surface as SVGRectElement | null)?.setPointerCapture?.(e.pointerId);
                          e.stopPropagation();
                        }}
                      />
                      <rect x={-2} y={OVERVIEW_H / 2 - 10} width={4} height={20} rx={2} className="brush__grip" pointerEvents="none" />
                    </g>
                  );
                })}
              </g>
            </svg>
            {hoverDatum && (
              <Tooltip x={M.left + xd(date(hoverDatum))} y={M.top + yd(value(hoverDatum))} bound={width}>
                <span className="tooltip__title">{fmtDay(date(hoverDatum))}</span>
                {metrics.map((m) => (
                  <span key={m.key} className={`tooltip__row${m.key === metric.key ? ' is-active' : ''}`}>
                    <span>{m.label}</span>
                    <strong>{m.format(m.value(hoverDatum))}</strong>
                  </span>
                ))}
              </Tooltip>
            )}
          </>
        );
      }}
    </ChartShell>
  );
}
