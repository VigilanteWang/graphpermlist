/** 独立网站和 SharePoint 共用的目录外壳，组合 Fluent 主题、主导航、页面内容和详情面板。 */
import * as React from 'react';
import {
  Body1,
  Button,
  FluentProvider,
  Spinner,
  Title2,
  mergeClasses,
  webDarkTheme,
  webLightTheme,
  type Theme
} from '@fluentui/react-components';
import type { CatalogClient } from '@graph/contracts';
import { RequestError } from '../../components/RequestError.js';
import { DetailsPanel } from '../../permissions/DetailsPanel/DetailsPanel.js';
import { HomePage } from '../HomePage/HomePage.js';
import { CatalogToolbar } from '../components/CatalogToolbar.js';
import { ResourceNavigation } from './components/ResourceNavigation.js';
import { CatalogContent } from './components/CatalogContent.js';
import { useExplorerController } from './hooks/useExplorerController.js';
import { useExplorerStyles } from './ExplorerShell.styles.js';

/** 共享外壳接收的前端配置，包括目录客户端、前端名称、主题和布局选项。 */
export interface ExplorerShellProps {
  client: CatalogClient;
  hostLabel: string;
  theme?: Theme;
  themeMode?: 'light' | 'dark';
  viewportLayout?: boolean;
}

/** 目录页面的入口。外壳记住当前页面、筛选条件和打开的详情，再把数据和点击操作传给各个区块。 */
export function ExplorerShell({
  client,
  hostLabel,
  theme,
  themeMode = 'light',
  viewportLayout = false
}: ExplorerShellProps): React.ReactElement {
  const styles = useExplorerStyles();
  // 目录外壳保留筛选和展开记录，切换子页面时可以继续用同一份状态。
  const model = useExplorerController(client, viewportLayout);
  const { resources, resource, familySource, families } = model.catalog;
  return (
    <FluentProvider
      ref={model.root}
      theme={theme ?? (themeMode === 'dark' ? webDarkTheme : webLightTheme)}
      className={mergeClasses(styles.root, viewportLayout && styles.viewportRoot)}
      data-testid="explorer-root"
    >
      <div
        className={mergeClasses(
          styles.layout,
          viewportLayout && styles.viewportLayout,
          model.narrow && styles.narrowLayout,
          model.narrow && viewportLayout && styles.narrowViewportLayout
        )}
      >
        <ResourceNavigation
          resourceId={model.resourceId}
          resources={resources.data?.items ?? []}
          hostLabel={hostLabel}
          narrow={model.narrow}
          viewportLayout={viewportLayout}
          onNavigate={model.navigate}
        />
        <main
          ref={model.main}
          className={mergeClasses(
            styles.main,
            viewportLayout && styles.viewportMain,
            model.narrow && styles.narrowMain
          )}
        >
          {resources.loading && <Spinner label="Loading catalog" />}
          {resources.error && <RequestError error={resources.error} retry={resources.retry} />}
          {resources.data?.dataState === 'not-imported' && (
            <div role="status">
              <Title2 as="h1">No catalog imported yet.</Title2>
              <Body1 as="p">Prepare a catalog in the configured data source, then retry.</Body1>
              <Button onClick={resources.retry}>Retry</Button>
            </div>
          )}
          {resources.data?.dataState === 'ready' && model.resourceId === undefined && (
            <HomePage
              resources={resources.data}
              familySource={familySource}
              onBrowse={(resourceId) => model.navigate(resourceId, true)}
            />
          )}
          {resources.data?.dataState === 'ready' && model.resourceId !== undefined && !resource && (
            <Body1 as="p" role="status">
              This API resource is not available in the catalog.
            </Body1>
          )}
          {resource && (
            <>
              <CatalogToolbar criteria={model.criteria} families={families} updateCriteria={model.updateCriteria} />
              <CatalogContent
                key={model.browseKey}
                resourceName={resource.displayName}
                category={model.category}
                catalog={model.catalog}
                browse={model.browse}
                headingRef={model.heading}
                onBack={model.backToCategories}
                onOpenCategory={model.openCategory}
                onOpenPermission={model.openDetail}
              />
              <DetailsPanel
                key={resource.resourceId}
                client={client}
                resourceId={resource.resourceId}
                value={model.detail}
                query={model.query}
                onClose={model.closeDetail}
                mountNode={model.root.current}
              />
            </>
          )}
        </main>
      </div>
    </FluentProvider>
  );
}
