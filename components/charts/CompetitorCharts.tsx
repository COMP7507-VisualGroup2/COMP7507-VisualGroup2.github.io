'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { competitor, revenue } from '@/lib/data';
import { inRange } from '@/lib/filters';
import { formatCompact, formatHkd, formatHkdMillions, formatNumber, monthLabel } from '@/lib/format';
import { AXIS_TICK, COLORS, PEER_COLORS, SERIES, TOOLTIP_STYLE } from '@/lib/theme';
import { Segmented } from '../SectionCard';
import type { Filters } from '@/lib/types';

type PeerMode = 'arrivals' | 'recovery' | 'share';
const PEERS = competitor.peers.filter((p) => p.available);

/** Monthly arrivals, recovery vs 2019 and share of peer-group arrivals for HK vs regional peers. */
export function PeerArrivalsChart({ filters }: { filters: Filters }) {
  const [mode, setMode] = useState<PeerMode>('recovery');
  const hasApac = competitor.un_tourism_apac.length > 0;

  const data = useMemo(() => {
    const apac = Object.fromEntries(competitor.un_tourism_apac.map((r) => [r.month, r.apac_recovery_pct]));
    return competitor.monthly
        .filter((m) => inRange(String(m.month), filters))
        .map((m) => {
          const point: Record<string, string | number | null> = { month: monthLabel(String(m.month)) };
          const total = PEERS.reduce((a, p) => a + (Number(m[p.code]) || 0), 0);
          const complete = PEERS.every((p) => m[p.code] != null);
          PEERS.forEach((p) => {
            const v = m[p.code] as number | null;
            point[p.name] =
              mode === 'arrivals' ? v : mode === 'recovery' ? (m[`${p.code}_recovery`] as number | null) : complete && v ? Number(((v / total) * 100).toFixed(1)) : null;
          });
          if (mode === 'recovery' && hasApac) point['Asia-Pacific (UN Tourism)'] = apac[String(m.month)] ?? null;
          return point;
        });
  }, [filters, mode, hasApac]);

  const fmt = (v: number) => (mode === 'arrivals' ? formatCompact(v, 1) : `${v}%`);

  return (
    <div>
      <div className="mb-2">
        <Segmented<PeerMode>
          size="xs"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'recovery', label: 'Recovery vs 2019' },
            { value: 'arrivals', label: 'Arrivals' },
            { value: 'share', label: 'Share of peer group' },
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={10} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v))} domain={mode === 'arrivals' ? ['auto', 'auto'] : [0, 'auto']} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => (mode === 'arrivals' ? formatNumber(Number(v)) : `${v}%`)} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {mode === 'recovery' && (
            <ReferenceLine y={100} stroke={COLORS.steel} strokeDasharray="4 4" label={{ value: '2019 level', fontSize: 10, fill: COLORS.steelDeep, position: 'insideTopLeft' }} />
          )}
          {PEERS.map((p) => (
            <Line key={p.code} dataKey={p.name} stroke={PEER_COLORS[p.code]} strokeWidth={p.code === 'HK' ? 3 : 2} dot={{ r: p.code === 'HK' ? 2.5 : 1.5 }} connectNulls />
          ))}
          {mode === 'recovery' && hasApac && (
            <Line dataKey="Asia-Pacific (UN Tourism)" stroke={COLORS.blushDeep} strokeDasharray="5 3" strokeWidth={2} dot={false} connectNulls />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type ReceiptMode = 'total' | 'per_visitor' | 'arrivals2019';

/** Tourism receipts (HKD) and receipts per visitor for HK vs peers. */
export function ReceiptsChart() {
  const [mode, setMode] = useState<ReceiptMode>('per_visitor');
  const years = Array.from(new Set(competitor.receipts.map((r) => r.year))).sort();
  const yearColors: Record<string, string> = { '2019': COLORS.blushDeep, '2024': COLORS.steelDeep, '2025': COLORS.brandDeep };

  const data = useMemo(() => {
    if (mode === 'arrivals2019') {
      return competitor.baseline_2019_annual.filter((r) => r.arrivals).map((r) => ({ name: r.name, code: r.country, '2019 arrivals': r.arrivals }));
    }
    const names = Array.from(new Set(competitor.receipts.map((r) => r.name)));
    return names.map((name) => {
      const point: Record<string, string | number | null> = { name };
      competitor.receipts
        .filter((r) => r.name === name)
        .forEach((r) => {
          point[r.year] = mode === 'total' ? r.receipts_hkd_m : r.per_visitor_hkd;
        });
      return point;
    });
  }, [mode]);

  return (
    <div>
      <div className="mb-2">
        <Segmented<ReceiptMode>
          size="xs"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'per_visitor', label: 'Receipts per visitor' },
            { value: 'total', label: 'Total receipts' },
            { value: 'arrivals2019', label: '2019 arrivals' },
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={0} />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (mode === 'total' ? formatHkdMillions(Number(v)) : mode === 'per_visitor' ? `$${formatCompact(Number(v), 0)}` : formatCompact(Number(v), 0))}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v) => (mode === 'total' ? formatHkdMillions(Number(v)) : mode === 'per_visitor' ? formatHkd(Number(v)) : formatNumber(Number(v)))}
            cursor={{ fill: 'rgba(10,147,150,0.06)' }}
          />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {mode === 'arrivals2019' ? (
            <Bar dataKey="2019 arrivals" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {data.map((d) => (
                <Cell key={String(d.name)} fill={PEER_COLORS[String(d.code)] ?? COLORS.steel} />
              ))}
            </Bar>
          ) : (
            years.map((y) => <Bar key={y} dataKey={y} fill={yearColors[y] ?? COLORS.steel} radius={[4, 4, 0, 0]} maxBarSize={26} />)
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const SUB_INDUSTRIES = [
  'ind_KEY_IND_2A1',
  'ind_KEY_IND_2A2',
  'ind_KEY_IND_2A3',
  'ind_KEY_IND_2A4',
  'ind_KEY_IND_2A5',
  'ind_KEY_IND_2B1',
  'ind_KEY_IND_2B2',
];
const INDUSTRY_YEAR = Array.from(new Set(revenue.tourism_industries.map((r) => r.year))).sort().slice(-1)[0];

function industryRows(year: string) {
  return SUB_INDUSTRIES.map((code, i) => {
    const r = revenue.tourism_industries.find((x) => x.code === code && x.year === year);
    return r ? { ...r, color: SERIES[i % SERIES.length] } : null;
  }).filter((r): r is NonNullable<typeof r> => r !== null);
}

interface TreemapCell {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  color?: string;
  size?: number;
  jobs?: number;
}

const TreemapContent = ({ x = 0, y = 0, width = 0, height = 0, name, color, size, jobs }: TreemapCell) => (
  <g>
    <rect x={x} y={y} width={width} height={height} fill={color} stroke={COLORS.canvas} strokeWidth={2} rx={4} />
    {width > 90 && height > 44 && (
      <>
        <text x={x + 8} y={y + 18} fill={COLORS.canvas} fontSize={12} fontWeight={600}>
          {name && name.length > width / 7 ? `${name.slice(0, Math.floor(width / 7))}…` : name}
        </text>
        <text x={x + 8} y={y + 34} fill={COLORS.canvas} fontSize={11}>
          {formatHkdMillions(size ?? 0)} · {formatCompact(jobs ?? 0, 1)} jobs
        </text>
      </>
    )}
  </g>
);

/** Treemap of tourism value added by sub-industry (hotels, retail, F&B, transport, travel agencies). */
export function IndustryTreemap() {
  const data = industryRows(INDUSTRY_YEAR).map((r) => ({
    name: r.industry,
    size: r.value_added_hkd_m ?? 0,
    jobs: r.employment ?? 0,
    color: r.color,
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <Treemap data={data} dataKey="size" nameKey="name" content={<TreemapContent />} isAnimationActive={false}>
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(v, _n, item) => [`${formatHkdMillions(Number(v))} · ${formatNumber(Number((item?.payload as TreemapCell)?.jobs ?? 0))} jobs`, 'Value added']}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}

/** Scatter: employment vs value added by tourism sub-industry (bubble = GDP share), for any year. */
export function IndustryScatter() {
  const years = Array.from(new Set(revenue.tourism_industries.map((r) => r.year))).sort();
  const [year, setYear] = useState(INDUSTRY_YEAR);
  const rows = industryRows(year).map((r) => ({
    name: r.industry,
    jobs: r.employment ?? 0,
    va: r.value_added_hkd_m ?? 0,
    share: r.va_share_gdp_pct ?? 0,
    perJob: r.employment ? ((r.value_added_hkd_m ?? 0) * 1e6) / r.employment : 0,
    color: r.color,
  }));

  return (
    <div>
      <div className="mb-2">
        <Segmented size="xs" value={year} onChange={setYear} options={years.map((y) => ({ value: y, label: y }))} />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={COLORS.grid} />
          <XAxis type="number" dataKey="jobs" name="Employment" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), 0)} />
          <YAxis type="number" dataKey="va" name="Value added" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatHkdMillions(Number(v))} />
          <ZAxis type="number" dataKey="share" range={[80, 900]} />
          <Tooltip
            {...TOOLTIP_STYLE}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as (typeof rows)[number] | undefined;
              if (!p) return null;
              return (
                <div className="rounded-xl border border-mist bg-canvas px-3 py-2 text-xs shadow-card">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-slate-600">{formatNumber(p.jobs)} jobs · {formatHkdMillions(p.va)}</p>
                  <p className="text-slate-600">{formatHkd(p.perJob)} value added per job</p>
                </div>
              );
            }}
          />
          <Scatter data={rows}>
            {rows.map((r) => (
              <Cell key={r.name} fill={r.color} fillOpacity={0.85} stroke={COLORS.canvas} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
        {rows.map((r) => (
          <li key={r.name} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
            {r.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
