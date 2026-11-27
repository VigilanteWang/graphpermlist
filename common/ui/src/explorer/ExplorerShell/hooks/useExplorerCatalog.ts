/** 为目录浏览准备各路查询，并从查询结果中整理筛选框的 family 选项。 */
import * as React from 'react';
import type { CatalogClient, CatalogCategorySummary, PermissionQueryOptions } from '@graph/contracts';
import { useCatalogRequest } from '../../../hooks/useCatalogRequest.js';

/**
 * 当前浏览范围内各路查询的状态，以及筛选框可选的 family。
 *
 * @param client - 前端提供的目录客户端。
 * @param page - 当前页面，用于决定何时查询 category 和 permission 列表。
 * @param category - 当前打开的 category。停留在 category 列表时为 undefined。
 * @param query - 控制器已组装好的查询参数，包含筛选框里的条件和当前 category。
 */
export function useExplorerCatalog(
  client: CatalogClient,
  page: 'home' | 'graph',
  category: CatalogCategorySummary | undefined,
  query: PermissionQueryOptions
) {
  const resourcesLoad = React.useCallback((signal: AbortSignal) => client.resources(signal), [client]);
  const resources = useCatalogRequest(resourcesLoad);
  // 从已加载的 resource 列表中，用全球云 Microsoft Graph 的 Resource App ID 找到目录入口。
  // 同一个 resource 在不同租户中的 Service Principal Object ID 可能不同。
  const graph = resources.data?.items.find(
    (item) => item.resourceId === '00000003-0000-0000-c000-000000000000'
  );
  const resourceId = graph?.resourceId ?? '';
  // 先准备查询函数，等 useCatalogRequest 的 Effect 调用。query 改变时，这两路会拿到新的函数引用。
  const categoriesLoad = React.useCallback(
    (signal: AbortSignal) => client.categories(resourceId, query, signal),
    [client, resourceId, query]
  );
  const rowsLoad = React.useCallback(
    (signal: AbortSignal) => client.permissions(resourceId, query, signal),
    [client, resourceId, query]
  );
  // family 选项来自包含禁用项的 permission 列表。固定参数让选项不会随搜索或筛选条件变化而缩小。
  const familiesLoad = React.useCallback(
    (signal: AbortSignal) => client.permissions(resourceId, { showDisabled: true }, signal),
    [client, resourceId]
  );
  const enabled = page === 'graph' && !!graph;
  // 每次渲染都按相同顺序调用各路 Hook。传入 undefined 时，该路的 Effect 会跳过请求。
  // 进入 category 后，category 列表查询仍然启用；permission 列表只在此时启用。
  const categories = useCatalogRequest(enabled ? categoriesLoad : undefined);
  const rows = useCatalogRequest(enabled && category ? rowsLoad : undefined);
  // 找到 Graph resource 就可以准备 family 选项，首页也可以先加载。
  const familySource = useCatalogRequest(graph ? familiesLoad : undefined);
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
  return { resources, graph, resourceId, enabled, categories, rows, familySource, families };
}
