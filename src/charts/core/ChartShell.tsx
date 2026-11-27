import { useState, type ReactNode } from 'react';
import { useElementSize, useStableId, type Size } from './hooks';
import { hexagonPath } from './geometry';

export interface TableColumn<Row> {
  key: string;
  header: string;
  /** Right-align numeric columns. */
  numeric?: boolean;
  render: (row: Row) => ReactNode;
}

export interface TableSpec<Row> {
  caption: string;
  columns: TableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
}

export interface ChartShellProps<Row> {
  /** Accessible name of the chart, also the visible heading. */
  title: string;
  /** One sentence describing what the chart shows; read after the title by screen readers. */
  description?: string;
  /** Height of the plot area in px, or 'auto' to let the content size it. Width always follows the container. */
  height: number | 'auto';
  table: TableSpec<Row>;
  /** Controls rendered left of the table toggle (segmented controls, reset buttons). */
  toolbar?: ReactNode;
  /** Rendered under the toolbar, above the plot. */
  legend?: ReactNode;
  /** Text for the polite live region, usually the focused data point. */
  announcement?: string;
  defaultView?: 'chart' | 'table';
  children: (size: Size) => ReactNode;
}

/**
 * The frame every Atlas chart sits in: heading, toolbar, legend, the measured plot area,
 * a "View as table" switch, and a live region for keyboard users.
 */
export function ChartShell<Row>({
  title,
  description,
  height,
  table,
  toolbar,
  legend,
  announcement,
  defaultView = 'chart',
  children,
}: ChartShellProps<Row>) {
  const [view, setView] = useState(defaultView);
  const [plotRef, size] = useElementSize<HTMLDivElement>({ width: 640, height: height === 'auto' ? 0 : height });
  const titleId = useStableId('chart-title');
  const descId = useStableId('chart-desc');
  const isTable = view === 'table';

  return (
    <figure className="chart" aria-labelledby={titleId} aria-describedby={description ? descId : undefined}>
      <header className="chart__head">
        <div className="chart__titles">
          <figcaption id={titleId} className="chart__title">
            {title}
          </figcaption>
          {description && (
            <p id={descId} className="chart__desc">
              {description}
            </p>
          )}
        </div>
        <div className="chart__tools">
          {!isTable && toolbar}
          <button
            type="button"
            className="switch"
            aria-pressed={isTable}
            onClick={() => setView(isTable ? 'chart' : 'table')}
          >
            <span className="switch__track" aria-hidden="true">
              <span className="switch__thumb" />
            </span>
            View as table
          </button>
        </div>
      </header>
      {!isTable && legend}
      {isTable ? (
        <DataTable {...table} />
      ) : (
        <div ref={plotRef} className="chart__plot" style={height === 'auto' ? undefined : { height }}>
          {children({ width: size.width, height: height === 'auto' ? size.height : height })}
        </div>
      )}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isTable ? '' : announcement ?? ''}
      </p>
    </figure>
  );
}

export function DataTable<Row>({ caption, columns, rows, rowKey }: TableSpec<Row>) {
  return (
    <div className="data-table" tabIndex={0} role="region" aria-label={caption}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.numeric ? 'num' : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)}>
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? 'num' : undefined}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface TooltipProps {
  x: number;
  y: number;
  /** Width of the plot, used to flip the tooltip so it never leaves the frame. */
  bound: number;
  children: ReactNode;
}

export function Tooltip({ x, y, bound, children }: TooltipProps) {
  const flip = x > bound - 220;
  return (
    <div
      className="tooltip"
      role="presentation"
      style={{
        transform: `translate(${flip ? x - 14 : x + 14}px, ${y}px) translate(${flip ? '-100%' : '0'}, -50%)`,
      }}
    >
      {children}
    </div>
  );
}

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  /** Optional mark shape for non-colour encoding. */
  shape?: 'square' | 'circle' | 'hexagon' | 'line' | 'ring';
  note?: string;
}

export function Legend({ items, label }: { items: LegendItem[]; label: string }) {
  return (
    <ul className="legend" aria-label={label}>
      {items.map((item) => (
        <li key={item.key}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <LegendGlyph shape={item.shape ?? 'square'} color={item.color} />
          </svg>
          <span>{item.label}</span>
          {item.note && <span className="legend__note">{item.note}</span>}
        </li>
      ))}
    </ul>
  );
}

function LegendGlyph({ shape, color }: { shape: NonNullable<LegendItem['shape']>; color: string }) {
  switch (shape) {
    case 'circle':
      return <circle cx="7" cy="7" r="5" fill={color} />;
    case 'ring':
      return <circle cx="7" cy="7" r="4.5" fill="none" stroke={color} strokeWidth="2" />;
    case 'hexagon':
      return <path d={hexagonPath(7, 7, 6)} fill={color} />;
    case 'line':
      return <line x1="1" y1="7" x2="13" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />;
    default:
      return <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" fill={color} />;
  }
}
