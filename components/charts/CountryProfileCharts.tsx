'use client';

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SectionCard from '../SectionCard';
import { demographics } from '@/lib/data';
import { completeAgeShares, completeCounts, HALF_YEARS, overnightPurposeShares, quarterlyAgeCounts } from '@/lib/country-half-year';
import { AGE_COLORS, AGE_GROUPS, countrySameDayShare, labelColor, marketH1, profile, profileValue } from '@/lib/persona';
import { AXIS_TICK, COLORS, TABLEAU_CASUAL, TOOLTIP_STYLE } from '@/lib/theme';

type Breakdown = { period: string; shares: Record<string, number> };
type Series = { name: string; color: string };
const labels = HALF_YEARS.map(([, label]) => label);

function BreakdownChart({ title, subtitle, rows, series, periods, horizontal = false }: {
  title: string; subtitle: string; rows: Breakdown[]; series: Series[]; periods: string[]; horizontal?: boolean;
}) {
  const display = (value: number) => `${value.toFixed(1)}%`;
  const data = periods.map((period) => {
    const row = rows.find((entry) => entry.period === period);
    if (!row) return { period };
    return {
      period,
      ...row.shares,
      ...Object.fromEntries(series.map(({ name }) => {
        const value = row.shares[name];
        return [`${name}-label`, value >= 10 ? display(value) : ''];
      })),
    };
  });
  const amountAxis = {
    tick: AXIS_TICK, tickLine: false, axisLine: false,
    tickFormatter: (value: number) => `${value}%`,
    domain: horizontal
      ? [0, (max: number) => Math.max(100, Math.ceil(max - 1e-8))] as [number, (max: number) => number]
      : [0, 100] as [number, number],
    allowDataOverflow: !horizontal,
  };
  const missing = periods.filter((period) => !rows.some((row) => row.period === period));
  return (
    <SectionCard title={title} subtitle={subtitle}>
      {rows.length ? (
        <>
          <p className="visually-hidden">{rows.map((row) => `${row.period}: ${series.map(({ name }) => {
            const value = row.shares[name];
            return `${name} ${value === undefined ? 'unavailable' : display(value)}`;
          }).join('; ')}.`).join(' ')}</p>
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} vertical={horizontal} horizontal={!horizontal} />
              {horizontal
                ? <XAxis type="number" {...amountAxis} />
                : <XAxis type="category" dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} />}
              {horizontal
                ? <YAxis type="category" dataKey="period" width={95} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                : <YAxis type="number" {...amountAxis} />}
              <Tooltip {...TOOLTIP_STYLE} formatter={(value, name) => [display(Number(value)), name]} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 10 }} />
              {series.map(({ name, color }) => (
                <Bar key={name} dataKey={name} stackId="profile" fill={color} maxBarSize={60} isAnimationActive={false}>
                  <LabelList dataKey={`${name}-label`} position="center" fill={labelColor(color)} fontSize={9} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          {missing.length > 0 && <p className="text-xs text-slate-500">Unavailable: {missing.join(', ')}.</p>}
        </>
      ) : <div className="chart-empty">Data is unavailable for this selection: {periods.join(', ')}.</div>}
    </SectionCard>
  );
}

export function CountryAgeChart({ market, available }: { market: string; available: boolean }) {
  const series = AGE_GROUPS.map((group, index) => ({ name: `Age ${group}`, color: AGE_COLORS[index] }));
  const rows: Breakdown[] = [];
  let usesRoundedShares = false;
  for (const [period, label] of HALF_YEARS) {
    if (!available) continue;
    const shareRows = profile(period, market, 'age_share_pct');
    if (shareRows.length) {
      const publishedShares = completeAgeShares(shareRows, AGE_GROUPS);
      if (!publishedShares) continue;
      usesRoundedShares = true;
      rows.push({ period: label, shares: Object.fromEntries(AGE_GROUPS.map((group) => [`Age ${group}`, publishedShares[group]])) });
      continue;
    }
    const data = period === '2025-H2' ? undefined : marketH1(period === '2025-H1' ? '2025' : '2026-H1', market);
    const workbookCounts = data ? completeCounts(AGE_GROUPS.map((group) => ({ category: group, value: data.age_counts[group] })), AGE_GROUPS) : null;
    const counts = completeCounts(profile(period, market, 'age_count'), AGE_GROUPS)
      ?? quarterlyAgeCounts(demographics.country_age_quarterly, market, period, AGE_GROUPS)
      ?? workbookCounts;
    if (!counts) continue;
    const total = AGE_GROUPS.reduce((sum, group) => sum + counts[group], 0);
    rows.push({
      period: label,
      shares: Object.fromEntries(AGE_GROUPS.map((group) => [`Age ${group}`, counts[group] / total * 100])),
    });
  }
  return <BreakdownChart title="Age profile" subtitle={`All visitors · half-year comparisons${usesRoundedShares ? ' · rounded shares may not total 100%' : ''}`} rows={rows} series={series} periods={labels} horizontal />;
}

