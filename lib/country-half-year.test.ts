import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { completeAgeShares, completeCounts, overnightPurposeShares, quarterlyAgeCounts } from './country-half-year';

test('estimates overnight-only purpose shares from the supplied all-visitor shares', () => {
  const categories = ['Vacation', 'Business'];
  assert.deepEqual(overnightPurposeShares([{ category: 'Vacation', value: 30 }, { category: 'Business', value: 10 }], categories), { Vacation: 75, Business: 25 });
  assert.equal(overnightPurposeShares([{ category: 'Vacation', value: 30 }], categories), null);
  assert.equal(overnightPurposeShares([{ category: 'Vacation', value: 0 }, { category: 'Business', value: 0 }], categories), null);
});

test('accepts complete rounded age shares without rescaling them', () => {
  const categories = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const shares = [9, 17, 25, 22, 15, 9, 4].map((value, i) => ({ category: categories[i], value }));
  assert.deepEqual(completeAgeShares(shares, categories), { A: 9, B: 17, C: 25, D: 22, E: 15, F: 9, G: 4 });
  assert.equal(completeAgeShares(shares.slice(1), categories), null);
  assert.equal(completeAgeShares([...shares.slice(0, -1), shares[0]], categories), null);
  assert.equal(completeAgeShares(shares.map((row) => ({ ...row, value: 0 })), categories), null);
  assert.equal(completeAgeShares(shares.map((row, i) => i === 0 ? { ...row, value: NaN } : row), categories), null);
});

test('requires complete, non-negative counts for each category', () => {
  assert.deepEqual(completeCounts([{ category: 'A', value: 10 }, { category: 'B', value: 20 }], ['A', 'B']), { A: 10, B: 20 });
  assert.equal(completeCounts([{ category: 'A', value: 10 }], ['A', 'B']), null);
  assert.equal(completeCounts([{ category: 'A', value: 10 }, { category: 'B', value: -1 }], ['A', 'B']), null);
});

test('sums only two complete standalone quarters for the requested market and half-year', () => {
  const rows = ['2025-Q3', '2025-Q4'].flatMap((period) => ['A', 'B'].map((age_group, i) => ({
    period, market: 'Japan', age_group, count: i + 1, source: 'test',
  })));
  assert.deepEqual(quarterlyAgeCounts(rows, 'Japan', '2025-H2', ['A', 'B']), { A: 2, B: 4 });
  assert.equal(quarterlyAgeCounts(rows.slice(0, -1), 'Japan', '2025-H2', ['A', 'B']), null);
  assert.equal(quarterlyAgeCounts(rows, 'Japan', '2025-H1', ['A', 'B']), null);
  assert.equal(quarterlyAgeCounts(rows, 'Singapore', '2025-H2', ['A', 'B']), null);
  const zeroFirstQuarter = rows.map((row) => row.period === '2025-Q3' ? { ...row, count: 0 } : row);
  assert.deepEqual(quarterlyAgeCounts(zeroFirstQuarter, 'Japan', '2025-H2', ['A', 'B']), { A: 1, B: 2 });
});
