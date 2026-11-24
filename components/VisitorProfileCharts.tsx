'use client';

import { useState } from 'react';
import { useProgress } from './motion';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { summary } from '@/lib/data';
import { profile, type Segment } from '@/lib/persona';
import { TABLEAU_CASUAL } from '@/lib/theme';

const pctChange = (current: number, previous: number) => ((current / previous) - 1) * 100;
const share = (part: number, total: number) => (part / total) * 100;
const fmtSpend = new Intl.NumberFormat('en-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyChange = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
const formatShare = (value: number, total: number) => {
  const percent = share(value, total);
  return percent > 0 && percent < 0.5 ? '<0.5%' : `${percent.toFixed(1)}%`;
};

type ProfileSegment = Segment;

export function spendingByCategory(segment: ProfileSegment) {
  const rows = summary.spend_categories.filter((row) => row.visitor_type === 'Overnight' && row.segment === segment);
  const categories = [...new Set(rows.map((row) => row.category))];
  if (!categories.length) return null;
  const entries: { category: string; before: number; now: number; growth: number }[] = [];
  for (const category of categories) {
    const previous = rows.filter((row) => row.category === category && row.year === '2025');
    const current = rows.filter((row) => row.category === category && row.year === '2026');
    if (previous.length !== 1 || current.length !== 1) return null;
    const before = previous[0].spend_hkd_m;
    const now = current[0].spend_hkd_m;
    if (!Number.isFinite(before) || !Number.isFinite(now) || before <= 0 || now < 0) return null;
    entries.push({ category, before, now, growth: pctChange(now, before) });
  }
  entries.sort((a, b) => b.growth - a.growth);
  const totals = {
    '2025': entries.reduce((total, row) => total + row.before, 0),
    '2026': entries.reduce((total, row) => total + row.now, 0),
  };
  if (totals['2026'] <= 0) return null;
  return { entries, totals, growth: pctChange(totals['2026'], totals['2025']) };
}


export function ProfilePie({ rows }: { rows: { name: string; value: number; color: string }[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" outerRadius={78} stroke="#fff" strokeWidth={2}>
            {rows.map((row) => <Cell key={row.name} fill={row.color} />)}
          </Pie>
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} itemSorter={(item) => -Number(item.value)} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="space-y-1 text-[15px] text-slate-600">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: row.color }} />{row.name}</span>
            <span className="tabular-nums">{row.value.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


export function SpendingTable({ segment }: { segment: ProfileSegment }) {
  type SortKey = 'category' | 'before' | 'now' | 'growth';
  const [sort, setSort] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'growth', direction: 'descending' });
  const spendByCategory = spendingByCategory(segment);
  const columns: { key: SortKey; label: string; sublabel?: string }[] = [
    { key: 'category', label: 'Spending category' },
    { key: 'before', label: 'Jan–Jun 2025', sublabel: 'HK$Mn · share' },
    { key: 'now', label: 'Jan–Jun 2026', sublabel: 'HK$Mn · share' },
    { key: 'growth', label: 'YoY' },
  ];
  const rows = [...(spendByCategory?.entries ?? [])].sort((a, b) => {
    const difference = sort.key === 'category'
      ? a.category.localeCompare(b.category)
      : a[sort.key] - b[sort.key];
    return (sort.direction === 'ascending' ? difference : -difference) || a.category.localeCompare(b.category);
  });
  const changeSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key
        ? (current.direction === 'ascending' ? 'descending' : 'ascending')
        : (key === 'category' ? 'ascending' : 'descending'),
    }));
  };
  if (!spendByCategory) return <p className="text-xs text-slate-500">Spending category comparisons are unavailable.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-[14px] font-semibold text-slate-500">
            {columns.map((column) => (
              <th key={column.key} scope="col" aria-sort={sort.key === column.key ? sort.direction : undefined} className={column.key === 'category' ? 'py-2 pr-3' : 'px-2 py-2 text-right'}>
                <button type="button" onClick={() => changeSort(column.key)} className="hover:text-brand-800" aria-label={`Sort by ${column.label}`}>
                  {column.label} {sort.key === column.key ? (sort.direction === 'ascending' ? '↑' : '↓') : '↕'}
                  {column.sublabel && <><br /><span className="font-normal">{column.sublabel}</span></>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.category}>
              <th scope="row" className="py-2.5 pr-3 font-medium text-slate-800">{row.category}</th>
              <td className="px-2 py-2.5 text-right tabular-nums">
                <span className="font-medium text-slate-800">{fmtSpend.format(row.before)}</span>
                <span className="ml-1 text-[14px] text-slate-500">{formatShare(row.before, spendByCategory.totals['2025'])}</span>
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                <span className="font-medium text-slate-800">{fmtSpend.format(row.now)}</span>
                <span className="ml-1 text-[14px] text-slate-500">{formatShare(row.now, spendByCategory.totals['2026'])}</span>
              </td>
              <td className={`py-2.5 pl-2 text-right font-semibold tabular-nums ${row.growth >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {moneyChange(row.growth)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 bg-slate-50">
            <th scope="row" className="py-2.5 pr-3 font-bold text-slate-900">Total</th>
            <td className="px-2 py-2.5 text-right font-bold tabular-nums text-slate-900">
              {fmtSpend.format(spendByCategory.totals['2025'])}<span className="ml-1 text-[14px]">100.0%</span>
            </td>
            <td className="px-2 py-2.5 text-right font-bold tabular-nums text-slate-900">
              {fmtSpend.format(spendByCategory.totals['2026'])}<span className="ml-1 text-[14px]">100.0%</span>
            </td>
            <td className={`py-2.5 pl-2 text-right font-bold tabular-nums ${spendByCategory.growth >= 0 ? 'text-green-700' : 'text-red-600'}`}>{moneyChange(spendByCategory.growth)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
        {segment} overnight visitor expenditure by category. Shares are each category&apos;s proportion of the displayed total. Select a column heading to sort.
      </p>
    </div>
  );
}

export function PlacesBumpChart({ segment, showNote = true }: { segment: string; showNote?: boolean }) {
  const topPlaces = profile('2026-H1', segment, 'place_rank').sort((a, b) => a.value - b.value);
  const previousPlaces = profile('2025', segment, 'place_rank').sort((a, b) => a.value - b.value);
  const previousTop = previousPlaces.filter((place) => place.value <= 10);
  const completePrior = previousTop.length === 10;
  const priorStatus = (name: string) => {
    const prior = previousPlaces.find((row) => row.category === name);
    if (prior) return prior.value <= 10 ? prior.value : 'new';
    return completePrior ? 'new' : null;
  };
  const id = `place-rank-${segment.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const y = (rank: number) => 48 + (rank - 1) * 28;
  const progress = useProgress(segment);
  const settle = Math.min(1, Math.max(0, (progress - 0.6) / 0.4));
  const slide = (place: { value: number }, prior: number | 'new' | null) => {
    const from = typeof prior === 'number' ? y(prior) : y(11);
    return from + (y(place.value) - from) * progress;
  };
  const color = (name: string) => {
    const index = topPlaces.findIndex((place) => place.category === name);
    return index < 0 ? '#94A3B8' : TABLEAU_CASUAL[index % TABLEAU_CASUAL.length];
  };
  if (!topPlaces.length || !previousPlaces.length) return <p className="text-xs text-slate-500">Place rankings are unavailable.</p>;
  return (
    <>
      <div className="overflow-x-auto">
        <svg viewBox="0 0 780 325" role="img" aria-labelledby={`${id}-title ${id}-desc`} className="w-full min-w-[680px]">
          <title id={`${id}-title`}>{`${segment} visitor place rankings`}</title>
          <desc id={`${id}-desc`}>{`Rankings for ${segment} overnight visitors, 2025 full year and H1 2026. ${topPlaces.map((place) => {
              const prior = priorStatus(place.category);
              const movement = typeof prior === 'number' ? prior - place.value : null;
              const change = prior === 'new' ? 'new to the top ten' : movement === null ? 'prior rank unavailable' : movement === 0 ? 'unchanged' : `${movement > 0 ? 'up' : 'down'} ${Math.abs(movement)} places`;
              return `${place.category}: ${typeof prior === 'number' ? `rank ${prior} in 2025` : prior === 'new' ? 'not in the 2025 top ten' : '2025 rank unavailable'}, rank ${place.value} in H1 2026, ${change}.`;
            }).join(' ')} ${previousTop.filter((place) => !topPlaces.some((row) => row.category === place.category)).map((place) => `${place.category}: rank ${place.value} in 2025, not in the H1 2026 top ten.`).join(' ')}`}</desc>
          <g key={segment}>
          <text x="225" y="18" textAnchor="end" fill="#475569" fontSize="15" fontWeight="700">2025 full year</text>
          <text x="495" y="18" fill="#475569" fontSize="15" fontWeight="700">2026 H1</text>
          <text x="765" y="18" textAnchor="end" fill="#475569" fontSize="15" fontWeight="700">Movement</text>
          {Array.from({ length: 10 }, (_, index) => <line key={index} x1="240" x2="480" y1={y(index + 1)} y2={y(index + 1)} stroke="#e2e8f0" />)}
          {topPlaces.map((place) => {
            const prior = priorStatus(place.category);
            return typeof prior === 'number' ? (
              <line key={place.category} x1="240" y1={y(prior)} x2="480" y2={slide(place, prior)} stroke={color(place.category)} strokeWidth="2.5">
                <title>{`${place.category}: #${prior} → #${place.value}`}</title>
              </line>
            ) : null;
          })}
          {previousTop.map((place) => (
            <g key={place.category}>
              <text x="225" y={y(place.value) + 4} textAnchor="end" fill="#334155" fontSize="14">{`${place.value}. ${place.category}`}</text>
              <circle cx="240" cy={y(place.value)} r="4" fill={color(place.category)} />
            </g>
          ))}
          {topPlaces.map((place) => {
            const prior = priorStatus(place.category);
            const movement = typeof prior === 'number' ? prior - place.value : null;
            const label = prior === 'new' ? 'NEW' : movement === null ? 'N/A' : movement > 0 ? `▲ ${movement}` : movement < 0 ? `▼ ${Math.abs(movement)}` : '—';
            const movementColor = prior === 'new' ? '#a16207' : movement === null ? '#64748b' : movement > 0 ? '#15803d' : movement < 0 ? '#b91c1c' : '#64748b';
            const cy = slide(place, prior);
            return (
              <g key={place.category} opacity={typeof prior === 'number' ? 1 : progress}>
                <circle cx="480" cy={cy} r="4" fill={color(place.category)} />
                <text x="495" y={cy + 4} fill="#334155" fontSize="14">{`${place.value}. ${place.category}`}</text>
                <text x="765" y={y(place.value) + 4} textAnchor="end" fill={movementColor} fontSize="14" fontWeight="700" opacity={settle}>{label}</text>
              </g>
            );
          })}
          </g>
        </svg>
      </div>
      {!completePrior && <p className="mt-2 text-[14px] text-slate-500">The supplied data does not identify every 2025 top-10 place; missing prior ranks are unavailable.</p>}
      {showNote && <p className="mt-2 text-[14px] text-slate-500">HKTB {segment} overnight visitor rankings. Movement shows places gained or lost since 2025; — means unchanged. NEW means new to the top 10, not necessarily a new venue; N/A means the prior rank is unavailable.</p>}
    </>
  );
}
