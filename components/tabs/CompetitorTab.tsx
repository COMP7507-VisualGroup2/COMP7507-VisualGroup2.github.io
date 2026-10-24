'use client';

import LazyMount from '../LazyMount';
import PendingCard from '../PendingCard';
import SectionCard, { Insight, PageHeading } from '../SectionCard';
import { IndustryScatter, IndustryTreemap, PeerArrivalsChart, ReceiptsChart } from '../charts/CompetitorCharts';
import { competitor, kpiSummary } from '@/lib/data';
import { useFilters } from '@/lib/filters-context';
import { formatHkd, formatHkdMillions, formatPct, monthLong } from '@/lib/format';
import { headlineInsights } from '@/lib/insights';

export default function CompetitorTab() {
  const { filters } = useFilters();
  const { sg25, hk25, latestPeer } = headlineInsights();
  const mix = competitor.sg_receipts_mix;
  const mixTotal = mix.components.reduce((a, c) => a + c.receipts_hkd_m, 0) || 1;
  const sightseeing = mix.components.find((c) => c.component.startsWith('Sightseeing'));
  const shopping = mix.components.find((c) => c.component === 'Shopping');
  const thailandPending = !competitor.peers.find((p) => p.code === 'TH')?.available;
  const econ = kpiSummary.tourism_economy;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Competitor Analysis"
        description="Benchmarks Hong Kong's recovery, arrival volumes and tourism receipts against regional peers (Singapore, Japan, Thailand), and shows how visitor traffic ripples through local employment and value added."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard
          title="Recovery pace vs regional peers"
          subtitle="Monthly international visitor arrivals: C&SD (HK), Singapore Tourism Board (SG), JNTO (JP)"
          badge="official"
          footnote="HK arrivals include Mainland same-day visitors, and 2019 H2 HK arrivals were depressed by social unrest. JNTO's latest months are preliminary."
        >
          <LazyMount height={340}>
            <PeerArrivalsChart filters={filters} />
          </LazyMount>
        </SectionCard>
        <SectionCard title="Positioning insights" subtitle="Market share gaps and differentiation" badge="derived">
          <div className="space-y-2">
            {latestPeer && (
              <Insight>
                In {monthLong(String(latestPeer.month))}, Hong Kong arrivals were {formatPct(Number(latestPeer.HK_recovery))} of 2019, vs Singapore{' '}
                {formatPct(Number(latestPeer.SG_recovery))} and Japan {formatPct(Number(latestPeer.JP_recovery))}.
              </Insight>
            )}
            {sg25 && hk25 && (
              <Insight tone="accent">
                Yield gap: Singapore earns {formatHkd(sg25.per_visitor_hkd ?? 0)} per visitor vs {formatHkd(hk25.per_visitor_hkd ?? 0)} in Hong Kong (2025), from{' '}
                {((hk25.arrivals ?? 0) / (sg25.arrivals || 1)).toFixed(1)}× fewer visitors.
              </Insight>
            )}
            {sightseeing && shopping && (
              <Insight tone="steel">
                Sightseeing, entertainment & gaming makes up {formatPct((sightseeing.receipts_hkd_m / mixTotal) * 100)} of Singapore&apos;s receipts vs{' '}
                {formatPct((shopping.receipts_hkd_m / mixTotal) * 100)} for shopping ({mix.year}). Hong Kong can differentiate through mega-events and cultural heritage
                rather than retail alone.
              </Insight>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Tourism receipts benchmark"
          subtitle="HKD; 2019 from World Bank (UN Tourism data), 2024–25 from national sources"
          badge="official"
          footnote="Definitions differ: HK 2024–25 = C&SD destination consumption; SG = STB tourism receipts converted at HKMA annual-average rates; 2019 = balance-of-payments travel receipts. Read the gaps as directional."
        >
          <LazyMount height={340}>
            <ReceiptsChart />
          </LazyMount>
        </SectionCard>
        <div className="space-y-4">
          <SectionCard title="Thailand monthly arrivals" subtitle="Ministry of Tourism and Sports" badge={thailandPending ? 'pending' : 'manual'}>
            {thailandPending ? (
              <PendingCard id="thailand_arrivals_monthly" title="Thailand monthly international arrivals" height={140} />
            ) : (
              <p className="text-sm text-slate-700">Thailand is included in the recovery chart from data/manual/thailand_arrivals_monthly.csv.</p>
            )}
          </SectionCard>
          <SectionCard title="UN Tourism Asia-Pacific benchmark" subtitle="Regional inbound recovery vs 2019" badge={competitor.un_tourism_apac.length ? 'manual' : 'pending'}>
            {competitor.un_tourism_apac.length ? (
              <p className="text-sm text-slate-700">Shown as the dashed line in the recovery chart.</p>
            ) : (
              <PendingCard id="un_tourism_apac_monthly" title="UN Tourism Asia & the Pacific recovery trend" height={140} />
            )}
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Ripple effect: value added by tourism sub-industry"
          subtitle={`Treemap, ${econ.year}: retail, hotels, F&B, transport and travel agencies`}
          badge="official"
          footnote={`C&SD 655-82101. Tourism total: ${econ.value_added_hkd_m ? formatHkdMillions(econ.value_added_hkd_m) : '–'} value added, ${formatPct(
            econ.employment_share_pct,
          )} of total employment.`}
        >
          <LazyMount height={300}>
            <IndustryTreemap />
          </LazyMount>
        </SectionCard>
        <SectionCard title="Employment vs value added" subtitle="Scatter by sub-industry, bubble = GDP share" badge="official">
          <LazyMount height={320}>
            <IndustryScatter />
          </LazyMount>
        </SectionCard>
      </div>
    </div>
  );
}
