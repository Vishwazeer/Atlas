import { createRng } from './rng';

export type NodeKind = 'cluster' | 'server' | 'database';
export type NodeStatus = 'healthy' | 'degraded' | 'critical' | 'offline';

export interface TopologyNode {
  id: string;
  label: string;
  kind: NodeKind;
  status: NodeStatus;
  /** Cluster the node belongs to (a cluster belongs to itself). */
  group: string;
  /** Protected data in TB. */
  protectedTb: number;
}

export interface TopologyLink {
  source: string;
  target: string;
}

export interface Topology {
  nodes: TopologyNode[];
  links: TopologyLink[];
}

const CLUSTERS = ['eu-west', 'us-east', 'ap-south', 'us-west'] as const;

function statusFrom(roll: number): NodeStatus {
  if (roll < 0.74) return 'healthy';
  if (roll < 0.88) return 'degraded';
  if (roll < 0.96) return 'critical';
  return 'offline';
}

export function generateTopology(seed = 7): Topology {
  const rng = createRng(seed);
  const nodes: TopologyNode[] = [];
  const links: TopologyLink[] = [];

  CLUSTERS.forEach((name, ci) => {
    const clusterId = `c-${name}`;
    const short = name.split('-')[0] ?? name;
    nodes.push({ id: clusterId, label: name, kind: 'cluster', status: 'healthy', group: clusterId, protectedTb: 0 });
    if (ci > 0) links.push({ source: clusterId, target: `c-${CLUSTERS[ci - 1]}` });

    const servers = rng.int(4, 6);
    for (let s = 0; s < servers; s++) {
      const serverId = `${clusterId}-s${s + 1}`;
      nodes.push({
        id: serverId,
        label: `${short}-node-${String(s + 1).padStart(2, '0')}`,
        kind: 'server',
        status: statusFrom(rng.next()),
        group: clusterId,
        protectedTb: Math.round(rng.range(4, 40) * 10) / 10,
      });
      links.push({ source: clusterId, target: serverId });

      const dbs = rng.next() < 0.6 ? rng.int(1, 2) : 0;
      for (let d = 0; d < dbs; d++) {
        const dbId = `${serverId}-db${d + 1}`;
        const engine = rng.pick(['pg', 'mongo', 'mssql', 'oracle'] as const);
        nodes.push({
          id: dbId,
          label: `${engine}-${short}-${s + 1}${String.fromCharCode(97 + d)}`,
          kind: 'database',
          status: statusFrom(rng.next()),
          group: clusterId,
          protectedTb: Math.round(rng.range(0.5, 12) * 10) / 10,
        });
        links.push({ source: serverId, target: dbId });
      }
    }
  });

  // Close the ring of regions: a replication path between the first and last cluster.
  links.push({ source: `c-${CLUSTERS[0]}`, target: `c-${CLUSTERS[CLUSTERS.length - 1]}` });

  // A cluster is critical when two or more members are critical or offline, degraded when any member is unwell.
  for (const cluster of nodes.filter((n) => n.kind === 'cluster')) {
    const members = nodes.filter((n) => n.group === cluster.id && n.kind !== 'cluster');
    const severe = members.filter((n) => n.status === 'critical' || n.status === 'offline').length;
    const unwell = members.some((n) => n.status !== 'healthy');
    cluster.status = severe >= 2 ? 'critical' : unwell ? 'degraded' : 'healthy';
    cluster.protectedTb = Math.round(members.reduce((acc, n) => acc + n.protectedTb, 0) * 10) / 10;
  }
  return { nodes, links };
}

/** Adjacency lookup: id -> set of neighbour ids. */
export function buildNeighbours(links: readonly TopologyLink[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    let set = map.get(a);
    if (!set) {
      set = new Set();
      map.set(a, set);
    }
    set.add(b);
  };
  for (const l of links) {
    add(l.source, l.target);
    add(l.target, l.source);
  }
  return map;
}
