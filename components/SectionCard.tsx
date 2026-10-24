import type { ReactNode } from 'react';
import DataSourceBadge, { type BadgeKind } from './DataSourceBadge';

interface Props {
  title: string;
  subtitle?: string;
  badge?: BadgeKind;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  footnote?: ReactNode;
}

export default function SectionCard({ title, subtitle, badge, actions, children, className = '', footnote }: Props) {
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200/80 bg-canvas p-4 shadow-card sm:p-5 ${className}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{title}</h3>
            {badge && <DataSourceBadge kind={badge} />}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
      {footnote && <p className="mt-3 text-[11px] leading-relaxed text-slate-600">{footnote}</p>}
    </section>
  );
}

export function PageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-brand-900 sm:text-2xl">{title}</h2>
        <p className="mt-0.5 max-w-3xl text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'sm',
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  size?: 'xs' | 'sm';
}) {
  return (
    <div className="inline-flex rounded-lg bg-mist p-0.5" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-md font-medium transition ${size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} ${
            value === o.value ? 'bg-canvas text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Insight({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'accent' | 'steel' }) {
  const styles = {
    brand: 'border-brand-500 bg-brand-50',
    accent: 'border-accent-500 bg-accent-50',
    steel: 'border-slate-400 bg-slate-50',
  }[tone];
  return <div className={`rounded-r-lg border-l-4 px-3 py-2 text-sm leading-snug text-slate-800 ${styles}`}>{children}</div>;
}
