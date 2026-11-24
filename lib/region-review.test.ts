import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildMonthlyRegionArrivals, buildRegionInsightsData, buildRegionReviewData, regionalOverviewSummary, regionShare } from './region-review';
import type { Segment, SummaryData } from './types';

const row = (quarter: number, segment: Segment, arrivals: number, spending: number): SummaryData['quarterly_segment_spend'][number] => ({
  year: 2026, quarter, segment, arrivals, spend_hkd_m: spending, average_spend_hkd: spending * 1e6 / arrivals,
});
const firstQuarter = [row(1, 'Mainland', 700, 7), row(1, 'Short-haul', 200, 4), row(1, 'Long-haul', 100, 3)];
const secondQuarter = [row(2, 'Mainland', 600, 6), row(2, 'Short-haul', 300, 3), row(2, 'Long-haul', 100, 1)];

test('builds monthly arrivals and flags missing or invalid region data', () => {
  const rows = {
    '2026-01': { Mainland: 70, 'Short-haul': 20, 'Long-haul': 10 },
    '2026-02': { Mainland: 60, 'Short-haul': 30, 'Long-haul': 10 },
    '2026-03': { Mainland: 50, 'Short-haul': 40, 'Long-haul': 10 },
  };
  const result = buildMonthlyRegionArrivals(rows, '2026-02', '2026-03');
  assert.deepEqual(result.points.map((point) => point.month), ['2026-02', '2026-03']);
  assert.equal(result.points[0].regions.Mainland, 60);
  assert.equal(result.points[0].total, 100);
  assert.equal(result.incomplete, false);
  assert.equal(buildMonthlyRegionArrivals(rows, '2026-03', '2026-04').incomplete, true);
  assert.equal(buildMonthlyRegionArrivals({ '2026-01': { ...rows['2026-01'], Mainland: -1 } }, '2026-01', '2026-01').incomplete, true);
});

test('builds full-quarter regional totals and preserves regional values', () => {
  const result = buildRegionReviewData([...secondQuarter, ...firstQuarter], '2026-01', '2026-06');
  assert.deepEqual(result.points.map((point) => point.period), ["Q1 '26", "Q2 '26"]);
  assert.deepEqual(result.points[0].totals, { visitors: 1000, spending: 14 });
  assert.equal(regionShare(result.points[0], 'Short-haul', 'visitors'), 20);
  assert.equal(regionShare(result.points[0], 'Short-haul', 'spending'), 4 / 14 * 100);
  assert.equal(result.points[0].regions['Short-haul'].average, 20000);
  assert.equal(result.incomplete, false);
});

test('excludes partial quarters and flags missing or duplicate regional records', () => {
  assert.deepEqual(buildRegionReviewData([...firstQuarter, ...secondQuarter], '2026-02', '2026-06').points.map((point) => point.period), ["Q2 '26"]);
  assert.deepEqual(buildRegionReviewData(firstQuarter, '2026-02', '2026-03').points, []);
  assert.equal(buildRegionReviewData(firstQuarter.slice(0, 2), '2026-01', '2026-03').incomplete, true);
  assert.equal(buildRegionReviewData([...firstQuarter, firstQuarter[0]], '2026-01', '2026-03').incomplete, true);
  assert.equal(buildRegionReviewData(firstQuarter, '2026-01', '2026-06').incomplete, true);
});

test('summarizes selected-region quarterly spending and weighted averages against the same prior quarters', () => {
  const previous = [...firstQuarter, ...secondQuarter].map((item) => ({ ...item, year: 2025, spend_hkd_m: item.spend_hkd_m / 2, average_spend_hkd: item.average_spend_hkd / 2 }));
  const rows = [...previous, ...firstQuarter, ...secondQuarter];
  assert.deepEqual(regionalOverviewSummary({}, rows, '2026-01', '2026-06', 'Short-haul', 'spending'), { value: 7, growth: 100 });
  assert.deepEqual(regionalOverviewSummary({}, rows, '2026-01', '2026-06', 'All', 'average'), { value: 12000, growth: 100 });
  assert.deepEqual(regionalOverviewSummary({}, rows, '2026-02', '2026-06', 'Short-haul', 'spending'), { value: 3, growth: 100 });
  assert.deepEqual(regionalOverviewSummary({}, rows.filter((item) => !(item.year === 2025 && item.quarter === 2)), '2026-01', '2026-06', 'All', 'spending'), { value: 24, growth: null });
  assert.deepEqual(regionalOverviewSummary({}, rows, '2026-02', '2026-03', 'All', 'spending'), { value: null, growth: null });
});

test('summarizes monthly arrivals without substituting missing prior months', () => {
  const arrivals = {
    '2026-01': { Mainland: 70, 'Short-haul': 20, 'Long-haul': 10 },
    '2026-02': { Mainland: 60, 'Short-haul': 30, 'Long-haul': 10 },
    '2025-01': { Mainland: 50, 'Short-haul': 10, 'Long-haul': 10 },
    '2025-02': { Mainland: 50, 'Short-haul': 15, 'Long-haul': 10 },
  };
  assert.deepEqual(regionalOverviewSummary(arrivals, [], '2026-01', '2026-02', 'Short-haul', 'visitors'), { value: 50, growth: 100 });
  assert.deepEqual(regionalOverviewSummary(arrivals, [], '2026-01', '2026-03', 'All', 'visitors'), { value: null, growth: null });
  const { '2025-02': ignored, ...missing } = arrivals;
  assert.ok(ignored);
  assert.deepEqual(regionalOverviewSummary(missing, [], '2026-01', '2026-02', 'All', 'visitors'), { value: 200, growth: null });
});

test('builds selected-region insights from totals across complete quarters', () => {
  const { points } = buildRegionReviewData([...firstQuarter, ...secondQuarter], '2026-01', '2026-06');
  const all = buildRegionInsightsData(points, 'All');
  const shortHaul = buildRegionInsightsData(points, 'Short-haul');
  assert.ok(all);
  assert.ok(shortHaul);
  assert.equal(all.selected.visitors, 2000);
  assert.equal(all.selected.average, 12000);
  assert.equal(all.leader, 'Mainland');
  assert.equal(all.lowestSpend, 'Mainland');
  assert.equal(shortHaul.selected.visitors, 500);
  assert.equal(shortHaul.selected.average, 14000);
  assert.equal(shortHaul.allVisitors, 2000);
  assert.ok(Math.abs((shortHaul.change ?? 0) - 50) < 1e-10);
  assert.equal(shortHaul.previousPeriod, "Q1 '26");
  assert.equal(shortHaul.period, "Q1 '26–Q2 '26");
});

test('does not present a quarterly change without adjacent quarters', () => {
  const thirdQuarter = [row(3, 'Mainland', 700, 7), row(3, 'Short-haul', 200, 4), row(3, 'Long-haul', 100, 3)];
  const { points } = buildRegionReviewData([...firstQuarter, ...thirdQuarter], '2026-01', '2026-09');
  assert.equal(buildRegionInsightsData([], 'All'), null);
  assert.equal(buildRegionInsightsData(points.slice(0, 1), 'Mainland')?.change, null);
  assert.equal(buildRegionInsightsData(points, 'Mainland')?.change, null);
});
