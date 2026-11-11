'use client';

import { useRef, useState } from 'react';
import DataSourceBadge from './DataSourceBadge';
import StrategyPillars, { PILLAR_ACCENTS } from './StrategyPillars';
import { strategy } from '@/lib/data';
import { formatCompact, formatHkd, formatPct } from '@/lib/format';
import { ORIGIN_COLORS } from '@/lib/theme';
import type { MarketPlaybook, Origin } from '@/lib/types';

const PLAYBOOKS = strategy.market_playbooks ?? [];
const PILLARS = strategy.pillars;
const pillarIndex = (id: string) => PILLARS.findIndex((p) => p.id === id);
const ORIGIN_ORDER: Origin[] = ['Mainland', 'Short-haul', 'Long-haul', 'Emerging'];

/** Three strategy pillars plus per-market playbooks (chips on the pillars open a market). */
export default function OutlookStrategy() {
  const [market, setMarket] = useState(PLAYBOOKS[0]?.market ?? '');
  const panelRef = useRef<HTMLDivElement>(null);
  const open = (m: string) => {
    setMarket(m);
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const book = PLAYBOOKS.find((b) => b.market === market);

  return (
    <div className="space-y-6">
      <StrategyPillars onSelectMarket={open} activeMarket={market} />

      {PLAYBOOKS.length > 0 && (
        <section ref={panelRef} className="scroll-mt-28 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h3 className="text-lg font-bold text-brand-900">Market playbooks: the pillars, market by market</h3>
              <p className="mt-0.5 max-w-3xl text-sm text-slate-600">
                Key initiatives and 2027 KPI targets for each of the 18 HKTB source markets. Baselines come from HKTB data (Jan–Jun 2026); 2027 targets are
                proposed strategy goals, not forecasts.
              </p>
            </div>
            <DataSourceBadge kind="derived" label="Data-based baselines" />
          </div>

          <MarketPicker active={market} onSelect={setMarket} />
          {book && <PlaybookPanel book={book} />}
          <CoverageMatrix active={market} onSelect={setMarket} />
        </section>
      )}
    </div>
  );
}

function MarketPicker({ active, onSelect }: { active: string; onSelect: (m: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/80 bg-canvas p-3 shadow-card sm:grid-cols-[auto_1fr] sm:items-center sm:gap-x-4">
      {ORIGIN_ORDER.map((o) => {
        const books = PLAYBOOKS.filter((b) => b.origin === o);
        if (!books.length) return null;
        return (
          <div key={o} className="contents">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full" style={{ background: ORIGIN_COLORS[o] }} />
              {o}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {books.map((b) => (
                <button
                  key={b.market}
                  type="button"
                  onClick={() => onSelect(b.market)}
                  aria-pressed={active === b.market}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    active === b.market ? 'border-brand-800 bg-brand-800 text-canvas' : 'border-slate-200 bg-canvas text-slate-700 hover:border-brand-500'
                  }`}
                >
                  {b.market}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-2.5">
      <p className="truncate text-[11px] text-slate-600">{label}</p>
      <p className="text-base font-bold text-slate-900">{value}</p>
      {hint && <p className="truncate text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function PlaybookPanel({ book }: { book: MarketPlaybook }) {
  const f = book.facts;
  const lead = PILLARS[pillarIndex(book.primary)];
  const plays = [...book.plays].sort((a, b) => Number(b.pillar === book.primary) - Number(a.pillar === book.primary));

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-canvas p-4 shadow-card sm:p-5" style={{ borderTop: `4px solid ${ORIGIN_COLORS[book.origin]}` }}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">2027 market playbook</p>
          <h3 className="text-xl font-bold text-brand-900">{book.market}</h3>
          <p className="mt-1 text-sm text-slate-700">{book.headline}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-canvas" style={{ background: ORIGIN_COLORS[book.origin] }}>
            {book.origin}
          </span>
          {lead && (
            <span className="text-[11px] text-slate-600">
              Lead pillar: <strong style={{ color: PILLAR_ACCENTS[pillarIndex(lead.id)] }}>{lead.number}. {lead.title}</strong>
            </span>
          )}
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Fact
          label="Arrivals, Jan–Jun 2026"
          value={f.arrivals_h1_2026 !== null ? formatCompact(f.arrivals_h1_2026, f.arrivals_h1_2026 >= 1e6 ? 2 : 0) : '–'}
          hint={f.yoy_pct !== null ? `${formatPct(f.yoy_pct, 1, true)} YoY` : undefined}
        />
        <Fact label="Overnight share" value={f.overnight_pct !== null ? `${Math.round(f.overnight_pct)}%` : '–'} />
        <Fact label="Average nights" value={f.nights !== null ? f.nights.toFixed(1) : '–'} />
        <Fact label="Spend / overnight visitor" value={f.spend_hkd !== null ? formatHkd(f.spend_hkd) : '–'} />
        <Fact label="First-time visitors" value={f.first_timer_pct !== null ? `${Math.round(f.first_timer_pct)}%` : '–'} hint={f.mean_age ? `Mean age ${f.mean_age.toFixed(1)}` : undefined} />
        <Fact label="Top places" value={f.top_places[0] ?? '–'} hint={f.top_places.slice(1).join(' · ')} />
      </div>

      <div className={`mt-5 grid grid-cols-1 gap-4 ${plays.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
        {plays.map((play) => {
          const i = pillarIndex(play.pillar);
          const pillar = PILLARS[i];
          const accent = PILLAR_ACCENTS[i % PILLAR_ACCENTS.length];
          const isLead = play.pillar === book.primary;
          return (
            <div key={play.pillar} className="flex flex-col overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-start justify-between gap-2 px-3 py-2.5 text-canvas" style={{ background: accent }}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-canvas/80">Pillar {pillar?.number}</p>
                  <p className="text-sm font-semibold leading-snug">{pillar?.title}</p>
                </div>
                {isLead && <span className="shrink-0 rounded-full bg-canvas/20 px-2 py-0.5 text-[10px] font-bold uppercase">Lead</span>}
              </div>
              <div className="flex-1 space-y-3 p-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Key initiatives</p>
                  <ol className="space-y-1.5">
                    {play.initiatives.map((x, idx) => (
                      <li key={x} className="flex gap-2 text-sm leading-snug text-slate-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-canvas" style={{ background: accent }}>
                          {idx + 1}
                        </span>
                        {x}
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">2027 KPI targets</p>
                  <table className="w-full text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="pb-1 text-left font-medium">Metric</th>
                        <th className="pb-1 text-right font-medium">Baseline</th>
                        <th className="pb-1 text-right font-medium">2027</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {play.kpis.map((k) => (
                        <tr key={k.metric}>
                          <td className="py-1.5 pr-2 text-slate-700">{k.metric}</td>
                          <td className="py-1.5 text-right tabular-nums text-slate-600">{k.baseline}</td>
                          <td className="py-1.5 pl-2 text-right font-semibold tabular-nums" style={{ color: accent }}>
                            {k.target_2027}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-slate-600">
        Baselines: HKTB visitor arrival statistics (Jan–Jun 2026 vs Jan–Jun 2025) and HKTB Visitor Profile Report 2026 H1 (multi-destination share: 2025 full year,
        segment level). 2027 targets are proposed goals set relative to those baselines.
      </p>
    </article>
  );
}

function CoverageMatrix({ active, onSelect }: { active: string; onSelect: (m: string) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-canvas p-4 shadow-card sm:p-5">
      <h4 className="text-sm font-semibold text-slate-900">Pillar coverage by market</h4>
      <p className="mt-0.5 text-xs text-slate-600">● lead pillar · ○ supporting pillar. Click a market to open its playbook.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-600">
              <th className="py-1.5 text-left font-medium">Market</th>
              {PILLARS.map((p, i) => (
                <th key={p.id} className="px-2 py-1.5 text-center font-medium" style={{ color: PILLAR_ACCENTS[i] }}>
                  {p.number}. {p.title.split(/[&:]/)[0].trim()}
                </th>
              ))}
              <th className="py-1.5 text-right font-medium">Jan–Jun 2026 YoY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PLAYBOOKS.map((b) => (
              <tr
                key={b.market}
                onClick={() => onSelect(b.market)}
                className={`cursor-pointer hover:bg-slate-50 ${active === b.market ? 'bg-brand-50' : ''}`}
              >
                <td className="py-1.5 font-medium text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: ORIGIN_COLORS[b.origin] }} />
                    {b.market}
                  </span>
                </td>
                {PILLARS.map((p, i) => {
                  const has = b.plays.some((x) => x.pillar === p.id);
                  return (
                    <td key={p.id} className="px-2 py-1.5 text-center text-sm" style={{ color: PILLAR_ACCENTS[i] }}>
                      {b.primary === p.id ? '●' : has ? '○' : ''}
                    </td>
                  );
                })}
                <td className={`py-1.5 text-right tabular-nums ${(b.facts.yoy_pct ?? 0) < 0 ? 'text-accent-700' : 'text-slate-700'}`}>
                  {b.facts.yoy_pct !== null ? formatPct(b.facts.yoy_pct, 1, true) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
