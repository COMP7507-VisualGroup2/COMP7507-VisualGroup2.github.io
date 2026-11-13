'use client';

import { useEffect, useState, type ReactNode } from 'react';
import MarketMovers from '../MarketMovers';
import { AnimatedNumber } from '../motion';
import { summary } from '@/lib/data';
import { useFilters } from '@/lib/filters-context';
import type { Filters } from '@/lib/types';

/* Port of the v3 Executive summary (COMP7507 Group Project v3/dashboard.js: renderKpis + renderOverview*). */

const H1 = ['01', '02', '03', '04', '05', '06'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const fmt = new Intl.NumberFormat('en-HK');
const fmtM = (v: number) => `${(v / 1e6).toFixed(2)}m`;

/** False on the first paint, true right after: lets bars and gauges grow in from zero. */
function useEntered() {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return entered;
}

const UP = '#0A9396';
const DOWN = '#CA6702';
const FLAT = '#94A3B8';

const pctChange = (current: number | null | undefined, prior: number | null | undefined) =>
  current != null && prior != null && prior !== 0 ? (current / prior - 1) * 100 : null;

function growthClass(value: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value)) return 'neutral';
  const rounded = Number(value.toFixed(digits));
  return rounded > 0 ? 'growth-positive' : rounded < 0 ? 'growth-negative' : 'neutral';
}

