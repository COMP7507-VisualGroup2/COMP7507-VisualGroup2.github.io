import type { AreaH1 } from './types';

export function shortHaulSameDaySpend(
  areas: AreaH1[],
  expectedAreas: string[],
  year: string,
): number | null {
  if (!expectedAreas.length || new Set(expectedAreas).size !== expectedAreas.length) return null;
  const rows = areas.filter((row) => row.year === year && row.segment === 'Short-haul');
  if (rows.length !== expectedAreas.length || expectedAreas.some((area) => rows.filter((row) => row.area === area).length !== 1)) return null;
  let visitors = 0;
  let spending = 0;
  for (const row of rows) {
    const overnight = row.overnight_visitors;
    if (overnight === null || !Number.isFinite(row.arrivals) || !Number.isFinite(overnight)
      || !Number.isFinite(row.same_day_spend_hkd_m)
      || row.arrivals < 0 || overnight < 0 || overnight > row.arrivals
      || row.same_day_spend_hkd_m < 0) return null;
    visitors += row.arrivals - overnight;
    spending += row.same_day_spend_hkd_m;
  }
  if (visitors <= 0) return null;
  return spending * 1e6 / visitors;
}
