'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact, formatHkd, formatHkdMillions, formatPct } from '@/lib/format';
import { SPEND_CATEGORIES, marketEconomics, segmentSpendByCategory } from '@/lib/markets';
import { PERIOD_LABEL, shortMarket } from '@/lib/persona';
import { AXIS_TICK, COLORS, SERIES, TOOLTIP_STYLE } from '@/lib/theme';
import type { Origin, ProfilePeriod } from '@/lib/types';

const ROW = 30;

function HideMainland({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-slate-600">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-brand-700" />
      Hide Mainland (to compare smaller markets)
    </label>
  );
}

const useRows = (period: ProfilePeriod, origin: Origin | 'All', hideMainland: boolean) =>
  useMemo(
    () => marketEconomics(period).filter((r) => (origin === 'All' || r.origin === origin) && !(hideMainland && r.origin === 'Mainland')),
    [period, origin, hideMainland],
  );

/** Share of overnight visitors against share of estimated overnight spend: who earns more than their headcount. */
export function MarketShareChart({ period, origin }: { period: ProfilePeriod; origin: Origin | 'All' }) {
  const [hideMainland, setHideMainland] = useState(false);
  const rows = useRows(period, origin, hideMainland);
  const data = useMemo(() => rows.filter((r) => r.spend !== null).sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0)).map((r) => ({ ...r, name: shortMarket(r.market) })), [rows]);

  return (
    <div>
      {(origin === 'All' || origin === 'Mainland') && <HideMainland checked={hideMainland} onChange={setHideMainland} />}
      <ResponsiveContainer width="100%" height={60 + data.length * ROW}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke={COLORS.grid} horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fontSize: 11 }} tickLine={false} axisLine={false} width={78} interval={0} />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(10,147,150,0.06)' }}
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
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="overnightShare" name="Share of overnight visitors" fill={COLORS.steel} radius={[0, 3, 3, 0]} maxBarSize={11} />
          <Bar dataKey="spendShare" name="Share of estimated spend" fill={COLORS.brandDeep} radius={[0, 3, 3, 0]} maxBarSize={11} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Why estimated spend moved: more visitors (volume) or a different spend per head (yield). */
export function MarketDriversChart({ period, origin }: { period: ProfilePeriod; origin: Origin | 'All' }) {
  const [hideMainland, setHideMainland] = useState(false);
  const rows = useRows(period, origin, hideMainland);
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
  return (
    <div>
      {(origin === 'All' || origin === 'Mainland') && <HideMainland checked={hideMainland} onChange={setHideMainland} />}
      <ResponsiveContainer width="100%" height={60 + data.length * ROW}>
        <BarChart data={data} layout="vertical" stackOffset="sign" margin={{ top: 0, right: 16, left: 4, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke={COLORS.grid} horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), 0)} />
          <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fontSize: 11 }} tickLine={false} axisLine={false} width={78} interval={0} />
          <ReferenceLine x={0} stroke={COLORS.steelDeep} />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(10,147,150,0.06)' }}
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
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="volume" name="Visitor volume" stackId="d" fill={COLORS.brandDeep} maxBarSize={14} />
          <Bar dataKey="yield" name="Spend per visitor" stackId="d" fill={COLORS.accent} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Where the money goes: estimated overnight spend (HK$) by category for each HKTB segment. */
export function SegmentCategoryChart({ period }: { period: ProfilePeriod }) {
  const data = useMemo(() => segmentSpendByCategory(period), [period]);
  if (!data.length) return <p className="text-sm text-slate-600">Not published for {PERIOD_LABEL[period]}.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }} barCategoryGap={14}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatHkdMillions(Number(v))} />
        <YAxis type="category" dataKey="segment" tick={{ ...AXIS_TICK, fontSize: 11 }} tickLine={false} axisLine={false} width={78} />
        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: 'rgba(10,147,150,0.06)' }} formatter={(v) => formatHkdMillions(Number(v))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {SPEND_CATEGORIES.map((c, i) => (
          <Bar key={c} dataKey={c} stackId="c" fill={SERIES[i]} maxBarSize={30} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
