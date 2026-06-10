'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useMousePosition } from '@/hooks/useMousePosition';

/* ── SVG Icon components ── */

function IdeaIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <defs>
        <linearGradient id="idea-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 2a7 7 0 0 0-3 13.33V18a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.67A7 7 0 0 0 12 2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 18h6M10 22h4M12 2V0" opacity="0.5" />
      <circle cx="12" cy="8" r="2" strokeWidth={1.5} />
      <path d="M12 5v1M12 10v1M9 7h1M14 7h1" strokeWidth={1} strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function EditIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M14.06 4.19 17.81 7.94" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} opacity="0.5"
        d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
      <circle cx="18" cy="18" r="4" strokeWidth={1} opacity="0.4" />
      <path d="M18 16v4M16 18h4" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function DocumentIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M14 2v6h6" />
      <path strokeLinecap="round" strokeWidth={1} opacity="0.5"
        d="M8 13h8M8 17h5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} opacity="0.6"
        d="M14.5 7.5h-5l-1 1.5 1 1.5h5l1-1.5-1-1.5Z" />
    </svg>
  );
}

function SparkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 2v4M12 18v4M2 12h4M18 12h4" opacity="0.3" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" opacity="0.25" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 7l1.5 4.5L18 13l-4.5 1.5L12 19l-1.5-4.5L6 13l4.5-1.5Z" />
    </svg>
  );
}

function CubeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M2 17 12 22l10-5" opacity="0.7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M2 12 12 17l10-5" opacity="0.4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 12v10" opacity="0.5" />
    </svg>
  );
}

function PaletteIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
      <path strokeWidth={1.5} strokeLinecap="round"
        d="M12 2a10 10 0 0 1 0 20 4 4 0 0 1 0-8 2 2 0 0 0 2-2 2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 1 2-2 4 4 0 0 1 0 8" opacity="0.6" />
      <circle cx="8.5" cy="10" r="1.5" strokeWidth={1} />
      <circle cx="15.5" cy="8" r="1.5" strokeWidth={1} />
      <circle cx="9" cy="15" r="1" strokeWidth={1} />
    </svg>
  );
}

function LayersIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M2 17 12 22l10-5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M2 12 12 17l10-5" />
    </svg>
  );
}

function RocketIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15.5 4.5c2.5 0 4.5 2 4.5 4.5 0 3.5-3 9.5-8 11 0 0-2-1.5-2-4s2-6 5.5-6Z" />
      <circle cx="14" cy="9" r="2" strokeWidth={1.2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M6.5 12.5c-1.5 1-3 1.5-3.5 1-0.5-0.5 0-2 1-3.5s2.5-3 4-3.5" opacity="0.7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
        d="M8 6c0.5-1 1-2 1.5-2.5S11 2.5 11.5 3s-0.5 2-1.5 3.5S7 8.5 6 9s-1.5 0-1-0.5S7 7 8 6Z" opacity="0.5" />
    </svg>
  );
}

function PresentationIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 21h8M12 17v4" />
      <path strokeLinecap="round" strokeWidth={1.2} opacity="0.6"
        d="M7 7h10M7 10h7M7 13h4" />
    </svg>
  );
}

const stepIcons = [SparkIcon, CubeIcon, IdeaIcon, PaletteIcon, LayersIcon, RocketIcon, PresentationIcon, DocumentIcon];

const workflow = [
  { label: '01', title: '背景研究', desc: '拆解市场、竞品与设计机会', icon: SparkIcon },
  { label: '02', title: '产品介绍', desc: '整理定位、功能与应用场景', icon: CubeIcon },
  { label: '03', title: '用户画像', desc: '生成需求、痛点与使用情境', icon: IdeaIcon },
  { label: '04', title: '外观设计', desc: '生成产品外观方向并选择主方案', icon: PaletteIcon },
  { label: '05', title: 'CMF 方案', desc: '沉淀颜色、材料与表面工艺', icon: LayersIcon },
  { label: '06', title: '故事板', desc: '组织用户旅程与汇报节奏', icon: RocketIcon },
  { label: '07', title: '爆炸图', desc: '展示部件关系与技术拆解', icon: PresentationIcon },
  { label: '08', title: 'PPT / PDF', desc: '导出可汇报的设计方案', icon: DocumentIcon },
];

