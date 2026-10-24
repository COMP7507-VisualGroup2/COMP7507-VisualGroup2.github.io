'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { revenue } from '@/lib/data';
import { quarterOf } from '@/lib/filters';
import { formatCompact, formatHkd, formatHkdMillions, formatNumber } from '@/lib/format';
import { AXIS_TICK, COLORS, ORIGIN_COLORS, SERIES, TOOLTIP_STYLE, VISITOR_TYPE_COLORS } from '@/lib/theme';
import { Segmented } from '../SectionCard';
import type { Filters, VisitorType } from '@/lib/types';

const SPEND_YEARS = Array.from(new Set(revenue.market_spending.map((r) => r.year))).sort();

/** Grouped bars: per-capita spending by source market, overnight vs same-day (C&SD 650-80004). */
export function PerCapitaByMarket({ filters }: { filters: Filters }) {
  const [year, setYear] = useState(SPEND_YEARS[SPEND_YEARS.length - 1]);
  const types: VisitorType[] = filters.visitorType === 'All' ? ['Overnight', 'Same-day'] : [filters.visitorType];
  const data = useMemo(() => {
    const markets = Array.from(new Set(revenue.market_spending.map((r) => r.market)));
    return markets
      .map((market) => {
        const point: Record<string, string | number> = { market };
        revenue.market_spending
          .filter((r) => r.market === market && r.year === year)
          .forEach((r) => {
            point[r.visitor_type] = r.per_capita_hkd;
            point.origin = r.origin;
          });
        return point;
      })
      .filter((p) => filters.origin === 'All' || p.origin === filters.origin)
      .sort((a, b) => Number(b.Overnight ?? 0) - Number(a.Overnight ?? 0));
  }, [year, filters.origin]);

  return (
    <div>
      <div className="mb-2">
        <Segmented size="xs" value={year} onChange={setYear} options={SPEND_YEARS.map((y) => ({ value: y, label: y }))} />
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

/** Scatter separating high-yield segments from volume-driven ones (bubble = total spend). */
export function YieldVolumeScatter({ filters }: { filters: Filters }) {
  const year = SPEND_YEARS[SPEND_YEARS.length - 1];
  const { points, medianVisitors, medianYield } = useMemo(() => {
    const markets = Array.from(new Set(revenue.market_spending.map((r) => r.market)));
    const points = markets
      .map((market) => {
        const rows = revenue.market_spending.filter(
          (r) => r.market === market && r.year === year && (filters.visitorType === 'All' || r.visitor_type === filters.visitorType),
        );
        const visitors = rows.reduce((a, r) => a + (r.visitors ?? 0), 0);
        const spend = rows.reduce((a, r) => a + r.spend_hkd_m, 0);
        return { market, origin: rows[0]?.origin, visitors, spend, yield: visitors ? (spend * 1e6) / visitors : 0 };
      })
      .filter((p) => p.visitors > 0 && (filters.origin === 'All' || p.origin === filters.origin));
    const median = (xs: number[]) => {
      const s = [...xs].sort((a, b) => a - b);
      return s.length ? s[Math.floor(s.length / 2)] : 0;
    };
    return { points, medianVisitors: median(points.map((p) => p.visitors)), medianYield: median(points.map((p) => p.yield)) };
  }, [filters, year]);

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
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
            label={{ value: 'Visitors (log scale)', position: 'insideBottom', offset: -2, fontSize: 10, fill: COLORS.steelDeep }}
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
                <div className="rounded-xl border border-mist bg-canvas px-3 py-2 text-xs shadow-card">
                  <p className="font-semibold text-slate-900">{p.market}</p>
                  <p className="text-slate-600">{formatNumber(p.visitors)} visitors</p>
                  <p className="text-slate-600">{formatHkd(p.yield)} per visitor</p>
                  <p className="text-slate-600">{formatHkdMillions(p.spend)} total</p>
                </div>
              );
            }}
          />
          <Scatter data={points} fillOpacity={0.8}>
            {points.map((p) => (
              <Cell key={p.market} fill={p.origin ? ORIGIN_COLORS[p.origin] : COLORS.steel} stroke={COLORS.canvas} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
        <span>↖ <strong className="text-slate-800">High-yield niche</strong>: high spend, low volume</span>
        <span className="text-right">↗ <strong className="text-slate-800">Core value</strong>: high spend, high volume</span>
        <span>↙ <strong className="text-slate-800">Develop</strong>: low spend, low volume</span>
        <span className="text-right">↘ <strong className="text-slate-800">Volume-driven</strong>: high volume, low spend</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
        {points.map((p) => (
          <li key={p.market} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: p.origin ? ORIGIN_COLORS[p.origin] : COLORS.steel }} />
            {p.market}
          </li>
        ))}
      </ul>
    </div>
  );
}

