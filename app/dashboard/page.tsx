'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getActivePlan, getProjectLimit, MEMBERSHIP_ENABLED, type MembershipPlan } from '@/lib/membership';
import { supabase } from '@/lib/supabase/client';
import type { Project } from '@/types';

type Announcement = {
  id: string;
  title: string;
  content: string;
  published_at: string;
  created_at: string;
};

const buttonBase = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold outline-none transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0';
const primaryButton = `${buttonBase} bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 focus-visible:ring-4 focus-visible:ring-blue-200`;
const secondaryButton = `${buttonBase} border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-4 focus-visible:ring-blue-100`;
const ghostButton = `${buttonBase} text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-4 focus-visible:ring-blue-100`;
const dangerButton = `${buttonBase} border border-red-100 bg-white text-red-600 hover:border-red-200 hover:bg-red-50 focus-visible:ring-4 focus-visible:ring-red-100`;
const membershipButton = `${buttonBase} border border-violet-100 bg-violet-50 text-violet-700 hover:border-violet-200 hover:bg-violet-100 focus-visible:ring-4 focus-visible:ring-violet-100`;
const adminButton = `${buttonBase} bg-slate-950 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-4 focus-visible:ring-slate-300`;
const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

function getProjectProgress(project: Project) {
  const fields = [
    project.background,
    project.product_intro,
    project.personas?.length,
    project.appearance_images?.some(Boolean),
    project.cmf,
    project.storyboard_images?.some((item) => item.url),
    project.exploded_view_image,
  ];
  return fields.filter(Boolean).length;
}

