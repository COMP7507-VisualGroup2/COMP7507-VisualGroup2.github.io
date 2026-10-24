'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { demographics } from '@/lib/data';
import { bucket, inRange } from '@/lib/filters';
import { formatCompact, formatNumber } from '@/lib/format';
import { AXIS_TICK, COLORS, ORIGIN_COLORS, TOOLTIP_STYLE } from '@/lib/theme';
import type { Filters, Origin } from '@/lib/types';

export default function OriginStackedBar({ filters }: { filters: Filters }) {
  const { origins, data } = useMemo(() => {
    const origins: Origin[] = filters.origin === 'All' ? demographics.origins : [filters.origin];
    const rows = demographics.arrivals.filter(
      (r) => inRange(r.month, filters) && (filters.visitorType === 'All' || r.visitor_type === filters.visitorType),
    );
    const data = [...bucket(rows, filters.granularity)].map(([period, items]) => {
      const point: Record<string, string | number> = { period };
      origins.forEach((o) => {
        point[o] = items.filter((r) => r.origin === o).reduce((a, r) => a + r.arrivals, 0);
      });
      return point;
    });
    return { origins, data };
  }, [filters]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), 0)} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatNumber(Number(v))} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {origins.map((o, i) => (
          <Bar
            key={o}
            dataKey={o}
            stackId="origin"
            fill={ORIGIN_COLORS[o]}
            radius={i === origins.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
