'use client';

import { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { demographics, kpiSummary } from '@/lib/data';
import { isSegmented, selectArrivals, shiftYear, sumBy } from '@/lib/filters';
import { formatCompact, formatNumber, formatPct, monthLabel } from '@/lib/format';
import { AXIS_TICK, COLORS, TOOLTIP_STYLE } from '@/lib/theme';
import type { Filters } from '@/lib/types';

interface TickProps {
  cx?: number;
  cy?: number;
  fill?: string;
}

const Tick = ({ cx = 0, cy = 0, fill }: TickProps) =>
  Number.isFinite(cy) ? <rect x={cx - 13} y={cy - 1.5} width={26} height={3} rx={1.5} fill={fill} /> : <g />;

/**
 * Bullet graph: actual monthly arrivals (bar) vs prior-year (marker), against the 2019
 * level (background band) and an official target (marker) when supplied in data/manual.
 */
export default function ArrivalsBullet({ filters }: { filters: Filters }) {
  const { rows, ytd } = useMemo(() => {
    const current = selectArrivals(demographics.arrivals, filters);
    const prior = selectArrivals(demographics.arrivals, filters, -1);
    const months = Array.from(new Set(current.map((r) => r.month))).sort();
    const segmented = isSegmented(filters);
    const targets = Object.fromEntries(kpiSummary.targets.map((t) => [t.year, t.target_arrivals]));
    const priorYearTotal = (year: string) =>
      sumBy(kpiSummary.monthly.filter((m) => m.month.startsWith(year)), (m) => m.prior_year ?? 0);
    const rows = months.map((m) => {
      const base = kpiSummary.monthly.find((x) => x.month === m);
      const target = !segmented && targets[m.slice(0, 4)] && base?.prior_year
        ? (targets[m.slice(0, 4)]! * base.prior_year) / priorYearTotal(m.slice(0, 4))
        : null;
      return {
        month: monthLabel(m),
        Actual: sumBy(current.filter((r) => r.month === m), (r) => r.arrivals),
        'Prior year': sumBy(prior.filter((r) => r.month === shiftYear(m, -1)), (r) => r.arrivals) || null,
        '2019 level': segmented ? null : base?.baseline_2019 ?? null,
        Target: target ? Math.round(target) : null,
      };
    });
    const total = (k: 'Actual' | 'Prior year' | '2019 level' | 'Target') => sumBy(rows, (r) => (r[k] as number | null) ?? 0);
    return { rows, ytd: { actual: total('Actual'), prior: total('Prior year'), base: total('2019 level'), target: total('Target') } };
  }, [filters]);

  const max = Math.max(ytd.actual, ytd.prior, ytd.base, ytd.target) * 1.05 || 1;
  const pos = (v: number) => `${(v / max) * 100}%`;

  return (
    <div>
      <div className="mb-4 rounded-xl bg-slate-50 p-3">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-800">Selected period total</span>
          <span className="text-slate-600">
            {formatCompact(ytd.actual, 2)} actual
            {ytd.prior ? ` · ${formatPct(((ytd.actual - ytd.prior) / ytd.prior) * 100, 1, true)} vs prior year` : ''}
            {ytd.base ? ` · ${formatPct((ytd.actual / ytd.base) * 100)} of 2019` : ''}
            {ytd.target ? ` · ${formatPct((ytd.actual / ytd.target) * 100)} of target` : ''}
          </span>
        </div>
        <div className="relative h-7 rounded-md bg-mist" role="img" aria-label="Bullet graph of selected period arrivals">
          {ytd.base > 0 && <div className="absolute inset-y-0 left-0 rounded-md bg-blush" style={{ width: pos(ytd.base) }} />}
          <div className="absolute left-0 top-1/2 h-3 -translate-y-1/2 rounded-sm bg-brand-700" style={{ width: pos(ytd.actual) }} />
          {ytd.prior > 0 && <div className="absolute inset-y-1 w-1 rounded bg-accent-500" style={{ left: pos(ytd.prior) }} title="Prior year" />}
          {ytd.target > 0 && <div className="absolute -inset-y-0.5 w-1 rounded bg-slate-900" style={{ left: pos(ytd.target) }} title="Target" />}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-600">
          <Legend2 color={COLORS.brandDeep} label="Actual" />
          <Legend2 color={COLORS.accent} label="Prior year" />
          <Legend2 color={COLORS.blush} label="2019 level" />
          {ytd.target > 0 ? <Legend2 color={COLORS.ink} label="Target" /> : <span>Official target: data pending</span>}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={rows} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis xAxisId="band" dataKey="month" hide />
          <XAxis xAxisId="main" dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), 1)} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatNumber(Number(v))} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar xAxisId="band" dataKey="2019 level" fill={COLORS.blush} barSize={30} radius={[3, 3, 0, 0]} />
          <Bar xAxisId="main" dataKey="Actual" fill={COLORS.brandDeep} barSize={12} radius={[3, 3, 0, 0]} />
          <Scatter xAxisId="main" dataKey="Prior year" fill={COLORS.accent} shape={<Tick />} legendType="rect" />
          {rows.some((r) => r.Target) && <Scatter xAxisId="main" dataKey="Target" fill={COLORS.ink} shape={<Tick />} legendType="rect" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legend2({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
