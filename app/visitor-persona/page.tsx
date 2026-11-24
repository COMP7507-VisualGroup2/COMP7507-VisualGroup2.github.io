import type { Metadata } from 'next';
import MarketAnalysisTab from '@/components/tabs/MarketAnalysisTab';

export const metadata: Metadata = { title: 'Region Analysis' };

export default function VisitorPersonaPage() {
  return <MarketAnalysisTab />;
}
