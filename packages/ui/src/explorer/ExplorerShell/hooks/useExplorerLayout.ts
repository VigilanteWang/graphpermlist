/** 共享外壳的容器宽度观察，使用宿主实际可用宽度而非浏览器 viewport。 */
import * as React from 'react';

/** 外壳根节点与窄容器状态；卸载时断开 ResizeObserver，不持有宿主对象。 */
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
