/** category 内的 family 分组与展开记忆，区分普通浏览和临时搜索展开。 */
import * as React from 'react';
import type { MergedPermissionRow } from '@graph/contracts';

/** 当前 category 的可见分组与展开控制；Hook 始终由外壳调用，切换页面不销毁记忆。 */
export function useFamilyBrowse(rows: MergedPermissionRow[] | undefined, viewKey: string, searching: boolean) {
  const [savedOpen, setSavedOpen] = React.useState<Record<string, string[]>>({});
  const [searchOpen, setSearchOpen] = React.useState<string[]>([]);
  const groups = React.useMemo(() => {
    const result = new Map<string, MergedPermissionRow[]>();
    for (const row of rows ?? []) result.set(row.family, [...(result.get(row.family) ?? []), row]);
    return [...result.entries()];
  }, [rows]);
  React.useEffect(() => {
    // 搜索结果变化时展开所有命中组，但不能覆盖普通浏览记忆。
    if (searching) setSearchOpen(groups.map(([family]) => family));
  }, [groups, searching]);
  /** 当前模式下的展开更新操作；普通浏览按 category 单独记录。 */
  function setOpen(open: string[]): void {
    if (searching) setSearchOpen(open);
    else setSavedOpen((previous) => ({ ...previous, [viewKey]: open }));
  }
  return {
    groups,
    open: searching ? searchOpen : (savedOpen[viewKey] ?? []),
    setOpen,
    expandAll: () => setOpen(groups.map(([family]) => family)),
    collapseAll: () => setOpen([])
  };
}
