/** 目录 Home 页面，组装介绍、统计、resource 入口与来源详情。 */
import * as React from 'react';
import { Badge, Body1, Title1 } from '@fluentui/react-components';
import type { ResourceListResult, CatalogResourceSummary, PermissionListResult } from '@graph/contracts';
import { RequestError } from '../../components/RequestError.js';
import { CatalogAbout } from './components/CatalogAbout.js';
import { CatalogSourceDetails } from './components/CatalogSourceDetails.js';
import { ResourceCards } from './components/ResourceCards.js';
import { Statistics } from './components/Statistics.js';
import { useHomeStyles } from './HomePage.styles.js';

/** 首页接收的目录数据、统计查询状态和打开 Microsoft Graph 的操作。外壳在页面切换时继续保留这些查询状态。 */
interface HomePageProps {
  resources: ResourceListResult;
  graph?: CatalogResourceSummary;
  familySource: { data?: PermissionListResult; error?: string; retry: () => void };
  onBrowseGraph: () => void;
}

/** 首页。统计请求失败时可以在这里重试，目录返回来源记录时才显示来源详情。 */
export function HomePage({
  resources,
  graph,
  familySource,
  onBrowseGraph
}: HomePageProps): React.ReactElement {
  const styles = useHomeStyles();
  return (
    <div className={styles.stack}>
      <Badge appearance="tint" color="brand">
        LOCAL PERMISSION CATALOG
      </Badge>
      <Title1 as="h1" className={styles.heading}>
        Microsoft Graph Permissions Explorer
      </Title1>
      <Body1>
        Explore official permission definitions across Microsoft Graph services. Compare Application and
        Delegated permissions, consent requirements and complete official wording.
      </Body1>
      <Statistics resources={resources} graph={graph} definitions={familySource.data} />
      <ResourceCards onBrowseGraph={onBrowseGraph} />
      {familySource.error && <RequestError error={familySource.error} retry={familySource.retry} />}
      <CatalogAbout />
      {resources.source && <CatalogSourceDetails source={resources.source} />}
    </div>
  );
}
