'use client';

import { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { revenue } from '@/lib/data';
import { bucket, inRange } from '@/lib/filters';
import { formatHkd } from '@/lib/format';
import { AXIS_TICK, COLORS, TOOLTIP_STYLE } from '@/lib/theme';
import type { Filters } from '@/lib/types';

/** Hotel occupancy, vacancy gap and ADR (only when data/manual/hotel_occupancy_monthly.csv is supplied). */
export default function HotelComboChart({ filters }: { filters: Filters }) {
  const data = useMemo(() => {
    const rows = revenue.hotel_monthly.filter((h) => inRange(h.month, filters) && h.occupancy_pct !== null);
    return [...bucket(rows, filters.granularity)].map(([period, items]) => {
      const avg = (k: 'occupancy_pct' | 'adr_hkd') => {
        const vals = items.map((r) => r[k]).filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };
      const occ = avg('occupancy_pct');
      const adr = avg('adr_hkd');
      return {
        period,
        ADR: adr !== null ? Math.round(adr) : null,
        Occupancy: occ !== null ? Number(occ.toFixed(1)) : null,
        'Vacancy gap': occ !== null ? Number((100 - occ).toFixed(1)) : null,
      };
    });
  }, [filters]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 0, left: -4, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
        <YAxis yAxisId="hkd" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
        <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => (name === 'ADR (HKD)' ? formatHkd(Number(v)) : `${v}%`)} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="hkd" dataKey="ADR" name="ADR (HKD)" fill={COLORS.brandLight} radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Line yAxisId="pct" dataKey="Occupancy" stroke={COLORS.brandDeep} strokeWidth={2.5} dot={{ r: 2.5 }} />
        <Line yAxisId="pct" dataKey="Vacancy gap" stroke={COLORS.accent} strokeWidth={2} strokeDasharray="4 3" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
