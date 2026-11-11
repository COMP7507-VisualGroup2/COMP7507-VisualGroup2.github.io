import { demographics, kpiSummary, strategy } from './data';
import { formatCompact, formatHkd, formatPct } from './format';
import { marketEconomics, totalArrivals } from './markets';

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
  const base = strategy.scenarios.base;
  const econ = marketEconomics('2026-H1');
  const total = totalArrivals('2026-H1');
  const mainland = econ.find((r) => r.origin === 'Mainland');
  const growers = econ.filter((r) => r.growth !== null).sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0));
  const topPerHead = [...econ].filter((r) => r.perCapita !== null).sort((a, b) => (b.perCapita ?? 0) - (a.perCapita ?? 0))[0];

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
    marketMix:
      mainland && total && mainland.spendShare !== null
        ? `Mainland is ${formatPct((mainland.arrivals / total) * 100, 0)} of Jan–Jun 2026 arrivals and an estimated ${formatPct(mainland.spendShare, 0)} of overnight spend across the 18 source markets${
            topPerHead ? `; ${topPerHead.market} visitors spend the most per trip (${formatHkd(topPerHead.perCapita ?? 0)})` : ''
          }.`
        : null,
    marketMovers: growers.length
      ? `Fastest-growing source market: ${growers[0].market} (${formatPct(growers[0].growth, 0, true)}); weakest: ${growers[growers.length - 1].market} (${formatPct(
          growers[growers.length - 1].growth,
          0,
          true,
        )}) vs Jan–Jun 2025.`
      : null,
    outlook: `Base-case 2027 projection: ${formatCompact(base.arrivals, 1)} arrivals and ${formatHkd(base.yield_hkd)} per visitor.`,
    sameDayShare2025: sd25,
  };
}
