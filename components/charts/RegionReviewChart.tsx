'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SectionCard, { Segmented } from '../SectionCard';
import { summary } from '@/lib/data';
import { formatCompact, formatHkd, formatNumber, formatPct, monthLabel } from '@/lib/format';
import { labelColor } from '@/lib/persona';
import { buildMonthlyRegionArrivals, buildRegionInsightsData, buildRegionReviewData, regionalOverviewSummary, REVIEW_REGIONS } from '@/lib/region-review';
import { AXIS_TICK, COLORS, ORIGIN_COLORS, TOOLTIP_STYLE } from '@/lib/theme';
import type { Filters, Segment } from '@/lib/types';

type Mode = 'visitors' | 'spending' | 'average';
type LabelMode = 'percent' | 'numbers';
const label = (segment: Segment) => segment === 'Mainland' ? 'Mainland China' : segment;
const amount = (value: number) => `${formatNumber(value)} visitors`;

export function RegionInsights({ filters }: { filters: Filters }) {
  const { points, incomplete } = useMemo(
    () => buildRegionReviewData(summary.quarterly_segment_spend, filters.start, filters.end),
    [filters.start, filters.end],
  );
  const insight = buildRegionInsightsData(points, filters.origin);
  const selectedLabel = filters.origin === 'All' ? 'All regions' : label(filters.origin);
  const arrivalLabel = filters.origin === 'All' ? 'overall' : selectedLabel;
  const pairs = insight ? [
    ...(filters.origin === 'All' ? [{
      insight: `${label(insight.leader)} accounted for ${(insight.regions[insight.leader].visitors / insight.allVisitors * 100).toFixed(1)}% of arrivals.`,
      action: insight.regions[insight.leader].visitors / insight.allVisitors > 0.5
        ? `Diversify demand beyond ${label(insight.leader)} while maintaining its visitor base.`
        : 'Maintain a balanced regional visitor mix through market-specific promotion.',
    }, {
      insight: `${label(insight.lowestSpend)} had the lowest average spending per visitor at ${formatHkd(insight.regions[insight.lowestSpend].average)}.`,
      action: `Explore higher-value experiences for ${label(insight.lowestSpend)} visitors.`,
    }] : [{
      insight: `${selectedLabel} recorded ${formatCompact(insight.selected.visitors, 2)} arrivals and averaged ${formatHkd(insight.selected.average)} per visitor, compared with ${formatHkd(insight.allAverage)} across all regions.`,
      action: insight.selected.average < insight.allAverage
        ? `Develop higher-value experiences to increase spending per ${selectedLabel} visitor.`
        : `Promote ${selectedLabel} travel packages to sustain its spending per visitor.`,
    }]),
    ...(insight.change === null ? [] : [{
      insight: `${arrivalLabel} arrivals in ${insight.lastPeriod} changed ${formatPct(insight.change, 1, true)} compared with ${insight.previousPeriod}.`,
      action: Number(insight.change.toFixed(1)) < 0
        ? `Review seasonal patterns and the decline in ${arrivalLabel} arrivals before adjusting promotion.`
        : `Sustain ${arrivalLabel} visitor acquisition and monitor demand.`,
    }]),
  ] : [];

  return (
    <SectionCard title="Insights and proposed actions" subtitle={insight && !incomplete ? `${selectedLabel} · ${insight.period} · complete quarters` : selectedLabel}
      footnote={insight && !incomplete ? 'Quarterly spending is derived from HKTB TEAIT market-area data and excludes international passenger transport.' : undefined}>
      {incomplete ? <div className="chart-empty">Insights are unavailable because regional data is incomplete for the selected period.</div>
        : !insight ? <div className="chart-empty">Insights are unavailable without a complete quarter in the selected period.</div>
          : (
            <div className="grid gap-4 text-xs leading-relaxed text-slate-700 lg:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800">Insights</h3>
                <ol className="list-decimal space-y-2 pl-4">{pairs.map((pair) => <li key={pair.insight}>{pair.insight}</li>)}</ol>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800">Actions</h3>
                <ol className="list-decimal space-y-2 pl-4">{pairs.map((pair) => <li key={pair.insight}>{pair.action}</li>)}</ol>
              </div>
            </div>
          )}
    </SectionCard>
  );
}

