import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { shortHaulSameDaySpend } from './short-haul';
import type { AreaH1 } from './types';

const area = (name: string, arrivals: number, overnight: number | null, spend: number): AreaH1 => ({
  area: name,
  segment: 'Short-haul',
  year: '2026',
  arrivals,
  overnight_visitors: overnight,
  same_day_spend_hkd_m: spend,
  spend_hkd_m: spend,
  overnight_spend_hkd_m: 0,
  overnight_per_capita_hkd: 0,
  same_day_per_capita_hkd: 0,
});

test('weights same-day spend by combined same-day visitors', () => {
  const rows = [area('A', 1000, 500, 1), area('B', 1000, 900, 0.2)];
  assert.equal(shortHaulSameDaySpend(rows, ['A', 'B'], '2026'), 2000);
});

test('reports unavailable for missing, duplicated, or invalid source data', () => {
  assert.equal(shortHaulSameDaySpend([area('A', 100, null, 1)], ['A'], '2026'), null);
  assert.equal(shortHaulSameDaySpend([area('A', 100, 101, 1)], ['A'], '2026'), null);
  assert.equal(shortHaulSameDaySpend([area('A', 100, 100, 1)], ['A'], '2026'), null);
  assert.equal(shortHaulSameDaySpend([area('A', 100, 50, 1)], ['A', 'B'], '2026'), null);
  assert.equal(shortHaulSameDaySpend([area('A', 100, 50, 1), area('A', 100, 50, 1)], ['A', 'B'], '2026'), null);
});
