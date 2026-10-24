import Link from 'next/link';
import DataSourceBadge from './DataSourceBadge';
import { pendingFor } from '@/lib/data';

/** Placeholder for proposal items that have no open data source yet. */
export default function PendingCard({ id, title, height = 180 }: { id: string; title: string; height?: number }) {
  const item = pendingFor(id);
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-blush-500 bg-blush-50 p-5 text-center"
      style={{ minHeight: height }}
    >
      <DataSourceBadge kind="pending" />
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {item && (
        <>
          <p className="max-w-md text-xs text-slate-600">{item.source}.</p>
          <p className="text-[11px] text-slate-600">
            Add rows to <code className="rounded bg-canvas px-1 py-0.5">{item.file}</code> ({item.columns.join(', ')}) and re-run the pipeline.
          </p>
        </>
      )}
      <Link href="/methodology/#pending" className="text-xs font-semibold text-brand-800 hover:underline">
        How to supply this data →
      </Link>
    </div>
  );
}
