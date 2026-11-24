import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mainlandOriginGrowth, mainlandOriginPeriod, mainlandOriginShares } from './mainland-origin';

test('only matches periods covered by the supplied Mainland origin shares', () => {
  assert.equal(mainlandOriginPeriod('2026-01', '2026-06'), '2026 H1');
  assert.equal(mainlandOriginPeriod('2025-01', '2025-12'), '2025 Full Year');
  assert.equal(mainlandOriginPeriod('2025-01', '2025-06'), null);
  assert.equal(mainlandOriginPeriod('2026-02', '2026-06'), null);
  assert.equal(mainlandOriginPeriod('2025-01', '2026-06'), null);
});

test('orders the selected period by all-visitor share rather than the original ranking', () => {
  const rows = [
    { period: '2025 Full Year', rank: 1, province_zh: '', province_en: 'A', share_pct: 51, all_visitors_share_pct: 72 },
    { period: '2025 Full Year', rank: 5, province_zh: '', province_en: 'B', share_pct: 4, all_visitors_share_pct: 2 },
    { period: '2025 Full Year', rank: 6, province_zh: '', province_en: 'C', share_pct: 4, all_visitors_share_pct: 3 },
    { period: '2026 H1', rank: 1, province_zh: '', province_en: 'A', share_pct: 47, all_visitors_share_pct: 70 },
  ];
  assert.deepEqual(mainlandOriginShares(rows, '2025 Full Year').map((row) => row.province_en), ['A', 'C', 'B']);
  assert.equal(mainlandOriginShares(rows, '2026 H1')[0].all_visitors_share_pct, 70);
  assert.deepEqual(mainlandOriginShares(rows, null), []);
  assert.equal(rows[1].province_en, 'B');
});

test('subtracts all-visitor shares in percentage points and identifies new top-ten entries', () => {
  const previous = { period: '2025 Full Year', rank: 1, province_zh: '', province_en: 'Guangdong', share_pct: 51, all_visitors_share_pct: 72 };
  const current = { ...previous, period: '2026 H1', share_pct: 47, all_visitors_share_pct: 70 };
  const rows = [previous, current];
  const decrease = mainlandOriginGrowth(current, rows);
  const increase = mainlandOriginGrowth({ ...current, all_visitors_share_pct: 73 }, rows);
  assert.equal(decrease, -2);
  assert.equal(increase, 1);
  assert.equal(mainlandOriginGrowth(current, [{ ...previous, all_visitors_share_pct: 0 }, current]), 70);
  assert.equal(mainlandOriginGrowth(previous, rows), null);
  assert.equal(mainlandOriginGrowth({ ...current, province_en: 'Hunan' }, rows), 'new');
  assert.equal(mainlandOriginGrowth(current, [current]), null);
  assert.equal(mainlandOriginGrowth(current, [{ ...previous, all_visitors_share_pct: -1 }, current]), null);
  assert.equal(mainlandOriginGrowth({ ...current, all_visitors_share_pct: 101 }, rows), null);
});
