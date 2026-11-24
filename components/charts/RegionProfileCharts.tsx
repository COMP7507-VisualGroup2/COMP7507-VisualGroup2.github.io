'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis, type PieLabelRenderProps } from 'recharts';
import SectionCard, { Segmented } from '../SectionCard';
import { spendingByCategory } from '../VisitorProfileCharts';
import { HALF_YEARS } from '@/lib/country-half-year';
import { formatCompact, formatNumber, formatPct } from '@/lib/format';
import { AGE_COLORS, AGE_GROUPS, H1_LABEL, PERIOD_LABEL, formatShare, labelColor, marketH1, profile, profileValue, type Segment } from '@/lib/persona';
import { AXIS_TICK, COLORS, TABLEAU_CASUAL, TOOLTIP_STYLE } from '@/lib/theme';
import type { ProfilePeriod } from '@/lib/types';

type PieRow = { name: string; percent: number; count: number | null; color: string };
type LabelMode = 'percent' | 'numbers';

function ProfilePieCard({ title, subtitle, rows }: { title: string; subtitle: string; rows: PieRow[] }) {
  const [mode, setMode] = useState<LabelMode>('percent');
  const display = (row: PieRow) => mode === 'percent'
    ? `${row.percent.toFixed(1)}%`
    : row.count === null ? 'N/A' : formatCompact(row.count, 2);
  const label = (props: PieLabelRenderProps) => {
    const row = rows.find((item) => item.name === props.name);
    if (!row) return null;
    const radius = Number(props.innerRadius) + (Number(props.outerRadius) - Number(props.innerRadius)) * 0.62;
    const angle = -Number(props.midAngle) * Math.PI / 180;
    const x = Number(props.cx) + Math.cos(angle) * radius;
    const y = Number(props.cy) + Math.sin(angle) * radius;
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={labelColor(row.color)} fontSize={9} fontWeight={700} pointerEvents="none">
        <tspan x={x} dy="-0.6em">{row.name}</tspan>
        <tspan x={x} dy="1.2em">{display(row)}</tspan>
      </text>
    );
  };
  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      actions={
        <div role="group" aria-label={`${title} labels`}>
          <Segmented value={mode} options={[{ value: 'percent', label: '%' }, { value: 'numbers', label: 'Numbers' }]} onChange={setMode} />
        </div>
      }
    >
      {rows.length ? (
        <>
          <p className="visually-hidden">{rows.map((row) => `${row.name}: ${row.percent.toFixed(1)}%, ${row.count === null ? 'count unavailable' : formatNumber(row.count)}.`).join(' ')}</p>
          <div className="mx-auto max-w-md">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={rows} dataKey="percent" nameKey="name" outerRadius={110} stroke="#fff" strokeWidth={2} labelLine={false} label={label}>
                  {rows.map((row) => <Cell key={row.name} fill={row.color} />)}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(_, name) => {
                  const row = rows.find((item) => item.name === name);
                  return row ? [mode === 'numbers' && row.count !== null ? formatNumber(row.count) : display(row), name] : ['N/A', name];
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : <div className="chart-empty">Data is unavailable for this selection.</div>}
    </SectionCard>
  );
}

export function AgeProfilePie({ period, segment, available = true }: { period: ProfilePeriod; segment: string; available?: boolean }) {
  const data = available ? marketH1(period, segment) : undefined;
  const rows = data && AGE_GROUPS.every((group) => data.age[group] != null && data.age_counts[group] != null)
    ? AGE_GROUPS.map((group, index) => ({ name: `Age ${group}`, percent: data.age[group], count: data.age_counts[group], color: AGE_COLORS[index] }))
    : [];
  return <ProfilePieCard title="Age profile" subtitle={`All visitors · ${H1_LABEL[period]}`} rows={rows} />;
}

export function VisitorTypePie({ period, segment, available = true }: { period: ProfilePeriod; segment: string; available?: boolean }) {
  const data = available ? marketH1(period, segment) : undefined;
  const rows = data && data.arrivals > 0 && data.overnight + data.same_day === data.arrivals
    ? [
      { name: 'Overnight', percent: data.overnight / data.arrivals * 100, count: data.overnight, color: TABLEAU_CASUAL[0] },
      { name: 'Same-day', percent: data.same_day / data.arrivals * 100, count: data.same_day, color: TABLEAU_CASUAL[1] },
    ]
    : [];
  return <ProfilePieCard title="Overnight vs same-day visitors" subtitle={`All visitors · ${H1_LABEL[period]}`} rows={rows} />;
}

