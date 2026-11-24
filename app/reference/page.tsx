import type { Metadata } from 'next';
import ReferenceTab from '@/components/tabs/ReferenceTab';

export const metadata: Metadata = { title: 'Reference' };

export default function ReferencePage() {
  return <ReferenceTab />;
}
