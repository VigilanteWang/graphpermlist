/** 目录 Home 页面，组装介绍、统计、resource 入口与来源详情。 */
import * as React from 'react';
import { Badge, Body1, Title1 } from '@fluentui/react-components';
import type { ResourcesResponse, ResourceSummary, PermissionsResponse } from '@graph/contracts';
import { RequestError } from '../../components/RequestError.js';
import { CatalogAbout } from './components/CatalogAbout.js';
import { CatalogSourceDetails } from './components/CatalogSourceDetails.js';
import { ResourceCards } from './components/ResourceCards.js';
import { Statistics } from './components/Statistics.js';
import { useHomeStyles } from './HomePage.styles.js';

/** Home 的只读数据和导航入口；异步请求由外壳持有，切换页面不会重复加载。 */
interface HomePageProps {
  resources: ResourcesResponse;
  graph?: ResourceSummary;
  familySource: { data?: PermissionsResponse; error?: string; retry: () => void };
  onBrowseGraph: () => void;
}

/** 共享目录的介绍页面；子区块只呈现数据，外壳继续拥有请求与导航状态。 */
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
