'use client';

import { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { demographics } from '@/lib/data';
import { formatCompact, formatNumber } from '@/lib/format';
import { AXIS_TICK, COLORS, TOOLTIP_STYLE, VISITOR_TYPE_COLORS } from '@/lib/theme';

/** Overnight vs same-day visitors (annual, C&SD 650-80005) with average length of stay. */
export default function VisitorTypeChart() {
  const data = useMemo(() => {
    const years = Array.from(new Set(demographics.visitor_type_annual.map((r) => r.year))).sort();
    return years.map((y) => {
      const rows = demographics.visitor_type_annual.filter((r) => r.year === y);
      const overnight = rows.find((r) => r.visitor_type === 'Overnight')?.arrivals ?? 0;
      const sameDay = rows.find((r) => r.visitor_type === 'Same-day')?.arrivals ?? 0;
      const total = overnight + sameDay || 1;
      return {
        year: y,
        Overnight: overnight,
        'Same-day': sameDay,
        'Same-day share': Number(((sameDay / total) * 100).toFixed(1)),
      };
    });
  }, []);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="year" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis yAxisId="n" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), 0)} />
        <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(v, name) => (name === 'Same-day share' ? `${v}%` : formatNumber(Number(v)))}
          cursor={{ fill: 'rgba(10,147,150,0.06)' }}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="n" dataKey="Overnight" stackId="v" fill={VISITOR_TYPE_COLORS.Overnight} maxBarSize={48} />
        <Bar yAxisId="n" dataKey="Same-day" stackId="v" fill={VISITOR_TYPE_COLORS['Same-day']} radius={[4, 4, 0, 0]} maxBarSize={48} />
        <Line yAxisId="pct" dataKey="Same-day share" stroke={COLORS.ink} strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
