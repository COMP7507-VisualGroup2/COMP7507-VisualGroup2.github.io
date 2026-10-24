'use client';

import { useMemo } from 'react';
import KpiCard from './KpiCard';
import { demographics, kpiSummary, revenue } from '@/lib/data';
import { describeSegment, hotelAverages, inRange, isSegmented, selectArrivals, shiftYear, sumBy } from '@/lib/filters';
import { formatCompact, formatHkd, formatHkdMillions, formatNumber, formatPct, monthLong, pctChange } from '@/lib/format';
import { COLORS } from '@/lib/theme';
import type { Filters } from '@/lib/types';

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

export default function KpiSummary({ filters }: { filters: Filters }) {
  const k = useMemo(() => {
    const current = selectArrivals(demographics.arrivals, filters);
    const months = new Set(current.map((r) => r.month));
    // Compare only against months that also have data in the current selection
    const prior = selectArrivals(demographics.arrivals, filters, -1).filter((r) => months.has(shiftYear(r.month, 1)));
    const arrivals = sumBy(current, (r) => r.arrivals);
    const arrivalsPrev = sumBy(prior, (r) => r.arrivals);
    const spend = sumBy(current, (r) => r.spend_hkd_m);
    const base2019 = isSegmented(filters)
      ? 0
      : sumBy(kpiSummary.monthly.filter((m) => months.has(m.month)), (m) => m.baseline_2019 ?? 0);
    const sorted = [...months].sort();
    const hotelNow = revenue.hotel_monthly.filter((h) => inRange(h.month, filters));
    return {
      range: sorted.length ? `${monthLong(sorted[0])} – ${monthLong(sorted[sorted.length - 1])}` : 'No data in range',
      arrivals,
      arrivalsYoy: arrivalsPrev ? pctChange(arrivals, arrivalsPrev) : null,
      recovery: base2019 ? (arrivals / base2019) * 100 : null,
      overnightShare: arrivals ? (sumBy(current.filter((r) => r.visitor_type === 'Overnight'), (r) => r.arrivals) / arrivals) * 100 : 0,
      spend,
      yieldPerVisitor: arrivals ? (spend * 1e6) / arrivals : 0,
      hotel: hotelAverages(hotelNow),
    };
  }, [filters]);

  const los = kpiSummary.length_of_stay;
  const losNow = los[los.length - 1];
  const losPrev = los[los.length - 2];
  const los2019 = los.find((l) => l.year === '2019');
  const pc = kpiSummary.spending.per_capita_hkd;
  const pcYear = Object.keys(pc).sort().slice(-1)[0];
  const econ = kpiSummary.tourism_economy;
  const accom = kpiSummary.hotel.accommodation_bri_latest;
  const rooms = kpiSummary.hotel.rooms_pipeline[0];
  const econ2019 = econ.history.find((h) => h.year === '2019');

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      <KpiCard
        title="Visitor arrivals"
        value={formatCompact(k.arrivals, 2)}
        caption={k.range}
        delta={k.arrivalsYoy}
        deltaLabel="vs same months prior year"
        accent={COLORS.brandDeep}
        icon={icon('M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2c0-.66.13-1.28.36-1.86m0 0a5 5 0 019.28 0M15 7a3 3 0 11-6 0 3 3 0 016 0z')}
        metrics={[
          { label: 'Segment', value: describeSegment(filters) },
          { label: 'Recovery vs 2019', value: k.recovery ? formatPct(k.recovery) : '–' },
          { label: 'Overnight share', value: formatPct(k.overnightShare), hint: 'derived' },
          { label: 'FY 2025', value: formatCompact(kpiSummary.arrivals.full_year['2025'], 1), hint: formatPct(kpiSummary.arrivals.full_year_yoy_pct, 1, true) },
        ]}
      />
      <KpiCard
        title="Average length of stay"
        value={losNow ? `${losNow.nights.toFixed(1)} nights` : '–'}
        caption={`Overnight visitors · ${losNow?.year ?? ''}`}
        delta={losNow && losPrev ? pctChange(losNow.nights, losPrev.nights) : null}
        deltaLabel={losPrev ? `vs ${losPrev.year}` : undefined}
        accent={COLORS.steelDeep}
        icon={icon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')}
        metrics={los
          .slice(-4)
          .reverse()
          .map((l) => ({ label: l.year, value: `${l.nights.toFixed(1)} nights` }))}
        footer={los2019 ? `Pre-pandemic (2019): ${los2019.nights.toFixed(1)} nights · C&SD 650-80005 (annual)` : undefined}
      />
      <KpiCard
        title="Per capita spending"
        value={formatHkd(k.yieldPerVisitor)}
        caption={`Spend per visitor · ${k.range}`}
        accent={COLORS.accentDeep}
        badge="derived"
        icon={icon('M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8c1.11 0 2.08.4 2.6 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.4-2.6-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z')}
        metrics={[
          { label: `Overnight (${pcYear})`, value: formatHkd(pc[pcYear].Overnight) },
          { label: `Same-day (${pcYear})`, value: formatHkd(pc[pcYear]['Same-day']) },
          { label: 'Spend in period', value: formatHkdMillions(k.spend) },
          { label: `FY ${pcYear} total`, value: formatHkdMillions(kpiSummary.spending.annual_hkd_m[pcYear]) },
        ]}
        footer="Monthly spend = official arrivals × C&SD per-capita spend by market; 2026 uses 2025 rates."
      />
      {k.hotel ? (
        <KpiCard
          title="Hotel occupancy"
          value={formatPct(k.hotel.occupancy)}
          caption={`Average · ${k.range}`}
          accent={COLORS.brand}
          badge="manual"
          icon={icon('M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1')}
          metrics={[
            { label: 'Average daily rate', value: formatHkd(k.hotel.adr) },
            { label: 'RevPAR', value: formatHkd(k.hotel.revpar) },
            { label: 'Vacancy gap', value: formatPct(100 - k.hotel.occupancy) },
            { label: 'Room supply 2027', value: rooms ? formatNumber(rooms.rooms) : '–' },
          ]}
        />
      ) : (
        <KpiCard
          title="Hotel sector"
          value={accom ? formatPct(accom.yoy_pct, 1, true) : '–'}
          caption={`Accommodation receipts YoY · ${accom?.quarter.replace('-', ' ') ?? ''}`}
          accent={COLORS.brandDeep}
          icon={icon('M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1')}
          metrics={[
            { label: 'Accommodation BRI', value: accom ? accom.index.toFixed(1) : '–', hint: '2015 = 100' },
            { label: `Room supply ${rooms?.year ?? ''}`, value: rooms ? formatNumber(rooms.rooms) : '–' },
            { label: 'Occupancy rate', value: 'Pending' },
            { label: 'ADR / RevPAR', value: 'Pending' },
          ]}
          footer="Hotel occupancy & ADR: data pending (HKTB report has no open API)."
        />
      )}
      <KpiCard
        title="Tourism in the economy"
        value={econ.gdp_share_pct !== null ? formatPct(econ.gdp_share_pct) : '–'}
        caption={`Share of GDP (value added) · ${econ.year ?? ''}`}
        delta={econ.gdp_share_pct !== null && econ.prev_gdp_share_pct !== null ? econ.gdp_share_pct - econ.prev_gdp_share_pct : null}
        deltaUnit="pp"
        deltaLabel={econ.prev_year ? `vs ${econ.prev_year}` : undefined}
        accent={COLORS.accent}
        icon={icon('M21 13.26A23.93 23.93 0 0112 15c-3.18 0-6.22-.62-9-1.74M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z')}
        metrics={[
          { label: 'Employment', value: econ.employment ? formatCompact(econ.employment, 1) : '–', hint: econ.employment_share_pct ? `${econ.employment_share_pct}% of jobs` : undefined },
          { label: 'Value added', value: econ.value_added_hkd_m ? formatHkdMillions(econ.value_added_hkd_m) : '–' },
          { label: 'Jobs YoY', value: econ.employment && econ.prev_employment ? formatPct(pctChange(econ.employment, econ.prev_employment), 1, true) : '–' },
          { label: '2019 GDP share', value: econ2019?.gdp_share_pct != null ? formatPct(econ2019.gdp_share_pct) : '–' },
        ]}
        footer="C&SD 655-82101 Four Key Industries (annual, latest release)."
      />
    </div>
  );
}
