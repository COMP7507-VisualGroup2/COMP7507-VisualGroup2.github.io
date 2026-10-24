'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { demographics, kpiSummary } from './data';
import type { Filters } from './types';

export const DEFAULT_FILTERS: Filters = {
  granularity: 'month',
  start: demographics.months[0],
  end: kpiSummary.period.latest_month,
  origin: 'All',
  visitorType: 'All',
};

const STORAGE_KEY = 'hk-tourism-filters';

interface Ctx {
  filters: Filters;
  setFilters: (f: Filters) => void;
}

const FiltersContext = createContext<Ctx>({ filters: DEFAULT_FILTERS, setFilters: () => undefined });

/** Global filter state shared by every tab; persisted for the browser session. */
export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setFilters({ ...DEFAULT_FILTERS, ...JSON.parse(saved) });
    } catch {
      /* ignore corrupted storage */
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  return <FiltersContext.Provider value={{ filters, setFilters }}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  return useContext(FiltersContext);
}
