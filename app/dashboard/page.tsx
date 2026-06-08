'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getActivePlan, getProjectLimit, MEMBERSHIP_ENABLED, type MembershipPlan } from '@/lib/membership';
import { supabase } from '@/lib/supabase/client';
import type { Project } from '@/types';

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
  const router = useRouter();

  const buttonBase = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold outline-none transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0';
  const primaryButton = `${buttonBase} bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 focus-visible:ring-4 focus-visible:ring-blue-200 disabled:bg-blue-300`;
  const secondaryButton = `${buttonBase} border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-4 focus-visible:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400`;
  const ghostButton = `${buttonBase} text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-4 focus-visible:ring-slate-200 disabled:text-slate-400`;
  const dangerButton = `${buttonBase} border border-red-100 bg-white text-red-600 shadow-sm hover:border-red-200 hover:bg-red-50 focus-visible:ring-4 focus-visible:ring-red-100 disabled:text-red-300`;
  const membershipButton = `${buttonBase} border border-amber-200 bg-amber-50 text-amber-700 shadow-sm hover:bg-amber-100 focus-visible:ring-4 focus-visible:ring-amber-100`;

  useEffect(() => {
    fetchProjects();
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

      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          idea,
        } as any)
        .select()
        .single();

      if (error) throw error;
      router.push(`/dashboard/${(data as any).id}`);
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
      const productIntro = editingProject.product_intro || {
        name: '',
        tagline: '',
        features: [],
        scenario: '',
      };
      const { data, error } = await (supabase as any)
        .from('projects')
        .update({
          product_intro: {
            ...productIntro,
            name: editName,
          },
          idea: editIdea,
        } as any)
        .eq('id', editingProject.id)
        .select()
        .single();

      if (error) throw error;
      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === editingProject.id ? (data as Project) : project
        )
      );
      setEditingProject(null);
    } catch (error) {
      console.error('重命名项目失败:', error);
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!window.confirm('确定要删除这个项目吗？删除后无法恢复。')) return;
    setDeletingProjectId(project.id);

    try {
      const { error } = await (supabase as any)
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-b-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push('/')}
              className={secondaryButton}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10h14V10" /></svg>
              主页
            </button>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-500/25">
                DF
              </span>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-950">DesignFlow AI</h1>
                <p className="hidden text-xs font-medium text-slate-500 sm:block">AI 产品设计工作台</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {MEMBERSHIP_ENABLED && (
              <button
                onClick={() => router.push('/membership')}
                className={membershipButton}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.519 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.519-4.674a1 1 0 00-.363-1.118L3.079 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" /></svg>
                会员
              </button>
            )}
            <button
              onClick={handleLogout}
              className={secondaryButton}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-8 text-white shadow-2xl shadow-blue-900/15 sm:p-10">
          <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-blue-50 ring-1 ring-white/15">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                工作台
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">我的项目</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50/90">
                管理产品设计流程，继续编辑已有项目，或从一个新想法开始生成完整设计方案。
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                <span className="rounded-full bg-white/10 px-4 py-2 text-blue-50 ring-1 ring-white/15">
                  项目数量 {projects.length}/{projectLimit}
                </span>
                {MEMBERSHIP_ENABLED && (
                  <span className="rounded-full bg-white/10 px-4 py-2 text-blue-50 ring-1 ring-white/15">
                    当前套餐：{activePlan === 'none' ? '未开通' : '会员'}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowNewProject(true)}
              disabled={projects.length >= projectLimit}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-blue-700 shadow-lg shadow-slate-950/10 outline-none transition hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              新建项目
            </button>
          </div>
        </section>

        {showNewProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-black text-slate-950">创建新项目</h3>
              <p className="mt-1 text-sm text-slate-500">描述你的产品想法，AI 会生成完整设计流程。</p>
              <form onSubmit={handleCreateProject} className="mt-5">
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="例如：一款面向独居青年的智能宠物喂食器..."
                  className="h-36 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  required
                />
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewProject(false)}
                    className={secondaryButton}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !idea.trim()}
                    className={primaryButton}
                  >
                    {creating ? '创建中...' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-black text-slate-950">编辑项目</h3>
              <form onSubmit={handleRenameProject} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">项目名称</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">产品描述</label>
                  <textarea
                    value={editIdea}
                    onChange={(e) => setEditIdea(e.target.value)}
                    className="h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="请描述您的产品想法..."
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className={secondaryButton}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={savingProject}
                    className={primaryButton}
                  >
                    {savingProject ? '保存中...' : '保存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/85 px-6 py-16 text-center shadow-xl shadow-slate-200/50 backdrop-blur-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900">还没有项目</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">点击上方按钮创建第一个项目。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/${project.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/dashboard/${project.id}`);
                  }
                }}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-200/60 outline-none backdrop-blur-sm transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-200/50 focus:ring-4 focus:ring-blue-100"
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-100/80 transition group-hover:scale-125" />
                <div className="relative">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      步骤 {project.current_step}/7
                    </span>
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-400 ring-1 ring-slate-100">
                      {new Date(project.updated_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <h3 className="line-clamp-1 text-lg font-black text-slate-950">
                    {(project.product_intro as any)?.name || '未命名项目'}
                  </h3>
                  <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">{project.idea}</p>
                  <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 opacity-0 transition group-hover:opacity-100">
                      点击打开项目
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </span>
                    <div className="flex gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditProject(project);
                        }}
                        className={secondaryButton}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project);
                        }}
                        disabled={deletingProjectId === project.id}
                        className={dangerButton}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h12" /></svg>
                        {deletingProjectId === project.id ? '删除中...' : '删除'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
