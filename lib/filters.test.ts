import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { analysis2026Filters } from './filters';
import type { Filters } from './types';

const filters: Filters = { origin: 'All', region: 'All', visitorType: 'All', start: '2025-01', end: '2025-12', purpose: 'All', channel: 'All' };
const months = ['2025-12', '2026-01', '2026-02', '2026-03'];

test('analysis period is limited to available 2026 months without changing other filters', () => {
  assert.deepEqual(analysis2026Filters(filters, months), { ...filters, start: '2026-01', end: '2026-03' });
  assert.deepEqual(analysis2026Filters({ ...filters, end: '2026-02' }, months), { ...filters, start: '2026-01', end: '2026-02' });
  assert.deepEqual(analysis2026Filters({ ...filters, start: '2026-02', end: '2026-03' }, months), { ...filters, start: '2026-02', end: '2026-03' });
});
