import { AnimatedText } from './motion';

export default function ContextMetric({ label, value, previous, change, previousPeriod = 'H1 2025' }: {
  label: string;
  value: string;
  previous: string;
  change: number | null;
  previousPeriod?: string;
}) {
  const roundedChange = change === null ? null : Number(change.toFixed(1));
  const direction = roundedChange === null ? 'unavailable' : roundedChange > 0 ? 'up' : roundedChange < 0 ? 'down' : 'unchanged';
  const changeColor = direction === 'up' ? 'text-green-700' : direction === 'down' ? 'text-red-600' : 'text-slate-500';

  return (
    <article className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <AnimatedText className="text-2xl font-bold tracking-tight text-brand-900" text={value} />
        <span className={`text-sm ${changeColor}`} aria-label={direction}>
          {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–'}
        </span>
      </p>
      <p className="mt-1 text-[15px] text-slate-500">
        vs <AnimatedText text={previous} /> in {previousPeriod}{' '}
        <span className={`font-semibold ${changeColor}`}>
          (<AnimatedText text={roundedChange === null ? 'N/A' : `${roundedChange > 0 ? '+' : ''}${roundedChange.toFixed(1)}%`} />)
        </span>
      </p>
    </article>
  );
}
