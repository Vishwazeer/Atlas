export interface SlaObjective {
  id: string;
  label: string;
  /** Target compliance, percent. */
  target: number;
  /** Measured compliance over the window, percent. */
  actual: number;
  /** What the objective measures, used in tooltips and the table. */
  detail: string;
}

export const SLA_OBJECTIVES: SlaObjective[] = [
  { id: 'rpo', label: 'RPO met', target: 99, actual: 99.6, detail: 'Snapshots inside the 4 h recovery point' },
  { id: 'rto', label: 'RTO tested', target: 95, actual: 96.8, detail: 'Restores finished inside the 2 h window' },
  { id: 'immutability', label: 'Immutable copies', target: 100, actual: 99.7, detail: 'Backups locked against deletion' },
  { id: 'scan', label: 'Threat scans', target: 98, actual: 91.4, detail: 'Snapshots scanned before retention' },
  { id: 'offsite', label: 'Off-site replica', target: 97, actual: 97.9, detail: 'Copies replicated to a second region' },
];
