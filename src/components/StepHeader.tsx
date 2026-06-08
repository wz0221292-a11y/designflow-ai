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
  blue: 'from-blue-500 to-cyan-500 bg-blue-50 text-blue-700 ring-blue-100',
  indigo: 'from-indigo-500 to-blue-500 bg-indigo-50 text-indigo-700 ring-indigo-100',
  violet: 'from-violet-500 to-fuchsia-500 bg-violet-50 text-violet-700 ring-violet-100',
  cyan: 'from-cyan-500 to-blue-500 bg-cyan-50 text-cyan-700 ring-cyan-100',
  rose: 'from-rose-500 to-orange-500 bg-rose-50 text-rose-700 ring-rose-100',
  amber: 'from-amber-500 to-orange-500 bg-amber-50 text-amber-700 ring-amber-100',
  emerald: 'from-emerald-500 to-teal-500 bg-emerald-50 text-emerald-700 ring-emerald-100',
};

export default function StepHeader({ title, description, accent = 'blue', icon, action }: StepHeaderProps) {
  const classes = accentClasses[accent];

  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${classes.split(' ').slice(2).join(' ')} shadow-sm ring-1`}>
          <div className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${classes.split(' ').slice(0, 2).join(' ')} opacity-10`} />
          <div className="relative">{icon}</div>
        </div>
        <div>
          <div className="mb-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Design Step
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export const stepSubCardClass = 'rounded-[1.5rem] border border-slate-200/70 bg-white/85 shadow-lg shadow-slate-200/40';
export const stepInputClass = 'rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100';
export const stepPrimaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 outline-none transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-200 disabled:bg-blue-300 disabled:shadow-none disabled:hover:translate-y-0';
export const stepSecondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0';
export const stepGhostButtonClass = 'inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-blue-300 bg-blue-50/50 px-4 py-2 text-sm font-bold text-blue-600 outline-none transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-100';
