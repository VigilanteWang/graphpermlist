/** service category 卡片集合，显示当前筛选后的计数并发出导航操作。 */
import * as React from 'react';
import { Body1, Button, Caption1, Title2 } from '@fluentui/react-components';
import type { CatalogCategorySummary } from '@graph/contracts';
import { useCategoryStyles } from './CategoryCards.styles.js';

/** category 卡片的数据和点击操作。点击时把整条 category 摘要交给外壳。 */
interface CategoryCardsProps {
  items: CatalogCategorySummary[];
  onOpen: (category: CatalogCategorySummary) => void;
}

/** category 卡片列表。每张卡片显示当前筛选后的计数，返回列表时外壳用 data-category 找回之前点过的卡片。 */
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
