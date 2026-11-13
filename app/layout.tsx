import type { Metadata, Viewport } from 'next';
import AppShell from '@/components/AppShell';
import './globals.css';
import './v3.css';

export const metadata: Metadata = {
  title: {
    default: 'Hong Kong Inbound Tourism | Tourism Performance',
    template: '%s | Hong Kong Inbound Tourism',
  },
  description:
    'Hong Kong inbound tourism dashboard (Jan 2025 – Jun 2026): executive summary against government targets, visitor personas, revenue analysis and a 2027 outlook.',
};

export const viewport: Viewport = {
  themeColor: '#0a2540',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
