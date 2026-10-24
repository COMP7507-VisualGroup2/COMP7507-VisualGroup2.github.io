import type { Metadata } from 'next';
import Link from 'next/link';
import DataSourceBadge from '@/components/DataSourceBadge';
import { dataMeta, kpiSummary, strategy } from '@/lib/data';
import { formatDate, formatNumber, monthLong } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Methodology & Sources',
};

const FORMULAS = [
  {
    name: 'YoY Arrival Growth %',
    formula: '(Arrivals₂₀₂₆ − Arrivals₂₀₂₅) ÷ Arrivals₂₀₂₅ × 100',
    note: 'Calculated over matching months only (e.g. Jan–Aug 2026 vs Jan–Aug 2025), so partial years are like-for-like.',
  },
  {
    name: 'Hotel RevPAR (HKD)',
    formula: 'Occupancy Rate (%) × Average Daily Rate (HKD)',
    note: 'Computed monthly; period values are simple averages of monthly RevPAR.',
  },
  {
    name: 'Yield per Visitor (HKD)',
    formula: 'Total Tourism Consumption Expenditure ÷ Total Visitor Arrivals',
    note: 'Uses C&SD destination consumption expenditure (overnight + same-day) and C&SD visitor arrivals.',
  },
  {
    name: 'Overnight / same-day split',
    formula: 'Visitorsᵣ,ₜ = Spendᵣ,ₜ ÷ Per-capita spendᵣ,ₜ ; Shareᵣ = Overnightᵣ ÷ (Overnightᵣ + Same-dayᵣ)',
    note: 'Annual shares per source region (C&SD 650-80003/04) are applied to official monthly arrivals by region. 2026 uses 2025 ratios and per-capita rates (badged as Derived).',
  },
  {
    name: 'Receipts per visitor (competitors)',
    formula: 'Tourism receipts (local currency) × HKMA annual-average HKD rate ÷ International visitor arrivals',
    note: 'Singapore receipts are STB quarterly year-to-date figures converted to quarters. HK uses C&SD destination consumption expenditure.',
  },
  {
    name: 'Recovery vs 2019',
    formula: 'Arrivalsₘ ÷ Arrivals₂₀₁₉,ₘ × 100',
    note: 'Same calendar month in 2019 used as baseline, consistent with UN Tourism recovery reporting.',
  },
];

