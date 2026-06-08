export const MEMBERSHIP_ENABLED = false;

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

export function getActivePlan(profile: any): MembershipPlan {
  if (!profile?.membership_plan || profile.membership_plan === 'none') return 'none';
  if (!profile.membership_expires_at) return 'none';
  return new Date(profile.membership_expires_at).getTime() > Date.now()
    ? profile.membership_plan
    : 'none';
}

export function getPlanInfo(plan: MembershipPlan) {
  return plan === 'none' ? null : membershipPlans[plan];
}

export function getProjectLimit(plan: MembershipPlan) {
  if (!MEMBERSHIP_ENABLED) return 20;
  return plan === 'none' ? 10 : membershipPlans[plan].projectLimit;
}

export function canExport(plan: MembershipPlan) {
  if (!MEMBERSHIP_ENABLED) return true;
  return plan !== 'none';
}

export function getImageLimit(plan: MembershipPlan) {
  if (!MEMBERSHIP_ENABLED) return null;
  if (plan === 'none') return 0;
  return membershipPlans[plan].imageLimit;
}

export function buildImageUsageKey(projectId: string, type: string) {
  return `${projectId}:${type}`;
}
