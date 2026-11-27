import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChartShell, Legend, Tooltip } from '../core/ChartShell';
import { useRovingFocus } from '../core/hooks';
import { linearKey } from '../core/navigation';
import { fmtCompact, fmtInt, fmtPct } from '../core/format';
import { layoutTreemap, leafRows, resolvePath, sumHierarchy, type TreeDatum } from './treemap';

export interface TreemapCategory {
  key: string;
  label: string;
  color: string;
}

export interface DataTreemapProps<T extends TreeDatum> {
  data: T;
  /** Category of a leaf, which picks its colour. */
  categoryOf: (leaf: T) => string;
  categories: TreemapCategory[];
  title?: string;
  description?: string;
  valueLabel?: string;
  /** Names of the levels below the root, used in breadcrumbs and the table. */
  levels?: string[];
  initialPath?: string[];
  onPathChange?: (path: string[]) => void;
  height?: number;
}

export function DataTreemap<T extends TreeDatum>({
  data,
  categoryOf,
  categories,
  title = 'Where sensitive data lives',
  description = 'Area is the number of sensitive records. Select a block to open it; the trail above goes back.',
  valueLabel = 'Records',
  levels = ['Region', 'System', 'Data class'],
  initialPath = [],
  onPathChange,
  height = 380,
}: DataTreemapProps<T>) {
  const [rawPath, setRawPath] = useState<string[]>(initialPath);
  const { node, path } = useMemo(() => resolvePath(data, rawPath), [data, rawPath]);
  const [hover, setHover] = useState<string | null>(null);
  const colorOf = useMemo(() => {
    const map = new Map(categories.map((c) => [c.key, c.color]));
    return (leaf: T) => map.get(categoryOf(leaf)) ?? 'var(--viz-ink)';
  }, [categories, categoryOf]);

  const summed = useMemo(() => sumHierarchy(node), [node]);
  const groups = summed.children ?? [];
  const total = summed.value ?? 0;
  const levelName = levels[path.length] ?? 'Item';

  const resolveKey = useCallback(
    (key: string, i: number) => linearKey(key, i, groups.length),
    [groups.length],
  );
  const { active, setActive, onKeyDown, register, focusAt } = useRovingFocus(groups.length, resolveKey);

  // After a drill or climb, move focus to the first block once the new level has rendered.
  const refocus = useRef(false);
  const pathKey = path.join('/');
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    focusAt(0);
  }, [pathKey, focusAt]);

  const go = (next: string[]) => {
    setRawPath(next);
    setHover(null);
    setActive(0);
    onPathChange?.(next);
    refocus.current = true;
  };
  const drill = (name: string) => {
    const child = node.children?.find((c) => c.name === name);
    if (child?.children) go([...path, name]);
  };

  const focused = groups[active];
  const announcement = focused
    ? `${focused.data.name}: ${fmtInt(focused.value ?? 0)} ${valueLabel.toLowerCase()}, ${fmtPct(((focused.value ?? 0) / Math.max(total, 1)) * 100)} of ${node.name}${focused.children && path.length < levels.length - 1 ? '. Press Enter to open.' : ''}`
    : '';
  const rows = useMemo(() => leafRows(summed), [summed]);

  return (
    <ChartShell
      title={title}
      description={description}
      height={height}
      announcement={announcement}
      legend={
        <>
          <nav className="crumbs" aria-label="Treemap level">
            <ol>
              {[data.name, ...path].map((name, i, arr) => (
                <li key={`${name}-${i}`}>
                  {i < arr.length - 1 ? (
                    <button type="button" onClick={() => go(path.slice(0, i))}>
                      {name}
                    </button>
                  ) : (
                    <span aria-current="location">{name}</span>
                  )}
                </li>
              ))}
            </ol>
            <span className="crumbs__meta">
              {groups.length} {levelName.toLowerCase()}
              {groups.length === 1 ? '' : 's'}, {fmtCompact(total)} {valueLabel.toLowerCase()}
            </span>
          </nav>
          <Legend label="Data class" items={categories.map((c) => ({ key: c.key, label: c.label, color: c.color }))} />
        </>
      }
      table={{
        caption: `${title}: ${[data.name, ...path].join(' / ')}`,
        rows,
        rowKey: (r, i) => `${r.location}-${r.leaf.data.name}-${i}`,
        columns: [
          { key: 'loc', header: levels.slice(path.length, -1).join(' / ') || 'Location', render: (r) => r.location || node.name },
          { key: 'class', header: levels[levels.length - 1] ?? 'Class', render: (r) => r.leaf.data.name },
          { key: 'value', header: valueLabel, numeric: true, render: (r) => fmtInt(r.value) },
          { key: 'share', header: 'Share', numeric: true, render: (r) => fmtPct(r.share) },
        ],
      }}
    >
      {({ width, height: h }) => {
        const root = layoutTreemap(node, width, h);
        const depth1 = root.children ?? [];
        const leaves = root.leaves();
        const hovered = hover ? depth1.find((g) => g.data.name === hover) : undefined;

        return (
          <>
            <svg
              width={width}
              height={h}
              role="group"
              aria-label={`${title}: ${node.name}. Arrow keys move between blocks, Enter opens, Escape goes back.`}
              onKeyDown={(e) => {
                if ((e.key === 'Escape' || e.key === 'Backspace') && path.length > 0) {
                  e.preventDefault();
                  go(path.slice(0, -1));
                  return;
                }
                onKeyDown(e);
              }}
              onPointerLeave={() => setHover(null)}
              className="treemap"
            >
              {leaves.map((leaf, i) => {
                const owner = leaf.ancestors().find((a) => a.depth === 1) ?? leaf;
                const w = leaf.x1 - leaf.x0;
                const lh = leaf.y1 - leaf.y0;
                const dim = hover !== null && owner.data.name !== hover;
                return (
                  <g key={`${owner.data.name}-${leaf.parent?.data.name}-${leaf.data.name}-${i}`} className={dim ? 'dimmed' : undefined} aria-hidden="true">
                    <rect x={leaf.x0} y={leaf.y0} width={Math.max(0, w)} height={Math.max(0, lh)} rx={3} fill={colorOf(leaf.data)} className="treemap__leaf" />
                    {w > 64 && lh > 34 && leaf.depth > 1 && (
                      <text x={leaf.x0 + 7} y={leaf.y1 - 8} className="treemap__leaf-label">
                        {leaf.data.name}
                      </text>
                    )}
                    {leaf.depth === 1 && w > 64 && lh > 34 && (
                      <text x={leaf.x0 + 7} y={leaf.y0 + 16} className="treemap__leaf-label">
                        {leaf.data.name} <tspan className="treemap__value">{fmtCompact(leaf.value ?? 0)}</tspan>
                      </text>
                    )}
                  </g>
                );
              })}
              {depth1.map((g, i) => {
                const w = g.x1 - g.x0;
                const gh = g.y1 - g.y0;
                const canOpen = Boolean(g.children);
                return (
                  <g key={g.data.name}>
                    {g.children && w > 40 && (
                      <text x={g.x0 + 2} y={g.y0 + 14} className="treemap__group-label" aria-hidden="true">
                        {g.data.name}
                        {w > 140 && <tspan className="treemap__value"> {fmtCompact(g.value ?? 0)}</tspan>}
                      </text>
                    )}
                    <rect
                      ref={register(i)}
                      x={g.x0}
                      y={g.y0}
                      width={Math.max(0, w)}
                      height={Math.max(0, gh)}
                      rx={4}
                      className={`treemap__group${canOpen ? ' is-openable' : ''}`}
                      tabIndex={i === active ? 0 : -1}
                      role={canOpen ? 'button' : 'img'}
                      aria-label={`${g.data.name}: ${fmtInt(g.value ?? 0)} ${valueLabel.toLowerCase()}, ${fmtPct(((g.value ?? 0) / Math.max(total, 1)) * 100)}`}
                      onPointerEnter={() => setHover(g.data.name)}
                      onFocus={() => {
                        setActive(i);
                        setHover(g.data.name);
                      }}
                      onBlur={() => setHover(null)}
                      onClick={() => drill(g.data.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          drill(g.data.name);
                        }
                      }}
                    />
                  </g>
                );
              })}
            </svg>
            {hovered && (
              <Tooltip x={Math.min(hovered.x1 - 8, hovered.x0 + (hovered.x1 - hovered.x0) / 2)} y={hovered.y0 + Math.min(60, (hovered.y1 - hovered.y0) / 2)} bound={width}>
                <span className="tooltip__title">{[...path, hovered.data.name].join(' / ')}</span>
                <span className="tooltip__row">
                  <span>{valueLabel}</span>
                  <strong>{fmtInt(hovered.value ?? 0)}</strong>
                </span>
                <span className="tooltip__row">
                  <span>Share of {node.name}</span>
                  <strong>{fmtPct(((hovered.value ?? 0) / Math.max(total, 1)) * 100)}</strong>
                </span>
                {hovered.children && <span className="tooltip__muted">Select to open</span>}
              </Tooltip>
            )}
          </>
        );
      }}
    </ChartShell>
  );
}
