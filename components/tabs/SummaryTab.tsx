'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatedNumber } from '../motion';
import { quarterlyRevenue, summary } from '@/lib/data';

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

const UP = '#59A14F';
const DOWN = '#E15759';
const FLAT = '#94A3B8';

const pctChange = (current: number | null | undefined, prior: number | null | undefined) =>
  current != null && prior != null && prior !== 0 ? (current / prior - 1) * 100 : null;

function growthClass(value: number | null) {
  if (value == null || !Number.isFinite(value)) return 'neutral';
  return value > 0 ? 'growth-positive' : 'growth-negative';
}

function formatGrowth(value: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  const rounded = Number(value.toFixed(digits));
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded).toFixed(digits)}%`;
}

function h1Arrivals(year: string): number[] {
  return H1.map((m) => summary.arrivals_monthly[`${year}-${m}`]?.All ?? 0);
}

function h1AverageSpend(year: string): number | null {
  const arrivals = H1.map((month) => summary.arrivals_monthly[`${year}-${month}`]?.All)
    .filter((value): value is number => value != null);
  const receipts = summary.h1[year]?.receipts_hkd_m;
  if (arrivals.length !== H1.length || receipts == null) return null;
  const total = arrivals.reduce((sum, value) => sum + value, 0);
  return total > 0 ? (receipts * 1e6) / total : null;
}

function KpiGauge({ label, target, actual, format }: {
  label: string;
  target: number;
  actual: number | null;
  format: (value: number) => string;
}) {
  const entered = useEntered();
  const rawPct = actual == null ? null : (actual / target) * 100;
  const pct = rawPct == null ? 0 : Math.min(100, rawPct);
  const status = rawPct == null ? 'no-data' : rawPct >= 100 ? 'success' : 'deficit';
  const digits = rawPct != null && rawPct < 100 && Number(rawPct.toFixed(1)) >= 100 ? 2 : 1;
  const pctText = rawPct == null ? '—' : `${rawPct.toFixed(digits)}%`;
  const gaugeActual = actual == null ? '—' : format(actual);
  const gaugeTarget = format(target);
  return (
    <article className={`kpi-card status-${status}`}>
      <div className="kpi-label">{label}</div>
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
          <span className="gauge-actual">Actual: {actual == null ? '—' : <AnimatedNumber value={actual} format={format} />}</span>
          <i aria-hidden="true" />
          <span className="gauge-target">Target: {gaugeTarget}</span>
        </div>
      </div>
    </article>
  );
}

function GrowthSummary({ metrics }: { metrics: { label: string; value: number | null; note: string; digits?: number }[] }) {
  return (
    <aside className="growth-summary">
      {metrics.map((m) => (
        <div key={m.label} className="growth-summary-item">
          <span>{m.label}</span>
          <strong className={m.value == null ? 'neutral' : growthClass(m.value)}>
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
      <div className="overview-bars" role="img" aria-label={`${ariaLabel}. ${bars.map((bar) => bar.title).join('. ')}`} style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
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

function MonthlyBars({ current, prior, format, unit, ariaLabel }: { current: number[]; prior: number[]; format: (v: number) => string; unit: string; ariaLabel: string }) {
  const priorTotal = prior.reduce((a, b) => a + b, 0);
  return (
    <OverviewBars
      unit={unit}
      ariaLabel={ariaLabel}
      bars={[
        { label: "H1 '25", value: priorTotal, format, className: 'baseline', title: `H1 2025: ${format(priorTotal)}` },
        ...current.map((value, i) => ({
          label: MONTH_ABBR[i],
          value,
          format,
          className: growthClass(pctChange(value, prior[i])),
          title: `${MONTH_ABBR[i]} 2026: ${format(value)}`,
        })),
      ]}
    />
  );
}

function GrowthCard({ title, chart, metrics, delay = 0 }: { title: string; chart: ReactNode; metrics: Parameters<typeof GrowthSummary>[0]['metrics']; delay?: number }) {
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
        </div>
        <GrowthSummary metrics={metrics} />
      </div>
    </article>
  );
}

const empty = (text: string) => <div className="chart-empty">{text}</div>;

function ArrivalsCard() {
  const current = h1Arrivals('2026');
  const prior = h1Arrivals('2025');
  const sum = (v: number[] | null) => v && v.reduce((a, b) => a + b, 0);
  return (
    <GrowthCard
      title="Inbound visitors growth"
      delay={280}
      chart={<MonthlyBars current={current} prior={prior} format={(v) => (v / 1e6).toFixed(1)} unit="Visitors · millions" ariaLabel="H1 2025 total followed by Jan to Jun 2026 monthly visitor arrivals" />}
      metrics={[
        { label: 'YoY Growth', value: pctChange(sum(current), sum(prior)), note: 'H1 2026 vs H1 2025' },
        { label: 'MoM Growth', value: pctChange(current[5], current[4]), note: 'Jun vs May 2026' },
      ]}
    />
  );
}

function RevenueCard() {
  const bars = quarterlyRevenue.map((record) => {
    const prior = quarterlyRevenue.find((candidate) => candidate.year === record.year - 1 && candidate.quarter === record.quarter);
    const value = record.standalone_quarter_spending_hkd_b;
    const label = `Q${record.quarter} '${String(record.year).slice(-2)}`;
    return {
      label,
      value,
      format: (amount: number) => amount.toFixed(1),
      className: prior ? growthClass(pctChange(value, prior.standalone_quarter_spending_hkd_b)) : 'baseline',
      title: `${label}: HK$${value.toFixed(1)}B · ${record.data_type}. ${record.source_and_derivation_notes}`,
    };
  });
  const currentH1 = quarterlyRevenue.filter((record) => record.year === 2026 && record.quarter <= 2);
  const priorH1 = quarterlyRevenue.filter((record) => record.year === 2025 && record.quarter <= 2);
  const total = (records: typeof quarterlyRevenue) => records.reduce((sum, record) => sum + record.standalone_quarter_spending_hkd_b, 0);
  const currentQ1 = quarterlyRevenue.find((record) => record.year === 2026 && record.quarter === 1);
  const currentQ2 = quarterlyRevenue.find((record) => record.year === 2026 && record.quarter === 2);
  return (
    <GrowthCard
      title="Total spending growth"
      delay={350}
      chart={<OverviewBars bars={bars} unit="Standalone quarterly spending · HK$ billion" ariaLabel="Standalone quarterly spending from Q1 2025 to Q2 2026; 2026 quarters compare with the same quarter in 2025" />}
      metrics={[
        { label: 'YoY Growth', value: pctChange(total(currentH1), total(priorH1)), note: 'H1 2026 vs H1 2025' },
        { label: 'QoQ Growth', value: currentQ1 && currentQ2 ? pctChange(currentQ2.standalone_quarter_spending_hkd_b, currentQ1.standalone_quarter_spending_hkd_b) : null, note: currentQ1 && currentQ2 ? 'Q2 vs Q1 2026' : 'Quarterly data unavailable' },
      ]}
    />
  );
}

