'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Dropdown from './Dropdown';
import { dataMeta, filterMonths, summary } from '@/lib/data';
import { filterNotes } from '@/lib/filters';
import { DEFAULT_FILTERS, FiltersProvider, useFilters } from '@/lib/filters-context';
import { monthLong } from '@/lib/format';
import type { Filters, Segment } from '@/lib/types';

export const TABS = [
  { href: '/', label: 'Executive summary', short: 'Summary', title: 'Inbound tourism, at a glance.', description: 'A half-year performance review against 2026 government targets.' },
  { href: '/visitor-persona/', label: 'Visitor Persona', short: 'Persona', title: 'Visitor profiles by origin market.', description: 'Explore source-market personas, arrivals, travel patterns, spending and visitor experience.' },
  { href: '/revenue/', label: 'Revenue Analysis', short: 'Revenue', title: 'Economic yield across visitor markets.', description: 'Compare per-capita spend, market-area expenditure and estimated market value from the Jan–Jun 2025/2026 source data.' },
  { href: '/outlook-2027/', label: '2027 Outlook', short: '2027', title: '2027 Outlook: Market Promotion Plan', description: 'Three strategy pillars and proposed 2027 targets for 18 HKTB source markets.' },
];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const mon = (m: string) => MONTH_ABBR[Number(m.slice(5)) - 1];
const opt = <T extends string>(value: T, label: string) => ({ value, label });

const MARKET_OPTIONS = [opt<Segment | 'All'>('All', 'All markets'), opt<Segment | 'All'>('Mainland', 'Mainland China'), opt<Segment | 'All'>('Short-haul', 'Short-haul'), opt<Segment | 'All'>('Long-haul', 'Long-haul')];
const REGION_OPTIONS = [opt('All', 'All countries'), ...summary.areas.map((a) => opt(a.area, a.area === 'Macau SAR' ? 'Macao' : a.area))];
const TYPE_OPTIONS = [opt('All', 'All visitors'), opt('Overnight', 'Overnight'), opt('Same-day', 'Same-day')];
const PURPOSE_OPTIONS = [opt('All', 'All purposes'), ...['Vacation', 'Visiting friends / relatives', 'Business', 'En-route', 'Others'].map((p) => opt(p, p))];
const CHANNEL_OPTIONS = [opt('All', 'All channels'), opt('Air', 'Air'), opt('Land', 'Land'), opt('Sea', 'Sea')];
const MONTH_OPTIONS = filterMonths.map((m) => opt(m, monthLong(m)));
const YEARS = Array.from(new Set(filterMonths.map((m) => m.slice(0, 4))));
const PRESETS = [
  { label: 'All', start: filterMonths[0], end: filterMonths[filterMonths.length - 1] },
  ...YEARS.map((y) => {
    const ms = filterMonths.filter((m) => m.startsWith(y));
    return { label: ms.length === 12 ? y : `${y} YTD`, start: ms[0], end: ms[ms.length - 1] };
  }),
];

function normalise(path: string) {
  return path.endsWith('/') ? path : `${path}/`;
}

