import type { Metadata } from 'next';
import LazyMount from '@/components/LazyMount';
import SectionCard, { PageHeading } from '@/components/SectionCard';
import StrategyPillars from '@/components/StrategyPillars';
import ForecastChart from '@/components/charts/ForecastChart';
import { kpiSummary } from '@/lib/data';
import { formatCompact, formatPct } from '@/lib/format';

export const metadata: Metadata = { title: '2027 Outlook' };

export default function OutlookPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="2027 Outlook: Forecast & Market Promotion Plan"
        description={`A statistical projection from ${formatCompact(kpiSummary.arrivals.full_year['2025'], 1)} arrivals in 2025 and the ${formatPct(
          kpiSummary.arrivals.yoy_pct,
          1,
          true,
        )} ${kpiSummary.period.ytd_label} run-rate, plus three data-driven strategic pillars.`}
      />
      <SectionCard
        title="Predictive trendlines: visitor volume & tourism yield"
        subtitle="Seasonal decomposition + linear trend with scenario overlays"
        badge="derived"
      >
        <LazyMount height={360}>
          <ForecastChart />
        </LazyMount>
      </SectionCard>
      <StrategyPillars />
    </div>
  );
}
