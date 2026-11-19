/** 目录的中立查询契约，供 UI、查询核心及各数据源的客户端共享。 */

/** 普通 permission 的类型，取值为 Delegated 或 Application；不包含 RSC。 */
export type PermissionType = 'Delegated' | 'Application';
/** 目录的数据状态类型：not-imported 表示尚未导入，ready 表示已有可查询快照。 */
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

/** permission 的数量统计结构，包含按名称合并后的行数和未合并的定义数。 */
export interface PermissionCounts {
  permissionCount: number; // 筛选结果中按名称合并后的行数
  definitionCount: number; // 命中筛选的可见定义数，不按名称合并
}
/** 单个目录 resource 的概览，包含 App ID、显示名称和当前可见的 permission 数量。 */
export interface CatalogResourceSummary extends PermissionCounts {
  resourceId: string; // resource 的 App ID，不能使用来源租户的 Service Principal Object ID
  displayName: string;
}
/** category 的固定标识、名称和简介，供快照及查询核心使用。 */
export interface CatalogCategoryMetadata {
  category: string; // 稳定的 category 标识，包含 uncategorized
  displayName: string;
  description: string;
}
/** 单个服务 category 的查询概览，包含分类元数据和命中筛选的数量。 */
export interface CatalogCategorySummary extends CatalogCategoryMetadata, PermissionCounts {}

/** 单条 permission 定义的公共字段结构，供 Application 和 Delegated 定义继承。 */
export interface PermissionDefinitionBase {
  id: string;
  isEnabled: boolean;
  title: string; // 官方显示标题，不生成额外摘要
  description: string; // 官方 admin consent 文案
  adminConsentRequired: boolean;
}
/** 单条 Application permission 的定义结构，包含公共字段及固定的 admin consent 映射规则。 */
export interface ApplicationPermissionDefinition extends PermissionDefinitionBase {
  permissionType: 'Application';
  adminConsentRule: 'application-always-required';
}
/** 单条 Delegated permission 的定义结构，在公共字段之外包含 consent type 和 user consent 文案。 */
export interface DelegatedPermissionDefinition extends PermissionDefinitionBase {
  permissionType: 'Delegated';
  consentType: 'Admin' | 'User';
  userConsentTitle: string;
  userConsentDescription: string;
  adminConsentRule: 'delegated-consent-type';
}
/**
 * permission 定义的联合类型，一条定义可以是 ApplicationPermissionDefinition 或 DelegatedPermissionDefinition。
 * 根据 permissionType 判断具体类型后，即可读取该类型的专有字段。
 */
export type PermissionDefinition = ApplicationPermissionDefinition | DelegatedPermissionDefinition;
/**
 * permission 列表中的一行数据，由同一 resource 内同名 permission 的定义合并而成。
 * 仅包含命中当前筛选的定义，可见类型标签也由这些定义计算。
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
 * item 遵循当前筛选，allDefinitions 保留完整定义，供详情展示被隐藏的类型和状态。
 */
export interface PermissionDetail {
  item: MergedPermissionRow;
  allDefinitions: PermissionDefinition[]; // 包含被隐藏、禁用或未命中筛选的类型定义
}
/** permission 详情的中立查询结果，附带目录状态和来源元数据。 */
export interface PermissionDetailResult extends PermissionDetail, CatalogQueryMetadata {}

/**
 * permission 查询的可选参数结构，包含搜索词、category、family、类型及布尔筛选条件。
 * 列表、分类计数和详情共用此结构；未提供的字段由查询实现按默认规则处理。
 */
export interface PermissionQueryOptions {
  q?: string;
  category?: string;
  family?: string;
  permissionType?: PermissionType;
  adminConsentRequired?: boolean;
  showDisabled?: boolean;
}
/** 只读目录客户端的接口，约定各数据源共用的查询方法；signal 可用于取消请求。 */
export interface CatalogClient {
  /** resource 列表查询方法，返回列表与目录状态。 */
  resources(signal?: AbortSignal): Promise<ResourceListResult>;
  /** category 查询方法，返回指定 resource 在筛选条件下的分类列表和数量。 */
  categories(resourceId: string, query?: PermissionQueryOptions, signal?: AbortSignal): Promise<CategoryListResult>;
  /** permission 列表查询方法，返回指定 resource 中按名称合并的行。 */
  permissions(resourceId: string, query?: PermissionQueryOptions, signal?: AbortSignal): Promise<PermissionListResult>;
  /** permission 详情查询方法，返回命中行及全部类型定义。 */
  detail(
    resourceId: string, permissionValue: string, query?: PermissionQueryOptions, signal?: AbortSignal
  ): Promise<PermissionDetailResult>;
}

/** 已校验的普通 definition 及其导航归属；仅属于一个 resource，不包含 RSC。 */
export interface CatalogDefinitionEntry {
  value: string;
  category: string;
  family: string;
  definition: PermissionDefinition;
}
/** family 的分类归属；同一 family 名称可以出现在不同 category。 */
export interface CatalogFamily {
  category: string;
  family: string;
}
