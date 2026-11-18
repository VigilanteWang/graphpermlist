/** 离线导出与 JSON client 共用的发布文件及错误契约，描述 schema 1 的结构。 */
import type {
  CatalogCategoryMetadata, CatalogDefinitionEntry, CatalogFamily, CatalogJsonSnapshotSource
} from './catalog-query.js';

/** Application 原始安全字段的结构，保留官方 appRole 文案、成员类型和 origin。 */
export interface CatalogJsonAppRoleFields {
  id: string;
  value: string;
  isEnabled: boolean;
  allowedMemberTypes: string[];
  origin: string;
  displayName: string;
  description: string;
}
/** Delegated 原始安全字段的结构，保留官方 scope 的 consent type 和两套文案。 */
export interface CatalogJsonScopeFields {
  id: string;
  value: string;
  isEnabled: boolean;
  type: 'Admin' | 'User';
  adminConsentDisplayName: string;
  adminConsentDescription: string;
  userConsentDisplayName: string;
  userConsentDescription: string;
}
/** 快照中的普通 definition，额外保留安全原始字段；运行时校验必须核对两份字段的一致性。 */
export interface CatalogJsonSnapshotDefinition extends CatalogDefinitionEntry {
  rawDefinition: CatalogJsonAppRoleFields | CatalogJsonScopeFields;
}
/** 一个 resource 的完整快照；categories/families 引用必须存在，definitions 的身份不能重复。 */
export interface CatalogJsonSnapshotResource {
  resourceId: string;
  displayName: string;
  categories: CatalogCategoryMetadata[];
  families: CatalogFamily[];
  definitions: CatalogJsonSnapshotDefinition[];
}
/** schema 1 的不可变 JSON 目录产物；发布工具与浏览器在后续阶段实现校验，不包含数据库历史。 */
export interface CatalogJsonSnapshot {
  schemaVersion: 1;
  version: string;
  source: CatalogJsonSnapshotSource;
  classificationHash: string;
  resources: CatalogJsonSnapshotResource[];
}
/** 当前发布指针的 JSON 结构；snapshot 是受限相对路径，artifactSha256 对应完整快照文件字节。 */
export interface CatalogJsonManifest {
  schemaVersion: 1;
  version: string;
  snapshot: string;
  artifactSha256: string;
}
/** JSON client 的失败分类，涵盖文件读取、快照校验、schema 版本和目录查询。 */
export type CatalogJsonClientErrorCode = 'load-failed' | 'invalid-snapshot' | 'unsupported-schema' | 'not-found';
/** JSON client 用于 reject 的错误结构，取消请求时沿用 AbortError。 */
export interface CatalogJsonClientError extends Error {
  readonly code: CatalogJsonClientErrorCode;
}
