/** SQLite 导入与离线 JSON 发布共用的 Graph permission 转换模块，输入由调用方先校验。 */
import type {
  CatalogJsonAppRoleFields, CatalogJsonScopeFields, CatalogJsonSnapshotDefinition, CatalogJsonSnapshotResource
} from '@graph/contracts';
import { CATEGORIES, CLASSIFICATION_VERSION, classifyPermission } from './classification.js';
export { CATEGORIES, CLASSIFICATION_VERSION, classifyPermission };

/** 来源展示使用的逻辑文件名，不包含操作者的实际路径或自定义文件名。 */
export const CATALOG_SOURCE_BASENAME = 'commercial-graph-permlist.json';

/** 已校验的 Graph resource 输入；RSC 只用于计数，模型无需读取其原始字段。 */
interface CatalogModelInput {
  appId: string;
  displayName: string;
  appRoles: readonly CatalogJsonAppRoleFields[];
  oauth2PermissionScopes: readonly CatalogJsonScopeFields[];
  resourceSpecificApplicationPermissions: readonly unknown[];
}

/** 导入与发布共用的资源模型及分类摘要输入；摘要由各自的宿主计算。 */
interface CatalogModel {
  resource: CatalogJsonSnapshotResource;
  excludedRscCount: number;
  classificationVersion: string;
  classificationInput: string;
}

/** Application 的普通 definition 转换函数，同时保留官方 appRole 字段和固定 admin consent 规则。 */
function applicationEntry(raw: CatalogJsonAppRoleFields): CatalogJsonSnapshotDefinition {
  return {
    value: raw.value, ...classifyPermission(raw.value),
    definition: {
      id: raw.id.toLowerCase(), isEnabled: raw.isEnabled,
      title: raw.displayName, description: raw.description,
      permissionType: 'Application', adminConsentRequired: true, adminConsentRule: 'application-always-required'
    },
    rawDefinition: { ...raw, allowedMemberTypes: [...raw.allowedMemberTypes] }
  };
}

/** Delegated 的普通 definition 转换函数，从 consent type 推导 admin consent，并保留用户同意文案。 */
function delegatedEntry(raw: CatalogJsonScopeFields): CatalogJsonSnapshotDefinition {
  return {
    value: raw.value, ...classifyPermission(raw.value),
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

/** 资源目录的纯建模函数；保留各集合的源顺序、禁用项和同 value 不同 GUID 的定义。 */
export function buildCatalogModel(data: CatalogModelInput): CatalogModel {
  // User-only appRole 和 RSC 不属于普通目录，只有 RSC 的排除数量进入来源记录。
  const definitions = [
    ...data.appRoles.filter(raw => raw.allowedMemberTypes.includes('Application')).map(applicationEntry),
    ...data.oauth2PermissionScopes.map(delegatedEntry)
  ];
  const classifications = definitions.map(({ value, category, family }) => ({ value, category, family }));
  const usedCategories = new Set(classifications.map(row => row.category));
  const families = new Map(classifications.map(({ category, family }) =>
    [JSON.stringify([category, family]), { category, family }]));
  return {
    resource: {
      resourceId: data.appId,
      displayName: data.displayName,
      categories: CATEGORIES.filter(item => usedCategories.has(item.category)).map(item => ({ ...item })),
      families: [...families.values()],
      definitions
    },
    excludedRscCount: data.resourceSpecificApplicationPermissions.length,
    classificationVersion: CLASSIFICATION_VERSION,
    // 使用原 SQLite 导入的摘要输入顺序，历史活动版本可继续复用。
    classificationInput: JSON.stringify({ version: CLASSIFICATION_VERSION, categories: CATEGORIES, classifications })
  };
}
