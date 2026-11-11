import { demographics } from './data';
import { COLORS, ORIGIN_COLORS } from './theme';
import type { MarketH1, Origin, ProfilePeriod } from './types';

/** Helpers for the HKTB Visitor Profile data (data/manual/visitor_profile.csv + HKTB arrival workbooks). */

export const PROFILE_PERIODS: { value: ProfilePeriod; label: string }[] = [
  { value: '2025', label: '2025' },
  { value: '2026-H1', label: 'H1 2026' },
];

export const PERIOD_LABEL: Record<ProfilePeriod, string> = { '2025': '2025 full year', '2026-H1': 'Jan–Jun 2026' };

export const OTHER_PERIOD: Record<ProfilePeriod, ProfilePeriod> = { '2025': '2026-H1', '2026-H1': '2025' };

/** HKTB publishes nationality workbooks for Jan-Jun, so the 2025 view uses Jan-Jun 2025 for those measures. */
export const H1_PERIOD: Record<ProfilePeriod, string> = { '2025': '2025-H1', '2026-H1': '2026-H1' };
export const H1_LABEL: Record<ProfilePeriod, string> = { '2025': 'Jan–Jun 2025', '2026-H1': 'Jan–Jun 2026' };

export const SEGMENTS = ['All markets', 'Mainland', 'Short-haul', 'Long-haul'] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_COLORS: Record<Segment, string> = {
  'All markets': COLORS.ink,
  Mainland: ORIGIN_COLORS.Mainland,
  'Short-haul': ORIGIN_COLORS['Short-haul'],
  'Long-haul': ORIGIN_COLORS['Long-haul'],
};

export const MARKETS = demographics.markets;
export const MARKET_ORIGIN: Record<string, Origin> = Object.fromEntries(MARKETS.map((m) => [m.market, m.origin]));

const SHORT_NAMES: Record<string, string> = {
  'Chinese Mainland': 'Mainland',
  'United Kingdom': 'UK',
  'South Korea': 'S. Korea',
  'Middle East': 'Mid. East',
};
export const shortMarket = (m: string) => SHORT_NAMES[m] ?? m;

export const AGE_GROUPS = ['0-15', '16-25', '26-35', '36-45', '46-55', '56-65', '66+'];
export const AGE_COLORS = ['#C2E4E6', '#5FB8BB', '#0A9396', '#005F73', '#F5C566', '#EE9B00', '#CA6702'];

/** Profile rows for a period / market / dimension, in CSV order. */
export function profile(period: ProfilePeriod, market: string, dimension: string) {
  return demographics.visitor_profile
    .filter((r) => r.period === period && r.market === market && r.dimension === dimension && r.value !== null)
    .map((r) => ({ category: r.category, value: r.value as number }));
}

export function profileValue(period: ProfilePeriod, market: string, dimension: string, category?: string): number | null {
  const rows = profile(period, market, dimension);
  return (category ? rows.find((r) => r.category === category) : rows[0])?.value ?? null;
}

export function hasProfile(dimension: string) {
  return demographics.visitor_profile.some((r) => r.dimension === dimension);
}

export function marketH1(period: ProfilePeriod, market: string): MarketH1 | undefined {
  const key = market === 'Mainland' ? 'Chinese Mainland' : market;
  return demographics.market_h1.find((r) => r.period === H1_PERIOD[period] && r.market === key);
}

/** Dark or light label text for a fill colour. */
export function labelColor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? COLORS.ink : COLORS.canvas;
}

/** Share of overnight visitors for a segment: published share (All markets) or HKTB arrival counts. */
export function sameDayShare(period: ProfilePeriod, market: string): number | null {
  const published = profileValue(period, market, 'visitor_type_share', 'Same-day');
  if (published !== null) return published;
  const total = profileValue(period, market, 'arrivals_m', 'Total');
  const sd = profileValue(period, market, 'arrivals_m', 'Same-day');
  return total && sd !== null ? (sd / total) * 100 : null;
}

/** HKTB marks values below 0.5% with '*' (stored as 0.4). */
export function formatShare(v: number | null | undefined): string {
  if (v === null || v === undefined) return '–';
  if (v > 0 && v < 0.5) return '<0.5%';
  return `${Math.round(v)}%`;
}

/** Rank movement in H1 2026 vs 2025 for a place (positive = moved up); null when not comparable. */
export function rankChange(period: ProfilePeriod, market: string, place: string, rank: number): number | 'new' | null {
  if (period !== '2026-H1') return null;
  const prior = profile(OTHER_PERIOD[period], market, 'place_rank');
  if (!prior.length) return null;
  const prev = prior.find((r) => r.category === place);
  return prev ? prev.value - rank : 'new';
}

function mix(from: string, to: string, t: number) {
  const a = [1, 3, 5].map((i) => parseInt(from.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** One colour per HKTB market, shaded within its segment hue (teal = short-haul, amber = long-haul). */
export const MARKET_COLORS: Record<string, string> = (() => {
  const out: Record<string, string> = { 'Other markets': COLORS.blush };
  const ramps: Record<Origin, [string, string]> = {
    Mainland: [COLORS.brandDark, COLORS.brandDark],
    'Short-haul': ['#007A86', '#C2E4E6'],
    'Long-haul': ['#AE2012', '#FBE3B6'],
    Emerging: [COLORS.steelDeep, COLORS.steelDeep],
  };
  (Object.keys(ramps) as Origin[]).forEach((o) => {
    const ms = MARKETS.filter((m) => m.origin === o);
    ms.forEach((m, i) => (out[m.market] = mix(ramps[o][0], ramps[o][1], ms.length > 1 ? i / (ms.length - 1) : 0)));
  });
  return out;
})();
