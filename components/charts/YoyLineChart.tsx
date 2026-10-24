'use client';

import { useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { demographics } from '@/lib/data';
import { matchesSegment, sumBy } from '@/lib/filters';
import { formatCompact, formatNumber, monthLabel } from '@/lib/format';
import { AXIS_TICK, COLORS, TOOLTIP_STYLE } from '@/lib/theme';
import type { Filters } from '@/lib/types';

const YEAR_STYLE: Record<string, { color: string; dash?: string; width: number }> = {
  '2024': { color: COLORS.steel, dash: '4 3', width: 1.5 },
  '2025': { color: COLORS.accent, width: 2 },
  '2026': { color: COLORS.brandDeep, width: 3 },
};

/** Year-on-year comparison of monthly visitor arrivals (segment filters apply). */
export default function YoyLineChart({ filters }: { filters: Filters }) {
  const { data, years } = useMemo(() => {
    const rows = demographics.arrivals.filter((r) => matchesSegment(r, filters));
    const years = Array.from(new Set(rows.map((r) => r.month.slice(0, 4)))).sort();
    const data = Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const point: Record<string, string | number | null> = { month: monthLabel(`2000-${mm}`, false) };
      years.forEach((y) => {
        const sel = rows.filter((r) => r.month === `${y}-${mm}`);
        point[y] = sel.length ? sumBy(sel, (r) => r.arrivals) : null;
      });
      return point;
    });
    return { data, years };
  }, [filters]);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), 1)} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatNumber(Number(v))} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {years.map((y) => (
          <Line
            key={y}
            dataKey={y}
            stroke={YEAR_STYLE[y]?.color ?? COLORS.steelDeep}
            strokeWidth={YEAR_STYLE[y]?.width ?? 2}
            strokeDasharray={YEAR_STYLE[y]?.dash}
            dot={{ r: 2 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
