'use client';

import type { ReactNode } from 'react';

interface StepHeaderProps {
  title: string;
  description: string;
  accent?: 'blue' | 'indigo' | 'violet' | 'cyan' | 'rose' | 'amber' | 'emerald';
  icon: ReactNode;
  action?: ReactNode;
}

const accentClasses = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  cyan: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
};

export default function StepHeader({ title, description, accent = 'blue', icon, action }: StepHeaderProps) {
  const classes = accentClasses[accent];

  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${classes} ring-1`}>
          {icon}
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export const stepSubCardClass = 'rounded-[20px] border border-slate-200 bg-white shadow-xl shadow-blue-950/5';
export const stepInputClass = 'rounded-xl border border-slate-200 bg-white text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
export const stepPrimaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 outline-none transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-200 disabled:bg-slate-300 disabled:text-white disabled:hover:translate-y-0';
export const stepSecondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 outline-none transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:translate-y-0';
export const stepGhostButtonClass = 'inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 outline-none transition hover:-translate-y-0.5 hover:bg-blue-100 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-100';