const featureNotes = [
  {
    title: '从想法开始',
    desc: '输入一句产品概念，系统自动组织成完整设计任务，AI 理解设计语境而非填空。',
    icon: IdeaIcon,
    accent: '#60a5fa',
  },
  {
    title: '内容可编辑',
    desc: '每一步生成后都能继续修改，不会锁进固定模板。图片可逐张重新生成。',
    icon: EditIcon,
    accent: '#818cf8',
  },
  {
    title: '面向汇报交付',
    desc: '最终沉淀为高质量 PPT 与 PDF，适合课程答辩、客户提案和方案归档。',
    icon: DocumentIcon,
    accent: '#a78bfa',
  },
];

const primaryButton =
  'ripple inline-flex items-center justify-center rounded-full bg-[#3b82f6] px-6 py-3 text-sm font-bold text-white outline-none transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#60a5fa] hover:shadow-[0_0_32px_rgba(37,99,235,0.45)] active:translate-y-0 focus-visible:ring-4 focus-visible:ring-[#3b82f6]/30';

const secondaryButton =
  'inline-flex items-center justify-center rounded-full border border-[#1e293b] bg-[#0f172a]/80 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-[#94a3b8] outline-none transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/8 hover:text-[#e2e8f0] active:translate-y-0 focus-visible:ring-4 focus-visible:ring-[#3b82f6]/15';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useScrollReveal();
  useMousePosition();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(Boolean(user));
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRipple = useCallback((e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    const target = e.currentTarget;
    if (!target.classList.contains('ripple')) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple-effect';
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    window.location.reload();
  };

  return (
    <div className="df-page relative overflow-hidden">
      {/* ── Ambient layer ── */}
      <div className="ambient-orb ambient-orb--1" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--2" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--3" aria-hidden="true" />
      <div className="dot-grid" aria-hidden="true" />
      <div className="particles-container" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>
      <div
        className="cursor-glow"
        aria-hidden="true"
        style={{
          left: 'var(--mouse-x, -1000px)',
          top: 'var(--mouse-y, -1000px)',
        }}
      />

      {/* ── Header ── */}
      <header
        className={`df-shell fixed top-0 z-50 w-full transition-all duration-500 ease-out ${
          scrolled
            ? 'shadow-[0_1px_0_rgba(255,255,255,0.05),0_4px_24px_rgba(0,0,0,0.3)]'
            : ''
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="df-focus group flex items-center gap-3 rounded-full">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3b82f6] text-sm font-bold text-white shadow-[0_0_16px_rgba(37,99,235,0.35)] transition-shadow duration-300 group-hover:shadow-[0_0_24px_rgba(37,99,235,0.55)]">
              DF
            </span>
            <span className="text-lg font-bold tracking-tight text-[#f1f5f9]">
              DesignFlow <span className="text-[#3b82f6]">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className={primaryButton} onClick={handleRipple}>
                  打开工作台
                </Link>
                <button
                  onClick={handleLogout}
                  className="df-focus rounded-full px-4 py-2 text-sm font-semibold text-[#64748b] transition-colors duration-200 hover:bg-[#1e293b] hover:text-[#94a3b8]"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="df-focus rounded-full px-4 py-2 text-sm font-semibold text-[#94a3b8] transition-colors duration-200 hover:bg-[#1e293b] hover:text-[#e2e8f0]"
                >
                  登录
                </Link>
                <Link href="/signup" className={primaryButton} onClick={handleRipple}>
                  创建账户
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20">
        {/* ═══════════ Hero ═══════════ */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.96fr_1.04fr] lg:px-8">
          {/* Left */}
          <div>
            <div className="hero-badge mb-7 inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/20 bg-[#3b82f6]/8 px-4 py-2 text-sm font-semibold text-[#60a5fa]">
              <span className="h-2 w-2 rounded-full bg-[#818cf8] pulse-dot" />
              7 步产品设计方案生成
            </div>

            <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-[#f1f5f9] sm:text-5xl lg:text-6xl">
              <span className="text-reveal text-reveal--1 block">从一个产品想法</span>
              <span className="text-reveal text-reveal--2 mt-1 block">
                <span className="bg-gradient-to-r from-[#60a5fa] via-[#818cf8] to-[#a78bfa] bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient-shift_3s_ease-in-out_infinite]">
                  生成可汇报的设计方案
                </span>
              </span>
            </h1>

            <p className="text-reveal text-reveal--3 mt-7 max-w-2xl text-base leading-8 text-[#94a3b8] sm:text-lg">
              DesignFlow AI 把背景研究、用户画像、外观设计、CMF、故事板和爆炸图组织进同一个工作流，帮你更快形成可编辑、可导出的产品设计档案。
            </p>

            <div className="text-reveal text-reveal--3 mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href={isLoggedIn ? '/dashboard' : '/signup'}
                className={primaryButton}
                onClick={handleRipple}
              >
                {isLoggedIn ? '进入项目列表' : '开始第一个项目'}
                <svg
                  className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link href="/login" className={secondaryButton}>
                已有账户登录
              </Link>
            </div>
          </div>

          {/* Right — Preview card */}
          <div className="relative reveal-scale">
            <div className="hero-orb hero-orb--1" aria-hidden="true" />
            <div className="hero-orb hero-orb--2" aria-hidden="true" />
            <div className="df-card df-elevated border-glow float-card rounded-[22px] p-4">
              <div className="hud-corners rounded-[18px] border border-[#1e293b] bg-[#0f172a]/90 p-5">
                {/* Preview header */}
                <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#1e293b] pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748b]">
                      设计档案预览
                    </p>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-[#f1f5f9]">
                      智能宠物喂食器
                    </h2>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#34d399]/8 px-3 py-1 text-xs font-bold text-[#34d399] border border-[#34d399]/15">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#34d399] shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
                    生成中
                  </span>
                </div>
                {/* Step list */}
                <div className="grid gap-2.5">
                  {workflow.slice(0, 6).map(({ label, title, icon: StepIcon }, index) => (
                    <div
                      key={label}
                      className="group/step flex items-center gap-3 rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-2.5 transition-all duration-300 hover:border-[#3b82f6]/20 hover:bg-[#111c2e]"
                    >
                      <span className="num-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#3b82f6]/8 text-[10px] font-bold text-[#60a5fa] ring-1 ring-[#3b82f6]/12 transition-all duration-300 group-hover/step:bg-[#3b82f6]/14 group-hover/step:ring-[#3b82f6]/25">
                        {label}
                      </span>
                      <StepIcon className="h-3.5 w-3.5 text-[#475569] transition-colors duration-300 group-hover/step:text-[#64748b]" />
                      <span className="text-sm font-semibold text-[#64748b] transition-colors duration-300 group-hover/step:text-[#94a3b8]">
                        {title}
                      </span>
                      <span className="ml-auto h-1 w-12 rounded-full bg-[#1e293b] overflow-hidden">
                        <span
                          className="progress-bar block h-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#818cf8]"
                          style={{ width: `${Math.min(100, 40 + index * 10)}%` }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
                {/* Preview footer dots */}
                <div className="mt-4 flex items-center justify-center gap-1.5 pt-3 border-t border-[#1e293b]">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        i === 0 ? 'w-5 bg-[#3b82f6]' : 'w-1.5 bg-[#1e293b]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ Features ═══════════ */}
        <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal mb-10 text-center">
            <div className="section-divider mb-6" />
            <h2 className="text-2xl font-bold tracking-tight text-[#f1f5f9] sm:text-3xl">
              不是填空题，是设计引擎
            </h2>
            <p className="mt-3 text-sm text-[#64748b]">
              三个核心能力，让设计方案从想法走向交付
            </p>
          </div>

          <div className="reveal grid grid-cols-1 gap-5 md:grid-cols-3">
            {featureNotes.map(({ title, desc, icon: Icon, accent }) => (
              <article
                key={title}
                className="gradient-border-card shine-sweep glow-ring group p-6 cursor-default"
                style={{ '--accent': accent } as React.CSSProperties}
              >
                {/* Icon */}
                <div className="icon-glow mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f172a] ring-1 ring-white/5 transition-all duration-400 group-hover:scale-110"
                  style={{ color: accent }}>
                  <Icon className="h-6 w-6" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-[#f1f5f9] transition-colors duration-200 group-hover:text-white">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#64748b] transition-colors duration-200 group-hover:text-[#94a3b8]">
                  {desc}
                </p>

                {/* Bottom accent line */}
                <div
                  className="mt-5 h-0.5 w-0 rounded-full transition-all duration-500 ease-out group-hover:w-full"
                  style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
                />
              </article>
            ))}
          </div>
        </section>

        {/* ═══════════ Workflow ═══════════ */}
        <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="df-card border-glow reveal rounded-2xl p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="section-divider mb-4 ml-0" />
                <h2 className="text-2xl font-bold tracking-tight text-[#f1f5f9]">
                  完整设计流程，一页看清进度
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b]">
                  每个阶段都有明确产出，内容可编辑，图片可重新生成，最后统一导出成汇报文件。
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-[#1e293b] bg-[#0f172a] px-4 py-2 text-xs font-semibold text-[#64748b]">
                8 个阶段 · 全流程覆盖
              </span>
            </div>

            <div className="stagger-children grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {workflow.map(({ label, title, desc, icon: Icon }) => (
                <div
                  key={label}
                  className="gradient-border-card shine-sweep group/card relative overflow-hidden p-4 cursor-default"
                >
                  {/* Large step number (bg) */}
                  <span
                    className="num-badge absolute -top-1 -right-1 text-6xl font-bold text-[#1e293b] transition-colors duration-300 group-hover/card:text-[#3b82f6]/6 select-none pointer-events-none"
                    aria-hidden="true"
                  >
                    {label}
                  </span>

                  {/* Icon */}
                  <div className="icon-glow relative z-10 mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e293b] text-[#60a5fa] ring-1 ring-white/5 transition-all duration-300 group-hover/card:bg-[#3b82f6]/12 group-hover/card:text-[#818cf8] group-hover/card:ring-[#3b82f6]/20">
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <h3 className="relative z-10 font-bold text-[#f1f5f9] transition-colors duration-200 group-hover/card:text-white">
                    {title}
                  </h3>
                  <p className="relative z-10 mt-2 text-sm leading-6 text-[#64748b] transition-colors duration-200 group-hover/card:text-[#94a3b8]">
                    {desc}
                  </p>

                  {/* Step indicator dot */}
                  <div className="relative z-10 mt-4 flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full transition-all duration-300 group-hover/card:w-3 group-hover/card:bg-[#3b82f6]"
                      style={{ backgroundColor: 'var(--accent, #3b82f6)' }}
                    />
                    <span className="text-[10px] font-semibold text-[#475569]">{title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ Bottom CTA ═══════════ */}
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal df-card border-glow rounded-2xl p-8 text-center sm:p-12">
            <div className="section-divider mb-6" />
            <h2 className="text-2xl font-bold tracking-tight text-[#f1f5f9] sm:text-3xl">
              准备好开始你的第一个设计方案了吗？
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#64748b]">
              无需下载，无需配置。在浏览器中完成从研究到交付的完整设计流程。
            </p>
            <Link
              href={isLoggedIn ? '/dashboard' : '/signup'}
              className={`${primaryButton} mt-8`}
              onClick={handleRipple}
            >
              {isLoggedIn ? '进入工作台' : '免费开始'}
              <svg
                className="ml-2 h-4 w-4 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 mt-16 border-t border-[#1e293b] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-[#475569]">&copy; 2026 DesignFlow AI</p>
          <p className="text-xs text-[#334155]">AI 驱动的产品设计方案生成工具</p>
        </div>
      </footer>
    </div>
  );
}
