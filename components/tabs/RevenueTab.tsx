'use client';

import { useMemo } from 'react';
import DataSourceBadge from '../DataSourceBadge';
import LazyMount from '../LazyMount';
import PendingCard from '../PendingCard';
import SectionCard, { Insight, PageHeading } from '../SectionCard';
import BriHeatmap from '../charts/BriHeatmap';
import HotelComboChart from '../charts/HotelComboChart';
import { MarketDriversChart, MarketShareChart, SegmentCategoryChart } from '../charts/MarketRevenueCharts';
import { AccommodationChart, PerCapitaByMarket, ValueAddedChart, YieldVolumeScatter } from '../charts/RevenueCharts';
import { kpiSummary, revenue } from '@/lib/data';
import { useFilters } from '@/lib/filters-context';
import { formatHkd, formatHkdMillions, formatNumber, formatPct, pctChange } from '@/lib/format';
import { marketEconomics } from '@/lib/markets';
import { PERIOD_LABEL, periodForRange } from '@/lib/persona';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-canvas p-4 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

export default function RevenueTab() {
  const { filters } = useFilters();
  const s = kpiSummary.spending;
  const years = Object.keys(s.annual_hkd_m).sort();
  const y = years[years.length - 1];
  const prev = years[years.length - 2];

  const period = periodForRange(filters.end);

  const facts = useMemo(() => {
    const rows = revenue.market_spending.filter((r) => r.year === y);
    const markets = Array.from(new Set(rows.map((r) => r.market))).map((m) => {
      const sel = rows.filter((r) => r.market === m);
      const visitors = sel.reduce((a, r) => a + (r.visitors ?? 0), 0);
      const spend = sel.reduce((a, r) => a + r.spend_hkd_m, 0);
      return { market: m, visitors, spend, yield: visitors ? (spend * 1e6) / visitors : 0 };
    });
    const top = [...markets].sort((a, b) => b.yield - a.yield)[0];
    const mainland = markets.find((m) => m.market === 'Chinese Mainland');
    const total = markets.reduce((a, m) => a + m.spend, 0) || 1;
    const inbound = revenue.tourism_industries.filter((r) => r.year === kpiSummary.tourism_economy.year && r.group === 'Inbound' && r.code !== 'ind_KEY_IND_2A');
    const biggest = [...inbound].sort((a, b) => (b.value_added_hkd_m ?? 0) - (a.value_added_hkd_m ?? 0))[0];
    const econ = marketEconomics(period);
    const totalSpend = econ.reduce((a, r) => a + (r.spend ?? 0), 0);
    const totalOvernight = econ.reduce((a, r) => a + (r.spend !== null ? r.overnight : 0), 0);
    const avgPerCapita = totalOvernight ? (totalSpend * 1e6) / totalOvernight : null;
    const topPerHead = [...econ].filter((r) => r.perCapita !== null).sort((a, b) => (b.perCapita ?? 0) - (a.perCapita ?? 0))[0];
    const mainlandEcon = econ.find((r) => r.origin === 'Mainland');
    const yieldDrop = [...econ].filter((r) => r.yieldEffect !== null).sort((a, b) => (a.yieldEffect ?? 0) - (b.yieldEffect ?? 0))[0];
    return { top, mainland, mainlandShare: mainland ? (mainland.spend / total) * 100 : null, biggest, avgPerCapita, topPerHead, mainlandEcon, yieldDrop };
  }, [y, period]);

  const rooms = revenue.hotel_rooms_pipeline;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Revenue Analysis"
        description="Economic yield: total and per-capita visitor spending across source markets and consumption categories, separating high-yield segments from volume-driven ones."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Visitor spending ${y}`} value={formatHkdMillions(s.annual_hkd_m[y])} hint={`${formatPct(pctChange(s.annual_hkd_m[y], s.annual_hkd_m[prev]), 1, true)} vs ${prev}`} />
        <Stat label={`Spend per visitor ${y}`} value={formatHkd(s.yield_per_visitor_hkd[y])} hint={`${formatHkd(s.yield_per_visitor_hkd[prev])} in ${prev}`} />
        <Stat label="Overnight per capita" value={formatHkd(s.per_capita_hkd[y].Overnight)} hint={`Same-day: ${formatHkd(s.per_capita_hkd[y]['Same-day'])}`} />
        <Stat label={`${kpiSummary.period.ytd_label} spending`} value={formatHkdMillions(s.ytd_hkd_m)} hint={`${formatPct(s.ytd_yoy_pct, 1, true)} YoY · derived`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Per capita spending by source region" subtitle="Overnight vs same-day, C&SD 650-80004" badge="official">
          <LazyMount height={330}>
            <PerCapitaByMarket filters={filters} />
          </LazyMount>
        </SectionCard>
        <SectionCard title="High-yield vs volume-driven markets" subtitle="Overnight visitors vs spend per visitor, bubble size = total spend" badge="derived">
          <LazyMount height={380}>
            <YieldVolumeScatter filters={filters} period={period} />
          </LazyMount>
        </SectionCard>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4 sm:p-5">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-brand-900">Source markets: who brings the revenue</h3>
            <DataSourceBadge kind="derived" />
          </div>
          <p className="mt-1 text-sm text-slate-700">
            Estimated overnight spend = HKTB overnight arrivals × HKTB spend per overnight visitor, for the 18 source markets. Same-day spend is not published by market, so
            it is left out and Mainland&apos;s true weight is understated.
            {filters.origin !== 'All' && ` Market views are filtered to ${filters.origin}.`}
          </p>
        </div>
        <p className="text-xs font-semibold text-slate-700">
          Showing {PERIOD_LABEL[period]} <span className="font-normal text-slate-600">· set by the date range filter above</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Share of visitors vs share of estimated spend"
          subtitle={`Overnight visitors, 18 markets · ${PERIOD_LABEL[period]}`}
          badge="derived"
          footnote="Where the spend bar is longer than the visitor bar, a market earns more than its headcount."
        >
          <LazyMount height={560}>
            <MarketShareChart period={period} origin={filters.origin} />
          </LazyMount>
        </SectionCard>
        <SectionCard
          title="What moved estimated spend: visitors or spend per head"
          subtitle="Change vs Jan–Jun 2025, HK$ (volume at 2025 spend per head; yield on 2026 visitors)"
          badge="derived"
          footnote="2025 spend per head is the full-year HKTB figure (Jan–Jun is not published), so the yield effect is indicative."
        >
          <LazyMount height={560}>
            <MarketDriversChart period={period} origin={filters.origin} />
          </LazyMount>
        </SectionCard>
      </div>

      <SectionCard
        title="Where the money goes: estimated overnight spend by category"
        subtitle={`Mainland, short-haul and long-haul segments · ${PERIOD_LABEL[period]}`}
        badge="derived"
        footnote="Segment spend × the published spending mix (hotel bills, shopping, dining, others). The mix is published for segments, not for individual markets."
      >
        <LazyMount height={220}>
          <SegmentCategoryChart period={period} />
        </LazyMount>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard
          title="Revenue by consumption category"
          subtitle="Inbound tourism value added: shopping, accommodation, dining and transport"
          badge="official"
          footnote="C&SD 655-82101 (annual). Value added is the open dataset closest to a spending-category breakdown; HKTB's spending-by-category survey isn't published as open data."
        >
          <LazyMount height={320}>
            <ValueAddedChart />
          </LazyMount>
        </SectionCard>
        <SectionCard title="Revenue insights" subtitle="Computed from the official series" badge="derived">
          <div className="space-y-2">
            {facts.top && (
              <Insight>
                {facts.top.market} visitors spend the most per head ({formatHkd(facts.top.yield)} in {y}), making them a high-yield target.
              </Insight>
            )}
            {facts.mainland && facts.mainlandShare !== null && (
              <Insight tone="steel">
                The Chinese Mainland provides {formatPct(facts.mainlandShare)} of visitor spending at {formatHkd(facts.mainland.yield)} per visitor: a volume-driven market.
              </Insight>
            )}
            {facts.mainlandEcon && facts.mainlandEcon.spendShare !== null && (
              <Insight>
                Mainland visitors are {formatPct(facts.mainlandEcon.overnightShare, 0)} of overnight visitors from the 18 markets but an estimated{' '}
                {formatPct(facts.mainlandEcon.spendShare, 0)} of their overnight spend ({PERIOD_LABEL[period]}).
              </Insight>
            )}
            {facts.topPerHead && facts.avgPerCapita && (
              <Insight tone="accent">
                {facts.topPerHead.market} visitors spend {formatHkd(facts.topPerHead.perCapita ?? 0)} per overnight trip, {((facts.topPerHead.perCapita ?? 0) / facts.avgPerCapita).toFixed(1)}× the
                18-market average of {formatHkd(facts.avgPerCapita)}.
              </Insight>
            )}
            {period === '2026-H1' && facts.yieldDrop && (facts.yieldDrop.yieldEffect ?? 0) < 0 && (
              <Insight tone="steel">
                Spend per head fell most in {facts.yieldDrop.market} ({formatHkd(facts.yieldDrop.perCapitaPrev ?? 0)} in 2025 to {formatHkd(facts.yieldDrop.perCapita ?? 0)} in Jan–Jun 2026), worth about{' '}
                {formatHkdMillions(Math.abs(facts.yieldDrop.yieldEffect ?? 0))} of estimated spend.
              </Insight>
            )}
            {facts.biggest && (
              <Insight tone="accent">
                {facts.biggest.industry} is the largest inbound value-added category ({formatHkdMillions(facts.biggest.value_added_hkd_m ?? 0)}, {kpiSummary.tourism_economy.year}).
              </Insight>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Hotel supply and demand"
          subtitle={revenue.hotel_monthly.length ? 'Occupancy, vacancy gap and ADR' : 'Accommodation receipts (BRI) as the official demand indicator'}
          badge={revenue.hotel_monthly.length ? 'manual' : 'official'}
          footnote={
            rooms.length
              ? `Hotel room inventory (CSTB): ${rooms.map((r) => `${r.year} ${formatNumber(r.rooms)}`).join(' · ')} rooms.`
              : undefined
          }
        >
          <LazyMount height={270}>
            {revenue.hotel_monthly.length ? <HotelComboChart filters={filters} /> : <AccommodationChart filters={filters} />}
          </LazyMount>
          {!revenue.hotel_monthly.length && (
            <div className="mt-3">
              <PendingCard id="hotel_occupancy_monthly" title="Hotel occupancy rate, ADR and vacancy gap" height={120} />
            </div>
          )}
        </SectionCard>
        <SectionCard title="Business Receipts Index (BRI)" subtitle="Quarterly, tourism-related service industries" badge="official">
          <BriHeatmap filters={filters} />
        </SectionCard>
      </div>
    </div>
  );
}
