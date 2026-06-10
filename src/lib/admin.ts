/**
 * 管理员校验（仅从 session 判断，不接受外部输入的身份）
 *
 * @deprecated 请在路由中直接使用:
 *   import { requireAdmin } from '@/lib/auth';
 *   const adminUser = await requireAdmin();
 */

export { requireAdmin } from '@/lib/auth';

// 保留旧函数签名（仅内部兼容，不接受外部传入的 userId/email）
// 新代码应直接使用 requireAdmin()
