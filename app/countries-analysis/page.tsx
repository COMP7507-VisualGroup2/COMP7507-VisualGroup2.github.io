import type { Metadata } from 'next';
import VisitorPersonaTab from '@/components/tabs/VisitorPersonaTab';

export const metadata: Metadata = { title: 'Country Analysis' };

export default function CountriesAnalysisPage() {
  return <VisitorPersonaTab view="country" />;
}
