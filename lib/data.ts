import kpiJson from '@/public/data/kpi_summary.json';
import demographicsJson from '@/public/data/visitor_demographics.json';
import revenueJson from '@/public/data/hotel_sector_performance.json';
import competitorJson from '@/public/data/competitor_benchmark.json';
import strategyJson from '@/public/data/strategy_forecast_2027.json';
import type { CompetitorBenchmark, KpiSummary, RevenueData, StrategyForecast, VisitorDemographics } from './types';

// JSON is inlined at build time, so the static export needs no runtime fetch or basePath handling.
export const kpiSummary = kpiJson as unknown as KpiSummary;
export const demographics = demographicsJson as unknown as VisitorDemographics;
export const revenue = revenueJson as unknown as RevenueData;
export const competitor = competitorJson as unknown as CompetitorBenchmark;
export const strategy = strategyJson as unknown as StrategyForecast;

export const dataMeta = kpiSummary.meta;

export function pendingFor(id: string) {
  return dataMeta.pending.find((p) => p.id === id);
}

/** Months available for the global date-range filter (arrivals + ports). */
export const filterMonths = Array.from(
  new Set([...demographics.months, ...demographics.port_arrivals.map((p) => p.month)]),
)
  .filter((m) => m >= demographics.months[0])
  .sort();
