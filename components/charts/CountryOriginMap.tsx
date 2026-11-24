'use client';

import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import cities from '@/data/country_origin_cities_natural_earth.json';
import australia from '@/data/australia_states_natural_earth.json';
import regions from '@/data/country_origin_regions_natural_earth.json';
import { countryOriginChange, countryOriginLabel, countryOriginMatches } from '@/lib/country-origin';
import { mainlandOriginPeriod } from '@/lib/mainland-origin';
import { changeColorClass, formatNumber, formatPct, pctChange } from '@/lib/format';
import { formatShare, marketH1, profile } from '@/lib/persona';
import type { Filters } from '@/lib/types';
import { MARKET_GEO } from './OriginMap';

type RegionProperties = { market: string; category: string | null; region: string | null };
const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const countries = (feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>).features;
const australianStates = australia as FeatureCollection<Geometry, { name: string }>;
const administrativeRegions = regions as FeatureCollection<Geometry, RegionProperties>;
const middleEastIds: Record<string, string> = {
  '682': 'Saudi Arabia', '784': 'United Arab Emirates', '414': 'Kuwait', '634': 'Qatar',
  '512': 'Oman', '792': 'Turkey', '376': 'Israel', '818': 'Egypt', '400': 'Jordan', '364': 'Iran',
};
const colors = ['#ffe2b7', '#ffc985', '#f5a64a', '#e47b19', '#ab5009'];

