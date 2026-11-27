import { createRng } from './rng';

export type DataClass = 'PII' | 'Financial' | 'Health' | 'Credentials' | 'Source code';
export const DATA_CLASSES: readonly DataClass[] = ['PII', 'Financial', 'Health', 'Credentials', 'Source code'];

export interface SensitiveLeaf {
  name: DataClass;
  dataClass: DataClass;
  /** Sensitive records found by classification scans. */
  value: number;
}
export interface SensitiveBranch {
  name: string;
  children: SensitiveNode[];
}
export type SensitiveNode = SensitiveBranch | SensitiveLeaf;

const REGIONS: Record<string, string[]> = {
  'eu-west': ['CRM', 'Data lake', 'HR suite', 'Mail archive'],
  'us-east': ['Payments', 'Data lake', 'Support desk', 'Build farm', 'Mail archive'],
  'ap-south': ['CRM', 'Claims', 'File shares'],
  'us-west': ['Build farm', 'Analytics', 'File shares'],
};

/** Weighting of each data class by system type, so the map reads plausibly. */
const AFFINITY: Record<string, Partial<Record<DataClass, number>>> = {
  CRM: { PII: 5, Financial: 2 },
  'Data lake': { PII: 3, Financial: 3, Health: 1, 'Source code': 0.5 },
  'HR suite': { PII: 4, Financial: 2, Health: 2 },
  'Mail archive': { PII: 2, Credentials: 1.2, Financial: 1 },
  Payments: { Financial: 6, PII: 2 },
  'Support desk': { PII: 3, Credentials: 0.6 },
  'Build farm': { 'Source code': 5, Credentials: 2 },
  Claims: { Health: 5, PII: 3, Financial: 1.5 },
  'File shares': { PII: 1.5, Financial: 1, Credentials: 0.8, 'Source code': 1 },
  Analytics: { PII: 2, Financial: 1.5 },
};

export function generateSensitiveTree(seed = 23): SensitiveBranch {
  const rng = createRng(seed);
  return {
    name: 'All regions',
    children: Object.entries(REGIONS).map(([region, systems]) => ({
      name: region,
      children: systems.map((system) => ({
        name: system,
        children: DATA_CLASSES.flatMap((dc): SensitiveLeaf[] => {
          const w = AFFINITY[system]?.[dc] ?? 0;
          if (w === 0) return [];
          return [{ name: dc, dataClass: dc, value: Math.round(w * rng.range(40_000, 160_000)) }];
        }),
      })),
    })),
  };
}

export function isLeaf(node: SensitiveNode): node is SensitiveLeaf {
  return 'value' in node;
}
