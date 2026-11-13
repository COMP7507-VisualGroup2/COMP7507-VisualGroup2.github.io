import type { Filters } from './types';

export function inRange(month: string, f: Pick<Filters, 'start' | 'end'>): boolean {
  return month >= f.start && month <= f.end;
}

export function describeSegment(f: Filters): string {
  const market = f.region !== 'All' ? f.region : f.origin === 'All' ? 'All markets' : f.origin;
  return [market, f.visitorType === 'All' ? 'all visitors' : f.visitorType].join(' · ');
}

/** Context notes shown under the page heading (same rules as v3). */
export function filterNotes(f: Filters): string[] {
  const h1 = (year: string) => f.start === `${year}-01` && f.end === `${year}-06`;
  const notes: string[] = [];
  if (f.visitorType !== 'All' && f.region !== 'All') notes.push('Visitor type is not published at this origin-area granularity.');
  else if (f.visitorType !== 'All' && !h1('2025') && !h1('2026')) notes.push('Overnight/same-day actuals are available only for Jan–Jun 2025/2026.');
  if (f.channel !== 'All') notes.push('The selected entry-channel profile is historical; H1 2026 channel splits are not supplied.');
  if (f.purpose !== 'All') notes.push('Trip purpose filters the overnight visitor survey profile, not visitor arrival counts.');
  if (!h1('2025') && !h1('2026')) notes.push('Expenditure and visitor-type actuals are published for H1 periods only.');
  return notes;
}