export default function CountryOriginMap({ market, filters }: { market: string; filters: Pick<Filters, 'start' | 'end'> }) {
  const dataPeriod = mainlandOriginPeriod(filters.start, filters.end);
  const rows = dataPeriod ? profile(dataPeriod === '2026 H1' ? '2026-H1' : '2025', market, 'origin_region').filter((row) => !row.category.includes('(subtotal)')) : [];
  const singaporeCurrent = dataPeriod === '2026 H1' ? marketH1('2026-H1', 'Singapore') : undefined;
  const singaporePrevious = dataPeriod === '2026 H1' ? marketH1('2025', 'Singapore') : undefined;
  const singaporeGrowth = singaporeCurrent && singaporePrevious ? pctChange(singaporeCurrent.arrivals, singaporePrevious.arrivals) : null;
  const previous = dataPeriod === '2026 H1' ? profile('2025', market, 'origin_region').filter((row) => !row.category.includes('(subtotal)')) : [];
  const admin = administrativeRegions.features.filter((item) => item.properties.market === market);
  const ids = market === 'Middle East' ? [...(MARKET_GEO[market]?.ids ?? []), '792', '818'] : MARKET_GEO[market]?.ids ?? [];
  const base = countries.filter((country) => ids.includes(String(country.id)));
  const detailed = ['Japan', 'Russia', 'Singapore'].includes(market);
  const geometry: FeatureCollection<Geometry> = {
    type: 'FeatureCollection',
    features: market === 'Australia' ? australianStates.features : detailed ? admin : [...base, ...admin],
  };
  if (market !== 'Singapore' && (!dataPeriod || !rows.length)) {
    return <div className="chart-empty">Origin data is unavailable for this country and period.</div>;
  }
  const projection = geometry.features.length
    ? geoMercator().rotate(market === 'Russia' ? [-100, 0] : [0, 0]).fitExtent([[20, 15], [780, 485]], geometry)
    : null;
  const path = projection ? geoPath(projection) : null;
  const mappedCities = rows.flatMap((row) => {
    if (market === 'Japan' || market === 'Singapore' || (market === 'Indonesia' && row.category === 'Bali')) return [];
    const city = cities.find((item) => item.market === market && item.category === row.category);
    return city ? [{ ...row, coordinates: city.coordinates }] : [];
  });
  const max = Math.max(...rows.map((row) => row.value), 1);
  const shares = [...new Set(rows.map((row) => row.value))].sort((a, b) => a - b);
  const colorFor = (share: number) => colors[Math.min(colors.length - 1, Math.floor(shares.indexOf(share) / Math.max(shares.length - 1, 1) * (colors.length - 1)))];
  const regionRow = (item: typeof admin[number]) => rows.find((row) => countryOriginMatches(market, row.category, item.properties));
  const mapped = (category: string) => {
    return mappedCities.some((row) => row.category === category)
      || (market === 'Australia' && australianStates.features.some((item) => item.properties.name === category))
      || (market === 'Middle East' && Object.values(middleEastIds).includes(category))
      || admin.some((item) => countryOriginMatches(market, category, item.properties));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
      {path && projection ? (
        <svg viewBox="0 0 800 500" role="img" aria-label={`${market} visitor origins${dataPeriod ? `, ${dataPeriod}` : ''}: ${rows.map((row) => `${countryOriginLabel(market, row.category)} ${formatShare(row.value)}`).join(', ')}`} className="h-auto w-full rounded-xl bg-slate-50/60">
          {!detailed && market !== 'Australia' && base.map((item) => {
            const category = market === 'Middle East' ? middleEastIds[String(item.id)] : undefined;
            const row = rows.find((entry) => entry.category === category);
            return <path key={String(item.id)} d={path(item) ?? ''} fill={row ? colorFor(row.value) : '#e2e8f0'} stroke="#fff" strokeWidth={0.8} style={{ transition: 'fill 400ms' }}><title>{row ? `${row.category}: ${formatShare(row.value)}` : item.properties.name}</title></path>;
          })}
          {market === 'Australia' && australianStates.features.map((item) => {
            const row = rows.find((entry) => entry.category === item.properties.name);
            return <path key={item.properties.name} d={path(item) ?? ''} fill={row ? colorFor(row.value) : '#e2e8f0'} stroke="#fff" strokeWidth={0.8} style={{ transition: 'fill 400ms' }}><title>{row ? `${row.category}: ${formatShare(row.value)}` : `${item.properties.name}: no data`}</title></path>;
          })}
          {admin.map((item, index) => {
            const row = regionRow(item);
            return <path key={`${item.properties.category}-${index}`} d={path(item) ?? ''} fill={row ? colorFor(row.value) : market === 'Singapore' ? '#f5a64a' : '#e2e8f0'} stroke="#fff" strokeWidth={0.8} style={{ transition: 'fill 400ms' }}><title>{row ? `${countryOriginLabel(market, row.category)}: ${formatShare(row.value)}` : item.properties.category ?? 'No data'}</title></path>;
          })}
          {[...mappedCities].sort((a, b) => b.value - a.value).map((row) => {
            const point = projection([row.coordinates[0], row.coordinates[1]]);
            return point ? <circle key={`${market}-${row.category}`} className="origin-dot" cx={point[0]} cy={point[1]} r={5 + 15 * Math.sqrt(row.value / max)} fill={colorFor(row.value)} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5}><title>{`${countryOriginLabel(market, row.category)}: ${formatShare(row.value)}`}</title></circle> : null;
          })}
        </svg>
      ) : <div className="chart-empty">Mapped origin locations are unavailable for this country.</div>}
      {market === 'Singapore' ? (
        <div className="space-y-2 text-xs text-slate-600">
          <p className="font-semibold">Singapore · all visitors · H1 2026</p>
          <p>Visitors: <strong>{singaporeCurrent ? formatNumber(singaporeCurrent.arrivals) : 'Unavailable'}</strong></p>
          <p>Change vs H1 2025: <strong className={changeColorClass(singaporeGrowth)}>{singaporeGrowth === null ? 'Unavailable' : formatPct(singaporeGrowth, 1, true)}</strong></p>
          <p>The HKTB profile does not provide a city breakdown for Singapore. Counts are shown for the exact H1 selection.</p>
        </div>
      ) : (
        <div className="text-xs">
          <p className="mb-2 font-semibold text-slate-600">{dataPeriod} · overnight visitors</p>
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 pb-2 font-semibold text-slate-600"><span>Origin</span><span>Share</span><span>Change (%)</span></div>
          <ol className="space-y-1.5">
            {rows.map((row) => {
              const growth = countryOriginChange(market, row, previous);
              return (
                <li key={row.category} className="grid grid-cols-[1fr_auto_auto] gap-3">
                  <span className="flex items-center gap-2">
                    {mapped(row.category) && <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ background: colorFor(row.value) }} />}
                    {countryOriginLabel(market, row.category)}{!mapped(row.category) && <span className="text-slate-500">(not mapped)</span>}
                  </span>
                  <strong>{formatShare(row.value)}</strong>
                  <span className={`${changeColorClass(growth)} ${growth === 'new' ? 'text-[12px] font-bold' : ''}`}>{growth === null ? 'N/A' : growth === 'new' ? 'NEW' : `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`}</span>
                </li>
              );
            })}
          </ol>
          {market === 'Philippines' && <p className="mt-2 text-slate-500">Manila represents Greater Manila; Pampanga represents San Fernando in the HKTB report.</p>}
          {market === 'USA' && <p className="mt-2 text-slate-500">Arizona, New Jersey and North Carolina are state-level in the HKTB report and are plotted at Phoenix, Newark and Raleigh; the San Jose and San Diego areas are plotted at those cities.</p>}
          {market === 'Canada' && <p className="mt-2 text-slate-500">Richmond is Richmond, British Columbia.</p>}
        </div>
      )}
    </div>
  );
}
