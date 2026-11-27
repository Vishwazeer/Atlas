import { useMemo, useState } from 'react';
import { TopologyGraph } from '../../charts';
import { DocPage } from '../../components/DocPage';
import { generateTopology, type TopologyNode } from '../../data';
import { fmtTb } from '../../charts/core/format';

const usage = `import { TopologyGraph } from '@atlas/charts';
import { generateTopology } from '@atlas/charts/data';

const { nodes, links } = generateTopology(7);

export function Estate() {
  return (
    <TopologyGraph
      nodes={nodes}
      links={links}
      height={460}
      detailText={(n) => \`\${n.protectedTb} TB protected\`}
      onSelect={(node) => console.log(node?.id)}
    />
  );
}`;

export default function TopologyPage() {
  const topo = useMemo(() => generateTopology(7), []);
  const [selected, setSelected] = useState<TopologyNode | null>(null);
  const counts = useMemo(() => {
    const c = { degraded: 0, critical: 0, offline: 0 };
    for (const n of topo.nodes) if (n.status !== 'healthy' && n.kind !== 'cluster') c[n.status] += 1;
    return c;
  }, [topo]);

  return (
    <DocPage
      slug="topology-graph"
      lede="A force-directed map of clusters, servers and databases. Healthy nodes stay quiet as outlines; degraded and critical nodes fill with their status colour, so trouble is the first thing you see. Hover or focus a node to light up everything it touches."
      demo={
        <TopologyGraph
          nodes={topo.nodes}
          links={topo.links}
          detail={(n) => (
            <span className="tooltip__row">
              <span>Protected</span>
              <strong>{fmtTb(n.protectedTb)}</strong>
            </span>
          )}
          detailText={(n) => `${fmtTb(n.protectedTb)} protected`}
          onSelect={setSelected}
        />
      }
      aside={
        <div className="readout" aria-live="polite">
          {selected ? (
            <p>
              Selected <strong>{selected.label}</strong>: {selected.kind}, {selected.status}, {fmtTb(selected.protectedTb)} protected.
            </p>
          ) : (
            <p>
              {topo.nodes.length} nodes. {counts.degraded} degraded, {counts.critical} critical and {counts.offline} offline. Select a node to pin it.
            </p>
          )}
        </div>
      }
      usage={usage}
      props={[
        { name: 'nodes', type: 'N extends GraphNode[]', required: true, description: 'Each node has an id, label, kind (cluster, server or database) and status.' },
        { name: 'links', type: '{ source: string; target: string }[]', required: true, description: 'Undirected edges by node id. Cluster-to-cluster links draw as dashed replication paths.' },
        { name: 'height', type: 'number', default: '460', description: 'Plot height in px. Width follows the container through ResizeObserver.' },
        { name: 'title', type: 'string', default: "'Protected infrastructure'", description: 'Visible heading and accessible name of the figure.' },
        { name: 'description', type: 'string', description: 'One sentence read after the title by screen readers.' },
        { name: 'detail', type: '(node: N) => ReactNode', description: 'Extra rows for the tooltip.' },
        { name: 'detailText', type: '(node: N) => string', description: 'Plain-text detail for the live region and the table view.' },
        { name: 'onSelect', type: '(node: N | null) => void', description: 'Fires on click, Enter or Space. Clicking empty space clears the selection.' },
      ]}
      keyboard={[
        { keys: ['Tab'], action: 'Enter the graph on the current node' },
        { keys: ['←', '→'], action: 'Previous or next node, cluster by cluster' },
        { keys: ['Enter', 'Space'], action: 'Select or release the node' },
        { keys: ['+', '−'], action: 'Zoom in or out' },
        { keys: ['0'], action: 'Fit the whole estate' },
      ]}
      a11y={[
        'Status is never colour alone: healthy and offline nodes are outlines (offline dashed), degraded and critical are filled, and the tooltip and table spell the status out.',
        'Node kind is carried by shape (hexagon, circle, square) as well as by the legend.',
        'One node is in the tab order at a time; arrow keys rove through the rest, and each move is announced with kind, status and connection count.',
        'The table view lists every node with its connections, so the structure is readable without the picture.',
        'The layout is settled before first paint, so nothing drifts on load; dragging only animates while you drag.',
      ]}
      dataNote="generateTopology(seed) in src/data/topology.ts builds four regional clusters with four to six servers each and their databases. Statuses come from a seeded generator, so the map is identical on every load and in every test."
    />
  );
}
