'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVerifyHint, setShowVerifyHint] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      } else {
        setRegisteredEmail(email);
        setShowVerifyHint(true);
      }
    } catch (err: any) {
      const msg = err.message || '注册失败，请重试';
      if (msg.includes('rate limit') || msg.includes('Email rate limit')) {
        setError('注册请求过于频繁，请稍等几分钟后再试。如果已注册过，请直接登录。');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (showVerifyHint) {
    return (
      <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-200/80 backdrop-blur">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            返回主页
          </Link>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-950">注册成功</h2>
          <p className="mt-3 font-medium leading-7 text-slate-700">
            我们已向 <span className="font-bold text-blue-600">{registeredEmail}</span> 发送验证邮件。
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">请前往邮箱点击验证链接，验证完成后即可登录使用。</p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-600/25 outline-none transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-200"
          >
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-200/80 backdrop-blur">
      <div className="mb-6">
        <Link href="/" className="inline-flex rounded-full px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-100">
          ← 返回主页
        </Link>
      </div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-500/25">
          DF
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">创建账户</h1>
        <p className="mt-2 text-sm text-slate-500">开始生成你的产品设计方案</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-5">
        <div>
          <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-slate-700">姓名</label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="请输入姓名"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">邮箱地址</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="请输入邮箱"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">密码</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="请输入密码（至少6位）"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/25 outline-none transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-200 disabled:bg-blue-300 disabled:shadow-none disabled:hover:translate-y-0"
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        已有账户？{' '}
        <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700">
          立即登录
        </Link>
      </p>
    </div>
  );
}
