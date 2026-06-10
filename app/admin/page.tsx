'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type Announcement = {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
};

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  membership_plan: string;
  membership_expires_at: string | null;
  active_plan: string;
  created_at: string;
  project_count: number;
  orders: {
    total: number;
    paid: number;
    pending: number;
    revenue: number;
    lastPaidAt: string | null;
  };
};

type ChangelogEntry = {
  id: string;
  title: string;
  content: string;
  category: string;
  version: string | null;
  created_by: string | null;
  created_at: string;
};

type StorageSnapshot = {
  totalBytes: number;
  totalFiles: number;
  sizedBytes: number;
  sizedFiles: number;
  unsizedFiles: number;
  byType: Record<string, { bytes: number; files: number }>;
  topUsers: Array<{ userId: string; email: string; bytes: number; files: number }>;
  topProjects: Array<{ projectId: string; projectName: string; userId: string; userEmail: string; bytes: number; files: number }>;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
}

// ── shared buttons ──────────────────────────────────────────────
const btnBase = 'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-bold outline-none transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0';
const priBtn = `${btnBase} bg-[#6366f1] text-white hover:bg-[#818cf8] focus-visible:ring-4 focus-visible:ring-[#6366f1]/20`;
const secBtn = `${btnBase} border border-[#1e293b] bg-[#0f172a] text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#e2e8f0] focus-visible:ring-4 focus-visible:ring-[#6366f1]/15`;
const dangerBtn = `${btnBase} border border-[#7f1d1d] bg-[#0f172a] text-[#f87171] hover:bg-[#1f0f0f] focus-visible:ring-4 focus-visible:ring-[#f87171]/15`;

