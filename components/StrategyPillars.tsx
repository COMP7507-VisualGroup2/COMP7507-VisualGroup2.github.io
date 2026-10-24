import { strategy } from '@/lib/data';
import type { Pillar } from '@/lib/types';

const ACCENTS = ['#005F73', '#CA6702', '#0A9396'];

export default function StrategyPillars() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {strategy.pillars.map((p, i) => (
        <PillarCard key={p.id} pillar={p} accent={ACCENTS[i % ACCENTS.length]} />
      ))}
    </div>
  );
}

function PillarCard({ pillar, accent }: { pillar: Pillar; accent: string }) {
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

        <Accordion title="Key initiatives" defaultOpen>
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

        <Accordion title="2027 KPI targets">
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
