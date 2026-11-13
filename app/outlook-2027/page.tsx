import type { Metadata } from 'next';
import OutlookStrategy from '@/components/MarketPlaybooks';

export const metadata: Metadata = { title: '2027 Outlook' };

export default function OutlookPage() {
  return <OutlookStrategy />;
}