export default function MethodologyPage() {
  const { model } = strategy;
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/" className="text-sm font-semibold text-brand-800 hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">Methodology & data sources</h1>
      <p className="mt-2 text-sm text-slate-600">
        Coverage {monthLong(dataMeta.coverage.start)} – {monthLong(dataMeta.coverage.end)} · generated {formatDate(dataMeta.generated_at)} by{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">scripts/process_tourism_data.py</code> in{' '}
        <strong>{dataMeta.mode}</strong> mode.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Data sources & provenance</h2>
        <p className="mt-1 text-sm text-slate-600">
          <strong>Live</strong> sources are fetched from official APIs on every build and snapshotted to <code className="text-xs">data/raw/</code>.{' '}
          No made-up or indicative values are used. Items without an open source are listed under <a href="#pending" className="font-semibold text-brand-800 underline">Data pending</a>.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-canvas shadow-card">
          <ul className="divide-y divide-slate-100">
            {dataMeta.sources.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-800 hover:underline">
                    {s.name}
                  </a>
                  {s.note && <p className="mt-0.5 text-xs text-slate-600">{s.note}</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      s.mode === 'live' ? 'bg-brand-50 text-brand-800' : 'bg-mist text-slate-700'
                    }`}
                  >
                    {s.mode}
                  </span>
                  <DataSourceBadge kind={s.mode === 'manual' ? 'manual' : 'official'} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pending" className="mt-8 scroll-mt-20">
        <h2 className="text-lg font-semibold text-slate-900">Data pending (no open data source)</h2>
        <p className="mt-1 text-sm text-slate-600">
          These proposal items aren&apos;t published as open data. Each has a CSV template in <code className="text-xs">data/manual/</code>: add rows
          from the published report (including a <code className="text-xs">source</code> column), re-run the pipeline, and the chart appears with a
          &quot;Manual input&quot; badge.
        </p>
        {dataMeta.pending.length ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-canvas shadow-card">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-left font-medium">Tab</th>
                  <th className="px-3 py-2 text-left font-medium">Where published</th>
                  <th className="px-3 py-2 text-left font-medium">Template</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataMeta.pending.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-semibold text-slate-800">{p.item}</td>
                    <td className="px-3 py-2 text-slate-700">{p.tab}</td>
                    <td className="px-3 py-2 text-slate-700">{p.source}</td>
                    <td className="px-3 py-2">
                      <code className="text-[11px]">{p.file}</code>
                      <p className="text-[10px] text-slate-600">{p.columns.join(', ')}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-brand-800">All proposal items have data.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Key metrics (Python equivalents of DAX measures)</h2>
        <div className="mt-4 grid gap-3">
          {FORMULAS.map((f) => (
            <div key={f.name} className="rounded-xl border border-slate-200 bg-canvas p-4">
              <p className="text-sm font-semibold text-slate-900">{f.name}</p>
              <p className="mt-1 font-mono text-xs text-brand-800">{f.formula}</p>
              <p className="mt-1 text-xs text-slate-600">{f.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">2027 forecast model</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>
            <strong>{model.method}.</strong> Seasonal indices per calendar month are derived from the full years 2024–2025 (ratio of each month
            to that year&apos;s monthly mean). The in-scope series ({model.training_window}) is de-seasonalised and fitted with ordinary least
            squares; projections are re-seasonalised. The {Math.round(model.confidence_level * 100)}% band is the OLS prediction interval
            (±1.96 σ · √(1 + 1/n + (t − t̄)² / Sxx)).
          </p>
          <p>
            Yield per visitor for 2027 applies half of the average historical yield drift (damped trend). Scenarios adjust the base case by
            the volume and yield factors shown below.
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Observations', `${model.observations} months`],
            ['Trend', `${formatNumber(model.slope_per_month)} / month`],
            ['R² (de-seasonalised)', model.r_squared.toFixed(3)],
            ['Residual σ', formatNumber(model.sigma)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-canvas p-3 ring-1 ring-slate-200">
              <dt className="text-[11px] text-slate-600">{k}</dt>
              <dd className="text-sm font-semibold text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-slate-200">
          <table className="w-full bg-canvas text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Scenario</th>
                <th className="px-3 py-2 text-right font-medium">Volume adj.</th>
                <th className="px-3 py-2 text-right font-medium">Yield adj.</th>
                <th className="px-3 py-2 text-left font-medium">Drivers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.values(strategy.scenarios).map((s) => (
                <tr key={s.label}>
                  <td className="px-3 py-2 font-semibold text-slate-800">{s.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.arrivals_adj_pct > 0 ? '+' : ''}{s.arrivals_adj_pct}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.yield_adj_pct > 0 ? '+' : ''}{s.yield_adj_pct}%</td>
                  <td className="px-3 py-2 text-slate-600">{s.drivers.join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Seasonal index:{' '}
          {Object.entries(model.seasonal_index)
            .map(([m, v]) => `${monthLong(`2000-${m}`).slice(0, 3)} ${v.toFixed(2)}`)
            .join(' · ')}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Segment definitions</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li><strong>Mainland:</strong> Chinese Mainland.</li>
          <li><strong>Short-haul:</strong> Macao, Taiwan, North Asia, South & Southeast Asia.</li>
          <li><strong>Long-haul:</strong> The Americas, Europe, Australia, New Zealand & South Pacific.</li>
          <li><strong>Emerging:</strong> Middle East, Africa and not-identified.</li>
          <li>
            <strong>Ports:</strong> ImmD control points grouped into HKIA Airport, West Kowloon HSR, HZMB, Land Control Points (Lo Wu, Lok Ma
            Chau, Shenzhen Bay, Heung Yuen Wai, etc.) and Ferries & Cruise. ImmD counts visitor entries (trips), which differ slightly from
            C&SD visitor arrivals.
          </li>
        </ul>
      </section>
    </div>
  );
}
