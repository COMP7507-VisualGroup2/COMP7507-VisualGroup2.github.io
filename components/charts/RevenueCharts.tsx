'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { summary } from '@/lib/data';
import { formatCompact, formatHkd, formatHkdMillions, formatNumber } from '@/lib/format';
import { marketEconomics } from '@/lib/markets';
import { PERIOD_LABEL, marketInFilter, shortMarket } from '@/lib/persona';
import { AXIS_TICK, COLORS, ORIGIN_COLORS, TOOLTIP_STYLE, VISITOR_TYPE_COLORS } from '@/lib/theme';
import { Segmented } from '../SectionCard';
import type { Filters, Origin, ProfilePeriod, VisitorType } from '@/lib/types';

const YEARS = Array.from(new Set(summary.area_h1.map((r) => r.year))).sort();
const areaInFilter = (area: { area: string; segment: string }, f: Filters) =>
  (f.origin === 'All' || area.segment === f.origin) && (f.region === 'All' || area.area === f.region);

/** Grouped bars: per-capita spending by TEAIT market area, overnight vs same-day (HKTB, Jan-Jun). */
export function PerCapitaByMarket({ filters }: { filters: Filters }) {
  const [year, setYear] = useState(YEARS[YEARS.length - 1]);
  const types: VisitorType[] = filters.visitorType === 'All' ? ['Overnight', 'Same-day'] : [filters.visitorType];
  const data = useMemo(
    () =>
      summary.area_h1
        .filter((r) => r.year === year && areaInFilter(r, filters))
        .map((r) => ({ market: r.area, Overnight: r.overnight_per_capita_hkd, 'Same-day': r.same_day_per_capita_hkd }))
        .sort((a, b) => b.Overnight - a.Overnight),
    [year, filters],
  );

  return (
    <div>
      <div className="mb-2">
        <Segmented value={year} onChange={setYear} options={YEARS.map((y) => ({ value: y, label: `H1 ${y}` }))} />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="market" tick={{ ...AXIS_TICK, fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={64} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatCompact(Number(v), 0)}`} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatHkd(Number(v))} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {types.map((t) => (
            <Bar key={t} dataKey={t} name={`${t} per capita`} fill={VISITOR_TYPE_COLORS[t]} radius={[4, 4, 0, 0]} maxBarSize={22} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Scatter separating high-yield markets from volume-driven ones (bubble = total overnight spend). */
export function YieldVolumeScatter({ filters, period }: { filters: Filters; period: ProfilePeriod }) {
  const [mode, setMode] = useState<'markets' | 'areas'>('markets');
  const year = period === '2026-H1' ? '2026' : '2025';
  const { points, medianVisitors, medianYield } = useMemo(() => {
    const median = (xs: number[]) => {
      const s = [...xs].sort((a, b) => a - b);
      return s.length ? s[Math.floor(s.length / 2)] : 0;
    };
    const points =
      mode === 'markets'
        ? marketEconomics(period)
            .filter((r) => r.spend !== null && r.perCapita !== null && marketInFilter(r.market, filters))
            .map((r) => ({ market: r.market, short: shortMarket(r.market), origin: r.origin as Origin, visitors: r.overnight, spend: r.spend as number, yield: r.perCapita as number }))
        : summary.area_h1
            .filter((r) => r.year === year && r.overnight_visitors && areaInFilter(r, filters))
            .map((r) => ({ market: r.area, short: r.area, origin: r.segment as Origin, visitors: r.overnight_visitors as number, spend: r.overnight_spend_hkd_m, yield: r.overnight_per_capita_hkd }));
    return { points, medianVisitors: median(points.map((p) => p.visitors)), medianYield: median(points.map((p) => p.yield)) };
  }, [filters, year, mode, period]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'markets', label: '18 source markets' },
            { value: 'areas', label: 'TEAIT market areas' },
          ]}
        />
        <span className="text-[11px] text-[#74808a]">
          {mode === 'markets' ? `Overnight visitors, ${PERIOD_LABEL[period]} (HKTB profile)` : `Overnight visitors, Jan–Jun ${year} (HKTB TEAIT)`}
        </span>
      </div>
      {points.length === 0 ? (
        <div className="chart-empty">No market in the selected market / country filters.</div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 12, right: 16, left: -4, bottom: 4 }}>
            <CartesianGrid stroke={COLORS.grid} />
            <XAxis
              type="number"
              dataKey="visitors"
              name="Visitors"
              scale="log"
              domain={['auto', 'auto']}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompact(Number(v), 0)}
              label={{ value: 'Overnight visitors (log scale)', position: 'insideBottom', offset: -2, fontSize: 10, fill: COLORS.steelDeep }}
            />
            <YAxis type="number" dataKey="yield" name="Spend / visitor" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatCompact(Number(v), 1)}`} />
            <ZAxis type="number" dataKey="spend" range={[120, 1600]} name="Total spend" />
            <ReferenceLine x={medianVisitors} stroke={COLORS.steel} strokeDasharray="4 4" />
            <ReferenceLine y={medianYield} stroke={COLORS.steel} strokeDasharray="4 4" />
            <Tooltip
              {...TOOLTIP_STYLE}
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                const p = payload?.[0]?.payload as (typeof points)[number] | undefined;
                if (!p) return null;
                return (
                  <div className="rounded-[5px] border border-[#e1e7ea] bg-canvas px-3 py-2 text-xs shadow-card">
                    <p className="font-semibold text-[#0a2540]">{p.market}</p>
                    <p className="text-[#53636e]">{formatNumber(p.visitors)} overnight visitors</p>
                    <p className="text-[#53636e]">{formatHkd(p.yield)} per visitor</p>
                    <p className="text-[#53636e]">{formatHkdMillions(p.spend)} total</p>
                  </div>
                );
              }}
            />
            <Scatter data={points} fillOpacity={0.8} label={{ dataKey: 'short', position: 'top', fontSize: 9, fill: COLORS.ink }}>
              {points.map((p) => (
                <Cell key={p.market} fill={ORIGIN_COLORS[p.origin] ?? COLORS.steel} stroke={COLORS.canvas} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}
      <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-[#74808a]">
        <span>↖ <strong className="text-[#405461]">High-yield niche</strong>: high spend, low volume</span>
        <span className="text-right">↗ <strong className="text-[#405461]">Core value</strong>: high spend, high volume</span>
        <span>↙ <strong className="text-[#405461]">Develop</strong>: low spend, low volume</span>
        <span className="text-right">↘ <strong className="text-[#405461]">Volume-driven</strong>: high volume, low spend</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#74808a]">
        {(Object.keys(ORIGIN_COLORS) as Origin[]).map((o) => (
          <li key={o} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: ORIGIN_COLORS[o] }} />
            {o}
          </li>
        ))}
      </ul>
    </div>
  );
}
