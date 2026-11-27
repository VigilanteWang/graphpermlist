/** 本地 permission 文件加载器的类型声明，供 TypeScript 调用 JavaScript 实现时使用。 */

import type { SourceAppRoleFields, SourceScopeFields } from '@graph/contracts';

/** 输入文件中一条 RSC definition 的字段。目录模型会单独统计这组 definition。 */
interface RawRscPermission {
  id: string;
  value: string;
  isEnabled: boolean;
  displayName: string;
  description: string;
}
/** 输入 JSON 的顶层结构，包含一个 Graph resource 的名称、App ID 和三组 permission definition。 */
export interface PermissionsSource {
  appId: string; displayName: string; appDisplayName: string;
  appRoles: SourceAppRoleFields[]; oauth2PermissionScopes: SourceScopeFields[];
  resourceSpecificApplicationPermissions: RawRscPermission[];
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
 * @param options - 可选文件路径和预期 SHA-256 摘要，省略时从相应环境变量读取。
 * @returns 已校验的数据、来源路径、实际摘要和统计。
 */
export function loadPermissionsSource(options?: {source?: string; expectedSha256?: string}): Promise<{
  data: PermissionsSource; sourcePath: string; sha256: string; counts: Record<string, unknown>;
}>;
