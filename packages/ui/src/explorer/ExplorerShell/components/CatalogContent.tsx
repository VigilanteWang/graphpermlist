/** Microsoft Graph 的浏览区。先显示 category 卡片，点进 category 后按 family 显示 permission。 */
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
  category?: CatalogCategorySummary;
  catalog: ReturnType<typeof useExplorerCatalog>;
  browse: ReturnType<typeof useFamilyBrowse>;
  headingRef: React.RefObject<HTMLHeadingElement>;
  onBack: () => void;
  onOpenCategory: (category: CatalogCategorySummary) => void;
  onOpenPermission: (value: string) => void;
}

/** 目录浏览区。统计数字跟随当前视图：category 列表使用分类查询结果，进入 category 后使用 permission 查询结果。 */
export function CatalogContent({
  category,
  catalog,
  browse,
  headingRef,
  onBack,
  onOpenCategory,
  onOpenPermission
}: CatalogContentProps): React.ReactElement {
  const styles = useContentStyles();
  const { categories, rows, familySource } = catalog;
  const error = categories.error ?? rows.error ?? familySource.error;
  const count = category ? rows.data : categories.data;
  return (
    <div className={mergeClasses(styles.stack, styles.body)} data-testid="catalog-body">
      {category && <Button onClick={onBack}>Back to categories</Button>}
      <Text as="h1" size={600} weight="semibold" ref={headingRef} tabIndex={-1} className={styles.heading}>
        {category?.displayName ?? 'Microsoft Graph'}
      </Text>
      <Body1>{category?.description ?? 'Browse services and discover their permission families.'}</Body1>
      {error && (
        <RequestError
          error={error}
          retry={() => {
            categories.retry();
            rows.retry();
            familySource.retry();
          }}
        />
      )}
      {!error && (categories.loading || (category && rows.loading)) && (
        <Spinner label="Loading permissions" />
      )}
      {count && !error && (
        <Text role="status" data-testid="catalog-counts">
          {count.permissionCount} permissions · {count.definitionCount} definitions
        </Text>
      )}
      {count?.permissionCount === 0 && !error && <Body1>No permissions match your search and filters.</Body1>}
      {!category && !error && <CategoryCards items={categories.data?.items ?? []} onOpen={onOpenCategory} />}
      {category && rows.data && !error && (
        <FamilyPermissions browse={browse} onOpenPermission={onOpenPermission} />
      )}
    </div>
  );
}
