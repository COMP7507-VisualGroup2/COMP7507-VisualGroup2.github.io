import type { Origin, VisitorType } from './types';

/** Hong Kong Tourism palette (see tailwind.config.ts). */
export const TABLEAU_CASUAL = [
  '#4E79A7',
  '#F28E2B',
  '#E15759',
  '#76B7B2',
  '#59A14F',
  '#EDC948',
  '#B07AA1',
  '#FF9DA7',
  '#9C755F',
  '#BAB0AC',
] as const;

export const COLORS = {
  canvas: '#FFFCF7',
  mist: '#FFF3E0',
  blush: '#FBE2C3',
  blushDeep: '#D9B58A',
  steel: '#B7A898',
  steelDeep: '#746657',
  brand: '#F28E2B',
  brandLight: '#F6C98F',
  brandDeep: '#C36B12',
  brandDark: '#8C4B0F',
  accent: '#4E79A7',
  accentDeep: '#E15759',
  ink: '#433426',
  grid: '#EADFCC',
};

export const ORIGIN_COLORS: Record<Origin, string> = {
  Mainland: TABLEAU_CASUAL[1],
  'Short-haul': TABLEAU_CASUAL[0],
  'Long-haul': TABLEAU_CASUAL[2],
  Emerging: TABLEAU_CASUAL[4],
};

export const VISITOR_TYPE_COLORS: Record<VisitorType, string> = {
  Overnight: TABLEAU_CASUAL[1],
  'Same-day': TABLEAU_CASUAL[0],
};

/** Ordered categorical series colours. */
export const SERIES = TABLEAU_CASUAL;

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
