/** Home 的 API resource 卡片，展示每个目录的入口和计数。 */
import * as React from 'react';
import { Body1, Button, Caption1, Title2 } from '@fluentui/react-components';
import type { CatalogResourceSummary } from '@graph/contracts';
import { useResourceCardsStyles } from './ResourceCards.styles.js';

/** resource 卡片的列表数据、旧版单资源目录的 definitions 总数和导航操作。 */
interface ResourceCardsProps {
  resources: CatalogResourceSummary[];
  legacyTotalDefinitionCount?: number;
  onBrowse: (resourceId: string) => void;
}

/** API resource 卡片列表。点击卡片会把所选 Resource App ID 交给外壳。 */
export function ResourceCards({ resources, legacyTotalDefinitionCount, onBrowse }: ResourceCardsProps): React.ReactElement {
  const styles = useResourceCardsStyles();
  const idPrefix = React.useId();
  return (
    <div className={styles.resourceCards} role="group" aria-label="API resources">
      {resources.map((resource) => {
        const total = resource.totalDefinitionCount ?? legacyTotalDefinitionCount;
        const countsId = `${idPrefix}-${resource.resourceId}-counts`;
        const totalId = `${idPrefix}-${resource.resourceId}-total`;
        return (
          <Button
            key={resource.resourceId}
            className={styles.resourceCard}
            aria-label={`Browse ${resource.displayName}`}
            aria-describedby={total === undefined ? countsId : `${countsId} ${totalId}`}
            onClick={() => onBrowse(resource.resourceId)}
          >
            <Title2>{resource.displayName}</Title2>
            <Body1 id={countsId}>
              {resource.permissionCount} permissions · {resource.definitionCount} enabled definitions
            </Body1>
            {total !== undefined && <Caption1 id={totalId}><span>{total}</span> definitions including disabled</Caption1>}
          </Button>
        );
      })}
    </div>
  );
}
