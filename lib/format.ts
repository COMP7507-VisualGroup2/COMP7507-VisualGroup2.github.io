const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatCompact(value: number, digits = 1): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(digits)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(digits)}K`;
  return value.toFixed(0);
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('en-HK', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatHkd(value: number, digits = 0): string {
  return `HK$${formatNumber(value, digits)}`;
}

/** Format an amount in HK$ millions as HK$ xx.xB / xxxM. */
export function formatHkdMillions(valueM: number): string {
  return valueM >= 1000 ? `HK$${(valueM / 1000).toFixed(1)}B` : `HK$${valueM.toFixed(0)}M`;
}

export function formatPct(value: number | null | undefined, digits = 1, signed = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function monthLabel(month: string, withYear = true): string {
  const [y, m] = month.split('-');
  return withYear ? `${MONTHS[Number(m) - 1]} ${y.slice(2)}` : MONTHS[Number(m) - 1];
}

export function monthLong(month: string): string {
  const [y, m] = month.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** Deterministic (timezone-independent) date label from an ISO timestamp, e.g. "24 Oct 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function pctChange(curr: number, prev: number): number | null {
  return prev ? ((curr - prev) / prev) * 100 : null;
}
