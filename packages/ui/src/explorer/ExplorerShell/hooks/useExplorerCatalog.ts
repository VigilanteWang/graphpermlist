/** 目录浏览的数据编排 Hook，仅调用宿主注入的中立 CatalogClient。 */
import * as React from 'react';
import type { CatalogClient, CatalogCategorySummary, PermissionQueryOptions } from '@graph/contracts';
import { useCatalogRequest } from '../../../hooks/useCatalogRequest.js';

/** 当前浏览范围对应的请求集合；family 选项使用含禁用项的完整目录，不随搜索收缩。 */
export function useExplorerCatalog(
  client: CatalogClient,
  page: 'home' | 'graph',
  category: CatalogCategorySummary | undefined,
  query: PermissionQueryOptions
) {
  const resourcesLoad = React.useCallback((signal: AbortSignal) => client.resources(signal), [client]);
  const resources = useCatalogRequest(resourcesLoad);
  // 固定全球云 Graph Resource App ID，不能使用来源 Service Principal Object ID。
  const graph = resources.data?.items.find(
    (item) => item.resourceId === '00000003-0000-0000-c000-000000000000'
  );
  const resourceId = graph?.resourceId ?? '';
  const categoriesLoad = React.useCallback(
    (signal: AbortSignal) => client.categories(resourceId, query, signal),
    [client, resourceId, query]
  );
  const rowsLoad = React.useCallback(
    (signal: AbortSignal) => client.permissions(resourceId, query, signal),
    [client, resourceId, query]
  );
  const familiesLoad = React.useCallback(
    (signal: AbortSignal) => client.permissions(resourceId, { showDisabled: true }, signal),
    [client, resourceId]
  );
  const enabled = page === 'graph' && !!graph;
  const categories = useCatalogRequest(enabled ? categoriesLoad : undefined);
  const rows = useCatalogRequest(enabled && category ? rowsLoad : undefined);
  const familySource = useCatalogRequest(graph ? familiesLoad : undefined);
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
