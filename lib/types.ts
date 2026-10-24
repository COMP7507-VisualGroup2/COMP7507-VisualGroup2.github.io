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
  visitor_profile: { year: string; dimension: string; category: string; share_pct: number | null }[];
  attraction_sentiment: { attraction: string; mentions: number | null; sentiment_score: number | null; recommend_pct: number | null }[];
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

export interface PeerMonth {
  month: string;
  [key: string]: string | number | null;
}

export interface CompetitorBenchmark {
  meta: Meta;
  peers: { code: string; name: string; available: boolean }[];
  monthly: PeerMonth[];
  baseline_2019_annual: { country: string; name: string; arrivals: number | null }[];
  receipts: {
    country: string;
    name: string;
    year: string;
    receipts_hkd_m: number;
    arrivals: number | null;
    per_visitor_hkd: number | null;
    source: string;
  }[];
  sg_receipts_mix: { year: string; components: { component: string; receipts_hkd_m: number }[] };
  un_tourism_apac: { month: string; apac_recovery_pct: number | null }[];
  fx_annual_hkd: Record<string, number>;
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
}

export interface Filters {
  granularity: Granularity;
  start: string;
  end: string;
  origin: Origin | 'All';
  visitorType: VisitorType | 'All';
}
