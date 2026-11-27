import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface ChartEntry {
  slug: string;
  /** Exported component name. */
  component: string;
  title: string;
  /** The question the chart answers, in an operator's words. */
  question: string;
  builtOn: string;
  Page: LazyExoticComponent<ComponentType>;
}

export const CHARTS: ChartEntry[] = [
  {
    slug: 'topology-graph',
    component: 'TopologyGraph',
    title: 'Topology graph',
    question: 'Which machines sit behind a failing cluster?',
    builtOn: 'd3-force, d3-zoom',
    Page: lazy(() => import('../pages/charts/TopologyPage')),
  },
  {
    slug: 'brush-time-series',
    component: 'BrushTimeSeries',
    title: 'Brush time series',
    question: 'When did backup throughput dip, and for how long?',
    builtOn: 'd3-scale, d3-shape',
    Page: lazy(() => import('../pages/charts/TimeSeriesPage')),
  },
  {
    slug: 'calendar-heatmap',
    component: 'CalendarHeatmap',
    title: 'Calendar heatmap',
    question: 'Which days of the year had failed backups?',
    builtOn: 'd3-scale threshold',
    Page: lazy(() => import('../pages/charts/CalendarPage')),
  },
  {
    slug: 'data-treemap',
    component: 'DataTreemap',
    title: 'Data treemap',
    question: 'Where does our most sensitive data live?',
    builtOn: 'd3-hierarchy',
    Page: lazy(() => import('../pages/charts/TreemapPage')),
  },
  {
    slug: 'severity-breakdown',
    component: 'SeverityBreakdown',
    title: 'Severity breakdown',
    question: 'Are critical threats rising week over week?',
    builtOn: 'd3-scale band',
    Page: lazy(() => import('../pages/charts/SeverityPage')),
  },
  {
    slug: 'sla-rings',
    component: 'SlaRings',
    title: 'SLA rings',
    question: 'Which recovery objectives are we missing?',
    builtOn: 'd3-shape arc',
    Page: lazy(() => import('../pages/charts/SlaPage')),
  },
];

export const findChart = (slug: string) => CHARTS.find((c) => c.slug === slug);
