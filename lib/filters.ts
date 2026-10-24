import type { ArrivalRecord, Filters, Granularity, HotelMonth, PortRecord } from './types';
import { monthLabel } from './format';

export function shiftYear(month: string, years: number): string {
  return `${Number(month.slice(0, 4)) + years}${month.slice(4)}`;
}

export function inRange(month: string, f: Pick<Filters, 'start' | 'end'>): boolean {
  return month >= f.start && month <= f.end;
}

export function quarterOf(month: string): string {
  return `${month.slice(0, 4)}-Q${Math.floor((Number(month.slice(5)) - 1) / 3) + 1}`;
}

export function isSegmented(f: Filters): boolean {
  return f.origin !== 'All' || f.visitorType !== 'All';
}

export function periodKey(month: string, g: Granularity): string {
  if (g === 'year') return month.slice(0, 4);
  if (g === 'quarter') return `${month.slice(0, 4)} Q${Math.floor((Number(month.slice(5)) - 1) / 3) + 1}`;
  return monthLabel(month);
}

export function matchesSegment(r: ArrivalRecord, f: Filters): boolean {
  return (f.origin === 'All' || r.origin === f.origin) && (f.visitorType === 'All' || r.visitor_type === f.visitorType);
}

/** Records matching origin/type filters within [start, end]; pass `shift` = -1 for the same period a year earlier. */
export function selectArrivals(records: ArrivalRecord[], f: Filters, shift = 0): ArrivalRecord[] {
  const start = shiftYear(f.start, shift);
  const end = shiftYear(f.end, shift);
  return records.filter((r) => r.month >= start && r.month <= end && matchesSegment(r, f));
}

export function sumBy<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((acc, row) => acc + pick(row), 0);
}

/** Group rows into ordered period buckets (month / quarter / year). */
export function bucket<T extends { month: string }>(rows: T[], g: Granularity): Map<string, T[]> {
  const out = new Map<string, T[]>();
  [...rows]
    .sort((a, b) => a.month.localeCompare(b.month))
    .forEach((row) => {
      const key = periodKey(row.month, g);
      out.set(key, [...(out.get(key) ?? []), row]);
    });
  return out;
}

export function portVisitors(r: PortRecord, f: Filters): number {
  if (f.origin === 'Mainland') return r.mainland;
  if (f.origin === 'All') return r.mainland + r.non_mainland;
  return r.non_mainland;
}

export function hotelAverages(rows: HotelMonth[]) {
  const valid = rows.filter((r) => r.occupancy_pct !== null && r.adr_hkd !== null && r.revpar_hkd !== null);
  if (!valid.length) return null;
  const avg = (k: 'occupancy_pct' | 'adr_hkd' | 'revpar_hkd') => sumBy(valid, (r) => r[k] ?? 0) / valid.length;
  return { occupancy: avg('occupancy_pct'), adr: avg('adr_hkd'), revpar: avg('revpar_hkd') };
}

export function describeSegment(f: Filters): string {
  const parts = [f.origin === 'All' ? 'All markets' : f.origin, f.visitorType === 'All' ? 'all visitors' : f.visitorType];
  return parts.join(' · ');
}
