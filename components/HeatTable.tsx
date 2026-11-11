import type { ReactNode } from 'react';

export interface HeatColumn {
  key: string;
  label: ReactNode;
  color?: string;
}

export interface HeatRow {
  key: string;
  label: ReactNode;
  values: Record<string, number | null | undefined>;
}

interface Props {
  columns: HeatColumn[];
  rows: HeatRow[];
  format: (v: number, column: string) => string;
  /** Shade relative to the whole table, or per column (for mixed units). */
  scale?: 'table' | 'column';
  rowHeader?: string;
  onRowClick?: (key: string) => void;
  activeRow?: string | null;
}

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');

/** Compact table whose cells are shaded by value (brand teal by default). */
export default function HeatTable({ columns, rows, format, scale = 'table', rowHeader = '', onRowClick, activeRow }: Props) {
  const values = (col?: string) =>
    rows.flatMap((r) => (col ? [r.values[col]] : columns.map((c) => r.values[c.key]))).filter((v): v is number => typeof v === 'number');
  const range = (col: string) => {
    const vs = values(scale === 'column' ? col : undefined);
    return vs.length ? [Math.min(...vs), Math.max(...vs)] : [0, 1];
  };
  const ranges = Object.fromEntries(columns.map((c) => [c.key, range(c.key)]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left font-medium text-slate-600">{rowHeader}</th>
            {columns.map((c) => (
              <th key={c.key} className="px-2 py-1 text-center font-medium text-slate-600">
                <span className="inline-flex items-center gap-1">
                  {c.color && <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />}
                  {c.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              onClick={onRowClick ? () => onRowClick(r.key) : undefined}
              className={`${onRowClick ? 'cursor-pointer hover:opacity-90' : ''} ${activeRow === r.key ? 'outline outline-2 outline-accent-500' : ''}`}
            >
              <th scope="row" className="whitespace-nowrap px-2 py-1 text-left font-medium text-slate-800">
                {r.label}
              </th>
              {columns.map((c) => {
                const v = r.values[c.key];
                if (typeof v !== 'number') {
                  return (
                    <td key={c.key} className="rounded bg-slate-50 px-2 py-1 text-center text-slate-400">
                      –
                    </td>
                  );
                }
                const [lo, hi] = ranges[c.key];
                const t = hi > lo ? (v - lo) / (hi - lo) : 0.5;
                const alpha = 0.08 + t * 0.72;
                return (
                  <td
                    key={c.key}
                    className={`rounded px-2 py-1 text-center tabular-nums ${alpha > 0.5 ? 'font-semibold text-canvas' : 'text-slate-800'}`}
                    style={{ background: `rgba(${toRgb('#005F73')},${alpha.toFixed(2)})` }}
                  >
                    {format(v, c.key)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
