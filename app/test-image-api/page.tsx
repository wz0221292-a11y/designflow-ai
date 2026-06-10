import { notFound } from 'next/navigation';
import TestImageAPIClient from './TestImageAPIClient';

export default function TestImageAPIPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <TestImageAPIClient />;
}
