import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrushTimeSeries, CalendarHeatmap, DataTreemap, SeverityBreakdown, SlaRings, TopologyGraph } from './index';
import {
  DATA_CLASSES,
  generateBackupHistory,
  generateSensitiveTree,
  generateThreatWeeks,
  generateTopology,
  isLeaf,
  SEVERITIES,
  SLA_OBJECTIVES,
  type SensitiveNode,
} from '../data';

const history = generateBackupHistory(11);
const days = history.map((d) => ({ ...d, value: d.successRate }));

describe('table view toggle', () => {
  it('CalendarHeatmap swaps the chart for a 365-row table', async () => {
    const user = userEvent.setup();
    render(<CalendarHeatmap data={days} />);
    const toggle = screen.getByRole('button', { name: /view as table/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const table = screen.getByRole('table');
    // header row + one row per day
    expect(within(table).getAllByRole('row')).toHaveLength(366);
    expect(within(table).getByRole('columnheader', { name: 'Success rate' })).toBeInTheDocument();
  });

  it('SeverityBreakdown table follows the count/share mode', async () => {
    const user = userEvent.setup();
    const weeks = generateThreatWeeks(31);
    render(<SeverityBreakdown data={weeks} keys={SEVERITIES} />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await user.click(screen.getByRole('button', { name: /view as table/i }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(weeks.length + 1);
    expect(within(table).getAllByText(/%\)$/).length).toBeGreaterThan(0);
  });

  it('SlaRings table spells out every status', async () => {
    const user = userEvent.setup();
    render(<SlaRings items={SLA_OBJECTIVES} animate={false} />);
    await user.click(screen.getByRole('button', { name: /view as table/i }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('Breached')).toBeInTheDocument();
    expect(within(table).getByText('At risk')).toBeInTheDocument();
  });

  it('TopologyGraph table lists every node with its connections', async () => {
    const user = userEvent.setup();
    const topo = generateTopology(7);
    render(<TopologyGraph nodes={topo.nodes} links={topo.links} />);
    await user.click(screen.getByRole('button', { name: /view as table/i }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(topo.nodes.length + 1);
  });
});

describe('keyboard focus', () => {
  it('CalendarHeatmap roves by day and by week with arrow keys', async () => {
    const user = userEvent.setup();
    render(<CalendarHeatmap data={days} />);
    const cells = screen.getAllByRole('img').filter((el) => el.tagName === 'rect');
    expect(cells).toHaveLength(365);
    // exactly one cell is in the tab order
    expect(cells.filter((c) => c.getAttribute('tabindex') === '0')).toHaveLength(1);

    await user.tab();
    await user.tab(); // past the table toggle
    const first = document.activeElement as Element;
    expect(first.getAttribute('data-index')).toBe('0');

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.getAttribute('data-index')).toBe('1');
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement?.getAttribute('data-index')).toBe('8');
    await user.keyboard('{End}');
    expect(document.activeElement?.getAttribute('data-index')).toBe('364');
    expect(document.activeElement?.getAttribute('tabindex')).toBe('0');
  });

  it('SeverityBreakdown moves across weeks and up the stack', async () => {
    const user = userEvent.setup();
    const weeks = generateThreatWeeks(31);
    render(<SeverityBreakdown data={weeks} keys={SEVERITIES} />);
    const marks = screen.getAllByRole('img');
    const start = marks.find((m) => m.getAttribute('tabindex') === '0');
    expect(start).toBeDefined();
    start?.focus();
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/Critical/);
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/High/);
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/High/);
    expect(document.activeElement?.getAttribute('aria-label')).not.toBe(start?.getAttribute('aria-label'));
    // live region announces the focused segment
    expect(screen.getByText(/Week of .*: High/)).toBeInTheDocument();
  });

  it('SlaRings roves between objectives', async () => {
    const user = userEvent.setup();
    render(<SlaRings items={SLA_OBJECTIVES} animate={false} />);
    const rings = screen.getAllByRole('img');
    rings[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(rings[1]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(rings[rings.length - 1]);
  });

  it('DataTreemap opens a block with Enter and climbs back with Escape', async () => {
    const user = userEvent.setup();
    const onPathChange = vi.fn();
    const tree = generateSensitiveTree(23);
    render(
      <DataTreemap<SensitiveNode>
        data={tree}
        categoryOf={(l) => (isLeaf(l) ? l.dataClass : l.name)}
        categories={DATA_CLASSES.map((d, i) => ({ key: d, label: d, color: `var(--viz-cat-${i + 1})` }))}
        onPathChange={onPathChange}
      />,
    );
    const blocks = screen.getAllByRole('button').filter((b) => b.tagName === 'rect');
    expect(blocks).toHaveLength(4);
    blocks[0]!.focus();
    await user.keyboard('{Enter}');
    expect(onPathChange).toHaveBeenLastCalledWith([expect.any(String)]);
    expect(screen.getByRole('navigation', { name: 'Treemap level' })).toHaveTextContent('All regions');
    await user.keyboard('{Escape}');
    expect(onPathChange).toHaveBeenLastCalledWith([]);
  });

  it('BrushTimeSeries slider moves the window with arrow keys', async () => {
    const user = userEvent.setup();
    const onWindowChange = vi.fn();
    render(
      <BrushTimeSeries
        data={history}
        date={(d) => d.date}
        metrics={[{ key: 'tb', label: 'Throughput', value: (d) => d.throughputTb, format: (v) => `${v.toFixed(1)} TB` }]}
        initialWindow={[100, 130]}
        onWindowChange={onWindowChange}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Brush window' });
    slider.focus();
    await user.keyboard('{ArrowRight}');
    expect(onWindowChange).toHaveBeenLastCalledWith([101, 131]);
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    expect(onWindowChange).toHaveBeenLastCalledWith([94, 124]);
    const end = screen.getByRole('slider', { name: 'Window end' });
    end.focus();
    await user.keyboard('{ArrowRight}');
    expect(onWindowChange).toHaveBeenLastCalledWith([94, 125]);
  });

  it('TopologyGraph announces the focused node and selects it with Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const topo = generateTopology(7);
    render(<TopologyGraph nodes={topo.nodes} links={topo.links} onSelect={onSelect} />);
    const nodes = screen.getAllByRole('img').filter((n) => n.hasAttribute('data-node'));
    expect(nodes).toHaveLength(topo.nodes.length);
    nodes[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(nodes[1]);
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: topo.nodes[1]!.id }));
    expect(screen.getByText(/connections/, { selector: '[aria-live]' })).toBeInTheDocument();
  });
});
