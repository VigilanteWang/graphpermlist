/** 共享目录界面的异步请求 Hook 模块，提供取消、重试及过期响应隔离。 */
import * as React from 'react';

/** 一次请求的显示状态；key 把结果绑定到发起它的查询，防止新筛选显示旧数据。 */
export interface RequestState<T> { key: unknown; data?: T; error?: string; }

/** 可取消目录请求的 React Hook；调用方用 useCallback 保持相同查询的 load 引用稳定。 */
export function useCatalogRequest<T>(load: ((signal: AbortSignal) => Promise<T>) | undefined): {
  data?: T; error?: string; loading: boolean; retry: () => void;
} {
  const [state, setState] = React.useState<RequestState<T>>({ key: undefined });
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    if (!load) return;
    const abort = new AbortController();
    setState({ key: load });
    load(abort.signal).then(data => {
      // 某些宿主 fetch 实现可能忽略取消，成功回调也必须检查 signal。
      if (!abort.signal.aborted) setState({ key: load, data });
    }).catch((error: unknown) => {
      if (!abort.signal.aborted) setState({ key: load, error: error instanceof Error ? error.message : 'Catalog API is unavailable' });
    });
    return () => abort.abort();
  }, [load, attempt]);
  const current = state.key === load ? state : undefined;
  return { data: current?.data, error: current?.error,
    loading: !!load && !current?.data && !current?.error,
    retry: () => { setState({ key: undefined }); setAttempt(value => value + 1); } };
}
