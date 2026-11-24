import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { countryOriginChange, countryOriginLabel, countryOriginMatches } from './country-origin';

test('compares published origin shares and identifies new entries only for complete lists', () => {
  const previous = [{ category: 'Bangkok', value: 83 }, { category: 'Sandakan', value: 0.4 }];
  const change = countryOriginChange('Thailand', { category: 'Bangkok', value: 79 }, previous);
  assert.equal(change, -4);
  assert.equal(countryOriginChange('Thailand', { category: 'Bangkok', value: 85 }, previous), 2);
  assert.equal(countryOriginChange('Thailand', { category: 'Chiang Rai', value: 1 }, previous), 'new');
  assert.equal(countryOriginChange('USA', { category: 'Unlisted', value: 1 }, previous), null);
  assert.equal(countryOriginChange('Thailand', { category: 'Sandakan', value: 0.4 }, previous), null);
  assert.equal(countryOriginChange('Thailand', { category: 'Bangkok', value: 79 }, []), null);
});

test('renames the requested Philippines locations without changing other markets', () => {
  assert.equal(countryOriginLabel('Philippines', 'Greater Manila'), 'Manila');
  assert.equal(countryOriginLabel('Philippines', 'San Fernando'), 'Pampanga');
  assert.equal(countryOriginLabel('USA', 'San Fernando'), 'San Fernando');
});

test('matches reported Japanese origins to accented prefectures and regions', () => {
  assert.equal(countryOriginMatches('Japan', 'Osaka', { category: 'Ōsaka', region: 'Kinki' }), true);
  assert.equal(countryOriginMatches('Japan', 'Hyogo', { category: 'Hyōgo', region: 'Kinki' }), true);
  assert.equal(countryOriginMatches('Japan', 'Chugoku', { category: 'Hiroshima', region: 'Chugoku' }), true);
  assert.equal(countryOriginMatches('Japan', 'Tokyo', { category: 'Ōsaka', region: 'Kinki' }), false);
});
