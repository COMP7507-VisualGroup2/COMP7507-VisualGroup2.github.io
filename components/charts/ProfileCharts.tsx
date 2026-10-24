'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { demographics } from '@/lib/data';
import { AXIS_TICK, COLORS, SERIES, TOOLTIP_STYLE } from '@/lib/theme';
import PendingCard from '../PendingCard';

/** Trip purpose / age profile - rendered only when data/manual/visitor_profile.csv is supplied. */
export function VisitorProfileBars({ dimension, title }: { dimension: string; title: string }) {
  const rows = demographics.visitor_profile.filter((r) => r.dimension === dimension);
  if (!rows.length) return <PendingCard id="visitor_profile" title={title} height={220} />;
  const year = rows.map((r) => r.year).sort().slice(-1)[0];
  const data = rows.filter((r) => r.year === year).map((r) => ({ category: r.category, share: r.share_pct ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="category" tick={AXIS_TICK} tickLine={false} axisLine={false} width={100} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
        <Bar dataKey="share" name={`Share (${year})`} fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Attraction sentiment bubble chart - rendered only when data/manual/attraction_sentiment.csv is supplied. */
export function SentimentBubble() {
  const rows = demographics.attraction_sentiment;
  if (!rows.length) return <PendingCard id="attraction_sentiment" title="Visitor feedback & recommendation by attraction" height={260} />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
        <CartesianGrid stroke={COLORS.grid} />
        <XAxis type="number" dataKey="sentiment_score" name="Sentiment" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis type="number" dataKey="recommend_pct" name="Recommend %" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <ZAxis type="number" dataKey="mentions" range={[80, 1200]} name="Mentions" />
        <Tooltip {...TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={rows} name="Attractions" fill={COLORS.brand} fillOpacity={0.7} stroke={COLORS.brandDeep} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
