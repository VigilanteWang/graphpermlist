/** 当前 resource 的浏览区，按目录配置显示 category 卡片或 family 列表。 */
import * as React from 'react';
import { Body1, Button, Spinner, Text, mergeClasses } from '@fluentui/react-components';
import type { CatalogCategorySummary } from '@graph/contracts';
import { RequestError } from '../../../components/RequestError.js';
import type { useExplorerCatalog } from '../hooks/useExplorerCatalog.js';
import type { useFamilyBrowse } from '../hooks/useFamilyBrowse.js';
import { CategoryCards } from './CategoryCards.js';
import { FamilyPermissions } from './FamilyPermissions.js';
import { useContentStyles } from './CatalogContent.styles.js';

/** 浏览区需要的数据和点击操作。headingRef 指向页面标题，外壳切换视图时可以把键盘焦点移到这里。 */
interface CatalogContentProps {
  resourceName: string;
  category?: CatalogCategorySummary;
  catalog: ReturnType<typeof useExplorerCatalog>;
  browse: ReturnType<typeof useFamilyBrowse>;
  headingRef: React.RefObject<HTMLHeadingElement>;
  onBack: () => void;
  onOpenCategory: (category: CatalogCategorySummary) => void;
  onOpenPermission: (value: string) => void;
}

/** 目录浏览区。统计数字跟随当前视图，显示匹配筛选的 permission 和 definition 数量。 */
export function CatalogContent({
  resourceName,
  category,
  catalog,
  browse,
  headingRef,
  onBack,
  onOpenCategory,
  onOpenPermission
}: CatalogContentProps): React.ReactElement {
  const styles = useContentStyles();
  const { categories, rows, familySource, showFamilies } = catalog;
  const visibleRequest = showFamilies ? rows : categories;
  const error = visibleRequest.error ?? familySource.error;
  const count = visibleRequest.data;
  const description = category?.description ?? (showFamilies ? undefined : 'Browse categories and discover their permission families.');
  return (
    <div className={mergeClasses(styles.stack, styles.body)} data-testid="catalog-body">
      {category && <Button onClick={onBack}>Back to categories</Button>}
      <Text as="h1" size={600} weight="semibold" ref={headingRef} tabIndex={-1} className={styles.heading}>
        {category?.displayName ?? resourceName}
      </Text>
      {description && <Body1>{description}</Body1>}
      {error && (
        <RequestError
          error={error}
          retry={() => {
            visibleRequest.retry();
            familySource.retry();
          }}
        />
      )}
      {!error && visibleRequest.loading && (
        <Spinner label="Loading permissions" />
      )}
      {count && !error && (
        <Text role="status" data-testid="catalog-counts">
          {count.permissionCount} permissions · {count.definitionCount} definitions
        </Text>
      )}
      {count?.permissionCount === 0 && !error && <Body1>No permissions match your search and filters.</Body1>}
      {!showFamilies && !error && <CategoryCards items={categories.data?.items ?? []} onOpen={onOpenCategory} />}
      {showFamilies && rows.data && !error && (
        <FamilyPermissions browse={browse} onOpenPermission={onOpenPermission} />
      )}
    </div>
  );
}
