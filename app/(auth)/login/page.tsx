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
    <div className="df-card df-elevated rounded-[22px] p-7 sm:p-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#1e293b] bg-[#0f172a] px-4 py-2 text-sm font-semibold text-[#64748b] outline-none transition hover:-translate-y-0.5 hover:bg-[#1e293b] hover:text-[#f1f5f9] active:translate-y-0 focus-visible:ring-4 focus-visible:ring-[#3b82f6]/15">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          返回主页
        </Link>
      </div>

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0f172a] text-sm font-bold text-[#f1f5f9]">
          DF
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#f1f5f9]">欢迎回来</h1>
        <p className="mt-2 text-sm text-[#64748b]">登录你的 DesignFlow AI 工作台</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#475569]">
            邮箱地址
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 font-medium text-[#f1f5f9] outline-none transition focus:border-[#3b82f6] focus:bg-[#1e293b] focus:ring-4 focus:ring-[#3b82f6]/15"
            placeholder="请输入邮箱"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#475569]">
            密码
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 font-medium text-[#f1f5f9] outline-none transition focus:border-[#3b82f6] focus:bg-[#1e293b] focus:ring-4 focus:ring-[#3b82f6]/15"
            placeholder="请输入密码"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-[#7f1d1d] bg-[#1f0f0f] p-3 text-sm font-medium text-[#f87171]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#3b82f6] px-5 py-3 font-bold text-white outline-none transition hover:-translate-y-0.5 hover:bg-[#60a5fa] active:translate-y-0 focus-visible:ring-4 focus-visible:ring-[#3b82f6]/20 disabled:bg-[#1e3a5f] disabled:hover:translate-y-0"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#64748b]">
        还没有账户？{' '}
        <Link href="/signup" className="font-bold text-[#3b82f6] hover:text-[#60a5fa]">
          立即注册
        </Link>
      </p>
    </div>
  );
}
