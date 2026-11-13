'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import HeatTable from '../HeatTable';
import { Segmented } from '../SectionCard';
import { formatCompact, formatHkd, formatNumber } from '@/lib/format';
import {
  AGE_COLORS,
  AGE_GROUPS,
  H1_LABEL,
  MARKETS,
  OTHER_PERIOD,
  PERIOD_LABEL,
  SEGMENT_COLORS,
  SEGMENTS,
  type Segment,
  formatShare,
  labelColor,
  marketH1,
  profile,
  profileValue,
  rankChange,
  sameDayShare,
  shortMarket,
  marketInFilter,
} from '@/lib/persona';
import { AXIS_TICK, COLORS, ORIGIN_COLORS, TOOLTIP_STYLE, VISITOR_TYPE_COLORS } from '@/lib/theme';
import type { Filters, Origin, ProfilePeriod } from '@/lib/types';

type Row = Record<string, string | number | null>;

/** 100% stacked horizontal bars, one row per segment. */
function SegmentStack({ data, keys, colors, height = 230 }: { data: Row[]; keys: string[]; colors: string[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          allowDataOverflow
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis type="category" dataKey="label" tick={{ ...AXIS_TICK, fontSize: 11 }} tickLine={false} axisLine={false} width={150} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatShare(Number(v))} cursor={{ fill: 'rgba(10,147,150,0.06)' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(v) => <span style={{ color: COLORS.steelDeep }}>{v}</span>} />
        {keys.map((k, i) => {
          const fill = colors[i % colors.length];
          return (
            <Bar key={k} dataKey={k} stackId="s" fill={fill} maxBarSize={30}>
              <LabelList dataKey={k} position="center" fill={labelColor(fill)} fontSize={10} formatter={(v: number) => (v >= 7 ? `${Math.round(v)}%` : '')} />
            </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}

function segmentRows(build: (s: Segment) => Row | null): Row[] {
  return SEGMENTS.map((s) => build(s)).filter((r): r is Row => r !== null);
}

/* ------------------------------------------------------------------ */
/* 1. Who they are                                                     */
/* ------------------------------------------------------------------ */

/** Age brackets by segment from the HKTB nationality workbooks (Jan-Jun of the selected year). */
export function AgeBySegment({ period }: { period: ProfilePeriod }) {
  const data = useMemo(
    () =>
      segmentRows((s) => {
        const r = marketH1(period, s);
        if (!r) return null;
        return { label: `${s} · ${r.mean_age?.toFixed(1)} yrs`, ...r.age };
      }),
    [period],
  );
  return (
    <div>
      <SegmentStack data={data} keys={AGE_GROUPS} colors={AGE_COLORS} />
      <p className="mt-1 text-[11px] text-slate-600">Share of arrivals by age bracket · label shows mean age · {H1_LABEL[period]} (HKTB arrival statistics).</p>
    </div>
  );
}

/** Who overnight visitors travel with (2025 full-year detail). */
export function CompanionTable() {
  const rows = ['First-time visitors', ...profile('2025', 'All markets', 'companion_detail').map((r) => r.category)];
  return (
    <HeatTable
      rowHeader="Overnight visitors, 2025"
      columns={SEGMENTS.map((s) => ({ key: s, label: s === 'All markets' ? 'All' : s, color: SEGMENT_COLORS[s] }))}
      rows={rows.map((c) => ({
        key: c,
        label: c,
        values: Object.fromEntries(
          SEGMENTS.map((s) => [s, c === 'First-time visitors' ? profileValue('2025', s, 'first_timer_pct') : profileValue('2025', s, 'companion_detail', c)]),
        ),
      }))}
      format={(v) => formatShare(v)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* 2. Why & how they travel                                            */
/* ------------------------------------------------------------------ */

const PURPOSES = ['Vacation', 'Visiting friends / relatives', 'Business', 'En-route', 'Others'];

/** Main purpose of visit among overnight visitors, by segment. */
export function PurposeBySegment({ period }: { period: ProfilePeriod }) {
  const data = useMemo(
    () =>
      segmentRows((s) => {
        const rows = profile(period, s, 'trip_purpose');
        if (!rows.length) return null;
        return { label: s, ...Object.fromEntries(rows.map((r) => [r.category, r.value])) };
      }),
    [period],
  );
  return <SegmentStack data={data} keys={PURPOSES} colors={[COLORS.brandDeep, COLORS.brand, COLORS.accent, COLORS.accentDeep, COLORS.blushDeep]} />;
}

/** Overnight vs same-day split with average nights stayed, by segment. */
export function StayBySegment({ period }: { period: ProfilePeriod }) {
  const data = useMemo(
    () =>
      segmentRows((s) => {
        const sd = sameDayShare(period, s);
        if (sd === null) return null;
        const nights = profileValue(period, s, 'avg_nights');
        return { label: `${s} · ${nights?.toFixed(1)} nights`, Overnight: 100 - sd, 'Same-day': sd };
      }),
    [period],
  );
  return (
    <div>
      <SegmentStack data={data} keys={['Overnight', 'Same-day']} colors={[VISITOR_TYPE_COLORS.Overnight, VISITOR_TYPE_COLORS['Same-day']]} height={210} />
      <p className="mt-1 text-[11px] text-slate-600">Label shows average nights stayed by overnight visitors.</p>
    </div>
  );
}

/** Hong Kong-only vs multi-destination trips and the other places visited (2025 full year). */
export function ItineraryChart() {
  const data = segmentRows((s) => {
    const rows = profile('2025', s, 'itinerary');
    return rows.length ? { label: s, ...Object.fromEntries(rows.map((r) => [r.category, r.value])) } : null;
  });
  const dests = profile('2025', 'All markets', 'other_destination').map((r) => r.category);
  return (
    <div className="space-y-3">
      <SegmentStack data={data} keys={['Hong Kong only', 'Multi-destination']} colors={[COLORS.brandDeep, COLORS.accent]} height={200} />
      <HeatTable
        rowHeader="Also visited on the same trip"
        columns={SEGMENTS.map((s) => ({ key: s, label: s === 'All markets' ? 'All' : s, color: SEGMENT_COLORS[s] }))}
        rows={dests.map((d) => ({ key: d, label: d, values: Object.fromEntries(SEGMENTS.map((s) => [s, profileValue('2025', s, 'other_destination', d)])) }))}
        format={(v) => formatShare(v)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. What they spend on                                               */
/* ------------------------------------------------------------------ */

const MIX = ['Shopping', 'Hotel bills', 'Dining', 'Others'];

/** Overnight spending mix by segment, labelled with per-capita spend. */
export function SpendMixBySegment({ period }: { period: ProfilePeriod }) {
  const data = useMemo(
    () =>
      segmentRows((s) => {
        const rows = profile(period, s, 'spend_mix');
        if (!rows.length) return null;
        const pc = profileValue(period, s, 'per_capita_overnight_hkd');
        return { label: `${s} · HK$${pc ? (pc / 1000).toFixed(1) : '–'}K`, ...Object.fromEntries(rows.map((r) => [r.category, r.value])) };
      }),
    [period],
  );
  return (
    <div>
      <SegmentStack data={data} keys={MIX} colors={[COLORS.accent, COLORS.brandDeep, COLORS.brand, COLORS.blushDeep]} />
      <p className="mt-1 text-[11px] text-slate-600">
        Share of overnight visitors&apos; spending in Hong Kong · label shows spend per overnight visitor. Hotel bills include meals and other spending inside the hotel.
      </p>
    </div>
  );
}

/** What goes in the shopping bag: shopping categories as % of overnight spend, by segment. */
export function ShoppingTable({ period }: { period: ProfilePeriod }) {
  const cats = profile(period, 'All markets', 'shopping_mix').map((r) => r.category);
  return (
    <HeatTable
      rowHeader="% of overnight spend"
      columns={SEGMENTS.map((s) => ({ key: s, label: s === 'All markets' ? 'All' : s, color: SEGMENT_COLORS[s] }))}
      rows={cats.map((c) => ({ key: c, label: c, values: Object.fromEntries(SEGMENTS.map((s) => [s, profileValue(period, s, 'shopping_mix', c)])) }))}
      format={(v) => formatShare(v)}
    />
  );
}

interface YieldPoint {
  market: string;
  short: string;
  origin: Origin;
  nights: number;
  spend: number;
  overnight: number;
}

/** 18 markets: nights stayed vs spend per overnight visitor; bubble = Jan-Jun overnight arrivals. Click selects a market. */
export function MarketYieldScatter({
  period,
  filters,
  selected,
  onSelect,
}: {
  period: ProfilePeriod;
  filters: Pick<Filters, 'origin' | 'region'>;
  selected: string;
  onSelect: (m: string) => void;
}) {
  const points = useMemo<YieldPoint[]>(
    () =>
      MARKETS.filter((m) => marketInFilter(m.market, filters))
        .map((m) => ({
          market: m.market,
          short: shortMarket(m.market),
          origin: m.origin,
          nights: profileValue(period, m.market, 'avg_nights') ?? NaN,
          spend: profileValue(period, m.market, 'per_capita_overnight_hkd') ?? NaN,
          overnight: marketH1(period, m.market)?.overnight ?? 0,
        }))
        .filter((p) => Number.isFinite(p.nights) && Number.isFinite(p.spend)),
    [period, filters],
  );
  const avgNights = profileValue(period, 'All markets', 'avg_nights');
  const avgSpend = profileValue(period, 'All markets', 'per_capita_overnight_hkd');

  return (
    <div>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 12, right: 20, left: -4, bottom: 8 }}>
          <CartesianGrid stroke={COLORS.grid} />
          <XAxis
            type="number"
            dataKey="nights"
            name="Nights"
            domain={['dataMin - 0.3', 'dataMax + 0.3']}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => Number(v).toFixed(1)}
            label={{ value: 'Average nights stayed', position: 'insideBottom', offset: -4, fontSize: 10, fill: COLORS.steelDeep }}
          />
          <YAxis
            type="number"
            dataKey="spend"
            name="Spend"
            domain={[(min: number) => Math.max(0, Math.floor((min - 1000) / 1000) * 1000), (max: number) => Math.ceil((max + 500) / 1000) * 1000]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${formatCompact(Number(v), 1)}`}
          />
          <ZAxis type="number" dataKey="overnight" range={[60, 1000]} name="Overnight arrivals" />
          {avgNights && <ReferenceLine x={avgNights} stroke={COLORS.steel} strokeDasharray="4 4" />}
          {avgSpend && <ReferenceLine y={avgSpend} stroke={COLORS.steel} strokeDasharray="4 4" />}
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ strokeDasharray: '3 3' }}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as YieldPoint | undefined;
              if (!p) return null;
              return (
                <div className="rounded-xl border border-mist bg-canvas px-3 py-2 text-xs shadow-card">
                  <p className="font-semibold text-slate-900">{p.market}</p>
                  <p className="text-slate-600">{formatHkd(p.spend)} per overnight visitor</p>
                  <p className="text-slate-600">{p.nights.toFixed(1)} nights</p>
                  <p className="text-slate-600">
                    {formatNumber(p.overnight)} overnight arrivals ({H1_LABEL[period]})
                  </p>
                  <p className="mt-1 text-[10px] text-brand-800">Click to open persona</p>
                </div>
              );
            }}
          />
          <Scatter
            data={points}
            isAnimationActive={false}
            onClick={(d) => onSelect((d as unknown as YieldPoint).market)}
            className="cursor-pointer"
            shape={(props: unknown) => {
              const { cx, cy, size, payload } = props as { cx: number; cy: number; size?: number; payload: YieldPoint };
              const r = Math.sqrt((size ?? 64) / Math.PI);
              const active = payload.market === selected;
              return (
                <g>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={ORIGIN_COLORS[payload.origin]}
                    fillOpacity={0.7}
                    stroke={active ? COLORS.ink : COLORS.canvas}
                    strokeWidth={active ? 2.5 : 1}
                  />
                  <text
                    x={cx}
                    y={r > 14 ? cy + 3 : cy - r - 4}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={active ? 700 : 500}
                    fill={r > 14 ? COLORS.canvas : COLORS.ink}
                  >
                    {payload.short}
                  </text>
                </g>
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-slate-600">
        Dashed lines = all-market average ({avgNights?.toFixed(1)} nights, {avgSpend ? formatHkd(avgSpend) : '–'}). Spend and nights: HKTB Visitor Profile, {PERIOD_LABEL[period]}; bubble size: overnight arrivals, {H1_LABEL[period]}.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Experience & places                                              */
/* ------------------------------------------------------------------ */

const EXPERIENCE = [
  { key: 'Overall satisfaction', label: 'Satisfaction', unit: '/10' },
  { key: 'Will recommend', label: 'Would recommend', unit: '%' },
  { key: 'Revisit intention', label: 'Would revisit', unit: '%' },
];

/** Satisfaction, recommendation and revisit intention by segment, with change vs 2025. */
export function ExperienceScorecard({ period }: { period: ProfilePeriod }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-600">
            <th className="py-1.5 text-left font-medium">Overnight visitors</th>
            {EXPERIENCE.map((e) => (
              <th key={e.key} className="py-1.5 text-right font-medium">
                {e.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {SEGMENTS.map((s) => (
            <tr key={s}>
              <th scope="row" className="py-2 text-left font-medium text-slate-800">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: SEGMENT_COLORS[s] }} />
                  {s}
                </span>
              </th>
              {EXPERIENCE.map((e) => {
                const v = profileValue(period, s, 'satisfaction', e.key);
                const prev = period === '2026-H1' ? profileValue(OTHER_PERIOD[period], s, 'satisfaction', e.key) : null;
                const d = v !== null && prev !== null ? v - prev : null;
                return (
                  <td key={e.key} className="py-2 text-right tabular-nums">
                    <span className="font-semibold text-slate-900">{v === null ? '–' : e.unit === '/10' ? v.toFixed(1) : `${v}%`}</span>
                    {d !== null && d !== 0 && (
                      <span className={`ml-1.5 text-[11px] font-semibold ${d > 0 ? 'text-brand-700' : 'text-accent-700'}`}>
                        {d > 0 ? '▲' : '▼'}
                        {e.unit === '/10' ? Math.abs(d).toFixed(1) : `${Math.abs(d)}pp`}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {period === '2026-H1' && <p className="mt-2 text-[11px] text-slate-600">Arrows compare with 2025 (full year).</p>}
    </div>
  );
}

/** % of overnight visitors rating each aspect above average (2025 full year). */
export function AspectTable() {
  const aspects = profile('2025', 'All markets', 'aspect_rating').map((r) => r.category);
  return (
    <HeatTable
      rowHeader="Rated above average, 2025"
      columns={SEGMENTS.map((s) => ({ key: s, label: s === 'All markets' ? 'All' : s, color: SEGMENT_COLORS[s] }))}
      rows={aspects.map((a) => ({ key: a, label: a, values: Object.fromEntries(SEGMENTS.map((s) => [s, profileValue('2025', s, 'aspect_rating', a)])) }))}
      format={(v) => formatShare(v)}
    />
  );
}

export function RankBadge({ change }: { change: number | 'new' | null }) {
  if (change === null) return null;
  if (change === 'new') return <span className="rounded bg-accent-50 px-1.5 text-[10px] font-semibold text-accent-600">NEW</span>;
  if (change === 0) return <span className="text-[10px] text-slate-400">–</span>;
  return (
    <span className={`text-[10px] font-semibold ${change > 0 ? 'text-brand-700' : 'text-accent-700'}`}>
      {change > 0 ? '▲' : '▼'}
      {Math.abs(change)}
    </span>
  );
}

/** Top-10 places visited by overnight visitors with rank movement vs 2025. */
export function TopPlaces({ period }: { period: ProfilePeriod }) {
  const [segment, setSegment] = useState<Segment>('All markets');
  const places = profile(period, segment, 'place_rank').sort((a, b) => a.value - b.value);
  return (
    <div>
      <div className="mb-2">
        <Segmented<Segment> size="xs" value={segment} onChange={setSegment} options={SEGMENTS.map((s) => ({ value: s, label: s === 'All markets' ? 'All' : s }))} />
      </div>
      <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {places.map((p) => (
          <li key={p.category} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-canvas"
              style={{ background: p.value <= 3 ? COLORS.brandDeep : COLORS.brand }}
            >
              {p.value}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800" title={p.category}>
              {p.category}
            </span>
            <RankBadge change={rankChange(period, segment, p.category, p.value)} />
          </li>
        ))}
      </ol>
      {period === '2026-H1' && <p className="mt-2 text-[11px] text-slate-600">▲▼ rank change vs 2025 full year · NEW = not in the 2025 top 10.</p>}
    </div>
  );
}
