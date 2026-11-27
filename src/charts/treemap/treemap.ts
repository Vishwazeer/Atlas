import { hierarchy, treemap, treemapSquarify, type HierarchyNode, type HierarchyRectangularNode } from 'd3-hierarchy';

export interface TreeDatum {
  name: string;
  children?: readonly TreeDatum[];
  value?: number;
}

/** Walks `path` (child names) down from the root. Unknown segments stop the walk. */
export function resolvePath<T extends TreeDatum>(root: T, path: readonly string[]): { node: T; path: string[] } {
  let node: T = root;
  const valid: string[] = [];
  for (const segment of path) {
    const next = node.children?.find((c) => c.name === segment) as T | undefined;
    if (!next || !next.children) break;
    node = next;
    valid.push(segment);
  }
  return { node, path: valid };
}

export function sumHierarchy<T extends TreeDatum>(node: T): HierarchyNode<T> {
  return hierarchy<T>(node, (d) => d.children as T[] | undefined)
    .sum((d) => (d.children ? 0 : d.value ?? 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
}

/** Squarified layout of the subtree, with a header band on the first level for labels. */
export function layoutTreemap<T extends TreeDatum>(node: T, width: number, height: number, header = 20): HierarchyRectangularNode<T> {
  return treemap<T>()
    .tile(treemapSquarify.ratio(1.2))
    .size([width, height])
    // Wider gutters between higher levels, so systems read as blocks inside a region.
    .paddingInner((d) => (d.depth === 0 ? 6 : d.depth === 1 ? 4 : 1.5))
    .paddingTop((d) => (d.depth === 1 && d.children ? header : 0))
    .round(true)(sumHierarchy(node));
}

/** Leaves of a laid-out tree with their path relative to the root, for the table view. */
export function leafRows<T extends TreeDatum>(root: HierarchyNode<T>) {
  const total = root.value ?? 0;
  return root.leaves().map((leaf) => ({
    leaf,
    location: leaf
      .ancestors()
      .reverse()
      .slice(1, -1)
      .map((a) => a.data.name)
      .join(' / '),
    value: leaf.value ?? 0,
    share: total > 0 ? ((leaf.value ?? 0) / total) * 100 : 0,
  }));
}
