import { SlaRings } from '../../charts';
import { DocPage } from '../../components/DocPage';
import { SLA_OBJECTIVES } from '../../data';

const usage = `import { SlaRings } from '@atlas/charts';

<SlaRings
  items={[
    { id: 'rpo', label: 'RPO met', target: 99, actual: 99.6 },
    { id: 'scan', label: 'Threat scans', target: 98, actual: 91.4 },
  ]}
  domain={[90, 100]}     // labelled at both ends of the gauge
  riskMargin={1}         // within 1 point of target = at risk
/>`;

export default function SlaPage() {
  return (
    <DocPage
      slug="sla-rings"
      lede="A row of compliance gauges, one per recovery objective. Each sweeps a labelled range, with a tick at the target, so a miss of half a point is still visible. Status is spelled out under every ring with an icon, not left to the arc colour."
      demo={<SlaRings items={SLA_OBJECTIVES} />}
      usage={usage}
      props={[
        { name: 'items', type: '{ id; label; target; actual; detail? }[]', required: true, description: 'One gauge per objective. Values are percentages.' },
        { name: 'domain', type: 'readonly [number, number]', default: '[90, 100]', description: 'Range the gauge spans. Both ends are printed on the ring.' },
        { name: 'riskMargin', type: 'number', default: '1', description: 'Points below target that still count as at risk rather than breached.' },
        { name: 'size', type: 'number', default: '148', description: 'Ring diameter in px.' },
        { name: 'animate', type: 'boolean', default: 'true', description: 'Draw the arcs in and count the numbers up once. Off under reduced motion.' },
        { name: 'title', type: 'string', default: "'SLA compliance, last 30 days'", description: 'Heading and accessible name.' },
      ]}
      keyboard={[
        { keys: ['←', '→'], action: 'Previous or next objective' },
        { keys: ['Home', 'End'], action: 'First or last objective' },
      ]}
      a11y={[
        'Each gauge is one image with a full sentence label: measured value, target and status.',
        'Status shows as text with an icon (tick, triangle, cross) as well as the arc colour.',
        'With prefers-reduced-motion the arcs and numbers render at their final values, and the Replay button is hidden.',
        'The gauge range is printed at both ends, so a narrow 90 to 100 scale is never mistaken for 0 to 100.',
      ]}
      dataNote="SLA_OBJECTIVES in src/data/sla.ts: five fixed objectives, one breached and one at risk, so every state appears on the page."
    />
  );
}
