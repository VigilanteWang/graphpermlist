/** 浏览器与 Node 共用的纯目录查询模块；输入为已校验的单一 resource，不读取文件或依赖宿主。 */
import type { CatalogDefinitionEntry, CategoryInfo, CategorySummary, Counts, PermissionDetailResponse,
  PermissionQuery, PermissionRow } from '@graph/contracts';

/** 文本的稳定比较函数，保留现有 API 的大小写敏感排序规则。 */
const orderText = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/** 合并行的数量统计函数，分别统计 permission 名称和命中的原始 definitions。 */
export const countPermissions = (rows: readonly PermissionRow[]): Counts => ({ permissionCount: rows.length,
  definitionCount: rows.reduce((sum, row) => sum + row.definitions.length, 0) });

/**
 * 单一 resource 的 permission 查询函数；输入已排除 RSC，且同 value 的 category/family 一致。
 * @param resourceId - 当前 resource 的 App ID，不是 Service Principal Object ID。
 * @param entries - 已校验的完整普通 definitions；同类型同 value 的不同 GUID 均保留。
 * @param query - 搜索和筛选条件；默认隐藏 disabled definitions。
 * @returns 按 value 排序的合并行；不改变输入数组或定义对象。
 */
export function queryPermissions(resourceId: string, entries: readonly CatalogDefinitionEntry[], query: PermissionQuery = {}): PermissionRow[] {
  const q = query.q?.trim().toLowerCase() ?? '';
  const merged = new Map<string, PermissionRow>();
  for (const entry of entries) {
    const definition = entry.definition;
    // 所有条件必须同时命中同一条 definition，不能跨类型拼接 consent 与搜索命中。
    if ((!query.showDisabled && !definition.isEnabled)
      || (query.category !== undefined && query.category !== entry.category)
      || (query.family !== undefined && query.family !== entry.family)
      || (query.permissionType !== undefined && definition.permissionType !== query.permissionType)
      || (query.adminConsentRequired !== undefined && definition.adminConsentRequired !== query.adminConsentRequired)) continue;
    const search = [entry.value, definition.id, definition.title, definition.description];
    if (definition.permissionType === 'Delegated') search.push(definition.userConsentTitle, definition.userConsentDescription);
    if (q && !search.some(text => text.toLowerCase().includes(q))) continue;
    let row = merged.get(entry.value);
    if (!row) {
      row = { resourceId, value: entry.value, category: entry.category, family: entry.family,
        visibleTypes: [], definitions: [] };
      merged.set(entry.value, row);
    }
    row.definitions.push(definition);
  }
  return [...merged.values()].sort((a, b) => orderText(a.value, b.value)).map(row => {
    // 只排序新建的行数组；同类型 definitions 保留输入顺序，兼容原有 HTTP 行为。
    row.definitions.sort((a, b) => orderText(a.permissionType, b.permissionType));
    row.visibleTypes = [...new Set(row.definitions.map(definition => definition.permissionType))];
    return row;
  });
}

/** category 的筛选后统计函数，使用同一批合并行计算数量并隐藏空分类。 */
export function queryCategories(categories: readonly CategoryInfo[], rows: readonly PermissionRow[]): CategorySummary[] {
  return categories.map(({ category, displayName, description }) => ({ category, displayName, description,
    ...countPermissions(rows.filter(row => row.category === category)) })).filter(item => item.permissionCount > 0)
    .sort((a, b) => orderText(a.displayName, b.displayName));
}

/**
 * 单个 permission 的完整详情查询函数；value 大小写敏感，无可见定义时返回 undefined。
 * allDefinitions 保留被当前条件筛除的定义；具体客户端负责将 undefined 映射为 not-found 错误。
 */
export function queryDetail(resourceId: string, entries: readonly CatalogDefinitionEntry[], value: string,
  query: PermissionQuery = {}): Pick<PermissionDetailResponse, 'item' | 'allDefinitions'> | undefined {
  const all = entries.filter(entry => entry.value === value);
  const item = queryPermissions(resourceId, all, query)[0];
  if (!item) return undefined;
  return { item, allDefinitions: all.map(entry => entry.definition).sort((a, b) => orderText(a.permissionType, b.permissionType)) };
}
