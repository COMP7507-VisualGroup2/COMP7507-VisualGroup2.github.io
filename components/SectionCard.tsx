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

/** v3 card: white panel, Manrope title, analysis badge, small grey notes. */
export default function SectionCard({ title, subtitle, badge, actions, children, className = '', footnote }: Props) {
  return (
    <section className={`card chart-card min-w-0 ${className}`}>
      <header className="card-header flex-wrap">
        <div className="min-w-0">
          <h2>{title}</h2>
          <div className="flex flex-wrap items-center gap-x-2">
            {badge && <DataSourceBadge kind={badge} />}
            {subtitle && <p className="mt-[7px] text-[11px] text-[#89949c]">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </header>
      <div className="mt-3">{children}</div>
      {footnote && <p className="chart-note">{footnote}</p>}
    </section>
  );
}

/** Numbered v3 section title. */
export function SubHeading({ n, title, children }: { n: number | string; title: string; children?: ReactNode }) {
  return (
    <div className="ref-section-title flex-wrap justify-between">
      <div className="flex items-center gap-[9px]">
        <span>{n}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

/** v3 intro banner (tinted panel with a title, explanation and a right-hand note). */
export function Banner({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="ref-promo flex-wrap">
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
      {aside && <strong>{aside}</strong>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  size?: 'xs' | 'sm';
}) {
  return (
    <div className="segmented-control !mt-0" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value} className={`segment !text-[11px] ${value === o.value ? 'active' : ''}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Insight({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'accent' | 'steel' }) {
  const border = { brand: '#0a9396', accent: '#ffb800', steel: '#94a3b8' }[tone];
  return (
    <div className="rounded-r-[5px] border-l-2 bg-[#fafbfc] px-3 py-2 text-[12px] leading-snug text-[#405461]" style={{ borderColor: border }}>
      {children}
    </div>
  );
}
