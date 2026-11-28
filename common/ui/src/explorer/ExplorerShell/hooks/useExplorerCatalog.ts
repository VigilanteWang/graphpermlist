/** 为目录浏览准备各路查询，并从查询结果中整理筛选框的 family 选项。 */
import * as React from 'react';
import type { CatalogClient, CatalogCategorySummary, PermissionQueryOptions } from '@graph/contracts';
import { useCatalogRequest } from '../../../hooks/useCatalogRequest.js';

/**
 * 当前浏览范围内各路查询的状态，以及筛选框可选的 family。
 *
 * @param client - 前端提供的目录客户端。
 * @param resourceId - 当前 Resource App ID。停留在 Home 时为 undefined。
 * @param category - 当前打开的 category。停留在 category 列表时为 undefined。
 * @param query - 控制器已组装好的查询参数，包含筛选框里的条件和当前 category。
 */
export function useExplorerCatalog(
  client: CatalogClient,
  resourceId: string | undefined,
  category: CatalogCategorySummary | undefined,
  query: PermissionQueryOptions
) {
  const resourcesLoad = React.useCallback((signal: AbortSignal) => client.resources(signal), [client]);
  const resources = useCatalogRequest(resourcesLoad);
  // Home 和侧栏来自同一份列表。切换 resource 以后，三路浏览查询都用新的 Resource App ID。
  const items = resources.data?.items;
  const resource = items?.find((item) => item.resourceId === resourceId);
  const selectedId = resource?.resourceId ?? '';
  const showFamilies = resource?.browseMode === 'family' || category !== undefined;
  // 先准备查询函数，等 useCatalogRequest 的 Effect 调用。query 改变时，这两路会拿到新的函数引用。
  const categoriesLoad = React.useCallback(
    (signal: AbortSignal) => client.categories(selectedId, query, signal),
    [client, selectedId, query]
  );
  const rowsLoad = React.useCallback(
    (signal: AbortSignal) => client.permissions(selectedId, query, signal),
    [client, selectedId, query]
  );
  // 早期 Graph 单资源目录缺少普通 definitions 总数，Home 继续从包含禁用项的查询结果补读。
  const legacyHomeResource =
    resourceId === undefined && items?.length === 1 && items[0].totalDefinitionCount === undefined
      ? items[0]
      : undefined;
  const familyResourceId = selectedId || legacyHomeResource?.resourceId || '';
  // family 选项来自包含禁用项的 permission 列表。固定参数让选项不会随搜索或筛选条件变化而缩小。
  const familiesLoad = React.useCallback(
    (signal: AbortSignal) => client.permissions(familyResourceId, { showDisabled: true }, signal),
    [client, familyResourceId]
  );
  // 每次渲染都按相同顺序调用各路 Hook。传入 undefined 时，该路的 Effect 会跳过请求。
  // 直接按 family 浏览时不请求 category；当前没有 category 筛选，查询覆盖整个 resource。
  const categories = useCatalogRequest(resource && !showFamilies ? categoriesLoad : undefined);
  const rows = useCatalogRequest(resource && showFamilies ? rowsLoad : undefined);
  const familySource = useCatalogRequest(familyResourceId ? familiesLoad : undefined);
  // 从已有结果里提取 family 名称。进入 category 后只取该 category 的行，再去重排序。
  const families = React.useMemo(
    () =>
      [
        ...new Set(
          familySource.data?.items
            .filter((row) => !category || row.category === category.category)
            .map((row) => row.family) ?? []
        )
      ].sort(),
    [familySource.data, category]
  );
  return { resources, resource, showFamilies, categories, rows, familySource, families };
}
