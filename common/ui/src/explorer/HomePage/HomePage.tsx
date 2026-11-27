/** 目录 Home 页面，组装介绍、统计、resource 入口与来源详情。 */
import * as React from 'react';
import { Body1, Title1 } from '@fluentui/react-components';
import type { PermissionListResult, ResourceListResult } from '@graph/contracts';
import { RequestError } from '../../components/RequestError.js';
import { CatalogAbout } from './components/CatalogAbout.js';
import { CatalogSourceDetails } from './components/CatalogSourceDetails.js';
import { ResourceCards } from './components/ResourceCards.js';
import { useHomeStyles } from './HomePage.styles.js';

/** 首页接收的目录列表、旧版目录统计查询状态，以及按 Resource App ID 打开浏览页的操作。 */
interface HomePageProps {
  resources: ResourceListResult;
  familySource: { data?: PermissionListResult; error?: string; retry: () => void };
  onBrowse: (resourceId: string) => void;
}

/** 目录首页。每个 resource 有独立的浏览入口和统计，提供来源记录时也显示来源详情。 */
export function HomePage({
  resources,
  familySource,
  onBrowse
}: HomePageProps): React.ReactElement {
  const styles = useHomeStyles();
  const onlyResource = resources.items.length === 1 ? resources.items[0] : undefined;
  return (
    <div className={styles.stack}>
      <Title1 as="h1" className={styles.heading}>
        {onlyResource ? `${onlyResource.displayName} Permissions Explorer` : 'Permissions Explorer'}
      </Title1>
      <Body1>
        Compare Application and Delegated permissions, consent requirements and official descriptions across
        API resources.
      </Body1>
      <ResourceCards
        resources={resources.items}
        legacyTotalDefinitionCount={familySource.data?.definitionCount}
        onBrowse={onBrowse}
      />
      {familySource.error && <RequestError error={familySource.error} retry={familySource.retry} />}
      <CatalogAbout />
      {resources.items.map((resource) => {
        // 旧版单资源目录把来源放在列表顶层；新版目录的来源记录随各 resource 返回。
        const source = resource.source ?? (onlyResource ? resources.source : undefined);
        return source && (
          <CatalogSourceDetails
            key={resource.resourceId}
            resourceName={onlyResource ? undefined : resource.displayName}
            source={source}
          />
        );
      })}
    </div>
  );
}
