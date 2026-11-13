import { summary } from './data';
import { MARKETS, marketH1, profileValue } from './persona';
import type { Origin, ProfilePeriod } from './types';

/**
 * Market-level economics for the 18 HKTB source markets. Estimated overnight spend (HK$ m) =
 * Jan-Jun overnight arrivals (HKTB arrival statistics) x spend per overnight visitor (HKTB Visitor Profile).
 * Same-day spend is not published by market, so it is excluded.
 */
export interface MarketEcon {
  market: string;
  origin: Origin;
  arrivals: number;
  overnight: number;
  growth: number | null;
  arrivalsChange: number | null;
  perCapita: number | null;
  perCapitaPrev: number | null;
  spend: number | null;
  spendPrev: number | null;
  overnightShare: number;
  spendShare: number | null;
  /** Change in estimated spend from more or fewer overnight visitors, at last year's spend per head. */
  volumeEffect: number | null;
  /** Change in estimated spend from a different spend per head, on this year's overnight visitors. */
  yieldEffect: number | null;
}

const PC = 'per_capita_overnight_hkd';

export function marketEconomics(period: ProfilePeriod): MarketEcon[] {
  const comparable = period === '2026-H1';
  const rows = MARKETS.flatMap((m) => {
    const now = marketH1(period, m.market);
    if (!now) return [];
    const before = comparable ? marketH1('2025', m.market) : undefined;
    const perCapita = profileValue(period, m.market, PC);
    const perCapitaPrev = comparable ? profileValue('2025', m.market, PC) : null;
    const spend = perCapita !== null ? (now.overnight * perCapita) / 1e6 : null;
    const spendPrev = before && perCapitaPrev !== null ? (before.overnight * perCapitaPrev) / 1e6 : null;
    return [
      {
        market: m.market,
        origin: m.origin,
        arrivals: now.arrivals,
        overnight: now.overnight,
        growth: before ? ((now.arrivals - before.arrivals) / before.arrivals) * 100 : null,
        arrivalsChange: before ? now.arrivals - before.arrivals : null,
        perCapita,
        perCapitaPrev,
        spend,
        spendPrev,
        volumeEffect: before && perCapitaPrev !== null ? ((now.overnight - before.overnight) * perCapitaPrev) / 1e6 : null,
        yieldEffect: perCapita !== null && perCapitaPrev !== null ? (now.overnight * (perCapita - perCapitaPrev)) / 1e6 : null,
      },
    ];
  });
  const totalOvernight = rows.reduce((a, r) => a + r.overnight, 0) || 1;
  const totalSpend = rows.reduce((a, r) => a + (r.spend ?? 0), 0) || 1;
  return rows.map((r) => ({
    ...r,
    overnightShare: (r.overnight / totalOvernight) * 100,
    spendShare: r.spend !== null ? (r.spend / totalSpend) * 100 : null,
  }));
}

/** Arrivals of all markets for the period (HKTB), used as the denominator for market shares. */
export function totalArrivals(period: ProfilePeriod): number | null {
  return marketH1(period, 'All markets')?.arrivals ?? null;
}

export const SPEND_CATEGORIES = ['Shopping', 'Hotel Bills', 'Dining', 'Entertainment', 'Sightseeing', 'Others'] as const;

/** Overnight visitor spending (HK$ m) by category for each segment, Jan-Jun (HKTB TEAIT). */
export function segmentSpendByCategory(year: string) {
  return (['Mainland', 'Short-haul', 'Long-haul'] as const).flatMap((segment) => {
    const rows = summary.spend_categories.filter((c) => c.visitor_type === 'Overnight' && c.segment === segment && c.year === year);
    if (!rows.length) return [];
    const row: Record<string, string | number> = { segment, total: rows.reduce((a, c) => a + c.spend_hkd_m, 0) };
    rows.forEach((c) => {
      row[c.category] = c.spend_hkd_m;
    });
    return [row];
  });
}
