'use client';

import { useMemo, useRef, useState } from 'react';
import Dropdown from '../Dropdown';
import LazyMount from '../LazyMount';
import { MarketPersonaCard, MarketPersonaTable } from '../MarketPersona';
import SectionCard, { Banner, Insight, SubHeading } from '../SectionCard';
import OriginMap from '../charts/OriginMap';
import OriginStackedBar from '../charts/OriginStackedBar';
import {
  AgeBySegment,
  AspectTable,
  CompanionTable,
  ExperienceScorecard,
  ItineraryChart,
  MarketYieldScatter,
  PurposeBySegment,
  ShoppingTable,
  SpendMixBySegment,
  StayBySegment,
  TopPlaces,
} from '../charts/ProfileCharts';
import { describeSegment } from '@/lib/filters';
import { useFilters } from '@/lib/filters-context';
import { formatHkd, formatPct } from '@/lib/format';
import { H1_LABEL, MARKETS, PERIOD_LABEL, marketH1, marketInFilter, periodForRange, profileValue } from '@/lib/persona';

const FY_ONLY = '2025 full year · detail not published for H1 2026';

export default function VisitorPersonaTab() {
  const { filters } = useFilters();
  const segment = describeSegment(filters);
  const period = periodForRange(filters.end);
  const marketChoices = MARKETS.filter((m) => marketInFilter(m.market, filters));
  const [picked, setPicked] = useState('Chinese Mainland');
  const cardRef = useRef<HTMLDivElement>(null);
  const selected = marketChoices.some((m) => m.market === picked) ? picked : (marketChoices[0]?.market ?? picked);

  const persona = useMemo(() => {
    const v = (m: string, d: string, c?: string) => profileValue(period, m, d, c);
    const spenders = MARKETS.map((m) => ({ market: m.market, spend: v(m.market, 'per_capita_overnight_hkd') }))
      .filter((m): m is { market: string; spend: number } => m.spend !== null)
      .sort((a, b) => b.spend - a.spend);
    const grow = MARKETS.map((m) => {
      const now = marketH1('2026-H1', m.market);
      const before = marketH1('2025', m.market);
      return { market: m.market, growth: now && before ? ((now.arrivals - before.arrivals) / before.arrivals) * 100 : null };
    })
      .filter((g): g is { market: string; growth: number } => g.growth !== null)
      .sort((a, b) => b.growth - a.growth);
    return {
      longSpend: v('Long-haul', 'per_capita_overnight_hkd'),
      longNights: v('Long-haul', 'avg_nights'),
      mainSpend: v('Mainland', 'per_capita_overnight_hkd'),
      mainNights: v('Mainland', 'avg_nights'),
      longHotel: v('Long-haul', 'spend_mix', 'Hotel bills'),
      mainShop: v('Mainland', 'spend_mix', 'Shopping'),
      longMulti: profileValue('2025', 'Long-haul', 'itinerary', 'Multi-destination'),
      shortMacao: profileValue('2025', 'Short-haul', 'other_destination', 'Macao SAR'),
      top: spenders[0],
      bottom: spenders[spenders.length - 1],
      fastest: grow[0],
      slowest: grow[grow.length - 1],
    };
  }, [period]);

  return (
    <div className="space-y-[14px]">
      <SectionCard
        title="Where visitors come from"
        subtitle={`18 HKTB source markets · ${segment.split(' · ')[0]}`}
        badge="official"
        footnote="HKTB visitor arrival statistics by nationality, Jan–Jun 2025 and Jan–Jun 2026. The Middle East is drawn as one group of countries."
      >
        <LazyMount height={640}>
          <OriginMap filters={filters} />
        </LazyMount>
      </SectionCard>

      <SectionCard title="Origin market mix over time" subtitle={`18 HKTB source markets · ${segment}`} badge="official">
        <LazyMount height={340}>
          <OriginStackedBar filters={filters} />
        </LazyMount>
      </SectionCard>

      <Banner
        title="Visitor profile: who they are and what they spend"
        aside={<>Showing {PERIOD_LABEL[period]} · set by the period filter</>}
      >
        From the HKTB Departing Visitor Survey (Visitor Profile Reports 2025 FY and 2026 H1) and HKTB arrival statistics by nationality. The market personas come
        first, followed by segment charts comparing Mainland, short-haul and long-haul visitors.
        {(filters.origin !== 'All' || filters.region !== 'All') && ' Market views follow the sidebar market and country filters; segment charts always show all segments.'}
      </Banner>

      <SubHeading n={1} title="Market personas: 18 source markets">
        <div className="flex items-center gap-2 text-[11px] text-[#74808a]">
          Market
          <Dropdown
            label="Market"
            align="right"
            value={selected}
            onChange={setPicked}
            options={marketChoices.map((m) => ({ value: m.market, label: m.market }))}
          />
        </div>
      </SubHeading>
      <div ref={cardRef} className="scroll-mt-28">
        {marketChoices.length > 0 && <MarketPersonaCard market={selected} period={period} />}
      </div>
      <SectionCard title="Markets at a glance" subtitle={`Click a column to sort, a row to open its persona above · ${PERIOD_LABEL[period]}`} badge="manual">
        <MarketPersonaTable
          period={period}
          filters={filters}
          selected={selected}
          onSelect={(m) => {
            setPicked(m);
            cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      </SectionCard>

      <SubHeading n={2} title="Who they are" />
      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        <SectionCard title="Age profile by segment" subtitle={`All arrivals · ${H1_LABEL[period]}`} badge="manual">
          <LazyMount height={250}>
            <AgeBySegment period={period} />
          </LazyMount>
        </SectionCard>
        <SectionCard title="First-time visitors and travel companions" subtitle={`Overnight visitors · ${FY_ONLY}`} badge="manual">
          <CompanionTable />
        </SectionCard>
      </div>

      <SubHeading n={3} title="Why and how they travel" />
      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        <SectionCard title="Main purpose of visit" subtitle={`Overnight visitors · ${PERIOD_LABEL[period]}`} badge="manual">
          <LazyMount height={240}>
            <PurposeBySegment period={period} />
          </LazyMount>
        </SectionCard>
        <SectionCard title="Overnight vs same-day and nights stayed" subtitle={`All visitors · ${PERIOD_LABEL[period]}`} badge="manual">
          <LazyMount height={230}>
            <StayBySegment period={period} />
          </LazyMount>
        </SectionCard>
      </div>
      <SectionCard
        title="Hong Kong only or part of a multi-destination trip?"
        subtitle={`Overnight visitors · ${FY_ONLY}`}
        badge="manual"
        footnote="Multi-destination trips mostly add the Greater Bay Area and Macao; long-haul visitors also combine Hong Kong with other Asian destinations."
      >
        <LazyMount height={420}>
          <ItineraryChart />
        </LazyMount>
      </SectionCard>

      <SubHeading n={4} title="What they spend on" />
      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        <SectionCard title="Spending mix and spend per visitor" subtitle={`Overnight visitors · ${PERIOD_LABEL[period]}`} badge="manual">
          <LazyMount height={250}>
            <SpendMixBySegment period={period} />
          </LazyMount>
        </SectionCard>
        <SectionCard title="What goes in the shopping bag" subtitle={`Shopping categories, % of overnight spend · ${PERIOD_LABEL[period]}`} badge="manual">
          <ShoppingTable period={period} />
        </SectionCard>
      </div>
      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard title="Market yield map: nights stayed vs spend per visitor" subtitle="18 HKTB source markets · y = spend per overnight visitor (HK$) · bubble = overnight arrivals" badge="manual">
          <LazyMount height={360}>
            <MarketYieldScatter period={period} filters={filters} selected={selected} onSelect={setPicked} />
          </LazyMount>
        </SectionCard>
        <SectionCard title="Persona insights" subtitle="Computed from the HKTB visitor profile" badge="derived">
          <div className="space-y-2">
            {persona.longSpend !== null && persona.mainSpend !== null && (
              <Insight>
                Long-haul overnight visitors stay {persona.longNights?.toFixed(1)} nights and spend {formatHkd(persona.longSpend)}, against{' '}
                {persona.mainNights?.toFixed(1)} nights and {formatHkd(persona.mainSpend)} for Mainland visitors ({PERIOD_LABEL[period]}).
              </Insight>
            )}
            {persona.longHotel !== null && persona.mainShop !== null && (
              <Insight tone="accent">
                Hotel bills take {persona.longHotel}% of long-haul spending, while shopping takes {persona.mainShop}% of Mainland spending: long-haul value comes from
                stays, Mainland value from retail.
              </Insight>
            )}
            {persona.top && persona.bottom && (
              <Insight tone="steel">
                Highest spend per overnight visitor: {persona.top.market} ({formatHkd(persona.top.spend)}); lowest: {persona.bottom.market} (
                {formatHkd(persona.bottom.spend)}).
              </Insight>
            )}
            {persona.fastest && persona.slowest && (
              <Insight>
                Fastest-growing market in Jan–Jun 2026: {persona.fastest.market} ({formatPct(persona.fastest.growth, 1, true)}); weakest: {persona.slowest.market} (
                {formatPct(persona.slowest.growth, 1, true)}).
              </Insight>
            )}
            {persona.longMulti !== null && persona.shortMacao !== null && (
              <Insight tone="accent">
                In 2025, {persona.longMulti}% of long-haul overnight visitors made Hong Kong part of a multi-destination trip, and {persona.shortMacao}% of short-haul
                visitors also went to Macao: a case for joint Greater Bay Area itineraries.
              </Insight>
            )}
          </div>
        </SectionCard>
      </div>

      <SubHeading n={5} title="Experience and places" />
      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        <SectionCard title="Trip satisfaction" subtitle={`Overnight visitors · ${PERIOD_LABEL[period]}`} badge="manual">
          <ExperienceScorecard period={period} />
          <div className="mt-4 border-t border-[#edf0f2] pt-3">
            <p className="mb-1 text-xs font-semibold text-slate-800">Rating by aspect ({FY_ONLY})</p>
            <AspectTable />
          </div>
        </SectionCard>
        <SectionCard title="Top 10 places visited" subtitle={`Overnight visitors · ${PERIOD_LABEL[period]}`} badge="manual">
          <TopPlaces period={period} />
        </SectionCard>
      </div>
    </div>
  );
}
