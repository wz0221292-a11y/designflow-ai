'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

const features = [
  {
    title: '策略内容自动生成',
    desc: '从一句产品想法出发，自动生成背景研究、产品定位、用户画像与场景描述。',
    gradient: 'from-blue-500 to-cyan-400',
    glow: 'shadow-blue-500/30',
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h7M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    ),
    chips: ['调研', '定位', '画像'],
  },
  {
    title: '视觉设计流程化',
    desc: '覆盖外观效果、CMF、故事板和爆炸图，让方案从文字快速变成视觉资产。',
    gradient: 'from-indigo-500 to-violet-500',
    glow: 'shadow-violet-500/30',
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 17h16M7 4v16M17 4v16M8.5 8.5h7v7h-7z" />
      </svg>
    ),
    chips: ['外观', 'CMF', '故事板'],
  },
  {
    title: '汇报文件一键导出',
    desc: '将设计过程整理为 PPT 或 PDF，适合课程汇报、提案展示和方案归档。',
    gradient: 'from-emerald-500 to-teal-400',
    glow: 'shadow-emerald-500/30',
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14M7 7h3M7 11h3M15 7h2" />
      </svg>
    ),
    chips: ['PPT', 'PDF', '归档'],
  },
];

const workflow = [
  ['01', '输入产品想法', '用自然语言描述产品概念、目标用户与应用场景。'],
  ['02', '生成设计步骤', 'AI 按 7 步流程生成可编辑的设计内容和图片。'],
  ['03', '导出设计方案', '整理为 PPT / PDF，直接用于展示、打印或分享。'],
];

const primaryDarkButton = 'inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-black text-slate-950 shadow-2xl shadow-white/10 outline-none transition duration-200 hover:-translate-y-1 hover:bg-blue-50 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-300/40';
const navGhostButton = 'rounded-full px-4 py-2 text-sm font-bold text-slate-200 outline-none transition hover:bg-white/10 hover:text-white active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-white/20';
const navPrimaryButton = 'rounded-full bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-xl shadow-blue-500/25 outline-none transition hover:-translate-y-0.5 hover:bg-blue-400 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-300/40';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(Boolean(user));
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute left-[-12rem] top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute right-[-14rem] top-32 h-[34rem] w-[34rem] rounded-full bg-violet-600/25 blur-3xl" />
        <div className="absolute bottom-[-18rem] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/55 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-white/20">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-black text-blue-700 shadow-lg shadow-blue-500/20">
              DF
            </span>
            <span className="text-xl font-black tracking-tight">DesignFlow AI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className={navPrimaryButton.replace('bg-blue-500 text-white shadow-xl shadow-blue-500/25 hover:bg-blue-400', 'bg-white text-slate-950 shadow-xl shadow-white/10 hover:bg-blue-50')}>
                  项目列表
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-full px-4 py-2 text-sm font-bold text-slate-300 outline-none transition hover:bg-white/10 hover:text-white active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-white/20"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={navGhostButton}>登录</Link>
                <Link href="/signup" className={navPrimaryButton}>注册</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative pt-32 pb-20">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100 shadow-2xl shadow-blue-950/30 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-lg shadow-cyan-300/40" />
              AI 产品设计工作流 · 7 步自动生成
            </div>
            <h1 className="text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              把产品想法
              <span className="block bg-gradient-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                变成完整设计方案
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              DesignFlow AI 帮你从背景研究、用户画像到外观设计、CMF、故事板和爆炸图，快速形成可编辑、可导出的产品设计方案。
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href={isLoggedIn ? '/dashboard' : '/signup'} className={`group w-fit ${primaryDarkButton}`}>
                {isLoggedIn ? '打开工作台' : '免费开始'}
                <svg className="ml-2 h-5 w-5 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <div className="text-sm font-medium text-slate-400">无需复杂建模 · 支持 PPT / PDF 导出</div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-blue-500/25 to-violet-500/25 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="rounded-[2rem] bg-slate-950/70 p-5 ring-1 ring-white/10">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-200">Project Preview</p>
                    <h2 className="mt-2 text-xl font-black">智能宠物喂食器</h2>
                  </div>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">生成中</span>
                </div>
                <div className="grid gap-3">
                  {['背景研究', '产品介绍', '用户画像', '外观设计', 'CMF 方案', '故事板', '爆炸图'].map((item, index) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 transition hover:bg-white/[0.09]">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-400/15 text-xs font-black text-blue-100">{index + 1}</span>
                      <span className="font-semibold text-slate-100">{item}</span>
                      <span className="ml-auto h-2 w-16 rounded-full bg-white/10">
                        <span className="block h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-400" style={{ width: `${Math.min(100, 40 + index * 8)}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] p-7 shadow-2xl shadow-black/20 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/[0.12] hover:shadow-blue-950/30">
                <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${feature.gradient} opacity-20 blur-2xl transition group-hover:scale-125 group-hover:opacity-30`} />
                <div className="relative mb-6 flex items-center gap-4">
                  <div className={`relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${feature.gradient} text-white shadow-2xl ${feature.glow} transition duration-300 group-hover:scale-105 group-hover:rotate-3`}>
                    <div className="absolute inset-1 rounded-[1.25rem] border border-white/25" />
                    {feature.icon}
                  </div>
                  <div className="grid gap-1">
                    {feature.chips.map((chip) => (
                      <span key={chip} className="w-fit rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <h3 className="relative text-xl font-black">{feature.title}</h3>
                <p className="relative mt-3 leading-7 text-slate-300">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.08] p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold text-blue-200">Workflow</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">简单三步，完成设计方案</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-400">从想法到交付材料，减少重复整理时间，把精力留给设计判断。</p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
              {workflow.map(([num, title, desc]) => (
                <div key={num} className="rounded-3xl bg-slate-950/50 p-6 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-slate-950/70">
                  <div className="text-sm font-black text-cyan-200">{num}</div>
                  <h3 className="mt-3 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          <p>© 2026 DesignFlow AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
