'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { demographics } from '@/lib/data';
import { inRange } from '@/lib/filters';
import { formatCompact, formatNumber, formatPct } from '@/lib/format';
import { MARKET_ORIGIN, marketInFilter, shortMarket } from '@/lib/persona';
import { COLORS, ORIGIN_COLORS } from '@/lib/theme';
import type { Filters, Origin } from '@/lib/types';
import { AnimatedNumber } from '../motion';

const WIDTH = 960;
const MAX_ZOOM = 8;
const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const SCALE = WIDTH / (2 * Math.PI);
const HEIGHT = Math.round(SCALE * (mercatorY(79) - mercatorY(-57)));
const HK: [number, number] = [114.17, 22.32];
const ARROW = COLORS.accentDeep;

type Anchor = 'start' | 'middle' | 'end';
interface MarketGeo {
  /** world-atlas country ids drawn for this market (none: drawn as a dot). */
  ids: string[];
  /** Where the arrow to Hong Kong starts (lon, lat). */
  from: [number, number];
  /** Label offset from the arrow origin in screen pixels, and text anchor. */
  label: [number, number, Anchor];
}

const MIDDLE_EAST = ['048', '275', '364', '368', '376', '400', '414', '422', '512', '634', '682', '760', '784', '887'];
const MARKET_GEO: Record<string, MarketGeo> = {
  'Chinese Mainland': { ids: ['156'], from: [108, 31], label: [-22, -6, 'middle'] },
  Philippines: { ids: ['608'], from: [122, 13], label: [14, 8, 'start'] },
  Thailand: { ids: ['764'], from: [101, 15], label: [-10, 8, 'end'] },
  Singapore: { ids: [], from: [103.8, 1.35], label: [-8, 12, 'end'] },
  Malaysia: { ids: ['458'], from: [102, 4.2], label: [-10, -2, 'end'] },
  Indonesia: { ids: ['360'], from: [113, -2], label: [12, 12, 'start'] },
  India: { ids: ['356'], from: [78, 22], label: [0, 4, 'middle'] },
  Taiwan: { ids: ['158'], from: [121, 23.7], label: [14, -8, 'start'] },
  'South Korea': { ids: ['410'], from: [127.8, 36.5], label: [-8, -6, 'end'] },
  Japan: { ids: ['392'], from: [138, 37], label: [12, -4, 'start'] },
  USA: { ids: ['840'], from: [-98, 39], label: [0, 4, 'middle'] },
  Canada: { ids: ['124'], from: [-100, 58], label: [0, 0, 'middle'] },
  'United Kingdom': { ids: ['826'], from: [-2, 53], label: [-8, -6, 'end'] },
  Germany: { ids: ['276'], from: [10.5, 51], label: [10, -8, 'start'] },
  France: { ids: ['250'], from: [2.5, 46.5], label: [-6, 10, 'end'] },
  Australia: { ids: ['036'], from: [134, -25], label: [0, 0, 'middle'] },
  Russia: { ids: ['643'], from: [95, 60], label: [0, 0, 'middle'] },
  'Middle East': { ids: MIDDLE_EAST, from: [46, 26], label: [0, 0, 'middle'] },
};
const COUNTRY_MARKET: Record<string, string> = Object.fromEntries(Object.entries(MARKET_GEO).flatMap(([m, g]) => g.ids.map((id) => [id, m])));

const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const countries = (feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>).features.filter(
  (f) => f.id !== '010',
);
const projection = geoMercator().scale(SCALE).translate([WIDTH / 2, SCALE * mercatorY(79)]).precision(0.1);
const pathGen = geoPath(projection);
const PATHS = countries.map((f: Feature<Geometry, { name: string }>) => ({
  id: String(f.id),
  name: f.properties.name,
  market: COUNTRY_MARKET[String(f.id)],
  d: pathGen(f) ?? '',
}));
const MARKET_PATHS = PATHS.filter((p) => p.market);

type Hover = { country: string; market: string } | null;

const PALETTE = ['#BDE3E5', '#7CC8CC', '#2EA5A8', '#007A86', '#003845'];

/** Quantile classes so every colour step is used about equally: five clearly different shades instead of a gradient. */
function makeScale(values: number[]) {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  const bounds: number[] = [];
  for (let i = 1; i < PALETTE.length; i++) {
    const b = sorted[Math.ceil((sorted.length * i) / PALETTE.length)];
    if (b !== undefined && (!bounds.length || b > bounds[bounds.length - 1])) bounds.push(b);
  }
  const count = bounds.length + 1;
  const colors = Array.from({ length: count }, (_, i) => PALETTE[count === 1 ? 2 : Math.round((i * (PALETTE.length - 1)) / (count - 1))]);
  return { bounds, colors, colorOf: (v: number) => colors[bounds.filter((b) => v >= b).length] };
}

