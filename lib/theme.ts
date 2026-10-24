import type { Origin, VisitorType } from './types';

/** Hong Kong Tourism palette (see tailwind.config.ts). */
export const COLORS = {
  canvas: '#FFFFFF',
  mist: '#F1F5F9',
  blush: '#CBD5E1',
  blushDeep: '#94A3B8',
  steel: '#94A3B8',
  steelDeep: '#64748B',
  brand: '#0A9396',
  brandLight: '#94D2BD',
  brandDeep: '#005F73',
  brandDark: '#003845',
  accent: '#EE9B00',
  accentDeep: '#CA6702',
  ink: '#0F172A',
  grid: '#E2E8F0',
};

export const ORIGIN_COLORS: Record<Origin, string> = {
  Mainland: COLORS.brandDeep,
  'Short-haul': COLORS.brand,
  'Long-haul': COLORS.accent,
  Emerging: COLORS.accentDeep,
};

export const VISITOR_TYPE_COLORS: Record<VisitorType, string> = {
  Overnight: COLORS.brandDeep,
  'Same-day': COLORS.accent,
};

export const PORT_COLORS: Record<string, string> = {
  'HKIA Airport': COLORS.brandDeep,
  'West Kowloon HSR': COLORS.brand,
  HZMB: COLORS.brandLight,
  'Land Control Points': COLORS.accent,
  'Ferries & Cruise': COLORS.accentDeep,
};

export const PEER_COLORS: Record<string, string> = {
  HK: COLORS.brandDeep,
  SG: COLORS.accent,
  JP: COLORS.steelDeep,
  TH: COLORS.accentDeep,
  MO: COLORS.brandLight,
  KR: COLORS.brand,
};

/** Ordered categorical series colours. */
export const SERIES = [COLORS.brandDeep, COLORS.accent, COLORS.brand, COLORS.accentDeep, COLORS.brandLight, COLORS.steelDeep];

export const AXIS_TICK = { fontSize: 11, fill: COLORS.steelDeep };

export const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 12,
    border: `1px solid ${COLORS.grid}`,
    background: COLORS.canvas,
    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
    fontSize: 12,
  },
  labelStyle: { fontWeight: 600, color: COLORS.ink },
};
