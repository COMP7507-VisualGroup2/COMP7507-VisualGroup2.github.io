'use client';

import { useMemo, useState } from 'react';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { demographics } from '@/lib/data';
import { inRange } from '@/lib/filters';
import { formatCompact, formatNumber, formatPct } from '@/lib/format';
import { COUNTRY_TO_REGION } from '@/lib/regions';
import { COLORS } from '@/lib/theme';
import type { Filters } from '@/lib/types';

const WIDTH = 960;
const HEIGHT = 470;
const HK: [number, number] = [114.17, 22.32];
const ANCHORS: Record<string, [number, number]> = {
  CN: [104, 34], TW: [121, 23.7], NA: [134, 37], SA: [100, 8], AU: [134, -25],
  AM: [-98, 38], EU: [12, 50], ME: [46, 26], AF: [20, 3],
};

const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const countries = (feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>).features.filter(
  (f) => f.id !== '010',
);
const projection = geoEqualEarth().fitSize([WIDTH, HEIGHT], { type: 'FeatureCollection', features: countries });
const pathGen = geoPath(projection);
const PATHS = countries.map((f: Feature<Geometry, { name: string }>) => ({
  id: String(f.id),
  name: f.properties.name,
  region: COUNTRY_TO_REGION[String(f.id)],
  d: pathGen(f) ?? '',
}));

/** Choropleth of visitor arrivals by C&SD source region with inbound flow lines to Hong Kong. */
export default function OriginMap({ filters }: { filters: Filters }) {
  const [hover, setHover] = useState<{ region: string; country: string } | null>(null);

  const { byRegion, labels, total, max } = useMemo(() => {
    const byRegion: Record<string, number> = {};
    const labels: Record<string, { region: string; origin: string }> = {};
    demographics.region_monthly
      .filter((r) => inRange(r.month, filters))
      .forEach((r) => {
        byRegion[r.region_code] = (byRegion[r.region_code] ?? 0) + r.arrivals;
        labels[r.region_code] = { region: r.region, origin: r.origin };
      });
    const values = Object.values(byRegion);
    return { byRegion, labels, total: values.reduce((a, b) => a + b, 0), max: Math.max(...values, 1) };
  }, [filters]);

  const intensity = (v: number) => Math.log10(v + 1) / Math.log10(max + 1);
  const selectedOrigin = filters.origin;
  const fill = (region?: string) => {
    if (!region || !byRegion[region]) return COLORS.mist;
    if (selectedOrigin !== 'All' && labels[region]?.origin !== selectedOrigin) return '#f1f5f9';
    const t = intensity(byRegion[region]);
    // interpolate brand-100 -> brand-700
    const from = [194, 228, 230];
    const to = [0, 95, 115];
    const c = from.map((f, i) => Math.round(f + (to[i] - f) * Math.pow(t, 2.2)));
    return `rgb(${c.join(',')})`;
  };
  const hk = projection(HK) ?? [0, 0];
  const hovered = hover ? labels[hover.region] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="World map of visitor arrivals by source region">
        <g>
          {PATHS.map((p) => (
            <path
              key={p.id + p.name}
              d={p.d}
              fill={fill(p.region)}
              stroke={COLORS.canvas}
              strokeWidth={0.5}
              onMouseEnter={() => p.region && setHover({ region: p.region, country: p.name })}
              onMouseLeave={() => setHover(null)}
              className={p.region ? 'cursor-pointer transition-opacity hover:opacity-80' : undefined}
            />
          ))}
        </g>
        <g fill="none" strokeLinecap="round">
          {Object.entries(ANCHORS).map(([code, coords]) => {
            const v = byRegion[code];
            if (!v || code === 'CN' || (selectedOrigin !== 'All' && labels[code]?.origin !== selectedOrigin)) return null;
            const [x, y] = projection(coords) ?? [0, 0];
            const mx = (x + hk[0]) / 2;
            const my = Math.min(y, hk[1]) - Math.abs(x - hk[0]) * 0.18 - 20;
            return (
              <path
                key={code}
                d={`M${x},${y} Q${mx},${my} ${hk[0]},${hk[1]}`}
                stroke={COLORS.accent}
                strokeOpacity={0.75}
                strokeWidth={1 + 6 * Math.sqrt(v / max)}
              />
            );
          })}
        </g>
        <circle cx={hk[0]} cy={hk[1]} r={6} fill={COLORS.accentDeep} stroke={COLORS.canvas} strokeWidth={2} />
        <text x={hk[0] + 9} y={hk[1] + 4} fontSize={13} fontWeight={700} fill={COLORS.ink}>
          Hong Kong
        </text>
      </svg>

      <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-canvas/95 px-3 py-2 text-xs shadow-card ring-1 ring-mist">
        {hovered && hover ? (
          <>
            <p className="font-semibold text-slate-900">{hovered.region}</p>
            <p className="text-slate-600">
              {hover.country} · {hovered.origin}
            </p>
            <p className="mt-1 font-semibold text-brand-800">
              {formatNumber(byRegion[hover.region])} <span className="font-normal text-slate-600">({formatPct((byRegion[hover.region] / total) * 100)})</span>
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-slate-900">{formatCompact(total, 1)} arrivals</p>
            <p className="text-slate-600">Hover a country to see its source region</p>
          </>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          Fewer
          <span className="h-2.5 w-24 rounded" style={{ background: 'linear-gradient(90deg, rgb(194,228,230), rgb(0,95,115))' }} />
          More (log scale)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-6 rounded" style={{ background: COLORS.accent }} /> Inbound flow (width = volume)
        </span>
        <span>Macao (not drawn at this scale): {formatCompact(byRegion.MA ?? 0, 1)}</span>
      </div>
    </div>
  );
}
