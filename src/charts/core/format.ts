import { utcFormat } from 'd3-time-format';

export const fmtDay = utcFormat('%b %-d, %Y');
export const fmtShortDay = utcFormat('%b %-d');
export const fmtMonth = utcFormat('%b');
export const fmtWeekday = utcFormat('%a');

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('en');

export const fmtCompact = (n: number) => compact.format(n);
export const fmtInt = (n: number) => integer.format(Math.round(n));
export const fmtPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
export const fmtTb = (n: number) => `${n.toFixed(1)} TB`;
