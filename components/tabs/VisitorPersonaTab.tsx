'use client';

import { useMemo } from 'react';
import LazyMount from '../LazyMount';
import SectionCard, { Insight, PageHeading } from '../SectionCard';
import OriginMap from '../charts/OriginMap';
import OriginStackedBar from '../charts/OriginStackedBar';
import PortStackedBar from '../charts/PortStackedBar';
import { SentimentBubble, VisitorProfileBars } from '../charts/ProfileCharts';
import VisitorTypeChart from '../charts/VisitorTypeChart';
import { demographics } from '@/lib/data';
import { describeSegment, inRange } from '@/lib/filters';
import { useFilters } from '@/lib/filters-context';
import { formatPct } from '@/lib/format';
import { ORIGIN_COLORS } from '@/lib/theme';

export default function VisitorPersonaTab() {
  const { filters } = useFilters();
  const segment = describeSegment(filters);

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

  return (
    <div className="space-y-6">
      <PageHeading
        title="Visitor Persona"
        description="How visitor behaviour is changing: where visitors come from, how they enter Hong Kong, and the shift between overnight stays and same-day trips."
      />

      <SectionCard
        title="Where visitors come from"
        subtitle={`Choropleth of arrivals by C&SD source region · ${segment.split(' · ')[0]}`}
        badge="official"
        footnote="C&SD reports arrivals by region, not by country, so every country in a region shares that region's colour."
      >
        <LazyMount height={420}>
          <OriginMap filters={filters} />
        </LazyMount>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Origin market mix over time" subtitle={`Mainland vs short-haul, long-haul & emerging · ${segment}`} badge="derived">
          <LazyMount height={280}>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Trip purpose" subtitle="Leisure · MICE · business" badge={demographics.visitor_profile.some((r) => r.dimension === 'trip_purpose') ? 'manual' : 'pending'}>
          <VisitorProfileBars dimension="trip_purpose" title="Trip purpose (leisure / MICE / business)" />
        </SectionCard>
        <SectionCard title="Age brackets" subtitle="Visitor age profile" badge={demographics.visitor_profile.some((r) => r.dimension === 'age_group') ? 'manual' : 'pending'}>
          <VisitorProfileBars dimension="age_group" title="Visitor age brackets" />
        </SectionCard>
        <SectionCard title="Attraction sentiment" subtitle="Feedback & recommendation by attraction" badge={demographics.attraction_sentiment.length ? 'manual' : 'pending'}>
          <SentimentBubble />
        </SectionCard>
      </div>
    </div>
  );
}
