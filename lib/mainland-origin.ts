import type { VisitorDemographics } from './types';

export function mainlandOriginPeriod(start: string, end: string): '2026 H1' | '2025 Full Year' | null {
  if (start === '2026-01' && end === '2026-06') return '2026 H1';
  if (start === '2025-01' && end === '2025-12') return '2025 Full Year';
  return null;
}

export function mainlandOriginShares(rows: VisitorDemographics['mainland_origin_provinces'], period: string | null) {
  return rows.filter((row) => row.period === period)
    .sort((a, b) => b.all_visitors_share_pct - a.all_visitors_share_pct || a.rank - b.rank);
}

export function mainlandOriginGrowth(
  row: VisitorDemographics['mainland_origin_provinces'][number],
  rows: VisitorDemographics['mainland_origin_provinces'],
): number | 'new' | null {
  if (row.period !== '2026 H1' || !Number.isFinite(row.all_visitors_share_pct)
    || row.all_visitors_share_pct < 0 || row.all_visitors_share_pct > 100) return null;
  const previousRows = rows.filter((item) => item.period === '2025 Full Year');
  const previous = previousRows.find((item) => item.province_en === row.province_en);
  if (!previous) return previousRows.length ? 'new' : null;
  if (!Number.isFinite(previous.all_visitors_share_pct) || previous.all_visitors_share_pct < 0
    || previous.all_visitors_share_pct > 100) return null;
  return row.all_visitors_share_pct - previous.all_visitors_share_pct;
}
