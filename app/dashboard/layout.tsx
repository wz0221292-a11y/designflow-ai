'use client';

import { ProjectProvider } from '@/contexts/ProjectContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProjectProvider>
      {children}
    </ProjectProvider>
  );
}