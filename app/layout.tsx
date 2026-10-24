import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Hong Kong Inbound Tourism Evaluation & Market Promotion Planning',
    template: '%s | HK Inbound Tourism Dashboard',
  },
  description:
    'Interactive dashboard evaluating Hong Kong inbound tourism (Jan 2025 – 2026 YTD): KPI summary, visitor persona, revenue analysis, competitor benchmarks and a 2027 outlook.',
};

export const viewport: Viewport = {
  themeColor: '#005F73',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <AppShell>{children}</AppShell>
        <footer className="mt-8 border-t border-slate-200 bg-canvas">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>
              Sources: C&SD, DATA.GOV.HK (ImmD, CSTB), HKMA, Singapore Tourism Board (SingStat), JNTO, World Bank / UN Tourism.
            </p>
            <nav className="flex gap-4">
              <Link href="/" className="font-medium text-brand-800 hover:underline">
                Dashboard
              </Link>
              <Link href="/methodology/" className="font-medium text-brand-800 hover:underline">
                Methodology & sources
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
