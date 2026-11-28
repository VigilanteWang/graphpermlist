/** 定义离线工具生成的 current.json 和目录快照，以及 JSON client 读取这两份文件时使用的错误类型。 */
import type { CatalogBrowseMode, CatalogResourceModel } from './catalog-model.js';
import type { CatalogSourceFileMetadata } from './catalog-query.js';

/** schema 2 中一个 resource 的目录和单独追溯所需的来源及分类摘要。 */
export interface CatalogJsonResource extends CatalogResourceModel {
  browseMode: CatalogBrowseMode;
  source: CatalogSourceFileMetadata;
  classificationHash: string;
}

/** 一次 schema 2 目录发布。可以包含一个或多个 resource，generatedAt 是整份快照的生成时间。 */
export interface CatalogJsonSnapshot {
  schemaVersion: 2;
  version: string;
  generatedAt: string;
  resources: CatalogJsonResource[];
}

/** 保留的 schema 2 类型名称，与 CatalogJsonSnapshot 表示同一格式。 */
export type CatalogJsonSnapshotV2 = CatalogJsonSnapshot;

/** current.json 的内容。客户端用 snapshot 找到同一目录中的文件，再用 artifactSha256 核对该文件的完整字节。 */
export interface CatalogJsonManifest {
  schemaVersion: 2;
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
