/** 把 resource 导出的 appRole 和 scope 整理为目录数据，供 SQLite 导入和离线 JSON 发布共用。 */
import type {
  CatalogBrowseMode, CatalogClassification, CatalogDefinitionWithRawFields,
  CatalogResourceModel, SourceAppRoleFields, SourceScopeFields
} from '@graph/contracts';
import { CATEGORIES, CLASSIFICATION_VERSION, classifyPermission } from './classification.js';
import { configuredNavigation } from './resource-classification.js';
export { CATEGORIES, CLASSIFICATION_VERSION, classifyPermission };

/** 调用方已校验的一个 resource。RSC 数组只用于记录排除数量。 */
interface CatalogModelInput {
  appId: string;
  displayName: string;
  appRoles: readonly SourceAppRoleFields[];
  oauth2PermissionScopes: readonly SourceScopeFields[];
  resourceSpecificApplicationPermissions: readonly unknown[];
}

/** 一个 resource 的目录数据及来源信息。导入和发布流程对 classificationInput 计算分类摘要。 */
interface CatalogModel {
  resource: CatalogResourceModel;
  browseMode: CatalogBrowseMode;
  excludedRscCount: number;
  classificationVersion: string;
  classificationInput: string;
}

/** 将 permission value 映射到一个 category 和 family 的分类函数。 */
type Classify = (value: string) => { category: string; family: string };

/** 把 appRole 转成 Application definition，保留原始字段并将 admin consent 标为必需。 */
function applicationEntry(raw: SourceAppRoleFields, classify: Classify): CatalogDefinitionWithRawFields {
  return {
    value: raw.value, ...classify(raw.value),
    definition: {
      id: raw.id.toLowerCase(), isEnabled: raw.isEnabled,
      title: raw.displayName, description: raw.description,
      permissionType: 'Application', adminConsentRequired: true, adminConsentRule: 'application-always-required'
    },
    rawDefinition: { ...raw, allowedMemberTypes: [...raw.allowedMemberTypes] }
  };
}

/** 把 scope 转成 Delegated definition，按 Admin 或 User 设置 admin consent，并保留两套 consent 文案。 */
function delegatedEntry(raw: SourceScopeFields, classify: Classify): CatalogDefinitionWithRawFields {
  return {
    value: raw.value, ...classify(raw.value),
    definition: {
      id: raw.id.toLowerCase(), isEnabled: raw.isEnabled,
      title: raw.adminConsentDisplayName, description: raw.adminConsentDescription,
      permissionType: 'Delegated', adminConsentRequired: raw.type === 'Admin', consentType: raw.type,
      userConsentTitle: raw.userConsentDisplayName, userConsentDescription: raw.userConsentDescription,
      adminConsentRule: 'delegated-consent-type'
    },
    rawDefinition: { ...raw }
  };
}

/** resource 的可选显示名称及分类。未设置 classification 的清单条目直接按 family 浏览。 */
interface CatalogModelOptions {
  classification?: CatalogClassification;
  displayName?: string;
}

/** 整理一个 resource 的定义及其导航，保留原始顺序、禁用项和同 value 不同 GUID 的定义。 */
export function buildCatalogModel(
  data: CatalogModelInput, { classification, displayName = data.displayName }: CatalogModelOptions = {}
): CatalogModel {
  const { browseMode, categories, version, classify } = classification?.mode === 'graph'
    ? { browseMode: 'category' as const, categories: CATEGORIES, version: CLASSIFICATION_VERSION, classify: classifyPermission }
    : configuredNavigation(classification);
  // User-only appRole 和 RSC 不属于普通目录，只有 RSC 的排除数量进入来源记录。
  const definitions = [
    ...data.appRoles.filter(raw => raw.allowedMemberTypes.includes('Application')).map(raw => applicationEntry(raw, classify)),
    ...data.oauth2PermissionScopes.map(raw => delegatedEntry(raw, classify))
  ];
  const classifications = definitions.map(({ value, category, family }) => ({ value, category, family }));
  // 导航只需要有定义引用的 category。同名 family 可以位于不同 category，因此用两者组合去重。
  const usedCategories = new Set(classifications.map(row => row.category));
  const families = new Map(classifications.map(({ category, family }) =>
    [JSON.stringify([category, family]), { category, family }]));
  return {
    resource: {
      resourceId: data.appId,
      displayName,
      categories: categories.filter(item => usedCategories.has(item.category)).map(item => ({ ...item })),
      families: [...families.values()],
      definitions
    },
    excludedRscCount: data.resourceSpecificApplicationPermissions.length,
    browseMode,
    classificationVersion: version,
    // 使用原 SQLite 导入的摘要输入顺序，历史活动版本可继续复用。
    classificationInput: JSON.stringify({ version, categories, classifications })
  };
}
