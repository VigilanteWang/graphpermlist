/** 在渲染提交后执行目录请求，保存结果，并处理取消和重试。 */
import * as React from 'react';

/** 一路目录请求的状态。key 保存执行查询时的 load 函数引用，data 和 error 保存结果或错误。 */
export interface RequestState<T> {
  key: unknown;
  data?: T;
  error?: string;
}

/**
 * 为一路目录请求保存独立的状态。调用方在渲染时读取状态，React 提交渲染后由 Effect 执行请求。
 *
 * @typeParam T - load 成功时返回的数据类型。
 * @param load - 接收取消信号并返回 Promise 的查询函数。传入 undefined 时跳过请求。
 * @returns 本次渲染可用的数据、错误、加载状态，以及触发重试的函数。
 */
export function useCatalogRequest<T>(load: ((signal: AbortSignal) => Promise<T>) | undefined): {
  data?: T;
  error?: string;
  loading: boolean;
  retry: () => void;
} {
  const [state, setState] = React.useState<RequestState<T>>({ key: undefined });
  // 点重试时递增 attempt。即使 load 引用没变，Effect 也会因为依赖变化而再执行。
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    if (!load) return;
    const abort = new AbortController();
    // 新请求开始时清掉上一次的数据和错误，记下这次使用的 load。
    setState({ key: load });
    // 到这里才调用查询函数。结果回来后写入 state，下一次渲染就能读到。
    load(abort.signal)
      .then((data) => {
        // 某些 fetch 实现可能忽略取消，成功回调也必须检查 signal。
        if (!abort.signal.aborted) setState({ key: load, data });
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted)
          setState({ key: load, error: error instanceof Error ? error.message : 'Catalog is unavailable' });
      });
    // Effect 重跑或组件卸载时，取消这一轮请求。
    return () => abort.abort();
  }, [load, attempt]);
  // 更换筛选后的第一次渲染可能还存着旧结果。只向界面提供与当前 load 对应的状态。
  const current = state.key === load ? state : undefined;
  return {
    data: current?.data,
    error: current?.error,
    loading: !!load && !current?.data && !current?.error,
    /** 清掉上一次的结果或错误，通过更新 attempt 让 Effect 重新调用 load。 */
    retry: () => {
      setState({ key: undefined });
      setAttempt((value) => value + 1);
    }
  };
}
