'use client';

import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import provinces from '@/data/china_provinces_natural_earth.json';
import { demographics } from '@/lib/data';
import { changeColorClass } from '@/lib/format';
import { mainlandOriginGrowth, mainlandOriginPeriod, mainlandOriginShares } from '@/lib/mainland-origin';
import type { Filters } from '@/lib/types';

const shapes = provinces as FeatureCollection<Geometry, { name: string }>;
const projection = geoMercator().fitExtent([[20, 15], [780, 485]], shapes);
const path = geoPath(projection);
const colors = ['#ffe2b7', '#ffc985', '#f5a64a', '#e47b19', '#ab5009'];

export default function MainlandOriginMap({ filters }: { filters: Pick<Filters, 'start' | 'end'> }) {
  const period = mainlandOriginPeriod(filters.start, filters.end);
  const rows = mainlandOriginShares(demographics.mainland_origin_provinces, period);
  const shares = [...new Set(rows.map((row) => row.all_visitors_share_pct))].sort((a, b) => a - b);
  const colorFor = (share: number) => colors[Math.min(colors.length - 1, Math.floor(shares.indexOf(share) / Math.max(shares.length - 1, 1) * (colors.length - 1)))];

  if (!period || !rows.length || !shares.some((share) => share > 0)) {
    return <div className="chart-empty">Mainland origin data is available for Jan–Jun 2026 or the full year 2025.</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
      <svg viewBox="0 0 800 500" role="img" aria-label={`Mainland visitor origins, ${period}: ${rows.map((row) => `${row.province_en} ${row.all_visitors_share_pct}%`).join(', ')}`} className="h-auto w-full rounded-xl bg-slate-50/60">
        {shapes.features.map((province) => {
          const row = rows.find((item) => item.province_en === province.properties.name);
          const fill = row ? colorFor(row.all_visitors_share_pct) : '#e2e8f0';
          return (
            <path key={province.properties.name} d={path(province) ?? ''} fill={fill} stroke="#fff" strokeWidth={0.8} style={{ transition: 'fill 400ms' }}>
              <title>{row ? `${row.province_en}: ${row.all_visitors_share_pct}%` : `${province.properties.name}: no data`}</title>
            </path>
          );
        })}
      </svg>
      <div className="text-xs">
        <p className="mb-2 font-semibold text-slate-600">{period} · all Mainland visitors</p>
        <div className="grid grid-cols-[minmax(0,1fr)_3rem_4rem] gap-2 pb-2 font-semibold text-slate-600"><span>Origin</span><span className="text-right">Share</span><span className="text-right">Change (%)</span></div>
        <ol className="space-y-1.5">
          {rows.map((row) => {
            const growth = mainlandOriginGrowth(row, demographics.mainland_origin_provinces);
            return (
              <li key={row.province_en} className="grid grid-cols-[minmax(0,1fr)_3rem_4rem] items-center gap-2">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ background: colorFor(row.all_visitors_share_pct) }} />
                  {row.province_en}
                </span>
                <strong className="text-right">{row.all_visitors_share_pct}%</strong>
                <span className={`text-right ${changeColorClass(growth)} ${growth === 'new' ? 'text-[14px] font-bold' : ''}`}>{growth === null ? 'N/A' : growth === 'new' ? 'NEW' : `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-slate-500">
          {period === '2026 H1'
            ? 'Change in all-visitor share (percentage points): H1 2026 minus 2025 full year. Periods differ in length. New means not listed in the 2025 top 10.'
            : 'Share change in percentage points is shown for H1 2026 minus 2025 full year.'}
        </p>
      </div>
    </div>
  );
}
