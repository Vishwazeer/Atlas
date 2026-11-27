import { describe, expect, it } from 'vitest';
import { bucketScale, layoutCalendar, lowestDays, mondayIndex } from './calendar/layout';
import { stackMax, stackRows } from './severity/stack';
import { clampWindow, moveWindow, nearestIndex, resizeWindow } from './timeseries/brush';
import { angleFor, slaState, SWEEP_END, SWEEP_START } from './sla/sla';
import { layoutTreemap, leafRows, resolvePath, sumHierarchy } from './treemap/treemap';
import { gridKey, linearKey } from './core/navigation';
import { bounds, createLayout, fitTransform } from './topology/layout';
import { roundedTopRect } from './core/geometry';
import { addDays, generateSensitiveTree, generateTopology, isLeaf } from '../data';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('calendar layout', () => {
  it('places consecutive days in Monday-first week columns', () => {
    // 2026-11-04 is a Wednesday
    const start = day('2026-11-04');
    const data = Array.from({ length: 10 }, (_, i) => ({ date: addDays(start, i), value: i }));
    const { cells, columns } = layoutCalendar(data);
    expect(mondayIndex(start)).toBe(2);
    expect(cells[0]).toMatchObject({ col: 0, row: 2 });
    expect(cells[4]).toMatchObject({ col: 0, row: 6 }); // Sunday
    expect(cells[5]).toMatchObject({ col: 1, row: 0 }); // next Monday
    expect(columns).toBe(2);
  });

  it('labels months on their first full column', () => {
    const data = Array.from({ length: 70 }, (_, i) => ({ date: addDays(day('2026-01-01'), i), value: 1 }));
    const { months } = layoutCalendar(data);
    expect(months.map((m) => m.label)).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('bucketScale maps values to five steps at the thresholds', () => {
    const b = bucketScale([90, 95, 98, 99.5]);
    expect([80, 90, 94.9, 97, 99, 99.5, 100].map((v) => b(v))).toEqual([0, 1, 1, 2, 3, 4, 4]);
  });

  it('lowestDays returns the n smallest values', () => {
    const data = [5, 1, 9, 3].map((value, i) => ({ date: addDays(day('2026-01-01'), i), value }));
    expect(lowestDays(data, 2).map((d) => d.value)).toEqual([1, 3]);
  });
});

describe('severity stacking', () => {
  const rows = [
    { counts: { critical: 2, high: 3, low: 5 } },
    { counts: { critical: 0, high: 10, low: 10 } },
  ];
  const keys = ['critical', 'high', 'low'] as const;

  it('stacks counts bottom-up', () => {
    const s = stackRows(rows, keys, 'count');
    expect(s[0]!.segments.map((g) => [g.y0, g.y1])).toEqual([
      [0, 2],
      [2, 5],
      [5, 10],
    ]);
    expect(s[0]!.total).toBe(10);
    expect(stackMax(s)).toBe(20);
  });

  it('normalises to 100 in share mode while keeping raw values', () => {
    const s = stackRows(rows, keys, 'share');
    expect(s[1]!.segments[2]!.y1).toBeCloseTo(100);
    expect(s[1]!.segments[1]!.value).toBe(10);
    expect(s[0]!.segments[0]!.y1).toBeCloseTo(20);
  });
});

describe('brush window math', () => {
  it('clamps, orders and enforces a minimum span', () => {
    expect(clampWindow([50, 10], 100, 7)).toEqual([10, 50]);
    expect(clampWindow([98, 99], 100, 7)).toEqual([93, 99]);
    expect(clampWindow([-20, 3], 100, 7)).toEqual([0, 6]);
  });

  it('moves without changing width and stops at the edges', () => {
    expect(moveWindow([10, 20], 5, 100)).toEqual([15, 25]);
    expect(moveWindow([10, 20], -50, 100)).toEqual([0, 10]);
    expect(moveWindow([80, 90], 50, 100)).toEqual([89, 99]);
  });

  it('resizes one edge and respects the minimum span', () => {
    expect(resizeWindow([10, 40], 'start', 5, 100)).toEqual([15, 40]);
    expect(resizeWindow([10, 20], 'start', 30, 100, 7)).toEqual([14, 20]);
    expect(resizeWindow([10, 20], 'end', 200, 100)).toEqual([10, 99]);
  });

  it('nearestIndex finds the closest x', () => {
    const xs = [0, 10, 20, 30];
    expect(nearestIndex(xs, -5)).toBe(0);
    expect(nearestIndex(xs, 14)).toBe(1);
    expect(nearestIndex(xs, 16)).toBe(2);
    expect(nearestIndex(xs, 99)).toBe(3);
  });
});

describe('sla', () => {
  it('classifies met, at risk and breached', () => {
    expect(slaState(99.6, 99)).toBe('met');
    expect(slaState(99.7, 100)).toBe('at-risk');
    expect(slaState(91.4, 98)).toBe('breached');
    expect(slaState(97.5, 98, 0.25)).toBe('breached');
  });

  it('maps the domain onto the gauge sweep and clamps outside it', () => {
    expect(angleFor(90, [90, 100])).toBeCloseTo(SWEEP_START);
    expect(angleFor(100, [90, 100])).toBeCloseTo(SWEEP_END);
    expect(angleFor(95, [90, 100])).toBeCloseTo(0);
    expect(angleFor(50, [90, 100])).toBeCloseTo(SWEEP_START);
  });
});

describe('treemap', () => {
  const tree = generateSensitiveTree(23);

  it('resolvePath walks valid segments and drops unknown ones', () => {
    expect(resolvePath(tree, ['eu-west']).path).toEqual(['eu-west']);
    expect(resolvePath(tree, ['eu-west', 'CRM']).node.name).toBe('CRM');
    expect(resolvePath(tree, ['nowhere', 'CRM']).path).toEqual([]);
    // a leaf cannot be opened
    expect(resolvePath(tree, ['eu-west', 'CRM', 'PII']).path).toEqual(['eu-west', 'CRM']);
  });

  it('sums leaves and lays out inside the box', () => {
    const h = sumHierarchy(tree);
    const manual = h.leaves().reduce((a, l) => a + (isLeaf(l.data) ? l.data.value : 0), 0);
    expect(h.value).toBe(manual);
    const laid = layoutTreemap(tree, 600, 400);
    for (const n of laid.descendants()) {
      expect(n.x0).toBeGreaterThanOrEqual(0);
      expect(n.y1).toBeLessThanOrEqual(400);
    }
  });

  it('leafRows shares add up to 100', () => {
    const rows = leafRows(sumHierarchy(tree));
    expect(rows.reduce((a, r) => a + r.share, 0)).toBeCloseTo(100);
    expect(rows[0]!.location.split(' / ')).toHaveLength(2);
  });
});

describe('keyboard navigation', () => {
  it('linearKey clamps at both ends', () => {
    expect(linearKey('ArrowRight', 4, 5)).toBe(4);
    expect(linearKey('ArrowLeft', 0, 5)).toBe(0);
    expect(linearKey('End', 1, 5)).toBe(4);
    expect(linearKey('x', 1, 5)).toBeNull();
  });

  it('gridKey moves by rows and columns', () => {
    expect(gridKey('ArrowDown', 3, 30, 7)).toBe(4);
    expect(gridKey('ArrowRight', 3, 30, 7)).toBe(10);
    expect(gridKey('ArrowRight', 25, 30, 7)).toBe(25);
    expect(gridKey('ArrowLeft', 3, 30, 7)).toBe(3);
    expect(gridKey('PageDown', 0, 30, 7)).toBe(28);
  });
});

describe('topology layout', () => {
  it('settles deterministically and fits the viewport', () => {
    const { nodes, links } = generateTopology(7);
    const a = createLayout(nodes, links);
    const b = createLayout(nodes, links);
    expect(a.nodes.map((n) => [Math.round(n.x), Math.round(n.y)])).toEqual(b.nodes.map((n) => [Math.round(n.x), Math.round(n.y)]));
    const box = bounds(a.nodes);
    const t = fitTransform(box, 800, 400);
    expect(box.x0 * t.k + t.x).toBeGreaterThanOrEqual(-0.5);
    expect(box.x1 * t.k + t.x).toBeLessThanOrEqual(800.5);
    expect(box.y1 * t.k + t.y).toBeLessThanOrEqual(400.5);
  });
});

describe('geometry', () => {
  it('roundedTopRect returns an empty path for empty bars', () => {
    expect(roundedTopRect(0, 0, 10, 0, 3)).toBe('');
    expect(roundedTopRect(0, 0, 10, 20, 3)).toMatch(/^M0,20V3Q/);
  });
});