const TABS = [
  { key: 'stats', label: '数据概览', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'users', label: '用户管理', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { key: 'announcements', label: '公告管理', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  { key: 'changelogs', label: '更新日志', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'health', label: '健康检查', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { key: 'storage', label: '存储用量', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
];

const CATEGORIES: Record<string, { label: string; color: string }> = {
  feature: { label: '新功能', color: 'bg-[#6d28d9]/20 text-[#c4b5fd]' },
  fix: { label: '修复', color: 'bg-[#dc2626]/15 text-[#fca5a5]' },
  improvement: { label: '改进', color: 'bg-[#0284c7]/15 text-[#7dd3fc]' },
  other: { label: '其他', color: 'bg-[#475569]/30 text-[#94a3b8]' },
};

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('stats');
  const router = useRouter();

  // Stats
  const [stats, setStats] = useState<any>(null);
  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPublished, setEditPublished] = useState(true);
  const [deleting, setDeleting] = useState(false);
  // Users
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [usersExpanded, setUsersExpanded] = useState<Record<string, boolean>>({});
  const [userFilter, setUserFilter] = useState<'all' | 'member' | 'nonmember'>('all');
  // Changelogs
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [clTitle, setClTitle] = useState('');
  const [clContent, setClContent] = useState('');
  const [clCategory, setClCategory] = useState('feature');
  const [clVersion, setClVersion] = useState('');
  const [clSaving, setClSaving] = useState(false);
  const [editingChangelog, setEditingChangelog] = useState<ChangelogEntry | null>(null);
  const [eclTitle, setEclTitle] = useState('');
  const [eclContent, setEclContent] = useState('');
  const [eclCategory, setEclCategory] = useState('feature');
  const [eclVersion, setEclVersion] = useState('');
  const [health, setHealth] = useState<any[]>([]);
  const [healthSummary, setHealthSummary] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [fixingAsset, setFixingAsset] = useState<string | null>(null);
  const [fixResults, setFixResults] = useState<Record<string, 'ok' | 'fail'>>({});
  const [showCreateChangelog, setShowCreateChangelog] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  // Storage
  const [storage, setStorage] = useState<StorageSnapshot | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const adminRes = await fetch('/api/admin/me', { cache: 'no-store', credentials: 'include' });
      const adminData = await adminRes.json();
      if (!adminData.isAdmin) { router.replace('/dashboard'); return; }
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/login'); return; }
      setUser(currentUser);
      await Promise.all([fetchStats(), fetchAnnouncements(), fetchUsers(), fetchChangelogs()]);
    } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    const response = await fetch('/api/admin/stats');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '无法读取管理员数据');
    setStats(data.stats);
  };

  const fetchAnnouncements = async () => {
    const response = await fetch('/api/admin/announcements');
    const data = await response.json();
    if (!response.ok) { setError(data.error || '无管理员权限'); return; }
    setAnnouncements(data.announcements || []);
  };

  const fetchUsers = async (query = userSearch) => {
    setUsersLoading(true);
    try {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}&page=${userPage}`, { cache: 'no-store', credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '无法读取用户列表');
      setAdminUsers(data.users || []);
    } catch (err: any) { setError(err.message); }
    finally { setUsersLoading(false); }
  };

  const fetchChangelogs = async () => {
    try {
      const response = await fetch('/api/admin/changelogs', { cache: 'no-store', credentials: 'include' });
      const data = await response.json();
      if (response.ok) setChangelogs(data.changelogs || []);
    } catch {}
  };

  const updateUserMembership = async (targetUserId: string, plan: string) => {
    setUpdatingUserId(targetUserId); setError('');
    try {
      const response = await fetch(`/api/admin/users/${targetUserId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, resetImageUsage: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '更新用户失败');
      await Promise.all([fetchUsers(), fetchStats(), fetchChangelogs()]);
    } catch (err: any) { setError(err.message); }
    finally { setUpdatingUserId(null); }
  };

  const resetUserUsage = async (targetUserId: string) => {
    setUpdatingUserId(targetUserId); setError('');
    try {
      const response = await fetch(`/api/admin/users/${targetUserId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resetImageUsage: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '清空用量失败');
      await Promise.all([fetchUsers(), fetchChangelogs()]);
    } catch (err: any) { setError(err.message); }
    finally { setUpdatingUserId(null); }
  };

  // Announcement CRUD
  const publishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '发布失败');
      setTitle(''); setContent('');
      await fetchAnnouncements(); await fetchStats();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const openEditAnnouncement = (a: Announcement) => {
    setEditingAnnouncement(a);
    setEditTitle(a.title); setEditContent(a.content); setEditPublished(a.is_published); setError('');
  };

  const saveEditAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editContent.trim() || saving || !editingAnnouncement) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/admin/announcements/${editingAnnouncement.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editTitle, content: editContent, isPublished: editPublished }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败');
      setEditingAnnouncement(null);
      await fetchAnnouncements(); await fetchStats();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!window.confirm('确定要删除这条公告吗？')) return;
    setDeleting(true); setError('');
    try {
      const response = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '删除失败');
      await fetchAnnouncements(); await fetchStats();
    } catch (err: any) { setError(err.message); }
    finally { setDeleting(false); }
  };

  // Changelog CRUD
  const createChangelog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clTitle.trim() || clSaving) return;
    setClSaving(true); setError('');
    try {
      const response = await fetch('/api/admin/changelogs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: clTitle, content: clContent, category: clCategory, version: clVersion || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '创建失败');
      setClTitle(''); setClContent(''); setClCategory('feature'); setClVersion('');
      await fetchChangelogs();
    } catch (err: any) { setError(err.message); }
    finally { setClSaving(false); }
  };

  const openEditChangelog = (c: ChangelogEntry) => {
    setEditingChangelog(c);
    setEclTitle(c.title); setEclContent(c.content); setEclCategory(c.category); setEclVersion(c.version || '');
  };

  const saveEditChangelog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eclTitle.trim() || clSaving || !editingChangelog) return;
    setClSaving(true); setError('');
    try {
      const response = await fetch(`/api/admin/changelogs/${editingChangelog.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: eclTitle, content: eclContent, category: eclCategory, version: eclVersion || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败');
      setEditingChangelog(null);
      await fetchChangelogs();
    } catch (err: any) { setError(err.message); }
    finally { setClSaving(false); }
  };

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await fetch('/api/admin/health', { cache: 'no-store', credentials: 'include' });
      const data = await response.json();
      if (response.ok) { setHealth(data.health || []); setHealthSummary(data.summary || null); }
    } catch {}
    finally { setHealthLoading(false); }
  };

  const fixSingleAsset = async (projectId: string, userId: string, type: string, slotIndex: number, url: string, key: string) => {
    setFixingAsset(key);
    try {
      const response = await fetch('/api/admin/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId, type, slotIndex, url }),
      });
      const data = await response.json();
      if (response.ok) {
        setFixResults((p) => ({ ...p, [key]: 'ok' }));
      } else {
        setFixResults((p) => ({ ...p, [key]: 'fail' }));
      }
    } catch {
      setFixResults((p) => ({ ...p, [key]: 'fail' }));
    }
    finally { setFixingAsset(null); }
  };

  const fixAllMigratable = async (item: any) => {
    const fixableAssets = (item.assets || []).filter((a: any) => a.isThirdParty && a.status === 'alive' && !fixResults[`${item.projectId}_${a.type}_${a.slot}`]);
    if (!fixableAssets.length) return;
    for (const a of fixableAssets) {
      await fixSingleAsset(item.projectId, item.userId, a.type, a.slot, a.url, `${item.projectId}_${a.type}_${a.slot}`);
    }
    await fetchHealth();
  };

  const fetchStorage = async () => {
    setStorageLoading(true);
    try {
      const r = await fetch('/api/admin/storage');
      const d = await r.json();
      if (r.ok) setStorage(d.storage);
    } catch { /* ignore */ }
    finally { setStorageLoading(false); }
  };

  // 导出更新日志为 Markdown 或 JSON 文件并触发下载
  const exportChangelogs = (entries: ChangelogEntry[], format: 'md' | 'json') => {
    if (!entries.length) return;

    const now = new Date().toISOString().slice(0, 10);
    let content: string;
    let mime: string;
    let ext: string;

    if (format === 'json') {
      content = JSON.stringify(entries.map((c) => ({
        title: c.title,
        category: c.category,
        version: c.version,
        content: c.content,
        created_at: c.created_at,
      })), null, 2);
      mime = 'application/json';
      ext = 'json';
    } else {
      const lines: string[] = [
        '# DesignFlow AI 更新日志',
        `> 导出日期: ${now}  ·  共 ${entries.length} 条记录`,
        '',
      ];
      for (const c of entries) {
        const catLabel = { feature: '新功能', fix: '修复', improvement: '改进', other: '其他' }[c.category] || c.category;
        const date = new Date(c.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
        lines.push(`## ${c.title}`);
        lines.push('');
        lines.push(`- **分类**: ${catLabel}  ·  **版本**: ${c.version || '—'}  ·  **日期**: ${date}`);
        lines.push('');
        if (c.content) {
          for (const paragraph of c.content.split('\n').filter(Boolean)) {
            lines.push(paragraph);
            lines.push('');
          }
        }
        lines.push('---');
        lines.push('');
      }
      content = lines.join('\n');
      mime = 'text/markdown';
      ext = 'md';
    }

    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `changelogs-${now}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteChangelog = async (id: string) => {
    if (!window.confirm('确定要删除这条更新日志吗？')) return;
    setClSaving(true); setError('');
    try {
      const response = await fetch(`/api/admin/changelogs/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '删除失败');
      await fetchChangelogs();
    } catch (err: any) { setError(err.message); }
    finally { setClSaving(false); }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="df-page flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#1e293b] border-t-[#6366f1]" />
          <p className="text-sm font-medium text-[#64748b]">加载管理面板...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="df-page flex min-h-screen items-center justify-center p-4">
        <div className="df-card df-elevated max-w-md rounded-[22px] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f0f0f] text-2xl">!</div>
          <h1 className="text-xl font-bold text-[#f1f5f9]">管理员访问受限</h1>
          <p className="mt-3 text-sm leading-6 text-[#94a3b8]">{error}</p>
          <button onClick={() => router.push('/dashboard')} className={`${priBtn} mt-6`}>返回项目列表</button>
        </div>
      </div>
    );
  }

  // ── Stats helpers ──
  const statGroups = [
    { title: '收入', color: 'from-emerald-500/20 to-emerald-500/5', textColor: 'text-[#34d399]', items: [
      ['总收入', `¥${Number(stats?.revenue?.total || 0).toFixed(2)}`, `今日 ¥${Number(stats?.revenue?.today || 0).toFixed(2)}`],
      ['付费订单', stats?.revenue?.paidOrders || 0, `${stats?.revenue?.pendingOrders || 0} 笔待付`],
    ]},
    { title: '用户', color: 'from-violet-500/20 to-violet-500/5', textColor: 'text-[#a78bfa]', items: [
      ['用户总数', stats?.users?.total || 0, `今日 +${stats?.users?.newToday || 0}`],
      ['会员', stats?.users?.members || 0, `非会员 ${(stats?.users?.total || 0) - (stats?.users?.members || 0)}`],
    ]},
    { title: '内容', color: 'from-sky-500/20 to-sky-500/5', textColor: 'text-[#38bdf8]', items: [
      ['项目', stats?.projects?.total || 0, `今日 +${stats?.projects?.newToday || 0}`],
      ['公告', stats?.announcements || 0, `已发布`],
    ]},
    { title: '系统', color: 'from-amber-500/20 to-amber-500/5', textColor: 'text-[#fbbf24]', items: [
      ['更新日志', changelogs.length, `版本记录`],
      ['图片任务', stats?.usage?.imageJobs || 0, `完成 ${stats?.usage?.completedImages || 0}`],
    ]},
  ];

  function StatCard({ label, value, note, gradient, textColor }: { label: string; value: string | number; note: string; gradient: string; textColor: string }) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 ring-1 ring-white/5`}>
        <p className="text-xs font-bold text-[#94a3b8]">{label}</p>
        <p className="mt-2 text-3xl font-black text-[#f1f5f9] tracking-tight">{value}</p>
        <p className={`mt-1.5 text-xs font-bold ${textColor}`}>{note}</p>
      </div>
    );
  }

  return (
    <div className="df-page min-h-screen">
      {/* ── Header ── */}
      <header className="df-shell sticky top-0 z-40 border-b border-[#1e293b]/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366f1]/20 text-lg font-black text-[#a78bfa]">A</div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#f1f5f9]">管理员后台</h1>
              <p className="text-xs font-medium text-[#64748b]">数据 · 用户 · 公告 · 日志</p>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard')} className={secBtn}>返回项目列表</button>
        </div>
        {/* Tabs */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold whitespace-nowrap transition ${
                  tab === t.key
                    ? 'bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/20'
                    : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#e2e8f0]'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                </svg>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Error toast ── */}
        {error && (
          <div className="mb-6 rounded-2xl border border-[#7f1d1d]/30 bg-[#1f0f0f] px-5 py-4 text-sm font-semibold text-[#fca5a5] flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#7f1d1d]/20 text-base">!</span>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="rounded-full p-1.5 text-[#f87171] hover:bg-[#7f1d1d]/20">✕</button>
          </div>
        )}

        {/* ═══════════════════ STATS ═══════════════════ */}
        {tab === 'stats' && (
          <div className="space-y-6">
            {statGroups.map((group) => (
              <section key={group.title}>
                <h2 className={`mb-3 text-sm font-black ${group.textColor} uppercase tracking-widest`}>{group.title}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {group.items.map(([label, value, note]) => (
                    <StatCard key={label} label={label} value={value} note={note} gradient={group.color} textColor={group.textColor} />
                  ))}
                </div>
              </section>
            ))}
            {/* Recent changelogs preview */}
            <section>
              <h2 className="mb-3 text-sm font-black text-[#e2e8f0] uppercase tracking-widest">最近更新</h2>
              <div className="space-y-2">
                {changelogs.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl bg-[#0f172a]/50 px-4 py-3 ring-1 ring-white/5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CATEGORIES[c.category]?.color || CATEGORIES.other.color}`}>
                      {CATEGORIES[c.category]?.label || c.category}
                    </span>
                    <span className="text-sm font-bold text-[#e2e8f0]">{c.title}</span>
                    <span className="ml-auto text-xs text-[#64748b]">{new Date(c.created_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                ))}
                {!changelogs.length && <p className="rounded-xl bg-[#020617] p-4 text-sm text-[#64748b]">暂无更新日志。创建一条记录你最近的改动。</p>}
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════════ USERS ═══════════════════ */}
        {tab === 'users' && (
          <section>
            {/* ── Summary banner ── */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['总用户', stats?.users?.total || 0, 'text-[#a78bfa]'],
                ['会员', stats?.users?.members || 0, 'text-[#34d399]'],
                ['今日新增', stats?.users?.newToday || 0, 'text-[#38bdf8]'],
                ['总收入', `¥${Number(stats?.revenue?.total || 0).toFixed(0)}`, 'text-[#fbbf24]'],
              ].map(([label, value, cls]) => (
                <div key={label} className="rounded-2xl bg-[#0f172a]/70 ring-1 ring-white/5 p-4">
                  <p className="text-[11px] font-bold text-[#64748b]">{label}</p>
                  <p className={`mt-1 text-2xl font-black ${cls}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* ── Search + filter row ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
              <div className="flex items-center gap-2">
                {([['all', '全部'], ['member', '会员'], ['nonmember', '非会员']] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setUserFilter(k)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      userFilter === k
                        ? 'bg-[#6366f1] text-white shadow-md shadow-[#6366f1]/20'
                        : 'bg-[#1e293b] text-[#94a3b8] hover:bg-[#1e293b]/80 hover:text-[#e2e8f0]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setUserPage(1); fetchUsers(userSearch); }}>
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="搜索邮箱或名称..."
                  className="min-w-0 rounded-full border border-[#1e293b] bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-[#f1f5f9] outline-none placeholder:text-[#475569] focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/15 w-56"
                />
                <button type="submit" className={priBtn} disabled={usersLoading}>{usersLoading ? '...' : '搜索'}</button>
              </form>
            </div>

            {/* ── User cards ── */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {adminUsers
                .filter((u) =>
                  userFilter === 'all' ? true :
                  userFilter === 'member' ? u.active_plan !== 'none' :
                  u.active_plan === 'none'
                )
                .map((item) => {
                  const expanded = usersExpanded[item.id];
                  const daysLeft = item.membership_expires_at
                    ? Math.max(0, Math.ceil((new Date(item.membership_expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
                    : 0;
                  const isMember = item.active_plan !== 'none';
                  const memberLabel = {
                    day: '一天', week: '一周', month: '一月', half_year: '半年', year: '一年',
                  }[item.membership_plan] || item.membership_plan;

                  return (
                    <div
                      key={item.id}
                      className={`df-card rounded-[20px] transition ${
                        isMember ? 'ring-1 ring-[#34d399]/10' : ''
                      }`}
                    >
                      {/* Top row: identity + status */}
                      <div className="flex items-center gap-3 p-4 pb-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                          isMember ? 'bg-[#34d399]/15 text-[#34d399]' : 'bg-[#1e293b] text-[#64748b]'
                        }`}>
                          {(item.email || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-[#f1f5f9]">{item.email || '未记录邮箱'}</p>
                          </div>
                          <p className="text-[11px] text-[#64748b] mt-0.5">
                            {item.full_name || '未填写名称'}
                            <span className="mx-1.5 opacity-30">|</span>
                            注册 {new Date(item.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold ${
                          isMember ? 'bg-[#34d399]/15 text-[#34d399] ring-1 ring-[#34d399]/20' : 'bg-[#1e293b] text-[#64748b]'
                        }`}>
                          {isMember ? `${memberLabel}会员` : '非会员'}
                        </span>
                      </div>

                      {/* Meta strip */}
                      <div className="mx-4 flex items-center gap-4 rounded-xl bg-[#0f172a] px-4 py-3 text-xs">
                        <div>
                          <span className="text-[#64748b]">项目 </span>
                          <span className="font-bold text-[#f1f5f9]">{item.project_count}</span>
                        </div>
                        <div className="w-px h-3 bg-[#1e293b]" />
                        <div>
                          <span className="text-[#64748b]">订单 </span>
                          <span className="font-bold text-[#f1f5f9]">{item.orders.paid}</span>
                          <span className="text-[#475569]">/{item.orders.total}</span>
                        </div>
                        <div className="w-px h-3 bg-[#1e293b]" />
                        <div>
                          <span className="text-[#64748b]">收入 </span>
                          <span className="font-bold text-[#fbbf24]">¥{Number(item.orders.revenue || 0).toFixed(0)}</span>
                        </div>
                        {isMember && (
                          <>
                            <div className="w-px h-3 bg-[#1e293b]" />
                            <div>
                              <span className="text-[#64748b]">剩余 </span>
                              <span className="font-bold text-[#34d399]">{daysLeft}天</span>
                            </div>
                          </>
                        )}
                        <button
                          onClick={() => setUsersExpanded((p) => ({ ...p, [item.id]: !expanded }))}
                          className="ml-auto text-[10px] font-bold text-[#64748b] hover:text-[#e2e8f0]"
                        >
                          {expanded ? '收起' : '详情'}
                        </button>
                      </div>

                      {/* Detail panel */}
                      {expanded && (
                        <div className="mx-4 mt-3 rounded-2xl border border-[#1e293b] bg-[#0a0f1a] p-4 space-y-3 animate-[fade-up_0.2s_ease-out]">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-[#64748b] mb-0.5">会员到期</p>
                              <p className="font-bold text-[#f1f5f9]">{item.membership_expires_at ? new Date(item.membership_expires_at).toLocaleString('zh-CN') : '无'}</p>
                            </div>
                            <div>
                              <p className="text-[#64748b] mb-0.5">最近支付</p>
                              <p className="font-bold text-[#f1f5f9]">{item.orders.lastPaidAt ? new Date(item.orders.lastPaidAt).toLocaleString('zh-CN') : '无'}</p>
                            </div>
                            <div>
                              <p className="text-[#64748b] mb-0.5">待付订单</p>
                              <p className="font-bold text-[#f87171]">{item.orders.pending}</p>
                            </div>
                            <div>
                              <p className="text-[#64748b] mb-0.5">总收入</p>
                              <p className="font-bold text-[#fbbf24]">¥{Number(item.orders.revenue || 0).toFixed(2)}</p>
                            </div>
                          </div>

                          {/* Quick actions */}
                          <div className="border-t border-[#1e293b] pt-3">
                            <p className="text-[10px] font-bold text-[#64748b] mb-2">调整会员</p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                ['取消', 'none'],
                                ['一天', 'day'],
                                ['一周', 'week'],
                                ['一月', 'month'],
                                ['半年', 'half_year'],
                                ['一年', 'year'],
                              ].map(([label, plan]) => (
                                <button
                                  key={plan}
                                  onClick={() => updateUserMembership(item.id, plan)}
                                  disabled={updatingUserId === item.id}
                                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition disabled:opacity-40 ${
                                    item.membership_plan === plan && isMember
                                      ? 'bg-[#34d399]/15 text-[#34d399] ring-1 ring-[#34d399]/20'
                                      : plan === 'none'
                                      ? 'bg-[#1f0f0f] text-[#f87171] hover:bg-[#7f1d1d]/20'
                                      : 'bg-[#1e293b] text-[#94a3b8] hover:bg-[#6366f1]/15 hover:text-[#a78bfa]'
                                  }`}
                                >
                                  {plan === 'none' ? '取消会员' : `${label}会员`}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => resetUserUsage(item.id)}
                            disabled={updatingUserId === item.id}
                            className="w-full rounded-full border border-[#1e293b] bg-[#0f172a] py-2 text-[10px] font-bold text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#e2e8f0] disabled:opacity-50"
                          >
                            清空图片用量
                          </button>
                        </div>
                      )}

                      {/* Compact actions (visible when not expanded) */}
                      {!expanded && (
                        <div className="flex items-center gap-1.5 px-4 pb-4 pt-2">
                          <select
                            value={item.active_plan === 'none' ? 'none' : item.membership_plan}
                            onChange={(e) => updateUserMembership(item.id, e.target.value)}
                            disabled={updatingUserId === item.id}
                            className="flex-1 rounded-full border border-[#1e293b] bg-[#020617] px-3 py-1.5 text-[10px] font-bold text-[#cbd5e1] outline-none focus:border-[#6366f1]"
                          >
                            <option value="none">取消会员</option>
                            <option value="day">一天会员</option>
                            <option value="week">一周会员</option>
                            <option value="month">一月会员</option>
                            <option value="half_year">半年会员</option>
                            <option value="year">一年会员</option>
                          </select>
                          <button onClick={() => resetUserUsage(item.id)} disabled={updatingUserId === item.id}
                            className="rounded-full border border-[#1e293b] bg-[#0f172a] px-3 py-1.5 text-[10px] font-bold text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#e2e8f0] disabled:opacity-50">
                            清空用量
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {!adminUsers.length && (
              <div className="df-card rounded-[22px] p-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e293b]">
                  <svg className="h-6 w-6 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <p className="text-sm font-bold text-[#64748b]">{userSearch ? `无匹配 "${userSearch}"` : '暂无用户'}</p>
              </div>
            )}
          </section>
        )}

        {/* ═══════════════════ ANNOUNCEMENTS ═══════════════════ */}
        {tab === 'announcements' && (
          <>
            {/* Header with action */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#f1f5f9]">公告管理</h2>
                <p className="mt-1 text-sm text-[#64748b]">共 {announcements.length} 条公告</p>
              </div>
              <button
                onClick={() => { setShowCreateAnnouncement((v) => !v); setError(''); }}
                className={`${priBtn} gap-2`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCreateAnnouncement ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
                </svg>
                {showCreateAnnouncement ? '关闭面板' : '发布公告'}
              </button>
            </div>

            {/* Create panel — toggled */}
            {showCreateAnnouncement && (
              <form onSubmit={(e) => { publishAnnouncement(e); setShowCreateAnnouncement(false); }} className="df-card rounded-[22px] p-6 mb-6 animate-[fade-up_0.25s_ease-out]">
                <h3 className="text-base font-bold text-[#f1f5f9]">发布公告</h3>
                <p className="mt-1 text-xs text-[#64748b]">公告将在用户进入项目列表时自动弹出。</p>
                <label className="mt-5 block text-sm font-bold text-[#94a3b8]">标题</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 text-sm font-medium text-[#f1f5f9] outline-none placeholder:text-[#475569] focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/15"
                  placeholder="公告标题..."
                />
                <label className="mt-4 block text-sm font-bold text-[#94a3b8]">内容</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)}
                  className="mt-2 h-52 w-full resize-none rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 text-sm leading-6 text-[#f1f5f9] outline-none placeholder:text-[#475569] focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/15"
                  placeholder="公告内容..."
                />
                <div className="mt-5 flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setShowCreateAnnouncement(false)} className={secBtn}>取消</button>
                  <button type="submit" disabled={saving || !title.trim() || !content.trim()} className={priBtn}>
                    {saving ? '发布中...' : '发布公告'}
                  </button>
                </div>
              </form>
            )}

            {/* List — full width */}
            <div className="df-card rounded-[22px] p-6">
              {!announcements.length ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e293b]">
                    <svg className="h-6 w-6 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                  </div>
                  <p className="text-sm font-bold text-[#64748b]">暂无公告</p>
                  <p className="mt-1 text-xs text-[#475569]">点击上方「发布公告」开始创建</p>
                </div>
              ) : (
                <div className="max-h-[44rem] space-y-4 overflow-y-auto pr-1">
                  {announcements.map((a) => (
                    <article key={a.id} className="group rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 transition hover:border-[#6366f1]/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-[#f1f5f9]">{a.title}</h3>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${a.is_published ? 'bg-[#059669]/15 text-[#34d399]' : 'bg-[#1e293b] text-[#94a3b8]'}`}>
                              {a.is_published ? '已发布' : '草稿'}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-[#94a3b8]">{a.content}</p>
                          <p className="mt-2 text-[10px] text-[#475569]">{new Date(a.published_at || a.created_at).toLocaleString('zh-CN')}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditAnnouncement(a)} className="rounded-lg p-1.5 text-[#475569] hover:bg-[#1e293b] hover:text-[#6366f1]">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => deleteAnnouncement(a.id)} disabled={deleting} className="rounded-lg p-1.5 text-[#475569] hover:bg-[#1f0f0f] hover:text-[#f87171] disabled:opacity-50">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h12" /></svg>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════ CHANGELOGS ═══════════════════ */}
        {tab === 'changelogs' && (
          <>
            {/* Header with action */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#f1f5f9]">更新日志</h2>
                <p className="mt-1 text-sm text-[#64748b]">共 {changelogs.length} 条记录</p>
              </div>
              <button
                onClick={() => { setShowCreateChangelog((v) => !v); setError(''); }}
                className={`${priBtn} gap-2`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCreateChangelog ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
                </svg>
                {showCreateChangelog ? '关闭面板' : '新增日志'}
              </button>
              <button
                onClick={() => exportChangelogs(changelogs, 'md')}
                className={`${secBtn} gap-2`}
                title="下载 Markdown 格式"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                导出
              </button>
            </div>

            {/* Create panel — toggled */}
            {showCreateChangelog && (
              <form onSubmit={(e) => { createChangelog(e); setShowCreateChangelog(false); }} className="df-card rounded-[22px] p-6 mb-6 animate-[fade-up_0.25s_ease-out]">
                <h3 className="text-base font-bold text-[#f1f5f9]">新增更新日志</h3>
                <p className="mt-1 text-xs text-[#64748b]">记录功能上线、Bug 修复、性能优化等更新。管理员调整用户会员时自动记录。</p>
                <div className="mt-5 space-y-4">
                  <div className="flex gap-3">
                    <select value={clCategory} onChange={(e) => setClCategory(e.target.value)}
                      className="rounded-full border border-[#1e293b] bg-[#0f172a] px-4 py-2.5 text-sm font-bold text-[#e2e8f0] outline-none focus:border-[#6366f1]">
                      {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <input value={clVersion} onChange={(e) => setClVersion(e.target.value)}
                      placeholder="版本号 (如 v1.2.0)"
                      className="flex-1 rounded-full border border-[#1e293b] bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-[#f1f5f9] outline-none placeholder:text-[#475569] focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/15"
                    />
                  </div>
                  <input value={clTitle} onChange={(e) => setClTitle(e.target.value)}
                    placeholder="更新标题"
                    className="w-full rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 text-sm font-medium text-[#f1f5f9] outline-none placeholder:text-[#475569] focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/15"
                  />
                  <textarea value={clContent} onChange={(e) => setClContent(e.target.value)}
                    className="h-32 w-full resize-none rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 text-sm leading-6 text-[#f1f5f9] outline-none placeholder:text-[#475569] focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/15"
                    placeholder="详细的更新内容..."
                  />
                  <div className="flex justify-end gap-3 pt-1">
                    <button type="button" onClick={() => setShowCreateChangelog(false)} className={secBtn}>取消</button>
                    <button type="submit" disabled={clSaving || !clTitle.trim()} className={priBtn}>
                      {clSaving ? '创建中...' : '添加更新日志'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Timeline list — full width */}
            <div className="df-card rounded-[22px] p-6">
              {!changelogs.length ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e293b]">
                    <svg className="h-6 w-6 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-sm font-bold text-[#64748b]">还没有更新日志</p>
                  <p className="mt-1 text-xs text-[#475569]">点击上方「新增日志」开始记录</p>
                </div>
              ) : (
                <div className="max-h-[44rem] space-y-4 overflow-y-auto pr-1">
                  {changelogs.map((c, i) => (
                    <div key={c.id} className="flex items-start gap-4 group">
                      {/* Timeline */}
                      <div className="flex flex-col items-center pt-1">
                        <div className={`h-3.5 w-3.5 rounded-full ring-4 ring-[#0f172a] ${
                          c.category === 'feature' ? 'bg-[#a78bfa]' :
                          c.category === 'fix' ? 'bg-[#f87171]' :
                          c.category === 'improvement' ? 'bg-[#38bdf8]' :
                          'bg-[#64748b]'
                        }`} />
                        {i < changelogs.length - 1 && <div className="w-px flex-1 bg-[#1e293b] min-h-[2rem]" />}
                      </div>
                      {/* Card */}
                      <div className="flex-1 min-w-0 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 transition hover:border-[#6366f1]/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${CATEGORIES[c.category]?.color || CATEGORIES.other.color}`}>
                            {CATEGORIES[c.category]?.label || c.category}
                          </span>
                          {c.version && <span className="rounded-full bg-[#1e293b] px-2 py-0.5 text-[10px] font-bold text-[#94a3b8] font-mono">{c.version}</span>}
                          <span className="ml-auto text-[10px] text-[#475569]">
                            {new Date(c.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#f1f5f9]">{c.title}</h4>
                        {c.content && <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-[#94a3b8]">{c.content}</p>}
                        <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditChangelog(c)} className="rounded-full px-3 py-1 text-[10px] font-bold text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#e2e8f0]">编辑</button>
                          <button onClick={() => deleteChangelog(c.id)} className="rounded-full px-3 py-1 text-[10px] font-bold text-[#f87171] hover:bg-[#1f0f0f]">删除</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════ HEALTH ═══════════════════ */}
        {tab === 'health' && (
          <section>
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#f1f5f9]">图片健康检查</h2>
                <p className="mt-1 text-sm text-[#64748b]">
                  检测第三方临时 URL、已失效图片，支持一键修复
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchHealth}
                  disabled={healthLoading}
                  className={`${priBtn} gap-2`}
                >
                  <svg className={`h-4 w-4 ${healthLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {healthLoading ? '扫描中...' : '重新扫描'}
                </button>
                {health.filter((h: any) => h.checkedAlive > 0).length > 0 && (
                  <button
                    onClick={async () => {
                      const fixable = health.filter((h: any) => h.checkedAlive > 0);
                      for (const item of fixable) {
                        await fixAllMigratable(item);
                      }
                      await fetchHealth();
                    }}
                    className={`${dangerBtn} gap-2`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    一键全部修复
                  </button>
                )}
              </div>
            </div>

            {/* Summary stats — image-level counts */}
            {healthSummary && (
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  ['图片总数', healthSummary.totalImages, '张', 'text-[#e2e8f0]', '所有项目图片合计'],
                  ['安全存储', healthSummary.safeImages, '张', 'text-[#34d399]', '已存储在 Supabase'],
                  ['第三方URL', healthSummary.thirdPartyImages, '张', 'text-[#fbbf24]', '65535.space 临时链接'],
                  ['已失效', healthSummary.deadImages, '张', 'text-[#ef4444]', '已 404 无法访问'],
                  ['待修复', healthSummary.fixableImages, '张', 'text-[#38bdf8]', '仍在线，可转存'],
                ].map(([label, value, unit, cls, hint]) => (
                  <div key={label} className="rounded-2xl bg-[#0f172a]/70 ring-1 ring-white/5 p-4">
                    <p className="text-[11px] font-bold text-[#64748b]">{label}</p>
                    <p className={`mt-1 text-2xl font-black ${cls}`}>{String(value)}<span className="text-sm font-bold text-[#475569] ml-0.5">{unit}</span></p>
                    <p className="mt-0.5 text-[10px] text-[#475569]">{hint}</p>
                  </div>
                ))}
              </div>
            )}
            {/* Fallback when no summary yet */}
            {!healthSummary && health.length > 0 && (
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[
                  ['有图项目', health.length, 'text-[#e2e8f0]'],
                  ['健康', health.filter((h: any) => h.risk === 'healthy').length, 'text-[#34d399]'],
                  ['警告', health.filter((h: any) => h.risk === 'warning').length, 'text-[#fbbf24]'],
                  ['严重', health.filter((h: any) => h.risk === 'critical').length, 'text-[#ef4444]'],
                  ['第三方URL', health.reduce((s: number, h: any) => s + (h.thirdPartyImages || h.thirdParty || 0), 0), 'text-[#38bdf8]'],
                ].map(([label, value, cls]) => (
                  <div key={label} className="rounded-2xl bg-[#0f172a]/70 ring-1 ring-white/5 p-4">
                    <p className="text-[11px] font-bold text-[#64748b]">{label}</p>
                    <p className={`mt-1 text-2xl font-black ${cls}`}>{String(value)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Loading */}
            {healthLoading && (
              <div className="flex items-center justify-center py-20 gap-3 text-[#64748b]">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e293b] border-t-[#6366f1]" />
                <span className="font-medium">正在逐张检测图片可达性...</span>
              </div>
            )}

            {/* Empty */}
            {!healthLoading && !health.length && (
              <div className="df-card rounded-[22px] p-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1e293b]">
                  <svg className="h-7 w-7 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="font-bold text-[#64748b]">点击「重新扫描」检测所有项目图片状态</p>
              </div>
            )}

            {/* Project list */}
            {!healthLoading && health.map((item: any) => {
              const riskCfg: Record<string, { ring: string; border: string; bg: string; text: string; label: string; icon: string }> = {
                critical: { ring: 'ring-[#ef4444]/30', border: 'border-[#ef4444]/30', bg: 'bg-[#ef4444]/10', text: 'text-[#ef4444]', label: '有失效图片', icon: '!' },
                warning: { ring: 'ring-[#fbbf24]/20', border: 'border-[#fbbf24]/20', bg: 'bg-[#fbbf24]/10', text: 'text-[#fbbf24]', label: '有待迁移', icon: '!' },
                healthy: { ring: 'ring-[#34d399]/10', border: 'border-[#34d399]/10', bg: 'bg-[#34d399]/10', text: 'text-[#34d399]', label: '全部安全', icon: '✓' },
              };
              const cfg = riskCfg[String(item.risk)] || riskCfg.healthy;

              const thirdPartyAssets = (item.assets || []).filter((a: any) => a.isThirdParty);
              const aliveAssets = thirdPartyAssets.filter((a: any) => a.status === 'alive');
              const deadAssets = thirdPartyAssets.filter((a: any) => a.status === 'dead');
              const uncheckedAssets = thirdPartyAssets.filter((a: any) => a.status === 'unchecked');

              return (
                <div key={item.projectId} className={`df-card rounded-[18px] overflow-hidden transition mb-4 ${cfg.ring} ring-1`}>
                  {/* Top bar — project summary */}
                  <div className={`flex items-center gap-3 ${cfg.bg} px-5 py-4 border-b ${cfg.border}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cfg.bg} ${cfg.text} text-sm font-black`}>
                      {cfg.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-[#f1f5f9]">{item.projectName}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-[#64748b]">
                        <span>{item.totalImages} 张图片</span>
                        <span className="text-[#34d399]">{item.safeImages} 安全</span>
                        {item.thirdPartyImages > 0 && (
                          <>
                            <span className="text-[#fbbf24]">{item.thirdPartyImages} 第三方</span>
                            {item.checkedAlive > 0 && <span className="text-[#38bdf8]">{item.checkedAlive} 在线</span>}
                            {item.checkedDead > 0 && <span className="text-[#ef4444]">{item.checkedDead} 失效</span>}
                            {item.unchecked > 0 && <span className="text-[#475569]">{item.unchecked} 未检</span>}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      {aliveAssets.length > 0 && (
                        <button
                          onClick={() => fixAllMigratable(item)}
                          disabled={!!fixingAsset}
                          className="rounded-full bg-[#6366f1] px-4 py-1.5 text-[11px] font-bold text-white hover:bg-[#818cf8] transition disabled:opacity-50"
                        >
                          修复 {aliveAssets.length} 张
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual bar: safe vs third-party breakdown */}
                  {item.totalImages > 0 && (
                    <div className="flex h-1.5 gap-0.5 px-5 mt-4">
                      <div
                        className="h-full rounded-full bg-[#34d399]/40"
                        style={{ flex: item.safeImages || 0.01 }}
                        title={`安全: ${item.safeImages} 张`}
                      />
                      <div
                        className="h-full rounded-full bg-[#38bdf8]/50"
                        style={{ flex: item.checkedAlive || 0.01 }}
                        title={`在线: ${item.checkedAlive} 张`}
                      />
                      <div
                        className="h-full rounded-full bg-[#ef4444]/50"
                        style={{ flex: item.checkedDead || 0.01 }}
                        title={`失效: ${item.checkedDead} 张`}
                      />
                      <div
                        className="h-full rounded-full bg-[#475569]/30"
                        style={{ flex: item.unchecked || 0.01 }}
                        title={`未检: ${item.unchecked} 张`}
                      />
                    </div>
                  )}

                  {/* Asset detail — third-party only */}
                  {thirdPartyAssets.length > 0 && (
                    <div className="px-5 py-3 space-y-2 mt-2">
                      <p className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">第三方图片详情</p>
                      {thirdPartyAssets.map((a: any) => {
                        const key = `${item.projectId}_${a.type}_${a.slot}`;
                        const result = fixResults[key];
                        const statusBadge = a.status === 'alive'
                          ? { cls: 'bg-[#38bdf8]/15 text-[#38bdf8]', label: '在线' }
                          : a.status === 'dead'
                          ? { cls: 'bg-[#ef4444]/15 text-[#ef4444]', label: '失效' }
                          : { cls: 'bg-[#475569]/20 text-[#64748b]', label: '未检' };

                        return (
                          <div key={key} className="flex items-center gap-3 text-xs">
                            <span className="w-16 shrink-0 font-bold text-[#64748b]">{a.typeLabel}[{a.slot}]</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${statusBadge.cls}`}>{statusBadge.label}</span>
                            <span className="flex-1 truncate text-[#475569] font-mono text-[10px]">{a.url.substring(0, 70)}</span>
                            {result === 'ok' ? (
                              <span className="shrink-0 rounded-full bg-[#34d399]/15 px-2.5 py-1 text-[10px] font-bold text-[#34d399]">已修复</span>
                            ) : result === 'fail' ? (
                              <span className="shrink-0 rounded-full bg-[#ef4444]/15 px-2.5 py-1 text-[10px] font-bold text-[#ef4444]">失败</span>
                            ) : a.status === 'alive' ? (
                              <button
                                onClick={() => fixSingleAsset(item.projectId, item.userId, a.type, a.slot, a.url, key)}
                                disabled={fixingAsset === key}
                                className="shrink-0 rounded-full border border-[#6366f1]/30 bg-[#6366f1]/10 px-3 py-1 text-[10px] font-bold text-[#a78bfa] hover:bg-[#6366f1]/20 transition disabled:opacity-50"
                              >
                                {fixingAsset === key ? '修复中...' : '修复'}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Dead images warning */}
                  {item.checkedDead > 0 && (
                    <div className="mx-5 mb-4 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 px-4 py-3 flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#ef4444]/15 text-[10px] font-black text-[#ef4444]">!</span>
                      <p className="text-[11px] text-[#f87171]">
                        {item.checkedDead} 张图片已失效（404），无法自动修复。
                        <span className="text-[#64748b] ml-1">请在项目中重新生成这些图片。</span>
                      </p>
                    </div>
                  )}

                  {/* Unchecked note */}
                  {item.unchecked > 0 && (
                    <div className="mx-5 mb-4 rounded-xl border border-[#475569]/20 bg-[#0f172a] px-4 py-2 flex items-center gap-2">
                      <span className="text-[10px] text-[#64748b]">另有 {item.unchecked} 张第三方图片未检测（超出单次扫描上限），建议逐一修复。</span>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {tab === 'storage' && (
          <section>
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#f1f5f9]">存储用量</h2>
                <p className="mt-1 text-sm text-[#64748b]">
                  Supabase Storage generated-images bucket 实际占用
                </p>
              </div>
              <button
                onClick={fetchStorage}
                disabled={storageLoading}
                className={`${priBtn} gap-2`}
              >
                <svg className={`h-4 w-4 ${storageLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {storageLoading ? '加载中...' : '刷新数据'}
              </button>
            </div>

            {/* Loading */}
            {storageLoading && (
              <div className="flex items-center justify-center py-20 gap-3 text-[#64748b]">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e293b] border-t-[#6366f1]" />
                <span className="font-medium">正在拉取存储统计...</span>
              </div>
            )}

            {/* Empty */}
            {!storageLoading && !storage && (
              <div className="df-card rounded-[22px] p-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1e293b]">
                  <svg className="h-7 w-7 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <p className="font-bold text-[#64748b]">点击「刷新数据」查看 Storage 存储统计</p>
              </div>
            )}

            {storage && !storageLoading && (
              <>
                {/* Top summary cards */}
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: '存储总量', value: formatBytes(storage.totalBytes), cls: 'text-[#e2e8f0]', hint: `${storage.totalFiles} 个文件` },
                    { label: '已计量', value: formatBytes(storage.sizedBytes), cls: 'text-[#34d399]', hint: `${storage.sizedFiles} 个文件` },
                    { label: '未计量', value: `${storage.unsizedFiles} 个`, cls: storage.unsizedFiles > 0 ? 'text-[#fbbf24]' : 'text-[#64748b]', hint: '历史文件缺大小记录' },
                    { label: '外观图', value: formatBytes(storage.byType.appearance?.bytes || 0), cls: 'text-[#38bdf8]', hint: `${storage.byType.appearance?.files || 0} 个` },
                    { label: '故事板', value: formatBytes(storage.byType.storyboard?.bytes || 0), cls: 'text-[#a78bfa]', hint: `${storage.byType.storyboard?.files || 0} 个` },
                    { label: '爆炸图', value: formatBytes(storage.byType.exploded_view?.bytes || 0), cls: 'text-[#fb923c]', hint: `${storage.byType.exploded_view?.files || 0} 个` },
                  ].map(({ label, value, cls, hint }) => (
                    <div key={label} className="rounded-2xl bg-[#0f172a]/70 ring-1 ring-white/5 p-4">
                      <p className="text-[11px] font-bold text-[#64748b]">{label}</p>
                      <p className={`mt-1 text-xl font-black ${cls}`}>{value}</p>
                      <p className="mt-0.5 text-[10px] text-[#475569]">{hint}</p>
                    </div>
                  ))}
                </div>

                {/* Usage bar */}
                <div className="mb-5 rounded-2xl bg-[#0f172a]/70 ring-1 ring-white/5 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[#f1f5f9]">Storage 使用率</span>
                    <span className="text-xs font-bold text-[#64748b]">
                      {formatBytes(storage.totalBytes)} / 1 GB（Free 配额）
                    </span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-[#1e293b] overflow-hidden ring-1 ring-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6366f1] via-[#818cf8] to-[#a78bfa] transition-all duration-500"
                      style={{ width: `${Math.min((storage.totalBytes / (1 * 1024 * 1024 * 1024)) * 100, 100).toFixed(1)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#475569]">
                    {((storage.totalBytes / (1 * 1024 * 1024 * 1024)) * 100).toFixed(1)}% 已使用
                    {storage.totalBytes > 1 * 1024 * 1024 * 1024 && (
                      <span className="ml-1 text-[#ef4444] font-bold">已超过 Free 配额！</span>
                    )}
                  </p>
                </div>

                {/* Warning for unsized files */}
                {storage.unsizedFiles > 0 && (
                  <div className="mb-5 rounded-xl border border-[#fbbf24]/20 bg-[#fbbf24]/5 px-4 py-3 flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#fbbf24]/15 text-[10px] font-black text-[#fbbf24]">!</span>
                    <p className="text-xs text-[#fbbf24]">
                      有 {storage.unsizedFiles} 个历史文件缺少尺寸记录（存量数据），新生成的图片已自动记录 file_size。
                      实际总用量可能略高于已计量值。
                    </p>
                  </div>
                )}

                {/* Two-column: top users + top projects */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Top Users */}
                  <div className="rounded-2xl bg-[#0f172a]/70 ring-1 ring-white/5 overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#1e293b]">
                      <h3 className="text-sm font-bold text-[#f1f5f9]">用户用量 TOP 20</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {storage.topUsers.length === 0 ? (
                        <p className="p-5 text-xs text-[#64748b]">暂无数据</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[#1e293b] text-[#64748b]">
                              <th className="text-left px-5 py-2 font-bold">#</th>
                              <th className="text-left py-2 font-bold">用户</th>
                              <th className="text-right py-2 font-bold">文件</th>
                              <th className="text-right px-5 py-2 font-bold">大小</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storage.topUsers.map((u, i) => (
                              <tr key={u.userId} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition">
                                <td className="px-5 py-2.5 text-[#475569] font-bold">{i + 1}</td>
                                <td className="py-2.5 text-[#e2e8f0] font-medium max-w-[200px] truncate">{u.email}</td>
                                <td className="py-2.5 text-right text-[#64748b]">{u.files}</td>
                                <td className="px-5 py-2.5 text-right text-[#a78bfa] font-bold">{formatBytes(u.bytes)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Top Projects */}
                  <div className="rounded-2xl bg-[#0f172a]/70 ring-1 ring-white/5 overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#1e293b]">
                      <h3 className="text-sm font-bold text-[#f1f5f9]">项目用量 TOP 20</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {storage.topProjects.length === 0 ? (
                        <p className="p-5 text-xs text-[#64748b]">暂无数据</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[#1e293b] text-[#64748b]">
                              <th className="text-left px-5 py-2 font-bold">#</th>
                              <th className="text-left py-2 font-bold">项目</th>
                              <th className="text-left py-2 font-bold">用户</th>
                              <th className="text-right py-2 font-bold">文件</th>
                              <th className="text-right px-5 py-2 font-bold">大小</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storage.topProjects.map((p, i) => (
                              <tr key={p.projectId} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition">
                                <td className="px-5 py-2.5 text-[#475569] font-bold">{i + 1}</td>
                                <td className="py-2.5 text-[#e2e8f0] font-medium max-w-[180px] truncate">{p.projectName}</td>
                                <td className="py-2.5 text-[#64748b] max-w-[140px] truncate">{p.userEmail}</td>
                                <td className="py-2.5 text-right text-[#64748b]">{p.files}</td>
                                <td className="px-5 py-2.5 text-right text-[#a78bfa] font-bold">{formatBytes(p.bytes)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* ═══════════════════ MODALS ═══════════════════ */}
        {editingAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/70 p-4 backdrop-blur-sm" onClick={() => setEditingAnnouncement(null)}>
            <div className="df-card df-elevated w-full max-w-2xl rounded-[22px] p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-[#f1f5f9]">编辑公告</h3>
              <form onSubmit={saveEditAnnouncement} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#94a3b8]">标题</label>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 text-sm font-medium text-[#f1f5f9] outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/15" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#94a3b8]">内容</label>
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                    className="h-52 w-full resize-none rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 text-sm leading-6 text-[#f1f5f9] outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/15" required />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editPublished} onChange={() => setEditPublished((v) => !v)} className="h-5 w-5 rounded border-[#1e293b] accent-[#6366f1]" />
                  <span className="text-sm font-bold text-[#94a3b8]">已发布</span>
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setEditingAnnouncement(null)} className={secBtn}>取消</button>
                  <button type="button" onClick={() => { deleteAnnouncement(editingAnnouncement.id); setEditingAnnouncement(null); }} disabled={deleting} className={dangerBtn}>{deleting ? '...' : '删除'}</button>
                  <button type="submit" disabled={saving || !editTitle.trim() || !editContent.trim()} className={priBtn}>{saving ? '保存中...' : '保存'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingChangelog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/70 p-4 backdrop-blur-sm" onClick={() => setEditingChangelog(null)}>
            <div className="df-card df-elevated w-full max-w-2xl rounded-[22px] p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-[#f1f5f9]">编辑更新日志</h3>
              <form onSubmit={saveEditChangelog} className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <select value={eclCategory} onChange={(e) => setEclCategory(e.target.value)}
                    className="rounded-full border border-[#1e293b] bg-[#0f172a] px-4 py-2.5 text-sm font-bold text-[#e2e8f0] outline-none focus:border-[#6366f1]">
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <input value={eclVersion} onChange={(e) => setEclVersion(e.target.value)}
                    placeholder="版本号"
                    className="flex-1 rounded-full border border-[#1e293b] bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-[#f1f5f9] outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/15" />
                </div>
                <input value={eclTitle} onChange={(e) => setEclTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 text-sm font-medium text-[#f1f5f9] outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/15" />
                <textarea value={eclContent} onChange={(e) => setEclContent(e.target.value)}
                  className="h-32 w-full resize-none rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 text-sm leading-6 text-[#f1f5f9] outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/15" />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setEditingChangelog(null)} className={secBtn}>取消</button>
                  <button type="button" onClick={() => { deleteChangelog(editingChangelog.id); setEditingChangelog(null); }} className={dangerBtn}>删除</button>
                  <button type="submit" disabled={clSaving || !eclTitle.trim()} className={priBtn}>{clSaving ? '保存中...' : '保存'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
