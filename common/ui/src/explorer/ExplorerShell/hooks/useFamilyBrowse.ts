/** 记住各 resource 和 category 里展开的 permission family，搜索时自动展开所有命中的 family。 */
import * as React from "react";
import type { MergedPermissionRow } from "@graph/contracts";

/**
 * 每个 family 显示为一个折叠项，展开后就能看到这一组的 permission。
 * 普通浏览的展开状态由外壳保留，切换 resource 或 category 再回来时可以接着浏览。
 *
 * @param rows - 查到的 permission 列表，数据还没回来时按空列表处理。
 * @param expansionKey - 展开记录的键，由 Resource App ID 和可选的 category 组成。
 * @param searching - 搜索框里是否有搜索词。只输入空格也算普通浏览。
 */
export function useFamilyBrowse(
  rows: MergedPermissionRow[] | undefined,
  expansionKey: string,
  searching: boolean,
) {
  // 同名 family 可以出现在不同 resource，所以按当前浏览范围分别保存。
  const [savedOpen, setSavedOpen] = React.useState<Record<string, string[]>>(
    {},
  );
  // 记住搜索时打开了哪些 family。清空搜索词后，界面会改用 savedOpen。
  const [searchOpen, setSearchOpen] = React.useState<string[]>([]);
  // 点击展开或收起时，只要 rows 还是同一个数组，就可以直接使用上次分好的组。
  const groups = React.useMemo(() => {
    const result = new Map<string, MergedPermissionRow[]>();
    // 用 family 名称从 Map 里取出已收集的 permission，第一次遇到这个 family 就从空数组开始。
    // 把已有的行和当前行放进一个新数组，再存回这个 family 对应的条目。
    for (const row of rows ?? [])
      result.set(row.family, [...(result.get(row.family) ?? []), row]);
    // 每组有两项：第一项是折叠项标题用的 family 名称，第二项是展开后显示的 permission 行。
    // 例如 [['User', [userReadRow, userWriteRow]], ['Group', [groupReadRow]]]。
    // userReadRow 等变量各代表一条 permission 行。
    return [...result.entries()];
  }, [rows]);
  React.useEffect(() => {
    // 开始搜索或搜索结果更新时，自动打开所有命中的 family。([family]) 取的是数组的第一项，即 family 名称。
    if (searching) setSearchOpen(groups.map(([family]) => family));
  }, [groups, searching]);
  /**
   * 当前浏览范围的 family 展开更新操作。搜索时只更新临时展开名单。
   * 普通浏览时调用 setSavedOpen，更新当前 resource 和 category 的展开记录。
   *
   * @param open - 这次更新后应展开的所有 family 名称。传入空数组就会全部收起。
   */
  function setOpen(open: string[]): void {
    if (searching) setSearchOpen(open);
    else setSavedOpen((previous) => ({ ...previous, [expansionKey]: open }));
  }
  return {
    groups,
    // 界面只展开名单里的 family。普通浏览时，第一次进入一个浏览范围默认全部收起。
    open: searching ? searchOpen : (savedOpen[expansionKey] ?? []),
    setOpen,
    expandAll: () => setOpen(groups.map(([family]) => family)),
    collapseAll: () => setOpen([]),
  };
}
