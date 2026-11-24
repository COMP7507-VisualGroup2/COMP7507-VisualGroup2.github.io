import type { Segment, SummaryData } from './types';

export const REVIEW_REGIONS: Segment[] = ['Mainland', 'Short-haul', 'Long-haul'];

type QuarterlyRegion = SummaryData['quarterly_segment_spend'][number];
type RegionValues = { visitors: number; spending: number; average: number };

export function buildMonthlyRegionArrivals(rows: SummaryData['arrivals_monthly'], start: string, end: string) {
  const points: { month: string; regions: Record<Segment, number>; total: number }[] = [];
  let incomplete = false;
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  for (let index = startYear * 12 + startMonth - 1; index <= endYear * 12 + endMonth - 1; index++) {
    const month = `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
    const row = rows[month];
    if (!row || REVIEW_REGIONS.some((region) => !Number.isFinite(row[region]) || row[region] < 0)) {
      incomplete = true;
      continue;
    }
    const regions = { Mainland: row.Mainland, 'Short-haul': row['Short-haul'], 'Long-haul': row['Long-haul'] };
    points.push({ month, regions, total: REVIEW_REGIONS.reduce((sum, region) => sum + regions[region], 0) });
  }
  return { points, incomplete };
}

export interface RegionReviewPoint {
  period: string;
  year: number;
  quarter: number;
  regions: Record<Segment, RegionValues>;
  totals: { visitors: number; spending: number };
}

export function regionShare(point: RegionReviewPoint, segment: Segment, metric: 'visitors' | 'spending'): number | null {
  const total = point.totals[metric];
  return total > 0 ? point.regions[segment][metric] / total * 100 : null;
}

export function buildRegionInsightsData(points: RegionReviewPoint[], origin: Segment | 'All') {
  if (!points.length) return null;
  const regionTotals = (region: Segment): RegionValues => {
    const visitors = points.reduce((sum, point) => sum + point.regions[region].visitors, 0);
    const spending = points.reduce((sum, point) => sum + point.regions[region].spending, 0);
    return { visitors, spending, average: spending * 1e6 / visitors };
  };
  const regions: Record<Segment, RegionValues> = {
    Mainland: regionTotals('Mainland'),
    'Short-haul': regionTotals('Short-haul'),
    'Long-haul': regionTotals('Long-haul'),
  };
  const allVisitors = REVIEW_REGIONS.reduce((sum, region) => sum + regions[region].visitors, 0);
  const allSpending = REVIEW_REGIONS.reduce((sum, region) => sum + regions[region].spending, 0);
  const selected = origin === 'All' ? { visitors: allVisitors, spending: allSpending, average: allSpending * 1e6 / allVisitors } : regions[origin];
  const leader = REVIEW_REGIONS.reduce((best, region) => regions[region].visitors > regions[best].visitors ? region : best);
  const lowestSpend = REVIEW_REGIONS.reduce((best, region) => regions[region].average < regions[best].average ? region : best);
  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  const adjacent = previous && last.year * 4 + last.quarter === previous.year * 4 + previous.quarter + 1;
  const count = (point: RegionReviewPoint) => origin === 'All' ? point.totals.visitors : point.regions[origin].visitors;
  const change = adjacent ? (count(last) / count(previous) - 1) * 100 : null;
  return {
    regions, selected, allVisitors, allAverage: allSpending * 1e6 / allVisitors, leader, lowestSpend,
    change, lastPeriod: last.period, previousPeriod: adjacent ? previous.period : null,
    period: points.length === 1 ? last.period : `${points[0].period}–${last.period}`,
  };
}

export function buildRegionReviewData(rows: QuarterlyRegion[], start: string, end: string) {
  const points: RegionReviewPoint[] = [];
  let incomplete = false;
  const startYear = Number(start.slice(0, 4));
  const endYear = Number(end.slice(0, 4));
  for (let index = startYear * 4; index < (endYear + 1) * 4; index++) {
    const year = Math.floor(index / 4);
    const quarter = index % 4 + 1;
    const first = `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}`;
    const last = `${year}-${String(quarter * 3).padStart(2, '0')}`;
    if (first < start || last > end) continue;
    const getRegion = (segment: Segment): RegionValues | null => {
      const matches = rows.filter((row) => row.year === year && row.quarter === quarter && row.segment === segment);
      if (matches.length !== 1) return null;
      const row = matches[0];
      if (!Number.isFinite(row.arrivals) || row.arrivals <= 0 || !Number.isFinite(row.spend_hkd_m)
        || row.spend_hkd_m < 0 || !Number.isFinite(row.average_spend_hkd) || row.average_spend_hkd < 0) return null;
      return { visitors: row.arrivals, spending: row.spend_hkd_m, average: row.average_spend_hkd };
    };
    const mainland = getRegion('Mainland');
    const shortHaul = getRegion('Short-haul');
    const longHaul = getRegion('Long-haul');
    if (!mainland || !shortHaul || !longHaul) {
      incomplete = true;
      continue;
    }
    points.push({
      period: `Q${quarter} '${String(year).slice(-2)}`,
      year,
      quarter,
      regions: { Mainland: mainland, 'Short-haul': shortHaul, 'Long-haul': longHaul },
      totals: {
        visitors: mainland.visitors + shortHaul.visitors + longHaul.visitors,
        spending: mainland.spending + shortHaul.spending + longHaul.spending,
      },
    });
  }
  return { points, incomplete };
}

export function regionalOverviewSummary(
  arrivals: SummaryData['arrivals_monthly'],
  spending: QuarterlyRegion[],
  start: string,
  end: string,
  origin: Segment | 'All',
  mode: 'visitors' | 'spending' | 'average',
) {
  const previousDate = (date: string) => `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`;
  const previousStart = previousDate(start);
  const previousEnd = previousDate(end);
  if (mode === 'visitors') {
    const current = buildMonthlyRegionArrivals(arrivals, start, end);
    const previous = buildMonthlyRegionArrivals(arrivals, previousStart, previousEnd);
    const total = (points: typeof current.points) => points.reduce((sum, point) =>
      sum + (origin === 'All' ? point.total : point.regions[origin]), 0);
    const value = current.incomplete || !current.points.length ? null : total(current.points);
    const prior = previous.incomplete || previous.points.length !== current.points.length ? null : total(previous.points);
    return { value, growth: value !== null && prior !== null && prior > 0 ? (value / prior - 1) * 100 : null };
  }
  const current = buildRegionReviewData(spending, start, end);
  const previous = buildRegionReviewData(spending, previousStart, previousEnd);
  const aggregate = (points: RegionReviewPoint[]) => {
    const regions = origin === 'All' ? REVIEW_REGIONS : [origin];
    const visitors = points.reduce((sum, point) => sum + regions.reduce((s, region) => s + point.regions[region].visitors, 0), 0);
    const total = points.reduce((sum, point) => sum + regions.reduce((s, region) => s + point.regions[region].spending, 0), 0);
    return mode === 'spending' ? total : visitors > 0 ? total * 1e6 / visitors : null;
  };
  const value = current.incomplete || !current.points.length ? null : aggregate(current.points);
  const comparable = !previous.incomplete && previous.points.length === current.points.length
    && current.points.every((point, index) => previous.points[index]?.quarter === point.quarter && previous.points[index]?.year === point.year - 1);
  const prior = comparable ? aggregate(previous.points) : null;
  return { value, growth: value !== null && prior !== null && prior > 0 ? (value / prior - 1) * 100 : null };
}
