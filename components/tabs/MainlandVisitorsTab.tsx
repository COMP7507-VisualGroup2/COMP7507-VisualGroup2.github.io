'use client';

import { demographics, summary } from '@/lib/data';
import { mainlandOriginShares } from '@/lib/mainland-origin';
import { profile, profileValue } from '@/lib/persona';
import { TABLEAU_CASUAL } from '@/lib/theme';
import ContextMetric from '../ContextMetric';
import SectionCard from '../SectionCard';
import { PlacesBumpChart, ProfilePie, SpendingTable, spendingByCategory } from '../VisitorProfileCharts';

const h1 = (year: string) => summary.segments_h1[year].Mainland;
const areaH1 = (year: string) => summary.area_h1.find((row) => row.area === 'Mainland China' && row.year === year);
const pctChange = (current: number, previous: number) => ((current / previous) - 1) * 100;
const share = (part: number, total: number) => (part / total) * 100;
const fmtCountM = (value: number) => `${(value / 1e6).toFixed(2)}m`;
const fmtHkd = (value: number) => `HK$${Math.round(value).toLocaleString('en-HK')}`;
const fmtSpend = new Intl.NumberFormat('en-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyChange = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

const spendByCategory = spendingByCategory('Mainland');
const currentTopOrigins = mainlandOriginShares(demographics.mainland_origin_provinces, '2026 H1').slice(0, 5);

const firstTime2026 = profileValue('2026-H1', 'Chinese Mainland', 'first_timer_pct');
const topPlaces = profile('2026-H1', 'Mainland', 'place_rank').sort((a, b) => a.value - b.value);
const formatShare = (value: number, total: number) => {
  const percent = share(value, total);
  return percent > 0 && percent < 0.5 ? '<0.5%' : `${percent.toFixed(1)}%`;
};

function VisitorTypeChart() {
  const data = h1('2026');
  return (
    <>
      <ProfilePie rows={[
        { name: 'Same-day', value: share(data.same_day, data.visitors), color: '#F28E2B' },
        { name: 'Overnight', value: share(data.overnight, data.visitors), color: '#4E79A7' },
      ]} />
      <p className="mt-2 text-[14px] text-slate-500">H1 2026 · share of Mainland arrivals · HKTB visitor-type workbooks.</p>
    </>
  );
}

function OriginChart() {
  const other = 100 - currentTopOrigins.reduce((total, row) => total + row.all_visitors_share_pct, 0);
  if (currentTopOrigins.length !== 5 || other < 0 || other > 100) {
    return <p className="text-xs text-slate-500">Top-five origin data is unavailable.</p>;
  }
  return (
    <>
      <ProfilePie rows={[
        ...currentTopOrigins.map((row, index) => ({ name: row.province_en, value: row.all_visitors_share_pct, color: TABLEAU_CASUAL[index] })),
        { name: 'Other origins', value: other, color: '#BAB0AC' },
      ]} />
      <p className="mt-2 text-[14px] text-slate-500">H1 2026 · share of all Mainland visitors. Other is the remainder after the top five. User-provided table; source not stated.</p>
    </>
  );
}

function RepeatVisitChart() {
  if (firstTime2026 === null) return <p className="text-xs text-slate-500">First-time visitor data is unavailable.</p>;
  return (
    <>
      <ProfilePie rows={[
        { name: 'Repeat', value: 100 - firstTime2026, color: '#F28E2B' },
        { name: 'First-time', value: firstTime2026, color: '#4E79A7' },
      ]} />
      <p className="mt-2 text-[14px] text-slate-500">H1 2026 · Mainland overnight visitors. Repeat share is 100% minus HKTB&apos;s first-time share.</p>
    </>
  );
}

export default function MainlandVisitorsTab() {
  const currentArrivals = h1('2026').visitors;
  const previousArrivals = h1('2025').visitors;
  const currentArea = areaH1('2026');
  const previousArea = areaH1('2025');
  const currentOvernightPct = share(h1('2026').overnight, currentArrivals);
  const previousOvernightPct = share(h1('2025').overnight, previousArrivals);
  const currentSpendPerArrival = currentArea ? (currentArea.spend_hkd_m * 1e6) / currentArea.arrivals : 0;
  const previousSpendPerArrival = previousArea ? (previousArea.spend_hkd_m * 1e6) / previousArea.arrivals : 0;
  const currentOvernightSpend = currentArea?.overnight_per_capita_hkd ?? 0;
  const previousOvernightSpend = previousArea?.overnight_per_capita_hkd ?? 0;
  const currentSameDaySpend = currentArea?.same_day_per_capita_hkd ?? null;
  const previousSameDaySpend = previousArea?.same_day_per_capita_hkd ?? null;
  const sameDaySpendChange = currentSameDaySpend !== null && previousSameDaySpend !== null
    && Number.isFinite(currentSameDaySpend) && Number.isFinite(previousSameDaySpend) && previousSameDaySpend > 0
    ? pctChange(currentSameDaySpend, previousSameDaySpend) : null;
  const guangdong = currentTopOrigins.find((row) => row.province_en === 'Guangdong');
  const sightseeing = spendByCategory?.entries.find((row) => row.category === 'Sightseeing');
  const kaiTak = topPlaces.find((row) => row.category === 'Kai Tak Sports Park');
  const pairs = [
    ...(guangdong ? [{
      insight: `Guangdong accounted for ${guangdong.all_visitors_share_pct}% in the user-provided origin table (original source not stated).`,
      action: 'Consider targeted promotion in more distant provinces, including Zhejiang and Jiangsu, to diversify origins.',
    }] : []),
    {
      insight: `${share(h1('2026').same_day, currentArrivals).toFixed(1)}% of Mainland arrivals were same-day.${sightseeing && spendByCategory ? ` Sightseeing spending rose ${moneyChange(sightseeing.growth)} to HK$${fmtSpend.format(sightseeing.now)} million, or ${formatShare(sightseeing.now, spendByCategory.totals['2026'])} of displayed expenditure.` : ''}${kaiTak ? ` Kai Tak Sports Park ranked #${kaiTak.value} among places visited.` : ''}`,
      action: 'Pair events with dining and overnight hotel offers to encourage longer stays.',
    },
    ...(firstTime2026 !== null ? [{
      insight: `Among Mainland overnight visitors, ${firstTime2026}% were first-time visitors and ${100 - firstTime2026}% were repeat visitors.`,
      action: 'Offer repeat visitors new experiences and return-visit rewards.',
    }] : []),
  ];

  return (
    <div className="space-y-[14px]">
      <section aria-label="Mainland visitor context" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        <ContextMetric
          label="Mainland arrivals"
          value={fmtCountM(currentArrivals)}
          previous={fmtCountM(previousArrivals)}
          change={pctChange(currentArrivals, previousArrivals)}
        />
        <ContextMetric
          label="Spend per visitor"
          value={fmtHkd(currentSpendPerArrival)}
          previous={fmtHkd(previousSpendPerArrival)}
          change={pctChange(currentSpendPerArrival, previousSpendPerArrival)}
        />
        <ContextMetric
          label="Overnight visitors share"
          value={`${currentOvernightPct.toFixed(1)}%`}
          previous={`${previousOvernightPct.toFixed(1)}%`}
          change={pctChange(currentOvernightPct, previousOvernightPct)}
        />
        <ContextMetric
          label="Overnight spend / visitor"
          value={fmtHkd(currentOvernightSpend)}
          previous={fmtHkd(previousOvernightSpend)}
          change={pctChange(currentOvernightSpend, previousOvernightSpend)}
        />
        <ContextMetric
          label="Same-day spend / visitor"
          value={currentSameDaySpend !== null && Number.isFinite(currentSameDaySpend) ? fmtHkd(currentSameDaySpend) : 'Unavailable'}
          previous={previousSameDaySpend !== null && Number.isFinite(previousSameDaySpend) ? fmtHkd(previousSameDaySpend) : 'unavailable'}
          change={sameDaySpendChange}
        />
      </section>
      <p className="text-[14px] leading-relaxed text-slate-500">
        Same-day spend per visitor: HKTB TEAIT, excluding international passenger transport.
      </p>

      <SectionCard title="1 · Mainland visitor profile" subtitle="Jan–Jun 2026">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section aria-labelledby="mainland-type-title" className="min-w-0">
            <h3 id="mainland-type-title" className="mb-3 text-xs font-bold text-slate-800">1A · Mainland arrivals by visitor type</h3>
            <VisitorTypeChart />
          </section>
          <section aria-labelledby="mainland-origin-title" className="min-w-0">
            <h3 id="mainland-origin-title" className="mb-3 text-xs font-bold text-slate-800">1B · Top Mainland origins</h3>
            <OriginChart />
          </section>
          <section aria-labelledby="mainland-repeat-title" className="min-w-0">
            <h3 id="mainland-repeat-title" className="mb-3 text-xs font-bold text-slate-800">1C · First-time vs repeat</h3>
            <RepeatVisitChart />
          </section>
        </div>
      </SectionCard>

      <SectionCard title="2 · Expenditure category growth & ranking" subtitle="Mainland overnight visitors · HK$Mn">
        <SpendingTable segment="Mainland" />
      </SectionCard>
      <SectionCard title="3 · Top 10 Mainland visitor places" subtitle="2025 full year vs H1 2026 · overnight visitors">
        <PlacesBumpChart segment="Mainland" />
      </SectionCard>
      <SectionCard title="4 · Insights and proposed actions">
        <div className="grid gap-4 text-xs leading-relaxed text-slate-700 lg:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">What the data shows</h3>
            <ol className="list-decimal space-y-2 pl-4">{pairs.map((pair) => <li key={pair.insight}>{pair.insight}</li>)}</ol>
            <p className="text-slate-500">These observations do not establish why visitors travel, stay or spend.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">Proposed H2 interventions</h3>
            <ol className="list-decimal space-y-2 pl-4">{pairs.map((pair) => <li key={pair.insight}>{pair.action}</li>)}</ol>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