const INBOUND_CODES = ['ind_KEY_IND_2A1', 'ind_KEY_IND_2A2', 'ind_KEY_IND_2A3', 'ind_KEY_IND_2A4', 'ind_KEY_IND_2A5'];
const INBOUND_LABEL: Record<string, string> = {
  ind_KEY_IND_2A1: 'Retail (shopping)',
  ind_KEY_IND_2A2: 'Accommodation',
  ind_KEY_IND_2A3: 'Food & beverage (dining)',
  ind_KEY_IND_2A4: 'Cross-boundary transport',
  ind_KEY_IND_2A5: 'Others',
};

type VaMode = 'value_added_hkd_m' | 'employment';

/** Inbound tourism value added / employment by consumption category (C&SD 655-82101). */
export function ValueAddedChart() {
  const [mode, setMode] = useState<VaMode>('value_added_hkd_m');
  const data = useMemo(() => {
    const years = Array.from(new Set(revenue.tourism_industries.map((r) => r.year))).sort();
    return years.map((y) => {
      const point: Record<string, string | number | null> = { year: y };
      INBOUND_CODES.forEach((c) => {
        point[INBOUND_LABEL[c]] = revenue.tourism_industries.find((r) => r.year === y && r.code === c)?.[mode] ?? null;
      });
      return point;
    });
  }, [mode]);

  return (
    <div>
      <div className="mb-2">
        <Segmented<VaMode>
          size="xs"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'value_added_hkd_m', label: 'Value added (HK$)' },
            { value: 'employment', label: 'Employment' },
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="year" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (mode === 'employment' ? formatCompact(Number(v), 0) : formatHkdMillions(Number(v)))}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v) => (mode === 'employment' ? `${formatNumber(Number(v))} jobs` : formatHkdMillions(Number(v)))}
            cursor={{ fill: 'rgba(10,147,150,0.06)' }}
          />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {INBOUND_CODES.map((c, i) => (
            <Bar key={c} dataKey={INBOUND_LABEL[c]} stackId="va" fill={SERIES[i]} radius={i === INBOUND_CODES.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={48} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Accommodation receipts (BRI) as the official hotel-demand proxy: index bars + YoY line. */
export function AccommodationChart({ filters }: { filters: Filters }) {
  const data = useMemo(() => {
    const startQ = quarterOf(filters.start);
    const endQ = quarterOf(filters.end);
    return revenue.bri_quarterly
      .filter((r) => r.industry === 'Accommodation services' && r.quarter >= '2025-Q1' && r.quarter >= startQ && r.quarter <= endQ)
      .map((r) => ({ quarter: r.quarter.replace('-', ' '), Index: r.index, 'YoY %': r.yoy_pct }));
  }, [filters]);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="quarter" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis yAxisId="idx" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis yAxisId="pct" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => (name === 'YoY %' ? `${Number(v).toFixed(1)}%` : Number(v).toFixed(1))} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine yAxisId="idx" y={100} stroke={COLORS.steel} strokeDasharray="4 4" label={{ value: '2015 = 100', fontSize: 10, fill: COLORS.steelDeep, position: 'insideTopLeft' }} />
        <Bar yAxisId="idx" dataKey="Index" name="Accommodation BRI" fill={COLORS.brand} radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Line yAxisId="pct" dataKey="YoY %" stroke={COLORS.accentDeep} strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
