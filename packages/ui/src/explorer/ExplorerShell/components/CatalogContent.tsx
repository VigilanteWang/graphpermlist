/** 两级目录的内容主体，组合标题、请求状态、category 卡片与 family 浏览。 */
import * as React from 'react';
import { Body1, Button, Spinner, Text, mergeClasses } from '@fluentui/react-components';
import type { CatalogCategorySummary } from '@graph/contracts';
import { RequestError } from '../../../components/RequestError.js';
import type { useExplorerCatalog } from '../hooks/useExplorerCatalog.js';
import type { useFamilyBrowse } from '../hooks/useFamilyBrowse.js';
import { CategoryCards } from './CategoryCards.js';
import { FamilyPermissions } from './FamilyPermissions.js';
import { useContentStyles } from './CatalogContent.styles.js';

/** 内容主体的查询结果、展开模型及导航回调，标题引用用于跨视图焦点恢复。 */
interface CatalogContentProps {
  category?: CatalogCategorySummary;
  catalog: ReturnType<typeof useExplorerCatalog>;
  browse: ReturnType<typeof useFamilyBrowse>;
  headingRef: React.RefObject<HTMLHeadingElement>;
  onBack: () => void;
  onOpenCategory: (category: CatalogCategorySummary) => void;
  onOpenPermission: (value: string) => void;
}

/** 当前目录范围的 Fluent 内容视图；错误、加载、零结果始终保持不同状态。 */
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
