/** 为 ExplorerShell 管理页面、筛选条件和键盘焦点，把查询结果交给界面使用。 */
import * as React from "react";
import type {
  CatalogClient,
  CatalogCategorySummary,
  PermissionQueryOptions,
} from "@graph/contracts";
import { useExplorerCatalog } from "./useExplorerCatalog.js";
import { useExplorerLayout } from "./useExplorerLayout.js";
import { useFamilyBrowse } from "./useFamilyBrowse.js";

/** 目录主页面的取值；Coming soon resource 不能成为可导航页面。 */
export type ExplorerPage = "home" | "graph";

/**
 * ExplorerShell 使用的状态和操作。category 列表和 permission 列表共用同一份筛选条件，
 * 切换视图时仍由外壳保留筛选和 family 展开记录。
 *
 * @param client - 前端提供的目录客户端。
 * @param viewportLayout - 是否采用视口布局。启用时，切换页面或 category 会将主内容滚回顶部。
 */
export function useExplorerController(
  client: CatalogClient,
  viewportLayout: boolean,
) {
  const { root, narrow } = useExplorerLayout();
  const main = React.useRef<HTMLElement>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);
  const detailTrigger = React.useRef<HTMLElement | null>(null);
  const categoryTrigger = React.useRef<string>();
  const [page, setPage] = React.useState<ExplorerPage>("home");
  // category 是应用按分类规则对 Microsoft Graph API permission 划分出的大类，这里保存当前打开的类别。
  const [category, setCategory] = React.useState<CatalogCategorySummary>();
  // criteria 保存当前的搜索词和筛选选项，例如 permission 类型、family 和是否显示禁用项。
  // 筛选框读取 criteria，并通过 updateCriteria 更新它。当前 category 由导航单独管理。
  const [criteria, setCriteria] = React.useState<PermissionQueryOptions>({});
  const [detail, setDetail] = React.useState<string>();
  const categoryKey = category?.category ?? "all";
  // 把筛选框的 criteria 和当前 category 组装成查询参数。两者都没变时复用 query，避免重复查询。
  const query = React.useMemo(
    () => ({ ...criteria, category: category?.category }),
    [criteria, category],
  );
  const catalog = useExplorerCatalog(client, page, category, query);
  // 把当前 category 查到的 permission 按 family 分组，记住平时展开了哪些 family。
  // 开始搜索或搜索结果更新时，自动展开所有命中的 family。
  const browse = useFamilyBrowse(
    catalog.rows.data?.items,
    categoryKey,
    !!query.q?.trim(),
  );
  React.useEffect(() => {
    // 进入 category 时聚焦新标题，方便键盘和屏幕阅读器用户从新内容继续，筛选时保留输入焦点。
    if (viewportLayout) main.current?.scrollTo({ top: 0 });
    if (page === "graph" && category) heading.current?.focus();
  }, [page, category, viewportLayout]);
  React.useEffect(() => {
    if (
      page !== "graph" ||
      category ||
      !catalog.categories.data ||
      !categoryTrigger.current
    )
      return;
    const button = root.current?.querySelector<HTMLButtonElement>(
      `[data-category="${categoryTrigger.current}"]`,
    );
    // 返回时聚焦原卡片以继续浏览，找不到则聚焦一级标题，浏览器通常会将焦点目标滚入视野。
    (button ?? heading.current)?.focus();
    categoryTrigger.current = undefined;
  }, [page, category, catalog.categories.data, root]);
  /** 主导航的页面切换操作；重选 Graph 返回 category 列表，保留共享筛选条件。 */
  function navigate(next: ExplorerPage): void {
    setPage(next);
    if (next === "graph") setCategory(undefined);
    setDetail(undefined);
  }
  /**
   * 筛选框更新筛选条件时调用，同时关闭当前的 permission 详情。
   *
   * @param patch - 本次要改的字段，例如 { q: 'mail' }。其余筛选条件继续保留。
   */
  function updateCriteria(patch: Partial<PermissionQueryOptions>): void {
    setDetail(undefined);
    // 用 patch 覆盖 previous 中同名字段。
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
    detailTrigger.current = root.current?.ownerDocument
      .activeElement as HTMLElement | null;
    setDetail(value);
  }
  /** 详情关闭操作；只恢复仍在文档中的触发按钮，避免已卸载节点接收焦点。 */
  function closeDetail(): void {
    setDetail(undefined);
    requestAnimationFrame(
      () => detailTrigger.current?.isConnected && detailTrigger.current.focus(),
    );
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
    categoryKey,
    catalog,
    browse,
    navigate,
    updateCriteria,
    openCategory,
    backToCategories,
    openDetail,
    closeDetail,
  };
}
