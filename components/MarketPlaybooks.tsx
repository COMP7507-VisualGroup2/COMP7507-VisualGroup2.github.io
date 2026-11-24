'use client';

import { useRouter } from 'next/navigation';
import { AnimatedText } from './motion';
import StrategyPillars from './StrategyPillars';
import { demographics } from '@/lib/data';
import { useFilters } from '@/lib/filters-context';
import { formatNumber, formatPct } from '@/lib/format';
import { mainlandOriginShares } from '@/lib/mainland-origin';
import { countrySameDayShare, marketH1, marketInFilter, profile, profileValue } from '@/lib/persona';

export function OutlookStrategy() {
  const router = useRouter();
  const { filters, setFilters, setMarket } = useFilters();
  const open = (market: string) => {
    if (!marketInFilter(market, { origin: filters.origin, region: 'All' })) {
      setFilters({ ...filters, origin: 'All' });
    }
    setMarket(market);
    router.push('/countries-analysis/');
  };
  return <StrategyPillars onSelectMarket={open} />;
}

export default function MarketPlaybooks({ selected, origin, available }: { selected?: string; origin: string; available: boolean }) {
  const market = selected ?? origin;
  const current = available ? marketH1('2026-H1', market) : undefined;
  const previous = available ? marketH1('2025', market) : undefined;
  const firstTime = available ? profileValue('2026-H1', market, 'first_timer_pct') : null;
  const sameDay = available && selected ? countrySameDayShare('2026-H1', selected) : null;
  const title = selected === 'Chinese Mainland' ? 'Mainland China' : selected ?? origin;
  const pairs: { insight: string; action: string }[] = [];
  if (current) {
    if (market === 'Chinese Mainland' || market === 'Mainland') {
      const top = mainlandOriginShares(demographics.mainland_origin_provinces, '2026 H1')[0];
      if (top && Number.isFinite(top.all_visitors_share_pct) && top.all_visitors_share_pct > 0 && top.all_visitors_share_pct <= 100) {
        pairs.push({
          insight: `${formatPct(top.all_visitors_share_pct)} of Mainland visitors came from ${top.province_en} in H1 2026.`,
          action: `Attract visitors from more distant Mainland provinces beyond ${top.province_en}.`,
        });
      }
    } else if (selected) {
      const top = profile('2026-H1', selected, 'origin_region')
        .filter((row) => Number.isFinite(row.value) && row.value >= 0.5 && row.value <= 100)
        .sort((a, b) => b.value - a.value)[0];
      if (top) pairs.push({
        insight: `${top.category} accounted for ${formatPct(top.value)} of ${title} overnight visitors in H1 2026.`,
        action: `Promote in ${top.category} and expand outreach to other origins.`,
      });
    } else if (origin === 'All markets' && current.arrivals > 0) {
      const mainland = marketH1('2026-H1', 'Chinese Mainland');
      if (mainland && mainland.arrivals >= 0 && mainland.arrivals <= current.arrivals) {
        pairs.push({
          insight: `Mainland China accounted for ${formatPct(mainland.arrivals / current.arrivals * 100)} of H1 2026 arrivals.`,
          action: 'Diversify promotion toward other source markets.',
        });
      }
    }
    if (current.arrivals > 0) pairs.push({
      insight: `Overnight visitors accounted for ${(sameDay === null ? current.overnight / current.arrivals * 100 : 100 - sameDay).toFixed(1)}% of arrivals${sameDay === null ? '' : ' in the supplied profile'}.`,
      action: 'Promote hotel and attraction bundles to encourage overnight stays.',
    });
    if (firstTime !== null && firstTime >= 0 && firstTime <= 100) pairs.push({
      insight: `First-time visitors represented ${firstTime.toFixed(1)}% of the H1 2026 ${selected ? 'overnight visitor' : 'visitor'} profile.`,
      action: firstTime < 50 ? 'Create new experiences for repeat visitors.' : 'Offer first-time itineraries and return-visit incentives.',
    });
    pairs.push({
      insight: `H1 2026 recorded ${formatNumber(current.arrivals)} arrivals${previous && previous.arrivals > 0 ? `, ${formatPct((current.arrivals / previous.arrivals - 1) * 100, 1, true)} compared with H1 2025` : ''}.`,
      action: previous && previous.arrivals > 0 && current.arrivals < previous.arrivals
        ? `Target promotions to rebuild ${title} arrivals.`
        : `Maintain targeted promotion for ${title}.`,
    });
  }
  const displayedPairs = pairs.slice(0, 3);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-brand-900">Insights and proposed actions</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
          <h3 className="mb-2 font-bold text-amber-900">Insights · {title}</h3>
          {displayedPairs.length ? (
            <ol className="list-decimal space-y-2 pl-4">
              {displayedPairs.map((pair, index) => <li key={index}><AnimatedText text={pair.insight} /></li>)}
            </ol>
          ) : <p>Insights are unavailable for this selection and period.</p>}
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-slate-700">
          <h3 className="mb-2 font-bold text-green-900">Proposed actions · {title}</h3>
          {displayedPairs.length ? (
            <ol className="list-decimal space-y-2 pl-4">
              {displayedPairs.map((pair, index) => <li key={index}><AnimatedText text={pair.action} /></li>)}
            </ol>
          ) : <p>Proposed actions are unavailable without an insight for this selection and period.</p>}
        </div>
      </div>
    </section>
  );
}
