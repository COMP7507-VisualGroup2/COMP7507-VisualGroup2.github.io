'use client';

import { useState } from 'react';
import { revenue } from '@/lib/data';
import { Segmented } from '../SectionCard';
import type { Filters } from '@/lib/types';

type Mode = 'yoy' | 'index';

function quarterOf(month: string) {
  return `${month.slice(0, 4)}-Q${Math.floor((Number(month.slice(5)) - 1) / 3) + 1}`;
}

function cellColor(value: number | null, mode: Mode): string {
  if (value === null) return '#f1f5f9';
  if (mode === 'index') {
    const t = Math.max(0, Math.min(1, (value - 50) / 90));
    return `rgba(0, 95, 115, ${0.12 + t * 0.78})`;
  }
  const t = Math.min(1, Math.abs(value) / 15);
  return value >= 0 ? `rgba(10, 147, 150, ${0.12 + t * 0.78})` : `rgba(202, 103, 2, ${0.15 + t * 0.75})`;
}

export default function BriHeatmap({ filters }: { filters: Filters }) {
  const [mode, setMode] = useState<Mode>('yoy');
  const quarters = Array.from(new Set(revenue.bri_quarterly.map((r) => r.quarter))).filter((q) => q >= '2025-Q1');
  const selected = new Set([quarterOf(filters.start), quarterOf(filters.end)]);
  const lookup = new Map(revenue.bri_quarterly.map((r) => [`${r.industry}|${r.quarter}`, r]));
  const startQ = quarterOf(filters.start);
  const endQ = quarterOf(filters.end);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented<Mode>
          size="xs"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'yoy', label: 'YoY % change' },
            { value: 'index', label: 'Index (2015 = 100)' },
          ]}
        />
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          {mode === 'yoy' ? (
            <>
              <span className="h-2.5 w-6 rounded" style={{ background: cellColor(-12, 'yoy') }} /> decline
              <span className="h-2.5 w-6 rounded" style={{ background: cellColor(12, 'yoy') }} /> growth
            </>
          ) : (
            <>
              <span className="h-2.5 w-6 rounded" style={{ background: cellColor(55, 'index') }} /> low
              <span className="h-2.5 w-6 rounded" style={{ background: cellColor(135, 'index') }} /> high
            </>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="w-40 text-left font-medium text-slate-500" />
              {quarters.map((q) => (
                <th
                  key={q}
                  className={`whitespace-nowrap px-1 pb-1 text-center font-medium ${
                    q >= startQ && q <= endQ ? 'text-brand-800' : 'text-slate-500'
                  } ${selected.has(q) ? 'underline decoration-accent-500 decoration-2 underline-offset-4' : ''}`}
                >
                  {q.replace('-', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {revenue.bri_industries.map((industry) => (
              <tr key={industry}>
                <th scope="row" className="pr-2 text-left font-medium leading-tight text-slate-600">
                  {industry === 'Tourism, convention and exhibition services' ? 'Tourism, convention & exhibition' : industry}
                </th>
                {quarters.map((q) => {
                  const rec = lookup.get(`${industry}|${q}`);
                  const value = rec ? (mode === 'yoy' ? rec.yoy_pct : rec.index) : null;
                  const strong = mode === 'yoy' ? Math.abs(value ?? 0) > 7 : (value ?? 0) > 100;
                  const dim = q < startQ || q > endQ;
                  return (
                    <td
                      key={q}
                      title={rec ? `${industry} · ${q}: index ${rec.index}, YoY ${rec.yoy_pct ?? '–'}%` : 'Not yet published'}
                      className={`h-9 rounded-md text-center font-semibold tabular-nums transition ${strong ? 'text-canvas' : 'text-slate-800'} ${
                        dim ? 'opacity-40' : ''
                      }`}
                      style={{ background: cellColor(value, mode) }}
                    >
                      {value === null ? '–' : mode === 'yoy' ? `${value > 0 ? '+' : ''}${value.toFixed(1)}` : value.toFixed(0)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
