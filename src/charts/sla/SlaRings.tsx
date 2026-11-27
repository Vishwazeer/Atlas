import { useCallback, useEffect, useState } from 'react';
import { ChartShell, Legend } from '../core/ChartShell';
import { useCountUp, usePrefersReducedMotion, useRovingFocus } from '../core/hooks';
import { linearKey } from '../core/navigation';
import { fmtPct } from '../core/format';
import { angleFor, arcPath, slaState, STATE_COLOR, STATE_LABEL, SWEEP_END, SWEEP_START, type SlaItem, type SlaState } from './sla';

export interface SlaRingsProps {
  items: SlaItem[];
  title?: string;
  description?: string;
  /** Percent range the gauge spans. A narrow range makes small misses visible; the ends are labelled. */
  domain?: readonly [number, number];
  /** Points below target that still count as "at risk" rather than breached. */
  riskMargin?: number;
  /** Ring diameter in px. */
  size?: number;
  /** Animate the arcs in on mount (skipped under prefers-reduced-motion). */
  animate?: boolean;
}

export function SlaRings({
  items,
  title = 'SLA compliance, last 30 days',
  description = 'Each gauge runs from the low end of the range to 100%. The tick marks the target.',
  domain = [90, 100],
  riskMargin = 1,
  size = 148,
  animate = true,
}: SlaRingsProps) {
  const reduced = usePrefersReducedMotion();
  const [run, setRun] = useState(0);
  const resolveKey = useCallback((key: string, i: number) => linearKey(key, i, items.length), [items.length]);
  const { active, setActive, onKeyDown, register } = useRovingFocus(items.length, resolveKey);
  const focused = items[active];
  const announcement = focused
    ? `${focused.label}: ${fmtPct(focused.actual)} against a ${fmtPct(focused.target, 0)} target, ${STATE_LABEL[slaState(focused.actual, focused.target, riskMargin)]}`
    : '';

  return (
    <ChartShell
      title={title}
      description={description}
      height="auto"
      announcement={announcement}
      toolbar={
        animate && !reduced ? (
          <button type="button" className="btn btn--ghost" onClick={() => setRun((r) => r + 1)}>
            Replay
          </button>
        ) : undefined
      }
      legend={
        <Legend
          label="Status"
          items={(['met', 'at-risk', 'breached'] as SlaState[]).map((s) => ({
            key: s,
            label: STATE_LABEL[s],
            color: STATE_COLOR[s],
            shape: 'line' as const,
          }))}
        />
      }
      table={{
        caption: title,
        rows: items,
        rowKey: (r) => r.id,
        columns: [
          { key: 'label', header: 'Objective', render: (r) => r.label },
          { key: 'actual', header: 'Measured', numeric: true, render: (r) => fmtPct(r.actual) },
          { key: 'target', header: 'Target', numeric: true, render: (r) => fmtPct(r.target, 0) },
          { key: 'state', header: 'Status', render: (r) => STATE_LABEL[slaState(r.actual, r.target, riskMargin)] },
          { key: 'detail', header: 'Measures', render: (r) => r.detail ?? '' },
        ],
      }}
    >
      {() => (
        <div className="rings" role="group" aria-label={`${title}. Arrow keys move between objectives.`} onKeyDown={onKeyDown}>
          {items.map((item, i) => (
            <Ring
              key={`${item.id}-${run}`}
              item={item}
              size={size}
              domain={domain}
              state={slaState(item.actual, item.target, riskMargin)}
              animate={animate && !reduced}
              delay={i * 70}
              tabIndex={i === active ? 0 : -1}
              refCallback={register(i)}
              onFocus={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </ChartShell>
  );
}

interface RingProps {
  item: SlaItem;
  size: number;
  domain: readonly [number, number];
  state: SlaState;
  animate: boolean;
  delay: number;
  tabIndex: number;
  refCallback: (el: SVGElement | null) => void;
  onFocus: () => void;
}

function Ring({ item, size, domain, state, animate, delay, tabIndex, refCallback, onFocus }: RingProps) {
  const [drawn, setDrawn] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    const id = window.setTimeout(() => setDrawn(true), 30 + delay);
    return () => window.clearTimeout(id);
  }, [animate, delay]);
  const shownValue = useCountUp(item.actual, 900, animate);

  const r = size / 2;
  const thickness = Math.max(6, size * 0.065);
  const outer = r - 4;
  const inner = outer - thickness;
  const valueAngle = angleFor(item.actual, domain);
  const targetAngle = angleFor(item.target, domain);
  const track = arcPath(inner, outer, SWEEP_START, SWEEP_END);
  const value = arcPath(inner, outer, SWEEP_START, valueAngle);
  const tick = (a: number, from: number, to: number) => ({
    x1: Math.sin(a) * from,
    y1: -Math.cos(a) * from,
    x2: Math.sin(a) * to,
    y2: -Math.cos(a) * to,
  });
  const endLabel = (a: number) => ({ x: Math.sin(a) * (outer - 2), y: -Math.cos(a) * (outer - 2) + 18 });
  const lo = endLabel(SWEEP_START);
  const hi = endLabel(SWEEP_END);

  return (
    <div className="ring">
      <svg
        ref={refCallback}
        width={size}
        height={size}
        viewBox={`${-r} ${-r} ${size} ${size}`}
        tabIndex={tabIndex}
        role="img"
        aria-label={`${item.label}: ${fmtPct(item.actual)}, target ${fmtPct(item.target, 0)}, ${STATE_LABEL[state]}`}
        onFocus={onFocus}
        className="ring__svg"
      >
        <path d={track} fill="var(--viz-track)" />
        <path
          d={value}
          fill={STATE_COLOR[state]}
          className="ring__value"
        />
        {animate && <RingSweep inner={inner} outer={outer} drawn={drawn} end={valueAngle} />}
        <line {...tick(targetAngle, inner - 5, outer + 3)} className="ring__target" />
        <text x={lo.x} y={lo.y} textAnchor="middle" className="axis-label">
          {domain[0]}
        </text>
        <text x={hi.x} y={hi.y} textAnchor="middle" className="axis-label">
          {domain[1]}
        </text>
        <text y={-2} textAnchor="middle" className="ring__number">
          {shownValue.toFixed(1)}
          <tspan className="ring__unit">%</tspan>
        </text>
        <text y={18} textAnchor="middle" className="ring__sub">
          target {item.target}%
        </text>
      </svg>
      <div className="ring__label">
        <span>{item.label}</span>
        <span className={`status status--${state}`}>
          <StatusIcon state={state} />
          {STATE_LABEL[state]}
        </span>
      </div>
    </div>
  );
}

/**
 * Draw-in: a mask arc that grows from the start angle to the value angle with a CSS transition
 * on stroke-dashoffset. The value arc underneath stays exact; only its reveal animates.
 */
function RingSweep({ inner, outer, drawn, end }: { inner: number; outer: number; drawn: boolean; end: number }) {
  const mid = (inner + outer) / 2;
  const span = end - SWEEP_START;
  const len = Math.max(0.001, span * mid);
  const start = { x: Math.sin(SWEEP_START) * mid, y: -Math.cos(SWEEP_START) * mid };
  const stop = { x: Math.sin(end) * mid, y: -Math.cos(end) * mid };
  const large = span > Math.PI ? 1 : 0;
  return (
    <path
      d={`M${start.x},${start.y}A${mid},${mid} 0 ${large} 1 ${stop.x},${stop.y}`}
      fill="none"
      stroke="var(--viz-track)"
      strokeWidth={outer - inner + 2}
      strokeDasharray={`${len} ${len}`}
      strokeDashoffset={drawn ? -len : 0}
      className="ring__sweep"
      aria-hidden="true"
    />
  );
}

function StatusIcon({ state }: { state: SlaState }) {
  if (state === 'met')
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 6.2 5 8.6 9.5 3.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (state === 'at-risk')
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 1.8 10.8 10H1.2Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M6 5v2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 3l6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
