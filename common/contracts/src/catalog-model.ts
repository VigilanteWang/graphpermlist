/** 目录读写共用的数据结构，包含 permission、definition、category、family 和完整 resource。 */
/** 普通 permission 的类型，取值为 Delegated 或 Application；不包含 RSC。 */
export type PermissionType = 'Delegated' | 'Application';
/** category 的固定标识、名称和简介，供快照及查询核心使用。 */
export interface CatalogCategoryMetadata {
  category: string; // 稳定的 category 标识，包含 uncategorized
  displayName: string;
  description: string;
}
/** 单条 permission 定义的公共字段结构，供 Application 和 Delegated 定义继承。 */
export interface PermissionDefinitionBase {
  id: string;
  isEnabled: boolean;
  title: string; // 官方显示标题，不生成额外摘要
  description: string; // 官方 admin consent 文案
  adminConsentRequired: boolean;
}
/** 一条 Application 定义。目录把这类定义的 admin consent 标为必需。 */
export interface ApplicationPermissionDefinition extends PermissionDefinitionBase {
  permissionType: 'Application';
  adminConsentRule: 'application-always-required';
}
/** 一条 Delegated 定义。目录用 consent type 判断是否需要 admin consent，另保留 user consent 文案。 */
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
/** Application definition 对应的原始 appRole 字段，包括官方文案、成员类型和 origin。 */
export interface SourceAppRoleFields {
  id: string;
  value: string;
  isEnabled: boolean;
  allowedMemberTypes: string[];
  origin: string;
  displayName: string;
  description: string;
}
/** Delegated definition 对应的原始 scope 字段，包括 consent type 及 admin 和 user 文案。 */
export interface SourceScopeFields {
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
export interface CatalogDefinitionWithRawFields extends CatalogDefinitionEntry {
  rawDefinition: SourceAppRoleFields | SourceScopeFields;
}
/** 一个 resource 的完整目录数据。每条 definition 引用这个 resource 内已列出的 category 和 family。 */
export interface CatalogResourceModel {
  resourceId: string;
  displayName: string;
  categories: CatalogCategoryMetadata[];
  families: CatalogFamily[];
  definitions: CatalogDefinitionWithRawFields[];
}

/** resource 的浏览方式。category 先选分类，family 直接展示按 family 分组的 permission。 */
export type CatalogBrowseMode = 'category' | 'family';

/** 目录导入时使用的分类配置。Graph 使用内置规则，其他 resource 可按 family 映射 category。 */
export type CatalogClassification = { mode: 'graph' } | {
  mode: 'categories';
  version: string;
  categories: (CatalogCategoryMetadata & { families: string[] })[];
};
