/** 配置驱动的 resource 分类规则，供 SQLite 写入前建模和离线 JSON 导出使用。 */
import type { CatalogBrowseMode, CatalogCategoryMetadata, CatalogClassification, CatalogFamily } from '@graph/contracts';

const ALL_PERMISSIONS: CatalogCategoryMetadata = {
  category: 'all-permissions', displayName: 'All permissions', description: 'Browse permissions by family.'
};
const UNCATEGORIZED: CatalogCategoryMetadata = {
  category: 'uncategorized', displayName: 'Uncategorized', description: 'Permissions without a configured category.'
};

/** 非 Graph resource 的导航规则，含浏览方式、分类元数据和定位单个 value 的函数。 */
interface ResourceNavigation {
  browseMode: CatalogBrowseMode;
  version: string;
  categories: CatalogCategoryMetadata[];
  /** permission value 对应的 category 和 family 定位函数。 */
  classify(value: string): CatalogFamily;
}

/** 已校验的可选 category 映射。无映射时，单一内部 category 支持纯 family 浏览。 */
export function configuredNavigation(classification: Extract<CatalogClassification, { mode: 'categories' }> | undefined): ResourceNavigation {
  const entries = classification?.categories ?? [];
  const familyCategories = new Map(entries.flatMap(({ category, families }) =>
    families.map(family => [family, category] as const)));
  return {
    browseMode: classification ? 'category' : 'family',
    version: classification?.version ?? 'family-prefix-v1',
    categories: classification
      ? [...entries.map(({ category, displayName, description }) => ({ category, displayName, description })), UNCATEGORIZED]
      : [ALL_PERMISSIONS],
    /** 以第一个点号前的部分作为 family。配置未覆盖的 family 归入 Uncategorized。 */
    classify(value) {
      const family = value.split('.')[0];
      const category = classification ? familyCategories.get(family) ?? UNCATEGORIZED.category : ALL_PERMISSIONS.category;
      return { category, family };
    }
  };
}
