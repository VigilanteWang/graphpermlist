/** 从一个 resource 的 definitions 生成 permission 列表、category 计数和详情。HTTP API 和 JSON client 共用这些查询规则。 */
import type {
  CatalogCategoryMetadata,
  CatalogCategorySummary,
  CatalogDefinitionEntry,
  MergedPermissionRow,
  PermissionCounts,
  PermissionDetail,
  PermissionQueryOptions
} from '@graph/contracts';

/** 按 JavaScript 字符串顺序比较两个名称，和原 HTTP API 一样区分大小写。 */
const orderText = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/** 统计界面上的行数和行内定义数。例如同一行包含 Application 和 Delegated 时，分别记为 1 行、2 条定义。 */
export const countPermissions = (rows: readonly MergedPermissionRow[]): PermissionCounts => ({ permissionCount: rows.length,
  definitionCount: rows.reduce((sum, row) => sum + row.definitions.length, 0) });

/**
 * 先筛选一个 resource 里的 definitions，再把同名 permission 放到同一行。
 * @param resourceId - 当前 resource 的 App ID。
 * @param entries - 已校验的普通 definitions。同 value 共用 category 和 family，同类型的不同 GUID 各自保留。
 * @param query - 搜索和筛选条件。默认隐藏 disabled definitions，搜索词去除首尾空格并忽略大小写。
 * @returns 按 value 排序的合并行，行内标签由当前可见的 definitions 计算。
 */
export function queryPermissions(
  resourceId: string, entries: readonly CatalogDefinitionEntry[], query: PermissionQueryOptions = {}
): MergedPermissionRow[] {
  const q = query.q?.trim().toLowerCase() ?? '';
  const merged = new Map<string, MergedPermissionRow>();
  for (const entry of entries) {
    const definition = entry.definition;
    // 搜索词只命中 Delegated 文案时，即使同名 Application 满足 consent 筛选，这条 Application 也不会显示。
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
    // 同一行先显示 Application 再显示 Delegated，同类型 definitions 按传入顺序显示。
    row.definitions.sort((a, b) => orderText(a.permissionType, b.permissionType));
    row.visibleTypes = [...new Set(row.definitions.map(definition => definition.permissionType))];
    return row;
  });
}

/** 用已筛选的 permission 行计算各 category 的数量，供导航隐藏零结果的 category。 */
export function queryCategories(
  categories: readonly CatalogCategoryMetadata[], rows: readonly MergedPermissionRow[]
): CatalogCategorySummary[] {
  return categories.map(({ category, displayName, description }) => ({ category, displayName, description,
    ...countPermissions(rows.filter(row => row.category === category)) })).filter(item => item.permissionCount > 0)
    .sort((a, b) => orderText(a.displayName, b.displayName));
}

/**
 * 按区分大小写的 value 找详情。item 是列表里的可见行，allDefinitions 还包含被当前筛选隐藏的定义。
 * 没有可见定义时返回 undefined，由具体客户端报告 not-found。
 */
export function queryDetail(resourceId: string, entries: readonly CatalogDefinitionEntry[], value: string,
  query: PermissionQueryOptions = {}): PermissionDetail | undefined {
  const all = entries.filter(entry => entry.value === value);
  const item = queryPermissions(resourceId, all, query)[0];
  if (!item) return undefined;
  return { item, allDefinitions: all.map(entry => entry.definition).sort((a, b) => orderText(a.permissionType, b.permissionType)) };
}
