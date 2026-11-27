import { useMemo, useState } from 'react';
import { BrushTimeSeries, type TimeMetric } from '../../charts';
import { DocPage } from '../../components/DocPage';
import { generateBackupHistory, type BackupDay } from '../../data';
import { fmtDay, fmtInt, fmtPct, fmtTb } from '../../charts/core/format';

const usage = `import { BrushTimeSeries, type TimeMetric } from '@atlas/charts';

const metrics: TimeMetric<BackupDay>[] = [
  { key: 'tb', label: 'Throughput', unit: 'TB', value: (d) => d.throughputTb, format: (v) => \`\${v.toFixed(1)} TB\` },
  { key: 'rate', label: 'Success rate', unit: '%', baseline: 'auto', ceiling: 100,
    value: (d) => d.successRate, format: (v) => \`\${v.toFixed(1)}%\` },
];

<BrushTimeSeries
  data={history}
  date={(d) => d.date}
  metrics={metrics}
  initialWindow={[275, 364]}
  onWindowChange={([from, to]) => setRange([from, to])}
/>`;

const metrics: TimeMetric<BackupDay>[] = [
  { key: 'tb', label: 'Throughput', unit: 'TB', value: (d) => d.throughputTb, format: fmtTb },
  { key: 'rate', label: 'Success rate', unit: '%', baseline: 'auto', ceiling: 100, value: (d) => d.successRate, format: (v) => fmtPct(v) },
  { key: 'jobs', label: 'Jobs', unit: 'jobs', value: (d) => d.jobs, format: fmtInt },
];

export default function TimeSeriesPage() {
  const data = useMemo(() => generateBackupHistory(11), []);
  const [range, setRange] = useState<readonly [number, number]>([data.length - 90, data.length - 1]);
  const slice = data.slice(range[0], range[1] + 1);
  const total = slice.reduce((acc, d) => acc + d.throughputTb, 0);
  const worst = slice.reduce((a, d) => (d.successRate < a.successRate ? d : a), slice[0] ?? data[0]!);

  return (
    <DocPage
      slug="brush-time-series"
      lede="An overview strip holds the whole year; the brush picks the window the detail chart shows. Measures switch in place on one axis, never two scales sharing a frame. Throughput keeps a zero baseline; success rate fits its window so a two-point dip is visible."
      demo={<BrushTimeSeries data={data} date={(d) => d.date} metrics={metrics} onWindowChange={setRange} />}
      aside={
        <div className="readout" aria-live="polite">
          <p>
            {fmtDay(data[range[0]]!.date)} to {fmtDay(data[range[1]]!.date)}: {fmtTb(total)} moved across {slice.length} days. Lowest success rate{' '}
            <strong>{fmtPct(worst.successRate)}</strong> on {fmtDay(worst.date)}.
          </p>
        </div>
      }
      usage={usage}
      props={[
        { name: 'data', type: 'T[]', required: true, description: 'Points in time order. Any shape; accessors read it.' },
        { name: 'date', type: '(d: T) => Date', required: true, description: 'Reads the timestamp of a point.' },
        { name: 'metrics', type: 'TimeMetric<T>[]', required: true, description: 'One or more measures. With more than one, a switch appears in the toolbar.' },
        { name: 'initialWindow', type: 'readonly [number, number]', default: 'last 90 points', description: 'Starting brush window as point indices, inclusive.' },
        { name: 'minSpan', type: 'number', default: '7', description: 'Narrowest window the brush allows, in points.' },
        { name: 'onWindowChange', type: '(window) => void', description: 'Fires whenever the brush moves or resizes.' },
        { name: 'height', type: 'number', default: '340', description: 'Total height of detail plus overview.' },
        { name: 'TimeMetric.baseline', type: "'zero' | 'auto'", default: "'zero'", description: "'zero' draws an area from 0; 'auto' fits the window and draws a line only." },
      ]}
      keyboard={[
        { keys: ['Tab'], action: 'Move between the day points, the brush window and its two edges' },
        { keys: ['←', '→'], action: 'Step a day (on points), or slide the window or edge by a day' },
        { keys: ['Shift', '←', '→'], action: 'Slide the window or edge by a week' },
        { keys: ['Page Up', 'Page Down'], action: 'Slide the window by 30 days' },
        { keys: ['Home', 'End'], action: 'Jump to the first or last day' },
      ]}
      a11y={[
        'The brush window and both of its edges are sliders with spoken values such as "Aug 28, 2026 to Nov 26, 2026".',
        'Every visible day is a focusable point; focusing one shows the same crosshair and tooltip a pointer gets.',
        'The table view lists the brushed window with all measures, so the range you chose carries over.',
        'One y axis at a time: switching measure relabels the axis instead of stacking a second scale.',
      ]}
      dataNote="generateBackupHistory(seed) in src/data/backups.ts gives 365 days with a weekend full-backup rhythm, slow growth and seven seeded incidents that drop both throughput and success."
    />
  );
}
