import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { marketArrivalComparison, marketH1ArrivalComparison, marketOvernightShare } from './country-market-comparison';
import type { MarketH1 } from './types';

const rows = [
  { market: 'Japan', month: '2025-02', arrivals: 10 },
  { market: 'Japan', month: '2025-03', arrivals: 30 },
  { market: 'Japan', month: '2026-02', arrivals: 20 },
  { market: 'Japan', month: '2026-03', arrivals: 30 },
  { market: 'India', month: '2026-02', arrivals: 900 },
];

test('compares the selected months with the same months in the previous year', () => {
  assert.deepEqual(marketArrivalComparison(rows, 'Japan', '2026-02', '2026-03'), { arrivals: 50, growth: 25 });
  assert.deepEqual(marketArrivalComparison(rows, 'Japan', '2026-02', '2026-02'), { arrivals: 20, growth: 100 });
});

test('does not present incomplete or invalid data as a complete comparison', () => {
  assert.deepEqual(marketArrivalComparison(rows, 'Japan', '2026-01', '2026-03'), { arrivals: null, growth: null });
  assert.deepEqual(marketArrivalComparison(rows, 'India', '2026-02', '2026-02'), { arrivals: 900, growth: null });
  assert.deepEqual(marketArrivalComparison([...rows, rows[2]], 'Japan', '2026-02', '2026-03'), { arrivals: null, growth: null });
  assert.deepEqual(marketArrivalComparison(rows, 'Japan', '2026-03', '2026-02'), { arrivals: null, growth: null });
  assert.deepEqual(marketArrivalComparison([{ market: 'Japan', month: '2025-02', arrivals: 0 }, rows[2]], 'Japan', '2026-02', '2026-02'), { arrivals: 20, growth: null });
});

test('overnight shares require complete visitor counts for the selected half-year', () => {
  const japan: MarketH1 = {
    period: '2026-H1', market: 'Japan', arrivals: 100, overnight: 70, same_day: 30,
    male_pct: null, mean_age: null, age: {}, age_counts: {},
  };
  assert.equal(marketOvernightShare([japan], 'Japan', '2026-01', '2026-06'), 70);
  assert.equal(marketOvernightShare([japan], 'Japan', '2026-02', '2026-06'), null);
  assert.equal(marketOvernightShare([japan], 'Vietnam', '2026-01', '2026-06'), null);
  assert.equal(marketOvernightShare([{ ...japan, same_day: 29 }], 'Japan', '2026-01', '2026-06'), null);
  assert.equal(marketOvernightShare([{ ...japan, arrivals: 0, overnight: 0, same_day: 0 }], 'Japan', '2026-01', '2026-06'), null);
  assert.equal(marketOvernightShare([japan, japan], 'Japan', '2026-01', '2026-06'), null);
});

test('compares H1 table totals and rejects missing, duplicate or zero baselines', () => {
  const japan: MarketH1 = {
    period: '2025-H1', market: 'Japan', arrivals: 348654, overnight: 0, same_day: 0,
    male_pct: null, mean_age: null, age: {}, age_counts: {},
  };
  const current = { ...japan, period: '2026-H1', arrivals: 336142 };
  const result = marketH1ArrivalComparison([japan, current], 'Japan');
  assert.equal(result.arrivals, 336142);
  assert.ok(result.growth !== null && Math.abs(result.growth - (-3.588088)) < 0.001);
  assert.equal(marketH1ArrivalComparison([current], 'Japan').growth, null);
  assert.equal(marketH1ArrivalComparison([japan, japan, current], 'Japan').growth, null);
  assert.equal(marketH1ArrivalComparison([{ ...japan, arrivals: 0 }, current], 'Japan').growth, null);
});
