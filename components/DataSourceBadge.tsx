export type BadgeKind = 'official' | 'derived' | 'manual';

const STYLES: Record<BadgeKind, { label: string; title: string; className: string }> = {
  official: { label: 'Official', title: 'Published figures from the supplied HKTB / government files', className: 'official' },
  derived: { label: 'Derived', title: 'Calculated from the published figures', className: 'derived' },
  manual: { label: 'HKTB profile', title: 'HKTB Visitor Profile Report, transcribed to data/manual/visitor_profile.csv', className: '' },
};

/** v3 "analysis badge" pill. */
export default function DataSourceBadge({ kind = 'official', label }: { kind?: BadgeKind; label?: string }) {
  const s = STYLES[kind];
  return (
    <span title={s.title} className={`analysis-badge ${s.className} whitespace-nowrap`}>
      {label ?? s.label}
    </span>
  );
}
