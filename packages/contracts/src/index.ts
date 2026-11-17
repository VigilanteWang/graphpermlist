/** 各数据源与前端宿主共享的中立目录契约；只导出类型，不包含读取或查询实现。 */
/** 普通 permission 的类型，取值为 Delegated 或 Application；不包含 RSC。 */
export type PermissionType = 'Delegated' | 'Application';
/** 目录的数据状态类型：not-imported 表示尚未导入，ready 表示已有可查询快照。 */
export type DataState = 'not-imported' | 'ready';
/** 数据库目录快照的来源信息，包含文件名、源内容摘要、导入时间和分类版本，用于追溯数据。 */
export interface SourceInfo {
  fileName: string;
  sha256: string;
  importedAt: string; // 导入时间，采用 ISO 8601 UTC；不是源文件的导出时间
  classificationVersion: string;
  excludedRscCount: number;
}
/** permission 的数量统计结构，包含按名称合并后的行数和未合并的定义数。 */
export interface Counts {
  permissionCount: number; // 筛选结果中按名称合并后的行数
  definitionCount: number; // 命中筛选的可见定义数，不按名称合并
}
/** 目录响应的公共元数据结构，包含数据状态、快照来源及可选的 JSON 产物标识。 */
export interface CatalogMetadata {
  dataState: DataState;
  source: SourceInfo | SnapshotSourceInfo | null;
  artifact?: CatalogArtifactInfo;
}
/** 单个 API resource 的概览信息，包含 App ID、显示名称和当前可见的 permission 数量。 */
export interface ResourceSummary extends Counts {
  resourceId: string; // resource 的 App ID，不能使用来源租户的 Service Principal Object ID
  displayName: string;
}
/** resource 列表接口的响应结构，包含 resource 概览数组及公共元数据。 */
export interface ResourcesResponse extends CatalogMetadata { items: ResourceSummary[]; }
/** 单个服务 category 的概览信息，包含分类标识、名称、简介和命中筛选的数量。 */
export interface CategorySummary extends Counts {
  category: string; // 稳定的 category 标识，包含 uncategorized
  displayName: string;
  description: string;
}
/** category 列表接口的响应结构，包含当前筛选下的分类数组、总数量及公共元数据。 */
export interface CategoriesResponse extends CatalogMetadata, Counts { items: CategorySummary[]; }
/** 单条 permission 定义的公共字段结构，供 Application 和 Delegated 定义继承。 */
export interface DefinitionBase {
  id: string;
  isEnabled: boolean;
  title: string; // 官方显示标题，不生成额外摘要
  description: string; // 官方 admin consent 文案
  adminConsentRequired: boolean;
}
/** 单条 Application permission 的定义结构，包含公共字段及固定的 admin consent 映射规则。 */
export interface ApplicationDefinition extends DefinitionBase {
  permissionType: 'Application';
  adminConsentRule: 'application-always-required';
}
/** 单条 Delegated permission 的定义结构，在公共字段之外包含 consent type 和 user consent 文案。 */
export interface DelegatedDefinition extends DefinitionBase {
  permissionType: 'Delegated';
  consentType: 'Admin' | 'User';
  userConsentTitle: string;
  userConsentDescription: string;
  adminConsentRule: 'delegated-consent-type';
}
/**
 * permission 定义的联合类型，一条定义可以是 ApplicationDefinition 或 DelegatedDefinition。
 * 根据 permissionType 判断具体类型后，即可读取该类型的专有字段。
 */
export type PermissionDefinition = ApplicationDefinition | DelegatedDefinition;
/**
 * permission 列表中的一行数据，是同一 resource 内相同 permission value 的定义合并后的结构。
 * 仅包含命中当前筛选的定义，可见类型标签也由这些定义计算。
 */
export interface PermissionRow {
  resourceId: string;
  value: string;
  category: string;
  family: string;
  visibleTypes: PermissionType[]; // 仅根据命中筛选的可见定义计算标签
  definitions: PermissionDefinition[]; // 仅包含命中筛选的可见定义
}
/** permission 列表接口的响应结构，包含合并行数组、筛选数量及公共元数据。 */
export interface PermissionsResponse extends CatalogMetadata, Counts { items: PermissionRow[]; }
/**
 * 单个 permission 的详情响应结构，包含合并行、全部定义及公共元数据。
 * item 遵循当前筛选，allDefinitions 保留完整定义，供详情展示被隐藏的类型和状态。
 */
export interface PermissionDetailResponse extends CatalogMetadata {
  item: PermissionRow;
  allDefinitions: PermissionDefinition[]; // 包含被隐藏、禁用或未命中筛选的类型定义
}
/**
 * permission 查询的可选参数结构，包含搜索词、category、family、类型及布尔筛选条件。
 * 列表、分类计数和详情共用此结构；未提供的字段由查询实现按默认规则处理。
 */
