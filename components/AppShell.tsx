'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Dropdown from './Dropdown';
import { dataMeta, filterMonths, summary } from '@/lib/data';
import { analysis2026Filters, countryAnalysisFilters, filterNotes } from '@/lib/filters';
import { DEFAULT_FILTERS, FiltersProvider, useCountryMarket, useFilters } from '@/lib/filters-context';
import { monthLong } from '@/lib/format';
import { marketInFilter } from '@/lib/persona';
import type { Filters, Segment } from '@/lib/types';

export const TABS = [
  { href: '/', label: 'Executive summary', short: 'Summary', title: 'Inbound tourism, at a glance.', description: '' },
  { href: '/visitor-persona/', label: 'Region Analysis', short: 'Regions', title: 'Region Analysis', description: 'Explore visitor profiles and spending for Mainland China, short-haul, and long-haul markets.' },
  { href: '/countries-analysis/', label: 'Country Analysis', short: 'Country', title: 'Country Analysis', description: 'Explore visitor profiles and spending for major countries' },
  { href: '/mainland-visitors/', label: 'Mainland China Visitors', short: 'Mainland', title: 'Mainland China Visitors', description: 'Who visits, where they come from, and where H1 spending is shifting.' },
  { href: '/short-haul/', label: 'Short Haul', short: 'Short Haul', title: 'Short Haul Visitors', description: 'Market performance, overnight stays and opportunities for H2.' },
  { href: '/outlook-2027/', label: '2026 H2 Outlook', short: '2027', title: '2026 H2 Outlook: Market Promotion Plan', description: 'Three strategy pillars and proposed 2026 H2 targets for 18 HKTB source markets.' },
  { href: '/reference/', label: 'Reference', short: 'Reference', title: 'Tourism reference charts.', description: 'Visitor and revenue growth, visitor mix, and source markets.' },
];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mon = (m: string) => MONTH_ABBR[Number(m.slice(5)) - 1];
const opt = <T extends string>(value: T, label: string) => ({ value, label });

const MARKET_OPTIONS = [opt<Segment | 'All'>('All', 'All segments'), opt<Segment | 'All'>('Mainland', 'Mainland China'), opt<Segment | 'All'>('Short-haul', 'Short-haul'), opt<Segment | 'All'>('Long-haul', 'Long-haul')];
const REGION_OPTIONS = [opt('All', 'All countries'), ...summary.areas.map((a) => opt(a.area, a.area === 'Macau SAR' ? 'Macao' : a.area))];
const TYPE_OPTIONS = [opt('All', 'All visitors'), opt('Overnight', 'Overnight'), opt('Same-day', 'Same-day')];
const PURPOSE_OPTIONS = [opt('All', 'All purposes'), ...['Vacation', 'Visiting friends / relatives', 'Business', 'En-route', 'Others'].map((p) => opt(p, p))];
const CHANNEL_OPTIONS = [opt('All', 'All channels'), opt('Air', 'Air'), opt('Land', 'Land'), opt('Sea', 'Sea')];
const MONTH_OPTIONS = filterMonths.map((m) => opt(m, monthLong(m)));
const YEARS = Array.from(new Set(filterMonths.map((m) => m.slice(0, 4))));
const COUNTRY_PERIOD = countryAnalysisFilters(DEFAULT_FILTERS, filterMonths);
const COUNTRY_PERIOD_LABEL = `${mon(COUNTRY_PERIOD.start)}–${mon(COUNTRY_PERIOD.end)} ${COUNTRY_PERIOD.end.slice(0, 4)}`;
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
    <header className="relative overflow-hidden bg-gradient-to-br from-brand-100 via-brand-300 to-brand-400 font-sans text-brand-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: 'radial-gradient(circle at 88% 15%, #F5B968 0, transparent 32%), radial-gradient(circle at 8% 95%, #FFF3E0 0, transparent 40%)',
        }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-800">COMP7507 · Group 2</p>
          <h1 className="mt-1 font-sans text-2xl font-bold leading-tight tracking-tight text-brand-900 sm:text-3xl">2026 H1 Hong Kong Inbound Tourism Evaluation</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-white/50 px-3 py-1.5 text-brand-900 ring-1 ring-brand-800/20">Data as of {monthLong(dataMeta.coverage.end)}</span>
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

