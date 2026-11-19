/** Home 的 definition 统计区块，展示来源计数与禁用条目的口径说明。 */
import * as React from 'react';
import { Body1, Card, Title2 } from '@fluentui/react-components';
import type { PermissionListResult, ResourceListResult, CatalogResourceSummary } from '@graph/contracts';
import { useStatisticsStyles } from './Statistics.styles.js';

/** 统计所需的 resource 与 family 查询结果；异步状态仍由外壳持有。 */
interface StatisticsProps {
  resources: ResourceListResult;
  graph?: CatalogResourceSummary;
  definitions?: PermissionListResult;
}

/** 目录统计卡片，分别保留普通启用条目、全部普通条目与排除 RSC 的计数。 */
export function Statistics({ resources, graph, definitions }: StatisticsProps): React.ReactElement {
  const styles = useStatisticsStyles();
  return (
    <div className={styles.stats}>
      <Card className={styles.stat}>
        <Title2>{graph?.definitionCount ?? 0}</Title2>
        <Body1 as="p">Enabled ordinary definitions</Body1>
      </Card>
      <Card className={styles.stat}>
        <Title2>{definitions?.definitionCount ?? '…'}</Title2>
        <Body1 as="p">
          Ordinary definitions include enabled and disabled entries. Use Show disabled in Microsoft Graph to
          include them.
        </Body1>
      </Card>
      <Card className={styles.stat}>
        <Title2>{resources.source?.excludedRscCount ?? 0}</Title2>
        <Body1 as="p">RSC definitions excluded</Body1>
      </Card>
    </div>
  );
}
