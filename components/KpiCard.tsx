import type { ReactNode } from 'react';
import DataSourceBadge, { type BadgeKind } from './DataSourceBadge';
import { formatPct } from '@/lib/format';

interface SubMetric {
  label: string;
  value: string;
  hint?: string;
}

interface Props {
  title: string;
  value: string;
  caption: string;
  delta?: number | null;
  deltaLabel?: string;
  deltaUnit?: 'pct' | 'pp';
  accent: string;
  icon: ReactNode;
  metrics: SubMetric[];
  badge?: BadgeKind;
  footer?: ReactNode;
}

export default function KpiCard({
  title,
  value,
  caption,
  delta,
  deltaLabel,
  deltaUnit = 'pct',
  accent,
  icon,
  metrics,
  badge = 'official',
  footer,
}: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-canvas p-4 shadow-card sm:p-5">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-canvas" style={{ background: accent }}>
            {icon}
          </span>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
        </div>
        <DataSourceBadge kind={badge} />
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
        <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
        {delta !== undefined && delta !== null && (
          <span
            className={`mb-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
              positive ? 'bg-brand-50 text-brand-800' : 'bg-red-50 text-accent-700'
            }`}
          >
            {positive ? '▲' : '▼'} {deltaUnit === 'pp' ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}pp` : formatPct(delta, 1, true)}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-slate-600">
        {caption}
        {deltaLabel && <span className="text-slate-500"> · {deltaLabel}</span>}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3">
        {metrics.map((m) => (
          <div key={m.label} className="min-w-0">
            <dt className="truncate text-[11px] text-slate-600">{m.label}</dt>
            <dd className="text-sm font-semibold text-slate-800">
              {m.value}
              {m.hint && <span className="ml-1 text-[11px] font-medium text-slate-500">{m.hint}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {footer && <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-600">{footer}</div>}
    </article>
  );
}
