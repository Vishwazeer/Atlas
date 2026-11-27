import { useMemo, useState } from 'react';
import { CalendarHeatmap } from '../../charts';
import { DocPage } from '../../components/DocPage';
import { generateBackupHistory, type BackupDay } from '../../data';
import { fmtDay, fmtInt, fmtPct } from '../../charts/core/format';

const usage = `import { CalendarHeatmap } from '@atlas/charts';

const days = history.map((d) => ({ ...d, value: d.successRate }));

<CalendarHeatmap
  data={days}
  thresholds={[90, 95, 98, 99.5]}
  valueLabel="Success rate"
  detail={(d) => \`\${d.jobs} jobs\`}
  annotateLowest={3}
  onSelect={(day) => openRunLog(day.date)}
/>`;

type Day = BackupDay & { value: number };

export default function CalendarPage() {
  const days = useMemo<Day[]>(() => generateBackupHistory(11).map((d) => ({ ...d, value: d.successRate })), []);
  const [picked, setPicked] = useState<Day | null>(null);
  const below = days.filter((d) => d.value < 95).length;

  return (
    <DocPage
      slug="calendar-heatmap"
      lede="A year of backup success, one square per day. Five steps of a single teal ramp keep the year calm; the three worst days carry a ring so they read without hunting. Weeks run left to right, Monday at the top."
      demo={
        <CalendarHeatmap
          data={days}
          description="Each square is one day; the stronger the teal, the more jobs finished clean. Rings mark the three lowest days."
          detail={(d) => `${fmtInt(d.jobs)} jobs`}
          onSelect={setPicked}
        />
      }
      aside={
        <div className="readout" aria-live="polite">
          <p>
            {picked ? (
              <>
                <strong>{fmtDay(picked.date)}</strong>: {fmtPct(picked.successRate)} of {fmtInt(picked.jobs)} jobs finished clean.
              </>
            ) : (
              <>
                {below} of {days.length} days fell under 95%. Select a day to open its run log.
              </>
            )}
          </p>
        </div>
      }
      usage={usage}
      props={[
        { name: 'data', type: 'T extends { date: Date; value: number }[]', required: true, description: 'Consecutive days, oldest first.' },
        { name: 'thresholds', type: 'readonly number[]', default: '[90, 95, 98, 99.5]', description: 'Four cut points for the five colour steps.' },
        { name: 'valueLabel', type: 'string', default: "'Success rate'", description: 'Names the value in tooltips, the table and announcements.' },
        { name: 'formatValue', type: '(v: number) => string', default: 'percent, 1 dp', description: 'Formats the value everywhere it is printed.' },
        { name: 'detail', type: '(d: T) => string', description: 'Extra line for the tooltip and a column in the table.' },
        { name: 'annotateLowest', type: 'number', default: '3', description: 'How many of the lowest days get a ring. 0 turns it off.' },
        { name: 'onSelect', type: '(d: T) => void', description: 'Fires on click, Enter or Space.' },
      ]}
      keyboard={[
        { keys: ['↑', '↓'], action: 'Previous or next day' },
        { keys: ['←', '→'], action: 'Same weekday, previous or next week' },
        { keys: ['Page Up', 'Page Down'], action: 'Back or forward four weeks' },
        { keys: ['Home', 'End'], action: 'First or last day' },
        { keys: ['Enter', 'Space'], action: 'Select the day' },
      ]}
      a11y={[
        'The ramp is one hue stepped in lightness, chosen and checked separately for the dark and light surfaces.',
        'The lowest days carry a ring, so the worst of the year is visible without telling five teals apart.',
        'Grid navigation mirrors the picture: up and down are days, left and right are weeks.',
        'The table view lists all 365 days with value and detail, for screen readers and for copying out.',
      ]}
      dataNote="The same seeded backup history as the time series, so an incident in one chart is the dark square in the other."
    />
  );
}
