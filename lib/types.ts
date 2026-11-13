export type Origin = 'Mainland' | 'Short-haul' | 'Long-haul' | 'Emerging';
export type Segment = 'Mainland' | 'Short-haul' | 'Long-haul';
export type VisitorType = 'Overnight' | 'Same-day';

export interface SourceInfo {
  id: string;
  name: string;
  url: string;
  mode: 'supplied' | 'manual';
  note: string;
}

export interface PendingItem {
  id: string;
  tab: string;
  item: string;
  source: string;
  file: string;
  columns: string[];
}

export interface Meta {
  generated_at: string;
  coverage: { start: string; end: string };
  sources: SourceInfo[];
  pending: PendingItem[];
}

/** One TEAIT market area for a Jan-Jun period. Spend in HK$ million, per capita in HK$. */
export interface AreaH1 {
  area: string;
  segment: Segment;
  year: string;
  arrivals: number;
  overnight_visitors: number | null;
  spend_hkd_m: number;
  overnight_spend_hkd_m: number;
  same_day_spend_hkd_m: number;
  overnight_per_capita_hkd: number;
  same_day_per_capita_hkd: number;
}

export interface SummaryData {
  meta: Meta;
  months: string[];
  /** Monthly arrivals: 'All', each segment and each TEAIT market area. */
  arrivals_monthly: Record<string, Record<string, number>>;
  areas: { area: string; segment: Segment }[];
  length_of_stay_monthly: Record<string, number>;
  targets: Record<string, { arrivals: number; length_of_stay: number; overnight_per_capita_hkd: number; satisfaction: number; receipts_hkd_m: number }>;
  segments_h1: Record<string, Record<Segment, { visitors: number; overnight: number; same_day: number }>>;
  h1: Record<
    string,
    {
      receipts_hkd_m: number;
      destination_hkd_m: number;
      overnight_spend_hkd_m: number;
      same_day_spend_hkd_m: number;
      overnight_visitors: number;
      same_day_visitors: number;
      overnight_per_capita_hkd: number;
      same_day_per_capita_hkd: number;
    }
  >;
  area_h1: AreaH1[];
  spend_categories: { visitor_type: VisitorType; segment: string; category: string; year: string; spend_hkd_m: number }[];
  quarterly_overnight_per_capita: { year: number; quarter: number; value: number }[];
}

/** HKTB Visitor Profile periods: 2025 full year and Jan-Jun 2026. */
export type ProfilePeriod = '2025' | '2026-H1';

export interface ProfileRecord {
  period: ProfilePeriod;
  /** 'All markets' | 'Mainland' | 'Short-haul' | 'Long-haul' or one of the 18 HKTB source markets. */
  market: string;
  dimension: string;
  category: string;
  value: number | null;
}

/** Jan-Jun arrivals by visitor type, gender and age for a market or segment (HKTB monthly workbooks). */
export interface MarketH1 {
  period: string;
  market: string;
  arrivals: number;
  same_day: number;
  overnight: number;
  male_pct: number | null;
  mean_age: number | null;
  age: Record<string, number>;
}

export interface VisitorDemographics {
  meta: Meta;
  markets: { market: string; origin: Origin }[];
  market_monthly: { month: string; market: string; arrivals: number }[];
  market_h1: MarketH1[];
  visitor_profile: ProfileRecord[];
}

export interface PillarKpi {
  metric: string;
  baseline: string;
  target_2027: string;
}

export interface Pillar {
  id: string;
  number: number;
  title: string;
  tagline: string;
  rationale: string[];
  initiatives: string[];
  kpis: PillarKpi[];
  timeline: { phase: string; action: string }[];
  /** HKTB source markets whose playbook leads with this pillar. */
  focus_markets: string[];
}

/** 2027 playbook for one HKTB source market: data-driven baselines with proposed targets per pillar. */
export interface MarketPlaybook {
  market: string;
  origin: Origin;
  primary: string;
  headline: string;
  facts: {
    arrivals_h1_2026: number | null;
    yoy_pct: number | null;
    overnight_pct: number | null;
    nights: number | null;
    spend_hkd: number | null;
    first_timer_pct: number | null;
    mean_age: number | null;
    top_places: string[];
  };
  plays: { pillar: string; initiatives: string[]; kpis: PillarKpi[] }[];
}

export interface Strategy {
  meta: Meta;
  pillars: Pillar[];
  market_playbooks: MarketPlaybook[];
}

/** Global filters, as in the v3 sidebar. */
export interface Filters {
  /** Visitor market (segment). */
  origin: Segment | 'All';
  /** TEAIT market area ("Country" in the sidebar). */
  region: string;
  visitorType: VisitorType | 'All';
  start: string;
  end: string;
  purpose: string;
  channel: string;
}
