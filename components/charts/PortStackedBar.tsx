'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { demographics } from '@/lib/data';
import { bucket, inRange, portVisitors } from '@/lib/filters';
import { formatCompact, formatNumber } from '@/lib/format';
import { AXIS_TICK, COLORS, PORT_COLORS, TOOLTIP_STYLE } from '@/lib/theme';
import { Segmented } from '../SectionCard';
import type { Filters } from '@/lib/types';

type Mode = 'volume' | 'share';

/** Visitor entries by port of entry over time (ImmD), stacked; absolute or % share. */
export default function PortStackedBar({ filters }: { filters: Filters }) {
  const [mode, setMode] = useState<Mode>('volume');
  const { data, totals } = useMemo(() => {
    const rows = demographics.port_arrivals.filter((r) => inRange(r.month, filters));
    const totals: Record<string, number> = {};
    const data = [...bucket(rows, filters.granularity)].map(([period, items]) => {
      const point: Record<string, string | number> = { period };
      const sums = demographics.ports.map((p) => items.filter((r) => r.port === p).reduce((a, r) => a + portVisitors(r, filters), 0));
      const total = sums.reduce((a, b) => a + b, 0) || 1;
      demographics.ports.forEach((p, i) => {
        point[p] = mode === 'share' ? Number(((sums[i] / total) * 100).toFixed(1)) : sums[i];
        totals[p] = (totals[p] ?? 0) + sums[i];
      });
      return point;
    });
    return { data, totals };
  }, [filters, mode]);
  const grand = Object.values(totals).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Segmented<Mode>
          size="xs"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'volume', label: 'Entries' },
            { value: 'share', label: '% share' },
          ]}
        />
        <span className="text-[11px] text-slate-600">
          {filters.origin === 'All' ? 'All visitors' : filters.origin === 'Mainland' ? 'Mainland visitors' : 'Non-Mainland visitors'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            domain={mode === 'share' ? [0, 100] : undefined}
            tickFormatter={(v) => (mode === 'share' ? `${v}%` : formatCompact(Number(v), 0))}
          />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => (mode === 'share' ? `${v}%` : formatNumber(Number(v)))} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {demographics.ports.map((p, i) => (
            <Bar key={p} dataKey={p} stackId="port" fill={PORT_COLORS[p]} radius={i === demographics.ports.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={44} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {demographics.ports.map((p) => (
          <div key={p} className="rounded-lg bg-slate-50 px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: PORT_COLORS[p] }} />
              <span className="truncate text-[11px] text-slate-600">{p}</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">{(((totals[p] ?? 0) / grand) * 100).toFixed(1)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
