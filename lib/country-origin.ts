type OriginShare = { category: string; value: number };
const completeLists = new Set(['Philippines', 'Thailand', 'Malaysia', 'Indonesia', 'Japan', 'Russia', 'Middle East']);

export function countryOriginChange(market: string, current: OriginShare, previous: OriginShare[]): number | 'new' | null {
  const prior = previous.find((row) => row.category === current.category);
  if (!prior) return previous.length && completeLists.has(market) ? 'new' : null;
  if (current.value < 0.5 || prior.value < 0.5) return null;
  return current.value - prior.value;
}

export function countryOriginLabel(market: string, category: string): string {
  if (market === 'Philippines' && category === 'Greater Manila') return 'Manila';
  if (market === 'Philippines' && category === 'San Fernando') return 'Pampanga';
  return category;
}

export function countryOriginMatches(market: string, category: string, boundary: { category: string | null; region: string | null }): boolean {
  const normalize = (value: string | null) => value?.normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? null;
  return normalize(countryOriginLabel(market, category)) === normalize(boundary.category)
    || normalize(category) === normalize(boundary.region);
}
