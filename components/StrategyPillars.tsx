import { strategy } from '@/lib/data';
import { ORIGIN_COLORS } from '@/lib/theme';
import type { Pillar } from '@/lib/types';

export const PILLAR_ACCENTS = ['#005F73', '#CA6702', '#0A9396'];

export default function StrategyPillars({ onSelectMarket, activeMarket }: { onSelectMarket?: (m: string) => void; activeMarket?: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {strategy.pillars.map((p, i) => (
        <PillarCard key={p.id} pillar={p} accent={PILLAR_ACCENTS[i % PILLAR_ACCENTS.length]} onSelectMarket={onSelectMarket} activeMarket={activeMarket} />
      ))}
    </div>
  );
}

function PillarCard({
  pillar,
  accent,
  onSelectMarket,
  activeMarket,
}: {
  pillar: Pillar;
  accent: string;
  onSelectMarket?: (m: string) => void;
  activeMarket?: string;
}) {
  const playbooks = strategy.market_playbooks ?? [];
  const focus = pillar.focus_markets ?? [];
  const supporting = playbooks.filter((b) => !focus.includes(b.market) && b.plays.some((p) => p.pillar === pillar.id)).map((b) => b.market);
  const chip = (m: string, lead: boolean) => {
    const origin = playbooks.find((b) => b.market === m)?.origin;
    return (
      <button
        key={m}
        type="button"
        onClick={() => onSelectMarket?.(m)}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition hover:border-slate-400 ${
          activeMarket === m ? 'border-slate-800 bg-slate-800 text-canvas' : lead ? 'border-slate-300 bg-canvas text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
        title={`Open the ${m} playbook`}
      >
        {origin && <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORIGIN_COLORS[origin] }} />}
        {m}
      </button>
    );
  };

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200/80 bg-canvas shadow-card">
      <header className="rounded-t-2xl p-4 text-canvas sm:p-5" style={{ background: accent }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-canvas/80">Pillar {pillar.number}</p>
        <h3 className="mt-1 text-base font-bold leading-snug">{pillar.title}</h3>
        <p className="mt-1 text-xs text-canvas/85">{pillar.tagline}</p>
      </header>

      <div className="flex-1 space-y-1 p-4 sm:p-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Why it matters (data-driven)</p>
        <ul className="mb-3 space-y-2">
          {pillar.rationale.map((r) => (
            <li key={r} className="flex gap-2 text-sm leading-snug text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
              {r}
            </li>
          ))}
        </ul>

        {(focus.length > 0 || supporting.length > 0) && (
          <div className="mb-3 rounded-xl bg-slate-50 p-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lead markets</p>
            <div className="flex flex-wrap gap-1.5">{focus.map((m) => chip(m, true))}</div>
            {supporting.length > 0 && (
              <>
                <p className="mb-1.5 mt-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Also supports</p>
                <div className="flex flex-wrap gap-1.5">{supporting.map((m) => chip(m, false))}</div>
              </>
            )}
          </div>
        )}

        <Accordion title="Key initiatives (all markets)" defaultOpen>
          <ol className="space-y-2">
            {pillar.initiatives.map((x, idx) => (
              <li key={x} className="flex gap-2 text-sm leading-snug text-slate-700">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-canvas"
                  style={{ background: accent }}
                >
                  {idx + 1}
                </span>
                {x}
              </li>
            ))}
          </ol>
        </Accordion>

        <Accordion title="2027 KPI targets (all markets)">
          <table className="w-full text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-1 text-left font-medium">Metric</th>
                <th className="pb-1 text-right font-medium">Baseline</th>
                <th className="pb-1 text-right font-medium">2027</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pillar.kpis.map((k) => (
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
        </Accordion>

        <Accordion title="Roadmap">
          <ol className="relative ml-1 space-y-3 border-l border-slate-200 pl-4">
            {pillar.timeline.map((t) => (
              <li key={t.phase} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-canvas" style={{ background: accent }} />
                <p className="text-xs font-semibold text-slate-800">{t.phase}</p>
                <p className="text-xs leading-snug text-slate-600">{t.action}</p>
              </li>
            ))}
          </ol>
        </Accordion>
      </div>
    </article>
  );
}

function Accordion({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details className="group border-t border-slate-100 py-2" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-sm font-semibold text-slate-800 marker:hidden [&::-webkit-details-marker]:hidden">
        {title}
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-500 transition group-open:rotate-180" aria-hidden>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}
