/** 共享外壳的布局 Hook，观察外壳根节点的内容区宽度。 */
import * as React from 'react';

/** 返回外壳根节点的引用和窄布局状态。内容区宽度小于 640px 时使用窄布局，组件卸载时停止观察。 */
export function useExplorerLayout() {
  const root = React.useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => setNarrow(entries[0].contentRect.width < 640));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { root, narrow };
}
