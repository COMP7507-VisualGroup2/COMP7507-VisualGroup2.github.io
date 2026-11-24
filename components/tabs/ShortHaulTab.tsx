'use client';

import { useState } from 'react';
import SectionCard from '../SectionCard';
import { PlacesBumpChart, ProfilePie, SpendingTable } from '../VisitorProfileCharts';
import { summary } from '@/lib/data';
import { formatCompact, formatHkd, formatPct, pctChange } from '@/lib/format';
import { MARKETS, marketH1, profile, profileValue } from '@/lib/persona';
import { shortHaulSameDaySpend } from '@/lib/short-haul';
import { TABLEAU_CASUAL } from '@/lib/theme';

const shortHaulAreas = summary.areas.filter((area) => area.segment === 'Short-haul').map((area) => area.area);
const segment = (year: string) => summary.segments_h1[year]?.['Short-haul'];
const profileMetric = (year: '2025' | '2026-H1', dimension: string, category?: string) => profileValue(year, 'Short-haul', dimension, category);
const change = (current: number | null | undefined, previous: number | null | undefined) =>
  current != null && previous != null && Number.isFinite(current) && Number.isFinite(previous) ? pctChange(current, previous) : null;
const nights = (value: number) => `${value.toFixed(1)} nights`;

const shortHaulMarkets = [...MARKETS.filter((market) => market.origin === 'Short-haul').map(({ market }) => market), 'Vietnam'];
const markets = shortHaulMarkets.map((market) => {
  const current = marketH1('2026-H1', market);
  return {
    market,
    arrivals: current?.arrivals ?? null,
  };
});

function MetricCard({ label, current, previous, format }: {
  label: string;
  current: number | null | undefined;
  previous: number | null | undefined;
  format: (value: number) => string;
}) {
  const growth = change(current, previous);
  const rounded = growth === null ? null : Number(growth.toFixed(1));
  const direction = rounded === null ? 'unavailable' : rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'unchanged';
  const color = direction === 'up' ? 'text-green-700' : direction === 'down' ? 'text-red-600' : 'text-slate-500';
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-bold tracking-tight text-brand-900">{current == null ? 'Unavailable' : format(current)}</span>
        <span className={`text-sm ${color}`} aria-label={direction}>{direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–'}</span>
      </p>
      <p className="mt-1 text-[13px] text-slate-500">
        vs {previous == null ? 'unavailable' : format(previous)} in H1 2025{' '}
        <span className={`font-semibold ${color}`}>({rounded === null ? 'N/A' : formatPct(rounded, 1, true)})</span>
      </p>
    </article>
  );
}

function MarketPlaces({ market }: { market: string }) {
  const places = profile('2026-H1', market, 'place_rank').sort((a, b) => a.value - b.value).slice(0, 4);
  if (!places.length) return <span>Top places are unavailable.</span>;
  return <span>{places.map((place) => `${place.category} (#${place.value})`).join(', ')}.</span>;
}

