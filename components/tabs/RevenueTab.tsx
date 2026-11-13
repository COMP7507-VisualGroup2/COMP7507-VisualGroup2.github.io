'use client';

import { useMemo } from 'react';
import LazyMount from '../LazyMount';
import SectionCard, { Banner, Insight } from '../SectionCard';
import { MarketDriversChart, MarketShareChart, SegmentCategoryChart } from '../charts/MarketRevenueCharts';
import { PerCapitaByMarket, YieldVolumeScatter } from '../charts/RevenueCharts';
import { summary } from '@/lib/data';
import { useFilters } from '@/lib/filters-context';
import { formatHkd, formatHkdMillions, formatPct, pctChange } from '@/lib/format';
import { marketEconomics } from '@/lib/markets';
import { PERIOD_LABEL, periodForRange } from '@/lib/persona';

function Stat({ label, value, hint, change }: { label: string; value: string; hint: string; change?: number | null }) {
  const cls = change == null ? 'neutral' : change > 0 ? 'growth-positive' : change < 0 ? 'growth-negative' : 'neutral';
  return (
    <div className="snapshot-card">
      <div className="snapshot-label">{label}</div>
      <div className="snapshot-value">{value}</div>
      <div className="snapshot-compare">
        <span>{hint}</span>
        {change !== undefined && <strong className={cls}>{change == null ? 'n/a' : formatPct(change, 1, true)}</strong>}
      </div>
    </div>
  );
}