export interface PermissionQuery {
  q?: string;
  category?: string;
  family?: string;
  permissionType?: PermissionType;
  adminConsentRequired?: boolean;
  showDisabled?: boolean;
}
/** Nest 默认错误响应的正文结构，包含 HTTP 状态码和错误消息；参数校验失败时消息可以是数组。 */
export interface ApiErrorBody { statusCode: number; message: string | string[]; error?: string; }

/** 只读目录客户端的接口，约定各数据源共用的查询方法；signal 可用于取消请求。 */
export interface CatalogClient {
  /** resource 列表查询方法，返回列表与目录状态。 */
  resources(signal?: AbortSignal): Promise<ResourcesResponse>;
  /** category 查询方法，返回指定 resource 在筛选条件下的分类列表和数量。 */
  categories(resourceId: string, query?: PermissionQuery, signal?: AbortSignal): Promise<CategoriesResponse>;
  /** permission 列表查询方法，返回指定 resource 中按名称合并的行。 */
  permissions(resourceId: string, query?: PermissionQuery, signal?: AbortSignal): Promise<PermissionsResponse>;
  /** permission 详情查询方法，返回命中行及全部类型定义。 */
  detail(resourceId: string, permissionValue: string, query?: PermissionQuery, signal?: AbortSignal): Promise<PermissionDetailResponse>;
}

/** 已校验的普通 definition 及其导航归属；仅属于一个 resource，不包含 RSC。 */
export interface CatalogDefinitionEntry {
  value: string;
  category: string;
  family: string;
  definition: PermissionDefinition;
}
/** category 的中立元数据，不包含随查询条件变化的数量。 */
export interface CategoryInfo { category: string; displayName: string; description: string; }
/** family 的分类归属；同一 family 名称可以出现在不同 category。 */
export interface FamilyInfo { category: string; family: string; }
/** JSON 快照的来源信息；generatedAt 是离线生成时间，不是 importedAt 或官方导出时间。 */
export interface SnapshotSourceInfo extends Omit<SourceInfo, 'importedAt'> { generatedAt: string; }
/** 已加载 JSON 产物的标识与摘要；sha256 对应文件字节，区别于 source.sha256 的源文件摘要。 */
export interface CatalogArtifactInfo { schemaVersion: 1; version: string; sha256: string; }
/** Application 原始安全字段的结构，保留官方 appRole 文案、成员类型和 origin。 */
export interface SnapshotApplicationFields {
  id: string; value: string; isEnabled: boolean;
  allowedMemberTypes: string[]; origin: string; displayName: string; description: string;
}
/** Delegated 原始安全字段的结构，保留官方 scope 的 consent type 和两套文案。 */
export interface SnapshotDelegatedFields {
  id: string; value: string; isEnabled: boolean; type: 'Admin' | 'User';
  adminConsentDisplayName: string; adminConsentDescription: string;
  userConsentDisplayName: string; userConsentDescription: string;
}
/** 快照中的普通 definition，额外保留安全原始字段；运行时校验必须核对两份字段的一致性。 */
export interface CatalogSnapshotDefinition extends CatalogDefinitionEntry {
  rawDefinition: SnapshotApplicationFields | SnapshotDelegatedFields;
}
/** 一个 resource 的完整快照；categories/families 引用必须存在，definitions 的身份不能重复。 */
export interface CatalogSnapshotResource {
  resourceId: string;
  displayName: string;
  categories: CategoryInfo[];
  families: FamilyInfo[];
  definitions: CatalogSnapshotDefinition[];
}
/** schema 1 的不可变 JSON 目录产物；发布工具与浏览器在后续阶段实现校验，不包含数据库历史。 */
export interface CatalogSnapshot {
  schemaVersion: 1;
  version: string;
  source: SnapshotSourceInfo;
  classificationHash: string;
  resources: CatalogSnapshotResource[];
}
/** 当前发布指针的 JSON 结构；snapshot 是受限相对路径，artifactSha256 对应完整快照文件字节。 */
export interface CatalogManifest {
  schemaVersion: 1;
  version: string;
  snapshot: string;
  artifactSha256: string;
}
/** 数据源无关的失败分类；取消沿用 AbortError，HTTP client 保留原有 CatalogApiError/status。 */
export type CatalogFailureCode = 'load-failed' | 'invalid-snapshot' | 'unsupported-schema' | 'not-found';
/** JSON client 后续实现的错误结构约定；失败必须 reject，不能返回伪造的空目录。 */
export interface CatalogFailure extends Error { readonly code: CatalogFailureCode; }
