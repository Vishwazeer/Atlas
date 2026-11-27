import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force';

export type GraphKind = 'cluster' | 'server' | 'database';
export type GraphStatus = 'healthy' | 'degraded' | 'critical' | 'offline';

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphKind;
  status: GraphStatus;
}
export interface GraphLink {
  source: string;
  target: string;
}

export type SimNode<N extends GraphNode> = N & SimulationNodeDatum & { x: number; y: number };
export type SimLink<N extends GraphNode> = SimulationLinkDatum<SimNode<N>> & { source: SimNode<N>; target: SimNode<N> };

export const STATUS_COLOR: Record<GraphStatus, string> = {
  healthy: 'var(--viz-ok)',
  degraded: 'var(--viz-warn)',
  critical: 'var(--viz-crit)',
  offline: 'var(--viz-off)',
};

export const NODE_RADIUS: Record<GraphKind, number> = { cluster: 14, server: 6.5, database: 5.5 };

const LINK_DISTANCE = (a: GraphKind, b: GraphKind) => {
  if (a === 'cluster' && b === 'cluster') return 150;
  if (a === 'cluster' || b === 'cluster') return 58;
  return 26;
};

/**
 * Builds a force simulation and settles it synchronously, so the first paint is already a calm layout
 * (and identical on every load: d3-force seeds its own jitter deterministically).
 */
export function createLayout<N extends GraphNode>(nodes: readonly N[], links: readonly GraphLink[], ticks = 320) {
  const simNodes = nodes.map((n) => ({ ...n })) as SimNode<N>[];
  const byId = new Map(simNodes.map((n) => [n.id, n]));
  const simLinks = links.flatMap((l) => {
    const source = byId.get(l.source);
    const target = byId.get(l.target);
    return source && target ? [{ source, target } as SimLink<N>] : [];
  });

  const simulation: Simulation<SimNode<N>, SimLink<N>> = forceSimulation<SimNode<N>, SimLink<N>>(simNodes)
    .force(
      'link',
      forceLink<SimNode<N>, SimLink<N>>(simLinks)
        .id((d) => d.id)
        .distance((l) => LINK_DISTANCE(l.source.kind, l.target.kind))
        .strength((l) => (l.source.kind === 'cluster' && l.target.kind === 'cluster' ? 0.25 : 0.9)),
    )
    .force('charge', forceManyBody<SimNode<N>>().strength((d) => (d.kind === 'cluster' ? -520 : -90)))
    .force('collide', forceCollide<SimNode<N>>().radius((d) => NODE_RADIUS[d.kind] + 5))
    .force('x', forceX<SimNode<N>>(0).strength(0.06))
    .force('y', forceY<SimNode<N>>(0).strength(0.09))
    .stop();

  for (let i = 0; i < ticks; i++) simulation.tick();
  return { simulation, nodes: simNodes, links: simLinks, byId };
}

export function bounds(nodes: readonly { x: number; y: number }[], pad = 24) {
  if (nodes.length === 0) return { x0: -1, y0: -1, x1: 1, y1: 1 };
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const n of nodes) {
    x0 = Math.min(x0, n.x);
    y0 = Math.min(y0, n.y);
    x1 = Math.max(x1, n.x);
    y1 = Math.max(y1, n.y);
  }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

/** Scale + translate that fits the layout into a width x height viewport. */
export function fitTransform(b: ReturnType<typeof bounds>, width: number, height: number, maxScale = 1.6) {
  const k = Math.min(maxScale, Math.min(width / (b.x1 - b.x0), height / (b.y1 - b.y0)));
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  return { k, x: width / 2 - cx * k, y: height / 2 - cy * k };
}
