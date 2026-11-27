/** 定义离线工具生成的 current.json 和目录快照，以及 JSON client 读取这两份文件时使用的错误类型。 */
import type { CatalogBrowseMode, CatalogResourceModel } from './catalog-model.js';
import type { CatalogJsonSnapshotSource, CatalogSourceFileMetadata } from './catalog-query.js';

/** 一次发布的目录数据。schemaVersion 标识 JSON 结构，version 标识这次发布的数据版本。 */
export interface CatalogJsonSnapshotV1 {
  schemaVersion: 1;
  version: string;
  source: CatalogJsonSnapshotSource;
  classificationHash: string;
  resources: CatalogResourceModel[];
}
/** schema 2 中一个 resource 的目录和单独追溯所需的来源及分类摘要。 */
export interface CatalogJsonResource extends CatalogResourceModel {
  browseMode: CatalogBrowseMode;
  source: CatalogSourceFileMetadata;
  classificationHash: string;
}

/** schema 2 多 resource 快照，generatedAt 是整个发布物的生成时间。 */
export interface CatalogJsonSnapshotV2 {
  schemaVersion: 2;
  version: string;
  generatedAt: string;
  resources: CatalogJsonResource[];
}

/** 读取端支持的快照格式；通过 schemaVersion 区分来源和目录字段。 */
export type CatalogJsonSnapshot = CatalogJsonSnapshotV1 | CatalogJsonSnapshotV2;

/** current.json 的内容。客户端用 snapshot 找到同一目录中的文件，再用 artifactSha256 核对该文件的完整字节。 */
export interface CatalogJsonManifest {
  schemaVersion: 1 | 2;
  version: string;
  snapshot: string;
  artifactSha256: string;
}
/** JSON client 的失败分类，涵盖文件读取、快照校验、schema 版本和目录查询。 */
export type CatalogJsonErrorCode =
  'load-failed' | 'permission-denied' | 'file-not-found' | 'invalid-snapshot' | 'unsupported-schema' | 'not-found';
/** JSON client 用于 reject 的错误结构，取消请求时沿用 AbortError。 */
export interface CatalogJsonError extends Error {
  readonly code: CatalogJsonErrorCode;
}
