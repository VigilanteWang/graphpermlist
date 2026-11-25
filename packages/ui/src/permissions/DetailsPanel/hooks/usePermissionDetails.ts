/** 打开详情后获取当前 permission 的数据。切换 permission 或筛选时，旧请求的结果不会出现在新抽屉里。 */
import * as React from 'react';
import type { CatalogClient, PermissionDetailResult, PermissionQueryOptions } from '@graph/contracts';

/** 详情请求的状态结构，通过请求键阻止上一次 permission 的内容出现在新面板中。 */
interface DetailState {
  key: string;
  result?: PermissionDetailResult;
  error?: string;
}

/** 详情抽屉的数据和重试操作。value 是点击的 permission 名称，例如 User.Read。关闭后 value 为 undefined，就不再发请求。 */
export function usePermissionDetails(
  client: CatalogClient,
  resourceId: string,
  value: string | undefined,
  query: PermissionQueryOptions
) {
  // 每次重试都换一个请求键，即使仍然查看同一个 permission。
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<DetailState>();
  // 用筛选字段的值生成查询键。即使父组件重建了 query，只要搜索词等字段没变，详情也不用重新加载。
  const queryKey = JSON.stringify([
    query.q,
    query.category,
    query.family,
    query.permissionType,
    query.adminConsentRequired,
    query.showDisabled
  ]);
  const requestKey = JSON.stringify([resourceId, value, queryKey, attempt]);
  React.useEffect(() => {
    if (value === undefined) return;
    const abort = new AbortController();
    const [q, category, family, permissionType, adminConsentRequired, showDisabled] = JSON.parse(
      queryKey
    ) as [
      PermissionQueryOptions['q'],
      PermissionQueryOptions['category'],
      PermissionQueryOptions['family'],
      PermissionQueryOptions['permissionType'],
      PermissionQueryOptions['adminConsentRequired'],
      PermissionQueryOptions['showDisabled']
    ];
    // 筛选未设置时，序列化后的数组会用 null 占位。发请求前恢复为 undefined，布尔值 false 仍然保留。
    const snapshot: PermissionQueryOptions = {
      q: q ?? undefined,
      category: category ?? undefined,
      family: family ?? undefined,
      permissionType: permissionType ?? undefined,
      adminConsentRequired: adminConsentRequired ?? undefined,
      showDisabled: showDisabled ?? undefined
    };
    setState({ key: requestKey });
    client
      .detail(resourceId, value, snapshot, abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) setState({ key: requestKey, result });
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted)
          setState({
            key: requestKey,
            error: error instanceof Error ? error.message : 'Permission details are unavailable.'
          });
      });
    return () => abort.abort();
  }, [client, resourceId, value, queryKey, requestKey]);
  // 切换 permission 后，新的请求可能还没开始，这时先隐藏旧详情。
  const current = state?.key === requestKey ? state : undefined;
  return { current, retry: () => setAttempt((previous) => previous + 1) };
}
