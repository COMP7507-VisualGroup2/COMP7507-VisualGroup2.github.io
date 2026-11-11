'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import DataSourceBadge from '../DataSourceBadge';
import Dropdown from '../Dropdown';
import LazyMount from '../LazyMount';
import { MarketPersonaCard, MarketPersonaTable } from '../MarketPersona';
import SectionCard, { Insight, PageHeading } from '../SectionCard';
import OriginMap from '../charts/OriginMap';
import OriginStackedBar from '../charts/OriginStackedBar';
import PortStackedBar from '../charts/PortStackedBar';
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
import VisitorTypeChart from '../charts/VisitorTypeChart';
import { demographics } from '@/lib/data';
import { describeSegment, inRange } from '@/lib/filters';
import { useFilters } from '@/lib/filters-context';
import { formatHkd, formatPct } from '@/lib/format';
import { H1_LABEL, MARKETS, PERIOD_LABEL, hasProfile, marketH1, periodForRange, profileValue } from '@/lib/persona';
import { ORIGIN_COLORS } from '@/lib/theme';

function SubHeading({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-1.5 pt-2">
      <h3 className="flex items-center gap-2 text-base font-bold text-brand-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-canvas">{n}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

const FY_ONLY = '2025 full year · detail not published for H1 2026';

export default function VisitorPersonaTab() {
  const { filters } = useFilters();
  const segment = describeSegment(filters);
  const period = periodForRange(filters.end);
  const marketChoices = MARKETS.filter((m) => filters.origin === 'All' || m.origin === filters.origin);
  const [picked, setPicked] = useState('Chinese Mainland');
  const cardRef = useRef<HTMLDivElement>(null);
  const selected = marketChoices.some((m) => m.market === picked) ? picked : (marketChoices[0]?.market ?? picked);
  const hasHktb = hasProfile('trip_purpose');

  const facts = useMemo(() => {
    const ports = demographics.port_arrivals.filter((r) => inRange(r.month, filters));
    const sum = (port: string, key: 'mainland' | 'non_mainland') =>
      ports.filter((r) => r.port === port).reduce((a, r) => a + r[key], 0);
    const hsrMainland = sum('West Kowloon HSR', 'mainland');
    const airMainland = sum('HKIA Airport', 'mainland');
    const airNonMainland = sum('HKIA Airport', 'non_mainland');
    const totalNonMainland = ports.reduce((a, r) => a + r.non_mainland, 0) || 1;
    const vt = demographics.visitor_type_annual;
    const share = (y: string) => {
      const rows = vt.filter((r) => r.year === y);
      const t = rows.reduce((a, r) => a + r.arrivals, 0);
      return t ? ((rows.find((r) => r.visitor_type === 'Same-day')?.arrivals ?? 0) / t) * 100 : null;
    };
    return {
      hsrVsAir: airMainland ? hsrMainland / airMainland : null,
      airNonMainlandShare: (airNonMainland / totalNonMainland) * 100,
      sd2019: share('2019'),
      sd2025: share('2025'),
    };
  }, [filters]);

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
    <div className="space-y-6">
      <PageHeading
        title="Visitor Persona"
        description="Who visits Hong Kong, why they come, how they travel, what they spend on and how they rate the trip, from Mainland, short-haul and long-haul segments down to 18 individual source markets."
      />

      <SectionCard
        title="Where visitors come from"
        subtitle={`Choropleth of arrivals by C&SD source region · ${segment.split(' · ')[0]}`}
        badge="official"
        footnote="C&SD reports arrivals by region, not by country, so every country in a region shares that region's colour."
      >
        <LazyMount height={640}>
          <OriginMap filters={filters} />
        </LazyMount>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Origin market mix over time"
          subtitle={`Segments (C&SD) or the 18 HKTB source markets · ${segment}`}
          badge="derived"
        >
          <LazyMount height={300}>
            <OriginStackedBar filters={filters} />
          </LazyMount>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {demographics.segments.map((s) => (
              <div key={s.origin} className="rounded-lg bg-slate-50 p-2" title={s.regions.join(', ')}>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: ORIGIN_COLORS[s.origin] }} />
                  <span className="text-[11px] font-semibold text-slate-800">{s.origin}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-slate-600">{s.regions.join(', ')}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Port of entry: high-speed rail vs air vs land vs sea" subtitle="ImmD visitor entries by control point" badge="official">
          <LazyMount height={340}>
            <PortStackedBar filters={filters} />
          </LazyMount>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard
          title="Overnight vs same-day visitors and length of stay"
          subtitle="Annual, C&SD 650-80005"
          badge="official"
          footnote={`Average length of stay (overnight visitors): ${demographics.length_of_stay.map((l) => `${l.year} ${l.nights.toFixed(1)}`).join(' · ')} nights.`}
        >
          <LazyMount height={280}>
            <VisitorTypeChart />
          </LazyMount>
        </SectionCard>
        <SectionCard title="Behaviour shifts" subtitle="Computed from the official series above" badge="derived">
          <div className="space-y-2">
            {facts.sd2019 !== null && facts.sd2025 !== null && (
              <Insight tone="accent">
                Same-day visitors rose from {formatPct(facts.sd2019)} of arrivals in 2019 to {formatPct(facts.sd2025)} in 2025.
              </Insight>
            )}
            {facts.hsrVsAir !== null && (
              <Insight>
                In the selected period, {facts.hsrVsAir.toFixed(1)}× as many Mainland visitors entered by high-speed rail (West Kowloon) as by air.
              </Insight>
            )}
            <Insight tone="steel">
              HKIA handles {formatPct(facts.airNonMainlandShare)} of non-Mainland entries, so air capacity drives long-haul growth.
            </Insight>
          </div>
        </SectionCard>
      </div>

      {/* ---- HKTB Visitor Profile ------------------------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4 sm:p-5">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-brand-900">Visitor profile: who they are and what they spend</h3>
            <DataSourceBadge kind={hasHktb ? 'manual' : 'pending'} />
          </div>
          <p className="mt-1 text-sm text-slate-700">
            From the HKTB Departing Visitor Survey (Visitor Profile Reports 2025 FY and 2026 H1) and HKTB arrival statistics by nationality. The market
            personas come first, followed by segment charts comparing Mainland, short-haul and long-haul visitors.
            {filters.origin !== 'All' && ` Market views are filtered to ${filters.origin}; segment charts always show all segments.`}
          </p>
        </div>
        <p className="text-xs font-semibold text-slate-700">
          Showing {PERIOD_LABEL[period]} <span className="font-normal text-slate-600">· set by the date range filter above</span>
        </p>
      </div>

      <SubHeading n={1} title="Market personas: 18 source markets">
        <div className="flex items-center gap-2 text-xs text-slate-700">
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
          origin={filters.origin}
          selected={selected}
          onSelect={(m) => {
            setPicked(m);
            cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      </SectionCard>

      <SubHeading n={2} title="Who they are" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Spending mix and spend per visitor" subtitle={`Overnight visitors · ${PERIOD_LABEL[period]}`} badge="manual">
          <LazyMount height={250}>
            <SpendMixBySegment period={period} />
          </LazyMount>
        </SectionCard>
        <SectionCard title="What goes in the shopping bag" subtitle={`Shopping categories, % of overnight spend · ${PERIOD_LABEL[period]}`} badge="manual">
          <ShoppingTable period={period} />
        </SectionCard>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard title="Market yield map: nights stayed vs spend per visitor" subtitle="18 HKTB source markets · y = spend per overnight visitor (HK$) · bubble = overnight arrivals" badge="manual">
          <LazyMount height={360}>
            <MarketYieldScatter period={period} origin={filters.origin} selected={selected} onSelect={setPicked} />
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Trip satisfaction" subtitle={`Overnight visitors · ${PERIOD_LABEL[period]}`} badge="manual">
          <ExperienceScorecard period={period} />
          <div className="mt-4 border-t border-slate-100 pt-3">
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
