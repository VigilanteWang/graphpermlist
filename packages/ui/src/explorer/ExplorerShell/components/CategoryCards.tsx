/** service category 卡片集合，显示当前筛选后的计数并发出导航操作。 */
import * as React from 'react';
import { Body1, Button, Caption1, Title2 } from '@fluentui/react-components';
import type { CatalogCategorySummary } from '@graph/contracts';
import { useCategoryStyles } from './CategoryCards.styles.js';

/** category 卡片的只读数据和选择回调，不持有筛选或展开状态。 */
interface CategoryCardsProps {
  items: CatalogCategorySummary[];
  onOpen: (category: CatalogCategorySummary) => void;
}

/** 一级目录的 Fluent 操作按钮；data-category 供返回导航恢复原卡片焦点。 */
export function CategoryCards({ items, onOpen }: CategoryCardsProps): React.ReactElement {
  const styles = useCategoryStyles();
  return (
    <div className={styles.cards}>
      {items.map((item) => (
        <Button
          key={item.category}
          data-category={item.category}
          aria-label={`Open ${item.displayName}`}
          className={styles.card}
          onClick={() => onOpen(item)}
        >
          <Title2 as="h2">{item.displayName}</Title2>
          <Body1>{item.description}</Body1>
          <Caption1 data-testid={`category-counts-${item.category}`}>
            {item.permissionCount} permissions · {item.definitionCount} definitions
          </Caption1>
        </Button>
      ))}
    </div>
  );
}
