'use client';

import { useMemo } from 'react';
import CountryMetrics from '../CountryMetrics';
import LazyMount from '../LazyMount';
import MarketPlaybooks from '../MarketPlaybooks';
import SectionCard from '../SectionCard';
import CountryOriginMap from '../charts/CountryOriginMap';
import CountryMarketComparison from '../charts/CountryMarketComparison';
import { CountryAgeChart, CountryFirstTimeChart, CountryPurposeChart, CountryVisitorTypeChart } from '../charts/CountryProfileCharts';
import MainlandOriginMap from '../charts/MainlandOriginMap';
import OriginMap from '../charts/OriginMap';
import RegionReviewChart, { RegionInsights } from '../charts/RegionReviewChart';
import { AgeProfilePie, AverageStayChart, ExpenditureChart, FirstTimePie, PurposeChart, ShoppingTreemap, TravelCompanionChart, VisitorTypePie } from '../charts/RegionProfileCharts';
import { PlacesBumpChart } from '../VisitorProfileCharts';
import { filterMonths } from '@/lib/data';
import { analysis2026Filters, countryAnalysisFilters, describeSegment } from '@/lib/filters';
import { useCountryMarket, useFilters } from '@/lib/filters-context';
import { periodForRange } from '@/lib/persona';

export default function VisitorPersonaTab({ view = 'region' }: { view?: 'region' | 'country' }) {
  const { filters: sharedFilters } = useFilters();
  const filters = useMemo(() => (view === 'country' ? countryAnalysisFilters : analysis2026Filters)(sharedFilters, filterMonths), [sharedFilters, view]);
  const { choices, selected } = useCountryMarket();
  const analysisFilters = useMemo(() => ({ ...filters, visitorType: 'All' as const, region: 'All' }), [filters]);
  const profileSegment = analysisFilters.origin !== 'All' ? analysisFilters.origin : 'All markets';
  const period = periodForRange(filters.end);
  const selectedMarket = selected && selected !== 'All' ? selected : undefined;
  const market = selectedMarket ?? profileSegment;
  const h1 = (filters.start === '2026-01' && filters.end === '2026-06') || (filters.start === '2025-01' && filters.end === '2025-06');
  const profilePeriodAvailable = h1 || (filters.start === '2025-01' && filters.end === '2025-12');
  const comparison = filters.start === '2026-01' && filters.end === '2026-06';

  if (view === 'region') {
    return (
      <div className="space-y-[14px]">
        <RegionInsights filters={analysisFilters} />
        <RegionReviewChart filters={analysisFilters} />
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
          <AgeProfilePie period={period} segment={profileSegment} />
          <FirstTimePie period={period} segment={profileSegment} />
        </div>
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
          <VisitorTypePie period={period} segment={profileSegment} />
          <PurposeChart period={period} segment={profileSegment} available={h1} />
        </div>
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
          <ExpenditureChart segment={profileSegment} available={comparison} />
          <ShoppingTreemap period={period} segment={profileSegment} available={h1} />
        </div>
        <SectionCard title="Top 10 places visited" subtitle="2025 full year vs H1 2026 · overnight visitors">
          <PlacesBumpChart segment={profileSegment} showNote={false} />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-[14px]">
      <CountryMetrics filters={analysisFilters} selected={selectedMarket} />
      <MarketPlaybooks selected={selectedMarket} origin={profileSegment} available={comparison} />
      <h2 className="text-lg font-bold text-brand-900">Visitor profile</h2>
      <SectionCard
        title="Where visitors come from"
        subtitle={selectedMarket === 'Chinese Mainland' ? 'Mainland visitor origins' : selectedMarket === 'Singapore' ? 'Singapore visitor arrivals' : selectedMarket ? `${selectedMarket} overnight visitor origins` : `${choices.length} HKTB source markets · ${describeSegment(analysisFilters).split(' · ')[0]}`}
        footnote={selectedMarket === 'Chinese Mainland' ? 'Mainland origin shares were supplied by the user without a stated source.' : undefined}
      >
        {selectedMarket === 'Chinese Mainland' ? <MainlandOriginMap filters={analysisFilters} />
          : selectedMarket ? <CountryOriginMap market={selectedMarket} filters={analysisFilters} />
            : <LazyMount height={640}><OriginMap filters={analysisFilters} /></LazyMount>}
      </SectionCard>
      {selectedMarket ? (
        <>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            <CountryAgeChart market={market} available={h1} />
            <CountryFirstTimeChart market={market} available={profilePeriodAvailable} />
          </div>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            <CountryVisitorTypeChart market={market} available={h1} />
            <CountryPurposeChart market={market} available={profilePeriodAvailable} />
          </div>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            <AverageStayChart segment={market} available={h1} />
            <TravelCompanionChart segment={selectedMarket} available={h1} />
          </div>
          <SectionCard title="Top 10 places visited" subtitle="2025 full year vs H1 2026 · overnight visitors">
            {comparison ? <PlacesBumpChart segment={selectedMarket} showNote={false} /> : <div className="chart-empty">Place comparisons are unavailable for this period.</div>}
          </SectionCard>
        </>
      ) : <CountryMarketComparison filters={analysisFilters} />}
    </div>
  );
}
