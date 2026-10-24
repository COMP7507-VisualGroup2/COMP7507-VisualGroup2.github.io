'use client';

import type { Filters, Granularity, Origin, VisitorType } from '@/lib/types';
import { monthLong } from '@/lib/format';
import { Segmented } from './SectionCard';

interface Props {
  filters: Filters;
  months: string[];
  defaults: Filters;
  onChange: (next: Filters) => void;
}

const ORIGIN_OPTIONS: (Origin | 'All')[] = ['All', 'Mainland', 'Short-haul', 'Long-haul', 'Emerging'];

export default function FilterBar({ filters, months, defaults, onChange }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const years = Array.from(new Set(months.map((m) => m.slice(0, 4))));
  const presets = [
    { label: 'All', start: months[0], end: defaults.end },
    ...years.map((y) => {
      const ms = months.filter((m) => m.startsWith(y) && m <= defaults.end);
      return { label: ms.length === 12 ? y : `${y} YTD`, start: ms[0], end: ms[ms.length - 1] };
    }),
  ];
  const isDirty = JSON.stringify(filters) !== JSON.stringify(defaults);

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <Field label="Granularity">
        <Segmented<Granularity>
          value={filters.granularity}
          onChange={(v) => set('granularity', v)}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' },
          ]}
        />
      </Field>

      <Field label="Date range">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {presets.map((p) => {
              const active = filters.start === p.start && filters.end === p.end;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChange({ ...filters, start: p.start, end: p.end })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    active ? 'bg-canvas text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <MonthSelect
            label="Start month"
            value={filters.start}
            options={months.filter((m) => m <= filters.end)}
            onChange={(v) => set('start', v)}
          />
          <span className="text-xs text-slate-500">to</span>
          <MonthSelect
            label="End month"
            value={filters.end}
            options={months.filter((m) => m >= filters.start)}
            onChange={(v) => set('end', v)}
          />
        </div>
      </Field>

      <Field label="Visitor origin">
        <select
          aria-label="Visitor origin"
          value={filters.origin}
          onChange={(e) => set('origin', e.target.value as Origin | 'All')}
          className="rounded-lg border border-slate-200 bg-canvas px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          {ORIGIN_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o === 'All' ? 'All markets' : o}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Visitor type">
        <Segmented<VisitorType | 'All'>
          value={filters.visitorType}
          onChange={(v) => set('visitorType', v)}
          options={[
            { value: 'All', label: 'All' },
            { value: 'Overnight', label: 'Overnight' },
            { value: 'Same-day', label: 'Same-day' },
          ]}
        />
      </Field>

      {isDirty && (
        <button
          type="button"
          onClick={() => onChange(defaults)}
          className="mb-0.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent-600 hover:bg-accent-500/10"
        >
          Reset
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function MonthSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-canvas px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
    >
      {options.map((m) => (
        <option key={m} value={m}>
          {monthLong(m)}
        </option>
      ))}
    </select>
  );
}
