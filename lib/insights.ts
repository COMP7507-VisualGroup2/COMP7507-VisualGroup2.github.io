import { competitor, demographics, kpiSummary, strategy } from './data';
import { formatCompact, formatHkd, formatPct, monthLong } from './format';

/** Cross-tab headline facts, all computed from official data. */
export function headlineInsights() {
  const a = kpiSummary.arrivals;
  const s = kpiSummary.spending;
  const vt = demographics.visitor_type_annual;
  const sameDayShare = (year: string) => {
    const rows = vt.filter((r) => r.year === year);
    const total = rows.reduce((acc, r) => acc + r.arrivals, 0);
    const sd = rows.find((r) => r.visitor_type === 'Same-day')?.arrivals ?? 0;
    return total ? (sd / total) * 100 : null;
  };
  const sd24 = sameDayShare('2024');
  const sd25 = sameDayShare('2025');
  const hk25 = competitor.receipts.find((r) => r.country === 'HK' && r.year === '2025');
  const sg25 = competitor.receipts.find((r) => r.country === 'SG' && r.year === '2025');
  const latestPeer = [...competitor.monthly].reverse().find((m) => m.SG_recovery != null && m.JP_recovery != null);
  const base = strategy.scenarios.base;

  return {
    arrivals: `Arrivals reached ${formatCompact(a.ytd, 1)} in ${kpiSummary.period.ytd_label} (${formatPct(a.yoy_pct, 1, true)} YoY), ${formatPct(
      a.recovery_vs_2019_ytd_pct,
    )} of the 2019 level.`,
    mainland: `Mainland visitors make up ${formatPct(a.mainland_share_ytd_pct)} of arrivals${
      sd24 !== null && sd25 !== null ? `; same-day visitors rose from ${formatPct(sd24)} (2024) to ${formatPct(sd25)} (2025) of the total` : ''
    }.`,
    yield: `Spend per visitor fell from ${formatHkd(s.yield_per_visitor_hkd['2024'])} (2024) to ${formatHkd(
      s.yield_per_visitor_hkd['2025'],
    )} (2025) as volume grew faster than spending.`,
    competitor:
      hk25 && sg25 && latestPeer
        ? `Singapore earned ${formatHkd(sg25.per_visitor_hkd ?? 0)} per visitor in 2025 vs ${formatHkd(hk25.per_visitor_hkd ?? 0)} for Hong Kong; in ${monthLong(
            String(latestPeer.month),
          )} HK stood at ${formatPct(Number(latestPeer.HK_recovery))} of 2019 vs Singapore ${formatPct(Number(latestPeer.SG_recovery))} and Japan ${formatPct(
            Number(latestPeer.JP_recovery),
          )}.`
        : null,
    outlook: `Base-case 2027 projection: ${formatCompact(base.arrivals, 1)} arrivals and ${formatHkd(base.yield_hkd)} per visitor.`,
    sameDayShare2025: sd25,
    sg25,
    hk25,
    latestPeer,
  };
}
