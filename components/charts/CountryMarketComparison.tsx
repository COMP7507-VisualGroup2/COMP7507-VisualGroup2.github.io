'use client';

import { useState } from 'react';
import SectionCard from '../SectionCard';
import { marketArrivalComparison, marketH1ArrivalComparison, marketOvernightShare } from '@/lib/country-market-comparison';
import { demographics } from '@/lib/data';
import { formatCompact, formatHkd, formatPct, monthLong } from '@/lib/format';
import { MARKETS, MARKET_ORIGIN, countrySameDayShare, marketInFilter, profileValue } from '@/lib/persona';
import type { Filters } from '@/lib/types';

type Row = { region: string; market: string; arrivals: number | null; growth: number | null; overnightShare: number | null; overnightSpend: number | null; stay: number | null };
type MarketSort = keyof Row;

export default function CountryMarketComparison({ filters }: { filters: Filters }) {
  const [sort, setSort] = useState<{ key: MarketSort; direction: 'ascending' | 'descending' }>({ key: 'arrivals', direction: 'descending' });
  const h1 = filters.start === '2026-01' && filters.end === '2026-06';
  const period = filters.start === filters.end ? monthLong(filters.start) : `${monthLong(filters.start)} – ${monthLong(filters.end)}`;
  const markets = MARKETS.filter(({ market }) => marketInFilter(market, filters)).map(({ market }) => market);
  if (filters.origin === 'All' || filters.origin === 'Short-haul') markets.push('Vietnam');
  const rows: Row[] = markets.map((market) => {
    const sameDay = h1 ? countrySameDayShare('2026-H1', market) : null;
    return {
      region: market === 'Vietnam' ? 'Short-haul' : market === 'Middle East' ? 'Long-haul' : MARKET_ORIGIN[market] === 'Mainland' ? 'Mainland China' : MARKET_ORIGIN[market],
      market,
      ...(h1 ? marketH1ArrivalComparison(demographics.market_h1, market)
        : marketArrivalComparison(demographics.market_monthly, market, filters.start, filters.end)),
      overnightShare: sameDay === null ? marketOvernightShare(demographics.market_h1, market, filters.start, filters.end) : 100 - sameDay,
      overnightSpend: h1 ? profileValue('2026-H1', market, 'per_capita_overnight_hkd') : null,
      stay: h1 ? profileValue('2026-H1', market, 'avg_nights') : null,
    };
  });
  const sorted = [...rows].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    if (av === null) return bv === null ? a.market.localeCompare(b.market) : 1;
    if (bv === null) return -1;
    const difference = typeof av === 'string' && typeof bv === 'string'
      ? av.localeCompare(bv)
      : typeof av === 'number' && typeof bv === 'number' ? av - bv : 0;
    return (sort.direction === 'ascending' ? difference : -difference) || a.market.localeCompare(b.market);
  });
  const columns: { key: MarketSort; label: string }[] = [
    { key: 'region', label: 'Visitor region' },
    { key: 'market', label: 'Country / market' },
    { key: 'arrivals', label: 'Arrivals' },
    { key: 'growth', label: 'Arrivals YoY' },
    { key: 'overnightShare', label: 'Overnight visitors %' },
    { key: 'overnightSpend', label: 'Overnight spend / visitor' },
    { key: 'stay', label: 'Average nights' },
  ];
  const displayMarket = (market: string) => market === 'Chinese Mainland' ? 'Mainland China' : market;
  const changeSort = (key: MarketSort) => setSort((current) => ({
    key,
    direction: current.key === key ? (current.direction === 'ascending' ? 'descending' : 'ascending') : (key === 'market' || key === 'region' ? 'ascending' : 'descending'),
  }));

  return (
    <SectionCard title="Overview of All Countries" subtitle={period}>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-semibold text-slate-500">
                  {columns.map((column) => (
                    <th key={column.key} scope="col" aria-sort={sort.key === column.key ? sort.direction : undefined} className={`px-2 py-2 ${column.key === 'market' || column.key === 'region' ? 'text-left' : 'text-right'}`}>
                      <button type="button" onClick={() => changeSort(column.key)} className="hover:text-brand-800" aria-label={`Sort by ${column.label}`}>
                        {column.label} {sort.key === column.key ? (sort.direction === 'ascending' ? '↑' : '↓') : '↕'}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((row) => (
                  <tr key={row.market}>
                    <td className="px-2 py-2.5">{row.region}</td>
                    <th scope="row" className="px-2 py-2.5 font-medium text-slate-800">{displayMarket(row.market)}</th>
                    <td className="px-2 py-2.5 text-right tabular-nums">{row.arrivals === null ? 'N/A' : formatCompact(row.arrivals, 2)}</td>
                    <td className={`px-2 py-2.5 text-right font-semibold tabular-nums ${row.growth === null ? 'text-slate-500' : row.growth >= 0 ? 'text-green-700' : 'text-red-600'}`}>{row.growth === null ? 'N/A' : formatPct(row.growth, 1, true)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{row.overnightShare === null ? 'N/A' : formatPct(row.overnightShare)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{row.overnightSpend === null ? 'N/A' : formatHkd(row.overnightSpend)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{row.stay === null ? 'N/A' : row.stay.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="chart-empty">No named markets are available for this region.</div>}
    </SectionCard>
  );
}
