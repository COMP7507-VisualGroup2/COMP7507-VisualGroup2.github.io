'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { demographics } from '@/lib/data';
import { bucket, inRange } from '@/lib/filters';
import { formatCompact, formatNumber } from '@/lib/format';
import { MARKET_COLORS, MARKETS, shortMarket } from '@/lib/persona';
import { AXIS_TICK, COLORS, ORIGIN_COLORS, TOOLTIP_STYLE } from '@/lib/theme';
import type { Filters, Origin } from '@/lib/types';
import { Segmented } from '../SectionCard';

type Mode = 'segments' | 'markets';

/** Origin mix over time: C&SD segments (all months) or the 18 HKTB source markets (Jan-Jun 2025 / 2026). */
export default function OriginStackedBar({ filters }: { filters: Filters }) {
  const [mode, setMode] = useState<Mode>('segments');
  const [hideMainland, setHideMainland] = useState(false);

  const { keys, colors, data, note } = useMemo(() => {
    if (mode === 'segments') {
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
      return { keys: origins as string[], colors: ORIGIN_COLORS as Record<string, string>, data, note: null };
    }
    const markets = MARKETS.filter(
      (m) => (filters.origin === 'All' || m.origin === filters.origin) && !(hideMainland && m.origin === 'Mainland'),
    ).map((m) => m.market);
    const keys = filters.origin === 'All' ? [...markets, 'Other markets'] : markets;
    const rows = demographics.market_monthly.filter((r) => inRange(r.month, filters) && keys.includes(r.market));
    const data = [...bucket(rows, filters.granularity)].map(([period, items]) => {
      const point: Record<string, string | number> = { period };
      keys.forEach((k) => {
        point[k] = items.filter((r) => r.market === k).reduce((a, r) => a + r.arrivals, 0);
      });
      return point;
    });
    const notes = ['Nationality detail is published for Jan–Jun 2025 and Jan–Jun 2026 only (HKTB monthly workbooks).'];
    if (filters.visitorType !== 'All') notes.push('Monthly market figures cover all visitors (no overnight/same-day split).');
    return { keys, colors: MARKET_COLORS, data, note: notes.join(' ') };
  }, [filters, mode, hideMainland]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Segmented<Mode>
          size="xs"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'segments', label: 'Segments' },
            { value: 'markets', label: '18 markets' },
          ]}
        />
        {mode === 'markets' && (filters.origin === 'All' || filters.origin === 'Mainland') && (
          <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
            <input type="checkbox" checked={hideMainland} onChange={(e) => setHideMainland(e.target.checked)} className="accent-brand-700" />
            Hide Mainland (to compare smaller markets)
          </label>
        )}
      </div>
      {data.length ? (
        <ResponsiveContainer width="100%" height={mode === 'markets' ? 340 : 280}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), 0)} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v, name) => [formatNumber(Number(v)), mode === 'markets' ? String(name) : name]}
              itemSorter={(item) => -Number(item.value)}
              cursor={{ fill: 'rgba(10,147,150,0.06)' }}
              wrapperStyle={{ zIndex: 20 }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: mode === 'markets' ? 10 : 12 }}
              formatter={(v) => <span style={{ color: COLORS.steelDeep }}>{mode === 'markets' ? shortMarket(String(v)) : v}</span>}
            />
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="origin" fill={colors[k]} radius={i === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={48} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[280px] items-center justify-center rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-600">
          No nationality detail in the selected date range. Choose months in Jan–Jun 2025 or Jan–Jun 2026.
        </div>
      )}
      {note && <p className="mt-2 text-[11px] text-slate-600">{note}</p>}
    </div>
  );
}