function Header() {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 font-sans text-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: 'radial-gradient(circle at 88% 15%, #EE9B00 0, transparent 32%), radial-gradient(circle at 8% 95%, #94D2BD 0, transparent 40%)',
        }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">COMP7507 · Group 2</p>
          <h1 className="mt-1 font-sans text-2xl font-bold leading-tight tracking-tight text-canvas sm:text-3xl">Hong Kong Inbound Tourism Evaluation</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-100">
            Performance from {monthLong(dataMeta.coverage.start)} to {monthLong(dataMeta.coverage.end)} and market promotion planning.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-canvas/10 px-3 py-1.5 ring-1 ring-canvas/20">Data as of {monthLong(dataMeta.coverage.end)}</span>
        </div>
      </div>
    </header>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function FilterRow() {
  const { filters, setFilters } = useFilters();
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const areaSegment = (area: string) => summary.areas.find((a) => a.area === area)?.segment;
  const setMarket = (origin: Segment | 'All') =>
    set({ origin, region: filters.region !== 'All' && origin !== 'All' && areaSegment(filters.region) !== origin ? 'All' : filters.region });
  const isDirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <Field label="Visitor market">
        <Dropdown label="Visitor market" value={filters.origin} options={MARKET_OPTIONS} onChange={setMarket} />
      </Field>
      <Field label="Country">
        <Dropdown label="Country" value={filters.region} options={REGION_OPTIONS} onChange={(region) => set({ region, origin: region !== 'All' ? 'All' : filters.origin })} />
      </Field>
      <Field label="Visitor type">
        <Dropdown label="Visitor type" value={filters.visitorType} options={TYPE_OPTIONS} onChange={(v) => set({ visitorType: v as Filters['visitorType'] })} />
      </Field>
      <Field label="Period">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {PRESETS.map((p) => {
              const active = filters.start === p.start && filters.end === p.end;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => set({ start: p.start, end: p.end })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${active ? 'bg-canvas text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <Dropdown label="Start month" value={filters.start} options={MONTH_OPTIONS} onChange={(start) => set({ start, end: start > filters.end ? start : filters.end })} />
          <span className="text-xs text-slate-500">to</span>
          <Dropdown label="End month" value={filters.end} options={MONTH_OPTIONS} onChange={(end) => set({ end, start: end < filters.start ? end : filters.start })} />
        </div>
      </Field>
      <Field label="Trip purpose">
        <Dropdown label="Trip purpose" value={filters.purpose} options={PURPOSE_OPTIONS} onChange={(purpose) => set({ purpose })} />
      </Field>
      <Field label="Entry channel">
        <Dropdown label="Entry channel" value={filters.channel} options={CHANNEL_OPTIONS} onChange={(channel) => set({ channel })} />
      </Field>
      {isDirty && (
        <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="mb-0.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent-600 hover:bg-accent-500/10">
          Reset
        </button>
      )}
    </div>
  );
}

function StickyBar() {
  const pathname = normalise(usePathname() || '/');
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-canvas/90 font-sans backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 py-2">
          <nav className="-mx-1 flex gap-1 overflow-x-auto" aria-label="Dashboard tabs">
            {TABS.map((t) => {
              const active = t.href === pathname;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${active ? 'bg-brand-800 text-canvas' : 'text-slate-600 hover:bg-mist'}`}
                >
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.short}</span>
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-brand-800 lg:hidden"
          >
            {open ? 'Hide filters' : 'Filters'}
          </button>
        </div>
        <div className={`${open ? 'block' : 'hidden'} border-t border-mist py-3 lg:block`}>
          <FilterRow />
        </div>
      </div>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const pathname = normalise(usePathname() || '/');
  const { filters } = useFilters();
  const page = TABS.find((t) => t.href === pathname) ?? TABS[0];
  const end = dataMeta.coverage.end;
  const lastDay = new Date(Number(end.slice(0, 4)), Number(end.slice(5)), 0).getDate();
  const notes = filterNotes(filters);

  return (
    <>
      <Header />
      <StickyBar />
      <main className="content !max-w-7xl">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="red-rule" /> HONG KONG · {MONTH_FULL[0].toUpperCase()}—{MONTH_FULL[Number(end.slice(5)) - 1].toUpperCase()} {end.slice(0, 4)}
            </div>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
          </div>
          <div className="heading-asof">
            <span>DATA AS OF</span>
            <strong>
              {lastDay} {mon(end).toUpperCase()} {end.slice(0, 4)}
            </strong>
          </div>
        </div>
        <div className="filter-context" aria-live="polite">
          {notes.join(' ')}
        </div>
        {children}
        <footer className="page-foot">
          <div>
            <strong>DATA NOTE</strong> Official actuals are shown where source data exists. Estimates, stale periods and unavailable breakdowns are identified in place.
          </div>
          <div>
            Sources: HKTB · government targets · data supplied with this project
          </div>
        </footer>
      </main>
    </>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <FiltersProvider>
      <Frame>{children}</Frame>
    </FiltersProvider>
  );
}
