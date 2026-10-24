'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { revenue } from '@/lib/data';
import { quarterOf } from '@/lib/filters';
import { AXIS_TICK, COLORS, SERIES, TOOLTIP_STYLE } from '@/lib/theme';
import { Segmented } from '../SectionCard';
import type { Filters } from '@/lib/types';

const SECTORS = [
  { key: 'Retail', label: 'Retail' },
  { key: 'Food services', label: 'Dining (food services)' },
  { key: 'Accommodation services', label: 'Accommodation' },
  { key: 'Air transport', label: 'Air transport' },
  { key: 'Land transport', label: 'Land transport' },
];

type Mode = 'yoy' | 'index';

/** Sector-specific revenue trends from the C&SD Business Receipts Indices. */
export default function SectorRevenueChart({ filters }: { filters: Filters }) {
  const [mode, setMode] = useState<Mode>('yoy');
  const data = useMemo(() => {
    const startQ = quarterOf(filters.start);
    const endQ = quarterOf(filters.end);
    const quarters = Array.from(new Set(revenue.bri_quarterly.map((r) => r.quarter)))
      .filter((q) => q >= '2025-Q1' && q >= startQ && q <= endQ)
      .sort();
    return quarters.map((q) => {
      const point: Record<string, string | number | null> = { quarter: q.replace('-', ' ') };
      SECTORS.forEach((s) => {
        const rec = revenue.bri_quarterly.find((r) => r.quarter === q && r.industry === s.key);
        point[s.label] = rec ? (mode === 'yoy' ? rec.yoy_pct : rec.index) : null;
      });
      return point;
    });
  }, [filters, mode]);

  return (
    <div>
      <div className="mb-2">
        <Segmented<Mode>
          size="xs"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'yoy', label: 'YoY % change' },
            { value: 'index', label: 'Index (2015 = 100)' },
          ]}
        />
      </div>
      {data.length ? (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="quarter" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => (mode === 'yoy' ? `${v}%` : `${v}`)} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => (mode === 'yoy' ? `${Number(v).toFixed(1)}%` : Number(v).toFixed(1))} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={mode === 'yoy' ? 0 : 100} stroke={COLORS.steel} strokeDasharray="4 4" />
            {SECTORS.map((s, i) => (
              <Line key={s.key} dataKey={s.label} stroke={SERIES[i]} strokeWidth={2.2} dot={{ r: 2.5 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="py-10 text-center text-sm text-slate-600">No quarterly BRI data in the selected range.</p>
      )}
    </div>
  );
}
