import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { ChartShell, Legend, Tooltip } from '../core/ChartShell';
import { useRovingFocus } from '../core/hooks';
import { linearKey } from '../core/navigation';
import { hexagonPath } from '../core/geometry';
import { bounds, createLayout, fitTransform, NODE_RADIUS, STATUS_COLOR, type GraphLink, type GraphNode, type GraphStatus, type SimNode } from './layout';

export interface TopologyGraphProps<N extends GraphNode> {
  nodes: N[];
  links: GraphLink[];
  title?: string;
  description?: string;
  height?: number;
  /** Extra tooltip / table rows for a node. */
  detail?: (node: N) => ReactNode;
  detailText?: (node: N) => string;
  /** Called when a node is selected by click, Enter or Space. */
  onSelect?: (node: N | null) => void;
}

const STATUS_LABEL: Record<GraphStatus, string> = { healthy: 'Healthy', degraded: 'Degraded', critical: 'Critical', offline: 'Offline' };
const KIND_LABEL = { cluster: 'Cluster', server: 'Server', database: 'Database' } as const;

export function TopologyGraph<N extends GraphNode>({
  nodes,
  links,
  title = 'Protected infrastructure',
  description = 'Clusters, servers and databases joined by backup paths. Drag nodes to rearrange; pinch or Ctrl + scroll to zoom.',
  height = 460,
  detail,
  detailText,
  onSelect,
}: TopologyGraphProps<N>) {
  const layout = useMemo(() => createLayout(nodes, links), [nodes, links]);
  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of layout.links) {
      if (!map.has(l.source.id)) map.set(l.source.id, new Set());
      if (!map.has(l.target.id)) map.set(l.target.id, new Set());
      map.get(l.source.id)?.add(l.target.id);
      map.get(l.target.id)?.add(l.source.id);
    }
    return map;
  }, [layout]);

  const [, setFrame] = useState(0);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [hover, setHover] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const sizeRef = useRef({ width: 0, height });
  const dragging = useRef<{ node: SimNode<N>; pointerId: number } | null>(null);

  useEffect(() => {
    const sim = layout.simulation;
    sim.on('tick', () => setFrame((f) => f + 1));
    return () => {
      sim.on('tick', null);
      sim.stop();
    };
  }, [layout]);

  const fit = useCallback(() => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (!svg || !z) return;
    const { width, height: h } = sizeRef.current;
    const t = fitTransform(bounds(layout.nodes), width, h);
    select(svg).call(z.transform, zoomIdentity.translate(t.x, t.y).scale(t.k));
  }, [layout]);

  const zoomBy = useCallback((factor: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (svg && z) select(svg).call(z.scaleBy, factor);
  }, []);

  const resolveKey = useCallback((key: string, i: number) => linearKey(key, i, layout.nodes.length), [layout.nodes.length]);
  const { active, setActive, onKeyDown, register } = useRovingFocus(layout.nodes.length, resolveKey);

  const highlight = hover ?? focusedId ?? selected;
  const near = highlight ? neighbours.get(highlight) : undefined;
  const isLit = (id: string) => !highlight || id === highlight || Boolean(near?.has(id));

  const choose = (node: SimNode<N>) => {
    const next = selected === node.id ? null : node.id;
    setSelected(next);
    const original = nodes.find((n) => n.id === next) ?? null;
    onSelect?.(original);
  };

  const clearSelection = () => {
    if (selected === null) return;
    setSelected(null);
    onSelect?.(null);
  };

  const focusedNode = layout.nodes[active];
  const announcement = focusedNode
    ? `${KIND_LABEL[focusedNode.kind]} ${focusedNode.label}, ${STATUS_LABEL[focusedNode.status]}, ${neighbours.get(focusedNode.id)?.size ?? 0} connections${detailText ? `, ${detailText(focusedNode)}` : ''}`
    : '';

  const tipNode = layout.byId.get(hover ?? focusedId ?? '');

  return (
    <ChartShell
      title={title}
      description={description}
      height={height}
      announcement={announcement}
      toolbar={
        <div className="segmented" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.3)}>
            −
          </button>
          <button type="button" onClick={fit}>
            Fit
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.3)}>
            +
          </button>
        </div>
      }
      legend={
        <Legend
          label="Node kinds and status"
          items={[
            { key: 'cluster', label: 'Cluster', color: 'var(--text-muted)', shape: 'hexagon' },
            { key: 'server', label: 'Server', color: 'var(--text-muted)', shape: 'circle' },
            { key: 'database', label: 'Database', color: 'var(--text-muted)', shape: 'square' },
            ...(['healthy', 'degraded', 'critical', 'offline'] as GraphStatus[]).map((s) => ({
              key: s,
              label: STATUS_LABEL[s],
              color: STATUS_COLOR[s],
              shape: s === 'healthy' || s === 'offline' ? ('ring' as const) : ('circle' as const),
            })),
          ]}
        />
      }
      table={{
        caption: `${title}: nodes and their connections`,
        rows: layout.nodes,
        rowKey: (n) => n.id,
        columns: [
          { key: 'label', header: 'Node', render: (n) => n.label },
          { key: 'kind', header: 'Kind', render: (n) => KIND_LABEL[n.kind] },
          { key: 'status', header: 'Status', render: (n) => STATUS_LABEL[n.status] },
          {
            key: 'links',
            header: 'Connected to',
            render: (n) =>
              [...(neighbours.get(n.id) ?? [])]
                .map((id) => layout.byId.get(id)?.label ?? id)
                .join(', '),
          },
          ...(detailText ? [{ key: 'detail', header: 'Detail', render: (n: SimNode<N>) => detailText(n) }] : []),
        ],
      }}
    >
      {({ width, height: h }) => (
        <ZoomSurface
          width={width}
          height={h}
          svgRef={svgRef}
          zoomRef={zoomRef}
          sizeRef={sizeRef}
          onZoom={setTransform}
          fit={fit}
        >
          <svg
            ref={svgRef}
            width={width}
            height={h}
            className="topology"
            role="group"
            aria-label={`${title}, ${layout.nodes.length} nodes. Arrow keys move between nodes, Enter selects, plus and minus zoom.`}
            onKeyDown={(e) => {
              if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                zoomBy(1.3);
                return;
              }
              if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                zoomBy(1 / 1.3);
                return;
              }
              if (e.key === '0') {
                e.preventDefault();
                fit();
                return;
              }
              onKeyDown(e);
            }}
          >
            <rect width={width} height={h} fill="transparent" onClick={clearSelection} aria-hidden="true" />
            <g transform={transform.toString()}>
              <g aria-hidden="true">
                {layout.links.map((l) => {
                  const lit = highlight !== null && (l.source.id === highlight || l.target.id === highlight);
                  const replication = l.source.kind === 'cluster' && l.target.kind === 'cluster';
                  return (
                    <line
                      key={`${l.source.id}-${l.target.id}`}
                      x1={l.source.x}
                      y1={l.source.y}
                      x2={l.target.x}
                      y2={l.target.y}
                      className={`edge${replication ? ' edge--replication' : ''}${lit ? ' is-lit' : ''}${highlight && !lit ? ' dimmed' : ''}`}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </g>
              {layout.nodes.map((n, i) => {
                const r = NODE_RADIUS[n.kind];
                const color = STATUS_COLOR[n.status];
                const hollow = n.status === 'healthy' || n.status === 'offline';
                const common = {
                  fill: hollow ? 'var(--bg-raised)' : color,
                  stroke: color,
                  strokeWidth: n.kind === 'cluster' ? 2 : 1.5,
                  strokeDasharray: n.status === 'offline' ? '2 2' : undefined,
                };
                return (
                  <g
                    key={n.id}
                    ref={register(i)}
                    transform={`translate(${n.x},${n.y})`}
                    className={`node node--${n.kind}${isLit(n.id) ? '' : ' dimmed'}${selected === n.id ? ' is-selected' : ''}`}
                    data-node={n.id}
                    tabIndex={i === active ? 0 : -1}
                    role="img"
                    aria-label={`${KIND_LABEL[n.kind]} ${n.label}, ${STATUS_LABEL[n.status]}`}
                    onPointerEnter={() => setHover(n.id)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => {
                      setActive(i);
                      setFocusedId(n.id);
                    }}
                    onBlur={() => setFocusedId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        choose(n);
                      }
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      (e.currentTarget as SVGGElement).setPointerCapture?.(e.pointerId);
                      dragging.current = { node: n, pointerId: e.pointerId };
                      n.fx = n.x;
                      n.fy = n.y;
                      layout.simulation.alphaTarget(0.25).restart();
                    }}
                    onPointerMove={(e) => {
                      const d = dragging.current;
                      if (!d || d.pointerId !== e.pointerId || !svgRef.current) return;
                      const rect = svgRef.current.getBoundingClientRect();
                      const [sx, sy] = transform.invert([e.clientX - rect.left, e.clientY - rect.top]);
                      d.node.fx = sx;
                      d.node.fy = sy;
                    }}
                    onPointerUp={(e) => {
                      const d = dragging.current;
                      if (!d) return;
                      const moved = Math.hypot((d.node.fx ?? d.node.x) - d.node.x, (d.node.fy ?? d.node.y) - d.node.y) > 0.5;
                      d.node.fx = null;
                      d.node.fy = null;
                      dragging.current = null;
                      layout.simulation.alphaTarget(0);
                      (e.currentTarget as SVGGElement).releasePointerCapture?.(e.pointerId);
                      if (!moved) choose(n);
                    }}
                  >
                    <circle r={r + 10} fill="transparent" />
                    {(focusedId === n.id || selected === n.id) && <circle r={r + 5} className="node__ring" />}
                    {n.kind === 'cluster' && <path d={hexagonPath(0, 0, r)} {...common} />}
                    {n.kind === 'server' && <circle r={r} {...common} />}
                    {n.kind === 'database' && <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={2} {...common} />}
                    {n.kind === 'cluster' && (
                      <text y={r + 15} textAnchor="middle" className="node__label">
                        {n.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
          {tipNode && (
            <Tooltip x={transform.applyX(tipNode.x)} y={transform.applyY(tipNode.y)} bound={width}>
              <span className="tooltip__title">{tipNode.label}</span>
              <span className="tooltip__row">
                <span>{KIND_LABEL[tipNode.kind]}</span>
                <strong className={`status status--${tipNode.status}`}>{STATUS_LABEL[tipNode.status]}</strong>
              </span>
              <span className="tooltip__row">
                <span>Connections</span>
                <strong>{neighbours.get(tipNode.id)?.size ?? 0}</strong>
              </span>
              {detail?.(tipNode)}
            </Tooltip>
          )}
        </ZoomSurface>
      )}
    </ChartShell>
  );
}

interface ZoomSurfaceProps {
  width: number;
  height: number;
  svgRef: React.RefObject<SVGSVGElement | null>;
  zoomRef: React.RefObject<ZoomBehavior<SVGSVGElement, unknown> | null>;
  sizeRef: React.RefObject<{ width: number; height: number }>;
  onZoom: (t: ZoomTransform) => void;
  fit: () => void;
  children: ReactNode;
}

/** Wires d3-zoom to the svg once, and refits whenever the plot is resized. */
function ZoomSurface({ width, height, svgRef, zoomRef, sizeRef, onZoom, fit, children }: ZoomSurfaceProps) {
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .filter((event: Event) => {
        const target = event.target as Element | null;
        if (target?.closest?.('[data-node]')) return false;
        const e = event as MouseEvent;
        // Wheel zooms only with Ctrl/Cmd (trackpad pinch sends ctrlKey), so the page still scrolls past the chart.
        if (event.type === 'wheel') return e.ctrlKey || e.metaKey;
        return !e.ctrlKey && !e.button;
      })
      .on('zoom', (event: { transform: ZoomTransform }) => onZoom(event.transform));
    zoomRef.current = z;
    select(svg).call(z).on('dblclick.zoom', null);
    return () => {
      select(svg).on('.zoom', null);
      zoomRef.current = null;
    };
  }, [svgRef, zoomRef, onZoom]);

  useEffect(() => {
    sizeRef.current = { width, height };
    zoomRef.current?.extent([
      [0, 0],
      [width, height],
    ]);
    fit();
  }, [width, height, sizeRef, zoomRef, fit]);

  return <>{children}</>;
}
