/** 定义离线工具生成的 current.json 和目录快照，以及 JSON client 读取这两份文件时使用的错误类型。 */
import type {
  CatalogCategoryMetadata, CatalogDefinitionEntry, CatalogFamily, CatalogJsonSnapshotSource
} from './catalog-query.js';

/** Application definition 对应的原始 appRole 字段，包括官方文案、成员类型和 origin。 */
export interface CatalogJsonAppRoleFields {
  id: string;
  value: string;
  isEnabled: boolean;
  allowedMemberTypes: string[];
  origin: string;
  displayName: string;
  description: string;
}
/** Delegated definition 对应的原始 scope 字段，包括 consent type 及 admin 和 user 文案。 */
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
/** 快照中的普通 definition。查询读取整理后的字段，校验时和 rawDefinition 对照。 */
export interface CatalogJsonSnapshotDefinition extends CatalogDefinitionEntry {
  rawDefinition: CatalogJsonAppRoleFields | CatalogJsonScopeFields;
}
/** 一个 resource 的完整目录数据。每条 definition 引用这个 resource 内已列出的 category 和 family。 */
export interface CatalogJsonSnapshotResource {
  resourceId: string;
  displayName: string;
  categories: CatalogCategoryMetadata[];
  families: CatalogFamily[];
  definitions: CatalogJsonSnapshotDefinition[];
}
/** 一次发布的目录数据。schemaVersion 标识 JSON 结构，version 标识这次发布的数据版本。 */
export interface CatalogJsonSnapshot {
  schemaVersion: 1;
  version: string;
  source: CatalogJsonSnapshotSource;
  classificationHash: string;
  resources: CatalogJsonSnapshotResource[];
}
/** current.json 的内容。客户端用 snapshot 找到同一目录中的文件，再用 artifactSha256 核对该文件的完整字节。 */
export interface CatalogJsonManifest {
  schemaVersion: 1;
  version: string;
  snapshot: string;
  artifactSha256: string;
}
/** JSON client 的失败分类，涵盖文件读取、快照校验、schema 版本和目录查询。 */
export type CatalogJsonClientErrorCode =
  'load-failed' | 'permission-denied' | 'file-not-found' | 'invalid-snapshot' | 'unsupported-schema' | 'not-found';
/** JSON client 用于 reject 的错误结构，取消请求时沿用 AbortError。 */
export interface CatalogJsonClientError extends Error {
  readonly code: CatalogJsonClientErrorCode;
}
