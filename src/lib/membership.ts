/**
 * 会员系统核心逻辑
 *
 * ═══════════════════════════════════════════════════════════════
 * 安全架构：服务端 vs 客户端严格分离
 * ═══════════════════════════════════════════════════════════════
 *
 * ── 服务端（API 路由） ──
 * - isMembershipEnforced():     只读 MEMBERSHIP_ENABLED（服务端环境变量）
 * - canExportServer():          服务端导出权限判断
 * - getImageLimitServer():      服务端图片配额判断
 * - getProjectLimitServer():    服务端项目配额判断
 *
 * ── 客户端（UI 组件） ──
 * - MEMBERSHIP_ENABLED:         只读 NEXT_PUBLIC_MEMBERSHIP_ENABLED（控制 UI 显示）
 * - canExport():                客户端导出按钮显示判断
 * - getImageLimit():            客户端图片配额显示判断
 * - getProjectLimit():          客户端项目配额显示判断
 *
 * ⚠️ 严重警告：
 * NEXT_PUBLIC_MEMBERSHIP_ENABLED 只能控制按钮/UI 显示，绝不能控制 API 权限。
 * 如果 MEMBERSHIP_ENABLED=true 但 NEXT_PUBLIC_MEMBERSHIP_ENABLED=false，
 * 服务端仍然会执行会员校验，客户端只是不显示会员相关 UI。
 */

import type { Profile } from '@/types';

export type MembershipPlan = 'none' | 'day' | 'week' | 'month' | 'half_year' | 'year';

export const membershipPlans: Record<Exclude<MembershipPlan, 'none'>, {
  name: string;
  price: number;
  days: number;
  imageLimit: number | null;
  projectLimit: number;
}> = {
  day: { name: '一天会员', price: 5, days: 1, imageLimit: 5, projectLimit: 10 },
  week: { name: '一周会员', price: 15, days: 7, imageLimit: 5, projectLimit: 10 },
  month: { name: '一月会员', price: 30, days: 30, imageLimit: null, projectLimit: 20 },
  half_year: { name: '半年会员', price: 100, days: 180, imageLimit: null, projectLimit: 20 },
  year: { name: '一年会员', price: 250, days: 365, imageLimit: null, projectLimit: 20 },
};

// ═══════════════════════════════════════════════════════════════
// 通用工具函数（服务端和客户端共享）
// ═══════════════════════════════════════════════════════════════

type PlanProfile = Pick<Profile, 'membership_plan' | 'membership_expires_at'> | null | undefined;
const validPlans = new Set<MembershipPlan>(['none', 'day', 'week', 'month', 'half_year', 'year']);

export function getActivePlan(profile: PlanProfile): MembershipPlan {
  const plan = profile?.membership_plan;
  if (!plan || plan === 'none' || !validPlans.has(plan)) return 'none';
  if (!profile.membership_expires_at) return 'none';

  const expiresAt = new Date(profile.membership_expires_at).getTime();
  if (!Number.isFinite(expiresAt)) return 'none';

  return expiresAt > Date.now() ? plan : 'none';
}

export function getPlanInfo(plan: MembershipPlan) {
  return plan === 'none' ? null : membershipPlans[plan];
}

export function buildImageUsageKey(projectId: string, type: string) {
  return `${projectId}:${type}`;
}

// ═══════════════════════════════════════════════════════════════
// 服务端函数 —— 只读 MEMBERSHIP_ENABLED（服务端环境变量）
// 在 API 路由中使用这些函数，绝不用客户端的 MEMBERSHIP_ENABLED
// ═══════════════════════════════════════════════════════════════

/** 服务端判断是否开启会员强制校验 */
export function isMembershipEnforced(): boolean {
  return process.env.MEMBERSHIP_ENABLED === 'true';
}

/** 服务端导出权限判断 */
export function canExportServer(plan: MembershipPlan): boolean {
  if (!isMembershipEnforced()) return true;
  return plan !== 'none';
}

/** 服务端图片配额判断 */
export function getImageLimitServer(plan: MembershipPlan): number | null {
  if (!isMembershipEnforced()) return null;
  if (plan === 'none') return 0;
  return membershipPlans[plan].imageLimit;
}

/** 服务端项目配额判断 */
export function getProjectLimitServer(plan: MembershipPlan): number {
  if (!isMembershipEnforced()) return 20;
  return plan === 'none' ? 10 : membershipPlans[plan].projectLimit;
}

// ═══════════════════════════════════════════════════════════════
// 客户端函数 —— 只读 NEXT_PUBLIC_MEMBERSHIP_ENABLED（控制 UI）
// 这些函数仅用于控制按钮/标签的显示，绝不能用于 API 权限判断
// ═══════════════════════════════════════════════════════════════

/** 客户端可见标志（用于 UI 显示/隐藏） */
export const MEMBERSHIP_ENABLED = process.env.NEXT_PUBLIC_MEMBERSHIP_ENABLED === 'true';

/** @deprecated 客户端 UI 用。API 路由请用 canExportServer() */
export function canExport(plan: MembershipPlan): boolean {
  if (!MEMBERSHIP_ENABLED) return true;
  return plan !== 'none';
}

/** @deprecated 客户端 UI 用。API 路由请用 getImageLimitServer() */
export function getImageLimit(plan: MembershipPlan): number | null {
  if (!MEMBERSHIP_ENABLED) return null;
  if (plan === 'none') return 0;
  return membershipPlans[plan].imageLimit;
}

/** @deprecated 客户端 UI 用。API 路由请用 getProjectLimitServer() */
export function getProjectLimit(plan: MembershipPlan): number {
  if (!MEMBERSHIP_ENABLED) return 20;
  return plan === 'none' ? 10 : membershipPlans[plan].projectLimit;
}
