export type Origin = 'Mainland' | 'Short-haul' | 'Long-haul' | 'Emerging';
export type VisitorType = 'Overnight' | 'Same-day';
export type Granularity = 'month' | 'quarter' | 'year';

export interface SourceInfo {
  id: string;
  name: string;
  url: string;
  mode: 'live' | 'snapshot' | 'manual' | 'unavailable';
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
  mode: 'live' | 'offline';
  sources: SourceInfo[];
  pending: PendingItem[];
}

type ByYear<T> = Record<string, T>;

export interface BriRecord {
  quarter: string;
  industry: string;
  index: number;
  yoy_pct: number | null;
}

export interface KpiSummary {
  meta: Meta;
  period: { latest_month: string; ytd_months: string[]; ytd_label: string; compare_label: string };
  arrivals: {
    ytd: number;
    ytd_prev: number;
    yoy_pct: number;
    full_year: ByYear<number>;
    full_year_yoy_pct: number;
    recovery_vs_2019_ytd_pct: number;
    mainland_share_ytd_pct: number;
  };
  monthly: { month: string; arrivals: number; prior_year: number | null; baseline_2019: number | null }[];
  targets: { year: string; target_arrivals: number | null; source: string }[];
  length_of_stay: { year: string; nights: number }[];
  spending: {
    ytd_hkd_m: number;
    ytd_prev_hkd_m: number;
    ytd_yoy_pct: number;
    ytd_is_estimate: boolean;
    annual_hkd_m: ByYear<number>;
    annual_by_type_hkd_m: ByYear<Record<VisitorType, number>>;
    per_capita_hkd: ByYear<Record<VisitorType, number>>;
    yield_per_visitor_hkd: ByYear<number>;
  };
  hotel: {
    available: boolean;
    accommodation_bri_latest: BriRecord | null;
    rooms_pipeline: { year: string; rooms: number }[];
  };
  tourism_economy: {
    year: string | null;
    value_added_hkd_m: number | null;
    gdp_share_pct: number | null;
    employment: number | null;
    employment_share_pct: number | null;
    prev_year: string | null;
    prev_employment: number | null;
    prev_gdp_share_pct: number | null;
    history: { year: string; gdp_share_pct: number | null; employment: number | null; value_added_hkd_m: number | null }[];
  };
}

export interface ArrivalRecord {
  month: string;
  origin: Origin;
  visitor_type: VisitorType;
  arrivals: number;
  spend_hkd_m: number;
  is_estimate: boolean;
}

export interface PortRecord {
  month: string;
  port: string;
  mainland: number;
  non_mainland: number;
}

export interface RegionMonth {
  month: string;
  region_code: string;
  region: string;
  origin: Origin;
  arrivals: number;
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
  months: string[];
  origins: Origin[];
  visitor_types: VisitorType[];
  ports: string[];
  segments: { origin: Origin; regions: string[] }[];
  arrivals: ArrivalRecord[];
  region_monthly: RegionMonth[];
  port_arrivals: PortRecord[];
  length_of_stay: { year: string; nights: number }[];
  visitor_type_annual: { year: string; visitor_type: VisitorType; arrivals: number }[];
  markets: { market: string; origin: Origin }[];
  market_monthly: { month: string; market: string; arrivals: number }[];
  market_h1: MarketH1[];
  visitor_profile: ProfileRecord[];
}

export interface HotelMonth {
  month: string;
  occupancy_pct: number | null;
  adr_hkd: number | null;
  revpar_hkd: number | null;
}

export interface MarketSpending {
  year: string;
  market: string;
  origin: Origin;
  visitor_type: VisitorType;
  spend_hkd_m: number;
  per_capita_hkd: number;
  visitors: number | null;
}

export interface TourismIndustry {
  year: string;
  code: string;
  industry: string;
  group: 'Total' | 'Inbound' | 'Outbound';
  value_added_hkd_m: number | null;
  va_share_gdp_pct: number | null;
  employment: number | null;
  emp_share_pct: number | null;
}

export interface RevenueData {
  meta: Meta;
  market_spending: MarketSpending[];
  tourism_industries: TourismIndustry[];
  hotel_monthly: HotelMonth[];
  hotel_rooms_pipeline: { year: string; rooms: number }[];
  bri_industries: string[];
  bri_quarterly: BriRecord[];
}

export interface ForecastPoint {
  month: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface Scenario {
  label: string;
  arrivals: number;
  yield_hkd: number;
  spend_hkd_m: number;
  arrivals_adj_pct: number;
  yield_adj_pct: number;
  description: string;
  drivers: string[];
}

export interface Pillar {
  id: string;
  number: number;
  title: string;
  tagline: string;
  rationale: string[];
  initiatives: string[];
  kpis: { metric: string; baseline: string; target_2027: string }[];
  timeline: { phase: string; action: string }[];
  /** HKTB source markets whose playbook leads with this pillar. */
  focus_markets: string[];
}

export interface PillarKpi {
  metric: string;
  baseline: string;
  target_2027: string;
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

export interface StrategyForecast {
  meta: Meta;
  model: {
    method: string;
    training_window: string;
    observations: number;
    slope_per_month: number;
    annualised_trend_pct: number;
    r_squared: number;
    sigma: number;
    confidence_level: number;
    seasonal_index: Record<string, number>;
  };
  series: ForecastPoint[];
  annual: {
    year: string;
    arrivals: number;
    yield_hkd: number;
    spend_hkd_m: number;
    status: string;
    arrivals_lower?: number;
    arrivals_upper?: number;
  }[];
  scenarios: Record<'base' | 'upside' | 'downside', Scenario>;
  pillars: Pillar[];
  market_playbooks: MarketPlaybook[];
}

export interface Filters {
  granularity: Granularity;
  start: string;
  end: string;
  origin: Origin | 'All';
  visitorType: VisitorType | 'All';
}