function ShortHaulProfile({ selectedMarket }: { selectedMarket: string }) {
  const isOverall = selectedMarket === 'Short-haul';
  const current = marketH1('2026-H1', selectedMarket);
  const firstTime = profileValue('2026-H1', selectedMarket, 'first_timer_pct');
  const origins = profile('2026-H1', selectedMarket, 'origin_region')
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const originTotal = origins.reduce((total, row) => total + row.value, 0);
  const topMarkets = [...markets]
    .filter((row): row is typeof row & { arrivals: number } => row.arrivals !== null)
    .sort((a, b) => b.arrivals - a.arrivals)
    .slice(0, 5);
  const topTotal = topMarkets.reduce((total, row) => total + row.arrivals, 0);
  const hasOrigins = current && current.arrivals > 0 && topMarkets.length === 5
    && markets.every((row) => row.arrivals !== null) && topTotal <= current.arrivals;
  const hasVisitorTypes = current && current.arrivals > 0 && current.same_day >= 0
    && current.overnight >= 0 && current.same_day + current.overnight === current.arrivals;
  const hasRegionalOrigins = origins.length > 0 && origins.every((row) => Number.isFinite(row.value) && row.value >= 0)
    && originTotal <= 100;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <section aria-labelledby="short-haul-type-title" className="min-w-0">
        <h3 id="short-haul-type-title" className="mb-3 text-xs font-bold text-slate-800">1A · {selectedMarket} arrivals by visitor type</h3>
        {hasVisitorTypes ? (
          <ProfilePie rows={[
            { name: 'Same-day', value: current.same_day / current.arrivals * 100, color: '#F28E2B' },
            { name: 'Overnight', value: current.overnight / current.arrivals * 100, color: '#4E79A7' },
          ]} />
        ) : <p className="text-xs text-slate-500">Visitor-type data is unavailable.</p>}
        <p className="mt-2 text-[12px] text-slate-500">H1 2026 · share of {selectedMarket} arrivals · HKTB visitor-type workbooks.</p>
      </section>
      <section aria-labelledby="short-haul-origin-title" className="min-w-0">
        <h3 id="short-haul-origin-title" className="mb-3 text-xs font-bold text-slate-800">1B · {isOverall ? 'Top five individually named markets' : `Top ${selectedMarket} origins`}</h3>
        {isOverall ? (
          hasOrigins ? (
            <ProfilePie rows={[
              ...topMarkets.map((row, index) => ({ name: row.market, value: row.arrivals / current.arrivals * 100, color: TABLEAU_CASUAL[index] })),
              { name: 'Other origins', value: (current.arrivals - topTotal) / current.arrivals * 100, color: '#BAB0AC' },
            ]} />
          ) : <p className="text-xs text-slate-500">Market arrival data is unavailable.</p>
        ) : hasRegionalOrigins ? (
          <ProfilePie rows={[
            ...origins.map((row, index) => ({ name: row.category, value: row.value, color: TABLEAU_CASUAL[index] })),
            { name: 'Other origins', value: 100 - originTotal, color: '#BAB0AC' },
          ]} />
        ) : <p className="text-xs text-slate-500">Regional origin data for {selectedMarket} is unavailable.</p>}
        <p className="mt-2 text-[12px] text-slate-500">
          {isOverall
            ? 'H1 2026 · share of all short-haul arrivals. Other includes Macao SAR / Not Identified and remaining origins. HKTB nationality workbooks.'
            : `H1 2026 · share of ${selectedMarket} overnight visitors. Other is the remainder after the displayed regions. HKTB visitor profile.`}
        </p>
      </section>
      <section aria-labelledby="short-haul-repeat-title" className="min-w-0">
        <h3 id="short-haul-repeat-title" className="mb-3 text-xs font-bold text-slate-800">1C · First-time vs repeat</h3>
        {firstTime !== null && firstTime >= 0 && firstTime <= 100 ? (
          <ProfilePie rows={[
            { name: 'Repeat', value: 100 - firstTime, color: '#F28E2B' },
            { name: 'First-time', value: firstTime, color: '#4E79A7' },
          ]} />
        ) : <p className="text-xs text-slate-500">First-time visitor data for {selectedMarket} is unavailable{isOverall ? '; select an individual market to view its profile' : ''}.</p>}
        <p className="mt-2 text-[12px] text-slate-500">
          {isOverall
            ? 'H1 2026 · user-provided first-time share; original source and visitor type not stated. Repeat is the remainder.'
            : `H1 2026 · ${selectedMarket} overnight visitors. Repeat is 100% minus HKTB's first-time share.`}
        </p>
      </section>
    </div>
  );
}

