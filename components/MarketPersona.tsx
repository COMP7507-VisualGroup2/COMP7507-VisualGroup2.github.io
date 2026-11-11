'use client';

import { useMemo, useState } from 'react';
import HeatTable from './HeatTable';
import { RankBadge } from './charts/ProfileCharts';
import { formatCompact, formatHkd, formatPct, pctChange } from '@/lib/format';
import {
  AGE_COLORS,
  AGE_GROUPS,
  H1_LABEL,
  MARKET_ORIGIN,
  MARKETS,
  PERIOD_LABEL,
  formatShare,
  labelColor,
  marketH1,
  profile,
  profileValue,
  rankChange,
} from '@/lib/persona';
import { ORIGIN_COLORS } from '@/lib/theme';
import type { Origin, ProfilePeriod } from '@/lib/types';

const COLUMNS = [
  { key: 'arrivals', label: 'Arrivals', fmt: (v: number) => formatCompact(v, v >= 1e6 ? 1 : 0) },
  { key: 'growth', label: 'YoY', fmt: (v: number) => formatPct(v, 0, true) },
  { key: 'overnight', label: 'Overnight', fmt: (v: number) => `${Math.round(v)}%` },
  { key: 'age', label: 'Mean age', fmt: (v: number) => v.toFixed(1) },
  { key: 'first', label: 'First-timers', fmt: formatShare },
  { key: 'companion', label: 'With companion', fmt: formatShare },
  { key: 'nights', label: 'Nights', fmt: (v: number) => v.toFixed(1) },
  { key: 'spend', label: 'Spend / visitor', fmt: (v: number) => `$${(v / 1000).toFixed(1)}K` },
] as const;
type ColKey = (typeof COLUMNS)[number]['key'];

function marketMetrics(period: ProfilePeriod, market: string): Record<ColKey, number | null> {
  const h1 = marketH1(period, market);
  const prior = period === '2026-H1' ? marketH1('2025', market) : undefined;
  return {
    arrivals: h1?.arrivals ?? null,
    growth: h1 && prior ? pctChange(h1.arrivals, prior.arrivals) : null,
    overnight: h1 ? (h1.overnight / h1.arrivals) * 100 : null,
    age: profileValue(period, market, 'mean_age'),
    first: profileValue(period, market, 'first_timer_pct'),
    companion: profileValue(period, market, 'companion', 'With companion'),
    nights: profileValue(period, market, 'avg_nights'),
    spend: profileValue(period, market, 'per_capita_overnight_hkd'),
  };
}

/** Sortable heat table of the 18 HKTB markets; clicking a row opens its persona card. */
export function MarketPersonaTable({
  period,
  origin,
  selected,
  onSelect,
}: {
  period: ProfilePeriod;
  origin: Origin | 'All';
  selected: string;
  onSelect: (m: string) => void;
}) {
  const [sort, setSort] = useState<ColKey>('arrivals');
  const rows = useMemo(
    () =>
      MARKETS.filter((m) => origin === 'All' || m.origin === origin)
        .map((m) => ({ market: m.market, origin: m.origin, values: marketMetrics(period, m.market) }))
        .sort((a, b) => (b.values[sort] ?? -Infinity) - (a.values[sort] ?? -Infinity)),
    [period, origin, sort],
  );
  const fmt = Object.fromEntries(COLUMNS.map((c) => [c.key, c.fmt]));

  return (
    <div>
      <HeatTable
        scale="column"
        rowHeader="Market"
        activeRow={selected}
        onRowClick={onSelect}
        columns={COLUMNS.filter((c) => period === '2026-H1' || c.key !== 'growth').map((c) => ({
          key: c.key,
          label: (
            <button
              type="button"
              onClick={() => setSort(c.key)}
              className={`whitespace-nowrap hover:text-brand-800 ${sort === c.key ? 'font-semibold text-brand-800' : ''}`}
              title={`Sort by ${c.label}`}
            >
              {c.label}
              {sort === c.key ? ' ↓' : ''}
            </button>
          ),
        }))}
        rows={rows.map((r) => ({
          key: r.market,
          label: (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: ORIGIN_COLORS[r.origin] }} />
              {r.market}
            </span>
          ),
          values: r.values,
        }))}
        format={(v, col) => fmt[col](v)}
      />
      <p className="mt-2 text-[11px] text-slate-600">
        Arrivals, YoY and overnight share: HKTB arrival statistics, {H1_LABEL[period]}. Other columns: HKTB Visitor Profile, {PERIOD_LABEL[period]} (overnight
        visitors). Shading compares markets within each column. Click a row to open the persona.
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5">
      <p className="text-[11px] text-slate-600">{label}</p>
      <p className="text-base font-bold text-slate-900">{value}</p>
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

