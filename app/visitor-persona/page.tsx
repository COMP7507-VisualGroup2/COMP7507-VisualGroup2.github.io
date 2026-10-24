import type { Metadata } from 'next';
import VisitorPersonaTab from '@/components/tabs/VisitorPersonaTab';

export const metadata: Metadata = { title: 'Visitor Persona' };

export default function VisitorPersonaPage() {
  return <VisitorPersonaTab />;
}