type View = { k: number; x: number; y: number };
const clampView = (v: View): View => ({
  k: v.k,
  x: Math.min(0, Math.max(WIDTH - WIDTH * v.k, v.x)),
  y: Math.min(0, Math.max(HEIGHT - HEIGHT * v.k, v.y)),
});
const zoomAt = (v: View, factor: number, cx: number, cy: number): View => {
  const k = Math.min(MAX_ZOOM, Math.max(1, v.k * factor));
  const r = k / v.k;
  return clampView({ k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r });
};
const WORLD: View = { k: 1, x: 0, y: 0 };

/** Curved flow line from a source to Hong Kong, with flowing dashes, a travelling arrow and a fixed arrowhead. */
function Flow({ from, to, width, emphasis, motion, index, k }: { from: [number, number]; to: [number, number]; width: number; emphasis: number; motion: boolean; index: number; k: number }) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
  let nx = -(y1 - y0) / dist;
  let ny = (x1 - x0) / dist;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const bulge = Math.min(0.28 * dist, 90);
  const cx = (x0 + x1) / 2 + nx * bulge;
  const cy = (y0 + y1) / 2 + ny * bulge;
  const d = `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`;
  const t = dist < 40 ? 0.78 : 0.9;
  const px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1;
  const py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1;
  const angle = (Math.atan2(2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy), 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx)) * 180) / Math.PI;
  const s = 4.5 + width * 0.9;
  const head = `${s},0 ${-s * 0.7},${-s * 0.65} ${-s * 0.7},${s * 0.65}`;
  const dur = 3 + dist / 160;
  const begin = `${(index % 6) * 0.45}s`;
  const fixed = 'non-scaling-stroke';

  return (
    <g opacity={emphasis} style={{ transition: 'opacity 200ms' }}>
      <path d={d} stroke={ARROW} strokeOpacity={0.22} strokeWidth={width} fill="none" strokeLinecap="round" vectorEffect={fixed} />
      <path d={d} stroke={ARROW} strokeOpacity={0.85} strokeWidth={Math.max(1, width * 0.45)} strokeDasharray="5 9" fill="none" strokeLinecap="round" vectorEffect={fixed}>
        {motion && <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1.2s" repeatCount="indefinite" />}
      </path>
      <polygon points={head} transform={`translate(${px},${py}) rotate(${angle}) scale(${1 / k})`} fill={ARROW} stroke={COLORS.canvas} strokeWidth={0.8} strokeLinejoin="round" />
      {motion && (
        <g opacity={0}>
          <polygon points={head} transform={`scale(${1 / k})`} fill={COLORS.accent} stroke={COLORS.canvas} strokeWidth={0.8} strokeLinejoin="round" />
          <animateMotion path={d} dur={`${dur}s`} begin={begin} repeatCount="indefinite" rotate="auto" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.88;1" dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
        </g>
      )}
    </g>
  );
}

const HALO = { stroke: COLORS.canvas, strokeWidth: 3, paintOrder: 'stroke', strokeLinejoin: 'round' } as const;

