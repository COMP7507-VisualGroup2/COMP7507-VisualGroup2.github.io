import type { ProfileDataPeriod, VisitorDemographics } from './types';

export type HalfYearPeriod = Extract<ProfileDataPeriod, '2025-H1' | '2025-H2' | '2026-H1'>;
export const HALF_YEARS: ReadonlyArray<readonly [HalfYearPeriod, string]> = [
  ['2025-H1', 'H1 2025'], ['2025-H2', 'H2 2025'], ['2026-H1', 'H1 2026'],
];

export function overnightPurposeShares(rows: { category: string; value: number }[], categories: readonly string[]): Record<string, number> | null {
  if (rows.length !== categories.length) return null;
  const shares: Record<string, number> = {};
  for (const category of categories) {
    const matches = rows.filter((row) => row.category === category);
    if (matches.length !== 1 || !Number.isFinite(matches[0].value) || matches[0].value < 0 || matches[0].value > 100) return null;
    shares[category] = matches[0].value;
  }
  const total = categories.reduce((sum, category) => sum + shares[category], 0);
  if (total <= 0) return null;
  return Object.fromEntries(categories.map((category) => [category, shares[category] / total * 100]));
}

export function completeAgeShares(rows: { category: string; value: number }[], categories: readonly string[]): Record<string, number> | null {
  if (rows.length !== categories.length) return null;
  const shares: Record<string, number> = {};
  for (const category of categories) {
    const matches = rows.filter((row) => row.category === category);
    if (matches.length !== 1 || !Number.isFinite(matches[0].value) || matches[0].value < 0 || matches[0].value > 100) return null;
    shares[category] = matches[0].value;
  }
  const total = categories.reduce((sum, category) => sum + shares[category], 0);
  return Math.abs(total - 100) <= categories.length * 0.5 ? shares : null;
}

export function completeCounts(rows: { category: string; value: number }[], categories: readonly string[], allowZero = false): Record<string, number> | null {
  if (rows.length !== categories.length) return null;
  const counts: Record<string, number> = {};
  for (const category of categories) {
    const matches = rows.filter((row) => row.category === category);
    if (matches.length !== 1 || !Number.isSafeInteger(matches[0].value) || matches[0].value < 0) return null;
    counts[category] = matches[0].value;
  }
  return allowZero || categories.reduce((total, category) => total + counts[category], 0) > 0 ? counts : null;
}

export function quarterlyAgeCounts(
  rows: VisitorDemographics['country_age_quarterly'], market: string, period: HalfYearPeriod, groups: readonly string[],
): Record<string, number> | null {
  const quarters = period === '2025-H1' ? ['2025-Q1', '2025-Q2']
    : period === '2025-H2' ? ['2025-Q3', '2025-Q4'] : ['2026-Q1', '2026-Q2'];
  const parts = quarters.map((quarter) => completeCounts(
    rows.filter((row) => row.market === market && row.period === quarter).map((row) => ({ category: row.age_group, value: row.count })),
    groups, true,
  ));
  const [first, second] = parts;
  if (!first || !second) return null;
  const combined = groups.map((group) => ({ category: group, value: first[group] + second[group] }));
  return completeCounts(combined, groups);
}
