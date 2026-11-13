'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { filterMonths } from './data';
import type { Filters } from './types';

export const DEFAULT_FILTERS: Filters = {
  origin: 'All',
  region: 'All',
  visitorType: 'All',
  start: '2026-01',
  end: filterMonths[filterMonths.length - 1],
  purpose: 'All',
  channel: 'All',
};

const STORAGE_KEY = 'hk-tourism-filters-v3';

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
