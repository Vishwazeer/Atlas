import { useMemo, useState } from 'react';
import { DataTreemap, type TreemapCategory } from '../../charts';
import { DocPage } from '../../components/DocPage';
import { DATA_CLASSES, generateSensitiveTree, isLeaf, type SensitiveNode } from '../../data';

const usage = `import { DataTreemap } from '@atlas/charts';

const categories = [
  { key: 'PII', label: 'PII', color: 'var(--viz-cat-1)' },
  { key: 'Financial', label: 'Financial', color: 'var(--viz-cat-2)' },
  // ...one entry per data class, in a fixed order
];

<DataTreemap
  data={tree}                       // region -> system -> data class
  categoryOf={(leaf) => leaf.name}
  categories={categories}
  levels={['Region', 'System', 'Data class']}
  onPathChange={(path) => setSearchParams({ at: path.join('/') })}
/>`;

const CATEGORIES: TreemapCategory[] = DATA_CLASSES.map((dc, i) => ({ key: dc, label: dc, color: `var(--viz-cat-${i + 1})` }));
const categoryOf = (leaf: SensitiveNode) => (isLeaf(leaf) ? leaf.dataClass : leaf.name);

export default function TreemapPage() {
  const tree = useMemo(() => generateSensitiveTree(23), []);
  const [path, setPath] = useState<string[]>([]);

  return (
    <DocPage
      slug="data-treemap"
      lede="Sensitive records by region, then system, then data class. Area is the count of records; colour is the class, held in a fixed order so PII is the same blue at every level. Select a block to open it and use the trail to climb back."
      demo={<DataTreemap<SensitiveNode> data={tree} categoryOf={categoryOf} categories={CATEGORIES} onPathChange={setPath} />}
      aside={
        <div className="readout" aria-live="polite">
          <p>{path.length === 0 ? 'Showing every region. Open one to see its systems.' : `Showing ${path.join(' / ')}.`}</p>
        </div>
      }
      usage={usage}
      props={[
        { name: 'data', type: 'T extends TreeDatum', required: true, description: 'A tree of { name, children? , value? }. Leaves carry the value.' },
        { name: 'categoryOf', type: '(leaf: T) => string', required: true, description: 'Category key of a leaf, which picks its colour.' },
        { name: 'categories', type: 'TreemapCategory[]', required: true, description: 'Fixed-order list of { key, label, color }. Colours are CSS values, usually tokens.' },
        { name: 'levels', type: 'string[]', default: "['Region', 'System', 'Data class']", description: 'Names of each level, used in the summary, table headers and announcements.' },
        { name: 'valueLabel', type: 'string', default: "'Records'", description: 'Names the value in tooltips and the table.' },
        { name: 'initialPath', type: 'string[]', default: '[]', description: 'Open the chart already drilled into a branch.' },
        { name: 'onPathChange', type: '(path: string[]) => void', description: 'Fires on every drill or climb, for syncing the URL.' },
        { name: 'height', type: 'number', default: '380', description: 'Plot height in px.' },
      ]}
      keyboard={[
        { keys: ['←', '→'], action: 'Previous or next block at this level' },
        { keys: ['Enter', 'Space'], action: 'Open the block' },
        { keys: ['Esc', 'Backspace'], action: 'Go up one level' },
      ]}
      a11y={[
        'Blocks that open are buttons; the last level is announced as values only.',
        'After drilling, focus moves to the first block of the new level so keyboard users never lose their place.',
        'The trail above the plot is an ordered list of real buttons with aria-current on the level you are in.',
        'Five categorical colours in a validated order; every block also has its class name as a label when it is big enough, and the table names them all.',
      ]}
      dataNote="generateSensitiveTree(seed) in src/data/sensitive.ts weights each data class by the kind of system it sits in: payments hold financial records, build farms hold source code and credentials."
    />
  );
}