/** Choropleth of visitor arrivals by HKTB source market with animated inbound flows to Hong Kong. */
export default function OriginMap({ filters }: { filters: Filters }) {
  const [hover, setHover] = useState<Hover>(null);
  const [motion, setMotion] = useState(true);
  const [view, setView] = useState<View>(WORLD);
  const [smooth, setSmooth] = useState(false);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const k = view.k;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const cx = ((e.clientX - rect.left) * WIDTH) / rect.width;
      const cy = ((e.clientY - rect.top) * HEIGHT) / rect.height;
      setSmooth(false);
      setView((v) => zoomAt(v, Math.exp(-e.deltaY * 0.01), cx, cy));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const { byMarket, marketTotal, marketMax } = useMemo(() => {
    const byMarket: Record<string, number> = {};
    let marketTotal = 0;
    demographics.market_monthly
      .filter((r) => inRange(r.month, filters))
      .forEach((r) => {
        marketTotal += r.arrivals;
        if (MARKET_GEO[r.market]) byMarket[r.market] = (byMarket[r.market] ?? 0) + r.arrivals;
      });
    return { byMarket, marketTotal, marketMax: Math.max(...Object.values(byMarket), 1) };
  }, [filters]);

  const hasMarketData = Object.keys(byMarket).length > 0;
  const marketVisible = (m: string) => marketInFilter(m, filters);
  const marketScale = useMemo(() => makeScale(Object.values(byMarket)), [byMarket]);
  const scale = marketScale;

  const marketFill = (m?: string) => {
    if (!m || !byMarket[m] || !marketVisible(m)) return COLORS.mist;
    return marketScale.colorOf(byMarket[m]);
  };

  const point = (c: [number, number]) => (projection(c) ?? [0, 0]) as [number, number];
  const hk = point(HK);
  const flows = Object.entries(MARKET_GEO)
    .map(([key, g]) => {
      const value = byMarket[key];
      return { key, from: point(g.from), value, width: 1.2 + 4.8 * Math.sqrt((value ?? 0) / marketMax), visible: marketVisible(key) };
    })
    .filter((f) => f.value && f.visible);

  const hoveredKey = hover?.market;
  const hoveredMarket = hover?.market;
  const total = marketTotal;
  const compact = (n: number) => formatCompact(n, n >= 1e6 ? 1 : 0);
  const whole = (n: number) => formatNumber(Math.round(n));

  const zoomBy = (factor: number) => {
    setSmooth(true);
    setView((v) => zoomAt(v, factor, WIDTH / 2, HEIGHT / 2));
  };
  const goTo = (v: View) => {
    setSmooth(true);
    setView(clampView(v));
  };
  const focusAsia = () => goTo({ k: 3.2, x: WIDTH / 2 - hk[0] * 3.2, y: HEIGHT / 2 - hk[1] * 3.2 });

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || k === 1) return;
    drag.current = { x: e.clientX, y: e.clientY };
    setSmooth(false);
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - drag.current.x) * WIDTH) / rect.width;
    const dy = ((e.clientY - drag.current.y) * HEIGHT) / rect.height;
    drag.current = { x: e.clientX, y: e.clientY };
    setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };
  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSmooth(true);
    setView((v) => zoomAt(v, 2, ((e.clientX - rect.left) * WIDTH) / rect.width, ((e.clientY - rect.top) * HEIGHT) / rect.height));
  };

  const iconButton = 'flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-canvas text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-500 hover:text-brand-800 disabled:opacity-40';

  return (
    <div>

      <div className="relative overflow-hidden rounded-xl bg-slate-50/60">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className={`h-auto w-full select-none ${k > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
          style={{ touchAction: k > 1 ? 'none' : 'auto' }}
          role="img"
          aria-label="World map of visitor arrivals by source market with flows to Hong Kong"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={onDoubleClick}
        >
          <g style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${k})`, transition: smooth ? 'transform 350ms ease' : 'none' }}>
            <g>
              {PATHS.map((p) => (
                <path
                  key={p.id + p.name}
                  d={p.d}
                  fill={marketFill(p.market)}
                  stroke={COLORS.blush}
                  strokeWidth={0.6}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  onMouseEnter={() => p.market && setHover({ country: p.name, market: p.market })}
                  onMouseLeave={() => setHover(null)}
                  className={p.market ? 'cursor-pointer transition-opacity hover:opacity-80' : undefined}
                  style={{ transition: 'fill 400ms' }}
                />
              ))}
            </g>

            <g fill="none" strokeLinejoin="round" pointerEvents="none">
              {MARKET_PATHS.filter((p) => marketVisible(p.market)).map((p) => (
                <path
                  key={`outline-${p.id}`}
                  d={p.d}
                  stroke={ORIGIN_COLORS[MARKET_ORIGIN[p.market] as Origin]}
                  strokeWidth={hoveredMarket === p.market ? 2.4 : 1.3}
                  strokeOpacity={byMarket[p.market] || !hasMarketData ? 1 : 0.5}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>

            <g>
              {flows.map((f, i) => (
                <Flow key={f.key} from={f.from} to={hk} width={f.width} index={i} motion={motion} k={k} emphasis={hoveredKey ? (hoveredKey === f.key ? 1 : 0.3) : 1} />
              ))}
            </g>

            <g pointerEvents="none">
              {Object.entries(MARKET_GEO).map(([m, g]) => {
                  const [x, y] = point(g.from);
                  const v = byMarket[m];
                  const visible = marketVisible(m);
                  return (
                    <g key={`label-${m}`} transform={`translate(${x},${y}) scale(${1 / k})`} opacity={visible ? 1 : 0.3}>
                      {g.ids.length === 0 && (
                        <circle r={hoveredMarket === m ? 4.5 : 3.2} fill={v ? marketScale.colorOf(v) : COLORS.mist} stroke={ORIGIN_COLORS[MARKET_ORIGIN[m] as Origin]} strokeWidth={1.4} />
                      )}
                      <text x={g.label[0]} y={g.label[1]} textAnchor={g.label[2]} fontSize={9.5} fontWeight={hoveredMarket === m ? 800 : 600} fill={COLORS.ink} {...HALO}>
                        {shortMarket(m)}
                        {v ? <> <AnimatedNumber value={v} format={compact} /></> : null}
                      </text>
                    </g>
                  );
                })}
            </g>

            <g pointerEvents="none" transform={`translate(${hk[0]},${hk[1]}) scale(${1 / k})`}>
              {motion && (
                <circle r={6} fill="none" stroke={COLORS.accentDeep} strokeWidth={1.5}>
                  <animate attributeName="r" values="6;20" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0" dur="2.4s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r={6} fill={COLORS.accentDeep} stroke={COLORS.canvas} strokeWidth={2} />
              <text x={9} y={18} fontSize={13} fontWeight={700} fill={COLORS.ink} {...HALO}>
                Hong Kong
              </text>
            </g>
          </g>
        </svg>

        <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-canvas/95 px-3 py-2 text-xs shadow-card ring-1 ring-mist">
          {hoveredMarket ? (
            <>
              <p className="font-semibold text-slate-900">{hoveredMarket}</p>
              <p className="text-slate-600">
                {MARKET_ORIGIN[hoveredMarket]}
                {hover && hover.country !== hoveredMarket ? ` · ${hover.country}` : ''}
              </p>
              {byMarket[hoveredMarket] ? (
                <p className="mt-1 font-semibold text-brand-800">
                  <AnimatedNumber value={byMarket[hoveredMarket]} format={whole} />{' '}
                  <span className="font-normal text-slate-600">
                    (<AnimatedNumber value={(byMarket[hoveredMarket] / marketTotal) * 100} format={(n) => formatPct(n)} /> of arrivals)
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-slate-600">No arrivals in the selected range</p>
              )}
            </>
                    ) : !hasMarketData ? (
            <>
              <p className="font-semibold text-slate-900">No nationality detail in this range</p>
              <p className="text-slate-600">Choose months in Jan–Jun 2025 or Jan–Jun 2026</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-900">
                <AnimatedNumber value={total} format={(n) => `${formatCompact(n, 1)} arrivals`} />
              </p>
              <p className="text-slate-600">Hover a highlighted country for its market</p>
            </>
          )}
        </div>

        <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
          <div className="flex flex-col gap-1">
            <button type="button" className={iconButton} onClick={() => zoomBy(1.6)} disabled={k >= MAX_ZOOM} aria-label="Zoom in">
              +
            </button>
            <button type="button" className={iconButton} onClick={() => zoomBy(1 / 1.6)} disabled={k <= 1} aria-label="Zoom out">
              −
            </button>
          </div>
          <button type="button" className={`${iconButton} w-auto px-2 text-[11px]`} onClick={focusAsia}>
            Focus Asia
          </button>
          <button type="button" className={`${iconButton} w-auto px-2 text-[11px]`} onClick={() => goTo(WORLD)} disabled={k === 1}>
            Reset
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
        <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
          Arrivals:
          {scale.colors.map((c, i) => {
            const lower = i === 0 ? null : scale.bounds[i - 1];
            const upper = i === scale.colors.length - 1 ? null : scale.bounds[i];
            return (
              <span key={c} className="inline-flex items-center gap-1">
                <span className="h-3 w-5 rounded-sm ring-1 ring-slate-300" style={{ background: c }} />
                {lower === null && upper !== null ? `< ${compact(upper)}` : upper === null && lower !== null ? `≥ ${compact(lower)}` : lower !== null && upper !== null ? `${compact(lower)}–${compact(upper)}` : 'All'}
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-5 rounded-sm ring-1 ring-slate-300" style={{ background: COLORS.mist }} />
            No data
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="30" height="10" aria-hidden>
            <line x1="1" y1="5" x2="22" y2="5" stroke={ARROW} strokeWidth="2" strokeDasharray="4 3" />
            <polygon points="30,5 22,1.5 22,8.5" fill={ARROW} />
          </svg>
          Inbound flow to Hong Kong (width = volume)
        </span>
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          Outline:
          {(Object.keys(ORIGIN_COLORS) as Origin[]).map((o) => (
            <span key={o} className="inline-flex items-center gap-1">
              <span className="h-2.5 w-3.5 rounded-sm border-2" style={{ borderColor: ORIGIN_COLORS[o] }} />
              {o}
            </span>
          ))}
        </span>
        <span>Singapore shown as a dot (too small at this scale). Monthly market figures cover all visitors.</span>
        <span>Zoom: +/− buttons, double-click, or Ctrl/⌘ + scroll · drag to pan.</span>
      </div>
    </div>
  );
}
