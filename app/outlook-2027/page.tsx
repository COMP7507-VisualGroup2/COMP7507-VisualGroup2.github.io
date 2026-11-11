import type { Metadata } from 'next';
import OutlookStrategy from '@/components/MarketPlaybooks';
import { PageHeading } from '@/components/SectionCard';

export const metadata: Metadata = { title: '2027 Outlook' };

export default function OutlookPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="2027 Outlook: Market Promotion Plan"
        description="Three data-driven strategic pillars, then a playbook for each of the 18 HKTB source markets: which pillars lead there, the key initiatives, and 2027 KPI targets set against Jan–Jun 2026 baselines."
      />
      <OutlookStrategy />
    </div>
  );
}
