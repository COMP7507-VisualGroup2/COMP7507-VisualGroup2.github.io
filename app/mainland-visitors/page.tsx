import type { Metadata } from 'next';
import MainlandVisitorsTab from '@/components/tabs/MainlandVisitorsTab';

export const metadata: Metadata = { title: 'Mainland China Visitors' };

export default function MainlandVisitorsPage() {
  return <MainlandVisitorsTab />;
}
