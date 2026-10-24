'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import FilterBar from './FilterBar';
import { dataMeta, filterMonths } from '@/lib/data';
import { DEFAULT_FILTERS, FiltersProvider, useFilters } from '@/lib/filters-context';
import { formatDate, monthLong } from '@/lib/format';

export const TABS = [
  { href: '/', label: 'Summary', short: 'Summary', filters: true },
  { href: '/visitor-persona/', label: 'Visitor Persona', short: 'Persona', filters: true },
  { href: '/revenue/', label: 'Revenue Analysis', short: 'Revenue', filters: true },
  { href: '/competitors/', label: 'Competitor Analysis', short: 'Competitors', filters: true },
  { href: '/outlook-2027/', label: '2027 Outlook', short: '2027', filters: false },
];

function normalise(path: string) {
  return path.endsWith('/') ? path : `${path}/`;
}

function Header() {
  const live = dataMeta.sources.filter((s) => s.mode === 'live').length;
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 88% 15%, #EE9B00 0, transparent 32%), radial-gradient(circle at 8% 95%, #94D2BD 0, transparent 40%)',
        }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">COMP7507 · Group 2</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Hong Kong Inbound Tourism Evaluation</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-100">
            Performance from {monthLong(dataMeta.coverage.start)} to {monthLong(dataMeta.coverage.end)} and market promotion planning.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-canvas/10 px-3 py-1.5 ring-1 ring-canvas/20">Data refreshed {formatDate(dataMeta.generated_at)}</span>
          <span className="rounded-full bg-canvas/10 px-3 py-1.5 ring-1 ring-canvas/20">
            {live}/{dataMeta.sources.length} official sources live
          </span>
          <Link href="/methodology/" className="rounded-full bg-accent-500 px-3 py-1.5 font-semibold text-slate-900 hover:bg-accent-300">
            Methodology & sources →
          </Link>
        </div>
      </div>
    </header>
  );
}

function StickyBar() {
  const pathname = normalise(usePathname() || '/');
  const { filters, setFilters } = useFilters();
  const [open, setOpen] = useState(false);
  const tab = TABS.find((t) => t.href === pathname);
  const showFilters = tab?.filters ?? false;

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
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
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                    active ? 'bg-brand-800 text-canvas' : 'text-slate-600 hover:bg-mist'
                  }`}
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
            <FilterBar filters={filters} months={filterMonths} defaults={DEFAULT_FILTERS} onChange={setFilters} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <FiltersProvider>
      <Header />
      <StickyBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </FiltersProvider>
  );
}