/** Persona card for one HKTB source market. */
export function MarketPersonaCard({ market, period }: { market: string; period: ProfilePeriod }) {
  const origin = MARKET_ORIGIN[market];
  const m = marketMetrics(period, market);
  const h1 = marketH1(period, market);
  const avg = {
    age: marketH1(period, 'All markets')?.mean_age ?? null,
    nights: profileValue(period, 'All markets', 'avg_nights'),
    spend: profileValue(period, 'All markets', 'per_capita_overnight_hkd'),
  };
  const ages = profile(period, market, 'age_group');
  const origins = profile(period, market, 'origin_region')
    .filter((o) => !o.category.includes('(subtotal)'))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const places = profile(period, market, 'place_rank').sort((a, b) => a.value - b.value);
  const comp = (c: string) => profileValue(period, market, 'companion', c);

  const traits: string[] = [];
  if (m.age !== null && avg.age !== null) traits.push(m.age >= avg.age + 2 ? 'older than average' : m.age <= avg.age - 2 ? 'younger than average' : 'around the average age');
  if (m.first !== null) traits.push(m.first >= 40 ? 'many first-time visitors' : m.first <= 20 ? 'mostly repeat visitors' : 'a mix of first-time and repeat visitors');
  if (m.spend !== null && avg.spend !== null) traits.push(m.spend > avg.spend * 1.1 ? 'high spend per trip' : m.spend < avg.spend * 0.9 ? 'below-average spend per trip' : 'average spend per trip');
  if (m.nights !== null && avg.nights !== null) traits.push(m.nights > avg.nights + 0.3 ? 'longer stays' : m.nights < avg.nights - 0.3 ? 'shorter stays' : 'typical stay length');

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-canvas p-4 shadow-card sm:p-5" style={{ borderTop: `4px solid ${ORIGIN_COLORS[origin]}` }}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Market persona · {PERIOD_LABEL[period]}</p>
          <h3 className="text-xl font-bold text-brand-900">{market}</h3>
          <p className="mt-0.5 text-xs text-slate-600">{traits.length ? `${traits.join(', ')}.` : ''}</p>
        </div>
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-canvas" style={{ background: ORIGIN_COLORS[origin] }}>
          {origin}
        </span>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            <Stat
              label={`Arrivals, ${H1_LABEL[period]}`}
              value={m.arrivals !== null ? formatCompact(m.arrivals, m.arrivals >= 1e6 ? 2 : 0) : '–'}
              hint={m.growth !== null ? `${formatPct(m.growth, 1, true)} vs Jan–Jun 2025` : undefined}
            />
            <Stat label="Overnight share" value={m.overnight !== null ? `${Math.round(m.overnight)}%` : '–'} hint={h1 ? `${formatCompact(h1.overnight, 0)} overnight` : undefined} />
            <Stat
              label="Mean age"
              value={m.age !== null ? `${m.age.toFixed(1)} yrs` : '–'}
              hint={h1?.male_pct !== null && h1?.male_pct !== undefined ? `${Math.round(h1.male_pct)}% male · ${Math.round(100 - h1.male_pct)}% female` : undefined}
            />
            <Stat label="First-time visitors" value={formatShare(m.first)} />
            <Stat label="Average nights" value={m.nights !== null ? m.nights.toFixed(1) : '–'} hint={avg.nights ? `All markets: ${avg.nights.toFixed(1)}` : undefined} />
            <Stat label="Spend per overnight visitor" value={m.spend !== null ? formatHkd(m.spend) : '–'} hint={avg.spend ? `All markets: ${formatHkd(avg.spend)}` : undefined} />
            <Stat
              label="Travel with companions"
              value={formatShare(comp('With companion'))}
              hint={`Family ${formatShare(comp('With family members'))} · kids ${formatShare(comp('With kids'))}`}
            />
            <Stat label="Travel alone" value={comp('With companion') !== null ? formatShare(100 - (comp('With companion') ?? 0)) : '–'} />
          </div>

          {ages.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-semibold text-slate-800">Age profile</p>
              <div className="flex h-5 overflow-hidden rounded-md">
                {AGE_GROUPS.map((g, i) => {
                  const v = ages.find((a) => a.category === g)?.value ?? 0;
                  return (
                    <div
                      key={g}
                      className="flex items-center justify-center text-[10px] font-semibold"
                      style={{ width: `${v}%`, background: AGE_COLORS[i], color: labelColor(AGE_COLORS[i]) }}
                      title={`${g}: ${v}%`}
                    >
                      {v >= 8 ? `${v}%` : ''}
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-600">
                {AGE_GROUPS.map((g, i) => (
                  <span key={g} className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm" style={{ background: AGE_COLORS[i] }} />
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-800">Where they come from (overnight visitors)</p>
          {origins.length ? (
            <ul className="space-y-1.5">
              {origins.map((o) => (
                <li key={o.category} className="text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="truncate text-slate-700" title={o.category}>
                      {o.category}
                    </span>
                    <span className="tabular-nums text-slate-600">{formatShare(o.value)}</span>
                  </div>
                  <div className="mt-0.5 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full" style={{ width: `${(o.value / origins[0].value) * 100}%`, background: ORIGIN_COLORS[origin] }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Not published for this market (city-state or single origin).</p>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-800">Top places visited</p>
          {places.length ? (
            <ol className="space-y-1">
              {places.map((p) => (
                <li key={p.category} className="flex items-center gap-2 text-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-canvas">{p.value}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700" title={p.category}>
                    {p.category}
                  </span>
                  <RankBadge change={rankChange(period, market, p.category, p.value)} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-slate-500">Not published for this period.</p>
          )}
        </div>
      </div>
      <p className="mt-4 text-[11px] text-slate-600">
        Sources: HKTB Visitor Profile Report 2025 FY / 2026 H1 (market summary pages); HKTB visitor arrival statistics ({H1_LABEL[period]}) for arrivals, overnight share and gender.
      </p>
    </article>
  );
}