export default function ShortHaulTab() {
  const [selectedMarket, setSelectedMarket] = useState('Short-haul');
  const current = segment('2026');
  const previous = segment('2025');
  const currentSameDaySpend = shortHaulSameDaySpend(summary.area_h1, shortHaulAreas, '2026');
  const previousSameDaySpend = shortHaulSameDaySpend(summary.area_h1, shortHaulAreas, '2025');
  const indonesiaCompanion = profileValue('2026-H1', 'Indonesia', 'companion', 'With companion');
  const indonesiaFamily = profileValue('2026-H1', 'Indonesia', 'companion', 'With family members');
  const vacation = profileMetric('2026-H1', 'trip_purpose', 'Vacation');
  const overnightChange = change(current?.overnight, previous?.overnight);
  const pairs = [
    ...(vacation !== null ? [{
      insight: `Vacation was the main purpose for ${vacation}% of short-haul overnight visitors${overnightChange !== null ? `; overnight arrivals changed ${formatPct(overnightChange, 1, true)} versus H1 2025` : ''}.`,
      action: 'Promote vacation itineraries and overnight attraction packages to short-haul markets.',
    }] : []),
    ...(profile('2026-H1', 'South Korea', 'place_rank').length ? [{
      insight: <>South Korea&apos;s H1 2026 top places: <MarketPlaces market="South Korea" /></>,
      action: 'Feature these popular places in South Korea market promotions.',
    }] : []),
    ...(indonesiaCompanion !== null && indonesiaFamily !== null ? [{
      insight: `${indonesiaCompanion}% of Indonesian overnight visitors travelled with companions, including ${indonesiaFamily}% with family members.`,
      action: 'Offer Indonesian visitors family and group packages.',
    }] : []),
  ];

  return (
    <div className="space-y-[14px]">
      <section aria-label="Short-haul performance" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total arrivals" current={current?.visitors} previous={previous?.visitors} format={(value) => formatCompact(value, 2)} />
        <MetricCard label="Overnight arrivals" current={current?.overnight} previous={previous?.overnight} format={(value) => formatCompact(value, 2)} />
        <MetricCard label="Overnight spend / visitor" current={profileMetric('2026-H1', 'per_capita_overnight_hkd')} previous={profileMetric('2025', 'per_capita_overnight_hkd')} format={formatHkd} />
        <MetricCard label="Average overnight stay" current={profileMetric('2026-H1', 'avg_nights')} previous={profileMetric('2025', 'avg_nights')} format={nights} />
        <MetricCard label="Same-day spend / visitor" current={currentSameDaySpend} previous={previousSameDaySpend} format={formatHkd} />
      </section>
      <p className="text-[12px] leading-relaxed text-slate-500">
        H1 2026 versus H1 2025. Arrivals are from HKTB visitor-type workbooks; overnight spend and stay are from the HKTB visitor profile. Same-day spend is TEAIT same-day expenditure divided by same-day arrivals across short-haul market areas (total arrivals minus overnight visitors); international passenger transport is excluded.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <label htmlFor="short-haul-market" className="mr-3 text-xs font-semibold text-slate-700">Market for sections 1–3</label>
        <select id="short-haul-market" value={selectedMarket} onChange={(event) => setSelectedMarket(event.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">
          <option value="Short-haul">All short-haul markets</option>
          {shortHaulMarkets.map((market) => <option key={market} value={market}>{market}</option>)}
        </select>
      </div>
      <SectionCard title={`1 · ${selectedMarket} visitor profile`} subtitle="Jan–Jun 2026">
        <ShortHaulProfile selectedMarket={selectedMarket} />
      </SectionCard>
      <SectionCard title="2 · Expenditure category growth & ranking" subtitle={`${selectedMarket} overnight visitors · HK$Mn`}>
        {selectedMarket === 'Short-haul' ? <SpendingTable segment="Short-haul" /> : (
          <p className="text-xs text-slate-500">
            Expenditure by category for {selectedMarket} is unavailable in the supplied data; short-haul totals cannot be attributed to an individual market.
          </p>
        )}
      </SectionCard>
      <SectionCard title={`3 · Top 10 ${selectedMarket} visitor places`} subtitle="2025 full year vs H1 2026 · overnight visitors">
        <PlacesBumpChart segment={selectedMarket} />
      </SectionCard>
      <SectionCard title="4 · Short-haul-wide insights and proposed H2 actions" subtitle="Overall context; not filtered by market">
        <div className="grid gap-4 text-xs leading-relaxed text-slate-700 lg:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">What the data shows</h3>
            <ol className="list-decimal space-y-2 pl-4">{pairs.map((pair, index) => <li key={index}>{pair.insight}</li>)}</ol>
            <p className="text-slate-500">These observations describe visitor patterns; they do not establish the causes of arrival changes.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">Proposed H2 interventions</h3>
            <ol className="list-decimal space-y-2 pl-4">{pairs.map((pair, index) => <li key={index}>{pair.action}</li>)}</ol>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
