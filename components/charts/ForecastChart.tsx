'use client';

import { useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { strategy } from '@/lib/data';
import { formatCompact, formatHkd, formatHkdMillions, formatNumber, formatPct, monthLabel, pctChange } from '@/lib/format';
import { AXIS_TICK, COLORS, TOOLTIP_STYLE } from '@/lib/theme';
import { Segmented } from '../SectionCard';

type ScenarioKey = keyof typeof strategy.scenarios;
const FORECAST_YEAR = '2027';

export default function ForecastChart() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('base');
  const scenario = strategy.scenarios[scenarioKey];
  const factor = 1 + scenario.arrivals_adj_pct / 100;

  const data = useMemo(
    () =>
      strategy.series.map((p) => {
        const adj = p.month.startsWith(FORECAST_YEAR) ? factor : 1;
        return {
          month: monthLabel(p.month),
          Actual: p.actual,
          Forecast: p.forecast !== null ? Math.round(p.forecast * adj) : null,
          band: p.lower !== null && p.upper !== null ? [Math.round(p.lower * adj), Math.round(p.upper * adj)] : null,
        };
      }),
    [factor],
  );

  const annual = strategy.annual;
  const fy2025 = annual.find((a) => a.year === '2025');
  const fy2027 = annual.find((a) => a.year === FORECAST_YEAR);
  const lastActual = strategy.series.filter((p) => p.actual !== null).slice(-1)[0];
  const { model } = strategy;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Segmented<ScenarioKey>
            value={scenarioKey}
            onChange={setScenarioKey}
            options={[
              { value: 'downside', label: 'Headwinds' },
              { value: 'base', label: 'Base case' },
              { value: 'upside', label: 'Strategy delivered' },
            ]}
          />
          <span className="text-[11px] text-slate-600">
            Shaded band = {Math.round(model.confidence_level * 100)}% prediction interval
          </span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={14} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), 1)} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v, name) =>
                Array.isArray(v) ? [`${formatCompact(Number(v[0]), 2)} – ${formatCompact(Number(v[1]), 2)}`, '95% interval'] : [formatNumber(Number(v)), name]
              }
            />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Area dataKey="band" name="95% interval" stroke="none" fill={COLORS.brand} fillOpacity={0.14} connectNulls isAnimationActive={false} />
            <ReferenceLine x={monthLabel(lastActual.month)} stroke={COLORS.steelDeep} strokeDasharray="3 3" label={{ value: 'Latest actual', fontSize: 10, fill: COLORS.steelDeep, position: 'insideTopRight' }} />
            <Line dataKey="Actual" stroke={COLORS.brandDeep} strokeWidth={2.5} dot={{ r: 2 }} connectNulls={false} />
            <Line dataKey="Forecast" stroke={COLORS.accent} strokeWidth={2.5} strokeDasharray="6 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
          {model.method} · trained on {model.training_window} ({model.observations} months) · underlying trend{' '}
          {formatPct(model.annualised_trend_pct, 1, true)} p.a. · R² {model.r_squared.toFixed(2)} on de-seasonalised series.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl bg-gradient-to-br from-brand-900 to-brand-700 p-4 text-canvas">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-100">2027 projection · {scenario.label}</p>
          <p className="mt-1 text-3xl font-bold">{formatCompact(scenario.arrivals, 1)}</p>
          <p className="text-xs text-brand-100">
            visitor arrivals {fy2025 && <>({formatPct(pctChange(scenario.arrivals, fy2025.arrivals), 1, true)} vs 2025)</>}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/20 pt-3">
            <div>
              <p className="text-[11px] text-brand-100">Yield / visitor</p>
              <p className="text-lg font-semibold">{formatHkd(scenario.yield_hkd)}</p>
            </div>
            <div>
              <p className="text-[11px] text-brand-100">Tourism spend</p>
              <p className="text-lg font-semibold">{formatHkdMillions(scenario.spend_hkd_m)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-canvas/90">{scenario.description}</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Year</th>
                <th className="px-3 py-2 text-right font-medium">Arrivals</th>
                <th className="px-3 py-2 text-right font-medium">Yield</th>
                <th className="px-3 py-2 text-right font-medium">Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {annual.map((a) => (
                <tr key={a.year}>
                  <td className="px-3 py-2">
                    <span className="font-semibold text-slate-800">{a.year}</span>
                    <span className="ml-1 text-[10px] text-slate-500">{a.status}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCompact(a.arrivals, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatHkd(a.yield_hkd)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatHkdMillions(a.spend_hkd_m)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {fy2027?.arrivals_lower && fy2027.arrivals_upper && (
            <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              2027 base range: {formatCompact(fy2027.arrivals_lower, 1)} – {formatCompact(fy2027.arrivals_upper, 1)} arrivals (95%).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
