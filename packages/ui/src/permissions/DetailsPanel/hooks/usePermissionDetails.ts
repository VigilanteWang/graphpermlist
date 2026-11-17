/** permission 详情的请求 Hook，保留等值查询去重、取消、重试和过期结果隔离。 */
import * as React from 'react';
import type { CatalogClient, PermissionDetailResponse, PermissionQuery } from '@graph/contracts';

/** 详情请求的状态结构，通过请求键阻止上一次 permission 的内容出现在新面板中。 */
interface DetailState {
  key: string;
  response?: PermissionDetailResponse;
  error?: string;
}

/** 当前 permission 的完整详情请求；value 缺省时不发起读取。 */
export function usePermissionDetails(
  client: CatalogClient,
  resourceId: string,
  value: string | undefined,
  query: PermissionQuery
) {
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<DetailState>();
  // 采用稳定的参数序列，父组件每次创建等值 query 对象时不会重复请求。
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
      PermissionQuery['q'],
      PermissionQuery['category'],
      PermissionQuery['family'],
      PermissionQuery['permissionType'],
      PermissionQuery['adminConsentRequired'],
      PermissionQuery['showDisabled']
    ];
    // JSON 数组中的 undefined 会变成 null；还原成 API 的可选字段语义。
    const snapshot: PermissionQuery = {
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
      .then((response) => {
        if (!abort.signal.aborted) setState({ key: requestKey, response });
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
  const current = state?.key === requestKey ? state : undefined;
  return { current, retry: () => setAttempt((previous) => previous + 1) };
}
