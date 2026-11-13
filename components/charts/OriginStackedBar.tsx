'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { demographics } from '@/lib/data';
import { inRange } from '@/lib/filters';
import { formatCompact, formatNumber, monthLabel } from '@/lib/format';
import { MARKET_COLORS, MARKETS, marketInFilter, shortMarket } from '@/lib/persona';
import { AXIS_TICK, COLORS, TOOLTIP_STYLE } from '@/lib/theme';
import type { Filters } from '@/lib/types';

/** Monthly origin mix of the 18 HKTB source markets (Jan-Jun 2025 / 2026). */
export default function OriginStackedBar({ filters }: { filters: Filters }) {
  const [hideMainland, setHideMainland] = useState(false);
  const filtered = filters.origin !== 'All' || filters.region !== 'All';

  const { keys, data } = useMemo(() => {
    const markets = MARKETS.filter((m) => marketInFilter(m.market, filters) && !(hideMainland && m.origin === 'Mainland')).map((m) => m.market);
    const keys = filtered ? markets : [...markets, 'Other markets'];
    const months = Array.from(new Set(demographics.market_monthly.filter((r) => inRange(r.month, filters)).map((r) => r.month))).sort();
    const data = months.map((month) => {
      const point: Record<string, string | number> = { period: monthLabel(month) };
      keys.forEach((k) => {
        point[k] = demographics.market_monthly.find((r) => r.month === month && r.market === k)?.arrivals ?? 0;
      });
      return point;
    });
    return { keys, data };
  }, [filters, hideMainland, filtered]);

  return (
    <div>
      {(filters.origin === 'All' || filters.origin === 'Mainland') && filters.region === 'All' && (
        <label className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-[#74808a]">
          <input type="checkbox" checked={hideMainland} onChange={(e) => setHideMainland(e.target.checked)} className="accent-[#0a5c36]" />
          Hide Mainland (to compare smaller markets)
        </label>
      )}
      {data.length && keys.length ? (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), 0)} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v, name) => [formatNumber(Number(v)), String(name)]}
              itemSorter={(item) => -Number(item.value)}
              cursor={{ fill: 'rgba(10,147,150,0.06)' }}
              wrapperStyle={{ zIndex: 20 }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} formatter={(v) => <span style={{ color: COLORS.steelDeep }}>{shortMarket(String(v))}</span>} />
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="origin" fill={MARKET_COLORS[k]} radius={i === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={48} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-empty">No nationality detail in the selected period, or no HKTB source market in the selected country. Choose months in Jan–Jun 2025 or Jan–Jun 2026.</div>
      )}
      <p className="chart-note">
        Nationality detail is published for Jan–Jun 2025 and Jan–Jun 2026 only (HKTB monthly workbooks).
        {filters.visitorType !== 'All' && ' Monthly market figures cover all visitors (no overnight/same-day split).'}
      </p>
    </div>
  );
}