function formatGrowth(value: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  const rounded = Number(value.toFixed(digits));
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded).toFixed(digits)}%`;
}

const monthsBetween = (f: Filters) => summary.months.filter((m) => m >= f.start && m <= f.end);
const isH1 = (f: Filters, year: string) => f.start === `${year}-01` && f.end === `${year}-06`;
const noFilters = (f: Filters) => f.origin === 'All' && f.region === 'All' && f.visitorType === 'All';
const seriesKey = (f: Filters) => (f.region !== 'All' ? f.region : f.origin);

function selectedAreas(f: Filters) {
  return summary.areas.filter((a) => (f.origin === 'All' || a.segment === f.origin) && (f.region === 'All' || a.area === f.region));
}

/** Jan-Jun monthly arrivals for the selected market / country (null when a visitor type is selected). */
function h1Arrivals(f: Filters, year: string): number[] | null {
  if (f.visitorType !== 'All') return null;
  const key = seriesKey(f);
  return H1.map((m) => summary.arrivals_monthly[`${year}-${m}`]?.[key] ?? 0);
}

function h1Revenue(f: Filters, year: string): number {
  if (noFilters(f)) return summary.h1[year].receipts_hkd_m;
  const key = f.visitorType === 'Overnight' ? 'overnight_spend_hkd_m' : f.visitorType === 'Same-day' ? 'same_day_spend_hkd_m' : 'spend_hkd_m';
  return summary.area_h1.filter((a) => a.year === year && selectedAreas(f).some((s) => s.area === a.area)).reduce((sum, a) => sum + a[key], 0);
}

function revenueSeries(f: Filters, year: string) {
  const arrivals = h1Arrivals(f, year);
  if (!arrivals) return null;
  const visitors = arrivals.reduce((a, b) => a + b, 0);
  return visitors ? arrivals.map((v) => (v * h1Revenue(f, year)) / visitors) : null;
}

function averageLengthOfStay(year: string) {
  const values = H1.map((m) => summary.length_of_stay_monthly[`${year}-${m}`]).filter((v): v is number => v != null);
  return values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : summary.targets[year].length_of_stay;
}

function KpiGrid({ filters }: { filters: Filters }) {
  const months = monthsBetween(filters);
  const key = seriesKey(filters);
  const totalArrivals = filters.visitorType === 'All' ? months.reduce((sum, m) => sum + (summary.arrivals_monthly[m]?.[key] ?? 0), 0) : null;
  const targetArrivals = months.reduce((sum, m) => sum + summary.targets[m.slice(0, 4)].arrivals / 12, 0);
  const year = months.every((m) => m.startsWith('2025')) ? '2025' : '2026';
  const receipts = isH1(filters, year) && noFilters(filters) ? summary.h1[year].receipts_hkd_m : null;
  const targetSpend = (summary.targets[year].receipts_hkd_m * 6) / 12;
  const perCapita = (y: string) => (summary.h1[y].overnight_spend_hkd_m * 1e6) / summary.h1[y].overnight_visitors;
  const spend = isH1(filters, year) ? perCapita(year) : null;
  const priorSpend = perCapita('2025');
  const stay = isH1(filters, year) && filters.visitorType !== 'Same-day' ? averageLengthOfStay(year) : null;
  const stayTarget = summary.targets[year].length_of_stay;

  const items = [
    { label: 'Total VISITORS', target: targetArrivals, actual: totalArrivals || null, format: fmtM },
    { label: 'Total EXPENDITURE', target: targetSpend, actual: receipts, format: (v: number) => `${(v / 1000).toFixed(1)}bn` },
    { label: 'AVERAGE STAY FOR OVERNIGHT VISITORS', target: stayTarget, actual: stay, format: (v: number) => v.toFixed(1) },
    { label: 'AVERAGE SPEND PER OVERNIGHT VISITOR', target: priorSpend, actual: spend, format: (v: number) => fmt.format(Math.round(v)) },
  ];
  const entered = useEntered();

  return (
    <div className="kpi-grid">
      {items.map((item, index) => {
        const rawPct = item.actual == null ? null : (item.actual / item.target) * 100;
        const pct = rawPct == null ? 0 : Math.min(100, rawPct);
        const status = rawPct == null ? 'no-data' : rawPct >= 100 ? 'success' : 'deficit';
        const digits = rawPct != null && rawPct < 100 && Number(rawPct.toFixed(1)) >= 100 ? 2 : 1;
        const pctText = rawPct == null ? '—' : `${rawPct.toFixed(digits)}%`;
        const gaugeActual = item.actual == null ? '—' : item.format(item.actual);
        const gaugeTarget = item.format(item.target);
        return (
          <article key={item.label} className={`kpi-card status-${status}`} style={{ animationDelay: `${index * 70}ms` }}>
            <div className="kpi-label">{item.label}</div>
            <div className="kpi-gauge-wrap">
              <svg
                className={`kpi-gauge ${status}`}
                viewBox="0 0 180 96"
                role="img"
                aria-label={rawPct == null ? 'No data' : `${pctText} of target achieved; actual ${gaugeActual}; target ${gaugeTarget}`}
              >
                <path className="gauge-track" pathLength={100} d="M22 78 A68 68 0 0 1 158 78" />
                {rawPct != null && <path className="gauge-value" pathLength={100} style={{ strokeDasharray: `${entered ? pct : 0} 100` }} d="M22 78 A68 68 0 0 1 158 78" />}
                <text x="90" y="69" textAnchor="middle">
                  {rawPct == null ? '—' : <AnimatedNumber value={entered ? rawPct : 0} duration={1100} format={(v) => `${v.toFixed(digits)}%`} />}
                </text>
              </svg>
              <div className="kpi-gauge-values">
                <span className="gauge-actual">Actual: {item.actual == null ? '—' : <AnimatedNumber value={item.actual} format={item.format} />}</span>
                <i aria-hidden="true" />
                <span className="gauge-target">Target: {gaugeTarget}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function GrowthSummary({ metrics }: { metrics: { label: string; value: number | null; note: string; digits?: number }[] }) {
  return (
    <aside className="growth-summary">
      {metrics.map((m) => (
        <div key={m.label} className="growth-summary-item">
          <span>{m.label}</span>
          <strong className={m.value == null ? 'neutral' : growthClass(m.value, m.digits ?? 1)}>
            {m.value == null ? 'N/A' : <AnimatedNumber value={m.value} format={(v) => formatGrowth(v, m.digits ?? 1)} />}
          </strong>
          <small>{m.note}</small>
        </div>
      ))}
    </aside>
  );
}

function OverviewBars({
  bars,
  unit,
  ariaLabel,
}: {
  bars: { label: string; value: number; format: (v: number) => string; className: string; title: string }[];
  unit: string;
  ariaLabel: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const entered = useEntered();
  return (
    <>
      <div className="overview-chart-unit">{unit}</div>
      <div className="overview-bars" role="img" aria-label={ariaLabel}>
        {bars.map((b, i) => (
          <div key={b.label} className="overview-bar-column">
            <span className="overview-bar-value">
              <AnimatedNumber value={b.value} format={b.format} />
            </span>
            <div className="overview-bar-track">
              <i className={b.className} style={{ height: entered ? `${Math.max(b.value > 0 ? 2 : 0, (b.value / max) * 100)}%` : '0%', transitionDelay: `${i * 45}ms` }} title={b.title}>
                <span className="visually-hidden">{b.title}</span>
              </i>
            </div>
            <span className="overview-bar-label">{b.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function MonthlyBars({ current, prior, format, unit, ariaLabel }: { current: number[]; prior: number[] | null; format: (v: number) => string; unit: string; ariaLabel: string }) {
  return (
    <OverviewBars
      unit={unit}
      ariaLabel={ariaLabel}
      bars={current.map((value, i) => ({
        label: MONTH_ABBR[i],
        value,
        format,
        className: growthClass(pctChange(value, prior?.[i])),
        title: `${MONTH_ABBR[i]} 2026: ${format(value)}`,
      }))}
    />
  );
}

function GrowthCard({ title, chart, note, metrics, delay = 0 }: { title: string; chart: ReactNode; note: string; metrics: Parameters<typeof GrowthSummary>[0]['metrics']; delay?: number }) {
  return (
    <article className="card chart-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="card-header">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="overview-growth-layout">
        <div className="chart-body overview-plot">
          {chart}
          <div className="chart-note">{note}</div>
        </div>
        <GrowthSummary metrics={metrics} />
      </div>
    </article>
  );
}

const empty = (text: string) => <div className="chart-empty">{text}</div>;

function ArrivalsCard({ filters }: { filters: Filters }) {
  const current = h1Arrivals(filters, '2026');
  const prior = h1Arrivals(filters, '2025');
  const sum = (v: number[] | null) => v && v.reduce((a, b) => a + b, 0);
  return (
    <GrowthCard
      title="Inbound visitors growth"
      delay={280}
      chart={
        current
          ? <MonthlyBars current={current} prior={prior} format={(v) => (v / 1e6).toFixed(1)} unit="Visitors · millions" ariaLabel="Jan to Jun 2026 monthly visitor arrivals, colored by year-on-year change" />
          : empty('Monthly arrivals by overnight and same-day visitor type are not available. Choose All visitors to view monthly arrivals.')
      }
      note="Bar colors compare each month with the same month in 2025: teal is up, amber is down, grey is unchanged or unavailable."
      metrics={[
        { label: 'YoY Growth', value: pctChange(sum(current), sum(prior)), note: 'Jan–Jun 2026 vs 2025' },
        { label: 'MoM Growth', value: current && pctChange(current[5], current[4]), note: 'Jun vs May 2026' },
      ]}
    />
  );
}

function RevenueCard({ filters }: { filters: Filters }) {
  const current = revenueSeries(filters, '2026');
  const prior = revenueSeries(filters, '2025');
  return (
    <GrowthCard
      title="Total revenue growth (2025-2026)"
      delay={350}
      chart={
        current
          ? <MonthlyBars current={current} prior={prior} format={(v) => (v / 1000).toFixed(1)} unit="Estimated revenue · HK$ billion" ariaLabel="Estimated Jan to Jun 2026 monthly tourism revenue, colored by year-on-year change" />
          : empty('Monthly revenue by visitor type is not available in the source data. H1 totals are still shown in the growth panel.')
      }
      note="Monthly revenue is estimated by distributing the H1 total according to monthly arrival shares; it is not a published monthly revenue series. Bar colors show the estimated same-month YoY direction."
      metrics={[
        { label: 'YoY Growth', value: pctChange(h1Revenue(filters, '2026'), h1Revenue(filters, '2025')), note: 'H1 2026 vs H1 2025' },
        { label: 'MoM Growth', value: current && pctChange(current[5], current[4]), note: current ? 'Jun vs May 2026 · estimated' : 'Monthly source data unavailable' },
      ]}
    />
  );
}

function StayCard() {
  const current = H1.map((m) => summary.length_of_stay_monthly[`2026-${m}`]);
  const prior = H1.map((m) => summary.length_of_stay_monthly[`2025-${m}`]);
  if (current.some((v) => v == null) || prior.some((v) => v == null)) {
    return (
      <GrowthCard
        title="Average stay for overnight visitors"
        delay={420}
        chart={empty('Jan–Jun monthly length-of-stay observations are not available.')}
        note=""
        metrics={[
          { label: 'YoY Growth', value: null, note: 'Jan–Jun source data unavailable' },
          { label: 'MoM Growth', value: null, note: 'Monthly source data unavailable' },
        ]}
      />
    );
  }
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const yoy = pctChange(mean(current), mean(prior));
  const colorOf = (cls: string) => (cls === 'growth-positive' ? UP : cls === 'growth-negative' ? DOWN : FLAT);
  const [width, height, left, right, top, bottom, min, max] = [430, 145, 35, 12, 14, 28, 2.8, 3.4];
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const x = (i: number) => left + (i * plotW) / 5;
  const y = (v: number) => top + ((max - v) / (max - min)) * plotH;
  const chart = (
    <>
      <div className="overview-chart-unit">Average nights per overnight visitor</div>
      <svg className="chart-svg stay-reference-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Monthly average overnight stay, Jan to Jun 2026: ${current.map((v, i) => `${MONTH_ABBR[i]} ${v.toFixed(1)} nights`).join(', ')}`}>
        {[2.8, 3.0, 3.2, 3.4].map((v) => (
          <g key={v}>
            <line x1={left} y1={y(v)} x2={width - right} y2={y(v)} stroke="#edf0f2" />
            <text x={left - 6} y={y(v) + 3} textAnchor="end" fill="#89949c" fontSize="9">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        <path className="stay-line" pathLength={1} d={current.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} fill="none" stroke={colorOf(growthClass(yoy))} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {current.map((v, i) => {
          const change = pctChange(v, prior[i]);
          return (
            <g key={i}>
              <title>{`${MONTH_ABBR[i]} 2026: ${v.toFixed(1)} nights; ${formatGrowth(change)} vs ${MONTH_ABBR[i]} 2025`}</title>
              <circle className="stay-dot" style={{ animationDelay: `${600 + i * 90}ms` }} cx={x(i)} cy={y(v)} r="4.5" fill={colorOf(growthClass(change))} stroke="#fff" strokeWidth="1.5" />
              <text x={x(i)} y={height - 9} textAnchor="middle" fill="#53636e" fontSize="10">
                {MONTH_ABBR[i]}
              </text>
            </g>
          );
        })}
        <line x1={left} y1={top + plotH} x2={width - right} y2={top + plotH} stroke="#cfd7db" />
      </svg>
    </>
  );
  return (
    <GrowthCard
      title="Average stay for overnight visitors"
      delay={420}
      chart={chart}
      note="Monthly length-of-stay source data. Markers compare each month with the same month in 2025; line color reflects H1 YoY direction."
      metrics={[
        { label: 'YoY Growth', value: yoy, note: 'Jan–Jun mean vs 2025' },
        { label: 'MoM Growth', value: pctChange(current[5], current[4]), note: 'Jun vs May 2026' },
      ]}
    />
  );
}

function OvernightSpendCard() {
  const items = summary.quarterly_overnight_per_capita;
  const current = [...items].reverse().find((q) => q.year === 2026);
  const priorYear = current && items.find((q) => q.year === current.year - 1 && q.quarter === current.quarter);
  const priorQuarter = current && items.find((q) => q.year === current.year && q.quarter === current.quarter - 1);
  const chart = items.length
    ? (
      <OverviewBars
        unit="Quarterly average · HK$ per overnight visitor"
        ariaLabel="Quarterly average overnight spend per visitor, with 2026 compared to the same quarter in 2025"
        bars={items.map((q) => {
          const prior = items.find((c) => c.year === q.year - 1 && c.quarter === q.quarter);
          const label = `Q${q.quarter} '${String(q.year).slice(-2)}`;
          return {
            label,
            value: q.value,
            format: (v: number) => fmt.format(Math.round(v)),
            className: prior ? growthClass(pctChange(q.value, prior.value), 2) : 'baseline',
            title: `${label}: HK$${fmt.format(Math.round(q.value))}`,
          };
        })}
      />
    )
    : empty('Quarterly average spend data is unavailable.');
  return (
    <GrowthCard
      title="Average spend per overnight visitors"
      delay={490}
      chart={chart}
      note="Quarterly averages from the Quarterly Update tab. 2026 bars compare with the same quarter in 2025; 2025 bars are the baseline. Later 2026 quarters are not yet available."
      metrics={[
        {
          label: 'YoY Growth',
          value: current && priorYear ? pctChange(current.value, priorYear.value) : null,
          note: current ? `Q${current.quarter} ${current.year} vs Q${current.quarter} ${current.year - 1}` : 'Quarterly source data unavailable',
          digits: 2,
        },
        {
          label: 'QoQ Growth',
          value: current && priorQuarter ? pctChange(current.value, priorQuarter.value) : null,
          note: current && priorQuarter ? `Q${current.quarter} vs Q${current.quarter - 1} ${current.year}` : 'Prior quarter unavailable',
          digits: 2,
        },
      ]}
    />
  );
}

export default function SummaryTab() {
  const { filters } = useFilters();
  return (
    <section aria-label="Executive summary" className="exec-summary">
      <KpiGrid filters={filters} />
      <div className="dashboard-grid overview-grid">
        <ArrivalsCard filters={filters} />
        <RevenueCard filters={filters} />
        <StayCard />
        <OvernightSpendCard />
      </div>
      <div className="mt-[14px]">
        <MarketMovers filters={filters} />
      </div>
    </section>
  );
}
