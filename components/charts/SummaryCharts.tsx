'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  type PieLabelRenderProps,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SectionCard, { Segmented } from '../SectionCard';
import { quarterlyRevenue, summary } from '@/lib/data';
import { formatCompact } from '@/lib/format';
import { COLORS, ORIGIN_COLORS, VISITOR_TYPE_COLORS } from '@/lib/theme';
import type { Segment } from '@/lib/types';

type MixMode = 'visitors' | 'revenue';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const SEGMENTS: Segment[] = ['Mainland', 'Short-haul', 'Long-haul'];
const REVENUE_GROWTH = '#F28E2B';
const VISITOR_GROWTH = '#4E79A7';
const GROWTH_GAP = '#B07AA1';

const monthlyArrivals = (year: string) =>
  MONTHS.map((_, i) => summary.arrivals_monthly[`${year}-${String(i + 1).padStart(2, '0')}`]?.All ?? 0);

function quarterlyArrivals(year: string, quarter: number) {
  const months = monthlyArrivals(year);
  const start = (quarter - 1) * 3;
  return months.slice(start, start + 3).reduce((sum, value) => sum + value, 0);
}

function quarterlySpending(year: number, quarter: number) {
  return quarterlyRevenue.find((record) => record.year === year && record.quarter === quarter)?.standalone_quarter_spending_hkd_b ?? 0;
}

function segmentRevenue(segment: Segment) {
  return summary.area_h1
    .filter((row) => row.year === '2026' && row.segment === segment)
    .reduce((sum, row) => sum + row.spend_hkd_m, 0);
}

const segmentData = SEGMENTS.map((segment) => {
  const visitors = summary.segments_h1['2026'][segment].visitors;
  const revenue = segmentRevenue(segment);
  return { segment, visitors, revenue, averageRevenue: visitors ? (revenue * 1e6) / visitors : 0 };
});

function pctChange(current: number, previous: number) {
  return previous ? ((current / previous) - 1) * 100 : 0;
}

function formatAmount(value: number, mode: MixMode) {
  return mode === 'visitors'
    ? formatCompact(value, 2)
    : `HK$${(value / 1000).toFixed(1)}bn`;
}

function pieLabel(mode: MixMode, colorFor: (name: string) => string) {
  return function renderPieSliceLabel(props: PieLabelRenderProps) {
    const radius = Number(props.innerRadius) + (Number(props.outerRadius) - Number(props.innerRadius)) * 0.55;
    const angle = -(Number(props.midAngle) * Math.PI) / 180;
    const x = Number(props.cx) + Math.cos(angle) * radius;
    const y = Number(props.cy) + Math.sin(angle) * radius;
    const name = String(props.name);
    const value = Number(props.value);

    return (
      <text x={x} y={y} fill={colorFor(name)} fontSize={8} fontWeight={700} textAnchor="middle" dominantBaseline="middle" pointerEvents="none">
        <tspan x={x} dy="-0.7em">{name}</tspan>
        <tspan x={x} dy="1.15em">{formatAmount(value, mode)}</tspan>
        <tspan x={x} dy="1.15em">{`${(Number(props.percent ?? 0) * 100).toFixed(1)}%`}</tspan>
      </text>
    );
  };
}

