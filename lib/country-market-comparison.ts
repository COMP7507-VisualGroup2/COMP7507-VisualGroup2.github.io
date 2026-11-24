import { pctChange } from './format';
import type { VisitorDemographics } from './types';

type MonthlyArrival = VisitorDemographics['market_monthly'][number];

export function marketH1ArrivalComparison(rows: VisitorDemographics['market_h1'], market: string) {
  const total = (period: string) => {
    const matches = rows.filter((row) => row.market === market && row.period === period);
    if (matches.length !== 1 || !Number.isSafeInteger(matches[0].arrivals) || matches[0].arrivals < 0) return null;
    return matches[0].arrivals;
  };
  const arrivals = total('2026-H1');
  const previous = total('2025-H1');
  return { arrivals, growth: arrivals === null || previous === null ? null : pctChange(arrivals, previous) };
}

export function marketOvernightShare(rows: VisitorDemographics['market_h1'], market: string, start: string, end: string): number | null {
  const period = start === '2026-01' && end === '2026-06' ? '2026-H1'
    : start === '2025-01' && end === '2025-06' ? '2025-H1' : null;
  if (!period) return null;
  const matches = rows.filter((row) => row.market === market && row.period === period);
  if (matches.length !== 1) return null;
  const { arrivals, overnight, same_day } = matches[0];
  if (![arrivals, overnight, same_day].every(Number.isSafeInteger) || arrivals <= 0
    || overnight < 0 || same_day < 0 || overnight + same_day !== arrivals) return null;
  return overnight / arrivals * 100;
}

export function marketArrivalComparison(rows: MonthlyArrival[], market: string, start: string, end: string) {
  const startMatch = /^(\d{4})-(\d{2})$/.exec(start);
  const endMatch = /^(\d{4})-(\d{2})$/.exec(end);
  if (!startMatch || !endMatch || startMatch[1] !== endMatch[1]) return { arrivals: null, growth: null };
  const year = Number(startMatch[1]);
  const first = Number(startMatch[2]);
  const last = Number(endMatch[2]);
  if (first < 1 || last > 12 || first > last) return { arrivals: null, growth: null };

  const total = (targetYear: number) => {
    let sum = 0;
    for (let month = first; month <= last; month++) {
      const key = `${targetYear}-${String(month).padStart(2, '0')}`;
      const matches = rows.filter((row) => row.market === market && row.month === key);
      if (matches.length !== 1 || !Number.isFinite(matches[0].arrivals) || matches[0].arrivals < 0) return null;
      sum += matches[0].arrivals;
    }
    return sum;
  };
  const arrivals = total(year);
  const previous = total(year - 1);
  return { arrivals, growth: arrivals === null || previous === null ? null : pctChange(arrivals, previous) };
}
