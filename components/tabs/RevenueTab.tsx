'use client';

import { useMemo } from 'react';
import LazyMount from '../LazyMount';
import PendingCard from '../PendingCard';
import SectionCard, { Insight, PageHeading } from '../SectionCard';
import BriHeatmap from '../charts/BriHeatmap';
import HotelComboChart from '../charts/HotelComboChart';
import { AccommodationChart, PerCapitaByMarket, ValueAddedChart, YieldVolumeScatter } from '../charts/RevenueCharts';
import { kpiSummary, revenue } from '@/lib/data';
import { useFilters } from '@/lib/filters-context';
import { formatHkd, formatHkdMillions, formatNumber, formatPct, pctChange } from '@/lib/format';

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
    return { top, mainland, mainlandShare: mainland ? (mainland.spend / total) * 100 : null, biggest };
  }, [y]);

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
        <SectionCard title="Per capita spending by source market" subtitle="Overnight vs same-day, C&SD 650-80004" badge="official">
          <LazyMount height={330}>
            <PerCapitaByMarket filters={filters} />
          </LazyMount>
        </SectionCard>
        <SectionCard title="High-yield vs volume-driven segments" subtitle={`Visitors vs spend per visitor, bubble size = total spend (${y})`} badge="derived">
          <LazyMount height={380}>
            <YieldVolumeScatter filters={filters} />
          </LazyMount>
        </SectionCard>
      </div>

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
