import summaryJson from '@/public/data/summary.json';
import demographicsJson from '@/public/data/visitor_demographics.json';
import strategyJson from '@/public/data/strategy_2027.json';
import type { Strategy, SummaryData, VisitorDemographics } from './types';

// JSON is inlined at build time, so the static export needs no runtime fetch or basePath handling.
export const summary = summaryJson as unknown as SummaryData;
export const demographics = demographicsJson as unknown as VisitorDemographics;
export const strategy = strategyJson as unknown as Strategy;

export const dataMeta = summary.meta;

/** Months available for the sidebar period selector (Jan 2025 - Jun 2026). */
export const filterMonths = summary.months;
