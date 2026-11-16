/** permission 快照加载器的手写类型声明文件，包含数据结构及公开函数签名。 */

/** 原始 permission 字段的汇总结构；实际必需字段由所属集合的运行时校验决定。 */
export interface RawPermission {
  id: string; value: string; isEnabled: boolean;
  allowedMemberTypes: string[]; origin: string; displayName: string; description: string;
  type: 'Admin' | 'User'; adminConsentDisplayName: string; adminConsentDescription: string;
  userConsentDisplayName: string; userConsentDescription: string;
}
/** Graph resource 的快照结构，包含 appRoles、Delegated scopes 和 RSC 集合。 */
export interface PermissionsSource {
  appId: string; displayName: string; appDisplayName: string;
  appRoles: RawPermission[]; oauth2PermissionScopes: RawPermission[];
  resourceSpecificApplicationPermissions: RawPermission[];
}
/** 默认本地 permission 快照的绝对路径。 */
export const DEFAULT_PERMISSIONS_SOURCE: string;
/** 默认快照的固定 SHA-256 摘要，用于发现文件内容变化。 */
export const SNAPSHOT_SHA256: string;
/**
 * permission 快照的结构校验函数，检查 Graph resource 及 permission 字段并统计数量。
 * @param data - 待校验的数据。
 * @returns 集合总数、禁用数量和 Application permission 数量。
 */
export function validatePermissionsData(data: unknown): Record<string, unknown>;
/**
 * permission 快照的异步加载函数，返回已校验数据、来源信息和统计。
 * @param options - 可选的快照路径和预期 SHA-256 摘要。
 * @returns 已校验的数据、来源路径、实际摘要和统计。
 */
export function loadPermissionsSource(options?: {source?: string; expectedSha256?: string}): Promise<{
  data: PermissionsSource; sourcePath: string; sha256: string; counts: Record<string, unknown>;
}>;
