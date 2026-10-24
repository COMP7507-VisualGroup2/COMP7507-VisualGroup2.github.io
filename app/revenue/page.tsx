import type { Metadata } from 'next';
import RevenueTab from '@/components/tabs/RevenueTab';

export const metadata: Metadata = { title: 'Revenue Analysis' };

export default function RevenuePage() {
  return <RevenueTab />;
}
