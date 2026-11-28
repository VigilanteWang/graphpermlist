/** ExplorerShell 的控制器 Hook，管理资源导航、筛选和焦点。 */
import * as React from "react";
import type {
  CatalogClient,
  CatalogCategorySummary,
  PermissionQueryOptions,
} from "@graph/contracts";
import { useExplorerCatalog } from "./useExplorerCatalog.js";
import { useExplorerLayout } from "./useExplorerLayout.js";
import { useFamilyBrowse } from "./useFamilyBrowse.js";

/**
 * ExplorerShell 使用的状态和操作。外壳区分跨 resource 共用的筛选条件与当前 resource 的浏览状态。
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
  // 详情关闭时按 DOM 元素恢复焦点。category 卡片在切换视图时会卸载，返回时按 category 键重新找。
  const detailTrigger = React.useRef<HTMLElement | null>(null);
  const categoryTrigger = React.useRef<string>();
  const focusResourceHeading = React.useRef(false);
  const lastResourceId = React.useRef<string>();
  // resourceId 保存 Resource App ID。undefined 表示当前在 Home。
  const [resourceId, setResourceId] = React.useState<string>();
  // category 保存当前打开的类别。直接浏览 family 的 resource 无需选择 category。
  const [category, setCategory] = React.useState<CatalogCategorySummary>();
  // criteria 保存当前的搜索词和筛选选项，例如 permission 类型、family 和是否显示禁用项。
  // 筛选框读取 criteria，并通过 updateCriteria 更新它。当前 category 由导航单独管理。
  const [criteria, setCriteria] = React.useState<PermissionQueryOptions>({});
  // 保存当前详情里的 permission 名称，例如 User.Read。undefined 表示详情关闭。
  const [detail, setDetail] = React.useState<string>();
  const browseKey = JSON.stringify([resourceId, category?.category]);
  // 把筛选框的 criteria 和当前 category 组装成查询参数。两者都没变时复用 query，避免重复查询。
  const query = React.useMemo(
    () => ({ ...criteria, category: category?.category }),
    [criteria, category],
  );
  const catalog = useExplorerCatalog(client, resourceId, category, query);
  // 对当前查到的 permission 按 family 分组，分别记住各 resource 和 category 的展开状态。
  // 开始搜索或搜索结果更新时，自动展开所有命中的 family。
  const browse = useFamilyBrowse(
    catalog.rows.data?.items,
    browseKey,
    !!query.q?.trim(),
  );
  React.useEffect(() => {
    // 从 Home 卡片或 category 卡片进入时，焦点移到新标题。侧栏导航仍让焦点留在侧栏。
    if (viewportLayout) main.current?.scrollTo({ top: 0 });
    if (category || focusResourceHeading.current) heading.current?.focus();
    focusResourceHeading.current = false;
  }, [resourceId, category, viewportLayout]);
  React.useEffect(() => {
    const trigger = categoryTrigger.current;
    if (!resourceId || category || !catalog.categories.data || !trigger) return;
    const buttons = root.current?.querySelectorAll<HTMLButtonElement>("[data-category]");
    const button = Array.from(buttons ?? []).find((item) => item.dataset.category === trigger);
    // 返回时聚焦原卡片以继续浏览，找不到则聚焦一级标题，浏览器通常会将焦点目标滚入视野。
    (button ?? heading.current)?.focus();
    categoryTrigger.current = undefined;
  }, [resourceId, category, catalog.categories.data, root]);
  /**
   * 主导航和 Home 卡片的页面切换操作。打开浏览入口时清理当前 category 和详情。
   * @param nextResourceId - 要打开的 Resource App ID。省略时回到 Home。
   * @param fromHomeCard - 是否由 Home 卡片进入，需要把焦点移到新页面的标题。
   */
  function navigate(nextResourceId?: string, fromHomeCard = false): void {
    if (nextResourceId && nextResourceId !== lastResourceId.current) {
      // 回到 Home 再打开同一 resource 时可以继续使用原 family；打开另一个 resource 时重新选择。
      setCriteria((previous) => previous.family === undefined ? previous : { ...previous, family: undefined });
      lastResourceId.current = nextResourceId;
    }
    focusResourceHeading.current = fromHomeCard;
    categoryTrigger.current = undefined;
    detailTrigger.current = null;
    setResourceId(nextResourceId);
    setCategory(undefined);
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
  /** 打开 category，并记住是从哪张卡片进去的，方便返回时恢复键盘焦点。 */
  function openCategory(item: CatalogCategorySummary): void {
    categoryTrigger.current = item.category;
    setCategory(item);
  }
  /** 返回 category 列表并关闭详情。等列表数据可用后，Effect 会把焦点放回原卡片或标题。 */
  function backToCategories(): void {
    setCategory(undefined);
    setDetail(undefined);
  }
  /** 打开 permission 详情前，先记住页面上当前聚焦的元素，关闭后可以回到那里。 */
  function openDetail(value: string): void {
    detailTrigger.current = root.current?.ownerDocument
      .activeElement as HTMLElement | null;
    setDetail(value);
  }
  /** 详情关闭和焦点恢复操作。下一帧如果原来的焦点元素仍在页面上，就把焦点还给它。 */
  function closeDetail(): void {
    const trigger = detailTrigger.current;
    detailTrigger.current = null;
    setDetail(undefined);
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus();
    });
  }
  return {
    root,
    main,
    heading,
    narrow,
    resourceId,
    category,
    criteria,
    detail,
    query,
    browseKey,
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
