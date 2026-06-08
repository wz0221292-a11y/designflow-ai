'use client';

import type { Persona } from '@/types';
import StepHeader, { stepSubCardClass } from './StepHeader';

interface PersonaStepProps {
  personas: Persona[] | null;
  isLoading: boolean;
  onUpdate: (personas: Persona[]) => void;
}

const PERSONA_ACCENTS = [
  { bar: 'from-violet-500 to-fuchsia-500', light: 'border-violet-200 bg-violet-50 text-violet-700', dot: 'bg-violet-500', icon: 'text-violet-400' },
  { bar: 'from-blue-500 to-cyan-500', light: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500', icon: 'text-blue-400' },
  { bar: 'from-emerald-500 to-teal-500', light: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', icon: 'text-emerald-400' },
  { bar: 'from-amber-500 to-orange-500', light: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500', icon: 'text-amber-400' },
  { bar: 'from-rose-500 to-pink-500', light: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500', icon: 'text-rose-400' },
  { bar: 'from-indigo-500 to-blue-500', light: 'border-indigo-200 bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500', icon: 'text-indigo-400' },
];

const FIELD_CONFIG = [
  { key: 'needs' as const, label: '需求', icon: 'M5 13l4 4L19 7', accent: 'border-l-blue-400 bg-blue-50/50', badge: 'bg-blue-100 text-blue-700' },
  { key: 'pain_points' as const, label: '痛点', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', accent: 'border-l-amber-400 bg-amber-50/50', badge: 'bg-amber-100 text-amber-700' },
  { key: 'scenario' as const, label: '场景', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', accent: 'border-l-emerald-400 bg-emerald-50/50', badge: 'bg-emerald-100 text-emerald-700' },
];

export default function PersonaStep({ personas, isLoading, onUpdate }: PersonaStepProps) {
  const handlePersonaChange = (index: number, field: keyof Persona, value: string | number) => {
    const newPersonas = [...(personas || [])];
    newPersonas[index] = {
      ...newPersonas[index],
      [field]: value,
    };
    onUpdate(newPersonas);
  };

  const addPersona = () => {
    const newPersona: Persona = {
      name: '',
      age: 25,
      occupation: '',
      needs: '',
      pain_points: '',
      scenario: '',
    };
    onUpdate([...(personas || []), newPersona]);
  };

  const removePersona = (index: number) => {
    const newPersonas = (personas || []).filter((_, i) => i !== index);
    onUpdate(newPersonas);
  };

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-5 w-24 rounded-full bg-slate-200 animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-4 rounded-full bg-slate-100 animate-pulse" />
                <div className="h-4 rounded-full bg-slate-100 animate-pulse w-5/6" />
                <div className="h-4 rounded-full bg-slate-100 animate-pulse w-4/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasAny = personas && personas.length > 0;

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="用户画像"
        description="定义目标用户的核心特征与需求"
        accent="violet"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        }
        action={
          <div className="flex items-center gap-2">
            {hasAny && (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-600">
                {(personas || []).length} 个画像
              </span>
            )}
            <button
              onClick={addPersona}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-violet-300 bg-violet-50/50 px-4 py-2 text-xs font-bold text-violet-600 outline-none transition hover:-translate-y-0.5 hover:border-violet-400 hover:bg-violet-50 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-violet-100"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              添加画像
            </button>
          </div>
        }
      />

      {/* Status banner */}
      {hasAny && (
        <div className="mb-6 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50/50 px-5 py-3.5 text-sm font-semibold text-violet-800 flex items-center gap-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <svg className="h-5 w-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <span>已创建 {(personas || []).length} 个用户画像</span>
          <span className="ml-auto text-xs font-normal text-violet-500">
            {(personas || []).filter(p => p.name).length} 个已命名
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(personas || []).map((persona, index) => {
          const accent = PERSONA_ACCENTS[index % PERSONA_ACCENTS.length];
          const initials = persona.name ? persona.name.slice(0, 2) : `${index + 1}`;

          return (
            <div
              key={index}
              className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-200/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              {/* Top accent bar */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${accent.bar} shrink-0`} />

              {/* Header */}
              <div className="flex items-start gap-3 border-b border-slate-100/80 px-5 py-4">
                {/* Avatar */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accent.bar} text-xs font-black text-white shadow-md`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={persona.name}
                    onChange={(e) => handlePersonaChange(index, 'name', e.target.value)}
                    className="w-full border-none bg-transparent text-base font-black text-slate-950 outline-none placeholder:font-bold placeholder:text-slate-300 focus:ring-0"
                    placeholder="姓名"
                  />
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-400">年龄</span>
                    <input
                      type="number"
                      value={persona.age}
                      onChange={(e) => handlePersonaChange(index, 'age', parseInt(e.target.value) || 0)}
                      className="w-12 border-none bg-transparent text-[11px] font-bold text-slate-700 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:ring-0"
                      placeholder="25"
                    />
                    <span className="text-[11px] font-medium text-slate-300">·</span>
                    <input
                      type="text"
                      value={persona.occupation}
                      onChange={(e) => handlePersonaChange(index, 'occupation', e.target.value)}
                      className="flex-1 border-none bg-transparent text-[11px] font-bold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300 focus:ring-0"
                      placeholder="职业"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removePersona(index)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  aria-label="删除画像"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-2 p-4">
                {FIELD_CONFIG.map((field) => (
                  <div key={field.key} className={`rounded-xl border-l-2 ${field.accent} pl-3 pr-2 py-2`}>
                    <div className="mb-1 flex items-center gap-1.5">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md ${field.badge}`}>
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={field.icon} /></svg>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{field.label}</span>
                    </div>
                    <textarea
                      value={persona[field.key] as string}
                      onChange={(e) => handlePersonaChange(index, field.key, e.target.value)}
                      className="w-full resize-none border-none bg-transparent text-xs font-medium leading-relaxed text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300 focus:ring-0 h-14"
                      placeholder={field.key === 'needs' ? '用户的核心需求' : field.key === 'pain_points' ? '用户的痛点与困扰' : '典型使用场景'}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!hasAny && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-12 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 ring-1 ring-violet-100">
              <svg className="h-8 w-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-700">尚未创建用户画像</p>
          <p className="mt-1 text-xs font-medium text-slate-500">点击「重新生成」或「添加画像」创建用户画像</p>
        </div>
      )}
    </div>
  );
}
