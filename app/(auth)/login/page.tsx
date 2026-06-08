'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || '登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-200/80 backdrop-blur">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-100">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          返回主页
        </Link>
      </div>

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-500/25">
          DF
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">欢迎回来</h1>
        <p className="mt-2 text-sm text-slate-500">登录您的 DesignFlow AI 账户</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
            邮箱地址
          </label>
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
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
            密码
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="请输入密码"
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
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        还没有账户？{' '}
        <Link href="/signup" className="font-bold text-blue-600 hover:text-blue-700">
          立即注册
        </Link>
      </p>
    </div>
  );
}