function getProjectCover(project: Project) {
  return project.appearance_images?.find(Boolean) || project.exploded_view_image || project.storyboard_images?.find((item) => item.url)?.url || null;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [idea, setIdea] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editIdea, setEditIdea] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [projectLimit, setProjectLimit] = useState(10);
  const [activePlan, setActivePlan] = useState<MembershipPlan>('none');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcementViewed, setAnnouncementViewed] = useState(true);
  const [query, setQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const popupShownRef = useRef(false);
  const router = useRouter();

  // 检查管理员权限 —— 仅用于显示按钮，真正权限由 /api/admin/* 后端校验
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/admin/me', {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await res.json();
        setIsAdmin(Boolean(data.isAdmin));
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchAnnouncements();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('membership_plan, membership_expires_at')
        .eq('id', user.id)
        .single();

      const plan = getActivePlan(profile);
      setActivePlan(plan);
      setProjectLimit(getProjectLimit(plan));

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects((data as Project[]) || []);
    } catch (error) {
      console.error('获取项目列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  function getAnnouncementViewedKey(announcementId: string) {
    return `designflow-announcement-viewed:${announcementId}:${localDate}`;
  }

  function hasViewedToday(announcementId?: string) {
    if (!announcementId) return true;
    const key = getAnnouncementViewedKey(announcementId);
    try {
      if (localStorage.getItem(key) === '1') return true;
      if (sessionStorage.getItem(key) === '1') return true;
    } catch {}
    return false;
  }

  function markViewedToday(announcementId?: string) {
    if (!announcementId) return;
    const key = getAnnouncementViewedKey(announcementId);
    try { localStorage.setItem(key, '1'); } catch {}
    try { sessionStorage.setItem(key, '1'); } catch {}
  }

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements', { cache: 'no-store' });
      const data = await response.json();
      const items = (data.announcements || []) as Announcement[];
      const latestId = items[0]?.id;
      const alreadyViewed = hasViewedToday(latestId);
      setAnnouncementViewed(alreadyViewed);
      setAnnouncements(items);

      if (!items.length) return;

      if (!popupShownRef.current && !alreadyViewed) {
        popupShownRef.current = true;
        setShowAnnouncements(true);
      }
    } catch (error) {
      console.error('获取公告失败:', error);
    }
  };

  const openAnnouncements = () => {
    markViewedToday(announcements[0]?.id);
    setAnnouncementViewed(true);
    setShowAnnouncements(true);
  };

  const closeAnnouncementsToday = () => {
    markViewedToday(announcements[0]?.id);
    setAnnouncementViewed(true);
    setShowAnnouncements(false);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || creating) return;
    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('membership_plan, membership_expires_at')
        .eq('id', user.id)
        .single();

      const plan = getActivePlan(profile);
      const limit = getProjectLimit(plan);

      if (projects.length >= limit) {
        alert(`当前项目数已达上限(${limit}个)，请升级会员以创建更多项目`);
        setCreating(false);
        return;
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idea }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || '创建项目失败');
      router.push(`/dashboard/${data.id}`);
    } catch (error) {
      console.error('创建项目失败:', error);
    } finally {
      setCreating(false);
    }
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setEditName((project.product_intro as any)?.name || '未命名项目');
    setEditIdea(project.idea);
  };

  const handleRenameProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || savingProject || !editName.trim() || !editIdea.trim()) return;
    setSavingProject(true);

    try {
      const productIntro = editingProject.product_intro || { name: '', tagline: '', features: [], scenario: '' };
      const { data, error } = await (supabase as any)
        .from('projects')
        .update({ product_intro: { ...productIntro, name: editName }, idea: editIdea } as any)
        .eq('id', editingProject.id)
        .select()
        .single();

      if (error) throw error;
      setProjects((currentProjects) => currentProjects.map((project) => project.id === editingProject.id ? (data as Project) : project));
      setEditingProject(null);
    } catch (error) {
      console.error('重命名项目失败:', error);
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!window.confirm('确定要删除这个项目吗？图片文件和所有数据将被永久删除，无法恢复。')) return;
    setDeletingProjectId(project.id);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '删除失败');
      setProjects((currentProjects) => currentProjects.filter((item) => item.id !== project.id));
    } catch (error) {
      console.error('删除项目失败:', error);
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredProjects = projects.filter((project) => {
    const name = (project.product_intro as any)?.name || '未命名项目';
    const text = `${name} ${project.idea}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  if (loading) {
    return (
      <div className="df-workspace flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="df-workspace min-h-screen">
      <header className="df-shell sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => router.push('/')} className={secondaryButton}>主页</button>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-600/25">DF</span>
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-950">DesignFlow AI</h1>
                <p className="hidden text-xs font-bold text-slate-500 sm:block">项目管理工作台</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {announcements.length > 0 && (
              <button type="button" onClick={openAnnouncements} className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-[0.97]" title="公告">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                公告
                {!announcementViewed && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
                    {announcements.length > 9 ? '9+' : announcements.length}
                  </span>
                )}
              </button>
            )}
            {MEMBERSHIP_ENABLED && <button onClick={() => router.push('/membership')} className={membershipButton}>会员</button>}
            {isAdmin && <button onClick={() => router.push('/admin')} className={adminButton}>管理员面板</button>}
            <button onClick={handleLogout} className={secondaryButton}>退出</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-950 p-7 text-white shadow-2xl shadow-blue-950/20 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-black text-blue-100">项目列表</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">我的项目</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-blue-50">管理产品设计流程，继续编辑已有项目，或从一个新想法开始生成完整设计方案。</p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm font-black">
                <span className="rounded-full bg-white/15 px-4 py-2 text-white ring-1 ring-white/20">项目 {projects.length}/{projectLimit}</span>
                {MEMBERSHIP_ENABLED && <span className="rounded-full bg-white/15 px-4 py-2 text-white ring-1 ring-white/20">{activePlan === 'none' ? '未开通会员' : '会员已开通'}</span>}
              </div>
            </div>
            <button onClick={() => setShowNewProject(true)} disabled={projects.length >= projectLimit} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 font-black text-blue-700 shadow-xl shadow-slate-950/15 outline-none transition hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:ring-4 focus-visible:ring-white/35 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
              <span className="text-xl leading-none">＋</span>
              新建项目
            </button>
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索项目名称或想法"
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <p className="text-sm font-semibold text-slate-500">按最近更新时间排序</p>
        </div>

        {showAnnouncements && announcements.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]" onClick={() => { markViewedToday(announcements[0]?.id); setAnnouncementViewed(true); setShowAnnouncements(false); }}>
            <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-slate-950/20 animate-[fade-up_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
              {/* Hero illustration strip */}
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600 px-8 pb-8 pt-10">
                <div className="absolute inset-0 opacity-[0.07]">
                  <svg className="h-full w-full" viewBox="0 0 400 300" fill="none"><circle cx="350" cy="50" r="120" fill="white" /><circle cx="50" cy="250" r="80" fill="white" /><circle cx="300" cy="220" r="60" fill="white" /></svg>
                </div>
                <div className="relative flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-inner ring-1 ring-white/20 backdrop-blur">📢</div>
                  <div className="min-w-0 text-white">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">最新公告</p>
                    <h3 className="mt-1.5 text-xl font-black leading-tight text-white">{announcements[0].title}</h3>
                    <time className="mt-2 inline-block text-xs font-bold text-white/60">
                      {new Date(announcements[0].published_at || announcements[0].created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </time>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6">
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-800 font-medium">{announcements[0].content}</p>
              </div>

              {/* History section */}
              {announcements.length > 1 && (
                <div className="border-t border-slate-100">
                  <div className="px-8 pt-5 pb-2">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-wider">
                      <span className="h-px flex-1 bg-slate-200" />
                      历史公告 · {announcements.length - 1} 条
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto px-8 pb-5 space-y-2">
                    {announcements.slice(1).map((a) => (
                      <details key={a.id} className="group rounded-xl border border-slate-100 bg-white transition hover:border-slate-200 [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 select-none">
                          <div className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                          <span className="flex-1 text-sm font-bold text-slate-700 truncate">{a.title}</span>
                          <time className="shrink-0 text-[11px] font-bold text-slate-400">{new Date(a.published_at || a.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</time>
                          <svg className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="border-t border-slate-50 px-4 pb-4 pt-3">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{a.content}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex flex-col gap-2.5 border-t border-slate-100 bg-slate-50/80 px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={closeAnnouncementsToday} className="rounded-full px-4 py-2.5 text-sm font-bold text-slate-500 outline-none transition hover:bg-slate-200/60 hover:text-slate-700 active:scale-[0.98]">
                  今日不再提示
                </button>
                <button type="button" onClick={() => { markViewedToday(announcements[0]?.id); setAnnouncementViewed(true); setShowAnnouncements(false); }} className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 outline-none transition hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md">
                  我知道了
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[20px] bg-white p-6 shadow-2xl shadow-slate-950/20">
              <h3 className="text-xl font-black text-slate-950">创建新项目</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">描述你的产品想法，AI 会生成完整设计流程。</p>
              <form onSubmit={handleCreateProject} className="mt-5">
                <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="例如：一款面向独居青年的智能宠物喂食器..." className={`${fieldClass} h-36 resize-none`} required />
                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowNewProject(false)} className={secondaryButton}>取消</button>
                  <button type="submit" disabled={creating || !idea.trim()} className={primaryButton}>{creating ? '创建中...' : '创建项目'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[20px] bg-white p-6 shadow-2xl shadow-slate-950/20">
              <h3 className="text-xl font-black text-slate-950">编辑项目</h3>
              <form onSubmit={handleRenameProject} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">项目名称</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={fieldClass} required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">产品描述</label>
                  <textarea value={editIdea} onChange={(e) => setEditIdea(e.target.value)} className={`${fieldClass} h-28 resize-none`} placeholder="请描述您的产品想法..." required />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setEditingProject(null)} className={secondaryButton}>取消</button>
                  <button type="submit" disabled={savingProject} className={primaryButton}>{savingProject ? '保存中...' : '保存修改'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="mt-6 rounded-[20px] border border-dashed border-blue-200 bg-white px-6 py-16 text-center shadow-xl shadow-blue-950/5">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-black text-blue-600">＋</div>
            <h3 className="text-xl font-black text-slate-950">从第一个产品想法开始</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-600">例如：智能宠物喂食器、校园共享雨伞系统、便携式咖啡萃取杯。</p>
            <button onClick={() => setShowNewProject(true)} className={`${primaryButton} mt-6`}>新建设计项目</button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const progress = getProjectProgress(project);
              const cover = getProjectCover(project);
              const name = (project.product_intro as any)?.name || '未命名项目';
              return (
                <article key={project.id} className="group overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xl shadow-blue-950/5 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-950/10">
                  <button type="button" onClick={() => router.push(`/dashboard/${project.id}`)} className="block w-full text-left outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
                    <div className="relative aspect-[16/9] border-b border-slate-100 bg-gradient-to-br from-blue-50 to-indigo-50">
                      {cover ? <img src={cover} alt={name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} /> : null}
                      <div className={`${cover ? 'hidden' : ''} flex h-full items-center justify-center text-sm font-bold text-slate-400`}>设计档案</div>
                      <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-blue-100/70" />
                    </div>
                    <div className="p-6">
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">步骤 {progress}/7</span>
                        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-400">{new Date(project.updated_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <h3 className="line-clamp-1 text-xl font-black text-slate-950">{name}</h3>
                      <p className="mt-3 line-clamp-2 min-h-[3rem] text-sm leading-6 text-slate-600">{project.idea}</p>
                      <div className="mt-6 h-2 rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.round((progress / 7) * 100)}%` }} /></div>
                    </div>
                  </button>
                  <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                    <button type="button" onClick={() => router.push(`/dashboard/${project.id}`)} className="text-sm font-black text-blue-600 transition hover:text-blue-700">点击打开项目 〉</button>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEditProject(project)} className={ghostButton}>编辑</button>
                      <button type="button" onClick={() => handleDeleteProject(project)} disabled={deletingProjectId === project.id} className={dangerButton}>{deletingProjectId === project.id ? '删除中' : '删除'}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
