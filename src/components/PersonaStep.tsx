'use client';

import type { Persona } from '@/types';
import StepHeader, { stepSubCardClass } from './StepHeader';

interface PersonaStepProps {
  personas: Persona[] | null;
  isLoading: boolean;
  onUpdate: (personas: Persona[]) => void;
}

const PERSONA_STYLES = [
  { gradient: 'from-violet-500 to-fuchsia-600', border: 'border-violet-100', glow: 'bg-violet-100/50' },
  { gradient: 'from-blue-500 to-cyan-600', border: 'border-blue-100', glow: 'bg-blue-100/50' },
  { gradient: 'from-emerald-500 to-teal-600', border: 'border-emerald-100', glow: 'bg-emerald-100/50' },
  { gradient: 'from-amber-500 to-orange-600', border: 'border-amber-100', glow: 'bg-amber-100/50' },
  { gradient: 'from-rose-500 to-pink-600', border: 'border-rose-100', glow: 'bg-rose-100/50' },
  { gradient: 'from-indigo-500 to-blue-600', border: 'border-indigo-100', glow: 'bg-indigo-100/50' },
];

const FIELD_DEFS = [
  { key: 'needs' as const, label: '核心需求', icon: 'M5 13l4 4L19 7', color: 'blue', placeholder: 'ta 最需要解决的问题是什么？' },
  { key: 'pain_points' as const, label: '痛点困扰', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'amber', placeholder: 'ta 现在有哪些不方便或烦恼？' },
  { key: 'scenario' as const, label: '使用场景', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', color: 'emerald', placeholder: 'ta 在什么情境下会使用这个产品？' },
];

const FIELD_COLORS: Record<string, { bg: string; border: string; iconBg: string }> = {
  blue:   { bg: 'from-blue-50/60 via-white to-white', border: 'border-blue-100', iconBg: 'bg-blue-500' },
  amber:  { bg: 'from-amber-50/60 via-white to-white', border: 'border-amber-100', iconBg: 'bg-amber-500' },
  emerald:{ bg: 'from-emerald-50/60 via-white to-white', border: 'border-emerald-100', iconBg: 'bg-emerald-500' },
};

export default function PersonaStep({ personas, isLoading, onUpdate }: PersonaStepProps) {
  // 防御：数据库 JSONB 可能返回 {} 或非数组值
  const safePersonas: Persona[] = Array.isArray(personas) ? personas : [];

  const handlePersonaChange = (index: number, field: keyof Persona, value: string | number) => {
    const newPersonas = [...safePersonas];
    newPersonas[index] = { ...newPersonas[index], [field]: value };
    onUpdate(newPersonas);
  };

  const addPersona = () => {
    onUpdate([...safePersonas, { name: '', age: 25, occupation: '', needs: '', pain_points: '', scenario: '' }]);
  };

  const removePersona = (index: number) => {
    onUpdate(safePersonas.filter((_, i) => i !== index));
  };

  const hasAny = safePersonas.length > 0;
  const namedCount = safePersonas.filter(p => p.name).length;

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-20 rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-3 w-14 rounded-full bg-slate-100 animate-pulse" />
                </div>
              </div>
              <div className="space-y-3">
                {[1,2,3].map(j => (
                  <div key={j} className="h-16 rounded-xl bg-white animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="用户画像"
        description="构建目标用户的详细画像，理解他们的需求、痛点和使用场景"
        accent="violet"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        }
        action={
          hasAny ? (
            <div className="flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-600">
              <span className="flex h-2.5 w-2.5 rounded-full bg-violet-500" />
              {safePersonas.length} 个画像 · {namedCount} 个已命名
            </div>
          ) : (
            <button
              onClick={addPersona}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 outline-none transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/30 active:translate-y-0"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              添加画像
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {safePersonas.map((persona, index) => {
          const style = PERSONA_STYLES[index % PERSONA_STYLES.length];
          const initials = persona.name ? persona.name.slice(0, 2) : `${index + 1}`;

          return (
            <div
              key={index}
              className={`group relative flex flex-col overflow-hidden rounded-[1.75rem] border ${style.border} bg-gradient-to-br from-white via-white to-slate-50/80 shadow-lg shadow-slate-200/20 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/30 hover:-translate-y-1`}
            >
              {/* Background glow */}
              <div className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full ${style.glow} blur-2xl`} />

              {/* Header section */}
              <div className="relative flex items-start gap-4 border-b border-slate-200/80 px-5 py-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${style.gradient} text-sm font-black text-white shadow-lg`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={persona.name}
                    onChange={(e) => handlePersonaChange(index, 'name', e.target.value)}
                    className="w-full border-none bg-transparent text-base font-black tracking-tight text-slate-950 outline-none placeholder:font-semibold placeholder:text-slate-500 focus:ring-0"
                    placeholder="姓名"
                  />
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-500">年龄</span>
                    <input
                      type="number"
                      value={persona.age}
                      onChange={(e) => handlePersonaChange(index, 'age', parseInt(e.target.value) || 0)}
                      className="w-14 border-none bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:ring-0"
                      placeholder="25"
                    />
                    <span className="text-slate-700">·</span>
                    <input
                      type="text"
                      value={persona.occupation}
                      onChange={(e) => handlePersonaChange(index, 'occupation', e.target.value)}
                      className="flex-1 min-w-0 border-none bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-500 focus:ring-0"
                      placeholder="职业"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removePersona(index)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-700 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  aria-label="删除画像"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Field cards */}
              <div className="relative flex-1 space-y-3 p-4">
                {FIELD_DEFS.map((field) => {
                  const fc = FIELD_COLORS[field.color];
                  return (
                    <div
                      key={field.key}
                      className={`relative overflow-hidden rounded-2xl border ${fc.border} bg-gradient-to-br ${fc.bg} px-4 py-3 shadow-sm transition-shadow hover:shadow-md`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md ${fc.iconBg}`}>
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d={field.icon} />
                          </svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{field.label}</span>
                      </div>
                      <textarea
                        value={persona[field.key] as string}
                        onChange={(e) => handlePersonaChange(index, field.key, e.target.value)}
                        className="w-full resize-none border-none bg-transparent text-xs font-medium leading-relaxed text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-500 focus:ring-0 h-16"
                        placeholder={field.placeholder}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!hasAny && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-16 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-200">
            <svg className="h-10 w-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h3 className="text-lg font-black text-slate-950">尚未创建用户画像</h3>
          <p className="mt-1.5 text-sm font-medium text-slate-500">点击上方「添加画像」手动创建，或让 AI 自动生成</p>
        </div>
      )}
    </div>
  );
}
