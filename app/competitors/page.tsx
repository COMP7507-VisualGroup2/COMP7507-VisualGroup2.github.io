import type { Metadata } from 'next';
import CompetitorTab from '@/components/tabs/CompetitorTab';

export const metadata: Metadata = { title: 'Competitor Analysis' };

export default function CompetitorsPage() {
  return <CompetitorTab />;
}