export function StayCard() {
  const current = H1.map((m) => summary.length_of_stay_monthly[`2026-${m}`]);
  const prior = H1.map((m) => summary.length_of_stay_monthly[`2025-${m}`]);
  if (current.some((v) => v == null) || prior.some((v) => v == null)) {
    return (
      <GrowthCard
        title="Average stay for overnight visitors"
        delay={420}
        chart={empty('Jan–Jun monthly length-of-stay observations are not available.')}
        metrics={[
          { label: 'YoY Growth', value: null, note: 'Jan–Jun source data unavailable' },
          { label: 'MoM Growth', value: null, note: 'Monthly source data unavailable' },
        ]}
      />
    );
  }
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const yoy = pctChange(mean(current), mean(prior));
  const h1Prior = mean(prior);
  const colorOf = (cls: string) => (cls === 'growth-positive' ? UP : cls === 'growth-negative' ? DOWN : FLAT);
  const [width, height, left, right, top, bottom, min, max] = [430, 145, 35, 12, 14, 28, 2.8, 3.4];
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const x = (i: number) => left + (i * plotW) / 6;
  const y = (v: number) => top + ((max - v) / (max - min)) * plotH;
  const stayPoints = [h1Prior, ...current];
  const chart = (
    <>
      <div className="overview-chart-unit">Average nights per overnight visitor</div>
      <svg className="chart-svg stay-reference-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`H1 2025 average stay followed by monthly average overnight stay, Jan to Jun 2026: ${current.map((v, i) => `${MONTH_ABBR[i]} ${v.toFixed(1)} nights`).join(', ')}`}>
        {[2.8, 3.0, 3.2, 3.4].map((v) => (
          <g key={v}>
            <line x1={left} y1={y(v)} x2={width - right} y2={y(v)} stroke="#edf0f2" />
            <text x={left - 6} y={y(v) + 3} textAnchor="end" fill="#89949c" fontSize="11">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        <path className="stay-line" pathLength={1} d={stayPoints.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} fill="none" stroke={colorOf(growthClass(yoy))} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {stayPoints.map((v, i) => {
          const isBaseline = i === 0;
          const change = isBaseline ? null : pctChange(v, prior[i - 1]);
          return (
            <g key={i}>
              <title>{isBaseline ? `H1 2025 average: ${v.toFixed(1)} nights` : `${MONTH_ABBR[i - 1]} 2026: ${v.toFixed(1)} nights; ${formatGrowth(change)} vs ${MONTH_ABBR[i - 1]} 2025`}</title>
              <circle className="stay-dot" style={{ animationDelay: `${600 + i * 90}ms` }} cx={x(i)} cy={y(v)} r="4.5" fill={isBaseline ? FLAT : colorOf(growthClass(change))} stroke="#fff" strokeWidth="1.5" />
              <text x={x(i)} y={height - 9} textAnchor="middle" fill="#53636e" fontSize="12">
                {isBaseline ? "H1 '25" : MONTH_ABBR[i - 1]}
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
      metrics={[
        { label: 'YoY Growth', value: yoy, note: 'Jan–Jun mean vs 2025' },
        { label: 'MoM Growth', value: pctChange(current[5], current[4]), note: 'Jun vs May 2026' },
      ]}
    />
  );
}

function AverageSpendCard() {
  const items = quarterlyRevenue.flatMap((record) => {
    const months = Array.from({ length: 3 }, (_, index) =>
      `${record.year}-${String((record.quarter - 1) * 3 + index + 1).padStart(2, '0')}`,
    );
    const arrivals = months.map((month) => summary.arrivals_monthly[month]?.All).filter((value): value is number => value != null);
    if (arrivals.length !== months.length) return [];
    const total = arrivals.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return [];
    return [{ ...record, value: (record.standalone_quarter_spending_hkd_b * 1e9) / total }];
  });
  const current = items[items.length - 1];
  const currentH1 = h1AverageSpend('2026');
  const priorH1 = h1AverageSpend('2025');
  const priorQuarter = current && items.find((item) =>
    current.quarter === 1
      ? item.year === current.year - 1 && item.quarter === 4
      : item.year === current.year && item.quarter === current.quarter - 1,
  );
  const chart = items.length
    ? (
      <>
        <OverviewBars
          unit="Quarterly total spending ÷ arrivals · HK$ per visitor"
          ariaLabel="Quarterly average total spending per visitor"
          bars={items.map((q) => {
            const prior = items.find((candidate) => candidate.year === q.year - 1 && candidate.quarter === q.quarter);
            const label = `Q${q.quarter} '${String(q.year).slice(-2)}`;
            return {
              label,
              value: q.value,
              format: (v: number) => fmt.format(Math.round(v)),
              className: prior ? growthClass(pctChange(q.value, prior.value)) : 'baseline',
              title: `${label}: HK$${fmt.format(Math.round(q.value))} per visitor · ${q.data_type}. ${q.source_and_derivation_notes}`,
            };
          })}
        />
        {items.length < quarterlyRevenue.length && <p className="chart-note">Quarters without complete arrival data are omitted.</p>}
      </>
    )
    : empty('Quarterly average spend data is unavailable.');
  return (
    <GrowthCard
      title="Average spending per visitor"
      delay={490}
      chart={chart}
      metrics={[
        {
          label: 'YoY Growth',
          value: pctChange(currentH1, priorH1),
          note: currentH1 != null && priorH1 != null ? 'H1 2026 vs H1 2025' : 'H1 source data unavailable',
          digits: 2,
        },
        {
          label: 'QoQ Growth',
          value: current && priorQuarter ? pctChange(current.value, priorQuarter.value) : null,
          note: current && priorQuarter ? `Q${current.quarter} ${current.year} vs Q${priorQuarter.quarter} ${priorQuarter.year}` : 'Prior quarter unavailable',
          digits: 2,
        },
      ]}
    />
  );
}

export default function SummaryTab() {
  const year = '2026';
  const arrivals = h1Arrivals(year).reduce((sum, value) => sum + value, 0);
  const receipts = summary.h1[year].receipts_hkd_m;
  const averageSpend = h1AverageSpend(year);
  return (
    <section aria-label="Executive summary" className="exec-summary">
      <div className="summary-pairs">
        <div className="summary-pair">
          <KpiGauge label="Total visitors" actual={arrivals || null} target={summary.targets[year].arrivals / 2} format={fmtM} />
          <ArrivalsCard />
        </div>
        <div className="summary-pair">
          <KpiGauge label="Total spending" actual={receipts} target={summary.targets[year].receipts_hkd_m / 2} format={(v) => `HK$${(v / 1000).toFixed(1)}bn`} />
          <RevenueCard />
        </div>
        <div className="summary-pair">
          <KpiGauge label="Average spending per visitor" actual={averageSpend} target={4426} format={(v) => `HK$${fmt.format(Math.round(v))}`} />
          <AverageSpendCard />
        </div>
      </div>
    </section>
  );
}
