export type BadgeKind = 'official' | 'derived' | 'manual' | 'pending';

const STYLES: Record<BadgeKind, { label: string; title: string; pill: string; dot: string }> = {
  official: {
    label: 'Official',
    title: 'Official open data (C&SD, DATA.GOV.HK, HKMA, STB, JNTO, World Bank)',
    pill: 'bg-brand-50 text-brand-800',
    dot: 'bg-brand-500',
  },
  derived: {
    label: 'Derived',
    title: 'Calculated from official data (see Methodology)',
    pill: 'bg-mist text-slate-700',
    dot: 'bg-slate-400',
  },
  manual: {
    label: 'Manual input',
    title: 'Supplied via data/manual/*.csv from a published report',
    pill: 'bg-blush-100 text-blush-700',
    dot: 'bg-blush-500',
  },
  pending: {
    label: 'Data pending',
    title: 'No open data source - see Methodology for how to supply it',
    pill: 'bg-accent-50 text-accent-600',
    dot: 'bg-accent-500',
  },
};

export default function DataSourceBadge({ kind = 'official', label }: { kind?: BadgeKind; label?: string }) {
  const s = STYLES[kind];
  return (
    <span
      title={s.title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label ?? s.label}
    </span>
  );
}
