/** 各宿主共用的目录外壳，组合 Fluent 主题、主导航、页面内容和详情面板。 */
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

/** 共享外壳的宿主参数；数据源、标识、主题与独立网站布局均由宿主配置。 */
export interface ExplorerShellProps {
  client: CatalogClient;
  hostLabel: string;
  theme?: Theme;
  themeMode?: 'light' | 'dark';
  viewportLayout?: boolean;
}

/** 完整目录组件的组合入口；交互 Hook 保持唯一状态，子视图只接收数据与操作。 */
export function ExplorerShell({
  client,
  hostLabel,
  theme,
  themeMode = 'light',
  viewportLayout = false
}: ExplorerShellProps): React.ReactElement {
  const styles = useExplorerStyles();
  const model = useExplorerController(client, viewportLayout);
  const { resources, graph, resourceId, enabled, familySource, families } = model.catalog;
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
          page={model.page}
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
          {resources.data?.dataState === 'ready' && model.page === 'home' && (
            <HomePage
              resources={resources.data}
              graph={graph}
              familySource={familySource}
              onBrowseGraph={() => model.navigate('graph')}
            />
          )}
          {resources.data?.dataState === 'ready' && model.page === 'graph' && !graph && (
            <Body1 as="p" role="status">
              Microsoft Graph is not available in this catalog.
            </Body1>
          )}
          {enabled && (
            <>
              <CatalogToolbar criteria={model.criteria} families={families} updateQuery={model.updateQuery} />
              <CatalogContent
                key={model.viewKey}
                category={model.category}
                catalog={model.catalog}
                browse={model.browse}
                headingRef={model.heading}
                onBack={model.backToCategories}
                onOpenCategory={model.openCategory}
                onOpenPermission={model.openDetail}
              />
              <DetailsPanel
                client={client}
                resourceId={resourceId}
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
