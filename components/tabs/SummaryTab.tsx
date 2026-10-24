'use client';

import Link from 'next/link';
import KpiSummary from '../KpiSummary';
import LazyMount from '../LazyMount';
import SectionCard, { Insight, PageHeading } from '../SectionCard';
import ArrivalsBullet from '../charts/ArrivalsBullet';
import SectorRevenueChart from '../charts/SectorRevenueChart';
import YoyLineChart from '../charts/YoyLineChart';
import { kpiSummary, strategy } from '@/lib/data';
import { useFilters } from '@/lib/filters-context';
import { describeSegment } from '@/lib/filters';
import { formatCompact, formatHkd, formatPct } from '@/lib/format';
import { headlineInsights } from '@/lib/insights';

export default function SummaryTab() {
  const { filters } = useFilters();
  const insights = headlineInsights();
  const segment = describeSegment(filters);

  const nextSteps = [
    {
      href: '/visitor-persona/',
      title: 'Visitor Persona',
      metric: formatPct(kpiSummary.arrivals.mainland_share_ytd_pct),
      caption: 'Mainland share of arrivals',
    },
    {
      href: '/revenue/',
      title: 'Revenue Analysis',
      metric: formatHkd(kpiSummary.spending.yield_per_visitor_hkd['2025']),
      caption: 'Spend per visitor (2025)',
    },
    {
      href: '/competitors/',
      title: 'Competitor Analysis',
      metric: insights.sg25?.per_visitor_hkd ? formatHkd(insights.sg25.per_visitor_hkd) : '–',
      caption: 'Singapore spend per visitor (2025)',
    },
    {
      href: '/outlook-2027/',
      title: '2027 Outlook',
      metric: formatCompact(strategy.scenarios.base.arrivals, 1),
      caption: 'Base-case 2027 arrivals',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        title="Summary: KPI Tracking"
        description="A high-level health check of Hong Kong inbound tourism: arrivals, length of stay, spending per visitor, hotel sector and tourism's share of GDP."
      />
      <KpiSummary filters={filters} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Monthly arrivals vs prior year and 2019 level"
          subtitle={`Bullet graph · ${segment}`}
          badge="official"
          footnote="The 2019 band covers the whole market only. 2019 H2 was depressed by social unrest, so recovery ratios for those months run high."
        >
          <LazyMount height={360}>
            <ArrivalsBullet filters={filters} />
          </LazyMount>
        </SectionCard>
        <SectionCard title="Visitor arrivals: year-on-year" subtitle={`Monthly arrivals by year · ${segment}`} badge="official">
          <LazyMount height={260}>
            <YoyLineChart filters={filters} />
          </LazyMount>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard
          title="Sector revenue: retail, dining, accommodation and transport"
          subtitle="C&SD Business Receipts Indices, quarterly"
          badge="official"
        >
          <LazyMount height={290}>
            <SectorRevenueChart filters={filters} />
          </LazyMount>
        </SectionCard>

        <SectionCard title="Consolidated takeaways" subtitle="Headline findings from every tab" badge="derived">
          <div className="space-y-2">
            <Insight>{insights.arrivals}</Insight>
            <Insight tone="steel">{insights.mainland}</Insight>
            <Insight tone="accent">{insights.yield}</Insight>
            {insights.competitor && <Insight tone="steel">{insights.competitor}</Insight>}
            <Insight>{insights.outlook}</Insight>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {nextSteps.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-2xl border border-slate-200/80 bg-canvas p-4 shadow-card transition hover:border-brand-500"
          >
            <p className="text-sm font-semibold text-slate-900">{s.title}</p>
            <p className="mt-2 text-2xl font-bold text-brand-800">{s.metric}</p>
            <p className="text-xs text-slate-600">{s.caption}</p>
            <p className="mt-2 text-xs font-semibold text-brand-800 group-hover:underline">Explore →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