function FilterRow({ showContextFilters, countryAnalysis }: { showContextFilters: boolean; countryAnalysis: boolean }) {
  const { filters: sharedFilters, setFilters, market } = useFilters();
  const filters = showContextFilters ? sharedFilters : analysis2026Filters(sharedFilters, filterMonths);
  const { choices, selected, setMarket: setCountryMarket } = useCountryMarket();
  const set = (patch: Partial<Filters>) => setFilters({ ...(countryAnalysis ? sharedFilters : filters), ...patch });
  const areaSegment = (area: string) => summary.areas.find((a) => a.area === area)?.segment;
  const setMarket = (origin: Segment | 'All') => {
    if (countryAnalysis && selected && selected !== 'All' && !marketInFilter(selected, { origin, region: 'All' })) setCountryMarket('All');
    set({ origin, region: showContextFilters && filters.region !== 'All' && origin !== 'All' && areaSegment(filters.region) !== origin ? 'All' : filters.region });
  };
  useEffect(() => {
    if (countryAnalysis && market === 'Chinese Mainland' && sharedFilters.origin !== 'All' && sharedFilters.origin !== 'Mainland') {
      setFilters({ ...sharedFilters, origin: 'All' });
    }
  }, [countryAnalysis, market, setFilters, sharedFilters]);
  const visibleFilters = showContextFilters ? filters : {
    ...filters,
    ...(countryAnalysis ? { start: DEFAULT_FILTERS.start, end: DEFAULT_FILTERS.end } : {}),
    region: DEFAULT_FILTERS.region, visitorType: DEFAULT_FILTERS.visitorType, purpose: DEFAULT_FILTERS.purpose, channel: DEFAULT_FILTERS.channel,
  };
  const isDirty = JSON.stringify(visibleFilters) !== JSON.stringify(DEFAULT_FILTERS) || (countryAnalysis && selected !== undefined && selected !== 'All');
  const originLabel = showContextFilters ? 'Visitor segment' : 'Visitor Region';
  const monthOptions = showContextFilters ? MONTH_OPTIONS : MONTH_OPTIONS.filter((option) => option.value.startsWith('2026-'));
  const presets = showContextFilters ? PRESETS : PRESETS.filter((preset) => preset.start.startsWith('2026-'));

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <Field label={originLabel}>
        <Dropdown label={originLabel} value={filters.origin} options={showContextFilters ? MARKET_OPTIONS : [{ value: 'All', label: 'All regions' }, ...MARKET_OPTIONS.slice(1)]} onChange={setMarket} />
      </Field>
      {(countryAnalysis || showContextFilters) && (
        <Field label="Country">
          {countryAnalysis ? (
            <Dropdown label="Country" value={selected ?? 'All'} options={[opt('All', 'All countries'), ...choices.map((market) => opt(market.market, market.market === 'Chinese Mainland' ? 'Mainland China' : market.market))]} onChange={setCountryMarket} />
          ) : (
            <Dropdown label="Country" value={filters.region} options={REGION_OPTIONS} onChange={(region) => set({ region, origin: region !== 'All' ? 'All' : filters.origin })} />
          )}
        </Field>
      )}
      {showContextFilters && (
        <Field label="Visitor type">
          <Dropdown label="Visitor type" value={filters.visitorType} options={TYPE_OPTIONS} onChange={(v) => set({ visitorType: v as Filters['visitorType'] })} />
        </Field>
      )}
      {countryAnalysis ? (
        <Field label="Period">
          <span className="py-1.5 text-xs font-semibold text-brand-900">{COUNTRY_PERIOD_LABEL}</span>
        </Field>
      ) : (
      <Field label="Period">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {presets.map((p) => {
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
          <Dropdown label="Start month" value={filters.start} options={monthOptions} onChange={(start) => set({ start, end: start > filters.end ? start : filters.end })} />
          <span className="text-xs text-slate-500">to</span>
          <Dropdown label="End month" value={filters.end} options={monthOptions} onChange={(end) => set({ end, start: end < filters.start ? end : filters.start })} />
        </div>
      </Field>
      )}
      {showContextFilters && (
        <>
          <Field label="Trip purpose">
            <Dropdown label="Trip purpose" value={filters.purpose} options={PURPOSE_OPTIONS} onChange={(purpose) => set({ purpose })} />
          </Field>
          <Field label="Entry channel">
            <Dropdown label="Entry channel" value={filters.channel} options={CHANNEL_OPTIONS} onChange={(channel) => set({ channel })} />
          </Field>
        </>
      )}
      {isDirty && (
        <button type="button" onClick={() => {
          setFilters(showContextFilters ? DEFAULT_FILTERS : {
            ...DEFAULT_FILTERS,
            ...(countryAnalysis ? { start: sharedFilters.start, end: sharedFilters.end } : {}),
            region: filters.region, visitorType: filters.visitorType, purpose: filters.purpose, channel: filters.channel,
          });
          if (countryAnalysis) setCountryMarket('All');
        }} className="mb-0.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent-600 hover:bg-accent-500/10">
          Reset
        </button>
      )}
    </div>
  );
}

function StickyBar() {
  const pathname = normalise(usePathname() || '/');
  const activePath = pathname === '/revenue/' ? '/visitor-persona/' : pathname;
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const showFilters = pathname !== '/' && pathname !== '/reference/' && pathname !== '/mainland-visitors/' && pathname !== '/short-haul/' && pathname !== '/outlook-2027/';

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-canvas/90 font-sans backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 py-2">
          <nav className="-mx-1 flex gap-1 overflow-x-auto" aria-label="Dashboard tabs">
            {TABS.filter((t) => !['/mainland-visitors/', '/short-haul/', '/reference/'].includes(t.href)).map((t) => {
              const active = t.href === activePath;
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
          {showFilters && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-brand-800 lg:hidden"
            >
              {open ? 'Hide filters' : 'Filters'}
            </button>
          )}
        </div>
        {showFilters && (
          <div className={`${open ? 'block' : 'hidden'} border-t border-mist py-3 lg:block`}>
            <FilterRow showContextFilters={activePath !== '/visitor-persona/' && activePath !== '/countries-analysis/'} countryAnalysis={activePath === '/countries-analysis/'} />
          </div>
        )}
      </div>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const pathname = normalise(usePathname() || '/');
  const pagePath = pathname === '/revenue/' ? '/visitor-persona/' : pathname;
  const { filters } = useFilters();
  const page = TABS.find((t) => t.href === pagePath) ?? TABS[0];
  const isExecutiveSummary = page.href === '/';
  const end = dataMeta.coverage.end;
  const lastDay = new Date(Number(end.slice(0, 4)), Number(end.slice(5)), 0).getDate();
  const isVisitorAnalysis = page.href === '/visitor-persona/' || page.href === '/countries-analysis/';
  const noteFilters = isVisitorAnalysis ? { ...(page.href === '/countries-analysis/' ? countryAnalysisFilters(filters, filterMonths) : filters), region: DEFAULT_FILTERS.region, visitorType: DEFAULT_FILTERS.visitorType, purpose: DEFAULT_FILTERS.purpose, channel: DEFAULT_FILTERS.channel } : filters;
  const notes = isExecutiveSummary || page.href === '/reference/' || page.href === '/mainland-visitors/' || page.href === '/short-haul/' || page.href === '/outlook-2027/' ? [] : filterNotes(noteFilters);

  return (
    <>
      <Header />
      <StickyBar />
      <main className="content !max-w-7xl">
        <div className="page-heading">
          <div>
            <h1>{page.title}</h1>
            {page.description && <p>{page.description}</p>}
          </div>
          {!isExecutiveSummary && !isVisitorAnalysis && (
            <div className="heading-asof">
              <span>DATA AS OF</span>
              <strong>
                {lastDay} {mon(end).toUpperCase()} {end.slice(0, 4)}
              </strong>
            </div>
          )}
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
