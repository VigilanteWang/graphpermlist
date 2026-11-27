/** 客户端的查询参数、目录概要、列表、计数和详情。 */
import type { CatalogCategoryMetadata, PermissionDefinition, PermissionType } from './catalog-model.js';

/** 界面需要知道的目录状态。not-imported 表示尚无导入数据，ready 表示已有可查询数据。 */
export type CatalogDataState = 'not-imported' | 'ready';
/** 目录输入文件的共同来源字段，供数据库导入和离线 JSON 生成记录使用。 */
interface CatalogSourceFileMetadata {
  fileName: string;
  sha256: string; // 原始输入文件字节的 SHA-256。
  classificationVersion: string;
  excludedRscCount: number;
}
/** 数据库导入记录及 HTTP 响应中的来源元数据。 */
export interface CatalogImportSource extends CatalogSourceFileMetadata {
  importedAt: string; // 数据库导入时间，采用 ISO 8601 UTC。
}
/** 离线生成的 JSON 快照中的来源元数据。 */
export interface CatalogJsonSnapshotSource extends CatalogSourceFileMetadata {
  generatedAt: string; // 离线快照生成时间，采用 ISO 8601 UTC。
}
/** 中立查询结果中支持的来源类型，可通过 importedAt 或 generatedAt 区分。 */
export type CatalogSourceMetadata = CatalogImportSource | CatalogJsonSnapshotSource;

/** JSON client 加载的快照产物标识，sha256 对应完整快照文件字节。 */
export interface CatalogJsonArtifactMetadata {
  schemaVersion: 1;
  version: string;
  sha256: string;
}
/** 各数据源的查询结果共用的元数据，包含目录状态、来源及可选的 JSON 产物标识。 */
export interface CatalogQueryMetadata {
  dataState: CatalogDataState;
  source: CatalogSourceMetadata | null;
  artifact?: CatalogJsonArtifactMetadata;
}

/** 筛选后的两种计数。例如同名的 Application 和 Delegated 都命中时，算 1 个 permission、2 条 definitions。 */
export interface PermissionCounts {
  permissionCount: number; // 筛选结果中按名称合并后的行数
  definitionCount: number; // 命中筛选的可见定义数，不按名称合并
}
/** 单个目录 resource 的概览，包含 App ID、显示名称和当前可见的 permission 数量。 */
export interface CatalogResourceSummary extends PermissionCounts {
  resourceId: string; // resource 的 App ID，在各数据源中标识同一个应用。
  displayName: string;
}
/** 单个服务 category 的查询概览，包含分类元数据和命中筛选的数量。 */
export interface CatalogCategorySummary extends CatalogCategoryMetadata, PermissionCounts {}

/**
 * permission 列表中的一行数据，由同一 resource 内同名 permission 的定义合并而成。
 * 如果只筛选 Delegated，definitions 只包含命中的 Delegated 定义，visibleTypes 也只列 Delegated。
 */
export interface MergedPermissionRow {
  resourceId: string;
  value: string;
  category: string;
  family: string;
  visibleTypes: PermissionType[]; // 仅根据命中筛选的可见定义计算标签
  definitions: PermissionDefinition[]; // 仅包含命中筛选的可见定义
}

/** resource 列表的中立查询结果，包含 resource 概览和目录元数据。 */
export interface ResourceListResult extends CatalogQueryMetadata {
  items: CatalogResourceSummary[];
}
/** category 列表的中立查询结果，包含当前筛选下的分类和总数量。 */
export interface CategoryListResult extends CatalogQueryMetadata, PermissionCounts {
  items: CatalogCategorySummary[];
}
/** permission 列表的中立查询结果，包含合并行和筛选数量。 */
export interface PermissionListResult extends CatalogQueryMetadata, PermissionCounts {
  items: MergedPermissionRow[];
}
/**
 * 单个 permission 的查询详情，包含合并行及全部定义。
 * item 是列表里看到的行。allDefinitions 也包含被筛选或因禁用状态而隐藏的定义，供详情查看。
 */
export interface PermissionDetail {
  item: MergedPermissionRow;
  allDefinitions: PermissionDefinition[]; // 包含被隐藏、禁用或未命中筛选的类型定义
}
/** permission 详情的中立查询结果，附带目录状态和来源元数据。 */
export interface PermissionDetailResult extends PermissionDetail, CatalogQueryMetadata {}

/**
 * 列表、category 计数和详情共用的筛选条件。showDisabled 默认关闭。
 * adminConsentRequired 未传时不按该字段筛选，传 false 时只返回无需 admin consent 的定义。
 */
export interface PermissionQueryOptions {
  q?: string;
  category?: string;
  family?: string;
  permissionType?: PermissionType;
  adminConsentRequired?: boolean;
  showDisabled?: boolean;
}
