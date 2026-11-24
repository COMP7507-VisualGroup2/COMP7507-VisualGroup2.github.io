'use client';

import { GrowthRelationshipCard, SourceSegmentsCard, VisitorTypeMixCard } from '../charts/SummaryCharts';

export default function ReferenceTab() {
  return (
    <section aria-label="Reference" className="exec-summary">
      <div className="dashboard-grid overview-grid">
        <GrowthRelationshipCard />
        <VisitorTypeMixCard />
      </div>
      <div className="mt-[14px]"><SourceSegmentsCard /></div>
    </section>
  );
}
