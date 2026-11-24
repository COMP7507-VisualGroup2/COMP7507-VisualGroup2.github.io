import ContextMetric from './ContextMetric';
import { summary } from '@/lib/data';
import { formatCompact, formatHkd, pctChange } from '@/lib/format';
import { countrySameDayShare, marketH1, profileValue } from '@/lib/persona';
import type { Filters, Segment } from '@/lib/types';

type Metrics = { arrivals: number | null; spend: number | null; overnightShare: number | null; overnightSpend: number | null };
const empty: Metrics = { arrivals: null, spend: null, overnightShare: null, overnightSpend: null };

function metrics(year: '2025' | '2026', selected: string | undefined, origin: Segment | 'All'): Metrics {
  const period = year === '2026' ? '2026-H1' : '2025';
  const market = selected ? marketH1(period, selected) : undefined;
  const segments = origin === 'All' ? Object.values(summary.segments_h1[year]) : [summary.segments_h1[year][origin]];
  const arrivals = selected ? market?.arrivals ?? null : segments.reduce((sum, row) => sum + row.visitors, 0);
  const overnight = selected ? market?.overnight ?? null : segments.reduce((sum, row) => sum + row.overnight, 0);
  const suppliedSameDay = selected ? countrySameDayShare(year === '2026' ? '2026-H1' : '2025-H1', selected) : null;
  const areaName = selected === 'Chinese Mainland' ? 'Mainland China' : selected === 'Taiwan' ? 'Taiwan' : undefined;
  const areas = summary.area_h1.filter((row) => row.year === year && (selected ? row.area === areaName : origin === 'All' || row.segment === origin));
  const complete = areas.length > 0 && areas.every((row) => row.overnight_visitors !== null && row.arrivals >= row.overnight_visitors);
  const areaArrivals = areas.reduce((sum, row) => sum + row.arrivals, 0);
  const areaOvernight = complete ? areas.reduce((sum, row) => sum + (row.overnight_visitors ?? 0), 0) : 0;
  const spend = areas.reduce((sum, row) => sum + row.spend_hkd_m, 0);
  const overnightSpend = areas.reduce((sum, row) => sum + row.overnight_spend_hkd_m, 0);
  const suppliedOvernightSpend = selected
    ? profileValue(period, selected, year === '2026' ? 'per_capita_overnight_hkd' : 'per_capita_overnight_h1_hkd')
    : null;
  return {
    arrivals,
    spend: areaArrivals > 0 ? spend * 1e6 / areaArrivals
      : selected ? profileValue(period, selected, year === '2026' ? 'per_capita_all_hkd' : 'per_capita_h1_all_hkd') : null,
    overnightShare: suppliedSameDay !== null ? 100 - suppliedSameDay : arrivals && overnight !== null ? overnight / arrivals * 100 : null,
    overnightSpend: suppliedOvernightSpend !== null ? suppliedOvernightSpend
      : areas.length === 1 ? areas[0].overnight_per_capita_hkd
      : complete && areaOvernight > 0 ? overnightSpend * 1e6 / areaOvernight
        : null,
  };
}

export default function CountryMetrics({ filters, selected }: { filters: Filters; selected?: string }) {
  const year = filters.start === '2026-01' && filters.end === '2026-06' ? '2026'
    : filters.start === '2025-01' && filters.end === '2025-06' ? '2025' : null;
  const current = year ? metrics(year, selected, filters.origin) : empty;
  const previous = year === '2026' ? metrics('2025', selected, filters.origin) : empty;
  const cards: { key: keyof Metrics; label: string; format: (value: number) => string }[] = [
    { key: 'arrivals', label: 'Total arrivals', format: (value) => formatCompact(value, 2) },
    { key: 'spend', label: 'Spend per visitor', format: formatHkd },
    { key: 'overnightShare', label: 'Overnight visitors share', format: (value) => `${value.toFixed(1)}%` },
    { key: 'overnightSpend', label: 'Overnight spend / visitor', format: formatHkd },
  ];
  return (
    <section aria-label="Key metrics" className="space-y-2">
      <h2 className="text-lg font-bold text-brand-900">Key metrics</h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, label, format }) => (
          <ContextMetric key={key} label={label} value={current[key] === null ? 'Unavailable' : format(current[key])}
            previous={previous[key] === null ? 'unavailable' : format(previous[key])}
            previousPeriod={year === '2025' ? 'H1 2024' : 'H1 2025'}
            change={current[key] !== null && previous[key] !== null ? pctChange(current[key], previous[key]) : null} />
        ))}
      </div>
      {selected && (
        <p className="text-[12px] text-slate-500">Overnight spend uses supplied country-profile values where available.</p>
      )}
    </section>
  );
}