export default function RevenueTab() {
  const { filters } = useFilters();
  const period = periodForRange(filters.end);
  const year = period === '2026-H1' ? '2026' : '2025';
  const now = summary.h1[year];
  const before = summary.h1['2025'];
  const compare = year === '2026';

  const facts = useMemo(() => {
    const areas = summary.area_h1.filter((r) => r.year === year);
    const totalSpend = areas.reduce((a, r) => a + r.spend_hkd_m, 0) || 1;
    const topArea = [...areas].sort((a, b) => b.overnight_per_capita_hkd - a.overnight_per_capita_hkd)[0];
    const mainlandArea = areas.find((r) => r.area === 'Mainland China');
    const econ = marketEconomics(period);
    const econSpend = econ.reduce((a, r) => a + (r.spend ?? 0), 0);
    const econOvernight = econ.reduce((a, r) => a + (r.spend !== null ? r.overnight : 0), 0);
    return {
      topArea,
      mainlandAreaShare: mainlandArea ? (mainlandArea.spend_hkd_m / totalSpend) * 100 : null,
      mainlandArea,
      avgPerCapita: econOvernight ? (econSpend * 1e6) / econOvernight : null,
      topPerHead: [...econ].filter((r) => r.perCapita !== null).sort((a, b) => (b.perCapita ?? 0) - (a.perCapita ?? 0))[0],
      mainlandEcon: econ.find((r) => r.origin === 'Mainland'),
      yieldDrop: [...econ].filter((r) => r.yieldEffect !== null).sort((a, b) => (a.yieldEffect ?? 0) - (b.yieldEffect ?? 0))[0],
    };
  }, [year, period]);

  return (
    <div className="space-y-[14px]">
      <div className="snapshot-grid !grid-cols-2 lg:!grid-cols-4">
        <Stat label={`Total tourism expenditure · H1 ${year}`} value={formatHkdMillions(now.receipts_hkd_m)} hint={compare ? `H1 2025 ${formatHkdMillions(before.receipts_hkd_m)}` : 'Jan–Jun 2025'} change={compare ? pctChange(now.receipts_hkd_m, before.receipts_hkd_m) : undefined} />
        <Stat label={`Visitor spending in Hong Kong · H1 ${year}`} value={formatHkdMillions(now.destination_hkd_m)} hint={compare ? `H1 2025 ${formatHkdMillions(before.destination_hkd_m)}` : 'Destination consumption'} change={compare ? pctChange(now.destination_hkd_m, before.destination_hkd_m) : undefined} />
        <Stat label="Spend per overnight visitor" value={formatHkd(now.overnight_per_capita_hkd)} hint={compare ? `H1 2025 ${formatHkd(before.overnight_per_capita_hkd)}` : `Jan–Jun ${year}`} change={compare ? pctChange(now.overnight_per_capita_hkd, before.overnight_per_capita_hkd) : undefined} />
        <Stat label="Spend per same-day visitor" value={formatHkd(now.same_day_per_capita_hkd)} hint={compare ? `H1 2025 ${formatHkd(before.same_day_per_capita_hkd)}` : `Jan–Jun ${year}`} change={compare ? pctChange(now.same_day_per_capita_hkd, before.same_day_per_capita_hkd) : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        <SectionCard title="Per-capita spending by source market" subtitle="Overnight vs same-day · HKTB TEAIT market areas, Jan–Jun" badge="official" footnote="Europe, Africa and the Middle East are combined in the expenditure source.">
          <LazyMount height={340}>
            <PerCapitaByMarket filters={filters} />
          </LazyMount>
        </SectionCard>
        <SectionCard title="High-yield vs volume-driven markets" subtitle="Overnight visitors vs spend per visitor, bubble size = total spend" badge="derived">
          <LazyMount height={420}>
            <YieldVolumeScatter filters={filters} period={period} />
          </LazyMount>
        </SectionCard>
      </div>

      <Banner title="Source markets: who brings the revenue" aside={<>Showing {PERIOD_LABEL[period]} · set by the period filter</>}>
        Estimated overnight spend = HKTB overnight arrivals × HKTB spend per overnight visitor, for the 18 source markets. Same-day spend is not published by market,
        so it is left out and Mainland&apos;s true weight is understated.
        {(filters.origin !== 'All' || filters.region !== 'All') && ' Market views follow the sidebar market and country filters.'}
      </Banner>

      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        <SectionCard
          title="Share of visitors vs share of estimated spend"
          subtitle={`Overnight visitors, 18 markets · ${PERIOD_LABEL[period]}`}
          badge="derived"
          footnote="Where the spend bar is longer than the visitor bar, a market earns more than its headcount."
        >
          <LazyMount height={560}>
            <MarketShareChart period={period} filters={filters} />
          </LazyMount>
        </SectionCard>
        <SectionCard
          title="What moved estimated spend: visitors or spend per head"
          subtitle="Change vs Jan–Jun 2025, HK$ (volume at 2025 spend per head; yield on 2026 visitors)"
          badge="derived"
          footnote="2025 spend per head is the full-year HKTB figure (Jan–Jun is not published), so the yield effect is indicative."
        >
          <LazyMount height={560}>
            <MarketDriversChart period={period} filters={filters} />
          </LazyMount>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard
          title="Where the money goes: overnight spending by category"
          subtitle={`Mainland, short-haul and long-haul · Jan–Jun ${year}`}
          badge="official"
          footnote="HKTB Tourism Expenditure Associated to Inbound Tourism. Hotel bills include meals and other spending inside the hotel."
        >
          <LazyMount height={220}>
            <SegmentCategoryChart year={year} />
          </LazyMount>
        </SectionCard>
        <SectionCard title="Revenue insights" subtitle="Calculated from reported totals" badge="derived">
          <div className="space-y-2">
            {facts.topArea && (
              <Insight>
                {facts.topArea.area} visitors spend the most per overnight trip ({formatHkd(facts.topArea.overnight_per_capita_hkd)}, Jan–Jun {year}), making them a high-yield target.
              </Insight>
            )}
            {facts.mainlandArea && facts.mainlandAreaShare !== null && (
              <Insight tone="steel">
                Mainland China provides {formatPct(facts.mainlandAreaShare)} of overnight and same-day visitor spending, at {formatHkd(facts.mainlandArea.overnight_per_capita_hkd)} per overnight visitor: a volume-driven market.
              </Insight>
            )}
            {facts.topPerHead && facts.avgPerCapita && (
              <Insight tone="accent">
                Among the 18 source markets, {facts.topPerHead.market} visitors spend {formatHkd(facts.topPerHead.perCapita ?? 0)} per overnight trip,{' '}
                {((facts.topPerHead.perCapita ?? 0) / facts.avgPerCapita).toFixed(1)}× the 18-market average of {formatHkd(facts.avgPerCapita)}.
              </Insight>
            )}
            {period === '2026-H1' && facts.yieldDrop && (facts.yieldDrop.yieldEffect ?? 0) < 0 && (
              <Insight tone="steel">
                Spend per head fell most in {facts.yieldDrop.market} ({formatHkd(facts.yieldDrop.perCapitaPrev ?? 0)} in 2025 to {formatHkd(facts.yieldDrop.perCapita ?? 0)} in Jan–Jun 2026), worth about{' '}
                {formatHkdMillions(Math.abs(facts.yieldDrop.yieldEffect ?? 0))} of estimated spend.
              </Insight>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
