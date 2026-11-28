/** 根据目录外壳的可用宽度，决定导航和主内容是并排显示还是上下排列。 */
import * as React from 'react';

/**
 * 目录外壳的布局 Hook。独立网站和 SharePoint 都按外壳的实际宽度选择布局。
 *
 * @returns `root` 绑定到外壳最外层的 FluentProvider。`narrow` 为 true 时，导航和主内容上下排列。
 */
export function useExplorerLayout() {
  const root = React.useRef<HTMLDivElement>(null);
  // 第一次测量前先用普通布局，收到实际宽度后再决定是否切换。
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    // 外壳渲染到页面后，React 会把 FluentProvider 对应的 DOM 元素写入 root.current。
    const element = root.current;
    if (!element) return;
    // 观察外壳的内容区，SharePoint 栏宽变化时也能更新布局。小于 640px 时上下排列，正好 640px 时仍然并排。
    const observer = new ResizeObserver((entries) => setNarrow(entries[0].contentRect.width < 640));
    observer.observe(element);
    // 外壳卸载时停止观察，避免继续接收旧节点的宽度变化。
    return () => observer.disconnect();
  }, []);
  return { root, narrow };
}
