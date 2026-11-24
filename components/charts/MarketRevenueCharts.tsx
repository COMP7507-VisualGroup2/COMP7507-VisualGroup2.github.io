'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact, formatHkd, formatHkdMillions, formatPct } from '@/lib/format';
import { SPEND_CATEGORIES, marketEconomics, segmentSpendByCategory } from '@/lib/markets';
import { marketInFilter, shortMarket } from '@/lib/persona';
import { AXIS_TICK, COLORS, SERIES, TOOLTIP_STYLE } from '@/lib/theme';
import type { Filters, ProfilePeriod, Segment } from '@/lib/types';

const ROW = 30;

const useRows = (period: ProfilePeriod, filters: Filters) =>
  useMemo(
    () => marketEconomics(period).filter((r) => marketInFilter(r.market, filters)),
    [period, filters],
  );

/** Share of overnight visitors against share of estimated overnight spend: who earns more than their headcount. */
export function MarketShareChart({ period, filters }: { period: ProfilePeriod; filters: Filters }) {
  const rows = useRows(period, filters);
  const data = useMemo(() => {
    const visitorTotal = rows.reduce((sum, row) => sum + row.overnight, 0);
    const spendTotal = rows.reduce((sum, row) => sum + (row.spend ?? 0), 0);
    return rows
      .filter((r) => r.spend !== null)
      .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0))
      .map((r) => ({
        ...r,
        name: shortMarket(r.market),
        overnightShare: visitorTotal ? (r.overnight / visitorTotal) * 100 : 0,
        spendShare: spendTotal ? ((r.spend ?? 0) / spendTotal) * 100 : 0,
      }));
  }, [rows]);

  if (!data.length) return <div className="chart-empty">No source-market share detail is available for the selected filters.</div>;
  return (
    <div>
      <ResponsiveContainer width="100%" height={60 + data.length * ROW}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke={COLORS.grid} horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fontSize: 13 }} tickLine={false} axisLine={false} width={78} interval={0} />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(242,142,43,0.08)' }}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!p) return null;
              return (
                <div className="rounded-xl border border-mist bg-canvas px-3 py-2 text-xs shadow-card">
                  <p className="font-semibold text-slate-900">{p.market}</p>
                  <p className="text-slate-600">Share of overnight visitors: {formatPct(p.overnightShare)}</p>
                  <p className="text-slate-600">Share of est. overnight spend: {formatPct(p.spendShare)}</p>
                  <p className="mt-1 font-semibold text-brand-800">
                    {formatHkdMillions(p.spend ?? 0)} · {formatHkd(p.perCapita ?? 0)} per visitor
                  </p>
                </div>
              );
            }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 14 }} />
          <Bar dataKey="overnightShare" name="Share of overnight visitors" fill={COLORS.steel} radius={[0, 3, 3, 0]} maxBarSize={11} />
          <Bar dataKey="spendShare" name="Share of estimated spend" fill={COLORS.brandDeep} radius={[0, 3, 3, 0]} maxBarSize={11} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Why estimated spend moved: more visitors (volume) or a different spend per head (yield). */
export function MarketDriversChart({ period, filters }: { period: ProfilePeriod; filters: Filters }) {
  const rows = useRows(period, filters);
  const data = useMemo(
    () =>
      rows
        .filter((r) => r.volumeEffect !== null && r.yieldEffect !== null)
        .map((r) => ({ name: shortMarket(r.market), market: r.market, volume: r.volumeEffect as number, yield: r.yieldEffect as number, net: (r.volumeEffect as number) + (r.yieldEffect as number) }))
        .sort((a, b) => b.net - a.net),
    [rows],
  );

  if (period !== '2026-H1') {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-600">
        The volume-versus-yield split compares Jan–Jun 2026 with 2025, so it appears when the date range reaches 2026.
      </div>
    );
  }
  if (!data.length) return <div className="chart-empty">No source-market spend-change detail is available for the selected filters.</div>;
  return (
    <div>
      <ResponsiveContainer width="100%" height={60 + data.length * ROW}>
        <BarChart data={data} layout="vertical" stackOffset="sign" margin={{ top: 0, right: 16, left: 4, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke={COLORS.grid} horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), 0)} />
          <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fontSize: 13 }} tickLine={false} axisLine={false} width={78} interval={0} />
          <ReferenceLine x={0} stroke={COLORS.steelDeep} />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(242,142,43,0.08)' }}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!p) return null;
              const signed = (v: number) => `${v >= 0 ? '+' : '−'}${formatHkdMillions(Math.abs(v))}`;
              return (
                <div className="rounded-xl border border-mist bg-canvas px-3 py-2 text-xs shadow-card">
                  <p className="font-semibold text-slate-900">{p.market}</p>
                  <p className="text-slate-600">More or fewer visitors: {signed(p.volume)}</p>
                  <p className="text-slate-600">Spend per head: {signed(p.yield)}</p>
                  <p className="mt-1 font-semibold text-brand-800">Net change: {signed(p.net)}</p>
                </div>
              );
            }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 14 }} />
          <Bar dataKey="volume" name="Visitor volume" stackId="d" fill={COLORS.brandDeep} maxBarSize={14} />
          <Bar dataKey="yield" name="Spend per visitor" stackId="d" fill={COLORS.accent} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Where the money goes: estimated overnight spend (HK$) by category for each HKTB segment. */
export function SegmentCategoryChart({ year, segment }: { year: string; segment?: Segment }) {
  const data = useMemo(() => segmentSpendByCategory(year).filter((row) => segment === undefined || row.segment === segment), [year, segment]);
  if (!data.length) return <div className="chart-empty">Not published for Jan–Jun {year}.</div>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }} barCategoryGap={14}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatHkdMillions(Number(v))} />
        <YAxis type="category" dataKey="segment" tick={{ ...AXIS_TICK, fontSize: 13 }} tickLine={false} axisLine={false} width={78} />
        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: 'rgba(242,142,43,0.08)' }} formatter={(v) => formatHkdMillions(Number(v))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 14 }} />
        {SPEND_CATEGORIES.map((c, i) => (
          <Bar key={c} dataKey={c} stackId="c" fill={SERIES[i]} maxBarSize={30} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
