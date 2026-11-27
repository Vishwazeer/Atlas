import { useMemo } from 'react';
import { SeverityBreakdown } from '../../charts';
import { DocPage } from '../../components/DocPage';
import { generateThreatWeeks, SEVERITIES } from '../../data';

const usage = `import { SeverityBreakdown } from '@atlas/charts';

<SeverityBreakdown
  data={weeks}                         // { weekStart: Date; counts: Record<Severity, number> }[]
  keys={['critical', 'high', 'medium', 'low']}
  defaultMode="count"                  // or "share" for 100% bars
/>`;

export default function SeverityPage() {
  const weeks = useMemo(() => generateThreatWeeks(31), []);
  return (
    <DocPage
      slug="severity-breakdown"
      lede="Weekly detections from backup scans, stacked by severity with critical on the baseline where lengths compare best. Severity is ordered, so the colours are one warm hue stepped in lightness rather than four unrelated hues. Switch to share to see the mix rather than the volume."
      demo={<SeverityBreakdown data={weeks} keys={SEVERITIES} />}
      usage={usage}
      props={[
        { name: 'data', type: '{ weekStart: Date; counts: Record<K, number> }[]', required: true, description: 'One row per period.' },
        { name: 'keys', type: 'readonly K[]', required: true, description: 'Stack order, bottom to top.' },
        { name: 'colors', type: 'Partial<Record<K, string>>', default: 'var(--viz-sev-*)', description: 'Override the ordinal ramp per key.' },
        { name: 'labels', type: 'Partial<Record<K, string>>', default: 'capitalised key', description: 'Display names for legend, tooltip and table.' },
        { name: 'defaultMode', type: "'count' | 'share'", default: "'count'", description: 'Starting scale; the toolbar switches it.' },
        { name: 'height', type: 'number', default: '300', description: 'Plot height in px.' },
      ]}
      keyboard={[
        { keys: ['←', '→'], action: 'Previous or next week, same severity' },
        { keys: ['↑', '↓'], action: 'Up or down the stack' },
        { keys: ['Home', 'End'], action: 'First or last week' },
      ]}
      a11y={[
        'The ramp is ordinal: one hue, monotone lightness, the lightest step still clears 2:1 against the surface in both themes.',
        'Legend plus direct labels on the last bar, so series identity never depends on colour alone.',
        'A 2px surface gap separates stacked segments, which keeps neighbouring steps apart for low-vision readers.',
        'The tooltip lists the whole week with the focused severity marked; the table gives counts or shares to match the current mode.',
      ]}
      dataNote="generateThreatWeeks(seed) in src/data/threats.ts produces sixteen weeks with a two-week surge in critical and high detections around week ten."
    />
  );
}
