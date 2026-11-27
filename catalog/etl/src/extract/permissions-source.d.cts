/** 本地 permission 文件加载器的类型声明，供 TypeScript 调用 JavaScript 实现时使用。 */

import type { CatalogClassification, SourceAppRoleFields, SourceScopeFields } from '@graph/contracts';

/** 输入文件中一条 RSC definition 的字段。目录模型会单独统计这组 definition。 */
interface RawRscPermission {
  id: string;
  value: string;
  isEnabled: boolean;
  displayName: string;
  description: string;
}
/** 输入 JSON 的顶层结构，包含一个 resource 的名称、App ID 和三组 permission definition。 */
export interface PermissionsSource {
  appId: string; displayName: string; appDisplayName: string;
  appRoles: SourceAppRoleFields[]; oauth2PermissionScopes: SourceScopeFields[];
  resourceSpecificApplicationPermissions: RawRscPermission[];
}
/** 默认本地 permission 快照的绝对路径。 */
export const DEFAULT_PERMISSIONS_SOURCE: string;
/**
 * permission 快照的结构校验函数，检查 Graph resource 及 permission 字段并统计数量。
 * @param data - 待校验的数据。
 * @param appId - 预期 Resource App ID，省略时使用 Graph 的 App ID。
 * @returns 集合总数、禁用数量和 Application permission 数量。
 */
export function validatePermissionsData(data: unknown, appId?: string): Record<string, unknown>;
/** 一个已校验的输入及其来源。sourcePath 仅供本地调用方使用，公开结果使用 fileName。 */
export interface LoadedPermissionsSource {
  data: PermissionsSource;
  sourcePath: string;
  fileName: string;
  sha256: string;
  counts: Record<string, unknown>;
}

/** 输入的路径配置；显式 source 选择 Graph 单源模式，否则使用 resource 清单。 */
interface SourceOptions {
  source?: string;
  expectedSha256?: string;
  configPath?: string;
}

/** 清单中的单个 resource，提供可选显示名称与分类配置。 */
interface ConfiguredPermissionsSource extends LoadedPermissionsSource {
  displayName?: string;
  classification?: CatalogClassification;
}

/** Graph 单源的异步加载函数，兼容显式文件和预期 SHA-256。 */
export function loadPermissionsSource(options?: SourceOptions): Promise<LoadedPermissionsSource>;

/** 批次加载函数，返回全部已校验源和离线发布所用的 schema 版本。 */
export function loadPermissionsSources(options?: SourceOptions): Promise<{
  schemaVersion: 1 | 2;
  inputs: ConfiguredPermissionsSource[];
}>;

/** 将导出的公开字段投影到脱敏源结构，再以指定 Resource App ID 校验。 */
export function sanitizePermissionsData(data: unknown, appId: string): PermissionsSource;