export default function RegionReviewChart({ filters }: { filters: Filters }) {
  const [mode, setMode] = useState<Mode>('visitors');
  const [labelMode, setLabelMode] = useState<LabelMode>('percent');
  const monthly = useMemo(
    () => buildMonthlyRegionArrivals(summary.arrivals_monthly, filters.start, filters.end),
    [filters.start, filters.end],
  );
  const quarterly = useMemo(
    () => buildRegionReviewData(summary.quarterly_segment_spend, filters.start, filters.end),
    [filters.start, filters.end],
  );
  const history = useMemo(
    () => buildRegionReviewData(summary.quarterly_segment_spend, '2025-01', '2025-12'),
    [],
  );
  const quarterlyPoints = [...history.points, ...quarterly.points];
  const overview = regionalOverviewSummary(summary.arrivals_monthly, summary.quarterly_segment_spend, filters.start, filters.end, filters.origin, mode);
  const regions = filters.origin === 'All' ? REVIEW_REGIONS : [filters.origin];
  const data = monthly.points.map((point) => ({
    period: monthLabel(point.month),
    ...point.regions,
    total: point.total,
    shownTotal: regions.reduce((sum, region) => sum + point.regions[region], 0),
    'Mainland-share': point.total > 0 ? point.regions.Mainland / point.total * 100 : null,
    'Short-haul-share': point.total > 0 ? point.regions['Short-haul'] / point.total * 100 : null,
    'Long-haul-share': point.total > 0 ? point.regions['Long-haul'] / point.total * 100 : null,
  }));
  const quarterlyData = quarterlyPoints.map((point) => {
    const metric = mode === 'average' ? 'average' : 'spending';
    const values = Object.fromEntries(REVIEW_REGIONS.map((region) => [region, point.regions[region][metric]]));
    const shares = Object.fromEntries(REVIEW_REGIONS.map((region) => [`${region}-share`, point.totals.spending > 0 ? point.regions[region].spending / point.totals.spending * 100 : null]));
    return {
      period: point.period,
      ...values,
      ...shares,
      total: point.totals.spending,
      shownTotal: regions.reduce((sum, region) => sum + point.regions[region].spending, 0),
    };
  });
  const chartData = mode === 'visitors' ? data : quarterlyData;
  const incomplete = mode === 'visitors' ? monthly.incomplete : quarterly.incomplete || history.incomplete;
  const totalLabel = filters.start === '2026-01' && filters.end === '2026-06'
    ? 'H1 2026' : mode === 'visitors' ? 'Selected period' : 'Complete quarters';
  const valueLabel = mode === 'average' ? `${totalLabel} average` : `${totalLabel} total`;
  const displayValue = (value: number) => mode === 'visitors'
    ? amount(value) : mode === 'spending' ? `HK$${formatNumber(value, 2)}m` : formatHkd(value);
  const unsupported = filters.region !== 'All';

  return (
    <SectionCard
      title="Overview of Different Regions"
      subtitle={mode === 'visitors' ? 'Monthly · visitor arrivals' : `Quarterly · 2025 full year and selected 2026 quarters · ${mode === 'spending' ? 'spending · HK$ million' : 'spending per visitor · HK$'}`}
      actions={mode !== 'average' && (
        <div role="group" aria-label="Chart labels">
          <Segmented value={labelMode} options={[
            { value: 'percent', label: '%' },
            { value: 'numbers', label: 'Numbers' },
          ]} onChange={setLabelMode} />
        </div>
      )}
    >
      <div className="mb-3" role="group" aria-label="Regional review metric">
        <Segmented value={mode} options={[
          { value: 'visitors', label: 'Visitors' },
          { value: 'spending', label: 'Spending' },
          { value: 'average', label: 'Average Spending/Visitor' },
        ]} onChange={setMode} />
      </div>
      {unsupported ? (
        <div className="chart-empty">Regional figures cover all countries and visitor types. Clear the Country filter to view this chart.</div>
      ) : incomplete ? (
        <div className="chart-empty">{mode === 'visitors' ? 'Regional data is incomplete for the selected period.' : 'Regional data is incomplete for 2025 or the selected period.'}</div>
      ) : (mode === 'visitors' ? data.length === 0 : quarterly.points.length === 0) ? (
        <div className="chart-empty">{mode === 'visitors' ? 'No monthly regional data is available' : 'No complete quarter is available'} in the selected period.</div>
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_160px]">
          <div className="min-w-0">
            <p className="visually-hidden">
              {mode === 'visitors'
                ? data.map((row) => `${row.period}: ${regions.map((region) => `${label(region)} ${amount(row[region])}${row.total > 0 ? `, ${(row[region] / row.total * 100).toFixed(1)}% of all regions` : ''}`).join('; ')}${labelMode === 'numbers' ? `; displayed total ${amount(row.shownTotal)}` : ''}.`).join(' ')
                : quarterlyPoints.map((point) => `${point.period}: ${regions.map((region) => `${label(region)} ${mode === 'spending' ? `HK$${formatNumber(point.regions[region].spending, 2)} million` : formatHkd(point.regions[region].average)}`).join('; ')}${mode === 'spending' && labelMode === 'numbers' ? `; displayed total HK$${formatNumber(regions.reduce((sum, region) => sum + point.regions[region].spending, 0), 2)} million` : ''}.`).join(' ')}
            </p>
            {mode === 'average' ? (
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={quarterlyData} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(value) => formatCompact(Number(value), 1)} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(value, name) => [formatHkd(Number(value)), name]} itemSorter={(item) => -Number(item.value)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {regions.map((region) => <Line key={region} dataKey={region} name={label(region)} stroke={ORIGIN_COLORS[region]} strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />)}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={340} className="overflow-hidden">
              <BarChart data={chartData} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis yAxisId="amount" tick={AXIS_TICK} tickLine={false} axisLine={false} domain={labelMode === 'numbers' ? [0, (max: number) => max * 1.15] : undefined} tickFormatter={(value) => formatCompact(Number(value), 1)} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value, name, item) => {
                    const total = Number(item.payload.total);
                    return [`${mode === 'visitors' ? amount(Number(value)) : `HK$${formatNumber(Number(value), 2)}m`}${total > 0 ? ` · ${(Number(value) / total * 100).toFixed(1)}% of all regions` : ''}`, name];
                  }}
                  itemSorter={(item) => -Number(item.value)}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {regions.map((region, index) => (
                  <Bar key={region} yAxisId="amount" dataKey={region} name={label(region)} stackId="regions" fill={ORIGIN_COLORS[region]} maxBarSize={100}>
                    <LabelList
                      dataKey={labelMode === 'percent' ? `${region}-share` : region}
                      position="center"
                      fill={labelColor(ORIGIN_COLORS[region])}
                      fontSize={labelMode === 'numbers' ? 9 : 11}
                      formatter={(value: number) => labelMode === 'percent' ? `${value.toFixed(1)}%` : formatCompact(value, 2)}
                    />
                    {labelMode === 'numbers' && index === regions.length - 1 && (
                      <LabelList dataKey="shownTotal" position="top" fill="#334155" fontSize={10}
                        formatter={(value: number) => `Total ${formatCompact(value, 2)}`} />
                    )}
                  </Bar>
                ))}
              </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <aside className="flex flex-row gap-6 border-t border-slate-200 pt-4 lg:flex-col lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0" aria-label="Regional overview summary">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">{valueLabel}</div>
              <strong className="text-base text-brand-900">{overview.value === null ? 'N/A' : displayValue(overview.value)}</strong>
            </div>
            <div>
              <div className="text-xs text-slate-500">YoY Growth</div>
              <strong className={`text-base ${overview.growth === null ? 'text-slate-500' : overview.growth >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatPct(overview.growth, 1, true)}</strong>
              <div className="text-[11px] text-slate-500">vs same period in 2025</div>
            </div>
          </aside>
        </div>
      )}
    </SectionCard>
  );
}
