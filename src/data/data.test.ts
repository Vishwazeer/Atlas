import { describe, expect, it } from 'vitest';
import { buildNeighbours, createRng, generateBackupHistory, generateSensitiveTree, generateThreatWeeks, generateTopology, isLeaf, SEVERITIES } from './index';

describe('seeded data', () => {
  it('createRng is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const seqA = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(seqA);
    expect(Array.from({ length: 5 }, () => c.next())).not.toEqual(seqA);
    seqA.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    seqA.forEach((v) => expect(v).toBeLessThan(1));
  });

  it('topology is stable and every link points at a real node', () => {
    const t1 = generateTopology(7);
    const t2 = generateTopology(7);
    expect(t1).toEqual(t2);
    const ids = new Set(t1.nodes.map((n) => n.id));
    expect(ids.size).toBe(t1.nodes.length);
    for (const l of t1.links) {
      expect(ids.has(l.source)).toBe(true);
      expect(ids.has(l.target)).toBe(true);
    }
    expect(t1.nodes.filter((n) => n.kind === 'cluster')).toHaveLength(4);
  });

  it('buildNeighbours is symmetric', () => {
    const { links } = generateTopology(7);
    const map = buildNeighbours(links);
    for (const [id, set] of map) for (const other of set) expect(map.get(other)?.has(id)).toBe(true);
  });

  it('backup history covers 365 consecutive days with valid rates', () => {
    const days = generateBackupHistory(11);
    expect(days).toHaveLength(365);
    for (let i = 1; i < days.length; i++) {
      expect(days[i]!.date.getTime() - days[i - 1]!.date.getTime()).toBe(86_400_000);
    }
    for (const d of days) {
      expect(d.successRate).toBeGreaterThan(0);
      expect(d.successRate).toBeLessThanOrEqual(100);
      expect(d.throughputTb).toBeGreaterThan(0);
    }
  });

  it('sensitive tree has region > system > class leaves with positive values', () => {
    const tree = generateSensitiveTree(23);
    expect(tree.children.length).toBe(4);
    for (const region of tree.children) {
      expect(isLeaf(region)).toBe(false);
      if (isLeaf(region)) continue;
      for (const system of region.children) {
        if (isLeaf(system)) throw new Error('system should be a branch');
        for (const leaf of system.children) {
          expect(isLeaf(leaf)).toBe(true);
          if (isLeaf(leaf)) expect(leaf.value).toBeGreaterThan(0);
        }
      }
    }
  });

  it('threat weeks have a count for every severity', () => {
    const weeks = generateThreatWeeks(31);
    expect(weeks).toHaveLength(16);
    for (const w of weeks) for (const s of SEVERITIES) expect(w.counts[s]).toBeGreaterThanOrEqual(0);
  });
});
