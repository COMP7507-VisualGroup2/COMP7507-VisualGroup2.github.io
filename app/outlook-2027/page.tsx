import type { Metadata } from 'next';
import { OutlookStrategy } from '@/components/MarketPlaybooks';

export const metadata: Metadata = { title: 'H2 2026 Outlook' };

export default function OutlookPage() {
  return <OutlookStrategy />;
}
