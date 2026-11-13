'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import SectionCard from './SectionCard';
import { AnimatedBar, AnimatedNumber } from './motion';
import { formatCompact, formatPct } from '@/lib/format';
import { marketEconomics, totalArrivals } from '@/lib/markets';
import { ORIGIN_COLORS } from '@/lib/theme';
import { marketInFilter, shortMarket } from '@/lib/persona';
import type { Filters } from '@/lib/types';

const PERIOD = '2026-H1' as const;
const compact = (n: number) => formatCompact(n, n >= 1e6 ? 2 : 0);

function YoY({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">–</span>;
  return (
    <span className={`tabular-nums font-semibold ${value < 0 ? 'text-accent-700' : 'text-brand-700'}`}>
      <AnimatedNumber value={value} format={(v) => formatPct(v, 0, true)} />
    </span>
  );
}

/** Summary panel: concentration and the biggest movers among the 18 HKTB source markets. */
export default function MarketMovers({ filters }: { filters: Filters }) {
  const d = useMemo(() => {
    const econ = marketEconomics(PERIOD);
    const total = totalArrivals(PERIOD) ?? econ.reduce((a, r) => a + r.arrivals, 0);
    const byArrivals = [...econ].sort((a, b) => b.arrivals - a.arrivals);
    const visible = byArrivals.filter((r) => marketInFilter(r.market, filters));
    const growth = econ.filter((r) => r.growth !== null);
    const mainland = econ.find((r) => r.origin === 'Mainland');
    return {
      total,
      top: visible.slice(0, 6),
      gainers: [...growth].sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0)).slice(0, 3),
      decliners: [...growth].filter((r) => (r.growth ?? 0) < 0).sort((a, b) => (a.growth ?? 0) - (b.growth ?? 0)).slice(0, 3),
      mainlandShare: mainland ? (mainland.arrivals / total) * 100 : null,
      top3Share: (byArrivals.slice(0, 3).reduce((a, r) => a + r.arrivals, 0) / total) * 100,
      mainlandSpendShare: mainland?.spendShare ?? null,
    };
  }, [filters]);

  const max = d.top[0]?.arrivals ?? 1;
  const chip = (label: string, value: number | null, hint: string) => (
    <div className="rounded-xl bg-slate-50 p-2.5">
      <p className="text-[11px] text-slate-600">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value !== null ? <AnimatedNumber value={value} format={(v) => `${Math.round(v)}%`} /> : '–'}</p>
      <p className="text-[10px] text-slate-500">{hint}</p>
    </div>
  );

  return (
    <SectionCard
      title="Source markets: who is driving arrivals"
      subtitle="HKTB nationality statistics · Jan–Jun 2026 vs Jan–Jun 2025"
      badge="manual"
      actions={
        <Link href="/visitor-persona/" className="text-xs font-semibold text-brand-800 hover:underline">
          Explore all 18 markets →
        </Link>
      }
      footnote="Shares are of all arrivals. Estimated spend share = overnight arrivals × HKTB spend per overnight visitor, among the 18 markets (derived; same-day spend excluded)."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <div className="grid grid-cols-3 gap-2">
            {chip('Mainland share', d.mainlandShare, 'of all arrivals')}
            {chip('Top 3 markets', d.top3Share, 'of all arrivals')}
            {chip('Mainland est. spend', d.mainlandSpendShare, 'of 18-market overnight spend')}
          </div>
          <ul className="mt-4 space-y-2">
            {d.top.map((r) => (
              <li key={r.market} className="text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                    <span className="h-2 w-2 rounded-full" style={{ background: ORIGIN_COLORS[r.origin] }} />
                    {shortMarket(r.market)}
                  </span>
                  <span className="tabular-nums text-slate-600">
                    <AnimatedNumber value={r.arrivals} format={compact} /> · {formatPct((r.arrivals / d.total) * 100, 1)} · <YoY value={r.growth} />
                  </span>
                </div>
                <div className="mt-0.5 h-2 rounded-full bg-slate-100">
                  <AnimatedBar percent={(r.arrivals / max) * 100} className="h-2 rounded-full" style={{ background: ORIGIN_COLORS[r.origin] }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {[
            { title: 'Fastest growing', rows: d.gainers },
            { title: 'Declining', rows: d.decliners },
          ].map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 text-xs font-semibold text-slate-800">{g.title}</p>
              {g.rows.length ? (
                <ul className="space-y-1">
                  {g.rows.map((r) => (
                    <li key={r.market} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                        <span className="h-2 w-2 rounded-full" style={{ background: ORIGIN_COLORS[r.origin] }} />
                        {shortMarket(r.market)}
                      </span>
                      <span className="tabular-nums text-slate-600">
                        {r.arrivalsChange !== null && `${r.arrivalsChange >= 0 ? '+' : '−'}${formatCompact(Math.abs(r.arrivalsChange), 0)} · `}
                        <YoY value={r.growth} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No markets declined.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