export function FirstTimePie({ period, segment, available = true }: { period: ProfilePeriod; segment: string; available?: boolean }) {
  const market = segment === 'Mainland' ? 'Chinese Mainland' : segment;
  const current = period === '2026-H1' ? profileValue(period, market, 'first_timer_pct') : null;
  const first = available ? current ?? profileValue('2025', segment, 'first_timer_pct') : null;
  const rows = first !== null && first >= 0 && first <= 100
    ? [
      { name: 'First-time', percent: first, count: null, color: TABLEAU_CASUAL[0] },
      { name: 'Repeat', percent: 100 - first, count: null, color: TABLEAU_CASUAL[1] },
    ]
    : [];
  return <ProfilePieCard title="First-time vs repeat visitors" subtitle={current !== null ? H1_LABEL[period] : '2025 full year · overnight visitors'} rows={rows} />;
}

function ShoppingTile({ x = 0, y = 0, width = 0, height = 0, index = 0, depth = 0, name = '', value = 0 }: {
  x?: number; y?: number; width?: number; height?: number; index?: number; depth?: number; name?: string; value?: number;
}) {
  if (depth !== 1) return null;
  const color = TABLEAU_CASUAL[index % TABLEAU_CASUAL.length];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="#fff" strokeWidth={2} />
      {width >= 26 && height >= 32 && (
        <foreignObject x={x + 3} y={y + 3} width={Math.max(0, width - 6)} height={Math.max(0, height - 6)} pointerEvents="none">
          <div className="flex h-full flex-col items-center justify-center overflow-hidden text-center text-[10px] font-semibold leading-tight" style={{ color: labelColor(color), overflowWrap: 'anywhere' }}>
            <span>{name}</span>
            <span>{formatShare(value)}</span>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

export function ShoppingTreemap({ period, segment, available = true }: { period: ProfilePeriod; segment: string; available?: boolean }) {
  const rows = available ? profile(period, segment, 'shopping_mix').map((row) => ({ name: row.category, value: row.value })) : [];
  return (
    <SectionCard title="What goes in the shopping bag" subtitle={`Shopping categories, % of overnight spend · ${PERIOD_LABEL[period]}`}>
      {rows.length && rows.some((row) => row.value > 0) ? (
        <>
          <p className="visually-hidden">{rows.map((row) => `${row.name}: ${formatShare(row.value)}.`).join(' ')}</p>
          <ResponsiveContainer width="100%" height={330}>
            <Treemap data={rows} dataKey="value" nameKey="name" content={<ShoppingTile />} isAnimationActive={false}>
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => formatShare(Number(value))} />
            </Treemap>
          </ResponsiveContainer>
        </>
      ) : <div className="chart-empty">Data is unavailable for this selection.</div>}
    </SectionCard>
  );
}

export function PurposeChart({ period, segment, available = true }: { period: ProfilePeriod; segment: string; available?: boolean }) {
  const current = available ? profile(period, segment, 'trip_purpose') : [];
  const fallback = available && period === '2026-H1' && !current.length ? profile('2025', segment, 'trip_purpose') : [];
  const rows = (current.length ? current : fallback).map((row) => ({ purpose: row.category, percent: row.value }));
  const displayPeriod = fallback.length ? '2025' : period;
  return (
    <SectionCard title="Overnight visitors purpose of visit" subtitle={`Overnight visitors · ${PERIOD_LABEL[displayPeriod]} · HKTB Visitor Profile`}>
      {rows.length ? (
        <>
          <p className="visually-hidden">{rows.map((row) => `${row.purpose}: ${row.percent}%.`).join(' ')}</p>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="purpose" width={150} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => `${Number(value).toFixed(1)}%`} />
              <Bar dataKey="percent" name="Visitors" fill={COLORS.accent} maxBarSize={24}>
                <LabelList dataKey="percent" position="right" fontSize={10} formatter={(value: number) => `${value}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      ) : <div className="chart-empty">Data is unavailable for this selection.</div>}
    </SectionCard>
  );
}

export function AverageStayChart({ segment, available }: { segment: string; available: boolean }) {
  const rows = HALF_YEARS.map(([period, label]) => ({
    period: label,
    nights: available ? profileValue(period, segment, 'avg_nights') : null,
  }));
  const missing = rows.filter((row) => row.nights === null).map((row) => row.period);
  return (
    <SectionCard title="Average stay for overnight visitors" subtitle="Average nights · half-year comparisons">
      {missing.length < rows.length ? (
        <>
          <p className="visually-hidden">{rows.map((row) => `${row.period}: ${row.nights === null ? 'unavailable' : `${row.nights.toFixed(1)} nights`}.`).join(' ')}</p>
          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={rows} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} vertical={false} />
              <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} domain={[0, (max: number) => Math.ceil(max * 1.2)]} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => `${Number(value).toFixed(1)} nights`} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 10 }} />
              <Line dataKey="nights" name="Average stay" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false}>
                <LabelList dataKey="nights" position="top" fontSize={11} formatter={(value: number) => `${value.toFixed(1)} nights`} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
          {missing.length > 0 && <p className="text-xs text-slate-500">Unavailable: {missing.join(', ')}.</p>}
        </>
      ) : <div className="chart-empty">Average stay is unavailable for this selection: {missing.join(', ')}.</div>}
    </SectionCard>
  );
}

export function TravelCompanionChart({ segment, available }: { segment: string; available: boolean }) {
  const regional = ['All markets', 'Mainland', 'Short-haul', 'Long-haul'].includes(segment);
  const period = regional ? '2025' : '2026-H1';
  const rows = available ? profile(period, segment, regional ? 'companion_detail' : 'companion') : [];
  return (
    <SectionCard title="Travel Companion" subtitle={`Overnight visitors · ${PERIOD_LABEL[period]}${regional ? ' · HKTB Visitor Profile' : ''}`}
      footnote="Categories overlap; visitors may travel with more than one type of companion.">
      {rows.length ? (
        <>
          <p className="visually-hidden">{rows.map((row) => `${row.category}: ${row.value}%.`).join(' ')}</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="category" width={150} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => `${Number(value).toFixed(1)}%`} />
              <Bar dataKey="value" name="Visitors" fill={COLORS.accent} maxBarSize={24} isAnimationActive={false}>
                <LabelList dataKey="value" position="right" fontSize={10} formatter={(value: number) => `${value}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      ) : <div className="chart-empty">Travel companion data is unavailable for this selection and period.</div>}
    </SectionCard>
  );
}

export function ExpenditureChart({ segment, available = true }: { segment?: Segment; available?: boolean }) {
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('descending');
  const data = available && segment ? spendingByCategory(segment) : null;
  const rows = [...(data?.entries ?? [])].sort((a, b) => {
    const difference = sortDirection === 'ascending' ? a.growth - b.growth : b.growth - a.growth;
    return difference || a.category.localeCompare(b.category);
  });
  const minimumBarWidth = (value: number | null | undefined) => value ? 5 : 0;
  return (
    <SectionCard title="Spending Category" subtitle="Overnight visitors · H1 2025 vs H1 2026 · HK$ million" footnote="Very small non-zero bars use a minimum visual width; hover for exact values.">
      {data ? (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSortDirection((current) => current === 'descending' ? 'ascending' : 'descending')}
              aria-label={`Sort by YoY percentage, currently ${sortDirection}`}
              className="pr-1 text-[11px] font-semibold text-slate-600 hover:text-brand-800"
            >
              YoY % {sortDirection === 'descending' ? '↓' : '↑'}
            </button>
          </div>
          <p className="visually-hidden">{rows.map((row) => `${row.category}: HK$${formatNumber(row.before, 2)} million in H1 2025, HK$${formatNumber(row.now, 2)} million in H1 2026, ${formatPct(row.growth, 1, true)} growth.`).join(' ')}</p>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" minWidth={480} height={330}>
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.grid} horizontal={false} />
                <XAxis type="number" domain={[0, (max: number) => max * 1.35]} tickFormatter={(value) => formatNumber(Number(value))} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis yAxisId="category" type="category" dataKey="category" width={100} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="growth"
                  type="category"
                  dataKey="category"
                  orientation="right"
                  width={66}
                  tickLine={false}
                  axisLine={false}
                  tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                    const row = rows.find((entry) => entry.category === payload.value);
                    return <text x={x + 58} y={y} textAnchor="end" dominantBaseline="middle" fill={row ? (row.growth >= 0 ? '#15803d' : '#dc2626') : COLORS.steelDeep} fontSize={11} fontWeight={600}>{formatPct(row?.growth, 1, true)}</text>;
                  }}
                />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value) => `HK$${formatNumber(Number(value), 2)}m`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar yAxisId="category" dataKey="before" name="H1 2025" fill={TABLEAU_CASUAL[0]} maxBarSize={18} minPointSize={minimumBarWidth} isAnimationActive={false}>
                  <LabelList dataKey="before" position="right" fontSize={10} formatter={(value: number) => `${formatNumber(value, 2)}m`} />
                </Bar>
                <Bar yAxisId="category" dataKey="now" name="H1 2026" fill={TABLEAU_CASUAL[1]} maxBarSize={18} minPointSize={minimumBarWidth} isAnimationActive={false}>
                  <LabelList dataKey="now" position="right" fontSize={10} formatter={(value: number) => `${formatNumber(value, 2)}m`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : <div className="chart-empty">Spending category comparisons are unavailable.</div>}
    </SectionCard>
  );
}