export function CountryVisitorTypeChart({ market, available }: { market: string; available: boolean }) {
  const series = [{ name: 'Overnight', color: TABLEAU_CASUAL[0] }, { name: 'Same-day', color: TABLEAU_CASUAL[1] }];
  const rows: Breakdown[] = [];
  for (const [period, label] of HALF_YEARS) {
    if (!available) continue;
    const data = period === '2025-H2' ? undefined : marketH1(period === '2025-H1' ? '2025' : '2026-H1', market);
    const counts = completeCounts(profile(period, market, 'visitor_type_count'), ['Overnight', 'Same-day'])
      ?? (data && data.overnight + data.same_day === data.arrivals
        ? completeCounts([{ category: 'Overnight', value: data.overnight }, { category: 'Same-day', value: data.same_day }], ['Overnight', 'Same-day']) : null);
    const suppliedSameDay = countrySameDayShare(period, market);
    if (!counts && suppliedSameDay === null) continue;
    const total = counts ? counts.Overnight + counts['Same-day'] : 0;
    const sameDay = suppliedSameDay ?? (counts ? counts['Same-day'] / total * 100 : null);
    if (sameDay === null) continue;
    rows.push({
      period: label,
      shares: { Overnight: 100 - sameDay, 'Same-day': sameDay },
    });
  }
  return <BreakdownChart title="Overnight vs same-day visitors" subtitle="All visitors · half-year comparisons" rows={rows} series={series} periods={labels} />;
}

export function CountryFirstTimeChart({ market, available }: { market: string; available: boolean }) {
  const series = [{ name: 'First-time', color: TABLEAU_CASUAL[0] }, { name: 'Repeat', color: TABLEAU_CASUAL[1] }];
  const rows: Breakdown[] = [];
  const key = market === 'Mainland' ? 'Chinese Mainland' : market;
  for (const [period, label] of HALF_YEARS) {
    const first = available ? profileValue(period, key, 'first_timer_pct') : null;
    if (first === null || first < 0 || first > 100) continue;
    rows.push({ period: label, shares: { 'First-time': first, Repeat: 100 - first } });
  }
  const subtitle = market === 'Short-haul'
    ? 'Published shares · H1 short-haul share user-provided, visitor type unspecified'
    : 'Overnight visitors · half-year comparisons';
  return <BreakdownChart title="First-time vs repeat visitors" subtitle={subtitle} rows={rows} series={series} periods={labels} />;
}

export function CountryPurposeChart({ market, available }: { market: string; available: boolean }) {
  const categories = ['Vacation', 'Visiting friends / relatives', 'Business', 'En-route', 'Others'];
  const series = categories.map((name, index) => ({ name, color: TABLEAU_CASUAL[index] }));
  const rows: Breakdown[] = [];
  const key = market === 'Chinese Mainland' ? 'Mainland' : market;
  let usesEstimates = false;
  for (const [period, label] of HALF_YEARS) {
    const provided = available ? profile(period, market, 'country_trip_purpose') : [];
    if (provided.length) {
      const shares = overnightPurposeShares(provided, categories);
      if (shares) {
        usesEstimates = true;
        rows.push({ period: label, shares });
      }
      continue;
    }
    const entries = available ? profile(period, key, 'trip_purpose') : [];
    if (!categories.every((name) => entries.filter((entry) => entry.category === name).length === 1)) continue;
    rows.push({ period: label, shares: Object.fromEntries(entries.map((entry) => [entry.category, entry.value])) });
  }
  return <BreakdownChart title="Overnight visitors purpose of visit" subtitle={usesEstimates ? 'Overnight visitors · estimated from rounded supplied all-visitor shares' : 'Overnight visitors · half-year comparisons'} rows={rows} series={series} periods={labels} horizontal />;
}
