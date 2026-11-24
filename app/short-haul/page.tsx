import type { Metadata } from 'next';
import ShortHaulTab from '@/components/tabs/ShortHaulTab';

export const metadata: Metadata = { title: 'Short Haul Visitors' };

export default function ShortHaulPage() {
  return <ShortHaulTab />;
}
