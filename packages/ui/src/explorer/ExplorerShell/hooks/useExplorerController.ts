/** 目录外壳的交互控制器，协调导航、共享筛选、请求和跨组件键盘焦点。 */
import * as React from 'react';
import type { CatalogClient, CatalogCategorySummary, PermissionQueryOptions } from '@graph/contracts';
import { useExplorerCatalog } from './useExplorerCatalog.js';
import { useExplorerLayout } from './useExplorerLayout.js';
import { useFamilyBrowse } from './useFamilyBrowse.js';

/** 目录主页面的取值；Coming soon resource 不能成为可导航页面。 */
export type ExplorerPage = 'home' | 'graph';

/** 外壳的有状态交互模型；所有子视图卸载时仍保留同一份筛选和展开记忆。 */
export function useExplorerController(client: CatalogClient, viewportLayout: boolean) {
  const { root, narrow } = useExplorerLayout();
  const main = React.useRef<HTMLElement>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);
  const detailTrigger = React.useRef<HTMLElement | null>(null);
  const categoryTrigger = React.useRef<string>();
  const [page, setPage] = React.useState<ExplorerPage>('home');
  const [category, setCategory] = React.useState<CatalogCategorySummary>();
  const [criteria, setCriteria] = React.useState<PermissionQueryOptions>({});
  const [detail, setDetail] = React.useState<string>();
  const viewKey = category?.category ?? 'all';
  const query = React.useMemo(() => ({ ...criteria, category: category?.category }), [criteria, category]);
  const catalog = useExplorerCatalog(client, page, category, query);
  const browse = useFamilyBrowse(catalog.rows.data?.items, viewKey, !!query.q?.trim());
  React.useEffect(() => {
    // 进入 category 时聚焦新标题，方便键盘和屏幕阅读器用户从新内容继续，筛选时保留输入焦点。
    if (viewportLayout) main.current?.scrollTo({ top: 0 });
    if (page === 'graph' && category) heading.current?.focus();
  }, [page, category, viewportLayout]);
  React.useEffect(() => {
    if (page !== 'graph' || category || !catalog.categories.data || !categoryTrigger.current) return;
    const button = root.current?.querySelector<HTMLButtonElement>(
      `[data-category="${categoryTrigger.current}"]`
    );
    // 返回时聚焦原卡片以继续浏览，找不到则聚焦一级标题，浏览器通常会将焦点目标滚入视野。
    (button ?? heading.current)?.focus();
    categoryTrigger.current = undefined;
  }, [page, category, catalog.categories.data, root]);
  /** 主导航的页面切换操作；重选 Graph 返回 category 列表，保留共享筛选条件。 */
  function navigate(next: ExplorerPage): void {
    setPage(next);
    if (next === 'graph') setCategory(undefined);
    setDetail(undefined);
  }
  /** 两级目录共用的条件更新操作，同时关闭旧 permission 的详情。 */
  function updateQuery(patch: Partial<PermissionQueryOptions>): void {
    setDetail(undefined);
    setCriteria((previous) => ({ ...previous, ...patch }));
  }
  /** category 入口；记录返回时应恢复焦点的卡片，不保存另一份筛选。 */
  function openCategory(item: CatalogCategorySummary): void {
    categoryTrigger.current = item.category;
    setCategory(item);
  }
  /** category 返回操作；随后由请求完成后的 Effect 恢复卡片或标题焦点。 */
  function backToCategories(): void {
    setCategory(undefined);
    setDetail(undefined);
  }
  /** permission 详情入口；记录当前实际触发按钮以支持关闭后的键盘续读。 */
  function openDetail(value: string): void {
    detailTrigger.current = root.current?.ownerDocument.activeElement as HTMLElement | null;
    setDetail(value);
  }
  /** 详情关闭操作；只恢复仍在文档中的触发按钮，避免已卸载节点接收焦点。 */
  function closeDetail(): void {
    setDetail(undefined);
    requestAnimationFrame(() => detailTrigger.current?.isConnected && detailTrigger.current.focus());
  }
  return {
    root,
    main,
    heading,
    narrow,
    page,
    category,
    criteria,
    detail,
    query,
    viewKey,
    catalog,
    browse,
    navigate,
    updateQuery,
    openCategory,
    backToCategories,
    openDetail,
    closeDetail
  };
}