export function VisitorTypeMixCard() {
  const [mode, setMode] = useState<MixMode>('visitors');
  const metrics = summary.h1['2026'];
  const rows = [
    { name: 'Overnight', value: mode === 'visitors' ? metrics.overnight_visitors : metrics.overnight_spend_hkd_m },
    { name: 'Same-day', value: mode === 'visitors' ? metrics.same_day_visitors : metrics.same_day_spend_hkd_m },
  ];
  const colors: Record<string, string> = {
    Overnight: VISITOR_TYPE_COLORS.Overnight,
    'Same-day': VISITOR_TYPE_COLORS['Same-day'],
  };

  return (
    <SectionCard
      title="Overnight and same-day mix"
      actions={<Segmented value={mode} options={[{ value: 'visitors', label: 'Visitors' }, { value: 'revenue', label: 'Revenue' }]} onChange={setMode} />}
    >
      <p className="mb-1 text-[11px] text-slate-500">H1 2026 · {mode === 'visitors' ? 'visitor arrivals' : 'visitor spending'}</p>
      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={78}
            paddingAngle={2}
            stroke={COLORS.canvas}
            strokeWidth={2}
            labelLine={false}
            label={pieLabel(mode, (name) => name === 'Same-day' ? '#fff' : '#1f2937')}
          >
            {rows.map((row) => <Cell key={row.name} fill={colors[row.name]} />)}
          </Pie>
          <Tooltip
            formatter={(value) => formatAmount(Number(value), mode)}
            contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.grid}`, background: COLORS.canvas, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

export function GrowthRelationshipCard() {
  const data = useMemo(() => {
    return [
      { period: "H1 '25", visitorGrowth: 11.7, revenueGrowth: 3.3, growthDifference: 8.4 },
      ...[1, 2].map((quarter) => {
        const visitorGrowth = pctChange(quarterlyArrivals('2026', quarter), quarterlyArrivals('2025', quarter));
        const revenueGrowth = pctChange(quarterlySpending(2026, quarter), quarterlySpending(2025, quarter));
        return { period: `Q${quarter} '26`, visitorGrowth, revenueGrowth, growthDifference: visitorGrowth - revenueGrowth };
      }),
    ];
  }, []);

  return (
    <SectionCard title="Visitor and revenue growth relationship">
      <p className="mb-1 text-[11px] text-slate-500">H1 2025 compares with H1 2024; 2026 quarters compare with the same quarter in 2025. Gap = visitor minus revenue growth (pp).</p>
      <ResponsiveContainer width="100%" height={215}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fontSize: 10, fill: COLORS.steelDeep }} tickLine={false} axisLine={{ stroke: COLORS.grid }} />
          <YAxis tickFormatter={(value) => `${value}`} tick={{ fontSize: 10, fill: COLORS.steelDeep }} tickLine={false} axisLine={false} />
          <ReferenceLine y={0} stroke={COLORS.steel} />
          <Tooltip
            formatter={(value, name) => {
              const label = name === 'visitorGrowth'
                ? 'Visitors YoY'
                : name === 'revenueGrowth'
                  ? 'Estimated revenue YoY'
                  : 'Visitors − revenue (pp)';
              const unit = name === 'growthDifference' ? ' pp' : '%';
              return [`${Number(value).toFixed(1)}${unit}`, label];
            }}
            labelFormatter={(label) => label === "H1 '25" ? 'H1 2025 vs H1 2024' : `${String(label).replace("'26", '2026')} vs ${String(label).replace("'26", '2025')}`}
            contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.grid}`, background: COLORS.canvas, fontSize: 12 }}
          />
          <Legend
            formatter={(name) => name === 'visitorGrowth' ? 'Visitors YoY' : name === 'revenueGrowth' ? 'Estimated revenue YoY' : 'Visitors − revenue (pp)'}
            wrapperStyle={{ fontSize: 10 }}
          />
          <Line type="monotone" dataKey="visitorGrowth" name="visitorGrowth" stroke={VISITOR_GROWTH} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="revenueGrowth" name="revenueGrowth" stroke={REVENUE_GROWTH} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="growthDifference" name="growthDifference" stroke={GROWTH_GAP} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

export function SourceSegmentsCard() {
  const [mode, setMode] = useState<MixMode>('visitors');
  const pieRows = segmentData.map((row) => ({
    name: row.segment,
    value: mode === 'visitors' ? row.visitors : row.revenue,
  }));
  const colors: Record<string, string> = Object.fromEntries(SEGMENTS.map((segment) => [segment, ORIGIN_COLORS[segment]]));

  return (
    <SectionCard
      title="Source markets by travel region"
      subtitle="Mainland China, short-haul and long-haul · H1 2026"
      actions={<Link href="/countries-analysis/" className="text-xs font-semibold text-brand-800 hover:underline">Explore all 18 markets →</Link>}
    >
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-700">Share by {mode}</h3>
            <Segmented value={mode} options={[{ value: 'visitors', label: 'Visitors' }, { value: 'revenue', label: 'Revenue' }]} onChange={setMode} />
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={pieRows}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={84}
                paddingAngle={2}
                stroke={COLORS.canvas}
                strokeWidth={2}
                labelLine={false}
                label={pieLabel(mode, (name) => name === 'Short-haul' ? '#fff' : '#1f2937')}
              >
                {pieRows.map((row) => <Cell key={row.name} fill={colors[row.name]} />)}
              </Pie>
              <Tooltip
                formatter={(value) => formatAmount(Number(value), mode)}
                contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.grid}`, background: COLORS.canvas, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="min-w-0">
          <h3 className="mb-1 text-xs font-semibold text-slate-700">Visitors and average revenue by region</h3>
          <ResponsiveContainer width="100%" height={270}>
            <ComposedChart data={segmentData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="segment" tick={{ fontSize: 10, fill: COLORS.steelDeep }} tickLine={false} axisLine={{ stroke: COLORS.grid }} />
              <YAxis yAxisId="visitors" tickFormatter={(value) => `${(value / 1e6).toFixed(0)}m`} tick={{ fontSize: 10, fill: COLORS.steelDeep }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="revenue" orientation="right" tickFormatter={(value) => `HK$${(value / 1000).toFixed(1)}k`} tick={{ fontSize: 10, fill: COLORS.steelDeep }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value, name) => [name === 'Visitors' ? formatCompact(Number(value), 2) : `HK$${Math.round(Number(value)).toLocaleString('en-HK')} per visitor`, name]}
                contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.grid}`, background: COLORS.canvas, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="visitors" dataKey="visitors" name="Visitors" fill={VISITOR_GROWTH} radius={[4, 4, 0, 0]} maxBarSize={38} />
              <Line yAxisId="revenue" dataKey="averageRevenue" name="Average revenue / visitor" stroke={REVENUE_GROWTH} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SectionCard>
  );
}
